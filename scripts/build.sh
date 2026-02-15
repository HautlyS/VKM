#!/bin/bash
#
# VKM Build Script
# Compiles VKM and VKM-TUI into standalone executables
# Supports: Linux (x64, arm64), macOS (x64, arm64), Windows (x64)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build"
DIST_DIR="$PROJECT_DIR/dist"
VERSION=$(node -p "require('$PROJECT_DIR/vkm/package.json').version" 2>/dev/null || echo "2.0.1")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
    echo -e "${CYAN}"
    echo "╭──────────────────────────────────────────────────────────────────────╮"
    echo "│                        VKM Build System                              │"
    echo "│                    Version: $VERSION                                 │"
    echo "╰──────────────────────────────────────────────────────────────────────╯"
    echo -e "${NC}"
}

print_status() {
    echo -e "${BLUE}[●]${NC} $1"
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
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm --version)"
    
    # Install pkg if not present
    if ! command -v pkg &> /dev/null; then
        print_status "Installing pkg (vercel/pkg)..."
        npm install -g pkg
    fi
    print_success "pkg available"
}

prepare_directories() {
    print_status "Preparing directories..."
    
    rm -rf "$BUILD_DIR"
    rm -rf "$DIST_DIR"
    
    mkdir -p "$BUILD_DIR"
    mkdir -p "$DIST_DIR"
    mkdir -p "$DIST_DIR"/{linux-x64,linux-arm64,macos-x64,macos-arm64,windows-x64}
    
    print_success "Directories prepared"
}

install_build_dependencies() {
    print_status "Installing build dependencies..."
    
    # Create package.json for build
    cat > "$BUILD_DIR/package.json" << EOF
{
  "name": "vkm-build",
  "version": "$VERSION",
  "dependencies": {}
}
EOF
    
    # Install pkg locally for build
    cd "$BUILD_DIR"
    npm install pkg --save-dev
    
    print_success "Build dependencies installed"
}

build_vkm_core() {
    print_status "Building VKM Core..."
    
    local PKG_CMD="$BUILD_DIR/node_modules/.bin/pkg"
    
    # Copy source files
    mkdir -p "$BUILD_DIR/vkm-core"
    cp -r "$PROJECT_DIR/vkm/bin" "$BUILD_DIR/vkm-core/"
    cp -r "$PROJECT_DIR/vkm/systemd" "$BUILD_DIR/vkm-core/"
    
    # Build for each platform
    local PLATFORMS=(
        "node18-linux-x64"
        "node18-linux-arm64"
        "node18-macos-x64"
        "node18-macos-arm64"
        "node18-win-x64"
    )
    
    local OUTPUT_DIRS=(
        "linux-x64"
        "linux-arm64"
        "macos-x64"
        "macos-arm64"
        "windows-x64"
    )
    
    local OUTPUT_NAMES=(
        "vkm"
        "vkm"
        "vkm"
        "vkm"
        "vkm.exe"
    )
    
    for i in "${!PLATFORMS[@]}"; do
        local platform="${PLATFORMS[$i]}"
        local output_dir="${OUTPUT_DIRS[$i]}"
        local output_name="${OUTPUT_NAMES[$i]}"
        
        print_status "Building for $platform..."
        
        $PKG_CMD "$BUILD_DIR/vkm-core/bin/vkm" \
            --targets "$platform" \
            --output "$DIST_DIR/$output_dir/$output_name" \
            --compress GZip \
            2>/dev/null || {
                print_warning "Build for $platform may have issues"
            }
        
        # Copy supporting files
        cp -r "$BUILD_DIR/vkm-core/systemd" "$DIST_DIR/$output_dir/" 2>/dev/null || true
        cp "$PROJECT_DIR/README.md" "$DIST_DIR/$output_dir/" 2>/dev/null || true
        cp "$PROJECT_DIR/LICENSE" "$DIST_DIR/$output_dir/" 2>/dev/null || true
        cp "$PROJECT_DIR/CHANGELOG.md" "$DIST_DIR/$output_dir/" 2>/dev/null || true
        
        print_success "Built: $output_dir/$output_name"
    done
}

