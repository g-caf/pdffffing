# PDF Launcher Setup (macOS)

## What This Does

Registers your PDF editor as the default PDF handler on macOS. When you double-click a PDF, it automatically opens in your browser-based editor.

## Files

- `main.swift` - macOS launcher app
- `server.js` - Local HTTP server that serves PDFs
- `setup.sh` - Installation script

## Installation

### 1. Build the Swift app

```bash
cd pdf-launcher
swiftc -o pdf-launcher main.swift
```

### 2. Install the server and launcher

```bash
# Create installation directory
mkdir -p ~/.pdf-launcher

# Copy server
cp server.js ~/.pdf-launcher/
chmod +x ~/.pdf-launcher/server.js

# Create app bundle
mkdir -p ~/.pdf-launcher/PDF\ Launcher.app/Contents/MacOS
cp pdf-launcher ~/.pdf-launcher/PDF\ Launcher.app/Contents/MacOS/pdf-launcher
chmod +x ~/.pdf-launcher/PDF\ Launcher.app/Contents/MacOS/pdf-launcher

# Create Info.plist
cat > ~/.pdf-launcher/PDF\ Launcher.app/Contents/Info.plist << 'EOF'
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
echo -n "APPLPDFL" > ~/.pdf-launcher/PDF\ Launcher.app/Contents/PkgInfo
```

### 3. Register as default PDF handler

Run this command to register your launcher as the default PDF handler:

```bash
duti -x com.adobe.pdf ~/.pdf-launcher/PDF\ Launcher.app
```

If you don't have `duti`, install it:
```bash
brew install duti
```

Alternatively, using `LaunchServices` directly:

```bash
# Find the bundle identifier (if using an app bundle)
# Or use file associations through System Preferences > General > File Types
```

### 4. Test it

Try double-clicking a PDF file. It should:
1. Launch your system's default browser
2. Navigate to `https://pdffffing.onrender.com/?pdf=http://localhost:7654/serve?file=...`
3. Automatically load the PDF

## How It Works

1. **Double-click PDF** → macOS launches `PDF Launcher.app` with the file path
2. **Launcher detects** if the local server is running; if not, starts it
3. **Browser opens** with the Render app URL + local server PDF link
4. **Web app fetches** PDF from localhost and displays it
5. **User edits** normally through the browser interface

## Troubleshooting

**PDF doesn't load:**
- Check that Node.js is installed: `which node`
- Check server logs: `cat /tmp/pdf-launcher-server-*.log`
- Verify the file path is correct

**Server won't start:**
- Check Node.js installation
- Try manually running: `node ~/.pdf-launcher/server.js`
- Check file permissions: `ls -l ~/.pdf-launcher/`

**Handler not registered:**
- Verify with: `duti -x com.adobe.pdf`
- Re-run the duti command if it shows a different handler

## Uninstall

To remove the handler and files:

```bash
# Restore default PDF handler
duti -x com.adobe.pdf /Applications/Preview.app

# Remove files
rm -rf ~/.pdf-launcher
```

## Notes

- The local server runs on `http://localhost:7654`
- PIDs are stored in `/tmp/pdf-launcher-server.pid`
- Server runs in background and persists across PDF opens
- Requires Node.js to be installed and in PATH
- Override the editor URL by setting `PDF_LAUNCHER_BASE_URL` (defaults to `https://pdffffing.onrender.com`)
