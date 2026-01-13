/**
 * RAG Retriever
 * 
 * Retrieves relevant context from knowledge base using RAG
 * Integrates with vector store for semantic search
 */

import { VectorStore, Document, SearchResult } from './vector-store'
import { buildUserContext } from '../context'

export interface RetrievalContext {
  relevantDocuments: SearchResult[]
  userContext: any
  query: string
  metadata: {
    retrievalTime: Date
    documentCount: number
    averageRelevance: number
  }
}

export class RAGRetriever {
  private vectorStore: VectorStore

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieve(
    query: string,
    userId: string,
    options: {
      limit?: number
      includeUserData?: boolean
      categories?: string[]
    } = {}
  ): Promise<RetrievalContext> {
    const {
      limit = 5,
      includeUserData = true,
      categories = []
    } = options

    // Search knowledge base
    let knowledgeResults: SearchResult[] = []
    try {
      knowledgeResults = await this.vectorStore.search(query, {
        limit: Math.ceil(limit * 0.7), // 70% from knowledge base
        type: 'knowledge_base',
        filter: categories.length > 0 ? { category: { $in: categories } } : {}
      })
    } catch (error) {
      console.error('Error searching knowledge base:', error)
      // Continue with empty results if search fails
    }

    // Search user-specific data if needed
    let userResults: SearchResult[] = []
    if (includeUserData) {
      try {
        userResults = await this.vectorStore.search(query, {
          limit: Math.ceil(limit * 0.3), // 30% from user data
          type: 'user_data',
          filter: { userId }
        })
      } catch (error) {
        console.error('Error searching user data:', error)
        // Continue with empty results if search fails
      }
    }

    // Combine and deduplicate results
    const allResults = [...knowledgeResults, ...userResults]
    const uniqueResults = this.deduplicateResults(allResults)

    // Sort by relevance
    const sortedResults = uniqueResults
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)

    // Get user context
    const userContext = await buildUserContext(userId)

    // Calculate metadata
    const averageRelevance = sortedResults.length > 0
      ? sortedResults.reduce((sum, r) => sum + r.relevance, 0) / sortedResults.length
      : 0

    return {
      relevantDocuments: sortedResults,
      userContext,
      query,
      metadata: {
        retrievalTime: new Date(),
        documentCount: sortedResults.length,
        averageRelevance
      }
    }
  }

  /**
   * Format retrieval context for AI prompt
   */
  formatContext(context: RetrievalContext): string {
    let formatted = '## Relevant Knowledge Base Context\n\n'

    if (context.relevantDocuments.length === 0) {
      formatted += 'No specific context found. Using general knowledge.\n\n'
      return formatted
    }

    // Group by category
    const byCategory = new Map<string, SearchResult[]>()
    context.relevantDocuments.forEach(result => {
      const category = result.document.metadata.category || 'general'
      if (!byCategory.has(category)) {
        byCategory.set(category, [])
      }
      byCategory.get(category)!.push(result)
    })

    // Format each category
    for (const [category, results] of byCategory.entries()) {
      formatted += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`
      
      results.forEach((result, index) => {
        formatted += `${index + 1}. ${result.document.content}\n`
        if (result.document.metadata.source) {
          formatted += `   Source: ${result.document.metadata.source}\n`
        }
        formatted += `   Relevance: ${(result.relevance * 100).toFixed(1)}%\n\n`
      })
    }

    formatted += `\n## Retrieval Metadata\n`
    formatted += `- Documents retrieved: ${context.metadata.documentCount}\n`
    formatted += `- Average relevance: ${(context.metadata.averageRelevance * 100).toFixed(1)}%\n`
    formatted += `- Retrieval time: ${context.metadata.retrievalTime.toISOString()}\n\n`

    return formatted
  }

  /**
   * Deduplicate search results
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    const unique: SearchResult[] = []

    for (const result of results) {
      const key = result.document.id
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(result)
      } else {
        // If duplicate, keep the one with higher relevance
        const existing = unique.find(r => r.document.id === key)
        if (existing && result.relevance > existing.relevance) {
          const index = unique.indexOf(existing)
          unique[index] = result
        }
      }
    }

    return unique
  }

  /**
   * Retrieve context for specific categories
   */
  async retrieveByCategory(
    query: string,
    userId: string,
    categories: string[],
    limit: number = 3
  ): Promise<RetrievalContext> {
    return this.retrieve(query, userId, {
      limit,
      categories,
      includeUserData: false
    })
  }

  /**
   * Retrieve user-specific context only
   */
  async retrieveUserContext(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<RetrievalContext> {
    return this.retrieve(query, userId, {
      limit,
      includeUserData: true,
      categories: []
    })
  }
}

// Singleton instance
let ragRetrieverInstance: RAGRetriever | null = null

export function getRAGRetriever(): RAGRetriever {
  if (!ragRetrieverInstance) {
    // Use dynamic import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getVectorStore } = require('./vector-store')
    ragRetrieverInstance = new RAGRetriever(getVectorStore())
  }
  return ragRetrieverInstance
}

