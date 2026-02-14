import { useEffect, useState, useCallback, useRef } from 'react'
import { Users, Activity, TrendingUp, Target, Plus, X } from 'lucide-react'
import { api, type Lead } from '../lib/api'
import { useAuth } from '../context/AuthContext'

interface AgentDashboardProps {
  onNavigate: (tab: 'stall' | 'field') => void
}

export function AgentDashboard({ onNavigate }: AgentDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const [showFabMenu, setShowFabMenu] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const leadsData = await api.getAllLeads()
      // Filter leads by current user's ID (ownerId matches user.id)
      const myLeads = leadsData.data.filter(lead => lead.ownerId === user?.id)
      setLeads(myLeads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  if (loading) {
    return (
      <div className="agent-dashboard loading">
        <div className="loading-spinner">Loading your leads...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="agent-dashboard error">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    )
  }

  const stats = {
    totalLeads: leads.length,
    totalInteractions: leads.filter(l => l.interaction).length,
    avgScore: leads.filter(l => l.interaction).length > 0
      ? Math.round(leads.filter(l => l.interaction).reduce((sum, l) => sum + (l.interaction?.score || 0), 0) / leads.filter(l => l.interaction).length)
      : 0,
    activeLeads: leads.filter(l => l.state === 'INTERACTION').length
  }

  return (
    <div className="agent-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>My Dashboard</h1>
        <p>Your leads and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalLeads}</div>
            <div className="stat-label">My Leads</div>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">
            <Activity className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalInteractions}</div>
            <div className="stat-label">Interactions</div>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.avgScore}</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">
            <Target className="w-4 h-4" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.activeLeads}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
      </div>

      {/* My Leads Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>My Leads</h2>
          <span className="section-badge">{leads.length} total</span>
        </div>
        {leads.length === 0 ? (
          <div className="empty-state">
            <Users className="w-12 h-12 opacity-30" />
            <p>No leads assigned to you yet</p>
            <small>Start capturing leads to see them here</small>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>Score</th>
                  <th>Mode</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="table-lead-info">
                        <div className="table-avatar">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="table-lead-name">{lead.name}</span>
                      </div>
                    </td>
                    <td>{lead.email || '-'}</td>
                    <td>{lead.mobNo || '-'}</td>
                    <td>
                      <span className="lead-state-badge">{lead.state}</span>
                    </td>
                    <td>
                      {lead.interaction ? (
                        <span className="score-badge">{lead.interaction.score} pts</span>
                      ) : '-'}
                    </td>
                    <td>
                      {lead.interaction ? (
                        <span className="mode-badge">{lead.interaction.mode}</span>
                      ) : '-'}
                    </td>
                    <td>
                      {lead.interaction && lead.interaction.tags.length > 0 ? (
                        <div className="table-tags">
                          {lead.interaction.tags.map((tagItem) => (
                            <span 
                              key={tagItem.id} 
                              className="tag-badge-small"
                              style={{ 
                                backgroundColor: `${tagItem.tag.color}20`,
                                borderColor: tagItem.tag.color,
                                color: tagItem.tag.color
                              }}
                            >
                              {tagItem.tag.text} (+{tagItem.tag.score})
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
