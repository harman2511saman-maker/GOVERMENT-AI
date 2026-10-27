#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Starting Kurdistan Digital Government AI Droplet Setup..."
echo "=========================================================="

# 1. Setup 2GB Swap for optimal 1GB Droplet stability
if [ ! -f /swapfile ]; then
    echo "Creating 2GB swap memory..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✅ Swap memory enabled."
fi

# 2. Install required system packages
echo "Updating system and installing dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 python3-pip python3-venv git nginx curl ufw

# 3. Clone or pull repo to /var/www/goverment-ai
echo "Setting up repository..."
mkdir -p /var/www
if [ -d /var/www/goverment-ai ]; then
    cd /var/www/goverment-ai
    git pull origin main
else
    git clone https://github.com/harman2511saman-maker/GOVERMENT-AI.git /var/www/goverment-ai
fi

# 4. Create Python Virtual Environment and install packages
echo "Installing Python dependencies..."
cd /var/www/goverment-ai/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# 5. Write Production .env file
echo "Configuring environment variables..."
cat << 'EOF' > /var/www/goverment-ai/backend/.env
OPENAI_API_KEY=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
OPENAI_MODEL=gpt-4o-mini
GROQ_API_KEY=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
GROQ_MODEL=qwen/qwen3.8-27b
SIMILARITY_THRESHOLD=0.28
JWT_SECRET_KEY=9e8b7c6d5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=postgresql+pg8000://neondb_owner:npg_zgR8UySblQc2@ep-noisy-violet-amus6pxs.c-5.us-east-1.aws.neon.tech/neondb
ALLOWED_ORIGINS=*
EOF

# 6. Configure systemd service
echo "Configuring systemd service..."
cat << 'EOF' > /etc/systemd/system/goverment-ai.service
[Unit]
Description=Kurdistan Government AI Backend Service
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/goverment-ai/backend
ExecStart=/var/www/goverment-ai/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3
EnvironmentFile=/var/www/goverment-ai/backend/.env

[Install]
WantedBy=multi-user.target
EOF

# 7. Configure Nginx Reverse Proxy
echo "Configuring Nginx..."
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 8. Start and enable services
echo "Starting services..."
systemctl daemon-reload
systemctl enable goverment-ai
systemctl restart goverment-ai
systemctl restart nginx

# 9. Allow Firewall ports
ufw allow 80/tcp || true
ufw allow 22/tcp || true

echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Server is live and listening on port 80."
echo "Testing health endpoint:"
curl -s http://127.0.0.1/ | head -n 5
echo ""
echo "=========================================================="
