import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* ── SVG icon set (crisp on all OS / themes) ─────────────────── */
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  courses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  studio: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

const navItems = [
  { to: '/dashboard', icon: Icons.dashboard, label: 'Dashboard', desc: 'Overview' },
  { to: '/courses',   icon: Icons.courses,   label: 'Courses',   desc: 'Browse all' },
  { to: '/analytics', icon: Icons.analytics, label: 'Analytics', desc: 'My progress' },
   { to: '/doubts', icon: Icons.studio, label: 'Ask Instructor', desc: 'Course questions' },
  { to: '/profile',   icon: Icons.profile,   label: 'Profile',   desc: 'Settings' },
];
const instructorItems = [
  { to: '/dashboard', icon: Icons.dashboard, label: 'Dashboard', desc: 'Teaching overview' },
  { to: '/courses', icon: Icons.studio, label: 'Course Studio', desc: 'Manage courses' },
  { to: '/analytics', icon: Icons.analytics, label: 'Analytics', desc: 'Teaching insights' },
  { to: '/doubts', icon: Icons.studio, label: 'Student Doubts', desc: 'Reply to learners' },
  { to: '/profile', icon: Icons.profile, label: 'Profile', desc: 'Settings' },
];

const Sidebar = () => {
  const { user } = useAuth();
  const items = (user?.role === 'instructor' || user?.role === 'admin')
    ? instructorItems
    : navItems;

  const avatarColors = ['#10b981','#6366f1','#f59e0b','#f43f5e','#0ea5e9'];
  const avatarColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <aside className="sidebar">
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">🎓</div>
        <div>
          <p className="sidebar-title">Edu<span className="grad-text">Track</span></p>
          <p className="sidebar-subtitle">Learning Platform</p>
        </div>
      </div>

      {/* ── Nav label ── */}
      <p className="sidebar-nav-label">Navigation</p>

      {/* ── Nav links ── */}
      <nav className="sidebar-nav">
        {items.map(({ to, icon, label, desc }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-link-icon">{icon}</span>
            <div className="sidebar-link-text">
              <p className="sidebar-link-label">{label}</p>
              <p className="sidebar-link-desc">{desc}</p>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* ── User card ── */}
      <div className="sidebar-user">
        <div className="sidebar-user-inner">
          <div
            className="sidebar-avatar"
            style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)` }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="sidebar-user-name">{user?.name}</p>
            <span className={`badge ${user?.role === 'instructor' ? 'badge-gold' : user?.role === 'admin' ? 'badge-indigo' : 'badge-primary'}`}
              style={{ fontSize: '.6rem', marginTop: 3 }}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
