import Foundation
import AppKit

let fileManager = FileManager.default
let appDelegate = NSApplication.shared.delegate as? NSObject

// Get the PDF file path from command line arguments
guard CommandLine.arguments.count > 1 else {
    print("Usage: pdf-launcher <path-to-pdf>")
    exit(1)
}

let pdfPath = CommandLine.arguments[1]

// Verify file exists
guard fileManager.fileExists(atPath: pdfPath) else {
    print("Error: File not found at \(pdfPath)")
    exit(1)
}

let pdfURL = URL(fileURLWithPath: pdfPath)
let fileName = pdfURL.lastPathComponent

// Start the local server (or verify it's running)
startLocalServer()

// Wait a moment for server to start
usleep(500000) // 500ms

// Encode the file path for URL
let encodedPath = pdfPath.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""

// Construct the target URL
let targetURL = "https://pdffffing.onrender.com/?pdf=http://localhost:7654/serve?file=\(encodedPath)"

// Open in default browser
if let url = URL(string: targetURL) {
    NSWorkspace.shared.open(url)
} else {
    print("Error: Could not construct URL")
    exit(1)
}

// MARK: - Local Server Functions

func startLocalServer() {
    let serverRunningFile = "/tmp/pdf-launcher-server.pid"
    
    // Check if server is already running
    if fileManager.fileExists(atPath: serverRunningFile) {
        if let pidString = try? String(contentsOfFile: serverRunningFile),
           let pid = Int32(pidString.trimmingCharacters(in: .whitespacesAndNewlines)) {
            if kill(pid, 0) == 0 {
                // Server is already running
                return
            }
        }
    }
    
    // Start the server in background
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = ["node", getServerScriptPath()]
    
    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError = pipe
    
    do {
        try process.run()
        // Save PID
        try String(process.processIdentifier).write(toFile: serverRunningFile, atomically: true, encoding: .utf8)
    } catch {
        print("Error starting server: \(error)")
    }
}

func getServerScriptPath() -> String {
    // Check common installation locations
    let possiblePaths = [
        "\(fileManager.homeDirectoryForCurrentUser.path)/.pdf-launcher/server.js",
        "/usr/local/bin/pdf-launcher-server.js",
        "/opt/pdf-launcher/server.js"
    ]
    
    for path in possiblePaths {
        if fileManager.fileExists(atPath: path) {
            return path
        }
    }
    
    // Fallback - assume it's in the same directory as the executable
    let exePath = CommandLine.arguments[0]
    let exeDir = (exePath as NSString).deletingLastPathComponent
    return "\(exeDir)/server.js"
}
