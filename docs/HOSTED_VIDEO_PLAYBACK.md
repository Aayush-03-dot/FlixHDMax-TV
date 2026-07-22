# Hosted video playback

The television frontend does not send hosted titles to the desktop player.

1. The TV frontend requests `/api/tv/hosted-playback/<video-id>`.
2. The OTT backend requests a signed playback session from the video-host service.
3. The OTT backend returns the signed HLS master URL.
4. The Fire TV APK opens that URL with the native Media3/ExoPlayer player.
5. A browser-only session uses native HLS or Hls.js as a fallback.

Required backend settings:

```env
VIDEO_HOST_BASE_URL=https://watch.flixhdmax.com
VIDEO_HOST_INTERNAL_API_KEY=YOUR_EXISTING_INTERNAL_KEY
```

During local development, these values should continue pointing at the same video-host service already used by the desktop FlixHDMax application.
