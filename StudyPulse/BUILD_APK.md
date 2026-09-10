# How to Generate & Install the StudyPulse GH Android APK (`.apk`)

This guide explains how to get your installable Android `.apk` file to install on your phone or share with Ghanaian classmates via **Bluetooth**, **Xender**, or **WhatsApp**.

---

## Method 1: Automated Cloud Build via GitHub Actions (Zero Local Setup)

Since your code repository includes the pre-configured workflow [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml), GitHub will compile the `.apk` automatically in the cloud:

1. Push this project folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for StudyPulse GH APK"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/studypulse-gh.git
   git push -u origin main
   ```
2. Go to your repository on [GitHub](https://github.com).
3. Click the **Actions** tab at the top.
4. Click on the latest workflow run named **"Build Android APK"**.
5. Once the run finishes (takes ~2 minutes), scroll down to the **Artifacts** section at the bottom.
6. Click **`StudyPulse-GH-Android-APK`** to download the ZIP file.
7. Unzip it on your phone or computer to get `app-debug.apk`!
8. Tap the `.apk` on any Android phone and select **"Install"**.

---

## Method 2: Open in Android Studio (Local Compile)

If you or a friend have **Android Studio** installed:

1. Open Android Studio.
2. Select **Open an Existing Project** and choose the `android` folder inside this directory:
   `C:\Users\LENOVO\.gemini\antigravity-ide\scratch\studypulse\android`
3. Wait for Gradle sync to complete.
4. Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Once built, click **locate** in the pop-up at the bottom right.
6. Your `.apk` file will be waiting in `app/build/outputs/apk/debug/app-debug.apk`!

---

## Method 3: Instant 1-Click Online APK Builder (No Android Studio)

You can also use online APK packaging tools like **PWABuilder** (powered by Microsoft):

1. Host your `studypulse` folder on GitHub Pages, Vercel, or Netlify (all free).
2. Go to [pwabuilder.com](https://www.pwabuilder.com).
3. Enter your URL and click **Start**.
4. Click **Package for Stores** > **Android**.
5. Choose **APK** download. It generates a signed, installable `.apk` directly to your phone.

---

## Sharing with Classmates in Ghana

1. Send the `.apk` file to other students via **Xender**, **Bluetooth**, or **Nearby Share**.
2. When students tap on it, Android will ask for permission: *"Allow installation from unknown sources"*. Tap **Allow**.
3. StudyPulse installs with its native icon and runs **100% offline** without using a single megabyte of mobile data!
