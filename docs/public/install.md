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

## Testing a stage release candidate

Successful `stage` builds appear in GitHub Releases as prereleases named `stage-rc-<12-character-stage-sha>`. Each
candidate contains four stage-channel archives plus `SHA256SUMS.txt`. It is deliberately excluded from the stable
installer path.

To test one, download the archive for your platform, verify its checksum, extract it into a separate application
directory, and run its launcher. The candidate identifies itself as `role-model-stage`, listens on
`http://127.0.0.1:3457`, and uses the isolated `role-model-runtime-stage` state root. Do not point it at production
state. After testing the intended behavior, restarts, and persistence, a maintainer records acceptance for that exact
candidate before any `stage -> main` promotion or stable tag.

## Updating an installed runtime

Updates are currently manual. Re-run the installer with a newer version, or extract the newer archive and
launch it in place of the old package. The Windows installer places each release in its own versioned
directory and repoints the `role-model.cmd` shim; it does not delete the persistent runtime state.

Runtime state is stored separately from versioned application binaries. For example, the production Windows
runtime uses `%LOCALAPPDATA%\role-model-runtime`. The Message Graph encryption and scoped-digest keys are
created once under `standalone-runtime\track-b\managed-keys` and reused by later versions. Merely updating the
runtime never rotates those keys.

Back up the complete runtime state, including `track-b\managed-keys`, before moving state to another machine
or performing manual cleanup. Graph data restored without both original key files is intentionally unreadable;
the runtime fails closed instead of silently generating replacement keys. Intentional key rotation requires a
future explicit decrypt-and-reencrypt migration and is not performed during an update.

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
