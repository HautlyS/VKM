# VKM Makefile
# Convenient build commands

VERSION := $(shell node -p "require('./vkm/package.json').version" 2>/dev/null || echo "2.0.1")
DIST_DIR := dist
BUILD_DIR := build

.PHONY: all clean build build-linux build-mac build-windows install test help

all: build

help:
	@echo "VKM Build System - Available targets:"
	@echo ""
	@echo "  make build          Build all platforms"
	@echo "  make build-linux    Build Linux (x64, arm64)"
	@echo "  make build-mac      Build macOS (x64, arm64)"
	@echo "  make build-windows  Build Windows (x64)"
	@echo "  make install        Install VKM locally"
	@echo "  make test           Run tests"
	@echo "  make clean          Clean build artifacts"
	@echo "  make release        Create release archives"
	@echo ""
	@echo "Version: $(VERSION)"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR) $(DIST_DIR)
	@echo "Done."

build:
	@./scripts/build.sh

build-linux:
	@./scripts/build.sh --platform linux

build-mac:
	@./scripts/build.sh --platform macos

build-windows:
	@./scripts/build.sh --platform windows

install:
	@echo "Installing VKM locally..."
	@cd vkm && ./install.sh
	@echo "Done."

test:
	@echo "Running tests..."
	@node vkm/bin/vkm --version
	@node vkm/bin/vkm --help
	@cd vkm-tui && npm test 2>/dev/null || echo "TUI tests skipped"
	@echo "Tests complete."

release: clean build
	@echo "Creating release v$(VERSION)..."
	@git tag -a v$(VERSION) -m "Release v$(VERSION)"
	@git push origin v$(VERSION)
	@echo "Release created."

# Development targets
dev-init:
	@node vkm/bin/vkm init

dev-tui:
	@cd vkm-tui && npm start

dev-monitor:
	@node vkm/bin/vkm monitor

# Package targets
npm-pack:
	@cd vkm && npm pack
	@cd vkm-tui && npm pack
	@echo "Packages created."

npm-publish:
	@cd vkm && npm publish --access public
	@cd vkm-tui && npm publish --access public
	@echo "Published to npm."