
import React from 'react';
import { AgentStatus } from '../types';

interface Props {
  statuses: AgentStatus[];
}

const AgentDashboard: React.FC<Props> = ({ statuses }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {statuses.map((agent) => (
        <div 
          key={agent.type}
          className={`p-4 rounded-2xl border transition-all duration-500 ${
            agent.isActive 
              ? 'bg-blue-900/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.02]' 
              : 'bg-slate-900/40 border-slate-800 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${agent.isActive ? 'text-blue-400' : 'text-slate-500'}`}>
              {agent.type} AGENT
            </span>
            <div className={`w-1.5 h-1.5 rounded-full ${agent.isActive ? 'bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]' : 'bg-slate-700'}`}></div>
          </div>
          <p className={`text-sm font-bold truncate ${agent.isActive ? 'text-slate-200' : 'text-slate-500'}`}>
            {agent.message}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AgentDashboard;
