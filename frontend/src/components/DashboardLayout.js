import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Upload, LogOut, Menu, X } from 'lucide-react';
import FileUpload from '../components/FileUpload';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Home', testId: 'nav-home' },
    { path: '/dashboard/job-openings', label: 'Job Openings', testId: 'nav-job-openings' },
    { path: '/dashboard/candidates', label: 'Candidates', testId: 'nav-candidates' },
    { path: '/dashboard/interviews', label: 'Interviews', testId: 'nav-interviews' },
    { path: '/dashboard/clients', label: 'Clients', testId: 'nav-clients' },
    { path: '/dashboard/contacts', label: 'Contacts', testId: 'nav-contacts' },
    { path: '/dashboard/analysis', label: 'Analysis', testId: 'nav-analysis' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 h-16 flex items-center shadow-lg">
        <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                HR Dashboard
              </h1>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === '/dashboard'}
                  data-testid={link.testId}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              data-testid="upload-excel-btn"
              onClick={() => setShowUploadModal(true)}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-4 py-2 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/20"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              Upload Data
            </button>

            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
              <div className="text-sm">
                <p className="font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>

            <button
              data-testid="logout-btn"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all text-sm font-semibold border border-slate-700"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Logout
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" strokeWidth={1.5} />
              ) : (
                <Menu className="w-6 h-6" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 py-4">
          <nav className="max-w-7xl mx-auto px-4 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setShowUploadModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl"
            >
              Upload Data
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl"
            >
              Logout
            </button>
          </nav>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {showUploadModal && (
        <FileUpload onClose={() => setShowUploadModal(false)} onSuccess={() => window.location.reload()} />
      )}
    </div>
  );
};

export default DashboardLayout;
