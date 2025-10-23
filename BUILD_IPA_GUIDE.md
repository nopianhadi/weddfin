# Panduan Build IPA (iOS) - Weddfin

## ⚠️ PERSYARATAN PENTING

**Build IPA HANYA bisa dilakukan di macOS** karena memerlukan:
- ✅ macOS (tidak bisa di Windows)
- ✅ Xcode (hanya tersedia di macOS)
- ✅ Apple Developer Account ($99/tahun untuk publish ke App Store)
- ✅ iOS Device atau Simulator untuk testing

## Alternatif untuk Windows User

Karena Anda menggunakan Windows, ada beberapa opsi:

### Opsi 1: Menggunakan Mac (Recommended)
Pinjam atau gunakan Mac untuk build iOS app

### Opsi 2: Cloud Build Service
Gunakan layanan cloud untuk build iOS:
- **Ionic Appflow** (berbayar)
- **Codemagic** (ada free tier)
- **Bitrise** (ada free tier)
- **EAS Build (Expo)** (berbayar)

### Opsi 3: Mac Virtual Machine
- Rent Mac di cloud (MacStadium, MacinCloud)
- Gunakan Hackintosh (tidak recommended, melanggar ToS Apple)

## Setup iOS Platform (Jika Punya Mac)

### 1. Install iOS Platform
```bash
npm install @capacitor/ios
npx cap add ios
```

### 2. Update package.json Scripts
Tambahkan script iOS:
```json
"ios:sync": "npm run build && npx cap sync ios",
"ios:open": "npx cap open ios",
"ios:run": "npm run build && npx cap sync ios && npx cap open ios"
```

### 3. Build Web App
```bash
npm run build
```

### 4. Sync dengan iOS
```bash
npx cap sync ios
```

### 5. Buka Xcode
```bash
npx cap open ios
```

### 6. Build IPA di Xcode

#### Untuk Testing (Development):
1. Buka project di Xcode
2. Pilih target device atau simulator
3. Klik **Product** → **Build**
4. Untuk install di device: **Product** → **Run**

#### Untuk Distribution (App Store):
1. Pilih **Product** → **Archive**
2. Tunggu archive selesai
3. Di Organizer window, pilih archive
4. Klik **Distribute App**
5. Pilih metode distribusi:
   - **App Store Connect** (untuk publish)
   - **Ad Hoc** (untuk testing internal)
   - **Enterprise** (jika punya Enterprise account)
   - **Development** (untuk testing)
6. Follow wizard untuk signing dan upload

## Konfigurasi iOS

File `capacitor.config.ts` sudah dikonfigurasi dengan:
- App ID: `com.venapictures.app`
- App Name: `weddfin`
- Server URL: `https://weddfin.netlify.app`

## Apple Developer Account

Untuk publish ke App Store:
1. Daftar di https://developer.apple.com
2. Bayar $99/tahun
3. Setup App ID di Developer Portal
4. Buat Provisioning Profile
5. Setup Certificates untuk signing

## Testing di iOS Simulator (Mac Only)

```bash
npm run ios:run
```

Pilih simulator di Xcode dan run.

## Troubleshooting

### CocoaPods Error
```bash
cd ios/App
pod install
cd ../..
```

### Signing Error
- Pastikan sudah login Apple ID di Xcode
- Setup Team di Xcode project settings
- Buat Provisioning Profile yang sesuai

## Rekomendasi untuk Anda (Windows User)

Karena Anda di Windows, saya sarankan:

1. **Fokus ke Android dulu** (APK sudah bisa dibuat)
2. **Gunakan Cloud Build Service** seperti Codemagic atau Bitrise untuk iOS
3. **Atau hire developer dengan Mac** untuk build iOS version

## Cloud Build Setup (Codemagic - Recommended)

1. Daftar di https://codemagic.io
2. Connect repository GitHub/GitLab
3. Setup build configuration untuk Capacitor
4. Codemagic akan build IPA di cloud Mac mereka
5. Download IPA hasil build

Free tier Codemagic:
- 500 build minutes/month
- Cukup untuk testing dan development

## File yang Perlu Ditambahkan (Jika Setup iOS)

Setelah `npx cap add ios`, akan dibuat:
- `ios/` folder dengan Xcode project
- `ios/App/App.xcodeproj` - Xcode project file
- `ios/App/Podfile` - CocoaPods dependencies

## Kesimpulan

**Untuk Windows:** Build IPA tidak memungkinkan secara native. Gunakan cloud service atau Mac.

**Untuk Mac:** Install Xcode, tambahkan iOS platform, dan build via Xcode.
