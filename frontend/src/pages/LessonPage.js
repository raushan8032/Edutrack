import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

/* ═══════════════════════════════════════
   VIDEO URL CONVERTER — YouTube / Vimeo
═══════════════════════════════════════ */
const getDrivePreviewUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.hostname === 'drive.google.com') {
      const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const fileId = pathMatch?.[1] || parsed.searchParams.get('id');
      if (fileId) return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
};
const getEmbedUrl = (url) => {
  if (!url) return null;
  // Already an embed URL
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com')) return url;

  // YouTube: watch?v=  or  youtu.be/  or  youtube.com/shorts/
  const ytMatch =
    url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&autoplay=0`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?byline=0&portrait=0`;
  }

  // Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // Return original (direct iframe-able URL)
  return url;
};

/* ═══════════════════════════════════════
   AI ASSISTANT COMPONENT — Professional ChatGPT-like Interface
═══════════════════════════════════════ */

// Simple markdown renderer for AI responses
const renderMarkdown = (text) => {
  if (!text) return '';
  const safeText = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return safeText
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre style="background:var(--bg-elevated);border:1px solid var(--border-md);border-radius:8px;padding:12px 14px;overflow-x:auto;margin:8px 0;font-family:var(--font-mono);font-size:.78rem;color:var(--primary-light)">${code.trim()}</pre>`)
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 5px;border-radius:4px;font-family:var(--font-mono);font-size:.8em;color:var(--primary-light)">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:.9rem;font-weight:700;margin:12px 0 4px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:1rem;font-weight:700;margin:12px 0 6px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:800;margin:12px 0 8px">$1</h2>')
    .replace(/^[*-] (.+)$/gm, '<li style="margin:3px 0 3px 16px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, s => `<ul style="margin:6px 0">${s}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
};

const createInitialAiMessage = lessonTitle => ({
  role: 'bot',
  text: `Hi! I'm your **AI Study Assistant** 🤖\n\nI'm here to help you understand **"${lessonTitle}"**. I can:\n- Explain concepts step by step\n- Solve math and coding problems\n- Generate summaries and practice questions\n- Answer in **English or Hindi**\n\nAsk me anything!`
});

