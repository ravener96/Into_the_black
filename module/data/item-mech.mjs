import itbItemBase from "./base-item.mjs";

export default class itbMech extends itbItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    
    // Add mech-specific fields
    schema.weight = new fields.NumberField({
      required: true,
      initial: 0,
      min: 0,
      step: 0.1,
      label: "Weight"
    });
    
    return schema;
  }
}