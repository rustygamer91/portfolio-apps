
import React from 'react';
import { JobAlert } from '../types';

interface Props {
  alert: JobAlert;
  onArchive: (id: string) => void;
  isArchived?: boolean;
}

const JobCard: React.FC<Props> = ({ alert, onArchive, isArchived }) => {
  return (
    <div className={`group relative border rounded-2xl p-5 transition-all duration-300 overflow-hidden ${
      isArchived 
        ? 'bg-slate-900/30 border-slate-800/50 opacity-60' 
        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
    }`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${isArchived ? 'bg-slate-700' : 'bg-emerald-500'}`}></div>
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{alert.companyName}</h4>
          <h3 className={`text-lg font-bold transition-colors leading-tight ${
            isArchived ? 'text-slate-500' : 'text-white group-hover:text-blue-400'
          }`}>{alert.title}</h3>
        </div>
        <div className="flex gap-2">
          {!isArchived && (
            <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-1 rounded border border-emerald-500/20">
              MATCH
            </div>
          )}
          <button 
            onClick={() => onArchive(alert.id)}
            className="p-1 text-slate-600 hover:text-slate-400 transition-colors"
            title={isArchived ? "Restore to matches" : "Move to archives"}
          >
            {isArchived ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            )}
          </button>
        </div>
      </div>
      
      <p className={`text-sm mb-5 line-clamp-2 leading-relaxed italic ${isArchived ? 'text-slate-600' : 'text-slate-400'}`}>
        "{alert.reason}"
      </p>
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
        <span className="text-[10px] font-bold text-slate-600 uppercase">
          DETECTED: {alert.detectedAt.toLocaleTimeString()}
        </span>
        <a 
          href={alert.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            isArchived 
              ? 'border-slate-800 text-slate-600 cursor-not-allowed' 
              : 'bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/20'
          }`}
        >
          {isArchived ? 'REQUISITION CLOSED' : 'OPEN REQUISITION'}
        </a>
      </div>
    </div>
  );
};

export default JobCard;
