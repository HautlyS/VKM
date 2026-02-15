#!/bin/bash
#
# VKM Installation Script
# Virtual Key Manager - General-purpose API key manager
#

set -e

VKM_VERSION="2.0.0"
VKM_DIR="$HOME/.vkm"
BIN_DIR="$VKM_DIR/bin"
SYSTEMD_DIR="$HOME/.config/systemd/user"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "╭──────────────────────────────────────────────────────────────╮"
    echo "│                Virtual Key Manager (VKM) v${VKM_VERSION}              │"
    echo "│           General-purpose API Key Management Tool            │"
    echo "╰──────────────────────────────────────────────────────────────╯"
    echo -e "${NC}"
}

print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js first: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16+ required"
        exit 1
    fi
    
    print_success "Node.js $(node --version) found"
}

install_vkm() {
    print_status "Installing VKM to $VKM_DIR..."
    
    # Create directories
    mkdir -p "$BIN_DIR"
    mkdir -p "$SYSTEMD_DIR"
    mkdir -p "$VKM_DIR"/{logs,integrations}
    
    # Copy main script
    if [ -f "bin/vkm" ]; then
        cp bin/vkm "$BIN_DIR/vkm"
    else
        print_error "vkm binary not found in bin/"
        exit 1
    fi
    
    chmod +x "$BIN_DIR/vkm"
    
    # Copy systemd service
    if [ -f "systemd/vkm-monitor.service" ]; then
        sed "s|%h|$HOME|g" systemd/vkm-monitor.service > "$SYSTEMD_DIR/vkm-monitor.service"
    fi
    
    # Create symlink in user's bin
    if [ -d "$HOME/.local/bin" ]; then
        ln -sf "$BIN_DIR/vkm" "$HOME/.local/bin/vkm"
        print_success "Linked to ~/.local/bin/vkm"
    elif [ -d "$HOME/bin" ]; then
        ln -sf "$BIN_DIR/vkm" "$HOME/bin/vkm"
        print_success "Linked to ~/bin/vkm"
    fi
    
    # Add to PATH if needed
    if ! command -v vkm &> /dev/null; then
        if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
            print_warning "Added ~/.local/bin to PATH. Run 'source ~/.bashrc' to apply."
        fi
    fi
    
    print_success "VKM installed successfully"
}

setup_systemd() {
    print_status "Setting up systemd service..."
    
    # Reload systemd
    systemctl --user daemon-reload
    
    print_success "Systemd service configured"
    print_status "To enable VKM on boot: systemctl --user enable vkm-monitor.service"
    print_status "To start now: systemctl --user start vkm-monitor.service"
}

run_init() {
    print_status "Running VKM initialization..."
    
    if command -v vkm &> /dev/null; then
        vkm init
    else
        "$BIN_DIR/vkm" init
    fi
    
    print_success "VKM initialized"
}

configure_kiro() {
    print_status "Checking Kiro Gateway..."
    
    if [ -d "$HOME/kiro-gateway" ]; then
        print_success "Kiro Gateway already installed"
    else
        print_status "Kiro Gateway will be cloned on first use"
    fi
}

print_next_steps() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  Installation Complete!                      ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Quick Start:"
    echo "  1. Add your first API key:    vkm key-add"
    echo "  2. Check status:              vkm status"
    echo "  3. Start monitor:             vkm monitor"
    echo "  4. Enable boot startup:       systemctl --user enable vkm-monitor.service"
    echo ""
    echo "Useful Commands:"
    echo "  vkm service-list              # List all supported services"
    echo "  vkm integration-list          # List available integrations"
    echo "  vkm cycle-create              # Create key rotation cycle"
    echo "  vkm kiro-enable               # Enable Kiro proxy for Claude Sonnet"
    echo ""
    echo "Documentation:"
    echo "  vkm help                      # Show full help"
    echo "  vkm logs                      # View monitor logs"
    echo ""
}

# Main installation
main() {
    print_banner
    
    check_dependencies
    install_vkm
    setup_systemd
    run_init
    configure_kiro
    
    print_next_steps
}

# Handle uninstall
if [ "$1" == "--uninstall" ] || [ "$1" == "-u" ]; then
    print_status "Uninstalling VKM..."
    
    # Stop and disable service
    systemctl --user stop vkm-monitor.service 2>/dev/null || true
    systemctl --user disable vkm-monitor.service 2>/dev/null || true
    
    # Remove files
    rm -rf "$VKM_DIR"
    rm -f "$HOME/.local/bin/vkm"
    rm -f "$HOME/bin/vkm"
    rm -f "$SYSTEMD_DIR/vkm-monitor.service"
    
    systemctl --user daemon-reload
    
    print_success "VKM uninstalled"
    exit 0
fi

# Handle update
if [ "$1" == "--update" ] || [ "$1" == "-U" ]; then
    print_status "Updating VKM..."
    install_vkm
    setup_systemd
    print_success "VKM updated"
    exit 0
fi

# Run main installation
main
