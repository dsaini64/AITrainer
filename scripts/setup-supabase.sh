#!/bin/bash

# Supabase Setup Script for Longevity Coach App
# This script helps you set up Supabase for local development

echo "🚀 Setting up Supabase for Longevity Coach App"
echo "=============================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Please install it first:"
    echo "npm install -g supabase"
    echo "or"
    echo "brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Initialize Supabase (if not already done)
if [ ! -f "supabase/config.toml" ]; then
    echo "📝 Initializing Supabase project..."
    supabase init
else
    echo "✅ Supabase project already initialized"
fi

# Start Supabase local development
echo "🔄 Starting Supabase local development environment..."
supabase start

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Apply database migrations
echo "📊 Setting up database schema..."
supabase db reset

echo ""
echo "🎉 Supabase setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the API URL and anon key from above"
echo "2. Create a .env.local file with:"
echo "   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>"
echo "3. Add your OpenAI API key:"
echo "   OPENAI_API_KEY=<your-openai-key>"
echo ""
echo "🌐 Access points:"
echo "   - Supabase Studio: http://localhost:54323"
echo "   - API: http://localhost:54321"
echo "   - Database: postgresql://postgres:postgres@localhost:54322/postgres"
echo ""
echo "To stop Supabase: supabase stop"