package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestBuildRuntimeArgsUsesStandalonePaths(t *testing.T) {
	packageDir := filepath.Join("C:", "RoleModel")
	runtimeStateRoot := filepath.Join("C:", "Users", "tester", "AppData", "Local", "Role Model", "runtime")

	got := buildRuntimeArgs(packageDir, runtimeStateRoot)
	want := []string{
		"--repo-root", packageDir,
		"--runtime-state-root", runtimeStateRoot,
		"--scope-id", "standalone-runtime",
		"--host", runtimeHost,
		"--port", "3456",
		"--static-root", filepath.Join(packageDir, "build", "client"),
	}

	if len(got) != len(want) {
		t.Fatalf("expected %d args, got %d: %v", len(want), len(got), got)
	}

	for index := range want {
		if got[index] != want[index] {
			t.Fatalf("arg %d mismatch: expected %q, got %q", index, want[index], got[index])
		}
	}
}

func TestBuildRuntimeArgsUsesAncestorWorkspaceRootWhenPackageLivesInsideRepo(t *testing.T) {
	tempRoot := t.TempDir()
	workspaceRoot := filepath.Join(tempRoot, "workspace")
	packageDir := filepath.Join(workspaceRoot, "role-model-router", "dist", "release", "win32-x64")
	runtimeStateRoot := filepath.Join(tempRoot, "runtime-state")

	if err := os.MkdirAll(packageDir, 0o755); err != nil {
		t.Fatalf("mkdir package dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(workspaceRoot, "pnpm-workspace.yaml"), []byte("packages:\n"), 0o644); err != nil {
		t.Fatalf("write workspace marker: %v", err)
	}

	got := buildRuntimeArgs(packageDir, runtimeStateRoot)
	if got[1] != workspaceRoot {
		t.Fatalf("expected repo-root %q, got %q", workspaceRoot, got[1])
	}
}

func TestBuildChromiumAppArgsUsesAppModeWithoutDedicatedProfile(t *testing.T) {
	baseURL := "http://127.0.0.1:3456"

	got := buildChromiumAppArgs(baseURL)

	if len(got) != 1 {
		t.Fatalf("expected a single app argument, got %v", got)
	}
	if got[0] != "--app="+baseURL {
		t.Fatalf("expected app argument for %s, got %q", baseURL, got[0])
	}
	for _, argument := range got {
		if strings.HasPrefix(argument, "--user-data-dir=") {
			t.Fatalf("expected packaged launcher arguments to avoid dedicated profile handoff, got %q", argument)
		}
	}
}

func TestBuildRuntimeFrontendURLAddsLaunchCacheBuster(t *testing.T) {
	got := buildRuntimeFrontendURL("http://127.0.0.1:3456/", "launch 1")
	want := "http://127.0.0.1:3456/app?rm_launch=launch+1"

	if got != want {
		t.Fatalf("expected cache-busted frontend URL %q, got %q", want, got)
	}
}

func TestBuildWindowsFrontendHandoffCommandUsesRun59ShellStartShape(t *testing.T) {
	command := buildWindowsFrontendHandoffCommand("msedge", "http://127.0.0.1:3456/app")

	want := []string{"cmd", "/c", "start", "msedge", "--app=http://127.0.0.1:3456/app"}
	if len(command.Args) != len(want) {
		t.Fatalf("expected windows shell handoff args %v, got %v", want, command.Args)
	}
	for index := range want {
		if command.Args[index] != want[index] {
			t.Fatalf("arg %d mismatch: expected %q, got %q; all args: %v", index, want[index], command.Args[index], command.Args)
		}
	}
	joined := strings.Join(command.Args, " ")
	for _, forbidden := range []string{
		"powershell",
		"ShellExecute",
		"--user-data-dir=",
		"--new-window",
		`""`,
	} {
		if strings.Contains(joined, forbidden) {
			t.Fatalf("expected windows shell handoff command to avoid %q, got %q", forbidden, joined)
		}
	}
}

func TestRequestBackendShutdownUsesLocalRuntimeEndpoint(t *testing.T) {
	var method string
	var path string

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		method = request.Method
		path = request.URL.Path
		writer.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	if err := requestBackendShutdown(server.URL); err != nil {
		t.Fatalf("expected shutdown request to succeed: %v", err)
	}

	if method != http.MethodPost {
		t.Fatalf("expected POST shutdown request, got %s", method)
	}

	if path != "/api/role-model/runtime/shutdown" {
		t.Fatalf("expected shutdown path, got %s", path)
	}
}

func TestWaitForServerReadyReturnsWhenLivenessEndpointBecomesReady(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/health" {
			http.NotFound(writer, request)
			return
		}
		writer.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	if !waitForServerReady(server.URL, 2, 5*time.Millisecond) {
		t.Fatal("expected ready server")
	}
}

func TestWaitForServerReadyReturnsFalseWhenHealthEndpointNeverResponds(t *testing.T) {
	start := time.Now()
	if waitForServerReady("http://127.0.0.1:1", 2, 20*time.Millisecond) {
		t.Fatal("expected waitForServerReady to report failure for an unreachable endpoint")
	}
	if time.Since(start) < 40*time.Millisecond {
		t.Fatalf("expected retry loop to wait across attempts, took %s", time.Since(start))
	}
}
