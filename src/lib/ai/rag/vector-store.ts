/**
 * RAG Vector Store
 * 
 * Handles vector embeddings and similarity search for RAG
 * Uses Supabase pgvector extension for vector storage and retrieval
 */

import { createClient } from '@supabase/supabase-js'
import { openai } from '../openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface Document {
  id: string
  content: string
  metadata: {
    type: 'knowledge_base' | 'conversation' | 'user_data'
    category?: string
    source?: string
    userId?: string
    timestamp?: Date
    [key: string]: any
  }
}

export interface SearchResult {
  document: Document
  score: number
  relevance: number
}

export class VectorStore {
  /**
   * Generate embeddings for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  /**
   * Store a document with its embedding
   */
  async storeDocument(document: Document): Promise<string> {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(document.content)

      // Store in database
      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .insert({
          content: document.content,
          metadata: document.metadata,
          embedding: embedding,
        })
        .select('id')
        .single()

      if (error) throw error

      return data.id
    } catch (error) {
      console.error('Error storing document:', error)
      throw error
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async search(
    query: string,
    options: {
      limit?: number
      threshold?: number
      filter?: Record<string, any>
      type?: 'knowledge_base' | 'conversation' | 'user_data'
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        limit = 5,
        threshold = 0.7,
        filter = {},
        type
      } = options

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query)

      // Call the match_documents function
      const { data, error } = await supabaseAdmin.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        filter_metadata: type ? { type, ...filter } : filter
      } as any)

      if (error) {
        console.error('Vector search error:', error)
        // Fallback to simple text search if vector search fails
        return this.fallbackTextSearch(query, options)
      }

      // Transform results
      const results: SearchResult[] = (data || []).map((item: any) => ({
        document: {
          id: item.id,
          content: item.content,
          metadata: item.metadata || {}
        },
        score: item.similarity || 0,
        relevance: item.similarity || 0
      }))

      return results
    } catch (error) {
      console.error('Error searching documents:', error)
      // Fallback to simple text search if vector search fails
      return this.fallbackTextSearch(query, options)
    }
  }

  /**
   * Fallback text search if vector search is unavailable
   */
  private async fallbackTextSearch(
    query: string,
    options: {
      limit?: number
      type?: 'knowledge_base' | 'conversation' | 'user_data'
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 5, type } = options

    try {
      let queryBuilder = supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .limit(limit)

      if (type) {
        queryBuilder = queryBuilder.eq('metadata->>type', type)
      }

      const { data, error } = await queryBuilder

      if (error) {
        console.error('Fallback search error:', error)
        // If table doesn't exist, return empty results
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('Knowledge base table does not exist yet. Run migration to create it.')
          return []
        }
        return []
      }

      // Simple text matching
      const queryLower = query.toLowerCase()
      const results: SearchResult[] = (data || [])
        .map((item: any) => {
          const contentLower = (item.content || '').toLowerCase()
          const matches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length
          const score = matches / Math.max(contentLower.length, 1)

          return {
            document: {
              id: item.id,
              content: item.content,
              metadata: item.metadata || {}
            },
            score,
            relevance: score
          }
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      return results
    } catch (error) {
      console.error('Fallback search exception:', error)
      return []
    }
  }

  /**
   * Store multiple documents in batch
   */
  async storeDocuments(documents: Document[]): Promise<string[]> {
    const ids: string[] = []

    // Process in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)

      // Generate embeddings for batch
      const embeddings = await Promise.all(
        batch.map(doc => this.generateEmbedding(doc.content))
      )

      // Store batch
      const inserts = batch.map((doc, index) => ({
        content: doc.content,
        metadata: doc.metadata,
        embedding: embeddings[index]
      }))

      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .insert(inserts)
        .select('id')

      if (error) {
        console.error('Error storing batch:', error)
        continue
      }

      ids.push(...(data?.map(item => item.id) || []))
    }

    return ids
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('knowledge_base')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting document:', error)
      return false
    }
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, document: Partial<Document>): Promise<boolean> {
    try {
      const updateData: any = {}

      if (document.content) {
        // Regenerate embedding if content changed
        updateData.embedding = await this.generateEmbedding(document.content)
        updateData.content = document.content
      }

      if (document.metadata) {
        updateData.metadata = document.metadata
      }

      const { error } = await supabaseAdmin
        .from('knowledge_base')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating document:', error)
      return false
    }
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore()
  }
  return vectorStoreInstance
}

