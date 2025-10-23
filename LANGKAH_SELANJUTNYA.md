# 🎯 Langkah Selanjutnya - Build iOS dengan Codemagic

## ✅ Yang Sudah Selesai

1. ✅ iOS platform sudah diinstall (`@capacitor/ios`)
2. ✅ Script iOS sudah ditambahkan di `package.json`
3. ✅ File `codemagic.yaml` sudah dibuat
4. ✅ `.gitignore` sudah diupdate
5. ✅ Dokumentasi lengkap sudah dibuat

## 📋 Yang Perlu Anda Lakukan

### Step 1: Push ke GitHub (5 menit)

```bash
git add .
git commit -m "Add iOS support and Codemagic configuration"
git push
```

Jika belum punya repository:
```bash
git init
git add .
git commit -m "Initial commit with iOS and Codemagic setup"
git branch -M main
git remote add origin https://github.com/USERNAME/weddfin.git
git push -u origin main
```

### Step 2: Daftar Codemagic (2 menit)

1. Buka: https://codemagic.io/signup
2. Klik **Sign up with GitHub**
3. Authorize Codemagic

### Step 3: Tambahkan Project (2 menit)

1. Di dashboard Codemagic, klik **Add application**
2. Pilih repository **weddfin**
3. Klik **Finish**

### Step 4: Setup Code Signing (10 menit)

**Untuk iOS, Anda PERLU Apple Developer Account ($99/tahun)**

Jika sudah punya:
1. Buka project di Codemagic
2. Klik **Settings** → **Code signing identities**
3. Pilih **iOS code signing**
4. Klik **Enable automatic code signing**
5. Login dengan Apple ID

Jika belum punya:
- Daftar di: https://developer.apple.com
- Bayar $99/tahun
- Kemudian lakukan step di atas

### Step 5: Build iOS (15-20 menit)

1. Di dashboard project, klik **Start new build**
2. Pilih workflow: **ios-workflow**
3. Pilih branch: **main**
4. Klik **Start new build**
5. Tunggu build selesai
6. Download IPA dari **Artifacts**

### Step 6: Install IPA di iPhone

**Opsi A - Via TestFlight (Recommended):**
1. Upload IPA ke App Store Connect
2. Invite tester via TestFlight
3. Tester install dari TestFlight app

**Opsi B - Via Xcode (Development):**
1. Connect iPhone ke Mac
2. Open IPA di Xcode
3. Install ke device

**Opsi C - Via Third Party (Tidak Recommended):**
- Diawi.com
- InstallOnAir
- ⚠️ Perlu Enterprise certificate

## 💰 Biaya

### Gratis:
- ✅ Codemagic Free Tier: 500 menit/bulan
- ✅ GitHub: Gratis untuk public/private repo
- ✅ Android build: Gratis

### Berbayar:
- ❌ Apple Developer Account: $99/tahun (WAJIB untuk iOS)
- ❌ Codemagic Pro: $95/bulan (jika perlu lebih dari 500 menit)

## 🎯 Alternatif Jika Belum Siap

### Opsi 1: PWA (Progressive Web App)
- ✅ Gratis
- ✅ Sudah live: https://weddfin.netlify.app
- ✅ User bisa "Add to Home Screen" di iOS
- ❌ Fitur terbatas dibanding native app

### Opsi 2: Fokus Android Dulu
- ✅ Gratis
- ✅ APK sudah bisa dibuat
- ✅ Tidak perlu developer account
- ✅ Bisa distribute via APK file langsung

### Opsi 3: Tunggu Budget iOS
- Build Android dulu
- Deploy PWA
- iOS menyusul setelah ada budget $99

## 📞 Butuh Bantuan?

Baca dokumentasi lengkap:
- [CODEMAGIC_SETUP.md](CODEMAGIC_SETUP.md) - Setup detail Codemagic
- [BUILD_IPA_GUIDE.md](BUILD_IPA_GUIDE.md) - Panduan build iOS
- [BUILD_APK_GUIDE.md](BUILD_APK_GUIDE.md) - Panduan build Android

## ⚡ Quick Commands

```bash
# Push ke GitHub
git add . && git commit -m "Update" && git push

# Build Android local
npm run android:run

# Build iOS local (Mac only)
npm run ios:run

# Build web
npm run build
```

## 🎉 Kesimpulan

Setup sudah lengkap! Tinggal:
1. Push ke GitHub
2. Daftar Codemagic
3. Setup Apple Developer Account
4. Build iOS di cloud

**Estimasi waktu total: 30-40 menit** (jika sudah punya Apple Developer Account)

Good luck! 🚀
