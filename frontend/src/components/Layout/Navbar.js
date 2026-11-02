import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => { if (user) fetchNotifications(); }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unreadCount || 0);
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const avatarColors = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9'];
  const avatarColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <nav style={{
background: 'var(--bg-overlay)', padding: '0 24px', height: 'var(--navbar-h)', display: 'flex', alignItems: 'center',
       justifyContent: 'space-between',
       position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
       backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
       boxShadow: '0 8px 32px rgba(0,0,0,.18)',
    }}>
      {/* Logo — only shown when NOT logged in (sidebar shows brand for logged-in users) */}
      {!user ? (
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.05rem', boxShadow: '0 4px 14px var(--primary-glow)',
          }}>🎓</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem' }}>
            Edu<span className="grad-text">Track</span>
          </span>
        </Link>
      ) : (
        <div /> /* spacer — sidebar has the brand */
      )}

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Notification Bell */}
          <div className="notif-bell" ref={panelRef} style={{ position: 'relative' }}>
            <button className="btn-icon" style={{ position: 'relative', fontSize: '1rem' }}
              onClick={() => { setShowNotif(p => !p); if (!showNotif) fetchNotifications(); }}>
              🔔
              {unread > 0 && <div className="notif-dot">{unread > 9 ? '9+' : unread}</div>}
            </button>

            {showNotif && (
              <div className="notif-panel">
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.92rem' }}>Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: '.72rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read ✓
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n._id} className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                      onClick={async () => {
                        if (!n.isRead) { await axios.put(`/api/notifications/${n._id}/read`); fetchNotifications(); }
                        setShowNotif(false);
                      }}>
                      <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>{n.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '.83rem', marginBottom: 2 }}>{n.title}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '.76rem', lineHeight: 1.5 }}>{n.message}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '.7rem', marginTop: 3 }}>{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 3 }} />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <div className="theme-toggle-thumb">
              {theme === 'dark' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="21" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="1" y1="12" x2="3" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="21" y1="12" x2="23" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </button>

          {/* User pill */}
          <Link to="/profile" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border-md)',
            borderRadius: 40, padding: '5px 13px 5px 5px', transition: 'all .2s',
          }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '.83rem', color: '#040810',
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '.83rem', fontWeight: 600 }}>{user.name?.split(' ')[0]}</span>
          </Link>

          <button className="btn btn-danger btn-sm" onClick={logout}>⏻ Logout</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login" className="btn btn-ghost" style={{ fontSize: '.9rem' }}>Sign In</Link>
          <Link to="/register" className="btn btn-grad" style={{ fontSize: '.9rem' }}>Get Started →</Link>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
