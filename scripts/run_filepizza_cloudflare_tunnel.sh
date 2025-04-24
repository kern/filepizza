#!/usr/bin/env bash

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    echo "This script should be executed, not sourced. Run it with ./$(basename "$0")"
    return 1
fi

set -e

# Parse arguments or use environment variables
API_KEY=${1:-$CLOUDFLARE_API_KEY}
HOST_DOMAIN=${2:-$HOST_DOMAIN}

if [ -z "$API_KEY" ]; then
  echo "Error: No Cloudflare API key provided"
  echo "Usage: $0 <YOUR CLOUDFLARE API KEY> [HOST_DOMAIN]"
  echo "Or set CLOUDFLARE_API_KEY and HOST_DOMAIN in your .env file"
  exit 1
fi

if [ -z "$HOST_DOMAIN" ]; then
  echo "Error: No HOST_DOMAIN provided"
  echo "Usage: $0 <YOUR CLOUDFLARE API KEY> <HOST_DOMAIN>"
  echo "Or set HOST_DOMAIN in your .env file"
  exit 1
fi

# Configuration variables
CLOUDFLARE_TOKEN="$API_KEY"
TUNNEL_NAME="filepizza"
HTTP_SERVICE_URL="http://localhost:8080"
HOSTNAME="$HOST_DOMAIN"
CREDENTIALS_DIR=~/.cloudflared

# Color codes for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Cloudflare Tunnel Setup for FilePizza...${NC}"
echo -e "${YELLOW}Using hostname: ${HOSTNAME}${NC}"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}cloudflared is not installed.${NC} Installing now..."

    # Detect OS and install cloudflared
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        if command -v apt-get &> /dev/null; then
            # Debian/Ubuntu
            curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
            sudo dpkg -i cloudflared.deb
            rm cloudflared.deb
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            curl -L --output cloudflared.rpm https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
            sudo yum localinstall -y cloudflared.rpm
            rm cloudflared.rpm
        else
            # Generic Linux
            mkdir -p ~/.cloudflared
            curl -L --output ~/.cloudflared/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
            chmod +x ~/.cloudflared/cloudflared
            echo 'export PATH=$PATH:~/.cloudflared' >> ~/.bashrc
            source ~/.bashrc
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflare/cloudflare/cloudflared
    else
        echo -e "${RED}Unsupported OS. Please install cloudflared manually from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation${NC}"
        exit 1
    fi

    echo -e "${GREEN}cloudflared installed successfully!${NC}"
fi

# Function to create/update config file
function CREATE_CONFIG_FILE {
    CONFIG_FILE="$CREDENTIALS_DIR/config.yml"
    cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDENTIALS_DIR/$TUNNEL_ID.json
ingress:
  - hostname: $HOSTNAME
    service: $HTTP_SERVICE_URL
  - service: http_status:404
EOF

    echo -e "${GREEN}Created/updated config file at: $CONFIG_FILE${NC}"
}

# Authenticate with Cloudflare
echo -e "${YELLOW}Authenticating with Cloudflare...${NC}"

# Check if authentication was already done previously
if [ -f ~/.cloudflared/cert.pem ]; then
    echo -e "${GREEN}Certificate already exists at ~/.cloudflared/cert.pem${NC}"
    echo -e "${GREEN}Skipping authentication step...${NC}"
else
    echo -e "${YELLOW}This will open a browser window. Please log in and authorize cloudflared.${NC}"
    # Run the cloudflared login command - this will open a browser for authentication
    cloudflared tunnel login

    # Check if login was successful
    if [ ! -f ~/.cloudflared/cert.pem ]; then
        echo -e "${RED}Authentication failed. cert.pem not found.${NC}"
        exit 1
    fi

    echo -e "${GREEN}Authentication successful! Certificate created at ~/.cloudflared/cert.pem${NC}"
fi

# Make sure the credentials directory exists
mkdir -p $CREDENTIALS_DIR

