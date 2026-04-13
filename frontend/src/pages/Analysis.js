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
} from 'recharts';
import { TrendingUp, Award, Target } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Analysis = () => {
  const [vendorData, setVendorData] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    try {
      const [vendorsRes, pipelineRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/vendors`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/pipeline`, { withCredentials: true }),
      ]);

      const vendorsWithMetrics = vendorsRes.data.map((v) => ({
        ...v,
        shortlistRate: v.total > 0 ? ((v.shortlisted / v.total) * 100).toFixed(1) : 0,
        rejectionRate: v.total > 0 ? ((v.rejected / v.total) * 100).toFixed(1) : 0,
        selectionRate: v.total > 0 ? ((v.selected / v.total) * 100).toFixed(1) : 0,
      }));

      setVendorData(vendorsWithMetrics);
      setPipelineData(pipelineRes.data);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading analysis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analysis-page">
      <div>
        <h1 className="text-5xl font-bold text-white mb-2">Analysis</h1>
        <p className="text-sm text-slate-400">
          Vendor performance and hiring funnel insights
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
        <h3 className="text-xl font-bold text-white mb-6">
          Vendor Performance Overview
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Vendor
                </th>
                <th className="text-center py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Total
                </th>
                <th className="text-center py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Shortlisted
                </th>
                <th className="text-center py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Rejected
                </th>
                <th className="text-center py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Selected
                </th>
                <th className="text-center py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Shortlist %
                </th>
                <th className="text-center py-4 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Selection %
                </th>
              </tr>
            </thead>
            <tbody>
              {vendorData.map((vendor, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedVendor(vendor)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
                  data-testid={`vendor-row-${idx}`}
                >
                  <td className="py-4 px-4 text-sm text-white font-semibold">{vendor._id}</td>
                  <td className="py-4 px-4 text-sm text-slate-300 text-center font-mono">
                    {vendor.total}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-300 text-center font-mono">
                    {vendor.shortlisted}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-300 text-center font-mono">
                    {vendor.rejected}
                  </td>
                  <td className="py-4 px-4 text-sm text-emerald-400 text-center font-mono font-bold">
                    {vendor.selected}
                  </td>
                  <td className="py-4 px-4 text-sm text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {vendor.shortlistRate}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-center">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-xl font-bold text-white mb-4">
            Vendor Contributions
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ color: '#CBD5E1' }} />
              <Bar dataKey="total" fill="#22D3EE" name="Total" radius={[8, 8, 0, 0]} />
              <Bar dataKey="selected" fill="#10B981" name="Selected" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
          <h3 className="text-xl font-bold text-white mb-4">
            Selection Rate Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#E2E8F0',
                }}
              />
              <Bar
                dataKey="selectionRate"
                fill="#8B5CF6"
                name="Selection %"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow">
        <h3 className="text-xl font-bold text-white mb-4">
          Pipeline Stage Distribution
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={pipelineData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis dataKey="_id" type="category" tick={{ fontSize: 11, fill: '#94A3B8' }} width={150} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '12px',
                color: '#E2E8F0',
              }}
            />
            <Bar dataKey="count" fill="#22D3EE" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selectedVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedVendor(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 card-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">{selectedVendor._id}</h2>
              <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20">
                <Award className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
              </div>
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

            <button
              onClick={() => setSelectedVendor(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
