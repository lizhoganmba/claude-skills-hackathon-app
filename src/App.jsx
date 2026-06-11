import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_JUDGES = ['Alykhan', 'Medha', 'Sam', 'Claude', 'Liz Testing']
const REAL_JUDGES = ['Alykhan', 'Medha', 'Sam', 'Claude']

const CRITERIA = [
  {
    key: 'business_impact',
    emoji: '💼',
    label: 'Real Business Impact / Time Savings',
    description: 'Does it solve a real problem or meaningfully save time? Is the impact concrete and demonstrable?',
  },
  {
    key: 'reusability',
    emoji: '♻️',
    label: 'Reusability Across Roles or Teams',
    description: 'How broadly could this apply across the company? Does it work for one team or many?',
  },
  {
    key: 'quality',
    emoji: '📋',
    label: 'Quality and Documentation of Workflow',
    description: 'Is the workflow well-built and clearly documented? Could someone else pick it up and use it?',
  },
  {
    key: 'adoption',
    emoji: '🚀',
    label: 'Adoption Potential',
    description: 'How likely is anyone to actually use this? Is it simple enough, does it require plugins, does it feel genuinely useful?',
  },
]

const WEIGHTS = {
  business_impact: 0.25,
  reusability: 0.25,
  quality: 0.25,
  adoption: 0.25,
}

const SCORE_ANCHORS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
}

function weightedScore(scores) {
  return CRITERIA.reduce((sum, c) => sum + (scores[c.key] || 0) * WEIGHTS[c.key] * 20, 0)
}

// ─── Judge Modal ──────────────────────────────────────────────────────────────

function JudgeModal({ onSelect }) {
  const [selected, setSelected] = useState('')
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-logo">PR</div>
        <h2>Welcome to the Skills Hackathon</h2>
        <p>Select your name to begin judging.</p>
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Choose your name —</option>
          {ALL_JUDGES.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <button
          className="btn-primary"
          disabled={!selected}
          onClick={() => onSelect(selected)}
        >
          Enter as {selected || '…'}
        </button>
      </div>
    </div>
  )
}

// ─── Submit Mode ──────────────────────────────────────────────────────────────

