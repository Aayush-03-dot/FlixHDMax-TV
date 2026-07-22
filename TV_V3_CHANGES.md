# FlixHDMax TV v3

## Remote login correction

- Email, password, password visibility, and Sign in now use explicit remote focus routes.
- D-pad Up and Down move between login controls even while an HTML input remains focused.
- Fire TV Back hides the on-screen keyboard without losing the selected field.
- Email uses the TV keyboard Next action; password uses Done.
- The Android wrapper exposes a keyboard bridge so the web UI can dismiss the Fire TV keyboard when focus moves to a button.

## Home presentation

- Restored hero background preview playback from the original `preview_url` field.
- Preview starts muted, loops, fades over the backdrop, pauses off-screen, and falls back to artwork on error.
- Added a remote-focusable sound control using Lucide icons.
- Refined hero scale, gradients, typography, row overlap, card spacing, and focused-card treatment.
- Added explicit hero-to-first-row focus routes.
- The first home rail uses a larger TV layout.

## Android build corrections

- AndroidX enabled.
- Media3 pinned to `1.6.1` for compile SDK 35 and Android Gradle Plugin 8.7.3 compatibility.
- APK version increased to `3.0.0` (`versionCode 3`).
- Gradle, APK, AAB, build, and local Android files are excluded from Git.
