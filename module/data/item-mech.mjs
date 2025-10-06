import itbItemBase from "./base-item.mjs";

export default class itbMech extends itbItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    schema.weight = new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 });
    schema.location = new fields.StringField({ required: false, nullable: true, initial: "unassigned" });
    schema.mechID = new fields.StringField({ 
      required: true, 
      nullable: false, 
      initial: ""
    });

    // Add mech-specific fields
    schema.weight = new fields.NumberField({
      required: true,
      initial: 0,
      min: 0,
      step: 0.1,
      label: "Weight"
    });

    // Body part HP dictionary, default values zero
    schema.bodyPartHP = new fields.ObjectField({
      required: true,
      initial: {
        head: 0,
        torso_l: 0,
        torso_c: 0,
        torso_r: 0,
        torso_rear: 0, // Rear torso is only a hit location, not a separate body part
        arm_l: 0,
        arm_r: 0,
        leg_l: 0,
        leg_r: 0
      },
      label: "Body Part Hit Points"
    });

    // Body part maximum HP dictionary, default values zero
    schema.bodyPartMaxHP = new fields.ObjectField({
      required: true,
      initial: {
        head: 0,
        torso_l: 0,
        torso_c: 0,
        torso_r: 0,
        torso_rear: 0, // Rear torso is only a hit location, not a separate body part
        arm_l: 0,
        arm_r: 0,
        leg_l: 0,
        leg_r: 0
      },
      label: "Body Part Maximum Hit Points"
    });

    // Body part armour dictionary, default values zero
    schema.bodyPartArmour = new fields.ObjectField({
      required: true,
      initial: {
        head: 0,
        torso_l: 0,
        torso_c: 0,
        torso_r: 0,
        torso_rear: 0, // Rear torso is only a hit location, not a separate body part
        arm_l: 0,
        arm_r: 0,
        leg_l: 0,
        leg_r: 0
      },
      label: "Body Part Armour"
    });

    // Body part maximum armour dictionary, default values zero
    schema.bodyPartMaxArmour = new fields.ObjectField({
      required: true,
      initial: {
        head: 0,
        torso_l: 0,
        torso_c: 0,
        torso_r: 0,
        torso_rear: 0, // Rear torso is only a hit location, not a separate body part
        arm_l: 0,
        arm_r: 0,
        leg_l: 0,
        leg_r: 0
      },
      label: "Body Part Maximum Armour"
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    // No longer need to generate mechID here - handled in _onCreate
  }

  _onCreate(data, options, userId) {
    super._onCreate?.(data, options, userId);
    
    // Generate a unique mechID when the item is created
    // Also handle legacy numeric values (0) for backward compatibility
    if (!this.mechID || this.mechID === "" || this.mechID === 0 || this.mechID === "0" ||  this.mechID === 'NaN' || Number.isNaN(this.mechID)) {
      this.parent?.update({'system.mechID': foundry.utils.randomID()});
    }
  }
}