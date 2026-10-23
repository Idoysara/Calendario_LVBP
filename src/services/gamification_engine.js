/**
 * Calendario LVBP 26/27 - Gamification & Stamp Collection Engine
 * Collectible baseball stickers, rarity levels, and milestone rewards.
 */

import { StampRarity } from '../domain/domain_models.js';

export const OFFICIAL_STAMPS = [
  {
    id: 'stamp_first_score',
    name: 'Bautizo de Fuego',
    description: 'Anota tu primer marcador en el álbum.',
    rarity: StampRarity.COMMON,
    criteria: (state) => Object.keys(state.markedScores).length >= 1
  },
  {
    id: 'stamp_classic_rival',
    name: 'El Eterno Rival',
    description: 'Anota un clásico Caracas vs Magallanes.',
    rarity: StampRarity.RARE,
    criteria: (state) => Object.keys(state.markedScores).some(id => id.includes('leones_vs_magallanes') || id.includes('magallanes_vs_leones'))
  },
  {
    id: 'stamp_loyal_fan',
    name: 'Fanático Fiel',
    description: 'Anota al menos 5 juegos de tu equipo favorito.',
    rarity: StampRarity.RARE,
    criteria: (state) => {
      const fav = state.favoriteTeam;
      if (!fav) return false;
      const count = Object.keys(state.markedScores).filter(id => id.includes(fav)).length;
      return count >= 5;
    }
  },
  {
    id: 'stamp_prophet',
    name: 'El Profeta del Béisbol',
    description: 'Acierta un resultado exacto en la quiniela.',
    rarity: StampRarity.HOLOGRAPHIC,
    criteria: (state) => (state.exactPredictionsCount || 0) >= 1
  },
  {
    id: 'stamp_grand_slam',
    name: 'Grand Slam de Oro',
    description: 'Colecciona más de 25 juegos anotados y 100 puntos en quiniela.',
    rarity: StampRarity.LEGENDARY,
    criteria: (state) => Object.keys(state.markedScores).length >= 25 && (state.totalPoints || 0) >= 100
  }
];

export class GamificationEngine {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.storageKey = 'lvbp_unlocked_stamps';
  }

  getUnlockedStamps() {
    try {
      return JSON.parse(this.storage.getItem(this.storageKey)) || [];
    } catch {
      return [];
    }
  }

  saveUnlockedStamps(stamps) {
    this.storage.setItem(this.storageKey, JSON.stringify(stamps));
  }

  /**
   * Evaluate state and trigger unlock for eligible stamps
   */
  evaluateMilestones(userState) {
    const currentUnlocked = new Set(this.getUnlockedStamps());
    const newlyUnlocked = [];

    for (const stamp of OFFICIAL_STAMPS) {
      if (!currentUnlocked.has(stamp.id)) {
        if (stamp.criteria(userState)) {
          currentUnlocked.add(stamp.id);
          newlyUnlocked.push({
            ...stamp,
            unlockedAt: new Date().toISOString()
          });
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      this.saveUnlockedStamps(Array.from(currentUnlocked));
    }

    return {
      totalUnlocked: currentUnlocked.size,
      totalAvailable: OFFICIAL_STAMPS.length,
      percentage: Math.round((currentUnlocked.size / OFFICIAL_STAMPS.length) * 100),
      newlyUnlocked
    };
  }
}