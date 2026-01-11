/**
 * RAG API Endpoint
 * 
 * Handles knowledge base initialization and retrieval
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeKnowledgeBase } from '@/lib/ai/rag/knowledge-base'
import { getRAGRetriever } from '@/lib/ai/rag/retriever'

export async function POST(request: NextRequest) {
  try {
    const { action, query, userId, options } = await request.json()

    if (action === 'initialize') {
      // Initialize knowledge base with embeddings
      await initializeKnowledgeBase()
      return NextResponse.json({
        success: true,
        message: 'Knowledge base initialized successfully'
      })
    }

    if (action === 'retrieve' && query && userId) {
      // Retrieve relevant context using RAG
      const retriever = getRAGRetriever()
      const context = await retriever.retrieve(query, userId, options || {})
      const formatted = retriever.formatContext(context)

      return NextResponse.json({
        success: true,
        context: formatted,
        documents: context.relevantDocuments.map(r => ({
          content: r.document.content,
          metadata: r.document.metadata,
          relevance: r.relevance
        })),
        metadata: context.metadata
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('RAG API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'RAG API is running',
    endpoints: {
      initialize: 'POST /api/ai/rag with { action: "initialize" }',
      retrieve: 'POST /api/ai/rag with { action: "retrieve", query: "...", userId: "..." }'
    }
  })
}

