import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db, type Lead, type LeadStage } from '../lib/db'

interface AppContextValue {
  leads: Lead[]
  loading: boolean
  addLead: (input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'pending'>) => Promise<void>
  updateStage: (id: number, stage: LeadStage) => Promise<void>
  appendHistory: (id: number, entry: Lead['history'][number]) => Promise<void>
  syncLeads: () => Promise<void>
  isOnline: boolean
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const load = async () => {
      try {
        const all = await db.leads.orderBy('createdAt').reverse().toArray()
        setLeads(all)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load leads:', error)
        setLoading(false)
      }
    }
    load()

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('[AppContext] Network online')
      setIsOnline(true)
    }
    const handleOffline = () => {
      console.log('[AppContext] Network offline')
      setIsOnline(false)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Periodic online check (every 30 seconds)
    const onlineCheckInterval = setInterval(() => {
      const currentStatus = navigator.onLine
      setIsOnline(prev => {
        if (currentStatus !== prev) {
          console.log('[AppContext] Online status changed:', currentStatus)
        }
        return currentStatus
      })
    }, 30000)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(onlineCheckInterval)
    }
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

    // Add to local database immediately (optimistic UI)
    const id = await db.leads.add(base)
    setLeads((prev) => [{ ...base, id }, ...prev])
  }

  const updateStage: AppContextValue['updateStage'] = async (id, stage) => {
    // Update local database immediately (optimistic UI)
    const updatedAt = Date.now()
    await db.leads.update(id, { stage, updatedAt })
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage, updatedAt } : l)))
  }

  const appendHistory: AppContextValue['appendHistory'] = async (id, entry) => {
    const lead = await db.leads.get(id)
    if (!lead) return
    
    const history = [...lead.history, entry]
    const updatedAt = Date.now()
    
    // Update local database immediately (optimistic UI)
    await db.leads.update(id, { history, updatedAt })
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, history, updatedAt } : l)),
    )
  }

  const syncLeads: AppContextValue['syncLeads'] = async () => {
    // Simple sync - just clear pending flags for now
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
    isOnline,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
