#!/bin/bash
# ============================================================
# AXIOM Deployment Script — Vultr Ubuntu 24.04
# Usage: ./deploy.sh <SERVER_IP> <GOOGLE_API_KEY>
# Example: ./deploy.sh 45.76.100.200 AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# ============================================================
set -e

SERVER_IP="${1:?Error: SERVER_IP required. Usage: ./deploy.sh <SERVER_IP> <GOOGLE_API_KEY>}"
GOOGLE_API_KEY="${2:?Error: GOOGLE_API_KEY required. Usage: ./deploy.sh <SERVER_IP> <GOOGLE_API_KEY>}"
SSH_USER="root"
REPO_URL="https://github.com/Haidermushtaq/axiom.git"
APP_DIR="/opt/axiom"

echo "==> Deploying AXIOM to ${SERVER_IP}..."

ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SERVER_IP}" << ENDSSH
set -e

echo "==> Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 python3-pip python3-venv nginx git curl

echo "==> Creating axiom system user..."
id -u axiom &>/dev/null || useradd -r -s /bin/false axiom

echo "==> Cloning/updating repository..."
if [ -d "${APP_DIR}/.git" ]; then
    cd "${APP_DIR}" && git pull
else
    rm -rf "${APP_DIR}"
    git clone ${REPO_URL} ${APP_DIR}
fi
chown -R axiom:axiom ${APP_DIR}

echo "==> Setting up Python virtual environment..."
cd ${APP_DIR}/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip --quiet
./venv/bin/pip install -r requirements.txt --quiet

echo "==> Writing .env file..."
echo "GOOGLE_API_KEY=${GOOGLE_API_KEY}" > ${APP_DIR}/backend/.env
chown axiom:axiom ${APP_DIR}/backend/.env
chmod 600 ${APP_DIR}/backend/.env

echo "==> Installing systemd service..."
cp ${APP_DIR}/axiom.service /etc/systemd/system/axiom.service
systemctl daemon-reload
systemctl enable axiom
systemctl restart axiom
sleep 3
systemctl is-active --quiet axiom && echo "   axiom.service is running OK" || (echo "   ERROR: axiom.service failed — check: journalctl -u axiom -n 50"; exit 1)

echo "==> Configuring Nginx..."
cp ${APP_DIR}/nginx.conf /etc/nginx/sites-available/axiom
ln -sf /etc/nginx/sites-available/axiom /etc/nginx/sites-enabled/axiom
rm -f /etc/nginx/sites-enabled/default

echo "==> Copying React build to web root..."
mkdir -p /var/www/axiom
cp -r ${APP_DIR}/frontend/dist/. /var/www/axiom/

echo "==> Testing Nginx config and restarting..."
nginx -t
systemctl restart nginx

echo ""
echo "============================================"
echo "  AXIOM deployed successfully!"
echo "  Frontend : http://${SERVER_IP}"
echo "  API root : http://${SERVER_IP}:8000"
echo "============================================"
ENDSSH

echo "==> Done."
