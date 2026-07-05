package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

const (
	runtimeHost           = "127.0.0.1"
	runtimePort           = 3456
	serverStartupAttempts = 30
	serverStartupInterval = 1 * time.Second
	shutdownWaitTimeout   = 10 * time.Second
	frontendShutdownWait  = 5 * time.Second
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
		"--host", runtimeHost,
		"--port", fmt.Sprintf("%d", runtimePort),
		"--static-root", filepath.Join(packageDir, "build", "client"),
	}
}

func buildRuntimeBaseURL(host string, port int) string {
	return fmt.Sprintf("http://%s:%d", host, port)
}

func runtimeShutdownURL(baseURL string) string {
	return strings.TrimRight(baseURL, "/") + "/api/role-model/runtime/shutdown"
}

func waitForServerReady(baseURL string, attempts int, interval time.Duration) bool {
	healthURL := strings.TrimRight(baseURL, "/") + "/healthz"
	for attempt := 0; attempt < attempts; attempt++ {
		time.Sleep(interval)
		resp, err := http.Get(healthURL)
		if err != nil {
			continue
		}

		resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			return true
		}
	}

	return false
}

func requestBackendShutdown(baseURL string) error {
	request, err := http.NewRequest(http.MethodPost, runtimeShutdownURL(baseURL), nil)
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 5 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusAccepted && response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 1024))
		return fmt.Errorf("unexpected shutdown status %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}

	return nil
}

func requestBackendShutdownOrKill(baseURL string, backendCmd *exec.Cmd) {
	if backendCmd == nil || backendCmd.Process == nil {
		return
	}

	if err := requestBackendShutdown(baseURL); err == nil {
		return
	} else {
		fmt.Fprintf(os.Stderr, "Failed to request graceful backend shutdown: %v\n", err)
	}

	_ = backendCmd.Process.Kill()
}

func waitForExitOrKill(cmd *exec.Cmd, resultCh <-chan error, timeout time.Duration) error {
	select {
	case err := <-resultCh:
		return err
	case <-time.After(timeout):
		if cmd != nil && cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		return <-resultCh
	}
}

func buildChromiumAppArgs(baseURL string, profileDir string) []string {
	return []string{
		"--app=" + baseURL,
		"--new-window",
		"--user-data-dir=" + profileDir,
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-sync",
	}
}

func windowsBrowserCandidates() []string {
	return []string{
		"msedge.exe",
		"msedge",
		"chrome.exe",
		"chrome",
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("LOCALAPPDATA"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("LOCALAPPDATA"), "Google", "Chrome", "Application", "chrome.exe"),
	}
}

func darwinBrowserCandidates() []string {
	return []string{
		"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		"microsoft-edge",
		"google-chrome",
		"chromium",
	}
}

func linuxBrowserCandidates() []string {
	return []string{
		"microsoft-edge",
		"google-chrome",
		"chromium",
		"chromium-browser",
	}
}

func resolveExecutable(candidates []string) (string, error) {
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}

		if filepath.IsAbs(candidate) {
			if _, err := os.Stat(candidate); err == nil {
				return candidate, nil
			}
			continue
		}

		if resolved, err := exec.LookPath(candidate); err == nil {
			return resolved, nil
		}
	}

	return "", fmt.Errorf("no supported browser executable found")
}

func resolveBrowserExecutable() (string, error) {
	switch runtime.GOOS {
	case "windows":
		return resolveExecutable(windowsBrowserCandidates())
	case "darwin":
		return resolveExecutable(darwinBrowserCandidates())
	default:
		return resolveExecutable(linuxBrowserCandidates())
	}
}

func buildFrontendCommand(baseURL string, runtimeStateRoot string) (*exec.Cmd, string, error) {
	browserExecutable, err := resolveBrowserExecutable()
	if err != nil {
		return nil, "", err
	}

	profileDir, err := os.MkdirTemp(runtimeStateRoot, "frontend-profile-")
	if err != nil {
		return nil, "", err
	}

	command := exec.Command(browserExecutable, buildChromiumAppArgs(baseURL, profileDir)...)
	command.Dir = runtimeStateRoot
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr

	return command, profileDir, nil
}

