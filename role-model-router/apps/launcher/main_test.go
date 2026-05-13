package main

import (
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
		"--host", "127.0.0.1",
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
