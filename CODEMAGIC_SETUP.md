# Panduan Setup Codemagic untuk Build iOS & Android

## ✅ Yang Sudah Disiapkan

1. ✅ iOS platform sudah diinstall (`@capacitor/ios`)
2. ✅ Script iOS sudah ditambahkan di `package.json`
3. ✅ File `codemagic.yaml` sudah dibuat dengan konfigurasi untuk iOS dan Android

## Langkah 1: Push Project ke GitHub

Jika belum, push project Anda ke GitHub:

```bash
git init
git add .
git commit -m "Setup iOS and Codemagic configuration"
git branch -M main
git remote add origin https://github.com/username/weddfin.git
git push -u origin main
```

Ganti `username/weddfin` dengan repository GitHub Anda.

## Langkah 2: Daftar Codemagic

1. Buka https://codemagic.io/signup
2. Pilih **Sign up with GitHub**
3. Authorize Codemagic untuk akses repository Anda
4. Login ke dashboard Codemagic

## Langkah 3: Tambahkan Project di Codemagic

1. Di dashboard Codemagic, klik **Add application**
2. Pilih **GitHub** sebagai source
3. Pilih repository **weddfin** Anda
4. Klik **Finish: Add application**

## Langkah 4: Konfigurasi iOS Build

### A. Setup Apple Developer Account (Diperlukan untuk iOS)

1. Di Codemagic, buka project weddfin
2. Klik **Settings** → **Code signing identities**
3. Klik **iOS code signing**

#### Opsi 1: Automatic Code Signing (Mudah)
1. Klik **Enable automatic code signing**
2. Login dengan Apple ID Anda
3. Codemagic akan otomatis handle signing

#### Opsi 2: Manual Code Signing
1. Upload Certificate (.p12 file)
2. Upload Provisioning Profile (.mobileprovision)
3. Masukkan password certificate

### B. Verifikasi Bundle ID

Pastikan Bundle ID di Codemagic sama dengan di `capacitor.config.ts`:
- Bundle ID: `com.venapictures.app`

## Langkah 5: Konfigurasi Android Build (Opsional)

Untuk signed APK/AAB:

1. Buka **Settings** → **Code signing identities**
2. Klik **Android code signing**
3. Upload keystore file (.jks atau .keystore)
4. Isi:
   - Keystore password
   - Key alias
   - Key password

## Langkah 6: Setup Environment Variables

1. Buka **Settings** → **Environment variables**
2. Tambahkan variable berikut:

```
VITE_SUPABASE_URL=https://qgedjkzeebfysbtsrqrc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZWRqa3plZWJmeXNidHNycXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTY0NzYsImV4cCI6MjA3NDY5MjQ3Nn0.jIbZGOlTUpOaX3pYpuJdM4pRjxytaed5UsQWNnPEGxM
VITE_APP_URL=https://weddfin.netlify.app
```

⚠️ **Jangan tambahkan GEMINI_API_KEY** di sini karena public. Simpan di secure storage atau backend.

## Langkah 7: Jalankan Build

### Build iOS:
1. Di dashboard project, pilih **Start new build**
2. Pilih workflow: **ios-workflow**
3. Pilih branch: **main**
4. Klik **Start new build**
5. Tunggu 10-20 menit
6. Download IPA dari **Artifacts**

### Build Android:
1. Pilih **Start new build**
2. Pilih workflow: **android-workflow**
3. Pilih branch: **main**
4. Klik **Start new build**
5. Tunggu 5-10 menit
6. Download APK/AAB dari **Artifacts**

## Langkah 8: Setup Automatic Builds (Opsional)

Untuk auto-build setiap push:

1. Buka **Settings** → **Build triggers**
2. Enable **Trigger on push**
3. Pilih branch: **main**
4. Pilih workflow yang ingin auto-run

## Troubleshooting

### iOS Build Gagal - Code Signing Error

**Solusi:**
- Pastikan Apple Developer Account aktif ($99/tahun)
- Pastikan Bundle ID sudah terdaftar di Apple Developer Portal
- Gunakan Automatic Code Signing di Codemagic

### iOS Build Gagal - Provisioning Profile

**Solusi:**
1. Buka https://developer.apple.com
2. Buat App ID dengan Bundle ID: `com.venapictures.app`
3. Buat Provisioning Profile (Development atau Distribution)
4. Download dan upload ke Codemagic

### Android Build Gagal - Keystore

**Solusi:**
- Untuk testing, gunakan debug build (tidak perlu keystore)
- Edit `codemagic.yaml`, ganti `assembleRelease` dengan `assembleDebug`

### Build Timeout

**Solusi:**
- Free tier Codemagic: 500 menit/bulan
- Upgrade ke paid plan jika perlu lebih

## Free Tier Limits (Codemagic)

- ✅ 500 build minutes/month
- ✅ Unlimited builds
- ✅ iOS & Android support
- ✅ 1 concurrent build
- ✅ Artifacts storage: 30 days

## Alternatif Tanpa Apple Developer Account

Jika belum punya Apple Developer Account ($99/tahun):

### Opsi 1: Development Build (Free)
- Bisa install di device sendiri via Xcode
- Tidak bisa distribute ke orang lain
- Perlu Apple ID gratis

### Opsi 2: TestFlight (Perlu Account)
- Bisa distribute ke 10,000 tester
- Perlu Apple Developer Account

### Opsi 3: PWA (Progressive Web App)
- Tidak perlu build IPA
- User akses via browser: https://weddfin.netlify.app
- Bisa "Add to Home Screen" di iOS
- Gratis, tidak perlu Apple Developer Account

## Rekomendasi

Untuk sekarang:
1. ✅ **Android APK** - Sudah bisa dibuat di local (gratis)
2. ✅ **iOS via Codemagic** - Setup seperti panduan ini
3. ✅ **PWA** - Sudah live di https://weddfin.netlify.app (gratis)

Jika budget terbatas, fokus ke Android dan PWA dulu. iOS bisa menyusul setelah ada budget untuk Apple Developer Account.

## File Penting

- ✅ `codemagic.yaml` - Konfigurasi build workflow
- ✅ `capacitor.config.ts` - App configuration
- ✅ `.env.production` - Production environment variables
- ✅ `package.json` - Dependencies dan scripts

## Support

- Codemagic Docs: https://docs.codemagic.io
- Capacitor Docs: https://capacitorjs.com
- Codemagic Slack: https://codemagic.io/slack

## Next Steps

1. Push code ke GitHub
2. Daftar Codemagic
3. Connect repository
4. Setup code signing (iOS)
5. Run build
6. Download IPA/APK

Selamat mencoba! 🚀
