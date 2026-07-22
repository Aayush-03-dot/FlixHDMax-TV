# FlixHDMax TV and Fire TV setup

## What was added

The existing desktop and mobile application is preserved. A separate television interface is available at:

- Existing domain: `https://flixhdmax.com/tv`
- Dedicated TV domain: `https://tv.flixhdmax.com`

When the hostname starts with `tv.`, the root path automatically uses the TV interface. The `/tv` path remains available as an alias.

The TV interface includes:

- D-pad Up, Down, Left and Right navigation
- Select/Enter activation
- Fire TV and television Back-button handling
- Focus restoration when returning to a page
- Horizontal content rails that follow the focused card
- Netflix-style hero, sidebar, details and episode screens
- TV login using the existing FlixHDMax session
- Search using the television on-screen keyboard
- Movies, TV Shows and My List
- Hosted-video handoff to the existing FlixHDMax player
- Full-screen iframe playback route for legacy embedded sources
- TV-specific PWA manifest and install screen

## Development on Windows

Start the Flask backend first using the existing project process.

Then open PowerShell:

```powershell
cd C:\path\to\FlixHDMax\frontend

# Use a clean platform-specific dependency install.
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci

npm run dev:tv
```

Open:

```text
http://localhost:5173/tv
```

Test remote behaviour using a keyboard:

- Arrow keys: move focus
- Enter: select
- Escape or Backspace: go back

The Vite development server proxies `/api`, `/auth`, `/uploads` and `/watch` to `http://localhost:5000`.

## Production build

The normal build contains both the existing desktop/mobile interface and the new `/tv` interface:

```powershell
npm ci
npm run build
```

A TV-focused build uses the TV manifest as the primary generated PWA manifest:

```powershell
npm ci
npm run build:tv
```

The generated files are written to:

```text
frontend/dist
```

Do not copy `node_modules` between Windows and Linux. Run `npm ci` on the machine that performs the build.

## Existing-domain deployment

After deploying the normal frontend build, this URL works without a separate frontend deployment:

```text
https://flixhdmax.com/tv
```

The Nginx frontend location must preserve the normal SPA fallback:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## Dedicated `tv.flixhdmax.com` deployment

Point the DNS record for `tv.flixhdmax.com` to the Dell server, then serve the same frontend build and proxy the same backend routes.

Example Nginx server block:

```nginx
server {
    listen 80;
    server_name tv.flixhdmax.com;

    root /home/coffee/apps/flixhdmax/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    location /watch/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add HTTPS before testing PWA installation. Keep all frontend and backend requests on the TV hostname through Nginx so the existing cookie-based login remains same-origin.

## Installing as a PWA

The project now contains:

```text
frontend/public/tv-manifest.webmanifest
```

The TV route changes the active page manifest to the TV manifest. It uses:

- Start URL: `/tv/`
- Full-screen display
- Landscape orientation
- Existing FlixHDMax PWA icons
- Dark TV theme

The Profile screen includes an `Install TV web app` button. On browsers that support `beforeinstallprompt`, it opens the browser installation prompt. On other browsers it displays the browser-menu instruction.

PWA installation requires HTTPS in production.

### Desktop Chrome or Edge

1. Open `https://flixhdmax.com/tv` or `https://tv.flixhdmax.com`.
2. Use the install icon in the address bar, or open the browser menu.
3. Choose `Install FlixHDMax TV`.

### Android phone or tablet

1. Open the TV URL in Chrome.
2. Open the Chrome menu.
3. Choose `Install app` or `Add to Home screen`.

### iPhone or iPad

1. Open the TV URL in Safari.
2. Open Share.
3. Choose `Add to Home Screen`.

## Fire TV testing

### Browser test

1. Open Amazon Silk on the Fire TV.
2. Enter `https://tv.flixhdmax.com` or `https://flixhdmax.com/tv`.
3. Sign in.
4. Test every row and screen using only the Fire TV remote.

Silk may not expose the same PWA installation prompt available in desktop Chrome or Android Chrome. Browser use is valid for testing, but it should not be treated as the final Fire TV installation method.

### Amazon Web App test

Amazon supports hosted, packaged and hybrid HTML5 applications for Fire TV. Use Amazon Web App Tester to load the hosted TV URL on a physical Fire TV and inspect it with DevTools.

### Final installable Fire TV app

For an icon on the Fire TV launcher and Amazon Appstore distribution, package the hosted TV interface as either:

- An Amazon hosted HTML5 web app
- A hybrid Android application using Amazon WebView
- A standard Android WebView wrapper

The wrapper should open `https://tv.flixhdmax.com`, enable JavaScript and DOM storage, handle the Back key, allow full-screen video and restrict navigation to trusted FlixHDMax domains.

## Compatibility notes

- Hosted FlixHDMax videos use the existing `/watch/hosted/...` player.
- Legacy iframe providers must support Fire TV's browser/WebView and remote input. A provider can still fail even when the FlixHDMax TV UI works correctly.
- Test 1080p and 720p displays.
- Test older and newer Fire OS devices because their browser and WebView versions differ.
- A native Kotlin/Media3 player remains the strongest later option for DRM, subtitles, audio tracks, playback analytics and consistent hardware decoding.
