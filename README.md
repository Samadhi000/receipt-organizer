# AI Receipt & Expense Organizer

An offline-first Android app that scans paper receipts, reads them with on-device
OCR, categorizes each line item, groups spending by shop, and turns it all into
weekly/monthly reports and spending insights - with optional Firebase account
sync. Built with React Native + Expo (TypeScript).

> M.Sc. IT · SE5070 Enterprise Mobility - individual coursework.

---

## Features

- **Scan a receipt** from the camera or gallery and extract text **100% on-device** (no cloud OCR).
- **Image enhancement** (upscale + grayscale/contrast) so blurry or low-contrast bills read better.
- **Smart parser** that reconstructs rows from OCR bounding boxes, handles two-line item layouts, and validates the total against the sum of items.
- **Validation layer** — edit item names/prices, add missing items, and fix the total before saving.
- **Automatic categorization** of items (fuzzy matching) and grouping by shop.
- **Dashboard** with total spend, receipts/items counts, a category donut chart, and top shops.
- **Reports & insights** — weekly/monthly breakdowns and simple anomaly detection.
- **Local-first storage** (SQLite) with optional **Firebase Auth + Firestore sync** per user.
- **Liquid-glass UI** with a custom component system and the Inter typeface.

---

## Tech stack

| Area | Technology |
|------|------------|
| Framework | React Native `0.86.2` + Expo SDK `57` (Dev Build, **not** Expo Go) |
| Language | TypeScript `6.x`, React `19.2.3` |
| On-device OCR | `@react-native-ml-kit/text-recognition` (Google ML Kit, Latin script) |
| Local database | `expo-sqlite` |
| Auth & sync | Firebase JS SDK `12.x` (Auth + Firestore) |
| Image processing | `@shopify/react-native-skia` `2.6.2`, `expo-image-manipulator` |
| Animation (Skia peer) | `react-native-reanimated` `4.5.1` + `react-native-worklets` |
| Charts | `react-native-svg` (custom donut chart) |
| Navigation | `@react-navigation/native` + bottom-tabs `7.x` |
| UI | `expo-linear-gradient`, `expo-blur`, `@expo-google-fonts/inter`, `@expo/vector-icons` |

---

## Prerequisites

Install these **before** running the app. Versions in **bold** are what this project
was built and tested with.

### 1. Node.js & npm
- **Node.js 20 LTS or newer** (tested on **v24.16.0**)
- **npm 10+** (tested on **v11.13.0**)

### 2. Java JDK — version matters
- Use **JDK 17** (recommended by Expo) or **JDK 21**. This project was built with **OpenJDK 21**.
- **Do NOT use JDK 24 or 25** — the native build fails (`configureCMakeDebug` → *"restricted method in java.lang.System"*).

macOS (Homebrew):
```bash
brew install openjdk@21
# then point JAVA_HOME at it (zsh):
echo 'export JAVA_HOME="$(/usr/libexec/java_home -v 21)"' >> ~/.zshrc
source ~/.zshrc
java -version   # should report 21.x
```
> Alternatively, set it inside Android Studio: **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK → 21** (or 17).

### 3. Android Studio + SDK
Install the latest **Android Studio**, then open **Settings → Languages & Frameworks → Android SDK**
and make sure these are installed (SDK Manager):
- **Android SDK Platform 36** (compile/target SDK)
- **Android SDK Build-Tools 36.0.0**
- **NDK 27.1.12297006**
- **CMake**
- **Android SDK Platform-Tools**
- **Android Emulator**

Set the environment variable (macOS default path):
```bash
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"' >> ~/.zshrc
source ~/.zshrc
```

### 4. Emulator (AVD) or a real device
Create a virtual device in Android Studio's **Device Manager**:
- Device: **Pixel 6a** (what this project was tested on; any modern phone profile works)
- System image: **Google Play** (or Google APIs), **API level 34 or newer** (tested on **API 36**)
- ABI: **arm64-v8a** on Apple Silicon Macs, **x86_64** on Intel

