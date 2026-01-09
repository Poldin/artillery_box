import { tool } from 'ai';
import { z } from 'zod';
import { createServiceClient } from '@/app/lib/supabase';

/**
 * Edit File Tool - Versione Supabase
 * 
 * Permette all'AI di modificare file di documentazione salvati nella tabella documentation.
 * Usa pattern before/after per modifiche precise.
 */

export interface EditFileContext {
  userId: string;
}

// Error types
type EditFileError = 
  | { type: 'FILE_NOT_FOUND'; message: string; hint: string }
  | { type: 'DATASOURCE_NOT_FOUND'; message: string; hint: string }
  | { type: 'FILE_EMPTY'; message: string; hint: string }
  | { type: 'OLD_TEXT_NOT_FOUND'; message: string; hint: string; filePreview: string }
  | { type: 'MULTIPLE_MATCHES'; message: string; hint: string; matches: Array<{ line: number; context: string }> }
  | { type: 'OLD_TEXT_EQUALS_NEW'; message: string; hint: string }
  | { type: 'STORAGE_ERROR'; message: string; hint: string };

// Result type
type EditFileResult = 
  | { success: true; message: string; filename: string; datasourceName: string; changesSummary: string }
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
 * Crea preview del file
 */
function createFilePreview(content: string, maxLength: number = 500): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '\n... [truncated]';
}

// Factory function per creare il tool con contesto
export function createEditFileTool(context: EditFileContext) {
  return tool({
    description: `Edit documentation files stored in the database for a specific datasource.

Use this tool to modify markdown documentation files associated with databases.

**IMPORTANT**: You must specify both datasourceId and filename.

Modes:
1. **replace** (default): Find oldText and replace with newText
2. **append**: Add newText to end of file (set oldText to "")
3. **prepend**: Add newText to start of file  
4. **overwrite**: Replace entire file with newText (set oldText to "")

Examples:
- Update schema docs: Replace table description
- Add new section: Append to end
- Fix errors: Replace specific text

The tool will:
- Find the documentation file by datasourceId + filename
- Apply the changes
- Save back to the database
- Return detailed success/error messages
`,
    inputSchema: z.object({
      datasourceId: z.string().uuid().describe('The ID of the datasource whose documentation to edit'),
      filename: z.string().describe('The filename of the documentation file to edit (e.g., schema.md)'),
      oldText: z.string().describe('The exact text to find and replace. Use empty string for append/prepend/overwrite modes.'),
      newText: z.string().describe('The new text to insert. Use empty string to delete the oldText.'),
      mode: z.enum(['replace', 'append', 'prepend', 'overwrite']).optional().default('replace')
        .describe('Operation mode: replace (default), append, prepend, or overwrite'),
    }),
    execute: async ({ datasourceId, filename, oldText, newText, mode = 'replace' }): Promise<EditFileResult> => {
      try {
        // 1. Recupera il datasource e verifica ownership
        const serviceClient = createServiceClient();
        const { data: datasource, error: dsError } = await serviceClient
          .from('data_sources')
          .select('id, source_name, user_id')
          .eq('id', datasourceId)
          .eq('user_id', context.userId)
          .single();

        if (dsError || !datasource) {
          return {
            success: false,
            error: {
              type: 'DATASOURCE_NOT_FOUND',
              message: `Datasource with ID '${datasourceId}' not found or doesn't belong to this user`,
              hint: 'Use getDataSources to see available datasources',
            },
          };
        }

        // 2. Cerca il file di documentazione
        const { data: doc, error: docError } = await serviceClient
          .from('documentation')
          .select('*')
          .eq('datasource_id', datasourceId)
          .eq('filename', filename)
          .maybeSingle(); // maybeSingle perché il file potrebbe non esistere

        let content = doc?.markdown_content ?? '';
        const fileExists = !!doc;

        // 3. Validazioni
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

        let newContent: string;
        let changesSummary: string;

        // 4. Applica modifiche in base alla modalità
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
                  matches: occurrences.slice(0, 5),
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

        // 5. Salva nel database
        if (fileExists && doc) {
          // Update file esistente
          const { error: updateError } = await serviceClient
            .from('documentation')
            .update({
              markdown_content: newContent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', doc.id);

          if (updateError) {
            return {
              success: false,
              error: {
                type: 'STORAGE_ERROR',
                message: `Failed to update file: ${updateError.message}`,
                hint: 'Check database permissions or try again.',
              },
            };
          }
        } else {
          // Crea nuovo file
          const { error: insertError } = await serviceClient
            .from('documentation')
            .insert({
              datasource_id: datasourceId,
              filename,
              markdown_content: newContent,
            });

          if (insertError) {
            return {
              success: false,
              error: {
                type: 'STORAGE_ERROR',
                message: `Failed to create file: ${insertError.message}`,
                hint: 'Check database permissions or try again.',
              },
            };
          }
        }

        console.log(`[EDIT FILE] ${fileExists ? 'Updated' : 'Created'} file: ${filename} for datasource ${datasource.source_name}`);

        return {
          success: true,
          message: fileExists ? 'File updated successfully.' : 'File created successfully.',
          filename,
          datasourceName: datasource.source_name,
          changesSummary,
        };

      } catch (error) {
        console.error('[EDIT FILE] Execution error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return {
          success: false,
          error: {
            type: 'STORAGE_ERROR',
            message: `Failed to edit file: ${errorMessage}`,
            hint: 'This might be a temporary issue. Try again.',
          },
        };
      }
    },
  });
}
