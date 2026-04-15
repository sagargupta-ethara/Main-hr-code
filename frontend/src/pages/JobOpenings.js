import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  // JD state
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
    } catch (error) { console.error('Error fetching role data:', error); }
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

  // Handle role click: fetch JD, open modal
  const handleRoleClick = async (role) => {
    setSelectedRole(role);
    setJdData(null);
    setNominees(null);
    setNomineesLoading(true);
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('role_name', selectedRole._id);
    try {
      const { data } = await axios.post(`${API_URL}/api/openings/jd?role_name=${encodeURIComponent(selectedRole._id)}`, formData, { withCredentials: true });
      setJdData({ filename: data.filename, summary: data.summary, uploaded_at: new Date().toISOString() });
    } catch (err) { console.error('JD upload failed:', err); }
    finally { setJdUploading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-400">Loading openings...</div></div>;

  return (
    <div className="space-y-5" data-testid="job-openings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-0.5">Job Openings</h1>
          <p className="text-sm text-slate-400">{roleData.length} positions across {divisions.length} division{divisions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="sync-openings-btn" onClick={handleSyncSheet} disabled={syncing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all text-sm font-semibold border border-slate-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {syncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
          <button onClick={() => setShowUpload(true)} data-testid="upload-data-btn"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-4 py-2 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20">
            <Upload className="w-4 h-4" strokeWidth={1.5} /> Upload Data
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${syncMessage.includes('failed') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>{syncMessage}</div>
      )}

      {/* Division-grouped openings */}
      {divisions.map(div => (
        <div key={div} className="space-y-3">
          <button onClick={() => toggleDivision(div)} className="flex items-center gap-2 w-full text-left group" data-testid={`division-toggle-${div}`}>
            {collapsedDivisions[div]
              ? <ChevronRight className="w-4 h-4 text-cyan-400 transition-transform" strokeWidth={2} />
              : <ChevronDown className="w-4 h-4 text-cyan-400 transition-transform" strokeWidth={2} />}
            <h2 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">{div}</h2>
            <span className="text-xs text-slate-500 font-mono ml-1">({grouped[div].length})</span>
            <div className="flex-1 border-t border-slate-800/60 ml-3" />
          </button>

          {!collapsedDivisions[div] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-6">
              {grouped[div].map((role, idx) => (
                <div key={idx} onClick={() => handleRoleClick(role)}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-glow cursor-pointer hover:border-cyan-500/30 transition-all duration-200"
                  data-testid={`opening-card-${role._id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-white leading-snug pr-2">{role._id || 'Untitled Role'}</h3>
                    <div className="p-2 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-lg border border-cyan-500/20 flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {role.positions && <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-800"><p className="text-[10px] text-slate-500 mb-0.5">Positions</p><p className="text-base font-bold text-cyan-400 font-mono">{role.positions}</p></div>}
                    <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-800"><p className="text-[10px] text-slate-500 mb-0.5">Nominations</p><p className="text-base font-bold text-white font-mono">{role.total}</p></div>
                    <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-800"><p className="text-[10px] text-slate-500 mb-0.5">Active</p><p className="text-base font-bold text-white font-mono">{role.active}</p></div>
                    <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-800"><p className="text-[10px] text-slate-500 mb-0.5">Selected</p><p className="text-base font-bold text-emerald-400 font-mono">{role.selected}</p></div>
                  </div>
                  {role.vendors?.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex flex-wrap gap-1">
                        {role.vendors.slice(0, 3).map((v, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {v.name} <span className="text-cyan-400 font-bold">{v.count}</span>
                          </span>
                        ))}
                        {role.vendors.length > 3 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 border border-slate-700">+{role.vendors.length - 3}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Role Detail Modal with JD Upload */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setSelectedRole(null); setJdData(null); }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden card-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white mb-0.5">{selectedRole._id}</h2>
                {selectedRole.opening_data?.division && <p className="text-slate-400 text-sm">{selectedRole.opening_data.division}</p>}
              </div>
              <button onClick={() => { setSelectedRole(null); setJdData(null); }} className="text-slate-400 hover:text-white transition-colors" data-testid="opening-modal-close"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-160px)] space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedRole.positions && <div className="text-center bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-[10px] text-slate-500 mb-1">Positions</p><p className="text-2xl font-bold text-cyan-400 font-mono">{selectedRole.positions}</p></div>}
                <div className="text-center bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-[10px] text-slate-500 mb-1">Nominations</p><p className="text-2xl font-bold text-white font-mono">{selectedRole.total}</p></div>
                <div className="text-center bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-[10px] text-slate-500 mb-1">Active</p><p className="text-2xl font-bold text-cyan-400 font-mono">{selectedRole.active}</p></div>
                <div className="text-center bg-slate-800/30 rounded-xl p-3 border border-slate-800"><p className="text-[10px] text-slate-500 mb-1">Selected</p><p className="text-2xl font-bold text-emerald-400 font-mono">{selectedRole.selected}</p></div>
              </div>

              {/* Vendors */}
              {selectedRole.vendors?.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-xl p-4 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /><h3 className="text-sm font-bold text-white">Vendor Contributions</h3></div>
                  <div className="space-y-2">
                    {selectedRole.vendors.map((v, i) => {
                      const pct = selectedRole.total > 0 ? ((v.count / selectedRole.total) * 100).toFixed(0) : 0;
                      return (<div key={i} className="flex items-center gap-3"><span className="text-xs text-slate-300 font-medium w-28 truncate">{v.name}</span><div className="flex-1 bg-slate-800 rounded-full h-1.5"><div className="bg-gradient-to-r from-cyan-500 to-teal-500 h-1.5 rounded-full" style={{width:`${pct}%`}}/></div><span className="text-xs font-mono text-cyan-400 font-bold w-14 text-right">{v.count} ({pct}%)</span></div>);
                    })}
                  </div>
                </div>
              )}

              {/* JD Upload & Summary */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /><h3 className="text-sm font-bold text-white">Job Description</h3></div>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg cursor-pointer transition-colors text-xs font-semibold" data-testid="jd-upload-btn">
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {jdUploading ? 'Uploading...' : 'Upload JD'}
                    <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md,.doc" onChange={handleJdUpload} disabled={jdUploading} />
                  </label>
                </div>
                {jdData?.summary ? (
                  <div>
                    <a
                      href={`${API_URL}/api/openings/jd/download?role_name=${encodeURIComponent(selectedRole._id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold mb-2 transition-colors"
                      data-testid="jd-preview-link"
                    >
                      <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {jdData.filename}
                      <span className="text-slate-500 font-normal ml-1">(click to preview)</span>
                    </a>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 max-h-40 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-500 mb-1">JD Summary</p>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{jdData.summary}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No JD uploaded yet. Upload a PDF, DOCX, or TXT file.</p>
                )}
              </div>

              {/* Opening details */}
              {selectedRole.opening_data && (
                <>
                  {selectedRole.opening_data.key_tasks && (
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                      <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /><h3 className="text-sm font-bold text-white">Key Tasks</h3></div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedRole.opening_data.key_tasks}</p>
                    </div>
                  )}
                  {selectedRole.opening_data.core_objectives && (
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                      <div className="flex items-center gap-2 mb-2"><Layers className="w-4 h-4 text-slate-400" strokeWidth={1.5} /><h3 className="text-sm font-bold text-white">Core Objectives</h3></div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedRole.opening_data.core_objectives}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRole.opening_data.salary_band && (
                      <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800">
                        <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} /><p className="text-[10px] text-slate-500">Salary Band</p></div>
                        <p className="text-sm font-semibold text-white">{selectedRole.opening_data.salary_band}</p>
                      </div>
                    )}
                    {selectedRole.opening_data.min_exp && (
                      <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800">
                        <div className="flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5 text-cyan-400" strokeWidth={1.5} /><p className="text-[10px] text-slate-500">Min. Experience</p></div>
                        <p className="text-sm font-semibold text-white">{selectedRole.opening_data.min_exp}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Nominated Members */}
              <div className="bg-slate-800/30 rounded-xl border border-slate-800 overflow-hidden" data-testid="nominees-section">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                    Nominated Members ({nominees?.length || 0})
                  </h3>
                </div>
                {nomineesLoading ? (
                  <div className="p-4 text-center text-xs text-slate-500">Loading nominees...</div>
                ) : nominees && nominees.length > 0 ? (
                  <div className="max-h-[240px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0">
                        <tr className="bg-slate-900 border-b border-slate-800">
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-900">Name</th>
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-900">Vendor</th>
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-900">Stage</th>
                          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-900">Exp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nominees.map((m, i) => (
                          <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                            <td className="py-2 px-4 text-sm text-white font-medium">{m.candidate_name}</td>
                            <td className="py-2 px-4 text-xs text-slate-400">{m.vendor || '-'}</td>
                            <td className="py-2 px-4"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                              (m.current_stage || '').includes('Reject') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              (m.current_stage || '').includes('Select') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              (m.current_stage || '').includes('Shortlist') ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                              'bg-slate-700 text-slate-300 border border-slate-600'
                            }`}>{m.current_stage || 'New'}</span></td>
                            <td className="py-2 px-4 text-xs text-slate-400">{m.work_experience || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">No nominations for this role yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 card-glow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Upload Hiring Data</h2>
              <button onClick={() => { setShowUpload(false); setUploadMessage(''); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-5">Upload Excel with "Vendor Hiring" and "Open Positions" sheets.</p>
            {!uploading && !uploadMessage && (
              <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${isDragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-700 hover:border-cyan-500/50 cursor-pointer'}`}>
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-slate-300 mb-1">Drag and drop or click to browse</p>
                <p className="text-xs text-slate-500">.xlsx / .xls</p>
              </div>
            )}
            {uploading && <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center"><p className="text-sm text-cyan-400">Processing...</p></div>}
            {uploadMessage && <div className={`p-4 rounded-xl border ${uploadMessage.includes('Uploaded') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}><p className="text-sm">{uploadMessage}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOpenings;
