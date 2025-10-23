# 📱 Implementasi Offline Sync - Vena Pictures Dashboard

## 🎯 Overview

Sistem offline sync telah diimplementasikan untuk memungkinkan aplikasi tetap berfungsi penuh tanpa koneksi internet. Data akan disimpan secara lokal menggunakan IndexedDB dan otomatis tersinkronisasi ke Supabase saat koneksi tersedia.

## ✨ Fitur yang Diimplementasikan

### 1. **Offline Storage Service** (`services/offlineStorage.ts`)
- Menggunakan IndexedDB untuk penyimpanan lokal yang robust
- Menyimpan pending operations (INSERT, UPDATE, DELETE)
- Cache management dengan TTL (Time To Live)
- Sync status tracking

### 2. **Sync Manager** (`services/syncManager.ts`)
- Auto-sync setiap 30 detik saat online
- Queue system dengan FIFO (First In First Out)
- Retry logic untuk operasi yang gagal (max 5x)
- Event system untuk monitoring sync progress

### 3. **React Hook** (`hooks/useOfflineSync.ts`)
- Monitor status online/offline
- Trigger manual sync
- Queue operations (insert, update, delete)
- Cache management
- Real-time sync status

### 4. **UI Indicator** (`components/OfflineSyncIndicator.tsx`)
- Visual indicator status koneksi
- Menampilkan pending operations count
- Progress bar saat syncing
- Warning message saat offline

### 5. **Service Examples**
- `services/clientsOffline.ts` - Clients dengan offline support
- `services/projectsOffline.ts` - Projects dengan offline support
- `services/transactionsOffline.ts` - Transactions dengan offline support

## 📁 File yang Dibuat

```
services/
├── offlineStorage.ts          # IndexedDB wrapper (300+ lines)
├── syncManager.ts             # Sync orchestration (250+ lines)
├── clientsOffline.ts          # Clients offline service (150+ lines)
├── projectsOffline.ts         # Projects offline service (150+ lines)
└── transactionsOffline.ts     # Transactions offline service (170+ lines)

hooks/
└── useOfflineSync.ts          # React hook (120+ lines)

components/
└── OfflineSyncIndicator.tsx   # UI indicator (150+ lines)

docs/
├── OFFLINE_README.md          # Overview & quick reference
├── OFFLINE_QUICK_START.md     # Quick start guide
├── OFFLINE_SYNC_GUIDE.md      # Complete documentation
└── OFFLINE_TESTING.md         # Testing guide
```

## 🚀 Cara Menggunakan

### Setup Awal (5 Menit)

1. **Tambahkan Indicator ke App.tsx**:

```tsx
import { OfflineSyncIndicator } from './components/OfflineSyncIndicator';

function App() {
  return (
    <>
      {/* Konten aplikasi existing */}
      
      {/* Tambahkan di akhir */}
      <OfflineSyncIndicator />
    </>
  );
}
```

2. **Gunakan Hook di Component**:

```tsx
import { useOfflineSync } from '../hooks/useOfflineSync';
import { createClientOffline } from '../services/clientsOffline';

function ClientsComponent() {
  const { isOnline, pendingCount, queueInsert } = useOfflineSync();

  const handleCreate = async (data) => {
    const client = await createClientOffline(data);
    // UI update langsung, sync otomatis di background
  };

  return (
    <div>
      {!isOnline && <div className="offline-warning">Anda sedang offline</div>}
      {pendingCount > 0 && <span>{pendingCount} data menunggu sync</span>}
      {/* UI component lainnya */}
    </div>
  );
}
```

### Implementasi untuk Tabel Baru

Ikuti pattern di `services/clientsOffline.ts`:

```typescript
// 1. Import dependencies
import { supabase } from '../lib/supabaseClient';
import { syncManager } from './syncManager';
import { offlineStorage } from './offlineStorage';

// 2. Define constants
const TABLE_NAME = 'your_table';
const CACHE_KEY = 'your_table_cache';
const CACHE_TTL = 30; // minutes

// 3. Implement CRUD functions
export async function listItemsOffline() { /* ... */ }
export async function createItemOffline() { /* ... */ }
export async function updateItemOffline() { /* ... */ }
export async function deleteItemOffline() { /* ... */ }
```

## 🎨 Cara Kerja

### Skenario 1: User Offline

```
User Input
    ↓
Queue ke IndexedDB (pending_operations)
    ↓
Update UI (Optimistic Update)
    ↓
Update Cache
    ↓
Tampilkan "Data disimpan offline"
```

### Skenario 2: User Online Kembali

```
Deteksi Online Event
    ↓
Sync Manager Triggered
    ↓
Get Pending Operations dari IndexedDB
    ↓
Process Each Operation (FIFO)
    ↓
Sync ke Supabase
    ↓
Remove dari Queue
    ↓
Update UI
    ↓
Tampilkan "Sync selesai"
```

### Skenario 3: Auto-Sync

```
Every 30 seconds
    ↓
Check if Online
    ↓
Check if Has Pending Operations
    ↓
Trigger Sync
```

## 💡 Contoh Penggunaan

### Create Data Offline

```tsx
import { createClientOffline } from '../services/clientsOffline';

async function handleCreateClient() {
  const client = await createClientOffline({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '081234567890',
    status: 'active',
    clientType: 'individual',
  });
  
  console.log('Client created:', client);
  // ✅ Data tersimpan lokal
  // ✅ UI update langsung
  // ✅ Sync otomatis saat online
}
```

### Update Data Offline

```tsx
import { updateClientOffline } from '../services/clientsOffline';

async function handleUpdateClient(id: string) {
  await updateClientOffline(id, {
    name: 'Jane Doe',
    email: 'jane@example.com',
  });
  
  // ✅ Perubahan tersimpan lokal
  // ✅ Sync otomatis saat online
}
```

