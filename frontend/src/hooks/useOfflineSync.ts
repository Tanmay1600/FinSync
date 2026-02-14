import { useState, useEffect } from 'react'
import { SyncService } from '../lib/sync-service'
import type { SyncStatus } from '../lib/offline-queue'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const syncService = SyncService.getInstance()
    
    // Initial setup
    const initialize = async () => {
      const status = await syncService.getSyncStatus()
      setSyncStatus(status || null)
      setIsInitialized(true)
    }
    
    initialize()

    // Listen for network changes
    const unsubscribe = syncService.onNetworkChange((online) => {
      setIsOnline(online)
    })

    // Periodic sync status updates
    const statusInterval = setInterval(async () => {
      const status = await syncService.getSyncStatus()
      setSyncStatus(status || null)
    }, 2000)

    // Cleanup
    return () => {
      unsubscribe()
      clearInterval(statusInterval)
    }
  }, [])

  const syncNow = async () => {
    const syncService = SyncService.getInstance()
    await syncService.syncPendingOperations()
  }

  const clearFailedOperations = async () => {
    const syncService = SyncService.getInstance()
    await syncService.clearFailedOperations()
  }

  return {
    isOnline,
    syncStatus,
    isInitialized,
    syncNow,
    clearFailedOperations,
    hasPendingOperations: (syncStatus?.pendingOperations || 0) > 0,
    isSyncing: syncStatus?.isSyncing || false
  }
}