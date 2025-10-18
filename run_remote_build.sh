#!/bin/bash
echo "🚀 Starting SAT18 Web Builder setup..."

# Update sistem
apt-get update -y

# Install Node.js & npm kalau belum ada
if ! command -v node &> /dev/null
then
    echo "Installing Node.js..."
    apt install -y nodejs npm
fi

# Install dependensi proyek
npm install

# Build Next.js
npm run build

# Jalankan dengan PM2 (supaya tetap hidup di VPS)
npm install -g pm2
pm2 start server.js --name sat18-web-builder

echo "✅ SAT18 Web Builder running!"
