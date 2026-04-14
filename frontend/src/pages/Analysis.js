import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
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
import { TrendingUp, Award, Target, ArrowDown, X, BarChart3 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Analysis = () => {
  const [vendorData, setVendorData] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    try {
      const [vendorsRes, pipelineRes, kpisRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/vendors`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/pipeline`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/kpis`, { withCredentials: true }),
      ]);

      const vendorsWithMetrics = vendorsRes.data.map((v) => ({
        ...v,
        shortlistRate: v.total > 0 ? ((v.shortlisted / v.total) * 100).toFixed(1) : 0,
        rejectionRate: v.total > 0 ? ((v.rejected / v.total) * 100).toFixed(1) : 0,
        selectionRate: v.total > 0 ? ((v.selected / v.total) * 100).toFixed(1) : 0,
      }));

      setVendorData(vendorsWithMetrics);
      setPipelineData(pipelineRes.data);
      setKpis(kpisRes.data);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Compute founder-focused metrics
  const totalCandidates = kpis?.total_candidates || 0;
  const shortlisted = kpis?.shortlisted || 0;
  const interviewsScheduled = kpis?.interviews_scheduled || 0;
  const selected = kpis?.selected || 0;
  const rejected = kpis?.rejected || 0;
  const offerReleased = kpis?.offer_released || 0;
  const joined = kpis?.joined || 0;

  const shortlistRate = totalCandidates > 0 ? ((shortlisted / totalCandidates) * 100).toFixed(1) : 0;
  const interviewRate = shortlisted > 0 ? ((interviewsScheduled / shortlisted) * 100).toFixed(1) : 0;
  const selectionRate = totalCandidates > 0 ? ((selected / totalCandidates) * 100).toFixed(1) : 0;
  const offerRate = selected > 0 ? (((offerReleased + joined) / selected) * 100).toFixed(1) : 0;
  const overallConversion = totalCandidates > 0 ? (((selected + offerReleased + joined) / totalCandidates) * 100).toFixed(1) : 0;

  // Stage funnel data
  const funnelData = [
    { name: 'Total Submitted', value: totalCandidates, fill: '#22D3EE' },
    { name: 'Shortlisted', value: shortlisted, fill: '#8B5CF6' },
    { name: 'Interviews', value: interviewsScheduled, fill: '#F59E0B' },
    { name: 'Selected', value: selected, fill: '#10B981' },
    { name: 'Offer Released', value: offerReleased, fill: '#06B6D4' },
    { name: 'Joined', value: joined, fill: '#14B8A6' },
  ].filter(d => d.value > 0);

  // Drop-off analysis
  const dropOffs = [
    { stage: 'Submission \u2192 Shortlist', dropOff: totalCandidates > 0 ? (((totalCandidates - shortlisted) / totalCandidates) * 100).toFixed(0) : 0 },
    { stage: 'Shortlist \u2192 Interview', dropOff: shortlisted > 0 ? (((shortlisted - interviewsScheduled) / shortlisted) * 100).toFixed(0) : 0 },
    { stage: 'Interview \u2192 Selected', dropOff: interviewsScheduled > 0 ? (((interviewsScheduled - selected) / interviewsScheduled) * 100).toFixed(0) : 0 },
    { stage: 'Selected \u2192 Offer', dropOff: selected > 0 ? (((selected - offerReleased - joined) / selected) * 100).toFixed(0) : 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading analysis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analysis-page">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">Analysis</h1>
        <p className="text-sm text-slate-400">Founder-focused hiring funnel & vendor performance</p>
      </div>

      {/* Key Conversion Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="conversion-metrics">
        {[
          { label: 'Shortlist Rate', value: `${shortlistRate}%`, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { label: 'Interview Rate', value: `${interviewRate}%`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Selection Rate', value: `${selectionRate}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Offer Rate', value: `${offerRate}%`, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
          { label: 'Overall Conversion', value: `${overallConversion}%`, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
        ].map((m, i) => (
          <div key={i} className={`${m.bg} border ${m.border} rounded-2xl p-5`}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">{m.label}</p>
            <p className={`text-3xl font-bold ${m.color} font-mono`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Stage Drop-off Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow" data-testid="drop-off-analysis">
        <div className="flex items-center gap-2 mb-6">
          <ArrowDown className="w-5 h-5 text-red-400" strokeWidth={1.5} />
          <h3 className="text-lg font-bold text-white">Stage Drop-off Analysis</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dropOffs.map((d, i) => (
            <div key={i} className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
              <p className="text-xs text-slate-500 mb-2">{d.stage}</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-red-400 font-mono">{d.dropOff}%</p>
                <p className="text-xs text-slate-500 mb-1">drop-off</p>
              </div>
              <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
                <div className="bg-red-400 h-1.5 rounded-full transition-all" style={{ width: `${d.dropOff}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Performance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow" data-testid="vendor-performance-table">
        <h3 className="text-lg font-bold text-white mb-6">Vendor Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Vendor', 'Total', 'Shortlisted', 'Rejected', 'Selected', 'Shortlist %', 'Selection %'].map(h => (
                  <th key={h} className="text-left py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendorData.map((vendor, idx) => (
                <tr key={idx} onClick={() => setSelectedVendor(vendor)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
                  data-testid={`vendor-row-${idx}`}>
                  <td className="py-4 px-4 text-sm text-white font-semibold">{vendor._id}</td>
                  <td className="py-4 px-4 text-sm text-slate-300 font-mono">{vendor.total}</td>
                  <td className="py-4 px-4 text-sm text-slate-300 font-mono">{vendor.shortlisted}</td>
                  <td className="py-4 px-4 text-sm text-slate-300 font-mono">{vendor.rejected}</td>
                  <td className="py-4 px-4 text-sm text-emerald-400 font-mono font-bold">{vendor.selected}</td>
                  <td className="py-4 px-4 text-sm">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {vendor.shortlistRate}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {vendor.selectionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-lg font-bold text-white mb-4">Vendor Contributions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#E2E8F0' }} />
              <Legend wrapperStyle={{ color: '#CBD5E1' }} />
              <Bar dataKey="total" fill="#22D3EE" name="Total" radius={[8, 8, 0, 0]} />
              <Bar dataKey="selected" fill="#10B981" name="Selected" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-lg font-bold text-white mb-4">Pipeline Stage Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis dataKey="_id" type="category" tick={{ fontSize: 11, fill: '#94A3B8' }} width={130} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#E2E8F0' }} />
              <Bar dataKey="count" fill="#22D3EE" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedVendor(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 card-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">{selectedVendor._id}</h2>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-white transition-colors" data-testid="vendor-modal-close">
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                <p className="text-sm text-slate-500 mb-1">Total Candidates</p>
                <p className="text-3xl font-bold text-white font-mono">{selectedVendor.total}</p>
              </div>
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                <p className="text-sm text-slate-500 mb-1">Selected</p>
                <p className="text-3xl font-bold text-emerald-400 font-mono">{selectedVendor.selected}</p>
              </div>
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                <p className="text-sm text-slate-500 mb-1">Shortlisted</p>
                <p className="text-3xl font-bold text-purple-400 font-mono">{selectedVendor.shortlisted}</p>
              </div>
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                <p className="text-sm text-slate-500 mb-1">Selection Rate</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent font-mono">{selectedVendor.selectionRate}%</p>
              </div>
            </div>
            <button onClick={() => setSelectedVendor(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
