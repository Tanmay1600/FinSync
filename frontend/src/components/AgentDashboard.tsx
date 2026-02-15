import { useEffect, useState, useCallback, useRef } from 'react'
import { Users, Activity, TrendingUp, Target, Plus, X } from 'lucide-react'
import { api, type Lead } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { Image, Mic } from "lucide-react";
interface AgentDashboardProps {
  onNavigate: (tab: 'stall' | 'field') => void
}

/* ============================= */
/* Lead States */
/* ============================= */
const LEAD_STATES = [
  "INTERACTION",
  "FOLLOW_UP",
  "ENGAGED",
  "MEETING",
  "OUTCOME",
  "CLOSED"
]

export function AgentDashboard({ onNavigate }: AgentDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null)

  const { user } = useAuth()
  const fabRef = useRef<HTMLDivElement>(null)
  const changeLeadState = async (leadId: number, newState: string) => {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    throw new Error("User not authenticated");
  }

  const response = await axios.put(
    `http://localhost:5000/api/interactions/leads/${leadId}/state`,
    {
      state: newState,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};


  /* ============================= */
  /* Load Leads */
  /* ============================= */
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const leadsData = await api.getAllLeads()

      const myLeads = leadsData.data.filter(
        (lead: Lead) => lead.ownerId === user?.id
      )

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

  /* ============================= */
  /* Close FAB menu */
  /* ============================= */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setShowFabMenu(false)
      }
    }

    if (showFabMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () =>
      document.removeEventListener('mousedown', handleClickOutside)
  }, [showFabMenu])

  /* ============================= */
  /* Change Lead State */
  /* ============================= */
  const handleStateChange = async (leadId: number, newState: string) => {
    try {
      setUpdatingLeadId(leadId)

      await changeLeadState(leadId, newState)

      // optimistic update
      setLeads(prev =>
        prev.map(l =>
          l.id === leadId ? { ...l, state: newState } : l
        )
      )
    } catch (err) {
      console.error(err)
      alert("Failed to update lead state")
    } finally {
      setUpdatingLeadId(null)
    }
  }

  /* ============================= */
  /* Loading / Error */
  /* ============================= */
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
        <p>{error}</p>
        <button onClick={loadData}>Retry</button>
      </div>
    )
  }

  /* ============================= */
  /* Stats */
  /* ============================= */
  const stats = {
    totalLeads: leads.length,
    totalInteractions: leads.filter(l => l.interaction).length,
    avgScore:
      leads.filter(l => l.interaction).length > 0
        ? Math.round(
            leads
              .filter(l => l.interaction)
              .reduce(
                (sum, l) => sum + (l.interaction?.score || 0),
                0
              ) /
              leads.filter(l => l.interaction).length
          )
        : 0,
    activeLeads: leads.filter(l => l.state === "INTERACTION").length
  }

  /* ============================= */
  /* JSX */
  /* ============================= */
  return (
    <div className="agent-dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <h1>My Dashboard</h1>
        <p>Your leads and performance</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <Stat icon={<Users />} value={stats.totalLeads} label="My Leads" />
        <Stat icon={<Activity />} value={stats.totalInteractions} label="Interactions" />
        <Stat icon={<TrendingUp />} value={stats.avgScore} label="Avg Score" />
        <Stat icon={<Target />} value={stats.activeLeads} label="Active" />
      </div>

      {/* Leads Table */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>My Leads</h2>
          <span>{leads.length} total</span>
        </div>

        <div className="table-container">

          {leads.length === 0 ? (
            <div className="empty-state">
              <Users className="w-12 h-12 opacity-30" />
              <p>No leads assigned to you yet</p>
              <small>Start capturing leads to see them here</small>
            </div>
          ) : (
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
                  <th>Source</th>
                </tr>
              </thead>

              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <div className="table-lead-info">
                        <div className="table-avatar">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        {lead.name}
                      </div>
                    </td>

                    <td>{lead.email || '-'}</td>
                    <td>{lead.mobNo || '-'}</td>

                    {/* STATE DROPDOWN */}
                    <td>
  <div className="lead-state-wrapper">
    <select
      className={`lead-state-select state-${lead.state.toLowerCase()}`}
      value={lead.state}
      disabled={updatingLeadId === lead.id}
      onChange={(e) =>
        handleStateChange(lead.id, e.target.value)
      }
    >
      {LEAD_STATES.map(state => (
        <option key={state} value={state}>
          {state.replace("_", " ")}
        </option>
      ))}
    </select>
  </div>
</td>


                    <td>
                      {lead.interaction
                        ? `${lead.interaction.score} pts`
                        : '-'}
                    </td>

                    <td>
                      {lead.interaction?.mode || '-'}
                    </td>

                    <td>
                      {lead.interaction?.tags?.length ? (
                        <div className="table-tags">
                          {lead.interaction.tags.map(tagItem => (
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
                    <td>
  <div className="source-icons">

    {/* IMAGE SOURCE */}
    <button
      className="source-btn"
      disabled={!lead.interaction?.image_url}
      onClick={() => {
        if (lead.interaction?.image_url) {
          window.open(lead.interaction.image_url, "_blank");
        }
      }}
      title="View Image"
    >
      <Image size={16} />
    </button>

    {/* AUDIO SOURCE */}
    <button
      className="source-btn"
      disabled={!lead.interaction?.audio_note_url}
      onClick={() => {
        if (lead.interaction?.audio_note_url) {
          window.open(lead.interaction.audio_note_url, "_blank");
        }
      }}
      title="Play Audio"
    >
      <Mic size={16} />
    </button>

  </div>
</td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* FAB */}
      <div className="fab-container" ref={fabRef}>
        {showFabMenu && (
          <div className="fab-menu">
            <button onClick={() => onNavigate('stall')}>
              Stall Capture
            </button>
            <button onClick={() => onNavigate('field')}>
              Field Capture
            </button>
          </div>
        )}

        <button
          className="fab-main"
          onClick={() => setShowFabMenu(!showFabMenu)}
        >
          {showFabMenu ? <X /> : <Plus />}
        </button>
      </div>
    </div>
  )
}

/* ============================= */
/* Small Stat Component */
/* ============================= */
function Stat({ icon, value, label }: any) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-number">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}
