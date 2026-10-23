/**
 * Calendario LVBP 26/27 - Main Hardened Controller & Album View
 * Integrates Schedule, Supabase Gateway, Hubmy SSO, Gamification & Quiniela.
 */

import { TEAMS, GameStatus } from '../domain/domain_models.js';
import { ALL_GAMES, getGamesForTeam } from '../domain/schedule_data.js';
import { SecuritySanitizer } from '../security/input_sanitizer.js';
import { GamificationEngine } from '../services/gamification_engine.js';
import { QuinielaEngine } from '../services/quiniela_engine.js';
import { HubmyClient } from '../infrastructure/hubmy_client.js';

export class AlbumApp {
  constructor() {
    this.hubmy = new HubmyClient();
    this.gamification = new GamificationEngine();
    this.quiniela = new QuinielaEngine();
    
    this.currentTeam = localStorage.getItem('lvbp-equipo') || 'leones';
    this.favoriteTeam = localStorage.getItem('lvbp-favorito') || '';
    this.activeTab = 'album'; // 'album' | 'quiniela' | 'coleccion' | 'posiciones'
    this.markedScores = JSON.parse(localStorage.getItem('lvbp-anotaciones') || '{}');
    this.officialResults = {};
    this.user = null;
  }

  init() {
    this.bindEvents();
    this.loadState();
    this.render();
  }

