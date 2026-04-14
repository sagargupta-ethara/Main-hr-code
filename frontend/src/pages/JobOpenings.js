import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Users, CheckCircle, Upload, X, Target, Layers, DollarSign, Clock, Building2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const JobOpenings = () => {
  const [roleData, setRoleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    fetchRoleData();
  }, []);

  const fetchRoleData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/analytics/roles`, { withCredentials: true });
      setRoleData(data);
    } catch (error) {
      console.error('Error fetching role data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post(`${API_URL}/api/upload-excel`, formData, { withCredentials: true });
      setUploadMessage(`Successfully uploaded! ${data.candidates_count} candidates and ${data.openings_count} openings processed.`);
      setTimeout(() => { setShowUpload(false); fetchRoleData(); }, 2000);
    } catch (err) {
      setUploadMessage(err.response?.data?.detail || err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
    disabled: uploading,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading openings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="job-openings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">Job Openings</h1>
          <p className="text-sm text-slate-400">{roleData.length} active job openings</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          data-testid="upload-data-btn"
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20"
        >
          <Upload className="w-4 h-4" strokeWidth={1.5} />
          Upload Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roleData.map((role, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedRole(role)}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow cursor-pointer hover:border-cyan-500/30 transition-all duration-300"
            data-testid={`opening-card-${idx}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1 truncate">{role._id || 'Untitled Role'}</h3>
                {role.opening_data?.division && (
                  <p className="text-xs text-slate-500">{role.opening_data.division}</p>
                )}
              </div>
              <div className="ml-2 p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20 flex-shrink-0">
                <Briefcase className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {role.positions && (
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Open Positions</p>
                  <p className="text-lg font-bold text-cyan-400 font-mono">{role.positions}</p>
                </div>
              )}
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-800">
                <p className="text-xs text-slate-500 mb-1">Nominations</p>
                <p className="text-lg font-bold text-white font-mono">{role.total}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-800">
                <p className="text-xs text-slate-500 mb-1">Active</p>
                <p className="text-lg font-bold text-white font-mono">{role.active}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-800">
                <p className="text-xs text-slate-500 mb-1">Selected</p>
                <p className="text-lg font-bold text-emerald-400 font-mono">{role.selected}</p>
              </div>
            </div>

            {/* Vendor-to-Role Mapping */}
            {role.vendors && role.vendors.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" strokeWidth={1.5} />
                  Vendors
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.vendors.slice(0, 4).map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {v.name}
                      <span className="text-cyan-400 font-mono font-bold">{v.count}</span>
                    </span>
                  ))}
                  {role.vendors.length > 4 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-500 border border-slate-700">
                      +{role.vendors.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {role.opening_data?.min_exp && (
              <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Min. Experience</span>
                <span className="text-slate-300 font-semibold">{role.opening_data.min_exp}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Role Detail Modal */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedRole(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden card-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedRole._id}</h2>
                {selectedRole.opening_data?.division && (
                  <p className="text-slate-400 text-sm">{selectedRole.opening_data.division}</p>
                )}
              </div>
              <button onClick={() => setSelectedRole(null)} className="text-slate-400 hover:text-white transition-colors" data-testid="opening-modal-close">
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)] space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedRole.positions && (
                  <div className="text-center bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                    <p className="text-xs text-slate-500 mb-2">Open Positions</p>
                    <p className="text-3xl font-bold text-cyan-400 font-mono">{selectedRole.positions}</p>
                  </div>
                )}
                <div className="text-center bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-2">Total Nominations</p>
                  <p className="text-3xl font-bold text-white font-mono">{selectedRole.total}</p>
                </div>
                <div className="text-center bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-2">Active</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent font-mono">{selectedRole.active}</p>
                </div>
                <div className="text-center bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-2">Selected</p>
                  <p className="text-3xl font-bold text-emerald-400 font-mono">{selectedRole.selected}</p>
                </div>
              </div>

              {/* Vendor Mapping Section */}
              {selectedRole.vendors && selectedRole.vendors.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-xl p-5 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                    <h3 className="text-lg font-bold text-white">Vendor Contributions</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedRole.vendors.map((v, i) => {
                      const pct = selectedRole.total > 0 ? ((v.count / selectedRole.total) * 100).toFixed(0) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-sm text-slate-300 font-medium w-32 truncate">{v.name}</span>
                          <div className="flex-1 bg-slate-800 rounded-full h-2">
                            <div className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-mono text-cyan-400 font-bold w-16 text-right">{v.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedRole.opening_data && (
                <>
                  {selectedRole.opening_data.key_tasks && (
                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                        <h3 className="text-base font-bold text-white">Key Tasks</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedRole.opening_data.key_tasks}</p>
                    </div>
                  )}
                  {selectedRole.opening_data.core_objectives && (
                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                        <h3 className="text-base font-bold text-white">Core Objectives</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedRole.opening_data.core_objectives}</p>
                    </div>
                  )}
                  {selectedRole.opening_data.key_kras && (
                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-800">
                      <h3 className="text-sm font-bold text-slate-400 mb-2">Key KRAs</h3>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedRole.opening_data.key_kras}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRole.opening_data.salary_band && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                          <p className="text-xs text-slate-500">Salary Band</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{selectedRole.opening_data.salary_band}</p>
                      </div>
                    )}
                    {selectedRole.opening_data.min_exp && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                          <p className="text-xs text-slate-500">Min. Experience</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{selectedRole.opening_data.min_exp}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-800">
              <button onClick={() => setSelectedRole(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 card-glow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Upload Hiring Data</h2>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-white transition-colors" data-testid="upload-modal-close">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">Upload an Excel file with both "Vendor Hiring" and "Open Positions" sheets.</p>
            {!uploading && !uploadMessage && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  isDragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50 cursor-pointer'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
                {isDragActive ? (
                  <p className="text-sm text-cyan-400">Drop the file here...</p>
                ) : (
                  <div>
                    <p className="text-sm text-slate-300 mb-1">Drag and drop an Excel file here, or click to browse</p>
                    <p className="text-xs text-slate-500">Supports .xlsx and .xls files</p>
                  </div>
                )}
              </div>
            )}
            {uploading && (
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
                <p className="text-sm text-cyan-400">Uploading and processing...</p>
              </div>
            )}
            {uploadMessage && (
              <div className={`p-4 rounded-xl border ${uploadMessage.includes('Success') ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className={`text-sm ${uploadMessage.includes('Success') ? 'text-emerald-400' : 'text-red-400'}`}>{uploadMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOpenings;
