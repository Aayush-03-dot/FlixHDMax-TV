package com.flixhdmax.tv;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

public final class NativePlayerActivity extends Activity {
    public static final String EXTRA_URL = "playback_url";
    public static final String EXTRA_TITLE = "playback_title";

    private PlayerView playerView;
    private ExoPlayer player;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN |
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        enterImmersiveMode();

        String playbackUrl = getIntent().getStringExtra(EXTRA_URL);
        String title = getIntent().getStringExtra(EXTRA_TITLE);

        if (playbackUrl == null || playbackUrl.trim().isEmpty()) {
            Toast.makeText(this, "Playback URL is missing.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(true);
        playerView.setControllerHideOnTouch(true);
        playerView.setControllerShowTimeoutMs(5000);
        playerView.setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING);
        playerView.setKeepScreenOn(true);
        playerView.setFocusable(true);
        playerView.setFocusableInTouchMode(true);
        setContentView(playerView);

        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(title == null ? "FlixHDMax" : title)
            .build();

        MediaItem mediaItem = new MediaItem.Builder()
            .setUri(playbackUrl)
            .setMimeType(MimeTypes.APPLICATION_M3U8)
            .setMediaMetadata(metadata)
            .build();

        player = new ExoPlayer.Builder(this).build();
        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                Toast.makeText(
                    NativePlayerActivity.this,
                    "This video could not be played.",
                    Toast.LENGTH_LONG
                ).show();
            }
        });

        playerView.setPlayer(player);
        player.setMediaItem(mediaItem);
        player.prepare();
        player.play();
        playerView.requestFocus();
        playerView.showController();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();

            if (isDirectionalOrSelectKey(keyCode) && playerView != null) {
                playerView.showController();
            }

            if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) {
                if (player != null) {
                    if (player.isPlaying()) player.pause(); else player.play();
                }
                return true;
            }

            if (keyCode == KeyEvent.KEYCODE_MEDIA_REWIND) {
                if (player != null) player.seekBack();
                return true;
            }

            if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) {
                if (player != null) player.seekForward();
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        finish();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (playerView != null) playerView.requestFocus();
    }

    @Override
    protected void onStop() {
        if (player != null) player.pause();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (playerView != null) playerView.setPlayer(null);
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }

    private boolean isDirectionalOrSelectKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_DPAD_LEFT ||
            keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
            keyCode == KeyEvent.KEYCODE_DPAD_UP ||
            keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
            keyCode == KeyEvent.KEYCODE_DPAD_CENTER ||
            keyCode == KeyEvent.KEYCODE_ENTER ||
            keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER;
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }
}
