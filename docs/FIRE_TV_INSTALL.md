# Fire TV testing and installation

## Browser/PWA limitation

Amazon Silk can open the hosted FlixHDMax TV site, but it does not provide the normal Chrome-style PWA installation or Add to Home Screen flow. Installing another browser is not the correct solution because it still does not create a proper Fire TV launcher application.

Use one of these paths:

1. Amazon Web App Tester for hosted-app development testing.
2. The included Android WebView wrapper to create and sideload an APK.
3. Submit the hosted or hybrid app to the Amazon Appstore for production distribution.

## Test the local web app with Amazon Web App Tester

1. Install **Web App Tester** from the Amazon Appstore on Fire TV.
2. Start the FlixHDMax backend and frontend on the Windows laptop.
3. Keep the laptop and Fire TV on the same network.
4. Open Web App Tester, choose **Hosted Apps**, and enter:

```text
http://YOUR-LAPTOP-IP:5173/
```

A sample `firetv-testing/amazon.testerurls.json` file is included. Replace the IP when the development laptop address changes.

## Build the Fire TV APK

The `firetv-apk` directory is a small full-screen Android WebView launcher.

1. Open `firetv-apk` in Android Studio.
2. Install Android SDK 35 when prompted.
3. Use JDK 17.
4. In `firetv-apk/app/build.gradle`, change the debug `APP_URL` to the laptop IP:

```gradle
buildConfigField 'String', 'APP_URL', '"http://YOUR-LAPTOP-IP:5173/"'
```

5. Select **Build > Build APK(s)**.
6. The debug APK is created at:

```text
firetv-apk\app\build\outputs\apk\debug\app-debug.apk
```

The release build already points to:

```text
https://tv.flixhdmax.com/
```

## Sideload the APK

Enable Fire TV developer options:

1. Settings > My Fire TV > About.
2. Select the Fire TV device name seven times if Developer Options is hidden.
3. Enable ADB Debugging.
4. Enable installation from unknown sources for the installer being used.
5. Find the Fire TV IP under Settings > My Fire TV > About > Network.

From Windows PowerShell with Android Platform Tools installed:

```powershell
adb connect FIRE_TV_IP:5555
adb devices
adb install -r "C:\path\to\app-debug.apk"
```

Accept the debugging prompt on Fire TV. The app then appears as **FlixHDMax TV** in the Fire TV applications list.

## Local PWA testing on a computer

The development service worker is enabled. Chrome or Edge can test installation at:

```text
http://localhost:5173/
```

PWA installation generally requires a secure context. `localhost` is treated specially, but a plain local-network URL such as `http://172.16.0.189:5173/` is not a secure context. This does not affect hosted testing in Silk or Web App Tester.
