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
import { Users, Briefcase, Calendar, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Home = () => {
  const [kpis, setKpis] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

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
        />
        <KPICard
          testId="kpi-total-candidates"
          title="Total Candidates"
          value={kpis?.total_candidates || 0}
          icon={Users}
        />
        <KPICard
          testId="kpi-interviews-scheduled"
          title="Interviews Scheduled"
          value={kpis?.interviews_scheduled || 0}
          icon={Calendar}
        />
        <KPICard
          testId="kpi-selected"
          title="Selected"
          value={kpis?.selected || 0}
          icon={CheckCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard
          testId="kpi-active-candidates"
          title="Active Candidates"
          value={kpis?.active_candidates || 0}
          subtitle="Currently in pipeline"
        />
        <KPICard
          testId="kpi-shortlisted"
          title="Shortlisted"
          value={kpis?.shortlisted || 0}
          subtitle="Ready for interview"
        />
        <KPICard
          testId="kpi-rejected"
          title="Rejected"
          value={kpis?.rejected || 0}
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
    </div>
  );
};

export default Home;
