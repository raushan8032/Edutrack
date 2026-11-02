import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const categories = ['All', 'Web Development', 'Data Science', 'Machine Learning', 'Mobile Dev', 'DevOps', 'Design', 'Business'];
const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const categoryEmoji = {
  'Web Development': '🌐', 'Data Science': '📊', 'Machine Learning': '🤖',
  'Mobile Dev': '📱', 'DevOps': '⚙️', 'Design': '🎨', 'Business': '💼', 'Other': '📚'
};

const levelColor = { Beginner: 'badge-teal', Intermediate: 'badge-amber', Advanced: 'badge-red' };

const CourseCard = ({ course, onEnroll, enrolledIds }) => {
  const isEnrolled = enrolledIds.includes(course._id);
  const emoji = categoryEmoji[course.category] || '📚';
  const stars = Math.round(course.averageRating || 0);

  return (
    <div className="course-card">
      {/* Thumbnail */}
      <div className="course-card-thumb" style={{ height: 150 }}>
        <span style={{ fontSize: '4rem', position: 'relative', zIndex: 1 }}>{emoji}</span>
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
          <span className={`badge ${levelColor[course.level] || 'badge-teal'}`}>{course.level}</span>
        </div>
        {course.isFree && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
            <span className="badge badge-success">FREE</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '18px 18px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Category badge */}
        <span className="badge badge-accent" style={{ fontSize: '0.68rem', alignSelf: 'flex-start' }}>{course.category}</span>

        {/* Title */}
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.4, fontFamily: 'var(--font-display)' }}>{course.title}</h3>

        {/* Description */}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6, flex: 1 }}>
          {course.description?.slice(0, 90)}{course.description?.length > 90 ? '...' : ''}
        </p>

        {/* Instructor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="avatar avatar-sm" style={{ background: 'var(--gradient-main)', fontSize: '0.72rem' }}>
            {course.instructor?.name?.charAt(0) || '?'}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{course.instructor?.name || 'Instructor'}</span>
        </div>

        {/* Stars + Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span>
            {stars > 0 ? '⭐'.repeat(Math.min(stars, 5)) : '—'}{' '}
            <span style={{ color: 'var(--amber)' }}>{course.averageRating?.toFixed(1) || 'New'}</span>
          </span>
          <span>📝 {course.lessons?.length || 0} lessons</span>
          <span>👥 {course.enrolledStudents?.length || 0}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Link to={`/courses/${course._id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            Details
          </Link>
          {!isEnrolled ? (
            <button onClick={() => onEnroll(course._id)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
              Enroll {!course.isFree && `$${course.price}`}
            </button>
          ) : (
            <Link to={`/courses/${course._id}`} className="btn btn-teal btn-sm" style={{ flex: 1 }}>
              Continue →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [total, setTotal] = useState(0);
  const { user } = useAuth();

  useEffect(() => { fetchCourses(); fetchEnrolled(); }, [category, level]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'All') params.category = category;
      if (level !== 'All') params.level = level;
      if (search) params.search = search;
      const res = await axios.get('/api/courses', { params });
      setCourses(res.data.courses);
      setTotal(res.data.total || res.data.courses.length);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  const fetchEnrolled = async () => {
    try {
      const res = await axios.get('/api/progress/my');
      setEnrolledIds(res.data.progress.map(p => p.course?._id).filter(Boolean));
    } catch {}
  };

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`/api/courses/${courseId}/enroll`);
      toast.success('Enrolled successfully! 🎉');
      setEnrolledIds(prev => [...prev, courseId]);
    } catch (err) { toast.error(err.response?.data?.message || 'Enrollment failed'); }
  };

  const handleSearch = (e) => { e.preventDefault(); fetchCourses(); };

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      {/* Header */}
      <div className="page-header" style={{ paddingBottom: 20 }}>
        <h1>Course <span className="gradient-text">Library</span></h1>
        <p>Browse {total > 0 ? total : ''} expert-crafted courses across 8 categories.</p>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            className="input-field" placeholder="🔍  Search courses, topics, or instructors..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Search</button>
          {search && <button type="button" className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={() => { setSearch(''); fetchCourses(); }}>✕</button>}
        </form>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '5px 13px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', border: 'none',
              background: category === cat ? 'var(--accent)' : 'var(--bg-secondary)',
              color: category === cat ? 'white' : 'var(--text-secondary)',
              boxShadow: category === cat ? '0 2px 10px var(--accent-glow)' : 'none',
            }}>{categoryEmoji[cat] || ''} {cat}</button>
          ))}
        </div>

        {/* Level filters */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {levels.map(l => (
            <button key={l} onClick={() => setLevel(l)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${level === l ? 'var(--teal)' : 'var(--border)'}`,
              background: level === l ? 'var(--teal)' : 'transparent',
              color: level === l ? '#080810' : 'var(--text-muted)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 22 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="skeleton" style={{ height: 150 }} />
              <div style={{ padding: 18 }}>
                <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 18, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 36 }} />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No courses found</h3>
          <p>Try adjusting your filters or search term to find what you're looking for.</p>
          <button className="btn btn-secondary" onClick={() => { setCategory('All'); setLevel('All'); setSearch(''); fetchCourses(); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 18 }}>
            Showing <strong style={{ color: 'var(--text-secondary)' }}>{courses.length}</strong> course{courses.length !== 1 ? 's' : ''}
            {category !== 'All' && <> in <strong style={{ color: 'var(--accent-light)' }}>{category}</strong></>}
          </p>
          <div className="grid-3">
            {courses.map(course => (
              <CourseCard key={course._id} course={course} onEnroll={handleEnroll} enrolledIds={enrolledIds} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
export default CoursesPage;
