import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { decryptApiKey } from '@/app/lib/crypto';

/**
 * API per generare automaticamente il titolo di una chat usando Haiku
 * POST /api/chats/[id]/generate-title
 * 
 * Genera un titolo breve (3-4 parole) basato sui messaggi della conversazione.
 * Aggiorna solo se is_auto_title è true (non sovrascrive titoli modificati manualmente).
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verifica autenticazione
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();
    
    // Recupera la chat
    const { data: chat, error: chatError } = await serviceClient
      .from('chats')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Non sovrascrivere se il titolo è stato modificato manualmente
    if (chat.is_auto_title === false) {
      return NextResponse.json(
        { 
          message: 'Title was manually edited, skipping auto-generation',
          title: chat.title 
        },
        { status: 200 }
      );
    }

    // Recupera le impostazioni AI dell'utente
    const { data: settings, error: settingsError } = await serviceClient
      .from('user_ai_settings')
      .select('encrypted_api_key, has_api_key')
      .eq('user_id', user.id)
      .eq('provider', 'anthropic')
      .single();

    if (settingsError || !settings || !settings.has_api_key || !settings.encrypted_api_key) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 400 }
      );
    }

    // Decripta l'API key
    let apiKey: string;
    try {
      apiKey = decryptApiKey(settings.encrypted_api_key);
    } catch (decryptError) {
      console.error('[API/generate-title] Decryption error:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    // Prepara i messaggi per il contesto (massimo primi 4 messaggi per efficienza)
    const messages = chat.messages || [];
    const contextMessages = messages.slice(0, 4); // Primi 2 scambi

    if (contextMessages.length === 0) {
      return NextResponse.json(
        { error: 'No messages to generate title from' },
        { status: 400 }
      );
    }

    // Estrae il testo dai messaggi (supporta sia formato content che parts)
    const extractMessageText = (msg: any): string => {
      // Formato con content diretto (messaggi user)
      if (typeof msg.content === 'string') {
        return msg.content;
      }
      
      // Formato con parts (AI SDK v6)
      if (msg.parts && Array.isArray(msg.parts)) {
        return msg.parts
          .filter((part: any) => part.type === 'text' && part.text)
          .map((part: any) => part.text)
          .join(' ');
      }
      
      // Fallback: prova con content[0].text
      if (msg.content && Array.isArray(msg.content)) {
        const textPart = msg.content.find((part: any) => part.type === 'text');
        return textPart?.text || '';
      }
      
      return '';
    };

    // Crea il contesto per Haiku
    const conversationContext = contextMessages
      .map((msg: any) => {
        const text = extractMessageText(msg).substring(0, 300);
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${text}`;
      })
      .filter((line: string) => !line.endsWith(': ')) // Rimuovi righe vuote
      .join('\n');

    // Log per debugging
    console.log(`[API/generate-title] Context for title generation (${contextMessages.length} messages):`);
    console.log(conversationContext);

    if (!conversationContext.trim()) {
      return NextResponse.json(
        { error: 'No valid content found in messages' },
        { status: 400 }
      );
    }

    // Usa Haiku per generare il titolo
    const anthropic = createAnthropic({ apiKey });
    
    const { text: generatedTitle } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt: `Based on this conversation, generate a short, specific title (3-4 words maximum, no quotes or punctuation at the end).
Be concise and descriptive. Use title case. Focus on the main topic or task.

Examples of good titles:
- Sales Data Analysis
- PostgreSQL Schema Design  
- Customer Segmentation Query
- Revenue Trends Report

Conversation:
${conversationContext}

Title:`,
      temperature: 0.7,
    });

    // Pulisci il titolo (rimuovi quote, punteggiatura finale, etc.)
    const cleanTitle = generatedTitle
      .trim()
      .replace(/^["']|["']$/g, '') // Rimuovi quote all'inizio/fine
      .replace(/[.!?]$/g, '') // Rimuovi punteggiatura finale
      .substring(0, 60); // Max 60 caratteri per sicurezza

    // Aggiorna il titolo nel database
    const { data: updatedChat, error: updateError } = await serviceClient
      .from('chats')
      .update({ 
        title: cleanTitle,
        is_auto_title: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updatedChat) {
      console.error('[API/generate-title] Error updating chat:', updateError);
      return NextResponse.json(
        { error: 'Failed to update title' },
        { status: 500 }
      );
    }

    console.log(`[API/generate-title] Generated title for chat ${id}: "${cleanTitle}"`);

    return NextResponse.json({ 
      title: cleanTitle,
      chat: updatedChat 
    });

  } catch (error) {
    console.error('[API/generate-title] Unexpected error:', error);
    
    // Gestione errori API Anthropic
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
