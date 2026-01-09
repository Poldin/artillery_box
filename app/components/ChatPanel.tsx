'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { RotateCcw, Send, AlertCircle, Terminal, FileEdit } from 'lucide-react';
import { useAI } from '../lib/ai';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Tipo per tool invocation nella UI
interface ToolInvocationUI {
  toolCallId: string;
  toolName: string;
  state: 'partial-call' | 'call' | 'result';
  input?: unknown;
  output?: unknown;
}

interface ChatPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  // Contesto del datasource attivo (opzionale)
  activeDatasource?: {
    id: string;
    name: string;
    type: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
  };
}

export default function ChatPanel({ 
  width, 
  onWidthChange, 
  minWidth = 320, 
  maxWidth = 600,
  activeDatasource,
}: ChatPanelProps) {
  const { user, isConfigured, isLoading: isLoadingSettings } = useAI();
  const [isResizing, setIsResizing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // AI SDK useChat hook - nuova API v6
  // L'API key e il model sono ora gestiti server-side (Vault)
  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        datasourceContext: activeDatasource,
      },
    }),
  });
  
  // Chat è abilitata se utente è autenticato e ha API key configurata
  const canChat = user && isConfigured;

  const isLoading = status === 'submitted' || status === 'streaming';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && canChat && !isLoading) {
      sendMessage({ text: inputValue.trim() });
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleReset = () => {
    setMessages([]);
  };

  // Resize handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  return (
    <div 
      ref={panelRef}
      className="relative flex flex-col h-full"
      style={{ 
        width: `${width}px`,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-subtle)'
      }}
    >
      {/* Resize handle */}
      <div 
        className={`resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
      />

      {/* Status Warning */}
      {!isLoadingSettings && !canChat && (
        <div 
          className="mx-4 mt-4 p-3 rounded-lg flex items-start gap-3"
          style={{ 
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {!user ? 'Sign in required' : 'API key not configured'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              <Link 
                href={!user ? '/auth/login' : '/settings'} 
                className="underline hover:no-underline"
                style={{ color: '#fbbf24' }}
              >
                {!user ? 'Sign in' : 'Go to Settings'}
              </Link>
              {' '}{!user ? 'to use the AI chat.' : 'to add your Anthropic API key.'}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        style={{ scrollbarGutter: 'stable' }}
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="flex justify-start message-animate">
            <div 
              className="rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full typing-dot"
                    style={{ background: 'var(--text-tertiary)' }}
                  />
                  <div 
                    className="w-2 h-2 rounded-full typing-dot"
                    style={{ background: 'var(--text-tertiary)' }}
                  />
                  <div 
                    className="w-2 h-2 rounded-full typing-dot"
                    style={{ background: 'var(--text-tertiary)' }}
                  />
                </div>
                <button
                  onClick={() => stop()}
                  className="text-xs px-2 py-1 rounded ml-2"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)'
                  }}
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div 
            className="mx-2 p-3 rounded-lg"
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            <p className="text-sm" style={{ color: '#ef4444' }}>
              {error.message || 'An error occurred. Please try again.'}
            </p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div 
        className="px-3 py-2 border-t shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <form onSubmit={handleSend}>
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canChat ? "Ask me to query data, explore schema..." : (!user ? "Sign in to use chat" : "Configure API key in Settings first")}
              disabled={!canChat}
              className="chat-input w-full px-3 py-2 pr-10 text-sm"
              style={{ 
                minHeight: '40px', 
                maxHeight: '100px',
                opacity: canChat ? 1 : 0.5,
              }}
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || !canChat || isLoading}
              className="absolute right-1 bottom-1 p-1.5 rounded-lg transition-all"
              style={{ 
                background: inputValue.trim() && canChat ? 'var(--accent-primary)' : 'transparent',
                color: inputValue.trim() && canChat ? 'white' : 'var(--text-tertiary)',
                cursor: inputValue.trim() && canChat ? 'pointer' : 'default'
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </form>
        <div className="flex items-center justify-between mt-1">
          <p 
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Press Enter to send, Shift+Enter for new line
          </p>
          <button
            onClick={handleReset}
            disabled={messages.length === 0}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-colors"
            style={{ 
              color: 'var(--text-tertiary)',
              opacity: messages.length === 0 ? 0.5 : 1,
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (messages.length > 0) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
            title="Reset chat"
          >
            <RotateCcw size={12} />
            reset
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente per renderizzare un singolo messaggio
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';
  
  // Estrai testo e tool invocations dalle parts
  const textParts: string[] = [];
  const toolInvocations: ToolInvocationUI[] = [];
  
  if (message.parts) {
    for (const part of message.parts) {
      if (part.type === 'text') {
        textParts.push(part.text);
      } else if (part.type === 'tool-invocation') {
        toolInvocations.push(part.toolInvocation);
      }
    }
  } else if (message.content) {
    // Fallback per messaggi con content invece di parts
    textParts.push(message.content);
  }
  
  // Check anche toolInvocations direttamente nel message (AI SDK potrebbe metterli qui)
  if (message.toolInvocations && Array.isArray(message.toolInvocations)) {
    toolInvocations.push(...message.toolInvocations);
  }

  const hasToolCalls = toolInvocations.length > 0;
  const textContent = textParts.join('\n');

  return (
    <div className={`message-animate flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className="max-w-[85%] rounded-xl px-4 py-2.5"
        style={{ 
          background: isUser ? 'var(--chat-user-bg)' : 'var(--bg-tertiary)',
          color: 'var(--text-primary)'
        }}
      >
        {/* Tool invocations */}
        {hasToolCalls && (
          <div className="mb-2 space-y-2">
            {toolInvocations.map((tool, index) => (
              <ToolInvocationDisplay key={index} tool={tool} />
            ))}
          </div>
        )}
        
        {/* Message content */}
        {textContent && (
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {textContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente per mostrare l'invocazione di un tool (accordion)
function ToolInvocationDisplay({ tool }: { tool: ToolInvocationUI }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = tool.toolName;
  const state = tool.state;
  
  // Icona in base al tool
  const Icon = toolName === 'bash' ? Terminal : toolName === 'getDataSources' ? FileEdit : FileEdit;
  
  // Colore in base allo stato
  const stateColors: Record<string, string> = {
    'partial-call': 'var(--text-muted)',
    'call': '#fbbf24',
    'result': '#22c55e',
  };

  // Label del tool
  const toolLabels: Record<string, string> = {
    'bash': 'Bash Command',
    'getDataSources': 'Get Data Sources',
    'editFile': 'Edit File',
  };
  
  return (
    <div 
      className="rounded-md overflow-hidden text-xs"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header (sempre visibile) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-opacity-80 transition-colors"
        style={{ 
          background: 'var(--bg-secondary)',
        }}
      >
        <Icon size={14} style={{ color: stateColors[state] || 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>
          {toolLabels[toolName] || toolName}
        </span>
        {state === 'call' && (
          <span className="ml-auto" style={{ color: '#fbbf24' }}>running...</span>
        )}
        {state === 'result' && (
          <span className="ml-auto flex items-center gap-1" style={{ color: '#22c55e' }}>
            done
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {isExpanded ? '▲' : '▼'}
            </span>
          </span>
        )}
        {state === 'partial-call' && (
          <span className="ml-auto" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* Contenuto espandibile */}
      {isExpanded && (
        <div 
          className="px-3 pb-2 space-y-2"
          style={{ 
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-tertiary)'
          }}
        >
          {/* Input */}
          {tool.input !== undefined && tool.input !== null && (
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Input:
              </p>
              <pre 
                className="p-2 rounded text-xs overflow-x-auto"
                style={{ 
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {String(JSON.stringify(tool.input, null, 2) || 'N/A')}
              </pre>
            </div>
          )}

          {/* Output */}
          {tool.output !== undefined && tool.output !== null && state === 'result' && (
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Output:
              </p>
              <pre 
                className="p-2 rounded text-xs overflow-x-auto"
                style={{ 
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >
                {String(JSON.stringify(tool.output, null, 2) || 'N/A')}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
