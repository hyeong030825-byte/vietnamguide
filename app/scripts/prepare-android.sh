#!/usr/bin/env bash
# Makes the Android project from www/ (run in app/ after npm install). The android/ folder is generated
# on every build and never committed, so all customisation lives here.
set -euo pipefail
VERSION=$(node -p "require('./package.json').version")
CODE=${VERSION_CODE:-1}
[ -d android ] || npx cap add android
npx capacitor-assets generate --android \
  --splashBackgroundColor '#100D0C' --splashBackgroundColorDark '#100D0C'

G=android/app/build.gradle
sed -i "s/versionCode 1\$/versionCode $CODE/; s/versionName \"1.0\"/versionName \"$VERSION\"/" "$G"
grep -q "versionCode $CODE" "$G" || { echo "could not set versionCode in $G"; exit 1; }
cat >> "$G" <<'GRADLE'

// Release signing from CI secrets (see app/README.md). Without them the bundle is built unsigned.
android {
    signingConfigs {
        release {
            def ks = System.getenv("ANDROID_KEYSTORE_FILE")
            if (ks) {
                storeFile file(ks)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("ANDROID_KEYSTORE_FILE")) { signingConfig signingConfigs.release }
        }
    }
}
GRADLE

# portrait on phones (Android 16 ignores this on tablets, which is fine)
M=android/app/src/main/AndroidManifest.xml
grep -q 'android:screenOrientation' "$M" || sed -i 's/android:name=".MainActivity"/android:name=".MainActivity"\n            android:screenOrientation="portrait"/' "$M"

npx cap sync android
echo "Android project ready: version $VERSION ($CODE)"
