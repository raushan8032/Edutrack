import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: '▶️', title: 'Smart Video Player', desc: 'YouTube, Vimeo, Google Drive — any video link auto-embeds instantly. Smooth, in-page playback with no redirects.', color: '#f43f5e', bg: 'rgba(244,63,94,.1)' },
  { icon: '📝', title: 'Chapter-Wise Notes', desc: 'Every chapter has dedicated text notes and PDF support. Download for offline study or view inline anytime.', color: '#10b981', bg: 'rgba(16,185,129,.1)' },
  { icon: '🤖', title: 'AI Study Assistant', desc: 'Stuck on a concept? Ask the built-in AI assistant for explanations, examples, and study tips — 24/7.', color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
  { icon: '🔖', title: 'Smart Bookmarks', desc: 'Save important lessons with a single click. Build your personal reference library across all courses.', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
  { icon: '❓', title: 'Chapter Quizzes', desc: 'Practice questions after every lesson with instant scoring, retries, and progress tracking.', color: '#0ea5e9', bg: 'rgba(14,165,233,.1)' },
  { icon: '📊', title: 'Progress Analytics', desc: 'Visual charts for weekly activity, quiz scores, study time, and completion streaks.', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' },
];

const howItWorks = [
  { n:'01', icon:'✍️', title:'Sign Up Free', desc:'Create an account as a student or instructor. No credit card. Takes 60 seconds.' },
  { n:'02', icon:'📚', title:'Enroll or Create', desc:'Students browse & enroll. Instructors build rich courses with videos, notes, and quizzes.' },
  { n:'03', icon:'🚀', title:'Learn & Track', desc:'Watch videos, read notes, take quizzes, and watch your progress chart grow daily.' },
];

const stats = [
  { v:'500+', l:'Courses', i:'📚' },
  { v:'12K+', l:'Learners', i:'🎓' },
  { v:'98%',  l:'Satisfaction', i:'⭐' },
  { v:'200+', l:'Instructors', i:'👨‍🏫' },
];

const testimonials = [
  { n:'Priya S.', r:'Full-Stack Developer', a:'P', c:'#10b981', t:'The AI assistant saved me so many hours. When I didn\'t understand a concept, it broke it down perfectly. EduTrack is now my go-to.', s:5 },
  { n:'Arun K.', r:'Instructor, 3 Courses', a:'A', c:'#6366f1', t:'The chapter notes system is brilliant. My students love having text notes alongside videos. Enrollment is up 40% since I started using it.', s:5 },
  { n:'Nisha R.', r:'Data Science Student', a:'N', c:'#f59e0b', t:'Bookmarks + downloadable notes = offline learning champion. I study on the train with downloaded notes every day!', s:5 },
];

const LandingPage = () => {
  const heroRef = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (!heroRef.current) return;
      const x = (e.clientX / window.innerWidth - .5) * 24;
      const y = (e.clientY / window.innerHeight - .5) * 24;
      const orbs = heroRef.current.querySelectorAll('.orb');
      if (orbs[0]) orbs[0].style.transform = `translate(${x}px,${y}px)`;
      if (orbs[1]) orbs[1].style.transform = `translate(${-x*.7}px,${-y*.7}px)`;
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  const Star = () => <span style={{ color:'#f59e0b', fontSize:'.9rem' }}>★</span>;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', overflowX:'hidden', paddingTop:'var(--navbar-h)' }}>


      {/* ═══ HERO ═══ */}
      <section ref={heroRef} style={{ minHeight:'92vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'80px 24px', position:'relative', overflow:'hidden' }}>
        {/* Orbs */}
        <div className="orb" style={{ top:'10%', left:'5%', width:600, height:600, background:'radial-gradient(circle,rgba(16,185,129,.12) 0%,transparent 70%)', transition:'transform .35s ease' }} />
        <div className="orb" style={{ bottom:'8%', right:'3%', width:700, height:700, background:'radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 70%)', transition:'transform .35s ease' }} />
        <div className="orb" style={{ top:'50%', left:'50%', width:400, height:400, background:'radial-gradient(circle,rgba(245,158,11,.05) 0%,transparent 70%)', transform:'translate(-50%,-50%)' }} />

        <div style={{ maxWidth:820, animation:'fadeUp .9s ease forwards', position:'relative', zIndex:1 }}>
          {/* Pill */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 18px', borderRadius:'var(--r-full)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', fontSize:'.82rem', fontWeight:600, color:'var(--primary-light)', marginBottom:28 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--primary)', display:'inline-block', animation:'pulse 2s ease infinite' }} />
            AI-Powered Learning Platform is Live
          </div>

          <h1 style={{ fontSize:'clamp(3rem,8vw,5.8rem)', fontFamily:'var(--font-display)', fontWeight:800, lineHeight:1.05, marginBottom:26, letterSpacing:'-.025em' }}>
            Learn Smarter with<br />
            <span className="grad-text">AI-Powered</span> Education
          </h1>

          <p style={{ color:'var(--text-secondary)', fontSize:'1.1rem', maxWidth:560, margin:'0 auto 44px', lineHeight:1.8 }}>
            Expert courses with embedded videos, chapter-wise notes, AI study assistant,
            quizzes, bookmarks, and real-time progress analytics — all in one platform.
          </p>

          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:52 }}>
            <Link to="/register" className="btn btn-grad btn-xl" style={{ padding:'15px 36px', fontSize:'1rem' }}>
              🚀 Start Learning Free
            </Link>
            <Link to="/login" className="btn btn-secondary btn-xl" style={{ padding:'15px 28px', fontSize:'1rem' }}>
              Sign In →
            </Link>
          </div>

          {/* Trust badges */}
          <div style={{ display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
            {['✅ Free to start','🎓 Expert instructors','🤖 AI assistant included','📱 Works on all devices'].map(t => (
              <span key={t} style={{ fontSize:'.78rem', color:'var(--text-muted)' }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={{ padding:'0 24px 80px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
          {stats.map(({v,l,i}) => (
            <div key={l} className="card card-gradient" style={{ textAlign:'center', padding:'28px 20px', border:'1px solid var(--border-md)' }}>
              <div style={{ fontSize:'1.8rem', marginBottom:8 }}>{i}</div>
              <div style={{ fontSize:'2.2rem', fontFamily:'var(--font-display)', fontWeight:800 }} className="grad-text">{v}</div>
              <div style={{ color:'var(--text-secondary)', fontSize:'.85rem', marginTop:4, fontWeight:500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding:'0 24px 100px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:60 }}>
          <h2 style={{ fontSize:'clamp(1.8rem,5vw,3rem)', fontFamily:'var(--font-display)', fontWeight:800, marginBottom:12 }}>
            Every tool you need to <span className="grad-text">excel</span>
          </h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'.95rem', maxWidth:500, margin:'0 auto' }}>
            Purpose-built features for students who want results and instructors who want impact.
          </p>
        </div>
        <div className="grid-3">
          {features.map(({icon,title,desc,color,bg},i) => (
            <div key={title} className="card card-glow" style={{ padding:28, animation:`fadeUp .6s ease ${i*.09}s both` }}>
              <div style={{ width:52, height:52, borderRadius:14, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', marginBottom:18, border:`1px solid ${color}25` }}>
                {icon}
              </div>
              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10, fontSize:'1rem', color:'var(--text-primary)' }}>{title}</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:'.87rem', lineHeight:1.75 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ padding:'0 24px 100px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontFamily:'var(--font-display)', fontWeight:800, marginBottom:12 }}>
            Up and running in <span className="grad-text-cool">3 steps</span>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:24 }}>
          {howItWorks.map(({n,icon,title,desc}) => (
            <div key={n} className="card" style={{ padding:'32px 28px', position:'relative', overflow:'hidden', border:'1px solid var(--border-md)' }}>
              <div style={{ position:'absolute', top:-8, right:-4, fontSize:'6rem', fontFamily:'var(--font-display)', fontWeight:900, color:'var(--border)', lineHeight:1, pointerEvents:'none', userSelect:'none' }}>{n}</div>
              <div style={{ width:46, height:46, borderRadius:14, background:'var(--grad-brand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', marginBottom:20 }}>{icon}</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10, fontSize:'1rem' }}>{title}</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:'.87rem', lineHeight:1.75 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={{ padding:'0 24px 100px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontFamily:'var(--font-display)', fontWeight:800, marginBottom:12 }}>
            Trusted by <span className="grad-text">thousands</span> of learners
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
          {testimonials.map(({n,r,a,c,t,s}) => (
            <div key={n} className="card card-glow" style={{ padding:28, border:'1px solid var(--border-md)' }}>
              <div style={{ display:'flex', gap:4, marginBottom:16 }}>
                {Array(s).fill(0).map((_,i) => <Star key={i} />)}
              </div>
              <p style={{ color:'var(--text-secondary)', fontSize:'.88rem', lineHeight:1.75, marginBottom:20, fontStyle:'italic' }}>"{t}"</p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:`linear-gradient(135deg,${c},${c}99)`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#040810', fontSize:'1rem' }}>{a}</div>
                <div>
                  <p style={{ fontWeight:700, fontSize:'.87rem' }}>{n}</p>
                  <p style={{ color:'var(--text-muted)', fontSize:'.75rem' }}>{r}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding:'80px 24px', textAlign:'center', background:'linear-gradient(135deg,rgba(16,185,129,.07) 0%,rgba(99,102,241,.05) 100%)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:620, margin:'0 auto' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:16 }}>🎓</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'clamp(2rem,5vw,3rem)', marginBottom:16, lineHeight:1.15 }}>
            Start your learning journey today
          </h2>
          <p style={{ color:'var(--text-secondary)', marginBottom:36, fontSize:'.97rem', lineHeight:1.7 }}>
            Join 12,000+ learners using EduTrack to master new skills, track progress,
            and reach their goals — completely free.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/register" className="btn btn-grad btn-xl">🚀 Create Free Account</Link>
            <Link to="/login" className="btn btn-secondary btn-xl">Sign In</Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding:'28px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14, borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'var(--grad-brand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem' }}>🎓</div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'.95rem' }}>Edu<span className="grad-text">Track</span></span>
        </div>
        <p style={{ color:'var(--text-muted)', fontSize:'.78rem' }}>© 2026 EduTrack · AI-Powered Learning Platform</p>
        <div style={{ display:'flex', gap:18 }}>
          {['Privacy','Terms','Support'].map(l => (
            <span key={l} style={{ color:'var(--text-muted)', fontSize:'.78rem', cursor:'pointer', transition:'color .15s' }}
              onMouseOver={e => e.target.style.color='var(--text-secondary)'}
              onMouseOut={e => e.target.style.color='var(--text-muted)'}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
