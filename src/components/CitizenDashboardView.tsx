import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, LogOut, Search, RefreshCw, Layers } from 'lucide-react';
import { getComplaints, clearSession, getSession } from '../lib/api';
import { GrievanceComplaint } from '../types';
import GrievanceCard from './GrievanceCard';
import LanguageSelector from './LanguageSelector';

interface CitizenDashboardViewProps {
  onLogout: () => void;
  onSelectComplaint: (id: string) => void;
}

export default function CitizenDashboardView({ onLogout, onSelectComplaint }: CitizenDashboardViewProps) {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState<GrievanceComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const session = getSession();

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const list = await getComplaints(statusFilter, 'all', searchQuery);
      setComplaints(list);
    } catch (err) {
      console.error('Failed to load citizen complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, searchQuery]);

  return (
    <div id="citizen-dashboard-wrapper" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header bar */}
      <header id="citizen-header" className="bg-white border-b border-slate-100 py-3.5 px-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-50 border border-brand-100 rounded-xl">
            <Landmark className="w-5 h-5 text-brand-650" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">{t('common.title')}</h1>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Citizen Redressal Workspace Panel</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <button
            id="citizen-logout-btn"
            onClick={() => { clearSession(); onLogout(); }}
            className="flex items-center space-x-1 px-3.5 py-1.5 border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </header>

      {/* Main body info layout */}
      <main id="citizen-main" className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        <div id="citizen-welcome-tray" className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Welcome, {session?.user.fullName}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Registered Identity Ref: {session?.user.mobile} • Account Type: Citizen</p>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="flex space-x-4 text-center font-bold text-xs shrink-0">
            <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
              <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Submitted</span>
              <span className="text-slate-800 text-sm font-mono mt-0.5 block">{complaints.length}</span>
            </div>
            <div className="bg-amber-50 text-amber-800 border border-amber-100 px-4 py-2 rounded-xl">
              <span className="text-amber-500 text-[9px] uppercase tracking-wider block">In Progress</span>
              <span className="text-sm font-mono mt-0.5 block">{complaints.filter(c => c.status === 'in_progress').length}</span>
            </div>
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-4 py-2 rounded-xl">
              <span className="text-emerald-500 text-[9px] uppercase tracking-wider block">Resolved</span>
              <span className="text-sm font-mono mt-0.5 block">{complaints.filter(c => c.status === 'resolved').length}</span>
            </div>
          </div>
        </div>

        {/* Filters and search dockets */}
        <div id="citizen-filter-controls" className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 items-center bg-slate-50 border border-slate-200 rounded-lg max-w-md shadow-inner">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              id="citizen-filter-search"
              type="text"
              placeholder="Search by Complaint Number or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-2.5 pr-4 py-2 text-xs font-semibold text-slate-700 bg-transparent outline-none"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Grievances</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              id="citizen-refresh-btn"
              onClick={loadComplaints}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer text-slate-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Complaints Roster */}
        {loading ? (
          <div id="citizen-roster-loading" className="p-16 text-center font-bold text-slate-400 text-xs tracking-wider animate-pulse">
            {t('common.loading')}
          </div>
        ) : complaints.length === 0 ? (
          <div id="citizen-empty-tray" className="bg-white border border-slate-200 p-12 text-center rounded-2xl space-y-3 shadow-inner">
            <Layers className="w-8 h-8 text-slate-350 mx-auto" />
            <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
              {t('citizen.noGrievances')}
            </p>
          </div>
        ) : (
          <div id="citizen-complaints-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {complaints.map(complaint => (
              <GrievanceCard
                key={complaint.id}
                complaint={complaint}
                onClick={() => onSelectComplaint(complaint.id)}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer credit bar */}
      <footer id="citizen-footer" className="bg-white border-t border-slate-100 py-3 text-center shrink-0">
        <p className="text-[10px] font-semibold text-slate-400">© 2026 District Grievance Center. All rights reserved.</p>
      </footer>
    </div>
  );
}
