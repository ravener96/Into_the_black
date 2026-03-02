/**
 * Actor Tooltip Helper
 * Manages hover popups that display actor information on map tokens
 */

export class ActorTooltip {
  static currentTooltip = null;
  static hideTimer = null;
  static controlPressed = false;
  static hoveredToken = null;

  /**
   * Initialize actor tooltips for canvas tokens
   */
  static initializeCanvasTooltips() {
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
    const selectedActor = selectedTokens.length > 0 ? selectedTokens[0].actor : null;

    // Get targeted actor
    const targetedActor = game.user.targets.size > 0 ? Array.from(game.user.targets)[0].actor : null;

    // Calculate distance if there's a selected or targeted actor
    let distance = null;
    let referenceActor = null;
    let referenceActorName = null;

    if (selectedActor) {
      referenceActor = selectedActor;
      referenceActorName = selectedActor.name;
      try {
        distance = this.calculateDistance(selectedTokens[0], token);
      } catch (e) {
        console.warn('Error calculating distance:', e);
      }
    } else if (targetedActor) {
      referenceActor = targetedActor;
      referenceActorName = targetedActor.name;
      const targetToken = Array.from(game.user.targets)[0];
      try {
        distance = this.calculateDistance(targetToken, token);
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

    if (referenceActorName) {
      tooltipHTML += `<div class="tooltip-separator"></div>`;
      tooltipHTML += `<div class="tooltip-label">Selected:</div>`;
      tooltipHTML += `<div class="tooltip-value">${referenceActorName}</div>`;
    }

    if (distance !== null) {
      tooltipHTML += `<div class="tooltip-label">Distance:</div>`;
      tooltipHTML += `<div class="tooltip-value">${distance} units</div>`;
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

    // Get token position on screen
    const tokenPos = token.getBounds();
    const centerX = tokenPos.x + tokenPos.width / 2;
    const centerY = tokenPos.y;

    tooltip.css({
      position: 'fixed',
      left: (centerX - 100) + 'px',
      top: (centerY - 50) + 'px',
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
      // Pass token objects directly for proper grid-based measurement
      const distance = canvas.grid.measureDistance(token1, token2);
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
