
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Company, JobAlert, UserProfile, AgentStatus, 
  AgentType, LogEntry, SentinelStats, SentinelHiveState 
} from './types';
import { profileAgent, scoutAgent, criticAgent } from './services/geminiService';
import AgentDashboard from './components/AgentDashboard';
import JobCard from './components/JobCard';

const STORAGE_KEY = 'zenith_sentinel_v10_prod';

const SAMPLE_RESUME = `
PMP-certified project manager with 8 years steering cross-industry portfolios. 
Expertise in Agile/Scrum, strategic resource allocation, and delivering $10M+ initiatives on time. 
Proficient in Jira, Asana, and stakeholder management.
Seeking: Senior Project Manager or Program Manager roles in Tech/SaaS.
`;

const DEFAULT_COMPANIES: Company[] = [
  { id: '1', name: 'OpenAI', domain: 'openai.com', status: 'idle' },
  { id: '2', name: 'Anthropic', domain: 'anthropic.com', status: 'idle' },
  { id: '3', name: 'NVIDIA', domain: 'nvidia.com', status: 'idle' },
  { id: '4', name: 'Google', domain: 'google.com', status: 'idle' },
  { id: '5', name: 'Meta', domain: 'meta.com', status: 'idle' },
  { id: '6', name: 'Stripe', domain: 'stripe.com', status: 'idle' },
  { id: '7', name: 'Microsoft', domain: 'microsoft.com', status: 'idle' },
  { id: '8', name: 'Apple', domain: 'apple.com', status: 'idle' },
  { id: '9', name: 'Netflix', domain: 'netflix.com', status: 'idle' },
  { id: '10', name: 'Tesla', domain: 'tesla.com', status: 'idle' }
];

const INITIAL_AGENTS: AgentStatus[] = [
  { type: 'PROFILER', isActive: false, message: 'Idle' },
  { type: 'SCOUT', isActive: false, message: 'Idle' },
  { type: 'CRITIC', isActive: false, message: 'Idle' },
  { type: 'REPORTER', isActive: false, message: 'Idle' }
];

