import React, { useState, useEffect } from 'react';
import axios from 'axios';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import { Briefcase, Users, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const JobOpenings = () => {
  const [roleData, setRoleData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoleData();
  }, []);

  const fetchRoleData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/analytics/roles`, {
        withCredentials: true,
      });
      setRoleData(data);
    } catch (error) {
      console.error('Error fetching role data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading openings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="job-openings-page">
      <div>
        <h1 className="text-4xl tracking-tight font-bold text-slate-900 mb-2">Job Openings</h1>
        <p className="text-sm text-slate-700 leading-relaxed">
          {roleData.length} active job openings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roleData.map((role, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-md p-6 hover:-translate-y-0.5 hover:shadow-sm hover:border-blue-200 transition-all duration-200"
            data-testid={`opening-card-${idx}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl tracking-tight font-medium text-slate-900 mb-1">
                  {role._id || 'Untitled Role'}
                </h3>
              </div>
              <div className="ml-2 p-2 bg-blue-50 rounded-md">
                <Briefcase className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total Nominations</span>
                <span className="text-lg font-bold text-slate-900 font-mono">{role.total}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Active Candidates</span>
                <span className="text-lg font-bold text-blue-600 font-mono">{role.active}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Selected</span>
                <span className="text-lg font-bold text-emerald-600 font-mono">{role.selected}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Selection Rate</span>
                <span className="font-medium text-slate-700">
                  {role.total > 0 ? ((role.selected / role.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobOpenings;