Or use a **physical Android phone** with **Developer options → USB debugging** enabled.

---

## Firebase setup

The app ships with a working Firebase config (`src/services/firebaseConfig.ts` and
`google-services.json`) for the project `receipt-organizer-14b57`. The API key there
is a **public client identifier**, not a secret — Firebase access is controlled by
Firestore security rules.

To make **login/signup** work you must enable the provider once:

1. Open the [Firebase Console](https://console.firebase.google.com) → project **receipt-organizer**.
2. **Authentication → Sign-in method → Email/Password → Enable → Save**.

The app still runs fully offline without an account — tap **"Continue without an account"** on the login screen.

> **Using your own Firebase instead?** Replace `src/services/firebaseConfig.ts`
> (web config) and `google-services.json` (Android config) with your project's values.

---

## Run the app

```bash
# 1. Clone
git clone https://github.com/Samadhi000/<repo-name>.git
cd <repo-name>

# 2. Install dependencies
npm install

# 3. Make sure JAVA_HOME points to JDK 17/21 and ANDROID_HOME is set (see Prerequisites)

# 4. Start an emulator (or plug in a device), then build + run the dev build.
#    This auto-generates the native /android project (expo prebuild) on first run,
#    builds the APK, installs it, and starts the Metro bundler.
npx expo run:android
```

- First run takes several minutes (native compilation). Later runs are much faster.
- This is a **Dev Build**, not Expo Go — it contains native modules (ML Kit, Skia, SQLite, Firebase), so **Expo Go will not work**.
- To just restart the JS bundler afterwards: `npx expo start --dev-client`.

### Build a standalone release APK
Produces an installable APK with the JS bundled in (no Metro / dev server needed):
```bash
npx expo prebuild        # only if the /android folder doesn't exist yet
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```
Install it on a device:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 📁 Project structure

```
receipt-organizer/
├─ App.tsx                 # Root: fonts, auth gate, navigation container
├─ index.ts                # Entry point
├─ app.json                # Expo app config
├─ google-services.json    # Firebase Android config
├─ babel.config.js         # Babel preset + react-native-worklets plugin
└─ src/
   ├─ theme/               # Design tokens (colors, type, spacing, shadows)
   ├─ components/          # Reusable UI (GlassCard, GradientBackground, charts, ReceiptReview…)
   ├─ screens/             # Home, History, Scan/Upload, Settings, Profile, Auth
   ├─ navigation/          # Bottom-tab navigator + custom tab bar
   ├─ services/            # OCR parser, image enhance, validation, firebase, auth, sync
   ├─ db/                  # SQLite database + repository (stats, receipts, categories)
   ├─ utils/               # Helpers
   └─ types/               # Shared TypeScript types
```

> The `/android` (and `/ios`) folders are generated by Expo and are **not** committed —
> they are recreated by `npx expo run:android` / `npx expo prebuild`.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `configureCMakeDebug` fails with *"restricted method in java.lang.System"* | You're on JDK 24/25. Switch to **JDK 17 or 21** and set `JAVA_HOME`. |
| `SDK location not found` | Set `ANDROID_HOME`, or create `android/local.properties` with `sdk.dir=/Users/<you>/Library/Android/sdk`. |
| `Cannot find module 'babel-preset-expo'` | Run `npx expo install babel-preset-expo`. |
| Metro error: port **8081** already in use | `lsof -ti:8081 \| xargs kill -9` then re-run. |
| App won't open in **Expo Go** | Expected — this project needs a **Dev Build** (`npx expo run:android`). |
| Build acts stale after changing native deps | `npx expo prebuild --clean` then `npx expo run:android`. |
| OCR can't read a receipt | ML Kit reads **Latin script** only; very blurry images may still fail even after enhancement. |

---

## Notes

- On-device OCR means receipts never leave the phone; Firebase sync is opt-in per account.
- Tested on **macOS (Apple Silicon)** with a **Pixel 6a** emulator.
