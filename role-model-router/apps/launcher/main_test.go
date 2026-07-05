package main

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
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

func TestBuildChromiumAppArgsUsesDedicatedProfile(t *testing.T) {
	baseURL := "http://127.0.0.1:3456"
	profileDir := filepath.Join("C:", "Users", "tester", "AppData", "Local", "Role Model", "profile")

	got := buildChromiumAppArgs(baseURL, profileDir)

	if got[0] != "--app="+baseURL {
		t.Fatalf("expected app argument for %s, got %q", baseURL, got[0])
	}

	if got[2] != "--user-data-dir="+profileDir {
		t.Fatalf("expected dedicated profile dir %q, got %q", profileDir, got[2])
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
