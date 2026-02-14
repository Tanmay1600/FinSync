import Dexie, { type Table } from 'dexie'

export interface QueuedOperation {
  id?: number
  type: 'CREATE_LEAD' | 'UPDATE_LEAD' | 'DELETE_LEAD' | 'UPDATE_STAGE' | 'ADD_HISTORY'
  payload: Record<string, unknown>
  localId?: string // For optimistic UI
  timestamp: number
  retryCount: number
  maxRetries: number
  error?: string
}

export interface SyncStatus {
  id?: number
  lastSync: number
  pendingOperations: number
  isOnline: boolean
  isSyncing: boolean
}

class OfflineQueueDB extends Dexie {
  operations!: Table<QueuedOperation, number>
  syncStatus!: Table<SyncStatus, number>

  constructor() {
    super('HTT_OfflineQueue')
    this.version(1).stores({
      operations: '++id, type, timestamp, localId',
      syncStatus: '++id, lastSync'
    })
  }
}

export const offlineDB = new OfflineQueueDB()

export class OfflineQueue {
  private static instance: OfflineQueue
  
  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue()
    }
    return OfflineQueue.instance
  }

  async addOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const localId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const queuedOp: Omit<QueuedOperation, 'id'> = {
      ...operation,
      localId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || 3
    }

    await offlineDB.operations.add(queuedOp)
    await this.updateSyncStatus()
    
    return localId
  }

  async getPendingOperations(): Promise<QueuedOperation[]> {
    return await offlineDB.operations
      .where('retryCount')
      .belowOrEqual(3)
      .sortBy('timestamp')
  }

  async removeOperation(id: number): Promise<void> {
    await offlineDB.operations.delete(id)
    await this.updateSyncStatus()
  }

  async incrementRetry(id: number, error?: string): Promise<void> {
    const operation = await offlineDB.operations.get(id)
    if (operation) {
      await offlineDB.operations.update(id, { 
        retryCount: operation.retryCount + 1,
        error
      })
    }
  }

  async clearFailedOperations(): Promise<void> {
    await offlineDB.operations.where('retryCount').above(3).delete()
    await this.updateSyncStatus()
  }

  async getOperationCount(): Promise<number> {
    return await offlineDB.operations.count()
  }

  private async updateSyncStatus(): Promise<void> {
    const pendingCount = await this.getOperationCount()
    const status = await offlineDB.syncStatus.get(1)
    
    if (status) {
      await offlineDB.syncStatus.update(1, { 
        pendingOperations: pendingCount,
        isOnline: navigator.onLine 
      })
    } else {
      await offlineDB.syncStatus.add({
        id: 1,
        lastSync: Date.now(),
        pendingOperations: pendingCount,
        isOnline: navigator.onLine,
        isSyncing: false
      })
    }
  }

  async getSyncStatus(): Promise<SyncStatus | undefined> {
    return await offlineDB.syncStatus.get(1)
  }

  async setSyncing(isSyncing: boolean): Promise<void> {
    await offlineDB.syncStatus.update(1, { isSyncing })
  }

  async setLastSync(): Promise<void> {
    await offlineDB.syncStatus.update(1, { lastSync: Date.now() })
  }
}