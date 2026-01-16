#!/bin/zsh

# Config
ARCHIVE_PATH="./build/ElvenAssist.xcarchive"
OUTPUT_DIR="./build/Output"
APP_NAME="ElvenAssist"

# 1. Extract the App from the Archive
# We copy it from the internal 'Products/Applications' folder
echo "📦 Extracting App..."
mkdir -p "$OUTPUT_DIR"
cp -R "$ARCHIVE_PATH/Products/Applications/$APP_NAME.app" "$OUTPUT_DIR/"

# 2. Create the Package (PKG)
# Note: Add '--sign "3rd Party Mac Developer Installer: Name (ID)"' if running on Mac Mini
echo "🎁 Building PKG..."
productbuild \
  --sign "$SIGNINGKEYNAME" \
  --component "$OUTPUT_DIR/$APP_NAME.app" /Applications \
  "$OUTPUT_DIR/$APP_NAME.pkg"

cp -R "$OUTPUT_DIR/$APP_NAME.pkg" "$VMSHAREDFOLDER"

echo "✅ Done: $OUTPUT_DIR/$APP_NAME.pkg"
echo "✅ Done: $VMSHAREDFOLDER/$APP_NAME.pkg"
