# 🚗 Alur Pengelolaan Biaya Transport: Visual Guide

## 📊 Diagram Alur Lengkap

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FASE 1: BOOKING (Klien Input)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  Klien Booking via Form   │
                    │  atau Public Booking      │
                    └───────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │  Input Biaya Transport: Rp 500.000            │
        │  (Ini adalah PENDAPATAN dari klien)           │
        └───────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │  Total Tagihan = Paket + Add-on + Transport   │
        │  Rp 10.000.000 + Rp 1.500.000 + Rp 500.000    │
        │  = Rp 12.000.000                              │
        └───────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │  Klien Bayar DP/Pelunasan                     │
        │  Uang masuk ke Kartu/Rekening Anda            │
        │  ✅ Tercatat sebagai INCOME di Finance        │
        └───────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              FASE 2: EKSEKUSI PROJECT (Tim Kerja)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  Buka Halaman Projects    │
                    │  Edit Project             │
                    └───────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │  Section: Biaya Transportasi                  │
        │  ☑ Centang "Gunakan Transport"                │
        └───────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │  Tambah Item Transport (Pengeluaran Aktual)   │
        │                                                │
        │  Item 1: Tol PP Jakarta-Bandung               │
        │          Biaya: Rp 100.000                     │
        │          Bayar dari: Kartu BCA                 │
        │          [Bayar] ✅                            │
        │                                                │
        │  Item 2: Bensin                                │
        │          Biaya: Rp 150.000                     │
        │          Bayar dari: Kantong Transport         │
        │          [Bayar] ✅                            │
        │                                                │
        │  Item 3: Parkir Venue                          │
        │          Biaya: Rp 50.000                      │
        │          Bayar dari: Tunai                     │
        │          [Bayar] ✅                            │
        └───────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │  Sistem Otomatis:                              │
        │  • Buat transaksi EXPENSE untuk setiap item    │
        │  • Kurangi saldo Kartu/Kantong                 │
        │  • Tandai item sebagai "Lunas"                 │
        │  • Simpan tanggal pembayaran                   │
        └───────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                FASE 3: LAPORAN & ANALISIS                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │  Tab "Laba/Rugi" di Project Detail            │
        │                                                │
        │  PENDAPATAN                                    │
        │  Total dari Klien:        Rp 12.000.000       │
        │                                                │
        │  PENGELUARAN                                   │
        │  Fee Tim:                 Rp  5.000.000        │
        │  Cetak:                   Rp  1.000.000        │
        │  Transport (Aktual):      Rp    300.000 ◄──┐  │
        │  Lain-lain:               Rp    200.000    │  │
        │  ─────────────────────────────────────────  │  │
        │  Total Pengeluaran:       Rp  6.500.000    │  │
        │                                             │  │
        │  LABA BERSIH:             Rp  5.500.000    │  │
        │  Margin:                  45.83%           │  │
        └─────────────────────────────────────────────┘  │
                                    │                    │
                                    ▼                    │
        ┌───────────────────────────────────────────────┐  │
        │  Tab "Transport" (Detail Khusus)              │  │
        │                                                │  │
        │  Biaya Transport dari Klien: Rp 500.000       │  │
        │                                                │  │
        │  Rincian Pengeluaran:                          │  │
        │  ✓ Tol PP         Rp 100.000  [Lunas] ────────┼──┘
        │  ✓ Bensin         Rp 150.000  [Lunas] ────────┤
        │  ✓ Parkir         Rp  50.000  [Lunas] ────────┘
        │  ─────────────────────────────────────────     │
        │  Total Pengeluaran:           Rp 300.000       │
        │                                                │
        │  Selisih (Keuntungan):        Rp 200.000 ✨    │
        └───────────────────────────────────────────────┘
