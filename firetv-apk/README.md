# FlixHDMax Fire TV application

The APK opens the TV-only FlixHDMax frontend in a full-screen WebView. Hosted FlixHDMax HLS streams are transferred to a native Media3/ExoPlayer activity.

## URL selection

The GitHub Actions `app_url` input overrides the debug address in `app/build.gradle`.

```text
Local:       http://YOUR_WINDOWS_IPV4:5173/
Production:  https://tv.flixhdmax.com/
```

## Cloud build

Use:

```text
Actions → Build Fire TV APK → Run workflow
```

The output artifact contains:

```text
app-debug.apk
```

## Package IDs

```text
Debug:   com.flixhdmax.tv.debug
Release: com.flixhdmax.tv
```
