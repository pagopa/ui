#!/usr/bin/env bash
# Build-time setup for the figma-to-code evals (harbor-bench `harbor/` overlay).
#
# The skill runs inside a real pagopa/ui checkout, so this clones the
# repository at a pinned commit, installs the toolchain the `ui-cli` commands
# need, and hands the agent a clean worktree. This runs before the generated
# baseline commit: everything it writes is the agent's starting workspace.
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.14.1}"
PNPM_VERSION="${PNPM_VERSION:-11.28.6}"
PAGOPA_UI_REPO="${PAGOPA_UI_REPO:-https://github.com/pagopa/ui.git}"
PAGOPA_UI_REF="${PAGOPA_UI_REF:-d533a8bba6274d8cdf508cc9192340a1976da30b}"

WORKSPACE=/workspace

# TARGETARCH is only populated by buildx; derive the architecture from the
# image itself so a native arm64 build does not install an x64 Node.
case "$(uname -m)" in
  aarch64 | arm64) node_arch=arm64 ;;
  *) node_arch=x64 ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "figma-to-code eval: installing Node $NODE_VERSION (linux-$node_arch)"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$node_arch.tar.gz" \
    | tar -xz -C /usr/local --strip-components=1
fi
command -v pnpm >/dev/null 2>&1 || npm install -g "pnpm@$PNPM_VERSION" >/dev/null

echo "figma-to-code eval: checking out pagopa/ui at $PAGOPA_UI_REF"
scratch="$(mktemp -d)"
git init -q "$scratch/repo"
git -C "$scratch/repo" remote add origin "$PAGOPA_UI_REPO"
git -C "$scratch/repo" fetch -q --depth 1 origin "$PAGOPA_UI_REF"
git -C "$scratch/repo" checkout -q -B main FETCH_HEAD
shopt -s dotglob
cp -a "$scratch/repo"/* "$WORKSPACE"/
rm -rf "$scratch"
rm -f "$WORKSPACE/prepare.sh" "$WORKSPACE/.dockerignore"

# The skill under test is injected by harbor-bench; the copy in the repository
# would shadow it (and leak its evals into the workspace).
rm -rf "$WORKSPACE/.agents/skills/figma-to-code"

cd "$WORKSPACE"
echo "figma-to-code eval: installing the ui-cli runtime dependencies"
# Only what `packages/ui-cli/src/cli.ts` imports at runtime. A workspace install
# is impossible here: the root devDependencies resolve from GitHub Packages and
# need a token. The Nx targets, linters and test runners stay out on purpose —
# the evals grade the Figma flow, not the workspace gates.
deps="$(mktemp -d)"
(
  cd "$deps"
  npm init -y >/dev/null
  npm install --silent --no-audit --no-fund citty@0.2.2 zod@4.6.7 oxc-parser@0.127.0 sharp@0.35.5
)
cp -a "$deps/node_modules" "$WORKSPACE/packages/ui-cli/node_modules"
rm -rf "$deps"
npm cache clean --force >/dev/null 2>&1 || true

# pnpm installs the whole workspace before running a script when node_modules
# does not match the lockfile. That install resolves the root devDependencies
# from GitHub Packages and needs a token, so it would fail — noisily and slowly
# — on every `pnpm ui-cli` call. Turn the pre-run check off.
printf 'verifyDepsBeforeRun: false\n' >>"$WORKSPACE/pnpm-workspace.yaml"

cat >"$WORKSPACE/README.md" <<MD
# figma-to-code eval workspace

- \`pnpm ui-cli <command>\` runs \`packages/ui-cli/src/cli.ts\` from source.
- Only the CLI's runtime dependencies are installed here: the Nx targets, the
  linters and the test runners are not, so \`pnpm nx ...\` does not run.
- The Figma token, when the task has one, arrives as \`FIGMA_TOKEN\`.
MD

rm -f "$WORKSPACE/prepare.sh"

# Fail fast: a broken workspace must break the image build, not the session.
if ! pnpm ui-cli figma status >/dev/null; then
  echo "figma-to-code eval: 'pnpm ui-cli figma status' failed in the prepared" \
    "workspace. Check PAGOPA_UI_REF and the ui-cli dependency install above." >&2
  exit 1
fi

echo "figma-to-code eval: workspace ready"
