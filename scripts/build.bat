@echo off
REM VKM Build Script for Windows
REM Compiles VKM and VKM-TUI into standalone executables
REM Supports: Windows (x64), Linux (x64, arm64), macOS (x64, arm64)

setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..


REM Parse package.json version
set VERSION=2.0.1
if exist "%PROJECT_DIR%\vkm\package.json" (
    for /f "tokens=2 delims=:," %%v in ('findstr "version" "%PROJECT_DIR%\vkm\package.json"') do (
        set VERSION=%%v
        set VERSION=!VERSION:"=!
        set VERSION=!VERSION: =!
    )
)

set BUILD_DIR=%PROJECT_DIR%\build
set DIST_DIR=%PROJECT_DIR%\dist

echo.
echo ================================================================
echo                     VKM Build System
echo                      Version: %VERSION%
echo ================================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed
    exit /b 1
)
echo [OK] Node.js installed

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed
    exit /b 1
)
echo [OK] npm installed

REM Check pkg
where pkg >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Installing pkg (vercel/pkg)...
    call npm install -g pkg
)
echo [OK] pkg available

REM Parse arguments
set CLEAN_ONLY=0
set SKIP_TUI=0
set TARGET_PLATFORM=win-x64

:parse_args
if "%~1"=="" goto :end_parse_args
if /i "%~1"=="--clean" set CLEAN_ONLY=1
if /i "%~1"=="--skip-tui" set SKIP_TUI=1
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
shift
goto :parse_args
:show_help
echo Usage: build.bat [options]
echo.
echo Options:
echo   --clean      Clean build directories only
echo   --skip-tui   Skip building TUI
echo   --help, -h   Show this help
exit /b 0
:end_parse_args

REM Clean only mode
if %CLEAN_ONLY% equ 1 (
    echo [INFO] Cleaning build directories...
    if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
    if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
    echo [OK] Cleaned
    exit /b 0
)

REM Prepare directories
echo [INFO] Preparing directories...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"

mkdir "%BUILD_DIR%"
mkdir "%DIST_DIR%"
mkdir "%DIST_DIR%\windows-x64"
mkdir "%DIST_DIR%\linux-x64"
mkdir "%DIST_DIR%\linux-arm64"
mkdir "%DIST_DIR%\macos-x64"
mkdir "%DIST_DIR%\macos-arm64"
echo [OK] Directories prepared

REM Build VKM Core
echo [INFO] Building VKM Core...

REM Copy source files
mkdir "%BUILD_DIR%\vkm-core"
xcopy /E /I /Y "%PROJECT_DIR%\vkm\bin" "%BUILD_DIR%\vkm-core\bin" >nul
xcopy /E /I /Y "%PROJECT_DIR%\vkm\systemd" "%BUILD_DIR%\vkm-core\systemd" >nul

REM Build Windows executable
echo [INFO] Building for Windows x64...
pkg "%BUILD_DIR%\vkm-core\bin\vkm" --targets node18-win-x64 --output "%DIST_DIR%\windows-x64\vkm.exe" --compress GZip 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Built: windows-x64/vkm.exe
) else (
    echo [WARN] Windows build may have issues
)

REM Build Linux executables
echo [INFO] Building for Linux x64...
pkg "%BUILD_DIR%\vkm-core\bin\vkm" --targets node18-linux-x64 --output "%DIST_DIR%\linux-x64\vkm" --compress GZip 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Built: linux-x64/vkm
) else (
    echo [WARN] Linux x64 build may have issues
)

echo [INFO] Building for Linux arm64...
pkg "%BUILD_DIR%\vkm-core\bin\vkm" --targets node18-linux-arm64 --output "%DIST_DIR%\linux-arm64\vkm" --compress GZip 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Built: linux-arm64/vkm
) else (
    echo [WARN] Linux arm64 build may have issues
)

REM Build macOS executables
echo [INFO] Building for macOS x64...
pkg "%BUILD_DIR%\vkm-core\bin\vkm" --targets node18-macos-x64 --output "%DIST_DIR%\macos-x64\vkm" --compress GZip 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Built: macos-x64/vkm
) else (
    echo [WARN] macOS x64 build may have issues
)

echo [INFO] Building for macOS arm64...
pkg "%BUILD_DIR%\vkm-core\bin\vkm" --targets node18-macos-arm64 --output "%DIST_DIR%\macos-arm64\vkm" --compress GZip 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Built: macos-arm64/vkm
) else (
    echo [WARN] macOS arm64 build may have issues
)