# Check if tunnel already exists
echo -e "${YELLOW}Checking if tunnel already exists: $TUNNEL_NAME...${NC}"
EXISTING_TUNNEL=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')

if [ ! -z "$EXISTING_TUNNEL" ]; then
    echo -e "${GREEN}Tunnel already exists with ID: $EXISTING_TUNNEL${NC}"
    TUNNEL_ID=$EXISTING_TUNNEL

    # Check if credentials file exists for this tunnel
    CREDS_FILE="$CREDENTIALS_DIR/$TUNNEL_ID.json"
    if [ ! -f "$CREDS_FILE" ]; then
        echo -e "${YELLOW}Credentials file not found for existing tunnel.${NC}"
        echo -e "${YELLOW}Generating config file for existing tunnel...${NC}"

        # Since we're missing credentials, we need to recreate the tunnel
        echo -e "${YELLOW}Deleting existing tunnel due to missing credentials...${NC}"
        cloudflared tunnel delete $TUNNEL_ID

        # Create a new tunnel
        echo -e "${YELLOW}Creating new tunnel: $TUNNEL_NAME...${NC}"
        TUNNEL_ID=$(cloudflared tunnel create $TUNNEL_NAME | grep -oP 'Created tunnel \K[a-z0-9-]+')

        if [ -z "$TUNNEL_ID" ]; then
            echo -e "${RED}Failed to create tunnel.${NC}"
            exit 1
        fi

        echo -e "${GREEN}New tunnel created with ID: $TUNNEL_ID${NC}"

        # Create the updated config file
        CREATE_CONFIG_FILE

        # Route the tunnel to your domain
        echo -e "${YELLOW}Routing tunnel to your domain: $HOSTNAME...${NC}"
        cloudflared tunnel route dns $TUNNEL_ID $HOSTNAME
    else
        echo -e "${GREEN}Found credentials file for tunnel: $CREDS_FILE${NC}"
        # Update the config file with current settings
        CREATE_CONFIG_FILE
    fi
else
    # Create a new tunnel
    echo -e "${YELLOW}Creating new tunnel: $TUNNEL_NAME...${NC}"
    TUNNEL_ID=$(cloudflared tunnel create $TUNNEL_NAME | grep -oP 'Created tunnel \K[a-z0-9-]+')

    if [ -z "$TUNNEL_ID" ]; then
        echo -e "${RED}Failed to create tunnel.${NC}"
        exit 1
    fi

    echo -e "${GREEN}Tunnel created with ID: $TUNNEL_ID${NC}"

    # Create the config file
    CREATE_CONFIG_FILE

    # Route the tunnel to your domain
    echo -e "${YELLOW}Routing tunnel to your domain: $HOSTNAME...${NC}"
    cloudflared tunnel route dns $TUNNEL_ID $HOSTNAME
fi

# Check if the credentials file exists now
CREDS_FILE="$CREDENTIALS_DIR/$TUNNEL_ID.json"
if [ ! -f "$CREDS_FILE" ]; then
    echo -e "${RED}Credentials file still not found at: $CREDS_FILE${NC}"
    echo -e "${RED}This is unexpected. Please ensure your Cloudflare account has proper permissions.${NC}"
    exit 1
fi

# Copy the tunnel ID JSON file to filepizza.json
cp "$CREDENTIALS_DIR/$TUNNEL_ID.json" "$CREDENTIALS_DIR/filepizza.json"

# Run the tunnel with the configuration
echo -e "${GREEN}Setup complete! Running tunnel...${NC}"

# Run the tunnel with the configuration
echo -e "${GREEN}Setup complete! Running tunnel...${NC}"
echo -e "${YELLOW}Your FilePizza server is now accessible at: https://$HOSTNAME${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the tunnel${NC}"
echo -e "${YELLOW}Note: TURN/STUN services need to be configured separately in another tunnel${NC}"

# Run the tunnel with the config file
echo -e "${GREEN}Starting tunnel with configuration...${NC}"
cloudflared tunnel --config="$CONFIG_FILE" run