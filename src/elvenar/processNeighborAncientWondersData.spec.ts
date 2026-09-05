import { BuildingFinder } from '../city/buildingFinder';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { calculatePhase } from './processNeighborAncientWondersData';
import type {
  AncientWonderPhases,
  Contribution,
  ContributionReward,
  HuntersInformation,
} from './processNeighborAncientWondersData';

const phase8: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 848895252,
  entityBaseName: 'B_Gr5_AW2',
  isFavourite: true,
  resourceId: 'b_gr5_aw2_shards',
  investedKnowledgePoints: 886,
  requiredKnowledgePoints: 890,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: -1,
      player: {
        player_id: 848895252,
        name: '2ombie',
        avatar: 'portraitIdCh18F2',
        guild_info: {
          id: 22393,
          name: 'Smofflers Tavern',
        },
      },
      knowledgePoints: 634,
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 850083936,
        name: 'Kikog',
        avatar: 'portraitIdGr10F2',
        guild_info: {
          id: 26630,
          name: 'Spirit of Fusion (Rec)',
        },
      },
      knowledgePoints: 90,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr5_aw2_shards',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: 850145642,
        name: 'Lada Oribel',
        avatar: 'portraitIdGr7F2',
        guild_info: {
          id: 2973,
          name: 'Spirit Of The Phoenix',
        },
      },
      knowledgePoints: 50,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr5_aw2_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: 850055665,
        name: 'Yordina',
        avatar: 'portraitEvtTheaterEasterXxvC1',
        guild_info: {
          id: 30759,
          name: 'Paradigm Shift- Rec',
        },
      },
      knowledgePoints: 35,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr5_aw2_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: 850016646,
        name: 'Southpaw Sean',
        avatar: 'portraitAw4F',
        guild_info: {
          id: 30759,
          name: 'Paradigm Shift- Rec',
        },
      },
      knowledgePoints: 31,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr5_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: 849924677,
        name: 'Elefen',
        avatar: 'portraitIdGr5M2',
        guild_info: {
          id: 30503,
          name: 'gree 🐬😍🤩🥰🥳😋😝😜🤪💎',
        },
      },
      knowledgePoints: 30,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr5_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: 639456,
        name: 'lievre59germ',
        avatar: 'portraitAw1F',
        guild_info: {
          id: 22393,
          name: 'Smofflers Tavern',
        },
      },
      knowledgePoints: 15,
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: 850330826,
        name: 'AngusKane',
        avatar: 'portraitEvtScrollSorcerersXxviF1',
        guild_info: {
          id: 7083,
          name: 'Endeavoury Too',
        },
      },
      knowledgePoints: 1,
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 133145,
};

const phase7: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 1931841,
  entityBaseName: 'B_Gr10_AW2',
  isFavourite: true,
  resourceId: 'b_gr10_aw2_shards',
  investedKnowledgePoints: 920,
  requiredKnowledgePoints: 950,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 849377798,
        name: 'BlouBlue',
        avatar: 'portraitIdGr4M1',
        guild_info: {
          id: 16266,
          name: 'Cymrodyr unedig',
        },
      },
      knowledgePoints: 545,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr10_aw2_shards',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: -1,
      player: {
        player_id: 1931841,
        name: 'King Ryan',
        avatar: 'portraitIdMetalface',
        guild_info: {
          id: 16266,
          name: 'Cymrodyr unedig',
        },
      },
      knowledgePoints: 265,
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: 2077766,
        name: 'Engelkie',
        avatar: 'portraitIdNoblegirl',
        guild_info: {
          id: 16266,
          name: 'Cymrodyr unedig',
        },
      },
      knowledgePoints: 70,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr10_aw2_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: 849933391,
        name: 'Aardvark',
        avatar: 'portraitIdMustache',
        guild_info: {
          id: 16266,
          name: 'Cymrodyr unedig',
        },
      },
      knowledgePoints: 30,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr10_aw2_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: 2294277,
        name: 'Budile',
        avatar: 'portraitEvtShufflePostalXxiiiM1',
        guild_info: {
          id: 16266,
          name: 'Cymrodyr unedig',
        },
      },
      knowledgePoints: 10,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr10_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: -1,
        name: 'Balrogville',
      },
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr10_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: -2,
        name: 'Budile',
      },
      knowledgePoints: 10,
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 79472,
};

