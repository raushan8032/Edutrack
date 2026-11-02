import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const categories = ['Web Development', 'Data Science', 'Machine Learning', 'Mobile Dev', 'DevOps', 'Design', 'Business', 'Other'];
const levels = ['Beginner', 'Intermediate', 'Advanced'];
const catEmoji = { 'Web Development':'🌐','Data Science':'📊','Machine Learning':'🤖','Mobile Dev':'📱','DevOps':'⚙️','Design':'🎨','Business':'💼','Other':'📚' };

const defaultLesson = { title:'', description:'', duration:30, order:1, videoUrl:'', notes:{ textContent:'', pdfUrl:'', pdfText:'', summary:'' }, quiz:[], resources:[] };
const defaultForm  = { title:'', description:'', category:'Web Development', level:'Beginner', isFree:true, price:0, isPublished:false, lessons:[] };
const defaultQuiz  = { question:'', options:['','','',''], correctAnswer:0 };

/* ─── Stat Card ─── */
const Stat = ({ icon, value, label, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background:`${color}18` }}>{icon}</div>
    <div className="stat-info">
      <h3 style={{ color }}>{value ?? 0}</h3>
      <p>{label}</p>
    </div>
  </div>
);

/* ─── Video preview helper ─── */
const getEmbedPreview = (url) => {
  const yt = url?.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg`;
  return null;
};

const InstructorPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('courses');  // courses | form | students
  const [editingCourse, setEditingCourse] = useState(null);
  const [expandedLessons, setExpandedLessons] = useState({});
  const [lessonTab, setLessonTab] = useState({}); // per-lesson: 'info' | 'notes' | 'quiz'
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCourseStudents, setSelectedCourseStudents] = useState(null);
  const [studentRoster, setStudentRoster] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pdfUploading, setPdfUploading] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        axios.get('/api/courses/my'),
        axios.get('/api/analytics/instructor'),
      ]);
      setCourses(cRes.data.courses);
      setAnalytics(aRes.data.analytics);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCourse) {
        await axios.put(`/api/courses/${editingCourse}`, form);
        toast.success('✅ Course updated!');
      } else {
        await axios.post('/api/courses', form);
        toast.success('🎉 Course created!');
      }
      setShowForm(false); setForm(defaultForm); setEditingCourse(null);
      setActiveTab('courses'); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleEdit = (course) => {
    const lessons = (course.lessons || []).map(l => ({
      ...l,
      notes: l.notes || { textContent:'', pdfUrl:'', pdfText:'', summary:'' },
      quiz: l.quiz || [],
      resources: l.resources || [],
    }));
    setForm({ ...course, lessons });
    setEditingCourse(course._id);
    setShowForm(true); setActiveTab('form');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course? This cannot be undone.')) return;
    try { await axios.delete(`/api/courses/${id}`); toast.success('Course deleted'); fetchData(); }
    catch { toast.error('Delete failed'); }
  };

  const handleTogglePublish = async (course) => {
    try {
      await axios.put(`/api/courses/${course._id}`, { ...course, isPublished: !course.isPublished });
      toast.success(course.isPublished ? '📝 Set to Draft' : '🚀 Published!');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const viewStudents = async (course) => {
    setSelectedCourseStudents(course);
    setLoadingStudents(true);
    setActiveTab('students');
    try {
      const res = await axios.get(`/api/courses/${course._id}/students`);
      setStudentRoster(res.data.students || []);
    } catch { toast.error('Failed to load students'); setStudentRoster([]); }
    finally { setLoadingStudents(false); }
  };

  /* ── Lesson CRUD helpers ── */
  const addLesson = () => setForm(f => ({ ...f, lessons:[...f.lessons,{ ...defaultLesson, order:f.lessons.length+1 }] }));
  const removeLesson = (i) => setForm(f => ({ ...f, lessons:f.lessons.filter((_,x)=>x!==i) }));
  const setLessonField = (i, k, v) => setForm(f => { const ls=[...f.lessons]; ls[i]={...ls[i],[k]:v}; return {...f,lessons:ls}; });
  const setNotesField = (i, k, v) => setForm(f => {
    const ls=[...f.lessons]; ls[i]={...ls[i],notes:{...ls[i].notes,[k]:v}};
    return {...f,lessons:ls};
  });
  const uploadLessonPdf = async (lessonIndex, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('pdf', file);
    setPdfUploading(current => ({ ...current, [lessonIndex]: true }));
    try {
      const response = await axios.post('/api/courses/pdf', formData);
      setNotesField(lessonIndex, 'pdfUrl', response.data.pdfUrl);
      setNotesField(lessonIndex, 'pdfText', response.data.extractedText || '');
      toast.success(`${file.name} uploaded and linked to this lesson`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'PDF upload failed');
    } finally {
      setPdfUploading(current => ({ ...current, [lessonIndex]: false }));
    }
  };
  const addQuiz = (li) => setForm(f => { const ls=[...f.lessons]; ls[li].quiz=[...(ls[li].quiz||[]),{...defaultQuiz}]; return {...f,lessons:ls}; });
  const removeQuiz = (li,qi) => setForm(f => { const ls=[...f.lessons]; ls[li].quiz=ls[li].quiz.filter((_,x)=>x!==qi); return {...f,lessons:ls}; });
  const setQuizField = (li,qi,k,v) => setForm(f => { const ls=[...f.lessons]; ls[li].quiz[qi]={...ls[li].quiz[qi],[k]:v}; return {...f,lessons:ls}; });
  const setQuizOption = (li,qi,oi,v) => setForm(f => { const ls=[...f.lessons]; const opts=[...ls[li].quiz[qi].options]; opts[oi]=v; ls[li].quiz[qi]={...ls[li].quiz[qi],options:opts}; return {...f,lessons:ls}; });
  const addResource = (li) => setForm(f => { const ls=[...f.lessons]; ls[li].resources=[...(ls[li].resources||[]),{name:'',url:''}]; return {...f,lessons:ls}; });
  const setResource = (li,ri,k,v) => setForm(f => { const ls=[...f.lessons]; const rs=[...ls[li].resources]; rs[ri]={...rs[ri],[k]:v}; ls[li].resources=rs; return {...f,lessons:ls}; });
  const removeResource = (li,ri) => setForm(f => { const ls=[...f.lessons]; ls[li].resources=ls[li].resources.filter((_,x)=>x!==ri); return {...f,lessons:ls}; });

  const toggleLesson = (i) => setExpandedLessons(p => ({...p,[i]:!p[i]}));
  const getLessonTab = (i) => lessonTab[i] || 'info';
  const setLTab = (i,t) => setLessonTab(p => ({...p,[i]:t}));

  const filteredCourses = courses.filter(c =>
    !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:100, gap:16 }}>
      <div className="spinner" />
      <p style={{ color:'var(--text-muted)', fontSize:'.88rem' }}>Loading instructor panel...</p>
    </div>
  );

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'2rem' }}>
            Instructor <span className="grad-text">Studio</span>
          </h1>
          <p style={{ color:'var(--text-secondary)', marginTop:4, fontSize:'.92rem' }}>Create courses, manage lessons, and track student progress.</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setEditingCourse(null); setShowForm(true); setActiveTab('form'); }} className="btn btn-grad">
          + Create New Course
        </button>
      </div>

      {/* ── Analytics ── */}
      {analytics && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:28 }}>
          <Stat icon="👥" value={analytics.totalStudents} label="Total Students" color="var(--indigo-light)" />
          <Stat icon="📋" value={analytics.totalEnrollments} label="Enrollments" color="var(--primary-light)" />
          <Stat icon="📚" value={courses.length} label="My Courses" color="var(--gold)" />
          <Stat icon="✅" value={`${analytics.completionRate || 0}%`} label="Completion Rate" color="var(--success)" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="tab-bar" style={{ marginBottom:24 }}>
        {[
          ['courses','📚 My Courses'],
          showForm && ['form', editingCourse ? '✏️ Edit Course' : '➕ New Course'],
          activeTab==='students' && ['students','👥 Students'],
        ].filter(Boolean).map(([tab,label]) => (
          <button key={tab} className={`tab-btn ${activeTab===tab?'active':''}`} onClick={() => setActiveTab(tab)}>{label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════
          COURSES LIST
      ══════════════════════════════════ */}
      {activeTab === 'courses' && (
        <div>
          {/* Search */}
          <div style={{ marginBottom:18 }}>
            <input className="input-field" placeholder="🔍  Search your courses..."
              value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
              style={{ maxWidth:380 }} />
          </div>

          {filteredCourses.length === 0 ? (
            <div className="card empty-state">
              <span className="empty-icon">{courseSearch ? '🔍' : '🎓'}</span>
              <h3>{courseSearch ? 'No matches found' : 'No courses yet'}</h3>
              <p>{courseSearch ? 'Try a different search term.' : 'Create your first course to start teaching.'}</p>
              {!courseSearch && <button onClick={() => { setShowForm(true); setActiveTab('form'); }} className="btn btn-grad">Create First Course</button>}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {filteredCourses.map(course => (
                <div key={course._id} className="card" style={{ padding:22 }}>
                  <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                    {/* Emoji thumb */}
                    <div style={{ width:56, height:56, borderRadius:14, background:'var(--bg-elevated)', border:'1px solid var(--border-md)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', flexShrink:0 }}>
                      {catEmoji[course.category] || '📚'}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ display:'flex', gap:7, marginBottom:8, flexWrap:'wrap' }}>
                        <span className="badge badge-indigo">{course.category}</span>
                        <span className={`badge ${course.isPublished ? 'badge-success' : 'badge-gold'}`}>
                          {course.isPublished ? '✅ Published' : '📝 Draft'}
                        </span>
                        <span className="badge badge-sky">{course.level}</span>
                        {course.isFree && <span className="badge badge-primary">FREE</span>}
                      </div>
                      <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', marginBottom:5 }}>{course.title}</h3>
                      <div style={{ display:'flex', gap:16, fontSize:'.78rem', color:'var(--text-muted)', flexWrap:'wrap' }}>
                        <span>📝 {course.lessons?.length || 0} lessons</span>
                        <span>👥 {course.enrolledStudents?.length || 0} students</span>
                        <span>⭐ {course.averageRating?.toFixed(1) || 'N/A'}</span>
                        <span>📅 {new Date(course.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <Link to={`/courses/${course._id}`} className="btn btn-secondary btn-sm">Preview</Link>
                      <button onClick={() => viewStudents(course)} className="btn btn-secondary btn-sm">👥 Students</button>
                      <button onClick={() => handleTogglePublish(course)} className={`btn btn-sm ${course.isPublished ? 'btn-secondary' : 'btn-primary'}`}>
                        {course.isPublished ? '📝 Unpublish' : '🚀 Publish'}
                      </button>
                      <button onClick={() => handleEdit(course)} className="btn btn-indigo btn-sm">✏️ Edit</button>
                      <button onClick={() => handleDelete(course._id)} className="btn btn-danger btn-sm">🗑 Delete</button>
                    </div>
                  </div>

                  {/* Mini progress bar showing lesson completion across all students */}
                  {course.enrolledStudents?.length > 0 && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', color:'var(--text-muted)', marginBottom:6 }}>
                        <span>Student Engagement</span>
                        <span style={{ color:'var(--primary-light)' }}>{course.enrolledStudents.length} enrolled</span>
                      </div>
                      <div className="progress-bar progress-bar-xs">
                        <div className="progress-fill" style={{ width:`${Math.min(100,(course.enrolledStudents.length / Math.max(1,course.enrolledStudents.length+5))*100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          STUDENT ROSTER
      ══════════════════════════════════ */}
      {activeTab === 'students' && selectedCourseStudents && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
            <button onClick={() => setActiveTab('courses')} className="btn btn-secondary btn-sm">← Back</button>
            <div>
              <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.15rem' }}>Students — {selectedCourseStudents.title}</h2>
              <p style={{ color:'var(--text-muted)', fontSize:'.8rem' }}>{studentRoster.length} enrolled students</p>
            </div>
          </div>

          {loadingStudents ? (
            <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}><div className="spinner" /></div>
          ) : studentRoster.length === 0 ? (
            <div className="card empty-state">
              <span className="empty-icon">👥</span>
              <h3>No students yet</h3>
              <p>No one has enrolled in this course yet. Publish it to attract learners!</p>
            </div>
          ) : (
            <div className="card" style={{ padding:0 }}>
              <div className="table-wrap" style={{ border:'none', borderRadius:'var(--r-lg)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Student</th><th>Email</th>
                      <th>Progress</th><th>Lessons Done</th><th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRoster.map((p, i) => {
                      const s = p.student;
                      const pct = p.overallProgress || 0;
                      const avatarColors = ['#10b981','#6366f1','#f59e0b','#f43f5e','#0ea5e9'];
                      const ac = avatarColors[(s?.name?.charCodeAt(0)||0)%5];
                      return (
                        <tr key={p._id}>
                          <td style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:'.8rem' }}>#{i+1}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div className="avatar avatar-sm" style={{ background:`linear-gradient(135deg,${ac},${ac}99)`, color:'#040810' }}>
                                {s?.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <span style={{ fontWeight:600, fontSize:'.88rem' }}>{s?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td><span style={{ fontFamily:'var(--font-mono)', fontSize:'.78rem' }}>{s?.email || '—'}</span></td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:100 }}>
                              <div className="progress-bar" style={{ flex:1, height:6 }}>
                                <div className="progress-fill" style={{ width:`${pct}%` }} />
                              </div>
                              <span style={{ fontWeight:700, fontSize:'.8rem', color:pct===100?'var(--success)':'var(--primary-light)', minWidth:32 }}>{pct}%</span>
                            </div>
                          </td>
                          <td><span style={{ fontFamily:'var(--font-mono)', fontSize:'.8rem' }}>{p.completedLessons?.length || 0}</span></td>
                          <td style={{ fontSize:'.78rem' }}>{s?.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          COURSE FORM
      ══════════════════════════════════ */}
      {activeTab === 'form' && showForm && (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:24 }}>

          {/* Course Details */}
          <div className="card" style={{ padding:28 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:22, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:34, height:34, borderRadius:10, background:'var(--grad-brand)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem', color:'#040810', fontWeight:800, flexShrink:0 }}>1</span>
              Course Details
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
              <div className="input-group" style={{ gridColumn:'1/-1' }}>
                <label>Course Title *</label>
                <input className="input-field" value={form.title} required
                  onChange={e => setForm({...form, title:e.target.value})}
                  placeholder="e.g., Complete Python Bootcamp for Beginners" />
              </div>
              <div className="input-group" style={{ gridColumn:'1/-1' }}>
                <label>Description *</label>
                <textarea className="input-field" value={form.description} required rows={3}
                  onChange={e => setForm({...form, description:e.target.value})}
                  placeholder="What will students learn? What are the prerequisites?" />
              </div>
              <div className="input-group">
                <label>Category</label>
                <select className="input-field" value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Level</label>
                <select className="input-field" value={form.level} onChange={e => setForm({...form, level:e.target.value})}>
                  {levels.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Pricing</label>
                <select className="input-field" value={form.isFree} onChange={e => setForm({...form, isFree:e.target.value==='true'})}>
                  <option value="true">Free</option>
                  <option value="false">Paid</option>
                </select>
              </div>
              {!form.isFree && (
                <div className="input-group">
                  <label>Price ($)</label>
                  <input className="input-field" type="number" min="0" value={form.price}
                    onChange={e => setForm({...form, price:Number(e.target.value)})} />
                </div>
              )}
              <div className="input-group">
                <label>Publish Status</label>
                <select className="input-field" value={form.isPublished} onChange={e => setForm({...form, isPublished:e.target.value==='true'})}>
                  <option value="false">📝 Draft</option>
                  <option value="true">🚀 Published</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lessons */}
          <div className="card" style={{ padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:34, height:34, borderRadius:10, background:'var(--grad-brand)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem', color:'#040810', fontWeight:800, flexShrink:0 }}>2</span>
                Chapters & Lessons ({form.lessons.length})
              </h3>
              <button type="button" onClick={addLesson} className="btn btn-secondary btn-sm">+ Add Chapter</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {form.lessons.map((lesson, li) => {
                const isExpanded = expandedLessons[li] !== false;
                const lTab = getLessonTab(li);
                const preview = getEmbedPreview(lesson.videoUrl);
                return (
                  <div key={li} style={{ background:'var(--bg-secondary)', borderRadius:'var(--r-md)', border:'1px solid var(--border-md)', overflow:'hidden' }}>
                    {/* Lesson Header */}
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer', userSelect:'none' }}
                      onClick={() => toggleLesson(li)}>
                      <div style={{ width:28, height:28, borderRadius:8, background:'var(--grad-brand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.78rem', color:'#040810', fontWeight:800, flexShrink:0 }}>
                        {li+1}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:'.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {lesson.title || <span style={{ color:'var(--text-muted)' }}>Untitled Chapter {li+1}</span>}
                        </p>
                        <div style={{ display:'flex', gap:10, fontSize:'.72rem', color:'var(--text-muted)', marginTop:2 }}>
                          {lesson.duration>0 && <span>⏱ {lesson.duration} min</span>}
                          {lesson.videoUrl && <span>🎬 Video added</span>}
                          {lesson.notes?.textContent && <span>📝 Notes</span>}
                          {lesson.quiz?.length > 0 && <span>❓ {lesson.quiz.length} Q</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                        <button type="button" onClick={e=>{e.stopPropagation();removeLesson(li);}} style={{ background:'none', border:'none', color:'var(--rose)', cursor:'pointer', fontSize:'1rem', padding:4 }}>✕</button>
                        <span style={{ color:'var(--text-muted)', fontSize:'.9rem', transition:'transform .2s', transform:`rotate(${isExpanded?180:0}deg)` }}>▾</span>
                      </div>
                    </div>

                    {/* Lesson Content */}
                    {isExpanded && (
                      <div style={{ padding:'4px 18px 18px', borderTop:'1px solid var(--border)' }}>
                        {/* Sub-tabs */}
                        <div className="tab-bar" style={{ marginBottom:16, marginTop:12 }}>
                          {[['info','📋 Info'],['notes','📝 Notes'],['quiz','❓ Quiz'],['resources','📎 Resources']].map(([t,l]) => (
                            <button key={t} type="button" className={`tab-btn ${lTab===t?'active':''}`} onClick={() => setLTab(li,t)} style={{ fontSize:'.77rem' }}>{l}</button>
                          ))}
                        </div>

                        {/* INFO TAB */}
                        {lTab === 'info' && (
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            <div className="input-group" style={{ gridColumn:'1/-1' }}>
                              <label>Chapter / Lesson Title *</label>
                              <input className="input-field" value={lesson.title}
                                onChange={e => setLessonField(li,'title',e.target.value)} placeholder="e.g., Introduction to Python" />
                            </div>
                            <div className="input-group" style={{ gridColumn:'1/-1' }}>
                              <label>Video URL (YouTube, Vimeo, Drive, Direct)</label>
                              <input className="input-field" value={lesson.videoUrl}
                                onChange={e => setLessonField(li,'videoUrl',e.target.value)}
                                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." />
                              {lesson.videoUrl && (
                                <div style={{ fontSize:'.72rem', color:'var(--primary)', marginTop:4 }}>
                                  ✅ Video link added — will auto-embed on lesson page
                                  {preview && <img src={preview} alt="preview" style={{ marginTop:6, height:60, borderRadius:6, display:'block', border:'1px solid var(--border)' }} />}
                                </div>
                              )}
                            </div>
                            <div className="input-group">
                              <label>Duration (minutes)</label>
                              <input className="input-field" type="number" min="1" value={lesson.duration}
                                onChange={e => setLessonField(li,'duration',Number(e.target.value))} />
                            </div>
                            <div className="input-group" style={{ gridColumn:'1/-1' }}>
                              <label>Description</label>
                              <textarea className="input-field" value={lesson.description} rows={2}
                                onChange={e => setLessonField(li,'description',e.target.value)}
                                placeholder="What will students learn in this chapter?" />
                            </div>
                          </div>
                        )}

                        {/* NOTES TAB */}
                        {lTab === 'notes' && (
                          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                            <div className="input-group">
                              <label>Chapter Summary (shown to students at top)</label>
                              <input className="input-field" value={lesson.notes?.summary || ''}
                                onChange={e => setNotesField(li,'summary',e.target.value)}
                                placeholder="Brief 1-2 sentence summary of this chapter..." />
                            </div>
                            <div className="input-group">
                              <label>Text Notes / Lecture Notes</label>
                              <textarea className="input-field" value={lesson.notes?.textContent || ''} rows={8}
                                onChange={e => setNotesField(li,'textContent',e.target.value)}
                                placeholder={`Write detailed chapter notes here.\n\nYou can include:\n- Key concepts\n- Code examples\n- Definitions\n- Important points\n- Examples & explanations`}
                                style={{ fontFamily:'var(--font-mono)', fontSize:'.82rem', lineHeight:1.7 }} />
                            </div>
                            <div className="input-group">
                              <label>PDF Notes URL or uploaded file (optional)</label>
                              <input className="input-field" value={lesson.notes?.pdfUrl || ''}
                                onChange={e => setNotesField(li,'pdfUrl',e.target.value)}
                                placeholder="https://drive.google.com/... or direct PDF link" />
                              <label style={{ display:'block', fontSize:'.78rem', marginTop:12 }}>Upload from this device (PDF, max 20 MB)</label>
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                disabled={!!pdfUploading[li]}
                                onChange={e => {
                                  uploadLessonPdf(li, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                                style={{ display:'block', marginTop:6, fontSize:'.82rem', color:'var(--text-secondary)' }}
                              />
                              {pdfUploading[li] && <p role="status" style={{ fontSize:'.76rem', color:'var(--primary)', marginTop:6 }}>Uploading PDF...</p>}
                              {lesson.notes?.pdfUrl && <p style={{ fontSize:'.72rem', color:'var(--primary)', marginTop:6 }}>✅ PDF linked — students can open it after the course is saved</p>}
                              {lesson.notes?.pdfUrl?.startsWith('file:') && <p role="alert" style={{ fontSize:'.76rem', color:'var(--rose)', marginTop:6 }}>This local file path is not available to students. Upload the PDF above or enter a web link.</p>}
                            </div>
                            <div style={{ padding:12, background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.2)', borderRadius:'var(--r-sm)', fontSize:'.78rem', color:'var(--text-muted)' }}>
                              💡 <strong style={{ color:'var(--text-secondary)' }}>PDF access:</strong> Upload a file from this device, paste a Google Drive sharing link, or enter a direct HTTPS PDF URL. Drive files must allow “Anyone with the link” as Viewer.
                            </div>
                          </div>
                        )}

                        {/* QUIZ TAB */}
                        {lTab === 'quiz' && (
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                              <p style={{ fontSize:'.85rem', color:'var(--text-secondary)' }}>Add multiple choice questions for this chapter</p>
                              <button type="button" onClick={() => addQuiz(li)} className="btn btn-secondary btn-sm">+ Add Question</button>
                            </div>
                            {(lesson.quiz||[]).length === 0 ? (
                              <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-muted)', fontSize:'.85rem' }}>
                                <div style={{ fontSize:'2rem', marginBottom:8 }}>❓</div>
                                No questions yet. Add your first quiz question above.
                              </div>
                            ) : (lesson.quiz||[]).map((q,qi) => (
                              <div key={qi} style={{ padding:16, background:'var(--bg-card)', borderRadius:'var(--r-sm)', marginBottom:12, border:'1px solid var(--border-md)' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                                  <span className="badge badge-gold">Q{qi+1}</span>
                                  <button type="button" onClick={() => removeQuiz(li,qi)} style={{ background:'none', border:'none', color:'var(--rose)', cursor:'pointer', fontSize:'.85rem' }}>Remove ✕</button>
                                </div>
                                <div className="input-group" style={{ marginBottom:12 }}>
                                  <label>Question</label>
                                  <input className="input-field" value={q.question}
                                    onChange={e => setQuizField(li,qi,'question',e.target.value)}
                                    placeholder="Enter your question..." />
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                  {q.options.map((opt,oi) => (
                                    <div key={oi} style={{ display:'flex', gap:8, alignItems:'center' }}>
                                      <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                                        <input type="radio" name={`correct_${li}_${qi}`}
                                          checked={q.correctAnswer===oi}
                                          onChange={() => setQuizField(li,qi,'correctAnswer',oi)}
                                          style={{ accentColor:'var(--success)', width:14, height:14 }} />
                                        <span style={{ fontSize:'.72rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>Opt {oi+1}</span>
                                      </label>
                                      <input className="input-field" style={{ fontSize:'.82rem', padding:'7px 10px', flex:1 }}
                                        value={opt} onChange={e => setQuizOption(li,qi,oi,e.target.value)}
                                        placeholder={`Option ${oi+1}`} />
                                    </div>
                                  ))}
                                </div>
                                <p style={{ fontSize:'.7rem', color:'var(--text-muted)', marginTop:8 }}>🟢 Select the radio button next to the correct answer</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* RESOURCES TAB */}
                        {lTab === 'resources' && (
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                              <p style={{ fontSize:'.85rem', color:'var(--text-secondary)' }}>Add downloadable files or external links</p>
                              <button type="button" onClick={() => addResource(li)} className="btn btn-secondary btn-sm">+ Add Resource</button>
                            </div>
                            {(lesson.resources||[]).length === 0 ? (
                              <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:'.85rem' }}>
                                <div style={{ fontSize:'2rem', marginBottom:8 }}>📎</div>
                                No resources yet.
                              </div>
                            ) : (lesson.resources||[]).map((r,ri) => (
                              <div key={ri} style={{ display:'grid', gridTemplateColumns:'1fr 2fr auto', gap:8, alignItems:'center', marginBottom:10 }}>
                                <input className="input-field" value={r.name} placeholder="Resource name"
                                  onChange={e => setResource(li,ri,'name',e.target.value)}
                                  style={{ fontSize:'.82rem', padding:'8px 10px' }} />
                                <input className="input-field" value={r.url} placeholder="https://..."
                                  onChange={e => setResource(li,ri,'url',e.target.value)}
                                  style={{ fontSize:'.82rem', padding:'8px 10px' }} />
                                <button type="button" onClick={() => removeResource(li,ri)} className="btn-icon" style={{ color:'var(--rose)' }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {form.lessons.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:'.88rem' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📖</div>
                <p>No chapters yet. Click "+ Add Chapter" to create your first lesson.</p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display:'flex', gap:12, paddingBottom:40 }}>
            <button type="submit" disabled={saving} className="btn btn-grad btn-lg" style={{ minWidth:180 }}>
              {saving ? <><span className="spinner-sm" /> Saving...</> : editingCourse ? '✅ Update Course' : '🚀 Create Course'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setActiveTab('courses'); }} className="btn btn-secondary btn-lg">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default InstructorPage;