  bindEvents() {
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab) {
          this.activeTab = tab;
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.renderContent();
        }
      });
    });

    document.querySelectorAll('.team-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const team = e.currentTarget.dataset.team;
        if (team && TEAMS[team]) {
          this.currentTeam = team;
          localStorage.setItem('lvbp-equipo', team);
          this.render();
        }
      });
    });

    const btnLogin = document.getElementById('btn-hubmy-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', () => this.hubmy.login());
    }
  }

  updateOnlineStatus() {
    const badge = document.getElementById('connection-status');
    if (badge) {
      if (navigator.onLine) {
        badge.textContent = '🟢 Conectado';
        badge.className = 'status-badge online';
      } else {
        badge.textContent = '🟠 Modo Offline';
        badge.className = 'status-badge offline';
      }
    }
  }

  loadState() {
    // Check if returning from Hubmy OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.has('hubmy_token') || params.has('hubmy')) {
      this.user = { id: 'usr_hubmy_verified', name: 'Usuario Hubmy' };
      localStorage.setItem('lvbp-user', JSON.stringify(this.user));
    } else {
      try {
        this.user = JSON.parse(localStorage.getItem('lvbp-user'));
      } catch {}
    }

    // Evaluate gamification achievements
    this.gamification.evaluateMilestones({
      markedScores: this.markedScores,
      favoriteTeam: this.favoriteTeam,
      totalPoints: 0
    });
  }

  render() {
    this.updateOnlineStatus();
    this.renderHeader();
    this.renderContent();
  }

  renderHeader() {
    const team = TEAMS[this.currentTeam] || TEAMS.leones;
    document.documentElement.style.setProperty('--team-primary', team.primary);
    document.documentElement.style.setProperty('--team-accent', team.accent);

    const titleEl = document.getElementById('active-team-title');
    if (titleEl) {
      titleEl.textContent = team.name;
    }

    const authEl = document.getElementById('auth-section');
    if (authEl) {
      if (this.user) {
        authEl.innerHTML = `<span class="user-badge">✓ Conectado con Hubmy</span>`;
      } else {
        authEl.innerHTML = `<button class="btn-login" id="btn-hubmy-login">Entrar con Hubmy</button>`;
        document.getElementById('btn-hubmy-login')?.addEventListener('click', () => this.hubmy.login());
      }
    }
  }

  renderContent() {
    const container = document.getElementById('main-container');
    if (!container) return;

    if (this.activeTab === 'album') {
      this.renderAlbumView(container);
    } else if (this.activeTab === 'quiniela') {
      this.renderQuinielaView(container);
    } else if (this.activeTab === 'coleccion') {
      this.renderCollectionView(container);
    } else if (this.activeTab === 'posiciones') {
      this.renderStandingsView(container);
    }
  }

  renderAlbumView(container) {
    const games = getGamesForTeam(this.currentTeam);
    const team = TEAMS[this.currentTeam];

    container.innerHTML = `
      <div class="album-page">
        <div class="page-meta">
          <h2>Juegos de ${team.shortName} (Temporada Regular 2026-27)</h2>
          <p class="subtitle">Anota las carreras o consulta el marcador oficial en vivo.</p>
        </div>
        <div class="games-grid">
          ${games.map(g => this.renderGameCard(g)).join('')}
        </div>
      </div>
    `;

    // Bind score save buttons
    container.querySelectorAll('.btn-save-score').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gameId = e.currentTarget.dataset.game;
        const clInput = container.querySelector(`input[data-cl="${gameId}"]`);
        const cvInput = container.querySelector(`input[data-cv="${gameId}"]`);
        const cl = SecuritySanitizer.sanitizeScore(clInput?.value);
        const cv = SecuritySanitizer.sanitizeScore(cvInput?.value);

        if (cl !== null && cv !== null) {
          this.markedScores[gameId] = { cl, cv };
          localStorage.setItem('lvbp-anotaciones', JSON.stringify(this.markedScores));
          
          // Re-evaluate stamps
          const res = this.gamification.evaluateMilestones({
            markedScores: this.markedScores,
            favoriteTeam: this.favoriteTeam
          });

          if (res.newlyUnlocked.length > 0) {
            alert(`🎉 ¡Desbloqueaste una nueva estampa!: ${res.newlyUnlocked[0].name}`);
          }
          this.renderContent();
        }
      });
    });
  }

  renderGameCard(game) {
    const homeTeam = TEAMS[game.home] || { shortName: game.home };
    const visitorTeam = TEAMS[game.visitor] || { shortName: game.visitor };
    const userScore = this.markedScores[game.id] || {};
    const official = this.officialResults[game.id];

    return `
      <div class="game-stamp ${game.isClassic ? 'is-classic' : ''}">
        ${game.isClassic ? '<div class="classic-ribbon">⭐ CLÁSICO</div>' : ''}
        <div class="stamp-header">
          <span class="game-date">${game.date} - ${game.time}</span>
          <span class="game-stadium">📍 ${game.stadium}</span>
        </div>
        <div class="teams-versus">
          <div class="team-side ${game.visitor === this.currentTeam ? 'active-team' : ''}">
            <span class="t-name">${visitorTeam.shortName}</span>
            <input type="number" min="0" max="99" data-cv="${game.id}" value="${userScore.cv ?? ''}" placeholder="0" class="score-input" />
          </div>
          <span class="vs-divider">@</span>
          <div class="team-side ${game.home === this.currentTeam ? 'active-team' : ''}">
            <span class="t-name">${homeTeam.shortName}</span>
            <input type="number" min="0" max="99" data-cl="${game.id}" value="${userScore.cl ?? ''}" placeholder="0" class="score-input" />
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-save-score" data-game="${game.id}">Anotar</button>
          ${official ? `<span class="official-score">Oficial: ${official.cv} - ${official.cl}</span>` : ''}
        </div>
      </div>
    `;
  }

  renderQuinielaView(container) {
    const upcomingGames = ALL_GAMES.slice(0, 15);
    const predictions = this.quiniela.getPredictions();

    container.innerHTML = `
      <div class="quiniela-page">
        <h2>Quiniela Oficial LVBP 2026-27</h2>
        <p class="subtitle">Pronostica los marcadores antes de cada juego y compite por puntos en Hubmy.</p>
        <div class="quiniela-grid">
          ${upcomingGames.map(g => {
            const pred = predictions[g.id] || {};
            const vTeam = TEAMS[g.visitor]?.shortName || g.visitor;
            const hTeam = TEAMS[g.home]?.shortName || g.home;
            return `
              <div class="quiniela-card">
                <div class="q-header">
                  <span>${g.date} (${g.time})</span>
                </div>
                <div class="q-matchup">
                  <span>${vTeam}</span>
                  <input type="number" id="pred-cv-${g.id}" value="${pred.cv ?? ''}" class="q-input" min="0" max="99" />
                  <span>vs</span>
                  <input type="number" id="pred-cl-${g.id}" value="${pred.cl ?? ''}" class="q-input" min="0" max="99" />
                  <span>${hTeam}</span>
                </div>
                <button class="btn-submit-pred" data-id="${g.id}">Guardar Pronóstico</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.btn-submit-pred').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gameId = e.currentTarget.dataset.id;
        const g = ALL_GAMES.find(x => x.id === gameId);
        const cv = SecuritySanitizer.sanitizeScore(document.getElementById(`pred-cv-${gameId}`)?.value);
        const cl = SecuritySanitizer.sanitizeScore(document.getElementById(`pred-cl-${gameId}`)?.value);

        if (cv !== null && cl !== null && g) {
          try {
            await this.quiniela.submitPrediction(this.user?.id || 'anon', g, cl, cv);
            alert('✅ Pronóstico registrado con firma de integridad.');
            this.renderContent();
          } catch (err) {
            alert('⚠️ ' + err.message);
          }
        }
      });
    });
  }

  renderCollectionView(container) {
    const unlockedIds = new Set(this.gamification.getUnlockedStamps());
    const progress = this.gamification.evaluateMilestones({
      markedScores: this.markedScores,
      favoriteTeam: this.favoriteTeam
    });

    import('../services/gamification_engine.js').then(({ OFFICIAL_STAMPS }) => {
      container.innerHTML = `
        <div class="collection-page">
          <h2>Álbum de Estampas Desbloqueadas</h2>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progress.percentage}%"></div>
          </div>
          <p class="progress-label">${progress.totalUnlocked} de ${progress.totalAvailable} estampas (${progress.percentage}%)</p>
          <div class="stamps-catalog">
            ${OFFICIAL_STAMPS.map(stamp => {
              const isUnlocked = unlockedIds.has(stamp.id);
              return `
                <div class="stamp-badge ${isUnlocked ? 'unlocked' : 'locked'} rarity-${stamp.rarity.toLowerCase()}">
                  <div class="stamp-icon">${isUnlocked ? '🏆' : '🔒'}</div>
                  <div class="stamp-title">${stamp.name}</div>
                  <div class="stamp-rarity">${stamp.rarity.toUpperCase()}</div>
                  <div class="stamp-desc">${stamp.description}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });
  }

  renderStandingsView(container) {
    container.innerHTML = `
      <div class="standings-page">
        <h2>Tabla de Posiciones Oficial LVBP</h2>
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>JJ</th>
              <th>JG</th>
              <th>JP</th>
              <th>DIF</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(TEAMS).map((t, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${t.name}</strong></td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>-</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AlbumApp();
  app.init();
});