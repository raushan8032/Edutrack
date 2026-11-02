import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const STATUS_META = {
  pending:     { label: 'Pending',     color: 'var(--gold)',    bg: 'var(--gold-glow)',    icon: '⏳' },
  in_progress: { label: 'In Progress', color: 'var(--sky)',     bg: 'var(--sky-glow)',     icon: '🔄' },
  answered:    { label: 'Answered',    color: 'var(--primary)', bg: 'var(--primary-glow)', icon: '✅' },
  resolved:    { label: 'Resolved',    color: 'var(--success)', bg: 'var(--success-glow)', icon: '🎉' },
};

const PRIORITY_META = {
  low:    { label: 'Low',    color: 'var(--text-muted)',    icon: '▽' },
  normal: { label: 'Normal', color: 'var(--text-secondary)', icon: '◇' },
  high:   { label: 'High',   color: 'var(--gold)',          icon: '▲' },
  urgent: { label: 'Urgent', color: 'var(--rose)',          icon: '🔥' },
};

const fmtRelative = d => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

/* ─── Star Rating ─────────────────────────────────────────────────────────── */
const StarRating = ({ value, onChange, readonly = false }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        type="button"
        onClick={() => !readonly && onChange && onChange(n)}
        style={{
          background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer',
          fontSize: '1.2rem', color: n <= value ? 'var(--gold)' : 'var(--border-light)',
          transition: 'color .15s', padding: 1
        }}
      >★</button>
    ))}
  </div>
);

/* ─── Attachment Preview ─────────────────────────────────────────────────── */
const AttachmentChip = ({ att }) => {
  const icon = att.type === 'image' ? '🖼️' : att.type === 'pdf' ? '📄' : att.type === 'video' ? '🎥' : '🔗';
  return (
    <a
      href={att.url} target="_blank" rel="noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-md)',
        borderRadius: 'var(--r-full)', fontSize: '.72rem', color: 'var(--primary-light)',
        textDecoration: 'none', transition: 'all .15s'
      }}
      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
    >
      {icon} {att.name}
    </a>
  );
};

