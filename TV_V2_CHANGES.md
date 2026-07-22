# FlixHDMax TV v2

## Interface

- Replaced the expandable side rail with a fixed top navigation bar.
- Added Home, Movies, TV Shows, My List, Search, and Profile navigation.
- Reworked hero, content rows, cards, details, login, search, profile, episode lists, and player screens for television viewing distance.
- Replaced placeholder artwork and text symbols in the TV interface with FlixHDMax artwork and Lucide SVG icons.
- Kept the project TV-only at `/`; there is no desktop/mobile application and no `/tv` route.

## Remote control

- D-pad directions move visible focus between controls and content cards.
- Centre/Select explicitly activates the focused control.
- Back closes text input, returns to the previous page, or exits from Home.
- Focus is restored after navigating back and content rows scroll automatically.
- The Fire TV wrapper forwards Android remote key codes directly to the React navigation layer.

## Hosted video playback

- Added `/api/tv/hosted-playback/<hosted_video_id>` to request a signed hosted-video session and return its HLS master URL.
- Added a TV hosted-player page with browser HLS fallback.
- Added a native Media3/ExoPlayer HLS player to the Fire TV APK for hosted videos.
- Iframe sources continue to use the dedicated full-screen iframe player.

## APK builds

- Application version: 2.0.0.
- GitHub Actions now caches a stable debug signing key so later APKs can update the previous v2 debug installation.
- The first v2 APK may require uninstalling an older debug build once if it was signed with another key.
