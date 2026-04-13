import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { Calendar, User, Video, X, MessageSquare } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Interviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState(null);

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
        <div className="text-slate-400">Loading interviews...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="interviews-page">
      <div>
        <h1 className="text-5xl font-bold text-white mb-2">Interviews</h1>
        <p className="text-sm text-slate-400">{interviews.length} interviews scheduled</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden card-glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Candidate
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Role
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Vendor
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Level
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Interview Slot
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Interviewer
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Current Stage
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((interview, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedInterview(interview)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
                  data-testid={`interview-row-${idx}`}
                >
                  <td className="py-4 px-6 text-sm text-white font-semibold">
                    {interview.candidate_name}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-400">{interview.role}</td>
                  <td className="py-4 px-6 text-sm text-slate-400">{interview.vendor}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {interview.level}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                      {interview.slot}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                      {interview.interviewer || 'TBD'}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={interview.current_stage} />
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={interview.status || 'Scheduled'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInterview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedInterview(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden card-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-slate-800">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{selectedInterview.candidate_name}</h2>
                <p className="text-slate-400">{selectedInterview.role} \u2022 {selectedInterview.vendor}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20">
                  <Video className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
                </div>
                <button onClick={() => setSelectedInterview(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Interview Level</p>
                  <p className="text-lg font-bold text-cyan-400">{selectedInterview.level}</p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Current Stage</p>
                  <StatusBadge status={selectedInterview.current_stage} />
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Scheduled Time</p>
                  <p className="text-sm font-semibold text-white">{selectedInterview.slot}</p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Interviewer</p>
                  <p className="text-sm font-semibold text-white">{selectedInterview.interviewer || 'TBD'}</p>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                <p className="text-xs text-slate-500 mb-1">Interview Status</p>
                <StatusBadge status={selectedInterview.status || 'Scheduled'} />
              </div>

              {selectedInterview.feedback && (
                <div className="bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-xl p-5 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                    <h3 className="text-lg font-bold text-white">Interviewer Feedback</h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedInterview.feedback}</p>
                </div>
              )}

              {selectedInterview.remarks && selectedInterview.remarks !== selectedInterview.feedback && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-400 mb-2">Additional Remarks</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedInterview.remarks}</p>
                </div>
              )}

              {!selectedInterview.feedback && !selectedInterview.remarks && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-800 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-slate-500">No feedback available yet</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800">
              <button
                onClick={() => setSelectedInterview(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
