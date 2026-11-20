#!/usr/bin/env bash
# ==============================================================================
# CogniLoop - Google Cloud Run Automated Deployment (Linux / macOS / Cloud Shell)
# ==============================================================================

set -e

echo "=============================================================================="
echo "          CogniLoop - Google Cloud Run Automated Deployment"
echo "=============================================================================="

# Check for gcloud
if ! command -v gcloud &> /dev/null; then
    echo "[ERROR] Google Cloud SDK ('gcloud') was not detected in PATH."
    echo ""
    echo "To deploy via Google Cloud Shell (No install needed):"
    echo "  1. Open https://shell.cloud.google.com"
    echo "  2. Upload/clone this repository and run:"
    echo "       bash deploy_cloud_run.sh"
    echo ""
    exit 1
fi

echo "[1/4] Checking Google Cloud Project..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || true)
if [ -z "$CURRENT_PROJECT" ]; then
    read -rp "Enter your Google Cloud Project ID: " GCP_PROJECT
    gcloud config set project "$GCP_PROJECT"
else
    echo "Active GCP Project: $CURRENT_PROJECT"
fi

SERVICE_NAME="cogniloop"
DEFAULT_REGION="us-central1"
read -rp "Enter Cloud Run Region [$DEFAULT_REGION]: " REGION
REGION="${REGION:-$DEFAULT_REGION}"

echo ""
echo "[2/4] Running pre-flight test suite..."
python3 test_pipeline.py || python test_pipeline.py

echo ""
echo "[3/4] Enabling required Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

echo ""
echo "[4/4] Deploying CogniLoop from source to Google Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1

echo ""
echo "=============================================================================="
echo "[SUCCESS] CogniLoop is live on Google Cloud Run!"
echo "=============================================================================="
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)" 2>/dev/null || true)
if [ -n "$SERVICE_URL" ]; then
    echo "Access your application at: $SERVICE_URL"
    echo "Health check endpoint:      $SERVICE_URL/api/health"
fi
