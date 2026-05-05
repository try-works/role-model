package proxy

import (
	"strings"
	"testing"
)

func TestUIEmbed_FallbackIndexAvailableWithoutUIDist(t *testing.T) {
	indexHTML, err := GetReactIndexHTML()
	if err != nil {
		t.Fatalf("GetReactIndexHTML() error = %v", err)
	}

	if !strings.Contains(string(indexHTML), "role-model runtime host") {
		t.Fatalf("fallback index should mention role-model runtime host, got %q", string(indexHTML))
	}
}
