@echo off
echo Copying solar car images into portfolio...
if not exist "%~dp0images" mkdir "%~dp0images"

copy /Y "C:\Users\Owner\.cursor\projects\c-Tej-s-Portfolio-Main-Tej-s-Portfolio\assets\c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_a0c6982950d5b80890a46ea2aa8f977b_images_Screenshot_20241026_174642_Instagram-14b425ec-9ab0-4068-a0ba-8d1ac73db32b.png" "%~dp0images\solar-car-1.png"
copy /Y "C:\Users\Owner\.cursor\projects\c-Tej-s-Portfolio-Main-Tej-s-Portfolio\assets\c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_a0c6982950d5b80890a46ea2aa8f977b_images_IMG_6831-b79fd2af-9b07-47d7-a2a3-f894b950e55b.png" "%~dp0images\solar-car-2.png"
copy /Y "C:\Users\Owner\.cursor\projects\c-Tej-s-Portfolio-Main-Tej-s-Portfolio\assets\c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_a0c6982950d5b80890a46ea2aa8f977b_images_20241025_124135-e61caab1-feaa-49a8-aad1-e7986e3a22f8.png" "%~dp0images\solar-car-3.png"
copy /Y "C:\Users\Owner\.cursor\projects\c-Tej-s-Portfolio-Main-Tej-s-Portfolio\assets\c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_a0c6982950d5b80890a46ea2aa8f977b_images_20241005_122909-5a1b0474-bba1-4f8b-adfa-9d1013d889b7.png" "%~dp0images\solar-car-4.png"

echo Done! Images copied to the images folder.
pause
