# Pembayaran Melalui Kantong untuk Cetak & Transport

## 📋 Ringkasan

Fitur ini memungkinkan pembayaran untuk **Output Fisik (Cetak)** dan **Biaya Transportasi** menggunakan saldo dari **Kantong** (Financial Pocket) selain dari Kartu.

## ✨ Fitur Baru

### 1. Pembayaran Output Fisik (Cetak)
- Pengguna dapat memilih sumber pembayaran: **Kartu** atau **Kantong**
- Dropdown pertama untuk memilih tipe pembayaran (Kartu/Kantong)
- Dropdown kedua menampilkan daftar kartu atau kantong sesuai pilihan
- Saldo kantong ditampilkan di samping nama kantong untuk memudahkan pemilihan

### 2. Pembayaran Biaya Transportasi
- Sama seperti pembayaran cetak, tersedia opsi **Kartu** atau **Kantong**
- Setiap item transport dapat dibayar dari sumber yang berbeda
- Informasi pembayaran (tipe, sumber, tanggal) tersimpan di database

## 🔧 Perubahan Teknis

### File yang Dimodifikasi

#### 1. `types.ts`
```typescript
export interface TransportItem {
  // ... field lainnya
  paymentType?: 'card' | 'pocket'; // BARU
  pocketId?: string; // BARU
  // ...
}
```

#### 2. `components/Projects.tsx`
- Menambahkan props `pockets` dan `setPockets` ke `ProjectForm`
- Menambahkan state `printingPaymentType` untuk tracking tipe pembayaran cetak
- Memodifikasi UI untuk menampilkan dropdown tipe pembayaran
- Update fungsi `handlePayForPrintingItem` untuk mendukung pembayaran dari pocket
- Update fungsi `handlePayForTransportItem` untuk mendukung pembayaran dari pocket

#### 3. `App.tsx`
- Menambahkan props `pockets` dan `setPockets` ke komponen `Projects`

## 💡 Cara Penggunaan

### Membayar Output Fisik (Cetak)

1. Buka form edit project
2. Scroll ke section **Output Fisik (Cetak)**
3. Untuk item yang belum dibayar:
   - Pilih tipe pembayaran: **Kartu** atau **Kantong**
   - Pilih sumber dana dari dropdown
   - Klik tombol **Bayar**
4. Sistem akan:
   - Memvalidasi saldo mencukupi
   - Membuat transaksi expense
   - Mengurangi saldo kartu/kantong
   - Menandai item sebagai "Lunas"

### Membayar Biaya Transportasi

1. Buka form edit project
2. Scroll ke section **Biaya Transportasi**
3. Pastikan checkbox "Gunakan Transport" aktif
4. Untuk setiap item transport:
   - Isi deskripsi dan biaya
   - Pilih tipe pembayaran: **Kartu** atau **Kantong**
   - Pilih sumber dana
   - Klik tombol **Bayar**
5. Item akan ditandai sebagai "Lunas" dengan informasi pembayaran

## 🔍 Validasi

Sistem melakukan validasi:
- ✅ Saldo kartu/kantong mencukupi
- ✅ Data item lengkap (deskripsi, biaya)
- ✅ Sumber pembayaran dipilih

## 📊 Tracking Transaksi

Setiap pembayaran akan:
- Tercatat di halaman **Finance** sebagai transaksi expense
- Terhubung dengan project terkait
- Menampilkan kategori: "Cetak Album" atau "Transportasi"
- Menyimpan referensi ke kartu atau kantong yang digunakan

## 🎯 Manfaat

1. **Fleksibilitas**: Pembayaran tidak terbatas pada kartu saja
2. **Pengelolaan Dana**: Kantong khusus dapat dialokasikan untuk biaya operasional
3. **Tracking Lebih Baik**: Setiap pembayaran tercatat dengan detail sumber dana
4. **Transparansi**: Riwayat pembayaran lengkap tersimpan di database

## 🔐 Keamanan

- Semua transaksi tersimpan di Supabase dengan atomic operations
- Validasi saldo dilakukan sebelum pembayaran
- Rollback otomatis jika terjadi error
- Realtime sync untuk mencegah race condition

---

**Tanggal Implementasi**: 23 Oktober 2025  
**Status**: ✅ Selesai & Teruji
