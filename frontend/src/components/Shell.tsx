import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Home } from './Home'
import { StallCapture } from './StallCapture'
import { FieldCapture } from './FieldCapture'
import { User, LogOut, ChevronDown } from 'lucide-react'

const tabs = [
  { id: 'stall', label: 'Stall Kiosk' },
  { id: 'field', label: 'Field Capture' },
] as const

export type TabId = (typeof tabs)[number]['id'] | 'home'

export function Shell() {
  const [active, setActive] = useState<TabId>('home')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const { leads, syncLeads, isOnline } = useApp()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const pending = leads.filter((l) => l.pending).length

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
        <div className="header-right">
          <div className="status">
            <span className={`dot ${isOnline ? 'online' : 'offline'}`} />
            <span className="status-text">{isOnline ? 'Online' : 'Offline – local only'}</span>
            {pending > 0 && (
              <button className="secondary" onClick={syncLeads} disabled={!isOnline}>
                Sync {pending}
              </button>
            )}
          </div>
          
          {/* Profile Menu */}
          <div className="profile-menu-container">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="profile-avatar">
                <User size={18} />
              </div>
              <span className="profile-name">{user?.name?.split(' ')[0] || 'User'}</span>
              <ChevronDown size={16} className={showProfileMenu ? 'rotate' : ''} />
            </button>
            
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <div className="profile-avatar-lg">
                    <User size={24} />
                  </div>
                  <div className="profile-details">
                    <div className="profile-name-full">{user?.name}</div>
                    <div className="profile-email">{user?.email}</div>
                    <div className="profile-role">{user?.role}</div>
                  </div>
                </div>
                <div className="profile-divider" />
                <button className="profile-menu-item logout" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
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