build_vkm_tui() {
    print_status "Building VKM TUI..."
    
    local PKG_CMD="$BUILD_DIR/node_modules/.bin/pkg"
    
    # Copy TUI files and install dependencies
    mkdir -p "$BUILD_DIR/vkm-tui"
    cp -r "$PROJECT_DIR/vkm-tui/src" "$BUILD_DIR/vkm-tui/"
    cp -r "$PROJECT_DIR/vkm-tui/templates" "$BUILD_DIR/vkm-tui/"
    cp "$PROJECT_DIR/vkm-tui/package.json" "$BUILD_DIR/vkm-tui/"
    
    cd "$BUILD_DIR/vkm-tui"
    npm install --silent 2>/dev/null || true
    
    # Build for each platform
    local PLATFORMS=(
        "node18-linux-x64"
        "node18-linux-arm64"
        "node18-macos-x64"
        "node18-macos-arm64"
        "node18-win-x64"
    )
    
    local OUTPUT_DIRS=(
        "linux-x64"
        "linux-arm64"
        "macos-x64"
        "macos-arm64"
        "windows-x64"
    )
    
    local OUTPUT_NAMES=(
        "vkm-tui"
        "vkm-tui"
        "vkm-tui"
        "vkm-tui"
        "vkm-tui.exe"
    )
    
    for i in "${!PLATFORMS[@]}"; do
        local platform="${PLATFORMS[$i]}"
        local output_dir="${OUTPUT_DIRS[$i]}"
        local output_name="${OUTPUT_NAMES[$i]}"
        
        print_status "Building TUI for $platform..."
        
        $PKG_CMD "$BUILD_DIR/vkm-tui/src/vkm-tui.js" \
            --targets "$platform" \
            --output "$DIST_DIR/$output_dir/$output_name" \
            --compress GZip \
            --config "$BUILD_DIR/vkm-tui/package.json" \
            2>/dev/null || {
                print_warning "TUI build for $platform may have issues"
            }
        
        # Copy templates to output
        mkdir -p "$DIST_DIR/$output_dir/templates"
        cp -r "$BUILD_DIR/vkm-tui/templates/"* "$DIST_DIR/$output_dir/templates/" 2>/dev/null || true
        
        print_success "Built TUI: $output_dir/$output_name"
    done
}

