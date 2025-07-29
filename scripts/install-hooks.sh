#!/bin/bash

# Script to install git hooks

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${YELLOW}Installing git hooks...${NC}"

# Create .git/hooks directory if it doesn't exist
mkdir -p "$REPO_ROOT/.git/hooks"

# Copy pre-push hook
if [ -f "$SCRIPT_DIR/pre-push" ]; then
    cp "$SCRIPT_DIR/pre-push" "$REPO_ROOT/.git/hooks/pre-push"
    chmod +x "$REPO_ROOT/.git/hooks/pre-push"
    echo -e "${GREEN}✓ Installed pre-push hook${NC}"
else
    echo -e "${RED}Error: pre-push hook not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Git hooks installed successfully${NC}"
echo ""
echo -e "${YELLOW}The pre-push hook will prevent pushing if:${NC}"
echo "  - package.json contains local file references"
echo "  - npm packages are linked (instead of installed)"
echo "  - package-lock.json contains local file references"