```

## 💰 Breakdown Keuangan

### Pendapatan Transport
```
┌──────────────────────────────────────┐
│  DARI KLIEN (PENDAPATAN)             │
├──────────────────────────────────────┤
│  Biaya Transport di Invoice          │
│  Rp 500.000                          │
│                                      │
│  Status: ✅ Sudah dibayar klien      │
│  Masuk ke: Kartu BCA                 │
│  Tercatat: Finance > Income          │
└──────────────────────────────────────┘
```

### Pengeluaran Transport Aktual
```
┌──────────────────────────────────────┐
│  PENGELUARAN TIM (EXPENSE)           │
├──────────────────────────────────────┤
│  Item 1: Tol PP                      │
│  Rp 100.000                          │
│  Bayar dari: Kartu BCA               │
│  Status: ✅ Lunas                    │
│  Tanggal: 15 Okt 2025                │
├──────────────────────────────────────┤
│  Item 2: Bensin                      │
│  Rp 150.000                          │
│  Bayar dari: Kantong Transport       │
│  Status: ✅ Lunas                    │
│  Tanggal: 15 Okt 2025                │
├──────────────────────────────────────┤
│  Item 3: Parkir                      │
│  Rp 50.000                           │
│  Bayar dari: Tunai                   │
│  Status: ✅ Lunas                    │
│  Tanggal: 15 Okt 2025                │
├──────────────────────────────────────┤
│  TOTAL PENGELUARAN: Rp 300.000       │
└──────────────────────────────────────┘
```

### Hasil Akhir
```
┌──────────────────────────────────────┐
│  ANALISIS TRANSPORT                  │
├──────────────────────────────────────┤
│  Pendapatan (dari klien)             │
│  Rp 500.000                          │
│                                      │
│  Pengeluaran (aktual)                │
│  Rp 300.000                          │
│                                      │
│  ─────────────────────────────       │
│  KEUNTUNGAN BERSIH                   │
│  Rp 200.000 ✨                       │
│                                      │
│  ROI: 66.67%                         │
│  (Keuntungan / Pengeluaran × 100%)   │
└──────────────────────────────────────┘
```

## 🎯 Lokasi Fitur di Aplikasi

### 1️⃣ Halaman CLIENTS (Booking)
```
Clients > [+ Tambah Klien & Proyek]
    │
    ├─ Informasi Klien
    ├─ Informasi Proyek
    └─ Detail Paket & Pembayaran
        └─ [Input biaya transport dari klien]
```

### 2️⃣ Halaman PROJECTS (Eksekusi)
```
Projects > [Pilih Project] > [Edit]
    │
    ├─ Informasi Dasar
    ├─ Jadwal & Detail
    ├─ Tautan & Catatan
    ├─ Tugas Tim
    ├─ Biaya Operasional
    ├─ Output Fisik (Cetak)
    └─ Biaya Transportasi ◄── DI SINI!
        │
        ├─ ☑ Gunakan Transport
        └─ [+ Tambah Item Transport]
            ├─ Deskripsi
            ├─ Biaya
            ├─ Catatan
            ├─ Pilih: Kartu / Kantong
            └─ [Bayar] ◄── Klik untuk bayar
```

### 3️⃣ Halaman PROJECTS (Detail & Laporan)
```
Projects > [Pilih Project] > [Lihat Detail]
    │
    ├─ Tab: Detail
    ├─ Tab: Laba/Rugi ◄── Lihat keuntungan total
    │   └─ Menampilkan:
    │       • Total Pendapatan
    │       • Total Pengeluaran (termasuk transport)
    │       • Laba Bersih
    │       • Margin %
    │
    └─ Tab: Transport ◄── Detail khusus transport
        └─ Menampilkan:
            • Biaya dari klien
            • Rincian pengeluaran per item
            • Status pembayaran
            • Selisih (keuntungan/kerugian)
```

### 4️⃣ Halaman FINANCE (Tracking)
```
Finance > [Filter: Kategori = Transportasi]
    │
    ├─ Income: Pembayaran dari klien (termasuk transport)
    └─ Expense: Pengeluaran transport aktual
        ├─ Tol PP Jakarta-Bandung    Rp 100.000
        ├─ Bensin                    Rp 150.000
        └─ Parkir Venue              Rp  50.000
