#!/bin/bash

# Script to unlink local @cygnus-wealth/data-models and use published version

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Switching to published @cygnus-wealth/data-models...${NC}"

# Check if the package is currently linked
if [ -L "node_modules/@cygnus-wealth/data-models" ]; then
    echo -e "${YELLOW}Unlinking local @cygnus-wealth/data-models...${NC}"
    npm unlink @cygnus-wealth/data-models
else
    echo -e "${GREEN}@cygnus-wealth/data-models is not currently linked${NC}"
fi

# Install the latest published version
echo -e "${YELLOW}Installing published @cygnus-wealth/data-models...${NC}"

# Check if a specific version is requested
if [ -n "$1" ]; then
    VERSION="$1"
    echo -e "${YELLOW}Installing version: $VERSION${NC}"
    npm install "@cygnus-wealth/data-models@$VERSION"
else
    echo -e "${YELLOW}Installing latest version${NC}"
    npm install @cygnus-wealth/data-models@latest
fi

# Verify installation
if [ -d "node_modules/@cygnus-wealth/data-models" ] && [ ! -L "node_modules/@cygnus-wealth/data-models" ]; then
    INSTALLED_VERSION=$(node -p "require('./node_modules/@cygnus-wealth/data-models/package.json').version" 2>/dev/null)
    echo -e "${GREEN}✓ Successfully installed @cygnus-wealth/data-models@$INSTALLED_VERSION${NC}"
    echo -e "${GREEN}✓ Ready for production/publishing${NC}"
else
    echo -e "${RED}Error: Failed to install @cygnus-wealth/data-models${NC}"
    exit 1
fi