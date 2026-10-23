/**
 * Calendario LVBP 26/27 - Hubmy Superapp SDK Gateway
 * Connects with Hubmy Auth and Notification APIs.
 */

export class HubmyClient {
  constructor(appId = 'app_01M5D4XDAEEY3HJA44BP5YKWA0') {
    this.appId = appId;
    this.authBaseUrl = 'https://apidev.hubmy.app/v1/sdk/authorize';
    this.notificationEndpoint = 'https://apidev.hubmy.app/v1/sdk/notifications';
  }

  /**
   * Check if running inside Hubmy Super App iframe/container
   */
  isInsideHubmy() {
    try {
      return window.self !== window.top || new URLSearchParams(window.location.search).has('hubmy');
    } catch (e) {
      return true; // restricted iframe
    }
  }

  /**
   * Trigger SSO Authentication with Hubmy
   */
  login(redirectUri = window.location.href) {
    const targetUrl = new URL(this.authBaseUrl);
    targetUrl.searchParams.set('app_id', this.appId);
    targetUrl.searchParams.set('redirect_uri', redirectUri);

    if (this.isInsideHubmy()) {
      // Post message to parent container if inside super app
      window.parent.postMessage({ type: 'HUBMY_AUTH_REQUEST', appId: this.appId }, '*');
    } else {
      window.location.assign(targetUrl.toString());
    }
  }

  /**
   * Send notification trigger for upcoming favorite team game
   */
  async scheduleGameReminder(userId, teamSlug, gameDate, gameTime, opponentName) {
    const payload = {
      app_id: this.appId,
      user_id: userId,
      channel: 'hubmy_push', // or 'whatsapp'
      title: `⚾ ¡Hoy juega tu equipo!`,
      body: `${teamSlug.toUpperCase()} vs ${opponentName} a las ${gameTime} (${gameDate}). Abre tu álbum para anotar el resultado.`,
      scheduled_for: `${gameDate}T${gameTime}:00-04:00`
    };

    try {
      const res = await fetch(this.notificationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (err) {
      console.warn('Hubmy notification deferred or offline:', err);
      return false;
    }
  }
}