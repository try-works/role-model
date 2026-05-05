package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestResolveRoleModelBridgeProcessOptions_Defaults(t *testing.T) {
	t.Setenv("ROLE_MODEL_BRIDGE_REPO_ROOT", `D:\repo`)
	t.Setenv("ROLE_MODEL_BRIDGE_RUNTIME_STATE_ROOT", `D:\runtime-state`)
	t.Setenv("ROLE_MODEL_BRIDGE_HOST", "")
	t.Setenv("ROLE_MODEL_BRIDGE_PORT", "")
	t.Setenv("ROLE_MODEL_BRIDGE_SCOPE_ID", "")

	options := resolveRoleModelBridgeProcessOptions()
	if options == nil {
		t.Fatal("expected role-model bridge options to be resolved")
	}
	if options.Host != "127.0.0.1" {
		t.Fatalf("expected default host 127.0.0.1, got %q", options.Host)
	}
	if options.Port != 8091 {
		t.Fatalf("expected default port 8091, got %d", options.Port)
	}
	if options.ScopeID != "runtime-host-bridge" {
		t.Fatalf("expected default scope id runtime-host-bridge, got %q", options.ScopeID)
	}
	if options.BaseURL() != "http://127.0.0.1:8091" {
		t.Fatalf("unexpected base URL %q", options.BaseURL())
	}
}

func TestBuildRoleModelBridgeCommand_UsesWorkspaceCli(t *testing.T) {
	options := &roleModelBridgeProcessOptions{
		RepoRoot:         `D:\repo`,
		RuntimeStateRoot: `D:\runtime-state`,
		Host:             "127.0.0.1",
		Port:             9191,
		ScopeID:          "run10-validation",
	}

	cmd := buildRoleModelBridgeCommand(options)
	if !strings.HasPrefix(strings.ToLower(filepath.Base(cmd.Path)), "corepack") {
		t.Fatalf("expected corepack executable, got %q", cmd.Path)
	}

	expectedArgs := []string{
		"corepack",
		"pnpm",
		"--dir",
		`D:\repo`,
		"--filter",
		"@role-model-router/runtime-host-bridge",
		"exec",
		"tsx",
		"src/cli.ts",
		"--host",
		"127.0.0.1",
		"--port",
		"9191",
		"--repo-root",
		`D:\repo`,
		"--runtime-state-root",
		`D:\runtime-state`,
		"--scope-id",
		"run10-validation",
	}

	if len(cmd.Args) != len(expectedArgs) {
		t.Fatalf("expected %d args, got %d: %#v", len(expectedArgs), len(cmd.Args), cmd.Args)
	}
	for index, arg := range expectedArgs {
		if cmd.Args[index] != arg {
			t.Fatalf("arg %d: expected %q, got %q", index, arg, cmd.Args[index])
		}
	}
}

func TestKillRoleModelBridgeProcess_ReapsProcess(t *testing.T) {
	cmd := execHelperCommandForBridgeProcessTest(t)
	if err := cmd.Start(); err != nil {
		t.Fatalf("expected helper process to start: %v", err)
	}
	if cmd.Process == nil {
		t.Fatal("expected helper process handle")
	}

	if err := stopRoleModelBridgeProcess(cmd); err != nil {
		t.Fatalf("expected helper process to be stopped and reaped: %v", err)
	}
	if cmd.ProcessState == nil {
		t.Fatal("expected process state to be recorded after stop")
	}
	if !cmd.ProcessState.Exited() {
		t.Fatal("expected helper process to be fully reaped")
	}
}

func TestRoleModelBridgeProcessHelper(t *testing.T) {
	if os.Getenv("GO_WANT_ROLE_MODEL_BRIDGE_HELPER") != "1" {
		return
	}

	time.Sleep(30 * time.Second)
	os.Exit(0)
}

func execHelperCommandForBridgeProcessTest(t *testing.T) *exec.Cmd {
	t.Helper()

	cmd := exec.Command(os.Args[0], "-test.run=TestRoleModelBridgeProcessHelper")
	cmd.Env = append(os.Environ(), "GO_WANT_ROLE_MODEL_BRIDGE_HELPER=1")
	return cmd
}
