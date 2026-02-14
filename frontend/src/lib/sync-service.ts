import { api } from './api'
import { db, type Lead } from './db'
import { OfflineQueue, type QueuedOperation } from './offline-queue'

export class SyncService {
  private static instance: SyncService
  private queue: OfflineQueue
  private isOnline: boolean = navigator.onLine
  private listeners: Set<(isOnline: boolean) => void> = new Set()
  
  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  constructor() {
    this.queue = OfflineQueue.getInstance()
    this.setupOnlineListener()
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('[Sync] Back online - starting sync')
      this.isOnline = true
      this.notifyListeners(true)
      this.syncPendingOperations()
    })

    window.addEventListener('offline', () => {
      console.log('[Sync] Gone offline')
      this.isOnline = false
      this.notifyListeners(false)
    })
  }

  onNetworkChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline))
  }

  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline) {
      console.log('[Sync] Offline - skipping sync')
      return
    }

    await this.queue.setSyncing(true)
    console.log('[Sync] Starting sync process')

    try {
      const operations = await this.queue.getPendingOperations()
      console.log(`[Sync] Found ${operations.length} pending operations`)

      for (const operation of operations) {
        try {
          await this.processOperation(operation)
          await this.queue.removeOperation(operation.id!)
          console.log(`[Sync] Successfully synced operation: ${operation.type}`)
        } catch (error) {
          console.error(`[Sync] Failed to sync operation ${operation.type}:`, error)
          await this.queue.incrementRetry(operation.id!, error instanceof Error ? error.message : 'Unknown error')
        }
      }

      await this.queue.setLastSync()
      console.log('[Sync] Sync completed successfully')
    } catch (error) {
      console.error('[Sync] Sync process failed:', error)
    } finally {
      await this.queue.setSyncing(false)
    }
  }

  private async processOperation(operation: QueuedOperation): Promise<void> {
    switch (operation.type) {
      case 'CREATE_LEAD':
        await this.syncCreateLead(operation)
        break
      case 'UPDATE_LEAD':
        await this.syncUpdateLead(operation)
        break
      case 'UPDATE_STAGE':
        await this.syncUpdateStage(operation)
        break
      case 'ADD_HISTORY':
        await this.syncAddHistory(operation)
        break
      default:
        console.warn(`[Sync] Unknown operation type: ${operation.type}`)
    }
  }

  private async syncCreateLead(operation: QueuedOperation): Promise<void> {
    const leadData = operation.payload as Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'pending'> & { localId: string }
    
    try {
      // Create lead on server
      const response = await api.createLead({
        name: leadData.name,
        company: leadData.company,
        email: leadData.email,
        phone: leadData.phone,
        tags: leadData.tags,
        source: leadData.source,
        interest: leadData.interest
      })
      
      // Update local record with server ID and remove pending flag
      const localLead = await db.leads.where('name').equals(leadData.name).first()
      if (localLead) {
        await db.leads.update(localLead.id!, {
          pending: false,
          updatedAt: Date.now()
        })
      }
      
      console.log(`[Sync] Lead created on server with ID: ${response.id}`)
    } catch (error) {
      throw new Error(`Failed to create lead: ${error}`)
    }
  }

  private async syncUpdateLead(operation: QueuedOperation): Promise<void> {
    const { id, updates } = operation.payload as { id: number; updates: Partial<Lead> }
    
    try {
      await api.updateLead(id, updates)
      console.log(`[Sync] Lead ${id} updated on server`)
    } catch (error) {
      throw new Error(`Failed to update lead: ${error}`)
    }
  }

  private async syncUpdateStage(operation: QueuedOperation): Promise<void> {
    const { id, stage } = operation.payload as { id: number; stage: Lead['stage'] }
    
    try {
      await api.updateLeadStage(id, stage)
      console.log(`[Sync] Lead ${id} stage updated to ${stage}`)
    } catch (error) {
      throw new Error(`Failed to update lead stage: ${error}`)
    }
  }

  private async syncAddHistory(operation: QueuedOperation): Promise<void> {
    const { id, entry } = operation.payload as { id: number; entry: Lead['history'][number] }
    
    try {
      await api.addLeadHistory(id, entry)
      console.log(`[Sync] History added to lead ${id}`)
    } catch (error) {
      throw new Error(`Failed to add lead history: ${error}`)
    }
  }

  async queueCreateLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'pending'>): Promise<string> {
    const localId = await this.queue.addOperation({
      type: 'CREATE_LEAD',
      payload: { ...leadData, localId: `temp_${Date.now()}` },
      maxRetries: 3
    })

    // If online, try to sync immediately
    if (this.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 100)
    }

    return localId
  }

  async queueUpdateStage(id: number, stage: Lead['stage']): Promise<string> {
    const localId = await this.queue.addOperation({
      type: 'UPDATE_STAGE',
      payload: { id, stage },
      maxRetries: 3
    })

    if (this.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 100)
    }

    return localId
  }

  async queueAddHistory(id: number, entry: Lead['history'][number]): Promise<string> {
    const localId = await this.queue.addOperation({
      type: 'ADD_HISTORY',
      payload: { id, entry },
      maxRetries: 3
    })

    if (this.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 100)
    }

    return localId
  }

  getOnlineStatus(): boolean {
    return this.isOnline
  }

  async getSyncStatus() {
    return await this.queue.getSyncStatus()
  }

  async clearFailedOperations() {
    return await this.queue.clearFailedOperations()
  }
}