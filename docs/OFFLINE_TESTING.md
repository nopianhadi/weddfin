# Testing Guide - Offline Sync

Panduan lengkap untuk testing fitur offline sync.

## 🧪 Test Scenarios

### Test 1: Basic Offline Create

**Tujuan**: Memastikan data bisa dibuat saat offline dan tersinkronisasi saat online.

**Steps**:
1. Buka aplikasi di browser
2. Buka DevTools (F12) → Network tab
3. Ubah dropdown "Online" menjadi "Offline"
4. Buat client baru dengan data:
   ```
   Name: Test Client Offline
   Email: test@offline.com
   Phone: 081234567890
   ```
5. Klik Save
6. **Expected**: Client muncul di list (optimistic update)
7. Buka DevTools → Application → IndexedDB → `vena_offline_db` → `pending_operations`
8. **Expected**: Ada 1 entry dengan operation "INSERT"
9. Ubah Network kembali ke "Online"
10. Tunggu 30 detik atau trigger manual sync
11. **Expected**: 
    - Indicator menunjukkan "Syncing..."
    - Setelah selesai, pending count = 0
    - Data ada di Supabase

**Pass Criteria**: ✅ Data tersimpan lokal, tersinkronisasi ke Supabase, tidak ada error

---

### Test 2: Offline Update

**Tujuan**: Memastikan update data saat offline berfungsi.

**Steps**:
1. Pastikan ada client existing di database
2. Set browser ke "Offline"
3. Edit client tersebut, ubah name menjadi "Updated Offline"
4. Klik Save
5. **Expected**: Perubahan terlihat di UI
6. Cek IndexedDB → `pending_operations`
7. **Expected**: Ada 1 entry dengan operation "UPDATE"
8. Set browser ke "Online"
9. Tunggu sync
10. **Expected**: Perubahan tersinkronisasi ke Supabase

**Pass Criteria**: ✅ Update tersimpan lokal dan tersinkronisasi

---

### Test 3: Offline Delete

**Tujuan**: Memastikan delete saat offline berfungsi.

**Steps**:
1. Pastikan ada client existing
2. Set browser ke "Offline"
3. Delete client tersebut
4. **Expected**: Client hilang dari list
5. Cek IndexedDB → `pending_operations`
6. **Expected**: Ada 1 entry dengan operation "DELETE"
7. Set browser ke "Online"
8. Tunggu sync
9. **Expected**: Client terhapus dari Supabase

**Pass Criteria**: ✅ Delete tersimpan lokal dan tersinkronisasi

---

### Test 4: Multiple Operations

**Tujuan**: Memastikan multiple operations diproses dengan benar.

**Steps**:
1. Set browser ke "Offline"
2. Lakukan operasi berikut:
   - Create 2 clients baru
   - Update 1 client existing
   - Delete 1 client existing
3. **Expected**: Semua perubahan terlihat di UI
4. Cek IndexedDB → `pending_operations`
5. **Expected**: Ada 4 entries
6. Set browser ke "Online"
7. Tunggu sync
8. **Expected**: 
   - Semua operasi diproses berurutan (FIFO)
   - Indicator menunjukkan progress (1/4, 2/4, dst)
   - Semua data tersinkronisasi ke Supabase

**Pass Criteria**: ✅ Semua operasi tersinkronisasi dengan urutan yang benar

---

### Test 5: Cache Functionality

**Tujuan**: Memastikan cache berfungsi untuk performa.

**Steps**:
1. Set browser ke "Online"
2. Load list clients
3. Buka DevTools → Application → IndexedDB → `vena_offline_db` → `cached_data`
4. **Expected**: Ada entry dengan key "clients_list"
5. Set browser ke "Offline"
6. Refresh page
7. Load list clients
8. **Expected**: Data muncul dari cache (tidak ada loading dari network)

**Pass Criteria**: ✅ Data di-cache dan bisa diakses saat offline

