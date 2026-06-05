import React, { useState } from 'react';

function CodeFileView({ file }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="code-file">
      <div className="code-file-header" onClick={() => setOpen(o => !o)}>
        <span className="code-file-path">{file.path}</span>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:10,color:'var(--text-3)'}}>
            {file.content?.split('\n').length} lines
          </span>
          <span className="code-file-lang">{file.language?.toUpperCase() || 'TEXT'}</span>
          <span style={{color:'var(--text-3)',fontSize:12}}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="code-block">
          <pre>{file.content || '// empty file'}</pre>
        </div>
      )}
    </div>
  );
}

function FindingCard({ finding }) {
  const sev = finding.severity || 'medium';
  return (
    <div className={`finding-card ${sev}`}>
      <div className="finding-title">
        <span className={`sev-badge ${sev}`}>{sev}</span>
        {finding.title}
        {finding.owasp && (
          <span style={{fontSize:9,color:'var(--text-3)',marginLeft:'auto'}}>{finding.owasp}</span>
        )}
      </div>
      <div className="finding-desc">{finding.description}</div>
      {finding.remediation && (
        <div className="finding-fix">→ {finding.remediation}</div>
      )}
      {finding.file && (
        <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text-3)',marginTop:4}}>
          📄 {finding.file}
          {finding.line_hint && ` · ${finding.line_hint}`}
        </div>
      )}
    </div>
  );
}

function StoryCard({ story }) {
  return (
    <div className="story-card">
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span className="story-id">{story.id}</span>
        <span className={`priority-badge ${story.priority}`}>{story.priority}</span>
      </div>
      <div className="story-title">{story.title}</div>
      {story.description && <div className="story-desc">{story.description}</div>}
    </div>
  );
}

function KV({ k, v }) {
  if (!v) return null;
  return (
    <div className="kv-row">
      <span className="kv-key">{k}</span>
      <span className="kv-val">{String(v)}</span>
    </div>
  );
}

