import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useOfflineSync } from '../hooks/useOfflineSync'

export function OfflineStatusIndicator() {
  const { 
    isOnline, 
    syncStatus, 
    isInitialized,
    syncNow,
    hasPendingOperations,
    isSyncing
  } = useOfflineSync()

  if (!isInitialized) return null

  return (
    <div className="offline-status-container">
      {/* Network Status */}
      <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="status-text">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync Status */}
      {hasPendingOperations && (
        <div className="sync-status">
          {isSyncing ? (
            <div className="syncing">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Syncing...</span>
            </div>
          ) : (
            <div className="pending">
              <AlertCircle className="w-4 h-4" />
              <span>{syncStatus?.pendingOperations} pending</span>
              {isOnline && (
                <button 
                  onClick={syncNow}
                  className="sync-btn"
                  disabled={isSyncing}
                >
                  Sync Now
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success Status */}
      {!hasPendingOperations && isOnline && (
        <div className="synced">
          <CheckCircle2 className="w-4 h-4" />
          <span>All synced</span>
        </div>
      )}

      {/* Offline Mode Notice */}
      {!isOnline && (
        <div className="offline-notice">
          <p>You're offline. Changes will sync when connection is restored.</p>
        </div>
      )}
    </div>
  )
}