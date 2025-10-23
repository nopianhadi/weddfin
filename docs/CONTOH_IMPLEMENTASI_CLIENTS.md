# Contoh Implementasi Offline Sync di Clients Component

## 📝 Cara Mengintegrasikan Offline Sync

Berikut contoh cara mengintegrasikan offline sync ke component Clients yang sudah ada.

## Step 1: Tambahkan Import

Di bagian atas `components/Clients.tsx`, tambahkan:

```tsx
// Import offline services
import { 
  createClientOffline, 
  updateClientOffline, 
  deleteClientOffline,
  listClientsOffline 
} from '../services/clientsOffline';

// Import offline hook
import { useOfflineSync } from '../hooks/useOfflineSync';
```

## Step 2: Gunakan Hook di Component

Di dalam component Clients, tambahkan:

```tsx
const Clients: React.FC<ClientsProps> = ({ 
  clients, 
  setClients, 
  // ... props lainnya
}) => {
  // Tambahkan hook offline sync
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  // State dan logic lainnya...
```

## Step 3: Update Fungsi Create Client

### Before (Existing):
```tsx
const created = await createClientRow({
  name: formData.clientName,
  email: formData.email,
  phone: formData.phone,
  whatsapp: formData.whatsapp || undefined,
  instagram: formData.instagram || undefined,
  status: ClientStatus.ACTIVE,
  clientType: formData.clientType,
  since: new Date().toISOString().split('T')[0],
  lastContact: new Date().toISOString().split('T')[0],
  portalAccessId: crypto.randomUUID(),
});

setClients([...clients, created]);
```

### After (Dengan Offline Support):
```tsx
const created = await createClientOffline({
  name: formData.clientName,
  email: formData.email,
  phone: formData.phone,
  whatsapp: formData.whatsapp || undefined,
  instagram: formData.instagram || undefined,
  status: ClientStatus.ACTIVE,
  clientType: formData.clientType,
  since: new Date().toISOString().split('T')[0],
  lastContact: new Date().toISOString().split('T')[0],
  portalAccessId: crypto.randomUUID(),
});

// Optimistic update - UI update langsung
setClients([...clients, created]);

// Optional: Show notification
if (!isOnline) {
  showNotification('Client disimpan offline, akan disinkronkan saat online');
}
```

## Step 4: Update Fungsi Update Client

### Before (Existing):
```tsx
const updated = await updateClientRow(selectedClient.id, {
  name: formData.clientName,
  email: formData.email,
  phone: formData.phone,
  whatsapp: formData.whatsapp || undefined,
  instagram: formData.instagram || undefined,
  clientType: formData.clientType,
});

setClients(clients.map(c => c.id === selectedClient.id ? updated : c));
```

### After (Dengan Offline Support):
```tsx
const updated = await updateClientOffline(selectedClient.id, {
  name: formData.clientName,
  email: formData.email,
  phone: formData.phone,
  whatsapp: formData.whatsapp || undefined,
  instagram: formData.instagram || undefined,
  clientType: formData.clientType,
});

// Optimistic update
setClients(clients.map(c => c.id === selectedClient.id ? updated : c));

// Optional: Show notification
if (!isOnline) {
  showNotification('Perubahan disimpan offline, akan disinkronkan saat online');
}
```

## Step 5: Update Fungsi Delete Client

### Before (Existing):
```tsx
await deleteClientRow(clientId);
setClients(clients.filter(c => c.id !== clientId));
```

### After (Dengan Offline Support):
```tsx
await deleteClientOffline(clientId);

// Optimistic update
setClients(clients.filter(c => c.id !== clientId));

// Optional: Show notification
if (!isOnline) {
  showNotification('Client dihapus offline, akan disinkronkan saat online');
}
```

## Step 6: Tambahkan UI Indicator (Optional)

Di bagian header atau toolbar, tambahkan indicator:

```tsx
<div className="flex items-center gap-4">
  {/* Existing buttons */}
  
  {/* Offline indicator */}
  {!isOnline && (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
      <span>📡</span>
      <span>Offline</span>
    </div>
  )}
  
  {/* Pending sync indicator */}
  {pendingCount > 0 && (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm">
      <span>🔄</span>
      <span>{pendingCount} pending</span>
    </div>
  )}
  
  {/* Syncing indicator */}
  {isSyncing && (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm">
      <span className="animate-spin">⟳</span>
      <span>Syncing...</span>
    </div>
  )}
</div>
```

## Step 7: Load Data dengan Cache (Optional)

Untuk performa lebih baik, gunakan cache saat load data:

```tsx
useEffect(() => {
  const loadClients = async () => {
    try {
      // Gunakan service offline yang sudah support cache
      const data = await listClientsOffline();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  loadClients();
}, []);
```

## 🎯 Hasil Akhir

Setelah implementasi:

1. ✅ **Offline Mode**: User bisa create/update/delete client tanpa internet
2. ✅ **Optimistic Updates**: UI update langsung tanpa delay
3. ✅ **Auto-Sync**: Data otomatis tersinkronisasi saat online
4. ✅ **Visual Feedback**: User tahu status koneksi dan sync
5. ✅ **Cache**: Data load lebih cepat dari cache

## 🧪 Testing

1. Buka aplikasi
2. Set browser ke offline mode (DevTools → Network → Offline)
3. Coba buat client baru
4. Client muncul di list (optimistic update)
5. Set browser ke online mode
6. Tunggu 30 detik atau lihat indicator sync
7. Data tersinkronisasi ke Supabase! ✨

## 📊 Monitoring

Untuk debug, buka browser console:

```javascript
// Lihat pending operations
const ops = await offlineStorage.getPendingOperations();
console.table(ops);

// Lihat cache
const cached = await offlineStorage.getCachedData('clients_list');
console.log('Cached clients:', cached);

// Force sync
await syncManager.sync();
```

## 💡 Tips

1. **Error Handling**: Wrap dalam try-catch untuk handle error gracefully
2. **Loading State**: Tampilkan loading saat operasi berlangsung
3. **User Feedback**: Berikan notifikasi sukses/error ke user
4. **Optimistic Updates**: Update UI dulu, rollback jika error
5. **Cache Strategy**: Cache data yang jarang berubah untuk performa

## 🔄 Pattern yang Sama untuk Component Lain

Pattern ini bisa digunakan untuk component lain:
- **Projects** → `projectsOffline.ts`
- **Transactions** → `transactionsOffline.ts`
- **Leads** → Buat `leadsOffline.ts` dengan pattern yang sama
- **Team Members** → Buat `teamMembersOffline.ts` dengan pattern yang sama

## 📚 Referensi

- [Quick Start Guide](./OFFLINE_QUICK_START.md)
- [Complete Guide](./OFFLINE_SYNC_GUIDE.md)
- [Testing Guide](./OFFLINE_TESTING.md)

---

**Selamat mengimplementasikan! 🚀**
