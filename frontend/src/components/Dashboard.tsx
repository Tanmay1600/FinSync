import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { LeadStage } from '../lib/db'

const STAGES: { id: LeadStage; label: string }[] = [
  { id: 'met', label: 'Met' },
  { id: 'followup', label: 'Follow-up' },
  { id: 'engaged', label: 'Engaged' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'outcome', label: 'Outcome' },
]

export function Dashboard() {
  const { leads, updateStage } = useApp()
  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>('all')

  const counts = useMemo(() => {
    const base: Record<LeadStage, number> = {
      met: 0,
      followup: 0,
      engaged: 0,
      meeting: 0,
      outcome: 0,
    }
    for (const l of leads) base[l.stage]++
    return base
  }, [leads])

  const visible = leads.filter((l) => (stageFilter === 'all' ? true : l.stage === stageFilter))

  return (
    <section className="panel">
      <h2>Unified Pipeline</h2>
      <p className="muted">Stall + field leads in one funnel. Update stages as you work.</p>

      <div className="pipeline-summary">
        {STAGES.map((s) => (
          <div key={s.id} className="stage-card">
            <div className="stage-label">{s.label}</div>
            <div className="stage-count">{counts[s.id]}</div>
          </div>
        ))}
      </div>

      <div className="filters">
        <button
          className={stageFilter === 'all' ? 'pill active' : 'pill'}
          onClick={() => setStageFilter('all')}
        >
          All ({leads.length})
        </button>
        {STAGES.map((s) => (
          <button
            key={s.id}
            className={stageFilter === s.id ? 'pill active' : 'pill'}
            onClick={() => setStageFilter(s.id)}
          >
            {s.label} ({counts[s.id]})
          </button>
        ))}
      </div>

      <div className="lead-list">
        {visible.length === 0 && <div className="muted">No leads in this stage yet.</div>}
        {visible.map((lead) => (
          <article key={lead.id} className="lead-row">
            <div className="lead-main">
              <div className="lead-name">{lead.name}</div>
              <div className="lead-sub">
                {lead.company && <span>{lead.company} · </span>}
                <span>{lead.source === 'stall' ? 'Stall' : 'Field'}</span>
              </div>
              {lead.interest && <div className="lead-note">{lead.interest}</div>}
            </div>
            <div className="lead-actions">
              <select
                value={lead.stage}
                onChange={(e) => updateStage(lead.id!, e.target.value as LeadStage)}
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="meta">
                <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                {lead.pending && <span className="badge">Pending sync</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
