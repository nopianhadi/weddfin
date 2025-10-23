# Setup Fitur Galeri Upload

Panduan lengkap untuk mengaktifkan fitur galeri upload di aplikasi Anda.

## Prerequisites

1. **Supabase Project**: Pastikan Anda sudah memiliki project Supabase
2. **Environment Variables**: VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah dikonfigurasi
3. **Authentication**: Sistem login sudah berfungsi

## Langkah Setup

### 1. Database Migration

Jalankan script SQL berikut di Supabase SQL Editor:

```sql
-- Buka file: scripts/run-gallery-migration.sql
-- Copy semua isi file dan jalankan di Supabase SQL Editor
```

Atau jalankan migration file:
```bash
# Jika menggunakan Supabase CLI
supabase db push
```

### 2. Storage Configuration

Pastikan storage bucket sudah dibuat dengan benar:

1. Buka Supabase Dashboard → Storage
2. Pastikan bucket `gallery-images` sudah ada
3. Pastikan bucket berstatus **Public**
4. Cek policies sudah sesuai dengan yang ada di migration

### 3. Environment Variables

Pastikan file `.env` sudah berisi:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Install Dependencies

Jika ada dependency yang belum terinstall:
```bash
npm install @supabase/supabase-js
```

### 5. Verifikasi Setup

#### Test Database Connection
1. Login ke aplikasi
2. Buka menu "Galeri Upload"
3. Coba buat galeri baru
4. Jika berhasil, database sudah terkonfigurasi dengan benar

#### Test File Upload
1. Buat galeri baru
2. Coba upload gambar
3. Pastikan gambar muncul di galeri
4. Cek di Supabase Storage apakah file terupload

#### Test Public Access
1. Buat galeri dengan status "Publik"
2. Copy link publik
3. Buka link di browser baru (tanpa login)
4. Pastikan galeri bisa diakses

## Konfigurasi Lanjutan

### 1. Custom Domain (Opsional)

Jika ingin menggunakan custom domain untuk link publik:

```javascript
// Di services/galleries.ts, ubah function copyPublicLink
const copyPublicLink = (gallery: Gallery) => {
    const customDomain = 'https://portfolio.yourdomain.com';
    const link = `${customDomain}/gallery/${gallery.publicId}`;
    navigator.clipboard.writeText(link);
    showNotification('Link publik berhasil disalin');
};
```

### 2. Image Optimization

Untuk optimasi gambar otomatis, tambahkan di services/galleries.ts:

```javascript
const optimizeImage = async (file: File): Promise<File> => {
    // Implementasi resize/compress image
    // Bisa menggunakan library seperti browser-image-compression
    return file;
};
```

### 3. Watermark (Opsional)

Untuk menambahkan watermark otomatis:

```javascript
const addWatermark = async (imageFile: File): Promise<File> => {
    // Implementasi watermark
    // Bisa menggunakan canvas API atau library
    return imageFile;
};
```

## Troubleshooting

### Error: "Bucket not found"
**Solusi**: 
1. Cek apakah bucket `gallery-images` sudah dibuat
2. Pastikan bucket berstatus public
3. Jalankan ulang migration script

### Error: "Permission denied"
**Solusi**:
1. Cek RLS policies di Supabase
2. Pastikan user sudah login
3. Cek apakah auth.uid() tidak null

### Error: "File too large"
**Solusi**:
1. Pastikan file tidak melebihi 10MB
2. Compress gambar sebelum upload
3. Ubah limit di kode jika perlu

### Upload Lambat
**Solusi**:
1. Cek koneksi internet
2. Implementasi image compression
3. Upload file satu per satu jika batch upload bermasalah

### Link Publik Tidak Bisa Diakses
**Solusi**:
1. Pastikan galeri berstatus "Publik"
2. Cek routing di App.tsx
3. Pastikan public_id valid

## Security Considerations

### 1. File Type Validation
```javascript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const isValidType = allowedTypes.includes(file.type);
```

### 2. File Size Limit
```javascript
const maxSize = 10 * 1024 * 1024; // 10MB
const isValidSize = file.size <= maxSize;
```

### 3. Rate Limiting
Implementasi rate limiting untuk mencegah spam upload:
```javascript
// Limit upload per user per hari
const uploadLimit = 100; // 100 files per day
```

### 4. Content Moderation
Pertimbangkan untuk menambahkan:
- Auto-moderation untuk konten tidak pantas
- Manual review untuk galeri publik
- Report system untuk galeri yang bermasalah

## Performance Optimization

### 1. Image Lazy Loading
```javascript
// Implementasi lazy loading untuk galeri dengan banyak gambar
const LazyImage = ({ src, alt }) => {
    const [loaded, setLoaded] = useState(false);
    // Implementation
};
```

### 2. Thumbnail Generation
```javascript
// Generate thumbnail otomatis saat upload
const generateThumbnail = async (file: File): Promise<string> => {
    // Implementation using canvas
};
```

### 3. CDN Integration
Gunakan CDN untuk serving gambar lebih cepat:
```javascript
const getCDNUrl = (originalUrl: string): string => {
    return originalUrl.replace('supabase.co', 'your-cdn.com');
};
```

## Monitoring dan Analytics

### 1. Upload Metrics
Track metrics penting:
- Jumlah upload per hari
- Ukuran total storage yang digunakan
- Galeri paling populer
- Error rate upload

### 2. Public Gallery Analytics
```javascript
// Track view galeri publik
const trackGalleryView = (galleryId: string) => {
    // Implementation analytics tracking
};
```

### 3. Storage Usage Monitoring
```javascript
// Monitor penggunaan storage
const getStorageUsage = async (): Promise<number> => {
    // Implementation
};
```

## Backup dan Recovery

### 1. Automated Backup
Setup backup otomatis untuk:
- Database galleries table
- Storage files
- Metadata

### 2. Recovery Procedure
Dokumentasi prosedur recovery jika terjadi masalah:
1. Restore database dari backup
2. Restore files dari backup storage
3. Verify data integrity
4. Update aplikasi jika perlu

## Maintenance

### 1. Regular Tasks
- Cleanup unused images
- Optimize database queries
- Update storage policies jika perlu
- Monitor storage usage

### 2. Updates
- Update dependencies secara berkala
- Monitor Supabase updates
- Test fitur setelah update

## Support

Jika mengalami masalah:
1. Cek dokumentasi ini
2. Lihat logs di browser console
3. Cek Supabase logs
4. Hubungi tim development

## Changelog

### v1.0.0 (2025-01-01)
- Initial release
- Basic gallery management
- Public gallery sharing
- Image upload with progress
- Responsive design

### Future Versions
- v1.1.0: Watermark support
- v1.2.0: Advanced analytics
- v1.3.0: Bulk operations
- v1.4.0: API integration