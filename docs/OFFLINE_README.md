# 📱 Offline Sync - Vena Pictures Dashboard

Sistem penyimpanan lokal dan sinkronisasi otomatis untuk aplikasi yang tetap berfungsi tanpa koneksi internet.

## 🎯 Fitur

- ✅ **Offline-First**: Aplikasi tetap berfungsi tanpa internet
- ✅ **Auto-Sync**: Sinkronisasi otomatis setiap 30 detik saat online
- ✅ **Queue System**: Operasi disimpan dan diproses berurutan (FIFO)
- ✅ **Optimistic Updates**: UI update langsung, sync di background
- ✅ **Smart Caching**: Data di-cache dengan TTL untuk performa optimal
- ✅ **Retry Logic**: Operasi gagal akan dicoba ulang (max 5x)
- ✅ **Visual Feedback**: Indicator status sync untuk user

## 📦 Struktur File

```
services/
├── offlineStorage.ts          # IndexedDB wrapper
├── syncManager.ts             # Sync orchestration
├── clientsOffline.ts          # Contoh: Clients dengan offline support
├── projectsOffline.ts         # Contoh: Projects dengan offline support
└── transactionsOffline.ts     # Contoh: Transactions dengan offline support

hooks/
└── useOfflineSync.ts          # React hook untuk offline sync

components/
└── OfflineSyncIndicator.tsx   # UI indicator status sync

docs/
├── OFFLINE_README.md          # Overview (file ini)
├── OFFLINE_QUICK_START.md     # Quick start guide
└── OFFLINE_SYNC_GUIDE.md      # Dokumentasi lengkap
```

## 🚀 Quick Start

### 1. Setup (1 menit)

Tambahkan indicator ke `App.tsx`:

```tsx
import { OfflineSyncIndicator } from './components/OfflineSyncIndicator';

function App() {
  return (
    <>
      {/* Your app content */}
      <OfflineSyncIndicator />
    </>
  );
}
```

### 2. Gunakan di Component

```tsx
import { useOfflineSync } from '../hooks/useOfflineSync';
import { createClientOffline } from '../services/clientsOffline';

function ClientsComponent() {
  const { isOnline, pendingCount } = useOfflineSync();

  const handleCreate = async (data) => {
    const client = await createClientOffline(data);
    // UI update langsung, sync otomatis di background
  };

  return (
    <div>
      {!isOnline && <OfflineWarning />}
      {pendingCount > 0 && <Badge>{pendingCount} pending</Badge>}
      {/* Your component UI */}
    </div>
  );
}
```

### 3. Test

1. Buka DevTools → Network → Set "Offline"
2. Buat/edit data
3. Set "Online"
4. Data otomatis tersinkronisasi! ✨

## 📚 Dokumentasi

- **[Quick Start Guide](./OFFLINE_QUICK_START.md)** - Panduan cepat implementasi
- **[Complete Guide](./OFFLINE_SYNC_GUIDE.md)** - Dokumentasi lengkap dengan contoh

## 🔧 Cara Kerja

### Saat Offline:
```
User Input → Queue ke IndexedDB → Update UI (Optimistic)
```

### Saat Online Kembali:
```
Auto-Sync → Process Queue (FIFO) → Sync ke Supabase → Update UI
```

### Auto-Sync:
```
Every 30s → Check Online → Check Pending → Sync
```

## 💡 Contoh Penggunaan

### Create Data Offline

```tsx
const client = await createClientOffline({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '081234567890',
});
// ✅ Data tersimpan lokal
// ✅ UI update langsung
// ✅ Sync otomatis saat online
```

### Update Data Offline

```tsx
await updateClientOffline(clientId, {
  name: 'Jane Doe',
  email: 'jane@example.com',
});
// ✅ Perubahan tersimpan lokal
// ✅ Sync otomatis saat online
```

### Manual Sync

```tsx
const { triggerSync } = useOfflineSync();

<button onClick={triggerSync}>
  Sync Now
</button>
```

## 🎨 UI Components

### Offline Indicator (Built-in)

Otomatis muncul saat:
- Offline
- Ada pending operations
- Sedang syncing

### Custom Badge

```tsx
function MyBadge() {
  const { pendingCount } = useOfflineSync();
  return pendingCount > 0 ? <Badge>{pendingCount}</Badge> : null;
}
```

## 🔍 Monitoring & Debug

### Check Pending Operations

```js
// Browser console
const ops = await offlineStorage.getPendingOperations();
console.table(ops);
```

### Check Cache

```js
// Browser console
const cached = await offlineStorage.getCachedData('clients_list');
console.log(cached);
```

### Force Sync

```js
// Browser console
await syncManager.sync();
```

### Clear All

```js
// Browser console
await offlineStorage.clearAll();
```

## 📊 Supported Tables

Saat ini sudah ada contoh implementasi untuk:

- ✅ `clients` - Client management
- ✅ `projects` - Project management
- ✅ `transactions` - Financial transactions

Untuk tabel lain, ikuti pattern yang sama di `services/clientsOffline.ts`.

## ⚙️ Configuration

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
- Transactions: 15 menit (lebih sering berubah)

Ubah di masing-masing service file.

### Retry Limit

Default: 5x. Ubah di `services/syncManager.ts`:

```typescript
if (op.retryCount >= 5) { // Ubah angka ini
  // Remove operation
}
```

## 🐛 Troubleshooting

### Data tidak tersinkronisasi?

1. Cek koneksi internet
2. Cek browser console untuk error
3. Cek IndexedDB → `vena_offline_db` → `pending_operations`
4. Trigger manual sync: `syncManager.sync()`

### Cache tidak update?

```js
// Clear cache
await offlineStorage.removeCachedData('cache_key');
```

### IndexedDB penuh?

```js
// Clear all offline data
await offlineStorage.clearAll();
```

## 🎓 Best Practices

1. **Selalu handle offline state** - Tampilkan warning/badge ke user
2. **Gunakan optimistic updates** - Update UI dulu, sync di background
3. **Cache data yang jarang berubah** - Packages, settings, dll
4. **Berikan feedback ke user** - Loading state, sync progress, dll
5. **Test offline mode** - Selalu test fitur dalam mode offline

## 🚧 Roadmap

- [ ] Conflict resolution yang lebih sophisticated
- [ ] Background sync untuk PWA
- [ ] Data compression untuk large datasets
- [ ] Analytics untuk track sync success rate
- [ ] Batch sync untuk performa lebih baik

## 📞 Support

Jika ada pertanyaan atau menemukan bug:
1. Lihat [Complete Guide](./OFFLINE_SYNC_GUIDE.md)
2. Lihat [Quick Start](./OFFLINE_QUICK_START.md)
3. Hubungi tim development

---

**Happy Coding! 🚀**

*Last updated: 2024*
