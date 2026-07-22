# FlixHDMax TV

This project is a television-only FlixHDMax client. It does not expose the desktop or mobile interface and does not use a `/tv` path.

## Routes

- `/` — TV home
- `/login` — TV login
- `/search` — TV search
- `/movies` — movies
- `/shows` — series
- `/my-list` — My List
- `/movie/:id` — movie details
- `/series/:id` — series and episodes
- `/profile` — profile and sign out

## Windows development

Start the existing Flask backend on port 5000.

```powershell
cd Backend\FlixHDMax_Backend
.\venv\Scripts\Activate.ps1
flask run --host=0.0.0.0 --port=5000
```

Start the TV frontend:

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run dev
```

Open on the development laptop:

```text
http://localhost:5173/
```

Open on Fire TV or another device on the same network:

```text
http://YOUR-LAPTOP-IP:5173/
```

No `/tv` suffix is used.

## Remote controls

- D-pad: move focus
- Centre/Select: activate focused control
- Back: previous screen; when the TV keyboard is open, Back closes the keyboard first
- Keyboard development: arrow keys, Enter and Escape/Backspace

The JavaScript handler supports browser key codes and Android/Fire TV key codes.

## Production

Build:

```powershell
npm run build
```

Deploy the generated `frontend/dist` files to `https://tv.flixhdmax.com` and configure Nginx to send client-side routes to `index.html`.

## Build an APK without Android Studio

Use the included GitHub Actions workflow:

```text
.github/workflows/build-firetv-apk.yml
```

Instructions:

```text
docs/BUILD_APK_WITHOUT_ANDROID_STUDIO.md
```
