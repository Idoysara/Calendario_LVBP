/**
 * Calendario LVBP 26/27 - Client Domain Models & Invariants
 * Pure ES6+, Zero external dependencies, Deterministic verification.
 */

export const GameStatus = Object.freeze({
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  FINAL: 'final',
  POSTPONED: 'postponed',
  SUSPENDED: 'suspended'
});

export const StampRarity = Object.freeze({
  COMMON: 'common',
  RARE: 'rare',
  HOLOGRAPHIC: 'holographic',
  LEGENDARY: 'legendary'
});

export const TEAMS = Object.freeze({
  aguilas: {
    slug: 'aguilas',
    name: 'Águilas del Zulia',
    shortName: 'Águilas',
    city: 'Maracaibo',
    stadium: 'Luis Aparicio El Grande',
    primary: '#ff6600',
    secondary: '#000000',
    accent: '#ffcc00',
    classic: 'cardenales'
  },
  bravos: {
    slug: 'bravos',
    name: 'Bravos de Margarita',
    shortName: 'Bravos',
    city: 'Porlamar',
    stadium: 'Nueva Esparta',
    primary: '#008080',
    secondary: '#ffffff',
    accent: '#e6b800',
    classic: 'caribes'
  },
  cardenales: {
    slug: 'cardenales',
    name: 'Cardenales de Lara',
    shortName: 'Cardenales',
    city: 'Barquisimeto',
    stadium: 'Antonio Herrera Gutiérrez',
    primary: '#d6001c',
    secondary: '#000000',
    accent: '#ffffff',
    classic: 'aguilas'
  },
  caribes: {
    slug: 'caribes',
    name: 'Caribes de Anzoátegui',
    shortName: 'Caribes',
    city: 'Puerto La Cruz',
    stadium: "Alfonso 'Chico' Carrasquel",
    primary: '#ff6600',
    secondary: '#003366',
    accent: '#ffffff',
    classic: 'bravos'
  },
  leones: {
    slug: 'leones',
    name: 'Leones del Caracas',
    shortName: 'Leones',
    city: 'Caracas',
    stadium: 'Estadio Monumental Simón Bolívar',
    primary: '#14110b',
    secondary: '#c9a227',
    accent: '#efdfa6',
    classic: 'magallanes'
  },
  magallanes: {
    slug: 'magallanes',
    name: 'Navegantes del Magallanes',
    shortName: 'Magallanes',
    city: 'Valencia',
    stadium: 'José Bernardo Pérez',
    primary: '#0a3a8c',
    secondary: '#f2b705',
    accent: '#cfdcf7',
    classic: 'leones'
  },
  tiburones: {
    slug: 'tiburones',
    name: 'Tiburones de La Guaira',
    shortName: 'Tiburones',
    city: 'La Guaira',
    stadium: 'Jorge Luis García Carneiro',
    primary: '#c8102e',
    secondary: '#00205b',
    accent: '#ffd100',
    classic: 'leones'
  },
  tigres: {
    slug: 'tigres',
    name: 'Tigres de Aragua',
    shortName: 'Tigres',
    city: 'Maracay',
    stadium: 'José Pérez Colmenares',
    primary: '#001e62',
    secondary: '#d81e05',
    accent: '#ffffff',
    classic: 'magallanes'
  }
});

/**
 * Validates a match score and prevents impossible baseball states
 */
export function validateBaseballScore(homeScore, visitorScore, isFinal = true) {
  if (typeof homeScore !== 'number' || typeof visitorScore !== 'number') {
    throw new TypeError('Scores must be integers');
  }
  if (homeScore < 0 || visitorScore < 0) {
    throw new RangeError('Scores cannot be negative');
  }
  if (isFinal && homeScore === visitorScore) {
    throw new Error('Baseball games cannot finish tied (extra innings mandatory)');
  }
  return true;
}

/**
 * Calculates score in Quiniela rules
 */
export function calculateQuinielaPoints(prediction, actual) {
  if (!actual || actual.status !== GameStatus.FINAL) return 0;
  if (typeof actual.cl !== 'number' || typeof actual.cv !== 'number') return 0;

  const actualWinner = actual.cl > actual.cv ? 'home' : 'visitor';
  const predWinner = prediction.cl > prediction.cv ? 'home' : 'visitor';

  let points = 0;
  if (actualWinner === predWinner) {
    points += 5; // Winner acertado

    const actualDiff = Math.abs(actual.cl - actual.cv);
    const predDiff = Math.abs(prediction.cl - prediction.cv);
    if (actualDiff === predDiff) {
      points += 3; // Diferencia de carreras acertada
    }

    if (prediction.cl === actual.cl && prediction.cv === actual.cv) {
      points += 7; // Marcador exacto perfecto (15 pts total)
    }
  }
  return points;
}