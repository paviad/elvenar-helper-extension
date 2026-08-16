#!/bin/zsh
set -e # Stop on error

# Config
PROJECT="ElvenAssist.xcodeproj"
SCHEME="ElvenAssist (macOS)"
ARCHIVE_PATH="./build/ElvenAssist.xcarchive"
OUTPUT_DIR="./build/Output"

echo "🚀 Starting VM Draft Build..."

# 1. Archive (Builds the code)
# This uses your local Development certs automatically.
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -destination "generic/platform=macOS" \
  -archivePath "$ARCHIVE_PATH" \
  -quiet

echo "✅ Archive created."

# 2. Extract the App (Direct Copy)
# We bypass 'exportArchive' to avoid triggering a re-sign attempt.
# Emptied first: cp -R merges into an existing .app, so files from previous builds
# would otherwise linger in the bundle and ship inside the pkg.
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
cp -R "$ARCHIVE_PATH/Products/Applications/ElvenAssist.app" "$OUTPUT_DIR/"

echo "📦 Extracted 'ElvenAssist.app' to $OUTPUT_DIR"
echo "ready for transfer to Mac Mini."

