#!/usr/bin/env bash
# Makes the iOS project from www/ (run in app/ on macOS after npm install). ios/ is generated on every build.
set -euo pipefail
[ -d ios ] || npx cap add ios
npx capacitor-assets generate --ios --splashBackgroundColor '#100D0C' --splashBackgroundColorDark '#100D0C'

P=ios/App/App/Info.plist
PB=/usr/libexec/PlistBuddy
$PB -c "Set :CFBundleDisplayName 베트남 가이드" "$P"
$PB -c "Set :CFBundleDevelopmentRegion ko" "$P" 2>/dev/null || $PB -c "Add :CFBundleDevelopmentRegion string ko" "$P"
# only standard HTTPS: no export-compliance paperwork
$PB -c "Delete :ITSAppUsesNonExemptEncryption" "$P" 2>/dev/null || true
$PB -c "Add :ITSAppUsesNonExemptEncryption bool false" "$P"
# iPhone only, portrait
$PB -c "Delete :UISupportedInterfaceOrientations" "$P" 2>/dev/null || true
$PB -c "Add :UISupportedInterfaceOrientations array" -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$P"
$PB -c "Delete :UISupportedInterfaceOrientations~ipad" "$P" 2>/dev/null || true
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2";/TARGETED_DEVICE_FAMILY = 1;/g' ios/App/App.xcodeproj/project.pbxproj

npx cap sync ios
echo "iOS project ready"
