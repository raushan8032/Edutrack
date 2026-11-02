import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#6c63ff', '#00d4aa', '#ffb347', '#ff6b6b', '#4ade80', '#60a5fa'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600, fontSize: '0.9rem' }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsPage = () => {
  const { user } = useAuth();
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/analytics/${isInstructor ? 'instructor' : 'student'}`)
      .then(res => setAnalytics(res.data.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isInstructor]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  if (!analytics) return <div className="card" style={{ textAlign: 'center', padding: 48 }}>Failed to load analytics.</div>;

  if (isInstructor) {
    const teachingStats = [
      { icon: '♙', value: analytics.totalStudents, label: 'Total Students', color: 'var(--teal)' },
      { icon: '▤', value: analytics.publishedCourses, label: 'Courses Published', color: 'var(--success)' },
      { icon: '↗', value: analytics.totalEnrollments, label: 'Course Enrollments', color: 'var(--accent-light)' },
      { icon: '✓', value: `${analytics.completionRate}%`, label: 'Completion Rate', color: 'var(--amber)' },
      { icon: '✎', value: `${analytics.averageQuizScore}%`, label: 'Average Quiz Score', color: '#60a5fa' },
    ];
    return (
      <div style={{ animation: 'fadeUp .45s ease' }}>
        <div className="page-header">
          <h1>Teaching <span className="gradient-text">Analytics</span></h1>
          <p>Enrollment, engagement, and student outcomes across your courses.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
          {teachingStats.map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="stat-icon" style={{ background: `${stat.color}22` }}>{stat.icon}</div>
              <div className="stat-info"><h3 style={{ color: stat.color }}>{stat.value}</h3><p>{stat.label}</p></div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div className="card">
            <h2 className="section-title">Enrollment Trends</h2>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={analytics.enrollmentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="section-title">Course-wise Enrollment</h2>
            {analytics.courseStats.length ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={analytics.courseStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="title" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="enrollments" name="Enrollments" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: 'var(--text-muted)', padding: 28 }}>No course enrollment data yet.</p>}
          </div>
        </div>
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Course Engagement & Student Performance</h2>
          <div className="table-wrap" style={{ border: 0 }}>
            <table>
              <thead><tr><th>Course</th><th>Enrollments</th><th>Avg. Progress</th><th>Completion</th><th>Quiz Performance</th><th>Avg. Study Time</th></tr></thead>
              <tbody>{analytics.courseStats.map(course => (
                <tr key={course.courseId}>
                  <td>{course.title}</td><td>{course.enrollments}</td><td>{course.avgProgress}%</td>
                  <td>{course.completionRate}%</td><td>{course.averageQuizScore}%</td><td>{course.averageTimeSpent} min</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          <div className="card">
            <h2 className="section-title">Most Popular Courses</h2>
            {analytics.popularCourses.map((course, index) => (
              <div key={course.courseId} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{index + 1}. {course.title}</span><strong>{course.enrollments}</strong>
              </div>
            ))}
            {!analytics.popularCourses.length && <p style={{ color: 'var(--text-muted)' }}>No courses yet.</p>}
          </div>
          <div className="card">
            <h2 className="section-title">Student Performance Overview</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Average quiz score across your courses</p>
            <strong style={{ color: 'var(--primary-light)', fontSize: '2rem' }}>{analytics.averageQuizScore}%</strong>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Overall course completion: {analytics.completionRate}%</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { icon: '📚', value: analytics.totalCourses, label: 'Enrolled', color: 'var(--accent-light)' },
    { icon: '▶', value: analytics.coursesInProgress, label: 'In Progress', color: 'var(--teal)' },
    { icon: '🏆', value: analytics.completedCourses, label: 'Completed', color: 'var(--success)' },
    { icon: '⏱', value: `${Math.round(analytics.totalTimeSpent / 60)}h`, label: 'Study Time', color: 'var(--teal)' },
    { icon: '📊', value: `${analytics.avgProgress}%`, label: 'Avg Progress', color: 'var(--amber)' },
    { icon: '🧠', value: `${analytics.avgQuizScore}%`, label: 'Quiz Score', color: '#60a5fa' },
    { icon: '🔥', value: analytics.maxStreak, label: 'Best Streak', color: '#ff6b6b' },
  ];

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      <div className="page-header">
        <h1>Learning <span className="gradient-text">Analytics</span></h1>
        <p>Detailed insights into your learning patterns and performance.</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16, marginBottom: 36 }}>
        {stats.map(({ icon, value, label, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: `${color}22` }}>{icon}</div>
            <div className="stat-info">
              <h3 style={{ color, fontSize: '1.6rem' }}>{value}</h3>
              <p>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Weekly Activity Bar Chart */}
        <div className="card">
          <h2 className="section-title">Weekly Activity</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>Minutes studied per day this week</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.weeklyActivity} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="minutes" name="Minutes" radius={[6, 6, 0, 0]}>
                {analytics.weeklyActivity?.map((entry, index) => (
                  <Cell key={index} fill={entry.minutes > 0 ? 'url(#barGradient)' : 'var(--border)'} />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6c63ff" />
                  <stop offset="100%" stopColor="#00d4aa" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="card">
          <h2 className="section-title">Course Categories</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>Distribution by subject area</p>
          {analytics.categoryBreakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.categoryBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  dataKey="count" nameKey="name" paddingAngle={4}>
                  {analytics.categoryBreakdown.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val} course${val !== 1 ? 's' : ''}`, 'Count']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Enroll in courses to see category data
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Monthly completions line */}
        <div className="card">
          <h2 className="section-title">Monthly Completions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>Courses completed over last 6 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analytics.monthlyData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="completions" name="Completions" stroke="#6c63ff" strokeWidth={2.5} dot={{ fill: '#6c63ff', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Overview */}
        <div className="card">
          <h2 className="section-title">Course Progress</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>Progress per enrolled course</p>
          {analytics.recentProgress?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analytics.recentProgress.slice(0, 5).map((p, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {p.course?.title || 'Course'}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: COLORS[i % COLORS.length] }}>
                      {p.overallProgress}%
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div style={{ height: '100%', borderRadius: 20, width: `${p.overallProgress}%`, background: COLORS[i % COLORS.length], transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No course progress yet
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(108,99,255,0.05))', borderColor: 'rgba(108,99,255,0.3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎯</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 8 }}>Average Quiz Score</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-light)', fontFamily: 'var(--font-display)' }}>
            {analytics.avgQuizScore}%
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>
            {analytics.avgQuizScore >= 80 ? '🌟 Excellent performance!' : analytics.avgQuizScore >= 60 ? '👍 Good job!' : '💪 Keep practicing!'}
          </p>
        </div>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(0,212,170,0.04))', borderColor: 'rgba(0,212,170,0.2)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏱</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 8 }}>Total Study Time</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--teal)', fontFamily: 'var(--font-display)' }}>
            {Math.round(analytics.totalTimeSpent / 60)}h {analytics.totalTimeSpent % 60}m
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>
            Across all enrolled courses
          </p>
        </div>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,179,71,0.08), rgba(255,179,71,0.04))', borderColor: 'rgba(255,179,71,0.2)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔥</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 8 }}>Learning Streak</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
            {analytics.maxStreak} days
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>
            {analytics.maxStreak > 0 ? 'Keep the streak going!' : 'Start studying to build a streak!'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 className="section-title">Learning History</h2>
        {analytics.learningHistory?.length ? analytics.learningHistory.slice(0, 10).map((activity, index) => (
          <div key={`${activity.date}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '.84rem' }}>{activity.courseTitle} · {activity.action || 'study'} · {activity.minutes} min</span>
            <time style={{ color: 'var(--text-muted)', fontSize: '.76rem', whiteSpace: 'nowrap' }}>{new Date(activity.date).toLocaleDateString()}</time>
          </div>
        )) : <p style={{ color: 'var(--text-muted)' }}>Your learning sessions will appear here.</p>}
      </div>
    </div>
  );
};
export default AnalyticsPage;
