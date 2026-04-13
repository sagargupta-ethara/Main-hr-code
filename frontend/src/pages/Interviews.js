import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { Calendar, User } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Interviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/analytics/interviews`, {
        withCredentials: true,
      });
      setInterviews(data);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading interviews...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="interviews-page">
      <div>
        <h1 className="text-4xl tracking-tight font-bold text-slate-900 mb-2">Interviews</h1>
        <p className="text-sm text-slate-700 leading-relaxed">{interviews.length} interviews</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
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
                  Level
                </th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Interview Slot
                </th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Interviewer
                </th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((interview, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  data-testid={`interview-row-${idx}`}
                >
                  <td className="py-3 px-4 text-sm text-slate-700 font-medium">
                    {interview.candidate_name}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{interview.role}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{interview.vendor}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {interview.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                      {interview.slot}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                      {interview.interviewer || 'TBD'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={interview.status || 'Scheduled'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Interviews;
