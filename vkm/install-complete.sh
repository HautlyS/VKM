#!/bin/bash
#
# VKM + TUI Complete Installation Script
# Installs both VKM and the Node-based TUI
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

VKM_DIR="$HOME/.vkm"
VKM_TUI_DIR="${VKM_DIR}/vkm-tui"
INSTALL_SOURCE="${1:-/home/ubuntu/vkm}"
TUI_SOURCE="${2:-/home/ubuntu/vkm-tui}"

print_banner() {
    echo -e "${CYAN}"
    echo "╭──────────────────────────────────────────────────────────────────────────╮"
    echo "│                                                                          │"
    echo "│     ██╗   ██╗██╗  ██╗███╗   ███╗     ████████╗██╗   ██╗██╗               │"
    echo "│     ██║   ██║██║ ██╔╝████╗ ████║     ╚══██╔══╝██║   ██║██║               │"
    echo "│     ██║   ██║█████╔╝ ██╔████╔██║        ██║   ██║   ██║██║               │"
    echo "│     ╚██╗ ██╔╝██╔═██╗ ██║╚██╔╝██║        ██║   ██║   ██║██║               │"
    echo "│      ╚████╔╝ ██║  ██╗██║ ╚═╝ ██║        ██║   ╚██████╔╝███████╗          │"
    echo "│       ╚═══╝  ╚═╝  ╚═╝╚═╝     ╚═╝        ╚═╝    ╚═════╝ ╚══════╝          │"
    echo "│                                                                          │"
    echo "│           Virtual Key Manager + Node Visual Editor                       │"
    echo "│                    Jack Audio Style Routing                              │"
    echo "╰──────────────────────────────────────────────────────────────────────────╯"
    echo -e "${NC}"
    echo ""
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
        echo "Please install Node.js 16+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16+ required (found: $(node --version))"
        exit 1
    fi
    
    print_success "Node.js $(node --version) ✓"
}

install_vkm() {
    print_status "Installing VKM core..."
    
    # Create directories
    mkdir -p "$VKM_DIR"/{bin,lib,integrations,systemd,sessions}
    
    # Copy VKM binary
    if [ -f "$INSTALL_SOURCE/bin/vkm" ]; then
        cp "$INSTALL_SOURCE/bin/vkm" "$VKM_DIR/bin/vkm"
        chmod +x "$VKM_DIR/bin/vkm"
        
        # Create symlinks
        if [ -d "$HOME/.local/bin" ]; then
            ln -sf "$VKM_DIR/bin/vkm" "$HOME/.local/bin/vkm"
        elif [ -d "$HOME/bin" ]; then
            ln -sf "$VKM_DIR/bin/vkm" "$HOME/bin/vkm"
        fi
        
        # Try system path
        if [ -w "/usr/local/bin" ]; then
            cp "$VKM_DIR/bin/vkm" /usr/local/bin/vkm
            print_success "Installed to /usr/local/bin/vkm"
        else
            print_warning "Cannot write to /usr/local/bin (need sudo)"
            print_status "VKM installed to ~/.vkm/bin/vkm"
        fi
    else
        print_error "VKM binary not found in $INSTALL_SOURCE/bin/"
        exit 1
    fi
    
    print_success "VKM core installed"
}

