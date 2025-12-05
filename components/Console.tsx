import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface ConsoleProps {
  logs: LogEntry[];
}

export const Console: React.FC<ConsoleProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-black border-2 border-[#33ff00] p-4 font-mono text-lg overflow-hidden shadow-[0_0_20px_rgba(51,255,0,0.2)]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {logs.map((log) => (
          <div key={log.id} className={`flex flex-col ${log.role === 'PLAYER' ? 'items-end' : 'items-start'}`}>
            <span className={`text-xs uppercase opacity-50 mb-1 ${log.role === 'PLAYER' ? 'text-cyan-400' : 'text-[#33ff00]'}`}>
              {log.role === 'GM' ? 'Game Master' : log.role === 'PLAYER' ? 'Agent 1' : 'System'}
            </span>
            <div 
              className={`max-w-[90%] p-2 rounded ${
                log.role === 'PLAYER' 
                  ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-800' 
                  : log.role === 'GM'
                  ? 'bg-[#33ff00]/10 text-[#33ff00] border border-[#33ff00]/30'
                  : 'text-gray-500 italic'
              }`}
            >
              {log.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};