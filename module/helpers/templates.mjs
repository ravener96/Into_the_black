/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/into-the-black/templates/actor/parts/actor-features.hbs',
    'systems/into-the-black/templates/actor/parts/actor-items.hbs',
    'systems/into-the-black/templates/actor/parts/actor-mech.hbs',
    'systems/into-the-black/templates/actor/parts/actor-spells.hbs',
    'systems/into-the-black/templates/actor/parts/actor-effects.hbs',
    'systems/into-the-black/templates/actor/parts/mech-body-part-list.hbs',
    'systems/into-the-black/templates/actor/parts/mech-body-part-list-mech.hbs',
    // Item partials
    'systems/into-the-black/templates/item/parts/item-effects.hbs',
  ]);
};
