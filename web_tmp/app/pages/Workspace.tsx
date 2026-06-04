import React from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { ProcessFlow } from '../components/ProcessFlow';
import { TicketDetails } from '../components/TicketDetails';

export function Workspace() {
  return (
    <>
      {/* Left panel: 1/3 */}
      <div
        style={{
          width: '33.33%',
          minWidth: 320,
          borderRight: '1px solid rgba(51, 65, 85, 0.5)',
          background: '#161822',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          zIndex: 0,
          boxShadow: '2px 0 8px rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
      >
        <ChatPanel />
      </div>

      {/* Right panel: 2/3 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: '#12141e',
          minWidth: 0,
          zIndex: 0,
        }}
      >
        <div
          style={{
            height: '70%',
            borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          <ProcessFlow />
        </div>
        <div
          style={{
            height: '30%',
            minHeight: 140,
            position: 'relative',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          <TicketDetails />
        </div>
      </div>
    </>
  );
}
