#!/bin/bash

# Build Frontend Static Assets
# This script builds the React frontend for deployment

set -e

echo "🚀 Building Crypto Live Dashboard Frontend..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build for production
echo "🔨 Building for production..."
npm run build

# Create deployment info
echo "📄 Creating deployment info..."
cat > dist/build-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildBy": "$(whoami)",
  "gitCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")",
  "version": "$(node -p "require('./package.json').version")"
}
EOF

echo "✅ Frontend built successfully!"
echo "📁 Static files are in: frontend/dist/"
echo ""
echo "🌐 You can now:"
echo "   - Serve the 'frontend/dist' folder with any static file server"
echo "   - Upload to CDN, Netlify, Vercel, GitHub Pages, etc."
echo "   - Point your web server to serve these files"