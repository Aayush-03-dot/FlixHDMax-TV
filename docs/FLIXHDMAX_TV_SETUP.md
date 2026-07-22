# FlixHDMax TV setup

## Application scope

This frontend is TV-only:

```text
/
```

It does not expose a desktop/mobile interface and does not use a `/tv` prefix. The intended production hostname is:

```text
https://tv.flixhdmax.com/
```

## Interface

The TV client uses a fixed top navigation bar with Home, Movies, TV Shows, My List, Search, and Profile. Every interactive control is registered with the TV spatial-navigation layer.

Keyboard development controls:

```text
Arrow keys    Move focus
Enter         Select
Escape        Back
```

Fire TV controls:

```text
D-pad         Move focus
Centre        Select
Back          Return or exit from Home
```

## Development

Install dependencies on the current operating system:

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run dev
```

Open:

```text
http://localhost:5173/
```

Other devices on the same network use:

```text
http://YOUR_WINDOWS_IPV4:5173/
```

Do not copy `node_modules` between Windows and Linux.

## Production deployment

Build the frontend:

```powershell
npm ci
npm run build
```

Serve `frontend/dist` from `tv.flixhdmax.com` with the SPA fallback:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Proxy `/api/` to the existing FlixHDMax backend so the current session authentication remains same-origin.

The OTT backend must retain the current video-host settings:

```env
VIDEO_HOST_BASE_URL=https://watch.flixhdmax.com
VIDEO_HOST_INTERNAL_API_KEY=YOUR_EXISTING_INTERNAL_KEY
```

## Fire TV APK

The APK is built by `.github/workflows/build-firetv-apk.yml`. The workflow input controls the site loaded by the APK:

```text
Local:       http://YOUR_WINDOWS_IPV4:5173/
Production:  https://tv.flixhdmax.com/
```

Hosted videos are handed to the native Media3/ExoPlayer HLS player. Iframe titles remain in the full-screen WebView player.
