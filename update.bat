@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "REPO_URL=https://karmatft.netlify.app/"

set "green=[92m"
set "yellow=[93m"
set "cyan=[96m"
set "white=[0m"
set "magenta=[95m"
set "red=[91m"

set "current_time=%time:~0,8%"
set "timestamp=%date% !current_time!"

cls
echo %cyan%====================================================
echo    KARMA TFT PROJESİ - OTOMATİK GÜNCELLEME İŞLEMİ
echo ====================================================%white%
echo.

set "user_msg="
set /p "user_msg=Yapılan değişikliği yaz: "

if "!user_msg!"=="" (set "msg_text=Otomatik Güncelleme") else (set "msg_text=!user_msg!")
set "final_msg=!msg_text! !timestamp!"
echo.

echo %yellow%[1/4]%white% Sunucudaki veriler eşitleniyor...
git pull origin main --quiet 2>nul
if %errorlevel% equ 0 (
    echo %green%      [OK] Sunucu ile bağlantı güncel.%white%
) else (
    echo %red%      [HATA] Sunucudan veri çekilemedi.%white%
)

echo %yellow%[2/4]%white% Yeni dosyalar listeye ekleniyor...
echo %cyan%      ------------------------------------------%white%

for /f "tokens=1,*" %%a in ('git status -s') do (
    set "status_code=%%a"
    set "file_name=%%b"
    
    if "!status_code!"=="M"  set "display_status=Değiştirildi  " & set "c=%yellow%"
    if "!status_code!"=="A"  set "display_status=Yeni Eklendi  " & set "c=%green%"
    if "!status_code!"=="D"  set "display_status=Silindi       " & set "c=%red%"
    if "!status_code!"=="??" set "display_status=Yeni Dosya    " & set "c=%cyan%"
    if "!status_code!"=="R"  set "display_status=Adı Değişti   " & set "c=%magenta%"
    
    echo       %cyan%=^>%white% !c!!display_status!%white%    !file_name!
)
echo %cyan%      ------------------------------------------%white%

git add .
if %errorlevel% equ 0 (
    echo %green%      [OK] Tüm dosyalar başarıyla eklendi.%white%
) else (
    echo %red%      [HATA] Dosyalar eklenirken bir sorun oluştu.%white%
)

echo %yellow%[3/4]%white% Kayıt mesajı oluşturuluyor...
git commit -m "!final_msg!" >nul 2>&1
if %errorlevel% equ 0 (
    echo %green%      [OK] Açıklama mesajı yayınlandı.%white%
) else (
    echo %yellow%      [BİLGİ] Kaydedilecek değişiklik bulunamadı.%white%
)

echo %yellow%[4/4]%white% Kodlar GitHub'a gönderiliyor...
git push origin main --quiet 2>nul
if %errorlevel% equ 0 (
    echo %green%      [OK] Yükleme başarılı.%white%
) else (
    echo %red%      [HATA] Yükleme başarısız.%white%
)

echo.
echo %cyan%====================================================
echo    İŞLEM TAMAMLANDI: Tüm veriler eşitlendi
echo    %magenta%Mesaj: %green%!msg_text! %white%!timestamp!
echo.
echo    %yellow%Web Sitesi: %cyan%%REPO_URL%%white%
echo    %white%(CTRL tuşuna basılı tutarak tıkla)%cyan%
echo ====================================================%white%
echo.
pause