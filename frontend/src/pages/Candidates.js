import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';
import { ExternalLink, Phone, Mail, FileText, Download, ChevronDown, ChevronRight, CheckCircle2, XCircle, Circle, Briefcase, Users as UsersIcon, List, LayoutGrid } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Full pipeline stages in order — used to render the journey timeline.
const JOURNEY_STAGES = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'screening', label: 'Screening Passed' },
  { key: 'l1', label: 'L1 Interview' },
  { key: 'l2', label: 'L2 Interview' },
  { key: 'selected', label: 'Selected' },
  { key: 'offer', label: 'Offer Released' },
  { key: 'joined', label: 'Joined' },
];

// Returns a map of stage key → { reached: bool, rejected: bool, note: string }
// based on the candidate's sheet fields.
function buildJourney(c) {
  const rs = (c.resume_status || '').toLowerCase();
  const fs = (c.final_status || '').toLowerCase();
  const rejectedAtScreen = rs.includes('reject');
  const rejectedAtFinal = fs.includes('reject');
  const screeningPassed = rs.includes('shortlist');
  const hasL1 = !!(c.interview_slot_l1 || c.interview_status_l1 || c.interview_feedback_l1);
  const hasL2 = !!(c.interview_slot_l2 || c.interview_status_l2 || c.interview_feedback_l2);
  const selected = fs.includes('select') || fs.includes('clear');
  const offer = !!c.offer_released;
  const joined = !!c.joining_date;
  const l1Rejected = (c.interview_status_l1 || '').toLowerCase().includes('reject');
  const l2Rejected = (c.interview_status_l2 || '').toLowerCase().includes('reject');

  return {
    submitted: { reached: !!c.submission_date, rejected: false, note: c.submission_date || '' },
    screening: {
      reached: screeningPassed || hasL1 || hasL2 || selected || offer || joined,
      rejected: rejectedAtScreen,
      note: c.resume_status || '',
    },
    l1: {
      reached: hasL1 || hasL2 || selected || offer || joined,
      rejected: l1Rejected,
      note: c.interview_status_l1 || (c.interview_slot_l1 ? 'Scheduled' : ''),
    },
    l2: {
      reached: hasL2 || selected || offer || joined,
      rejected: l2Rejected,
      note: c.interview_status_l2 || (c.interview_slot_l2 ? 'Scheduled' : ''),
    },
    selected: { reached: selected || offer || joined, rejected: false, note: c.final_status || '' },
    offer: { reached: offer || joined, rejected: false, note: c.offer_released || '' },
    joined: { reached: joined, rejected: false, note: c.joining_date || '' },
    _finalRejected: rejectedAtFinal,
  };
}

