import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Users, Briefcase, Calendar, CheckCircle, X, RefreshCw, Filter, Upload, ArrowDown } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QUICK_FILTERS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: null },
];

const CHART_COLORS = { total: '#3B82F6', shortlisted: '#8B5CF6', rejected: '#EF4444', selected: '#10B981', pipeline: '#0EA5E9' };
const PIE_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

const Home = () => {
  const [kpis, setKpis] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendorList, setVendorList] = useState([]);
  const [analysisVendor, setAnalysisVendor] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [vendorDetailLoading, setVendorDetailLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);

  useBodyScrollLock(!!modalData || showUploadModal || !!analysisVendor || !!selectedMetric);

  const getDateRange = useCallback((days) => {
    if (!days) return { from: '', to: '' };
    const to = new Date(); const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  }, []);

  useEffect(() => {
    axios.get(`${API_URL}/api/analytics/vendor-list`, { withCredentials: true })
      .then(res => setVendorList(res.data)).catch(() => {});
  }, []);

  const fetchDashboardData = useCallback(async (fDate, tDate, vendor) => {
    try {
      const params = new URLSearchParams();
      if (fDate) params.set('from_date', fDate);
      if (tDate) params.set('to_date', tDate);
      if (vendor) params.set('vendor', vendor);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const vendorParam = vendor ? `?vendor=${encodeURIComponent(vendor)}` : '';
      const [kpisRes, pipelineRes, vendorsRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/kpis-filtered${qs}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/pipeline${vendorParam}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/vendors`, { withCredentials: true }),
      ]);
      setKpis(kpisRes.data);
      setPipelineData(pipelineRes.data);
      setVendorData(vendorsRes.data.map(v => ({
        ...v,
        shortlistRate: v.total > 0 ? ((v.shortlisted / v.total) * 100).toFixed(1) : 0,
        selectionRate: v.total > 0 ? ((v.selected / v.total) * 100).toFixed(1) : 0,
      })));
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboardData(fromDate, toDate, selectedVendor); }, [fromDate, toDate, selectedVendor, fetchDashboardData]);

  const handleQuickFilter = (label, days) => {
    setActiveQuickFilter(label);
    if (days === null) { setFromDate(''); setToDate(''); }
    else { const r = getDateRange(days); setFromDate(r.from); setToDate(r.to); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncMessage('');
    try {
      const res = await axios.post(`${API_URL}/api/sync-all`, {}, { withCredentials: true });
      const { candidates_count, openings_count, warnings } = res.data;
      let msg = `Synced ${candidates_count} candidates, ${openings_count} openings`;
      if (warnings?.length) msg += ` (${warnings.join('; ')})`;
      setSyncMessage(msg);
      fetchDashboardData(fromDate, toDate, selectedVendor);
    } catch (err) { setSyncMessage(err.response?.data?.detail || 'Sync failed'); }
    finally { setSyncing(false); setTimeout(() => setSyncMessage(''), 8000); }
  };

  const openKPIModal = async (type) => {
    try {
      let data = null; let title = '';
      const vp = selectedVendor ? `vendor=${encodeURIComponent(selectedVendor)}&` : '';
      switch(type) {
        case 'openings': { const r = await axios.get(`${API_URL}/api/analytics/roles`, { withCredentials: true }); data = r.data; title = selectedVendor ? `Job Openings (${selectedVendor})` : 'All Job Openings'; break; }
        case 'candidates': { const r = await axios.get(`${API_URL}/api/candidates?${vp}`, { withCredentials: true }); data = r.data; title = selectedVendor ? `All Candidates (${selectedVendor})` : 'All Candidates'; break; }
        case 'interviews': { const r = await axios.get(`${API_URL}/api/analytics/interviews`, { withCredentials: true }); data = selectedVendor ? r.data.filter(i => i.vendor?.toLowerCase() === selectedVendor.toLowerCase()) : r.data; title = selectedVendor ? `Interviews (${selectedVendor})` : 'Interviews'; break; }
        case 'selected': { const r = await axios.get(`${API_URL}/api/candidates?${vp}stage=Selected`, { withCredentials: true }); data = r.data; title = 'Selected Candidates'; break; }
        case 'active': { const r = await axios.get(`${API_URL}/api/candidates?${vp}`, { withCredentials: true }); data = r.data.filter(c => { const rs = (c.resume_status || '').toLowerCase(); const fs = (c.final_status || '').toLowerCase(); return !rs.includes('reject') && !fs.includes('reject'); }); title = selectedVendor ? `Active Candidates (${selectedVendor})` : 'Active Candidates'; break; }
        case 'shortlisted': { const r = await axios.get(`${API_URL}/api/candidates?${vp}`, { withCredentials: true }); data = r.data.filter(c => { const rs = (c.resume_status || '').toLowerCase(); const fs = (c.final_status || '').toLowerCase(); return rs.includes('shortlist') && !fs.includes('reject'); }); title = selectedVendor ? `Shortlisted (${selectedVendor})` : 'Shortlisted Candidates'; break; }
        case 'rejected': { const r = await axios.get(`${API_URL}/api/candidates?${vp}`, { withCredentials: true }); data = r.data.filter(c => { const rs = (c.resume_status || '').toLowerCase(); const fs = (c.final_status || '').toLowerCase(); return rs.includes('reject') || fs.includes('reject'); }); title = selectedVendor ? `Rejected (${selectedVendor})` : 'Rejected Candidates'; break; }
        default: break;
      }
      setModalData({ type, data, title });
    } catch (error) { console.error('Error:', error); }
  };

  // Analysis computed
  const tc = kpis?.total_candidates || 0, sl = kpis?.shortlisted || 0, iv = kpis?.interviews_scheduled || 0;
  const sel = kpis?.selected || 0, ofr = kpis?.offer_released || 0, jn = kpis?.joined || 0;

  const metrics = [
    { key: 'shortlist', label: 'Shortlist Rate', value: tc > 0 ? ((sl / tc) * 100).toFixed(1) : 0, detail: `${sl} shortlisted of ${tc} total`, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { key: 'interview', label: 'Interview Rate', value: sl > 0 ? ((iv / sl) * 100).toFixed(1) : 0, detail: `${iv} interviews from ${sl} shortlisted`, color: 'text-cyan-400', bg: 'bg-cyan-500/8', border: 'border-cyan-500/20' },
    { key: 'selection', label: 'Selection Rate', value: tc > 0 ? ((sel / tc) * 100).toFixed(1) : 0, detail: `${sel} selected of ${tc} total`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { key: 'offer', label: 'Offer Rate', value: sel > 0 ? (((ofr + jn) / sel) * 100).toFixed(1) : 0, detail: `${ofr + jn} offers from ${sel} selected`, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { key: 'conversion', label: 'Overall Conversion', value: tc > 0 ? (((sel + ofr + jn) / tc) * 100).toFixed(1) : 0, detail: `${sel + ofr + jn} converted of ${tc} total`, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  ];

  const dropOffs = [
    { stage: 'Submission \u2192 Shortlist', dropOff: tc > 0 ? (((tc - sl) / tc) * 100).toFixed(0) : 0, lost: tc - sl, from: tc, stageFrom: 'submission', stageTo: 'shortlist' },
    { stage: 'Shortlist \u2192 Interview', dropOff: sl > 0 ? (((sl - iv) / sl) * 100).toFixed(0) : 0, lost: sl - iv, from: sl, stageFrom: 'shortlist', stageTo: 'interview' },
    { stage: 'Interview \u2192 Selected', dropOff: iv > 0 ? (((iv - sel) / iv) * 100).toFixed(0) : 0, lost: iv - sel, from: iv, stageFrom: 'interview', stageTo: 'selected' },
    { stage: 'Selected \u2192 Offer', dropOff: sel > 0 ? (((sel - ofr - jn) / sel) * 100).toFixed(0) : 0, lost: sel - ofr - jn, from: sel, stageFrom: 'selected', stageTo: 'offer' },
  ];

  const handleDropOffClick = async (d) => {
    setSelectedMetric({ label: d.stage, value: d.dropOff, detail: `${d.lost} candidates lost from ${d.from}`, color: 'text-red-400', loading: true, candidates: null });
    try { const res = await axios.get(`${API_URL}/api/analytics/dropoff-detail?stage_from=${d.stageFrom}&stage_to=${d.stageTo}`, { withCredentials: true }); setSelectedMetric(prev => ({ ...prev, loading: false, candidates: res.data.dropped_candidates, fromCount: res.data.from_count, toCount: res.data.to_count })); }
    catch { setSelectedMetric(prev => ({ ...prev, loading: false })); }
  };

  const handleVendorRowClick = async (v) => {
    setAnalysisVendor(v); setVendorDetail(null); setVendorDetailLoading(true);
    try { const res = await axios.get(`${API_URL}/api/analytics/vendor-detail?vendor_name=${encodeURIComponent(v._id)}`, { withCredentials: true }); setVendorDetail(res.data); }
    catch(e) { console.error(e); }
    finally { setVendorDetailLoading(false); }
  };

  const coloredPipeline = pipelineData.map(d => {
    const s = (d._id || '').toLowerCase();
    let fill = '#0EA5E9';
    if (s.includes('reject')) fill = '#EF4444';
    else if (s.includes('select') || s.includes('offer') || s.includes('join')) fill = '#10B981';
    else if (s.includes('shortlist')) fill = '#8B5CF6';
    else if (s.includes('interview') || s.includes('l1') || s.includes('l2')) fill = '#F59E0B';
    else if (s.includes('new') || s.includes('submit')) fill = '#3B82F6';
    return { ...d, fill };
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-[var(--text-muted)]">Loading dashboard...</div></div>;

  return (
    <div className="space-y-5" data-testid="home-dashboard">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-0.5">Dashboard Overview</h1>
          <p className="text-sm text-[var(--text-secondary)]">Real-time hiring pipeline insights & analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="sync-google-sheets-btn" onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-raised)] text-[var(--text-primary)] px-4 py-2 rounded-xl transition-all text-sm font-semibold border border-[var(--border-default)]  disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {syncing ? 'Syncing...' : 'Sync Sheets'}
          </button>
          <button data-testid="dashboard-upload-btn" onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl transition-all text-sm font-semibold ">
            <Upload className="w-4 h-4" strokeWidth={1.5} /> Upload Data
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${syncMessage.includes('failed') ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`} data-testid="sync-message">{syncMessage}</div>
      )}

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-3.5 " data-testid="date-filters">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Filter</span>
          </div>
          <select data-testid="vendor-filter" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}
            className="bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50 min-w-[140px]">
            <option value="">All Vendors</option>
            {vendorList.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          {selectedVendor && <button onClick={() => setSelectedVendor('')} className="text-[10px] text-blue-500 hover:text-cyan-400 font-semibold">Clear</button>}
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map(f => (
              <button key={f.label} data-testid={`quick-filter-${f.label}`} onClick={() => handleQuickFilter(f.label, f.days)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${activeQuickFilter === f.label ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-raised)]'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" data-testid="date-from" value={fromDate} onChange={e => { setFromDate(e.target.value); setActiveQuickFilter(''); }}
              className="bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50" />
            <span className="text-[var(--text-muted)] text-xs">to</span>
            <input type="date" data-testid="date-to" value={toDate} onChange={e => { setToDate(e.target.value); setActiveQuickFilter(''); }}
              className="bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50" />
          </div>
        </div>
        {selectedVendor && (
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-secondary)]">Showing data for: </span>
            <span className="text-xs font-semibold text-cyan-400">{selectedVendor}</span>
          </div>
        )}
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard testId="kpi-active-candidates" title="Active Candidates" value={kpis?.active_candidates || 0} subtitle="Not rejected at any stage" description="Excludes resume & final rejections" color="blue" onClick={() => openKPIModal('active')} />
        <KPICard testId="kpi-shortlisted" title="Shortlisted" value={kpis?.shortlisted || 0} subtitle="Resume screening passed" description="Approved by hiring manager" color="purple" onClick={() => openKPIModal('shortlisted')} />
        <KPICard testId="kpi-rejected" title="Rejected" value={kpis?.rejected || 0} subtitle="At any hiring stage" description="Resume or final stage rejection" color="red" onClick={() => openKPIModal('rejected')} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard testId="kpi-total-openings" title="Total Openings" value={kpis?.total_openings || 0} icon={Briefcase} subtitle="Active job positions" color="blue" onClick={() => openKPIModal('openings')} />
        <KPICard testId="kpi-total-candidates" title="Total Candidates" value={kpis?.total_candidates || 0} icon={Users} subtitle="All submitted profiles" onClick={() => openKPIModal('candidates')} />
        <KPICard testId="kpi-interviews-scheduled" title="Interviews" value={kpis?.interviews_scheduled || 0} icon={Calendar} subtitle="Today or upcoming" color="amber" onClick={() => openKPIModal('interviews')} />
        <KPICard testId="kpi-selected" title="Selected" value={kpis?.selected || 0} icon={CheckCircle} subtitle="Final status cleared" color="green" onClick={() => openKPIModal('selected')} />
      </div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="conversion-metrics">
        {metrics.map((m, i) => (
          <div key={i} onClick={() => setSelectedMetric(m)} className={`${m.bg} border ${m.border} rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:shadow-black/20 transition-all`} data-testid={`metric-${m.key}`}>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-1.5">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color} font-mono`}>{m.value}%</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{m.detail}</p>
          </div>
        ))}
      </div>

      {/* Stage Drop-off */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 " data-testid="drop-off-analysis">
        <div className="flex items-center gap-2 mb-5">
          <ArrowDown className="w-4 h-4 text-red-400" strokeWidth={1.5} />
          <h3 className="text-base font-bold text-[var(--text-primary)]">Stage Drop-off</h3>
          <span className="text-[10px] text-[var(--text-muted)] ml-1">Click for candidate details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dropOffs.map((d, i) => (
            <div key={i} onClick={() => handleDropOffClick(d)} className="bg-red-500/10/50 rounded-xl p-3.5 border border-red-100 cursor-pointer hover:bg-red-500/100/10 transition-all">
              <p className="text-xs text-[var(--text-secondary)] mb-1.5">{d.stage}</p>
              <div className="flex items-end gap-1.5">
                <p className="text-xl font-bold text-red-400 font-mono">{d.dropOff}%</p>
                <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{d.lost} lost</p>
              </div>
              <div className="mt-2 w-full bg-red-500/15 rounded-full h-1">
                <div className="bg-red-400 h-1 rounded-full" style={{ width: `${Math.min(d.dropOff, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 ">
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Pipeline Stages</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Candidate distribution by current stage</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={coloredPipeline} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#8896AB' }} />
              <YAxis dataKey="_id" type="category" tick={{ fontSize: 10, fill: '#8896AB' }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid var(--border-default)', borderRadius: '10px', color: '#E8ECF1' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {coloredPipeline.map((d, i) => (<rect key={i} fill={d.fill} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 ">
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Vendor Contributions</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Candidates submitted per vendor</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={vendorData} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={95}
                label={({ _id, total }) => `${_id}: ${total}`} labelStyle={{ fill: '#8896AB', fontSize: 11 }}>
                {vendorData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid var(--border-default)', borderRadius: '10px', color: '#E8ECF1' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendor Performance Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 " data-testid="vendor-performance-table">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Vendor Performance</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Click any vendor for detailed breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[var(--border-default)]">
              {['Vendor','Total','Shortlisted','Rejected','Selected','Shortlist %','Selection %'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {vendorData.map((v, idx) => (
                <tr key={idx} onClick={() => handleVendorRowClick(v)} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer" data-testid={`vendor-row-${idx}`}>
                  <td className="py-3 px-3 text-sm text-[var(--text-primary)] font-semibold">{v._id}</td>
                  <td className="py-3 px-3 text-sm text-[var(--text-secondary)] font-mono">{v.total}</td>
                  <td className="py-3 px-3 text-sm text-violet-400 font-mono">{v.shortlisted}</td>
                  <td className="py-3 px-3 text-sm text-red-400 font-mono">{v.rejected}</td>
                  <td className="py-3 px-3 text-sm text-emerald-400 font-mono font-bold">{v.selected}</td>
                  <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">{v.shortlistRate}%</span></td>
                  <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{v.selectionRate}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Breakdown Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 ">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Vendor Breakdown</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Comparison of total, shortlisted, and selected per vendor</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={vendorData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#8896AB' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8896AB' }} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid var(--border-default)', borderRadius: '10px', color: '#E8ECF1' }} />
            <Legend wrapperStyle={{ color: '#8896AB', fontSize: 12 }} />
            <Bar dataKey="total" fill={CHART_COLORS.total} name="Total" radius={[4, 4, 0, 0]} />
            <Bar dataKey="shortlisted" fill={CHART_COLORS.shortlisted} name="Shortlisted" radius={[4, 4, 0, 0]} />
            <Bar dataKey="selected" fill={CHART_COLORS.selected} name="Selected" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ==================== MODALS ==================== */}
      {modalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalData(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{modalData.title}</h2>
              <button onClick={() => setModalData(null)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]" data-testid="modal-close-btn"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {modalData.type === 'openings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalData.data?.map((role, idx) => (
                    <div key={idx} className="bg-[var(--bg-raised)] rounded-xl p-4 border border-[var(--border-default)]">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">{role._id}</h3>
                      {role.opening_data?.division && <p className="text-xs text-[var(--text-secondary)] mb-3">{role.opening_data.division}</p>}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><span className="text-[var(--text-muted)] text-xs">Positions</span><p className="font-bold text-cyan-400 font-mono">{role.positions || '-'}</p></div>
                        <div><span className="text-[var(--text-muted)] text-xs">Active</span><p className="font-bold text-[var(--text-primary)] font-mono">{role.active}</p></div>
                        <div><span className="text-[var(--text-muted)] text-xs">Selected</span><p className="font-bold text-emerald-400 font-mono">{role.selected}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {['candidates','selected','shortlisted','rejected'].includes(modalData.type) && (
                <table className="w-full"><thead><tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-2.5 px-3 text-xs text-[var(--text-muted)] font-semibold">Name</th>
                  <th className="text-left py-2.5 px-3 text-xs text-[var(--text-muted)] font-semibold">Role</th>
                  <th className="text-left py-2.5 px-3 text-xs text-[var(--text-muted)] font-semibold">Vendor</th>
                  <th className="text-left py-2.5 px-3 text-xs text-[var(--text-muted)] font-semibold">Stage</th>
                  <th className="text-left py-2.5 px-3 text-xs text-[var(--text-muted)] font-semibold">{modalData.type === 'rejected' ? 'Reason' : 'Exp'}</th>
                </tr></thead><tbody>
                  {modalData.data?.map((c, idx) => (
                    <tr key={idx} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-raised)]">
                      <td className="py-2.5 px-3 text-sm text-[var(--text-primary)] font-medium">{c.candidate_name}</td>
                      <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">{c.role}</td>
                      <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">{c.vendor}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={c.current_stage} /></td>
                      <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">{modalData.type === 'rejected' ? (c.resume_status || c.final_status || '-') : (c.work_experience || '-')}</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
              {modalData.type === 'active' && (() => {
                const grouped = {}; (modalData.data || []).forEach(c => { const d = c.submission_date || 'No Date'; if (!grouped[d]) grouped[d] = []; grouped[d].push(c); });
                const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                return (<div className="space-y-4">{dates.map(date => (<div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/8 px-2.5 py-1 rounded-lg border border-cyan-500/20">{date}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{grouped[date].length}</span><div className="flex-1 border-t border-[var(--border-default)]" />
                  </div>
                  <table className="w-full mb-2"><tbody>{grouped[date].map((c, idx) => (
                    <tr key={idx} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-raised)]"><td className="py-2 px-3 text-sm text-[var(--text-primary)] font-medium w-1/4">{c.candidate_name}</td><td className="py-2 px-3 text-sm text-[var(--text-secondary)] w-1/4">{c.role}</td><td className="py-2 px-3 text-sm text-[var(--text-secondary)] w-1/6">{c.vendor}</td><td className="py-2 px-3 w-1/6"><StatusBadge status={c.current_stage} /></td><td className="py-2 px-3 text-sm text-[var(--text-secondary)] w-1/6">{c.work_experience || '-'}</td></tr>
                  ))}</tbody></table></div>))}</div>);
              })()}
              {modalData.type === 'interviews' && (
                <div className="space-y-3">{modalData.data?.map((i, idx) => (
                  <div key={idx} className="bg-[var(--bg-raised)] rounded-xl p-4 border border-[var(--border-default)]">
                    <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-[var(--text-primary)]">{i.candidate_name}</h3><StatusBadge status={i.status || 'Scheduled'} /></div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[var(--text-muted)]">Role:</span> <span className="text-[var(--text-primary)]">{i.role}</span></div>
                      <div><span className="text-[var(--text-muted)]">Level:</span> <span className="text-cyan-400 font-semibold">{i.level}</span></div>
                      <div><span className="text-[var(--text-muted)]">Interviewer:</span> <span className="text-[var(--text-primary)]">{i.interviewer || 'TBD'}</span></div>
                      {i.status && <div><span className="text-[var(--text-muted)]">Status ({i.level}):</span> <span className="text-[var(--text-primary)]">{i.status}</span></div>}
                    </div>
                  </div>
                ))}{(!modalData.data?.length) && <p className="text-center text-[var(--text-muted)] py-8">No interviews found</p>}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vendor Detail Modal */}
      {analysisVendor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setAnalysisVendor(null); setVendorDetail(null); }}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-[var(--border-default)]">
              <div><h2 className="text-lg font-bold text-[var(--text-primary)]">{analysisVendor._id}</h2><p className="text-xs text-[var(--text-secondary)] mt-0.5">Vendor Performance Detail</p></div>
              <button onClick={() => { setAnalysisVendor(null); setVendorDetail(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]" data-testid="vendor-modal-close"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)] space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[var(--bg-raised)] rounded-xl p-3 border border-[var(--border-default)] text-center"><p className="text-[10px] text-[var(--text-muted)] mb-1">Total</p><p className="text-2xl font-bold text-[var(--text-primary)] font-mono">{vendorDetail?.total ?? analysisVendor.total}</p></div>
                <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20 text-center"><p className="text-[10px] text-[var(--text-muted)] mb-1">Shortlisted</p><p className="text-2xl font-bold text-violet-400 font-mono">{vendorDetail?.shortlisted ?? analysisVendor.shortlisted}</p></div>
                <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 text-center"><p className="text-[10px] text-[var(--text-muted)] mb-1">Selected</p><p className="text-2xl font-bold text-emerald-400 font-mono">{vendorDetail?.selected ?? analysisVendor.selected}</p></div>
                <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 text-center"><p className="text-[10px] text-[var(--text-muted)] mb-1">Rejected</p><p className="text-2xl font-bold text-red-400 font-mono">{vendorDetail?.rejected ?? analysisVendor.rejected}</p></div>
              </div>
              {vendorDetail && (<>
                {vendorDetail.stages?.length > 0 && (<div className="bg-[var(--bg-raised)] rounded-xl p-4 border border-[var(--border-default)]"><h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Stage Breakdown</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{vendorDetail.stages.map((s, i) => (<div key={i} className="flex items-center justify-between bg-[var(--bg-card)] rounded-lg px-3 py-2 border border-[var(--border-default)]"><span className="text-xs text-[var(--text-secondary)]">{s.stage}</span><span className="text-xs font-bold text-[var(--text-primary)] font-mono">{s.count}</span></div>))}</div></div>)}
                {vendorDetail.roles?.length > 0 && (<div className="bg-[var(--bg-raised)] rounded-xl p-4 border border-[var(--border-default)]"><h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Roles Contributed</h3><div className="flex flex-wrap gap-2">{vendorDetail.roles.map((r, i) => (<span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)]">{r.role} <span className="text-cyan-400 font-bold">{r.count}</span></span>))}</div></div>)}
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-default)] overflow-hidden"><div className="px-4 py-3 border-b border-[var(--border-default)]"><h3 className="text-sm font-bold text-[var(--text-primary)]">Members ({vendorDetail.members?.length || 0})</h3></div><div className="max-h-[280px] overflow-y-auto"><table className="w-full"><thead className="sticky top-0"><tr className="bg-[var(--bg-raised)] border-b border-[var(--border-default)]"><th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-raised)]">Name</th><th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-raised)]">Role</th><th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-raised)]">Stage</th><th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-raised)]">Exp</th></tr></thead><tbody>{vendorDetail.members?.map((m, i) => (<tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card)]"><td className="py-2 px-4 text-sm text-[var(--text-primary)] font-medium">{m.candidate_name}</td><td className="py-2 px-4 text-xs text-[var(--text-secondary)]">{m.role}</td><td className="py-2 px-4"><StatusBadge status={m.current_stage} /></td><td className="py-2 px-4 text-xs text-[var(--text-secondary)]">{m.work_experience || '-'}</td></tr>))}</tbody></table></div></div>
              </>)}
              {vendorDetailLoading && <div className="text-center py-6 text-sm text-[var(--text-muted)]">Loading vendor details...</div>}
            </div>
          </div>
        </div>
      )}

      {/* Metric/Drop-off Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedMetric(null)}>
          <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl ${selectedMetric.candidates ? 'max-w-3xl' : 'max-w-sm'} w-full max-h-[80vh] overflow-hidden shadow-2xl shadow-black/30`} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-[var(--border-default)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedMetric.label}</h2>
              <button onClick={() => setSelectedMetric(null)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="text-center mb-4">
                <p className={`text-4xl font-bold ${selectedMetric.color || 'text-cyan-400'} font-mono`}>{selectedMetric.value}%</p>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{selectedMetric.detail}</p>
              </div>
              {selectedMetric.fromCount !== undefined && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[var(--bg-raised)] rounded-xl p-3 border border-[var(--border-default)] text-center"><p className="text-[10px] text-[var(--text-muted)] mb-1">Entered Stage</p><p className="text-xl font-bold text-[var(--text-primary)] font-mono">{selectedMetric.fromCount}</p></div>
                  <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 text-center"><p className="text-[10px] text-[var(--text-muted)] mb-1">Moved Forward</p><p className="text-xl font-bold text-emerald-400 font-mono">{selectedMetric.toCount}</p></div>
                </div>
              )}
              {selectedMetric.loading && <div className="text-center py-4 text-sm text-[var(--text-muted)]">Loading details...</div>}
              {selectedMetric.candidates?.length > 0 && (
                <div className="bg-red-500/10/50 rounded-xl border border-red-500/20 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-red-500/20"><p className="text-xs font-bold text-red-400">Dropped Off ({selectedMetric.candidates.length})</p></div>
                  <div className="max-h-[250px] overflow-y-auto"><table className="w-full"><thead className="sticky top-0"><tr className="bg-red-500/10 border-b border-red-500/20">
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-red-500/10">Name</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-red-500/10">Role</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-red-500/10">Vendor</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-red-500/10">Stage</th>
                  </tr></thead><tbody>
                    {selectedMetric.candidates.map((c, i) => (
                      <tr key={i} className="border-b border-red-100 hover:bg-red-500/100/10/50">
                        <td className="py-2 px-3 text-sm text-[var(--text-primary)] font-medium">{c.candidate_name}</td>
                        <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{c.role}</td>
                        <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{c.vendor}</td>
                        <td className="py-2 px-3"><StatusBadge status={c.current_stage} /></td>
                      </tr>
                    ))}
                  </tbody></table></div>
                </div>
              )}
              {selectedMetric.candidates?.length === 0 && <p className="text-center text-sm text-[var(--text-muted)] py-4">No candidates dropped at this stage</p>}
            </div>
          </div>
        </div>
      )}

      {showUploadModal && <FileUpload onClose={() => setShowUploadModal(false)} onSuccess={() => { setShowUploadModal(false); fetchDashboardData(fromDate, toDate, selectedVendor); }} />}
    </div>
  );
};

export default Home;
