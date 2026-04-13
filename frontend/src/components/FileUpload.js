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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md max-w-lg w-full p-6" data-testid="file-upload-modal">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl tracking-tight font-semibold text-slate-900">
            Upload Vendor Data
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            data-testid="close-upload-modal-btn"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed mb-6">
          Upload an Excel file (.xlsx or .xls) containing vendor hiring data. The data will replace
          the current dataset.
        </p>

        {!success && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} data-testid="file-input" />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
            {isDragActive ? (
              <p className="text-sm text-blue-600">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-sm text-slate-700 mb-1">
                  Drag and drop an Excel file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">Supports .xlsx and .xls files</p>
              </div>
            )}
          </div>
        )}

        {uploading && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
            <p className="text-sm text-blue-700">Uploading and processing...</p>
          </div>
        )}

        {success && (
          <div
            className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-3"
            data-testid="upload-success-message"
          >
            <CheckCircle className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-emerald-700">
                Successfully uploaded {uploadedCount} candidates!
              </p>
              <p className="text-xs text-emerald-600">Refreshing dashboard...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600" strokeWidth={1.5} />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
