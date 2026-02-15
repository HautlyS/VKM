#!/usr/bin/env node
/**
 * VKM Cross-Platform Build Script
 * Builds VKM executables for multiple platforms
 * 
 * Usage:
 *   node scripts/build.js [options]
 * 
 * Options:
 *   --platform <platform>  Build for specific platform (linux, mac, windows, all)
 *   --skip-tui             Skip building TUI
 *   --clean                Clean build directories
 *   --version              Show version
 *   --help                 Show help
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_DIR, 'build');
const DIST_DIR = path.join(PROJECT_DIR, 'dist');

let VERSION = '2.0.1';
try {
  const pkg = require(path.join(PROJECT_DIR, 'vkm', 'package.json'));
  VERSION = pkg.version;
} catch (e) {}

const PLATFORMS = {
  'linux-x64': {
    target: 'node18-linux-x64',
    output: 'vkm',
    tuiOutput: 'vkm-tui',
    archive: 'tar.gz'
  },
  'linux-arm64': {
    target: 'node18-linux-arm64',
    output: 'vkm',
    tuiOutput: 'vkm-tui',
    archive: 'tar.gz'
  },
  'macos-x64': {
    target: 'node18-macos-x64',
    output: 'vkm',
    tuiOutput: 'vkm-tui',
    archive: 'tar.gz'
  },
  'macos-arm64': {
    target: 'node18-macos-arm64',
    output: 'vkm',
    tuiOutput: 'vkm-tui',
    archive: 'tar.gz'
  },
  'windows-x64': {
    target: 'node18-win-x64',
    output: 'vkm.exe',
    tuiOutput: 'vkm-tui.exe',
    archive: 'zip'
  }
};

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function printBanner() {
  log(`
╭──────────────────────────────────────────────────────────────────────╮
│                        VKM Build System                               │
│                         Version: ${VERSION}                              │
╰──────────────────────────────────────────────────────────────────────╯
`, 'cyan');
}

function checkDependencies() {
  log('[●] Checking dependencies...', 'blue');
  
  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    log('[✗] Node.js 16+ required', 'red');
    process.exit(1);
  }
  log(`[✓] Node.js ${nodeVersion}`, 'green');
  
  // Check pkg
  try {
    execSync('pkg --version', { stdio: 'ignore' });
    log('[✓] pkg available', 'green');
  } catch {
    log('[●] Installing pkg...', 'blue');
    execSync('npm install -g pkg', { stdio: 'inherit' });
    log('[✓] pkg installed', 'green');
  }
}

function clean() {
  log('[●] Cleaning build directories...', 'blue');
  
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  }
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  
  log('[✓] Cleaned', 'green');
}

function prepareDirectories(platforms) {
  log('[●] Preparing directories...', 'blue');
  
  clean();
  
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  
  for (const platform of platforms) {
    fs.mkdirSync(path.join(DIST_DIR, platform), { recursive: true });
    fs.mkdirSync(path.join(DIST_DIR, platform, 'templates'), { recursive: true });
  }
  
  log('[✓] Directories prepared', 'green');
}

function buildVKMCore(platforms) {
  log('[●] Building VKM Core...', 'blue');
  
  // Copy source files
  const coreDir = path.join(BUILD_DIR, 'vkm-core');
  fs.mkdirSync(coreDir, { recursive: true });
  
  // Copy bin
  const binSrc = path.join(PROJECT_DIR, 'vkm', 'bin');
  const binDst = path.join(coreDir, 'bin');
  fs.mkdirSync(binDst, { recursive: true });
  fs.readdirSync(binSrc).forEach(file => {
    fs.copyFileSync(path.join(binSrc, file), path.join(binDst, file));
  });
  
  // Copy systemd
  const systemdSrc = path.join(PROJECT_DIR, 'vkm', 'systemd');
  if (fs.existsSync(systemdSrc)) {
    const systemdDst = path.join(coreDir, 'systemd');
    fs.mkdirSync(systemdDst, { recursive: true });
    fs.readdirSync(systemdSrc).forEach(file => {
      fs.copyFileSync(path.join(systemdSrc, file), path.join(systemdDst, file));
    });
  }
  
  // Build for each platform
  for (const platformId of platforms) {
    const platform = PLATFORMS[platformId];
    const outputDir = path.join(DIST_DIR, platformId);
    
    log(`[●] Building for ${platformId}...`, 'blue');
    
    try {
      execSync(`pkg "${path.join(coreDir, 'bin', 'vkm')}" --targets ${platform.target} --output "${path.join(outputDir, platform.output)}" --compress GZip`, {
        stdio: 'pipe'
      });
      log(`[✓] Built: ${platformId}/${platform.output}`, 'green');
    } catch (err) {
      log(`[!] Build for ${platformId} may have issues`, 'yellow');
    }
    
    // Copy supporting files
    if (fs.existsSync(systemdSrc)) {
      const systemdOut = path.join(outputDir, 'systemd');
      fs.mkdirSync(systemdOut, { recursive: true });
      fs.readdirSync(systemdSrc).forEach(file => {
        fs.copyFileSync(path.join(systemdSrc, file), path.join(systemdOut, file));
      });
    }
    
    // Copy docs
    const docFiles = ['README.md', 'LICENSE', 'CHANGELOG.md'];
    docFiles.forEach(file => {
      const src = path.join(PROJECT_DIR, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(outputDir, file));
      }
    });
  }
}

function buildVKMTUI(platforms) {
  log('[●] Building VKM TUI...', 'blue');
  
  // Copy TUI files
  const tuiDir = path.join(BUILD_DIR, 'vkm-tui');
  fs.mkdirSync(tuiDir, { recursive: true });
  
  const tuiSrc = path.join(PROJECT_DIR, 'vkm-tui');
  const tuiDirs = ['src', 'templates'];
  
  tuiDirs.forEach(dir => {
    const src = path.join(tuiSrc, dir);
    const dst = path.join(tuiDir, dir);
    if (fs.existsSync(src)) {
      fs.mkdirSync(dst, { recursive: true });
      copyDirRecursive(src, dst);
    }
  });
  
  // Copy package.json
  fs.copyFileSync(
    path.join(tuiSrc, 'package.json'),
    path.join(tuiDir, 'package.json')
  );
  
  // Install dependencies
  log('[●] Installing TUI dependencies...', 'blue');
  try {
    execSync('npm install --silent', { cwd: tuiDir, stdio: 'pipe' });
  } catch (err) {
    log('[!] TUI dependency install may have issues', 'yellow');
  }
  
  // Build for each platform
  for (const platformId of platforms) {
    const platform = PLATFORMS[platformId];
    const outputDir = path.join(DIST_DIR, platformId);
    
    log(`[●] Building TUI for ${platformId}...`, 'blue');
    
    try {
      execSync(`pkg "${path.join(tuiDir, 'src', 'vkm-tui.js')}" --targets ${platform.target} --output "${path.join(outputDir, platform.tuiOutput)}" --compress GZip --config "${path.join(tuiDir, 'package.json')}"`, {
        stdio: 'pipe'
      });
      log(`[✓] Built TUI: ${platformId}/${platform.tuiOutput}`, 'green');
    } catch (err) {
      log(`[!] TUI build for ${platformId} may have issues`, 'yellow');
    }
    
    // Copy templates
    const templatesSrc = path.join(tuiDir, 'templates');
    const templatesDst = path.join(outputDir, 'templates');
    if (fs.existsSync(templatesSrc)) {
      fs.mkdirSync(templatesDst, { recursive: true });
      copyDirRecursive(templatesSrc, templatesDst);
    }
  }
}

function copyDirRecursive(src, dst) {
  fs.readdirSync(src).forEach(entry => {
    const srcPath = path.join(src, entry);
    const dstPath = path.join(dst, entry);
    
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true });
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  });
}

function createInstallScripts(platforms) {
  log('[●] Creating install scripts...', 'blue');
  
  // Unix install script
  const unixInstall = `#!/bin/bash
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
`;

  // Windows install script
  const windowsInstall = `@echo off
REM VKM Installation Script for Windows

set VKM_DIR=%USERPROFILE%\\.vkm
set BIN_DIR=%VKM_DIR%\\bin

echo Installing VKM...

REM Create directories
if not exist "%VKM_DIR%" mkdir "%VKM_DIR%"
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

REM Copy executables
copy vkm.exe "%BIN_DIR%\\vkm.exe" >nul

REM Copy TUI if exists
if exist vkm-tui.exe (
    copy vkm-tui.exe "%BIN_DIR%\\vkm-tui.exe" >nul
)

REM Copy templates
if not exist "%VKM_DIR%\\vkm-tui\\templates" mkdir "%VKM_DIR%\\vkm-tui\\templates"
xcopy /E /Y templates "%VKM_DIR%\\vkm-tui\\templates\\" >nul 2>nul

REM Add to PATH
setx PATH "%PATH%;%BIN_DIR%" >nul 2>nul

echo.
echo VKM installed successfully!
echo Location: %BIN_DIR%
echo.
echo Run: vkm --help
`;

  for (const platformId of platforms) {
    const outputDir = path.join(DIST_DIR, platformId);
    
    if (platformId === 'windows-x64') {
      fs.writeFileSync(path.join(outputDir, 'install.bat'), windowsInstall);
    } else {
      const installPath = path.join(outputDir, 'install.sh');
      fs.writeFileSync(installPath, unixInstall);
      fs.chmodSync(installPath, 0o755);
    }
  }
  
  log('[✓] Install scripts created', 'green');
}

function createArchives(platforms) {
  log('[●] Creating distribution archives...', 'blue');
  
  for (const platformId of platforms) {
    const platform = PLATFORMS[platformId];
    const outputDir = path.join(DIST_DIR, platformId);
    
    if (platform.archive === 'zip') {
      // Create zip (Windows)
      const archivePath = path.join(DIST_DIR, `vkm-${VERSION}-${platformId}.zip`);
      try {
        if (process.platform === 'win32') {
          execSync(`powershell -Command "Compress-Archive -Path '${outputDir}\\*' -DestinationPath '${archivePath}' -Force"`, { stdio: 'pipe' });
        } else {
          execSync(`cd "${DIST_DIR}" && zip -r "${archivePath}" "${platformId}"`, { stdio: 'pipe' });
        }
        log(`[✓] Created: vkm-${VERSION}-${platformId}.zip`, 'green');
      } catch (err) {
        log(`[!] Could not create archive for ${platformId}`, 'yellow');
      }
    } else {
      // Create tar.gz (Unix)
      const archivePath = path.join(DIST_DIR, `vkm-${VERSION}-${platformId}.tar.gz`);
      try {
        execSync(`cd "${DIST_DIR}" && tar -czvf "${archivePath}" "${platformId}"`, { stdio: 'pipe' });
        log(`[✓] Created: vkm-${VERSION}-${platformId}.tar.gz`, 'green');
      } catch (err) {
        log(`[!] Could not create archive for ${platformId}`, 'yellow');
      }
    }
  }
}

function printSummary() {
  log(`
╔══════════════════════════════════════════════════════════════════╗
║                     Build Complete!                               ║
╚══════════════════════════════════════════════════════════════════╝
`, 'green');
  
  log('Outputs:', 'cyan');
  
  const archives = fs.readdirSync(DIST_DIR).filter(f => 
    f.endsWith('.tar.gz') || f.endsWith('.zip')
  );
  
  archives.forEach(archive => {
    const stats = fs.statSync(path.join(DIST_DIR, archive));
    const size = (stats.size / 1024).toFixed(2);
    log(`  ${archive} (${size} KB)`, 'reset');
  });
  
  log('\nPlatforms:', 'cyan');
  log('  • linux-x64      - Linux (x86_64)', 'reset');
  log('  • linux-arm64    - Linux (ARM64)', 'reset');
  log('  • macos-x64      - macOS (Intel)', 'reset');
  log('  • macos-arm64    - macOS (Apple Silicon)', 'reset');
  log('  • windows-x64    - Windows (x86_64)', 'reset');
  
  log(`\nDistribution files:`, 'cyan');
  log(`  ${DIST_DIR}/\n`, 'reset');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    platform: 'all',
    skipTui: false,
    clean: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--platform':
        options.platform = args[++i];
        break;
      case '--skip-tui':
        options.skipTui = true;
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--version':
      case '-v':
        console.log(`vkm-build ${VERSION}`);
        process.exit(0);
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }
  
  return options;
}

function printHelp() {
  console.log(`
VKM Cross-Platform Build Script

Usage: node scripts/build.js [options]

Options:
  --platform <platform>  Build for specific platform
                          - linux    (linux-x64, linux-arm64)
                          - mac      (macos-x64, macos-arm64)
                          - windows  (windows-x64)
                          - all      (default)
  --skip-tui             Skip building TUI
  --clean                Clean build directories only
  --version, -v         Show version
  --help, -h             Show this help

Examples:
  node scripts/build.js                    # Build all platforms
  node scripts/build.js --platform linux   # Build Linux only
  node scripts/build.js --clean            # Clean only

Version: ${VERSION}
`);
}

// Main
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  printBanner();
  
  if (options.clean) {
    clean();
    return;
  }
  
  checkDependencies();
  
  // Determine platforms to build
  let platforms;
  if (options.platform === 'all') {
    platforms = Object.keys(PLATFORMS);
  } else if (options.platform === 'linux') {
    platforms = ['linux-x64', 'linux-arm64'];
  } else if (options.platform === 'mac') {
    platforms = ['macos-x64', 'macos-arm64'];
  } else if (options.platform === 'windows') {
    platforms = ['windows-x64'];
  } else {
    platforms = [options.platform].filter(p => PLATFORMS[p]);
  }
  
  if (platforms.length === 0) {
    log('[✗] No valid platforms specified', 'red');
    process.exit(1);
  }
  
  prepareDirectories(platforms);
  buildVKMCore(platforms);
  
  if (!options.skipTui) {
    buildVKMTUI(platforms);
  }
  
  createInstallScripts(platforms);
  createArchives(platforms);
  printSummary();
}

main().catch(err => {
  log(`[✗] Build failed: ${err.message}`, 'red');
  process.exit(1);
});