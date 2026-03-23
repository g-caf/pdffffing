import Cocoa

class AppDelegate: NSObject, NSApplicationDelegate {
    private let fileManager = FileManager.default
    private var didHandleOpen = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        let args = CommandLine.arguments
        if args.count > 1 {
            handleOpenFiles(paths: Array(args.dropFirst()))
            return
        }

        // If launched without a file (e.g., user clicked the app),
        // give Finder a moment to deliver open-file events, then exit.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            guard let self = self else { return }
            if !self.didHandleOpen {
                NSApp.terminate(nil)
            }
        }
    }

    func application(_ application: NSApplication, openFile filename: String) -> Bool {
        handleOpenFiles(paths: [filename])
        return true
    }

    func application(_ application: NSApplication, openFiles filenames: [String]) {
        handleOpenFiles(paths: filenames)
        NSApp.reply(toOpenOrPrint: .success)
    }

    private func handleOpenFiles(paths: [String]) {
        guard !paths.isEmpty else {
            return
        }

        didHandleOpen = true

        // Start the local server (or verify it's running)
        startLocalServer()
        waitForServerReady()

        for pdfPath in paths {
            guard fileManager.fileExists(atPath: pdfPath) else {
                print("Error: File not found at \(pdfPath)")
                continue
            }

            guard let targetURL = makeTargetURL(for: pdfPath) else {
                print("Error: Could not construct URL")
                continue
            }

            _ = NSWorkspace.shared.open(targetURL)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            NSApp.terminate(nil)
        }
    }

    private func makeTargetURL(for pdfPath: String) -> URL? {
        let baseURL = ProcessInfo.processInfo.environment["PDF_LAUNCHER_BASE_URL"] ?? "http://localhost:7654"
        let trimmedBase = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedBase = trimmedBase.hasSuffix("/") ? String(trimmedBase.dropLast()) : trimmedBase

        guard var editorComponents = URLComponents(string: normalizedBase) else {
            return nil
        }

        var serveComponents = URLComponents()
        serveComponents.scheme = "http"
        serveComponents.host = "localhost"
        serveComponents.port = 7654
        serveComponents.path = "/serve"
        serveComponents.queryItems = [URLQueryItem(name: "file", value: pdfPath)]

        guard let serveURL = serveComponents.url else {
            return nil
        }

        editorComponents.queryItems = [URLQueryItem(name: "pdf", value: serveURL.absoluteString)]
        return editorComponents.url
    }
    
    // MARK: - Local Server Functions
    
    private func startLocalServer() {
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
    
    private func getServerScriptPath() -> String {
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

    private func waitForServerReady() {
        guard let healthURL = URL(string: "http://localhost:7654/health") else {
            return
        }

        let semaphore = DispatchSemaphore(value: 0)
        let maxAttempts = 10
        let delay: UInt32 = 300_000 // 300ms

        for _ in 0..<maxAttempts {
            let task = URLSession.shared.dataTask(with: healthURL) { _, response, _ in
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    semaphore.signal()
                }
            }
            task.resume()

            if semaphore.wait(timeout: .now() + .milliseconds(350)) == .success {
                return
            }

            usleep(delay)
        }
    }
}

// Explicit NSApplicationMain entry point for LaunchServices compatibility.
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
_ = NSApplicationMain(CommandLine.argc, CommandLine.unsafeArgv)
