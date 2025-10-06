import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class itbItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['into-the-black', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'description',
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = 'systems/into-the-black/templates/item';
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = this.document.toPlainObject();

    // calculate the total weight of the item
    itemData.system.totalWeight = itemData.system.weight * itemData.system.quantity;

    // Enrich description info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.item.system.description,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.item.getRollData(),
        // Relative UUID resolution
        relativeTo: this.item,
      }
    );

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Adding a pointer to CONFIG.ITB
    context.config = CONFIG.ITB;

    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.item.effects);

    // If this is a mech item, prepare body part items
    if (this.item.type === 'mech') {
      this._prepareMechBodyParts(context);
    }

    return context;
  }

  /**
   * Prepare body part items for mech sheets
   * @param {object} context The context object to mutate
   */
  _prepareMechBodyParts(context) {
    // Initialize containers for each body part location
    const items_head = [];
    const items_torso_c = [];
    const items_torso_l = [];
    const items_torso_r = [];
    const items_arm_r = [];
    const items_arm_l = [];
    const items_leg_r = [];
    const items_leg_l = [];

    // Get the mech's ID
    const currentMechID = this.item.system.mechID;

    // Set up currentMech data for the template (needed for body part stats)
    context.currentMech = {
      id: this.item._id,
      mechID: currentMechID,
      ...this.item.system
    };

    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) {
      // If no parent, return empty arrays
      context.items_head = items_head;
      context.items_torso_c = items_torso_c;
      context.items_torso_l = items_torso_l;
      context.items_torso_r = items_torso_r;
      context.items_arm_r = items_arm_r;
      context.items_arm_l = items_arm_l;
      context.items_leg_r = items_leg_r;
      context.items_leg_l = items_leg_l;
      return;
    }

    // Iterate through the character's items, looking for parts that belong to this mech
    for (let item of character.items) {
      if (item.type === 'part' && item.system.mechID === currentMechID) {
        // Sort parts by location
        switch (item.system.location) {
          case 'head':
            items_head.push(item);
            break;
          case 'torso_c':
            items_torso_c.push(item);
            break;
          case 'torso_l':
            items_torso_l.push(item);
            break;
          case 'torso_r':
            items_torso_r.push(item);
            break;
          case 'arm_r':
            items_arm_r.push(item);
            break;
          case 'arm_l':
            items_arm_l.push(item);
            break;
          case 'leg_r':
            items_leg_r.push(item);
            break;
          case 'leg_l':
            items_leg_l.push(item);
            break;
        }
      }
    }

    // Assign to context
    context.items_head = items_head;
    context.items_torso_c = items_torso_c;
    context.items_torso_l = items_torso_l;
    context.items_torso_r = items_torso_r;
    context.items_arm_r = items_arm_r;
    context.items_arm_l = items_arm_l;
    context.items_leg_r = items_leg_r;
    context.items_leg_l = items_leg_l;
  }

  /* -------------------------------------------- */

  /** @override */
  async _render(force, options) {
    await super._render(force, options);
    
    // If this is a mech sheet, listen for updates to items on the parent character
    if (this.item.type === 'mech' && this.item.parent) {
      this._setupItemUpdateListeners();
    }
  }

  /**
   * Set up listeners for item updates on the parent character
   * @private
   */
  _setupItemUpdateListeners() {
    const character = this.item.parent;
    if (!character) return;
    
    // Remove existing listeners to avoid duplicates
    if (this._itemUpdateHook) {
      Hooks.off('updateItem', this._itemUpdateHook);
    }
    
    // Add listener for item updates
    this._itemUpdateHook = Hooks.on('updateItem', (item, data, options, userId) => {
      // Only re-render if the updated item belongs to our character and is a part
      if (item.parent?.id === character.id && item.type === 'part') {
        this.render(false);
      }
    });
    
    // Add listener for item deletion
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
    }
    
    this._itemDeleteHook = Hooks.on('deleteItem', (item, options, userId) => {
      // Only re-render if the deleted item belonged to our character and was a part
      if (item.parent?.id === character.id && item.type === 'part') {
        this.render(false);
      }
    });
  }

  /** @override */
  async close(options) {
    // Clean up listeners when closing the sheet
    if (this._itemUpdateHook) {
      Hooks.off('updateItem', this._itemUpdateHook);
      this._itemUpdateHook = null;
    }
    
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
      this._itemDeleteHook = null;
    }
    
    return super.close(options);
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.

    // Active Effect management
    html.on('click', '.effect-control', (ev) =>
      onManageActiveEffect(ev, this.item)
    );

    // Handle equip mech button for mech items
    html.on('click', '.equip-mech-button', this._onEquipMech.bind(this));

    // Handle item creation for mech body parts
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Handle item deletion
    html.on('click', '.item-delete', this._onItemDelete.bind(this));

    // Handle item editing
    html.on('click', '.item-edit', this._onItemEdit.bind(this));

    // Handle mech body part stat changes (for mech item sheets)
    html.on('change', '.body-part-hp, .body-part-max-hp, .body-part-armor, .body-part-max-armor', (ev) => {
      const input = ev.currentTarget;
      const field = input.dataset.field;
      const bodyKey = input.dataset.bodyKey;
      const newValue = parseInt(input.value, 10) || 0;

      // Update this mech item's body part stats directly
      if (this.item.type === 'mech') {
        const updatePath = `system.${field}.${bodyKey}`;
        this.item.update({ [updatePath]: newValue }).catch(err => {
          console.error('Failed to update mech body part stats:', err);
          ui.notifications.error('Failed to update mech stats.');
        });
      }
    });

    // Handle drag and drop for reordering items
    if (this.item.type === 'mech') {
      this._activateDragDrop(html);
    }
  }

  /**
   * Activate drag and drop functionality for mech body parts
   * @param {jQuery} html - The rendered HTML
   * @private
   */
  _activateDragDrop(html) {
    // Enable drag start
    html.find('.item').each((i, li) => {
      li.draggable = true;
      li.addEventListener('dragstart', this._onDragStart.bind(this));
    });

    // Enable drop zones
    html.find('.items-list').each((i, list) => {
      list.addEventListener('dragover', this._onDragOver.bind(this));
      list.addEventListener('drop', this._onDrop.bind(this));
    });
  }

  /**
   * Handle drag start
   * @param {DragEvent} event
   * @private
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    const itemId = li.dataset.itemId;
    
    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'Item',
      itemId: itemId,
      source: 'mech-sheet'
    }));
  }

  /**
   * Handle drag over
   * @param {DragEvent} event
   * @private
   */
  _onDragOver(event) {
    event.preventDefault();
  }

  /**
   * Handle drop
   * @param {DragEvent} event
   * @private
   */
  async _onDrop(event) {
    event.preventDefault();
    
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }
    
    if (data.type !== 'Item') return;
    
    const targetList = event.currentTarget;
    const newLocation = targetList.dataset.location;
    const mechID = this.item.system.mechID;
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) return;
    
    let item;
    
    // Handle items dropped from within the same mech sheet
    if (data.source === 'mech-sheet' && data.itemId) {
      item = character.items.get(data.itemId);
      if (!item) return;
      
      // Update both the item's location AND mechID (in case it's from a different mech)
      await item.update({
        'system.location': newLocation,
        'system.mechID': mechID
      });
    }
    // Handle items dropped from character sheet or other sources
    else if (data.uuid) {
      item = await fromUuid(data.uuid);
      if (!item) return;
      
      // Only handle part items
      if (item.type !== 'part') {
        ui.notifications.warn('Only parts can be added to mech body locations.');
        return;
      }
      
      // Check if the item belongs to the same character
      if (item.parent?.id !== character.id) {
        ui.notifications.warn('Items can only be moved within the same character.');
        return;
      }
      
      // Update both the location and mechID
      await item.update({
        'system.location': newLocation,
        'system.mechID': mechID
      });
      
      ui.notifications.info(`${item.name} has been assigned to this mech's ${newLocation.replace('_', ' ')}.`);
    }
    
    // Re-render the sheet to show the changes
    this.render(false);
  }

  /**
   * Handle creating a new part for this mech
   * @param {Event} event - The button click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    
    if (this.item.type !== 'mech') return;
    
    const header = event.currentTarget;
    const type = header.dataset.type || 'part';
    const location = header.dataset.location;
    const mechID = this.item.system.mechID;
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) {
      ui.notifications.warn('This mech must be owned by a character to add parts.');
      return;
    }
    
    // Create the new part
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      system: {
        location: location,
        mechID: mechID
      }
    };
    
    await Item.create(itemData, { parent: character });
    
    // Re-render the sheet to show the new item
    this.render(false);
  }

  /**
   * Handle deleting a part from this mech
   * @param {Event} event - The button click event
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    
    const li = $(event.currentTarget).parents('.item');
    const itemId = li.data('itemId');
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) return;
    
    const item = character.items.get(itemId);
    if (item) {
      await item.delete();
      li.slideUp(200, () => this.render(false));
    }
  }

  /**
   * Handle editing a part from this mech
   * @param {Event} event - The button click event
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    
    const li = $(event.currentTarget).parents('.item');
    const itemId = li.data('itemId');
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) return;
    
    const item = character.items.get(itemId);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle equipping a mech to a character
   * @param {Event} event - The button click event
   * @private
   */
  async _onEquipMech(event) {
    event.preventDefault();
    
    // Get the mech ID from the button data (now a string UUID)
    const mechId = event.currentTarget.dataset.mechId;
    
    // Find the character actor that owns this mech item
    const character = this.item.parent;
    
    if (!character || character.type !== 'character') {
      ui.notifications.warn('This mech must be owned by a character to be equipped.');
      return;
    }
    
    // Update the character's equippedMechID
    await character.update({
      'system.equippedMechID': mechId
    });
    
    ui.notifications.info(`Mech "${this.item.name}" (ID: ${mechId}) has been equipped to ${character.name}.`);
  }
}
