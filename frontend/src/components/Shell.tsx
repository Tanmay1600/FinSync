import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Home } from './Home'
import { StallCapture } from './StallCapture'
import { FieldCapture } from './FieldCapture'

const tabs = [
  { id: 'stall', label: 'Stall Kiosk' },
  { id: 'field', label: 'Field Capture' },
] as const

export type TabId = (typeof tabs)[number]['id'] | 'home'

export function Shell() {
  const [active, setActive] = useState<TabId>('home')
  const { leads, syncLeads } = useApp()
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  const pending = leads.filter((l) => l.pending).length

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand" onClick={() => setActive('home')} style={{ cursor: 'pointer' }}>
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

      {/* Show navigation only when not on home page */}
      {active !== 'home' && (
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
      )}

      <main className="app-main">
        {active === 'home' && <Home onNavigate={setActive} />}
        {active === 'stall' && <StallCapture />}
        {active === 'field' && <FieldCapture />}
      </main>
    </div>
  )
}
