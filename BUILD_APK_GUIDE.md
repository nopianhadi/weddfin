# Panduan Build APK - Weddfin

## Konfigurasi Selesai ✅

URL aplikasi sudah diubah dari localhost ke: **https://weddfin.netlify.app**

## Langkah-langkah Build APK

### 1. Build Web App untuk Production
```bash
npm run build
```

### 2. Sync dengan Android
```bash
npx cap sync android
```

### 3. Buka Android Studio
```bash
npx cap open android
```

### 4. Build APK di Android Studio

Setelah Android Studio terbuka:

#### Untuk Debug APK (Testing):
1. Pilih menu: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Tunggu proses build selesai
3. APK akan tersimpan di: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Untuk Release APK (Production):
1. Pilih menu: **Build** → **Generate Signed Bundle / APK**
2. Pilih **APK** → **Next**
3. Buat atau pilih keystore (untuk signing)
4. Isi informasi keystore:
   - Key store path
   - Password
   - Key alias
   - Key password
5. Pilih **release** build variant
6. Klik **Finish**
7. APK akan tersimpan di: `android/app/build/outputs/apk/release/app-release.apk`

### 5. Shortcut Command (All-in-One)
```bash
npm run android:run
```
Command ini akan otomatis:
- Build web app
- Sync dengan Android
- Buka Android Studio

## Persyaratan

- ✅ Node.js dan npm terinstall
- ✅ Android Studio terinstall
- ✅ Java JDK terinstall (minimal JDK 11)
- ✅ Android SDK terinstall via Android Studio

## Catatan Penting

1. **URL Production**: APK akan menggunakan `https://weddfin.netlify.app` sebagai backend
2. **App ID**: `com.venapictures.app`
3. **App Name**: `weddfin`
4. **Supabase**: Sudah dikonfigurasi untuk production

## Testing APK

Setelah APK dibuat, install di perangkat Android:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Atau transfer file APK ke HP dan install manual.

## Troubleshooting

### Jika Android Studio tidak terdeteksi:
- Pastikan Android Studio sudah terinstall
- Set ANDROID_HOME environment variable
- Tambahkan Android SDK tools ke PATH

### Jika build gagal:
```bash
cd android
./gradlew clean
cd ..
npm run android:sync
```

## File yang Sudah Diupdate

- ✅ `.env.production` - Ditambahkan URL production dan Supabase config
- ✅ `capacitor.config.ts` - Ditambahkan server URL ke weddfin.netlify.app
