package proxy

import (
	"embed"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"runtime"
)

const (
	reactBuiltDir    = "ui_dist"
	reactFallbackDir = "ui_stub"
)

//go:embed ui_stub
var reactStaticFS embed.FS

func findReactBuiltDir() (string, bool) {
	candidates := make([]string, 0, 3)
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(cwd, "proxy", reactBuiltDir),
			filepath.Join(cwd, reactBuiltDir),
		)
	}
	if _, sourceFile, _, ok := runtime.Caller(0); ok {
		candidates = append(candidates, filepath.Join(filepath.Dir(sourceFile), reactBuiltDir))
	}

	seen := make(map[string]struct{}, len(candidates))
	for _, candidate := range candidates {
		if _, alreadySeen := seen[candidate]; alreadySeen {
			continue
		}
		seen[candidate] = struct{}{}

		info, err := os.Stat(candidate)
		if err == nil && info.IsDir() {
			return candidate, true
		}
	}

	return "", false
}

func readReactStaticFile(name string) ([]byte, error) {
	if builtDir, ok := findReactBuiltDir(); ok {
		return os.ReadFile(filepath.Join(builtDir, filepath.FromSlash(name)))
	}

	return reactStaticFS.ReadFile(path.Join(reactFallbackDir, name))
}

// GetReactFS returns the React filesystem, preferring built upstream UI assets when available.
func GetReactFS() (http.FileSystem, error) {
	if builtDir, ok := findReactBuiltDir(); ok {
		return http.FS(os.DirFS(builtDir)), nil
	}

	subFS, err := fs.Sub(reactStaticFS, reactFallbackDir)
	if err != nil {
		return nil, err
	}
	return http.FS(subFS), nil
}

// GetReactIndexHTML returns the main index.html for the React app
func GetReactIndexHTML() ([]byte, error) {
	return readReactStaticFile("index.html")
}
