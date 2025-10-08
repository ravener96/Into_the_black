import itbItemBase from "./base-item.mjs";

export default class itbPart extends itbItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.weight = new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 });
    schema.totalWeight = new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 });
    schema.location = new fields.StringField({ required: false, nullable: true, initial: "light" });
    schema.mechID = new fields.StringField({ required: true, nullable: false, initial: "0" }); //used to identify holding mech. "0" is the unattached inventory state
    
    // Resources that this part contributes (e.g., "heat sink": 2, "cooling": 1)
    schema.resources = new fields.ObjectField({ 
      required: false, 
      nullable: true, 
      initial: {} 
    });
    
    // Resource type - "static" or "consumable"
    schema.resourceType = new fields.StringField({ 
      required: true, 
      nullable: false, 
      initial: "static",
      choices: ["static", "consumable"]
    });
    
    // Whether this part is currently enabled/active
    schema.enabled = new fields.BooleanField({ 
      required: true, 
      nullable: false, 
      initial: true 
    });

    // Break down roll formula into three independent fields
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 }),
      diceSize: new fields.StringField({ initial: "d20" }),
      diceBonus: new fields.StringField({ initial: "+@str.mod+ceil(@lvl / 2)" })
    });

    schema.formula = new fields.StringField({ blank: true });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    // Automatically calculate totalWeight
    const quantity = this.quantity || 0;
    const weight = this.weight || 0;
    this.totalWeight = quantity * weight;

    // Build the formula dynamically using string interpolation
    const roll = this.roll;
    this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
  }
}