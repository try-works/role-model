#!/usr/bin/env sh
set -eu

OWNER_REPO="${ROLE_MODEL_REPOSITORY:-try-works/role-model}"
INSTALL_ROOT="${ROLE_MODEL_INSTALL_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/role-model-router}"
BIN_DIR="${ROLE_MODEL_BIN_DIR:-$HOME/.local/bin}"
VERSION="${ROLE_MODEL_VERSION:-latest}"

detect_platform() {
  case "$(uname -s)" in
    Linux) printf "linux" ;;
    Darwin) printf "darwin" ;;
    *) echo "Unsupported platform: $(uname -s)" >&2; exit 1 ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64) printf "x64" ;;
    arm64|aarch64) printf "arm64" ;;
    *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac
}

if [ "$VERSION" = "latest" ]; then
  VERSION="$(
    curl -fsSL "https://api.github.com/repos/${OWNER_REPO}/releases/latest" \
      | grep '"tag_name"' | head -1 | cut -d'"' -f4
  )"
fi

TARGET="$(detect_platform)-$(detect_arch)"
ASSET_NAME="${ROLE_MODEL_ASSET_NAME:-role-model-router-${TARGET}.tar.gz}"
DOWNLOAD_URL="https://github.com/${OWNER_REPO}/releases/download/${VERSION}/${ASSET_NAME}"
PACKAGE_DIR="${INSTALL_ROOT}/${VERSION}/${TARGET}"
LAUNCHER_PATH="${PACKAGE_DIR}/role-model-runtime"
COMMAND_PATH="${BIN_DIR}/role-model-router"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT INT TERM

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to install role-model-router." >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required to install role-model-router." >&2
  exit 1
fi

rm -rf "${PACKAGE_DIR}"
mkdir -p "${PACKAGE_DIR}" "${BIN_DIR}"
curl -fsSL "${DOWNLOAD_URL}" -o "${TMP_DIR}/${ASSET_NAME}"
tar -xzf "${TMP_DIR}/${ASSET_NAME}" -C "${PACKAGE_DIR}"
chmod +x "${LAUNCHER_PATH}"
rm -f "${COMMAND_PATH}"
ln -s "${LAUNCHER_PATH}" "${COMMAND_PATH}"

printf "Installed role-model-router to %s\n" "${PACKAGE_DIR}"
printf "Launcher command: %s\n" "${COMMAND_PATH}"

case ":$PATH:" in
  *:"${BIN_DIR}":*)
    ;;
  *)
    printf "Add %s to your PATH, then run: role-model-router\n" "${BIN_DIR}"
    ;;
esac
