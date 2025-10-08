import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

// Configuration constants
const ENABLE_DELETE_WARNING = true; // Set to false to disable deletion confirmation dialogs

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
      this._calculateMechResourceTotals(context);
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

  /**
   * Calculate resource totals for the mech
   * @param {object} context The context object to mutate
   */
  _calculateMechResourceTotals(context) {
    const staticResourceTotals = {};
    const consumableResourceTotals = {};
    const mechID = this.item.system.mechID;
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) {
      context.mechStaticResourceTotals = staticResourceTotals;
      context.mechConsumableResourceTotals = consumableResourceTotals;
      // Keep the old property for backward compatibility
      context.mechResourceTotals = staticResourceTotals;
      return;
    }
    
    // Find all enabled parts that belong to this mech
    const mechParts = character.items.filter(item => 
      item.type === 'part' && 
      item.system.mechID === mechID && 
      item.system.enabled
    );
    
    // Sum up all resources from enabled parts, separated by type
    for (const part of mechParts) {
      if (part.system.resources && typeof part.system.resources === 'object') {
        const isConsumable = part.system.resourceType === 'consumable';
        const targetTotals = isConsumable ? consumableResourceTotals : staticResourceTotals;
        
        for (const [resourceName, value] of Object.entries(part.system.resources)) {
          // Only include resources with valid names and positive values
          if (resourceName && resourceName.trim() !== '' && typeof value === 'number' && value > 0) {
            if (targetTotals[resourceName]) {
              targetTotals[resourceName] += value;
            } else {
              targetTotals[resourceName] = value;
            }
          }
        }
      }
    }
    
    context.mechStaticResourceTotals = staticResourceTotals;
    context.mechConsumableResourceTotals = consumableResourceTotals;
    // Keep the old property for backward compatibility (static resources)
    context.mechResourceTotals = staticResourceTotals;
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
    
    // Add listener for item creation
    if (this._itemCreateHook) {
      Hooks.off('createItem', this._itemCreateHook);
    }
    
    this._itemCreateHook = Hooks.on('createItem', (item, options, userId) => {
      // Only re-render if the created item belongs to our character and is a part
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
    
    if (this._itemCreateHook) {
      Hooks.off('createItem', this._itemCreateHook);
      this._itemCreateHook = null;
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

    // Handle item deletion
    html.on('click', '.item-delete', this._onItemDelete.bind(this));

    // Handle item editing
    html.on('click', '.item-edit', this._onItemEdit.bind(this));

    // Handle resource management for parts
    if (this.item.type === 'part') {
      html.on('click', '.add-resource-button', this._onAddResource.bind(this));
      html.on('click', '.remove-resource', this._onRemoveResource.bind(this));
    }

    // Handle drag and drop for reordering items
    if (this.item.type === 'mech') {
      this._activateDragDrop(html);
      // Handle part enabled/disabled toggles
      html.on('change', '.part-enabled-toggle', this._onPartToggle.bind(this));
      // Handle resource value changes for consumable parts
      html.on('change', '.resource-input', this._onResourceValueChange.bind(this));
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
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) return;
    
    const item = character.items.get(itemId);
    if (!item) return;
    
    // Set up both custom data for mech sheet operations and standard Foundry data
    const dragData = {
      type: 'Item',
      itemId: itemId,
      source: 'mech-sheet',
      // Standard Foundry drag data
      uuid: item.uuid,
      data: item.toObject(),
      actorId: character.id  // Add actor ID so character sheet knows it's same-actor movement
    };
    
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
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
    
    // Debug: Check if we have a valid mechID from the mech
    console.log(`Mech ${this.item.name} has mechID: ${mechID}`);
    if (!mechID || mechID === "" || mechID === "0") {
      ui.notifications.warn(`This mech doesn't have a valid ID. Please edit the mech and set a proper Mech ID.`);
      return;
    }
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) return;
    
    let item;
    
    // Handle items dropped from within the same mech sheet
    if (data.source === 'mech-sheet' && data.itemId) {
      item = character.items.get(data.itemId);
      if (!item) return;
      
      console.log(`Moving item ${item.name} from mechID ${item.system.mechID} to mechID ${mechID}`);
      
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
      
      console.log(`Assigning part ${item.name} from mechID ${item.system.mechID} to mechID ${mechID} at location ${newLocation}`);
      
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
   * Handle deleting a part from this mech
   * @param {Event} event - The button click event
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    event.stopPropagation(); // Prevent event bubbling
    
    const li = $(event.currentTarget).parents('.item');
    const itemId = li.data('itemId');
    
    if (!itemId) {
      console.warn('No item ID found for deletion');
      return;
    }
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) {
      console.warn('No character parent found for mech item');
      return;
    }

    const item = character.items.get(itemId);
    if (item) {
      if (ENABLE_DELETE_WARNING) {
        // Show confirmation dialog
        new Dialog({
          title: "Delete Item",
          content: `<p>Are you sure you want to delete "<strong>${item.name}</strong>"?</p>`,
          buttons: {
            yes: {
              icon: '<i class="fas fa-check"></i>',
              label: "Delete",
              callback: async () => {
                await item.delete();
                // Re-render the sheet to reflect the deletion
                this.render(false);
              }
            },
            no: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel"
            }
          },
          default: "no"
        }).render(true);
      } else {
        // Delete immediately without confirmation
        await item.delete();
        // Re-render the sheet to reflect the deletion
        this.render(false);
      }
    } else {
      console.warn(`Item with ID ${itemId} not found on character ${character.name}`);
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
   * Handle part enabled/disabled toggle on mech sheet
   * @param {Event} event - The toggle change event
   * @private
   */
  async _onPartToggle(event) {
    event.preventDefault();
    
    const toggle = event.currentTarget;
    const itemId = toggle.dataset.itemId;
    const enabled = toggle.checked;
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) return;
    
    const item = character.items.get(itemId);
    if (item && item.type === 'part') {
      await item.update({ 'system.enabled': enabled });
      
      // Re-render the sheet to update resource totals
      this.render(false);
      
      // Optionally show a notification
      const status = enabled ? 'enabled' : 'disabled';
      ui.notifications.info(`${item.name} has been ${status}.`);
    }
  }

  /**
   * Handle resource value changes for consumable parts on mech sheet
   * @param {Event} event - The input change event
   * @private
   */
  async _onResourceValueChange(event) {
    event.preventDefault();
    
    const input = event.currentTarget;
    const itemId = input.dataset.itemId;
    const resourceKey = input.dataset.resourceKey;
    const newValue = parseInt(input.value) || 0;
    
    // Get the character that owns this mech
    const character = this.item.parent;
    if (!character) return;
    
    const item = character.items.get(itemId);
    if (item && item.type === 'part' && item.system.resourceType === 'consumable') {
      const resources = foundry.utils.duplicate(item.system.resources || {});
      resources[resourceKey] = newValue;
      
      await item.update({ 'system.resources': resources });
      
      // Re-render the sheet to update resource totals
      this.render(false);
      
      ui.notifications.info(`${item.name} ${resourceKey} updated to ${newValue}.`);
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

  /**
   * Handle adding a new resource to a part
   * @param {Event} event - The button click event
   * @private
   */
  async _onAddResource(event) {
    event.preventDefault();
    
    const nameInput = event.currentTarget.closest('.add-resource').querySelector('#new-resource-name');
    const valueInput = event.currentTarget.closest('.add-resource').querySelector('#new-resource-value');
    
    const resourceName = nameInput.value.trim();
    const resourceValue = parseInt(valueInput.value) || 1;
    
    if (!resourceName) {
      ui.notifications.warn('Please enter a resource name.');
      return;
    }
    
    const resources = foundry.utils.duplicate(this.item.system.resources || {});
    
    // Check if the resource already exists
    if (resources[resourceName]) {
      ui.notifications.warn(`Resource "${resourceName}" already exists.`);
      return;
    }
    
    resources[resourceName] = resourceValue;
    
    await this.item.update({ 'system.resources': resources });
    
    // Clear the inputs
    nameInput.value = '';
    valueInput.value = '1';
  }

  /**
   * Handle removing a resource from a part
   * @param {Event} event - The button click event
   * @private
   */
  async _onRemoveResource(event) {
    event.preventDefault();
    
    const resourceKey = event.currentTarget.dataset.resourceKey;
    const resources = foundry.utils.duplicate(this.item.system.resources || {});
    
    delete resources[resourceKey];
    
    await this.item.update({ 'system.resources': resources });
  }
}
