'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '../supabase/client';
import type { User } from '@supabase/supabase-js';

interface AISettings {
  hasApiKey: boolean;
  model: string;
  provider: string;
}

interface AIContextType {
  settings: AISettings;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  // Actions
  saveApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  deleteApiKey: () => Promise<{ success: boolean; error?: string }>;
  updateModel: (model: string) => Promise<{ success: boolean; error?: string }>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: AISettings = {
  hasApiKey: false,
  model: 'claude-sonnet-4-5-20250929',
  provider: 'anthropic',
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Fetch impostazioni dal server
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/api-key');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          hasApiKey: data.hasApiKey || false,
          model: data.model || defaultSettings.model,
          provider: data.provider || defaultSettings.provider,
        });
      }
    } catch (error) {
      console.error('Failed to fetch AI settings:', error);
    }
  }, []);

  // Inizializzazione: verifica auth e carica impostazioni
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Verifica sessione attuale
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          await fetchSettings();
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listener per cambiamenti di auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchSettings();
        } else {
          setSettings(defaultSettings);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchSettings]);

  // Salva API key nel Vault
  const saveApiKey = async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider: 'anthropic' }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to save API key' };
      }

      // Aggiorna stato locale
      setSettings(prev => ({ ...prev, hasApiKey: true }));
      return { success: true };

    } catch (error) {
      console.error('Save API key error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Elimina API key dal Vault
  const deleteApiKey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to delete API key' };
      }

      // Aggiorna stato locale
      setSettings(prev => ({ ...prev, hasApiKey: false }));
      return { success: true };

    } catch (error) {
      console.error('Delete API key error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Aggiorna modello
  const updateModel = async (model: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/settings/model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update model' };
      }

      // Aggiorna stato locale
      setSettings(prev => ({ ...prev, model }));
      return { success: true };

    } catch (error) {
      console.error('Update model error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Refresh impostazioni dal server
  const refreshSettings = async () => {
    await fetchSettings();
  };

  const isConfigured = settings.hasApiKey;

  return (
    <AIContext.Provider value={{
      settings,
      user,
      isLoading,
      isConfigured,
      saveApiKey,
      deleteApiKey,
      updateModel,
      refreshSettings,
    }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
