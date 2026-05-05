package proxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mostlygeek/llama-swap/proxy/config"
)

func TestProxyManager_RoleModelBridgeProxiesJSONRequests(t *testing.T) {
	t.Setenv("ROLE_MODEL_BRIDGE_BASE_URL", "")
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read bridged request body: %v", err)
		}
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("unexpected bridge path: %s", r.URL.Path)
		}
		if !strings.Contains(string(body), `"model":"openai/gpt-4.1-mini-fast"`) {
			t.Fatalf("expected original model in bridged body, got %s", string(body))
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Role-Model-Endpoint-Id", "openai.personal.primary.us-east-1.fast")
		w.Header().Set("X-Role-Model-Adapter-Family", "ai-sdk-openai")
		_, _ = w.Write([]byte(`{"id":"chatcmpl-role-model","object":"chat.completion","model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"message":{"role":"assistant","content":"bridged reply"},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":7,"total_tokens":19}}`))
	}))
	defer bridge.Close()
	t.Setenv("ROLE_MODEL_BRIDGE_BASE_URL", bridge.URL)

	pm := New(config.Config{
		Models: map[string]config.ModelConfig{},
		Groups: map[string]config.GroupConfig{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"openai/gpt-4.1-mini-fast","messages":[{"role":"user","content":"hello"}]}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	pm.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "bridged reply") {
		t.Fatalf("expected bridged reply in response body, got %s", rec.Body.String())
	}
	if got := rec.Header().Get("X-Role-Model-Endpoint-Id"); got != "openai.personal.primary.us-east-1.fast" {
		t.Fatalf("expected bridged endpoint header, got %q", got)
	}
}

func TestProxyManager_RoleModelBridgeProxiesModelList(t *testing.T) {
	t.Setenv("ROLE_MODEL_BRIDGE_BASE_URL", "")
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected bridge path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"object":"list","data":[{"id":"openai/gpt-4.1-mini-fast","object":"model","owned_by":"role-model","endpoint_ids":["openai.personal.primary.us-east-1.fast"]}]}`))
	}))
	defer bridge.Close()
	t.Setenv("ROLE_MODEL_BRIDGE_BASE_URL", bridge.URL)

	pm := New(config.Config{
		Models: map[string]config.ModelConfig{},
		Groups: map[string]config.GroupConfig{},
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	rec := httptest.NewRecorder()

	pm.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"openai/gpt-4.1-mini-fast"`) {
		t.Fatalf("expected bridged model list in response body, got %s", rec.Body.String())
	}
}

func TestProxyManager_RoleModelBridgeProxiesObservationAPI(t *testing.T) {
	t.Setenv("ROLE_MODEL_BRIDGE_BASE_URL", "")
	bridge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"path":"` + r.URL.Path + `"}`))
	}))
	defer bridge.Close()
	t.Setenv("ROLE_MODEL_BRIDGE_BASE_URL", bridge.URL)

	pm := New(config.Config{
		Models: map[string]config.ModelConfig{},
		Groups: map[string]config.GroupConfig{},
	})

	for _, path := range []string{
		"/api/role-model/requests",
		"/api/role-model/requests/req-runtime-bridge-route-001",
		"/api/role-model/endpoints/openai.personal.primary.us-east-1.fast/profile",
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()

		pm.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status %d for %s, got %d with body %s", http.StatusOK, path, rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), path) {
			t.Fatalf("expected bridged path %s in response body, got %s", path, rec.Body.String())
		}
	}
}
