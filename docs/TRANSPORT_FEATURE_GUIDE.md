# 🚗 Panduan Lengkap Fitur Transport Proyek

## 📋 Ringkasan Fitur

Sistem transport yang baru memungkinkan Anda untuk:
- ✅ **Aktifkan/Nonaktifkan** transport per proyek
- ✅ **Catat detail** setiap item transport (Tol, Parkir, BBM, dll)
- ✅ **Pilih kartu pembayaran** untuk setiap item
- ✅ **Bayar langsung** dari form proyek
- ✅ **Lihat riwayat** pembayaran transport
- ✅ **Notifikasi otomatis** status pembayaran
- ✅ **Tracking real-time** di halaman Finance

---

## 🎯 Cara Menggunakan

### 1. **Aktifkan Transport di Proyek**

#### Saat Membuat/Edit Proyek:
1. Buka form **Tambah Proyek** atau **Edit Proyek**
2. Scroll ke section **"Biaya Transportasi"**
3. Centang checkbox **"Gunakan Transport"**
4. Section transport akan aktif

```
┌─────────────────────────────────────┐
│ Biaya Transportasi    ☑ Gunakan    │
│                         Transport    │
├─────────────────────────────────────┤
│ [+ Tambah Item Transport]           │
└─────────────────────────────────────┘
```

---

### 2. **Tambah Item Transport**

#### Langkah-langkah:
1. Klik tombol **"+ Tambah Item Transport"**
2. Isi detail item:
   - **Deskripsi**: Nama item (e.g., "Tol Jakarta-Bandung")
   - **Biaya**: Jumlah biaya (e.g., 150000)
   - **Catatan**: Info tambahan (opsional)
3. Pilih **Kartu Pembayaran** dari dropdown
4. Klik **"Bayar"** untuk mencatat pembayaran

#### Contoh Item Transport:
```
┌─────────────────────────────────────┐
│ Deskripsi: Tol Jakarta-Bandung     │
│ Biaya: Rp 150.000                  │
│ Catatan: Pulang pergi              │
│                                     │
│ [Pilih Kartu ▼] [Bayar]  [🗑️]     │
└─────────────────────────────────────┘
```

---

### 3. **Bayar Item Transport**

#### Proses Pembayaran:
1. Pastikan **Deskripsi** dan **Biaya** sudah diisi
2. Pilih **Kartu Pembayaran** dari dropdown
3. Klik tombol **"Bayar"**
4. Sistem akan:
   - ✅ Membuat transaksi pengeluaran
   - ✅ Mengurangi saldo kartu
   - ✅ Menandai item sebagai "Lunas"
   - ✅ Mencatat tanggal pembayaran

#### Setelah Dibayar:
```
┌─────────────────────────────────────┐
│ Tol Jakarta-Bandung                │
│ Rp 150.000                         │
│ Catatan: Pulang pergi              │
│                                     │
│ ✅ Lunas    30 Jan 2025            │
└─────────────────────────────────────┘
```

---

### 4. **Edit/Hapus Item Transport**

#### Edit Item (Sebelum Dibayar):
- Langsung edit di field **Deskripsi**, **Biaya**, atau **Catatan**
- Perubahan tersimpan otomatis saat save proyek

#### Hapus Item (Sebelum Dibayar):
- Klik icon **🗑️ (Trash)** di sebelah kanan item
- Item akan dihapus dari list

#### Item yang Sudah Dibayar:
- ❌ **Tidak bisa diedit** atau dihapus
- ✅ Hanya bisa dilihat statusnya
- 🔒 Data terlindungi untuk audit

---

## 💰 Integrasi dengan Keuangan

### Transaksi Otomatis
Setiap pembayaran transport akan:

1. **Membuat Transaksi Pengeluaran**
   - Kategori: `"Transportasi"`
   - Deskripsi: `"Transport: [Deskripsi] - Proyek [Nama Proyek]"`
   - Method: `"Sistem"`

