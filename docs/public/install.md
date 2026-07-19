# Install the router

For normal users, the easiest way to run `role-model` is to install a packaged release.

Building from source is still supported, but it requires Node.js 24, `pnpm`, and Go.

## Installer scripts

### macOS and Linux

```bash
curl -fsSL https://raw.githubusercontent.com/try-works/role-model/main/scripts/install.sh | sh
```

This installs the latest release bundle under `~/.local/share/role-model/` and creates a
`role-model` launcher in `~/.local/bin`.

### Windows

```powershell
irm https://raw.githubusercontent.com/try-works/role-model/main/scripts/install.ps1 | iex
```

This installs the latest release bundle under `%LOCALAPPDATA%\Programs\role-model\` and creates a
`role-model.cmd` launcher.

If your shell cannot find `role-model` immediately after installation, open a new terminal so it picks
up the updated `PATH`.

## Manual downloads

Every tagged release should publish one archive per supported platform:

- `role-model-linux-x64.tar.gz`
- `role-model-darwin-x64.tar.gz`
- `role-model-darwin-arm64.tar.gz`
- `role-model-win32-x64.zip`
- `SHA256SUMS.txt`

After extracting the archive:

- Windows: run `role-model.bat` or `role-model.exe`
- macOS/Linux: run `role-model`

Before running a manual download, verify its checksum against `SHA256SUMS.txt`.

When launched without extra runtime arguments, the packaged runtime opens the local UI in your default
browser.

## Runtime channels

Stable production packages run as `role-model` at `http://127.0.0.1:3456`. Stage candidates run as
`role-model-stage` at `http://127.0.0.1:3457`, and development packages run as `role-model-dev` at
`http://127.0.0.1:3458`. Each channel has its own state root and can run concurrently on one device.

Pi keeps the production endpoint by default. To use a candidate explicitly:

```bash
ROLE_MODEL_ENDPOINT=http://127.0.0.1:3457 pi # stage
ROLE_MODEL_ENDPOINT=http://127.0.0.1:3458 pi # development
```

## Source builds

Use a source build when you want to develop the router itself, modify the runtime, or work on the protocol
implementation in this repository.

For that workflow, start with the repository [Quickstart](quickstart.md) and the source build instructions in
the root [`README.md`](../../README.md).
