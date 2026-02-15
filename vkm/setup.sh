#!/bin/bash
#
# VKM Quick Setup Script
# One-liner setup for VKM
#

set -e

REPO_URL="https://github.com/yourusername/vkm"
INSTALL_DIR="$HOME/.vkm-install"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Virtual Key Manager - Quick Setup${NC}"
echo ""

# Clone or download
if command -v git &> /dev/null; then
    echo "Cloning VKM repository..."
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" 2>/dev/null || {
        # Fallback: download tarball
        echo "Downloading VKM..."
        mkdir -p "$INSTALL_DIR"
        curl -sL "${REPO_URL}/archive/refs/heads/main.tar.gz" | tar -xz -C "$INSTALL_DIR" --strip-components=1
    }
else
    echo "Downloading VKM..."
    mkdir -p "$INSTALL_DIR"
    curl -sL "${REPO_URL}/archive/refs/heads/main.tar.gz" | tar -xz -C "$INSTALL_DIR" --strip-components=1
fi

# Run installer
cd "$INSTALL_DIR"
bash install.sh

# Cleanup
rm -rf "$INSTALL_DIR"

echo -e "${GREEN}✓ VKM setup complete!${NC}"
echo ""
echo "Get started:"
echo "  vkm key-add       # Add your first API key"
echo "  vkm status        # Check VKM status"
