import { useEffect, useState, useCallback, useRef } from 'react'
import { Users, Activity, CheckCircle, Plus, X, UserPlus, List, BarChart3, UserCheck } from 'lucide-react'
import { api, type Lead, type Interaction, type AgentSummary } from '../lib/api'
import { InviteAgent } from './InviteAgent'

interface AdminDashboardProps {
  onNavigate: (tab: 'stall' | 'field') => void
}

type TabType = 'interactions' | 'leads' | 'agents'

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('interactions')
  const fabRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [leadsData, interactionsData, agentsData] = await Promise.all([
        api.getAllLeads(),
        api.getAllInteractions(),
        api.getAllAgents()
      ])
      setLeads(leadsData.data)
      setInteractions(interactionsData.data)
      setAgents(agentsData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

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
      <div className="admin-dashboard loading">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-dashboard error">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    )
  }

  const stats = {
    totalLeads: leads.length,
    totalInteractions: interactions.length,
    totalAgents: agents.length,
    avgScore: interactions.length > 0 
      ? Math.round(interactions.reduce((sum, i) => sum + i.score, 0) / interactions.length)
      : 0
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Organization-wide analytics and lead management</p>
        </div>
        <button className="btn-invite" onClick={() => setShowInviteModal(true)}>
          <UserPlus className="w-5 h-5" />
          Invite Agent
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalLeads}</div>
            <div className="stat-label">Total Leads</div>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">
            <Activity className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalInteractions}</div>
            <div className="stat-label">Total Interactions</div>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalAgents}</div>
            <div className="stat-label">Total Agents</div>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.avgScore}</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'interactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('interactions')}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Interactions</span>
          <span className="tab-badge">{interactions.length}</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          <List className="w-5 h-5" />
          <span>Leads</span>
          <span className="tab-badge">{leads.length}</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          <UserCheck className="w-5 h-5" />
          <span>Agents</span>
          <span className="tab-badge">{agents.length}</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'interactions' && (
        <section className="dashboard-section">
          {interactions.length === 0 ? (
            <div className="empty-state">
              <Activity className="w-12 h-12 opacity-30" />
              <p>No interactions yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Agent</th>
                    <th>Mode</th>
                    <th>Score</th>
                    <th>Tags</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {interactions.map((interaction) => (
                    <tr key={interaction.id}>
                      <td>
                        <div className="table-lead-info">
                          <div className="table-avatar">
                            {interaction.lead_name?.charAt(0).toUpperCase() || 'L'}
                          </div>
                          <span className="table-lead-name">{interaction.lead_name}</span>
                        </div>
                      </td>
                      <td>{interaction.agent.name}</td>
                      <td>
                        <span className="mode-badge">{interaction.mode}</span>
                      </td>
                      <td>
                        <span className="score-badge">{interaction.score} pts</span>
                      </td>
                      <td>
                        <div className="table-tags">
                          {interaction.tags.map((tagItem) => (
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
                      </td>
                      <td className="table-remarks">
                        {interaction.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'leads' && (
        <section className="dashboard-section">
          {leads.length === 0 ? (
            <div className="empty-state">
              <Users className="w-12 h-12 opacity-30" />
              <p>No leads yet</p>
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
                    <th>Agent</th>
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
                        {lead.interaction ? lead.interaction.agent.name : '-'}
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
                                {tagItem.tag.text}
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
      )}

      {activeTab === 'agents' && (
        <section className="dashboard-section">
          {agents.length === 0 ? (
            <div className="empty-state">
              <UserCheck className="w-12 h-12 opacity-30" />
              <p>No agents yet. Invite your first agent to get started!</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Interactions</th>
                    <th>Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent, index) => (
                    <tr key={index}>
                      <td>
                        <div className="table-lead-info">
                          <div className="table-avatar">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="table-lead-name">{agent.name}</span>
                        </div>
                      </td>
                      <td>{agent.email}</td>
                      <td>{agent.mobNo}</td>
                      <td>
                        <span className="count-badge">{agent.no_of_interactions}</span>
                      </td>
                      <td>
                        <span className="count-badge">{agent.no_of_leads}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Invite Agent Modal */}
      {showInviteModal && (
        <InviteAgent
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  )
}
