#!/usr/bin/env bash
# build-docs.sh — Documentation build pipeline for Unity-InteractionSystem
#
# Run from the DOC-Unity-InteractionSystem repo root:
#   sh build-docs.sh
#
# Expects the Unity project to be at a sibling path:
#   ../../../Unity/RPG  (i.e. Desarrollo/Unity/RPG)
# Override with: UNITY_PROJECT=/path/to/project sh build-docs.sh

set -e

DOC_ROOT="$(cd "$(dirname "$0")" && pwd)"
UNITY_PROJECT="${UNITY_PROJECT:-$(realpath "$DOC_ROOT/../../../Unity/RPG")}"
DOCFX_META="$UNITY_PROJECT/docfx-metadata"

echo ""
echo "========================================"
echo "  Unity-InteractionSystem · Docs Build  "
echo "========================================"
echo "  Unity project : $UNITY_PROJECT"
echo "  DocFX metadata: $DOCFX_META"
echo "========================================"
echo ""

# ── Step 1: Check docfx ──────────────────────────────────────────────────────
echo "[1/5] Checking for docfx..."

DOCFX_AVAILABLE=false
if command -v docfx &>/dev/null; then
    DOCFX_AVAILABLE=true
    echo "      docfx found: $(docfx --version)"
elif command -v dotnet &>/dev/null; then
    echo "      docfx not found. .NET SDK: $(dotnet --version). Installing docfx..."
    dotnet tool install -g docfx
    export PATH="$PATH:$HOME/.dotnet/tools"
    DOCFX_AVAILABLE=true
    echo "      docfx installed."
else
    echo "      .NET SDK not found — skipping docfx step."
    echo "      (API pages are pre-generated; build will still work)"
fi

# ── Step 2: docfx metadata ───────────────────────────────────────────────────
echo ""
if [ "$DOCFX_AVAILABLE" = true ]; then
    echo "[2/5] Running: docfx metadata docfx.json (in Unity project)"
    cd "$UNITY_PROJECT"
    if docfx metadata docfx.json; then
        echo "      Metadata generated → $DOCFX_META"
    else
        echo "      WARNING: docfx metadata failed. Continuing with existing pages."
    fi
    cd "$DOC_ROOT"
else
    echo "[2/5] Skipped (docfx not available)"
fi

# ── Step 3: npm install ──────────────────────────────────────────────────────
echo ""
echo "[3/5] Running: npm install"
cd "$DOC_ROOT"
npm install
echo "      npm install OK."

# ── Step 4: docfx-to-starlight conversion ────────────────────────────────────
echo ""
if [ "$DOCFX_AVAILABLE" = true ] && [ -d "$DOCFX_META" ]; then
    echo "[4/5] Running: node scripts/docfx-to-starlight.mjs"
    cd "$DOC_ROOT"
    if DOCFX_META_DIR="$DOCFX_META" node scripts/docfx-to-starlight.mjs; then
        echo "      Conversion OK."
    else
        echo "      WARNING: Conversion failed. Continuing with existing MDX pages."
    fi
else
    echo "[4/5] Skipped (no docfx-metadata output at $DOCFX_META)"
fi

# ── Step 5: Astro build ──────────────────────────────────────────────────────
echo ""
echo "[5/5] Running: npm run build (Astro)"
cd "$DOC_ROOT"
npm run build

echo ""
echo "========================================"
echo "  BUILD SUCCESSFUL"
echo "  Output: dist/"
echo "  Preview: npm run dev"
echo "========================================"
echo ""