2. **Update Saldo Kartu**
   - Saldo kartu berkurang sesuai biaya
   - Tercatat di riwayat kartu

3. **Link ke Proyek**
   - Transaksi terhubung ke proyek
   - Muncul di tab "Laba-Rugi" proyek

### Contoh Transaksi:
```
Tanggal: 30 Jan 2025
Deskripsi: Transport: Tol Jakarta-Bandung - Proyek Wedding Andi & Sari
Kategori: Transportasi
Jumlah: Rp 150.000
Kartu: BCA **** 1234
Status: Lunas
```

---

## 📊 Melihat Rincian Transport

### Di Form Proyek:
- Lihat semua item transport
- Status pembayaran per item
- Total biaya transport

### Di Detail Proyek:
1. Buka **Detail Proyek**
2. Scroll ke section **"Rincian Biaya Transport"**
3. Lihat:
   - Daftar semua item
   - Status pembayaran
   - Tanggal pembayaran
   - Catatan per item

### Di Halaman Finance:
1. Buka **Keuangan** → **Transaksi**
2. Filter kategori: **"Transportasi"**
3. Lihat semua transaksi transport
4. Export ke CSV untuk laporan

---

## 🔔 Notifikasi

### Notifikasi Otomatis:
Sistem akan menampilkan notifikasi saat:

1. **Transport Digunakan - Ada yang Belum Dibayar**
   ```
   ⚠️ Transport digunakan: 2 item belum dibayar.
   ```

2. **Semua Transport Sudah Dibayar**
   ```
   ✅ Semua biaya transport telah dibayar.
   ```

3. **Pembayaran Berhasil**
   ```
   ✅ Pembayaran transport "Tol Jakarta-Bandung" berhasil dicatat.
   ```

4. **Error Pembayaran**
   ```
   ❌ Error: Saldo di BCA tidak mencukupi.
   ```

---

## 📝 Best Practices

### 1. **Penamaan Deskripsi**
✅ **Baik:**
- "Tol Jakarta-Bandung PP"
- "Parkir Venue Wedding"
- "BBM Mobil Operasional"
- "Bensin Motor Crew"

❌ **Kurang Baik:**
- "Transport"
- "Biaya"
- "Lain-lain"

### 2. **Catatan yang Berguna**
Gunakan field **Catatan** untuk:
- Rute perjalanan
- Jumlah kendaraan
- Nama driver
- Nomor kuitansi
- Info tambahan lainnya

### 3. **Pilih Kartu yang Tepat**
- Gunakan kartu operasional untuk transport
- Pisahkan dari kartu pribadi
- Konsisten dengan kartu yang sama untuk tracking

### 4. **Bayar Segera**
- Bayar item transport sesegera mungkin
- Jangan tunda pembayaran
- Hindari akumulasi item unpaid

---

## 🎨 Status Visual

### Indikator Status:
| Status | Warna | Icon | Arti |
|--------|-------|------|------|
| **Lunas** | 🟢 Hijau | ✅ | Sudah dibayar |
| **Belum Bayar** | 🟡 Kuning | ⚠️ | Belum dibayar |

### Tampilan Card:
- **Hijau**: Background hijau transparan, border hijau
- **Kuning**: Background abu-abu, border abu-abu

---

## 🔍 Troubleshooting

### Masalah: Tombol "Bayar" tidak aktif
**Solusi:**
1. Pastikan **Deskripsi** sudah diisi
2. Pastikan **Biaya** > 0
3. Pilih **Kartu Pembayaran**

### Masalah: Error "Saldo tidak mencukupi"
**Solusi:**
1. Cek saldo kartu di halaman Finance
2. Top-up kartu atau pilih kartu lain
3. Coba lagi

### Masalah: Item tidak bisa dihapus
**Solusi:**
- Item yang sudah dibayar **tidak bisa dihapus**
- Ini untuk menjaga integritas data
- Hubungi admin jika perlu koreksi

