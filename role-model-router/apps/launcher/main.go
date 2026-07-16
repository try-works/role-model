package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
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

func looksLikeWorkspaceRoot(directory string) bool {
	markers := []string{
		".git",
		".agents",
		"pnpm-workspace.yaml",
		"package.json",
		"pyproject.toml",
	}

	for _, marker := range markers {
		if _, err := os.Stat(filepath.Join(directory, marker)); err == nil {
			return true
		}
	}

	return false
}

func resolveWorkspaceRootFromAncestors(packageDir string) string {
	current := filepath.Clean(packageDir)
	for {
		if looksLikeWorkspaceRoot(current) {
			return current
		}
		parent := filepath.Dir(current)
		if parent == current {
			return packageDir
		}
		current = parent
	}
}

func resolveStandaloneWorkspaceRoot(packageDir string) string {
	if override := strings.TrimSpace(os.Getenv("ROLE_MODEL_WORKSPACE_ROOT")); override != "" {
		if info, err := os.Stat(override); err == nil && info.IsDir() {
			return filepath.Clean(override)
		}
	}

	discovered := resolveWorkspaceRootFromAncestors(packageDir)
	if discovered != filepath.Clean(packageDir) {
		return discovered
	}

	if cwd, err := os.Getwd(); err == nil && cwd != "" && looksLikeWorkspaceRoot(cwd) {
		return filepath.Clean(cwd)
	}

	return filepath.Clean(packageDir)
}

func buildRuntimeArgs(packageDir string, runtimeStateRoot string) []string {
	workspaceRoot := resolveStandaloneWorkspaceRoot(packageDir)
	unifiedRuntimeConfigPath := filepath.Join(runtimeStateRoot, "state", "runtime-config.yaml")
	return []string{
		"--repo-root", workspaceRoot,
		"--runtime-state-root", runtimeStateRoot,
		"--scope-id", "standalone-runtime",
		"--unified-runtime-config", unifiedRuntimeConfigPath,
		"--host", runtimeHost,
		"--port", fmt.Sprintf("%d", runtimePort),
		"--static-root", filepath.Join(packageDir, "build", "client"),
	}
}

func buildRuntimeBaseURL(host string, port int) string {
	return fmt.Sprintf("http://%s:%d", host, port)
}

func buildRuntimeFrontendURL(baseURL string, launchToken string) string {
	frontendURL := strings.TrimRight(baseURL, "/") + "/app"
	launchToken = strings.TrimSpace(launchToken)
	if launchToken == "" {
		return frontendURL
	}

	return frontendURL + "?rm_launch=" + url.QueryEscape(launchToken)
}

func runtimeShutdownURL(baseURL string) string {
	return strings.TrimRight(baseURL, "/") + "/api/role-model/runtime/shutdown"
}

func waitForServerReady(baseURL string, attempts int, interval time.Duration) bool {
	healthURL := strings.TrimRight(baseURL, "/") + "/health"
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

func buildChromiumAppArgs(baseURL string) []string {
	return []string{
		"--app=" + baseURL,
	}
}

type windowsBrowserLaunchTarget struct {
	token      string
	candidates []string
}

func windowsBrowserLaunchTargets() []windowsBrowserLaunchTarget {
	return []windowsBrowserLaunchTarget{
		{
			token: "msedge",
			candidates: []string{
				filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
				filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
				filepath.Join(os.Getenv("LOCALAPPDATA"), "Microsoft", "Edge", "Application", "msedge.exe"),
				"msedge",
				"msedge.exe",
			},
		},
		{
			token: "chrome",
			candidates: []string{
				filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
				filepath.Join(os.Getenv("ProgramFiles(x86)"), "Google", "Chrome", "Application", "chrome.exe"),
				filepath.Join(os.Getenv("LOCALAPPDATA"), "Google", "Chrome", "Application", "chrome.exe"),
				"chrome",
				"chrome.exe",
			},
		},
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
		return "", fmt.Errorf("windows uses shell handoff browser tokens")
	case "darwin":
		return resolveExecutable(darwinBrowserCandidates())
	default:
		return resolveExecutable(linuxBrowserCandidates())
	}
}

func resolveWindowsBrowserLaunchToken() (string, error) {
	for _, target := range windowsBrowserLaunchTargets() {
		for _, candidate := range target.candidates {
			if candidate == "" {
				continue
			}
			if filepath.IsAbs(candidate) {
				if _, err := os.Stat(candidate); err == nil {
					return target.token, nil
				}
				continue
			}
			if _, err := exec.LookPath(candidate); err == nil {
				return target.token, nil
			}
		}
	}

	return "", fmt.Errorf("no supported Windows browser launch token found")
}

func buildWindowsFrontendHandoffCommand(browserToken string, baseURL string) *exec.Cmd {
	return exec.Command("cmd", "/c", "start", browserToken, strings.Join(buildChromiumAppArgs(baseURL), " "))
}

func buildFrontendCommand(baseURL string) (*exec.Cmd, bool, error) {
	if runtime.GOOS == "windows" {
		browserToken, err := resolveWindowsBrowserLaunchToken()
		if err != nil {
			return nil, false, err
		}
		return buildWindowsFrontendHandoffCommand(browserToken, baseURL), true, nil
	}

	browserExecutable, err := resolveBrowserExecutable()
	if err != nil {
		return nil, false, err
	}
	command := exec.Command(browserExecutable, buildChromiumAppArgs(baseURL)...)
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr

	return command, false, nil
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

	frontendURL := buildRuntimeFrontendURL(baseURL, fmt.Sprintf("%d", time.Now().UnixNano()))
	fmt.Printf("Server ready at %s\n", baseURL)
	fmt.Println("Opening frontend...")

	frontendCmd, detachedFrontend, err := buildFrontendCommand(frontendURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to prepare frontend window: %v\n", err)
		requestBackendShutdownOrKill(baseURL, backendCmd)
		if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
			fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
		}
		return 1
	}

	if detachedFrontend {
		if err := frontendCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to open frontend: %v\n", err)
			requestBackendShutdownOrKill(baseURL, backendCmd)
			if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
				fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
			}
			return 1
		}

		fmt.Println("Role Model is running. Close this window or press Ctrl+C to stop.")

		select {
		case signalValue := <-signalChannel:
			fmt.Printf("Received %s. Shutting down runtime...\n", signalValue)
			requestBackendShutdownOrKill(baseURL, backendCmd)
			if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
				fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
			}
			return 0
		case backendErr := <-backendResultCh:
			if backendErr != nil {
				fmt.Fprintf(os.Stderr, "Bridge exited with error: %v\n", backendErr)
				return 1
			}
			return 0
		}
	}

	if err := frontendCmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open frontend: %v\n", err)
		requestBackendShutdownOrKill(baseURL, backendCmd)
		if backendErr := waitForExitOrKill(backendCmd, backendResultCh, shutdownWaitTimeout); backendErr != nil {
			fmt.Fprintf(os.Stderr, "Backend exited during shutdown: %v\n", backendErr)
		}
		return 1
	}

	fmt.Println("Role Model is running. Close this window or press Ctrl+C to stop.")

	frontendResultCh := make(chan error, 1)
	go func() {
		frontendResultCh <- frontendCmd.Wait()
	}()

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
