# FlixHDMax TV v4

This release replaces the previous browser-style focus behaviour with a TV-first interaction model.

## Remote navigation

- The logo is decorative and can no longer receive focus.
- Navigation is split into deterministic lanes: top navigation, hero controls, each content row, form controls, seasons, episodes, and player controls.
- Left and Right stay inside the current lane.
- Up and Down move to the nearest control in the previous or next lane.
- The first content row always returns to the hero controls.
- Hero controls return to the active top-navigation item.
- Moving between rows scrolls the selected row into the centre of the screen.
- The last selected content control is restored when leaving the top navigation.
- Focus is restored per route.

## Fire TV keyboard

The Android wrapper now opens a native Fire TV text-entry dialog instead of depending on WebView keyboard behaviour.

The native dialog includes:

- Fire TV system keyboard
- Clear
- Cancel
- Done
- Password masking
- Email keyboard mode
- Search keyboard mode

The login and search pages use this native input flow automatically when installed as the APK. Browser development still supports normal keyboard input.

## Home interface

- Rebuilt cinematic hero layout.
- Existing `preview_url` background video retained with muted autoplay and backdrop fallback.
- Fixed top navigation with no sidebar.
- Cleaner title typography and metadata.
- Content rows overlap the hero naturally.
- Larger 16:9 TV cards.
- Focused cards use a controlled scale, white focus border, title metadata, and play indicator.
- Missing artwork uses a neutral title card rather than a placeholder image.

## Playback

- Hosted videos open automatically in the native Media3 full-screen player.
- Browser HLS fallback remains available.
- Iframe playback opens in a full-viewport player page.
- Player pages include Back and Full screen controls.
- Android wrapper remains immersive and landscape-only.

## Android build configuration

- Application version: `4.0.0`
- Version code: `4`
- AndroidX enabled
- Media3 pinned to `1.6.1`
- Compile SDK: `35`
- Target SDK: `35`
- Gradle: `8.9`
