import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, Briefcase, Calendar, CheckCircle, X, TrendingUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Home = () => {
  const [kpis, setKpis] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [kpisRes, pipelineRes, vendorsRes, candidatesRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/kpis`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/pipeline`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/vendors`, { withCredentials: true }),
        axios.get(`${API_URL}/api/candidates?limit=10`, { withCredentials: true }),
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
  };

  const openKPIModal = async (type) => {
    try {
      let data = null;
      let title = '';
      
      switch(type) {
        case 'openings':
          const rolesRes = await axios.get(`${API_URL}/api/analytics/roles`, { withCredentials: true });
          data = rolesRes.data;
          title = 'Job Openings';
          break;
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
      }
      
      setModalData({ type, data, title });
    } catch (error) {
      console.error('Error fetching modal data:', error);
    }
  };

  const COLORS = ['#22D3EE', '#14B8A6', '#8B5CF6', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="home-dashboard">
      <div>
        <h1 className="text-5xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-sm text-slate-400">Real-time hiring pipeline insights</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-xl font-bold text-white mb-4">
            Pipeline by Stage
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="_id"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#E2E8F0',
                }}
              />
              <Bar dataKey="count" fill="#22D3EE" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-xl font-bold text-white mb-4">
            Vendor Contributions
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vendorData}
                dataKey="total"
                nameKey="_id"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry._id}: ${entry.total}`}
                labelStyle={{ fill: '#CBD5E1', fontSize: 12 }}
              >
                {vendorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#E2E8F0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
        <h3 className="text-xl font-bold text-white mb-4">
          Recent Candidates
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Candidate
                </th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Vendor
                </th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Stage
                </th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors"
                  data-testid={`recent-candidate-${idx}`}
                >
                  <td className="py-3 px-4 text-sm text-slate-200 font-medium">{candidate.candidate_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{candidate.role}</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{candidate.vendor}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={candidate.current_stage} />
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">{candidate.submission_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalData(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden card-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-2xl font-bold text-white">{modalData.title}</h2>
              <button onClick={() => setModalData(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {modalData.type === 'openings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalData.data.map((role, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <h3 className="text-lg font-bold text-white mb-3">{role._id}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total:</span>
                          <span className="text-white font-semibold">{role.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Active:</span>
                          <span className="text-cyan-400 font-semibold">{role.active}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Selected:</span>
                          <span className="text-emerald-400 font-semibold">{role.selected}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                      {modalData.data.map((candidate, idx) => (
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
                  {modalData.data.map((interview, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">{interview.candidate_name}</h3>
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
