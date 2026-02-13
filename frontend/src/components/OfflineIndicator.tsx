import { useEffect, useState } from 'react';
import { useSyncStore } from '../stores/sync.store';

export default function OfflineIndicator() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncProgress,
    error,
    syncNow,
    forceSyncNow,
    retryFailed,
    clearFailed,
    clearError,
    initSync,
  } = useSyncStore();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initialiser le système de sync au montage
    initSync();
  }, [initSync]);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // On vient de revenir en ligne
      setShowBanner(true);
      // Cacher après 3 secondes
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Cacher l'erreur après 5 secondes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Badge de statut dans la barre de navigation
  const StatusBadge = () => (
    <div className="flex items-center gap-2 relative">
      {/* Indicateur de connexion */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
          isOnline
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          }`}
        />
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </button>

      {/* Compteur de pending */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <svg
            className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {pendingCount} en attente
        </div>
      )}

      {/* Compteur d'échecs */}
      {failedCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {failedCount} échec{failedCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Bouton sync manuel */}
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={syncNow}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          title="Synchroniser maintenant"
        >
          <svg
            className="w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {/* Panneau de détails */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Synchronisation</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Statut */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Statut</span>
              <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                {isOnline ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">En attente</span>
              <span className="font-medium">{pendingCount}</span>
            </div>

            {failedCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Échecs</span>
                <span className="font-medium text-red-600">{failedCount}</span>
              </div>
            )}

            {/* Progress */}
            {syncProgress && isSyncing && (
              <div className="mt-3 p-2 bg-blue-50 rounded">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-blue-700">{syncProgress.entity}</span>
                  <span className="text-blue-600">
                    {syncProgress.current}/{syncProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <button
                onClick={forceSyncNow}
                disabled={!isOnline || isSyncing}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Sync...' : 'Forcer sync'}
              </button>

              {failedCount > 0 && (
                <>
                  <button
                    onClick={retryFailed}
                    className="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                    title="Réessayer les échecs"
                  >
                    Retry
                  </button>
                  <button
                    onClick={clearFailed}
                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    title="Supprimer les échecs"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Bannière flottante
  const Banner = () => {
    if (!showBanner && !error) return null;

    const isError = !!error;

    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
          isError
            ? 'bg-orange-500 text-white'
            : isOnline
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isError ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </>
          ) : isOnline ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Connexion rétablie ! Synchronisation en cours...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
              </svg>
              <span>Mode hors ligne - Les données seront synchronisées au retour de la connexion</span>
            </>
          )}

          <button
            onClick={() => {
              setShowBanner(false);
              if (error) clearError();
            }}
            className={`ml-4 p-1 rounded ${
              isError ? 'hover:bg-orange-600' : isOnline ? 'hover:bg-green-600' : 'hover:bg-red-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Banner />
      <StatusBadge />
    </>
  );
}

// Export séparé pour le badge seul (utilisation dans la navbar)
export function OfflineStatusBadge() {
  const { isOnline, pendingCount, failedCount, isSyncing } = useSyncStore();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          isOnline
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700 animate-pulse'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </div>

      {pendingCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          {isSyncing && (
            <svg
              className="w-3 h-3 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          {pendingCount}
        </span>
      )}

      {failedCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {failedCount}
        </span>
      )}
    </div>
  );
}
