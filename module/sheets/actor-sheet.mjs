import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class itbActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['into-the-black', 'sheet', 'actor'],
      width: 900,  // Increased width to accommodate the 2D layout
      height: 700, // Increased height to fit all body parts
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/into-the-black/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toPlainObject();

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Adding a pointer to CONFIG.ITB
    context.config = CONFIG.ITB;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    // Apply saved user settings
    this._applyUserSettings();

    return context;
  }

  /**
   * Character-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareCharacterData(context) {
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers for each body part location
    const items_head = [];
    const items_torso_c = [];
    const items_torso_l = [];
    const items_torso_r = [];
    const items_arm_r = [];
    const items_arm_l = [];
    const items_leg_r = [];
    const items_leg_l = [];
    const unassignedItems = [];
    const mechs = [];
    
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Use equippedMechID from character schema
    const currentMechID = this.actor.system.equippedMechID ?? "0";

    // Find the equipped mech item to get body part stats
    let equippedMech = null;
    if (currentMechID !== "0") {
      equippedMech = this.actor.items.find(item => 
        item.type === 'mech' && item.system.mechID === currentMechID
      );
    }

    // Add equipped mech data to context for body part stats
    if (equippedMech) {
      context.equippedMechStats = {
        bodyPartHP: equippedMech.system.bodyPartHP,
        bodyPartMaxHP: equippedMech.system.bodyPartMaxHP,
        bodyPartArmour: equippedMech.system.bodyPartArmour,
        bodyPartMaxArmour: equippedMech.system.bodyPartMaxArmour
      };
    } else {
      // Provide default empty stats if no mech is equipped
      context.equippedMechStats = {
        bodyPartHP: {},
        bodyPartMaxHP: {},
        bodyPartArmour: {},
        bodyPartMaxArmour: {}
      };
    }

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to appropriate gear container based on location
      if (i.type === 'part') {
        // If mechID is "0", it's unassigned regardless of location
        if (i.system.mechID === "0") {
          unassignedItems.push(i);
          continue;
        }
        // Only show parts that belong to the currently equipped mech
        if (i.system.mechID !== currentMechID) continue;
        
        switch(i.system.location) {
          case 'head':
            items_head.push(i);
            break;
          case 'torso_c':
            items_torso_c.push(i);
            break;
          case 'torso_l':
            items_torso_l.push(i);
            break;
          case 'torso_r':
            items_torso_r.push(i);
            break;
          case 'arm_r':
            items_arm_r.push(i);
            break;
          case 'arm_l':
            items_arm_l.push(i);
            break;
          case 'leg_r':
            items_leg_r.push(i);
            break;
          case 'leg_l':
            items_leg_l.push(i);
            break;
          case '':
          case null:
          case undefined:
          case 'unassigned':
            unassignedItems.push(i);
            break;
          default:
            unassignedItems.push(i);
        }
      }
      // append to inventory if item
      else if (i.type === 'item') {
        unassignedItems.push(i);
      }
      // add to mech slot if mech
      else if (i.type === 'mech') {
        mechs.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.items_head = items_head;
    context.items_torso_c = items_torso_c;
    context.items_torso_l = items_torso_l;
    context.items_torso_r = items_torso_r;
    context.items_arm_r = items_arm_r;
    context.items_arm_l = items_arm_l;
    context.items_leg_r = items_leg_r;
    context.items_leg_l = items_leg_l;
    context.features = features;
    context.spells = spells;

    // Add unassigned items to context
    context.unassignedItems = unassignedItems;
    context.mechs = mechs;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Handle arm position slider
    html.find('.arm-position-slider').on('input', this._onArmPositionSlider.bind(this));

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', this._onItemDelete.bind(this));

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));

    // Handle item quantity changes
    html.on('change', '.item-quantity-input', (ev) => {
      const input = ev.currentTarget;
      const itemId = input.dataset.itemId;
      const newValue = parseInt(input.value, 10);

      // Find the item and update its quantity
      const item = this.actor.items.get(itemId);
      if (item) {
        item.update({ 'system.quantity': newValue });
        // if (item.system.weight != null && item.system.quantity != null) {
        //   item.update({ 'system.totalWeight': (item.system.weight * newValue) });
        // }
      }
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    
    // Set the location based on the list it was created from
    if (type === 'item' && data.location) {
      itemData.system.location = data.location;
    }
    
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle deleting an item with special logic for mechs
   * @param {Event} event - The delete button click event
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents('.item');
    const item = this.actor.items.get(li.data('itemId'));
    
    if (!item) return;
    
    // Special handling for mech deletion
    if (item.type === 'mech') {
      await this._handleMechDeletion(item, li);
    } else {
      // Standard deletion for non-mech items
      await item.delete();
      li.slideUp(200, () => this.render(false));
    }
  }

  /**
   * Handle mech deletion with confirmation dialog for parts
   * @param {Item} mech - The mech item being deleted
   * @param {jQuery} li - The list item element
   * @private
   */
  async _handleMechDeletion(mech, li) {
    const mechID = mech.system.mechID;
    
    // Find all parts belonging to this mech
    const attachedParts = this.actor.items.filter(item => 
      item.type === 'part' && item.system.mechID === mechID
    );
    
    if (attachedParts.length === 0) {
      // No parts attached, just delete the mech
      await mech.delete();
      li.slideUp(200, () => this.render(false));
      return;
    }
    
    // Show confirmation dialog
    new Dialog({
      title: "Delete Mech",
      content: `
        <p>This mech has <strong>${attachedParts.length}</strong> part(s) attached to it:</p>
        <ul>
          ${attachedParts.map(part => `<li>${part.name} (${part.system.location})</li>`).join('')}
        </ul>
        <p>What would you like to do with these parts?</p>
      `,
      buttons: {
        unassign: {
          icon: '<i class="fas fa-unlink"></i>',
          label: "Unassign Parts",
          callback: async () => {
            // Unassign all parts (set mechID to 0)
            const updates = attachedParts.map(part => ({
              _id: part.id,
              'system.mechID': 0,
              'system.location': 'unassigned'
            }));
            
            await this.actor.updateEmbeddedDocuments('Item', updates);
            
            // If this was the equipped mech, unequip it
            if (this.actor.system.equippedMechID === mechID) {
              await this.actor.update({ 'system.equippedMechID': "0" });
            }
            
            // Delete the mech
            await mech.delete();
            li.slideUp(200, () => this.render(false));
            
            ui.notifications.info(`Mech deleted and ${attachedParts.length} parts unassigned.`);
          }
        },
        delete: {
          icon: '<i class="fas fa-trash"></i>',
          label: "Delete All",
          callback: async () => {
            // Delete all attached parts
            const partIds = attachedParts.map(part => part.id);
            await this.actor.deleteEmbeddedDocuments('Item', partIds);
            
            // If this was the equipped mech, unequip it
            if (this.actor.system.equippedMechID === mechID) {
              await this.actor.update({ 'system.equippedMechID': "0" });
            }
            
            // Delete the mech
            await mech.delete();
            li.slideUp(200, () => this.render(false));
            
            ui.notifications.info(`Mech and all ${attachedParts.length} parts deleted.`);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "cancel"
    }).render(true);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  _onDragStart(event) {
    console.log("Drop data structure:", event.dataTransfer.getData("text/plain"));
    // This is the item that was dragged
    const li = event.currentTarget;
    if (event.target.classList.contains("content-link")) return;

    // Get the item data
    const itemId = li.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    // Set the drag data
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      uuid: item.uuid,
      actorId: this.actor.id,  // This is needed to identify the source
      data: item.toObject()
    }));
  }

  async _onDropItem(event, data) {
    console.log("Drop item:", data);
    
    // Get the target list to determine where the item is being dropped
    const targetElement = event.target.closest('.items-list');
    let targetLocation = null;
    
    if (targetElement) {
      targetLocation = targetElement.dataset.location;
    }
    
    // Check if this is a move within the same actor
    const isSameActor = data.actorId === this.actor.id;
    
    if (isSameActor && data.data) {
      // If it's the same actor, we want to avoid duplication regardless of where it's dropped
      let itemId = data.data._id;
      const item = this.actor.items.get(itemId);
      
      if (item) {
        // Always update the location if we have a targetLocation
        if (targetLocation && item.system.location !== targetLocation) {
          const updateData = {'system.location': targetLocation};
          
          // If moving from mech to inventory, reset mechID to "0" 
          if (data.source === 'mech-sheet' && item.type === 'part') {
            updateData['system.mechID'] = "0";
          }
          
          return await item.update(updateData);
        } else {
          return null;
        }
      }
    } else {
      // For cross-actor transfers or dropping on non-location elements
      // If we found a target location and have item data to update for a new item
      if (targetLocation && data.data) {
        // Update the item data with the new location before it's added
        data.data.system = data.data.system || {};
        data.data.system.location = targetLocation;
      }
      
      // Call the base implementation to add the item to this actor
      const dropResult = await super._onDropItem(event, data);

      // Remove the item from the source actor only if it was dragged from another actor
      if (!isSameActor && data.actorId) {
        const sourceActor = game.actors.get(data.actorId);
        if (sourceActor) {
          // Try to get the item ID from the drag data
          let itemId = data.data?._id;
          // Fallback: try to extract from uuid if not present
          if (!itemId && data.uuid) {
            const parts = data.uuid.split(".");
            itemId = parts[parts.length - 1];
          }
          const originalItem = sourceActor.items.get(itemId);
          if (originalItem) {
            // Special handling for mech transfers - move all associated parts
            if (originalItem.type === 'mech') {
              const mechID = originalItem.system.mechID;
              
              // Find all parts that belong to this mech
              const associatedParts = sourceActor.items.filter(item => 
                item.type === 'part' && item.system.mechID === mechID
              );
              
              if (associatedParts.length > 0) {
                // Create copies of all associated parts on the destination actor
                const partData = associatedParts.map(part => part.toObject());
                await this.actor.createEmbeddedDocuments('Item', partData);
                
                // Delete all associated parts from the source actor
                const partIds = associatedParts.map(part => part.id);
                await sourceActor.deleteEmbeddedDocuments('Item', partIds);
                
                ui.notifications.info(`Moved mech "${originalItem.name}" and ${associatedParts.length} associated parts to ${this.actor.name}.`);
              }
            }
            
            await originalItem.delete();
          }
        }
      }

      return dropResult;
    }
  }

  /**
   * Handle arm position slider adjustments
   * @param {Event} event - The slider input event
   * @private
   */
  _onArmPositionSlider(event) {
    const slider = event.currentTarget;
    const value = slider.value;
    const valueDisplay = document.getElementById(slider.id + '-value');
    
    // Update the display value
    valueDisplay.textContent = `${value}px`;
    
    // Update the CSS variable
    document.documentElement.style.setProperty('--arm-offset', `${value}px`);
    
    // Store the preference in user flags if needed
    if (this.actor.isOwner) {
      this.actor.setFlag('into-the-black', 'armOffset', value);
    }
  }

  /**
   * Apply saved position settings when the sheet loads
   * @private
   */
  _applyUserSettings() {
    // Apply arm offset from saved flag if available
    const armOffset = this.actor.getFlag('into-the-black', 'armOffset');
    if (armOffset !== undefined) {
      document.documentElement.style.setProperty('--arm-offset', `${armOffset}px`);
      
      // Also update the slider position and display text when sheet renders
      setTimeout(() => {
        const slider = document.getElementById('arm-offset');
        if (slider) {
          slider.value = armOffset;
          document.getElementById('arm-offset-value').textContent = `${armOffset}px`;
        }
      }, 0);
    }
  }
}

export const registerHandlebarsHelpers = () => {
  // Add a times helper to repeat block content
  Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for(let i = 0; i < n; ++i) {
      block.data.index = i;
      accum += block.fn(this);
    }
    return accum;
  });

  // Add this to your Handlebars helpers registration
  Handlebars.registerHelper('listHeight', function(emptySpots) {
    // +1 for the header row, 28px per row (adjust if your row height is different)
    return ((parseInt(emptySpots, 10) + 1) * 28);
  });
}

// Call the function immediately so the helper is registered
registerHandlebarsHelpers();