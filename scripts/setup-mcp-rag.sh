#!/bin/bash

# Setup script for MCP & RAG integration
# This script helps initialize the knowledge base and verify setup

set -e

echo "🚀 Setting up MCP & RAG Integration..."
echo ""

# Check environment variables
echo "📋 Checking environment variables..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL not set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not set"
fi

echo "✅ Environment check complete"
echo ""

# Check if database migration needs to be run
echo "📊 Database Migration Status"
echo "Run this migration if you haven't already:"
echo "  psql -U postgres -d your_database -f supabase/migrations/add_vector_store.sql"
echo "  OR"
echo "  supabase migration up"
echo ""

# Initialize knowledge base
echo "🧠 Initializing Knowledge Base..."
echo "This will create embeddings for all knowledge base documents."
echo ""

read -p "Do you want to initialize the knowledge base now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Initializing knowledge base..."
    
    # Try to call the API endpoint
    if command -v curl &> /dev/null; then
        API_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://localhost:3000}"
        if [[ $API_URL == http* ]]; then
            # Extract base URL if it's a Supabase URL
            BASE_URL="http://localhost:3000"
        else
            BASE_URL="http://localhost:3000"
        fi
        
        echo "Calling: POST $BASE_URL/api/ai/init-knowledge-base"
        curl -X POST "$BASE_URL/api/ai/init-knowledge-base" \
            -H "Content-Type: application/json" \
            || echo "⚠️  Could not reach API. Make sure the server is running."
    else
        echo "⚠️  curl not found. Please initialize manually:"
        echo "   POST http://localhost:3000/api/ai/init-knowledge-base"
    fi
else
    echo "Skipping knowledge base initialization."
    echo "You can initialize it later by calling:"
    echo "  POST /api/ai/init-knowledge-base"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next Steps:"
echo "1. Ensure database migration is applied"
echo "2. Initialize knowledge base (if not done above)"
echo "3. Test the chat API with MCP & RAG enabled"
echo ""
echo "📖 Documentation:"
echo "  - See MCP-RAG-INTEGRATION.md for detailed docs"
echo "  - See IMPLEMENTATION-SUMMARY.md for overview"
echo ""