create_install_scripts() {
    print_status "Creating install scripts..."
    
    # Linux/macOS install script
    for dir in linux-x64 linux-arm64 macos-x64 macos-arm64; do
        cat > "$DIST_DIR/$dir/install.sh" << 'INSTALL_EOF'
#!/bin/bash
# VKM Installation Script

set -e

VKM_DIR="$HOME/.vkm"
BIN_DIR="$VKM_DIR/bin"

echo "Installing VKM..."

# Create directories
mkdir -p "$BIN_DIR"
mkdir -p "$HOME/.config/systemd/user"

# Copy executables
cp vkm "$BIN_DIR/vkm"
chmod +x "$BIN_DIR/vkm"

# Copy TUI if exists
if [ -f vkm-tui ]; then
    cp vkm-tui "$BIN_DIR/vkm-tui"
    chmod +x "$BIN_DIR/vkm-tui"
    mkdir -p "$VKM_DIR/vkm-tui/templates"
    cp -r templates/* "$VKM_DIR/vkm-tui/templates/" 2>/dev/null || true
fi

# Copy systemd service
cp systemd/vkm-monitor.service "$HOME/.config/systemd/user/" 2>/dev/null || true

# Create symlink
if [ -d "$HOME/.local/bin" ]; then
    ln -sf "$BIN_DIR/vkm" "$HOME/.local/bin/vkm"
    ln -sf "$BIN_DIR/vkm-tui" "$HOME/.local/bin/vkm-tui" 2>/dev/null || true
fi

# Initialize
"$BIN_DIR/vkm" init

echo "✓ VKM installed successfully!"
echo "Run: vkm --help"
INSTALL_EOF
        chmod +x "$DIST_DIR/$dir/install.sh"
    done
    
    # Windows install script
    cat > "$DIST_DIR/windows-x64/install.bat" << 'INSTALL_EOF'
@echo off
REM VKM Installation Script for Windows

set VKM_DIR=%USERPROFILE%\.vkm
set BIN_DIR=%VKM_DIR%\bin

echo Installing VKM...

REM Create directories
if not exist "%VKM_DIR%" mkdir "%VKM_DIR%"
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

REM Copy executables
copy vkm.exe "%BIN_DIR%\vkm.exe" >nul

REM Copy TUI if exists
if exist vkm-tui.exe (
    copy vkm-tui.exe "%BIN_DIR%\vkm-tui.exe" >nul
)

REM Copy templates
if not exist "%VKM_DIR%\vkm-tui\templates" mkdir "%VKM_DIR%\vkm-tui\templates"
xcopy /E /Y templates "%VKM_DIR%\vkm-tui\templates\" >nul 2>nul

REM Add to PATH (user level)
setx PATH "%PATH%;%BIN_DIR%" >nul 2>nul

echo.
echo VKM installed successfully!
echo Location: %BIN_DIR%
echo.
echo Run: vkm --help
INSTALL_EOF
    
    print_success "Install scripts created"
}

create_archives() {
    print_status "Creating distribution archives..."
    
    cd "$DIST_DIR"
    
    for dir in linux-x64 linux-arm64 macos-x64 macos-arm64 windows-x64; do
        if [ -d "$dir" ]; then
            tar -czvf "vkm-$VERSION-$dir.tar.gz" "$dir" 2>/dev/null || true
            zip -r "vkm-$VERSION-$dir.zip" "$dir" 2>/dev/null || true
            print_success "Created: vkm-$VERSION-$dir.tar.gz"
        fi
    done
    
    cd "$PROJECT_DIR"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                     Build Complete!                               ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Outputs:${NC}"
    ls -la "$DIST_DIR"/*.tar.gz 2>/dev/null | awk '{print "  " $NF " (" $5 " bytes)"}' || echo "  (no archives)"
    echo ""
    echo -e "${CYAN}Platforms:${NC}"
    echo "  • linux-x64      - Linux (x86_64)"
    echo "  • linux-arm64    - Linux (ARM64/Apple Silicon via Rosetta)"
    echo "  • macos-x64      - macOS (Intel)"
    echo "  • macos-arm64    - macOS (Apple Silicon)"
    echo "  • windows-x64    - Windows (x86_64)"
    echo ""
    echo -e "${CYAN}Distribution files:${NC}"
    echo "  $DIST_DIR/"
    echo ""
}

# Parse arguments
CLEAN_ONLY=false
SKIP_TUI=false

for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN_ONLY=true
            ;;
        --skip-tui)
            SKIP_TUI=true
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --clean      Clean build directories only"
            echo "  --skip-tui   Skip building TUI"
            echo "  --help, -h   Show this help"
            exit 0
            ;;
    esac
done

# Main build process
main() {
    print_banner
    
    if [ "$CLEAN_ONLY" = true ]; then
        print_status "Cleaning build directories..."
        rm -rf "$BUILD_DIR" "$DIST_DIR"
        print_success "Cleaned"
        exit 0
    fi
    
    check_dependencies
    prepare_directories
    install_build_dependencies
    build_vkm_core
    
    if [ "$SKIP_TUI" = false ]; then
        build_vkm_tui
    fi
    
    create_install_scripts
    create_archives
    print_summary
}

main