import React, { useState, useEffect } from 'react';
import axios from 'axios';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import { Briefcase, Users, CheckCircle, TrendingUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const JobOpenings = () => {
  const [roleData, setRoleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

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
        <div className="text-slate-400">Loading openings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="job-openings-page">
      <div>
        <h1 className="text-5xl font-bold text-white mb-2">Job Openings</h1>
        <p className="text-sm text-slate-400">
          {roleData.length} active job openings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roleData.map((role, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedRole(role)}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow cursor-pointer hover:border-cyan-500/30 transition-all duration-300"
            data-testid={`opening-card-${idx}`}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {role._id || 'Untitled Role'}
                </h3>
              </div>
              <div className="ml-2 p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20">
                <Briefcase className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-800">
                <span className="text-sm text-slate-400">Total Nominations</span>
                <span className="text-2xl font-bold text-white font-mono">{role.total}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-800">
                <span className="text-sm text-slate-400">Active Candidates</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent font-mono">{role.active}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-400">Selected</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono">{role.selected}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Selection Rate</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                  <span className="font-bold text-emerald-400">
                    {role.total > 0 ? ((role.selected / role.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedRole && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedRole(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 card-glow" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-bold text-white mb-6">{selectedRole._id}</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-2">Total Nominations</p>
                <p className="text-4xl font-bold text-white font-mono">{selectedRole.total}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-2">Active</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent font-mono">{selectedRole.active}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-2">Selected</p>
                <p className="text-4xl font-bold text-emerald-400 font-mono">{selectedRole.selected}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRole(null)}
              className="mt-8 w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOpenings;
