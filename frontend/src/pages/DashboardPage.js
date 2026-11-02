import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
const getGreeting = () => greetings[Math.min(2, Math.floor(new Date().getHours() / 8))];

const StatCard = ({ icon, value, label, color, sub }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}18`, fontSize: '1.3rem' }}>{icon}</div>
    <div className="stat-info">
      <h3 style={{ color }}>{value}</h3>
      <p>{label}</p>
      {sub && <p style={{ color: 'var(--success)', fontSize: '0.72rem', marginTop: 2 }}>{sub}</p>}
    </div>
  </div>
);

const CourseCard = ({ progress }) => {
  const course = progress.course;
  if (!course) return null;
  const emoji = { 'Web Development': '🌐', 'Data Science': '📊', 'Machine Learning': '🤖', 'Mobile Dev': '📱', 'DevOps': '⚙️', 'Design': '🎨', 'Business': '💼' }[course.category] || '📚';
  return (
    <Link to={`/courses/${course._id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-glow" style={{ padding: 20, cursor: 'pointer' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14, background: 'var(--gradient-card)',
            border: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0,
          }}>{emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</h4>
            <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>{course.category}</span>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Progress</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: progress.overallProgress === 100 ? 'var(--success)' : 'var(--accent-light)' }}>
              {progress.overallProgress === 100 ? '✅ Complete' : `${progress.overallProgress}%`}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress.overallProgress}%` }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>
          <span>⏱ {progress.totalTimeSpent || 0} min</span>
          <span>{progress.completedLessons?.length || 0} / {course.lessons?.length || 0} lessons</span>
          {progress.streak > 0 && <span style={{ color: 'var(--amber)' }}>🔥 {progress.streak}d streak</span>}
        </div>
      </div>
    </Link>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [progress, setProgress] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, progressRes, notificationsRes] = await Promise.all([
          axios.get('/api/analytics/student'),
          axios.get('/api/progress/my'),
          axios.get('/api/notifications').catch(() => ({ data: { notifications: [] } })),
        ]);
        setAnalytics(analyticsRes.data.analytics);
        setProgress(progressRes.data.progress);
        setNotifications(notificationsRes.data.notifications || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading your dashboard...</p>
      </div>
    </div>
  );

  const stats = [
    { icon: '📚', value: analytics?.totalCourses || 0, label: 'Enrolled Courses', color: 'var(--accent-light)' },
    { icon: '▶', value: analytics?.coursesInProgress || 0, label: 'In Progress', color: 'var(--teal)' },
    { icon: '✅', value: analytics?.completedCourses || 0, label: 'Completed', color: 'var(--success)' },
    { icon: '◔', value: `${analytics?.avgProgress || 0}%`, label: 'Overall Progress', color: 'var(--accent-light)' },
    { icon: '🔥', value: analytics?.maxStreak || 0, label: 'Day Streak', color: 'var(--amber)', sub: analytics?.maxStreak > 0 ? `🔥 Keep it up!` : '' },
  ];

  const inProgress = progress.filter(p => !p.isCompleted && p.overallProgress > 0);
  const notStarted = progress.filter(p => p.overallProgress === 0);
  const completed = progress.filter(p => p.isCompleted);
  const weeklyData = analytics?.weeklyActivity || [];
  const recentlyAccessed = [...progress].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3);
  const upcomingAssignments = progress.flatMap(item => {
    const completedLessons = new Set((item.completedLessons || []).map(entry => entry.lesson?.toString()));
    return (item.course?.lessons || [])
      .filter(lesson => lesson.quiz?.length && !completedLessons.has(lesson._id?.toString()))
      .map(lesson => ({ course: item.course, lesson }));
  }).slice(0, 5);

  const avatarColors = ['#6c63ff','#00d4aa','#ffb347','#f472b6','#4ade80'];
  const avatarColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      {/* ===== Welcome Header ===== */}
      <div className="announcement-banner" style={{ marginTop: 8 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: 'white', flexShrink: 0 }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
            {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>! 👋
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
            {analytics?.avgProgress > 0
              ? `You're ${analytics.avgProgress}% through your courses. Keep the momentum going!`
              : 'Welcome to EduTrack! Start a course to begin your learning journey.'}
          </p>
        </div>
        {analytics?.maxStreak > 0 && (
          <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(255,179,71,0.12)', borderRadius: 10, border: '1px solid rgba(255,179,71,0.25)', flexShrink: 0 }}>
            <div style={{ fontSize: '1.4rem' }}>🔥</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--amber)', fontSize: '1.1rem' }}>{analytics.maxStreak}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Day Streak</div>
          </div>
        )}
      </div>

      {/* ===== Stats Grid ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 32 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {recentlyAccessed.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <h2 className="section-title">Recently Accessed</h2>
          <div className="grid-3">
            {recentlyAccessed.map(item => <CourseCard key={item._id} progress={item} />)}
          </div>
        </section>
      )}

      {/* ===== Main Content Grid ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: progress.length > 0 ? '1fr 300px' : '1fr', gap: 24, marginBottom: 32 }}>

        {/* In Progress */}
        <div>
          {inProgress.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 className="section-title">Continue Learning</h2>
              <div className="grid-3">
                {inProgress.map(p => <CourseCard key={p._id} progress={p} />)}
              </div>
            </div>
          )}

          {notStarted.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 className="section-title">Not Started Yet</h2>
              <div className="grid-3">
                {notStarted.map(p => <CourseCard key={p._id} progress={p} />)}
              </div>
            </div>
          )}

          <section style={{ marginBottom: 28 }}>
            <h2 className="section-title">Upcoming Assignments</h2>
            {upcomingAssignments.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingAssignments.map(({ course, lesson }) => (
                  <Link key={`${course._id}-${lesson._id}`} to={`/courses/${course._id}/lessons/${lesson._id}`} className="card"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '13px 16px', textDecoration: 'none' }}>
                    <span><strong style={{ display: 'block', fontSize: '.86rem' }}>{lesson.title} quiz</strong><span style={{ color: 'var(--text-muted)', fontSize: '.76rem' }}>{course.title} · no due date set</span></span>
                    <span className="badge badge-amber">Practice</span>
                  </Link>
                ))}
              </div>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: '.84rem' }}>No upcoming quizzes in your enrolled courses.</p>}
          </section>

          {completed.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 className="section-title">✅ Completed</h2>
              <div className="grid-3">
                {completed.map(p => <CourseCard key={p._id} progress={p} />)}
              </div>
            </div>
          )}

          {progress.length === 0 && (
            <div className="card empty-state">
              <div className="empty-icon">📚</div>
              <h3>No courses yet</h3>
              <p>Explore our course library and start your learning journey today!</p>
              <Link to="/courses" className="btn btn-gradient">Browse Courses →</Link>
            </div>
          )}
        </div>

        {/* Sidebar: Weekly Activity + Quick Stats */}
        {progress.length > 0 && weeklyData.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Weekly Activity Chart */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>📅 This Week</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginBottom: 16 }}>Minutes studied per day</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }} />
                  <Bar dataKey="minutes" radius={[5,5,0,0]}>
                    {weeklyData.map((entry, i) => (
                      <Cell key={i} fill={entry.minutes > 0 ? 'var(--accent)' : 'var(--border)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Stats */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>🎯 Performance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Avg Progress', value: `${analytics?.avgProgress || 0}%`, color: 'var(--accent-light)' },
                  { label: 'Quiz Score', value: `${analytics?.avgQuizScore || 0}%`, color: 'var(--teal)' },
                  { label: 'Study Time', value: `${Math.round((analytics?.totalTimeSpent || 0) / 60)}h`, color: 'var(--amber)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <Link to="/analytics" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.82rem', padding: '9px' }}>
                📊 View Full Analytics →
              </Link>
            </div>

            {/* Quick links */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 14 }}>⚡ Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/courses" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '9px 14px' }}>📚 Browse New Courses</Link>
                <Link to="/doubts" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '9px 14px' }}>💬 Ask Your Instructor</Link>
                <Link to="/profile" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '9px 14px' }}>👤 Update Profile</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {progress.length === 0 && (
        <section className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h2 className="section-title">Learning Activity Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginBottom: 10 }}>Minutes studied per day this week</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} margin={{ left: -20, right: 12 }}>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="minutes" fill="var(--teal)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="card" style={{ padding: 20, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Recent Notifications</h2>
          <Link to="/profile" style={{ color: 'var(--primary-light)', fontSize: '.8rem' }}>View profile</Link>
        </div>
        {notifications.length ? notifications.slice(0, 5).map(notification => (
          <div key={notification._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <div><strong style={{ fontSize: '.84rem' }}>{notification.title}</strong><p style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: 3 }}>{notification.message}</p></div>
            <time style={{ color: 'var(--text-muted)', fontSize: '.72rem', whiteSpace: 'nowrap' }}>{new Date(notification.createdAt).toLocaleDateString()}</time>
          </div>
        )) : <p style={{ color: 'var(--text-muted)', fontSize: '.84rem' }}>No recent notifications.</p>}
      </section>
    </div>
  );
};
export default DashboardPage;
