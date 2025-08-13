#!/bin/bash
set -euo pipefail

echo "🚀 Setting up Web Research Tool..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v20.19.4 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
echo "✅ Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm v10.8.2 or higher."
    exit 1
fi

# Check npm version
NPM_VERSION=$(npm -v)
echo "✅ npm version: $NPM_VERSION"

# Install dependencies (includes local dependency copying)
echo "📦 Installing dependencies and copying local files..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f .env.example_FINAL ]; then
        cp .env.example_FINAL .env
        echo "✅ .env file created. Please edit it with your API keys."
    else
        echo "⚠️  .env.example_FINAL not found. Please create .env file manually."
    fi
else
    echo "✅ .env file already exists."
fi

# Check Puppeteer versions
echo "🔍 Checking Puppeteer versions..."
npm list puppeteer

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
if npx tsc --noEmit; then
    echo "✅ TypeScript compilation successful (0 errors)."
else
    echo "❌ TypeScript compilation failed. Please check the errors above."
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start PostgreSQL and Redis services"
echo "3. Run: ./start.sh"
echo ""
echo "For detailed instructions, see SETUP_GUIDE.md"
