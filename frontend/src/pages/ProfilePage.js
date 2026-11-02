import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user, fetchMe } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/auth/profile', form);
      await fetchMe();
      toast.success('Profile updated! ✅');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const avatarColors = ['#6c63ff', '#00d4aa', '#ffb347', '#ff6b6b', '#4ade80'];
  const avatarColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div style={{ animation: 'fadeUp 0.5s ease', maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <h1>My <span className="gradient-text">Profile</span></h1>
        <p>Manage your account settings and preferences.</p>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ padding: 32, marginBottom: 24, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)',
          boxShadow: `0 0 0 4px ${avatarColor}33`
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>{user?.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{user?.email}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span className={`badge ${user?.role === 'instructor' ? 'badge-amber' : user?.role === 'admin' ? 'badge-accent' : 'badge-teal'}`}>
              {user?.role === 'student' ? '🎓 Student' : user?.role === 'instructor' ? '👨‍🏫 Instructor' : '⚡ Admin'}
            </span>
            <span className="badge badge-accent">
              Joined {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {['profile', 'security'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, border: 'none',
            background: activeTab === tab ? 'var(--accent)' : 'transparent',
            color: activeTab === tab ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.15s', cursor: 'pointer', textTransform: 'capitalize'
          }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 24 }}>Edit Profile</h3>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label>Full Name</label>
              <input className="input-field" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <input className="input-field" value={user?.email} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div className="input-group">
              <label>Bio</label>
              <textarea className="input-field" value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell us about yourself..." rows={4}
                style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content', padding: '12px 28px' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20 }}>Security</h3>
          <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Password</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 14 }}>Last changed: Unknown</p>
            <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 18px' }}>
              Change Password
            </button>
          </div>
          <div style={{ padding: 20, background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 10 }}>
            <p style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>Danger Zone</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 14 }}>Once you delete your account, there is no going back. Please be certain.</p>
            <button className="btn" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--red)', border: '1px solid rgba(255,107,107,0.3)', fontSize: '0.85rem', padding: '8px 18px' }}>
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProfilePage;
