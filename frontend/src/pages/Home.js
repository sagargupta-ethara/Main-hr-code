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
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { Users, Briefcase, Calendar, CheckCircle, XCircle, Upload } from 'lucide-react';

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

  const COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#059669', '#E11D48'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="home-dashboard">
      <div>
        <h1 className="text-4xl tracking-tight font-bold text-slate-900 mb-2">Dashboard Overview</h1>
        <p className="text-sm text-slate-700 leading-relaxed">Real-time hiring pipeline insights</p>
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
          icon={XCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-4">
            Pipeline by Stage
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="_id"
                tick={{ fontSize: 11 }}
                stroke="#64748B"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6">
          <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-4">
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
              >
                {vendorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6">
        <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-4">
          Recent Candidates
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
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
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  data-testid={`recent-candidate-${idx}`}
                >
                  <td className="py-3 px-4 text-sm text-slate-700">{candidate.candidate_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{candidate.role}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{candidate.vendor}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={candidate.current_stage} />
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{candidate.submission_date}</td>
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
