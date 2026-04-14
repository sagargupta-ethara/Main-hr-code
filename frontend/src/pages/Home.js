import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, Briefcase, Calendar, CheckCircle, X, Search, RefreshCw, Filter } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QUICK_FILTERS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: null },
];

const Home = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const getDateRange = useCallback((days) => {
    if (!days) return { from: '', to: '' };
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
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
      setCandidates(candidatesRes.data.slice(0, 10));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(fromDate, toDate);
  }, [fromDate, toDate, fetchDashboardData]);

  const handleQuickFilter = (label, days) => {
    setActiveQuickFilter(label);
    if (days === null) {
      setFromDate('');
      setToDate('');
    } else {
      const range = getDateRange(days);
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const [candRes, openRes] = await Promise.all([
        axios.post(`${API_URL}/api/sync-google-sheets`, {}, { withCredentials: true }),
        axios.post(`${API_URL}/api/sync-google-openings`, {}, { withCredentials: true }),
      ]);
      const candCount = candRes.data?.count || 0;
      const openCount = openRes.data?.count || 0;
      setSyncMessage(`Synced ${candCount} candidates, ${openCount} openings`);
      fetchDashboardData(fromDate, toDate);
    } catch (err) {
      setSyncMessage(err.response?.data?.detail || 'Sync failed - ensure sheets are public');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const openKPIModal = async (type) => {
    try {
      let data = null;
      let title = '';
      
      switch(type) {
        case 'openings':
          navigate('/dashboard/job-openings');
          return;
        case 'candidates':
          const candidatesRes = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true });
          data = candidatesRes.data;
          title = 'All Candidates';
          break;
        case 'interviews':
          const interviewsRes = await axios.get(`${API_URL}/api/analytics/interviews`, { withCredentials: true });
          data = interviewsRes.data;
          title = 'Interviews';
          break;
        case 'selected':
          const selectedRes = await axios.get(`${API_URL}/api/candidates?stage=Selected`, { withCredentials: true });
          data = selectedRes.data;
          title = 'Selected Candidates';
          break;
        case 'active':
          const activeRes = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true });
          data = activeRes.data.filter(c => !['Rejected', 'Joined'].includes(c.current_stage));
          title = 'Active Candidates';
          break;
        case 'shortlisted':
          const shortlistedRes = await axios.get(`${API_URL}/api/candidates?stage=Shortlisted`, { withCredentials: true });
          data = shortlistedRes.data;
          title = 'Shortlisted Candidates';
          break;
        case 'rejected':
          const rejectedRes = await axios.get(`${API_URL}/api/candidates?stage=Rejected`, { withCredentials: true });
          data = rejectedRes.data;
          title = 'Rejected Candidates';
          break;
        default:
          break;
      }
      
      setModalData({ type, data, title });
    } catch (error) {
      console.error('Error fetching modal data:', error);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.candidate_name && c.candidate_name.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q)) ||
      (c.vendor && c.vendor.toLowerCase().includes(q))
    );
  });

  const COLORS = ['#22D3EE', '#14B8A6', '#8B5CF6', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="home-dashboard">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">Dashboard Overview</h1>
          <p className="text-sm text-slate-400">Real-time hiring pipeline insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="sync-google-sheets-btn"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl transition-all text-sm font-semibold border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {syncing ? 'Syncing...' : 'Sync Google Sheets'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          syncMessage.includes('failed') || syncMessage.includes('error')
            ? 'bg-red-500/10 text-red-400 border-red-500/30'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        }`} data-testid="sync-message">
          {syncMessage}
        </div>
      )}

      {/* Date Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4" data-testid="date-filters">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.label}
                data-testid={`quick-filter-${f.label}`}
                onClick={() => handleQuickFilter(f.label, f.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeQuickFilter === f.label
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              data-testid="date-from"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setActiveQuickFilter(''); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            />
            <span className="text-slate-600 text-xs">to</span>
            <input
              type="date"
              data-testid="date-to"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setActiveQuickFilter(''); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          testId="kpi-total-openings"
          title="Total Openings"
          value={kpis?.total_openings || 0}
          icon={Briefcase}
          onClick={() => openKPIModal('openings')}
        />
        <KPICard
          testId="kpi-total-candidates"
          title="Total Candidates"
          value={kpis?.total_candidates || 0}
          icon={Users}
          onClick={() => openKPIModal('candidates')}
        />
        <KPICard
          testId="kpi-interviews-scheduled"
          title="Interviews Scheduled"
          value={kpis?.interviews_scheduled || 0}
          icon={Calendar}
          onClick={() => openKPIModal('interviews')}
        />
        <KPICard
          testId="kpi-selected"
          title="Selected"
          value={kpis?.selected || 0}
          icon={CheckCircle}
          onClick={() => openKPIModal('selected')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard
          testId="kpi-active-candidates"
          title="Active Candidates"
          value={kpis?.active_candidates || 0}
          subtitle="Currently in pipeline"
          onClick={() => openKPIModal('active')}
        />
        <KPICard
          testId="kpi-shortlisted"
          title="Shortlisted"
          value={kpis?.shortlisted || 0}
          subtitle="Ready for interview"
          onClick={() => openKPIModal('shortlisted')}
        />
        <KPICard
          testId="kpi-rejected"
          title="Rejected"
          value={kpis?.rejected || 0}
          onClick={() => openKPIModal('rejected')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-lg font-bold text-white mb-4">Pipeline by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94A3B8' }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#E2E8F0' }} />
              <Bar dataKey="count" fill="#22D3EE" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-lg font-bold text-white mb-4">Vendor Contributions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={vendorData} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={100}
                label={({ _id, total }) => `${_id}: ${total}`} labelStyle={{ fill: '#CBD5E1', fontSize: 11 }}>
                {vendorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#E2E8F0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Candidates with Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-white">Recent Candidates</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={1.5} />
            <input
              data-testid="home-search-bar"
              type="text"
              placeholder="Search by name, role, vendor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Candidate</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Role</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Vendor</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Stage</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate, idx) => (
                <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors" data-testid={`recent-candidate-${idx}`}>
                  <td className="py-3 px-4 text-sm text-slate-200 font-medium">{candidate.candidate_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{candidate.role}</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{candidate.vendor}</td>
                  <td className="py-3 px-4"><StatusBadge status={candidate.current_stage} /></td>
                  <td className="py-3 px-4 text-sm text-slate-400">{candidate.submission_date}</td>
                </tr>
              ))}
              {filteredCandidates.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-500">No candidates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalData(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden card-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-2xl font-bold text-white">{modalData.title}</h2>
              <button onClick={() => setModalData(null)} className="text-slate-400 hover:text-white transition-colors" data-testid="modal-close-btn">
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(modalData.type === 'candidates' || modalData.type === 'active' || modalData.type === 'selected' || modalData.type === 'shortlisted' || modalData.type === 'rejected') && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-3 px-4 text-xs text-slate-500 font-bold">Name</th>
                        <th className="text-left py-3 px-4 text-xs text-slate-500 font-bold">Role</th>
                        <th className="text-left py-3 px-4 text-xs text-slate-500 font-bold">Vendor</th>
                        <th className="text-left py-3 px-4 text-xs text-slate-500 font-bold">Stage</th>
                        <th className="text-left py-3 px-4 text-xs text-slate-500 font-bold">Experience</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.data?.map((candidate, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-sm text-white font-medium">{candidate.candidate_name}</td>
                          <td className="py-3 px-4 text-sm text-slate-400">{candidate.role}</td>
                          <td className="py-3 px-4 text-sm text-slate-400">{candidate.vendor}</td>
                          <td className="py-3 px-4"><StatusBadge status={candidate.current_stage} /></td>
                          <td className="py-3 px-4 text-sm text-slate-400">{candidate.work_experience}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {modalData.type === 'interviews' && (
                <div className="space-y-3">
                  {modalData.data?.map((interview, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-white">{interview.candidate_name}</h3>
                        <StatusBadge status={interview.status || 'Scheduled'} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-slate-400">Role:</span> <span className="text-white">{interview.role}</span></div>
                        <div><span className="text-slate-400">Level:</span> <span className="text-cyan-400">{interview.level}</span></div>
                        <div><span className="text-slate-400">Vendor:</span> <span className="text-white">{interview.vendor}</span></div>
                        <div><span className="text-slate-400">Interviewer:</span> <span className="text-white">{interview.interviewer || 'TBD'}</span></div>
                        <div className="col-span-2"><span className="text-slate-400">Slot:</span> <span className="text-white">{interview.slot}</span></div>
                      </div>
                    </div>
                  ))}
                  {(!modalData.data || modalData.data.length === 0) && (
                    <p className="text-center text-slate-500 py-8">No interviews found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
