import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db, type Lead, type LeadStage } from '../lib/db'
import { SyncService } from '../lib/sync-service'

interface AppContextValue {
  leads: Lead[]
  loading: boolean
  addLead: (input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'pending'>) => Promise<number>
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

  const syncService = SyncService.getInstance()

  useEffect(() => {
    const load = async () => {
      try {
        const all = await db.leads.orderBy('createdAt').reverse().toArray()
        setLeads(all)
        setLoading(false)

        // Ensure any pending local leads are queued for sync
        await syncService.ensurePendingLeadsQueued(all)

        // If online, kick off a sync immediately
        if (navigator.onLine) {
          await syncService.syncPendingOperations()
        }
      } catch (error) {
        console.error('Failed to load leads:', error)
        setLoading(false)
      }
    }
    load()

    const unsubscribe = syncService.onNetworkChange((online) => {
      setIsOnline(online)
      if (online) {
        syncService.syncPendingOperations()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [syncService])

  const addLead: AppContextValue['addLead'] = async (input) => {
    const now = Date.now()
    const queueId = await syncService.queueCreateLead(input)
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
      pendingLocalId: queueId,
    }

    // Add to local database immediately (optimistic UI)
    const id = await db.leads.add(base)
    setLeads((prev) => [{ ...base, id }, ...prev])
    return id
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
    await syncService.syncPendingOperations()

    // Refresh local state after sync attempt
    const all = await db.leads.orderBy('createdAt').reverse().toArray()
    setLeads(all)
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