const App: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [stats, setStats] = useState<SentinelStats>({
    totalScans: 0,
    totalMatches: 0,
    activeWatchlist: DEFAULT_COMPANIES.length,
    upTime: '00:00:00'
  });

  const [agents, setAgents] = useState<AgentStatus[]>(INITIAL_AGENTS);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isProfiling, setIsProfiling] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCompanyIndex, setActiveCompanyIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'matches' | 'archives'>('matches');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useRef(false);
  const monitorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LOGGING
  const addLog = useCallback((agent: AgentType, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      agent, message, type
    }, ...prev].slice(0, 50));
  }, []);

  const updateAgent = useCallback((type: AgentType, active: boolean, msg: string) => {
    setAgents(prev => prev.map(a => a.type === type ? { ...a, isActive: active, message: msg } : a));
  }, []);

  // HYDRATION
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setResumeText(parsed.resumeText || '');
        setProfile(parsed.profile);
        setCompanies(parsed.companies || DEFAULT_COMPANIES);
        setAlerts((parsed.alerts || []).map((a: any) => ({ ...a, detectedAt: new Date(a.detectedAt) })));
        setStats(prev => ({ ...prev, ...parsed.stats }));
      } catch (e) {}
    }
    isHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!isHydrated.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ resumeText, profile, companies, alerts, stats }));
  }, [resumeText, profile, companies, alerts, stats]);

  // MANUAL PROFILING
  const handleLockVector = async () => {
    if (!resumeText.trim()) return;
    setIsProfiling(true);
    updateAgent('PROFILER', true, 'Synthesizing identity...');
    addLog('PROFILER', 'Engaging Profiler Agent for Vector Synthesis...', 'info');
    
    try {
      const result = await profileAgent(resumeText);
      setProfile(result);
      addLog('PROFILER', 'VECTOR LOCKED: Subject identity successfully synthesized.', 'success');
    } catch (e) {
      addLog('PROFILER', 'Synthesis error. API key or network failure.', 'warning');
    } finally {
      setIsProfiling(false);
      updateAgent('PROFILER', false, 'Identity Locked');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setResumeText(text);
      setProfile(null); // Reset profile when new data arrives
      addLog('REPORTER', `Imported raw document: ${file.name}`, 'info');
    };
    reader.readAsText(file);
  };

  // MONITORING LOGIC
  const processCycle = async () => {
    if (!isMonitoring || !profile) return;

    for (let i = 0; i < companies.length; i++) {
      if (!isMonitoring) break;
      setActiveCompanyIndex(i);
      const target = companies[i];
      
      setCompanies(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'scanning' } : c));
      updateAgent('SCOUT', true, `Scanning ${target.name}`);
      addLog('SCOUT', `Scanning 7-day index for ${target.name}...`, 'info');

      try {
        const { jobs } = await scoutAgent(target.name, target.domain, profile.targetRoles);
        setStats(prev => ({ ...prev, totalScans: prev.totalScans + 1 }));

        if (jobs.length > 0) {
          addLog('SCOUT', `Found ${jobs.length} candidate links. Grounding check initiated.`, 'success');
          updateAgent('CRITIC', true, `Vetting leads...`);
          
          for (const job of jobs) {
            const match = await criticAgent(job, profile);
            if (match) {
              const exists = alerts.some(a => a.link === match.link);
              if (exists) continue;

              const newAlert: JobAlert = {
                id: Math.random().toString(36).substr(2, 9),
                companyName: target.name,
                title: match.title!,
                link: match.link!,
                reason: match.reason!,
                detectedAt: new Date(),
                archived: false
              };
              setAlerts(prev => [newAlert, ...prev]);
              setStats(prev => ({ ...prev, totalMatches: prev.totalMatches + 1 }));
              addLog('REPORTER', `HIGH-PRIORITY ALERT: ${match.title}`, 'success');
            }
          }
        } else {
          addLog('SCOUT', `Zero recent postings for ${target.name} found in index.`, 'warning');
        }
      } catch (e) {
        addLog('SCOUT', `Search index error for ${target.name}.`, 'warning');
      } finally {
        updateAgent('SCOUT', false, 'Idle');
        updateAgent('CRITIC', false, 'Idle');
        setCompanies(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'idle' } : c));
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    if (isMonitoring) {
      addLog('REPORTER', 'Full cycle completed. Monitoring next batch in 60s.', 'info');
      monitorTimeoutRef.current = setTimeout(processCycle, 60000);
    }
  };

  useEffect(() => {
    if (isMonitoring) processCycle();
    else if (monitorTimeoutRef.current) clearTimeout(monitorTimeoutRef.current);
    return () => { if (monitorTimeoutRef.current) clearTimeout(monitorTimeoutRef.current); };
  }, [isMonitoring]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 p-6 lg:p-12 selection:bg-blue-500/30">
      <div className="max-w-[1700px] mx-auto">
        
        {/* TOP BAR */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]' : 'bg-slate-700'}`}></div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">Zenith <span className="text-blue-500">Sentinel</span></h1>
            </div>
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
              Autonomous Swarm • <span className="text-emerald-500">7-Day Freshness</span> • IP-Safe Grounding
            </p>
          </div>

          <div className="flex gap-4 mt-6 md:mt-0">
            <button 
              onClick={() => { setResumeText(SAMPLE_RESUME); setProfile(null); addLog('REPORTER', 'Loaded test profile: Project Manager.', 'info'); }}
              className="px-6 py-3 rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-widest hover:border-blue-500/50 transition-all bg-slate-900/40"
            >
              Test Drive
            </button>
            <button 
              onClick={() => setIsMonitoring(!isMonitoring)}
              disabled={!profile}
              className={`px-12 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${
                isMonitoring 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                  : 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 hover:scale-[1.02]'
              } ${!profile ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
            >
              {isMonitoring ? 'HALT CYCLE' : 'ENGAGE SWARM'}
            </button>
          </div>
        </header>

        <AgentDashboard statuses={agents} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN: IDENTITY */}
          <div className="xl:col-span-4 space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
               <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   Subject Identity
                 </h3>
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[9px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors flex items-center gap-2"
                 >
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                   Upload
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" className="hidden" />
               </div>
               
               <textarea
                 value={resumeText}
                 onChange={(e) => { setResumeText(e.target.value); if (profile) setProfile(null); }}
                 placeholder="Paste resume here to synthesize identity..."
                 className="w-full h-56 bg-black/40 border border-slate-800 rounded-2xl p-5 text-sm focus:border-blue-500 outline-none transition-all resize-none mb-4 font-mono custom-scrollbar placeholder:text-slate-700"
               />

               <button
                 onClick={handleLockVector}
                 disabled={isProfiling || !resumeText.trim() || !!profile}
                 className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed transition-all ${
                   profile 
                   ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' 
                   : 'border-slate-800 text-slate-500 hover:border-blue-500 hover:text-blue-400'
                 }`}
               >
                 {isProfiling ? 'SYNTHESIZING...' : profile ? 'VECTOR LOCKED ✓' : 'LOCK SUBJECT VECTOR'}
               </button>

               {profile && (
                 <div className="mt-4 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                   <p className="text-xs text-slate-400 leading-relaxed italic">"{profile.vectorSummary}"</p>
                 </div>
               )}
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Watchlist
              </h3>
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {companies.map((c, idx) => (
                  <div key={c.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${activeCompanyIndex === idx ? 'bg-blue-500/10 border-blue-500/50 scale-[1.02] shadow-xl shadow-blue-900/10' : 'bg-black/20 border-slate-800'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 border border-slate-700">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 leading-tight">{c.name}</div>
                        <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">{c.domain}</div>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${c.status === 'scanning' ? 'bg-blue-400 animate-ping' : 'bg-slate-700'}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: DETECTIONS */}
          <div className="xl:col-span-5 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-3xl font-black uppercase tracking-tighter italic">Found Leads</h2>
               <div className="flex bg-slate-800/40 p-1 rounded-xl border border-slate-700">
                  <button onClick={() => setViewMode('matches')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'matches' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Live</button>
                  <button onClick={() => setViewMode('archives')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'archives' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Archived</button>
               </div>
            </div>

            <div className="space-y-5 max-h-[850px] overflow-y-auto pr-4 custom-scrollbar">
              {(viewMode === 'matches' ? alerts.filter(a => !a.archived) : alerts.filter(a => a.archived)).map(alert => (
                <JobCard 
                  key={alert.id} 
                  alert={alert} 
                  onArchive={(id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, archived: !a.archived } : a))} 
                  isArchived={viewMode === 'archives'} 
                />
              ))}
              {alerts.length === 0 && (
                <div className="py-36 text-center bg-slate-900/10 border-2 border-slate-800 border-dashed rounded-[3rem] px-12">
                  <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-[10px] mb-2 leading-relaxed">
                    {isMonitoring ? 'Scanning Grounding Engine...' : profile ? 'Engage Swarm to detect postings' : 'Lock Subject Vector to proceed'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: TERMINAL */}
          <div className="xl:col-span-3">
            <div className="bg-black border border-slate-800 rounded-[2.5rem] h-[950px] flex flex-col overflow-hidden shadow-2xl">
               <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
                    Operations
                  </span>
                  <button onClick={() => { setLogs([]); localStorage.clear(); window.location.reload(); }} className="text-[9px] font-black text-slate-800 hover:text-red-500 transition-colors uppercase">Flush</button>
               </div>
               <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-4 custom-scrollbar">
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-3 leading-relaxed animate-in fade-in slide-in-from-left-2">
                      <span className="text-slate-800 shrink-0">[{log.timestamp}]</span>
                      <span className={`${log.agent === 'PROFILER' ? 'text-purple-600' : log.agent === 'SCOUT' ? 'text-blue-500' : log.agent === 'CRITIC' ? 'text-orange-500' : 'text-emerald-500'} font-black shrink-0`}>{log.agent}:</span>
                      <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-yellow-600' : 'text-slate-500'}>{log.message}</span>
                    </div>
                  ))}
                  {logs.length === 0 && <p className="text-slate-900 italic text-center py-10 uppercase tracking-widest text-[9px]">Awaiting Signal...</p>}
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;
