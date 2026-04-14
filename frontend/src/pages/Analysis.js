import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ArrowDown, X, Users, TrendingUp } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Cleaner, more readable color palette
const CHART_COLORS = {
  total: '#60A5FA',      // soft blue
  shortlisted: '#A78BFA', // soft violet
  rejected: '#F87171',    // soft red
  selected: '#34D399',    // soft emerald
  pipeline: '#38BDF8',    // sky
};

const Analysis = () => {
  const [vendorData, setVendorData] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);

  useBodyScrollLock(!!selectedVendor || !!selectedMetric);
  
  useEffect(() => { fetchAnalysisData(); }, []);

  const fetchAnalysisData = async () => {
    try {
      const [vendorsRes, pipelineRes, kpisRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/vendors`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/pipeline`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/kpis`, { withCredentials: true }),
      ]);
      setVendorData(vendorsRes.data.map(v => ({
        ...v,
        shortlistRate: v.total > 0 ? ((v.shortlisted / v.total) * 100).toFixed(1) : 0,
        rejectionRate: v.total > 0 ? ((v.rejected / v.total) * 100).toFixed(1) : 0,
        selectionRate: v.total > 0 ? ((v.selected / v.total) * 100).toFixed(1) : 0,
      })));
      setPipelineData(pipelineRes.data);
      setKpis(kpisRes.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const tc = kpis?.total_candidates || 0;
  const sl = kpis?.shortlisted || 0;
  const iv = kpis?.interviews_scheduled || 0;
  const sel = kpis?.selected || 0;
  const rej = kpis?.rejected || 0;
  const ofr = kpis?.offer_released || 0;
  const jn = kpis?.joined || 0;

  const metrics = [
    { key: 'shortlist', label: 'Shortlist Rate', value: tc > 0 ? ((sl / tc) * 100).toFixed(1) : 0, detail: `${sl} shortlisted of ${tc} total`, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { key: 'interview', label: 'Interview Rate', value: sl > 0 ? ((iv / sl) * 100).toFixed(1) : 0, detail: `${iv} interviews from ${sl} shortlisted`, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { key: 'selection', label: 'Selection Rate', value: tc > 0 ? ((sel / tc) * 100).toFixed(1) : 0, detail: `${sel} selected of ${tc} total`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { key: 'offer', label: 'Offer Rate', value: sel > 0 ? (((ofr + jn) / sel) * 100).toFixed(1) : 0, detail: `${ofr + jn} offers from ${sel} selected`, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { key: 'conversion', label: 'Overall Conversion', value: tc > 0 ? (((sel + ofr + jn) / tc) * 100).toFixed(1) : 0, detail: `${sel + ofr + jn} converted from ${tc} total`, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  ];

  const dropOffs = [
    { stage: 'Submission \u2192 Shortlist', dropOff: tc > 0 ? (((tc - sl) / tc) * 100).toFixed(0) : 0, lost: tc - sl, from: tc },
    { stage: 'Shortlist \u2192 Interview', dropOff: sl > 0 ? (((sl - iv) / sl) * 100).toFixed(0) : 0, lost: sl - iv, from: sl },
    { stage: 'Interview \u2192 Selected', dropOff: iv > 0 ? (((iv - sel) / iv) * 100).toFixed(0) : 0, lost: iv - sel, from: iv },
    { stage: 'Selected \u2192 Offer', dropOff: sel > 0 ? (((sel - ofr - jn) / sel) * 100).toFixed(0) : 0, lost: sel - ofr - jn, from: sel },
  ];

  // Pipeline data with stage-specific colors
  const coloredPipeline = pipelineData.map(d => {
    const s = (d._id || '').toLowerCase();
    let fill = CHART_COLORS.pipeline;
    if (s.includes('reject')) fill = '#F87171';
    else if (s.includes('select') || s.includes('offer') || s.includes('join')) fill = '#34D399';
    else if (s.includes('shortlist')) fill = '#A78BFA';
    else if (s.includes('interview') || s.includes('l1') || s.includes('l2')) fill = '#FBBF24';
    else if (s.includes('new')) fill = '#60A5FA';
    return { ...d, fill };
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-400">Loading analysis...</div></div>;

  return (
    <div className="space-y-5" data-testid="analysis-page">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-0.5">Analysis</h1>
        <p className="text-sm text-slate-400">Hiring funnel & vendor performance insights</p>
      </div>

      {/* Clickable Conversion Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="conversion-metrics">
        {metrics.map((m, i) => (
          <div key={i} onClick={() => setSelectedMetric(m)} className={`${m.bg} border ${m.border} rounded-2xl p-4 cursor-pointer hover:opacity-80 transition-all`} data-testid={`metric-${m.key}`}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-1.5">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color} font-mono`}>{m.value}%</p>
          </div>
        ))}
      </div>

      {/* Drop-off Analysis - Clickable */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-glow" data-testid="drop-off-analysis">
        <div className="flex items-center gap-2 mb-5">
          <ArrowDown className="w-4 h-4 text-red-400" strokeWidth={1.5} />
          <h3 className="text-base font-bold text-white">Stage Drop-off</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dropOffs.map((d, i) => (
            <div key={i} onClick={() => setSelectedMetric({ label: d.stage, value: d.dropOff, detail: `${d.lost} candidates lost from ${d.from}`, color: 'text-red-400' })}
              className="bg-slate-800/30 rounded-xl p-3.5 border border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-all">
              <p className="text-xs text-slate-500 mb-1.5">{d.stage}</p>
              <div className="flex items-end gap-1.5">
                <p className="text-xl font-bold text-red-400 font-mono">{d.dropOff}%</p>
                <p className="text-[10px] text-slate-500 mb-0.5">lost</p>
              </div>
              <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
                <div className="bg-red-400/80 h-1 rounded-full" style={{ width: `${Math.min(d.dropOff, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-glow" data-testid="vendor-performance-table">
        <h3 className="text-base font-bold text-white mb-4">Vendor Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-800">
              {['Vendor','Total','Shortlisted','Rejected','Selected','Shortlist %','Selection %'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {vendorData.map((v, idx) => (
                <tr key={idx} onClick={() => setSelectedVendor(v)} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer" data-testid={`vendor-row-${idx}`}>
                  <td className="py-3 px-3 text-sm text-white font-semibold">{v._id}</td>
                  <td className="py-3 px-3 text-sm text-slate-300 font-mono">{v.total}</td>
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

      {/* Charts with improved colors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-glow">
          <h3 className="text-base font-bold text-white mb-4">Vendor Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vendorData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', color: '#E2E8F0' }} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
              <Bar dataKey="total" fill={CHART_COLORS.total} name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shortlisted" fill={CHART_COLORS.shortlisted} name="Shortlisted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="selected" fill={CHART_COLORS.selected} name="Selected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-glow">
          <h3 className="text-base font-bold text-white mb-4">Pipeline Stages</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={coloredPipeline} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis dataKey="_id" type="category" tick={{ fontSize: 10, fill: '#94A3B8' }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', color: '#E2E8F0' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {coloredPipeline.map((d, i) => (
                  <rect key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendor Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedVendor(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 card-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-2xl font-bold text-white">{selectedVendor._id}</h2>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-white" data-testid="vendor-modal-close"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-xs text-slate-500 mb-1">Total</p><p className="text-2xl font-bold text-white font-mono">{selectedVendor.total}</p></div>
              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-xs text-slate-500 mb-1">Selected</p><p className="text-2xl font-bold text-emerald-400 font-mono">{selectedVendor.selected}</p></div>
              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-xs text-slate-500 mb-1">Shortlisted</p><p className="text-2xl font-bold text-violet-400 font-mono">{selectedVendor.shortlisted}</p></div>
              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-xs text-slate-500 mb-1">Rejected</p><p className="text-2xl font-bold text-red-400 font-mono">{selectedVendor.rejected}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20 text-center"><p className="text-[10px] text-slate-500 mb-1">Shortlist Rate</p><p className="text-xl font-bold text-violet-400 font-mono">{selectedVendor.shortlistRate}%</p></div>
              <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 text-center"><p className="text-[10px] text-slate-500 mb-1">Selection Rate</p><p className="text-xl font-bold text-emerald-400 font-mono">{selectedVendor.selectionRate}%</p></div>
            </div>
            <button onClick={() => setSelectedVendor(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold text-sm">Close</button>
          </div>
        </div>
      )}

      {/* Metric Detail Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedMetric(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 card-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{selectedMetric.label}</h2>
              <button onClick={() => setSelectedMetric(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="text-center mb-4">
              <p className={`text-4xl font-bold ${selectedMetric.color || 'text-cyan-400'} font-mono`}>{selectedMetric.value}%</p>
            </div>
            <p className="text-sm text-slate-400 text-center mb-4">{selectedMetric.detail}</p>
            <button onClick={() => setSelectedMetric(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
