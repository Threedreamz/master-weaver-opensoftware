#!/usr/bin/env bash
# Install the Fusion360MCP add-in by symlinking into Fusion 360's AddIns directory.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADDIN_SOURCE="$SCRIPT_DIR/../addin"

# macOS path
MAC_ADDIN_DIR="$HOME/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/Fusion360MCP"

# Windows path (Git Bash / WSL)
WIN_ADDIN_DIR="$APPDATA/Autodesk/Autodesk Fusion 360/API/AddIns/Fusion360MCP"

if [[ "$OSTYPE" == "darwin"* ]]; then
  ADDIN_DIR="$MAC_ADDIN_DIR"
elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* ]]; then
  ADDIN_DIR="$WIN_ADDIN_DIR"
else
  echo "Unsupported OS: $OSTYPE"
  exit 1
fi

echo "Add-in source: $ADDIN_SOURCE"
echo "Target dir:    $ADDIN_DIR"

if [ -L "$ADDIN_DIR" ]; then
  echo "Symlink already exists — updating target."
  rm "$ADDIN_DIR"
elif [ -d "$ADDIN_DIR" ]; then
  echo "ERROR: $ADDIN_DIR exists as a real directory."
  echo "Back it up and remove it, then re-run this script."
  exit 1
fi

ln -s "$ADDIN_SOURCE" "$ADDIN_DIR"
echo ""
echo "Installed: $ADDIN_DIR -> $ADDIN_SOURCE"
echo ""
echo "Next steps:"
echo "  1. (Re)start Fusion 360"
echo "  2. Tools > Add-Ins > Scripts and Add-Ins > Add-Ins tab"
echo "     Select Fusion360MCP → Run (check 'Run on Startup' for persistence)"
echo "  3. Build the MCP server:"
echo "     cd $(dirname "$SCRIPT_DIR") && pnpm install && pnpm build"
echo "  4. Register in ~/.claude/settings.json (see README)"
echo ""
echo "Verify add-in is running:"
echo "  curl http://localhost:4176/health"
