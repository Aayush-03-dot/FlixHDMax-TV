# Install and test FlixHDMax TV on Fire TV

## Local website test

Run the backend:

```powershell
cd Backend\FlixHDMax_Backend
.\venv\Scripts\Activate.ps1
flask run --host=0.0.0.0 --port=5000
```

Run the frontend in another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open this from Fire TV Silk or Amazon Web App Tester:

```text
http://YOUR_WINDOWS_IPV4:5173/
```

The Fire TV and laptop must be on the same network. The Windows firewall must allow port 5173.

## Build the installable APK on GitHub

1. Push the project to GitHub.
2. Open `Actions`.
3. Select `Build Fire TV APK`.
4. Select `Run workflow`.
5. Enter `http://YOUR_WINDOWS_IPV4:5173/` for local testing.
6. Download the `FlixHDMax-TV-APK` artifact.
7. Extract `app-debug.apk`.

For the production build, use:

```text
https://tv.flixhdmax.com/
```

## Install through ADB

Enable Fire TV Developer Options and ADB Debugging, then run:

```powershell
cd C:\platform-tools
.\adb.exe connect FIRE_TV_IP:5555
.\adb.exe devices
.\adb.exe install -r "C:\path\to\app-debug.apk"
```

When replacing an APK signed by an older workflow key, uninstall it once:

```powershell
.\adb.exe uninstall com.flixhdmax.tv.debug
.\adb.exe install "C:\path\to\app-debug.apk"
```

The v2 workflow caches its debug signing key. Later v2 APKs can normally be installed with `-r`.

## Playback architecture

- Hosted FlixHDMax HLS video opens in the APK's native Media3/ExoPlayer player.
- Iframe providers open in the full-screen TV WebView player.
- Browser testing uses Hls.js when the browser does not support HLS directly.
