# FlixHDMax TV

TV-only React/Vite frontend and Fire TV APK wrapper for FlixHDMax.

## Local development

Start the FlixHDMax backend:

```powershell
cd Backend\FlixHDMax_Backend
.\venv\Scripts\Activate.ps1
flask run --host=0.0.0.0 --port=5000
```

Start the TV frontend in another PowerShell window:

```powershell
cd frontend
npm ci
npm run dev
```

Open the application on the laptop:

```text
http://localhost:5173/
```

Open it from a Fire TV on the same network:

```text
http://YOUR_WINDOWS_IPV4:5173/
```

## Remote controls

- D-pad: move focus
- Centre/Select: activate
- Back: return; from Home it exits the APK
- Media play/pause, rewind, and fast-forward: native hosted-video player

## Build the APK without Android Studio

Push the project to GitHub, then run:

```text
Actions → Build Fire TV APK → Run workflow
```

For local testing, enter:

```text
http://YOUR_WINDOWS_IPV4:5173/
```

For production, enter:

```text
https://tv.flixhdmax.com/
```

Download the `FlixHDMax-TV-APK` artifact and extract `app-debug.apk`.

Install it with Android Platform Tools:

```powershell
cd C:\platform-tools
.\adb.exe connect FIRE_TV_IP:5555
.\adb.exe install -r "C:\path\to\app-debug.apk"
```

An older debug APK signed by another build key must be removed once:

```powershell
.\adb.exe uninstall com.flixhdmax.tv.debug
.\adb.exe install "C:\path\to\app-debug.apk"
```

The workflow caches the v2 debug signing key, so subsequent v2 APKs can normally be installed with `-r`.
