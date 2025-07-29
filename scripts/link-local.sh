#!/bin/bash

# Script to link local @cygnus-wealth/data-models for development

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up local development environment...${NC}"

# Check if data-models path is provided
if [ -z "$1" ]; then
    # Try to find data-models in common locations
    if [ -d "../data-models" ]; then
        DATA_MODELS_PATH="../data-models"
    elif [ -d "../../data-models" ]; then
        DATA_MODELS_PATH="../../data-models"
    elif [ -d "../cygnus-wealth-data-models" ]; then
        DATA_MODELS_PATH="../cygnus-wealth-data-models"
    else
        echo -e "${RED}Error: Could not find data-models directory${NC}"
        echo "Usage: $0 [path-to-data-models]"
        echo "Example: $0 ../data-models"
        exit 1
    fi
else
    DATA_MODELS_PATH="$1"
fi

# Convert to absolute path
DATA_MODELS_PATH=$(cd "$DATA_MODELS_PATH" && pwd)

# Verify the path exists and has package.json
if [ ! -f "$DATA_MODELS_PATH/package.json" ]; then
    echo -e "${RED}Error: No package.json found at $DATA_MODELS_PATH${NC}"
    exit 1
fi

# Check if it's the correct package
PACKAGE_NAME=$(node -p "require('$DATA_MODELS_PATH/package.json').name" 2>/dev/null)
if [ "$PACKAGE_NAME" != "@cygnus-wealth/data-models" ]; then
    echo -e "${RED}Error: Package at $DATA_MODELS_PATH is not @cygnus-wealth/data-models${NC}"
    echo "Found: $PACKAGE_NAME"
    exit 1
fi

echo -e "${GREEN}Found data-models at: $DATA_MODELS_PATH${NC}"

# Create global link in data-models
echo -e "${YELLOW}Creating global link for @cygnus-wealth/data-models...${NC}"
cd "$DATA_MODELS_PATH"
npm link

# Link in current project
echo -e "${YELLOW}Linking @cygnus-wealth/data-models in current project...${NC}"
cd - > /dev/null
npm link @cygnus-wealth/data-models

echo -e "${GREEN}✓ Successfully linked local @cygnus-wealth/data-models${NC}"
echo -e "${GREEN}✓ You can now make changes to data-models and they will be reflected immediately${NC}"
echo ""
echo -e "${YELLOW}To unlink and use published version, run:${NC}"
echo "  npm run use-published"