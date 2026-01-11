
export interface Company {
  id: string;
  name: string;
  domain: string;
  status: 'idle' | 'scanning' | 'found' | 'error';
  lastChecked?: string;
}

export interface JobAlert {
  id: string;
  companyName: string;
  title: string;
  link: string;
  reason: string;
  detectedAt: Date;
  archived?: boolean;
}

export interface UserProfile {
  resumeText: string;
  skills: string[];
  targetRoles: string[];
  vectorSummary: string;
}

export type AgentType = 'PROFILER' | 'SCOUT' | 'CRITIC' | 'REPORTER';

export interface AgentStatus {
  type: AgentType;
  isActive: boolean;
  message: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  agent: AgentType;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export interface SentinelStats {
  totalScans: number;
  totalMatches: number;
  activeWatchlist: number;
  upTime: string;
}

// Unified state for atomic storage
export interface SentinelHiveState {
  resumeText: string;
  profile: UserProfile | null;
  companies: Company[];
  alerts: JobAlert[];
  stats: Omit<SentinelStats, 'upTime'>;
}
