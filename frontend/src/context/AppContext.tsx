import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db, type Lead, type LeadStage } from '../lib/db'

interface AppContextValue {
  leads: Lead[]
  loading: boolean
  addLead: (input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'pending'>) => Promise<void>
  updateStage: (id: number, stage: LeadStage) => Promise<void>
  appendHistory: (id: number, entry: Lead['history'][number]) => Promise<void>
  syncLeads: () => Promise<void>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const all = await db.leads.orderBy('createdAt').reverse().toArray()
      setLeads(all)
      setLoading(false)
    }
    load()
  }, [])

  const addLead: AppContextValue['addLead'] = async (input) => {
    const now = Date.now()
    const base: Lead = {
      ...input,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          type: 'check-in',
          timestamp: now,
        },
      ],
      pending: true,
    }

    const id = await db.leads.add(base)
    setLeads((prev) => [{ ...base, id }, ...prev])
  }

  const updateStage: AppContextValue['updateStage'] = async (id, stage) => {
    await db.leads.update(id, { stage, updatedAt: Date.now() })
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage, updatedAt: Date.now() } : l)))
  }

  const appendHistory: AppContextValue['appendHistory'] = async (id, entry) => {
    const lead = await db.leads.get(id)
    if (!lead) return
    const history = [...lead.history, entry]
    await db.leads.update(id, { history, updatedAt: Date.now() })
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, history, updatedAt: Date.now() } : l)),
    )
  }

  const syncLeads: AppContextValue['syncLeads'] = async () => {
    // For this hackathon prototype, "sync" just clears the pending flag.
    const pending = leads.filter((l) => l.pending)
    await Promise.all(pending.map((l) => db.leads.update(l.id!, { pending: false })))
    setLeads((prev) => prev.map((l) => ({ ...l, pending: false })))
  }

  const value: AppContextValue = {
    leads,
    loading,
    addLead,
    updateStage,
    appendHistory,
    syncLeads,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
