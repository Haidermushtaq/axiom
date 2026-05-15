import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:8000'

const AGENTS = [
  { key: 'sales',      name: 'Revenue',    role: 'Growth & Acquisition',     color: '#3b82f6', light: '#eff6ff', border: '#bfdbfe' },
  { key: 'finance',    name: 'Risk',       role: 'Margin & Budget Control',  color: '#ef4444', light: '#fef2f2', border: '#fecaca' },
  { key: 'operations', name: 'Execute',    role: 'Efficiency & Delivery',    color: '#10b981', light: '#f0fdf4', border: '#bbf7d0' },
  { key: 'governor',   name: 'AXIOM Core', role: 'Arbitration & Decision',   color: '#1e3a5f', light: '#eff6ff', border: '#bfdbfe' },
  { key: 'auditor',    name: 'Sentinel',   role: 'Audit & Self-Improvement', color: '#8b5cf6', light: '#f5f3ff', border: '#ddd6fe' },
]

const WINNER_MAP = {
  Sales:      { label: 'Revenue Agent', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  Finance:    { label: 'Risk Agent',    color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  Operations: { label: 'Execute Agent', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  Hybrid:     { label: 'Hybrid Order',  color: '#1e3a5f', bg: '#eff6ff', border: '#bfdbfe' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeConflict(audit, decision) {
  const scores = [audit?.sales_score, audit?.finance_score, audit?.operations_score].filter(n => n != null)
  if (!scores.length) return 0
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const std  = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length)
  let c = Math.min(95, Math.round(std * 2.8))
  if (decision?.winner === 'Hybrid') c = Math.max(c, 52)
  return c
}

function conflictMeta(n) {
  if (n < 25) return { label: 'Full Consensus',     color: '#10b981' }
  if (n < 50) return { label: 'Mild Disagreement',  color: '#3b82f6' }
  if (n < 70) return { label: 'Moderate Conflict',  color: '#f59e0b' }
  if (n < 85) return { label: 'High Conflict',      color: '#f97316' }
  return            { label: 'Critical Conflict',   color: '#ef4444' }
}

function scoreColor(s) {
  if (s == null) return '#94a3b8'
  return s >= 75 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CircularScore({ score, label }) {
  const r     = 28
  const circ  = 2 * Math.PI * r
  const pct   = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0
  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="38" cy="38" r={r}
            fill="none"
            stroke={score != null ? color : '#e2e8f0'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            transform="rotate(-90 38 38)"
            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }}
          />
          <text x="38" y="43" textAnchor="middle" fontSize="14" fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif" fill={score != null ? color : '#94a3b8'}>
            {score != null ? score : '—'}
          </text>
        </svg>
      </div>
      <span className="text-xs font-semibold text-slate-500 tracking-wide">{label}</span>
    </div>
  )
}

function AgentCard({ agent, idx, activeIdx, loading, hasResult }) {
  const isActive  = loading && activeIdx === idx
  const isDone    = (loading && activeIdx > idx) || (!loading && hasResult)
  const isWaiting = loading && activeIdx < idx

  return (
    <div
      className="relative bg-white rounded-xl border p-4 text-center transition-all duration-500 overflow-hidden"
      style={{
        borderColor:  isActive ? agent.color + '80' : isDone ? agent.color + '40' : '#e2e8f0',
        boxShadow:    isActive ? `0 0 0 3px ${agent.color}18, 0 4px 12px ${agent.color}20` : isDone ? '0 1px 4px rgba(0,0,0,.06)' : 'none',
        transform:    isActive ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      {/* Shimmer overlay when waiting */}
      {isWaiting && <div className="absolute inset-0 shimmer opacity-40 pointer-events-none" />}

      {/* Avatar */}
      <div className="relative w-9 h-9 mx-auto mb-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white"
          style={{ backgroundColor: (isActive || isDone) ? agent.color : '#e2e8f0' }}
        >
          {isDone ? '✓' : <span style={{ color: (isActive || isDone) ? 'white' : '#94a3b8' }}>{idx + 1}</span>}
        </div>
        {isActive && (
          <span
            className="pulse-ring absolute inset-0 rounded-full"
            style={{ backgroundColor: agent.color }}
          />
        )}
      </div>

      {/* Labels */}
      <p className="text-xs font-bold text-slate-800 leading-tight">{agent.name}</p>
      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight hidden sm:block">{agent.role}</p>

      {/* Status pill */}
      <div className="mt-2.5">
        {isActive && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: agent.color, backgroundColor: agent.color + '15' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: agent.color }} />
            Thinking
          </span>
        )}
        {isDone && (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-100">
            Done
          </span>
        )}
        {!isActive && !isDone && (
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-slate-400 bg-slate-50 border border-slate-100">
            {isWaiting ? 'Waiting' : 'Standby'}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-3">{children}</p>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [scenario,      setScenario]      = useState('')
  const [loading,       setLoading]       = useState(false)
  const [activeIdx,     setActiveIdx]     = useState(-1)
  const [result,        setResult]        = useState(null)
  const [history,       setHistory]       = useState([])
  const [histLoading,   setHistLoading]   = useState(true)
  const [error,         setError]         = useState('')
  const [improving,     setImproving]     = useState(false)
  const [improveResult, setImproveResult] = useState(null)
  const [company,       setCompany]       = useState(() => localStorage.getItem('axiom_company') || '')
  const [editCompany,   setEditCompany]   = useState(false)
  const companyRef   = useRef(null)
  const resultRef    = useRef(null)
  const timerRef     = useRef([])

  // Load history on mount
  useEffect(() => {
    fetch(`${BASE}/history`)
      .then(r => r.json())
      .then(d => setHistory((d.decisions || []).slice().reverse().slice(0, 5)))
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [])

  // Focus company input when editing
  useEffect(() => {
    if (editCompany) companyRef.current?.focus()
  }, [editCompany])

  const refreshHistory = useCallback(() => {
    fetch(`${BASE}/history`)
      .then(r => r.json())
      .then(d => setHistory((d.decisions || []).slice().reverse().slice(0, 5)))
      .catch(() => {})
  }, [])

  function saveCompany(val) {
    const v = val.trim() || 'Your Company'
    localStorage.setItem('axiom_company', v)
    setCompany(v)
    setEditCompany(false)
  }

  async function handleRun() {
    if (!scenario.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    setImproveResult(null)
    setActiveIdx(0)

    // Animate agents sequentially — cycle through every 3 s while API works
    timerRef.current.forEach(clearTimeout)
    AGENTS.forEach((_, i) => {
      timerRef.current[i] = setTimeout(() => setActiveIdx(i), i * 3000)
    })

    try {
      const res = await fetch(`${BASE}/run`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenario: scenario.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()

      timerRef.current.forEach(clearTimeout)
      setActiveIdx(AGENTS.length)   // all done
      setResult(data)
      refreshHistory()
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    } catch {
      timerRef.current.forEach(clearTimeout)
      setActiveIdx(-1)
      setError('Could not reach AXIOM backend. Make sure the server is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  async function handleImprove() {
    if (!result || improving) return
    setImproving(true)
    try {
      const res  = await fetch(`${BASE}/improve`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenario: result.scenario }),
      })
      const data = await res.json()
      setImproveResult(data)
    } catch {
      setImproveResult({ error: 'Failed to reach backend.' })
    } finally {
      setImproving(false)
    }
  }

  function loadHistoryItem(d) {
    setScenario(d.scenario)
    setResult(d)
    setImproveResult(null)
    setActiveIdx(AGENTS.length)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  // Derived
  const { decision = {}, audit = {}, proposals = {}, failing_agents = [] } = result || {}
  const failingAgents = failing_agents.length ? failing_agents : (audit.agents_needing_improvement || [])
  const conflict      = computeConflict(audit, decision)
  const confMeta      = conflictMeta(conflict)
  const ws            = WINNER_MAP[decision.winner] || WINNER_MAP.Hybrid
  const hasResult     = !!result

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30"
        style={{ boxShadow: '0 1px 0 0 #e2e8f0' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5692 100%)' }}>
              <span className="text-white text-[10px] font-black tracking-tight">AX</span>
            </div>
            <span className="font-black text-[#1e3a5f] text-base tracking-tight">AXIOM</span>
          </div>

          {/* Tagline */}
          <p className="hidden lg:block text-[11px] text-slate-400 italic flex-1 text-center px-6">
            Five agents debate. One system decides. Then it improves itself.
          </p>
          <div className="flex-1 lg:hidden" />

          {/* Company */}
          {editCompany ? (
            <form
              onSubmit={e => { e.preventDefault(); saveCompany(companyRef.current.value) }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={companyRef}
                defaultValue={company}
                placeholder="Company name"
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 w-36 focus:outline-none focus:ring-2 focus:border-[#1e3a5f]"
                style={{ '--tw-ring-color': '#1e3a5f30' }}
                onBlur={e => saveCompany(e.target.value)}
              />
              <button type="submit"
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: '#1e3a5f' }}>
                Save
              </button>
            </form>
          ) : (
            <button onClick={() => setEditCompany(true)}
              className="text-xs font-semibold text-slate-500 hover:text-[#1e3a5f] transition-colors flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              {company || 'Set company'}
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-6">

        {/* ── HERO INPUT ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-9"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)' }}>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">
            What decision does your business face?
          </h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Describe any strategic, operational, or financial scenario. Five AI agents will deliberate in parallel and reach a binding verdict — then critique themselves.
          </p>

          <textarea
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRun() }}
            placeholder='"Our biggest client is threatening to leave unless we cut prices 25%. We have 48 hours to respond. What do we do?"'
            rows={4}
            disabled={loading}
            className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-3.5 resize-none focus:outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400 leading-relaxed"
            style={{ '--tw-ring-color': '#1e3a5f30' }}
            onFocus={e => { e.target.style.borderColor = '#1e3a5f'; e.target.style.boxShadow = '0 0 0 3px #1e3a5f18' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">Ctrl+Enter to run · Deliberation takes 15–30 s</span>
            <button
              onClick={handleRun}
              disabled={loading || !scenario.trim()}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:  loading || !scenario.trim() ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f 0%, #2d5692 100%)',
                boxShadow:   loading || !scenario.trim() ? 'none' : '0 2px 8px rgba(30,58,95,.35)',
              }}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Deliberating…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 2l10 6-10 6V2z" />
                  </svg>
                  Run AXIOM
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── AGENT STATUS ROW ───────────────────────────────────────────── */}
        <section className="grid grid-cols-5 gap-3">
          {AGENTS.map((agent, i) => (
            <AgentCard
              key={agent.key}
              agent={agent}
              idx={i}
              activeIdx={activeIdx}
              loading={loading}
              hasResult={hasResult}
            />
          ))}
        </section>

        {/* ── RESULTS ────────────────────────────────────────────────────── */}
        {hasResult && (
          <div ref={resultRef} className="space-y-5 slide-up">

            {/* Agent Proposals */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <SectionLabel>Agent Proposals</SectionLabel>
              <div className="space-y-5">
                {AGENTS.slice(0, 3).map(agent => (
                  <div key={agent.key} className="flex gap-4">
                    <div className="w-1 rounded-full shrink-0 self-stretch" style={{ backgroundColor: agent.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black mb-1.5 uppercase tracking-wider" style={{ color: agent.color }}>
                        {agent.name}
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {proposals[agent.key] || <span className="text-slate-300">No proposal recorded.</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Governor Verdict */}
            <section className="rounded-2xl overflow-hidden border border-slate-200"
              style={{ boxShadow: '0 4px 24px rgba(30,58,95,.12)' }}>

              {/* Verdict Header */}
              <div className="px-6 py-5 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #162d4a 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm tracking-wider uppercase">Binding Verdict</p>
                    <p className="text-blue-300 text-[11px] mt-0.5">AXIOM Core · Judicial Chamber</p>
                  </div>
                </div>
                {decision.confidence != null && (
                  <div className="text-right">
                    <p className="text-4xl font-black text-white leading-none">{decision.confidence}%</p>
                    <p className="text-blue-300 text-[11px] mt-0.5 uppercase tracking-wider">Confidence</p>
                  </div>
                )}
              </div>

              {/* Verdict Body */}
              <div className="bg-white p-6 space-y-5">

                {/* Winner badge */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Decided in favour of</span>
                  <span className="text-sm font-black px-3 py-1 rounded-lg border"
                    style={{ color: ws.color, backgroundColor: ws.bg, borderColor: ws.border }}>
                    {ws.label}
                  </span>
                </div>

                {/* Order */}
                <div className="border-l-[3px] border-[#1e3a5f] pl-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-2">Order</p>
                  <p className="text-slate-900 font-bold text-base leading-relaxed">{decision.decision}</p>
                </div>

                {/* Reasoning */}
                {decision.reasoning && (
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-2.5">Court's Reasoning</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{decision.reasoning}</p>
                  </div>
                )}

                {/* Conditions + Risk */}
                {(decision.conditions || decision.risk_flags) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {decision.conditions && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-2">Conditions</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{decision.conditions}</p>
                      </div>
                    )}
                    {decision.risk_flags && (
                      <div className="rounded-xl p-4 border" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] mb-2" style={{ color: '#b45309' }}>
                          Risk Flags
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>{decision.risk_flags}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Confidence bar */}
                {decision.confidence != null && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Judicial Confidence</p>
                      <span className="text-sm font-bold" style={{ color: scoreColor(decision.confidence) }}>
                        {decision.confidence}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${decision.confidence}%`, backgroundColor: scoreColor(decision.confidence) }} />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Conflict Visualization */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <SectionLabel>Inter-Agent Conflict Score</SectionLabel>
                  <p className="text-xs text-slate-400 -mt-1">Degree of disagreement between agent proposals</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black leading-none" style={{ color: confMeta.color }}>{conflict}</p>
                  <p className="text-[11px] font-bold mt-1" style={{ color: confMeta.color }}>{confMeta.label}</p>
                </div>
              </div>

              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-[1200ms] ease-out"
                  style={{
                    width: `${conflict}%`,
                    background: 'linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-2 uppercase tracking-wider">
                <span>Full Consensus</span>
                <span>Maximum Conflict</span>
              </div>

              {/* Per-agent score breakdown */}
              {(audit.sales_score != null || audit.finance_score != null || audit.operations_score != null) && (
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Revenue', score: audit.sales_score,      color: '#3b82f6' },
                    { label: 'Risk',    score: audit.finance_score,    color: '#ef4444' },
                    { label: 'Execute', score: audit.operations_score, color: '#10b981' },
                  ].map(a => (
                    <div key={a.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500">{a.label}</span>
                        <span className="text-sm font-black" style={{ color: scoreColor(a.score) }}>{a.score ?? '—'}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${a.score ?? 0}%`, backgroundColor: a.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Audit Scores */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div className="flex items-center justify-between mb-6">
                <SectionLabel>Sentinel Audit Report</SectionLabel>
                {audit.overall_health && (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                    {audit.overall_health}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-4 justify-items-center">
                <CircularScore score={audit.sales_score}      label="Revenue" />
                <CircularScore score={audit.finance_score}    label="Risk" />
                <CircularScore score={audit.operations_score} label="Execute" />
                <CircularScore score={audit.decision_quality} label="Decision" />
                <CircularScore score={audit.overall_score}    label="Overall" />
              </div>
              {audit.audit_summary && (
                <p className="mt-6 text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-100 leading-relaxed">
                  {audit.audit_summary}
                </p>
              )}
            </section>

            {/* Self-Improvement Alert */}
            {failingAgents.length > 0 && (
              <section className="rounded-2xl border p-5 slide-up"
                style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#fef3c7' }}>
                      <svg className="w-4 h-4" style={{ color: '#d97706' }} fill="none" stroke="currentColor"
                        viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1" style={{ color: '#92400e' }}>
                        Self-Improvement Loop Triggered
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: '#b45309' }}>
                        AXIOM will rewrite the system prompt for agents scoring below 60:{' '}
                        <span className="font-bold">{failingAgents.join(', ')}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleImprove}
                    disabled={improving || !!improveResult}
                    className="shrink-0 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all disabled:opacity-50"
                    style={{ background: '#d97706' }}
                  >
                    {improving ? 'Rewriting…' : improveResult ? 'Rewritten ✓' : 'Trigger Now'}
                  </button>
                </div>

                {improveResult && (
                  <div className="mt-4 ml-12 space-y-2">
                    {improveResult.error ? (
                      <p className="text-xs text-red-600 font-medium">{improveResult.error}</p>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-emerald-700">{improveResult.message}</p>
                        {Object.entries(improveResult.improvements || {}).map(([agent, d]) => (
                          <div key={agent} className="bg-white rounded-xl p-4 border"
                            style={{ borderColor: '#fde68a' }}>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5 capitalize">
                              {agent} — Rewritten Prompt
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">{d.new_prompt}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* ── DECISION HISTORY ───────────────────────────────────────────── */}
        {(histLoading || history.length > 0) && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Recent Decisions</p>
              {!histLoading && <span className="text-[11px] text-slate-400">Last {history.length}</span>}
            </div>

            {histLoading ? (
              <div className="divide-y divide-slate-50">
                {[1, 2, 3].map(i => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-8 h-3 rounded shimmer" />
                    <div className="flex-1 h-3 rounded shimmer" />
                    <div className="w-12 h-3 rounded shimmer" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {history.map(d => {
                  const conf  = d.decision?.confidence
                  const color = scoreColor(conf)
                  return (
                    <button
                      key={d.id}
                      onClick={() => loadHistoryItem(d)}
                      className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] font-mono text-slate-300 shrink-0 w-8">#{d.id}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {d.decision?.winner && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                style={{
                                  color:            WINNER_MAP[d.decision.winner]?.color || '#1e3a5f',
                                  backgroundColor:  WINNER_MAP[d.decision.winner]?.bg    || '#eff6ff',
                                }}>
                                {WINNER_MAP[d.decision.winner]?.label || d.decision.winner}
                              </span>
                            )}
                            {d.audit?.overall_health && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5 shrink-0">
                                {d.audit.overall_health}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 group-hover:text-[#1e3a5f] font-medium transition-colors leading-snug line-clamp-1">
                            {d.scenario}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {conf != null && (
                            <p className="text-lg font-black leading-none" style={{ color }}>{conf}%</p>
                          )}
                          {d.timestamp && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(d.timestamp + 'Z').toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>

                        <svg className="w-4 h-4 text-slate-300 group-hover:text-[#1e3a5f] transition-colors shrink-0"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="text-center pt-4 pb-8">
          <p className="text-[11px] text-slate-300 font-medium">
            AXIOM · Self-Governing Enterprise Intelligence
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            Five agents. One decision. Continuous improvement.
          </p>
        </footer>

      </main>
    </div>
  )
}
