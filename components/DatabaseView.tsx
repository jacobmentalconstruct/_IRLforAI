import React from 'react';
import { SimpleSQL } from '../utils/database';

interface DatabaseViewProps {
  dbInstance: SimpleSQL;
  tick: number; // Force re-render
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ dbInstance }) => {
  const sqlDump = dbInstance.exportSQL();

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-cyan-800/50 font-mono text-xs text-cyan-600 p-2">
      <div className="flex justify-between items-center mb-2 border-b border-cyan-900 pb-1">
        <span className="uppercase tracking-widest font-bold">SQL Database State</span>
        <span className="text-[10px] animate-pulse">● LIVE CONNECTION</span>
      </div>
      <pre className="flex-1 overflow-auto custom-scrollbar p-2 bg-black/50 rounded">
        {sqlDump}
      </pre>
    </div>
  );
};