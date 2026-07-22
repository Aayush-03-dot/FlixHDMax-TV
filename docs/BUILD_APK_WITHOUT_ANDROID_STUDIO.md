# Build the Fire TV APK without Android Studio

## Push to GitHub

```powershell
git add .
git commit -m "Update FlixHDMax TV"
git branch -M main
git push -u origin main
```

## Run the build

1. Open the repository on GitHub.
2. Open `Actions`.
3. Select `Build Fire TV APK`.
4. Select `Run workflow`.
5. Enter the application URL.

Local development example:

```text
http://172.16.0.189:5173/
```

Production:

```text
https://tv.flixhdmax.com/
```

6. Download the `FlixHDMax-TV-APK` artifact.
7. Extract `app-debug.apk`.

## Install

```powershell
cd C:\platform-tools
.\adb.exe connect FIRE_TV_IP:5555
.\adb.exe install -r "C:\path\to\app-debug.apk"
```

If Android reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, remove the older differently signed debug build once:

```powershell
.\adb.exe uninstall com.flixhdmax.tv.debug
.\adb.exe install "C:\path\to\app-debug.apk"
```

The workflow caches a stable v2 debug signing key, so subsequent workflow builds can normally update the installed v2 APK.
