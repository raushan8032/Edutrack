import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';

const Stat = ({ label, value, icon, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}22` }}>{icon}</div>
    <div className="stat-info">
      <h3 style={{ color }}>{value}</h3>
      <p>{label}</p>
    </div>
  </div>
);

const InstructorDashboardPage = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/analytics/instructor'),
      axios.get('/api/doubts/instructor').catch(() => ({ data: { doubts: [] } }))
    ])
      .then(([analyticsResponse, doubtsResponse]) => {
        setAnalytics(analyticsResponse.data.analytics);
        setDoubts(doubtsResponse.data.doubts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  if (!analytics) return <div className="card" role="alert" style={{ padding: 32 }}>Teaching dashboard data could not be loaded.</div>;

  const stats = [
    { label: 'Courses Created', value: analytics.totalCourses, icon: '▤', color: 'var(--accent-light)' },
    { label: 'Enrolled Students', value: analytics.totalStudents, icon: '♙', color: 'var(--teal)' },
    { label: 'Published Courses', value: analytics.publishedCourses, icon: '●', color: 'var(--success)' },
    { label: 'Draft Courses', value: analytics.draftCourses, icon: '◷', color: 'var(--amber)' },
    { label: 'Total Enrollments', value: analytics.totalEnrollments, icon: '↗', color: '#60a5fa' },
    { label: 'Pending Doubts', value: doubts.filter(doubt => doubt.status === 'pending').length, icon: '◉', color: '#f472b6' },
  ];
  const panelStyle = { padding: 22, minWidth: 0 };
  const chartStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.8rem' };

  return (
    <div style={{ animation: 'fadeUp .45s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', margin: '8px 0 28px' }}>
        <div>
          <p style={{ color: 'var(--primary)', fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Teaching workspace</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800 }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 5 }}>Your courses, learners, and teaching activity at a glance.</p>
        </div>
        <Link to="/courses" className="btn btn-primary">＋ Manage Courses</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
        {stats.map(stat => <Stat key={stat.label} {...stat} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
        <section className="card" style={panelStyle}>
          <h2 className="section-title">Course Performance</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginBottom: 16 }}>Enrollments and completions by course</p>
          {analytics.courseStats.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={analytics.courseStats} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="title" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="enrollments" name="Enrolled" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completions" name="Completed" fill="var(--teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', padding: 30 }}>Create a course to see performance here.</p>}
        </section>

        <section className="card" style={panelStyle}>
          <h2 className="section-title">Enrollment Trends</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginBottom: 16 }}>New course enrollments over six months</p>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={analytics.enrollmentTrends} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartStyle} />
              <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
        <section className="card" style={panelStyle}>
          <h2 className="section-title">Recent Student Enrollments</h2>
          {analytics.recentEnrollments.length ? analytics.recentEnrollments.map((entry, index) => (
            <div key={`${entry.enrolledAt}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div><strong style={{ display: 'block', fontSize: '.86rem' }}>{entry.studentName}</strong><span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>{entry.courseTitle}</span></div>
              <time style={{ color: 'var(--text-muted)', fontSize: '.74rem', whiteSpace: 'nowrap' }}>{new Date(entry.enrolledAt).toLocaleDateString()}</time>
            </div>
          )) : <p style={{ color: 'var(--text-muted)' }}>Enrollments will appear here.</p>}
        </section>

        <section className="card" style={panelStyle}>
          <h2 className="section-title">Student Activity</h2>
          {analytics.studentActivity.length ? analytics.studentActivity.slice(0, 6).map((activity, index) => (
            <div key={`${activity.date}-${index}`} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ fontSize: '.84rem' }}>{activity.studentName}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: 3 }}>{activity.action || 'studied'} {activity.courseTitle} · {activity.minutes} min</p>
            </div>
          )) : <p style={{ color: 'var(--text-muted)' }}>Learning activity will appear here.</p>}
        </section>

        <section className="card" style={panelStyle}>
          <h2 className="section-title">Recent Course Notifications</h2>
          {analytics.recentNotifications.length ? analytics.recentNotifications.map(notification => (
            <div key={notification._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ fontSize: '.84rem' }}>{notification.title}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: 3 }}>{notification.message}</p>
            </div>
          )) : <p style={{ color: 'var(--text-muted)' }}>No recent course notifications.</p>}
        </section>
      </div>

      <section className="card" style={{ ...panelStyle, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ marginRight: 8 }}>Teaching shortcuts</strong>
        <Link to="/courses" className="btn btn-secondary btn-sm">Course management</Link>
        <Link to="/doubts" className="btn btn-secondary btn-sm">Student doubts</Link>
        <Link to="/analytics" className="btn btn-secondary btn-sm">Teaching analytics</Link>
        <Link to="/profile" className="btn btn-secondary btn-sm">Profile settings</Link>
      </section>

      <section className="card" style={{ ...panelStyle, marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Recent Student Doubts</h2>
          <Link to="/doubts" className="btn btn-secondary btn-sm">Open Inbox</Link>
        </div>
        {doubts.length ? doubts.slice(0, 4).map(doubt => (
          <div key={doubt._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <strong style={{ fontSize: '.84rem' }}>{doubt.student?.name || 'Student'} · {doubt.lessonTitle}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: 3 }}>{doubt.course?.title} · {doubt.messages?.[0]?.text}</p>
            </div>
            <span className={`badge ${doubt.status === 'resolved' ? 'badge-success' : doubt.status === 'answered' ? 'badge-primary' : 'badge-gold'}`}>{doubt.status}</span>
          </div>
        )) : <p style={{ color: 'var(--text-muted)' }}>Student questions will appear here.</p>}
      </section>
    </div>
  );
};

export default InstructorDashboardPage;