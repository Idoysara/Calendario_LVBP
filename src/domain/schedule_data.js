/**
 * Calendario LVBP 26/27 - Schedule Repository
 * Full 224 official games for the 2026-2027 season
 */

import rawGames from './schedule_raw.json' with { type: 'json' };
import { TEAMS } from './domain_models.js';

export const ALL_GAMES = Object.freeze(rawGames.map((g, index) => {
  const id = `${g.f}_${g.v}_vs_${g.l}`;
  const homeTeam = TEAMS[g.l];
  const visitorTeam = TEAMS[g.v];
  const stadium = homeTeam ? homeTeam.stadium : 'Estadio TBD';
  const isClassic = homeTeam && homeTeam.classic === g.v;

  return Object.freeze({
    index: index + 1,
    id,
    date: g.f,
    time: g.h || '19:00',
    visitor: g.v,
    home: g.l,
    stadium,
    isClassic
  });
}));

/**
 * Filter games by team (home or visitor)
 */
export function getGamesForTeam(teamSlug) {
  return ALL_GAMES.filter(g => g.home === teamSlug || g.visitor === teamSlug);
}

/**
 * Filter games for a specific calendar date (YYYY-MM-DD)
 */
export function getGamesForDate(dateStr) {
  return ALL_GAMES.filter(g => g.date === dateStr);
}

/**
 * Get next or active game for team relative to a target date
 */
export function getNextGameForTeam(teamSlug, targetDate = '2026-10-23') {
  const teamGames = getGamesForTeam(teamSlug);
  return teamGames.find(g => g.date >= targetDate) || teamGames[0];
}