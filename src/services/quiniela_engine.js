/**
 * Calendario LVBP 26/27 - Quiniela & Predictions Scoring Engine
 * Deterministic scoring, deadline enforcement, and anti-cheat validation.
 */

import { calculateQuinielaPoints, GameStatus } from '../domain/domain_models.js';
import { IntegrityGuard } from '../security/crypto_tokens.js';

export class QuinielaEngine {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.storageKey = 'lvbp_user_predictions';
  }

  getPredictions() {
    try {
      return JSON.parse(this.storage.getItem(this.storageKey)) || {};
    } catch {
      return {};
    }
  }

  savePredictions(preds) {
    this.storage.setItem(this.storageKey, JSON.stringify(preds));
  }

  /**
   * Submit a prediction with timestamp and cryptographic signature
   */
  async submitPrediction(userId, game, homeScore, visitorScore, currentTime = new Date()) {
    // 1. Deadline check: Cannot predict after game start time
    const gameKickoff = new Date(`${game.date}T${game.time}:00-04:00`);
    if (currentTime > gameKickoff) {
      throw new Error(`Predicción rechazada: el juego comenzó el ${game.date} a las ${game.time}`);
    }

    if (homeScore === visitorScore) {
      throw new Error('En el béisbol no existen empates; elige un ganador.');
    }

    const timestamp = currentTime.toISOString();
    const signature = await IntegrityGuard.signPrediction(userId, game.id, homeScore, visitorScore, timestamp);

    const prediction = {
      userId,
      gameId: game.id,
      cl: homeScore,
      cv: visitorScore,
      timestamp,
      signature
    };

    const all = this.getPredictions();
    all[game.id] = prediction;
    this.savePredictions(all);

    return prediction;
  }

  /**
   * Compute total points achieved by user against official results
   */
  evaluateAll(officialResultsMap) {
    const predictions = this.getPredictions();
    let totalScore = 0;
    let exactCount = 0;
    let correctWinnersCount = 0;
    const details = [];

    for (const [gameId, pred] of Object.entries(predictions)) {
      const official = officialResultsMap[gameId];
      if (official && official.status === GameStatus.FINAL) {
        const pts = calculateQuinielaPoints(pred, official);
        totalScore += pts;
        if (pts === 15) exactCount++;
        if (pts >= 5) correctWinnersCount++;

        details.push({
          gameId,
          prediction: pred,
          official,
          pointsAwarded: pts
        });
      }
    }

    return {
      totalScore,
      exactCount,
      correctWinnersCount,
      evaluatedGamesCount: details.length,
      details
    };
  }
}