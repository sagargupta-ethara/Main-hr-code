import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { ChevronLeft, ChevronRight, X, Calendar as CalIcon, FileText, User } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseFlexDate(str) {
  if (!str) return null;
  const s = str.trim();
  const fmts = [
    [/^(\d{1,2})\/(\d{1,2})\/(\d{2}),?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?/i, m => new Date(2000 + +m[3], +m[2]-1, +m[1])],
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+\d{1,2}:\d{2}/, m => new Date(+m[3], +m[2]-1, +m[1])],
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, m => new Date(+m[3], +m[2]-1, +m[1])],
    [/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, m => new Date(2000 + +m[3], +m[2]-1, +m[1])],
    [/^(\d{4})-(\d{2})-(\d{2})/, m => new Date(+m[1], +m[2]-1, +m[3])],
  ];
  for (const [re, fn] of fmts) { const m = s.match(re); if (m) { const d = fn(m); if (!isNaN(d)) return d; } }
  return null;
}
function fmtKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function extractTime(str) {
  if (!str) return null;
  const m = str.match(/,?\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  return m ? m[1].trim() + ' IST' : null;
}

const Interviews = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useBodyScrollLock(!!selectedDate);

  useEffect(() => {
    (async () => {
      try { const { data } = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true }); setCandidates(data); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const eventMap = useMemo(() => {
    const map = {};
    const add = (key, type, item) => {
      if (!key) return;
      if (!map[key]) map[key] = { submissions: [], interviews: [] };
      map[key][type].push(item);
    };
    candidates.forEach(c => {
      // Profile submission events
      const subDate = parseFlexDate(c.submission_date);
      if (subDate) add(fmtKey(subDate), 'submissions', c);

      // Interview slot events (dd/mm/yy, time format)
      const slot1 = parseFlexDate(c.interview_slot_l1);
      if (slot1) {
        add(fmtKey(slot1), 'interviews', { ...c, _time: extractTime(c.interview_slot_l1), _level: 'L1', _slotRaw: c.interview_slot_l1 });
      }
      const slot2 = parseFlexDate(c.interview_slot_l2);
      if (slot2) {
        add(fmtKey(slot2), 'interviews', { ...c, _time: extractTime(c.interview_slot_l2), _level: 'L2', _slotRaw: c.interview_slot_l2 });
      }

      // If candidate has interview_status but no slot, show as "interviewed" on submission date
      if (!slot1 && !slot2 && c.interview_status_l1 && subDate) {
        add(fmtKey(subDate), 'interviews', { ...c, _time: null, _level: 'L1', _slotRaw: null, _noSlot: true });
      }
    });
    return map;
  }, [candidates]);

  // Calendar grid
  const year = month.getFullYear(), mo = month.getMonth();
  const firstDay = new Date(year, mo, 1);
  const lastDay = new Date(year, mo + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, mo, d));
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

  // Count total events across all months for info
  const totalInterviewEvents = useMemo(() => Object.values(eventMap).reduce((s, e) => s + e.interviews.length, 0), [eventMap]);
  const totalSubmissions = useMemo(() => Object.values(eventMap).reduce((s, e) => s + e.submissions.length, 0), [eventMap]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-[var(--text-secondary)]">Loading calendar...</div></div>;

  return (
    <div className="space-y-4" data-testid="interviews-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-0.5">Interviews & Timeline</h1>
          <p className="text-sm text-[var(--text-secondary)]">{totalSubmissions} submissions &middot; {totalInterviewEvents} interviews tracked</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-[var(--text-secondary)]">Submitted</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-[var(--text-secondary)]">Interview</span></div>
        </div>
      </div>

      {/* Calendar — full width */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden" data-testid="calendar-grid">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
          <button onClick={prevMonth} className="p-1 rounded-md hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" data-testid="cal-prev"><ChevronLeft className="w-4 h-4" strokeWidth={2} /></button>
          <h2 className="text-sm font-bold text-[var(--text-primary)]" data-testid="cal-month-label">{month.toLocaleString('default', { month: 'long' })} {year}</h2>
          <button onClick={nextMonth} className="p-1 rounded-md hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" data-testid="cal-next"><ChevronRight className="w-4 h-4" strokeWidth={2} /></button>
        </div>

        <div className="grid grid-cols-7">
          {DAYS.map(d => <div key={d} className="py-1.5 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)]">{d}</div>)}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="h-[68px] border-b border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/30" />;
            const key = fmtKey(date);
            const ev = eventMap[key];
            const isToday = key === todayKey;
            const hasSub = ev?.submissions?.length > 0;
            const hasInt = ev?.interviews?.length > 0;
            const hasEvents = hasSub || hasInt;

            return (
              <div key={i} onClick={() => handleDateClick(date)}
                className={`h-[68px] border-b border-r border-[var(--border-subtle)] px-1 py-0.5 transition-colors ${hasEvents ? 'cursor-pointer hover:bg-[var(--bg-raised)]' : ''} ${isToday ? 'bg-cyan-500/5' : ''}`}
                data-testid={`cal-day-${key}`}>
                <div className="mb-0.5">
                  <span className={`text-[11px] font-semibold inline-flex items-center justify-center ${isToday ? 'text-cyan-400 bg-cyan-500/15 w-5 h-5 rounded-full' : 'text-[var(--text-secondary)]'}`}>
                    {date.getDate()}
                  </span>
                </div>
                {hasSub && (
                  <div className="flex items-center gap-0.5 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[8px] font-semibold text-blue-400 truncate">{ev.submissions.length} profile{ev.submissions.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                {hasInt && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[8px] font-semibold text-amber-400 truncate">{ev.interviews.length} int.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Date Detail Modal ── */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg"><CalIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /></div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">{selectedDate.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">{selectedDate.submissions?.length || 0} submitted &middot; {selectedDate.interviews?.length || 0} interview{(selectedDate.interviews?.length || 0) !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" data-testid="cal-modal-close"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Interviews section */}
              {selectedDate.interviews?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Interviews ({selectedDate.interviews.length})</h3></div>
                  <div className="space-y-2">
                    {selectedDate.interviews.map((c, i) => (
                      <div key={i} className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{c.candidate_name}</span>
                            {c._level && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">{c._level}</span>}
                          </div>
                          <StatusBadge status={c.current_stage} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-secondary)] mt-1.5">
                          <span>Role: <span className="text-[var(--text-primary)]">{c.role}</span></span>
                          <span>Vendor: <span className="text-[var(--text-primary)]">{c.vendor}</span></span>
                          {c._time && <span>Time: <span className="text-amber-400 font-semibold">{c._time}</span></span>}
                          {c._noSlot && <span className="text-[var(--text-muted)]">(no slot data)</span>}
                          {c.interview_status_l1 && <span>L1 Status: <span className={`font-semibold ${c.interview_status_l1.toLowerCase().includes('reject') ? 'text-red-400' : 'text-emerald-400'}`}>{c.interview_status_l1}</span></span>}
                          {c.interview_status_l2 && <span>L2 Status: <span className="text-amber-400 font-semibold">{c.interview_status_l2}</span></span>}
                          {c.interviewer_name_l1 && <span>Interviewer: <span className="text-[var(--text-primary)]">{c.interviewer_name_l1}</span></span>}
                          {c.resume_link && <a href={c.resume_link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"><FileText className="w-3 h-3" strokeWidth={1.5} />Resume</a>}
                        </div>
                        {/* Feedback / Remark */}
                        {(c.interview_feedback_l1 || c.remarks) && (
                          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{c.interview_feedback_l1 ? 'L1 Feedback' : 'Remark'}</p>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{c.interview_feedback_l1 || c.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submissions section */}
              {selectedDate.submissions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Profiles Submitted ({selectedDate.submissions.length})</h3></div>
                  <div className="space-y-2">
                    {selectedDate.submissions.map((c, i) => (
                      <div key={i} className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{c.candidate_name}</span>
                          <StatusBadge status={c.current_stage} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                          <span>Role: <span className="text-[var(--text-primary)]">{c.role}</span></span>
                          <span>Vendor: <span className="text-[var(--text-primary)]">{c.vendor}</span></span>
                          {c.work_experience && <span>Exp: {c.work_experience}</span>}
                          {c.resume_link && <a href={c.resume_link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-0.5"><FileText className="w-3 h-3" strokeWidth={1.5} />Resume</a>}
                        </div>
                        {(c.interview_feedback_l1 || c.remarks) && (
                          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{c.interview_feedback_l1 ? 'L1 Feedback' : 'Remark'}</p>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{c.interview_feedback_l1 || c.remarks}</p>
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
