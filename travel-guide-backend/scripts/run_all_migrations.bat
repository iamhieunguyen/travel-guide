@echo off
REM Run all migration scripts in order
REM Usage: run_all_migrations.bat

echo ============================================================
echo RUNNING ALL MIGRATIONS
echo ============================================================
echo.

REM Check if environment variables are set
if "%TABLE_NAME%"=="" (
    echo Error: TABLE_NAME environment variable not set
    echo    Example: set TABLE_NAME=travel-guided-ArticlesTable-XXXXXXXXX
    exit /b 1
)

if "%AWS_REGION%"=="" (
    echo Error: AWS_REGION environment variable not set
    echo    Example: set AWS_REGION=ap-southeast-1
    exit /b 1
)

echo Configuration:
echo   TABLE_NAME: %TABLE_NAME%
echo   AWS_REGION: %AWS_REGION%
echo.

REM Confirm before running
set /p confirm="Continue with all migrations? (yes/no): "
if not "%confirm%"=="yes" (
    echo Migrations cancelled.
    exit /b 0
)

echo.
echo ============================================================
echo STEP 1/3: Running ownerId migration (CRITICAL)
echo ============================================================
echo.
python migrate_ownerid.py
if errorlevel 1 (
    echo Migration failed!
    exit /b 1
)

echo.
echo ============================================================
echo STEP 2/3: Running lowercase fields migration
echo ============================================================
echo.
python migrate_lowercase.py
if errorlevel 1 (
    echo Migration failed!
    exit /b 1
)

echo.
echo ============================================================
echo STEP 3/3: Running locationName migration
echo ============================================================
echo.
python migrate_locationname.py
if errorlevel 1 (
    echo Migration failed!
    exit /b 1
)

echo.
echo ============================================================
echo ALL MIGRATIONS COMPLETED!
echo ============================================================
echo.
echo - ownerId migration: Done
echo - Lowercase fields migration: Done
echo - LocationName migration: Done
echo.
echo Next steps:
echo   1. Deploy backend: cd .. ^&^& sam build ^&^& sam deploy
echo   2. Deploy frontend: cd ..\travel-guide-frontend ^&^& npm run build
echo   3. Test Personal Page
echo.
