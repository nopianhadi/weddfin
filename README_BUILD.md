# Weddfin - Build Guide

Dashboard untuk wedding business dengan support Android & iOS.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

## 📱 Build Mobile Apps

### Android APK (Windows/Mac/Linux)

**Local Build:**
```bash
npm run android:run
```

Kemudian di Android Studio: **Build → Build APK(s)**

📖 Panduan lengkap: [BUILD_APK_GUIDE.md](BUILD_APK_GUIDE.md)

### iOS IPA (Mac Only atau Cloud)

**Opsi 1 - Local (Mac):**
```bash
npm run ios:run
```

**Opsi 2 - Cloud Build (Windows/Mac/Linux):**
Gunakan Codemagic untuk build di cloud

📖 Panduan lengkap: [CODEMAGIC_SETUP.md](CODEMAGIC_SETUP.md)

## 🌐 Production URL

Web app: https://weddfin.netlify.app

Mobile apps dikonfigurasi untuk menggunakan URL ini (bukan localhost).

## 📦 Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase
- **AI:** Google Gemini
- **Mobile:** Capacitor (iOS & Android)

## 🔧 Configuration Files

- `capacitor.config.ts` - Mobile app configuration
- `.env.production` - Production environment variables
- `codemagic.yaml` - Cloud build configuration
- `package.json` - Dependencies & scripts

## 📝 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

npm run android:sync     # Sync web assets to Android
npm run android:open     # Open Android Studio
npm run android:run      # Build & open Android Studio

npm run ios:sync         # Sync web assets to iOS
npm run ios:open         # Open Xcode
npm run ios:run          # Build & open Xcode
```

## 🔐 Environment Variables

Production variables (`.env.production`):
```
VITE_APP_URL=https://weddfin.netlify.app
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

⚠️ **Jangan commit file `.env` ke Git!**

## 📚 Documentation

- [BUILD_APK_GUIDE.md](BUILD_APK_GUIDE.md) - Panduan build Android APK
- [BUILD_IPA_GUIDE.md](BUILD_IPA_GUIDE.md) - Panduan build iOS IPA
- [CODEMAGIC_SETUP.md](CODEMAGIC_SETUP.md) - Setup cloud build untuk iOS

## 🎯 Build Checklist

### Android APK ✅
- [x] Android platform installed
- [x] Build scripts configured
- [x] Production URL configured
- [x] Can build locally

### iOS IPA ⏳
- [x] iOS platform installed
- [x] Build scripts configured
- [x] Codemagic configuration ready
- [ ] Apple Developer Account (required)
- [ ] Build via Codemagic cloud

## 🆘 Troubleshooting

### Android Build Issues
- Pastikan JAVA_HOME sudah di-set
- Pastikan Android Studio terinstall
- Cek [BUILD_APK_GUIDE.md](BUILD_APK_GUIDE.md)

### iOS Build Issues
- Build iOS hanya bisa di Mac atau via cloud
- Perlu Apple Developer Account ($99/tahun)
- Cek [CODEMAGIC_SETUP.md](CODEMAGIC_SETUP.md)

## 👨‍💻 Author

**nopianhadi**

## 📄 License

Private

---

**Need help?** Baca dokumentasi di folder ini atau hubungi developer.
