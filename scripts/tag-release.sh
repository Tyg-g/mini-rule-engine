#!/usr/bin/env bash
set -euo pipefail

# Config (edit if needed)
PKG_JSON="package.json"
CHANGELOG="CHANGELOG.md"
TAG_PREFIX="v"

# 0) Safety checks -------------------------------------------------------------

# require clean working tree

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✖ Working tree is not clean. Commit or stash your changes first." >&2
  exit 1
fi

# ensure local == origin (in sync)
git fetch origin --quiet
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "@{u}")
BASE=$(git merge-base @ "@{u}")

if [[ "$LOCAL" != "$REMOTE" ]]; then
  if [[ "$LOCAL" == "$BASE" ]]; then
    echo "✖ Your branch is behind origin. Pull first." >&2
  elif [[ "$REMOTE" == "$BASE" ]]; then
    echo "✖ Your branch is ahead of origin. Push your commits first." >&2
  else
    echo "✖ Your branch and origin have diverged. Reconcile first." >&2
  fi
  exit 1
fi

# 1) Read version from package.json by matching the line -----------------------

if [[ ! -f "$PKG_JSON" ]]; then
  echo "✖ $PKG_JSON not found." >&2
  exit 1
fi

VERSION_LINE=$(grep -m1 -E '^\s*"version"\s*:\s*"' "$PKG_JSON" || true)
if [[ -z "$VERSION_LINE" ]]; then
  echo '✖ Could not find a line like:  "version": "x.y.z"  in package.json' >&2
  exit 1
fi

VERSION=$(sed -E 's/.*"version"\s*:\s*"([^"]+)".*/\1/' <<<"$VERSION_LINE")

# basic semver-ish check
if ! [[ "$VERSION" =~ ^[0-9]+(\.[0-9]+){2}(-[0-9A-Za-z\.-]+)?$ ]]; then
  echo "✖ Extracted version '$VERSION' doesn't look like semver (x.y.z[-prerelease])." >&2
  exit 1
fi

# 2) Validate first CHANGELOG heading -----------------------------------------

if [[ ! -f "$CHANGELOG" ]]; then
  echo "✖ $CHANGELOG not found." >&2
  exit 1
fi

FIRST_H2=$(grep -m1 -E '^## ' "$CHANGELOG" || true)
if [[ -z "$FIRST_H2" ]]; then
  echo '✖ Could not find a line starting with "## " in CHANGELOG.md' >&2
  exit 1
fi

# Expect format: "## <version> - <YYYY-MM-DD>"
if ! [[ "$FIRST_H2" =~ ^##\ ([0-9]+(\.[0-9]+){2}(-[0-9A-Za-z\.-]+)?)\ \-\ ([0-9]{4}-[0-9]{2}-[0-9]{2})$ ]]; then
  echo "✖ CHANGELOG first '## ' line has wrong format." >&2
  echo "  Found:    $FIRST_H2" >&2
  echo "  Expected: ## 1.2.3 - 2025-11-11" >&2
  exit 1
fi

CHANGELOG_VERSION="${BASH_REMATCH[1]}"
CHANGELOG_DATE="${BASH_REMATCH[4]}"

# Version in changelog must match package.json
if [[ "$CHANGELOG_VERSION" != "$VERSION" ]]; then
  echo "✖ Version mismatch: package.json=$VERSION, CHANGELOG.md=$CHANGELOG_VERSION" >&2
  exit 1
fi

# Optional: ensure date looks valid (YYYY-MM-DD is already checked above)

# 3) Create tag vVERSION (fail if exists) -------------------------------------

TAG="${TAG_PREFIX}${VERSION}"

# fail if tag exists locally
if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "✖ Tag ${TAG} already exists locally." >&2
  exit 1
fi

# fail if tag exists on remote
if git ls-remote --tags origin "refs/tags/${TAG}" | grep -q .; then
  echo "✖ Tag ${TAG} already exists on remote." >&2
  exit 1
fi

#git tag -a "${TAG}" -m "Release ${TAG}"
echo "✔ Created tag ${TAG}"

# 4) Push the tag --------------------------------------------------------------

#git push origin "${TAG}"
echo "✔ Pushed tag ${TAG} to origin"

echo "✅ Done."
