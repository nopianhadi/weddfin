# Quick Start - Offline Sync

Panduan cepat untuk mengimplementasikan offline sync di aplikasi Vena Pictures Dashboard.

## 🚀 Setup (5 Menit)

### 1. Tambahkan Indicator ke App.tsx

```tsx
import { OfflineSyncIndicator } from './components/OfflineSyncIndicator';

// Di dalam return App component, tambahkan di akhir:
<OfflineSyncIndicator />
```

### 2. Test Offline Mode

1. Buka aplikasi di browser
2. Buka DevTools (F12)
3. Pilih tab "Network"
4. Ubah "Online" menjadi "Offline"
5. Coba buat/edit data
6. Ubah kembali ke "Online"
7. Data akan otomatis tersinkronisasi!

## 📝 Implementasi di Component Existing

### Contoh: Tambahkan Offline Support ke Clients Component

**Before:**
```tsx
import { createClient } from '../services/clients';

const handleCreate = async (data) => {
  const client = await createClient(data);
  setClients([...clients, client]);
};
```

**After:**
```tsx
import { createClientOffline } from '../services/clientsOffline';
import { useOfflineSync } from '../hooks/useOfflineSync';

const { isOnline, pendingCount } = useOfflineSync();

const handleCreate = async (data) => {
  const client = await createClientOffline(data);
  setClients([...clients, client]);
  
  // Optional: Show notification
  if (!isOnline) {
    showNotification('Data disimpan offline, akan disinkronkan saat online');
  }
};
```

## 🔄 Membuat Service Baru dengan Offline Support

### Template untuk Service Baru

```typescript
// services/[tableName]Offline.ts

import { supabase } from '../lib/supabaseClient';
import { syncManager } from './syncManager';
import { offlineStorage } from './offlineStorage';

const TABLE_NAME = 'your_table_name';
const CACHE_KEY = 'your_table_cache';
const CACHE_TTL = 30; // minutes

// LIST
export async function listItemsOffline() {
  try {
    if (!navigator.onLine) {
      const cached = await offlineStorage.getCachedData(CACHE_KEY);
      return cached || [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await offlineStorage.cacheData(CACHE_KEY, data, CACHE_TTL);
    return data || [];
  } catch (error) {
    const cached = await offlineStorage.getCachedData(CACHE_KEY);
    return cached || [];
  }
}

// CREATE
export async function createItemOffline(item) {
  const newItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  try {
    if (!navigator.onLine) {
      await syncManager.queueInsert(TABLE_NAME, newItem);
      await updateCacheOptimistically('add', newItem);
      return newItem;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(newItem)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    await syncManager.queueInsert(TABLE_NAME, newItem);
    await updateCacheOptimistically('add', newItem);
    return newItem;
  }
}

// UPDATE
export async function updateItemOffline(id, updates) {
  try {
    if (!navigator.onLine) {
      await syncManager.queueUpdate(TABLE_NAME, { id, ...updates });
      await updateCacheOptimistically('update', { id, ...updates });
      return { id, ...updates };
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    await syncManager.queueUpdate(TABLE_NAME, { id, ...updates });
    await updateCacheOptimistically('update', { id, ...updates });
    return { id, ...updates };
  }
}

// DELETE
export async function deleteItemOffline(id) {
  try {
    if (!navigator.onLine) {
      await syncManager.queueDelete(TABLE_NAME, id);
      await updateCacheOptimistically('delete', { id });
      return;
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
  } catch (error) {
    await syncManager.queueDelete(TABLE_NAME, id);
    await updateCacheOptimistically('delete', { id });
  }
}

// Helper: Update cache optimistically
async function updateCacheOptimistically(action, item) {
  const cached = await offlineStorage.getCachedData(CACHE_KEY);
  if (!cached) return;

  let updated;
  switch (action) {
    case 'add':
      updated = [item, ...cached];
      break;
    case 'update':
      updated = cached.map(c => c.id === item.id ? { ...c, ...item } : c);
      break;
    case 'delete':
      updated = cached.filter(c => c.id !== item.id);
      break;
  }

  await offlineStorage.cacheData(CACHE_KEY, updated, CACHE_TTL);
}
```

