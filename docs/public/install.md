# Install the router

For normal users, the easiest way to run `role-model-router` is to install a packaged release.

Building from source is still supported, but it requires Node.js 24, `pnpm`, and Go.

## Installer scripts

### macOS and Linux

```bash
curl -fsSL https://raw.githubusercontent.com/try-works/role-model/main/scripts/install.sh | sh
```

This installs the latest release bundle under `~/.local/share/role-model-router/` and creates a
`role-model-router` launcher in `~/.local/bin`.

### Windows

```powershell
irm https://raw.githubusercontent.com/try-works/role-model/main/scripts/install.ps1 | iex
```

This installs the latest release bundle under `%LOCALAPPDATA%\Programs\RoleModelRouter\` and creates a
`role-model-router.cmd` launcher.

If your shell cannot find `role-model-router` immediately after installation, open a new terminal so it picks
up the updated `PATH`.

## Manual downloads

Every tagged release should publish one archive per supported platform:

- `role-model-router-linux-x64.tar.gz`
- `role-model-router-darwin-x64.tar.gz`
- `role-model-router-darwin-arm64.tar.gz`
- `role-model-router-win32-x64.zip`
- `SHA256SUMS.txt`

After extracting the archive:

- Windows: run `Role-Model.bat` or `role-model-runtime.exe`
- macOS/Linux: run `role-model-runtime`

Before running a manual download, verify its checksum against `SHA256SUMS.txt`.

When launched without extra runtime arguments, the packaged runtime opens the local UI in your default
browser.

## Source builds

Use a source build when you want to develop the router itself, modify the runtime, or work on the protocol
implementation in this repository.

For that workflow, start with the repository [Quickstart](quickstart.md) and the source build instructions in
the root [`README.md`](../../README.md).
