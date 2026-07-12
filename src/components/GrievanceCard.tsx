import { GrievanceComplaint } from '../types';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, Layers, ShieldAlert } from 'lucide-react';

interface GrievanceCardProps {
  key?: any;
  complaint: GrievanceComplaint;
  onClick: () => void;
}

export default function GrievanceCard({ complaint, onClick }: GrievanceCardProps) {
  const { t } = useTranslation();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'assigned':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-amber-500 text-white';
      case 'medium':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div
      id={`grievance-card-${complaint.id}`}
      onClick={onClick}
      className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div id="card-top-row" className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-mono font-bold text-slate-400">
            {complaint.complaintNo}
          </span>
          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${getStatusBadge(complaint.status)}`}>
              {complaint.status.replace('_', ' ')}
            </span>
            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${getPriorityBadge(complaint.priority)}`}>
              {complaint.priority}
            </span>
          </div>
        </div>

        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1 mb-2">
          {complaint.title}
        </h4>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
          {complaint.description}
        </p>
      </div>

      <div id="card-meta-row" className="border-t border-slate-100 pt-3 flex flex-wrap gap-y-2 items-center justify-between text-[11px] text-slate-500 font-semibold gap-x-2">
        <div className="flex items-center space-x-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate max-w-[140px]">{complaint.village || complaint.location}, {complaint.mandal}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formattedDate}</span>
        </div>
        {complaint.surveyNumber && complaint.surveyNumber !== 'N/A' && (
          <div className="flex items-center space-x-1 w-full mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-bold">
            <Layers className="w-3 h-3" />
            <span>Survey No: {complaint.surveyNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}
