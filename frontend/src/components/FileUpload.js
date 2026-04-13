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

  const onDrop = useCallback(
    async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setError('');
      setSuccess(false);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const { data } = await axios.post(`${API_URL}/api/upload-excel`, formData, {
          withCredentials: true,
        });
        setSuccess(true);
        setUploadedCount(data.count);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } catch (err) {
        const errorDetail = err.response?.data?.detail || err.message || 'Failed to upload file';
        console.error('Upload error:', err.response?.status, errorDetail);
        
        // Handle authentication errors specifically
        if (err.response?.status === 401) {
          setError('Session expired. Please refresh the page and log in again.');
        } else {
          setError(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
        }
      } finally {
        setUploading(false);
      }
    },
    [onSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: uploading || success,
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 card-glow" data-testid="file-upload-modal">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            Upload Vendor Data
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            data-testid="close-upload-modal-btn"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          Upload an Excel file (.xlsx or .xls) containing vendor hiring data. The data will replace
          the current dataset.
        </p>

        {!success && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragActive
                ? 'border-cyan-500 bg-cyan-500/5'
                : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} data-testid="file-input" />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
            {isDragActive ? (
              <p className="text-sm text-cyan-400">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-sm text-slate-300 mb-1">
                  Drag and drop an Excel file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">Supports .xlsx and .xls files</p>
              </div>
            )}
          </div>
        )}

        {uploading && (
          <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
            <p className="text-sm text-cyan-400">Uploading and processing...</p>
          </div>
        )}

        {success && (
          <div
            className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3"
            data-testid="upload-success-message"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Successfully uploaded {uploadedCount} candidates!
              </p>
              <p className="text-xs text-emerald-500">Refreshing dashboard...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
