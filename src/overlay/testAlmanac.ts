import { BattleUnitType } from '../model/battleUnitType';

export const ALMANAC: BattleUnitType[] = [
  {
    unitTypeId: 'hb_lm_1',
    unitWeight: 1,
    name: 'Axe Barbarian',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 60,
      mage: 60,
    },
    defenseBonus: {
      light_ranged: 20,
      mage: 20,
    },
  },
  {
    unitTypeId: 'hb_lr_1',
    unitWeight: 1,
    name: 'Crossbowman',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 50,
      mage: 50,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 30,
    },
  },
  {
    unitTypeId: 'hb_ma_1',
    unitWeight: 2,
    name: 'Priest',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 60,
      heavy_ranged: 70,
    },
    defenseBonus: {
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'hb_hm_1',
    unitWeight: 4,
    name: 'Paladin',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 30,
      heavy_ranged: 30,
    },
    defenseBonus: {
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'hb_hr_1',
    unitWeight: 6,
    name: 'Mortar',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 50,
      light_ranged: 60,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_lm_1',
    unitWeight: 1,
    name: 'Sword Dancer',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 40,
      mage: 40,
    },
  },
  {
    unitTypeId: 'eb_lr_1',
    unitWeight: 1,
    name: 'Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 60,
      mage: 80,
    },
    defenseBonus: {
      heavy_melee: 50,
    },
  },
  {
    unitTypeId: 'eb_ma_1',
    unitWeight: 3,
    name: 'Sorceress',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 50,
      heavy_ranged: 60,
    },
    defenseBonus: {
      heavy_melee: 60,
      heavy_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_hm_1',
    unitWeight: 4,
    name: 'Treant',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      heavy_ranged: 40,
    },
    defenseBonus: {
      light_melee: 30,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'eb_hr_1',
    unitWeight: 6,
    name: 'Golem',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 70,
      light_ranged: 20,
    },
    defenseBonus: {
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'tg_lm_1',
    unitWeight: 1,
    name: 'Cerberus',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 60,
    },
    defenseBonus: {
      mage: 30,
    },
  },
  {
    unitTypeId: 'tg_lr_1',
    unitWeight: 1,
    name: 'Dryad',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 70,
    },
    defenseBonus: {
      heavy_melee: 80,
      mage: 40,
    },
  },
  {
    unitTypeId: 'tg_ma_1',
    unitWeight: 3,
    name: 'Banshee ',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 10,
      heavy_ranged: 70,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'tg_hm_1',
    unitWeight: 6,
    name: 'Orc Warrior',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 70,
      heavy_ranged: 20,
    },
    defenseBonus: {
      light_melee: 30,
      heavy_ranged: 30,
    },
  },
  {
    unitTypeId: 'tg_hr_1',
    unitWeight: 4,
    name: 'Orc Strategist',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_ranged: 60,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 70,
    },
  },
  {
    unitTypeId: 'mc_lm_1',
    unitWeight: 4,
    name: 'Drone Rider',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mc_lr_1',
    unitWeight: 4,
    name: 'Ranger',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 40,
      mage: 80,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 80,
    },
  },
  {
    unitTypeId: 'mc_ma_1',
    unitWeight: 4,
    name: 'Blossom Mage',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 80,
      heavy_ranged: 30,
    },
    defenseBonus: {
      heavy_melee: 60,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mc_hm_1',
    unitWeight: 4,
    name: 'Vallorian Guard',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 60,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mc_hr_1',
    unitWeight: 4,
    name: 'Faineant Frog',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 80,
      light_ranged: 40,
    },
    defenseBonus: {
      light_melee: 60,
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_hblm_1',
    unitWeight: 4,
    name: 'Ancient Orc',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 60,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 20,
    },
  },
  {
    unitTypeId: 'mob_hblr_1',
    unitWeight: 4,
    name: 'Bandit',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 20,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_hbma_1',
    unitWeight: 4,
    name: 'Abbot',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 30,
      heavy_ranged: 70,
    },
    defenseBonus: {
      heavy_melee: 30,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_hbhm_1',
    unitWeight: 4,
    name: 'Knight',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 60,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_hbhr_1',
    unitWeight: 4,
    name: 'Cannoneer',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 60,
      light_ranged: 60,
    },
    defenseBonus: {
      light_melee: 20,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_eblm_1',
    unitWeight: 4,
    name: 'Thief',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 50,
      mage: 50,
    },
  },
  {
    unitTypeId: 'mob_eblr_1',
    unitWeight: 4,
    name: 'Wild Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 50,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_ebma_1',
    unitWeight: 4,
    name: 'Enchantress',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 40,
      heavy_ranged: 70,
    },
    defenseBonus: {
      heavy_melee: 40,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_ebhm_1',
    unitWeight: 4,
    name: 'Swamp Monster',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 10,
      heavy_ranged: 20,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_ebhr_1',
    unitWeight: 4,
    name: 'Steinling',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_melee: 50,
      light_ranged: 60,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mob_tglm_1',
    unitWeight: 4,
    name: 'Hellhound',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 20,
      mage: 50,
    },
    defenseBonus: {
      light_ranged: 30,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_tglr_1',
    unitWeight: 4,
    name: 'Mist Walker',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 30,
      mage: 80,
    },
    defenseBonus: {
      heavy_melee: 30,
      mage: 60,
    },
  },
  {
    unitTypeId: 'mob_mcma_1',
    unitWeight: 4,
    name: 'Thornrose Mage',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 80,
      heavy_ranged: 20,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_tghm_1',
    unitWeight: 4,
    name: 'Orc General',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 40,
      heavy_ranged: 30,
    },
    defenseBonus: {
      light_melee: 30,
      heavy_ranged: 20,
    },
  },
  {
    unitTypeId: 'mob_tghr_1',
    unitWeight: 4,
    name: 'Orc Deserter',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 70,
      light_ranged: 30,
    },
    defenseBonus: {
      light_melee: 60,
    },
  },
  {
    unitTypeId: 'hb_lm_2',
    unitWeight: 1,
    name: 'Axe Barbarian II',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 70,
    },
    defenseBonus: {
      light_ranged: 20,
      mage: 20,
    },
  },
  {
    unitTypeId: 'hb_lr_2',
    unitWeight: 1,
    name: 'Crossbowman II',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 60,
      mage: 60,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 30,
    },
  },
  {
    unitTypeId: 'hb_ma_2',
    unitWeight: 2,
    name: 'Priest II',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'hb_hm_2',
    unitWeight: 4,
    name: 'Paladin II',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 30,
      heavy_ranged: 40,
    },
    defenseBonus: {
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'hb_hr_2',
    unitWeight: 6,
    name: 'Mortar II',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 60,
      light_ranged: 70,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_lm_2',
    unitWeight: 1,
    name: 'Sword Dancer II',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 50,
      mage: 50,
    },
  },
  {
    unitTypeId: 'eb_lr_2',
    unitWeight: 1,
    name: 'Archer II',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 50,
    },
  },
  {
    unitTypeId: 'eb_ma_2',
    unitWeight: 3,
    name: 'Sorceress II',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 60,
      heavy_ranged: 70,
    },
    defenseBonus: {
      heavy_melee: 60,
      heavy_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_hm_2',
    unitWeight: 4,
    name: 'Treant II',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      heavy_ranged: 50,
    },
    defenseBonus: {
      light_melee: 40,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'eb_hr_2',
    unitWeight: 6,
    name: 'Golem II',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 80,
      light_ranged: 20,
    },
    defenseBonus: {
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'tg_lm_2',
    unitWeight: 1,
    name: 'Cerberus II',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 70,
    },
    defenseBonus: {
      mage: 40,
    },
  },
  {
    unitTypeId: 'tg_lr_2',
    unitWeight: 1,
    name: 'Dryad II',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 90,
    },
    defenseBonus: {
      heavy_melee: 80,
      mage: 40,
    },
  },
  {
    unitTypeId: 'tg_ma_2',
    unitWeight: 3,
    name: 'Banshee II ',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 10,
      heavy_ranged: 90,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'tg_hm_2',
    unitWeight: 6,
    name: 'Orc Warrior II',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 80,
      heavy_ranged: 20,
    },
    defenseBonus: {
      light_melee: 40,
      heavy_ranged: 30,
    },
  },
  {
    unitTypeId: 'tg_hr_2',
    unitWeight: 4,
    name: 'Orc Strategist II',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_ranged: 70,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_lm_2',
    unitWeight: 4,
    name: 'Drone Rider II',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 90,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mc_lr_2',
    unitWeight: 4,
    name: 'Ranger II',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 40,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 90,
    },
  },
  {
    unitTypeId: 'mc_ma_2',
    unitWeight: 4,
    name: 'Blossom Mage II',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 90,
      heavy_ranged: 30,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mc_hm_2',
    unitWeight: 4,
    name: 'Vallorian Guard II ',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 70,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_hr_2',
    unitWeight: 4,
    name: 'Faineant Frog II ',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 90,
      light_ranged: 40,
    },
    defenseBonus: {
      light_melee: 70,
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_hblm_2',
    unitWeight: 4,
    name: 'Ancient Orc',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mob_hblr_2',
    unitWeight: 4,
    name: 'Bandit',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 80,
      mage: 20,
    },
    defenseBonus: {
      heavy_melee: 70,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_hbma_2',
    unitWeight: 4,
    name: 'Abbot',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 40,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_melee: 30,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_hbhm_2',
    unitWeight: 4,
    name: 'Knight',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 70,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_hbhr_2',
    unitWeight: 4,
    name: 'Cannoneer',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 70,
      light_ranged: 70,
    },
    defenseBonus: {
      light_melee: 20,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_eblm_2',
    unitWeight: 4,
    name: 'Thief',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 60,
      mage: 60,
    },
  },
  {
    unitTypeId: 'mob_eblr_2',
    unitWeight: 4,
    name: 'Wild Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 80,
      mage: 60,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_ebma_2',
    unitWeight: 4,
    name: 'Enchantress',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 40,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_melee: 40,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_ebhm_2',
    unitWeight: 4,
    name: 'Swamp Monster',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 20,
      heavy_ranged: 30,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_ebhr_2',
    unitWeight: 4,
    name: 'Steinling',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_melee: 50,
      light_ranged: 70,
    },
    defenseBonus: {
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_tglm_2',
    unitWeight: 4,
    name: 'Hellhound',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 20,
      mage: 70,
    },
    defenseBonus: {
      light_ranged: 30,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_tglr_2',
    unitWeight: 4,
    name: 'Mist Walker',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 30,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 30,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_mcma_2',
    unitWeight: 4,
    name: 'Thornrose Mage',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 90,
      heavy_ranged: 20,
    },
    defenseBonus: {
      heavy_melee: 80,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_tghm_2',
    unitWeight: 4,
    name: 'Orc General',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 60,
      heavy_ranged: 30,
    },
    defenseBonus: {
      light_melee: 30,
      heavy_ranged: 20,
    },
  },
  {
    unitTypeId: 'mob_tghr_2',
    unitWeight: 4,
    name: 'Orc Deserter',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 80,
      light_ranged: 30,
    },
    defenseBonus: {
      light_melee: 70,
    },
  },
  {
    unitTypeId: 'hb_lm_3',
    unitWeight: 1,
    name: 'Storm Barbarian',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 70,
    },
    defenseBonus: {
      light_ranged: 20,
      mage: 20,
    },
  },
  {
    unitTypeId: 'hb_lr_3',
    unitWeight: 1,
    name: 'Master Crossbowman',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 60,
      mage: 60,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 30,
    },
  },
  {
    unitTypeId: 'hb_ma_3',
    unitWeight: 2,
    name: 'Sacred Priest',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'hb_hm_3',
    unitWeight: 4,
    name: 'Blessed Paladin',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 30,
      heavy_ranged: 40,
    },
    defenseBonus: {
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'hb_hr_3',
    unitWeight: 6,
    name: 'Rad Mortar',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 60,
      light_ranged: 70,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_lm_3',
    unitWeight: 1,
    name: 'Sword Acrobat',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 50,
      mage: 50,
    },
  },
  {
    unitTypeId: 'eb_lr_3',
    unitWeight: 1,
    name: 'Elite Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 50,
    },
  },
  {
    unitTypeId: 'eb_ma_3',
    unitWeight: 3,
    name: 'Bud Sorceress',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 60,
      heavy_ranged: 70,
    },
    defenseBonus: {
      heavy_melee: 60,
      heavy_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_hm_3',
    unitWeight: 4,
    name: 'Elder Treant',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      heavy_ranged: 50,
    },
    defenseBonus: {
      light_melee: 40,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'eb_hr_3',
    unitWeight: 6,
    name: 'Granite Golem',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 80,
      light_ranged: 20,
    },
    defenseBonus: {
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'tg_lm_3',
    unitWeight: 1,
    name: 'Sinister Cerberus',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 70,
    },
    defenseBonus: {
      mage: 40,
    },
  },
  {
    unitTypeId: 'tg_lr_3',
    unitWeight: 1,
    name: 'Poison Dryad',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 90,
    },
    defenseBonus: {
      heavy_melee: 80,
      mage: 40,
    },
  },
  {
    unitTypeId: 'tg_ma_3',
    unitWeight: 3,
    name: 'Ghastly Banshee ',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 10,
      heavy_ranged: 90,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'tg_hm_3',
    unitWeight: 6,
    name: 'Gruff Orc Warrior',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 80,
      heavy_ranged: 20,
    },
    defenseBonus: {
      light_melee: 40,
      heavy_ranged: 30,
    },
  },
  {
    unitTypeId: 'tg_hr_3',
    unitWeight: 4,
    name: 'Senior Orc Strategist',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_ranged: 70,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_lm_3',
    unitWeight: 4,
    name: 'Venom Drone Rider',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 90,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mc_lr_3',
    unitWeight: 4,
    name: 'Pro Ranger',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 40,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 90,
    },
  },
  {
    unitTypeId: 'mc_ma_3',
    unitWeight: 4,
    name: 'Blossom Princess',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 90,
      heavy_ranged: 30,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mc_hm_3',
    unitWeight: 4,
    name: 'Vallorian Veteran',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 70,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_hr_3',
    unitWeight: 4,
    name: 'Frog Prince',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 90,
      light_ranged: 40,
    },
    defenseBonus: {
      light_melee: 70,
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_hblm_3',
    unitWeight: 4,
    name: 'Brutal Ancient Orc',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mob_hblr_3',
    unitWeight: 4,
    name: 'Wily Bandit',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 80,
      mage: 20,
    },
    defenseBonus: {
      heavy_melee: 70,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_hbma_3',
    unitWeight: 4,
    name: 'Dark Abbot',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 40,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_melee: 30,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_hbhm_3',
    unitWeight: 4,
    name: 'Brave Knight',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 70,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_hbhr_3',
    unitWeight: 4,
    name: 'Crazy Cannoneer',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 70,
      light_ranged: 70,
    },
    defenseBonus: {
      light_melee: 20,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_eblm_3',
    unitWeight: 4,
    name: 'Nasty Thief',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 60,
      mage: 60,
    },
  },
  {
    unitTypeId: 'mob_eblr_3',
    unitWeight: 4,
    name: 'Feral Wild Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 80,
      mage: 60,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_ebma_3',
    unitWeight: 4,
    name: 'Devilish Enchantress',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 40,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_melee: 40,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_ebhm_3',
    unitWeight: 4,
    name: 'Ferocious Swamp Monster',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 20,
      heavy_ranged: 30,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_ebhr_3',
    unitWeight: 4,
    name: 'Rigid Steinling',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_melee: 50,
      light_ranged: 70,
    },
    defenseBonus: {
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_tglm_3',
    unitWeight: 4,
    name: 'Furious Hellhound',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 20,
      mage: 70,
    },
    defenseBonus: {
      light_ranged: 30,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_tglr_3',
    unitWeight: 4,
    name: 'Sneaky Mist Walker',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 30,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 30,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_mcma_3',
    unitWeight: 4,
    name: 'Withered Thornrose Mage',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 90,
      heavy_ranged: 20,
    },
    defenseBonus: {
      heavy_melee: 80,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_tghm_3',
    unitWeight: 4,
    name: 'Mutated Orc General',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 60,
      heavy_ranged: 30,
    },
    defenseBonus: {
      light_melee: 30,
      heavy_ranged: 20,
    },
  },
  {
    unitTypeId: 'mob_tghr_3',
    unitWeight: 4,
    name: 'Mucky Orc Deserter',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 80,
      light_ranged: 30,
    },
    defenseBonus: {
      light_melee: 70,
    },
  },
  {
    unitTypeId: 'hb_lm_4',
    unitWeight: 1,
    name: 'Storm Barbarian II',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 70,
    },
    defenseBonus: {
      light_ranged: 40,
      mage: 40,
    },
  },
  {
    unitTypeId: 'hb_lr_4',
    unitWeight: 1,
    name: 'Master Crossbowman II',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 70,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 30,
    },
  },
  {
    unitTypeId: 'hb_ma_4',
    unitWeight: 2,
    name: 'Sacred Priest II',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 80,
      heavy_ranged: 90,
    },
    defenseBonus: {
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'hb_hm_4',
    unitWeight: 4,
    name: 'Blessed Paladin II',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 40,
      heavy_ranged: 50,
    },
    defenseBonus: {
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'hb_hr_4',
    unitWeight: 6,
    name: 'Rad Mortar II',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 70,
      light_ranged: 80,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_lm_4',
    unitWeight: 1,
    name: 'Sword Acrobat II',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 40,
      mage: 40,
    },
    defenseBonus: {
      light_ranged: 60,
      mage: 60,
    },
  },
  {
    unitTypeId: 'eb_lr_4',
    unitWeight: 1,
    name: 'Elite Archer II',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 10,
    },
  },
  {
    unitTypeId: 'eb_ma_4',
    unitWeight: 3,
    name: 'Bud Sorceress II',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'eb_hm_4',
    unitWeight: 4,
    name: 'Elder Treant II',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      heavy_ranged: 60,
    },
    defenseBonus: {
      light_melee: 50,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'eb_hr_4',
    unitWeight: 6,
    name: 'Granite Golem II',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 90,
      light_ranged: 30,
    },
    defenseBonus: {
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'tg_lm_4',
    unitWeight: 1,
    name: 'Sinister Cerberus II',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 80,
    },
    defenseBonus: {
      light_ranged: 20,
      mage: 60,
    },
  },
  {
    unitTypeId: 'tg_lr_4',
    unitWeight: 1,
    name: 'Poison Dryad II',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 100,
    },
    defenseBonus: {
      heavy_melee: 90,
      mage: 40,
    },
  },
  {
    unitTypeId: 'tg_ma_4',
    unitWeight: 3,
    name: 'Ghastly Banshee  II',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 10,
      heavy_ranged: 120,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'tg_hm_4',
    unitWeight: 6,
    name: 'Gruff Orc Warrior II',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 90,
      heavy_ranged: 20,
    },
    defenseBonus: {
      light_melee: 50,
      heavy_ranged: 30,
    },
  },
  {
    unitTypeId: 'tg_hr_4',
    unitWeight: 4,
    name: 'Senior Orc Strategist II',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_ranged: 90,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_lm_4',
    unitWeight: 4,
    name: 'Venom Drone Rider II',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 90,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 60,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mc_lr_4',
    unitWeight: 4,
    name: 'Pro Ranger II',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 40,
      mage: 110,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 90,
    },
  },
  {
    unitTypeId: 'mc_ma_4',
    unitWeight: 4,
    name: 'Blossom Princess II',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 100,
      heavy_ranged: 30,
    },
    defenseBonus: {
      heavy_melee: 80,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mc_hm_4',
    unitWeight: 4,
    name: 'Vallorian Veteran II',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 90,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_hr_4',
    unitWeight: 4,
    name: 'Frog Prince II',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 90,
      light_ranged: 40,
    },
    defenseBonus: {
      light_melee: 90,
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_hblm_4',
    unitWeight: 4,
    name: 'Brutal Ancient Orc',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 90,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mob_hblr_4',
    unitWeight: 4,
    name: 'Wily Bandit',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 100,
      mage: 20,
    },
    defenseBonus: {
      heavy_melee: 70,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_hbma_4',
    unitWeight: 4,
    name: 'Dark Abbot',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 50,
      heavy_ranged: 90,
    },
    defenseBonus: {
      heavy_melee: 30,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_hbhm_4',
    unitWeight: 4,
    name: 'Brave Knight',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 80,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_hbhr_4',
    unitWeight: 4,
    name: 'Crazy Cannoneer',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 80,
      light_ranged: 80,
    },
    defenseBonus: {
      light_melee: 20,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_eblm_4',
    unitWeight: 4,
    name: 'Nasty Thief',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_eblr_4',
    unitWeight: 4,
    name: 'Feral Wild Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 90,
      mage: 70,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_ebma_4',
    unitWeight: 4,
    name: 'Devilish Enchantress',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 40,
      heavy_ranged: 100,
    },
    defenseBonus: {
      heavy_melee: 40,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_ebhm_4',
    unitWeight: 4,
    name: 'Ferocious Swamp Monster',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 30,
      heavy_ranged: 40,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_ebhr_4',
    unitWeight: 4,
    name: 'Rigid Steinling',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_melee: 50,
      light_ranged: 80,
    },
    defenseBonus: {
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_tglm_4',
    unitWeight: 4,
    name: 'Furious Hellhound',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 20,
      mage: 90,
    },
    defenseBonus: {
      light_ranged: 30,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_tglr_4',
    unitWeight: 4,
    name: 'Sneaky Mist Walker',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 30,
      mage: 100,
    },
    defenseBonus: {
      heavy_melee: 30,
      mage: 80,
    },
  },
  {
    unitTypeId: 'mob_mcma_4',
    unitWeight: 4,
    name: 'Withered Thornrose Mage',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 100,
      heavy_ranged: 20,
    },
    defenseBonus: {
      heavy_melee: 90,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_tghm_4',
    unitWeight: 4,
    name: 'Mutated Orc General',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 70,
      heavy_ranged: 30,
    },
    defenseBonus: {
      light_melee: 40,
      heavy_ranged: 20,
    },
  },
  {
    unitTypeId: 'mob_tghr_4',
    unitWeight: 4,
    name: 'Mucky Orc Deserter',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 90,
      light_ranged: 30,
    },
    defenseBonus: {
      light_melee: 80,
    },
  },
  {
    unitTypeId: 'hb_lm_5',
    unitWeight: 1,
    name: 'Divine Axe Barbarian',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 70,
    },
    defenseBonus: {
      light_ranged: 40,
      mage: 40,
    },
  },
  {
    unitTypeId: 'hb_lr_5',
    unitWeight: 1,
    name: 'Divine Crossbowman',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 70,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 30,
    },
  },
  {
    unitTypeId: 'hb_ma_5',
    unitWeight: 2,
    name: 'Divine Priest',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 80,
      heavy_ranged: 90,
    },
    defenseBonus: {
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'hb_hm_5',
    unitWeight: 4,
    name: 'Divine Paladin',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 40,
      heavy_ranged: 50,
    },
    defenseBonus: {
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'hb_hr_5',
    unitWeight: 6,
    name: 'Divine Mortar',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 70,
      light_ranged: 80,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'eb_lm_5',
    unitWeight: 1,
    name: 'Divine Sword Dancer',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 40,
      mage: 40,
    },
    defenseBonus: {
      light_ranged: 60,
      mage: 60,
    },
  },
  {
    unitTypeId: 'eb_lr_5',
    unitWeight: 1,
    name: 'Divine Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      mage: 90,
    },
    defenseBonus: {
      heavy_melee: 60,
      mage: 10,
    },
  },
  {
    unitTypeId: 'eb_ma_5',
    unitWeight: 3,
    name: 'Divine Sorceress',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'eb_hm_5',
    unitWeight: 4,
    name: 'Divine Treant',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      heavy_ranged: 60,
    },
    defenseBonus: {
      light_melee: 50,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'eb_hr_5',
    unitWeight: 6,
    name: 'Divine Golem',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 90,
      light_ranged: 30,
    },
    defenseBonus: {
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'tg_lm_5',
    unitWeight: 1,
    name: 'Divine Cerberus',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 30,
      mage: 80,
    },
    defenseBonus: {
      light_ranged: 20,
      mage: 60,
    },
  },
  {
    unitTypeId: 'tg_lr_5',
    unitWeight: 1,
    name: 'Divine Dryad',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 100,
    },
    defenseBonus: {
      heavy_melee: 90,
      mage: 40,
    },
  },
  {
    unitTypeId: 'tg_ma_5',
    unitWeight: 3,
    name: 'Divine Banshee',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 10,
      heavy_ranged: 120,
    },
    defenseBonus: {
      heavy_melee: 70,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'tg_hm_5',
    unitWeight: 6,
    name: 'Divine Orc Warrior',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 90,
      heavy_ranged: 20,
    },
    defenseBonus: {
      light_melee: 50,
      heavy_ranged: 30,
    },
  },
  {
    unitTypeId: 'tg_hr_5',
    unitWeight: 4,
    name: 'Divine Orc Strategist',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_ranged: 90,
    },
    defenseBonus: {
      light_melee: 40,
      light_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_lm_5',
    unitWeight: 4,
    name: 'Divine Drone Rider',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 90,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 60,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mc_lr_5',
    unitWeight: 4,
    name: 'Divine Ranger',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 40,
      mage: 110,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 90,
    },
  },
  {
    unitTypeId: 'mc_ma_5',
    unitWeight: 4,
    name: 'Divine Blossom Mage',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 100,
      heavy_ranged: 30,
    },
    defenseBonus: {
      heavy_melee: 80,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mc_hm_5',
    unitWeight: 4,
    name: 'Divine Vallorian Guard',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 90,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 80,
    },
  },
  {
    unitTypeId: 'mc_hr_5',
    unitWeight: 4,
    name: 'Divine Faineant Frog',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 100,
      light_ranged: 50,
    },
    defenseBonus: {
      light_melee: 90,
      light_ranged: 40,
    },
  },
  {
    unitTypeId: 'mob_hblm_5',
    unitWeight: 4,
    name: 'Brutal Ancient Orc',
    strengths: {
      light_ranged: 3,
      mage: 1,
    },
    attackBonus: {
      light_ranged: 90,
      mage: 30,
    },
    defenseBonus: {
      light_ranged: 30,
    },
  },
  {
    unitTypeId: 'mob_hblr_5',
    unitWeight: 4,
    name: 'Wily Bandit',
    strengths: {
      mage: 1,
      heavy_melee: 3,
    },
    attackBonus: {
      heavy_melee: 100,
      mage: 20,
    },
    defenseBonus: {
      heavy_melee: 70,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_hbma_5',
    unitWeight: 4,
    name: 'Dark Abbot',
    strengths: {
      heavy_melee: 2,
      heavy_ranged: 2,
    },
    attackBonus: {
      heavy_melee: 50,
      heavy_ranged: 90,
    },
    defenseBonus: {
      heavy_melee: 30,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_hbhm_5',
    unitWeight: 4,
    name: 'Brave Knight',
    strengths: {
      heavy_ranged: 3,
      light_melee: 1,
    },
    attackBonus: {
      heavy_ranged: 80,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_hbhr_5',
    unitWeight: 4,
    name: 'Crazy Cannoneer',
    strengths: {
      light_melee: 2,
      light_ranged: 2,
    },
    attackBonus: {
      light_melee: 80,
      light_ranged: 80,
    },
    defenseBonus: {
      light_melee: 20,
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_eblm_5',
    unitWeight: 4,
    name: 'Nasty Thief',
    strengths: {
      light_ranged: 2,
      mage: 2,
    },
    attackBonus: {
      light_ranged: 70,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_eblr_5',
    unitWeight: 4,
    name: 'Feral Wild Archer',
    strengths: {
      mage: 2,
      heavy_melee: 2,
    },
    attackBonus: {
      heavy_melee: 90,
      mage: 70,
    },
    defenseBonus: {
      heavy_melee: 40,
      mage: 20,
    },
  },
  {
    unitTypeId: 'mob_ebma_5',
    unitWeight: 4,
    name: 'Devilish Enchantress',
    strengths: {
      heavy_melee: 1,
      heavy_ranged: 3,
    },
    attackBonus: {
      heavy_melee: 40,
      heavy_ranged: 100,
    },
    defenseBonus: {
      heavy_melee: 40,
      heavy_ranged: 70,
    },
  },
  {
    unitTypeId: 'mob_ebhm_5',
    unitWeight: 4,
    name: 'Ferocious Swamp Monster',
    strengths: {
      heavy_ranged: 2,
      light_melee: 2,
    },
    attackBonus: {
      light_melee: 30,
      heavy_ranged: 40,
    },
    defenseBonus: {
      light_melee: 20,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_ebhr_5',
    unitWeight: 4,
    name: 'Rigid Steinling',
    strengths: {
      light_melee: 1,
      light_ranged: 3,
    },
    attackBonus: {
      light_melee: 50,
      light_ranged: 80,
    },
    defenseBonus: {
      light_ranged: 50,
    },
  },
  {
    unitTypeId: 'mob_tglm_5',
    unitWeight: 4,
    name: 'Furious Hellhound',
    strengths: {
      light_ranged: 1,
      mage: 3,
    },
    attackBonus: {
      light_ranged: 20,
      mage: 90,
    },
    defenseBonus: {
      light_ranged: 30,
      mage: 70,
    },
  },
  {
    unitTypeId: 'mob_tglr_5',
    unitWeight: 4,
    name: 'Sneaky Mist Walker',
    strengths: {
      mage: 3,
      heavy_melee: 1,
    },
    attackBonus: {
      heavy_melee: 30,
      mage: 100,
    },
    defenseBonus: {
      heavy_melee: 30,
      mage: 80,
    },
  },
  {
    unitTypeId: 'mob_mcma_5',
    unitWeight: 4,
    name: 'Withered Thornrose Mage',
    strengths: {
      heavy_melee: 3,
      heavy_ranged: 1,
    },
    attackBonus: {
      heavy_melee: 100,
      heavy_ranged: 20,
    },
    defenseBonus: {
      heavy_melee: 90,
      heavy_ranged: 60,
    },
  },
  {
    unitTypeId: 'mob_tghm_5',
    unitWeight: 4,
    name: 'Mutated Orc General',
    strengths: {
      heavy_ranged: 1,
      light_melee: 3,
    },
    attackBonus: {
      light_melee: 70,
      heavy_ranged: 30,
    },
    defenseBonus: {
      light_melee: 40,
      heavy_ranged: 20,
    },
  },
  {
    unitTypeId: 'mob_tghr_5',
    unitWeight: 4,
    name: 'Mucky Orc Deserter',
    strengths: {
      light_melee: 3,
      light_ranged: 1,
    },
    attackBonus: {
      light_melee: 90,
      light_ranged: 30,
    },
    defenseBonus: {
      light_melee: 80,
    },
  },
];
