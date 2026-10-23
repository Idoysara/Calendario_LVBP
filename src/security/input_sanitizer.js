/**
 * Calendario LVBP 26/27 - Input Sanitizer & Defensive Validator
 * Military-grade input scrubbing, zero-trust validation.
 */

export class SecuritySanitizer {
  /**
   * Escape HTML entities and strip inline event handlers / javascript: protocols
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const stripped = str
      .replace(/\bon\w+\s*=/gi, 'data-blocked=')
      .replace(/javascript:/gi, 'blocked:');
    return stripped
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize baseball scores (0 - 99 range)
   */
  static sanitizeScore(input) {
    if (input === null || input === undefined || input === '') return null;
    const parsed = parseInt(String(input).trim(), 10);
    if (isNaN(parsed)) return null;
    // Clamping to realistic baseball boundaries
    if (parsed < 0) return 0;
    if (parsed > 99) return 99;
    return parsed;
  }

  /**
   * Sanitize personal notes (max 140 chars, stripped of dangerous characters)
   */
  static sanitizeNote(input) {
    if (typeof input !== 'string') return '';
    const trimmed = input.trim().slice(0, 140);
    return this.escapeHtml(trimmed);
  }

  /**
   * Validate team slug against official whitelist
   */
  static validateTeamSlug(slug) {
    const whitelist = ['aguilas', 'bravos', 'cardenales', 'caribes', 'leones', 'magallanes', 'tiburones', 'tigres'];
    return whitelist.includes(String(slug).toLowerCase().trim()) ? String(slug).toLowerCase().trim() : 'leones';
  }
}