const phase5: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 862364,
  entityBaseName: 'B_Elves_AW1',
  isFavourite: true,
  resourceId: 'b_humans_aw1_shards',
  investedKnowledgePoints: 1096,
  requiredKnowledgePoints: 1340,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: -1,
      player: {
        player_id: 862364,
        name: 'gleek',
        avatar: 'portraitIdKnight',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 760,
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 850016646,
        name: 'Southpaw Sean',
        avatar: 'portraitAw4F',
        guild_info: {
          id: 30759,
          name: 'Paradigm Shift- Rec',
        },
      },
      knowledgePoints: 71,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw1_shards',
            amount: 5,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 4,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: 850039105,
        name: 'Shoto123',
        avatar: 'portraitIdGlowingeyes',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 70,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw1_shards',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: 641190,
        name: 'justdoittt',
        avatar: 'portraitAwGr92',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 50,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw1_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: 187215,
        name: 'Selazar',
        avatar: 'portraitSeasonSecretsXxvF1',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 45,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw1_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: 1520852,
        name: 'Therya',
        avatar: 'portraitAwGr51',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 40,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw1_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: 1400024,
        name: '7PK7',
        avatar: 'portraitIdGr11M1',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 30,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw1_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: 2096004,
        name: 'Bshow',
        avatar: 'portraitIdCh21F2',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 15,
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 8,
      player: {
        player_id: 591776,
        name: 'Gobomen2',
        avatar: 'portraitAw4F',
        guild_info: {
          id: 7979,
          name: 'The Following',
        },
      },
      knowledgePoints: 15,
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 119490,
};

const phase4: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 849438741,
  entityBaseName: 'B_Gr4_AW1',
  resourceId: 'b_gr4_aw1_shards',
  investedKnowledgePoints: 780,
  requiredKnowledgePoints: 840,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 849962750,
        name: 'Not a Pointy Ears',
        avatar: 'portraitEvtTheaterZodiacXxiiiM2',
        guild_info: {
          id: 554,
          name: 'The Hive (Welcome BORG)',
        },
      },
      knowledgePoints: 600,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr4_aw1_shards',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: 849189910,
        name: 'Eskarinna',
        avatar: 'portraitAw4F',
        guild_info: {
          id: 554,
          name: 'The Hive (Welcome BORG)',
        },
      },
      knowledgePoints: 90,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr4_aw1_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: 658203,
        name: 'Bieledva',
        avatar: 'portraitAwCh231',
        guild_info: {
          id: 554,
          name: 'The Hive (Welcome BORG)',
        },
      },
      knowledgePoints: 60,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr4_aw1_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: 848903404,
        name: 'Fizzi',
        avatar: 'portraitSeasonSecretsXxivF1',
        guild_info: {
          id: 554,
          name: 'The Hive (Welcome BORG)',
        },
      },
      knowledgePoints: 30,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr4_aw1_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_gr4_aw1_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 103558,
};
const phase3: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 262709,
  entityBaseName: 'B_Humans_AW2',
  resourceId: 'b_humans_aw2_shards',
  investedKnowledgePoints: 1125,
  requiredKnowledgePoints: 1190,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: -1,
      player: {
        player_id: 262709,
        name: 'Sir Gaston',
        avatar: 'portraitIdPaladin',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 404,
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 660815,
        name: 'Lab Ben',
        avatar: 'portraitIdGr5M2',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 250,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw2_shards',
            amount: 4,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: 1027506,
        name: 'Laponac',
        avatar: 'portraitAwCh171',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 130,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw2_shards',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: 849024143,
        name: 'Therint',
        avatar: 'portraitAw6M',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 120,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw2_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: 300979,
        name: 'HellyWelly',
        avatar: 'portraitAwGr112',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 120,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: 1952358,
        name: 'Aleksandr',
        avatar: 'portraitEvtShufflePostalXxiiiM1',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 100,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: 850016646,
        name: 'Southpaw Sean',
        avatar: 'portraitAw4F',
        guild_info: {
          id: 30759,
          name: 'Paradigm Shift- Rec',
        },
      },
      knowledgePoints: 1,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 8,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 84773,
};

