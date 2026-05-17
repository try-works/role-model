package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/mostlygeek/llama-swap/proxy"
)

type roleModelBridgeProcessOptions struct {
	RepoRoot         string
	RuntimeStateRoot string
	Host             string
	Port             int
	ScopeID          string
	FixtureRoot      string
}

func (o *roleModelBridgeProcessOptions) BaseURL() string {
	return fmt.Sprintf("http://%s:%d", o.Host, o.Port)
}

func resolveRoleModelBridgeProcessOptions() *roleModelBridgeProcessOptions {
	repoRoot := strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_REPO_ROOT"))
	runtimeStateRoot := strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_RUNTIME_STATE_ROOT"))
	if repoRoot == "" || runtimeStateRoot == "" {
		return nil
	}

	host := strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_HOST"))
	if host == "" {
		host = "127.0.0.1"
	}

	port := 8091
	if value := strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_PORT")); value != "" {
		parsed, err := strconv.Atoi(value)
		if err == nil && parsed > 0 {
			port = parsed
		}
	}

	scopeID := strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_SCOPE_ID"))
	if scopeID == "" {
		scopeID = "runtime-host-bridge"
	}

	fixtureRoot := strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_FIXTURE_ROOT"))

	return &roleModelBridgeProcessOptions{
		RepoRoot:         repoRoot,
		RuntimeStateRoot: runtimeStateRoot,
		Host:             host,
		Port:             port,
		ScopeID:          scopeID,
		FixtureRoot:      fixtureRoot,
	}
}

func buildRoleModelBridgeCommand(options *roleModelBridgeProcessOptions) *exec.Cmd {
	args := []string{
		"--dir",
		options.RepoRoot,
		"--filter",
		"@role-model-router/runtime-host-bridge",
		"exec",
		"tsx",
		"src/cli-entry.ts",
		"--host",
		options.Host,
		"--port",
		strconv.Itoa(options.Port),
		"--repo-root",
		options.RepoRoot,
		"--runtime-state-root",
		options.RuntimeStateRoot,
		"--scope-id",
		options.ScopeID,
	}
	if options.FixtureRoot != "" {
		args = append(args, "--fixture-root", options.FixtureRoot)
	}
	allArgs := append([]string{"pnpm"}, args...)
	return exec.Command("corepack", allArgs...)
}

type roleModelBridgeProcess struct {
	options *roleModelBridgeProcessOptions
	cmd     *exec.Cmd
}

func stopRoleModelBridgeProcess(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	if err := cmd.Process.Kill(); err != nil && !strings.Contains(strings.ToLower(err.Error()), "finished") {
		return err
	}
	if err := cmd.Wait(); err != nil {
		if _, ok := err.(*exec.ExitError); !ok {
			return err
		}
	}
	return nil
}

func waitForRoleModelBridge(baseURL string, timeout time.Duration) error {
	client := &http.Client{
		Timeout: 2 * time.Second,
	}
	deadline := time.Now().Add(timeout)
	healthURL := fmt.Sprintf("%s/healthz", strings.TrimRight(baseURL, "/"))

	for time.Now().Before(deadline) {
		resp, err := client.Get(healthURL)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(200 * time.Millisecond)
	}

	return fmt.Errorf("role-model bridge did not become healthy at %s within %s", healthURL, timeout)
}

func startRoleModelBridgeProcess(
	logger *proxy.LogMonitor,
	options *roleModelBridgeProcessOptions,
) (*roleModelBridgeProcess, error) {
	cmd := buildRoleModelBridgeCommand(options)
	cmd.Stdout = logger
	cmd.Stderr = logger

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start role-model bridge: %w", err)
	}

	if err := waitForRoleModelBridge(options.BaseURL(), 30*time.Second); err != nil {
		_ = stopRoleModelBridgeProcess(cmd)
		return nil, err
	}

	return &roleModelBridgeProcess{
		options: options,
		cmd:     cmd,
	}, nil
}

func (p *roleModelBridgeProcess) Shutdown() error {
	if p == nil || p.cmd == nil || p.cmd.Process == nil {
		return nil
	}
	return stopRoleModelBridgeProcess(p.cmd)
}
