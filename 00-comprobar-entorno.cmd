@echo off
cd /d "%~dp0"
chcp 65001 >nul
echo ============================================================
echo  [1/5] Comprobando Node.js...
echo ============================================================
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no encontrado.
    echo Instala Node 22 desde https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo OK: Node %NODE_VER%

echo.
echo ============================================================
echo  [2/5] Comprobando Python y librerias...
echo ============================================================
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no encontrado.
    echo Instala Python 3 desde https://www.python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do set PY_VER=%%v
echo OK: %PY_VER%

python -c "import bs4, lxml" >nul 2>&1
if errorlevel 1 (
    echo AVISO: Faltan bs4 o lxml. Instalando...
    pip install beautifulsoup4 lxml --break-system-packages >nul 2>&1
    python -c "import bs4, lxml" >nul 2>&1
    if errorlevel 1 (
        echo ERROR: No se pudieron instalar bs4/lxml.
        echo Prueba manualmente: pip install beautifulsoup4 lxml
        pause
        exit /b 1
    )
    echo OK: bs4 y lxml instalados.
) else (
    echo OK: bs4 y lxml presentes.
)

echo.
echo ============================================================
echo  [3/5] Comprobando Git...
echo ============================================================
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git no encontrado.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('git --version') do echo OK: %%v

echo.
echo ============================================================
echo  [4/5] Comprobando repositorio Git local...
echo ============================================================
git remote -v 2>nul | findstr "origin" >nul
if errorlevel 1 (
    echo AVISO: No hay remote origin configurado.
) else (
    for /f "tokens=2" %%u in ('git remote -v 2^>nul ^| findstr "fetch"') do echo OK: Remote = %%u
)
git log --oneline -3 2>nul
if errorlevel 1 (
    echo AVISO: Sin commits todavia.
)

echo.
echo ============================================================
echo  [5/5] Analizando los XML de WordPress...
echo ============================================================
echo.
for %%f in ("*.xml") do (
    echo --- %%f ---
    for /f %%s in ('powershell -NoProfile -Command "(Get-Item '%%f').length / 1MB"') do echo    Tamano: %%s MB
    findstr /c:"_elementor_data" "%%f" >nul 2>&1
    if errorlevel 1 (
        echo    Elementor: NO tiene _elementor_data
    ) else (
        for /f %%n in ('findstr /c:"_elementor_data" "%%f" ^| find /c /v ""') do echo    Elementor: SI - %%n ocurrencias de _elementor_data
    )
    findstr /c:"<wp:post_type>post</wp:post_type>" "%%f" >nul 2>&1
    if not errorlevel 1 (
        for /f %%n in ('findstr /c:"<wp:post_type>post</wp:post_type>" "%%f" ^| find /c /v ""') do echo    Posts: %%n
    )
    findstr /c:"<wp:post_type>page</wp:post_type>" "%%f" >nul 2>&1
    if not errorlevel 1 (
        for /f %%n in ('findstr /c:"<wp:post_type>page</wp:post_type>" "%%f" ^| find /c /v ""') do echo    Paginas: %%n
    )
    findstr /c:"<wp:post_type>attachment</wp:post_type>" "%%f" >nul 2>&1
    if not errorlevel 1 (
        for /f %%n in ('findstr /c:"<wp:post_type>attachment</wp:post_type>" "%%f" ^| find /c /v ""') do echo    Adjuntos: %%n
    )
    echo.
)

echo ============================================================
echo  RESULTADO: todo correcto. Entorno listo para la Fase 0.
echo ============================================================
echo.
pause
