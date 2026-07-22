# FlixHDMax Fire TV APK wrapper

This Android project opens the TV-only FlixHDMax site in a hardware-accelerated full-screen WebView and exposes it as a Fire TV launcher application.

## Debug URL

Edit `app/build.gradle` and set the debug `APP_URL` to the local development laptop:

```gradle
buildConfigField 'String', 'APP_URL', '"http://YOUR-LAPTOP-IP:5173/"'
```

## Release URL

The release build points to:

```text
https://tv.flixhdmax.com/
```

## Build

Open this directory in Android Studio, use JDK 17 and install Android SDK 35. Android Gradle Plugin 8.7.3 requires Gradle 8.9. Configure Android Studio to use Gradle 8.9 if it does not create a wrapper automatically.

Build the debug APK from **Build > Build APK(s)**.

Output:

```text
app/build/outputs/apk/debug/app-debug.apk
```
