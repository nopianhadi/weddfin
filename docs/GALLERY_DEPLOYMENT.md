# Deployment Guide - Fitur Galeri

Panduan deployment fitur galeri ke production environment.

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Supabase project production ready
- [ ] Environment variables configured
- [ ] Storage bucket created and configured
- [ ] Database migrations applied
- [ ] SSL certificate configured

### 2. Code Review
- [ ] All components tested locally
- [ ] Error handling implemented
- [ ] Security measures in place
- [ ] Performance optimized
- [ ] Responsive design verified

### 3. Database Preparation
- [ ] Run migration script
- [ ] Verify RLS policies
- [ ] Test storage permissions
- [ ] Backup existing data

## Deployment Steps

### 1. Database Migration

```sql
-- Run in Supabase SQL Editor (Production)
-- Copy content from: scripts/run-gallery-migration.sql

-- Verify migration success
SELECT * FROM galleries LIMIT 1;
SELECT * FROM storage.buckets WHERE id = 'gallery-images';
```

### 2. Environment Variables

Pastikan environment variables production sudah set:

```env
# Production .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

### 3. Build dan Deploy

```bash
# Build production
npm run build

# Deploy ke hosting (contoh: Netlify)
netlify deploy --prod --dir=dist

# Atau deploy ke Vercel
vercel --prod

# Atau deploy ke hosting lain
# Upload folder dist/ ke web server
```

### 4. Post-Deployment Verification

#### Test Basic Functionality
```bash
# Test endpoints
curl -X GET "https://yourdomain.com/#/gallery/test"

# Test dengan browser
# 1. Login ke aplikasi
# 2. Buat galeri test
# 3. Upload gambar test
# 4. Akses link publik
# 5. Verify responsive design
```

## Production Configuration

### 1. Supabase Production Settings

#### Storage Configuration
```sql
-- Verify storage bucket settings
SELECT * FROM storage.buckets WHERE id = 'gallery-images';

-- Should return:
-- id: gallery-images
-- name: gallery-images  
-- public: true
-- file_size_limit: null (or your preferred limit)
-- allowed_mime_types: null (or specific image types)
```

#### RLS Policies Verification
```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'galleries';

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'galleries';
```

### 2. CDN Configuration (Optional)

Jika menggunakan CDN untuk gambar:

```javascript
// Update di services/galleries.ts
const getCDNUrl = (supabaseUrl: string): string => {
    // Replace Supabase URL dengan CDN URL
    return supabaseUrl.replace(
        'supabase.co/storage/v1/object/public',
        'your-cdn.com'
    );
};
```

### 3. Performance Optimization

#### Image Optimization
```javascript
// Implementasi compression sebelum upload
const compressImage = async (file: File): Promise<File> => {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
    };
    
    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        console.error('Compression failed:', error);
        return file;
    }
};
```

#### Lazy Loading
```javascript
// Implementasi lazy loading untuk galeri besar
const LazyImage = ({ src, alt, className }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={imgRef} className={className}>
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={() => setIsLoaded(true)}
                    style={{ opacity: isLoaded ? 1 : 0 }}
                />
            )}
        </div>
    );
};
```

## Monitoring Setup

### 1. Error Tracking

```javascript
// Setup Sentry atau error tracking lainnya
import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    environment: "production"
});

// Wrap gallery operations dengan error tracking
const uploadWithTracking = async (files: File[]) => {
    try {
        return await uploadGalleryImages(galleryId, files);
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                feature: 'gallery-upload',
                operation: 'upload-images'
            }
        });
        throw error;
    }
};
```

### 2. Analytics

```javascript
// Setup Google Analytics atau analytics lainnya
const trackGalleryView = (galleryId: string, region: string) => {
    gtag('event', 'gallery_view', {
        gallery_id: galleryId,
        region: region,
        event_category: 'engagement'
    });
};

const trackGalleryShare = (galleryId: string) => {
    gtag('event', 'gallery_share', {
        gallery_id: galleryId,
        event_category: 'sharing'
    });
};
```

### 3. Performance Monitoring

```javascript
// Monitor performance metrics
const measurePerformance = (operation: string) => {
    const start = performance.now();
    
    return {
        end: () => {
            const duration = performance.now() - start;
            console.log(`${operation} took ${duration}ms`);
            
            // Send to analytics
            gtag('event', 'timing_complete', {
                name: operation,
                value: Math.round(duration)
            });
        }
    };
};

