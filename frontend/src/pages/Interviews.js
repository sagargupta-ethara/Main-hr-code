import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { Calendar, User, Video, X, MessageSquare, Search, Filter } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Interviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/analytics/interviews`, { withCredentials: true });
      setInterviews(data);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = interviews.filter(i => {
    const matchesSearch = !searchQuery ||
      (i.candidate_name && i.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.role && i.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.interviewer && i.interviewer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLevel = levelFilter === 'all' || i.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading interviews...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="interviews-page">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">Interviews</h1>
        <p className="text-sm text-slate-400">{interviews.length} interview records</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4" data-testid="interview-filters">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={1.5} />
            <input
              data-testid="interview-search"
              type="text"
              placeholder="Search by candidate, role, interviewer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'L1', 'L2'].map(level => (
              <button
                key={level}
                data-testid={`filter-level-${level}`}
                onClick={() => setLevelFilter(level)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  levelFilter === level
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {level === 'all' ? 'All Levels' : level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredInterviews.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center card-glow">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-white mb-2">No Interviews Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {interviews.length === 0
              ? 'No interview data available. Upload candidate data with interview slots to see them here.'
              : 'No interviews match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden card-glow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Candidate</th>
                  <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Role</th>
                  <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Vendor</th>
                  <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Level</th>
                  <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Interview Slot</th>
                  <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Interviewer</th>
                  <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.map((interview, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelectedInterview(interview)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
                    data-testid={`interview-row-${idx}`}
                  >
                    <td className="py-4 px-6 text-sm text-white font-semibold">{interview.candidate_name}</td>
                    <td className="py-4 px-6 text-sm text-slate-400">{interview.role}</td>
                    <td className="py-4 px-6 text-sm text-slate-400">{interview.vendor}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                        interview.level === 'L2'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}>
                        {interview.level}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-300">
                      {interview.slot ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="truncate max-w-[200px]">{interview.slot}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Not scheduled</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-cyan-400 flex-shrink-0" strokeWidth={1.5} />
                        {interview.interviewer || 'TBD'}
                      </div>
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
      )}

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedInterview(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden card-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-slate-800">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">{selectedInterview.candidate_name}</h2>
                <p className="text-slate-400 text-sm">{selectedInterview.role} &bull; {selectedInterview.vendor}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20">
                  <Video className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                </div>
                <button onClick={() => setSelectedInterview(null)} className="text-slate-400 hover:text-white transition-colors" data-testid="interview-modal-close">
                  <X className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Interview Level</p>
                  <p className={`text-lg font-bold ${selectedInterview.level === 'L2' ? 'text-purple-400' : 'text-cyan-400'}`}>{selectedInterview.level}</p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Current Stage</p>
                  <StatusBadge status={selectedInterview.current_stage} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Scheduled Slot</p>
                  <p className="text-sm font-semibold text-white">{selectedInterview.slot || 'Not scheduled'}</p>
                  {selectedInterview.slot_raw && selectedInterview.slot_raw !== selectedInterview.slot && (
                    <p className="text-xs text-slate-600 mt-1">Raw: {selectedInterview.slot_raw}</p>
                  )}
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
                    <h3 className="text-base font-bold text-white">Interviewer Feedback</h3>
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
              <button onClick={() => setSelectedInterview(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-semibold">
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
