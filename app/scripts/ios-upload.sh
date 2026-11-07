#!/usr/bin/env bash
# Archive, sign (automatic signing through the App Store Connect API key) and upload to TestFlight.
# Needs ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 (the whole .p8 text) and APPLE_TEAM_ID in the environment.
set -euo pipefail
VERSION=$(node -p "require('./package.json').version")
BUILD=${BUILD_NUMBER:-1}
KEY="$RUNNER_TEMP/AuthKey_${ASC_KEY_ID}.p8"
printf '%s\n' "$ASC_KEY_P8" > "$KEY"
AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")

cat > "$RUNNER_TEMP/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${APPLE_TEAM_ID}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
PLIST

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$RUNNER_TEMP/App.xcarchive" archive \
  "${AUTH[@]}" DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD" | tail -n 60
xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/App.xcarchive" \
  -exportOptionsPlist "$RUNNER_TEMP/ExportOptions.plist" -exportPath "$RUNNER_TEMP/export" "${AUTH[@]}" | tail -n 60
rm -f "$KEY"
echo "Uploaded $VERSION ($BUILD) to App Store Connect. It shows up in TestFlight after processing (10–30 min)."