install_vkm_tui() {
    print_status "Installing VKM TUI (Node Editor)..."
    
    # Copy TUI files
    if [ -d "$TUI_SOURCE" ]; then
        mkdir -p "$VKM_TUI_DIR"
        cp -r "$TUI_SOURCE"/* "$VKM_TUI_DIR/"
        chmod +x "$VKM_TUI_DIR/bin/vkm-tui"
        
        # Create symlink
        if [ -d "$HOME/.local/bin" ]; then
            ln -sf "$VKM_TUI_DIR/bin/vkm-tui" "$HOME/.local/bin/vkm-tui"
        fi
        
        print_success "VKM TUI installed"
        print_status "TUI Location: $VKM_TUI_DIR"
    else
        print_warning "TUI source not found at $TUI_SOURCE"
        print_status "TUI will be installed on first 'vkm tui' run"
    fi
}

setup_systemd() {
    print_status "Setting up systemd service..."
    
    SYSTEMD_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SYSTEMD_DIR"
    
    cat > "$SYSTEMD_DIR/vkm-monitor.service" << 'EOF'
[Unit]
Description=Virtual Key Manager Monitor
After=network.target

[Service]
Type=simple
ExecStart=%h/.vkm/bin/vkm monitor-daemon
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF
    
    systemctl --user daemon-reload 2>/dev/null || true
    
    print_success "Systemd service configured"
}

initialize_vkm() {
    print_status "Initializing VKM..."
    
    if command -v vkm &> /dev/null; then
        vkm init
    else
        "$VKM_DIR/bin/vkm" init
    fi
    
    print_success "VKM initialized"
}

install_tui_dependencies() {
    if [ -d "$VKM_TUI_DIR" ] && [ -f "$VKM_TUI_DIR/package.json" ]; then
        print_status "Installing TUI dependencies..."
        cd "$VKM_TUI_DIR"
        
        if npm install neo-blessed --silent 2>/dev/null; then
            print_success "TUI dependencies installed"
        else
            print_warning "Failed to install TUI dependencies automatically"
            print_status "Run: cd $VKM_TUI_DIR && npm install"
        fi
    fi
}

print_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Installation Complete!                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Quick Start:${NC}"
    echo ""
    echo "  1. Launch Visual Editor:"
    echo -e "     ${YELLOW}vkm tui${NC}"
    echo ""
    echo "  2. Or use CLI commands:"
    echo -e "     ${YELLOW}vkm key-add${NC}           # Add API keys"
    echo -e "     ${YELLOW}vkm template-list${NC}     # See available templates"
    echo -e "     ${YELLOW}vkm tui${NC}               # Visual editor"
    echo ""
    echo "  3. Start background monitor:"
    echo -e "     ${YELLOW}vkm monitor${NC}"
    echo -e "     ${YELLOW}systemctl --user enable vkm-monitor.service${NC}"
    echo ""
    echo -e "${CYAN}Templates (press number in TUI):${NC}"
    echo "  1: 🧠 ALL GLM-5 MODAL"
    echo "  2: 🔮 ALL KIRO PROXY 4.5"
    echo "  3: ⚡ Multi-Model Ensemble"
    echo "  4: 🔗 Fallback Chain"
    echo "  5: 🔄 Round Robin Load Balancer"
    echo ""
    echo -e "${CYAN}Features:${NC}"
    echo "  • Jack Audio-style node connections"
    echo "  • Visual session routing"
    echo "  • Pre-built templates"
    echo "  • Drag & drop interface"
    echo "  • Real-time monitoring"
    echo ""
    echo -e "${CYAN}Documentation:${NC}"
    echo "  vkm help              # Show all commands"
    echo "  vkm-tui --help        # TUI help"
    echo "  $VKM_TUI_DIR/README.md"
    echo ""
    
    # Check if path needs update
    if ! command -v vkm &> /dev/null; then
        echo -e "${YELLOW}Note: Please add ~/.local/bin to your PATH:${NC}"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
        echo "  # Add to ~/.bashrc or ~/.zshrc"
        echo ""
    fi
}

# Main installation
main() {
    print_banner
    
    check_dependencies
    install_vkm
    install_vkm_tui
    setup_systemd
    initialize_vkm
    install_tui_dependencies
    
    print_next_steps
}

# Handle uninstall
if [ "$1" == "--uninstall" ] || [ "$1" == "-u" ]; then
    print_status "Uninstalling VKM + TUI..."
    
    # Stop services
    systemctl --user stop vkm-monitor.service 2>/dev/null || true
    systemctl --user disable vkm-monitor.service 2>/dev/null || true
    
    # Remove files
    rm -rf "$VKM_DIR"
    rm -f "$HOME/.local/bin/vkm"
    rm -f "$HOME/.local/bin/vkm-tui"
    rm -f "$HOME/bin/vkm"
    rm -f "$HOME/bin/vkm-tui"
    
    # Try to remove from system path
    if [ -w "/usr/local/bin/vkm" ]; then
        rm -f /usr/local/bin/vkm
    fi
    
    systemctl --user daemon-reload 2>/dev/null || true
    
    print_success "VKM + TUI uninstalled"
    exit 0
fi

# Handle update
if [ "$1" == "--update" ] || [ "$1" == "-U" ]; then
    print_status "Updating VKM + TUI..."
    install_vkm
    install_vkm_tui
    print_success "Update complete"
    exit 0
fi

# Run main installation
main
