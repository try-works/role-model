#!/usr/bin/env sh
set -eu

OWNER_REPO="${ROLE_MODEL_REPOSITORY:-try-works/role-model}"
INSTALL_DIR="${ROLE_MODEL_INSTALL_DIR:-$HOME/.local/bin}"
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

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT INT TERM

mkdir -p "${INSTALL_DIR}"
curl -fsSL "${DOWNLOAD_URL}" -o "${TMP_DIR}/${ASSET_NAME}"
tar -xzf "${TMP_DIR}/${ASSET_NAME}" -C "${INSTALL_DIR}"

printf "Installed role-model-router to %s\n" "${INSTALL_DIR}"