const JourneyTimeline = ({ candidate }) => {
  const j = buildJourney(candidate);
  return (
    <div className="space-y-2" data-testid="journey-timeline">
      {JOURNEY_STAGES.map((s, i) => {
        const node = j[s.key];
        const isLast = i === JOURNEY_STAGES.length - 1;
        const Icon = node.rejected ? XCircle : node.reached ? CheckCircle2 : Circle;
        const iconColor = node.rejected ? 'text-red-400' : node.reached ? 'text-emerald-400' : 'text-[var(--text-muted)]';
        const lineColor = node.reached && !node.rejected ? 'bg-emerald-500/40' : 'bg-[var(--border-default)]';
        return (
          <div key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={2} />
              {!isLast && <div className={`w-px flex-1 ${lineColor} my-1`} style={{ minHeight: 14 }} />}
            </div>
            <div className="flex-1 pb-3">
              <p className={`text-xs font-semibold ${node.rejected ? 'text-red-400' : node.reached ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {s.label}
                {node.rejected && <span className="ml-2 text-[10px] text-red-400">(Rejected)</span>}
              </p>
              {node.note && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 break-words">{node.note}</p>
              )}
            </div>
          </div>
        );
      })}
      {j._finalRejected && (
        <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[11px] font-semibold text-red-400">Final Status: Rejected</p>
          {candidate.final_status && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{candidate.final_status}</p>}
        </div>
      )}
    </div>
  );
};

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [viewMode, setViewMode] = useState('role'); // 'role' | 'list'
  const [expandedRoles, setExpandedRoles] = useState({});
  const [filters, setFilters] = useState({ vendor: '', role: '', stage: '' });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true });
        setCandidates(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const filteredCandidates = useMemo(() => {
    let out = candidates;
    if (filters.vendor) out = out.filter(c => c.vendor?.toLowerCase().includes(filters.vendor.toLowerCase()));
    if (filters.role) out = out.filter(c => c.role?.toLowerCase().includes(filters.role.toLowerCase()));
    if (filters.stage) out = out.filter(c => c.current_stage === filters.stage);
    return out;
  }, [candidates, filters]);

  // Group by role for role-wise view
  const roleGroups = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      const role = c.role || 'Unassigned';
      if (!map[role]) map[role] = [];
      map[role].push(c);
    });
    // Sort roles alphabetically; sort candidates by submission_date desc within each group
    return Object.keys(map).sort((a, b) => a.localeCompare(b)).map(role => ({
      role,
      candidates: map[role].sort((a, b) => (b.submission_date || '').localeCompare(a.submission_date || '')),
    }));
  }, [filteredCandidates]);

  // Unique filter values
  const uniqueVendors = [...new Set(candidates.map(c => c.vendor).filter(Boolean))];
  const uniqueRoles = [...new Set(candidates.map(c => c.role).filter(Boolean))];
  const uniqueStages = [...new Set(candidates.map(c => c.current_stage).filter(Boolean))];

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }));
  const handleClearFilters = () => setFilters({ vendor: '', role: '', stage: '' });

  const toggleRole = (role) => setExpandedRoles(prev => ({ ...prev, [role]: !prev[role] }));
  const expandAll = () => setExpandedRoles(Object.fromEntries(roleGroups.map(g => [g.role, true])));
  const collapseAll = () => setExpandedRoles({});

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/export/candidates`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'candidates_export.xlsx');
      document.body.appendChild(link); link.click(); link.remove();
    } catch (error) { console.error('Error exporting candidates:', error); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Loading candidates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="candidates-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-1" data-testid="candidates-heading">Candidates Progress Update</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {filteredCandidates.length} candidates across {roleGroups.length} role{roleGroups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-0.5" data-testid="view-mode-toggle">
            <button
              data-testid="view-role-btn"
              onClick={() => setViewMode('role')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'role' ? 'bg-cyan-500/10 text-cyan-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.8} /> Role-wise
            </button>
            <button
              data-testid="view-list-btn"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-cyan-500/10 text-cyan-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <List className="w-3.5 h-3.5" strokeWidth={1.8} /> List
            </button>
          </div>
          <button
            data-testid="export-candidates-btn"
            onClick={handleExport}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20">
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Export
          </button>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        vendors={uniqueVendors}
        roles={uniqueRoles}
        stages={uniqueStages}
      />

      {/* ROLE-WISE VIEW */}
      {viewMode === 'role' && (
        <div className="space-y-3" data-testid="role-wise-view">
          <div className="flex items-center justify-end gap-3 text-xs">
            <button onClick={expandAll} data-testid="expand-all-btn" className="text-cyan-400 hover:text-cyan-300 font-semibold">Expand all</button>
            <span className="text-[var(--text-muted)]">·</span>
            <button onClick={collapseAll} data-testid="collapse-all-btn" className="text-cyan-400 hover:text-cyan-300 font-semibold">Collapse all</button>
          </div>
          {roleGroups.length === 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8 text-center text-sm text-[var(--text-muted)]">
              No candidates match the current filters.
            </div>
          )}
          {roleGroups.map(({ role, candidates: list }) => {
            const open = !!expandedRoles[role];
            const stageCounts = list.reduce((acc, c) => {
              const k = c.current_stage || 'Unknown';
              acc[k] = (acc[k] || 0) + 1;
              return acc;
            }, {});
            return (
              <div key={role} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden" data-testid={`role-group-${role}`}>
                <button
                  onClick={() => toggleRole(role)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-raised)] transition-colors"
                  data-testid={`role-toggle-${role}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {open ? <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" strokeWidth={2} /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" strokeWidth={2} />}
                    <Briefcase className="w-4 h-4 text-cyan-400 shrink-0" strokeWidth={1.5} />
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate">{role}</span>
                    <span className="text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md font-semibold shrink-0">
                      {list.length} candidate{list.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end">
                    {Object.entries(stageCounts).map(([stage, cnt]) => (
                      <span key={stage} className="text-[10px] text-[var(--text-muted)]">
                        <StatusBadge status={stage} /> <span className="ml-0.5 text-[var(--text-secondary)]">{cnt}</span>
                      </span>
                    ))}
                  </div>
                </button>
                {open && (
                  <div className="border-t border-[var(--border-default)]">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[var(--bg-raised)] border-b border-[var(--border-default)]">
                          <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-bold">Candidate</th>
                          <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-bold">Vendor</th>
                          <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-bold">Current Stage</th>
                          <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-bold">Interviewer</th>
                          <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-bold">Outcome</th>
                          <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-bold">Resume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((c, idx) => {
                          const interviewer = c.interviewer_name_l2 || c.interviewer_name_l1 || '—';
                          const outcome = c.final_status || c.interview_status_l2 || c.interview_status_l1 || c.resume_status || '—';
                          const outcomeColor = outcome.toLowerCase().includes('reject') ? 'text-red-400' : outcome.toLowerCase().includes('select') ? 'text-emerald-400' : 'text-[var(--text-secondary)]';
                          return (
                            <tr
                              key={c.id || idx}
                              onClick={() => setSelectedCandidate(c)}
                              className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
                              data-testid={`role-candidate-row-${role}-${idx}`}>
                              <td className="py-2.5 px-4">
                                <div className="text-sm text-[var(--text-primary)] font-semibold">{c.candidate_name}</div>
                                {c.submission_date && <div className="text-[10px] text-[var(--text-muted)]">Submitted {c.submission_date}</div>}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-[var(--text-secondary)]">{c.vendor || '—'}</td>
                              <td className="py-2.5 px-4"><StatusBadge status={c.current_stage} /></td>
                              <td className="py-2.5 px-4 text-xs text-[var(--text-secondary)]">{interviewer}</td>
                              <td className={`py-2.5 px-4 text-xs font-semibold ${outcomeColor}`}>{outcome}</td>
                              <td className="py-2.5 px-4">
                                {c.resume_link ? (
                                  <a href={c.resume_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1" data-testid={`role-resume-${role}-${idx}`}>
                                    <FileText className="w-3 h-3" strokeWidth={1.5} /> Resume
                                  </a>
                                ) : (
                                  <span className="text-xs text-[var(--text-muted)]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden" data-testid="list-view">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-raised)]">
                  {['Candidate','Role','Vendor','Experience','Stage','Contact','Resume'].map(h => (
                    <th key={h} className="text-left py-3.5 px-5 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c, idx) => (
                  <tr key={c.id || idx} onClick={() => setSelectedCandidate(c)} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer" data-testid={`candidate-row-${idx}`}>
                    <td className="py-3 px-5 text-sm text-[var(--text-primary)] font-semibold">{c.candidate_name}</td>
                    <td className="py-3 px-5 text-xs text-[var(--text-secondary)]">{c.role}</td>
                    <td className="py-3 px-5 text-xs text-[var(--text-secondary)]">{c.vendor}</td>
                    <td className="py-3 px-5 text-xs text-[var(--text-secondary)]">{c.work_experience || '—'}</td>
                    <td className="py-3 px-5"><StatusBadge status={c.current_stage} /></td>
                    <td className="py-3 px-5 text-[11px] text-[var(--text-secondary)]">
                      {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" strokeWidth={1.5} />{c.email}</div>}
                      {c.contact_number && <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" strokeWidth={1.5} />{c.contact_number}</div>}
                    </td>
                    <td className="py-3 px-5">
                      {c.resume_link && (
                        <a href={c.resume_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs font-semibold" data-testid={`resume-link-${idx}`}>
                          <FileText className="w-3.5 h-3.5" strokeWidth={1.5} /> Resume
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CANDIDATE FULL-JOURNEY DRAWER */}
      <Sheet open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-[var(--bg-card)] border-[var(--border-default)]" data-testid="candidate-detail-sheet">
          {selectedCandidate && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold text-[var(--text-primary)]">{selectedCandidate.candidate_name}</SheetTitle>
                <SheetDescription className="text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                  <Briefcase className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{selectedCandidate.role || '—'}</span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <UsersIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{selectedCandidate.vendor || '—'}</span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <StatusBadge status={selectedCandidate.current_stage} />
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Full Journey Timeline */}
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-cyan-400 rounded-full" /> Full Stage Journey
                  </h3>
                  <div className="bg-[var(--bg-raised)] rounded-xl p-4 border border-[var(--border-default)]">
                    <JourneyTimeline candidate={selectedCandidate} />
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-cyan-400 rounded-full" /> Contact
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[var(--bg-raised)] p-3 rounded-lg border border-[var(--border-default)]">
                    {selectedCandidate.email && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Mail className="w-3.5 h-3.5 text-cyan-400" strokeWidth={1.5} /><span className="truncate">{selectedCandidate.email}</span></div>
                    )}
                    {selectedCandidate.contact_number && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Phone className="w-3.5 h-3.5 text-cyan-400" strokeWidth={1.5} /><span>{selectedCandidate.contact_number}</span></div>
                    )}
                    {selectedCandidate.hr_spoc && (
                      <div className="text-[var(--text-secondary)]"><span className="text-[var(--text-muted)]">HR SPOC:</span> <span className="text-[var(--text-primary)] font-semibold">{selectedCandidate.hr_spoc}</span></div>
                    )}
                  </div>
                </div>

                {/* Experience & compensation */}
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-cyan-400 rounded-full" /> Experience &amp; Compensation
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[var(--bg-raised)] p-3 rounded-lg border border-[var(--border-default)]">
                    {[
                      ['Total Exp', selectedCandidate.work_experience],
                      ['Rel Exp', selectedCandidate.rel_experience],
                      ['Current CTC', selectedCandidate.ctc],
                      ['Expected CTC', selectedCandidate.ectc],
                      ['Notice', selectedCandidate.notice_period],
                      ['Current Loc', selectedCandidate.current_location],
                      ['Job Loc', selectedCandidate.job_location],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{k}</p>
                        <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{v || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interview rounds with feedback */}
                {(selectedCandidate.interview_slot_l1 || selectedCandidate.interview_status_l1 || selectedCandidate.interview_feedback_l1 ||
                  selectedCandidate.interview_slot_l2 || selectedCandidate.interview_status_l2 || selectedCandidate.interview_feedback_l2) && (
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-cyan-400 rounded-full" /> Interview Rounds
                    </h3>
                    <div className="space-y-2">
                      {[
                        { level: 'L1', slot: selectedCandidate.interview_slot_l1, status: selectedCandidate.interview_status_l1, interviewer: selectedCandidate.interviewer_name_l1, feedback: selectedCandidate.interview_feedback_l1 },
                        { level: 'L2', slot: selectedCandidate.interview_slot_l2, status: selectedCandidate.interview_status_l2, interviewer: selectedCandidate.interviewer_name_l2, feedback: selectedCandidate.interview_feedback_l2 },
                      ].filter(r => r.slot || r.status || r.feedback).map((r, i) => {
                        const isReject = (r.status || '').toLowerCase().includes('reject');
                        return (
                          <div key={i} className="bg-[var(--bg-raised)] rounded-xl p-3 border border-[var(--border-default)]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{r.level} Interview</span>
                              {r.status && <span className={`text-[11px] font-semibold ${isReject ? 'text-red-400' : 'text-emerald-400'}`}>{r.status}</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
                              {r.slot && <div><span className="text-[var(--text-muted)]">Slot:</span> <span className="text-[var(--text-primary)]">{r.slot}</span></div>}
                              {r.interviewer && <div><span className="text-[var(--text-muted)]">Interviewer:</span> <span className="text-[var(--text-primary)]">{r.interviewer}</span></div>}
                            </div>
                            {r.feedback && (
                              <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                                <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{r.level} Feedback</p>
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{r.feedback}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Final outcome */}
                {(selectedCandidate.final_status || selectedCandidate.offer_released || selectedCandidate.joining_date) && (
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-cyan-400 rounded-full" /> Final Outcome
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-[var(--bg-raised)] p-3 rounded-lg border border-[var(--border-default)]">
                      {selectedCandidate.final_status && (
                        <div><p className="text-[10px] text-[var(--text-muted)] uppercase">Final</p><p className={`font-semibold ${selectedCandidate.final_status.toLowerCase().includes('reject') ? 'text-red-400' : 'text-emerald-400'}`}>{selectedCandidate.final_status}</p></div>
                      )}
                      {selectedCandidate.offer_released && (
                        <div><p className="text-[10px] text-[var(--text-muted)] uppercase">Offer Released</p><p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.offer_released}</p></div>
                      )}
                      {selectedCandidate.joining_date && (
                        <div><p className="text-[10px] text-[var(--text-muted)] uppercase">Joining Date</p><p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.joining_date}</p></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {selectedCandidate.remarks && (
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-cyan-400 rounded-full" /> Remarks
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-raised)] p-3 rounded-lg border border-[var(--border-default)] whitespace-pre-wrap">{selectedCandidate.remarks}</p>
                  </div>
                )}

                {selectedCandidate.resume_link && (
                  <div className="pt-2">
                    <a href={selectedCandidate.resume_link} target="_blank" rel="noopener noreferrer" data-testid="journey-resume-btn"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-5 py-2.5 rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20">
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} /> View Resume
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Candidates;