REM Copy supporting files to all platforms
for %%p in (windows-x64 linux-x64 linux-arm64 macos-x64 macos-arm64) do (
    xcopy /E /I /Y "%BUILD_DIR%\vkm-core\systemd" "%DIST_DIR%\%%p\systemd" >nul 2>nul
    copy "%PROJECT_DIR%\README.md" "%DIST_DIR%\%%p\" >nul 2>nul
    copy "%PROJECT_DIR%\LICENSE" "%DIST_DIR%\%%p\" >nul 2>nul
    copy "%PROJECT_DIR%\CHANGELOG.md" "%DIST_DIR%\%%p\" >nul 2>nul
)

REM Build TUI if not skipped
if %SKIP_TUI% equ 0 (
    echo [INFO] Building VKM TUI...
    
    mkdir "%BUILD_DIR%\vkm-tui"
    xcopy /E /I /Y "%PROJECT_DIR%\vkm-tui\src" "%BUILD_DIR%\vkm-tui\src" >nul
    xcopy /E /I /Y "%PROJECT_DIR%\vkm-tui\templates" "%BUILD_DIR%\vkm-tui\templates" >nul
    copy "%PROJECT_DIR%\vkm-tui\package.json" "%BUILD_DIR%\vkm-tui\" >nul
    
    pushd "%BUILD_DIR%\vkm-tui"
    call npm install --silent 2>nul
    popd
    
    REM Build TUI for all platforms
    echo [INFO] Building TUI for Windows x64...
    pkg "%BUILD_DIR%\vkm-tui\src\vkm-tui.js" --targets node18-win-x64 --output "%DIST_DIR%\windows-x64\vkm-tui.exe" --compress GZip --config "%BUILD_DIR%\vkm-tui\package.json" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Built TUI: windows-x64/vkm-tui.exe
    )
    
    echo [INFO] Building TUI for Linux x64...
    pkg "%BUILD_DIR%\vkm-tui\src\vkm-tui.js" --targets node18-linux-x64 --output "%DIST_DIR%\linux-x64\vkm-tui" --compress GZip --config "%BUILD_DIR%\vkm-tui\package.json" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Built TUI: linux-x64/vkm-tui
    )
    
    echo [INFO] Building TUI for Linux arm64...
    pkg "%BUILD_DIR%\vkm-tui\src\vkm-tui.js" --targets node18-linux-arm64 --output "%DIST_DIR%\linux-arm64\vkm-tui" --compress GZip --config "%BUILD_DIR%\vkm-tui\package.json" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Built TUI: linux-arm64/vkm-tui
    )
    
    echo [INFO] Building TUI for macOS x64...
    pkg "%BUILD_DIR%\vkm-tui\src\vkm-tui.js" --targets node18-macos-x64 --output "%DIST_DIR%\macos-x64\vkm-tui" --compress GZip --config "%BUILD_DIR%\vkm-tui\package.json" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Built TUI: macos-x64/vkm-tui
    )
    
    echo [INFO] Building TUI for macOS arm64...
    pkg "%BUILD_DIR%\vkm-tui\src\vkm-tui.js" --targets node18-macos-arm64 --output "%DIST_DIR%\macos-arm64\vkm-tui" --compress GZip --config "%BUILD_DIR%\vkm-tui\package.json" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Built TUI: macos-arm64/vkm-tui
    )
    
    REM Copy templates
    for %%p in (windows-x64 linux-x64 linux-arm64 macos-x64 macos-arm64) do (
        mkdir "%DIST_DIR%\%%p\templates"
        xcopy /E /Y "%BUILD_DIR%\vkm-tui\templates\*" "%DIST_DIR%\%%p\templates\" >nul 2>nul
    )
)

REM Create install scripts
echo [INFO] Creating install scripts...

REM Windows install script
(
echo @echo off
echo REM VKM Installation Script for Windows
echo.
echo set VKM_DIR=%%USERPROFILE%%\.vkm
echo set BIN_DIR=%%VKM_DIR%%\bin
echo.
echo echo Installing VKM...
echo.
echo REM Create directories
echo if not exist "%%VKM_DIR%%" mkdir "%%VKM_DIR%%"
echo if not exist "%%BIN_DIR%%" mkdir "%%BIN_DIR%%"
echo.
echo REM Copy executables
echo copy vkm.exe "%%BIN_DIR%%\vkm.exe" ^>nul
echo.
echo REM Copy TUI if exists
echo if exist vkm-tui.exe (
echo     copy vkm-tui.exe "%%BIN_DIR%%\vkm-tui.exe" ^>nul
echo ^)
echo.
echo REM Copy templates
echo if not exist "%%VKM_DIR%%\vkm-tui\templates" mkdir "%%VKM_DIR%%\vkm-tui\templates"
echo xcopy /E /Y templates "%%VKM_DIR%%\vkm-tui\templates\" ^>nul 2^>nul
echo.
echo REM Add to PATH
echo echo Adding to PATH...
echo setx PATH "%%PATH%%;%%BIN_DIR%%" ^>nul 2^>nul
echo.
echo echo.
echo echo VKM installed successfully!
echo echo Location: %%BIN_DIR%%
echo echo.
echo echo Run: vkm --help
) > "%DIST_DIR%\windows-x64\install.bat"

