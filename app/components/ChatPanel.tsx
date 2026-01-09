'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { RotateCcw, Send, AlertCircle, Terminal, FileEdit, ChevronDown, Check, Save, History, X, Trash2, Edit2 } from 'lucide-react';
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
  const { user, isConfigured, isLoading: isLoadingSettings, settings, updateModel } = useAI();
  const [isResizing, setIsResizing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSavingRef = useRef(false); // Ref per evitare loop infiniti
  const lastSavedMessageCountRef = useRef(0); // Traccia quanti messaggi sono stati salvati
  const prevIsLoadingRef = useRef(false); // Traccia lo stato precedente di isLoading
  const lastSavedHashRef = useRef<string>(''); // Hash dell'ultimo stato salvato
  const unchangedChecksRef = useRef(0); // Contatore di check senza modifiche
  const userHasScrolledUpRef = useRef(false); // Traccia se l'utente ha scrollato verso l'alto

  // Modelli Claude disponibili
  const models = [
    { id: 'claude-opus-4-5-20251101', label: 'Opus 4.5', description: 'Most capable' },
    { id: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5', description: 'Balanced' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', description: 'Fastest' },
  ];

  const selectedModelLabel = models.find(m => m.id === settings.model)?.label || 'Select model';

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

  // Controlla se l'utente è vicino al fondo (entro 100px)
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100; // Entro 100px dal fondo
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    userHasScrolledUpRef.current = false;
  }, []);

  // Auto-scroll solo se l'utente è vicino al fondo
  useEffect(() => {
    if (isNearBottom() && !userHasScrolledUpRef.current) {
      scrollToBottom();
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // Traccia quando l'utente scrolla manualmente
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      userHasScrolledUpRef.current = !isNearBottom();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  // Auto-resize textarea in base al contenuto
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && canChat && !isLoading) {
      sendMessage({ text: inputValue.trim() });
      setInputValue('');
      // Reset textarea height
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '36px';
        }
      }, 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    autoResizeTextarea();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleReset = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null); // Reset chat ID per iniziare una nuova chat
    lastSavedMessageCountRef.current = 0; // Reset contatore messaggi salvati
    lastSavedHashRef.current = ''; // Reset hash
    unchangedChecksRef.current = 0; // Reset contatore check
    localStorage.removeItem('currentChatId'); // Rimuovi da localStorage
  }, [setMessages]);

  // Cambia modello
  const handleModelChange = async (modelId: string) => {
    setShowModelDropdown(false);
    await updateModel(modelId);
  };

  // Calcola hash semplice dei messaggi per confronto
  const getMessagesHash = useCallback((msgs: any[]) => {
    return JSON.stringify(msgs.map(m => ({
      role: m.role,
      content: m.content,
      id: m.id,
    })));
  }, []);

  // Carica cronologia chat
  const loadChatHistory = useCallback(async () => {
    if (!user || isLoadingHistory) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const { chats } = await response.json();
        setChatHistory(chats || []);
      }
    } catch (error) {
      console.error('[ChatPanel] Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]); // Rimosso isLoadingHistory dalle dipendenze

  // Carica una chat specifica
  const loadChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      if (response.ok) {
        const { chat } = await response.json();
        setMessages(chat.messages || []);
        setCurrentChatId(chat.id);
        lastSavedMessageCountRef.current = chat.messages?.length || 0;
        lastSavedHashRef.current = getMessagesHash(chat.messages || []);
        unchangedChecksRef.current = 0;
        // Salva in localStorage per ripristino dopo refresh
        localStorage.setItem('currentChatId', chat.id);
        // Non chiudere il pannello - lascialo aperto
      }
    } catch (error) {
      console.error('[ChatPanel] Error loading chat:', error);
    }
  }, [setMessages, getMessagesHash]);

  // Elimina una chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Rimuovi dalla lista
        setChatHistory(prev => prev.filter(c => c.id !== chatId));
        
        // Se era la chat corrente, resetta
        if (chatId === currentChatId) {
          handleReset(); // handleReset già pulisce il localStorage
        } else {
          // Se elimino una chat salvata in localStorage ma non corrente
          const savedChatId = localStorage.getItem('currentChatId');
          if (savedChatId === chatId) {
            localStorage.removeItem('currentChatId');
          }
        }
        
        setDeletingChatId(null);
      }
    } catch (error) {
      console.error('[ChatPanel] Error deleting chat:', error);
    }
  }, [currentChatId, handleReset]);

  // Rinomina una chat
  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      
      if (response.ok) {
        // Aggiorna nella lista
        setChatHistory(prev => 
          prev.map(c => c.id === chatId ? { ...c, title: newTitle.trim() } : c)
        );
        setEditingChatId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('[ChatPanel] Error renaming chat:', error);
    }
  }, []);

  // Carica cronologia solo la prima volta che si apre il pannello
  useEffect(() => {
    if (showHistory && user && chatHistory.length === 0 && !isLoadingHistory) {
      loadChatHistory();
    }
  }, [showHistory, user, chatHistory.length, isLoadingHistory, loadChatHistory]);

  // Ripristina la chat corrente dopo refresh
  useEffect(() => {
    if (user && messages.length === 0 && !currentChatId) {
      const savedChatId = localStorage.getItem('currentChatId');
      if (savedChatId) {
        console.log('[ChatPanel] Restoring chat from localStorage:', savedChatId);
        loadChat(savedChatId);
      }
    }
  }, [user, messages.length, currentChatId, loadChat]);

  // Salva o aggiorna la chat
  const saveChat = useCallback(async (messagesToSave: any[]) => {
    if (!user || messagesToSave.length === 0 || isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSavingChat(true);
    
    try {
      if (!currentChatId) {
        // Crea nuova chat
        console.log('[ChatPanel] Creating new chat with', messagesToSave.length, 'messages');
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesToSave,
          }),
        });

        if (response.ok) {
          const { chat } = await response.json();
          setCurrentChatId(chat.id);
          lastSavedMessageCountRef.current = messagesToSave.length;
          lastSavedHashRef.current = getMessagesHash(messagesToSave);
          unchangedChecksRef.current = 0; // Reset contatore
          console.log('[ChatPanel] Chat created:', chat.id);
          // Salva in localStorage per ripristino dopo refresh
          localStorage.setItem('currentChatId', chat.id);
          // Ricarica cronologia per includere la nuova chat
          if (chatHistory.length > 0) {
            loadChatHistory();
          }
        } else {
          console.error('[ChatPanel] Failed to create chat');
        }
      } else {
        // Aggiorna chat esistente
        console.log('[ChatPanel] Updating chat', currentChatId, 'with', messagesToSave.length, 'messages');
        const response = await fetch(`/api/chats/${currentChatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesToSave,
          }),
        });

        if (response.ok) {
          lastSavedMessageCountRef.current = messagesToSave.length;
          lastSavedHashRef.current = getMessagesHash(messagesToSave);
          unchangedChecksRef.current = 0; // Reset contatore
          // Ricarica cronologia per aggiornare la data
          if (chatHistory.length > 0) {
            loadChatHistory();
          }
        } else {
          console.error('[ChatPanel] Failed to update chat');
        }
      }
    } catch (error) {
      console.error('[ChatPanel] Error saving chat:', error);
    } finally {
      isSavingRef.current = false;
      setIsSavingChat(false);
    }
  }, [user, currentChatId, getMessagesHash, chatHistory.length, loadChatHistory]);

  // Auto-save immediato quando cambia il numero di messaggi (nuovo messaggio)
  useEffect(() => {
    if (messages.length === 0 || !user || !isConfigured) {
      return;
    }

    // Salva solo se il numero di messaggi è cambiato (nuovo messaggio aggiunto)
    if (messages.length !== lastSavedMessageCountRef.current && messages.length > 0) {
      console.log('[ChatPanel] New message detected, saving...');
      unchangedChecksRef.current = 0; // Reset contatore per riattivare polling
      
      // Aspetta 1 secondo per dare tempo al messaggio di completarsi
      const timer = setTimeout(() => {
        saveChat(messages);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [messages.length, user, isConfigured, saveChat]);

  // Salva quando l'AI finisce di rispondere
  useEffect(() => {
    // Se prima stava caricando e ora non più = AI ha finito
    if (prevIsLoadingRef.current === true && isLoading === false) {
      if (messages.length > 0 && user && isConfigured) {
        // Salva immediatamente quando l'AI finisce
        saveChat(messages);
      }
    }
    
    // Aggiorna il ref per il prossimo check
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, messages, user, isConfigured, saveChat]);

  // Sistema di polling intelligente: verifica ogni 2 secondi se c'è da salvare
  useEffect(() => {
    if (!user || !isConfigured || messages.length === 0 || !currentChatId) {
      return;
    }

    const interval = setInterval(() => {
      const currentHash = getMessagesHash(messages);
      
      // Se l'hash è diverso dall'ultimo salvato, ci sono modifiche
      if (currentHash !== lastSavedHashRef.current) {
        console.log('[ChatPanel] Polling detected unsaved changes, saving...');
        unchangedChecksRef.current = 0; // Reset contatore
        saveChat(messages);
      } else {
        // Nessuna modifica rilevata
        unchangedChecksRef.current += 1;
        
        // Se per 3 volte consecutive non ci sono modifiche, ferma il polling
        if (unchangedChecksRef.current >= 3) {
          console.log('[ChatPanel] All synced, stopping polling checks');
          clearInterval(interval);
        }
      }
    }, 2000); // Controlla ogni 2 secondi

    return () => clearInterval(interval);
  }, [messages, user, isConfigured, currentChatId, getMessagesHash, saveChat]);

  // Auto-resize on mount and when value changes
  useEffect(() => {
    autoResizeTextarea();
  }, [inputValue, autoResizeTextarea]);

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
      className="relative flex h-full"
      style={{ 
        width: showHistory ? `${width + 264}px` : `${width}px`,
        transition: 'width 0.2s ease-in-out',
      }}
    >
      {/* Main Chat Panel */}
      <div 
        className="flex flex-col h-full"
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
        ref={messagesContainerRef}
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
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={canChat ? "Ask me to query data, explore schema..." : (!user ? "Sign in to use chat" : "Configure API key in Settings first")}
              disabled={!canChat}
              className="chat-input w-full px-3 py-2 pr-10 text-xs"
              style={{ 
                minHeight: '36px', 
                maxHeight: '120px',
                height: '36px',
                opacity: canChat ? 1 : 0.5,
                resize: 'none',
                overflow: 'auto',
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
        <div className="flex items-center justify-between mt-1 gap-2">
          {/* History button - left side */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            disabled={!canChat}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-colors"
            style={{ 
              color: showHistory ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              opacity: canChat ? 1 : 0.5,
              cursor: canChat ? 'pointer' : 'not-allowed'
            }}
            onMouseEnter={(e) => {
              if (canChat) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = showHistory ? 'var(--accent-primary)' : 'var(--text-tertiary)';
            }}
            title="Chat history"
          >
            <History size={12} />
          </button>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
          {/* Model selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              disabled={!canChat}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                opacity: canChat ? 1 : 0.5,
                cursor: canChat ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={(e) => {
                if (canChat) {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showModelDropdown) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }
              }}
              title={`AI Model: ${settings.model}`}
            >
              <span>{selectedModelLabel}</span>
              <ChevronDown 
                size={10} 
                style={{ 
                  color: 'var(--text-muted)',
                  transform: showModelDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} 
              />
            </button>

            {showModelDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModelDropdown(false)}
                />
                <div 
                  className="absolute bottom-full left-0 right-0 mb-1 rounded-lg overflow-hidden z-20 animate-fade-in"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    minWidth: '150px',
                  }}
                >
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs transition-colors text-left"
                      style={{ 
                        background: settings.model === model.id ? 'var(--bg-hover)' : 'transparent',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (settings.model !== model.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div>
                        <div>{model.label}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                          {model.description}
                        </div>
                      </div>
                      {settings.model === model.id && (
                        <Check size={12} style={{ color: 'var(--accent-primary)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Save indicator */}
          {messages.length > 0 && user && currentChatId && (
            <div 
              className="flex items-center gap-1 px-1 py-0.5"
              style={{ 
                color: 'var(--text-muted)',
              }}
              title={isSavingChat ? 'Saving...' : 'Saved'}
            >
              <Save 
                size={11} 
                style={{
                  opacity: isSavingChat ? 0.5 : 1,
                  animation: isSavingChat ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}
              />
              {isSavingChat && (
                <span style={{ fontSize: '9px' }}>...</span>
              )}
            </div>
          )}

          {/* Reset button */}
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
            title="Reset chat and start new conversation"
          >
            <RotateCcw size={12} />
            reset
          </button>
          </div>
        </div>
      </div>
      </div>

      {/* History Panel - Same level as chat */}
      {showHistory && (
        <div 
          className="w-64 flex flex-col h-full"
          style={{ 
            background: 'var(--bg-primary)',
            borderLeft: '1px solid var(--border-subtle)',
          }}
        >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <h3 
                className="font-semibold text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                Chat History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded hover:bg-opacity-80 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingHistory ? (
                <div 
                  className="text-center py-4 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Loading...
                </div>
              ) : chatHistory.length === 0 ? (
                <div 
                  className="text-center py-4 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No chat history yet
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className="relative mb-1 rounded transition-colors"
                    style={{
                      background: chat.id === currentChatId ? 'var(--accent-primary-alpha)' : 'transparent',
                      border: `1px solid ${chat.id === currentChatId ? 'var(--accent-primary)' : 'transparent'}`,
                    }}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                  >
                    <button
                      onClick={() => editingChatId !== chat.id && loadChat(chat.id)}
                      className="w-full text-left p-2 transition-colors"
                      style={{
                        background: hoveredChatId === chat.id && chat.id !== currentChatId ? 'var(--bg-hover)' : 'transparent',
                      }}
                      disabled={editingChatId === chat.id}
                    >
                      {/* Title - editable or static */}
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameChat(chat.id, editingTitle);
                            } else if (e.key === 'Escape') {
                              setEditingChatId(null);
                              setEditingTitle('');
                            }
                          }}
                          onBlur={() => {
                            if (editingTitle.trim()) {
                              renameChat(chat.id, editingTitle);
                            } else {
                              setEditingChatId(null);
                              setEditingTitle('');
                            }
                          }}
                          autoFocus
                          className="w-full text-xs font-medium mb-1 px-1 rounded"
                          style={{ 
                            color: 'var(--text-primary)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--accent-primary)',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <div 
                          className="text-xs font-medium truncate mb-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {chat.title || 'Untitled chat'}
                        </div>
                      )}
                      
                      <div 
                        className="text-xs"
                        style={{ 
                          color: 'var(--text-muted)',
                          fontSize: '10px'
                        }}
                      >
                        {new Date(chat.updated_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </button>

                    {/* Action buttons - show on hover */}
                    {hoveredChatId === chat.id && editingChatId !== chat.id && (
                      <div 
                        className="absolute top-2 right-2 flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(chat.id);
                            setEditingTitle(chat.title || '');
                          }}
                          className="p-1 rounded transition-colors"
                          style={{ 
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-muted)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--accent-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                          title="Rename chat"
                        >
                          <Edit2 size={12} />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingChatId(chat.id);
                          }}
                          className="p-1 rounded transition-colors"
                          style={{ 
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-muted)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                          title="Delete chat"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Delete Confirmation Dialog */}
            {deletingChatId && (
              <>
                <div 
                  className="fixed inset-0 bg-black/40 z-40"
                  onClick={() => setDeletingChatId(null)}
                />
                <div 
                  className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-80 rounded-lg p-4"
                  style={{ 
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <h4 
                    className="text-sm font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Delete Chat?
                  </h4>
                  <p 
                    className="text-xs mb-4"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    This action cannot be undone. The chat and all its messages will be permanently deleted.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setDeletingChatId(null)}
                      className="px-3 py-1.5 rounded text-xs transition-colors"
                      style={{ 
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteChat(deletingChatId)}
                      className="px-3 py-1.5 rounded text-xs transition-colors"
                      style={{ 
                        background: '#ef4444',
                        color: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
      )}
    </div>
  );
}

// Componente per renderizzare un singolo messaggio
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';
  
  // Per messaggi utente, rendering semplice
  if (isUser) {
    const content = message.content || (message.parts?.[0]?.text);
    return (
      <div className="message-animate flex justify-end">
        <div 
          className="max-w-[85%] rounded-xl px-3 py-2 text-xs"
          style={{ 
            background: 'var(--chat-user-bg)',
            color: 'var(--text-primary)'
          }}
        >
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Per messaggi AI, renderizza tutti gli step
  const parts = message.parts || [];
  
  return (
    <div className="message-animate flex justify-start">
      <div 
        className="max-w-[85%] rounded-xl px-3 py-2 text-xs space-y-2"
        style={{ 
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)'
        }}
      >
        {parts.map((part: any, index: number) => {
          // Ignora step-start (è solo un marker)
          if (part.type === 'step-start') {
            return null;
          }

          // Renderizza testo normale
          if (part.type === 'text' && part.text) {
            return (
              <div key={index} className="chat-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }

          // Renderizza tool calls
          if (part.type?.startsWith('tool-')) {
            return <ToolStepDisplay key={index} part={part} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

// Componente per mostrare uno step di tool
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolStepDisplay({ part }: { part: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toolName = part.type.replace('tool-', '');
  const toolLabels: Record<string, string> = {
    'getDataSources': 'Get Data Sources',
    'bash': 'Bash Command',
    'editFile': 'Edit Documentation',
  };
  const label = toolLabels[toolName] || toolName;
  
  // Icone per i diversi tool
  const toolIcons: Record<string, any> = {
    'getDataSources': FileEdit,
    'bash': Terminal,
    'editFile': FileEdit,
  };
  const Icon = toolIcons[toolName] || Terminal;
  
  const hasOutput = part.state === 'output-available' && part.output;
  const isSuccess = hasOutput && part.output.success !== false;
  
  return (
    <div className="my-2">
      {/* Tool header - clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left"
        style={{ 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-secondary)';
        }}
      >
        <div className="flex items-center gap-2">
          <Icon size={12} style={{ color: 'var(--text-muted)' }} />
          <span 
            className="font-medium text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {hasOutput && (
            <span 
              className="text-xs"
              style={{ color: isSuccess ? '#22c55e' : '#ef4444' }}
            >
              {isSuccess ? 'done' : 'error'}
            </span>
          )}
          <ChevronDown 
            size={12} 
            style={{ 
              color: 'var(--text-muted)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} 
          />
        </div>
      </button>
      
      {/* Tool output - collapsible */}
      {isExpanded && hasOutput && (
        <div 
          className="mt-1 p-2 rounded text-xs overflow-x-auto"
          style={{ 
            background: 'var(--bg-secondary)',
          }}
        >
          {/* Edit File - mostra info specifiche */}
          {toolName === 'editFile' && (
            <>
              {part.output.filename && (
                <div 
                  className="mb-1 font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  📄 {part.output.filename}
                  {part.output.datasourceName && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>
                      {' '}({part.output.datasourceName})
                    </span>
                  )}
                </div>
              )}
              
              {part.output.changesSummary && (
                <div 
                  className="mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {part.output.changesSummary}
                </div>
              )}
              
              {part.output.message && (
                <div style={{ color: '#22c55e' }}>
                  ✓ {part.output.message}
                </div>
              )}
              
              {/* Errori editFile */}
              {!part.output.success && part.output.error && (
                <div>
                  <div style={{ color: '#ef4444', fontWeight: 'bold' }}>
                    Error: {part.output.error.message}
                  </div>
                  {part.output.error.hint && (
                    <div className="mt-1" style={{ color: 'var(--text-muted)' }}>
                      💡 {part.output.error.hint}
                    </div>
                  )}
                  {part.output.error.filePreview && (
                    <pre 
                      className="mt-2 p-2 rounded text-xs"
                      style={{ 
                        background: 'var(--bg-tertiary)',
                        maxHeight: '150px',
                        overflow: 'auto'
                      }}
                    >
                      {part.output.error.filePreview}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}

          {/* Bash - mostra stdout/stderr */}
          {toolName === 'bash' && (
            <>
              {part.output.stdout && (
                <pre 
                  className="whitespace-pre-wrap text-xs"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {part.output.stdout}
                </pre>
              )}
              
              {!part.output.success && part.output.stderr && (
                <div style={{ color: '#ef4444' }}>
                  Error: {part.output.stderr}
                </div>
              )}
            </>
          )}
          
          {/* Get Data Sources - mostra messaggio */}
          {toolName === 'getDataSources' && part.output.message && (
            <div style={{ color: 'var(--text-secondary)' }}>
              {part.output.message}
              {part.output.count !== undefined && (
                <span style={{ fontWeight: 'bold' }}>
                  {' '}({part.output.count} found)
                </span>
              )}
            </div>
          )}
        </div>
      )}
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
