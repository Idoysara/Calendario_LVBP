/**
 * Hubmy LVBP Micro-Widget (<hubmy-lvbp-widget>)
 * Embedded Web Component designed for Hubmy Dashboard (#usuario).
 * Self-contained styles, responsive, zero external framework dependencies.
 */

import { TEAMS } from '../domain/domain_models.js';
import { getNextGameForTeam, ALL_GAMES } from '../domain/schedule_data.js';

export class HubmyLVBPWidget extends HTMLElement {
  static get observedAttributes() {
    return ['team', 'target-date'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get teamSlug() {
    return this.getAttribute('team') || localStorage.getItem('lvbp-favorito') || 'leones';
  }

  get targetDate() {
    return this.getAttribute('target-date') || new Date().toISOString().slice(0, 10);
  }

  render() {
    const team = TEAMS[this.teamSlug] || TEAMS.leones;
    const game = getNextGameForTeam(this.teamSlug, this.targetDate) || ALL_GAMES[0];
    const opponentSlug = game.home === this.teamSlug ? game.visitor : game.home;
    const opponent = TEAMS[opponentSlug] || { shortName: opponentSlug, primary: '#555' };
    const isHome = game.home === this.teamSlug;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        .widget-card {
          background: linear-gradient(135deg, #17140f 0%, #252019 100%);
          color: #fbf7ea;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #3a342a;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
        }
        .widget-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 100%;
          background: ${team.primary};
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .badge {
          background: rgba(201, 162, 39, 0.15);
          color: #c9a227;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(201, 162, 39, 0.3);
        }
        .date {
          font-size: 12px;
          color: #9c937b;
        }
        .matchup {
          display: flex;
          align-items: center;
          justify-content: space-around;
          margin: 16px 0;
        }
        .team-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 40%;
        }
        .team-pill {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .team-name {
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          color: #e9e1c9;
        }
        .vs-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .vs-text {
          font-size: 13px;
          font-weight: 800;
          color: #c9a227;
        }
        .time-text {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }
        .venue {
          font-size: 11px;
          color: #9c937b;
          text-align: center;
          margin-bottom: 14px;
        }
        .btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: #c9a227;
          color: #14110b;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
          padding: 10px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .btn-action:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
      </style>
      <div class="widget-card">
        <div class="header">
          <span class="badge">⚾ LVBP 2026-27</span>
          <span class="date">${game.date}</span>
        </div>
        <div class="matchup">
          <div class="team-box">
            <div class="team-pill" style="background: ${isHome ? team.primary : opponent.primary}">
              ${isHome ? team.shortName[0] : opponent.shortName[0]}
            </div>
            <span class="team-name">${isHome ? team.shortName : opponent.shortName}</span>
          </div>
          <div class="vs-box">
            <span class="vs-text">VS</span>
            <span class="time-text">${game.time}</span>
          </div>
          <div class="team-box">
            <div class="team-pill" style="background: ${!isHome ? team.primary : opponent.primary}">
              ${!isHome ? team.shortName[0] : opponent.shortName[0]}
            </div>
            <span class="team-name">${!isHome ? team.shortName : opponent.shortName}</span>
          </div>
        </div>
        <div class="venue">📍 ${game.stadium}</div>
        <button class="btn-action" id="btn-open-album">
          <span>Abrir Álbum & Anotar</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    `;

    this.shadowRoot.getElementById('btn-open-album').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('hubmy-open-app', {
        bubbles: true,
        composed: true,
        detail: { appSlug: 'calendario-lvbp', team: this.teamSlug, gameId: game.id }
      }));
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'HUBMY_NAVIGATE_APP', appSlug: 'calendario-lvbp' }, '*');
      } else {
        window.location.href = `/?team=${this.teamSlug}#juego-${game.id}`;
      }
    });
  }
}

if (!customElements.get('hubmy-lvbp-widget')) {
  customElements.define('hubmy-lvbp-widget', HubmyLVBPWidget);
}