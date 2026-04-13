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
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Analysis = () => {
  const [vendorData, setVendorData] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div className="text-slate-600">Loading analysis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analysis-page">
      <div>
        <h1 className="text-4xl tracking-tight font-bold text-slate-900 mb-2">Analysis</h1>
        <p className="text-sm text-slate-700 leading-relaxed">
          Vendor performance and hiring funnel insights
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6">
        <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-4">
          Vendor Performance Overview
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Vendor
                </th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Total
                </th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Shortlisted
                </th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Rejected
                </th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Selected
                </th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Shortlist %
                </th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Selection %
                </th>
              </tr>
            </thead>
            <tbody>
              {vendorData.map((vendor, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  data-testid={`vendor-row-${idx}`}
                >
                  <td className="py-3 px-4 text-sm text-slate-700 font-medium">{vendor._id}</td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-center font-mono">
                    {vendor.total}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-center font-mono">
                    {vendor.shortlisted}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-center font-mono">
                    {vendor.rejected}
                  </td>
                  <td className="py-3 px-4 text-sm text-emerald-600 text-center font-mono font-semibold">
                    {vendor.selected}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700">
                      {vendor.shortlistRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
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
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-4">
            Vendor Contributions
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} stroke="#64748B" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#2563EB" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="selected" fill="#059669" name="Selected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6">
          <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-4">
            Selection Rate Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} stroke="#64748B" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
              <Tooltip />
              <Bar
                dataKey="selectionRate"
                fill="#8B5CF6"
                name="Selection %"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6">
        <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-4">
          Pipeline Stage Distribution
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={pipelineData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748B" />
            <YAxis dataKey="_id" type="category" tick={{ fontSize: 11 }} stroke="#64748B" width={150} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analysis;
