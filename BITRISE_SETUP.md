# Panduan Setup Bitrise untuk Build iOS & Android

## ✅ Yang Sudah Disiapkan

1. ✅ iOS platform sudah ditambahkan (`ios/` folder)
2. ✅ File `bitrise.yml` sudah dibuat dengan workflow iOS & Android
3. ✅ Code sudah di-push ke GitHub

## 🔧 Perbaikan Error "No Podfile found"

Error yang Anda alami:
```
No Podfile found
```

**Penyebab:** iOS platform belum di-add ke project, jadi tidak ada Podfile.

**Solusi:** Sudah diperbaiki! iOS platform sudah ditambahkan dan Podfile sudah ada di `ios/App/Podfile`.

## 📋 Langkah Setup Bitrise

### Step 1: Konfigurasi di Bitrise Dashboard

1. Login ke https://app.bitrise.io
2. Buka project **weddfin**
3. Klik **Workflow Editor**

### Step 2: Update Workflow

Bitrise sekarang akan otomatis detect file `bitrise.yml` yang sudah kita buat.

Atau manual:
1. Di Workflow Editor, pilih tab **bitrise.yml**
2. File `bitrise.yml` dari repository akan otomatis digunakan

### Step 3: Setup Code Signing (iOS)

**Untuk iOS, Anda PERLU:**
- Apple Developer Account ($99/tahun)
- Certificate (.p12)
- Provisioning Profile (.mobileprovision)

#### Cara Setup:

1. Di Bitrise, buka **Workflow Editor**
2. Pilih tab **Code Signing**
3. Upload:
   - **iOS Certificate** (.p12 file)
   - **Provisioning Profile** (.mobileprovision)
4. Masukkan password certificate

#### Cara Mendapatkan Certificate & Provisioning Profile:

**Opsi 1 - Automatic (Mudah):**
1. Di Bitrise, pilih **Code Signing** → **iOS Auto Provisioning**
2. Connect Apple Developer Account
3. Bitrise akan otomatis generate certificate & profile

**Opsi 2 - Manual:**
1. Buka https://developer.apple.com
2. Buat App ID: `com.venapictures.app`
3. Buat Certificate di **Certificates, Identifiers & Profiles**
4. Download Certificate (.cer), convert ke .p12 di Keychain Access (Mac)
5. Buat Provisioning Profile
6. Download dan upload ke Bitrise

### Step 4: Setup Environment Variables

1. Di Bitrise, buka **Workflow Editor**
2. Pilih tab **Env Vars**
3. Tambahkan:

```
VITE_SUPABASE_URL = https://qgedjkzeebfysbtsrqrc.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL = https://weddfin.netlify.app
```

⚠️ **Jangan tambahkan GEMINI_API_KEY** karena public.

### Step 5: Pilih Workflow yang Benar

Di Bitrise, ada 2 workflow:

1. **primary** - Build iOS IPA
2. **android** - Build Android APK

Untuk build iOS:
1. Klik **Start/Schedule a Build**
2. Pilih workflow: **primary**
3. Klik **Start Build**

Untuk build Android:
1. Klik **Start/Schedule a Build**
2. Pilih workflow: **android**
3. Klik **Start Build**

### Step 6: Jalankan Build

1. Klik **Start/Schedule a Build**
2. Pilih branch: **main**
3. Pilih workflow: **primary** (iOS) atau **android**
4. Klik **Start Build**
5. Tunggu 10-20 menit
6. Download IPA/APK dari **Artifacts**

## 🐛 Troubleshooting

### Error: "No Podfile found"
**Status:** ✅ Sudah diperbaiki!

**Solusi:** iOS platform sudah ditambahkan, Podfile ada di `ios/App/Podfile`.

### Error: Code Signing Failed

**Penyebab:** Certificate atau Provisioning Profile tidak valid.

**Solusi:**
1. Pastikan Apple Developer Account aktif
2. Pastikan Bundle ID sama: `com.venapictures.app`
3. Pastikan Provisioning Profile match dengan Bundle ID
4. Gunakan Automatic Provisioning di Bitrise

### Error: Build Timeout

**Penyebab:** Free tier Bitrise terbatas.

**Solusi:**
- Free tier: 45 menit/build, 200 builds/month
- Upgrade ke paid plan jika perlu

### Error: Xcode Build Failed

**Penyebab:** Dependency atau configuration issue.

**Solusi:**
1. Cek build log di Bitrise
2. Pastikan `npm run build` berhasil
3. Pastikan `npx cap sync ios` berhasil

## 📊 Bitrise vs Codemagic

| Feature | Bitrise | Codemagic |
|---------|---------|-----------|
| Free Tier | 200 builds/month | 500 minutes/month |
| Build Time | 45 min/build | Unlimited |
| iOS Support | ✅ | ✅ |
| Android Support | ✅ | ✅ |
| Auto Code Signing | ✅ | ✅ |
| Price (Paid) | $36/month | $95/month |

**Rekomendasi:** Bitrise lebih murah untuk paid plan.

## 🎯 Workflow Explanation

### Primary Workflow (iOS):
1. Clone repository
2. Install npm dependencies
3. Build web app (`npm run build`)
4. Sync Capacitor (`npx cap sync ios`)
5. Install CocoaPods dependencies
6. Build Xcode archive
7. Generate IPA
8. Upload artifacts

### Android Workflow:
1. Clone repository
2. Install npm dependencies
3. Build web app (`npm run build`)
4. Sync Capacitor (`npx cap sync android`)
5. Build Android APK/AAB
6. Upload artifacts

## 💰 Biaya

### Gratis:
- ✅ Bitrise Free Tier: 200 builds/month
- ✅ GitHub: Gratis
- ✅ Android build: Gratis

### Berbayar:
- ❌ Apple Developer Account: $99/tahun (WAJIB untuk iOS)
- ❌ Bitrise Hobby: $36/month (jika perlu lebih builds)

## 🚀 Next Steps

1. ✅ Code sudah di-push ke GitHub
2. ⏳ Setup Code Signing di Bitrise
3. ⏳ Run build workflow
4. ⏳ Download IPA/APK

## 📞 Support

- Bitrise Docs: https://devcenter.bitrise.io
- Capacitor Docs: https://capacitorjs.com
- Bitrise Support: support@bitrise.io

## ✨ Tips

1. **Gunakan Automatic Provisioning** - Lebih mudah daripada manual
2. **Cache Dependencies** - Sudah dikonfigurasi di `bitrise.yml`
3. **Monitor Build Time** - Optimize jika mendekati limit
4. **Use Artifacts** - Download IPA/APK dari Artifacts tab

Selamat mencoba! 🎉