const phase1: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 262709,
  entityBaseName: 'B_Humans_AW2',
  resourceId: 'b_humans_aw2_shards',
  investedKnowledgePoints: 1125,
  requiredKnowledgePoints: 1190,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: -1,
      player: {
        player_id: 262709,
        name: 'Sir Gaston',
        avatar: 'portraitIdPaladin',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 404,
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 660815,
        name: 'Lab Ben',
        avatar: 'portraitIdGr5M2',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 250,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw2_shards',
            amount: 4,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: 1027506,
        name: 'Laponac',
        avatar: 'portraitAwCh171',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 130,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw2_shards',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: 849024143,
        name: 'Therint',
        avatar: 'portraitAw6M',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 120,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw2_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: 300979,
        name: 'HellyWelly',
        avatar: 'portraitAwGr112',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 120,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_elves_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: 1952358,
        name: 'Aleksandr',
        avatar: 'portraitEvtShufflePostalXxiiiM1',
        guild_info: {
          id: 14315,
          name: '⬗ тнє тємρтαтισηѕ ⬖',
        },
      },
      knowledgePoints: 100,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: 850016646,
        name: 'Southpaw Sean',
        avatar: 'portraitAw4F',
        guild_info: {
          id: 30759,
          name: 'Paradigm Shift- Rec',
        },
      },
      knowledgePoints: 1,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_humans_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 8,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 84773,
};

const phase2: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 1015970,
  entityBaseName: 'B_All_AW2',
  isFavourite: true,
  resourceId: 'b_all_aw2_shards',
  investedKnowledgePoints: 518,
  requiredKnowledgePoints: 580,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: -1,
      player: {
        player_id: 1015970,
        name: 'Bellone',
        avatar: 'portraitSeasonTriumphXxvF1',
        guild_info: {
          id: 11239,
          name: 'Handsacross the World (R)',
        },
      },
      knowledgePoints: 502,
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 850016646,
        name: 'Southpaw Sean',
        avatar: 'portraitAw4F',
        guild_info: {
          id: 30759,
          name: 'Paradigm Shift- Rec',
        },
      },
      knowledgePoints: 16,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw2_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw2_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 2,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 125403,
};
const phase: AncientWonderPhases = {
  entityBaseName: 'Wonder1',
  resourceId: 'res1',
  requiredKnowledgePoints: 1010,
  investedKnowledgePoints: 1000,
  contributions: [
    {
      rank: 1,
      player: { player_id: 2, name: 'Aleksandr', guild_info: { name: 'OtherGuild', id: 1 } },
      knowledgePoints: 997,
      reward: {
        rewards: [
          { type: 'good', subType: 'goodType', amount: 4 },
          { type: 'item', subType: 'INST_20', amount: 3 },
          { type: 'item', subType: 'INST_5', amount: 1 },
        ],
      } as ContributionReward,
    } as Contribution,
    {
      rank: 2,
      player: { player_id: 3, name: 'Kikog', guild_info: { name: 'OtherGuild2', id: 2 } },
      knowledgePoints: 3,
      reward: {
        rewards: [
          { type: 'good', subType: 'goodType', amount: 2 },
          { type: 'item', subType: 'INST_20', amount: 2 },
          { type: 'item', subType: 'INST_5', amount: 2 },
        ],
      } as ContributionReward,
    } as Contribution,
    {
      rank: 3,
      player: { player_id: -3, name: '-3' },
      knowledgePoints: 0,
      reward: {
        rewards: [
          { type: 'good', subType: 'goodType', amount: 2 },
          { type: 'item', subType: 'INST_20', amount: 1 },
          { type: 'item', subType: 'INST_5', amount: 3 },
        ],
      } as ContributionReward,
    } as Contribution,
    {
      rank: 4,
      player: { player_id: -4, name: '-4' },
      knowledgePoints: 0,
      reward: {
        rewards: [
          { type: 'good', subType: 'goodType', amount: 1 },
          { type: 'item', subType: 'INST_20', amount: 1 },
          { type: 'item', subType: 'INST_5', amount: 1 },
        ],
      } as ContributionReward,
    } as Contribution,
    {
      rank: 5,
      player: { player_id: -5, name: '-5' },
      knowledgePoints: 0,
      reward: {
        rewards: [
          { type: 'good', subType: 'goodType', amount: 1 },
          { type: 'item', subType: 'INST_5', amount: 3 },
        ],
      } as ContributionReward,
    } as Contribution,
    {
      rank: 6,
      player: { player_id: -6, name: '-6' },
      knowledgePoints: 0,
      reward: {
        rewards: [{ type: 'item', subType: 'INST_5', amount: 2 }],
      } as ContributionReward,
    } as Contribution,
    {
      rank: 7,
      player: { player_id: -7, name: '-7' },
      knowledgePoints: 0,
      reward: {
        rewards: [{ type: 'item', subType: 'INST_5', amount: 1 }],
      } as ContributionReward,
    } as Contribution,
  ],
} as AncientWonderPhases;

