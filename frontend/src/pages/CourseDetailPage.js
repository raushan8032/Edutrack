import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const CourseDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes] = await Promise.all([axios.get(`/api/courses/${id}`)]);
        setCourse(courseRes.data.course);
        try {
          const progRes = await axios.get(`/api/progress/${id}`);
          setProgress(progRes.data.progress);
        } catch {}
      } catch {
        toast.error('Failed to load course');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await axios.post(`/api/courses/${id}/enroll`);
      toast.success('Enrolled! 🎉');
      const progRes = await axios.get(`/api/progress/${id}`);
      setProgress(progRes.data.progress);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  if (!course) return <div className="card" style={{ textAlign: 'center', padding: 48 }}><h3>Course not found</h3></div>;

  const isEnrolled = !!progress;
  const isInstructor = ['instructor', 'admin'].includes(user?.role);
  const isCourseOwner = isInstructor && course.instructor?._id === user._id;
  const completedIds = progress?.completedLessons?.map(l => l.lesson?.toString()) || [];

  const categoryIcon = {
    'Web Development': '🌐', 'Data Science': '📊', 'Machine Learning': '🤖',
    'Mobile Dev': '📱', 'DevOps': '⚙️', 'Design': '🎨', 'Business': '💼'
  }[course.category] || '📚';

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      {/* Hero */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '36px', marginBottom: 28, display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start'
      }}>
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="badge badge-accent">{course.category}</span>
            {isCourseOwner && <span className="badge badge-indigo">Instructor Preview</span>}
            <span className={`badge ${course.level === 'Beginner' ? 'badge-teal' : course.level === 'Intermediate' ? 'badge-accent' : 'badge-amber'}`}>
              {course.level}
            </span>
            {course.isFree && <span className="badge badge-success">Free</span>}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: 12 }}>
            {course.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, maxWidth: 600 }}>{course.description}</p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>👨‍🏫 {course.instructor?.name}</span>
            <span>📝 {course.lessons?.length || 0} lessons</span>
            <span>⏱ {course.totalDuration || 0} min</span>
            <span>👥 {course.enrolledStudents?.length || 0} students</span>
            <span>⭐ {course.averageRating?.toFixed(1) || 'No ratings yet'}</span>
          </div>
        </div>
        <div style={{ fontSize: '4rem', textAlign: 'center', minWidth: 80 }}>{categoryIcon}</div>
      </div>

      {/* Progress (if enrolled) */}
      {isEnrolled && (
        <div className="card" style={{ marginBottom: 28, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>Your Progress</span>
            <span style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: '1.1rem' }}>{progress.overallProgress}%</span>
          </div>
          <div className="progress-bar" style={{ height: 10, marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: `${progress.overallProgress}%` }} />
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>✅ {completedIds.length}/{course.lessons?.length || 0} completed</span>
            <span>⏱ {progress.totalTimeSpent || 0} min spent</span>
            <span>🔥 {progress.streak || 0} day streak</span>
            {progress.isCompleted && <span style={{ color: 'var(--success)' }}>🏆 Course Completed!</span>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Lessons List */}
        <div>
          <h2 className="section-title">Course Curriculum</h2>
          {course.lessons?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No lessons added yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {course.lessons?.map((lesson, idx) => {
                const isDone = completedIds.includes(lesson._id?.toString());
                return (
                  <div key={lesson._id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 12, transition: 'all 0.2s',
                    borderColor: isDone ? 'rgba(74,222,128,0.3)' : 'var(--border)'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? 'rgba(74,222,128,0.15)' : 'var(--bg-secondary)',
                      border: `2px solid ${isDone ? 'var(--success)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isDone ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem'
                    }}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 3 }}>{lesson.title}</h4>
                      {lesson.description && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.description}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {lesson.duration > 0 && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>⏱ {lesson.duration}m</span>}
                      {lesson.quiz?.length > 0 && <span style={{ fontSize: '0.78rem', color: 'var(--amber)' }}>📝 Quiz</span>}
                      {(isEnrolled || isCourseOwner) && (
                        <Link to={`/courses/${id}/lessons/${lesson._id}`} className={`btn ${isDone ? 'btn-ghost' : 'btn-primary'}`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                          {isDone ? 'Review' : 'Start'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isCourseOwner ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🛠</div>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Your course preview</p>
              <Link to="/courses" className="btn btn-primary" style={{ width: '100%' }}>Manage Course</Link>
            </div>
          ) : !isEnrolled && !isInstructor ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{course.isFree ? '🆓' : '💰'}</div>
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 4 }}>
                {course.isFree ? 'Free' : `$${course.price}`}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
                Enroll now to get full access to all lessons and quizzes.
              </p>
              <button onClick={handleEnroll} disabled={enrolling} className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
                {enrolling ? 'Enrolling...' : 'Enroll Now 🚀'}
              </button>
            </div>
          ) : isInstructor ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>👁</div>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Instructor course preview</p>
              <Link to="/courses" className="btn btn-secondary" style={{ width: '100%' }}>Back to Course Studio</Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 24, textAlign: 'center', borderColor: 'rgba(74,222,128,0.3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎓</div>
              <p style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 12 }}>You're enrolled!</p>
              {course.lessons?.[0] && (
                <Link to={`/courses/${id}/lessons/${course.lessons[0]._id}`} className="btn btn-teal" style={{ width: '100%', padding: 12 }}>
                  {progress?.overallProgress > 0 ? 'Continue →' : 'Start Course →'}
                </Link>
              )}
            </div>
          )}
          {/* Course info */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 14 }}>Course Info</h4>
            {[
              ['🏷️ Category', course.category],
              ['📊 Level', course.level],
              ['📝 Lessons', `${course.lessons?.length || 0} lessons`],
              ['⏱ Duration', `${course.totalDuration || 0} minutes`],
              ['⭐ Rating', `${course.averageRating?.toFixed(1) || 'N/A'} (${course.ratings?.length || 0} reviews)`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CourseDetailPage;