## 🎨 UI Components untuk Offline State

### 1. Offline Badge

```tsx
function OfflineBadge() {
  const { isOnline, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
      {!isOnline && <span>📡 Offline</span>}
      {pendingCount > 0 && <span>{pendingCount} pending</span>}
    </div>
  );
}
```

### 2. Sync Button

```tsx
function SyncButton() {
  const { triggerSync, isSyncing, pendingCount, isOnline } = useOfflineSync();

  if (!isOnline || pendingCount === 0) return null;

  return (
    <button
      onClick={triggerSync}
      disabled={isSyncing}
      className="btn-primary"
    >
      {isSyncing ? (
        <>
          <RefreshIcon className="animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <CloudIcon />
          Sync {pendingCount} items
        </>
      )}
    </button>
  );
}
```

### 3. Offline Warning Banner

```tsx
function OfflineWarning() {
  const { isOnline } = useOfflineSync();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <AlertIcon className="text-yellow-400" />
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Anda sedang offline. Perubahan akan disimpan dan disinkronkan saat online kembali.
          </p>
        </div>
      </div>
    </div>
  );
}
```

## 🧪 Testing

### Test Scenario 1: Create Offline

1. Set browser ke offline mode
2. Buat client baru
3. Cek IndexedDB → `pending_operations` (harus ada 1 entry)
4. Set browser ke online mode
5. Tunggu 30 detik atau trigger manual sync
6. Cek Supabase → data harus sudah masuk

### Test Scenario 2: Update Offline

1. Set browser ke offline mode
2. Edit client existing
3. Cek IndexedDB → `pending_operations` (harus ada 1 entry)
4. Set browser ke online mode
5. Data akan otomatis tersinkronisasi

### Test Scenario 3: Multiple Operations

1. Set browser ke offline mode
2. Buat 3 clients baru
3. Edit 2 clients existing
4. Delete 1 client
5. Cek IndexedDB → `pending_operations` (harus ada 6 entries)
6. Set browser ke online mode
7. Semua operasi akan diproses berurutan

## 📊 Monitoring

### Check Pending Operations

```typescript
// Di browser console
const ops = await offlineStorage.getPendingOperations();
console.table(ops);
```

### Check Cache

```typescript
// Di browser console
const cached = await offlineStorage.getCachedData('clients_list');
console.log(cached);
```

### Force Sync

```typescript
// Di browser console
await syncManager.sync();
```

### Clear All Offline Data

```typescript
// Di browser console
await offlineStorage.clearAll();
```

## ⚠️ Important Notes

1. **ID Generation**: Gunakan `crypto.randomUUID()` untuk generate ID di client-side
2. **Timestamp**: Gunakan `new Date().toISOString()` untuk timestamp
3. **Conflict Resolution**: Saat ini menggunakan "last-write-wins" strategy
4. **Retry Limit**: Operasi akan dicoba maksimal 5x sebelum dihapus
5. **Auto-Sync Interval**: Default 30 detik, bisa diubah di `syncManager.startAutoSync(ms)`

## 🎯 Next Steps

1. ✅ Implementasi offline support untuk semua tabel critical (clients, projects, transactions)
2. ✅ Tambahkan conflict resolution yang lebih sophisticated
3. ✅ Implementasi background sync untuk PWA
4. ✅ Tambahkan analytics untuk track sync success rate
5. ✅ Implementasi data compression untuk large datasets

## 🆘 Need Help?

Lihat dokumentasi lengkap di `docs/OFFLINE_SYNC_GUIDE.md` atau hubungi tim development.

---

**Selamat mencoba! 🎉**
