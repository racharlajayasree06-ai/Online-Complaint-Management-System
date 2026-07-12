import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, LogOut, Search, RefreshCw, FileText, CheckCircle2, AlertOctagon, TrendingUp, Users, MapPin, BarChart3, AlertCircle, Sparkles, ChevronRight, CornerDownRight } from 'lucide-react';
import { getComplaints, getOfficersList, clearSession, getSession } from '../lib/api';
import { GrievanceComplaint } from '../types';
import GrievanceCard from './GrievanceCard';
import LanguageSelector from './LanguageSelector';
import BellNotification from './BellNotification';

// Recharts components imports
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface CollectorDashboardViewProps {
  onLogout: () => void;
  onSelectComplaint: (id: string) => void;
  openSelectedComplaintDetail?: (id: string) => void;
}

export default function CollectorDashboardView({ onLogout, onSelectComplaint, openSelectedComplaintDetail }: CollectorDashboardViewProps) {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState<GrievanceComplaint[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [kpiFilter, setKpiFilter] = useState<'all' | 'pending' | 'resolved' | 'delayed'>('all');

  // Hierarchy drill-down state variables
  const [selectedDRO, setSelectedDRO] = useState<string>('Guntur'); // level 1
  const [selectedRDO, setSelectedRDO] = useState<string>('all'); // level 2 (Tenali division, Guntur)
  const [selectedMRO, setSelectedMRO] = useState<string>('all'); // level 3 (Guntur East, Tenali, Nizampatnam)
  const [selectedVRO, setSelectedVRO] = useState<string>('all'); // level 4 (Village)

  const session = getSession();

  const loadAllData = async () => {
    try {
      setLoading(true);
      // Fetch all complaints inside scope
      const list = await getComplaints('all', 'jurisdiction', '');
      setComplaints(list);
      // Fetch officers list
      const roster = await getOfficersList();
      setOfficers(roster);
    } catch (err) {
      console.error('Failed to load collector dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Compute metrics dynamically from primary complaints arrays
  const total = complaints.length;
  const pending = complaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length;
  const completed = complaints.filter(c => c.status === 'resolved').length;
  
  // Delayed cases: where status is not resolved/rejected and age is > 7 days (or simulated as filed more than 5 days ago)
  const isDelayed = (c: GrievanceComplaint) => {
    if (c.status === 'resolved' || c.status === 'rejected') return false;
    const days = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > 5;
  };
  const delayed = complaints.filter(isDelayed).length;

  // Stagnant complaints: Not resolved and age has crossed 10 days
  const isStagnant = (c: GrievanceComplaint) => {
    if (c.status === 'resolved' || c.status === 'rejected') return false;
    const days = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > 10;
  };
  const stagnantList = complaints.filter(isStagnant);

  // Group complaints by survey number
  const surveyGroups = complaints.reduce((acc, comp) => {
    const srv = comp.surveyNumber || 'N/A';
    if (srv !== 'N/A' && srv.trim() !== '') {
      if (!acc[srv]) {
        acc[srv] = [];
      }
      acc[srv].push(comp);
    }
    return acc;
  }, {} as Record<string, GrievanceComplaint[]>);

  // Calculate dynamic rank listing of hot spot land survey parcels
  const landRankingList = Object.keys(surveyGroups)
    .map(srv => {
      const group = surveyGroups[srv];
      const count = group.length;
      const pCount = group.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length;
      const rCount = group.filter(c => c.status === 'resolved').length;
      const statusSummary = `${pCount} Pending, ${rCount} Resolved`;
      return {
        surveyNo: srv,
        complaintCount: count,
        pendingCount: pCount,
        resolvedCount: rCount,
        statusSummary
      };
    })
    .sort((a, b) => b.complaintCount - a.complaintCount)
    .slice(0, 5);

  // Filter complaints list in real-time based on selected navigation nodes, category, and search query
  const filteredComplaints = complaints.filter(c => {
    // Level 1: DRO (District Guntur)
    if (selectedDRO !== 'all' && c.district !== selectedDRO) return false;
    
    // Level 2: RDO (Tenali / Guntur division mapper)
    if (selectedRDO !== 'all') {
      if (selectedRDO === 'Tenali Division' && c.mandal !== 'Tenali' && c.mandal !== 'Nizampatnam') return false;
      if (selectedRDO === 'Guntur Division' && c.mandal !== 'Guntur East') return false;
    }

    // Level 3: MRO (Mandal Tahsildar desk)
    if (selectedMRO !== 'all' && c.mandal !== selectedMRO) return false;

    // Level 4: VRO (Village)
    if (selectedVRO !== 'all' && c.village !== selectedVRO) return false;

    // Category Filter
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;

    // Search query matches complaint id, citizen ID, survey parcel, title, etc.
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.complaintNo.toLowerCase().includes(q) ||
        c.citizenId.toLowerCase().includes(q) ||
        (c.surveyNumber && c.surveyNumber.toLowerCase().includes(q)) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.citizenName.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const displayedComplaints = filteredComplaints.filter(c => {
    if (kpiFilter === 'pending') {
      return c.status !== 'resolved' && c.status !== 'rejected';
    }
    if (kpiFilter === 'resolved') {
      return c.status === 'resolved';
    }
    if (kpiFilter === 'delayed') {
      return isDelayed(c);
    }
    return true;
  });

  // Calculate Officer Rank list based on pending workload
  const officerRankList = officers.map(o => {
    const assignedPending = complaints.filter(c => c.assignedToId === o.id && c.status !== 'resolved' && c.status !== 'rejected').length;
    const assignedTotal = complaints.filter(c => c.assignedToId === o.id).length;
    const resolvedRate = assignedTotal > 0 ? Math.round((complaints.filter(c => c.assignedToId === o.id && c.status === 'resolved').length / assignedTotal) * 100) : 100;
    return {
      ...o,
      pendingCount: assignedPending,
      totalCount: assignedTotal,
      resolvedRate
    };
  }).sort((a, b) => b.pendingCount - a.pendingCount); // Rank by most pending workload down

  // Chart 1: Category Distribution data
  const mapCategories: Record<string, number> = {};
  complaints.forEach(c => {
    mapCategories[c.category] = (mapCategories[c.category] || 0) + 1;
  });
  const categoryChartData = Object.keys(mapCategories).map(cat => ({
    name: cat,
    value: mapCategories[cat]
  }));

  // Chart 2: Urgency Priority data
  const mapPriorities: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  complaints.forEach(c => {
    mapPriorities[c.priority] = (mapPriorities[c.priority] || 0) + 1;
  });
  const priorityChartData = Object.keys(mapPriorities).map(prio => ({
    name: prio.toUpperCase(),
    value: mapPriorities[prio]
  }));

  // Chart 3: Officer Wise Workload bar count
  const officerChartData = officerRankList.slice(0, 5).map(o => ({
    name: o.fullName,
    pending: o.pendingCount,
    total: o.totalCount
  }));

  // Identify Bottleneck Areas (Mandal-wise ratio of pending)
  const mapMandalsTotal: Record<string, number> = {};
  const mapMandalsPending: Record<string, number> = {};
  complaints.forEach(c => {
    const m = c.mandal || 'Unknown';
    mapMandalsTotal[m] = (mapMandalsTotal[m] || 0) + 1;
    if (c.status !== 'resolved' && c.status !== 'rejected') {
      mapMandalsPending[m] = (mapMandalsPending[m] || 0) + 1;
    }
  });
  const bottleneckMandals = Object.keys(mapMandalsTotal).map(m => {
    const pendingVal = mapMandalsPending[m] || 0;
    const totalVal = mapMandalsTotal[m] || 1;
    const ratio = Math.round((pendingVal / totalVal) * 100);
    return { name: m, pendingCount: pendingVal, totalCount: totalVal, ratio };
  }).sort((a, b) => b.ratio - a.ratio); // high pending ratio first

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const clearHierarchy = () => {
    setSelectedRDO('all');
    setSelectedMRO('all');
    setSelectedVRO('all');
  };

  return (
    <div id="collector-dashboard-wrapper" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* Header bar */}
      <header id="collector-header" className="bg-slate-900 border-b border-slate-800 py-3.5 px-6 shrink-0 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-600 border border-brand-500 rounded-xl">
            <Landmark className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold uppercase tracking-tight flex items-center space-x-1.5">
              <span>{t('common.title')}</span>
              <span className="bg-brand-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Collector Portal</span>
            </h1>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">District Collector Office Administration Dashboard • Guntur Desk</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <BellNotification onNotificationClick={(complaintId) => {
            if (openSelectedComplaintDetail) {
              openSelectedComplaintDetail(complaintId);
            } else {
              onSelectComplaint(complaintId);
            }
          }} />
          <button
            id="collector-logout-btn"
            onClick={() => { clearSession(); onLogout(); }}
            className="flex items-center space-x-1 px-3.5 py-1.5 border border-slate-800 hover:bg-slate-820 text-xs font-bold text-slate-300 rounded-lg cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main id="collector-main" className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Welcome greeting card */}
        <div id="collector-welcome-banner" className="bg-white border-l-4 border-brand-600 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[9px] uppercase font-serif tracking-widest text-brand-605 font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Executive Jurisdiction Desk</span>
            </span>
            <h2 className="text-base font-extrabold text-slate-850 mt-1">Verified Authority: {session?.user.fullName}</h2>
            <p className="text-xs text-slate-500 font-semibold">Rank ID: {session?.user.officerId} • District Head: Guntur Collectorate</p>
          </div>

          <button
            id="collector-re-pull"
            onClick={loadAllData}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 bg-white transition-colors cursor-pointer self-start md:self-auto"
            title="Reload live feeds"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Global Search and category filters */}
        <div id="collector-search-lane" className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-1 items-center bg-slate-50 border border-slate-200 rounded-lg max-w-lg shadow-inner">
            <Search className="w-4 h-4 text-slate-400 ml-4" />
            <input
              id="collector-global-search"
              type="text"
              placeholder={t('collector.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-2.5 pr-4 py-2.5 text-xs font-semibold text-slate-700 bg-transparent outline-none placeholder-slate-400"
            />
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Classifications</option>
              <option value="Mutation Delays">Mutation Delays</option>
              <option value="Land boundary disputes">Land boundary disputes</option>
              <option value="Record correction requests">Record correction requests</option>
              <option value="Double Registrations">Double Registrations</option>
              <option value="Encroachments">Encroachments</option>
            </select>
          </div>
        </div>

        {/* Real-time KPI Statistics Cards */}
        <div id="collector-kpi-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <div
            id="kpi-total"
            onClick={() => setKpiFilter('all')}
            className={`bg-white border p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
              kpiFilter === 'all' ? 'border-slate-800 ring-2 ring-slate-800/20' : 'border-slate-200 hover:border-slate-350'
            }`}
          >
            <div className="space-y-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">{t('collector.totalGrievances')}</span>
              <span className="text-2xl font-mono font-extrabold text-slate-900 block pt-1">{total}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform"><FileText className="w-6 h-6 text-slate-500" /></div>
          </div>

          {/* Card 2: Pending */}
          <div
            id="kpi-pending"
            onClick={() => setKpiFilter('pending')}
            className={`bg-white border p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
              kpiFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-350'
            }`}
          >
            <div className="space-y-1.5">
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">{t('collector.pendingGrievances')}</span>
              <span className="text-2xl font-mono font-extrabold text-amber-600 block pt-1">{pending}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-105 transition-transform"><AlertOctagon className="w-6 h-6 text-amber-500" /></div>
          </div>

          {/* Card 3: Resolved */}
          <div
            id="kpi-resolved"
            onClick={() => setKpiFilter('resolved')}
            className={`bg-white border p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
              kpiFilter === 'resolved' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-350'
            }`}
          >
            <div className="space-y-1.5">
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">{t('collector.resolvedGrievances')}</span>
              <span className="text-2xl font-mono font-extrabold text-emerald-600 block pt-1">{completed}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-105 transition-transform"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></div>
          </div>

          {/* Card 4: SLA Delayed */}
          <div
            id="kpi-delayed"
            onClick={() => setKpiFilter('delayed')}
            className={`bg-white border p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
              kpiFilter === 'delayed' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-slate-350'
            }`}
          >
            <div className="space-y-1.5">
              <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">{t('collector.delayedGrievances')}</span>
              <span className="text-2xl font-mono font-extrabold text-red-600 block pt-1">{delayed}</span>
            </div>
            <div className="p-3 bg-red-50 rounded-xl group-hover:scale-105 transition-transform"><AlertCircle className="w-6 h-6 text-red-500" /></div>
          </div>
        </div>

        {/* Bottleneck Mandals Alarm banner */}
        {bottleneckMandals.length > 0 && bottleneckMandals[0].ratio >= 50 && (
          <div id="collector-bottleneck-alarm" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-semibold flex items-start space-x-3 flex-wrap">
            <AlertTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="font-extrabold uppercase tracking-wide text-red-900">Administrative Bottleneck Alert (Desk Backlog)!</p>
              <p className="leading-relaxed">
                Mandal Tahsil office of <span className="underline font-bold">{bottleneckMandals[0].name}</span> exhibits a critical backlog workload, with <span className="font-bold">{bottleneckMandals[0].ratio}%</span> of registered land disputes currently unresolved ({bottleneckMandals[0].pendingCount} pending cards of {bottleneckMandals[0].totalCount} total cases). Urgent administrative intervention and audit is encouraged.
              </p>
            </div>
          </div>
        )}

        {/* Hierarchical Drill-Down Selection Panel */}
        <div id="drill-down-card" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 id="drill-down-title" className="text-xs uppercase font-extrabold text-slate-500 tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-slate-450" />
              <span>{t('collector.drillDownTitle')}</span>
            </h3>
            {(selectedRDO !== 'all' || selectedMRO !== 'all' || selectedVRO !== 'all') && (
              <button
                id="clear-hierarchy-btn"
                onClick={clearHierarchy}
                className="text-xs font-bold text-brand-650 hover:underline cursor-pointer"
              >
                Reset Drill Paths
              </button>
            )}
          </div>

          {/* Driller selection controls */}
          <div id="drill-selectors" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* L1: DRO District */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400">DRO District Hub</label>
              <select
                id="drill-dro-select"
                value={selectedDRO}
                onChange={(e) => { setSelectedDRO(e.target.value); clearHierarchy(); }}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Guntur">Guntur District (DRO)</option>
                <option value="all">Show All Districts</option>
              </select>
            </div>

            {/* L2: RDO Division */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400">RDO Revenue Division</label>
              <select
                id="drill-rdo-select"
                value={selectedRDO}
                onChange={(e) => { setSelectedRDO(e.target.value); setSelectedMRO('all'); setSelectedVRO('all'); }}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Divisions (RDO)</option>
                <option value="Tenali Division">Tenali Division</option>
                <option value="Guntur Division">Guntur Division</option>
              </select>
            </div>

            {/* L3: MRO Mandal */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400">MRO Mandal Office</label>
              <select
                id="drill-mro-select"
                value={selectedMRO}
                onChange={(e) => { setSelectedMRO(e.target.value); setSelectedVRO('all'); }}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Mandals (MRO)</option>
                {selectedRDO === 'Tenali Division' && (
                  <>
                    <option value="Tenali">Tenali Mandal</option>
                    <option value="Nizampatnam">Nizampatnam Mandal</option>
                  </>
                )}
                {selectedRDO === 'Guntur Division' && (
                  <option value="Guntur East">Guntur East</option>
                )}
                {selectedRDO === 'all' && (
                  <>
                    <option value="Guntur East">Guntur East</option>
                    <option value="Tenali">Tenali Mandal</option>
                    <option value="Nizampatnam">Nizampatnam Mandal</option>
                  </>
                )}
              </select>
            </div>

            {/* L4: VRO Village */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400">VRO Village Revenue Desk</label>
              <select
                id="drill-vro-select"
                value={selectedVRO}
                onChange={(e) => setSelectedVRO(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Villages (VRO)</option>
                {selectedMRO === 'Guntur East' && (
                  <>
                    <option value="Brodipet">Brodipet</option>
                    <option value="Venkatapuram">Venkatapuram</option>
                    <option value="Jonnalagadda">Jonnalagadda</option>
                    <option value="Gunadala">Gunadala</option>
                  </>
                )}
                {selectedMRO === 'Tenali' && (
                  <>
                    <option value="Chinaravutla">Chinaravutla</option>
                    <option value="Ravipadu">Ravipadu</option>
                    <option value="Nandur">Nandur</option>
                    <option value="Kakaralamudi">Kakaralamudi</option>
                  </>
                )}
                {selectedMRO === 'Nizampatnam' && (
                  <>
                    <option value="Nizampatnam">Nizampatnam</option>
                    <option value="Pinapadu">Pinapadu</option>
                    <option value="Patamata">Patamata</option>
                    <option value="Ajit Singh Nagar">Ajit Singh Nagar</option>
                    <option value="Bandar">Bandar</option>
                    <option value="Chilakalapudi">Chilakalapudi</option>
                  </>
                )}
                {selectedMRO === 'all' && (
                  <>
                    <option value="Brodipet">Brodipet</option>
                    <option value="Venkatapuram">Venkatapuram</option>
                    <option value="Jonnalagadda">Jonnalagadda</option>
                    <option value="Chinaravutla">Chinaravutla</option>
                    <option value="Nizampatnam">Nizampatnam</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Drill Down Breadcrumb Path indicator */}
          <div id="drill-path-indicator" className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-center space-x-1.5 font-bold text-[10px] text-slate-600 flex-wrap">
            <span className="text-slate-400">HIERARCHY TARGET PATH:</span>
            <span className="text-slate-800">Guntur (DRO)</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className={selectedRDO !== 'all' ? 'text-brand-650' : 'text-slate-400'}>
              {selectedRDO !== 'all' ? selectedRDO : 'All Divisions'}
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className={selectedMRO !== 'all' ? 'text-brand-650' : 'text-slate-400'}>
              {selectedMRO !== 'all' ? selectedMRO + ' Mandal' : 'All Mandals'}
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className={selectedVRO !== 'all' ? 'text-brand-650 font-extrabold' : 'text-slate-400'}>
              {selectedVRO !== 'all' ? selectedVRO + ' Village' : 'All Villages'}
            </span>
          </div>
        </div>

        {/* Mid Grid Block: Officers desk auditor & Charts */}
        <div id="collector-mid-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Workload Audit Desk Stack): 5 Cols */}
          <div id="officer-workload-stack" className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider flex items-center space-x-2">
              <Users className="w-4 h-4 text-slate-455" />
              <span>{t('collector.performanceRanking')}</span>
            </h3>

            <div id="performance-table-wrapper" className="overflow-x-auto">
              <table className="w-full text-left font-semibold text-xs text-slate-700 divide-y divide-slate-100">
                <thead className="bg-slate-50 text-[10px] text-slate-450 uppercase uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Officer Name</th>
                    <th className="py-2 px-3">Rank Designation</th>
                    <th className="py-2 px-3 text-center">Desk Workload</th>
                    <th className="py-2 px-3 text-right">Resolve Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {officerRankList.map(officer => {
                    const critical = officer.pendingCount > 1;
                    return (
                      <tr id={`officer-rank-${officer.id}`} key={officer.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold truncate max-w-[120px]">{officer.fullName}</td>
                        <td className="py-2 px-3">
                          <span className="text-[9px] font-mono font-extrabold text-slate-500 bg-slate-100 px-1 py-0.5 rounded uppercase">{officer.designation}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold font-mono">
                          <span className={critical ? 'text-red-600 animate-pulse-short' : 'text-slate-800'}>
                            {officer.pendingCount} pending
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[11px]">{officer.resolvedRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Entity/Filer Analytics panel */}
            <div id="filer-analytics-box" className="pt-4 border-t border-slate-100 space-y-2.5">
              <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400">Frequent Grievance Applicants</span>
              <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded">
                  <span>Kalyan Kumar (ID: cit-1)</span>
                  <span className="bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px]">3 Filed</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded">
                  <span>Venkata Ramanayya (ID: cit-2)</span>
                  <span className="bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px]">1 Filed</span>
                </div>
              </div>
            </div>

            {/* Land Issue Ranking Analytics block */}
            <div id="land-parcels-ranking-box" className="pt-4 border-t border-slate-100 space-y-2.5">
              <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span>Land Survey Hotspots (Ranking)</span>
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {landRankingList.map((rank, idx) => (
                  <div
                    key={rank.surveyNo}
                    onClick={() => {
                      // Filter down to land survey parcel
                      setSearchQuery(rank.surveyNo);
                      const element = document.getElementById('collector-filtered-list');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded border border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs font-semibold text-slate-705 group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-brand-50 text-brand-650 text-[10px] font-extrabold font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800 font-mono">SY: {rank.surveyNo}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{rank.statusSummary}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="bg-amber-100 text-amber-800 border border-amber-250 rounded px-1.5 py-0.5 text-[9px] font-extrabold">
                        {rank.complaintCount} Disputes
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Dynamic Visual Analytics with Recharts): 7 Cols */}
          <div id="analytics-charts-panel" className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-6">
            <h3 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-slate-455" />
              <span>Grievance Distribution Intelligence Charts</span>
            </h3>

            {/* Split Charts: Row 1 */}
            <div id="charts-split-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Category Distribution */}
              <div className="space-y-2 border border-slate-100 p-3.5 rounded-xl bg-slate-50/50">
                <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block text-center">Grievances by Classification</span>
                {categoryChartData.length === 0 ? (
                  <p className="text-center py-10 font-bold text-slate-400 text-[11px]">No data mapped</p>
                ) : (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 8 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Box 2: SLA priority Urgency chart */}
              <div className="space-y-2 border border-slate-100 p-3.5 rounded-xl bg-slate-50/50">
                <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block text-center">Urgency Priority Weight</span>
                {priorityChartData.length === 0 ? (
                  <p className="text-center py-10 font-bold text-slate-400 text-[11px]">No data mapped</p>
                ) : (
                  <div className="h-44 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={55}
                          dataKey="value"
                        >
                          {priorityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
            
            {/* Box 3: Officer Wise Workload chart */}
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block text-center">Workload (Pending vs Assigned Desk Load)</span>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={officerChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 8 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                    <Tooltip contentStyle={{ fontSize: '10px' }} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Bar dataKey="pending" name="Pending Load" fill="#f59e0b" />
                    <Bar dataKey="total" name="Total Assigned" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Panel: Dynamic Filtering list */}
        <div id="collector-filtered-list" className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-250 pb-2.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Interactive Filtered Grievances ({displayedComplaints.length})</h3>
              <span className="text-[10px] bg-brand-50 text-brand-650 font-bold px-2 py-0.5 rounded-full capitalize">
                {kpiFilter === 'all' ? 'All Path Cases' : `${kpiFilter} filter`}
              </span>
            </div>
            {kpiFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setKpiFilter('all')}
                className="text-xs font-bold text-red-500 hover:text-red-750 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded border border-red-200 transition-colors cursor-pointer"
              >
                Clear Status Filter
              </button>
            )}
          </div>

          {displayedComplaints.length === 0 ? (
            <div className="p-14 text-center text-slate-350 bg-white border border-slate-200 rounded-2xl text-xs font-semibold">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="max-w-md mx-auto mt-2">No matching grievances registered inside the selected hierarchy path or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedComplaints.map(comp => {
                const isStagnantFlag = stagnantList.some(s => s.id === comp.id);
                return (
                  <div key={comp.id} className="relative">
                    {isStagnantFlag && (
                      <span className="absolute -top-1.5 -right-1.5 z-10 bg-red-650 hover:bg-red-700 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center space-x-1 border border-white">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>STAGNANT Critical</span>
                      </span>
                    )}
                    <GrievanceCard
                      complaint={comp}
                      onClick={() => onSelectComplaint(comp.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Footer credits */}
      <footer id="collector-footer" className="bg-white border-t border-slate-100 py-3.5 text-center shrink-0">
        <p className="text-[10px] font-semibold text-slate-400">© 2026 District Revenue Administration Analytics Room. Confidential use only.</p>
      </footer>
    </div>
  );
}

// Quick tiny local svg replacement for bell icon
function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      className={props.className}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
