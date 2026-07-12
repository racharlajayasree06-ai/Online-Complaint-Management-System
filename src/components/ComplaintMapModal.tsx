import { useEffect, useState } from 'react';
import { X, Navigation, Compass, Layers, Globe, MapPin, Landmark, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { GrievanceComplaint } from '../types';
import { getComplaints } from '../lib/api';

interface ComplaintMapModalProps {
  complaint: GrievanceComplaint;
  onClose: () => void;
  onSelectComplaint?: (comp: GrievanceComplaint) => void;
}

export default function ComplaintMapModal({ complaint, onClose, onSelectComplaint }: ComplaintMapModalProps) {
  const [allComplaints, setAllComplaints] = useState<GrievanceComplaint[]>([]);
  const [selectedSurveyNo, setSelectedSurveyNo] = useState<string>(complaint.surveyNumber || '');
  const [localActiveComplaint, setLocalActiveComplaint] = useState<GrievanceComplaint>(complaint);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const list = await getComplaints('all', 'all', '');
        setAllComplaints(list);
      } catch (err) {
        console.error('Failed to pull complaints list for maps:', err);
      }
    };
    fetchAll();
  }, []);

  // Update focused complaint locally if parent updates
  useEffect(() => {
    setLocalActiveComplaint(complaint);
    if (complaint.surveyNumber) {
      setSelectedSurveyNo(complaint.surveyNumber);
    }
  }, [complaint]);

  // Group complaints by survey number
  const surveyGroups = allComplaints.reduce((acc, comp) => {
    const srv = comp.surveyNumber || 'N/A';
    if (!acc[srv]) {
      acc[srv] = [];
    }
    acc[srv].push(comp);
    return acc;
  }, {} as Record<string, GrievanceComplaint[]>);

  // Identify survey numbers with active complaints
  const surveyNosWithActive = Object.keys(surveyGroups).filter(srv => {
    return surveyGroups[srv].some(c => c.status !== 'resolved' && c.status !== 'rejected');
  });

  const selectedGroupComplaints = surveyGroups[selectedSurveyNo] || [];

  // Deterministic styling coordinates for drawing pins on mock map radar
  const getSurveyPosition = (srv: string) => {
    let hash1 = 0;
    let hash2 = 0;
    for (let i = 0; i < srv.length; i++) {
      hash1 = srv.charCodeAt(i) + ((hash1 << 5) - hash1);
      hash2 = srv.charCodeAt(i) * 31 + ((hash2 << 4) - hash2);
    }
    // Spread coords within 15% and 85% to stay visible within radar circle
    const left = 15 + (Math.abs(hash1) % 70);
    const top = 15 + (Math.abs(hash2) % 70);
    return { left: `${left}%`, top: `${top}%` };
  };

  const finalLat = localActiveComplaint.latitude || 16.3067;
  const finalLng = localActiveComplaint.longitude || 80.4365;

  return (
    <div
      id="complaint-map-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div
        id="complaint-map-box"
        className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header Block */}
        <div id="map-modal-header" className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5 animate-pulse-slow">
              <Navigation className="w-4 h-4 text-brand-600" />
              <span>Interactive Revenue Land Survey Map</span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Focus Surveyor Parcel: {selectedSurveyNo} • {selectedGroupComplaints.length} Related Complaints Registered
            </p>
          </div>
          <button
            id="close-map-button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map and Hotspots Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Radar Screen Area (2 Cols on desktop) */}
          <div className="md:col-span-2 relative p-4 bg-slate-950 h-[380px] flex flex-col justify-between overflow-hidden">
            {/* Satellite Mesh Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            </div>

            {/* Micro Metadata */}
            <div className="flex justify-between items-start z-10">
              <div className="bg-slate-900/90 border border-slate-800 backdrop-blur rounded p-2 font-mono text-[9px] text-slate-400 space-y-0.5 select-none shadow">
                <div className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-emerald-400 font-bold">RADAR_GPS_LINK_ON</span>
                </div>
                <div>GRID LOCK: {finalLat.toFixed(4)}° N, {finalLng.toFixed(4)}° E</div>
                <div>ACTIVE DISPUTED PARCELS DISPLAYED: {surveyNosWithActive.length}</div>
              </div>

              <div className="flex space-x-1">
                <div className="bg-slate-900/95 border border-slate-800 text-[9px] font-bold text-slate-400 px-2 py-1 rounded select-none">
                  Radar Feed
                </div>
              </div>
            </div>

            {/* Radar Circular Grid Bounds and Clickable Land Parcels */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-80 rounded-full border border-dashed border-emerald-500/10 animate-[spin_60s_linear_infinite]" />
              <div className="w-56 h-56 rounded-full border border-slate-800/40" />
              <div className="w-32 h-32 rounded-full border border-dashed border-emerald-500/15 animate-[spin_30s_linear_infinite]" />

              {/* Draw Custom Polygons representing parcels */}
              <svg className="absolute inset-0 w-full h-full opacity-45 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon
                  points="30,35 65,28 72,55 45,62"
                  className="fill-brand-500/5 stroke-brand-500/20 stroke-[0.3]"
                />
                <polygon
                  points="12,50 35,45 38,68 15,75"
                  className="fill-rose-500/5 stroke-rose-500/25 stroke-[0.3]"
                />
              </svg>

              {/* Dynamic Map Pins for all registered complaint survey numbers */}
              {Object.keys(surveyGroups).map(srv => {
                const pos = getSurveyPosition(srv);
                const isSelected = selectedSurveyNo === srv;
                const complaintsCount = surveyGroups[srv].length;
                const hrsUnresolved = surveyGroups[srv].some(c => c.status !== 'resolved' && c.status !== 'rejected');

                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => {
                      setSelectedSurveyNo(srv);
                      // Set local active complaint to primary in list
                      const primaryInSrv = surveyGroups[srv].find(c => c.status !== 'resolved') || surveyGroups[srv][0];
                      if (primaryInSrv) {
                        setLocalActiveComplaint(primaryInSrv);
                      }
                    }}
                    style={{ left: pos.left, top: pos.top }}
                    className="absolute z-20 group -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-150 hover:scale-125 focus:outline-none"
                  >
                    <div className="relative">
                      {/* Active (Unresolved) warning indicator ring */}
                      {hrsUnresolved && (
                        <span className={`absolute -inset-2.5 rounded-full ${isSelected ? 'bg-amber-500/50 animate-ping' : 'bg-red-500/30'}`}></span>
                      )}
                      
                      {isSelected && (
                        <span className="absolute -inset-4 rounded-full bg-brand-500/20 animate-pulse"></span>
                      )}

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                        isSelected 
                          ? 'bg-brand-600 border-white text-white' 
                          : hrsUnresolved 
                            ? 'bg-red-640 border-red-200 text-red-100 hover:bg-red-600' 
                            : 'bg-emerald-600 border-emerald-100 text-emerald-100 hover:bg-emerald-500'
                      }`}>
                        <span className="text-[8px] font-bold">{complaintsCount}</span>
                      </div>
                    </div>

                    {/* Pop hover identifier tag */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap opacity-90 group-hover:opacity-100 z-30">
                      SY: {srv}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Radar Coordinates Info Overlay */}
            <div id="map-ui-bottom" className="flex justify-between items-end z-10 w-full font-mono text-[8px] text-slate-500 pt-2 border-t border-slate-900">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>MAP DATUM: WGS 84 (UTM ZONE 44N)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="inline-block w-2 H-2 rounded-full bg-red-500 mr-1"></span>
                <span>Crimson indicate lands with active complaints</span>
              </div>
            </div>
          </div>

          {/* Right Side Panel: Related Complaints List (1 Col on Desktop) */}
          <div className="p-4 bg-slate-50 flex flex-col h-[380px]">
            <div className="mb-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-450 tracking-wider flex items-center space-x-1">
                <Landmark className="w-3.5 h-3.5 text-slate-400" />
                <span>Land Parcel: {selectedSurveyNo}</span>
              </span>
              <h4 className="text-xs font-bold text-slate-800 mt-1">Associated Complaints List</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Click on a docket below to update focus or view detail.</p>
            </div>

            {/* List scrollbox */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {selectedGroupComplaints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-4 text-slate-400 text-xs font-semibold">
                  No grievances found under selected Survey ID.
                </div>
              ) : (
                selectedGroupComplaints.map(comp => {
                  const isFocused = localActiveComplaint.id === comp.id;
                  const getStatusLabelColor = (status: string) => {
                    switch (status) {
                      case 'resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      case 'rejected': return 'bg-red-105 text-red-800 border-red-200';
                      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
                      default: return 'bg-blue-100 text-blue-800 border-blue-200';
                    }
                  };

                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        setLocalActiveComplaint(comp);
                        if (onSelectComplaint) {
                          onSelectComplaint(comp);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left select-none ${
                        isFocused 
                          ? 'bg-white border-brand-500 ring-1 ring-brand-500 shadow'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-slate-400">{comp.complaintNo}</span>
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${getStatusLabelColor(comp.status)}`}>
                          {comp.status}
                        </span>
                      </div>
                      <h5 className="text-[11px] font-extrabold text-slate-800 truncate mt-1 leading-snug">{comp.title}</h5>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium leading-relaxed">{comp.description}</p>
                      
                      <div className="flex justify-between items-center text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 font-semibold">
                        <span className="truncate max-w-[80px]">Citizen: {comp.citizenName}</span>
                        <span>{new Date(comp.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer Info of Active Complaint focused */}
        <div id="map-modal-footer" className="p-4 bg-slate-50 border-t border-slate-150 text-xs font-semibold text-slate-705 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="p-2 bg-white rounded-lg border border-slate-200 shrink-0 shadow-sm"><FileText className="w-4 h-4 text-brand-600" /></span>
            <div className="min-w-0">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Active Dossier Focus Details</span>
              <p className="text-slate-800 truncate font-extrabold text-[11px] leading-tight" title={localActiveComplaint.title}>{localActiveComplaint.title}</p>
              <p className="text-[10px] text-slate-450 truncate" title={localActiveComplaint.location}>SY-{localActiveComplaint.surveyNumber} • {localActiveComplaint.location}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
            <a
              id="google-maps-link"
              href={`https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer shadow-sm text-center"
            >
              <span>Sat Map Link</span>
            </a>
            <button
              id="close-full-map"
              onClick={onClose}
              className="px-4 py-1.5 bg-brand-610 hover:bg-brand-700 bg-brand-600 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer text-center"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
