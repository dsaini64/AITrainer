/**
 * Initialize Knowledge Base API
 * 
 * Endpoint to initialize the knowledge base with embeddings
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeKnowledgeBase } from '@/lib/ai/rag/knowledge-base'

export async function POST(request: NextRequest) {
  try {
    await initializeKnowledgeBase()
    
    return NextResponse.json({
      success: true,
      message: 'Knowledge base initialized successfully'
    })
  } catch (error) {
    console.error('Knowledge base initialization error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to initialize knowledge base',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Knowledge base initialization endpoint',
    usage: 'POST /api/ai/init-knowledge-base to initialize the knowledge base'
  })
}