---

### Test 6: Auto-Sync

**Tujuan**: Memastikan auto-sync berjalan setiap 30 detik.

**Steps**:
1. Set browser ke "Offline"
2. Create 1 client
3. Set browser ke "Online"
4. Jangan trigger manual sync
5. Tunggu maksimal 30 detik
6. **Expected**: Sync otomatis terjadi tanpa user action

**Pass Criteria**: ✅ Auto-sync berjalan otomatis

---

### Test 7: Retry Logic

**Tujuan**: Memastikan operasi gagal akan dicoba ulang.

**Steps**:
1. Set browser ke "Offline"
2. Create client dengan email yang sudah ada (akan error saat sync)
3. Set browser ke "Online"
4. Tunggu sync
5. **Expected**: 
   - Sync gagal (error: duplicate email)
   - Operation masih ada di `pending_operations`
   - `retryCount` bertambah
6. Tunggu 30 detik (auto-sync akan retry)
7. **Expected**: Retry sampai 5x, lalu operation dihapus

**Pass Criteria**: ✅ Retry logic berfungsi, operation dihapus setelah 5x gagal

---

### Test 8: Network Interruption

**Tujuan**: Memastikan aplikasi handle network interruption dengan baik.

**Steps**:
1. Set browser ke "Online"
2. Mulai create client
3. Saat proses save, set browser ke "Offline" (simulate network loss)
4. **Expected**: 
   - Operation di-queue
   - UI update optimistically
   - Tidak ada error yang terlihat user
5. Set browser ke "Online"
6. **Expected**: Data tersinkronisasi

**Pass Criteria**: ✅ Aplikasi handle network interruption gracefully

---

### Test 9: Large Dataset

**Tujuan**: Memastikan performa dengan banyak pending operations.

**Steps**:
1. Set browser ke "Offline"
2. Create 20 clients sekaligus (bisa pakai script)
3. **Expected**: Semua tersimpan di `pending_operations`
4. Set browser ke "Online"
5. Trigger sync
6. **Expected**: 
   - Progress indicator menunjukkan 1/20, 2/20, dst
   - Semua data tersinkronisasi
   - Tidak ada memory leak atau freeze

**Pass Criteria**: ✅ Aplikasi handle large dataset dengan baik

---

### Test 10: Cache Expiration

**Tujuan**: Memastikan cache expired dihapus.

**Steps**:
1. Set browser ke "Online"
2. Load clients (akan di-cache dengan TTL 30 menit)
3. Buka console, jalankan:
   ```js
   // Ubah timestamp cache menjadi expired
   const db = await indexedDB.open('vena_offline_db', 1);
   // Manually update timestamp to past
   ```
4. Load clients lagi
5. **Expected**: Cache expired, fetch dari Supabase

**Pass Criteria**: ✅ Cache expiration berfungsi

---

## 🔍 Manual Testing Checklist

### UI/UX Testing

- [ ] Offline indicator muncul saat offline
- [ ] Offline indicator hilang saat online
- [ ] Pending count ditampilkan dengan benar
- [ ] Sync progress ditampilkan dengan benar
- [ ] Loading state ditampilkan saat syncing
- [ ] Success message ditampilkan setelah sync
- [ ] Error message ditampilkan jika sync gagal
- [ ] Manual sync button berfungsi
- [ ] Indicator tidak mengganggu UI utama

### Functionality Testing

- [ ] Create offline berfungsi
- [ ] Update offline berfungsi
- [ ] Delete offline berfungsi
- [ ] Auto-sync berfungsi
- [ ] Manual sync berfungsi
- [ ] Cache berfungsi
- [ ] Retry logic berfungsi
- [ ] FIFO order dipertahankan
- [ ] Optimistic updates berfungsi
- [ ] Network interruption di-handle dengan baik

### Performance Testing

