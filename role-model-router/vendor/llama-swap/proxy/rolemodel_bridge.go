package proxy

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type RoleModelBridge struct {
	baseURL *url.URL
	client  *http.Client
	token   string
	logger  *LogMonitor
}

func newRoleModelBridgeFromEnv(logger *LogMonitor) *RoleModelBridge {
	baseURL := strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_BASE_URL"))
	if baseURL == "" {
		return nil
	}

	parsed, err := url.Parse(baseURL)
	if err != nil {
		logger.Errorf("Disabling role-model bridge. Invalid ROLE_MODEL_BRIDGE_BASE_URL %q: %v", baseURL, err)
		return nil
	}

	return &RoleModelBridge{
		baseURL: parsed,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		token:  strings.TrimSpace(os.Getenv("ROLE_MODEL_BRIDGE_TOKEN")),
		logger: logger,
	}
}

func (b *RoleModelBridge) Enabled() bool {
	return b != nil && b.baseURL != nil
}

func (b *RoleModelBridge) newBridgeRequest(r *http.Request) (*http.Request, error) {
	target := *b.baseURL
	target.Path = r.URL.Path
	target.RawQuery = r.URL.RawQuery

	req, err := http.NewRequestWithContext(r.Context(), r.Method, target.String(), r.Body)
	if err != nil {
		return nil, err
	}
	req.Header = r.Header.Clone()
	req.Host = target.Host
	if b.token != "" {
		req.Header.Set("X-Role-Model-Bridge-Token", b.token)
	}
	return req, nil
}

func copyResponse(w http.ResponseWriter, resp *http.Response) error {
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.WriteHeader(resp.StatusCode)
	_, err := io.Copy(w, resp.Body)
	return err
}

func (b *RoleModelBridge) do(w http.ResponseWriter, r *http.Request) error {
	req, err := b.newBridgeRequest(r)
	if err != nil {
		return fmt.Errorf("create bridge request: %w", err)
	}

	resp, err := b.client.Do(req)
	if err != nil {
		return fmt.Errorf("call role-model bridge: %w", err)
	}
	defer resp.Body.Close()

	if err := copyResponse(w, resp); err != nil {
		return fmt.Errorf("copy role-model bridge response: %w", err)
	}

	return nil
}

func (b *RoleModelBridge) ProxyRequest(_ string, w http.ResponseWriter, r *http.Request) error {
	return b.do(w, r)
}

func (b *RoleModelBridge) ProxyModels(w http.ResponseWriter, r *http.Request) error {
	return b.do(w, r)
}
