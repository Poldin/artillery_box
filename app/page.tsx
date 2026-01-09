'use client';

import { useState } from 'react';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import DashboardCanvas from './components/DashboardCanvas';

export default function Home() {
  const [chatWidth, setChatWidth] = useState(380);
  const [isChatOpen, setIsChatOpen] = useState(true);

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
            maxWidth={600}
          />
        )}
      </div>
    </div>
  );
}
