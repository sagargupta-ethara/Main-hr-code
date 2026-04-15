import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { ChevronLeft, ChevronRight, X, Calendar as CalIcon, User, FileText } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseFlexDate(str) {
  if (!str) return null;
  const s = str.trim();
  const fmts = [
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, (m) => new Date(+m[3], +m[2]-1, +m[1])],
    [/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, (m) => new Date(2000 + +m[3], +m[2]-1, +m[1])],
    [/^(\d{4})-(\d{2})-(\d{2})/, (m) => new Date(+m[1], +m[2]-1, +m[3])],
  ];
  for (const [re, fn] of fmts) { const m = s.match(re); if (m) { const d = fn(m); if (!isNaN(d)) return d; } }
  return null;
}
function fmtKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const Interviews = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useBodyScrollLock(!!selectedDate);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true });
        setCandidates(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // Build event map: date -> { submissions: [], interviews: [] }
  const eventMap = useMemo(() => {
    const map = {};
    const add = (key, type, c) => {
      if (!key) return;
      if (!map[key]) map[key] = { submissions: [], interviews: [] };
      map[key][type].push(c);
    };
    candidates.forEach(c => {
      const subDate = parseFlexDate(c.submission_date);
      if (subDate) add(fmtKey(subDate), 'submissions', c);
      const slot1 = parseFlexDate(c.interview_slot_l1);
      if (slot1) add(fmtKey(slot1), 'interviews', c);
      const slot2 = parseFlexDate(c.interview_slot_l2);
      if (slot2) add(fmtKey(slot2), 'interviews', c);
    });
    return map;
  }, [candidates]);

  // Calendar grid
  const year = month.getFullYear(), mo = month.getMonth();
  const firstDay = new Date(year, mo, 1);
  const lastDay = new Date(year, mo + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const cells = [];
  // Leading empty
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, mo, d));
  // Trailing empty
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setMonth(new Date(year, mo - 1, 1));
  const nextMonth = () => setMonth(new Date(year, mo + 1, 1));
  const todayKey = fmtKey(new Date());

  const handleDateClick = useCallback((date) => {
    if (!date) return;
    const key = fmtKey(date);
    const ev = eventMap[key];
    if (ev && (ev.submissions.length || ev.interviews.length)) {
      setSelectedDate({ date, key, ...ev });
    }
  }, [eventMap]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-[var(--text-secondary)]">Loading calendar...</div></div>;

  return (
    <div className="space-y-5" data-testid="interviews-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-0.5">Interviews & Timeline</h1>
        <p className="text-sm text-[var(--text-secondary)]">Calendar view of profile submissions and interview schedules</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-[var(--text-secondary)]">Profile Submitted</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-xs text-[var(--text-secondary)]">Interview Scheduled</span></div>
      </div>

      {/* Calendar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden" data-testid="calendar-grid">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" data-testid="cal-prev">
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <h2 className="text-sm font-bold text-[var(--text-primary)]" data-testid="cal-month-label">
            {month.toLocaleString('default', { month: 'long' })} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" data-testid="cal-next">
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-[80px] border-b border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/30" />;
            const key = fmtKey(date);
            const ev = eventMap[key];
            const isToday = key === todayKey;
            const hasSub = ev?.submissions?.length > 0;
            const hasInt = ev?.interviews?.length > 0;
            const hasEvents = hasSub || hasInt;

            return (
              <div key={i} onClick={() => handleDateClick(date)}
                className={`min-h-[80px] border-b border-r border-[var(--border-subtle)] p-1.5 transition-colors ${
                  hasEvents ? 'cursor-pointer hover:bg-[var(--bg-raised)]' : ''
                } ${isToday ? 'bg-cyan-500/5' : ''}`}
                data-testid={`cal-day-${key}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${isToday ? 'text-cyan-400 bg-cyan-500/15 w-6 h-6 rounded-full flex items-center justify-center' : 'text-[var(--text-secondary)]'}`}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {hasSub && (
                    <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-[9px] font-semibold text-blue-400 truncate">{ev.submissions.length} submitted</span>
                    </div>
                  )}
                  {hasInt && (
                    <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="text-[9px] font-semibold text-amber-400 truncate">{ev.interviews.length} interview{ev.interviews.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Detail Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg"><CalIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /></div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {selectedDate.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedDate.submissions?.length || 0} submitted, {selectedDate.interviews?.length || 0} interview{(selectedDate.interviews?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" data-testid="cal-modal-close"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Submissions */}
              {selectedDate.submissions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <h3 className="text-sm font-bold text-blue-400">Profiles Submitted ({selectedDate.submissions.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedDate.submissions.map((c, i) => (
                      <div key={i} className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{c.candidate_name}</span>
                          <StatusBadge status={c.current_stage} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                          <span>Role: <span className="text-[var(--text-primary)]">{c.role}</span></span>
                          <span>Vendor: <span className="text-[var(--text-primary)]">{c.vendor}</span></span>
                          {c.work_experience && <span>Exp: {c.work_experience}</span>}
                          {c.resume_link && <a href={c.resume_link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"><FileText className="w-3 h-3" strokeWidth={1.5} />Resume</a>}
                        </div>
                        {/* Feedback / Remark */}
                        {(c.interview_feedback_l1 || c.remarks) && (
                          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{c.interview_feedback_l1 ? 'L1 Feedback' : 'Remark'}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{c.interview_feedback_l1 || c.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interviews */}
              {selectedDate.interviews?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-bold text-amber-400">Interviews Scheduled ({selectedDate.interviews.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedDate.interviews.map((c, i) => (
                      <div key={i} className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{c.candidate_name}</span>
                          <StatusBadge status={c.current_stage} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                          <span>Role: <span className="text-[var(--text-primary)]">{c.role}</span></span>
                          <span>Vendor: <span className="text-[var(--text-primary)]">{c.vendor}</span></span>
                          {c.interview_status_l1 && <span>L1: <span className="text-amber-400">{c.interview_status_l1}</span></span>}
                          {c.interview_status_l2 && <span>L2: <span className="text-amber-400">{c.interview_status_l2}</span></span>}
                          {c.interviewer_name_l1 && <span>Interviewer: <span className="text-[var(--text-primary)]">{c.interviewer_name_l1}</span></span>}
                          {c.resume_link && <a href={c.resume_link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"><FileText className="w-3 h-3" strokeWidth={1.5} />Resume</a>}
                        </div>
                        {(c.interview_feedback_l1 || c.remarks) && (
                          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{c.interview_feedback_l1 ? 'L1 Feedback' : 'Remark'}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{c.interview_feedback_l1 || c.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