### Manual Sync

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

### Cache Data

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

## 🔧 Testing

### Test Manual

1. Buka aplikasi di browser
2. Buka DevTools (F12) → Network tab
3. Ubah "Online" menjadi "Offline"
4. Coba buat/edit/hapus data
5. Cek IndexedDB → `vena_offline_db` → `pending_operations`
6. Ubah kembali ke "Online"
7. Data akan otomatis tersinkronisasi!

### Debug di Console

```javascript
// Check pending operations
const ops = await offlineStorage.getPendingOperations();
console.table(ops);

// Check cache
const cached = await offlineStorage.getCachedData('clients_list');
console.log(cached);

// Force sync
await syncManager.sync();

// Clear all offline data
await offlineStorage.clearAll();
```

## 📊 Monitoring

### Check Status

```typescript
import { syncManager } from './services/syncManager';

// Get pending count
const count = await syncManager.getPendingCount();

// Get last sync time
const lastSync = await syncManager.getLastSyncTime();

// Check if syncing
const isSyncing = syncManager.isSyncInProgress();
```

### Listen to Events

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

## ⚙️ Konfigurasi

### Auto-Sync Interval

Default: 30 detik. Ubah di `services/syncManager.ts`:

```typescript
// Constructor
this.startAutoSync(30000); // 30 seconds

// Atau ubah runtime
syncManager.startAutoSync(60000); // 60 seconds
```

### Cache TTL

Default berbeda per tabel:
- Clients: 30 menit
- Projects: 30 menit
- Transactions: 15 menit

Ubah di masing-masing service file.

### Retry Limit

Default: 5x. Ubah di `services/syncManager.ts`:

```typescript
if (op.retryCount >= 5) { // Ubah angka ini
  // Remove operation
}
```

## 🎯 Best Practices

1. **Selalu handle offline state** - Tampilkan warning/badge ke user
2. **Gunakan optimistic updates** - Update UI dulu, sync di background
3. **Cache data yang jarang berubah** - Packages, settings, dll
4. **Berikan feedback ke user** - Loading state, sync progress, dll
5. **Test offline mode** - Selalu test fitur dalam mode offline

## 🐛 Troubleshooting

### Data tidak tersinkronisasi?

1. Cek koneksi internet
2. Cek browser console untuk error
3. Cek IndexedDB → `vena_offline_db` → `pending_operations`
4. Trigger manual sync: `syncManager.sync()`

### Cache tidak update?

```javascript
// Clear cache
await offlineStorage.removeCachedData('cache_key');
```

### IndexedDB penuh?

```javascript
// Clear all offline data
await offlineStorage.clearAll();
```

## 📚 Dokumentasi Lengkap

Lihat dokumentasi lengkap di folder `docs/`:

- **[OFFLINE_README.md](./docs/OFFLINE_README.md)** - Overview & quick reference
- **[OFFLINE_QUICK_START.md](./docs/OFFLINE_QUICK_START.md)** - Quick start guide
- **[OFFLINE_SYNC_GUIDE.md](./docs/OFFLINE_SYNC_GUIDE.md)** - Complete documentation
- **[OFFLINE_TESTING.md](./docs/OFFLINE_TESTING.md)** - Testing guide

## 🚧 Next Steps

Untuk mengimplementasikan offline sync di seluruh aplikasi:

1. ✅ Tambahkan `<OfflineSyncIndicator />` ke `App.tsx`
2. ✅ Buat service offline untuk tabel lain (leads, team_members, dll)
3. ✅ Update component existing untuk menggunakan service offline
4. ✅ Test semua fitur dalam mode offline
5. ✅ Monitor sync success rate di production

## 🎓 Saran Implementasi

### Prioritas Tinggi (Implementasi Segera)

1. **Clients** - ✅ Sudah ada (`clientsOffline.ts`)
2. **Projects** - ✅ Sudah ada (`projectsOffline.ts`)
3. **Transactions** - ✅ Sudah ada (`transactionsOffline.ts`)

### Prioritas Sedang (Implementasi Berikutnya)

4. **Leads** - Penting untuk sales pipeline
5. **Team Members** - Penting untuk project assignment
6. **Contracts** - Penting untuk legal tracking

### Prioritas Rendah (Optional)

7. **Packages** - Jarang berubah, bisa pakai cache saja
8. **Add-ons** - Jarang berubah, bisa pakai cache saja
9. **Promo Codes** - Jarang berubah, bisa pakai cache saja

## 💪 Keuntungan

1. **User Experience** - Aplikasi tetap berfungsi tanpa internet
2. **Data Integrity** - Tidak ada data yang hilang
3. **Performance** - Cache mempercepat loading
4. **Mobile-Friendly** - Cocok untuk aplikasi mobile dengan koneksi tidak stabil
5. **Reliability** - Retry logic memastikan data tersinkronisasi

## ⚠️ Catatan Penting

1. **ID Generation**: Gunakan `crypto.randomUUID()` untuk generate ID di client-side
2. **Timestamp**: Gunakan `new Date().toISOString()` untuk timestamp
3. **Conflict Resolution**: Saat ini menggunakan "last-write-wins" strategy
4. **Retry Limit**: Operasi akan dicoba maksimal 5x sebelum dihapus
5. **Browser Support**: Memerlukan browser yang support IndexedDB (semua modern browsers)

---

## 🎉 Kesimpulan

Sistem offline sync telah siap digunakan! Implementasi ini memberikan foundation yang solid untuk aplikasi yang bisa berfungsi tanpa koneksi internet. Tinggal integrasikan ke component existing dan test dengan skenario offline.

**Happy Coding! 🚀**

---

*Dibuat: 2024*
*Last Updated: 2024*