REM Create shell install scripts (for cross-platform)
(
echo #!/bin/bash
echo # VKM Installation Script
echo.
echo set -e
echo.
echo VKM_DIR="$HOME/.vkm"
echo BIN_DIR="$VKM_DIR/bin"
echo.
echo echo "Installing VKM..."
echo.
echo # Create directories
echo mkdir -p "$BIN_DIR"
echo mkdir -p "$HOME/.config/systemd/user"
echo.
echo # Copy executables
echo cp vkm "$BIN_DIR/vkm"
echo chmod +x "$BIN_DIR/vkm"
echo.
echo # Copy TUI if exists
echo if [ -f vkm-tui ]; then
echo     cp vkm-tui "$BIN_DIR/vkm-tui"
echo     chmod +x "$BIN_DIR/vkm-tui"
echo     mkdir -p "$VKM_DIR/vkm-tui/templates"
echo     cp -r templates/* "$VKM_DIR/vkm-tui/templates/" 2>/dev/null || true
echo fi
echo.
echo # Copy systemd service
echo cp systemd/vkm-monitor.service "$HOME/.config/systemd/user/" 2>/dev/null || true
echo.
echo # Create symlink
echo if [ -d "$HOME/.local/bin" ]; then
echo     ln -sf "$BIN_DIR/vkm" "$HOME/.local/bin/vkm"
echo     ln -sf "$BIN_DIR/vkm-tui" "$HOME/.local/bin/vkm-tui" 2>/dev/null || true
echo fi
echo.
echo # Initialize
echo "$BIN_DIR/vkm" init
echo.
echo echo "VKM installed successfully!"
echo echo "Run: vkm --help"
) > "%DIST_DIR%\linux-x64\install.sh"

copy "%DIST_DIR%\linux-x64\install.sh" "%DIST_DIR%\linux-arm64\install.sh" >nul
copy "%DIST_DIR%\linux-x64\install.sh" "%DIST_DIR%\macos-x64\install.sh" >nul
copy "%DIST_DIR%\linux-x64\install.sh" "%DIST_DIR%\macos-arm64\install.sh" >nul

echo [OK] Install scripts created

REM Create archives using PowerShell
echo [INFO] Creating distribution archives...

powershell -Command "Compress-Archive -Path '%DIST_DIR%\windows-x64\*' -DestinationPath '%DIST_DIR%\vkm-%VERSION%-windows-x64.zip' -Force" 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Created: vkm-%VERSION%-windows-x64.zip
)

powershell -Command "Compress-Archive -Path '%DIST_DIR%\linux-x64\*' -DestinationPath '%DIST_DIR%\vkm-%VERSION%-linux-x64.zip' -Force" 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Created: vkm-%VERSION%-linux-x64.zip
)

powershell -Command "Compress-Archive -Path '%DIST_DIR%\linux-arm64\*' -DestinationPath '%DIST_DIR%\vkm-%VERSION%-linux-arm64.zip' -Force" 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Created: vkm-%VERSION%-linux-arm64.zip
)

powershell -Command "Compress-Archive -Path '%DIST_DIR%\macos-x64\*' -DestinationPath '%DIST_DIR%\vkm-%VERSION%-macos-x64.zip' -Force" 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Created: vkm-%VERSION%-macos-x64.zip
)

powershell -Command "Compress-Archive -Path '%DIST_DIR%\macos-arm64\*' -DestinationPath '%DIST_DIR%\vkm-%VERSION%-macos-arm64.zip' -Force" 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Created: vkm-%VERSION%-macos-arm64.zip
)

echo.
echo ================================================================
echo                     Build Complete!
echo ================================================================
echo.
echo Outputs:
dir /b "%DIST_DIR%\*.zip" 2>nul
echo.
echo Platforms:
echo   * windows-x64   - Windows (x86_64)
echo   * linux-x64     - Linux (x86_64)
echo   * linux-arm64   - Linux (ARM64)
echo   * macos-x64     - macOS (Intel)
echo   * macos-arm64   - macOS (Apple Silicon)
echo.
echo Distribution files:
echo   %DIST_DIR%\
echo.

endlocal