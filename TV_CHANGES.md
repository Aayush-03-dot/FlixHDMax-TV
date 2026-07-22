# TV-only revision

- Removed desktop/mobile routing from the application entry point.
- Removed the `/tv` prefix; the TV client runs at `/`.
- Changed PWA identity, scope and start URL to `/`.
- Enabled the development service worker for localhost PWA checks.
- Added explicit Fire TV Select handling instead of relying on Silk's default click conversion.
- Added Android key mappings for D-pad, Select and Back.
- Added persistent focus classes for browsers that render `:focus-visible` inconsistently.
- Improved spatial-navigation scoring and automatic row scrolling.
- Simplified the sidebar to Home, Search, Movies, TV Shows, My List and Profile.
- Reduced sidebar width and made expansion an overlay instead of a content obstruction.
- Removed the misleading Fire TV PWA install button.
- Added an Android WebView Fire TV APK wrapper.
- Added Amazon Web App Tester configuration and installation documentation.