function SubmitMode() {
  const [form, setForm] = useState({
    submitter_name: '',
    submitter_team: '',
    skill_name: '',
    description: '',
    potential_use_cases: '',
    usage_instructions: '',
    sharepoint_url: '',
  })
  const [status, setStatus] = useState(null)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('saving')
    const { error } = await supabase.from('submissions').insert([form])
    if (error) {
      console.error(error)
      setStatus('error')
    } else {
      setStatus('success')
      setForm({ submitter_name: '', submitter_team: '', skill_name: '', description: '', potential_use_cases: '', usage_instructions: '', sharepoint_url: '' })
    }
  }

  return (
    <div className="submit-container">
      <div className="submit-card">
        <h1>Submit Your Skill</h1>
        <p className="submit-subtitle">Share your Claude skill with the judges.</p>

        <div className="folder-callout">
          <span className="folder-callout-icon">📁</span>
          <span>
            First, save your .skill file to the{' '}
            <a href="https://publicrelay.sharepoint.com/:f:/s/sales/IgBJrUnwn3kPQJm_mB1y4k13ASbDFi72-foOSsLCUHPCSGs?e=n8Pwgm" target="_blank" rel="noreferrer">
              shared SharePoint folder
            </a>
            , then paste the link to your file below.
          </span>
        </div>

        {status === 'success' && (
          <div className="alert alert-success">Submission received! Good luck. 🎉</div>
        )}
        {status === 'error' && (
          <div className="alert alert-error">Something went wrong. Please try again.</div>
        )}

        <form onSubmit={handleSubmit} className="submit-form">
          <div className="form-row">
            <label>Your Name</label>
            <input required value={form.submitter_name} onChange={set('submitter_name')} placeholder="e.g. Alykhan" />
          </div>
          <div className="form-row">
            <label>Your Team</label>
            <input required value={form.submitter_team} onChange={set('submitter_team')} placeholder="e.g. Sales, Client Success, Product" />
          </div>
          <div className="form-row">
            <label>Skill Name</label>
            <input required value={form.skill_name} onChange={set('skill_name')} placeholder="e.g. /deep-research" />
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea required rows={3} value={form.description} onChange={set('description')} placeholder="What does this skill do?" />
          </div>
          <div className="form-row">
            <label>Potential Use Cases</label>
            <textarea required rows={3} value={form.potential_use_cases} onChange={set('potential_use_cases')} placeholder="Who would use this and when?" />
          </div>
          <div className="form-row">
            <label>Usage Instructions</label>
            <textarea required rows={3} value={form.usage_instructions} onChange={set('usage_instructions')} placeholder="How do you invoke and use this skill?" />
          </div>
          <div className="form-row">
            <label>SharePoint Link to Skill File</label>
            <input required type="url" value={form.sharepoint_url} onChange={set('sharepoint_url')} placeholder="https://..." />
          </div>
          <button className="btn-primary" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Submitting…' : 'Submit Skill'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Score Panel ──────────────────────────────────────────────────────────────

function ScorePanel({ judgeName, submission, allScores, isMe, onSaved }) {
  const myRecord = allScores.find(s => s.judge_name === judgeName)
  const [scores, setScores] = useState(myRecord?.scores || {})
  const [notes, setNotes] = useState(myRecord?.notes || {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!myRecord)

  const complete = CRITERIA.every(c => scores[c.key] >= 1 && scores[c.key] <= 5)
  const total = complete ? weightedScore(scores) : null

  async function handleSave() {
    if (!complete) return
    setSaving(true)
    const { error } = await supabase.from('scores').upsert(
      { judge_name: judgeName, submission_id: submission.id, scores, notes },
      { onConflict: 'judge_name,submission_id' }
    )
    setSaving(false)
    if (!error) {
      setSaved(true)
      onSaved()
    }
  }

  if (!isMe) {
    const otherRecord = allScores.find(s => s.judge_name === judgeName)
    if (!otherRecord) {
      return (
        <div className="score-panel locked">
          <div className="judge-name">{judgeName}</div>
          <div className="locked-msg">Not yet scored</div>
        </div>
      )
    }
    const otherTotal = weightedScore(otherRecord.scores)
    return (
      <div className="score-panel complete">
        <div className="judge-name">{judgeName}</div>
        <div className="total-score">{otherTotal.toFixed(1)}<span>/100</span></div>
        {CRITERIA.map(c => (
          <div key={c.key} className="criterion-row">
            <span>{c.emoji} {c.label}</span>
            <span className="score-pill">{otherRecord.scores[c.key]}/5</span>
          </div>
        ))}
        {otherRecord.notes?.general && (
          <div className="notes-display">
            <strong>Notes:</strong> {otherRecord.notes.general}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="score-panel mine">
      <div className="judge-name">{judgeName} <span className="you-badge">You</span></div>
      {CRITERIA.map(c => (
        <div key={c.key} className="criterion-block">
          <div className="criterion-header">
            <span className="criterion-emoji">{c.emoji}</span>
            <div>
              <div className="criterion-label">{c.label}</div>
              <div className="criterion-desc">{c.description}</div>
            </div>
          </div>
          <div className="score-buttons">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={`score-btn ${scores[c.key] === n ? 'active' : ''}`}
                onClick={() => setScores(s => ({ ...s, [c.key]: n }))}
                title={SCORE_ANCHORS[n]}
              >
                {n}
              </button>
            ))}
            <span className="anchor-label">{scores[c.key] ? SCORE_ANCHORS[scores[c.key]] : ''}</span>
          </div>
        </div>
      ))}
      <div className="form-row">
        <label>Notes (optional)</label>
        <textarea
          rows={2}
          value={notes.general || ''}
          onChange={e => setNotes({ general: e.target.value })}
          placeholder="Any additional comments…"
        />
      </div>
      {total !== null && (
        <div className="my-total">Weighted score: <strong>{total.toFixed(1)} / 100</strong></div>
      )}
      <button
        className="btn-primary"
        disabled={!complete || saving || saved}
        onClick={handleSave}
      >
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Score'}
      </button>
    </div>
  )
}

// ─── Judge Mode ───────────────────────────────────────────────────────────────

function JudgeMode({ judgeName }) {
  const [submissions, setSubmissions] = useState([])
  const [allScores, setAllScores] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('score')

  async function load() {
    const [{ data: subs }, { data: scrs }] = await Promise.all([
      supabase.from('submissions').select('*').order('created_at'),
      supabase.from('scores').select('*'),
    ])
    setSubmissions(subs || [])
    setAllScores(scrs || [])
    if (!selected && subs?.length) setSelected(subs[0].id)
  }

  useEffect(() => { load() }, [])

  const selectedSub = submissions.find(s => s.id === selected)
  const subScores = sub => allScores.filter(s => s.submission_id === sub.id)
  const allJudgesDone = sub => REAL_JUDGES.every(j => subScores(sub).some(s => s.judge_name === j))
  const myScore = sub => allScores.find(s => s.submission_id === sub.id && s.judge_name === judgeName)
  const avgScore = sub => {
    const scores = subScores(sub).filter(s => REAL_JUDGES.includes(s.judge_name))
    if (!scores.length) return null
    return scores.reduce((sum, s) => sum + weightedScore(s.scores), 0) / scores.length
  }

  return (
    <div className="judge-layout">
      <aside className="sidebar">
        <div className="sidebar-tabs">
          <button className={tab === 'score' ? 'active' : ''} onClick={() => setTab('score')}>Score</button>
          <button className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>Compare</button>
        </div>
        <div className="sidebar-list">
          {submissions.map(sub => {
            const done = allJudgesDone(sub)
            const mine = myScore(sub)
            return (
              <div
                key={sub.id}
                className={`sidebar-item ${selected === sub.id ? 'active' : ''}`}
                onClick={() => { setSelected(sub.id); setTab('score') }}
              >
                <div className="sidebar-skill">{sub.skill_name}</div>
                <div className="sidebar-badges">
                  {mine && <span className="badge badge-scored">You scored</span>}
                  {done && <span className="badge badge-done">All done</span>}
                </div>
              </div>
            )
          })}
          {submissions.length === 0 && <div className="sidebar-empty">No submissions yet.</div>}
        </div>
      </aside>

      <main className="main-panel">
        {tab === 'compare' ? (
          <CompareTab submissions={submissions} allScores={allScores} allJudgesDone={allJudgesDone} avgScore={avgScore} subScores={subScores} />
        ) : selectedSub ? (
          <SubmissionView
            submission={selectedSub}
            judgeName={judgeName}
            allScores={subScores(selectedSub)}
            allJudgesDone={allJudgesDone(selectedSub)}
            onSaved={load}
          />
        ) : (
          <div className="empty-state">Select a submission to begin judging.</div>
        )}
      </main>
    </div>
  )
}

// ─── Submission View ──────────────────────────────────────────────────────────

function SubmissionView({ submission, judgeName, allScores, allJudgesDone, onSaved }) {
  return (
    <div className="submission-view">
      <div className="submission-header">
        <div className="submission-title-row">
          <h2>{submission.skill_name}</h2>
        </div>
        <a href={submission.sharepoint_url} target="_blank" rel="noreferrer" className="btn-secondary">
          Open Skill File ↗
        </a>
      </div>

      <div className="description-grid">
        <div className="desc-block">
          <h3>Description</h3>
          <p>{submission.description}</p>
        </div>
        <div className="desc-block">
          <h3>Potential Use Cases</h3>
          <p>{submission.potential_use_cases}</p>
        </div>
        <div className="desc-block full-width">
          <h3>Usage Instructions</h3>
          <p>{submission.usage_instructions}</p>
        </div>
      </div>

      <div className="scoring-section">
        <h3 className="scoring-title">
          {allJudgesDone ? '✅ All Judges Have Scored — Full Results Visible' : 'Your Score'}
        </h3>
        <div className="panels-row">
          <ScorePanel
            judgeName={judgeName}
            submission={submission}
            allScores={allScores}
            isMe={true}
            onSaved={onSaved}
          />
          {allJudgesDone && REAL_JUDGES.filter(j => j !== judgeName).map(j => (
            <ScorePanel
              key={j}
              judgeName={j}
              submission={submission}
              allScores={allScores}
              isMe={false}
              onSaved={onSaved}
            />
          ))}
        </div>
        {!allJudgesDone && (
          <p className="unlock-hint">Other judges' scores unlock once all {REAL_JUDGES.length} real judges have scored this submission.</p>
        )}
      </div>
    </div>
  )
}

// ─── Compare Tab ──────────────────────────────────────────────────────────────

function CompareTab({ submissions, allScores, allJudgesDone, avgScore, subScores }) {
  const ranked = [...submissions]
    .map(s => ({ ...s, avg: avgScore(s), done: allJudgesDone(s) }))
    .filter(s => s.done)
    .sort((a, b) => (b.avg || 0) - (a.avg || 0))

  const pending = submissions.filter(s => !allJudgesDone(s))

  function criterionAvgs(sub) {
    const scores = subScores(sub).filter(s => REAL_JUDGES.includes(s.judge_name))
    return CRITERIA.map(c => {
      const avg = scores.reduce((sum, s) => sum + (s.scores[c.key] || 0), 0) / scores.length
      return { ...c, avg }
    })
  }

  function scoreGap(sub) {
    const scores = subScores(sub).filter(s => REAL_JUDGES.includes(s.judge_name))
    const totals = scores.map(s => weightedScore(s.scores))
    return Math.max(...totals) - Math.min(...totals)
  }

  return (
    <div className="compare-tab">
      <h2>Leaderboard</h2>
      <p className="compare-subtitle">Only shows submissions where all {REAL_JUDGES.length} real judges have scored.</p>

      {ranked.length === 0 && (
        <div className="empty-state">No submissions fully scored yet.</div>
      )}

      {ranked.map((sub, i) => (
        <div key={sub.id} className="compare-card">
          <div className="compare-rank">#{i + 1}</div>
          <div className="compare-body">
            <div className="compare-title-row">
              <span className="compare-skill">{sub.skill_name}</span>
              <span className="compare-avg">{sub.avg.toFixed(1)}<small>/100</small></span>
            </div>
            <div className="compare-criteria">
              {criterionAvgs(sub).map(c => (
                <div key={c.key} className="compare-crit-row">
                  <span className="compare-crit-label">{c.emoji} {c.label}</span>
                  <div className="compare-bar-wrap">
                    <div className="compare-bar" style={{ width: `${(c.avg / 5) * 100}%` }} />
                  </div>
                  <span className="compare-crit-val">{c.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <div className="compare-gap">
              Score spread: <strong>{scoreGap(sub).toFixed(1)} pts</strong>
            </div>
          </div>
        </div>
      ))}

      {pending.length > 0 && (
        <div className="pending-section">
          <h3>Still in Progress</h3>
          {pending.map(sub => {
            const done = subScores(sub).filter(s => REAL_JUDGES.includes(s.judge_name)).length
            return (
              <div key={sub.id} className="pending-row">
                <span>{sub.skill_name}</span>
                <span className="pending-count">{done}/{REAL_JUDGES.length} judges</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState('submit')
  const [judgeName, setJudgeName] = useState(() => localStorage.getItem('judgeName') || null)
  const [showJudgeModal, setShowJudgeModal] = useState(false)

  function handleJudgeSelect(name) {
    localStorage.setItem('judgeName', name)
    setJudgeName(name)
    setShowJudgeModal(false)
    setMode('judge')
  }

  function handleModeSwitch(m) {
    if (m === 'judge' && !judgeName) {
      setShowJudgeModal(true)
    } else {
      setMode(m)
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-monogram">PR</span>
          <span className="nav-title">Claude Skills Hackathon</span>
        </div>
        <div className="nav-tabs">
          <button className={mode === 'submit' ? 'active' : ''} onClick={() => handleModeSwitch('submit')}>
            Submit
          </button>
          <button className={mode === 'judge' ? 'active' : ''} onClick={() => handleModeSwitch('judge')}>
            Judge {judgeName && <span className="nav-judge-name">({judgeName})</span>}
          </button>
        </div>
      </nav>

      {showJudgeModal && <JudgeModal onSelect={handleJudgeSelect} />}

      {mode === 'submit' && <SubmitMode />}
      {mode === 'judge' && judgeName && <JudgeMode judgeName={judgeName} />}
    </div>
  )
}