### Masalah: Transport tidak muncul di Finance
**Solusi:**
1. Pastikan item sudah dibayar
2. Refresh halaman Finance
3. Filter kategori "Transportasi"
4. Cek tanggal transaksi

---

## 📈 Laporan & Analytics

### Melihat Total Transport per Periode:
1. **Finance** → **Transaksi**
2. Filter:
   - Kategori: "Transportasi"
   - Tanggal: Pilih periode
3. Lihat total di bawah tabel

### Export Data:
1. Filter transaksi transport
2. Klik **Export CSV**
3. Buka di Excel/Google Sheets
4. Analisis data

### Contoh Analisis:
```
Periode: Januari 2025
Total Transport: Rp 2.500.000

Breakdown:
- Tol: Rp 1.200.000 (48%)
- Parkir: Rp 500.000 (20%)
- BBM: Rp 800.000 (32%)
```

---

## 🔐 Keamanan & Audit

### Data yang Tercatat:
- ✅ Deskripsi item
- ✅ Jumlah biaya
- ✅ Kartu pembayaran
- ✅ Tanggal pembayaran
- ✅ Catatan tambahan
- ✅ Link ke proyek

### Audit Trail:
- Semua pembayaran tercatat di database
- Tidak bisa dihapus setelah dibayar
- Riwayat lengkap di Finance
- Dapat di-export untuk audit

---

## 🆚 Perbedaan dengan Sistem Lama

### Sistem Lama:
- ❌ Hanya input total transport
- ❌ Tidak ada detail breakdown
- ❌ Tidak ada tracking pembayaran
- ❌ Tidak ada pilihan kartu
- ❌ Tidak ada riwayat

### Sistem Baru:
- ✅ Input per item transport
- ✅ Detail lengkap per item
- ✅ Tracking status pembayaran
- ✅ Pilih kartu per item
- ✅ Riwayat lengkap
- ✅ Notifikasi otomatis
- ✅ Integrasi Finance

---

## 💡 Tips & Trik

### 1. **Gunakan Template Deskripsi**
Buat template deskripsi untuk item yang sering digunakan:
- "Tol [Rute] PP"
- "Parkir [Lokasi]"
- "BBM [Kendaraan]"

### 2. **Catat Segera**
Catat item transport segera setelah pengeluaran:
- Foto kuitansi
- Input ke sistem
- Bayar langsung

### 3. **Review Berkala**
Review transport setiap akhir proyek:
- Cek item yang belum dibayar
- Verifikasi total biaya
- Bandingkan dengan budget

### 4. **Gunakan Catatan**
Manfaatkan field catatan untuk:
- Nomor kuitansi
- Nama driver
- Kondisi khusus
- Info tambahan

---

## 📞 Bantuan

### Jika Ada Masalah:
1. Cek dokumentasi ini
2. Lihat contoh proyek yang sudah ada
3. Verifikasi di halaman Finance
4. Hubungi tim support

### Feedback & Saran:
Kami terus meningkatkan fitur ini. Jika ada saran atau feedback, silakan hubungi tim development.

---

## 🎯 Kesimpulan

### Alur Lengkap:
1. ✅ Aktifkan transport di proyek
2. ✅ Tambah item transport
3. ✅ Isi detail (deskripsi, biaya, catatan)
4. ✅ Pilih kartu pembayaran
5. ✅ Bayar item
6. ✅ Lihat riwayat di Finance
7. ✅ Export untuk laporan

### Keuntungan:
- 📊 **Tracking detail** per item
- 💰 **Kontrol keuangan** lebih baik
- 🔔 **Notifikasi otomatis** status
- 📈 **Laporan lengkap** untuk analisis
- 🔐 **Audit trail** terjaga

---

**Selamat menggunakan fitur Transport yang baru! 🚗💨**
