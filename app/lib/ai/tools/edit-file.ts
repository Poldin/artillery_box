import { tool } from 'ai';
import { z } from 'zod';

/**
 * Edit File Tool - Permette all'AI di modificare file di documentazione
 * 
 * Usa pattern before/after per modifiche precise.
 * Gestisce casi speciali: file vuoto, multiple match, no match, etc.
 * Restituisce errori dettagliati per permettere auto-correzione.
 */

// Storage interface - verrà implementato con Supabase
export interface FileStorage {
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

// In-memory storage per development/testing
class InMemoryFileStorage implements FileStorage {
  private files: Map<string, string> = new Map();

  async read(path: string): Promise<string | null> {
    return this.files.get(path) ?? null;
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  // Helper per inizializzare files (utile per testing)
  seed(files: Record<string, string>) {
    for (const [path, content] of Object.entries(files)) {
      this.files.set(path, content);
    }
  }
}

// Singleton storage - verrà sostituito con Supabase client
let fileStorage: FileStorage = new InMemoryFileStorage();

export function setFileStorage(storage: FileStorage) {
  fileStorage = storage;
}

export function getFileStorage(): FileStorage {
  return fileStorage;
}

// Error types per messaging chiaro
type EditFileError = 
  | { type: 'FILE_NOT_FOUND'; message: string; hint: string }
  | { type: 'FILE_EMPTY'; message: string; hint: string }
  | { type: 'OLD_TEXT_NOT_FOUND'; message: string; hint: string; filePreview: string }
  | { type: 'MULTIPLE_MATCHES'; message: string; hint: string; matches: Array<{ line: number; context: string }> }
  | { type: 'OLD_TEXT_EQUALS_NEW'; message: string; hint: string }
  | { type: 'STORAGE_ERROR'; message: string; hint: string };

// Result type
type EditFileResult = 
  | { success: true; message: string; path: string; changesSummary: string }
  | { success: false; error: EditFileError };

/**
 * Trova tutte le occorrenze di una stringa in un testo
 */
function findAllOccurrences(text: string, searchString: string): Array<{ index: number; line: number; context: string }> {
  const occurrences: Array<{ index: number; line: number; context: string }> = [];
  let currentIndex = 0;
  
  while (true) {
    const index = text.indexOf(searchString, currentIndex);
    if (index === -1) break;
    
    // Calcola il numero di riga
    const lineNumber = text.substring(0, index).split('\n').length;
    
    // Estrai contesto (la riga completa)
    const lineStart = text.lastIndexOf('\n', index) + 1;
    const lineEnd = text.indexOf('\n', index + searchString.length);
    const context = text.substring(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
    
    occurrences.push({
      index,
      line: lineNumber,
      context: context.length > 100 ? context.substring(0, 100) + '...' : context,
    });
    
    currentIndex = index + 1;
  }
  
  return occurrences;
}

/**
 * Crea preview del file (prime N caratteri)
 */
function createFilePreview(content: string, maxLength: number = 500): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '\n... [truncated]';
}

export const editFileTool = tool({
  description: `Edit a documentation file using before/after text replacement.

This tool allows precise modifications to documentation files by specifying:
- The exact text to find (oldText)
- The text to replace it with (newText)

Special modes:
1. **Replace**: Provide both oldText and newText to replace specific text
2. **Append**: Set oldText to empty string "" to append newText to the end
3. **Prepend**: Set oldText to empty string "" and set mode to "prepend"
4. **Create/Overwrite**: Set oldText to empty string "" and mode to "overwrite" to replace entire file
5. **Delete**: Provide oldText and set newText to empty string "" to delete text

The tool returns detailed error messages if:
- oldText is not found in the file
- oldText appears multiple times (provide more context)
- The file doesn't exist (will be created if mode allows)

Always provide enough context in oldText to uniquely identify the text to change.
`,
    inputSchema: z.object({
    path: z.string().describe('The file path (e.g., /docs/production_db/schema.md)'),
    oldText: z.string().describe('The exact text to find and replace. Use empty string for append/prepend/overwrite modes.'),
    newText: z.string().describe('The new text to insert. Use empty string to delete the oldText.'),
    mode: z.enum(['replace', 'append', 'prepend', 'overwrite']).optional().default('replace')
      .describe('Operation mode: replace (default), append (add to end), prepend (add to start), overwrite (replace entire file)'),
    createIfNotExists: z.boolean().optional().default(true)
      .describe('Create the file if it does not exist (default: true)'),
  }),
  execute: async ({ path, oldText, newText, mode = 'replace', createIfNotExists = true }): Promise<EditFileResult> => {
    try {
      // Verifica che oldText e newText non siano identici (per replace)
      if (mode === 'replace' && oldText === newText && oldText !== '') {
        return {
          success: false,
          error: {
            type: 'OLD_TEXT_EQUALS_NEW',
            message: 'oldText and newText are identical. No changes needed.',
            hint: 'If you want to make a change, ensure oldText and newText are different.',
          },
        };
      }

      // Leggi il file esistente
      let content = await fileStorage.read(path);
      const fileExists = content !== null;
      content = content ?? '';

      // Gestisci file non esistente
      if (!fileExists) {
        if (!createIfNotExists) {
          return {
            success: false,
            error: {
              type: 'FILE_NOT_FOUND',
              message: `File not found: ${path}`,
              hint: 'Set createIfNotExists to true to create the file, or check the file path.',
            },
          };
        }
        // File sarà creato
      }

      let newContent: string;
      let changesSummary: string;

      // Gestisci le diverse modalità
      switch (mode) {
        case 'overwrite':
          newContent = newText;
          changesSummary = fileExists 
            ? `Overwrote entire file (${content.length} chars → ${newText.length} chars)`
            : `Created new file with ${newText.length} chars`;
          break;

        case 'append':
          if (content === '' && oldText !== '') {
            return {
              success: false,
              error: {
                type: 'FILE_EMPTY',
                message: 'Cannot search for oldText in an empty file.',
                hint: 'Use mode "overwrite" or "append" with empty oldText to add content to an empty file.',
              },
            };
          }
          newContent = content + (content && !content.endsWith('\n') ? '\n' : '') + newText;
          changesSummary = `Appended ${newText.length} chars to end of file`;
          break;

        case 'prepend':
          newContent = newText + (newText && !newText.endsWith('\n') ? '\n' : '') + content;
          changesSummary = `Prepended ${newText.length} chars to start of file`;
          break;

        case 'replace':
        default:
          // Se oldText è vuoto, comportati come append
          if (oldText === '') {
            newContent = content + (content && !content.endsWith('\n') ? '\n' : '') + newText;
            changesSummary = `Appended ${newText.length} chars (oldText was empty)`;
            break;
          }

          // File vuoto ma oldText non vuoto
          if (content === '') {
            return {
              success: false,
              error: {
                type: 'FILE_EMPTY',
                message: 'Cannot find oldText in an empty file.',
                hint: 'The file is empty. Use mode "overwrite" to set initial content, or mode "append" with empty oldText.',
              },
            };
          }

          // Cerca tutte le occorrenze
          const occurrences = findAllOccurrences(content, oldText);

          if (occurrences.length === 0) {
            return {
              success: false,
              error: {
                type: 'OLD_TEXT_NOT_FOUND',
                message: `The specified oldText was not found in the file.`,
                hint: 'Make sure the oldText matches exactly (including whitespace and newlines). Here is a preview of the file content:',
                filePreview: createFilePreview(content),
              },
            };
          }

          if (occurrences.length > 1) {
            return {
              success: false,
              error: {
                type: 'MULTIPLE_MATCHES',
                message: `Found ${occurrences.length} occurrences of oldText. Cannot determine which one to replace.`,
                hint: 'Provide more context in oldText to uniquely identify the text to change. Include surrounding lines or unique identifiers.',
                matches: occurrences.slice(0, 5), // Mostra max 5 match
              },
            };
          }

          // Esattamente 1 match - procedi con la sostituzione
          newContent = content.replace(oldText, newText);
          
          if (newText === '') {
            changesSummary = `Deleted ${oldText.length} chars at line ${occurrences[0].line}`;
          } else {
            changesSummary = `Replaced ${oldText.length} chars with ${newText.length} chars at line ${occurrences[0].line}`;
          }
          break;
      }

      // Salva il file
      await fileStorage.write(path, newContent);

      return {
        success: true,
        message: fileExists ? 'File updated successfully.' : 'File created successfully.',
        path,
        changesSummary,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          type: 'STORAGE_ERROR',
          message: `Failed to read/write file: ${errorMessage}`,
          hint: 'This might be a temporary issue. Try again or check file permissions.',
        },
      };
    }
  },
});
