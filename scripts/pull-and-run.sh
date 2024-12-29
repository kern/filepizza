#!/bin/bash

set -euo pipefail

sudo docker pull kern/filepizza:latest
sudo docker compose -f docker-compose.production.yml up -d
sudo docker compose logs -f