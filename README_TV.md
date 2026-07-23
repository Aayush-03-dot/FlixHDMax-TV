# FlixHDMax TV

Dedicated television application for Fire TV, Android TV, Google TV, and large-screen browsers.

The application is TV-only and loads at `/`. It is intended to be hosted later at:

```text
https://tv.flixhdmax.com/
```

## Development

Start the Flask backend:

```powershell
cd Backend\FlixHDMax_Backend
.\venv\Scripts\Activate.ps1
flask run --host=0.0.0.0 --port=5000
```

Start the frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Open on the development laptop:

```text
http://localhost:5173/
```

Open on a television connected to the same network:

```text
http://YOUR-LAPTOP-IP:5173/
```

## Remote controls

```text
Left / Right   Move inside the current row or control lane
Up / Down      Move between rows and sections
Select         Activate the focused control
Back           Close the keyboard, return to the previous screen, or exit
```

Selecting a login or search input in the APK opens the native Fire TV keyboard. Use its Clear, Cancel, and Done buttons.

## Build the APK without Android Studio

Push the project to GitHub and run:

```text
Actions → Build Fire TV APK → Run workflow
```

For local testing, enter:

```text
http://YOUR-LAPTOP-IP:5173/
```

For production, enter:

```text
https://tv.flixhdmax.com/
```

Download the `FlixHDMax-TV-APK` artifact and extract `app-debug.apk`.

Install it:

```powershell
cd C:\platform-tools
.\adb.exe install -r "C:\path\to\app-debug.apk"
```

For a signature mismatch:

```powershell
.\adb.exe uninstall com.flixhdmax.tv.debug
.\adb.exe install "C:\path\to\app-debug.apk"
```
