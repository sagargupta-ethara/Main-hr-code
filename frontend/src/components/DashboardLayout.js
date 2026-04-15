import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, UserCircle, Home, Briefcase, Users, Calendar, Phone } from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navLinks = [
    { path: '/dashboard', label: 'Home', testId: 'nav-home', icon: Home },
    { path: '/dashboard/job-openings', label: 'Job Openings', testId: 'nav-job-openings', icon: Briefcase },
    { path: '/dashboard/candidates', label: 'Candidates', testId: 'nav-candidates', icon: Users },
    { path: '/dashboard/interviews', label: 'Interviews', testId: 'nav-interviews', icon: Calendar },
    { path: '/dashboard/contacts', label: 'Contacts', testId: 'nav-contacts', icon: Phone },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-4">
        <NavLink to="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">HR Dashboard</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Hiring Platform</p>
          </div>
        </NavLink>
      </div>

      <div className="px-3 mb-2">
        <div className="h-px bg-slate-700/50" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Modules</p>
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/dashboard'}
            data-testid={link.testId}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                isActive
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <link.icon className={`w-[18px] h-[18px] ${isActive ? 'text-blue-400' : 'text-slate-500'}`} strokeWidth={1.5} />
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profile */}
      <div className="p-3 mt-auto">
        <div className="h-px bg-slate-700/50 mb-3" />
        <div className="relative" ref={profileRef}>
          <button
            data-testid="profile-icon-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/40 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center">
              <UserCircle className="w-[18px] h-[18px] text-blue-400" strokeWidth={1.5} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </button>
          {profileOpen && (
            <div className="absolute left-3 bottom-full mb-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50" data-testid="profile-dropdown">
              <button
                data-testid="logout-btn"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[220px] lg:fixed lg:inset-y-0 bg-slate-900 border-r border-slate-800/60 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-slate-900 border-r border-slate-800/60">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-[220px] min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 h-14 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <span className="ml-3 text-sm font-bold text-slate-800">HR Dashboard</span>
        </header>

        <main className="p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
