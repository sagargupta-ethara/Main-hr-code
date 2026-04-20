import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { Briefcase, Upload, X, Target, Layers, DollarSign, Clock, Building2, RefreshCw, FileText, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const JobOpenings = () => {
  const [roleData, setRoleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [collapsedDivisions, setCollapsedDivisions] = useState({});
  const [jdUploading, setJdUploading] = useState(false);
  const [jdData, setJdData] = useState(null);
  const [nominees, setNominees] = useState(null);
  const [nomineesLoading, setNomineesLoading] = useState(false);

  useBodyScrollLock(!!selectedRole || showUpload);

  useEffect(() => { fetchRoleData(); }, []);

  const fetchRoleData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/analytics/roles`, { withCredentials: true });
      setRoleData(data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSyncSheet = async () => {
    setSyncing(true); setSyncMessage('');
    try {
      const res = await axios.post(`${API_URL}/api/sync-google-openings`, {}, { withCredentials: true });
      setSyncMessage(`Synced ${res.data?.count || 0} openings`);
      fetchRoleData();
    } catch (err) { setSyncMessage(err.response?.data?.detail || 'Sync failed'); }
    finally { setSyncing(false); setTimeout(() => setSyncMessage(''), 6000); }
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0]; if (!file) return;
    setUploading(true); setUploadMessage('');
    const formData = new FormData(); formData.append('file', file);
    try {
      const { data } = await axios.post(`${API_URL}/api/upload-excel`, formData, { withCredentials: true });
      setUploadMessage(`Uploaded! ${data.candidates_count} candidates, ${data.openings_count} openings.`);
      setTimeout(() => { setShowUpload(false); setUploadMessage(''); fetchRoleData(); }, 2000);
    } catch (err) { setUploadMessage(err.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }, maxFiles: 1, disabled: uploading,
  });

  // Group roles by division
  const grouped = {};
  roleData.forEach(role => {
    const div = role.opening_data?.division || 'Other Roles';
    if (!grouped[div]) grouped[div] = [];
    grouped[div].push(role);
  });
  const divisions = Object.keys(grouped).sort((a, b) => a === 'Other Roles' ? 1 : b === 'Other Roles' ? -1 : a.localeCompare(b));

  const toggleDivision = (div) => setCollapsedDivisions(prev => ({ ...prev, [div]: !prev[div] }));

  const handleRoleClick = async (role) => {
    setSelectedRole(role); setJdData(null); setNominees(null); setNomineesLoading(true);
    try {
      const [jdRes, nomRes] = await Promise.all([
        axios.get(`${API_URL}/api/openings/jd?role_name=${encodeURIComponent(role._id)}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/openings/nominees?role_name=${encodeURIComponent(role._id)}`, { withCredentials: true }),
      ]);
      if (jdRes.data?.filename) setJdData(jdRes.data);
      setNominees(nomRes.data);
    } catch {}
    finally { setNomineesLoading(false); }
  };

  const handleJdUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file || !selectedRole) return;
    setJdUploading(true);
    const formData = new FormData(); formData.append('file', file); formData.append('role_name', selectedRole._id);
    try {
      const { data } = await axios.post(`${API_URL}/api/openings/jd?role_name=${encodeURIComponent(selectedRole._id)}`, formData, { withCredentials: true });
      setJdData({ filename: data.filename, summary: data.summary, uploaded_at: new Date().toISOString() });
    } catch (err) { console.error('JD upload failed:', err); }
    finally { setJdUploading(false); }
  };

  // Compute global totals for summary
  const totalNominations = roleData.reduce((s, r) => s + r.total, 0);
  const totalPositions = roleData.reduce((s, r) => s + (r.positions || 0), 0);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-[var(--text-secondary)]">Loading openings...</div></div>;

  return (
    <div className="space-y-5" data-testid="job-openings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-0.5">Job Openings</h1>
          <p className="text-sm text-[var(--text-secondary)]">{roleData.length} roles &middot; {totalPositions} open positions &middot; {totalNominations} nominations</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="sync-openings-btn" onClick={handleSyncSheet} disabled={syncing}
            className="flex items-center gap-2 bg-[var(--bg-raised)] hover:bg-[var(--border-default)] text-[var(--text-primary)] px-4 py-2 rounded-xl transition-all text-sm font-semibold border border-[var(--border-default)] disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {syncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
          <button onClick={() => setShowUpload(true)} data-testid="upload-data-btn"
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl transition-all text-sm font-semibold">
            <Upload className="w-4 h-4" strokeWidth={1.5} /> Upload Data
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${syncMessage.includes('failed') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{syncMessage}</div>
      )}

      {/* Division-grouped openings */}
      {divisions.map(div => (
        <div key={div} className="space-y-3">
          <button onClick={() => toggleDivision(div)} className="flex items-center gap-2 w-full text-left group" data-testid={`division-toggle-${div}`}>
            {collapsedDivisions[div]
              ? <ChevronRight className="w-4 h-4 text-cyan-400" strokeWidth={2} />
              : <ChevronDown className="w-4 h-4 text-cyan-400" strokeWidth={2} />}
            <h2 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">{div}</h2>
            <span className="text-xs text-[var(--text-muted)] font-mono ml-1">({grouped[div].length})</span>
            <div className="flex-1 border-t border-[var(--border-subtle)] ml-3" />
          </button>

          {!collapsedDivisions[div] && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pl-5">
              {grouped[div].map((role, idx) => (
                <div key={idx} onClick={() => handleRoleClick(role)}
                  className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 cursor-pointer hover:border-cyan-500/30 transition-all"
                  data-testid={`opening-card-${role._id}`}>
                  {/* Role header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">{role._id || 'Untitled Role'}</h3>
                      {role.opening_data?.division && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{role.opening_data.division}</p>}
                    </div>
                    <div className="ml-2 flex items-center gap-3 text-xs">
                      {role.positions && <div className="text-center"><p className="text-[9px] text-[var(--text-muted)]">Open</p><p className="text-base font-bold text-cyan-400 font-mono">{role.positions}</p></div>}
                      <div className="text-center"><p className="text-[9px] text-[var(--text-muted)]">Active</p><p className="text-base font-bold text-[var(--text-primary)] font-mono">{role.active}</p></div>
                      <div className="text-center"><p className="text-[9px] text-[var(--text-muted)]">Selected</p><p className="text-base font-bold text-emerald-400 font-mono">{role.selected}</p></div>
                    </div>
                  </div>

                  {/* Vendor Nominations Summary — the key addition */}
                  {role.vendors?.length > 0 && (
                    <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]">
                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Building2 className="w-3 h-3" strokeWidth={1.5} /> Vendor Nominations ({role.total} total)
                      </p>
                      <div className="space-y-1.5">
                        {role.vendors.map((v, i) => {
                          const pct = role.total > 0 ? Math.round((v.count / role.total) * 100) : 0;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-[var(--text-secondary)] w-28 truncate shrink-0">{v.name}</span>
                              <div className="flex-1 bg-[var(--bg-base)] rounded-full h-1.5">
                                <div className="bg-cyan-500/60 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-cyan-400 font-mono w-8 text-right">{v.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* ── Role Detail Modal ── */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setSelectedRole(null); setJdData(null); }}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-[var(--border-default)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedRole._id}</h2>
                {selectedRole.opening_data?.division && <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedRole.opening_data.division}</p>}
              </div>
              <button onClick={() => { setSelectedRole(null); setJdData(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" data-testid="opening-modal-close"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-160px)] space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedRole.positions && <div className="text-center bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]"><p className="text-[10px] text-[var(--text-muted)]">Open Positions</p><p className="text-2xl font-bold text-cyan-400 font-mono">{selectedRole.positions}</p></div>}
                <div className="text-center bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]"><p className="text-[10px] text-[var(--text-muted)]">Nominations</p><p className="text-2xl font-bold text-[var(--text-primary)] font-mono">{selectedRole.total}</p></div>
                <div className="text-center bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]"><p className="text-[10px] text-[var(--text-muted)]">Active</p><p className="text-2xl font-bold text-cyan-400 font-mono">{selectedRole.active}</p></div>
                <div className="text-center bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]"><p className="text-[10px] text-[var(--text-muted)]">Selected</p><p className="text-2xl font-bold text-emerald-400 font-mono">{selectedRole.selected}</p></div>
              </div>

              {/* Vendor Contributions */}
              {selectedRole.vendors?.length > 0 && (
                <div className="bg-cyan-500/5 rounded-lg p-4 border border-cyan-500/15">
                  <div className="flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /><h3 className="text-sm font-bold text-[var(--text-primary)]">Vendor Contributions</h3></div>
                  <div className="space-y-2">
                    {selectedRole.vendors.map((v, i) => {
                      const pct = selectedRole.total > 0 ? Math.round((v.count / selectedRole.total) * 100) : 0;
                      return (<div key={i} className="flex items-center gap-3"><span className="text-xs text-[var(--text-secondary)] font-medium w-28 truncate">{v.name}</span><div className="flex-1 bg-[var(--bg-raised)] rounded-full h-1.5"><div className="bg-gradient-to-r from-cyan-500 to-teal-500 h-1.5 rounded-full" style={{width:`${pct}%`}}/></div><span className="text-xs font-mono text-cyan-400 font-bold w-14 text-right">{v.count} ({pct}%)</span></div>);
                    })}
                  </div>
                </div>
              )}

              {/* JD Upload & Summary */}
              <div className="bg-[var(--bg-raised)] rounded-lg p-4 border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /><h3 className="text-sm font-bold text-[var(--text-primary)]">Job Description</h3></div>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded-lg cursor-pointer transition-colors text-xs font-semibold border border-[var(--border-default)]" data-testid="jd-upload-btn">
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.5} /> {jdUploading ? 'Uploading...' : 'Upload JD'}
                    <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md,.doc" onChange={handleJdUpload} disabled={jdUploading} />
                  </label>
                </div>
                {jdData?.summary ? (
                  <div>
                    <a href={`${API_URL}/api/openings/jd/download?role_name=${encodeURIComponent(selectedRole._id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold mb-2" data-testid="jd-preview-link">
                      <FileText className="w-3.5 h-3.5" strokeWidth={1.5} /> {jdData.filename} <span className="text-[var(--text-muted)] font-normal ml-1">(click to preview)</span>
                    </a>
                    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-subtle)] max-h-32 overflow-y-auto">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{jdData.summary}</p>
                    </div>
                  </div>
                ) : <p className="text-xs text-[var(--text-muted)]">No JD uploaded yet.</p>}
              </div>

              {/* Opening details */}
              {selectedRole.opening_data && (
                <>
                  {selectedRole.opening_data.key_tasks && (
                    <div className="bg-[var(--bg-raised)] rounded-lg p-4 border border-[var(--border-subtle)]"><div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /><h3 className="text-sm font-bold text-[var(--text-primary)]">Key Tasks</h3></div><p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selectedRole.opening_data.key_tasks}</p></div>
                  )}
                  {selectedRole.opening_data.core_objectives && (
                    <div className="bg-[var(--bg-raised)] rounded-lg p-4 border border-[var(--border-subtle)]"><div className="flex items-center gap-2 mb-2"><Layers className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.5} /><h3 className="text-sm font-bold text-[var(--text-primary)]">Core Objectives</h3></div><p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selectedRole.opening_data.core_objectives}</p></div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRole.opening_data.salary_band && (<div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]"><div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} /><p className="text-[10px] text-[var(--text-muted)]">Salary Band</p></div><p className="text-sm font-semibold text-[var(--text-primary)]">{selectedRole.opening_data.salary_band}</p></div>)}
                    {selectedRole.opening_data.min_exp && (<div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-subtle)]"><div className="flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5 text-cyan-400" strokeWidth={1.5} /><p className="text-[10px] text-[var(--text-muted)]">Min. Experience</p></div><p className="text-sm font-semibold text-[var(--text-primary)]">{selectedRole.opening_data.min_exp}</p></div>)}
                  </div>
                </>
              )}

              {/* Nominated Members */}
              <div className="bg-[var(--bg-raised)] rounded-lg border border-[var(--border-subtle)] overflow-hidden" data-testid="nominees-section">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Nominated Members ({nominees?.length || 0})</h3>
                </div>
                {nomineesLoading ? <div className="p-4 text-center text-xs text-[var(--text-muted)]">Loading...</div> :
                nominees?.length > 0 ? (
                  <div className="max-h-[220px] overflow-y-auto">
                    <table className="w-full"><thead className="sticky top-0"><tr className="bg-[var(--bg-card)] border-b border-[var(--border-subtle)]">
                      <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-card)]">Name</th>
                      <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-card)]">Vendor</th>
                      <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-card)]">Stage</th>
                      <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--bg-card)]">Resume</th>
                    </tr></thead><tbody>
                      {nominees.map((m, i) => (
                        <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card)]">
                          <td className="py-2 px-4 text-sm text-[var(--text-primary)] font-medium">{m.candidate_name}</td>
                          <td className="py-2 px-4 text-xs text-[var(--text-secondary)]">{m.vendor || '-'}</td>
                          <td className="py-2 px-4"><StatusBadge status={m.current_stage || 'New'} /></td>
                          <td className="py-2 px-4">{m.resume_link ? <a href={m.resume_link} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 underline">View</a> : <span className="text-xs text-[var(--text-muted)]">-</span>}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                ) : <div className="p-4 text-center text-xs text-[var(--text-muted)]">No nominations yet</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Upload Hiring Data</h2>
              <button onClick={() => { setShowUpload(false); setUploadMessage(''); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-5">Upload Excel with "Vendor Hiring" and "Open Positions" sheets.</p>
            {!uploading && !uploadMessage && (
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-[var(--border-default)] hover:border-cyan-500/40'} cursor-pointer`}>
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-[var(--text-secondary)] mb-1">Drag and drop or click to browse</p>
                <p className="text-[10px] text-[var(--text-muted)]">.xlsx / .xls</p>
              </div>
            )}
            {uploading && <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-center"><p className="text-sm text-cyan-400">Processing...</p></div>}
            {uploadMessage && <div className={`p-4 rounded-lg border ${uploadMessage.includes('Uploaded') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}><p className="text-sm">{uploadMessage}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
};
export default JobOpenings;
