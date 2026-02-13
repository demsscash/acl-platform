/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare let self: ServiceWorkerGlobalScope;

// Take control immediately
clientsClaim();

// Cleanup old caches
cleanupOutdatedCaches();

// Precache static assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// ==================== BACKGROUND SYNC QUEUES ====================

// Queue pour les dotations carburant
const dotationsQueue = new BackgroundSyncPlugin('dotations-queue', {
  maxRetentionTime: 24 * 60, // 24 heures
  onSync: async ({ queue }) => {
    console.log('[SW] Processing dotations sync queue...');
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Dotation synced successfully');
      } catch (error) {
        console.error('[SW] Dotation sync failed, re-queuing:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    // Notify clients that sync is complete
    notifyClients({ type: 'SYNC_COMPLETE', entity: 'dotations' });
  },
});

// Queue pour les sorties stock
const sortiesStockQueue = new BackgroundSyncPlugin('sorties-stock-queue', {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }) => {
    console.log('[SW] Processing sorties stock sync queue...');
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Sortie stock synced successfully');
      } catch (error) {
        console.error('[SW] Sortie stock sync failed, re-queuing:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    notifyClients({ type: 'SYNC_COMPLETE', entity: 'sortiesStock' });
  },
});

// Queue pour les bons de transport
const bonsTransportQueue = new BackgroundSyncPlugin('bons-transport-queue', {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }) => {
    console.log('[SW] Processing bons transport sync queue...');
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Bon transport synced successfully');
      } catch (error) {
        console.error('[SW] Bon transport sync failed, re-queuing:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    notifyClients({ type: 'SYNC_COMPLETE', entity: 'bonsTransport' });
  },
});

// Queue pour les bons de location
const bonsLocationQueue = new BackgroundSyncPlugin('bons-location-queue', {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }) => {
    console.log('[SW] Processing bons location sync queue...');
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Bon location synced successfully');
      } catch (error) {
        console.error('[SW] Bon location sync failed, re-queuing:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    notifyClients({ type: 'SYNC_COMPLETE', entity: 'bonsLocation' });
  },
});

// Queue pour les pannes
const pannesQueue = new BackgroundSyncPlugin('pannes-queue', {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }) => {
    console.log('[SW] Processing pannes sync queue...');
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Panne synced successfully');
      } catch (error) {
        console.error('[SW] Panne sync failed, re-queuing:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    notifyClients({ type: 'SYNC_COMPLETE', entity: 'pannes' });
  },
});

// Queue générale pour sync batch
const syncBatchQueue = new BackgroundSyncPlugin('sync-batch-queue', {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }) => {
    console.log('[SW] Processing batch sync queue...');
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Batch sync completed successfully');
      } catch (error) {
        console.error('[SW] Batch sync failed, re-queuing:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    notifyClients({ type: 'SYNC_COMPLETE', entity: 'all' });
  },
});

// ==================== ROUTING STRATEGIES ====================

// API calls - Network First with Background Sync for POST/PUT/DELETE
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/sync') && request.method === 'POST',
  new NetworkFirst({
    cacheName: 'sync-api-cache',
    plugins: [
      syncBatchQueue,
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 heure
      }),
    ],
    networkTimeoutSeconds: 30,
  }),
  'POST'
);

// Dotations API with background sync
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/carburant/dotations') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'dotations-api-cache',
    plugins: [dotationsQueue],
    networkTimeoutSeconds: 15,
  }),
  'POST'
);

// Sorties stock API with background sync
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/pieces/sorties') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'sorties-api-cache',
    plugins: [sortiesStockQueue],
    networkTimeoutSeconds: 15,
  }),
  'POST'
);

// Transport API with background sync
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/transport') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'transport-api-cache',
    plugins: [bonsTransportQueue],
    networkTimeoutSeconds: 15,
  }),
  'POST'
);

// Location API with background sync
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/location') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'location-api-cache',
    plugins: [bonsLocationQueue],
    networkTimeoutSeconds: 15,
  }),
  'POST'
);

// Pannes API with background sync
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/pannes') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'pannes-api-cache',
    plugins: [pannesQueue],
    networkTimeoutSeconds: 15,
  }),
  'POST'
);

// GET API calls - Network First with cache fallback
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-get-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24, // 24 heures
      }),
    ],
    networkTimeoutSeconds: 10,
  })
);

// Static assets - Cache First
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
      }),
    ],
  })
);

// Images - Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 jours
      }),
    ],
  })
);

// ==================== MESSAGE HANDLING ====================

// Notify all clients of sync events
async function notifyClients(message: { type: string; entity: string; data?: any }) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_SYNC_STATUS') {
    // Respond with queue status
    event.ports[0]?.postMessage({
      type: 'SYNC_STATUS',
      queues: {
        dotations: 'active',
        sortiesStock: 'active',
        bonsTransport: 'active',
        bonsLocation: 'active',
        pannes: 'active',
      },
    });
  }

  if (event.data && event.data.type === 'FORCE_SYNC') {
    // Trigger manual sync
    self.registration.sync?.register('manual-sync').catch(console.error);
  }
});

// ==================== SYNC EVENT HANDLERS ====================

// Manual sync trigger
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event triggered:', event.tag);

  if (event.tag === 'manual-sync') {
    event.waitUntil(
      (async () => {
        notifyClients({ type: 'SYNC_STARTED', entity: 'all' });
        // The queues will process automatically
        notifyClients({ type: 'SYNC_COMPLETE', entity: 'all' });
      })()
    );
  }
});

// ==================== PERIODIC SYNC ====================

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'sync-pending-data') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(
      (async () => {
        notifyClients({ type: 'PERIODIC_SYNC_STARTED', entity: 'all' });
      })()
    );
  }
});

// ==================== INSTALL & ACTIVATE ====================

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    (async () => {
      // Claim all clients immediately
      await self.clients.claim();
      // Notify clients that SW is ready
      notifyClients({ type: 'SW_ACTIVATED', entity: 'sw' });
    })()
  );
});

// ==================== OFFLINE FALLBACK ====================

// Handle offline page requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests for navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // Return cached index.html for SPA routing
          const cache = await caches.open('offline-cache');
          const cachedResponse = await cache.match('/index.html');
          if (cachedResponse) {
            return cachedResponse;
          }
          // Ultimate fallback
          return new Response('Offline - Page non disponible', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      })()
    );
  }
});

console.log('[SW] ACL Platform Service Worker loaded');