- [ ] Tidak ada memory leak
- [ ] Tidak ada UI freeze
- [ ] Cache mempercepat loading
- [ ] Sync tidak block UI
- [ ] Large dataset di-handle dengan baik

### Edge Cases

- [ ] Offline → Online → Offline → Online (multiple transitions)
- [ ] Sync saat ada banyak pending operations
- [ ] Sync saat network lambat
- [ ] Sync saat ada error dari Supabase
- [ ] Multiple tabs open (IndexedDB shared)
- [ ] Browser refresh saat syncing
- [ ] Browser close saat ada pending operations

---

## 🤖 Automated Testing (Future)

### Unit Tests

```typescript
describe('OfflineStorage', () => {
  it('should add pending operation', async () => {
    const id = await offlineStorage.addPendingOperation({
      table: 'clients',
      operation: 'INSERT',
      data: { name: 'Test' },
    });
    expect(id).toBeDefined();
  });

  it('should cache data', async () => {
    await offlineStorage.cacheData('test', { foo: 'bar' });
    const cached = await offlineStorage.getCachedData('test');
    expect(cached).toEqual({ foo: 'bar' });
  });
});

describe('SyncManager', () => {
  it('should sync pending operations', async () => {
    // Mock Supabase
    // Add pending operations
    // Trigger sync
    // Assert operations are processed
  });
});
```

### Integration Tests

```typescript
describe('Offline Sync Integration', () => {
  it('should create client offline and sync when online', async () => {
    // Set offline
    // Create client
    // Assert client in pending operations
    // Set online
    // Wait for sync
    // Assert client in Supabase
  });
});
```

---

## 📊 Test Results Template

```
Test Date: [DATE]
Tester: [NAME]
Browser: [Chrome/Firefox/Safari]
Version: [VERSION]

Test 1: Basic Offline Create
Status: ✅ PASS / ❌ FAIL
Notes: [Any notes]

Test 2: Offline Update
Status: ✅ PASS / ❌ FAIL
Notes: [Any notes]

[... dst untuk semua tests]

Overall Result: ✅ PASS / ❌ FAIL
Issues Found: [List any issues]
```

---

## 🐛 Common Issues & Solutions

### Issue: Sync tidak terjadi setelah online

**Debug**:
```js
// Check if online
console.log('Online:', navigator.onLine);

// Check pending operations
const ops = await offlineStorage.getPendingOperations();
console.log('Pending:', ops);

// Check if syncing
console.log('Is syncing:', syncManager.isSyncInProgress());

// Force sync
await syncManager.sync();
```

### Issue: Data tidak muncul di UI setelah sync

**Debug**:
```js
// Check cache
const cached = await offlineStorage.getCachedData('clients_list');
console.log('Cached:', cached);

// Clear cache and reload
await offlineStorage.removeCachedData('clients_list');
location.reload();
```

### Issue: IndexedDB error

**Debug**:
```js
// Check IndexedDB support
console.log('IndexedDB supported:', 'indexedDB' in window);

// Clear all data
await offlineStorage.clearAll();

// Reinitialize
await offlineStorage.init();
```

---

## 📝 Test Report Example

```markdown
# Offline Sync Test Report

**Date**: 2024-01-15
**Tester**: John Doe
**Environment**: Chrome 120, Windows 11

## Summary
- Total Tests: 10
- Passed: 9
- Failed: 1
- Pass Rate: 90%

## Failed Tests

### Test 7: Retry Logic
**Status**: ❌ FAIL
**Issue**: Retry count tidak bertambah setelah error
**Steps to Reproduce**:
1. Create client dengan duplicate email
2. Trigger sync
3. Check retry count

**Expected**: retryCount = 1
**Actual**: retryCount = 0

**Root Cause**: Bug di syncManager.ts line 145
**Fix**: Update retry count sebelum throw error

## Recommendations
1. Fix retry logic bug
2. Add more logging for debugging
3. Add automated tests for retry logic
```

---

**Happy Testing! 🧪**
