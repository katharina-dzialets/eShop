#!/usr/bin/env bash
# Air cloud environment startup for eShop (.NET 10 + Aspire AppHost + Docker containers).
#
# WARMUP (snapshot-baking / env-setup verification): install toolchain, build, pull images,
# start the AppHost and block in `healthcheck` until the store front answers.
# TASK: same steps (fast when cached), start the AppHost in the background and return promptly.
set -euo pipefail

if [ "${AIR_STARTUP_MODE:-}" = warmup ]; then WARMUP=1; else WARMUP=; fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"

log() { echo "[startup $(date -u +%H:%M:%S)] $*"; }

export DOTNET_ROOT="$HOME/.dotnet"
export PATH="$DOTNET_ROOT:$DOTNET_ROOT/tools:$PATH"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1
export ESHOP_USE_HTTP_ENDPOINTS="${ESHOP_USE_HTTP_ENDPOINTS:-1}"
APPHOST_LOG=/tmp/eshop-apphost.log
WEBAPP_URL=http://localhost:5045

# --- System packages (ICU is required by the .NET runtime) -------------------------------
if ! ldconfig -p | grep -q libicuuc; then
  log "Installing libicu"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libicu-dev
fi

# --- .NET SDK pinned by global.json -------------------------------------------------------
SDK_VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' global.json | head -1)"
if ! "$DOTNET_ROOT/dotnet" --list-sdks 2>/dev/null | grep -q "^${SDK_VERSION} "; then
  log "Installing .NET SDK ${SDK_VERSION}"
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --jsonfile "$REPO_DIR/global.json" --install-dir "$DOTNET_ROOT"
fi
log "dotnet $(dotnet --version)"

# --- Aspire CLI (aspire.dev installer is not reachable; use the NuGet global tool) --------
ASPIRE_VERSION="$(sed -n '/"sdk"/,/}/s/.*"version": *"\([^"]*\)".*/\1/p' aspire.config.json | head -1)"
if ! command -v aspire >/dev/null 2>&1; then
  log "Installing Aspire CLI ${ASPIRE_VERSION}"
  dotnet tool install -g Aspire.Cli --version "$ASPIRE_VERSION" || log "WARN: Aspire CLI install failed (dotnet run still works)"
fi

# --- Login-shell environment for the agent -------------------------------------------------
ENV_FILE="$HOME/.eshop-env.sh"
cat > "$ENV_FILE" <<'EOF'
export DOTNET_ROOT="$HOME/.dotnet"
case ":$PATH:" in *":$HOME/.dotnet:"*) ;; *) export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH";; esac
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_NOLOGO=1
export ESHOP_USE_HTTP_ENDPOINTS="${ESHOP_USE_HTTP_ENDPOINTS:-1}"
EOF
MARKER="# eshop-env (air startup)"
PROFILE=
for f in "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do
  if [ -f "$f" ]; then PROFILE="$f"; break; fi
done
PROFILE="${PROFILE:-$HOME/.profile}"
for f in "$PROFILE" "$HOME/.bashrc"; do
  grep -qF "$MARKER" "$f" 2>/dev/null || printf '\n%s\n[ -f "%s" ] && . "%s"\n' "$MARKER" "$ENV_FILE" "$ENV_FILE" >> "$f"
done

# --- Docker daemon (needed by Aspire for postgres/redis/rabbitmq/yarp and functional tests) -
if ! docker info >/dev/null 2>&1; then
  log "Starting dockerd"
  sudo sh -c 'nohup dockerd > /tmp/dockerd.log 2>&1 &'
  until docker info >/dev/null 2>&1; do sleep 1; done
fi
log "docker $(docker info --format '{{.ServerVersion}}')"

# --- Node / Playwright dependencies (e2e tests) --------------------------------------------
if command -v npm >/dev/null 2>&1; then
  log "npm ci"
  npm ci --no-audit --no-fund
  log "Installing Playwright chromium + system deps"
  sudo env "PATH=$PATH" npx playwright install-deps chromium
  npx playwright install chromium
fi

# --- Restore & build ------------------------------------------------------------------------
log "Building eShop.Web.slnf"
dotnet build eShop.Web.slnf -nologo -clp:ErrorsOnly
log "Build finished"

# --- Start the AppHost in the background ---------------------------------------------------
if ! curl -fsS -o /dev/null "$WEBAPP_URL"; then
  log "Starting AppHost (log: $APPHOST_LOG)"
  nohup dotnet run --no-build --project src/eShop.AppHost/eShop.AppHost.csproj > "$APPHOST_LOG" 2>&1 &
fi

healthcheck() {
  log "healthcheck: waiting for WebApp at $WEBAPP_URL"
  local n=0
  until curl -fsS -o /tmp/eshop-home.html "$WEBAPP_URL/" 2>/dev/null && grep -qi "AdventureWorks\|catalog" /tmp/eshop-home.html; do
    if ! pgrep -f "eShop.AppHost" >/dev/null; then
      log "healthcheck: AppHost process exited; last log lines:"; tail -50 "$APPHOST_LOG"; return 1
    fi
    n=$((n + 1))
    if [ $((n % 15)) -eq 0 ]; then
      log "healthcheck: still waiting ($((n * 2))s); containers: $(docker ps --format '{{.Image}}' | tr '\n' ' ')"
      tail -3 "$APPHOST_LOG"
    fi
    sleep 2
  done
  log "healthcheck: WebApp home page served ($(wc -c < /tmp/eshop-home.html) bytes)"
  log "healthcheck: OK"
}

if [ -n "$WARMUP" ]; then healthcheck; fi
log "Startup complete"
