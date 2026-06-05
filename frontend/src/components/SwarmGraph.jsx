import React, { useMemo } from 'react';

const AGENTS = [
  { id: 'Director',   label: 'Director',  role: 'Production Director', cx: 200, cy: 55,  color: '#FF6B35', r: 28 },
  { id: 'Planner',    label: 'Planner',   role: 'Requirements',        cx: 90,  cy: 155, color: '#38BDF8', r: 22 },
  { id: 'Architect',  label: 'Architect', role: 'System Design',       cx: 200, cy: 155, color: '#A78BFA', r: 22 },
  { id: 'Risk',       label: 'Risk',      role: 'Risk Officer',        cx: 310, cy: 155, color: '#EF4444', r: 22 },
  { id: 'Developer',  label: 'Dev',       role: 'Code Generator',      cx: 90,  cy: 270, color: '#34D399', r: 22 },
  { id: 'Security',   label: 'Security',  role: 'Threat Hunter',       cx: 200, cy: 270, color: '#F472B6', r: 22 },
  { id: 'QA',         label: 'QA',        role: 'Test Engineer',       cx: 310, cy: 270, color: '#FBBF24', r: 22 },
  { id: 'Compliance', label: 'Comply',    role: 'Reg. Officer',        cx: 140, cy: 380, color: '#FB923C', r: 22 },
  { id: 'Deploy',     label: 'Deploy',    role: 'Release Eng.',        cx: 260, cy: 380, color: '#06B6D4', r: 22 },
];

const EDGES = [
  ['Director','Planner'],['Director','Architect'],['Director','Risk'],
  ['Planner','Developer'],['Architect','Developer'],['Architect','Security'],
  ['Developer','QA'],['Developer','Compliance'],
  ['Security','Deploy'],['QA','Deploy'],['Compliance','Deploy'],
  ['Risk','Deploy'],
];

function hexPoints(cx, cy, r) {
  return Array.from({length:6}, (_,i) => {
    const a = (Math.PI/3)*i - Math.PI/2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

function statusColor(status, agentColor) {
  if (status === 'active') return agentColor;
  if (status === 'done') return agentColor;
  if (status === 'failed') return '#EF4444';
  return '#1F253A';
}

function statusOpacity(status) {
  if (!status) return 0.35;
  if (status === 'active') return 1;
  if (status === 'done') return 0.85;
  if (status === 'failed') return 0.9;
  return 0.35;
}

export default function SwarmGraph({ agentStates }) {
  const agentMap = useMemo(() => Object.fromEntries(AGENTS.map(a => [a.id, a])), []);

  return (
    <svg viewBox="0 0 400 430" style={{width:'100%',height:'100%',maxHeight:'360px'}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {AGENTS.map(a => (
          <radialGradient key={a.id} id={`grd-${a.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={a.color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={a.color} stopOpacity="0"/>
          </radialGradient>
        ))}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Grid background */}
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a2030" strokeWidth="0.5"/>
      </pattern>
      <rect width="400" height="430" fill="url(#grid)" opacity="0.5"/>

      {/* Edges */}
      {EDGES.map(([from, to], i) => {
        const a = agentMap[from]; const b = agentMap[to];
        if (!a || !b) return null;
        const fromState = agentStates?.[from]?.status;
        const toState = agentStates?.[to]?.status;
        const active = fromState === 'active' || toState === 'active';
        const done = fromState === 'done' && toState === 'done';
        return (
          <g key={i}>
            <line x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
              stroke={done ? a.color : active ? a.color : '#252D44'}
              strokeWidth={active ? 1.5 : 1}
              strokeOpacity={active ? 0.7 : done ? 0.3 : 0.6}
              strokeDasharray={active ? "4 3" : "none"}
            >
              {active && (
                <animateTransform attributeName="stroke-dashoffset" type="translate"
                  values="0;-14" dur="0.8s" repeatCount="indefinite"/>
              )}
            </line>
            {/* Traveling dot on active edges */}
            {active && (
              <circle r="2.5" fill={a.color} opacity="0.9">
                <animateMotion dur="1.2s" repeatCount="indefinite"
                  path={`M${a.cx},${a.cy} L${b.cx},${b.cy}`}/>
              </circle>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {AGENTS.map(agent => {
        const state = agentStates?.[agent.id];
        const status = state?.status;
        const isActive = status === 'active';
        const isDone = status === 'done';
        const isFailed = status === 'failed';
        const fill = statusColor(status, agent.color);
        const opacity = statusOpacity(status);

        return (
          <g key={agent.id} style={{opacity, transition:'opacity 0.4s'}}>
            {/* Glow circle for active */}
            {isActive && (
              <circle cx={agent.cx} cy={agent.cy} r={agent.r + 10}
                fill={`url(#grd-${agent.id})`} opacity="0.6">
                <animate attributeName="r" values={`${agent.r+8};${agent.r+18};${agent.r+8}`}
                  dur="1.5s" repeatCount="indefinite"/>
              </circle>
            )}
            {/* Hex shape */}
            <polygon
              points={hexPoints(agent.cx, agent.cy, agent.r)}
              fill={fill}
              fillOpacity={status ? 0.2 : 0.08}
              stroke={fill}
              strokeWidth={isActive ? 1.5 : 1}
              filter={isActive ? 'url(#glow)' : 'none'}
              style={{transition:'all 0.4s', transformOrigin:`${agent.cx}px ${agent.cy}px`}}
            >
              {isActive && (
                <animateTransform attributeName="transform" type="scale"
                  values="1;1.04;1" dur="1.5s" repeatCount="indefinite"
                  additive="sum"/>
              )}
            </polygon>
            {/* Icon/status indicator */}
            <text x={agent.cx} y={agent.cy - 3}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={agent.r > 24 ? "14" : "11"}
              fill={fill} fontFamily="IBM Plex Mono" fontWeight="600"
              filter={isActive ? 'url(#glow)' : 'none'}
            >
              {isDone ? '✓' : isFailed ? '✗' : isActive ? '⬡' : '○'}
            </text>
            {/* Label */}
            <text x={agent.cx} y={agent.cy + agent.r + 10}
              textAnchor="middle" fontSize="9"
              fill={fill} fontFamily="IBM Plex Mono" letterSpacing="0.5"
            >
              {agent.label}
            </text>
            {/* Active status pulse */}
            {isActive && (
              <circle cx={agent.cx + agent.r - 4} cy={agent.cy - agent.r + 4}
                r="3.5" fill={agent.color}>
                <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite"/>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
