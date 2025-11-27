import { AnalysisResult } from '@/types';

/**
 * 内存缓存管理器
 * 用于存储分析结果（无数据库方案）
 */
class CacheManager {
  private cache = new Map<string, AnalysisResult>();
  private readonly MAX_AGE = 3600000; // 1小时

  set(key: string, value: AnalysisResult) {
    this.cache.set(key, value);
    
    // 定期清理过期数据
    this.cleanup();
  }

  get(key: string): AnalysisResult | undefined {
    const result = this.cache.get(key);
    
    if (!result) {
      return undefined;
    }
    
    // 检查是否过期
    const now = Date.now();
    if (now - result.created_at > this.MAX_AGE) {
      this.cache.delete(key);
      return undefined;
    }
    
    return result;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((value, key) => {
      if (now - value.created_at > this.MAX_AGE) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`Cleaned up expired cache entry: ${key}`);
    });
  }

  size(): number {
    return this.cache.size;
  }
}

// 单例模式
export const cacheManager = new CacheManager();

