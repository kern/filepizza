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
CONFIG_FILE="$CREDENTIALS_DIR/config.yml"

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
            mkdir -p $CREDENTIALS_DIR
            curl -L --output $CREDENTIALS_DIR/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
            chmod +x $CREDENTIALS_DIR/cloudflared
            echo "export PATH=\$PATH:$CREDENTIALS_DIR" >> ~/.bashrc
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

# Authenticate with Cloudflare if needed
if [ ! -f $CREDENTIALS_DIR/cert.pem ]; then
    echo -e "${YELLOW}Authenticating with Cloudflare...${NC}"
    echo -e "${YELLOW}This will open a browser window. Please log in and authorize cloudflared.${NC}"
    cloudflared tunnel login

    if [ ! -f $CREDENTIALS_DIR/cert.pem ]; then
        echo -e "${RED}Authentication failed. cert.pem not found.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Authentication successful!${NC}"
else
    echo -e "${GREEN}Using existing Cloudflare credentials${NC}"
fi

# Make sure credentials directory exists
mkdir -p $CREDENTIALS_DIR

# Check if tunnel exists
echo -e "${YELLOW}Checking if tunnel already exists: $TUNNEL_NAME...${NC}"
EXISTING_TUNNEL=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')

if [ -n "$EXISTING_TUNNEL" ]; then
    echo -e "${GREEN}Tunnel already exists with ID: $EXISTING_TUNNEL${NC}"
    TUNNEL_ID=$EXISTING_TUNNEL

    # Delete existing tunnel if credentials file is missing
    if [ ! -f "$CREDENTIALS_DIR/$TUNNEL_ID.json" ]; then
        echo -e "${YELLOW}Credentials file missing. Recreating tunnel...${NC}"
        cloudflared tunnel delete $TUNNEL_ID

        # Create new tunnel
        echo -e "${YELLOW}Creating new tunnel: $TUNNEL_NAME...${NC}"
        TUNNEL_OUTPUT=$(cloudflared tunnel create $TUNNEL_NAME)
        echo "$TUNNEL_OUTPUT"
        TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -i "created tunnel" | grep -o "[a-f0-9]\{8\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{12\}")

        if [ -z "$TUNNEL_ID" ]; then
            echo -e "${RED}Failed to extract tunnel ID automatically.${NC}"
            read -p "Please enter the tunnel ID manually from the output above: " TUNNEL_ID
            if [ -z "$TUNNEL_ID" ]; then
                echo -e "${RED}No tunnel ID provided. Exiting.${NC}"
                exit 1
            fi
        fi

        echo -e "${GREEN}New tunnel created with ID: $TUNNEL_ID${NC}"

        # Route DNS
        echo -e "${YELLOW}Routing tunnel to your domain: $HOSTNAME...${NC}"
        cloudflared tunnel route dns $TUNNEL_ID $HOSTNAME
    fi
else
    # Create new tunnel
    echo -e "${YELLOW}Creating new tunnel: $TUNNEL_NAME...${NC}"
    TUNNEL_OUTPUT=$(cloudflared tunnel create $TUNNEL_NAME)
    echo "$TUNNEL_OUTPUT"
    TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -i "created tunnel" | grep -o "[a-f0-9]\{8\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{12\}")

    if [ -z "$TUNNEL_ID" ]; then
        echo -e "${RED}Failed to extract tunnel ID automatically.${NC}"
        read -p "Please enter the tunnel ID manually from the output above: " TUNNEL_ID
        if [ -z "$TUNNEL_ID" ]; then
            echo -e "${RED}No tunnel ID provided. Exiting.${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}Tunnel created with ID: $TUNNEL_ID${NC}"

    # Route DNS
    echo -e "${YELLOW}Routing tunnel to your domain: $HOSTNAME...${NC}"
    cloudflared tunnel route dns $TUNNEL_ID $HOSTNAME
fi

# Create config file
echo -e "${YELLOW}Creating config file...${NC}"
cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDENTIALS_DIR/$TUNNEL_ID.json
ingress:
  - hostname: $HOSTNAME
    service: $HTTP_SERVICE_URL
  - service: http_status:404
EOF
echo -e "${GREEN}Config file created at: $CONFIG_FILE${NC}"

# Verify credentials file exists
if [ ! -f "$CREDENTIALS_DIR/$TUNNEL_ID.json" ]; then
    echo -e "${RED}Warning: Credentials file not found at $CREDENTIALS_DIR/$TUNNEL_ID.json${NC}"
    echo -e "${RED}You may need to recreate the tunnel or check permissions.${NC}"
    exit 1
fi

# Run the tunnel
echo -e "${GREEN}Starting tunnel to $HOSTNAME...${NC}"
echo -e "${YELLOW}Your FilePizza server is now accessible at: https://$HOSTNAME${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the tunnel${NC}"
cloudflared tunnel --config="$CONFIG_FILE" run