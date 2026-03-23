PDF Launcher (macOS)

What this does:
- Lets you set the PDF editor as the default app for PDFs.
- Double-clicking a PDF opens it in your browser-based editor.

Install:
1) Unzip the package
2) Run: ./install.sh
3) (Optional) Set as default PDF handler:
   brew install duti
   duti -x com.adobe.pdf "$HOME/.pdf-launcher/PDF Launcher.app"

Notes:
- Requires Node.js to be installed (brew install node)
- You can uninstall by deleting: ~/.pdf-launcher
