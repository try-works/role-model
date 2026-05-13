package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"
)

func resolveRuntimeStateRoot(packageDir string) string {
	cacheDir, err := os.UserCacheDir()
	if err == nil && cacheDir != "" {
		return filepath.Join(cacheDir, "Role Model Runtime")
	}

	return filepath.Join(packageDir, "runtime-state")
}

func buildRuntimeArgs(packageDir string, runtimeStateRoot string) []string {
	return []string{
		"--repo-root", packageDir,
		"--runtime-state-root", runtimeStateRoot,
		"--scope-id", "standalone-runtime",
		"--host", "127.0.0.1",
		"--port", "3456",
		"--static-root", filepath.Join(packageDir, "build", "client"),
	}
}

func main() {
	// Determine the directory where the launcher executable is located
	ex, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get executable path: %v\n", err)
		os.Exit(1)
	}
	exeDir := filepath.Dir(ex)

	// Path to the bridge SEA binary
	var bridgeBinary string
	if runtime.GOOS == "windows" {
		bridgeBinary = filepath.Join(exeDir, "role-model-runtime.exe")
	} else {
		bridgeBinary = filepath.Join(exeDir, "role-model-runtime")
	}

	// Path to the UI static files
	runtimeStateRoot := resolveRuntimeStateRoot(exeDir)
	if err := os.MkdirAll(runtimeStateRoot, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create runtime state directory: %v\n", err)
		os.Exit(1)
	}

	// Check if bridge binary exists
	if _, err := os.Stat(bridgeBinary); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Bridge binary not found: %s\n", bridgeBinary)
		os.Exit(1)
	}

	// Start the bridge server
	fmt.Println("Starting Role Model Runtime...")
	cmd := exec.Command(bridgeBinary, buildRuntimeArgs(exeDir, runtimeStateRoot)...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = exeDir

	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start bridge: %v\n", err)
		os.Exit(1)
	}

	signalChannel := make(chan os.Signal, 1)
	signal.Notify(signalChannel, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-signalChannel
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		os.Exit(0)
	}()

	// Wait for the server to be ready
	fmt.Println("Waiting for server to be ready...")
	ready := false
	for i := 0; i < 30; i++ {
		time.Sleep(1 * time.Second)
		resp, err := http.Get("http://127.0.0.1:3456/healthz")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				ready = true
				break
			}
		}
	}

	if !ready {
		fmt.Fprintf(os.Stderr, "Server failed to start within 30 seconds\n")
		cmd.Process.Kill()
		os.Exit(1)
	}

	fmt.Println("Server ready at http://127.0.0.1:3456")

	// Open the browser in app mode
	fmt.Println("Opening browser...")
	var browserCmd *exec.Cmd
	if runtime.GOOS == "windows" {
		// Use Edge in app mode for a dedicated window without browser chrome
		browserCmd = exec.Command("cmd", "/c", "start", "msedge", "--app=http://127.0.0.1:3456")
	} else if runtime.GOOS == "darwin" {
		browserCmd = exec.Command("open", "http://127.0.0.1:3456")
	} else {
		browserCmd = exec.Command("xdg-open", "http://127.0.0.1:3456")
	}

	if err := browserCmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open browser: %v\n", err)
		// Continue anyway - user can open browser manually
	}

	fmt.Println("Role Model is running. Press Ctrl+C to stop.")

	// Wait for the bridge process to exit
	if err := cmd.Wait(); err != nil {
		fmt.Fprintf(os.Stderr, "Bridge exited with error: %v\n", err)
		os.Exit(1)
	}
}
