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
cp pdf-launcher "$INSTALL_DIR/"
cp server.js "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/pdf-launcher"
chmod +x "$INSTALL_DIR/server.js"

echo "✓ Files installed"
echo ""

# Check if duti is installed
if ! command -v duti &> /dev/null; then
    echo "⚠ 'duti' not found. You'll need to install it to register the handler:"
    echo "   brew install duti"
    echo ""
    echo "Then run:"
    echo "   duti -x com.adobe.pdf $INSTALL_DIR/pdf-launcher"
else
    echo "Setting as default PDF handler..."
    duti -x com.adobe.pdf "$INSTALL_DIR/pdf-launcher"
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
