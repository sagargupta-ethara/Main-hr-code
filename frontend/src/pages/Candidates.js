import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';
import { ExternalLink, Phone, Mail, FileText, Download } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filters, setFilters] = useState({
    vendor: '',
    role: '',
    stage: '',
  });

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [candidates, filters]);

  const fetchCandidates = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/candidates`, { withCredentials: true });
      setCandidates(data);
      setFilteredCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...candidates];

    if (filters.vendor && filters.vendor !== 'all') {
      filtered = filtered.filter((c) =>
        c.vendor?.toLowerCase().includes(filters.vendor.toLowerCase())
      );
    }

    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter((c) => c.role?.toLowerCase().includes(filters.role.toLowerCase()));
    }

    if (filters.stage && filters.stage !== 'all') {
      filtered = filtered.filter((c) => c.current_stage === filters.stage);
    }

    setFilteredCandidates(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value === 'all' ? '' : value }));
  };

  const handleClearFilters = () => {
    setFilters({ vendor: '', role: '', stage: '' });
  };

  // Extract unique values for filters
  const uniqueVendors = [...new Set(candidates.map(c => c.vendor).filter(Boolean))];
  const uniqueRoles = [...new Set(candidates.map(c => c.role).filter(Boolean))];
  const uniqueStages = [...new Set(candidates.map(c => c.current_stage).filter(Boolean))];

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/export/candidates`, {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'candidates_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting candidates:', error);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-2">Candidates</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {filteredCandidates.length} candidates found
          </p>
        </div>
        <button
          data-testid="export-candidates-btn"
          onClick={handleExport}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-[var(--text-primary)] px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20"
        >
          <Download className="w-4 h-4" strokeWidth={1.5} />
          Export
        </button>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        vendors={uniqueVendors}
        roles={uniqueRoles}
        stages={uniqueStages}
      />

      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden ">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-raised)]">
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                  Candidate
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                  Role
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                  Vendor
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                  Experience
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                  Stage
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                  Contact
                </th>
                <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate, idx) => (
                <tr
                  key={idx}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
                  onClick={() => setSelectedCandidate(candidate)}
                  data-testid={`candidate-row-${idx}`}
                >
                  <td className="py-4 px-6 text-sm text-[var(--text-primary)] font-semibold">
                    {candidate.candidate_name}
                  </td>
                  <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">{candidate.role}</td>
                  <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">{candidate.vendor}</td>
                  <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">{candidate.work_experience}</td>
                  <td className="py-4 px-6">
                    <StatusBadge status={candidate.current_stage} />
                  </td>
                  <td className="py-4 px-6 text-xs text-[var(--text-secondary)]">
                    {candidate.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" strokeWidth={1.5} />
                        {candidate.email}
                      </div>
                    )}
                    {candidate.contact_number && (
                      <div className="flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" strokeWidth={1.5} />
                        {candidate.contact_number}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {candidate.resume_link && (
                      <a
                        href={candidate.resume_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs font-semibold"
                        data-testid={`resume-link-${idx}`}
                      >
                        <FileText className="w-4 h-4" strokeWidth={1.5} />
                        Resume
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-[var(--bg-card)] border-[var(--border-default)]" data-testid="candidate-detail-sheet">
          {selectedCandidate && (
            <>
              <SheetHeader>
                <SheetTitle className="text-3xl font-bold text-[var(--text-primary)]">{selectedCandidate.candidate_name}</SheetTitle>
                <SheetDescription className="text-[var(--text-secondary)]">
                  {selectedCandidate.role} • {selectedCandidate.vendor}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Current Status</h3>
                  <StatusBadge status={selectedCandidate.current_stage} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    {selectedCandidate.email && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Mail className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                        <span>{selectedCandidate.email}</span>
                      </div>
                    )}
                    {selectedCandidate.contact_number && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Phone className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                        <span>{selectedCandidate.contact_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Experience Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)] text-xs">Total Experience:</span>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.work_experience || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-xs">Relevant Experience:</span>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.rel_experience || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-xs">Current CTC:</span>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.ctc || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-xs">Expected CTC:</span>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.ectc || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-xs">Notice Period:</span>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.notice_period || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-xs">Current Location:</span>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedCandidate.current_location || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Interview History</h3>
                  <div className="space-y-4">
                    {selectedCandidate.interview_slot_l1 && (
                      <div className="border border-[var(--border-default)] rounded-xl p-4 bg-[var(--bg-raised)]">
                        <h4 className="font-semibold text-sm mb-2 text-cyan-400">L1 Interview</h4>
                        <div className="text-sm space-y-1 text-[var(--text-secondary)]">
                          <p>
                            <span className="text-[var(--text-muted)]">Slot:</span>{' '}
                            {selectedCandidate.interview_slot_l1}
                          </p>
                          <p>
                            <span className="text-[var(--text-muted)]">Status:</span>{' '}
                            {selectedCandidate.interview_status_l1 || 'Scheduled'}
                          </p>
                          <p>
                            <span className="text-[var(--text-muted)]">Interviewer:</span>{' '}
                            {selectedCandidate.interviewer_name_l1 || 'TBD'}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedCandidate.interview_slot_l2 && (
                      <div className="border border-[var(--border-default)] rounded-xl p-4 bg-[var(--bg-raised)]">
                        <h4 className="font-semibold text-sm mb-2 text-cyan-400">L2 Interview</h4>
                        <div className="text-sm space-y-1 text-[var(--text-secondary)]">
                          <p>
                            <span className="text-[var(--text-muted)]">Slot:</span>{' '}
                            {selectedCandidate.interview_slot_l2}
                          </p>
                          <p>
                            <span className="text-[var(--text-muted)]">Status:</span>{' '}
                            {selectedCandidate.interview_status_l2 || 'Scheduled'}
                          </p>
                          <p>
                            <span className="text-[var(--text-muted)]">Interviewer:</span>{' '}
                            {selectedCandidate.interviewer_name_l2 || 'TBD'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedCandidate.remarks && (
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Remarks</h3>
                    <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-raised)] p-4 rounded-xl border border-[var(--border-default)]">
                      {selectedCandidate.remarks}
                    </p>
                  </div>
                )}

                {selectedCandidate.resume_link && (
                  <div>
                    <a
                      href={selectedCandidate.resume_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-[var(--text-primary)] px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20"
                    >
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                      View Resume
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