const AIAssistant = ({ courseId, lessonId, lessonTitle }) => {
  const initialMessage = createInitialAiMessage(lessonTitle);

  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // 'configured' | 'unconfigured' | null
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // Conversation history for multi-turn context (OpenAI format)
  const conversationHistory = useRef([]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, typing]);

  // Check AI configuration on mount
  useEffect(() => {
    axios.get('/api/ai/status').then(res => {
      setAiStatus(res.data.status);
    }).catch(() => setAiStatus(null));
  }, [courseId, lessonId]);

  // Reset on lesson change
  useEffect(() => {
    setMessages([createInitialAiMessage(lessonTitle)]);
    conversationHistory.current = [];
  }, [lessonId, lessonTitle]);

  const sendMessage = async (questionText) => {
    const userMsg = (questionText || input).trim();
    if (!userMsg) return;
    setInput('');

    const userEntry = { role: 'user', text: userMsg };
    setMessages(prev => [...prev, userEntry]);
    setTyping(true);

    const previousTurns = conversationHistory.current.slice(-10);
    conversationHistory.current.push({ role: 'user', content: userMsg });

    try {
      const response = await axios.post('/api/ai/ask', {
        courseId,
        lessonId,
        question: userMsg,
        conversationHistory: previousTurns
      });

      const botText = response.data.answer;
      const sources = response.data.sources || [];

      // Add assistant turn to history
      conversationHistory.current.push({ role: 'assistant', content: botText });

      setMessages(prev => [...prev, { role: 'bot', text: botText, sources }]);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'The assistant could not answer right now. Please try again.';
      setMessages(prev => [...prev, { role: 'bot', text: errMsg, isError: true }]);
      // Don't add error to history
      conversationHistory.current.pop();
    } finally {
      setTyping(false);
    }
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    'Explain this topic in simple terms',
    'Give me a real-world example',
    'Quiz me on this lesson',
    'Summarize key points',
    'I\'m confused, help me understand',
    'Show me a step-by-step solution'
  ];

  const clearChat = () => {
    setMessages([createInitialAiMessage(lessonTitle)]);
    conversationHistory.current = [];
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(16,185,129,.08), rgba(99,102,241,.06))',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12, background: 'var(--grad-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
          boxShadow: '0 4px 12px var(--primary-glow)'
        }}>🤖</div>

        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: '.9rem', fontFamily: 'var(--font-display)' }}>AI Study Assistant</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '.7rem' }}>
            {aiStatus?.configured
              ? `Powered by ${aiStatus.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} · ${aiStatus.model}`
              : 'Course-grounded answers available · add an API key for generated explanations'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {aiStatus?.configured
            ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
            : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 8px var(--gold-glow)' }} />
          }
          <span style={{ fontSize: '.7rem', color: aiStatus?.configured ? 'var(--success)' : 'var(--gold)' }}>
            {aiStatus?.configured ? 'Online' : 'Limited'}
          </span>
          <button type="button" onClick={clearChat}
            title="Clear conversation"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.75rem', padding: '3px 7px', borderRadius: 6, transition: 'all .15s' }}
            onMouseOver={e => e.target.style.color = 'var(--rose)'}
            onMouseOut={e => e.target.style.color = 'var(--text-muted)'}
          >🗑️</button>
          <button type="button" onClick={() => setIsExpanded(e => !e)}
            title={isExpanded ? 'Collapse' : 'Expand'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.75rem', padding: '3px 7px', borderRadius: 6 }}>
            {isExpanded ? '⊡' : '⊞'}
          </button>
        </div>
      </div>

      {/* ── API key warning ── */}
      {aiStatus && !aiStatus.configured && (
        <div style={{
          padding: '10px 16px', background: 'var(--gold-glow)',
          borderBottom: '1px solid rgba(245,158,11,.2)',
          fontSize: '.75rem', color: 'var(--gold)', display: 'flex', gap: 8, alignItems: 'center'
        }}>
          ⚠️ <span>No AI API key configured. Relevant course excerpts still work. Add <strong>GEMINI_API_KEY</strong> or <strong>OPENAI_API_KEY</strong> to the backend environment for generated explanations.</span>
        </div>
      )}

      {/* ── Chat messages ── */}
      <div
        ref={chatRef}
        style={{
          padding: '16px 16px 8px',
          height: isExpanded ? 480 : 300,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 2,
          transition: 'height .3s ease'
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            gap: 10, marginBottom: 12, alignItems: 'flex-end'
          }}>
            {/* Avatar */}
            {msg.role === 'bot' ? (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--grad-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.8rem', flexShrink: 0
              }}>🤖</div>
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--indigo)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.75rem', fontWeight: 800, color: 'white', flexShrink: 0
              }}>U</div>
            )}

            {/* Bubble */}
            <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                padding: msg.role === 'user' ? '10px 14px' : '12px 16px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, var(--primary), var(--indigo))'
                  : msg.isError ? 'var(--rose-glow)' : 'var(--bg-secondary)',
                border: msg.role === 'user'
                  ? 'none'
                  : msg.isError ? '1px solid rgba(244,63,94,.25)' : '1px solid var(--border)',
                color: msg.role === 'user' ? '#040810' : msg.isError ? 'var(--rose)' : 'var(--text-primary)',
                fontSize: '.85rem', lineHeight: 1.65
              }}>
                {msg.role === 'bot' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                    style={{ wordBreak: 'break-word' }}
                  />
                ) : (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                )}
              </div>

              {/* Sources */}
              {msg.sources?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {msg.sources.map((src, j) => (
                    <span key={j} style={{
                      fontSize: '.65rem', padding: '2px 7px', borderRadius: 4,
                      background: 'var(--primary-glow-sm)', color: 'var(--primary-light)',
                      border: '1px solid rgba(16,185,129,.15)'
                    }}>📎 {src}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', flexShrink: 0 }}>🤖</div>
            <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(k => (
                <span key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'block', animation: `dotBounce .8s ease ${k * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick prompts ── */}
      <div style={{ padding: '6px 14px', display: 'flex', gap: 5, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
        {quickPrompts.map(p => (
          <button key={p} type="button" onClick={() => sendMessage(p)} disabled={typing}
            style={{
              fontSize: '.7rem', padding: '4px 10px', borderRadius: 'var(--r-full)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-md)',
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all .15s',
              opacity: typing ? 0.5 : 1
            }}
            onMouseOver={e => { if (!typing) { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary-light)'; } }}
            onMouseOut={e => { e.target.style.borderColor = 'var(--border-md)'; e.target.style.color = 'var(--text-secondary)'; }}>
            {p}
          </button>
        ))}
      </div>

      {/* ── Input area ── */}
      <form onSubmit={handleFormSubmit} style={{
        padding: '10px 14px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'flex-end'
      }}>
        <textarea
          ref={inputRef}
          className="input-field"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this lesson... (Enter to send, Shift+Enter for new line)"
          style={{ flex: 1, fontSize: '.83rem', padding: '9px 12px', resize: 'none', minHeight: 40, maxHeight: 120 }}
          rows={1}
          disabled={typing}
        />
        <button type="submit" className="btn btn-primary btn-sm"
          disabled={!input.trim() || typing}
          style={{ flexShrink: 0, height: 40 }}>
          {typing ? '⏳' : '↑'}
        </button>
      </form>
      <div style={{ padding: '4px 14px 8px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>Enter to send · Shift+Enter for new line</span>
        <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>{conversationHistory.current.length / 2 | 0} turns</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   MAIN LESSON PAGE
═══════════════════════════════════════ */
const LessonPage = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('video'); // video | notes | quiz | ai
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [marking, setMarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfPreviewError, setPdfPreviewError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, progressRes, bookmarksRes] = await Promise.all([
          axios.get(`/api/courses/${courseId}`),
          axios.get(`/api/progress/${courseId}`).catch(() => ({ data: { progress: null } })),
          axios.get('/api/bookmarks').catch(() => ({ data: { bookmarks: [] } })),
        ]);
        const courseData = courseRes.data.course;
        setCourse(courseData);
        setProgress(progressRes.data.progress);
        const found = courseData.lessons?.find(l => l._id === lessonId);
        setLesson(found);
        const bookmarks = bookmarksRes.data.bookmarks || [];
        setIsBookmarked(bookmarks.some(b => b.lesson === lessonId));
      } catch {
        toast.error('Failed to load lesson');
        navigate(`/courses/${courseId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, lessonId, navigate]);

  // Reset state when lesson changes
  useEffect(() => {
    setActiveTab('video');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setPdfPreviewError(false);
  }, [lessonId]);

  const openPdf = () => {
    const pdfUrl = getDrivePreviewUrl(lesson?.notes?.pdfUrl);
    if (!pdfUrl) {
      toast.error('This PDF link is invalid. Ask the instructor to update it.');
      return;
    }
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const markComplete = async () => {
    setMarking(true);
    try {
      const timeSpent = Math.round((Date.now() - startTime) / 60000);
      const res = await axios.put(`/api/progress/${courseId}/lesson/${lessonId}`, { timeSpent: Math.max(1, timeSpent) });
      setProgress(res.data.progress);
      toast.success('✅ Lesson marked as complete!');
    } catch { toast.error('Failed to mark complete'); }
    finally { setMarking(false); }
  };

  const toggleBookmark = async () => {
    try {
      if (isBookmarked) {
        await axios.delete(`/api/bookmarks/${lessonId}`);
        setIsBookmarked(false);
        toast.info('Bookmark removed');
      } else {
        await axios.post('/api/bookmarks', {
          course: courseId, lesson: lessonId,
          lessonTitle: lesson?.title, courseTitle: course?.title, type: 'lesson'
        });
        setIsBookmarked(true);
        toast.success('🔖 Lesson bookmarked!');
      }
    } catch { toast.error('Failed to update bookmark'); }
  };

  const submitQuiz = async () => {
    if (Object.keys(quizAnswers).length < lesson.quiz.length) {
      return toast.error('Please answer all questions first');
    }
    let correct = 0;
    lesson.quiz.forEach((q, idx) => {
      if (parseInt(quizAnswers[idx]) === q.correctAnswer) correct++;
    });
    setQuizScore(correct);
    setQuizSubmitted(true);
    try {
      await axios.post(`/api/progress/${courseId}/quiz/${lessonId}`, {
        score: correct, totalQuestions: lesson.quiz.length
      });
      toast.success(`Quiz submitted! Score: ${Math.round((correct / lesson.quiz.length) * 100)}%`);
    } catch {}
  };

  const goToLesson = (id) => navigate(`/courses/${courseId}/lessons/${id}`);
  const goToNextLesson = () => {
    const idx = course?.lessons?.findIndex(l => l._id === lessonId);
    if (idx < course.lessons.length - 1) goToLesson(course.lessons[idx + 1]._id);
    else navigate(`/courses/${courseId}`);
  };
  const goToPrevLesson = () => {
    const idx = course?.lessons?.findIndex(l => l._id === lessonId);
    if (idx > 0) goToLesson(course.lessons[idx - 1]._id);
  };

  const downloadNotes = () => {
    if (!lesson?.notes?.textContent) return toast.info('No text notes available to download');
    const blob = new Blob([`# ${lesson.title}\n\n${lesson.notes.textContent}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${lesson.title.replace(/\s+/g, '_')}_notes.txt`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Notes downloaded!');
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>Loading lesson...</p>
    </div>
  );
  if (!lesson) return (
    <div className="card empty-state"><span className="empty-icon">📭</span><h3>Lesson not found</h3><Link to={`/courses/${courseId}`} className="btn btn-secondary">Back to Course</Link></div>
  );

  const isCompleted = progress?.completedLessons?.some(l => l.lesson?.toString() === lessonId);
  const isInstructorPreview = ['instructor', 'admin'].includes(user?.role) && course?.instructor?._id === user._id;
  const lessonIdx = course?.lessons?.findIndex(l => l._id === lessonId) ?? 0;
  const hasNext = lessonIdx < (course?.lessons?.length - 1);
  const hasPrev = lessonIdx > 0;
  const embedUrl = getEmbedUrl(lesson.videoUrl);
  const completedCount = progress?.completedLessons?.length || 0;
  const totalLessons = course?.lessons?.length || 0;
  const overallPct = progress?.overallProgress || 0;

  const filteredLessons = course?.lessons?.filter(l =>
    !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabDefs = [
    { id: 'video', label: '▶ Video', show: true },
    { id: 'notes', label: '📝 Notes', show: true },
    { id: 'quiz', label: `❓ Quiz (${lesson.quiz?.length || 0})`, show: lesson.quiz?.length > 0 },
    { id: 'ai', label: '🤖 AI Assistant', show: true },
  ];

  return (
    <div style={{ animation: 'fadeUp .5s ease' }}>
      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: '.83rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <Link to="/courses" style={{ color: 'var(--text-muted)', transition: 'color .15s' }} onMouseOver={e => e.target.style.color = 'var(--text-secondary)'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>Courses</Link>
        <span>›</span>
        <Link to={`/courses/${courseId}`} style={{ color: 'var(--text-muted)', transition: 'color .15s', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          onMouseOver={e => e.target.style.color = 'var(--text-secondary)'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>
          {course?.title}
        </Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{lesson.title}</span>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 22, alignItems: 'start' }}>

        {/* ════ LEFT: Main Content ════ */}
        <div>
          {/* Lesson Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-indigo">Lesson {lessonIdx + 1}</span>
                {lesson.duration > 0 && <span className="badge badge-sky">⏱ {lesson.duration} min</span>}
                {lesson.quiz?.length > 0 && <span className="badge badge-gold">❓ {lesson.quiz.length} Q</span>}
                {lesson.notes?.textContent && <span className="badge badge-violet">📝 Notes</span>}
                {lesson.notes?.pdfUrl && <span className="badge badge-rose">📄 PDF</span>}
                {isCompleted && <span className="badge badge-success">✅ Done</span>}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.3 }}>{lesson.title}</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {!isInstructorPreview && <button
                className={`btn-icon bookmark-btn ${isBookmarked ? 'active' : ''}`}
                onClick={toggleBookmark}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this lesson'}
                style={{ fontSize: '1rem', color: isBookmarked ? 'var(--gold)' : 'var(--text-muted)' }}
              >
                {isBookmarked ? '🔖' : '📌'}
              </button>}
              {hasPrev && <button onClick={goToPrevLesson} className="btn btn-secondary btn-sm">← Prev</button>}
              {hasNext && <button onClick={goToNextLesson} className="btn btn-secondary btn-sm">Next →</button>}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="tab-bar" style={{ marginBottom: 20 }}>
            {tabDefs.filter(t => t.show).map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── VIDEO TAB ── */}
          {activeTab === 'video' && (
            <div>
              {embedUrl ? (
                <div className="video-container">
                  <iframe
                    src={embedUrl}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="video-placeholder">
                  <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>🎬</div>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>Video Not Available</p>
                  <p style={{ fontSize: '.82rem' }}>The instructor hasn't added a video link yet.</p>
                </div>
              )}

              {/* Description */}
              {lesson.description && (
                <div className="card" style={{ padding: '18px 22px', marginBottom: 18 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.9rem', marginBottom: 10 }}>📖 About this lesson</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '.9rem' }}>{lesson.description}</p>
                </div>
              )}

              {/* Resources */}
              {lesson.resources?.length > 0 && (
                <div className="card" style={{ padding: '18px 22px', marginBottom: 18 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.9rem', marginBottom: 12 }}>📎 Resources</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lesson.resources.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                        background: 'var(--bg-secondary)', borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border)', color: 'var(--primary-light)',
                        fontSize: '.85rem', transition: 'all .15s',
                      }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <span>📎</span> {r.name} <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '.75rem' }}>↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {!isInstructorPreview && !isCompleted ? (
                  <button onClick={markComplete} disabled={marking} className="btn btn-primary">
                    {marking ? <><span className="spinner-sm" /> Saving...</> : '✅ Mark as Complete'}
                  </button>
                ) : !isInstructorPreview ? (
                  <button className="btn btn-secondary" disabled style={{ opacity: .6 }}>✅ Completed</button>
                ) : null}
                {lesson.quiz?.length > 0 && (
                  <button onClick={() => setActiveTab('quiz')} className="btn btn-indigo">❓ Take Quiz</button>
                )}
                {user?.role === 'student' && (
                  <Link to={`/doubts?courseId=${courseId}&lessonId=${lessonId}`} className="btn btn-secondary">
                    💬 Ask Instructor
                  </Link>
                )}
                {lesson.notes?.textContent && (
                  <button onClick={() => setActiveTab('notes')} className="btn btn-secondary">📝 View Notes</button>
                )}
                {hasNext && (
                  <button onClick={goToNextLesson} className="btn btn-gold">Next Lesson →</button>
                )}
              </div>
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {activeTab === 'notes' && (
            <div>
              {/* Notes header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>📝 Chapter Notes — {lesson.title}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={downloadNotes} className="btn btn-secondary btn-sm">↓ Download</button>
                  {lesson.notes?.pdfUrl && (
                    <button type="button" onClick={openPdf} className="btn btn-indigo btn-sm">📄 Open PDF</button>
                  )}
                </div>
              </div>

              {/* Summary box */}
              {lesson.notes?.summary && (
                <div style={{ padding: 16, background: 'linear-gradient(135deg,rgba(16,185,129,.08),rgba(99,102,241,.06))', borderRadius: 'var(--r-md)', border: '1px solid rgba(16,185,129,.2)', marginBottom: 18 }}>
                  <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>📌 Chapter Summary</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.7 }}>{lesson.notes.summary}</p>
                </div>
              )}

              {/* Text notes */}
              {lesson.notes?.textContent ? (
                <div className="notes-content" style={{ whiteSpace: 'pre-wrap' }}>
                  {lesson.notes.textContent}
                </div>
              ) : (
                <div className="card empty-state">
                  <span className="empty-icon">📝</span>
                  <h3>No text notes yet</h3>
                  <p>The instructor hasn't added text notes for this chapter. Check if a PDF is available above.</p>
                </div>
              )}

              {/* Embedded PDF */}
              {lesson.notes?.pdfUrl && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.9rem', marginBottom: 12 }}>📄 PDF Notes</h4>
                  {getDrivePreviewUrl(lesson.notes.pdfUrl) ? (
                    <iframe
                      src={getDrivePreviewUrl(lesson.notes.pdfUrl)}
                      className="pdf-frame"
                      title="PDF Notes"
                      onError={() => setPdfPreviewError(true)}
                    />
                  ) : (
                    <p role="alert" style={{ color: 'var(--rose)', marginBottom: 10 }}>This PDF link is invalid. Ask the instructor to update it.</p>
                  )}
                  {pdfPreviewError && (
                    <p role="alert" style={{ color: 'var(--rose)', marginTop: 10 }}>
                      The PDF preview could not load. The instructor must set Google Drive access to “Anyone with the link” as Viewer.
                    </p>
                  )}
                  <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginTop: 10 }}>
                    If Google Drive asks for access, the instructor needs to enable “Anyone with the link” as Viewer.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── QUIZ TAB ── */}
          {activeTab === 'quiz' && (
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--gold-glow)', border: '1px solid rgba(245,158,11,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>❓</div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem' }}>Chapter Quiz</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{lesson.quiz?.length || 0} questions · {lesson.title}</p>
                </div>
              </div>

              {lesson.quiz?.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🎓</span>
                  <h3>No quiz questions</h3>
                  <p>The instructor hasn't added quiz questions for this lesson yet.</p>
                </div>
              ) : !quizSubmitted ? (
                <>
                  {lesson.quiz.map((q, idx) => (
                    <div key={idx} style={{ marginBottom: 28, padding: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-md)' }}>
                      <p style={{ fontWeight: 700, marginBottom: 14, fontSize: '.95rem', display: 'flex', gap: 10 }}>
                        <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--grad-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', color: '#040810', fontWeight: 800, flexShrink: 0 }}>{idx + 1}</span>
                        {q.question}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {q.options.map((opt, oIdx) => {
                          const sel = quizAnswers[idx] === String(oIdx);
                          return (
                            <label key={oIdx} style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                              borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'all .15s',
                              background: sel ? 'rgba(16,185,129,.1)' : 'var(--bg-card)',
                              border: `1px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                            }}>
                              <input type="radio" name={`q${idx}`} value={oIdx}
                                checked={sel}
                                onChange={() => setQuizAnswers({ ...quizAnswers, [idx]: String(oIdx) })}
                                style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
                              <span style={{ fontSize: '.9rem' }}>{opt}</span>
                              {sel && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '.8rem' }}>✓</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={submitQuiz} className="btn btn-primary">Submit Quiz →</button>
                    <button onClick={() => setQuizAnswers({})} className="btn btn-secondary">Clear</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '4rem', marginBottom: 14 }}>
                    {quizScore === lesson.quiz.length ? '🏆' : quizScore >= lesson.quiz.length * 0.7 ? '🎉' : quizScore >= lesson.quiz.length * 0.5 ? '👍' : '📚'}
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 6 }}>
                    {quizScore} / {lesson.quiz.length} Correct
                  </h3>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{
                      fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)',
                      color: quizScore === lesson.quiz.length ? 'var(--success)' : quizScore >= lesson.quiz.length * 0.5 ? 'var(--gold)' : 'var(--rose)'
                    }}>
                      {Math.round((quizScore / lesson.quiz.length) * 100)}%
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '.9rem' }}>
                    {quizScore === lesson.quiz.length ? 'Perfect score! Outstanding work! 🌟' :
                      quizScore >= lesson.quiz.length * 0.7 ? 'Great job! Review the missed questions.' :
                        'Keep studying and try again. You can do it!'}
                  </p>
                  <div style={{ width: '70%', margin: '0 auto 28px' }}>
                    <div className="progress-bar" style={{ height: 10 }}>
                      <div className="progress-fill" style={{ width: `${Math.round((quizScore / lesson.quiz.length) * 100)}%` }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => { setQuizSubmitted(false); setQuizAnswers({}); }} className="btn btn-secondary">🔄 Retry</button>
                    {!isCompleted && <button onClick={markComplete} className="btn btn-primary">✅ Mark Complete</button>}
                    {hasNext && <button onClick={goToNextLesson} className="btn btn-gold">Next Lesson →</button>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AI ASSISTANT TAB ── */}
          {activeTab === 'ai' && <AIAssistant courseId={courseId} lessonId={lessonId} lessonTitle={lesson.title} />}
        </div>

        {/* ════ RIGHT: Lesson Sidebar ════ */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Course Progress */}
          {!isInstructorPreview && <div className="card card-sm">
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.88rem', marginBottom: 14 }}>📊 Course Progress</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 7 }}>
              <span>{completedCount} / {totalLessons} lessons</span>
              <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{overallPct}%</span>
            </div>
            <div className="progress-bar progress-bar-sm" style={{ marginBottom: 14 }}>
              <div className="progress-fill" style={{ width: `${overallPct}%` }} />
            </div>
            <p style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>
              {overallPct === 100 ? '🎉 Course complete!' : overallPct > 50 ? '🔥 More than halfway there!' : '💪 Keep going!'}
            </p>
          </div>}

          {/* Search Lessons */}
          {!isInstructorPreview && <div className="card card-sm">
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.88rem', marginBottom: 12 }}>📋 {course?.title}</h4>
            <input
              className="input-field" placeholder="🔍 Search lessons..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: '.8rem', padding: '8px 12px', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 320, overflowY: 'auto' }}>
              {filteredLessons?.map((l, idx) => {
                const done = progress?.completedLessons?.some(cl => cl.lesson?.toString() === l._id);
                const isCurrent = l._id === lessonId;
                return (
                  <Link key={l._id} to={`/courses/${courseId}/lessons/${l._id}`}
                    className={`lesson-nav-item ${isCurrent ? 'current' : done ? 'done' : ''}`}
                    style={{ color: isCurrent ? 'var(--primary-light)' : done ? 'var(--success)' : 'var(--text-secondary)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', background: isCurrent ? 'var(--primary)' : done ? 'var(--success-glow)' : 'var(--bg-elevated)', color: isCurrent ? '#040810' : done ? 'var(--success)' : 'var(--text-muted)', border: `1px solid ${isCurrent ? 'var(--primary)' : done ? 'rgba(34,197,94,.3)' : 'var(--border)'}` }}>
                      {done ? '✓' : isCurrent ? '▶' : course.lessons?.indexOf(l) + 1}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontSize: '.8rem' }}>{l.title}</span>
                      {l.duration > 0 && <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>⏱ {l.duration} min</span>}
                    </div>
                  </Link>
                );
              })}
              {filteredLessons?.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', textAlign: 'center', padding: '12px 0' }}>No lessons match</p>
              )}
            </div>
          </div>}

          {/* Quick Actions */}
          {!isInstructorPreview && <div className="card card-sm">
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.85rem', marginBottom: 12 }}>⚡ Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {!isCompleted && (
                <button onClick={markComplete} disabled={marking} className="btn btn-primary btn-sm" style={{ justifyContent: 'flex-start' }}>
                  ✅ Mark Complete
                </button>
              )}
              <button onClick={toggleBookmark} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', color: isBookmarked ? 'var(--gold)' : '' }}>
                {isBookmarked ? '🔖 Bookmarked' : '📌 Bookmark'}
              </button>
              {lesson.notes?.textContent && (
                <button onClick={downloadNotes} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                  ↓ Download Notes
                </button>
              )}
              {hasNext && (
                <button onClick={goToNextLesson} className="btn btn-gold btn-sm" style={{ justifyContent: 'flex-start' }}>
                  Next Lesson →
                </button>
              )}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
