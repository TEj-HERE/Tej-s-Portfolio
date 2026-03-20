@echo off
copy "C:\Users\Owner\.cursor\projects\c-Tej-s-Portfolio-Main-Tej-s-Portfolio\assets\c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_a0c6982950d5b80890a46ea2aa8f977b_images_JETech_Labs-f00308e0-1d04-40f2-8cba-f988490ca710.png" "%~dp0images\jetech-jetbox.png"
if %errorlevel% equ 0 (
    echo Success! JetBox image copied to images\jetech-jetbox.png
) else (
    echo Copy failed. Make sure the source file exists.
)
pause
