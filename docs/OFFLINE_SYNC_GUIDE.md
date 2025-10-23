# Panduan Offline Sync - Vena Pictures Dashboard

## 📋 Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Arsitektur](#arsitektur)
3. [Cara Kerja](#cara-kerja)
4. [Implementasi](#implementasi)
5. [Contoh Penggunaan](#contoh-penggunaan)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Pengenalan

Sistem Offline Sync memungkinkan aplikasi tetap berfungsi penuh tanpa koneksi internet. Data disimpan secara lokal dan otomatis disinkronkan ke Supabase saat koneksi tersedia.

### Fitur Utama:
- ✅ **Offline-First**: Aplikasi tetap berfungsi tanpa internet
- ✅ **Auto-Sync**: Sinkronisasi otomatis saat online
- ✅ **Queue System**: Operasi disimpan dan diproses berurutan
- ✅ **Optimistic Updates**: UI update langsung, sync di background
- ✅ **Cache Management**: Data di-cache untuk akses cepat
- ✅ **Retry Logic**: Operasi gagal akan dicoba ulang
- ✅ **Visual Indicator**: Status sync ditampilkan ke user

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  (Clients, Projects, Transactions, dll)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              useOfflineSync Hook                         │
│  - Monitor online/offline status                        │
│  - Trigger sync                                         │
│  - Queue operations                                     │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  Sync Manager    │    │ Offline Storage  │
│  - Auto sync     │    │  (IndexedDB)     │
│  - Process queue │    │  - Pending ops   │
│  - Retry logic   │    │  - Cached data   │
└────────┬─────────┘    └──────────────────┘
         │
         ▼
┌──────────────────┐
│    Supabase      │
│   (PostgreSQL)   │
└──────────────────┘
```

---

## ⚙️ Cara Kerja

### 1. Saat User Melakukan Operasi (INSERT/UPDATE/DELETE)

**Scenario A: Online**
```
User Action → Service → Supabase (langsung) → Success
                     └→ Cache Update
```

**Scenario B: Offline**
```
User Action → Service → Queue Operation → IndexedDB
                     └→ Optimistic UI Update
                     └→ Cache Update
```

### 2. Saat Koneksi Kembali Online

```
Online Event → Sync Manager → Get Pending Operations
                           → Process Each Operation (FIFO)
                           → Update Supabase
                           → Remove from Queue
                           → Update UI
```

### 3. Auto-Sync

```
Every 30 seconds → Check if Online
                → Check if Has Pending Operations
                → Trigger Sync
```

---

## 🚀 Implementasi

### Step 1: Tambahkan Offline Sync Indicator ke App

Edit `App.tsx`:

```tsx
import { OfflineSyncIndicator } from './components/OfflineSyncIndicator';

function App() {
  return (
    <div>
      {/* Your existing app content */}
      
      {/* Add this at the end */}
      <OfflineSyncIndicator />
    </div>
  );
}
```

### Step 2: Gunakan Hook di Component

```tsx
import { useOfflineSync } from '../hooks/useOfflineSync';

function MyComponent() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    queueInsert,
    queueUpdate,
    queueDelete,
  } = useOfflineSync();

  // Your component logic
}
```

### Step 3: Implementasi Service dengan Offline Support

Lihat contoh di `services/clientsOffline.ts` untuk pattern yang bisa diikuti.

**Pattern Umum:**

```typescript
export async function createItemOffline(item: Item): Promise<Item> {
  const newItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  try {
    if (!navigator.onLine) {
      // Queue untuk sync nanti
      await syncManager.queueInsert('table_name', newItem);
      // Update cache optimistically
      await updateCache(newItem);
      return newItem;
    }

    // Insert ke Supabase
    const { data, error } = await supabase
      .from('table_name')
      .insert(newItem)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    // Fallback: queue untuk sync nanti
    await syncManager.queueInsert('table_name', newItem);
    await updateCache(newItem);
    return newItem;
  }
}
```

---

## 💡 Contoh Penggunaan

### Contoh 1: Create Client Offline

```tsx
import { createClientOffline } from '../services/clientsOffline';

async function handleCreateClient() {
  try {
    const newClient = await createClientOffline({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '081234567890',
      status: 'active',
      clientType: 'individual',
    });

    console.log('Client created:', newClient);
    // UI akan update langsung, sync otomatis di background
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Contoh 2: Update dengan Offline Support

```tsx
import { updateClientOffline } from '../services/clientsOffline';

async function handleUpdateClient(id: string) {
  try {
    const updated = await updateClientOffline(id, {
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    console.log('Client updated:', updated);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Contoh 3: Manual Sync Trigger

```tsx
import { useOfflineSync } from '../hooks/useOfflineSync';

function SyncButton() {
  const { triggerSync, isSyncing, pendingCount } = useOfflineSync();

  return (
    <button 
      onClick={triggerSync}
      disabled={isSyncing || pendingCount === 0}
    >
      {isSyncing ? 'Syncing...' : `Sync ${pendingCount} items`}
    </button>
  );
}
```

### Contoh 4: Cache Data untuk Performa

```tsx
import { useOfflineSync } from '../hooks/useOfflineSync';

async function loadDashboardData() {
  const { getCachedData, cacheData } = useOfflineSync();

  // Cek cache dulu
  let data = await getCachedData('dashboard_stats');
  
  if (!data) {
    // Fetch dari API
    data = await fetchDashboardStats();
    // Cache selama 15 menit
    await cacheData('dashboard_stats', data, 15);
  }

  return data;
}
```

---

## 🎯 Best Practices

### 1. Selalu Handle Offline State

```tsx
const { isOnline } = useOfflineSync();

if (!isOnline) {
  return <OfflineWarning />;
}
```

### 2. Gunakan Optimistic Updates

```tsx
// Update UI dulu
setClients(prev => [...prev, newClient]);

// Sync di background
createClientOffline(newClient).catch(error => {
  // Rollback jika gagal
  setClients(prev => prev.filter(c => c.id !== newClient.id));
  showError(error);
});
```

### 3. Cache Data yang Jarang Berubah

```tsx
// Cache packages selama 1 jam
await cacheData('packages', packages, 60);

// Cache profile selama 30 menit
await cacheData('profile', profile, 30);
```

### 4. Berikan Feedback ke User

```tsx
const { isSyncing, syncMessage, pendingCount } = useOfflineSync();

return (
  <div>
    {isSyncing && <LoadingSpinner message={syncMessage} />}
    {pendingCount > 0 && (
      <Badge>{pendingCount} pending</Badge>
    )}
  </div>
);
```

### 5. Handle Conflict Resolution

Jika ada konflik data (misalnya data sudah diubah di server), implementasikan strategi:

```typescript
// Last-write-wins (default)
await supabase.from('table').update(data).eq('id', id);

// Atau gunakan timestamp
await supabase
  .from('table')
  .update(data)
  .eq('id', id)
  .lt('updated_at', data.updated_at);
```

---

## 🔧 Troubleshooting

### Problem: Data tidak tersinkronisasi

**Solusi:**
1. Cek koneksi internet
2. Buka DevTools → Application → IndexedDB → `vena_offline_db`
3. Lihat `pending_operations` untuk operasi yang pending
4. Trigger manual sync: `syncManager.sync()`

### Problem: Operasi gagal terus menerus

**Solusi:**
1. Cek error di `pending_operations.error`
2. Operasi akan dihapus setelah 5x retry
3. Fix error di Supabase (permissions, constraints, dll)

### Problem: Cache tidak ter-update

**Solusi:**
```typescript
// Clear cache manual
await offlineStorage.removeCachedData('cache_key');

// Clear semua cache
await offlineStorage.clearExpiredCache();
```

### Problem: IndexedDB penuh

**Solusi:**
```typescript
// Clear semua data offline
await offlineStorage.clearAll();
```

### Debug Mode

Aktifkan logging untuk debug:

```typescript
// Di console browser
localStorage.setItem('DEBUG_OFFLINE_SYNC', 'true');

// Reload page
location.reload();
```

---

## 📊 Monitoring

### Cek Status Sync

```typescript
import { syncManager } from './services/syncManager';

// Get pending count
const count = await syncManager.getPendingCount();

// Get last sync time
const lastSync = await syncManager.getLastSyncTime();

// Check if syncing
const isSyncing = syncManager.isSyncInProgress();
```

### Listen to Sync Events

```typescript
const unsubscribe = syncManager.on((event) => {
  console.log('Sync event:', event);
  
  switch (event.type) {
    case 'sync-start':
      console.log('Sync started');
      break;
    case 'sync-progress':
      console.log(`Progress: ${event.progress}/${event.total}`);
      break;
    case 'sync-complete':
      console.log('Sync completed');
      break;
    case 'sync-error':
      console.error('Sync error:', event.error);
      break;
  }
});

// Cleanup
unsubscribe();
```

---

## 🎓 Tips & Tricks

### 1. Preload Data Saat App Start

```typescript
useEffect(() => {
  // Preload critical data
  Promise.all([
    listClientsOffline(),
    listProjectsOffline(),
    getProfileOffline(),
  ]).then(() => {
    console.log('Data preloaded');
  });
}, []);
```

### 2. Background Sync untuk PWA

Jika menggunakan Service Worker:

```typescript
// Register background sync
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  navigator.serviceWorker.ready.then(registration => {
    return registration.sync.register('sync-data');
  });
}
```

### 3. Compress Data untuk Storage

```typescript
// Gunakan compression untuk data besar
import pako from 'pako';

const compressed = pako.deflate(JSON.stringify(largeData));
await cacheData('large_data', compressed);
```

---

## 📚 Resources

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Online/Offline Events](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Offline-First Architecture](https://offlinefirst.org/)

---

## 🤝 Kontribusi

Jika menemukan bug atau punya saran improvement, silakan buat issue atau PR di repository.

---

**Happy Coding! 🚀**
