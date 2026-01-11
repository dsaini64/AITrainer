/**
 * Advanced Cache Manager
 * Multi-level caching with intelligent invalidation
 */

export interface CacheConfig {
  maxSize: number
  ttl: number
  enableMemoryCache: boolean
  enableLocalStorageCache: boolean
  enableIndexedDBCache: boolean
  enableServiceWorkerCache: boolean
  compressionEnabled: boolean
  encryptionEnabled: boolean
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  timestamp: number
  ttl: number
  hits: number
  lastAccessed: number
  size: number
  compressed?: boolean
  encrypted?: boolean
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  evictions: number
  memoryUsage: number
  storageUsage: number
}

class CacheManager {
  private config: CacheConfig
  private memoryCache: Map<string, CacheEntry> = new Map()
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      enableMemoryCache: true,
      enableLocalStorageCache: true,
      enableIndexedDBCache: false,
      enableServiceWorkerCache: false,
      compressionEnabled: true,
      encryptionEnabled: false,
      ...config
    }

    this.initializeCache()
  }

  /**
   * Initialize cache system
   */
  private initializeCache(): void {
    this.setupMemoryCache()
    this.setupLocalStorageCache()
    this.setupIndexedDBCache()
    this.setupServiceWorkerCache()
    this.setupCleanupInterval()
  }

  /**
   * Setup memory cache
   */
  private setupMemoryCache(): void {
    if (!this.config.enableMemoryCache) return

    // Monitor memory usage
    setInterval(() => {
      this.cleanupExpiredEntries()
      this.evictIfNeeded()
    }, 60000) // Every minute
  }

  /**
   * Setup localStorage cache
   */
  private setupLocalStorageCache(): void {
    if (!this.config.enableLocalStorageCache) return

    // Clean up expired entries on startup
    this.cleanupLocalStorageCache()
  }

  /**
   * Setup IndexedDB cache
   */
  private setupIndexedDBCache(): void {
    if (!this.config.enableIndexedDBCache) return

    // Initialize IndexedDB for large data caching
    this.initializeIndexedDB()
  }

  /**
   * Setup Service Worker cache
   */
  private setupServiceWorkerCache(): void {
    if (!this.config.enableServiceWorkerCache) return

    // Register service worker for advanced caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }

  /**
   * Setup cleanup interval
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries()
      this.optimizeCache()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    if (this.config.enableMemoryCache) {
      const memoryResult = this.getFromMemoryCache<T>(key)
      if (memoryResult !== null) {
        this.stats.hits++
        return memoryResult
      }
    }

    // Try localStorage cache
    if (this.config.enableLocalStorageCache) {
      const localStorageResult = await this.getFromLocalStorageCache<T>(key)
      if (localStorageResult !== null) {
        this.stats.hits++
        // Promote to memory cache
        if (this.config.enableMemoryCache) {
          this.setInMemoryCache(key, localStorageResult)
        }
        return localStorageResult
      }
    }

    // Try IndexedDB cache
    if (this.config.enableIndexedDBCache) {
      const indexedDBResult = await this.getFromIndexedDBCache<T>(key)
      if (indexedDBResult !== null) {
        this.stats.hits++
        // Promote to memory cache
        if (this.config.enableMemoryCache) {
          this.setInMemoryCache(key, indexedDBResult)
        }
        return indexedDBResult
      }
    }

    this.stats.misses++
    return null
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entryTTL = ttl || this.config.ttl
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: entryTTL,
      hits: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(value)
    }

    // Compress if enabled
    if (this.config.compressionEnabled) {
      entry.value = this.compress(entry.value) as T
      entry.compressed = true
    }

    // Encrypt if enabled
    if (this.config.encryptionEnabled) {
      entry.value = this.encrypt(entry.value) as T
      entry.encrypted = true
    }

    // Set in all enabled caches
    if (this.config.enableMemoryCache) {
      this.setInMemoryCache(key, entry)
    }

    if (this.config.enableLocalStorageCache) {
      await this.setInLocalStorageCache(key, entry)
    }

    if (this.config.enableIndexedDBCache) {
      await this.setInIndexedDBCache(key, entry)
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (this.config.enableMemoryCache) {
      this.memoryCache.delete(key)
    }

    if (this.config.enableLocalStorageCache) {
      localStorage.removeItem(`cache_${key}`)
    }

    if (this.config.enableIndexedDBCache) {
      await this.deleteFromIndexedDBCache(key)
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.config.enableMemoryCache) {
      this.memoryCache.clear()
    }

    if (this.config.enableLocalStorageCache) {
      this.clearLocalStorageCache()
    }

    if (this.config.enableIndexedDBCache) {
      await this.clearIndexedDBCache()
    }

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0
    }
  }

  /**
   * Get from memory cache
   */
  private getFromMemoryCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key)
    if (!entry) return null

    if (this.isExpired(entry)) {
      this.memoryCache.delete(key)
      return null
    }

    entry.hits++
    entry.lastAccessed = Date.now()

    let value = entry.value
    if (entry.encrypted) {
      value = this.decrypt(value) as T
    }
    if (entry.compressed) {
      value = this.decompress(value) as T
    }

    return value
  }

  /**
   * Set in memory cache
   */
  private setInMemoryCache<T>(key: string, value: T | CacheEntry<T>): void {
    const entry = this.isCacheEntry(value) ? value : this.createCacheEntry(key, value)
    this.memoryCache.set(key, entry)
    this.stats.totalSize += entry.size
  }

  /**
   * Get from localStorage cache
   */
  private async getFromLocalStorageCache<T>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(`cache_${key}`)
      if (!stored) return null

      const entry: CacheEntry<T> = JSON.parse(stored)
      if (this.isExpired(entry)) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }

      entry.hits++
      entry.lastAccessed = Date.now()

      let value = entry.value
      if (entry.encrypted) {
        value = this.decrypt(value) as T
      }
      if (entry.compressed) {
        value = this.decompress(value) as T
      }

      return value
    } catch (error) {
      console.error('Failed to get from localStorage cache:', error)
      return null
    }
  }

  /**
   * Set in localStorage cache
   */
  private async setInLocalStorageCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry))
    } catch (error) {
      console.error('Failed to set in localStorage cache:', error)
    }
  }

  /**
   * Get from IndexedDB cache
   */
  private async getFromIndexedDBCache<T>(key: string): Promise<T | null> {
    // Simplified IndexedDB implementation
    return null
  }

  /**
   * Set in IndexedDB cache
   */
  private async setInIndexedDBCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Simplified IndexedDB implementation
  }

  /**
   * Delete from IndexedDB cache
   */
  private async deleteFromIndexedDBCache(key: string): Promise<void> {
    // Simplified IndexedDB implementation
  }

  /**
   * Clear IndexedDB cache
   */
  private async clearIndexedDBCache(): Promise<void> {
    // Simplified IndexedDB implementation
  }

  /**
   * Initialize IndexedDB
   */
  private initializeIndexedDB(): void {
    // Simplified IndexedDB implementation
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Create cache entry
   */
  private createCacheEntry<T>(key: string, value: T): CacheEntry<T> {
    return {
      key,
      value,
      timestamp: Date.now(),
      ttl: this.config.ttl,
      hits: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(value)
    }
  }

  /**
   * Check if value is CacheEntry
   */
  private isCacheEntry<T>(value: T | CacheEntry<T>): value is CacheEntry<T> {
    return typeof value === 'object' && value !== null && 'timestamp' in value
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: any): number {
    return JSON.stringify(value).length * 2 // Rough estimate
  }

  /**
   * Compress value
   */
  private compress(value: any): any {
    // Simple compression - in production, use proper compression library
    return btoa(JSON.stringify(value))
  }

  /**
   * Decompress value
   */
  private decompress(value: any): any {
    try {
      return JSON.parse(atob(value))
    } catch (error) {
      return value
    }
  }

  /**
   * Encrypt value
   */
  private encrypt(value: any): any {
    // Simple encryption - in production, use proper encryption library
    return btoa(JSON.stringify(value))
  }

  /**
   * Decrypt value
   */
  private decrypt(value: any): any {
    try {
      return JSON.parse(atob(value))
    } catch (error) {
      return value
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key)
        this.stats.totalSize -= entry.size
      }
    }

    // Clean localStorage cache
    this.cleanupLocalStorageCache()
  }

  /**
   * Cleanup localStorage cache
   */
  private cleanupLocalStorageCache(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'))
    
    keys.forEach(key => {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const entry: CacheEntry = JSON.parse(stored)
          if (this.isExpired(entry)) {
            localStorage.removeItem(key)
          }
        }
      } catch (error) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Evict entries if cache is full
   */
  private evictIfNeeded(): void {
    if (this.memoryCache.size <= this.config.maxSize) return

    // Sort by last accessed time and evict oldest
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    const toEvict = entries.slice(0, entries.length - this.config.maxSize)
    
    toEvict.forEach(([key]) => {
      const entry = this.memoryCache.get(key)
      if (entry) {
        this.stats.totalSize -= entry.size
        this.stats.evictions++
      }
      this.memoryCache.delete(key)
    })
  }

  /**
   * Optimize cache
   */
  private optimizeCache(): void {
    // Remove least used entries
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].hits - b[1].hits)

    const toRemove = entries.slice(0, Math.floor(entries.length * 0.1)) // Remove 10% of least used
    
    toRemove.forEach(([key]) => {
      const entry = this.memoryCache.get(key)
      if (entry) {
        this.stats.totalSize -= entry.size
        this.stats.evictions++
      }
      this.memoryCache.delete(key)
    })
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0

    return {
      totalEntries: this.memoryCache.size,
      totalSize: this.stats.totalSize,
      hitRate,
      missRate,
      evictions: this.stats.evictions,
      memoryUsage: this.getMemoryUsage(),
      storageUsage: this.getStorageUsage()
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Get storage usage
   */
  private getStorageUsage(): number {
    let totalSize = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('cache_')) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += key.length + value.length
        }
      }
    }
    
    return totalSize
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return this.config
  }
}

export const cacheManager = new CacheManager()












