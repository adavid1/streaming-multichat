#!/bin/bash

# Multichat Deployment Script for Linux Server
# Run this script on your server after uploading your code

set -e  # Exit on any error

echo "🚀 Starting Multichat deployment..."

# Configuration
APP_NAME="multichat"
APP_DIR="/opt/multichat"
NGINX_SITE="multichat"
DOMAIN="your-domain.com"  # Change this to your actual domain

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "This script should not be run as root for security reasons."
    print_status "Please run as a regular user with sudo privileges."
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo dnf update -y

# Install required packages
print_status "Installing required packages..."
sudo dnf install -y curl wget git unzip nginx certbot python3-certbot-nginx

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    print_warning "You may need to log out and back in for Docker group membership to take effect."
else
    print_success "Docker is already installed."
fi

# Install Docker Compose if not available
if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        print_status "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    else
        print_success "Docker Compose (plugin) is available."
    fi
else
    print_success "Docker Compose is already installed."
fi

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Check if we're in the right directory (should contain package.json)
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run this script from the root of your multichat project."
    exit 1
fi

# Copy application files to deployment directory
print_status "Copying application files..."
rsync -av --exclude='node_modules' --exclude='.git' --exclude='*.log' . $APP_DIR/

# Create environment file if it doesn't exist
if [[ ! -f "$APP_DIR/.env" ]]; then
    print_status "Creating environment file..."
    cp $APP_DIR/server/.env.example $APP_DIR/.env
    print_warning "Please edit $APP_DIR/.env with your actual configuration values!"
fi

# Navigate to app directory
cd $APP_DIR

# Create logs directory
mkdir -p logs

# Build and start the application
print_status "Building and starting the application..."
if command -v docker-compose &> /dev/null; then
    docker-compose down --remove-orphans 2>/dev/null || true
    docker-compose build --no-cache
    docker-compose up -d
else
    docker compose down --remove-orphans 2>/dev/null || true
    docker compose build --no-cache
    docker compose up -d
fi

# Wait for application to start
print_status "Waiting for application to start..."
sleep 10

# Check if application is running
if curl -f http://localhost:8787/health >/dev/null 2>&1; then
    print_success "Application is running successfully!"
else
    print_error "Application failed to start. Check logs with: docker logs multichat-app"
    exit 1
fi

# Configure Nginx
print_status "Configuring Nginx..."

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/${NGINX_SITE}.conf > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Redirect to HTTPS (will be configured with SSL)
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # Temporary self-signed certificates (replace with real certificates)
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Main application
    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support for real-time chat
    location /ws {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket timeout settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOF

# Create temporary self-signed certificate (for testing)
print_status "Creating temporary SSL certificate..."
if [[ ! -f /etc/ssl/certs/nginx-selfsigned.crt ]]; then
    sudo mkdir -p /etc/ssl/private
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/nginx-selfsigned.key \
        -out /etc/ssl/certs/nginx-selfsigned.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=${DOMAIN}"
fi

# Test Nginx configuration
print_status "Testing Nginx configuration..."
if sudo nginx -t; then
    print_success "Nginx configuration is valid."
else
    print_error "Nginx configuration is invalid. Please check the configuration."
    exit 1
fi

# Enable and start Nginx
print_status "Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Configure firewall
print_status "Configuring firewall..."
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-port=8787/tcp
    sudo firewall-cmd --reload
    print_success "Firewall configured."
else
    print_warning "firewall-cmd not found. Please manually configure your firewall to allow HTTP (80), HTTPS (443), and port 8787."
fi

# Set up systemd service for Docker Compose (optional)
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/multichat.service > /dev/null <<EOF
[Unit]
Description=Multichat Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable multichat.service

print_success "Deployment completed successfully!"
echo ""
print_status "🎉 Your Multichat application is now running!"
echo ""
print_status "📋 Next steps:"
echo "1. Edit the environment file: $APP_DIR/.env"
echo "2. Configure your chat platform credentials (Twitch, YouTube, TikTok)"
echo "3. Replace temporary SSL certificate with a real one:"
echo "   sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "4. Test your application at: https://${DOMAIN}"
echo "5. For OBS: https://${DOMAIN}/?mode=public"
echo ""
print_status "📖 Useful commands:"
echo "• View logs: docker logs multichat-app"
echo "• Restart app: sudo systemctl restart multichat"
echo "• Update app: cd $APP_DIR && docker compose build --no-cache && docker compose up -d"
echo "• Check status: docker ps"
echo ""
print_warning "Remember to:"
echo "- Configure your .env file with real credentials"
echo "- Set up proper SSL certificates with certbot"
echo "- Configure your domain DNS to point to this server"