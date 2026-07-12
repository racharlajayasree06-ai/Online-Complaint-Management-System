import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, User, MapPin, Calendar, Layers, Activity, CheckCircle2, AlertTriangle, Send, ShieldAlert, Tag } from 'lucide-react';
import { getComplaintDetail, updateComplaintStatus, assignComplaint, getOfficersList, getSession } from '../lib/api';
import { GrievanceComplaint } from '../types';

interface GrievanceDetailViewProps {
  complaintId: string;
  onBack: () => void;
  onViewMap: (complaint: GrievanceComplaint) => void;
}

export default function GrievanceDetailView({ complaintId, onBack, onViewMap }: GrievanceDetailViewProps) {
  const { t } = useTranslation();
  const [complaint, setComplaint] = useState<GrievanceComplaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Roster lists
  const [officers, setOfficers] = useState<any[]>([]);

  // Action states
  const [actionStatus, setActionStatus] = useState('in_progress');
  const [actionNote, setActionNote] = useState('');
  const [delegateOfficerId, setDelegateOfficerId] = useState('');
  const [delegateNote, setDelegateNote] = useState('');

  const session = getSession();
  const isOfficer = session?.user.role === 'officer';

  const loadData = async () => {
    try {
      setLoading(true);
      const detail = await getComplaintDetail(complaintId);
      setComplaint(detail);
      setActionStatus(detail.status);
      
      if (isOfficer) {
        const list = await getOfficersList();
        // Remove current officer from matching target rosters
        setOfficers(list.filter(o => o.id !== session?.user.id));
        if (list.length > 0) {
          setDelegateOfficerId(list[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to pull docket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [complaintId]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    setError('');
    setSuccess('');

    try {
      const updated = await updateComplaintStatus(complaint.id, actionStatus, actionNote);
      setComplaint(updated);
      setSuccess('Status log recorded successfully.');
      setActionNote('');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update docket status.');
    }
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !delegateOfficerId) return;
    setError('');
    setSuccess('');

    try {
      const updated = await assignComplaint(complaint.id, delegateOfficerId, delegateNote);
      setComplaint(updated);
      setSuccess('Docket delegated to selected officer.');
      setDelegateNote('');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Delegation assignment failed.');
    }
  };

  if (loading) {
    return (
      <div id="detail-loading-box" className="p-12 text-center text-slate-500 font-semibold text-xs">
        {t('common.loading')}
      </div>
    );
  }

  if (error && !complaint) {
    return (
      <div id="detail-error-box" className="bg-red-50 text-red-700 p-5 rounded-xl border border-red-200">
        <p className="text-sm font-bold">{error}</p>
        <button id="retry-detail-load" onClick={loadData} className="mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">Retry</button>
      </div>
    );
  }

  if (!complaint) return null;

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'in_progress': return 'bg-amber-500 text-white';
      case 'assigned': return 'bg-blue-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div id="grievance-detail-panel" className="space-y-6">
      {/* Detail Navigation Header */}
      <div id="detail-nav-header" className="flex items-center justify-between">
        <button
          id="back-list-btn"
          onClick={onBack}
          className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono font-bold text-slate-400">{complaint.complaintNo}</span>
          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded shadow-sm ${getStatusColor(complaint.status)}`}>
            {complaint.status}
          </span>
        </div>
      </div>

      {success && (
        <div id="detail-success-alert" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div id="detail-error-alert" className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main Grid: Detail Info & Proceedings Section */}
      <div id="detail-main-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Grievance summary & timeline bounds */}
        <div id="detail-main-content" className="lg:col-span-2 space-y-6">
          
          {/* Card: Docket Info Summary */}
          <div id="docket-info-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 id="docket-title-heading" className="text-base font-bold text-slate-900 leading-snug">{complaint.title}</h3>
            <p id="docket-desc-body" className="text-xs text-slate-600 whitespace-pre-wrap mt-2.5 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-xl font-medium">
              {complaint.description}
            </p>

            <div id="docket-grid-meta" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs font-semibold text-slate-700">
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Verification Categorized</span>
                <span className="flex items-center space-x-1"><Tag className="w-3.5 h-3.5 text-slate-400" /><span>{complaint.category}</span></span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">SLA Priority Scope</span>
                <span className="capitalize">{complaint.priority} Priority Mode</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Filing Timestamp</span>
                <span className="flex items-center space-x-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /><span>{formattedDate}</span></span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Revenue Territorial Node</span>
                <span className="flex items-center space-x-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{complaint.village || complaint.location}, {complaint.mandal}, {complaint.district}</span></span>
              </div>
              {complaint.surveyNumber && (
                <div className="space-y-1.5 md:col-span-2 bg-slate-50/50 p-3 rounded border border-dashed border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-extrabold block">Survey &amp; Parcel Number</span>
                      <span className="font-mono font-bold text-slate-800">{complaint.surveyNumber}</span>
                    </div>
                  </div>
                  <button
                    id="view-radar-bounds"
                    onClick={() => onViewMap(complaint)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded transition-colors cursor-pointer"
                  >
                    View Radar Bounds
                  </button>
                </div>
              )}

              {complaint.documents && complaint.documents.length > 0 && (
                <div className="space-y-2 md:col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200 mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block mb-1">Supporting Documents</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {complaint.documents.map((doc, idx) => {
                      const isImage = doc.type.startsWith('image/');
                      return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between space-y-2 shadow-sm">
                          <div className="flex items-start space-x-2">
                            <span className="p-1 px-1.5 bg-slate-100 rounded shrink-0 font-bold text-[8px] uppercase select-none font-mono text-slate-500">
                              {doc.name.split('.').pop() || 'file'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono">({(doc.size / 1024).toFixed(1)} KB)</p>
                            </div>
                          </div>
                          
                          {isImage && doc.content && (
                            <img src={doc.content} alt={doc.name} className="h-20 w-full object-cover rounded border border-slate-100" referrerPolicy="no-referrer" />
                          )}

                          <a
                            href={doc.content}
                            download={doc.name}
                            className="text-center text-[10px] font-extrabold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 py-1.5 rounded transition-all cursor-pointer block"
                          >
                            Download File
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline and History workflow log */}
          <div id="timeline-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 id="timeline-heading" className="text-xs uppercase tracking-wider font-extrabold text-slate-400 flex items-center space-x-2 mb-6">
              <Activity className="w-4 h-4 text-slate-500" />
              <span>Dossier proceedings &amp; Movement Timeline</span>
            </h3>

            <div id="timeline-node-stack" className="relative pl-6 border-l-2 border-slate-100 space-y-6">
              {complaint.history.map((log, index) => {
                const logTime = new Date(log.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const isCurrent = index === complaint.history.length - 1;

                return (
                  <div id={`timeline-node-${log.id}`} key={log.id} className="relative">
                    {/* Ring indicator anchor */}
                    <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${isCurrent ? 'bg-brand-600 text-white ring-brand-100' : 'bg-slate-300 text-slate-650'}`}>
                      {isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isCurrent ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{logTime}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-normal">{log.note}</p>
                      <span className="text-[10px] italic font-semibold text-slate-400 block mt-0.5">Updated by: {log.updatedBy}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Administrative actions Room (Officers only) */}
        <div id="detail-actions-sidebar" className="space-y-6">
          
          {/* Card: Client Profile */}
          <div id="target-citizen-card" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 flex items-center space-x-1.5 mb-3.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>Citizen Information</span>
            </h4>
            <div className="space-y-2 text-xs font-semibold text-slate-700">
              <p className="text-sm font-extrabold text-slate-900">{complaint.citizenName}</p>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-500 font-semibold text-[11px]">
                <p>Mobile: {complaint.citizenMobile}</p>
                <p className="truncate">Email: {complaint.citizenEmail}</p>
                <p>Applicant ID: {complaint.citizenId}</p>
              </div>
            </div>
          </div>

          {complaint.assignedToName && (
            <div id="current-custody-card" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 flex items-center space-x-1.5 mb-2.5">
                <ShieldAlert className="w-4 h-4 text-slate-450" />
                <span>Current Officer Desk</span>
              </h4>
              <p className="text-xs font-bold text-slate-800">{complaint.assignedToName}</p>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">
                {complaint.assignedToDesignation}
              </span>
            </div>
          )}

          {isOfficer && (
            <>
              {/* Administrative Status Modification room */}
              <div id="status-update-card" className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm text-white">
                <h4 className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400 mb-4">Admit Progress Proceeding</h4>
                <form onSubmit={handleStatusUpdate} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Next State Transition</label>
                    <select
                      id="action-status-select"
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-semibold text-white outline-none cursor-pointer"
                    >
                      <option value="pending">Keep Pending</option>
                      <option value="assigned">Assigned to Field</option>
                      <option value="in_progress">Verify in Progress</option>
                      <option value="resolved">Mark Resolved (Settle)</option>
                      <option value="rejected">Reject &amp; Drop Claim</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Statement Resolution Notes</label>
                    <textarea
                      id="action-note-textarea"
                      placeholder="Input official proceedings statement detail..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-semibold text-white outline-none placeholder-slate-600 resize-none"
                      required
                    ></textarea>
                  </div>
                  <button
                    id="submit-status-update"
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold p-2 rounded text-xs transition-colors cursor-pointer text-center"
                  >
                    Post Proceeding Log
                  </button>
                </form>
              </div>

              {/* Escalation & onward delegation room */}
              <div id="delegate-escalation-card" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-[10px] tracking-wider uppercase font-extrabold text-slate-500 mb-4">Escalate / Direct Delegate</h4>
                <form onSubmit={handleDelegate} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Target Officer</label>
                    <select
                      id="delegate-officer-select"
                      value={delegateOfficerId}
                      onChange={(e) => setDelegateOfficerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                    >
                      {officers.map(o => (
                        <option key={o.id} value={o.id}>{o.fullName} ({o.designation})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Routing instructions</label>
                    <textarea
                      id="delegate-note-textarea"
                      placeholder="Add forwarding remark instruction notes..."
                      value={delegateNote}
                      onChange={(e) => setDelegateNote(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 outline-none placeholder-slate-400 resize-none"
                      required
                    ></textarea>
                  </div>
                  <button
                    id="submit-delegate-assignment"
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold p-2 rounded text-xs transition-colors cursor-pointer text-center flex items-center justify-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Forward Assignment</span>
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
