'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import DashboardCanvas, { Dashboard } from './components/DashboardCanvas';
import JSONEditorPanel from './components/JSONEditorPanel';

export default function Home() {
  // Usa sempre il default per evitare hydration mismatch
  const [chatWidth, setChatWidth] = useState(380);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [maxChatWidth, setMaxChatWidth] = useState(800);
  const [isHydrated, setIsHydrated] = useState(false);
  // Dashboard modificata dall'AI
  const [modifiedDashboardId, setModifiedDashboardId] = useState<string | null>(null);
  const [modifiedDashboardName, setModifiedDashboardName] = useState<string | null>(null);
  // JSON Editor Panel
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonEditorWidth, setJsonEditorWidth] = useState(500);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [dashboardVersion, setDashboardVersion] = useState(0);

  // Carica da localStorage solo dopo hydration (lato client)
  useEffect(() => {
    setIsHydrated(true);
    const saved = localStorage.getItem('chatPanelWidth');
    if (saved) {
      setChatWidth(parseInt(saved, 10));
    }
    const savedJsonWidth = localStorage.getItem('jsonEditorWidth');
    if (savedJsonWidth) {
      setJsonEditorWidth(parseInt(savedJsonWidth, 10));
    }
  }, []);

  // Calcola maxWidth dinamicamente (metà della larghezza dello schermo)
  useEffect(() => {
    const updateMaxWidth = () => {
      setMaxChatWidth(Math.floor(window.innerWidth / 2));
    };
    
    updateMaxWidth(); // Calcola subito
    window.addEventListener('resize', updateMaxWidth);
    return () => window.removeEventListener('resize', updateMaxWidth);
  }, []);

  // Salva larghezza in localStorage quando cambia (solo dopo hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('chatPanelWidth', chatWidth.toString());
    }
  }, [chatWidth, isHydrated]);

  // Salva larghezza JSON editor
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('jsonEditorWidth', jsonEditorWidth.toString());
    }
  }, [jsonEditorWidth, isHydrated]);

  // Callback per quando l'AI modifica una dashboard
  const handleDashboardModified = useCallback((dashboardId: string, dashboardName: string) => {
    setModifiedDashboardId(dashboardId);
    setModifiedDashboardName(dashboardName);
    setDashboardVersion(prev => prev + 1);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dashboard Canvas */}
        <DashboardCanvas 
          isChatOpen={isChatOpen}
          onToggleChat={() => {
            if (!isChatOpen) {
              // Se apriamo la chat, chiudiamo il JSON editor
              setIsJsonEditorOpen(false);
            }
            setIsChatOpen(!isChatOpen);
          }}
          isJsonEditorOpen={isJsonEditorOpen}
          onToggleJsonEditor={() => {
            if (!isJsonEditorOpen) {
              // Se apriamo il JSON editor, chiudiamo la chat
              setIsChatOpen(false);
            }
            setIsJsonEditorOpen(!isJsonEditorOpen);
          }}
          modifiedDashboardId={modifiedDashboardId}
          modifiedDashboardName={modifiedDashboardName}
          onNotificationDismiss={() => {
            setModifiedDashboardId(null);
            setModifiedDashboardName(null);
          }}
          onSelectedDashboardChange={setSelectedDashboard}
          dashboardVersion={dashboardVersion}
        />

        {/* JSON Editor Panel */}
        {isJsonEditorOpen && (
          <JSONEditorPanel
            width={jsonEditorWidth}
            onWidthChange={setJsonEditorWidth}
            minWidth={400}
            maxWidth={maxChatWidth}
            dashboard={selectedDashboard}
            onSave={() => {
              // Forza il ricaricamento della dashboard incrementando la versione
              setDashboardVersion(prev => prev + 1);
            }}
          />
        )}

        {/* Chat Panel */}
        {isChatOpen && (
          <ChatPanel 
            width={chatWidth}
            onWidthChange={setChatWidth}
            minWidth={320}
            maxWidth={maxChatWidth}
            onDashboardModified={handleDashboardModified}
          />
        )}
      </div>
    </div>
  );
}