/* ─── Message Bubble ─────────────────────────────────────────────────────── */
const MessageBubble = ({ msg, userId }) => {
  const isMe = msg.sender?._id === userId || msg.sender === userId;
  const isInstructor = msg.senderRole === 'instructor' || msg.senderRole === 'admin';
  const initials = (msg.sender?.name || (isInstructor ? 'I' : 'S')).slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: 'flex', gap: 10, flexDirection: isMe ? 'row-reverse' : 'row',
      alignItems: 'flex-end', marginBottom: 12
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isInstructor ? 'var(--grad-cool)' : 'var(--grad-brand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.68rem', fontWeight: 800, color: '#040810'
      }}>{initials}</div>

      {/* Content */}
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: isMe ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: '.72rem', fontWeight: 700, color: isInstructor ? 'var(--sky)' : 'var(--primary-light)' }}>
            {msg.sender?.name || (isInstructor ? 'Instructor' : 'Student')}
          </span>
          {isInstructor && <span style={{ fontSize: '.65rem', padding: '1px 6px', background: 'var(--sky-glow)', color: 'var(--sky)', borderRadius: 4 }}>Instructor</span>}
          <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>{fmtRelative(msg.createdAt)}</span>
        </div>

        <div style={{
          padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isMe ? 'rgba(16,185,129,.12)' : 'var(--bg-secondary)',
          border: `1px solid ${isMe ? 'rgba(16,185,129,.2)' : 'var(--border)'}`,
          whiteSpace: 'pre-wrap', fontSize: '.85rem', lineHeight: 1.6, color: 'var(--text-primary)'
        }}>
          {msg.text}
        </div>

        {/* Attachments */}
        {msg.attachments?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {msg.attachments.map((a, i) => <AttachmentChip key={i} att={a} />)}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Attachment Input ──────────────────────────────────────────────────────── */
const AttachmentInput = ({ attachments, setAttachments }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('link');

  const add = () => {
    if (!url.trim() || !name.trim()) return;
    setAttachments(prev => [...prev, { url: url.trim(), name: name.trim(), type }]);
    setUrl(''); setName('');
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {attachments.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AttachmentChip att={a} />
            <button type="button" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
              style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: '.8rem', padding: 0 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input className="input-field" placeholder="Attachment name" value={name}
          onChange={e => setName(e.target.value)} style={{ flex: 1, fontSize: '.78rem', padding: '7px 10px' }} />
        <input className="input-field" placeholder="URL (image/PDF/link)" value={url}
          onChange={e => setUrl(e.target.value)} style={{ flex: 2, fontSize: '.78rem', padding: '7px 10px' }} />
        <select className="input-field" value={type} onChange={e => setType(e.target.value)}
          style={{ width: 'auto', fontSize: '.78rem', padding: '7px 10px' }}>
          <option value="link">Link</option>
          <option value="image">Image</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
        </select>
        <button type="button" onClick={add} className="btn btn-secondary btn-sm" disabled={!url.trim() || !name.trim()}>
          + Add
        </button>
      </div>
    </div>
  );
};

/* ─── References Panel ──────────────────────────────────────────────────────── */
const ReferencesPanel = ({ doubtId, references, isInstructor, onUpdate }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('link');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const addRef = async () => {
    if (!title.trim() || !url.trim()) return;
    setAdding(true);
    try {
      const res = await axios.post(`/api/doubts/${doubtId}/references`, { title: title.trim(), url: url.trim(), type });
      onUpdate(res.data.references);
      setTitle(''); setUrl(''); setShowForm(false);
      toast.success('Reference added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add reference');
    } finally { setAdding(false); }
  };

  if (!references?.length && !isInstructor) return null;

  return (
    <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>📚 Reference Materials</span>
        {isInstructor && (
          <button type="button" onClick={() => setShowForm(s => !s)}
            className="btn btn-secondary btn-sm" style={{ fontSize: '.72rem', padding: '3px 10px' }}>
            + Add
          </button>
        )}
      </div>
      {references?.map((r, i) => (
        <a key={i} href={r.url} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 5, background: 'var(--bg-card)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', color: 'var(--primary-light)', fontSize: '.82rem', textDecoration: 'none' }}>
          {r.type === 'video' ? '🎥' : r.type === 'pdf' ? '📄' : '🔗'} {r.title}
          <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--text-muted)' }}>↗</span>
        </a>
      ))}
      {showForm && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input className="input-field" placeholder="Resource title" value={title}
            onChange={e => setTitle(e.target.value)} style={{ fontSize: '.8rem', padding: '8px 10px' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input-field" placeholder="URL" value={url}
              onChange={e => setUrl(e.target.value)} style={{ flex: 1, fontSize: '.8rem', padding: '8px 10px' }} />
            <select className="input-field" value={type} onChange={e => setType(e.target.value)}
              style={{ width: 'auto', fontSize: '.8rem', padding: '8px 10px' }}>
              <option value="link">Link</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <button type="button" onClick={addRef} disabled={adding} className="btn btn-primary btn-sm">
            {adding ? 'Adding…' : 'Add Reference'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Stats Bar (instructor) ─────────────────────────────────────────────── */
const StatsBar = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
    {[
      { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
      { label: 'Pending', value: stats.pending, color: 'var(--gold)' },
      { label: 'In Progress', value: stats.in_progress ?? 0, color: 'var(--sky)' },
      { label: 'Answered', value: stats.answered, color: 'var(--primary-light)' },
      { label: 'Resolved', value: stats.resolved, color: 'var(--success)' },
    ].map(s => (
      <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value ?? 0}</div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
      </div>
    ))}
  </div>
);

/* ─── Doubt Card ─────────────────────────────────────────────────────────── */
const DoubtCard = ({ doubt, userId, isInstructor, onUpdate, onStatusChange, onPriorityChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const chatRef = useRef(null);

  const meta = STATUS_META[doubt.status] || STATUS_META.pending;
  const priMeta = PRIORITY_META[doubt.priority] || PRIORITY_META.normal;
  const isOwner = doubt.student?._id === userId;
  const canReply = doubt.status !== 'resolved';
  const canRate = isOwner && doubt.status === 'resolved' && !doubt.studentRating;

  useEffect(() => {
    if (expanded && chatRef.current) {
      setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  }, [expanded, doubt.messages?.length]);

  const sendReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/doubts/${doubt._id}/messages`, {
        text,
        attachments: replyAttachments
      });
      setReplyText('');
      setReplyAttachments([]);
      setShowAttachForm(false);
      onUpdate(res.data.doubt);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally { setSending(false); }
  };

  const submitRating = async () => {
    if (!rating) return toast.error('Please select a star rating');
    setSubmittingRating(true);
    try {
      await axios.post(`/api/doubts/${doubt._id}/rate`, { rating, feedback: ratingFeedback });
      toast.success('Thank you for your feedback!');
      setShowRating(false);
      onUpdate({ ...doubt, studentRating: rating, studentFeedback: ratingFeedback });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally { setSubmittingRating(false); }
  };

  return (
    <article className="card" style={{ padding: 0, overflow: 'hidden', transition: 'all .25s' }}>
      {/* ── Header ── */}
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              {/* Status badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px',
                borderRadius: 'var(--r-full)', fontSize: '.68rem', fontWeight: 700,
                background: meta.bg, color: meta.color
              }}>{meta.icon} {meta.label}</span>

              {/* Priority badge */}
              <span style={{ fontSize: '.68rem', color: priMeta.color, fontWeight: 700 }}>
                {priMeta.icon} {priMeta.label}
              </span>

              {/* Rating */}
              {doubt.studentRating > 0 && (
                <span style={{ fontSize: '.7rem', color: 'var(--gold)' }}>
                  {'★'.repeat(doubt.studentRating)} <span style={{ color: 'var(--text-muted)' }}>rated</span>
                </span>
              )}
            </div>

            {/* Lesson + topic */}
            <h3 style={{ fontSize: '.92rem', fontWeight: 700, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doubt.lessonTitle}
              {doubt.topic && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> · {doubt.topic}</span>}
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '.78rem' }}>
              <span style={{ color: 'var(--primary-light)' }}>{doubt.course?.title}</span>
              {isInstructor && doubt.student?.name && <> · <span style={{ color: 'var(--text-muted)' }}>by {doubt.student.name}</span></>}
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{fmtRelative(doubt.updatedAt)}</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Message count */}
            <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              💬 {doubt.messages?.length || 0}
            </span>

            {/* Instructor controls */}
            {isInstructor && (
              <select
                value={doubt.status}
                onClick={e => e.stopPropagation()}
                onChange={e => onStatusChange(doubt._id, e.target.value)}
                style={{ fontSize: '.72rem', padding: '4px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            )}

            <span style={{ color: 'var(--text-muted)', transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none', fontSize: '.8rem' }}>▼</span>
          </div>
        </div>
      </div>

      {/* ── Expanded Body ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', animation: 'fadeIn .2s ease' }}>
          {/* Messages */}
          <div ref={chatRef} style={{ padding: '16px 20px', maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(doubt.messages || []).map((msg, i) => (
              <MessageBubble key={msg._id || i} msg={msg} userId={userId} />
            ))}
          </div>

          {/* References */}
          <div style={{ padding: '0 20px' }}>
            <ReferencesPanel
              doubtId={doubt._id}
              references={doubt.references}
              isInstructor={isInstructor}
              onUpdate={refs => onUpdate({ ...doubt, references: refs })}
            />
          </div>

          {/* Instructor priority selector */}
          {isInstructor && (
            <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRIORITY:</span>
              {Object.entries(PRIORITY_META).map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => onPriorityChange(doubt._id, k)}
                  style={{
                    padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer',
                    background: doubt.priority === k ? v.color : 'transparent',
                    color: doubt.priority === k ? '#040810' : v.color,
                    border: `1px solid ${v.color}`, transition: 'all .15s'
                  }}>{v.icon} {v.label}</button>
              ))}
            </div>
          )}

          {/* Reply Area */}
          {canReply && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <textarea
                className="input-field"
                rows={3}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={isInstructor ? 'Write a detailed reply... (supports markdown)' : 'Add a follow-up question or clarification...'}
                style={{ marginBottom: 8, resize: 'vertical' }}
                maxLength={5000}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (replyText.trim()) sendReply();
                  }
                }}
              />

              {showAttachForm && (
                <AttachmentInput attachments={replyAttachments} setAttachments={setReplyAttachments} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button type="button"
                  onClick={() => setShowAttachForm(s => !s)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.78rem' }}>
                  📎 {showAttachForm ? 'Hide attachments' : 'Add attachment'}
                </button>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>Ctrl+Enter to send</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={sending || !replyText.trim()}
                    onClick={sendReply}
                  >
                    {sending ? 'Sending…' : isInstructor ? '📤 Send Reply' : '📤 Follow-up'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student rating */}
          {canRate && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--gold-glow)' }}>
              {!showRating ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '.82rem', color: 'var(--text-secondary)' }}>Was your doubt resolved satisfactorily?</span>
                  <button type="button" className="btn btn-gold btn-sm" onClick={() => setShowRating(true)}>⭐ Rate Answer</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <StarRating value={rating} onChange={setRating} />
                  <textarea className="input-field" rows={2} value={ratingFeedback}
                    onChange={e => setRatingFeedback(e.target.value)}
                    placeholder="Optional feedback for your instructor..." />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-gold btn-sm" disabled={submittingRating || !rating} onClick={submitRating}>
                      {submittingRating ? 'Submitting…' : 'Submit Rating'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRating(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolved show rating */}
          {doubt.status === 'resolved' && doubt.studentRating > 0 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Student rated:</span>
              <StarRating value={doubt.studentRating} readonly />
              {doubt.studentFeedback && <span style={{ fontSize: '.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{doubt.studentFeedback}"</span>}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

/* ─── New Doubt Form ─────────────────────────────────────────────────────── */
const NewDoubtForm = ({ courses, onCreated, initialCourseId, initialLessonId }) => {
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [priority, setPriority] = useState('normal');
  const [attachments, setAttachments] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!courses.length) return;
    const selectedCourse = courses.find(course => course._id === courseId)
      || courses.find(course => course._id === initialCourseId)
      || courses[0];
    const selectedLesson = selectedCourse.lessons?.find(lesson => lesson._id === lessonId)
      || (selectedCourse._id === initialCourseId && selectedCourse.lessons?.find(lesson => lesson._id === initialLessonId))
      || selectedCourse.lessons?.[0];
    setCourseId(selectedCourse._id);
    setLessonId(selectedLesson?._id || '');
  }, [courses, courseId, lessonId, initialCourseId, initialLessonId]);

  const selectedCourse = courses.find(c => c._id === courseId);

  const submit = async e => {
    e.preventDefault();
    if (!courseId || !lessonId || !text.trim()) return;
    setSending(true);
    try {
      const res = await axios.post('/api/doubts', { courseId, lessonId, text: text.trim(), topic: topic.trim(), priority, attachments });
      setText(''); setTopic(''); setAttachments([]); setShowAttach(false);
      toast.success('✅ Your doubt was sent to the instructor!');
      onCreated(res.data.doubt);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send your doubt');
    } finally { setSending(false); }
  };

  return (
    <form className="card" onSubmit={submit} style={{ padding: 22, marginBottom: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 32, height: 32, background: 'var(--grad-brand)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>💬</span>
        Ask Your Instructor
      </h2>

      {courses.length === 0 && (
        <p role="status" style={{ color: 'var(--text-muted)', marginBottom: 14 }}>
          No published courses are available to contact yet. You can draft your question below; select a course before sending it.
        </p>
      )}
      <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div className="input-group">
              <label htmlFor="doubt-course">Course</label>
              <select id="doubt-course" className="input-field" value={courseId} disabled={!courses.length} onChange={e => {
                const selected = courses.find(c => c._id === e.target.value);
                setCourseId(e.target.value);
                setLessonId(selected?.lessons?.[0]?._id || '');
              }}>
                {!courses.length && <option value="">No published courses</option>}
                {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
              {selectedCourse?.instructor?.name && (
                <span style={{ display: 'block', marginTop: 5, color: 'var(--text-muted)', fontSize: '.74rem' }}>
                  Sent directly to {selectedCourse.instructor.name}
                </span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="doubt-lesson">Lesson / Chapter</label>
              <select id="doubt-lesson" className="input-field" value={lessonId} disabled={!selectedCourse?.lessons?.length} onChange={e => setLessonId(e.target.value)}>
                {!selectedCourse?.lessons?.length && <option value="">No chapters available</option>}
                {(selectedCourse?.lessons || []).map((l, i) => (
                  <option key={l._id} value={l._id}>Chapter {i + 1} — {l.title}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="doubt-priority">Priority</label>
              <select id="doubt-priority" className="input-field" value={priority} onChange={e => setPriority(e.target.value)}>
                {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label htmlFor="doubt-topic">Topic (optional)</label>
            <input id="doubt-topic" className="input-field" value={topic} maxLength={200}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Arrays, SQL Joins, Recursion..." />
          </div>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label htmlFor="doubt-question">Your Doubt *</label>
            <textarea id="doubt-question" className="input-field" rows={5} value={text}
              maxLength={5000} onChange={e => setText(e.target.value)}
              placeholder="Describe your doubt in detail. The more specific you are, the better the response you'll get..." />
            <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>{text.length}/5000</span>
          </div>

          {showAttach && (
            <div style={{ marginBottom: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>📎 Add attachments (screenshots, PDFs, links):</p>
              <AttachmentInput attachments={attachments} setAttachments={setAttachments} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" disabled={sending || !lessonId || !text.trim()}>
              {sending ? <><span className="spinner-sm" /> Sending…</> : '📤 Send to Instructor'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAttach(s => !s)}>
              📎 {showAttach ? 'Hide' : 'Add Attachment'}
            </button>
          </div>
        </>
    </form>
  );
};

/* ─── Main DoubtsPage ────────────────────────────────────────────────────── */
const DoubtsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';
  const initialLessonId = searchParams.get('lessonId') || '';
  const isInstructor = ['instructor', 'admin'].includes(user?.role);
  const [courses, setCourses] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      if (isInstructor) {
        const [doubtsRes, statsRes] = await Promise.all([
          axios.get('/api/doubts/instructor'),
          axios.get('/api/doubts/stats').catch(() => ({ data: { stats: {} } }))
        ]);
        setDoubts(doubtsRes.data.doubts || []);
        setStats(statsRes.data.stats || null);
      } else {
        const [coursesRes, doubtsRes] = await Promise.all([
          axios.get('/api/doubts/courses'),
          axios.get('/api/doubts/mine')
        ]);
        setCourses(coursesRes.data.courses || []);
        setDoubts(doubtsRes.data.doubts || []);
      }
    } catch (err) {
      if (showSpinner) toast.error(err.response?.data?.message || 'Could not load doubts');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [isInstructor]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(false), 20000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleStatusChange = async (doubtId, status) => {
    try {
      await axios.patch(`/api/doubts/${doubtId}/status`, { status });
      setDoubts(ds => ds.map(d => d._id === doubtId ? { ...d, status } : d));
      toast.success(`Marked as ${STATUS_META[status]?.label}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (doubtId, priority) => {
    try {
      await axios.patch(`/api/doubts/${doubtId}/priority`, { priority });
      setDoubts(ds => ds.map(d => d._id === doubtId ? { ...d, priority } : d));
      toast.success(`Priority set to ${PRIORITY_META[priority]?.label}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update priority');
    }
  };

  const handleDoubtUpdate = updatedDoubt => {
    setDoubts(ds => ds.map(d => d._id === updatedDoubt._id ? updatedDoubt : d));
  };

  const handleNewDoubt = newDoubt => {
    setDoubts(ds => [newDoubt, ...ds]);
  };

  // Filter + sort
  const visibleDoubts = doubts
    .filter(d => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || d.priority === priorityFilter;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || [
        d.course?.title, d.lessonTitle, d.topic,
        d.student?.name,
        ...(d.messages || []).map(m => m.text)
      ].some(v => v?.toLowerCase().includes(q));
      return matchStatus && matchPriority && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const po = { urgent: 4, high: 3, normal: 2, low: 1 };
        return (po[b.priority] || 2) - (po[a.priority] || 2);
      }
      if (sortBy === 'status') {
        const so = { pending: 4, in_progress: 3, answered: 2, resolved: 1 };
        return (so[a.status] || 2) - (so[b.status] || 2);
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt); // recent
    });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ animation: 'fadeUp .4s ease' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: 8 }}>
          {isInstructor ? 'Student' : 'Ask Your'} <span className="grad-text">Doubts</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isInstructor
            ? 'Review, prioritize, and resolve student questions from all your courses.'
            : 'Ask questions directly to your course instructor and track your conversations.'}
        </p>
      </div>

      {/* ── Stats (instructor only) ── */}
      {isInstructor && stats && <StatsBar stats={stats} />}

      {/* ── New Doubt Form (student) ── */}
      {!isInstructor && (
        <NewDoubtForm
          courses={courses}
          onCreated={handleNewDoubt}
          initialCourseId={initialCourseId}
          initialLessonId={initialLessonId}
        />
      )}

      {/* ── Doubts List ── */}
      <section>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', margin: 0, marginRight: 'auto' }}>
            {isInstructor ? '📬 Doubt Inbox' : '📋 My Doubts'}
            <span style={{ color: 'var(--text-muted)', fontSize: '.78rem', fontWeight: 500, marginLeft: 6 }}>
              ({doubts.length})
            </span>
          </h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadData()}>↻ Refresh</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            className="input-field"
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search course, lesson, topic, or message..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select className="input-field" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            style={{ width: 'auto' }}>
            <option value="all">All Priorities</option>
            {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select className="input-field" value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ width: 'auto' }}>
            <option value="recent">Sort: Recent</option>
            <option value="priority">Sort: Priority</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        {/* Doubt cards */}
        {visibleDoubts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleDoubts.map(doubt => (
              <DoubtCard
                key={doubt._id}
                doubt={doubt}
                userId={user?._id}
                isInstructor={isInstructor}
                onUpdate={handleDoubtUpdate}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
              />
            ))}
          </div>
        ) : (
          <div className="card empty-state" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>
              {doubts.length === 0 ? (isInstructor ? '📭' : '💬') : '🔍'}
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 6 }}>
              {doubts.length === 0
                ? (isInstructor ? 'No student doubts yet' : 'No doubts submitted yet')
                : 'No matching doubts'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
              {doubts.length === 0
                ? (isInstructor ? 'Student questions will appear here in real-time.' : 'Start by asking your instructor a question above!')
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default DoubtsPage;