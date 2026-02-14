import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { StallCapture } from './StallCapture'
import { FieldCapture } from './FieldCapture'
import { Dashboard } from './Dashboard'

const tabs = [
  { id: 'stall', label: 'Stall Kiosk' },
  { id: 'field', label: 'Field Capture' },
  { id: 'dashboard', label: 'Pipeline' },
] as const

export type TabId = (typeof tabs)[number]['id']

export function Shell() {
  const [active, setActive] = useState<TabId>('stall')
  const { leads, syncLeads } = useApp()
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  const pending = leads.filter((l) => l.pending).length

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">F</span>
          <div>
            <div className="brand-title">FinSync</div>
            <div className="brand-sub">Unified Conference Follow-ups</div>
          </div>
        </div>
        <div className="status">
          <span className={`dot ${online ? 'online' : 'offline'}`} />
          <span className="status-text">{online ? 'Online' : 'Offline – local only'}</span>
          {pending > 0 && (
            <button className="secondary" onClick={syncLeads} disabled={!online}>
              Sync {pending}
            </button>
          )}
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === active ? 'tab active' : 'tab'}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {active === 'stall' && <StallCapture />}
        {active === 'field' && <FieldCapture />}
        {active === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}