func terminateProcess(process *os.Process) {
	if process == nil {
		return
	}

	_ = process.Kill()
}

func run() int {
	executablePath, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get executable path: %v\n", err)
		return 1
	}

	exeDir := filepath.Dir(executablePath)

	var bridgeBinary string
	if runtime.GOOS == "windows" {
		bridgeBinary = filepath.Join(exeDir, "role-model-runtime.exe")
	} else {
		bridgeBinary = filepath.Join(exeDir, "role-model-runtime")
	}

	runtimeStateRoot := resolveRuntimeStateRoot(exeDir)
	if err := os.MkdirAll(runtimeStateRoot, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create runtime state directory: %v\n", err)
		return 1
	}

	if _, err := os.Stat(bridgeBinary); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Bridge binary not found: %s\n", bridgeBinary)
		return 1
	}

	baseURL := buildRuntimeBaseURL(runtimeHost, runtimePort)

	fmt.Println("Starting Role Model Runtime...")
	backendCmd := exec.Command(bridgeBinary, buildRuntimeArgs(exeDir, runtimeStateRoot)...)
	backendCmd.Stdout = os.Stdout
	backendCmd.Stderr = os.Stderr
	backendCmd.Dir = exeDir

	if err := backendCmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start bridge: %v\n", err)
		return 1
	}

	backendResultCh := make(chan error, 1)
	go func() {
		backendResultCh <- backendCmd.Wait()
	}()

	signalChannel := make(chan os.Signal, 1)
	signal.Notify(signalChannel, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(signalChannel)

	fmt.Println("Waiting for server to be ready...")
	if !waitForServerReady(baseURL, serverStartupAttempts, serverStartupInterval) {
		fmt.Fprintf(os.Stderr, "Server failed to start within %d seconds\n", serverStartupAttempts)
		terminateProcess(backendCmd.Process)
		_ = waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout)
		return 1
	}

	fmt.Printf("Server ready at %s\n", baseURL)
	fmt.Println("Opening frontend...")

	frontendCmd, frontendProfileDir, err := buildFrontendCommand(baseURL, runtimeStateRoot)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to prepare frontend window: %v\n", err)
		requestBackendShutdownOrKill(baseURL, backendCmd)
		if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
			fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
		}
		return 1
	}
	defer os.RemoveAll(frontendProfileDir)

	if err := frontendCmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open frontend: %v\n", err)
		requestBackendShutdownOrKill(baseURL, backendCmd)
		if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
			fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
		}
		return 1
	}

	frontendResultCh := make(chan error, 1)
	go func() {
		frontendResultCh <- frontendCmd.Wait()
	}()

	fmt.Println("Role Model is running. Close the app window or press Ctrl+C to stop.")

	select {
	case frontendErr := <-frontendResultCh:
		if frontendErr != nil {
			fmt.Fprintf(os.Stderr, "Frontend exited with error: %v\n", frontendErr)
		} else {
			fmt.Println("Frontend closed. Shutting down backend...")
		}

		requestBackendShutdownOrKill(baseURL, backendCmd)
		if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
			fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
		}
		return 0

	case signalValue := <-signalChannel:
		fmt.Printf("Received %s. Shutting down runtime...\n", signalValue)
		terminateProcess(frontendCmd.Process)
		_ = waitForExitOrKill(frontendCmd, frontendResultCh, frontendShutdownWait)
		requestBackendShutdownOrKill(baseURL, backendCmd)
		if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
			fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
		}
		return 0

	case backendErr := <-backendResultCh:
		terminateProcess(frontendCmd.Process)
		_ = waitForExitOrKill(frontendCmd, frontendResultCh, frontendShutdownWait)
		if backendErr != nil {
			fmt.Fprintf(os.Stderr, "Bridge exited with error: %v\n", backendErr)
			return 1
		}
		return 0
	}
}

func main() {
	os.Exit(run())
}
