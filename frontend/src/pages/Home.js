import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, Briefcase, Calendar, CheckCircle, X, Search, RefreshCw, Filter, Upload } from 'lucide-react';
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

const Home = () => {
  const [kpis, setKpis] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useBodyScrollLock(!!modalData || showUploadModal);

  const getDateRange = useCallback((days) => {
    if (!days) return { from: '', to: '' };
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  }, []);

  const fetchDashboardData = useCallback(async (fDate, tDate) => {
    try {
      const params = new URLSearchParams();
      if (fDate) params.set('from_date', fDate);
      if (tDate) params.set('to_date', tDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const [kpisRes, pipelineRes, vendorsRes, candidatesRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/kpis-filtered${qs}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/pipeline`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/vendors`, { withCredentials: true }),
        axios.get(`${API_URL}/api/candidates`, { withCredentials: true }),
      ]);
      setKpis(kpisRes.data);
      setPipelineData(pipelineRes.data);
      setVendorData(vendorsRes.data);
      setAllCandidates(candidatesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(fromDate, toDate); }, [fromDate, toDate, fetchDashboardData]);

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
      fetchDashboardData(fromDate, toDate);
    } catch (err) {
      setSyncMessage(err.response?.data?.detail || 'Sync failed - ensure sheets are public');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 8000);
    }
  };

  const openKPIModal = async (type) => {
    try {
      let data = null; let title = '';
      switch(type) {
        case 'openings': {
          const rolesRes = await axios.get(`${API_URL}/api/analytics/roles`, { withCredentials: true });
          data = rolesRes.data;
          title = 'All Job Openings';
          break;
        }
        case 'candidates': {
          const r = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true });
          data = r.data; title = 'All Candidates'; break;
        }
        case 'interviews': {
          const r = await axios.get(`${API_URL}/api/analytics/interviews`, { withCredentials: true });
          data = r.data; title = 'Interviews'; break;
        }
        case 'selected': {
          const r = await axios.get(`${API_URL}/api/candidates?stage=Selected`, { withCredentials: true });
          data = r.data; title = 'Selected Candidates'; break;
        }
        case 'active': {
          const r = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true });
          data = r.data.filter(c => !['Rejected', 'Joined'].includes(c.current_stage));
          title = 'Active Candidates'; break;
        }
        case 'shortlisted': {
          const r = await axios.get(`${API_URL}/api/candidates?stage=Shortlisted`, { withCredentials: true });
          data = r.data; title = 'Shortlisted Candidates'; break;
        }
        case 'rejected': {
          const r = await axios.get(`${API_URL}/api/candidates?stage=Rejected`, { withCredentials: true });
          data = r.data; title = 'Rejected Candidates'; break;
        }
        default: break;
      }
      setModalData({ type, data, title });
    } catch (error) { console.error('Error fetching modal data:', error); }
  };

  const filteredCandidates = allCandidates.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.candidate_name?.toLowerCase().includes(q)) || (c.role?.toLowerCase().includes(q)) || (c.vendor?.toLowerCase().includes(q));
  });

  const COLORS = ['#22D3EE', '#14B8A6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-400">Loading dashboard...</div></div>;

  return (
    <div className="space-y-5" data-testid="home-dashboard">
      {/* Header with Sync + Upload */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-0.5">Dashboard Overview</h1>
          <p className="text-sm text-slate-400">Real-time hiring pipeline insights</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="sync-google-sheets-btn" onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all text-sm font-semibold border border-slate-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {syncing ? 'Syncing...' : 'Sync Sheets'}
          </button>
          <button data-testid="dashboard-upload-btn" onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-4 py-2 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20">
            <Upload className="w-4 h-4" strokeWidth={1.5} />
            Upload Data
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${syncMessage.includes('failed') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`} data-testid="sync-message">
          {syncMessage}
        </div>
      )}

      {/* Date Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5" data-testid="date-filters">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map(f => (
              <button key={f.label} data-testid={`quick-filter-${f.label}`} onClick={() => handleQuickFilter(f.label, f.days)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${activeQuickFilter === f.label ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" data-testid="date-from" value={fromDate} onChange={e => { setFromDate(e.target.value); setActiveQuickFilter(''); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50" />
            <span className="text-slate-600 text-xs">to</span>
            <input type="date" data-testid="date-to" value={toDate} onChange={e => { setToDate(e.target.value); setActiveQuickFilter(''); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50" />
          </div>
        </div>
      </div>

      {/* Row 1: Active, Shortlisted, Rejected */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard testId="kpi-active-candidates" title="Active Candidates" value={kpis?.active_candidates || 0} subtitle="Currently in pipeline" onClick={() => openKPIModal('active')} />
        <KPICard testId="kpi-shortlisted" title="Shortlisted" value={kpis?.shortlisted || 0} subtitle="Ready for interview" onClick={() => openKPIModal('shortlisted')} />
        <KPICard testId="kpi-rejected" title="Rejected" value={kpis?.rejected || 0} onClick={() => openKPIModal('rejected')} />
      </div>

      {/* Row 2: Total Openings, Total Candidates, Interviews, Selected */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard testId="kpi-total-openings" title="Total Openings" value={kpis?.total_openings || 0} icon={Briefcase} onClick={() => openKPIModal('openings')} />
        <KPICard testId="kpi-total-candidates" title="Total Candidates" value={kpis?.total_candidates || 0} icon={Users} onClick={() => openKPIModal('candidates')} />
        <KPICard testId="kpi-interviews-scheduled" title="Interviews Scheduled" value={kpis?.interviews_scheduled || 0} icon={Calendar} onClick={() => openKPIModal('interviews')} />
        <KPICard testId="kpi-selected" title="Selected" value={kpis?.selected || 0} icon={CheckCircle} onClick={() => openKPIModal('selected')} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-glow">
          <h3 className="text-base font-bold text-white mb-4">Pipeline by Stage</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94A3B8' }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#E2E8F0' }} />
              <Bar dataKey="count" fill="#22D3EE" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-glow">
          <h3 className="text-base font-bold text-white mb-4">Vendor Contributions</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={vendorData} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={95}
                label={({ _id, total }) => `${_id}: ${total}`} labelStyle={{ fill: '#CBD5E1', fontSize: 11 }}>
                {vendorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#E2E8F0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All Candidates - Scrollable */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl card-glow overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-3">
          <h3 className="text-base font-bold text-white">All Candidates <span className="text-sm font-normal text-slate-500">({filteredCandidates.length})</span></h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={1.5} />
            <input data-testid="home-search-bar" type="text" placeholder="Search name, role, vendor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50" />
          </div>
        </div>
        <div className="relative">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="text-left py-2.5 px-5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold bg-slate-900">Candidate</th>
                <th className="text-left py-2.5 px-5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold bg-slate-900">Role</th>
                <th className="text-left py-2.5 px-5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold bg-slate-900">Vendor</th>
                <th className="text-left py-2.5 px-5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold bg-slate-900">Stage</th>
                <th className="text-left py-2.5 px-5 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold bg-slate-900">Date</th>
              </tr>
            </thead>
          </table>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <tbody>
              {filteredCandidates.map((c, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors" data-testid={`candidate-row-${idx}`}>
                  <td className="py-2.5 px-5 text-sm text-slate-200 font-medium">{c.candidate_name}</td>
                  <td className="py-2.5 px-5 text-sm text-slate-400">{c.role}</td>
                  <td className="py-2.5 px-5 text-sm text-slate-400">{c.vendor}</td>
                  <td className="py-2.5 px-5"><StatusBadge status={c.current_stage} /></td>
                  <td className="py-2.5 px-5 text-sm text-slate-400">{c.submission_date}</td>
                </tr>
              ))}
              {filteredCandidates.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-500">No candidates found</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalData(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden card-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">{modalData.title}</h2>
              <button onClick={() => setModalData(null)} className="text-slate-400 hover:text-white transition-colors" data-testid="modal-close-btn"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {/* Openings modal */}
              {modalData.type === 'openings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalData.data?.map((role, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <h3 className="text-base font-bold text-white mb-1">{role._id}</h3>
                      {role.opening_data?.division && <p className="text-xs text-slate-500 mb-3">{role.opening_data.division}</p>}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><span className="text-slate-500 text-xs">Positions</span><p className="font-bold text-cyan-400 font-mono">{role.positions || '-'}</p></div>
                        <div><span className="text-slate-500 text-xs">Active</span><p className="font-bold text-white font-mono">{role.active}</p></div>
                        <div><span className="text-slate-500 text-xs">Selected</span><p className="font-bold text-emerald-400 font-mono">{role.selected}</p></div>
                      </div>
                      {role.vendors?.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-700 flex flex-wrap gap-1">
                          {role.vendors.map((v,i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{v.name} <span className="text-cyan-400">{v.count}</span></span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Candidate-type modals */}
              {['candidates','active','selected','shortlisted','rejected'].includes(modalData.type) && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-800">
                      <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-bold">Name</th>
                      <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-bold">Role</th>
                      <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-bold">Vendor</th>
                      <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-bold">Stage</th>
                      <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-bold">Experience</th>
                    </tr></thead>
                    <tbody>
                      {modalData.data?.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-sm text-white font-medium">{c.candidate_name}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-400">{c.role}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-400">{c.vendor}</td>
                          <td className="py-2.5 px-3"><StatusBadge status={c.current_stage} /></td>
                          <td className="py-2.5 px-3 text-sm text-slate-400">{c.work_experience}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Interviews modal */}
              {modalData.type === 'interviews' && (
                <div className="space-y-3">
                  {modalData.data?.map((i, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-white">{i.candidate_name}</h3>
                        <StatusBadge status={i.status || 'Scheduled'} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-slate-400">Role:</span> <span className="text-white">{i.role}</span></div>
                        <div><span className="text-slate-400">Level:</span> <span className="text-cyan-400">{i.level}</span></div>
                        <div><span className="text-slate-400">Interviewer:</span> <span className="text-white">{i.interviewer || 'TBD'}</span></div>
                        {i.slot && <div><span className="text-slate-400">Slot:</span> <span className="text-white">{i.slot}</span></div>}
                      </div>
                    </div>
                  ))}
                  {(!modalData.data?.length) && <p className="text-center text-slate-500 py-8">No interviews found</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showUploadModal && <FileUpload onClose={() => setShowUploadModal(false)} onSuccess={() => { setShowUploadModal(false); fetchDashboardData(fromDate, toDate); }} />}
    </div>
  );
};

export default Home;
