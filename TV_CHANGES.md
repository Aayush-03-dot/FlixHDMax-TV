# FlixHDMax TV changes

This project is a TV-only client. It starts at `/` and is intended for `tv.flixhdmax.com` or the included Fire TV APK.

The current implementation uses:

- Fixed top navigation; the sidebar has been removed.
- Remote-first D-pad, Select, and Back handling.
- Professional TV hero, horizontal rails, details, episodes, search, profile, and login screens.
- Lucide SVG interface icons and existing FlixHDMax artwork.
- A native Fire TV Media3/ExoPlayer path for hosted HLS videos.
- A full-screen WebView path for iframe sources.
- GitHub Actions APK generation without Android Studio.

See `TV_V2_CHANGES.md` for the implementation details.
