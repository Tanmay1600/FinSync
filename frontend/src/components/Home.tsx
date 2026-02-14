import { useApp } from '../context/AppContext'
import { Users, Activity, Clock, TrendingUp, Camera, Mic, FileText, Plus, ArrowRight, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface HomeProps {
  onNavigate: (tab: 'stall' | 'field') => void
}

export function Home({ onNavigate }: HomeProps) {
  const { leads } = useApp()
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  const pending = leads.filter((l) => l.pending).length
  const recentLeads = leads.slice(0, 3)
  const [showFabMenu, setShowFabMenu] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setShowFabMenu(false)
      }
    }

    if (showFabMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFabMenu])

  const stats = {
    total: leads.length,
    pending: pending,
    stall: leads.filter(l => l.source === 'stall').length,
    field: leads.filter(l => l.source === 'field').length,
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="brand-highlight">FinSync</span>
          </h1>
          <p className="hero-subtitle">
            Your unified platform for conference lead capture and follow-ups. 
            Never miss a potential connection again.
          </p>
          <div className="hero-status">
            <div className={`status-indicator ${online ? 'online' : 'offline'}`}>
              <span className={`dot ${online ? 'online' : 'offline'}`} />
              <span>{online ? 'Connected & Syncing' : 'Working Offline'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">
              <Users className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Leads</div>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-icon">
              <Clock className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.pending}</div>
              <div className="stat-label">Pending Sync</div>
            </div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-icon">
              <Activity className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.stall}</div>
              <div className="stat-label">Stall Captures</div>
            </div>
          </div>
          
          <div className="stat-card info">
            <div className="stat-icon">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.field}</div>
              <div className="stat-label">Field Captures</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <div className="action-card stall">
            <div className="action-header">
              <div className="action-icon">
                <Plus className="w-6 h-6" />
              </div>
              <h3>Stall Kiosk</h3>
            </div>
            <p>Quick visitor entry at your booth. Perfect for high-traffic situations.</p>
            <div className="action-features">
              <div className="feature-item">
                <span className="feature-dot"></span>
                <span>Fast check-in process</span>
              </div>
              <div className="feature-item">
                <span className="feature-dot"></span>
                <span>Minimal information required</span>
              </div>
            </div>
            <button className="action-btn" onClick={() => onNavigate('stall')}>
              <span>Start Capturing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="action-card field">
            <div className="action-header">
              <div className="action-icon">
                <Activity className="w-6 h-6" />
              </div>
              <h3>Field Capture</h3>
            </div>
            <p>Comprehensive lead capture while walking the conference floor.</p>
            <div className="action-features">
              <div className="feature-item">
                <Camera className="w-4 h-4" />
                <span>Scan visiting cards</span>
              </div>
              <div className="feature-item">
                <Mic className="w-4 h-4" />
                <span>Record conversations</span>
              </div>
              <div className="feature-item">
                <FileText className="w-4 h-4" />
                <span>Detailed notes</span>
              </div>
            </div>
            <button className="action-btn" onClick={() => onNavigate('field')}>
              <span>Start Capturing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      {recentLeads.length > 0 && (
        <section className="recent-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="recent-leads">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="recent-lead">
                <div className="lead-avatar">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="lead-details">
                  <div className="lead-name">{lead.name}</div>
                  <div className="lead-meta">
                    {lead.company && <span>{lead.company}</span>}
                    <span className={`source-badge ${lead.source}`}>
                      {lead.source === 'stall' ? 'Stall' : 'Field'}
                    </span>
                  </div>
                </div>
                <div className="lead-time">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Getting Started */}
      {leads.length === 0 && (
        <section className="getting-started">
          <div className="getting-started-content">
            <h2>Getting Started</h2>
            <p>Welcome! Here's how to make the most of FinSync:</p>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Choose Your Mode</h4>
                  <p>Use Stall Kiosk for quick entries or Field Capture for detailed information.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Capture Leads</h4>
                  <p>Use camera, voice recording, or manual entry to capture visitor information.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Follow Up</h4>
                  <p>All data syncs automatically when online for seamless follow-up.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Floating Action Button */}
      <div className="fab-container" ref={fabRef}>
        {showFabMenu && (
          <div className="fab-menu">
            <button 
              className="fab-option stall-option"
              onClick={() => {
                onNavigate('stall')
                setShowFabMenu(false)
              }}
            >
              <Plus className="w-5 h-5" />
              <span>Stall Capture</span>
            </button>
            <button 
              className="fab-option field-option"
              onClick={() => {
                onNavigate('field')
                setShowFabMenu(false)
              }}
            >
              <Activity className="w-5 h-5" />
              <span>Field Capture</span>
            </button>
          </div>
        )}
        
        <button 
          className={`fab-main ${showFabMenu ? 'active' : ''}`}
          onClick={() => setShowFabMenu(!showFabMenu)}
        >
          {showFabMenu ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  )
}