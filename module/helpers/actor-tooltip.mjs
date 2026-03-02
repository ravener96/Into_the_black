/**
 * Actor Tooltip Helper
 * Manages hover popups that display actor information on map tokens
 */

export class ActorTooltip {
  static currentTooltip = null;
  static hideTimer = null;
  static controlPressed = false;
  static hoveredToken = null;
  static initialized = false;

  /**
   * Initialize actor tooltips for canvas tokens
   */
  static initializeCanvasTooltips() {
    if (this.initialized) return;
    this.initialized = true;

    // Track control key state
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (!this.controlPressed) {
          this.controlPressed = true;
          // If a token is already hovered, show tooltip now
          if (this.hoveredToken) {
            this.showTokenTooltip(this.hoveredToken);
          }
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        this.controlPressed = false;
        this.scheduleHide();
      }
    });

    // Hook into token hover events
    Hooks.on('hoverToken', (token, hovered) => {
      if (hovered) {
        this.hoveredToken = token;
        // Show tooltip if control is already pressed
        if (this.controlPressed) {
          this.showTokenTooltip(token);
        }
      } else {
        this.hoveredToken = null;
        this.scheduleHide();
      }
    });
  }

  /**
   * Show tooltip for a hovered token
   * @param {Token} token - The token being hovered over
   */
  static showTokenTooltip(token) {
    // Clear any pending hide
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // Get the actor from the token
    const actor = token.actor;
    if (!actor) return;

    // Get active/selected actor
    const selectedTokens = canvas.tokens.controlled;
    const activeToken = selectedTokens.length > 0 ? selectedTokens[0] : null;
    const activeActor = activeToken?.actor ?? null;

    // Calculate distance if there's an active actor selected
    let distance = null;
    if (activeToken) {
      try {
        distance = this.calculateDistance(activeToken, token);
      } catch (e) {
        console.warn('Error calculating distance:', e);
      }
    }

    // Build tooltip content
    let tooltipHTML = `
      <div class="itb-actor-tooltip">
        <div class="tooltip-content">
          <div class="tooltip-name">${actor.name}</div>
          <div class="tooltip-type">${actor.type}</div>
    `;

    if (activeActor) {
      tooltipHTML += `<div class="tooltip-separator"></div>`;
      tooltipHTML += `<div class="tooltip-label">Active Actor:</div>`;
      tooltipHTML += `<div class="tooltip-value">${activeActor.name}</div>`;
      tooltipHTML += `<div class="tooltip-label">Target Actor:</div>`;
      tooltipHTML += `<div class="tooltip-value">${actor.name}</div>`;
    }

    if (distance !== null) {
      tooltipHTML += `<div class="tooltip-label">Distance:</div>`;
      tooltipHTML += `<div class="tooltip-value">${distance}</div>`;
    }

    tooltipHTML += `
        </div>
      </div>
    `;

    // Remove old tooltip if exists
    if (this.currentTooltip) {
      this.currentTooltip.remove();
    }

    // Create tooltip element
    const tooltip = $(tooltipHTML);

    // Position tooltip near the token
    $('body').append(tooltip);

    // Get token position in screen coordinates
    const worldCenterX = token.center.x;
    const worldTopY = token.y;
    const screenPos = canvas.stage.toGlobal(new PIXI.Point(worldCenterX, worldTopY));

    tooltip.css({
      position: 'fixed',
      left: (screenPos.x - 110) + 'px',
      top: (screenPos.y - 55) + 'px',
      pointerEvents: 'none',
      zIndex: 10000,
    });

    this.currentTooltip = tooltip;
  }

  /**
   * Calculate distance between two tokens using grid distance
   * @param {Token} token1 - First token
   * @param {Token} token2 - Second token
   * @returns {number} Distance in grid units
   */
  static calculateDistance(token1, token2) {
    try {
      // Use measurePath (v12+ API) instead of deprecated measureDistance
      const path = canvas.grid.measurePath([token1.center, token2.center]);
      // Use the distance property which respects scene grid rules
      const distance = path.distance;
      return Math.round(distance * 10) / 10; // Round to 1 decimal place
    } catch (e) {
      console.warn('Error measuring grid distance:', e);
      return null;
    }
  }

  /**
   * Schedule tooltip to be hidden
   */
  static scheduleHide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => {
      if (this.currentTooltip) {
        this.currentTooltip.remove();
        this.currentTooltip = null;
      }
      this.hideTimer = null;
    }, 200);
  }
}
