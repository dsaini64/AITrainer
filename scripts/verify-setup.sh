#!/bin/bash

echo "🔍 Verifying Divakar Longevity Coach Setup..."
echo "============================================="

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    echo "   Please copy .env.local.example to .env.local and add your API keys"
    exit 1
else
    echo "✅ .env.local file exists"
fi

# Check if OpenAI API key is set
if grep -q "OPENAI_API_KEY=your_openai_api_key" .env.local 2>/dev/null; then
    echo "❌ OpenAI API key not configured"
    echo "   Please add your OpenAI API key to .env.local"
    echo "   Get one at: https://platform.openai.com/api-keys"
else
    echo "✅ OpenAI API key configured"
fi

# Check if Supabase is configured
if grep -q "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321" .env.local 2>/dev/null; then
    echo "✅ Supabase URL configured (local development)"
else
    echo "⚠️  Supabase URL may need configuration"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "❌ Dependencies not installed"
    echo "   Please run: npm install"
    exit 1
else
    echo "✅ Dependencies installed"
fi

# Check if Supabase is running (if using local)
if command -v supabase &> /dev/null; then
    if supabase status &> /dev/null; then
        echo "✅ Supabase is running locally"
    else
        echo "⚠️  Supabase may not be running"
        echo "   Run: supabase start"
    fi
else
    echo "ℹ️  Supabase CLI not found (using remote instance?)"
fi

echo ""
echo "🚀 Setup verification complete!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "To test the AI coach:"
echo "  1. Navigate to http://localhost:3000"
echo "  2. Sign up for an account"
echo "  3. Go to /coach and start chatting!"
echo ""
echo "To check system health:"
echo "  curl http://localhost:3000/api/health"