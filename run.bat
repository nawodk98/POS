@echo off
echo Starting Premium POS System...
REM Copy warehouse background image if it doesn't exist
if not exist "warehouse_bg.jpg" (
    echo Setting up background image...
    copy /Y "C:\Users\nawod\.gemini\antigravity\brain\cea4b6d4-8f20-4b6a-b323-9edb1caa054a\media__1777482946820.jpg" "warehouse_bg.jpg" >nul 2>&1
    if exist "warehouse_bg.jpg" (
        echo Background image ready.
    ) else (
        echo Note: Background image copy failed - will use default gradient background.
    )
)
start index.html
