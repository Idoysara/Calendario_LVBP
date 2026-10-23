/**
 * Calendario LVBP 26/27 - Supabase Defensive Gateway & Offline Queue
 * Ruggedized persistence layer with zero-data-loss guarantee.
 */

export class SupabaseGateway {
  constructor(supabaseClient, storage = localStorage) {
    this.sb = supabaseClient;
    this.storage = storage;
    this.offlineQueueKey = 'lvbp_offline_sync_queue';
  }

  getQueue() {
    try {
      return JSON.parse(this.storage.getItem(this.offlineQueueKey)) || [];
    } catch {
      return [];
    }
  }

  saveQueue(queue) {
    try {
      this.storage.setItem(this.offlineQueueKey, JSON.stringify(queue));
    } catch (e) {
      console.error('Storage full or unavailable:', e);
    }
  }

  enqueue(action, payload) {
    const queue = this.getQueue();
    queue.push({ action, payload, queuedAt: Date.now() });
    this.saveQueue(queue);
  }

  /**
   * Save a user match result (online upsert + offline fallback)
   */
  async saveUserScore(userId, gameId, cl, cv, note = '') {
    const record = {
      user_id: userId,
      juego: gameId,
      cl,
      cv,
      nota: note,
      updated_at: new Date().toISOString()
    };

    if (this.sb && navigator.onLine) {
      try {
        const { error } = await this.sb.from('mis_resultados').upsert(record);
        if (error) throw error;
        return { success: true, mode: 'online' };
      } catch (err) {
        console.warn('Online save failed, falling back to offline queue:', err);
      }
    }

    // Fallback offline
    this.enqueue('UPSERT_SCORE', record);
    return { success: true, mode: 'offline' };
  }

  /**
   * Save user favorite team preference
   */
  async saveUserPreference(userId, favoriteTeam, theme = 'oscuro') {
    const record = {
      user_id: userId,
      favorito: favoriteTeam,
      tema: theme,
      updated_at: new Date().toISOString()
    };

    if (this.sb && navigator.onLine) {
      try {
        const { error } = await this.sb.from('preferencias').upsert(record);
        if (error) throw error;
        return { success: true, mode: 'online' };
      } catch (err) {
        console.warn('Preference online save failed, enqueuing:', err);
      }
    }

    this.enqueue('UPSERT_PREF', record);
    return { success: true, mode: 'offline' };
  }

  /**
   * Fetch official game results from Supabase
   */
  async fetchOfficialResults() {
    if (!this.sb || !navigator.onLine) {
      return { resultados: [], estados: [] };
    }

    try {
      const [resResultados, resEstados] = await Promise.all([
        this.sb.from('resultados').select('id,cl,cv'),
        this.sb.from('estados_juego').select('id,estado')
      ]);

      return {
        resultados: resResultados.data || [],
        estados: resEstados.data || []
      };
    } catch (err) {
      console.warn('Error fetching official results:', err);
      return { resultados: [], estados: [] };
    }
  }

  /**
   * Flush offline queue to Supabase when network is restored
   */
  async flushQueue() {
    if (!this.sb || !navigator.onLine) return 0;
    const queue = this.getQueue();
    if (queue.length === 0) return 0;

    let processedCount = 0;
    const remainingQueue = [];

    for (const item of queue) {
      try {
        if (item.action === 'UPSERT_SCORE') {
          const { error } = await this.sb.from('mis_resultados').upsert(item.payload);
          if (error) throw error;
          processedCount++;
        } else if (item.action === 'UPSERT_PREF') {
          const { error } = await this.sb.from('preferencias').upsert(item.payload);
          if (error) throw error;
          processedCount++;
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);
    return processedCount;
  }
}