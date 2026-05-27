#!/bin/bash
set -e

APP_NAME="PDF Launcher.app"
INSTALL_DIR="$HOME/.pdf-launcher"

mkdir -p "$INSTALL_DIR"
cp -R "$APP_NAME" "$INSTALL_DIR/"
cp server.js "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/server.js"

if command -v codesign &> /dev/null; then
  codesign --force --deep --sign - "$INSTALL_DIR/$APP_NAME" || true
fi

if command -v xattr &> /dev/null; then
  xattr -dr com.apple.quarantine "$INSTALL_DIR/$APP_NAME" 2>/dev/null || true
fi

echo "Installed to $INSTALL_DIR/$APP_NAME"

echo "To set as default PDF handler (requires duti):"
echo "  brew install duti"
echo "  duti -x com.adobe.pdf \"$INSTALL_DIR/$APP_NAME\""
