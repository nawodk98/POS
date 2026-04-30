@echo off
echo Copying warehouse background image to POS folder...
copy /Y "C:\Users\nawod\.gemini\antigravity\brain\cea4b6d4-8f20-4b6a-b323-9edb1caa054a\media__1777482946820.jpg" "warehouse_bg.jpg"
if %errorlevel% == 0 (
    echo SUCCESS: warehouse_bg.jpg has been set as background.
) else (
    echo ERROR: Could not copy. Please manually copy the warehouse image as warehouse_bg.jpg into this folder.
)
pause
