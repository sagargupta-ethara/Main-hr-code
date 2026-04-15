import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, UserCircle, LayoutDashboard, Briefcase, Users, Calendar, Phone } from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = async () => { setProfileOpen(false); await logout(); navigate('/login'); };

  useEffect(() => {
    const h = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', testId: 'nav-home', icon: LayoutDashboard },
    { path: '/dashboard/job-openings', label: 'Job Openings', testId: 'nav-job-openings', icon: Briefcase },
    { path: '/dashboard/candidates', label: 'Candidates', testId: 'nav-candidates', icon: Users },
    { path: '/dashboard/interviews', label: 'Interviews', testId: 'nav-interviews', icon: Calendar },
    { path: '/dashboard/contacts', label: 'Contacts', testId: 'nav-contacts', icon: Phone },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4">
        <NavLink to="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <span className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">HR Dashboard</span>
        </NavLink>
      </div>
      <div className="mx-4 h-px bg-[var(--border-subtle)]" />
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {navLinks.map(link => (
          <NavLink key={link.path} to={link.path} end={link.path === '/dashboard'} data-testid={link.testId} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${isActive ? 'bg-[var(--accent-muted)] text-cyan-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'}`}>
            {({ isActive }) => (<><link.icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-[var(--text-muted)]'}`} strokeWidth={1.5} />{link.label}</>)}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 mt-auto">
        <div className="mx-1 h-px bg-[var(--border-subtle)] mb-3" />
        <div className="relative" ref={profileRef}>
          <button data-testid="profile-icon-btn" onClick={() => setProfileOpen(!profileOpen)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-raised)] transition-colors">
            <div className="w-7 h-7 rounded-md bg-[var(--accent-muted)] flex items-center justify-center"><UserCircle className="w-4 h-4 text-cyan-400" strokeWidth={1.5} /></div>
            <div className="text-left flex-1 min-w-0"><p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user?.name}</p><p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p></div>
          </button>
          {profileOpen && (
            <div className="absolute left-2 bottom-full mb-2 w-44 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-xl overflow-hidden z-50" data-testid="profile-dropdown">
              <button data-testid="logout-btn" onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)] transition-colors">
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      <aside className="hidden lg:flex lg:flex-col lg:w-[210px] lg:fixed lg:inset-y-0 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] z-40">
        <SidebarContent />
      </aside>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[250px] bg-[var(--bg-card)] border-r border-[var(--border-subtle)]"><SidebarContent /></aside>
        </div>
      )}
      <div className="flex-1 lg:ml-[210px] min-h-screen">
        <header className="lg:hidden sticky top-0 z-30 h-12 flex items-center px-4 bg-[var(--bg-card)] border-b border-[var(--border-subtle)]">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-raised)]"><Menu className="w-5 h-5" strokeWidth={1.5} /></button>
          <span className="ml-3 text-sm font-bold text-[var(--text-primary)]">HR Dashboard</span>
        </header>
        <main className="p-5 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
};
export default DashboardLayout;