```

## 📱 Screenshot Lokasi (Panduan Visual)

### A. Input Transport dari Klien (Booking)
```
┌─────────────────────────────────────────┐
│  Detail Paket & Pembayaran              │
├─────────────────────────────────────────┤
│  Paket: [Wedding Premium ▼]             │
│  Harga Paket: Rp 10.000.000             │
│                                         │
│  Add-On:                                │
│  ☑ Drone Video    Rp 1.500.000          │
│                                         │
│  Kode Promo: [Tanpa Kode Promo ▼]      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Total Proyek: Rp 11.500.000     │   │
│  │                                 │   │
│  │ Uang DP: [5000000]              │   │
│  │ Kartu Tujuan: [BCA ▼]           │   │
│  │                                 │   │
│  │ Sisa Pembayaran: Rp 6.500.000   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Lainnya (Opsional)                     │
│  Catatan: [________________]            │
│                                         │
│  [Batal]  [Simpan Klien & Proyek]      │
└─────────────────────────────────────────┘
```

### B. Input Transport Aktual (Projects)
```
┌─────────────────────────────────────────┐
│  Biaya Transportasi                     │
├─────────────────────────────────────────┤
│  ☑ Gunakan Transport                    │
│                                         │
│  Item #1                                │
│  ┌─────────────────────────────────┐   │
│  │ Deskripsi: [Tol PP Jakarta-Bandu│   │
│  │ Biaya: [100000]                 │   │
│  │ Catatan: [Tol Cipularang]       │   │
│  │                                 │   │
│  │ Bayar dari: [Kartu ▼] [BCA ▼]  │   │
│  │ [Bayar] [🗑️]                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Item #2                                │
│  ┌─────────────────────────────────┐   │
│  │ Deskripsi: [Bensin]             │   │
│  │ Biaya: [150000]                 │   │
│  │ Catatan: [Full tank]            │   │
│  │                                 │   │
│  │ Bayar dari: [Kantong ▼] [Trans▼│   │
│  │ [Bayar] [🗑️]                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [+ Tambah Item Transport]              │
└─────────────────────────────────────────┘
```

### C. Laporan Transport (Detail Project)
```
┌─────────────────────────────────────────┐
│  Wedding John & Jane                    │
├─────────────────────────────────────────┤
│  [Detail] [Laba/Rugi] [Transport]       │
├─────────────────────────────────────────┤
│  Riwayat Pembayaran Transport           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ #1 Tol PP Jakarta-Bandung       │   │
│  │ Rp 100.000              [✓Lunas]│   │
│  │ Catatan: Tol Cipularang         │   │
│  │ Tanggal: 15 Oktober 2025        │   │
│  │ Kartu: BCA **** 1234            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ #2 Bensin                       │   │
│  │ Rp 150.000              [✓Lunas]│   │
│  │ Catatan: Full tank              │   │
│  │ Tanggal: 15 Oktober 2025        │   │
│  │ Kantong: Transport              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Ringkasan Transport             │   │
│  │ Total Item: 3 item              │   │
│  │ Total Biaya: Rp 300.000         │   │
│  │ Sudah Dibayar: 3 item           │   │
│  │ Belum Dibayar: 0 item           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 🎓 Tips & Best Practices

### 💡 Tip #1: Gunakan Kantong Khusus
```
Buat kantong "Transport" di Finance:
1. Alokasi Rp 500.000 (dari pembayaran klien)
2. Gunakan kantong ini untuk bayar transport aktual
3. Sisa di kantong = keuntungan transport
```

### 💡 Tip #2: Estimasi dengan Buffer
```
Estimasi Aktual:  Rp 300.000
Buffer 20%:       Rp  60.000
─────────────────────────────
Charge ke Klien:  Rp 360.000

Jika aktual = estimasi:
Keuntungan = Rp 60.000 (buffer)
```

### 💡 Tip #3: Catat Detail
```
❌ Buruk:  "Transport"           Rp 300.000
✅ Baik:   "Tol PP"              Rp 100.000
           "Bensin"              Rp 150.000
           "Parkir"              Rp  50.000

Manfaat:
• Audit lebih mudah
• Referensi untuk project serupa
• Transparansi pengeluaran
```

### 💡 Tip #4: Review Bulanan
```
Setiap bulan, cek:
1. Total pendapatan transport dari klien
2. Total pengeluaran transport aktual
3. Selisih (keuntungan/kerugian)
4. Adjust estimasi untuk project berikutnya
```

## ❓ FAQ

### Q: Bagaimana jika pengeluaran lebih besar dari pendapatan?
**A:** Sistem tetap mencatat semuanya. Anda akan melihat "kerugian" di laporan. Gunakan ini sebagai pembelajaran untuk adjust estimasi di project berikutnya.

### Q: Apakah klien bisa melihat pengeluaran aktual saya?
**A:** TIDAK. Klien hanya melihat invoice dengan biaya transport yang mereka bayar. Pengeluaran aktual Anda adalah privat.

### Q: Bagaimana jika saya lupa catat pengeluaran transport?
**A:** Anda bisa tambahkan kapan saja di form Edit Project. Sistem akan tetap mencatat dengan tanggal pembayaran yang Anda input.

### Q: Apakah bisa bayar transport dari beberapa sumber?
**A:** YA! Setiap item transport bisa dibayar dari kartu atau kantong yang berbeda.

---

**Dibuat**: 23 Oktober 2025  
**Status**: ✅ Panduan Lengkap
