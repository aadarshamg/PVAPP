const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// Expo has no built-in option for this attribute. Without it, Android puts a portrait-
// locked, non-resizable activity into "size compat mode" on large-screen/foldable devices
// (e.g. Galaxy Z Fold, unfolded) — a compatibility rendering path that scales/letterboxes
// the whole UI and is a known cause of real scrolling/rendering lag, not just a cosmetic
// issue. Declaring the activity resizable avoids that compat-mode path entirely while the
// app still renders in its normal portrait layout — this does not require the app to
// actually support landscape/multi-window layouts.
function withAndroidResizeableActivity(config) {
    return withAndroidManifest(config, (config) => {
        const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
        mainActivity.$['android:resizeableActivity'] = 'true';
        return config;
    });
}

module.exports = withAndroidResizeableActivity;
