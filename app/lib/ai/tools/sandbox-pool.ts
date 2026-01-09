import { Sandbox } from '@vercel/sandbox';

/**
 * Pool di sandbox riutilizzabili per ottimizzare l'uso delle risorse Vercel
 * 
 * Invece di creare un nuovo sandbox per ogni query, riutilizziamo quelli esistenti.
 * Questo riduce drasticamente il numero di sandbox creati e previene il rate limiting.
 */

interface PooledSandbox {
  sandbox: Sandbox;
  lastUsed: number;
  inUse: boolean;
}

class SandboxPool {
  private pool: Map<string, PooledSandbox> = new Map();
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minuti
  private readonly maxPoolSize = 5; // Massimo 5 sandbox nel pool
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Avvia pulizia periodica ogni 2 minuti
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSandboxes();
    }, 2 * 60 * 1000);
  }

  /**
   * Ottieni un sandbox dal pool o creane uno nuovo
   */
  async acquire(runtime: 'node24' = 'node24', timeout: number = 60000): Promise<Sandbox> {
    // Cerca un sandbox disponibile nel pool
    for (const [id, pooled] of this.pool.entries()) {
      if (!pooled.inUse) {
        console.log(`[SANDBOX POOL] Reusing existing sandbox: ${id}`);
        pooled.inUse = true;
        pooled.lastUsed = Date.now();
        return pooled.sandbox;
      }
    }

    // Nessun sandbox disponibile, creane uno nuovo
    console.log('[SANDBOX POOL] Creating new sandbox');
    const sandbox = await Sandbox.create({
      runtime,
      timeout,
    });

    const sandboxId = (sandbox as any).sandboxId || `sandbox-${Date.now()}`;
    
    // Aggiungi al pool se c'è spazio
    if (this.pool.size < this.maxPoolSize) {
      this.pool.set(sandboxId, {
        sandbox,
        lastUsed: Date.now(),
        inUse: true,
      });
      console.log(`[SANDBOX POOL] Added to pool. Pool size: ${this.pool.size}/${this.maxPoolSize}`);
    } else {
      console.log('[SANDBOX POOL] Pool full, sandbox will not be cached');
    }

    return sandbox;
  }

  /**
   * Rilascia un sandbox nel pool (non lo distrugge)
   */
  release(sandbox: Sandbox): void {
    const sandboxId = (sandbox as any).sandboxId;
    const pooled = this.pool.get(sandboxId);
    
    if (pooled) {
      console.log(`[SANDBOX POOL] Released sandbox: ${sandboxId}`);
      pooled.inUse = false;
      pooled.lastUsed = Date.now();
    }
  }

  /**
   * Rimuovi un sandbox dal pool (per sandbox morti/fermati)
   */
  remove(sandbox: Sandbox): void {
    const sandboxId = (sandbox as any).sandboxId;
    const pooled = this.pool.get(sandboxId);
    
    if (pooled) {
      console.log(`[SANDBOX POOL] Removing dead sandbox from pool: ${sandboxId}`);
      this.pool.delete(sandboxId);
      console.log(`[SANDBOX POOL] Pool size after removal: ${this.pool.size}`);
    }
  }

  /**
   * Pulisce i sandbox inutilizzati da troppo tempo
   */
  private async cleanupIdleSandboxes(): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, pooled] of this.pool.entries()) {
      if (!pooled.inUse && (now - pooled.lastUsed) > this.maxIdleTime) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      const pooled = this.pool.get(id);
      if (pooled) {
        try {
          console.log(`[SANDBOX POOL] Cleaning up idle sandbox: ${id}`);
          await pooled.sandbox.stop();
          this.pool.delete(id);
        } catch (error) {
          console.error(`[SANDBOX POOL] Error cleaning up sandbox ${id}:`, error);
        }
      }
    }

    if (toRemove.length > 0) {
      console.log(`[SANDBOX POOL] Cleaned up ${toRemove.length} idle sandbox(es). Pool size: ${this.pool.size}`);
    }
  }

  /**
   * Ottieni statistiche del pool
   */
  getStats(): { total: number; inUse: number; available: number } {
    let inUse = 0;
    for (const pooled of this.pool.values()) {
      if (pooled.inUse) inUse++;
    }

    return {
      total: this.pool.size,
      inUse,
      available: this.pool.size - inUse,
    };
  }

  /**
   * Distruggi tutti i sandbox e pulisci il pool
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('[SANDBOX POOL] Destroying all sandboxes...');
    const promises: Promise<void>[] = [];

    for (const [id, pooled] of this.pool.entries()) {
      promises.push(
        pooled.sandbox.stop().catch((error) => {
          console.error(`[SANDBOX POOL] Error stopping sandbox ${id}:`, error);
        })
      );
    }

    await Promise.all(promises);
    this.pool.clear();
    console.log('[SANDBOX POOL] All sandboxes destroyed');
  }
}

// Singleton instance
let globalPool: SandboxPool | null = null;

export function getSandboxPool(): SandboxPool {
  if (!globalPool) {
    globalPool = new SandboxPool();
  }
  return globalPool;
}

export async function destroySandboxPool(): Promise<void> {
  if (globalPool) {
    await globalPool.destroy();
    globalPool = null;
  }
}
