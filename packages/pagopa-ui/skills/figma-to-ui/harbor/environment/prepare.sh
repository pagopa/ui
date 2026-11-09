#!/usr/bin/env bash
# Build-time setup for the figma-to-ui evals (harbor-bench `harbor/` overlay).
#
# The app under test depends on `@pagopa/ui`, which is published to GitHub
# Packages only, so the workspace vendors the package from the repository at a
# pinned commit instead of resolving it from a registry. This runs before the
# generated baseline commit: everything it writes is the agent's starting
# workspace.
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.14.1}"
PAGOPA_UI_REPO="${PAGOPA_UI_REPO:-https://github.com/pagopa/ui.git}"
PAGOPA_UI_REF="${PAGOPA_UI_REF:-d533a8bba6274d8cdf508cc9192340a1976da30b}"

WORKSPACE=/workspace
VENDOR="$WORKSPACE/vendor/pagopa-ui"

# TARGETARCH is only populated by buildx; derive the architecture from the
# image itself so a native arm64 build does not install an x64 Node.
case "$(uname -m)" in
  aarch64 | arm64) node_arch=arm64 ;;
  *) node_arch=x64 ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "figma-to-ui eval: installing Node $NODE_VERSION (linux-$node_arch)"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$node_arch.tar.gz" \
    | tar -xz -C /usr/local --strip-components=1
fi

echo "figma-to-ui eval: vendoring @pagopa/ui at $PAGOPA_UI_REF"
scratch="$(mktemp -d)"
git init -q "$scratch/repo"
git -C "$scratch/repo" remote add origin "$PAGOPA_UI_REPO"
git -C "$scratch/repo" fetch -q --depth 1 origin "$PAGOPA_UI_REF"
git -C "$scratch/repo" checkout -q FETCH_HEAD -- packages/pagopa-ui
mkdir -p "$VENDOR"
cp -a "$scratch/repo/packages/pagopa-ui/." "$VENDOR/"
rm -rf "$scratch"

# The skill under test is injected by harbor-bench from the repository, so the
# vendored copy would only shadow it with a version pinned to PAGOPA_UI_REF.
rm -rf "$VENDOR/skills"
chmod +x "$VENDOR/cli/pagopa-ui-map.mjs"

cat >"$WORKSPACE/package.json" <<'JSON'
{
  "name": "figma-to-ui-eval-app",
  "private": true,
  "type": "module",
  "dependencies": {
    "@pagopa/ui": "file:./vendor/pagopa-ui",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  }
}
JSON

cat >"$WORKSPACE/README.md" <<MD
# figma-to-ui eval workspace

- \`@pagopa/ui\` is vendored from \`pagopa/ui\` at \`$PAGOPA_UI_REF\` in
  \`vendor/pagopa-ui\` and linked into \`node_modules\`. It is source only: the
  package is not built here, so its \`dist/\` directory is absent and the
  stylesheet entry points it exports do not exist on disk.
- \`pagopa-ui-map\` answers the map (\`pagopa-ui-map resolve <node id>\`). It is on
  \`PATH\`, and there is no package manager in this workspace: run it directly
  rather than through \`pnpm exec\`.
- The Figma frame metadata dumps are the \`*.json\` files in this directory.
MD

# Wire the vendored package and the map CLI the way a consumer sees them, with
# no install step: the package is not on a public registry.
mkdir -p "$WORKSPACE/node_modules/@pagopa" "$WORKSPACE/node_modules/.bin"
ln -sfn ../../vendor/pagopa-ui "$WORKSPACE/node_modules/@pagopa/ui"
ln -sfn ../../vendor/pagopa-ui/cli/pagopa-ui-map.mjs "$WORKSPACE/node_modules/.bin/pagopa-ui-map"
ln -sfn "$WORKSPACE/node_modules/.bin/pagopa-ui-map" /usr/local/bin/pagopa-ui-map

rm -f "$WORKSPACE/prepare.sh"

# Fail fast: an incomplete vendor checkout must break the image build, not the
# agent session.
if ! pagopa-ui-map resolve 61:2786 >/dev/null; then
  echo "figma-to-ui eval: 'pagopa-ui-map resolve 61:2786' failed; the vendored" \
    "package at $VENDOR is incomplete. Check PAGOPA_UI_REF and the network." >&2
  exit 1
fi

echo "figma-to-ui eval: workspace ready"
