import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FileUpload = ({ onClose, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadedCount, setUploadedCount] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]; if (!file) return;
    setUploading(true); setError(''); setSuccess(false);
    const formData = new FormData(); formData.append('file', file);
    try {
      const { data } = await axios.post(`${API_URL}/api/upload-excel`, formData, { withCredentials: true });
      setSuccess(true); setUploadedCount(data.count);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      const d = err.response?.data?.detail || err.message || 'Upload failed';
      setError(err.response?.status === 401 ? 'Session expired. Please log in again.' : (typeof d === 'string' ? d : JSON.stringify(d)));
    } finally { setUploading(false); }
  }, [onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }, maxFiles: 1, disabled: uploading || success,
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl max-w-lg w-full p-6" data-testid="file-upload-modal">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Upload Vendor Data</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" data-testid="close-upload-modal-btn"><X className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-5">Upload an Excel file (.xlsx/.xls) with vendor hiring data.</p>
        {!success && (
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-[var(--border-default)] hover:border-cyan-500/40'} ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input {...getInputProps()} data-testid="file-input" />
            <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
            {isDragActive ? <p className="text-sm text-cyan-400">Drop file here...</p> : <><p className="text-sm text-[var(--text-secondary)] mb-1">Drag and drop or click to browse</p><p className="text-[10px] text-[var(--text-muted)]">.xlsx / .xls</p></>}
          </div>
        )}
        {uploading && <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-center"><p className="text-sm text-cyan-400">Processing...</p></div>}
        {success && <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3" data-testid="upload-success-message"><CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={1.5} /><div><p className="text-sm font-semibold text-emerald-400">Uploaded {uploadedCount} candidates</p><p className="text-[10px] text-emerald-500">Refreshing...</p></div></div>}
        {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-400" strokeWidth={1.5} /><p className="text-sm text-red-400">{error}</p></div>}
      </div>
    </div>
  );
};
export default FileUpload;
