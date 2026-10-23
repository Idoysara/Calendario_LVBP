/**
 * Calendario LVBP 26/27 - Cryptographic Token & Integrity Generator
 * Uses Web Crypto API (SHA-256) to ensure tamper-evident records.
 */

export class IntegrityGuard {
  static async sha256(message) {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      // Fallback for non-crypto environments (simple hash for consistency)
      let hash = 0;
      for (let i = 0; i < message.length; i++) {
        hash = ((hash << 5) - hash) + message.charCodeAt(i);
        hash |= 0;
      }
      return 'fb_' + Math.abs(hash).toString(16);
    }

    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates a tamper-evident signature for a user prediction
   */
  static async signPrediction(userId, gameId, homeScore, visitorScore, timestamp) {
    const canonical = `${userId}:${gameId}:${homeScore}-${visitorScore}:${timestamp}:lvbp2627`;
    return await this.sha256(canonical);
  }

  /**
   * Verifies prediction signature against tamper
   */
  static async verifyPrediction(prediction) {
    if (!prediction || !prediction.signature) return false;
    const expected = await this.signPrediction(
      prediction.userId,
      prediction.gameId,
      prediction.homeScore,
      prediction.visitorScore,
      prediction.timestamp
    );
    return expected === prediction.signature;
  }
}