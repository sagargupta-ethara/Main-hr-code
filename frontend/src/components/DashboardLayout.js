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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 flex items-center">
        <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1770210217380-d78a69acdc77?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwzfHxjb21wYW55JTIwbG9nbyUyMGFic3RyYWN0fGVufDB8fHx8MTc3NjA3ODg0MHww&ixlib=rb-4.1.0&q=85"
                alt="Logo"
                className="w-8 h-8 object-cover rounded"
              />
              <h1 className="text-lg font-bold text-slate-900">Vendor Hiring</h1>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === '/dashboard'}
                  data-testid={link.testId}
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
              className="hidden sm:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              Upload Data
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
              <div className="text-sm">
                <p className="font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <button
              data-testid="logout-btn"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 text-white bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded-md transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Logout
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
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
        <div className="lg:hidden bg-white border-b border-slate-200 py-4">
          <nav className="max-w-7xl mx-auto px-4 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
              className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Upload Data
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
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