const phase6: AncientWonderPhases = {
  __class__: 'ResearchPhaseVO',
  playerId: 1655766,
  entityBaseName: 'B_All_AW4',
  resourceId: 'b_all_aw4_shards',
  investedKnowledgePoints: 2100,
  requiredKnowledgePoints: 2200,
  contributions: [
    {
      __class__: 'ResearchContributionVO',
      rank: 1,
      player: {
        player_id: 1758650,
        name: 'Lumelight',
        avatar: 'portraitIdRough',
        guild_info: {
          id: 32087,
          name: 'Pluto',
        },
      },
      knowledgePoints: 1242,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw4_shards',
            amount: 5,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 4,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 2,
      player: {
        player_id: 849973414,
        name: 'Diamond23',
        avatar: 'portraitIdGr8M2',
        guild_info: {
          id: 21582,
          name: 'No Retreat (Recruiting)',
        },
      },
      knowledgePoints: 421,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw4_shards',
            amount: 4,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: -1,
      player: {
        player_id: 1655766,
        name: 'Vader',
        avatar: 'portraitIdCh03M1',
        guild_info: {
          id: 3054,
          name: '▼InSpire League▼',
        },
      },
      knowledgePoints: 321,
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 3,
      player: {
        player_id: 849580776,
        name: 'Sir Frantze',
        avatar: 'portraitIdBlackguy',
        guild_info: {
          id: 29582,
          name: 'Galaxis',
        },
      },
      knowledgePoints: 60,
      reward: {
        icon: 'chestGold',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw4_shards',
            amount: 3,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 4,
      player: {
        player_id: 849143001,
        name: 'Smiki',
        avatar: 'portraitIdCh24F2',
        guild_info: {
          id: 3054,
          name: '▼InSpire League▼',
        },
      },
      knowledgePoints: 30,
      reward: {
        icon: 'chestSilver',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw4_shards',
            amount: 2,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 5,
      player: {
        player_id: 850145642,
        name: 'Lada Oribel',
        avatar: 'portraitIdGr7F2',
        guild_info: {
          id: 2973,
          name: 'Spirit Of The Phoenix',
        },
      },
      knowledgePoints: 25,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw4_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_20',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 6,
      player: {
        player_id: 850330826,
        name: 'AngusKane',
        avatar: 'portraitEvtScrollSorcerersXxviF1',
        guild_info: {
          id: 7083,
          name: 'Endeavoury Too',
        },
      },
      knowledgePoints: 1,
      reward: {
        icon: 'chestBronze',
        rewards: [
          {
            type: 'good',
            subType: 'b_all_aw4_shards',
            amount: 1,
          },
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 3,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 7,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
    {
      __class__: 'ResearchContributionVO',
      rank: 8,
      player: {
        player_id: -3,
        name: 'Reward chest is available',
      },
      reward: {
        icon: 'chestBrown',
        rewards: [
          {
            type: 'item',
            subType: 'INS_KP_AW_5',
            amount: 1,
          },
        ],
      },
    },
  ],
  receiverKpLimit: 96148,
};

describe('calculatePhase', () => {
  const sharedInfo: ExtensionSharedInfo = { sessionId: 'test-session' } as ExtensionSharedInfo;
  const ownerGuild = 'TestGuild';
  const playerName = 'TestPlayer';
  const huntersInfo: HuntersInformation = {
    contributionsRecorded: {},
    otherHunters: {},
    otherHuntersKpAmounts: {},
  };
  const pageIndex = 0;
  const playerId = 848895252;

  const testCasesTrue = [phase, phase2, phase5, phase6, phase7, phase8].map((r) => ({ case: r, expected: true }));
  const testCasesFalse = [phase1, phase3, phase4].map((r) => ({ case: r, expected: false }));
  const testCases = [...testCasesTrue, ...testCasesFalse];
  it.each(testCases)('returns true if there is a KP steal opportunity', ({ case: phase, expected }) => {
    const finder = {
      getBuilding: () => ({ name: 'Wonder1' }),
    } as unknown as BuildingFinder;
    const awDictionary = { [phase.entityBaseName]: `${phase.entityBaseName}-1` };
    const kpHuntRecord = calculatePhase(
      finder,
      phase,
      ownerGuild,
      playerName,
      huntersInfo,
      sharedInfo,
      pageIndex,
      playerId,
      awDictionary,
    );
    expect(Boolean(kpHuntRecord)).toBe(expected);
  });
});
