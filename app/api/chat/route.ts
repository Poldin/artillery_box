import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText, stepCountIs, UIMessage, convertToModelMessages } from 'ai';
import { SYSTEM_PROMPT } from '@/app/lib/ai';
import { createBashTool } from '@/app/lib/ai/tools/bash';
import { createGetDataSourcesTool } from '@/app/lib/ai/tools/get-datasources';
import { createEditFileTool } from '@/app/lib/ai/tools/edit-file-supabase';
import { createAddDashboardWidgetTool } from '@/app/lib/ai/tools/add-dashboard-widget';
import { createGetDashboardsTool } from '@/app/lib/ai/tools/get-dashboards';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { decryptApiKey } from '@/app/lib/crypto';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Messages are required',
          hint: 'Send an array of messages with role and content'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verifica autenticazione utente
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          hint: 'Please sign in to use the chat'
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Recupera le impostazioni utente e l'API key dal database
    const serviceClient = createServiceClient();
    const { data: settings, error: settingsError } = await serviceClient
      .from('user_ai_settings')
      .select('model, encrypted_api_key, has_api_key')
      .eq('user_id', user.id)
      .eq('provider', 'anthropic')
      .single();

    if (settingsError || !settings || !settings.has_api_key || !settings.encrypted_api_key) {
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          hint: 'Please configure your Anthropic API key in Settings > AI Connection'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Decripta l'API key
    let apiKey: string;
    try {
      apiKey = decryptApiKey(settings.encrypted_api_key);
    } catch (decryptError) {
      console.error('[API/chat] Decryption error:', decryptError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to decrypt API key',
          hint: 'Please reconfigure your API key in Settings'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const model = settings.model || 'claude-sonnet-4-20250514';

    // Create Anthropic client con l'API key decifrata
    const anthropic = createAnthropic({
      apiKey,
    });

    // Create tools with context
    const tools = {
      getDataSources: createGetDataSourcesTool({ userId: user.id }),
      bash: createBashTool({ userId: user.id }),
      editFile: createEditFileTool({ userId: user.id }),
      getDashboards: createGetDashboardsTool({ userId: user.id }),
      addDashboardWidget: createAddDashboardWidgetTool({ userId: user.id }),
    };

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages as UIMessage[]);

    // Stream the response
    const result = streamText({
      model: anthropic(model),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(20), // Allow up to 20 steps for multi-step tool calls
      onFinish: ({ text, toolCalls, toolResults, finishReason }) => {
        console.log('[API/chat] Stream finished');
        console.log('[API/chat] Tool calls:', JSON.stringify(toolCalls, null, 2));
        console.log('[API/chat] Tool results:', JSON.stringify(toolResults, null, 2));
        console.log('[API/chat] Finish reason:', finishReason);
      },
    });

    // Return streaming response using UI message stream protocol
    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error('[API/chat] Error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Anthropic API errors
      if (error.message.includes('401') || error.message.includes('authentication')) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid API key',
            hint: 'Your API key may be invalid. Please update it in Settings.'
          }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            hint: 'Please wait a moment and try again'
          }),
          { 
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (error.message.includes('model')) {
        return new Response(
          JSON.stringify({ 
            error: 'Model not available',
            hint: 'The selected model might not be available. Try a different model in Settings.'
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Generic error
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
