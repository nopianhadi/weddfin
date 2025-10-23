# Fitur Galeri Upload

Fitur galeri upload memungkinkan Anda untuk mengelola galeri foto berdasarkan daerah dan membuat link publik untuk setiap galeri.

## Fitur Utama

### 1. Manajemen Galeri
- **Buat Galeri Baru**: Buat galeri dengan judul, daerah, dan deskripsi
- **Custom Daerah**: Setiap galeri dapat dikategorikan berdasarkan daerah (Jakarta, Bandung, Surabaya, dll)
- **Upload Multiple**: Upload banyak gambar sekaligus (max 10MB per file)
- **Preview Galeri**: Lihat preview galeri dengan thumbnail

### 2. Link Publik Otomatis
- **Auto Generate**: Setiap galeri publik otomatis mendapat link unik
- **Share Link**: Salin link publik untuk dibagikan ke klien
- **SEO Friendly**: URL yang mudah diingat dan SEO friendly

### 3. Tampilan Publik
- **Responsive Design**: Tampilan yang optimal di desktop dan mobile
- **Lightbox Gallery**: Navigasi gambar dengan lightbox yang smooth
- **Company Branding**: Menampilkan informasi perusahaan di galeri publik

## Cara Penggunaan

### Membuat Galeri Baru
1. Masuk ke menu **"Galeri Upload"** di sidebar
2. Klik tombol **"Buat Galeri Baru"**
3. Isi form:
   - **Judul Galeri**: Nama galeri (contoh: "Wedding Portfolio Jakarta")
   - **Daerah**: Lokasi/daerah (contoh: "Jakarta", "Bandung")
   - **Deskripsi**: Deskripsi singkat (opsional)
   - **Galeri Publik**: Centang untuk membuat galeri dapat diakses publik
4. Klik **"Buat Galeri"**

### Upload Gambar
1. Pada galeri yang sudah dibuat, klik tombol **"Upload"**
2. Pilih gambar dari komputer (bisa multiple selection)
3. Tunggu proses upload selesai
4. Gambar akan muncul di galeri

### Membagikan Link Publik
1. Pada galeri yang berstatus publik, klik tombol **link** (🔗)
2. Link akan otomatis disalin ke clipboard
3. Bagikan link tersebut ke klien atau media sosial

## Format Link Publik

Link publik galeri memiliki format:
```
https://yourdomain.com/#/gallery/[gallery-public-id]
```

Contoh:
```
https://yourdomain.com/#/gallery/abc123-def456-ghi789
```

## Spesifikasi Teknis

### Upload Gambar
- **Format Didukung**: JPG, PNG, WebP
- **Ukuran Maksimal**: 10MB per file
- **Multiple Upload**: Ya, bisa upload banyak file sekaligus
- **Kompresi Otomatis**: Thumbnail otomatis dibuat untuk performa

### Storage
- **Cloud Storage**: Menggunakan Supabase Storage
- **CDN**: Gambar disajikan melalui CDN untuk loading cepat
- **Backup**: Otomatis backup di cloud

### Keamanan
- **Authentication**: Hanya user yang login bisa mengelola galeri
- **Public Access**: Galeri publik bisa diakses tanpa login
- **RLS (Row Level Security)**: Keamanan tingkat database

## Database Schema

### Tabel `galleries`
```sql
- id (UUID, Primary Key)
- title (TEXT, NOT NULL)
- region (TEXT, NOT NULL) 
- description (TEXT, Optional)
- is_public (BOOLEAN, Default: true)
- public_id (UUID, Unique)
- images (JSONB, Array of image objects)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Struktur Image Object
```json
{
  "id": "unique-image-id",
  "url": "https://storage-url/image.jpg",
  "thumbnailUrl": "https://storage-url/thumb.jpg",
  "caption": "Optional caption",
  "uploadedAt": "2025-01-01T00:00:00Z"
}
```

## Integrasi dengan Fitur Lain

### Package Integration
- Galeri dapat dikaitkan dengan paket layanan
- Tampilkan portfolio berdasarkan daerah di halaman paket publik

### Client Portal
- Klien dapat melihat galeri khusus untuk proyek mereka
- Link galeri dapat disertakan dalam kontrak

### Marketing
- Gunakan galeri untuk promosi di media sosial
- Analytics untuk melihat galeri mana yang paling sering diakses

## Tips Penggunaan

1. **Organisasi Daerah**: Gunakan nama daerah yang konsisten (Jakarta, Bandung, Surabaya)
2. **Kualitas Gambar**: Upload gambar berkualitas tinggi untuk hasil terbaik
3. **Deskripsi**: Tulis deskripsi yang menarik untuk SEO
4. **Update Berkala**: Update galeri secara berkala dengan karya terbaru
5. **Backup**: Selalu backup gambar penting di tempat lain juga

## Troubleshooting

### Upload Gagal
- Pastikan ukuran file tidak melebihi 10MB
- Cek koneksi internet
- Pastikan format file didukung (JPG, PNG, WebP)

### Link Tidak Bisa Diakses
- Pastikan galeri berstatus "Publik"
- Cek apakah link sudah benar
- Pastikan tidak ada typo di URL

### Gambar Tidak Muncul
- Tunggu beberapa saat untuk sinkronisasi
- Refresh halaman
- Cek apakah upload berhasil di dashboard

## Roadmap

### Fitur yang Akan Datang
- [ ] Watermark otomatis
- [ ] Bulk edit caption
- [ ] Analytics galeri
- [ ] Integration dengan Google Photos
- [ ] Custom domain untuk link publik
- [ ] Password protection untuk galeri
- [ ] Slideshow mode
- [ ] Download ZIP untuk klien