export default function OutputPanel({ report, phase }) {
  const [tab, setTab] = useState('summary');

  if (phase === 'running' && !report) {
    return (
      <div className="output-area">
        <div className="tab-bar">
          {['summary','code','security','tests','deploy'].map(t => (
            <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t}
            </div>
          ))}
        </div>
        <div className="empty-state">
          <span className="spinning">⟳</span>
          <span>Building output...</span>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const files = report.generated_files || [];
  const findings = report.security_findings || [];
  const tests = report.test_suite || [];
  const stories = report.plan?.user_stories || [];
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;

  const TABS = [
    { id: 'summary',  label: 'Summary' },
    { id: 'code',     label: 'Code', count: files.length },
    { id: 'security', label: 'Security', count: critical + high || findings.length },
    { id: 'tests',    label: 'Tests', count: tests.length },
    { id: 'deploy',   label: 'Deploy' },
  ];

  return (
    <div className="output-area">
      <div className="tab-bar">
        {TABS.map(t => (
          <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count != null && t.count > 0 && <span className="tab-count">{t.count}</span>}
          </div>
        ))}
      </div>
      <div className="tab-content">
        {tab === 'summary' && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <div className="divider-label" style={{marginTop:0,borderTop:'none',paddingTop:0}}>Project</div>
              <KV k="Name" v={report.project_name} />
              <KV k="Requirement" v={report.requirement?.slice(0,80)+'...'} />
              <KV k="Language" v={report.plan?.tech_stack?.language} />
              <KV k="Framework" v={report.plan?.tech_stack?.framework} />
              <KV k="Database" v={report.plan?.tech_stack?.database} />
              <KV k="Auth" v={report.plan?.tech_stack?.auth} />
              <KV k="Timeline" v={report.plan?.timeline_estimate} />
              <KV k="Complexity" v={report.plan?.estimated_complexity} />
            </div>
            <div>
              <div className="divider-label">Architecture</div>
              <KV k="Pattern" v={report.architecture?.pattern} />
              <KV k="Components" v={`${(report.architecture?.components||[]).length} components`} />
              <KV k="API Endpoints" v={`${(report.architecture?.api_endpoints||[]).length} endpoints`} />
              <KV k="DB Tables" v={`${(report.architecture?.database_schema||[]).length} tables`} />
            </div>
            <div>
              <div className="divider-label">Delivery</div>
              <KV k="Files Generated" v={files.length} />
              <KV k="Test Coverage" v={report.test_coverage} />
              <KV k="Deploy Status" v={report.deployment?.status} />
              <KV k="Deploy URL" v={report.deployment?.url} />
            </div>
            {report.plan?.key_challenges?.length > 0 && (
              <div>
                <div className="divider-label">Key Challenges</div>
                {report.plan.key_challenges.map((c,i) => (
                  <div key={i} style={{fontSize:11,color:'var(--text-2)',marginBottom:3}}>
                    · {c}
                  </div>
                ))}
              </div>
            )}
            {stories.length > 0 && (
              <div>
                <div className="divider-label">User Stories</div>
                {stories.map((s,i) => <StoryCard key={i} story={s}/>)}
              </div>
            )}
          </div>
        )}
        {tab === 'code' && (
          <div className="code-file-list">
            {files.length === 0 && <div className="empty-state">No files generated</div>}
            {files.map((f,i) => <CodeFileView key={i} file={f}/>)}
            {report.dependencies?.length > 0 && (
              <div style={{marginTop:8}}>
                <div className="divider-label" style={{marginTop:0}}>Dependencies</div>
                <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--cyan)',
                  padding:10,background:'var(--bg-2)',borderRadius:6}}>
                  {report.dependencies.join('\n')}
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'security' && (
          <div>
            {findings.length === 0 && (
              <div style={{padding:12,textAlign:'center',color:'var(--green)',fontFamily:'var(--mono)',fontSize:12}}>
                ✓ No security findings
              </div>
            )}
            {findings.map((f,i) => <FindingCard key={i} finding={f}/>)}
            {report.security_findings?.length > 0 && (
              <div style={{marginTop:8}}>
                <div className="divider-label">Attack Surface</div>
                <div style={{fontSize:11,color:'var(--text-2)',lineHeight:1.6}}>
                  {typeof report.security_findings === 'object' && report.security_findings.attack_surface}
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'tests' && (
          <div className="code-file-list">
            {tests.length === 0 && <div className="empty-state">No tests generated</div>}
            {tests.map((t,i) => <CodeFileView key={i} file={{
              path: t.file, language: t.framework || 'python',
              content: t.content, description: t.description
            }}/>)}
            {report.test_coverage && (
              <div style={{padding:'10px',background:'var(--bg-2)',borderRadius:6,marginTop:8}}>
                <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text-2)'}}>
                  Estimated coverage: </span>
                <span style={{fontFamily:'var(--mono)',fontSize:13,color:'var(--green)',fontWeight:600}}>
                  {report.test_coverage}
                </span>
              </div>
            )}
          </div>
        )}
        {tab === 'deploy' && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="deploy-card">
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <span className={`deploy-badge ${report.deployment?.status}`}>
                  {report.deployment?.status === 'deployed' ? '● DEPLOYED' : '● BLOCKED'}
                </span>
                <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text-3)'}}>
                  {report.deployment?.environment?.toUpperCase()} •
                  {report.deployment?.deployment_time_seconds}s
                </span>
              </div>
              {report.deployment?.url && (
                <div className="deploy-url">
                  <a href={report.deployment.url} target="_blank" rel="noopener noreferrer">
                    {report.deployment.url}
                  </a>
                </div>
              )}
              {report.deployment?.resources && (
                <div className="resource-grid">
                  {Object.entries(report.deployment.resources).map(([k,v]) => (
                    <div key={k} className="resource-item">
                      <div className="resource-val">{v}</div>
                      <div className="resource-key">{k}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="divider-label" style={{marginTop:0}}>Risk Assessment</div>
              <KV k="Decision" v={report.risk_assessment?.decision} />
              <KV k="Risk Score" v={`${report.risk_assessment?.assessment?.risk_score ?? 'N/A'}/100`}/>
              <KV k="Confidence" v={`${report.risk_assessment?.confidence ?? 'N/A'}%`}/>
              <KV k="Rollback" v={report.risk_assessment?.rollback_plan}/>
            </div>
            {report.compliance_report?.report?.gdpr && (
              <div>
                <div className="divider-label">Compliance</div>
                <KV k="GDPR" v={report.compliance_report.report.gdpr?.status} />
                <KV k="Privacy Score" v={`${report.compliance_report.privacy_by_design_score}/10`}/>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
