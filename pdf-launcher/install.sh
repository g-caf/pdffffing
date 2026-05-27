#!/bin/bash

set -e

echo "PDF Launcher Installation"
echo "========================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first:"
    echo "   brew install node"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Check if Swift compiler is available
if ! command -v swiftc &> /dev/null; then
    echo "❌ Swift compiler not found. This requires Xcode Command Line Tools."
    echo "   Run: xcode-select --install"
    exit 1
fi

echo "✓ Swift compiler found"
echo ""

# Build the Swift app
echo "Building Swift launcher..."
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR"

if [ -f "pdf-launcher" ]; then
    rm pdf-launcher
fi

swiftc -o pdf-launcher main.swift
echo "✓ Swift launcher built"

# Install to ~/.pdf-launcher
INSTALL_DIR="$HOME/.pdf-launcher"
mkdir -p "$INSTALL_DIR"

echo "Installing to $INSTALL_DIR..."
cp server.js "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/server.js"

# Create app bundle
APP_NAME="PDF Launcher.app"
APP_DIR="$INSTALL_DIR/$APP_NAME"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"

mkdir -p "$MACOS_DIR"
cp pdf-launcher "$MACOS_DIR/pdf-launcher"
chmod +x "$MACOS_DIR/pdf-launcher"

cat > "$CONTENTS_DIR/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>pdf-launcher</string>
  <key>CFBundleIdentifier</key>
  <string>com.pdffffing.pdf-launcher</string>
  <key>CFBundleSignature</key>
  <string>PDFL</string>
  <key>CFBundleName</key>
  <string>PDF Launcher</string>
  <key>CFBundleDisplayName</key>
  <string>PDF Launcher</string>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.productivity</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeName</key>
      <string>PDF</string>
      <key>CFBundleTypeRole</key>
      <string>Editor</string>
      <key>LSHandlerRank</key>
      <string>Owner</string>
      <key>CFBundleTypeMIMETypes</key>
      <array>
        <string>application/pdf</string>
      </array>
      <key>CFBundleTypeOSTypes</key>
      <array>
        <string>PDF </string>
      </array>
      <key>LSItemContentTypes</key>
      <array>
        <string>com.adobe.pdf</string>
        <string>public.pdf</string>
      </array>
      <key>CFBundleTypeExtensions</key>
      <array>
        <string>pdf</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
EOF

# Create PkgInfo for older LaunchServices compatibility
echo -n "APPLPDFL" > "$CONTENTS_DIR/PkgInfo"

echo "✓ App bundle created"

echo "✓ Files installed"
echo ""

# Ensure the app can launch on macOS by applying an ad-hoc signature
if command -v codesign &> /dev/null; then
    echo "Signing app bundle..."
    codesign --force --deep --sign - "$APP_DIR"
    echo "✓ App bundle signed"
fi

# Remove quarantine if present
if command -v xattr &> /dev/null; then
    xattr -dr com.apple.quarantine "$APP_DIR" 2>/dev/null || true
fi

# Check if duti is installed
if ! command -v duti &> /dev/null; then
    echo "⚠ 'duti' not found. You'll need to install it to register the handler:"
    echo "   brew install duti"
    echo ""
    echo "Then run:"
    echo "   duti -x com.adobe.pdf \"$APP_DIR\""
else
    echo "Setting as default PDF handler..."
    duti -x com.adobe.pdf "$APP_DIR"
    echo "✓ Registered as default PDF handler"
fi

echo ""
echo "Installation complete!"
echo ""
echo "To test:"
echo "  1. Open a PDF file"
echo "  2. Your browser should open with the PDF loaded in the editor"
echo ""
echo "To uninstall:"
echo "  rm -rf $INSTALL_DIR"
echo "  duti -x com.adobe.pdf /Applications/Preview.app"
