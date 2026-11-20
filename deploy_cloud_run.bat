@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo           CogniLoop - Google Cloud Run Automated Deployment
echo ==============================================================================
echo.

where gcloud >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Google Cloud SDK ('gcloud') was not detected in your PATH.
    echo.
    echo You have TWO simple deployment options:
    echo.
    echo  OPTION 1: (Easiest - No Local Install Required)
    echo    1. Open Google Cloud Shell in your browser: https://shell.cloud.google.com
    echo    2. Upload or clone this CogniLoop folder into Cloud Shell
    echo    3. Run:
    echo         gcloud run deploy cogniloop --source . --region us-central1 --allow-unauthenticated
    echo.
    echo  OPTION 2: (Deploy from Windows Local Machine)
    echo    1. Install Google Cloud SDK:
    echo         winget install Google.CloudSDK
    echo       or download from: https://cloud.google.com/sdk/docs/install
    echo    2. Open a new terminal and run:
    echo         gcloud init
    echo    3. Re-run this script: deploy_cloud_run.bat
    echo.
    pause
    exit /b 1
)

echo [1/4] Verifying active Google Cloud Configuration...
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set GCP_PROJECT=%%i

if "%GCP_PROJECT%"=="" (
    echo [!] No default GCP project found.
    set /p GCP_PROJECT="Enter your Google Cloud Project ID: "
    gcloud config set project %GCP_PROJECT%
) else (
    echo Active Project: %GCP_PROJECT%
)

set SERVICE_NAME=cogniloop
set DEFAULT_REGION=us-central1
set /p REGION="Enter Cloud Run Region [%DEFAULT_REGION%]: "
if "%REGION%"=="" set REGION=%DEFAULT_REGION%

echo.
echo [2/4] Running local pre-flight test verification...
python test_pipeline.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Local pre-flight tests failed! Aborting deployment.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Deploying CogniLoop to Google Cloud Run...
echo Service: %SERVICE_NAME%
echo Region:  %REGION%
echo Source:  Current Directory (.)
echo Build:   Google Cloud Build (Serverless container build)
echo.

gcloud run deploy %SERVICE_NAME% ^
  --source . ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --port 8080 ^
  --memory 512Mi ^
  --cpu 1

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==============================================================================
    echo [SUCCESS] CogniLoop has been successfully deployed to Google Cloud Run!
    echo ==============================================================================
    echo You can view your deployed service URL directly in the output above.
) else (
    echo.
    echo [ERROR] Cloud Run deployment failed. Check the error logs above.
)

pause
