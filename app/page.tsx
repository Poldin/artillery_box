'use client';

import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import DashboardCanvas from './components/DashboardCanvas';

export default function Home() {
  // Usa sempre il default per evitare hydration mismatch
  const [chatWidth, setChatWidth] = useState(380);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [maxChatWidth, setMaxChatWidth] = useState(800);
  const [isHydrated, setIsHydrated] = useState(false);

  // Carica da localStorage solo dopo hydration (lato client)
  useEffect(() => {
    setIsHydrated(true);
    const saved = localStorage.getItem('chatPanelWidth');
    if (saved) {
      setChatWidth(parseInt(saved, 10));
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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dashboard Canvas */}
        <DashboardCanvas 
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
        />

        {/* Chat Panel */}
        {isChatOpen && (
          <ChatPanel 
            width={chatWidth}
            onWidthChange={setChatWidth}
            minWidth={320}
            maxWidth={maxChatWidth}
          />
        )}
      </div>
    </div>
  );
}
