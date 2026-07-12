import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, LogOut, Search, PlusCircle, RefreshCw, FileText, CheckCircle2, AlertOctagon, UserCheck } from 'lucide-react';
import { getComplaints, clearSession, getSession } from '../lib/api';
import { GrievanceComplaint } from '../types';
import GrievanceCard from './GrievanceCard';
import LanguageSelector from './LanguageSelector';
import GrievanceFormModal from './GrievanceFormModal';
import BellNotification from './BellNotification';

interface OfficerDashboardViewProps {
  onLogout: () => void;
  onSelectComplaint: (id: string) => void;
  openSelectedComplaintDetail?: (id: string) => void;
}

export default function OfficerDashboardView({ onLogout, onSelectComplaint, openSelectedComplaintDetail }: OfficerDashboardViewProps) {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState<GrievanceComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewScope, setViewScope] = useState<'assigned' | 'jurisdiction'>('assigned');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const session = getSession();

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const list = await getComplaints(statusFilter, viewScope, searchQuery);
      setComplaints(list);
    } catch (err) {
      console.error('Failed to load officer complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, viewScope, searchQuery]);

  return (
    <div id="officer-dashboard-wrapper" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Upper Navigation bar */}
      <header id="officer-header" className="bg-white border-b border-slate-100 py-3 px-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">{t('common.title')}</h1>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
              Revenue Officer Control Cockpit • {session?.user.designation} Office
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSelector />
          {/* Bell Notification stream */}
          <BellNotification onNotificationClick={(complaintId) => {
            if (openSelectedComplaintDetail) {
              openSelectedComplaintDetail(complaintId);
            } else {
              onSelectComplaint(complaintId);
            }
          }} />
          <button
            id="officer-logout-btn"
            onClick={() => { clearSession(); onLogout(); }}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </header>

      {/* Main Container workspace */}
      <main id="officer-main" className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        <div id="officer-profile-tray" className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
          <div>
            <h2 id="welcome-officer" className="text-base font-extrabold text-slate-850">Verified Administrative Identity: {session?.user.fullName}</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Gov ID: {session?.user.officerId} • Office: {session?.user.profile.officeLocation} • Desk Rank: {session?.user.designation}
            </p>
          </div>

          <div className="flex items-center space-x-3.5 shrink-0">
            {/* View Scope Toggle (Assigned directly vs Jurisdiction all) */}
            <div className="flex border border-slate-250 p-1 bg-slate-50 rounded-lg font-bold text-[11px]">
              <button
                id="scope-assigned-btn"
                onClick={() => setViewScope('assigned')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${viewScope === 'assigned' ? 'bg-white text-slate-800 border border-slate-150' : 'text-slate-450 hover:text-slate-700'}`}
              >
                Assigned Desk
              </button>
              <button
                id="scope-juris-btn"
                onClick={() => setViewScope('jurisdiction')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${viewScope === 'jurisdiction' ? 'bg-white text-slate-800 border border-slate-150' : 'text-slate-450 hover:text-slate-700'}`}
              >
                Jurisdiction Board
              </button>
            </div>

            <button
              id="file-docket-btn"
              onClick={() => setIsFormOpen(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record New Case</span>
            </button>
          </div>
        </div>

        {/* Filters and search blocks */}
        <div id="officer-filter-bar" className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 items-center bg-slate-50 border border-slate-200 rounded-lg max-w-sm">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              id="officer-search-query"
              type="text"
              placeholder="Query docket no, patta details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-2 pr-4 py-2 text-xs font-semibold text-slate-700 bg-transparent outline-none placeholder-slate-450"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              id="officer-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="pending">Pending Review</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">Investigation</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected Claim</option>
            </select>

            <button
              id="officer-refresh-list"
              onClick={loadComplaints}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer text-slate-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Complaints Grid representation */}
        {loading ? (
          <div id="officer-grid-loading" className="p-16 text-center text-slate-500 font-semibold text-xs animate-pulse">
            {t('common.loading')}
          </div>
        ) : complaints.length === 0 ? (
          <div id="officer-empty-box" className="p-16 text-center text-slate-350 bg-white border border-slate-200 rounded-2xl text-xs font-semibold space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="max-w-md mx-auto">Your administrative desk is completely clean! No active complaints recorded under this view.</p>
          </div>
        ) : (
          <div id="officer-complaints-roster" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {complaints.map(comp => (
              <GrievanceCard
                key={comp.id}
                complaint={comp}
                onClick={() => onSelectComplaint(comp.id)}
              />
            ))}
          </div>
        )}

      </main>

      {/* Record Form modal popup */}
      {isFormOpen && (
        <GrievanceFormModal
          onClose={() => setIsFormOpen(false)}
          onSuccess={loadComplaints}
        />
      )}

      {/* Footer credit bar */}
      <footer id="officer-footer" className="bg-white border-t border-slate-100 py-3.5 text-center shrink-0">
        <p className="text-[10px] font-semibold text-slate-400">© 2026 District Revenue Office Cockpit. Internal Administration Use Only.</p>
      </footer>
    </div>
  );
}
