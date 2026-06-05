import React, { useState, useEffect, useRef, useCallback } from 'react';
import SwarmGraph from './components/SwarmGraph';
import OutputPanel from './components/OutputPanel';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const EXAMPLES = [
  "Customer feedback SaaS portal with auth & analytics",
  "Leave management system with approval workflows",
  "REST API for food delivery with driver tracking",
  "Real-time inventory system for e-commerce",
];

const AGENT_NAMES = ['Director','Planner','Architect','Risk','Developer','Security','QA','Compliance','Deploy'];

function formatTime(s) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function ScoreCell({ label, value, color }) {
  const c = value == null ? 'var(--text-3)' : color || (
    value >= 85 ? 'var(--green)' : value >= 70 ? 'var(--yellow)' : 'var(--red)'
  );
  return (
    <div className="score-cell">
      <div className="score-value" style={{color: c}}>{value ?? '—'}</div>
      <div className="score-label">{label}</div>
    </div>
  );
}

function EventItem({ event }) {
  const ts = new Date(event.ts * 1000).toLocaleTimeString('en',{hour12:false,
    hour:'2-digit',minute:'2-digit',second:'2-digit'});
  return (
    <div className="event-item">
      <div className="event-dot" style={{background: event.color || '#4A5468'}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
          <span className="event-agent" style={{color: event.color || 'var(--text-2)'}}>
            {event.agent}
          </span>
          <span className={`event-type ${event.type}`}>{event.type}</span>
          <span className="event-ts">{ts}</span>
        </div>
        <div className="event-message">{event.message}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState('landing');
  const [req, setReq] = useState('');
  const [events, setEvents] = useState([]);
  const [report, setReport] = useState(null);
  const [agentStates, setAgentStates] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [completedAgents, setCompletedAgents] = useState(0);

  const feedRef = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const esRef = useRef(null);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const handleLaunch = useCallback(async () => {
    if (!req.trim() || phase === 'running') return;
    setPhase('running');
    setEvents([]);
    setReport(null);
    setAgentStates({});
    setError(null);
    setElapsed(0);
    setCompletedAgents(0);
    startRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    try {
      const res = await fetch(`${API}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement: req }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const { run_id } = await res.json();

      const es = new EventSource(`${API}/api/stream/${run_id}`);
      esRef.current = es;

      es.onmessage = (e) => {
        const ev = JSON.parse(e.data);

        if (ev.type === 'report') {
          setReport(ev.data);
        } else if (ev.type === 'done') {
          setPhase('complete');
          clearInterval(timerRef.current);
          es.close();
        } else {
          setEvents(prev => [...prev, ev]);
          setAgentStates(prev => {
            const next = { ...prev };
            const current = prev[ev.agent];
            if (ev.type === 'result') {
              if (current?.status !== 'done') {
                setCompletedAgents(c => c + 1);
              }
              next[ev.agent] = { status: 'done', color: ev.color };
            } else if (ev.type === 'error') {
              next[ev.agent] = { status: 'failed', color: ev.color };
            } else {
              if (current?.status !== 'done') {
                next[ev.agent] = { status: 'active', color: ev.color };
              }
            }
            return next;
          });
        }
      };

      es.onerror = () => {
        es.close();
        clearInterval(timerRef.current);
      };
    } catch (err) {
      setError(err.message);
      setPhase('landing');
      clearInterval(timerRef.current);
    }
  }, [req, phase]);

  const handleReset = () => {
    esRef.current?.close();
    clearInterval(timerRef.current);
    setPhase('landing');
    setEvents([]);
    setReport(null);
    setAgentStates({});
    setElapsed(0);
    setReq('');
  };

  const scores = report?.scores;
  const activeAgents = Object.values(agentStates).filter(s => s.status === 'active').length;

  // LANDING PHASE
  if (phase === 'landing') {
    return (
      <div className="app-layout">
        <header className="header">
          <div className="logo">FORGE <span>/ AI SOFTWARE FACTORY</span></div>
          <div className="header-status">
            <div className="status-dot idle"/>
            <span>IDLE</span>
            <span style={{color:'var(--border-bright)'}}>|</span>
            <span>9 AGENTS READY</span>
          </div>
        </header>
        <div className="landing">
          <div className="landing-grid"/>
          <div className="landing-content">
            <div className="landing-hero">
              <h1>FORGE</h1>
              <p>FROM REQUIREMENT TO PRODUCTION — AUTONOMOUSLY</p>
            </div>
            <div className="agent-badges">
              {AGENT_NAMES.map(n => (
                <span key={n} className="agent-badge">{n}</span>
              ))}
            </div>
            <div className="input-box">
              <textarea
                rows={3}
                placeholder="Describe what you want to build... e.g. Build a SaaS customer feedback portal with authentication, analytics dashboard, and role-based access control"
                value={req}
                onChange={e => setReq(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleLaunch(); }}
              />
              <div className="input-footer">
                <div className="examples">
                  {EXAMPLES.map((ex,i) => (
                    <span key={i} className="example-chip" onClick={() => setReq(ex)}>
                      {ex.slice(0,38)}{ex.length>38?'…':''}
                    </span>
                  ))}
                </div>
                <button className="launch-btn" onClick={handleLaunch} disabled={!req.trim()}>
                  <span className="launch-icon">⬡</span>
                  LAUNCH SWARM
                </button>
              </div>
            </div>
            {error && (
              <div style={{color:'var(--red)',fontFamily:'var(--mono)',fontSize:12,
                padding:'8px 16px',background:'rgba(248,113,113,0.1)',borderRadius:6,
                border:'1px solid rgba(248,113,113,0.3)'}}>
                ✗ {error}
              </div>
            )}
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text-3)',textAlign:'center'}}>
              ⌘↵ to launch · Agent swarm will plan → architect → code → secure → test → deploy
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RUNNING + COMPLETE PHASE
  const progress = Math.round((completedAgents / AGENT_NAMES.length) * 100);

  return (
    <div className="app-layout">
      <header className="header">
        <div className="logo">FORGE <span>/ AI SOFTWARE FACTORY</span></div>
        <div className="header-status">
          <div className={`status-dot ${phase === 'running' ? 'running' : ''}`}
            style={phase === 'complete' ? {background:'var(--cyan)'} : {}}/>
          <span style={{color: phase === 'complete' ? 'var(--cyan)' : 'var(--green)'}}>
            {phase === 'running' ? 'RUNNING' : 'COMPLETE'}
          </span>
          <span style={{color:'var(--border-bright)'}}>|</span>
          <span>{formatTime(elapsed)}</span>
          <span style={{color:'var(--border-bright)'}}>|</span>
          <span>{completedAgents}/{AGENT_NAMES.length} agents</span>
          {/* Progress bar */}
          <div style={{width:80,height:4,background:'var(--bg-3)',borderRadius:2,overflow:'hidden'}}>
            <div style={{width:`${progress}%`,height:'100%',
              background:`linear-gradient(90deg,var(--orange),var(--cyan))`,
              transition:'width 0.5s ease',borderRadius:2}}/>
          </div>
          <button onClick={handleReset}
            style={{padding:'4px 12px',background:'var(--bg-3)',border:'1px solid var(--border)',
              borderRadius:4,color:'var(--text-2)',fontSize:11,fontFamily:'var(--mono)',cursor:'pointer'}}>
            ← RESET
          </button>
        </div>
      </header>

      {/* Completion banner */}
      {phase === 'complete' && report && (
        <div className="completion-banner animate-float-in">
          <span className={`badge-pill ${report.badge}`}>{report.badge?.replace(/_/g,' ')}</span>
          <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text-1)'}}>
            {report.project_name} · {(report.generated_files||[]).length} files ·
            Score {scores?.overall}/100 · {report.deployment?.url && (
              <a href={report.deployment.url} target="_blank" rel="noopener noreferrer"
                style={{color:'var(--cyan)',textDecoration:'none'}}>
                {report.deployment.url}
              </a>
            )}
          </span>
        </div>
      )}

      <div className="workspace" style={{height: phase==='complete'&&report ? 'calc(100% - 52px - 44px)' : 'calc(100% - 52px)'}}>
        {/* Left: Swarm + Scores */}
        <div className="left-panel">
          <div className="panel-header">
            <span>AGENT SWARM</span>
            <span style={{color: activeAgents > 0 ? 'var(--green)' : 'var(--text-3)'}}>
              {activeAgents > 0 ? `${activeAgents} ACTIVE` : phase === 'complete' ? 'IDLE' : 'SPAWNING'}
            </span>
          </div>
          <div className="swarm-container">
            <SwarmGraph agentStates={agentStates}/>
          </div>
          <div className="scores-row">
            <ScoreCell label="OVERALL" value={scores?.overall} color={
              scores?.overall >= 85 ? 'var(--green)' : scores?.overall >= 70 ? 'var(--yellow)' : 'var(--red)'}/>
            <ScoreCell label="QUALITY" value={scores?.quality}/>
            <ScoreCell label="SECURITY" value={scores?.security}/>
            <ScoreCell label="COMPLY" value={scores?.compliance}/>
          </div>
        </div>

        {/* Right: Event feed + Output */}
        <div className="right-panel">
          <div className="panel-header">
            <span>LIVE AGENT FEED</span>
            <span>{events.length} EVENTS</span>
          </div>
          <div className="feed-area" ref={feedRef}>
            {events.length === 0 && (
              <div className="empty-state">
                <span className="spinning">⬡</span>
                <span>Spawning agents...</span>
              </div>
            )}
            {events.map((ev, i) => <EventItem key={i} event={ev}/>)}
          </div>
          <OutputPanel report={report} phase={phase}/>
        </div>
      </div>
    </div>
  );
}