// Usage
const perf = measurePerformance('gallery-load');
await loadGalleries();
perf.end();
```

## Security Hardening

### 1. Content Security Policy

```html
<!-- Add to index.html -->
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    img-src 'self' https://*.supabase.co https://your-cdn.com;
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline';
    connect-src 'self' https://*.supabase.co;
">
```

### 2. Rate Limiting

```javascript
// Implementasi rate limiting untuk upload
const uploadRateLimit = new Map();

const checkRateLimit = (userId: string): boolean => {
    const now = Date.now();
    const userLimits = uploadRateLimit.get(userId) || { count: 0, resetTime: now + 3600000 };
    
    if (now > userLimits.resetTime) {
        userLimits.count = 0;
        userLimits.resetTime = now + 3600000; // 1 hour
    }
    
    if (userLimits.count >= 100) { // 100 uploads per hour
        return false;
    }
    
    userLimits.count++;
    uploadRateLimit.set(userId, userLimits);
    return true;
};
```

### 3. Input Sanitization

```javascript
// Sanitize input untuk mencegah XSS
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
    return DOMPurify.sanitize(input, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    });
};

// Usage dalam form
const handleFormSubmit = (data: any) => {
    const sanitizedData = {
        title: sanitizeInput(data.title),
        region: sanitizeInput(data.region),
        description: sanitizeInput(data.description)
    };
    // Process sanitized data
};
```

## Backup Strategy

### 1. Database Backup

```sql
-- Setup automated backup untuk galleries table
-- Bisa menggunakan Supabase backup feature atau custom script

-- Manual backup command
pg_dump -h your-host -U your-user -d your-db -t galleries > galleries_backup.sql
```

### 2. Storage Backup

```javascript
// Script untuk backup storage files
const backupGalleryImages = async () => {
    const { data: files } = await supabase.storage
        .from('gallery-images')
        .list();
    
    for (const file of files) {
        const { data } = await supabase.storage
            .from('gallery-images')
            .download(file.name);
        
        // Save to backup location
        // Implementation depends on backup service
    }
};
```

## Rollback Plan

### 1. Database Rollback

```sql
-- Jika perlu rollback database changes
DROP TABLE IF EXISTS galleries;
-- Restore from backup
-- psql -h your-host -U your-user -d your-db < galleries_backup.sql
```

### 2. Application Rollback

```bash
# Rollback ke versi sebelumnya
git checkout previous-stable-tag
npm run build
# Deploy previous version
```

## Health Checks

### 1. Application Health Check

```javascript
// Endpoint untuk health check
const healthCheck = async (): Promise<boolean> => {
    try {
        // Test database connection
        const { data } = await supabase.from('galleries').select('id').limit(1);
        
        // Test storage access
        const { data: buckets } = await supabase.storage.listBuckets();
        const galleryBucket = buckets?.find(b => b.id === 'gallery-images');
        
        return data !== null && galleryBucket !== undefined;
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
};
```

### 2. Monitoring Alerts

Setup alerts untuk:
- Upload failure rate > 5%
- Page load time > 5 seconds  
- Storage usage > 80% capacity
- Error rate > 1%
- Database connection failures

## Performance Benchmarks

### Production Targets
- Gallery list load: < 2 seconds
- Public gallery load: < 3 seconds
- Image upload: < 10 seconds per image
- Lightbox open: < 500ms
- Search/filter: < 1 second

### Load Testing

```bash
# Test dengan artillery.io
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: 'https://yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Gallery browsing"
    requests:
      - get:
          url: "/#/gallery/test-gallery-id"
EOF

# Run load test
artillery run load-test.yml
```

## Maintenance

### 1. Regular Tasks
- Monitor storage usage weekly
- Clean up orphaned files monthly
- Review error logs weekly
- Update dependencies monthly
- Performance audit quarterly

### 2. Scaling Considerations
- Monitor concurrent users
- Database query optimization
- CDN implementation
- Storage partitioning
- Caching strategy

## Support Documentation

### 1. User Guide
Buat dokumentasi untuk end users:
- Cara membuat galeri
- Cara upload gambar
- Cara share link publik
- Troubleshooting umum

### 2. Admin Guide
Dokumentasi untuk admin:
- Monitoring dashboard
- Backup procedures
- Security settings
- Performance tuning

## Post-Launch Checklist

- [ ] All functionality tested in production
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] User feedback collection setup
- [ ] Performance baseline established
- [ ] Security audit completed