// 炉石传说标签枚举值
// 从C#枚举转换而来

// TAG_CLASS (199)
const TAG_CLASS = {
    0: { id: 0, name: 'INVALID', displayName: '无效' },
    1: { id: 1, name: 'DEATHKNIGHT', displayName: '死亡骑士' },
    2: { id: 2, name: 'DRUID', displayName: '德鲁伊' },
    3: { id: 3, name: 'HUNTER', displayName: '猎人' },
    4: { id: 4, name: 'MAGE', displayName: '法师' },
    5: { id: 5, name: 'PALADIN', displayName: '圣骑士' },
    6: { id: 6, name: 'PRIEST', displayName: '牧师' },
    7: { id: 7, name: 'ROGUE', displayName: '潜行者' },
    8: { id: 8, name: 'SHAMAN', displayName: '萨满祭司' },
    9: { id: 9, name: 'WARLOCK', displayName: '术士' },
    10: { id: 10, name: 'WARRIOR', displayName: '战士' },
    11: { id: 11, name: 'DREAM', displayName: '梦境' },
    12: { id: 12, name: 'NEUTRAL', displayName: '中立' },
    13: { id: 13, name: 'WHIZBANG', displayName: '砰砰博士' },
    14: { id: 14, name: 'DEMONHUNTER', displayName: '恶魔猎手' }
};

// TAG_CARDTYPE (202)
const TAG_CARDTYPE = {
    0: { id: 0, name: 'INVALID', displayName: '无效' },
    1: { id: 1, name: 'GAME', displayName: '游戏' },
    2: { id: 2, name: 'PLAYER', displayName: '玩家' },
    3: { id: 3, name: 'HERO', displayName: '英雄' },
    4: { id: 4, name: 'MINION', displayName: '随从' },
    5: { id: 5, name: 'SPELL', displayName: '法术' },
    6: { id: 6, name: 'ENCHANTMENT', displayName: '附魔' },
    7: { id: 7, name: 'WEAPON', displayName: '武器' },
    8: { id: 8, name: 'ITEM', displayName: '物品' },
    9: { id: 9, name: 'TOKEN', displayName: '衍生物' },
    10: { id: 10, name: 'HERO_POWER', displayName: '英雄技能' },
    11: { id: 11, name: 'BLANK', displayName: '空白' },
    12: { id: 12, name: 'GAME_MODE_BUTTON', displayName: '游戏模式按钮' },
    22: { id: 22, name: 'MOVE_MINION_HOVER_TARGET', displayName: '移动随从悬停目标' },
    23: { id: 23, name: 'LETTUCE_ABILITY', displayName: '佣兵技能' },
    24: { id: 24, name: 'BATTLEGROUND_HERO_BUDDY', displayName: '酒馆战棋伙伴' },
    39: { id: 39, name: 'LOCATION', displayName: '地标' },
    40: { id: 40, name: 'BATTLEGROUND_QUEST_REWARD', displayName: '酒馆战棋任务奖励' },
    42: { id: 42, name: 'BATTLEGROUND_SPELL', displayName: '酒馆战棋法术' },
    43: { id: 43, name: 'BATTLEGROUND_ANOMALY', displayName: '酒馆战棋异常' },
    44: { id: 44, name: 'BATTLEGROUND_TRINKET', displayName: '酒馆战棋饰品' },
    45: { id: 45, name: 'PET', displayName: '宠物' }
};

// TAG_RARITY (203)
const TAG_RARITY = {
    0: { id: 0, name: 'INVALID', displayName: '无效' },
    1: { id: 1, name: 'COMMON', displayName: '普通' },
    2: { id: 2, name: 'FREE', displayName: '免费' },
    3: { id: 3, name: 'RARE', displayName: '稀有' },
    4: { id: 4, name: 'EPIC', displayName: '史诗' },
    5: { id: 5, name: 'LEGENDARY', displayName: '传说' }
};

// TAG_CARD_SET (183)
const TAG_CARD_SET = {
    0: { id: 0, name: 'INVALID', displayName: '无效' },
    1: { id: 1, name: 'TEST_TEMPORARY', displayName: '测试临时' },
    2: { id: 2, name: 'BASIC', displayName: '基本' },
    3: { id: 3, name: 'EXPERT1', displayName: '经典' },
    4: { id: 4, name: 'HOF', displayName: '荣誉室' },
    5: { id: 5, name: 'MISSIONS', displayName: '任务' },
    6: { id: 6, name: 'DEMO', displayName: '演示' },
    7: { id: 7, name: 'NONE', displayName: '无' },
    8: { id: 8, name: 'CHEAT', displayName: '作弊' },
    9: { id: 9, name: 'BLANK', displayName: '空白' },
    10: { id: 10, name: 'DEBUG_SP', displayName: '调试' },
    11: { id: 11, name: 'PROMO', displayName: '促销' },
    12: { id: 12, name: 'FP1', displayName: '纳克萨玛斯' },
    13: { id: 13, name: 'PE1', displayName: '哥布林大战侏儒' },
    14: { id: 14, name: 'BRM', displayName: '黑石山' },
    15: { id: 15, name: 'TGT', displayName: '冠军试炼' },
    16: { id: 16, name: 'CREDITS', displayName: '制作人员' },
    17: { id: 17, name: 'HERO_SKINS', displayName: '英雄皮肤' },
    18: { id: 18, name: 'TB', displayName: '乱斗' },
    19: { id: 19, name: 'SLUSH', displayName: 'Slush' },
    20: { id: 20, name: 'LOE', displayName: '探险者协会' },
    21: { id: 21, name: 'OG', displayName: '上古之神的低语' },
    22: { id: 22, name: 'OG_RESERVE', displayName: '上古之神保留' },
    23: { id: 23, name: 'KARA', displayName: '卡拉赞' },
    24: { id: 24, name: 'KARA_RESERVE', displayName: '卡拉赞保留' },
    25: { id: 25, name: 'GANGS', displayName: '龙争虎斗加基森' },
    26: { id: 26, name: 'GANGS_RESERVE', displayName: '加基森保留' },
    27: { id: 27, name: 'UNGORO', displayName: '勇闯安戈洛' },
    1001: { id: 1001, name: 'ICECROWN', displayName: '冰冠堡垒' },
    1003: { id: 1003, name: 'TB_DEV', displayName: '乱斗开发' },
    1004: { id: 1004, name: 'LOOTAPALOOZA', displayName: '狗头人与地下世界' },
    1125: { id: 1125, name: 'GILNEAS', displayName: '女巫森林' },
    1127: { id: 1127, name: 'BOOMSDAY', displayName: '砰砰计划' },
    1129: { id: 1129, name: 'TROLL', displayName: '拉斯塔哈的大乱斗' },
    1130: { id: 1130, name: 'DALARAN', displayName: '暗影崛起' },
    1158: { id: 1158, name: 'ULDUM', displayName: '奥丹姆奇兵' },
    1347: { id: 1347, name: 'DRAGONS', displayName: '巨龙降临' },
    1403: { id: 1403, name: 'YEAR_OF_THE_DRAGON', displayName: '巨龙年' },
    1414: { id: 1414, name: 'BLACK_TEMPLE', displayName: '外域灰烬' },
    1439: { id: 1439, name: 'WILD_EVENT', displayName: '狂野事件' },
    1443: { id: 1443, name: 'SCHOLOMANCE', displayName: '通灵学园' },
    1453: { id: 1453, name: 'BATTLEGROUNDS', displayName: '酒馆战棋' },
    1463: { id: 1463, name: 'DEMON_HUNTER_INITIATE', displayName: '恶魔猎手新兵' },
    1466: { id: 1466, name: 'DARKMOON_FAIRE', displayName: '疯狂的暗月马戏团' },
    1525: { id: 1525, name: 'THE_BARRENS', displayName: '贫瘠之地' },
    1578: { id: 1578, name: 'STORMWIND', displayName: '暴风城' },
    1586: { id: 1586, name: 'LETTUCE', displayName: '佣兵战纪' },
    1626: { id: 1626, name: 'ALTERAC_VALLEY', displayName: '奥特兰克' },
    1635: { id: 1635, name: 'LEGACY', displayName: '遗产' },
    1637: { id: 1637, name: 'CORE', displayName: '核心' },
    1646: { id: 1646, name: 'VANILLA', displayName: '经典模式' },
    1658: { id: 1658, name: 'THE_SUNKEN_CITY', displayName: '沉没之城' },
    1691: { id: 1691, name: 'REVENDRETH', displayName: '纳斯利亚堡的悬案' },
    1705: { id: 1705, name: 'MERCENARIES_DEV', displayName: '佣兵开发' },
    1776: { id: 1776, name: 'RETURN_OF_THE_LICH_KING', displayName: '巫妖王的进军' },
    1809: { id: 1809, name: 'BATTLE_OF_THE_BANDS', displayName: '音乐节' },
    1810: { id: 1810, name: 'CORE_HIDDEN', displayName: '核心隐藏' },
    1858: { id: 1858, name: 'TITANS', displayName: '泰坦' },
    1869: { id: 1869, name: 'PATH_OF_ARTHAS', displayName: '阿尔萨斯之路' },
    1892: { id: 1892, name: 'WILD_WEST', displayName: '西部荒野' },
    1897: { id: 1897, name: 'WHIZBANGS_WORKSHOP', displayName: '砰砰实验室' },
    1898: { id: 1898, name: 'WONDERS', displayName: '奇观' },
    1904: { id: 1904, name: 'TUTORIAL', displayName: '教程' },
    1905: { id: 1905, name: 'ISLAND_VACATION', displayName: '海岛假期' },
    1935: { id: 1935, name: 'SPACE', displayName: '星际探索' },
    1941: { id: 1941, name: 'EVENT', displayName: '事件' },
    1946: { id: 1946, name: 'EMERALD_DREAM', displayName: '翡翠梦境' },
    1952: { id: 1952, name: 'THE_LOST_CITY', displayName: '失落之城' },
    1957: { id: 1957, name: 'TIME_TRAVEL', displayName: '时空旅行' },
    1961: { id: 1961, name: 'PET', displayName: '宠物' }
};

// TAG_RACE (200)
const TAG_RACE = {
    0: { id: 0, name: 'INVALID', displayName: '无效' },
    1: { id: 1, name: 'BLOODELF', displayName: '血精灵' },
    2: { id: 2, name: 'DRAENEI', displayName: '德莱尼' },
    3: { id: 3, name: 'DWARF', displayName: '矮人' },
    4: { id: 4, name: 'GNOME', displayName: '侏儒' },
    5: { id: 5, name: 'GOBLIN', displayName: '地精' },
    6: { id: 6, name: 'HUMAN', displayName: '人类' },
    7: { id: 7, name: 'NIGHTELF', displayName: '暗夜精灵' },
    8: { id: 8, name: 'ORC', displayName: '兽人' },
    9: { id: 9, name: 'TAUREN', displayName: '牛头人' },
    10: { id: 10, name: 'TROLL', displayName: '巨魔' },
    11: { id: 11, name: 'UNDEAD', displayName: '亡灵' },
    12: { id: 12, name: 'WORGEN', displayName: '狼人' },
    13: { id: 13, name: 'GOBLIN2', displayName: '地精2' },
    14: { id: 14, name: 'MURLOC', displayName: '鱼人' },
    15: { id: 15, name: 'DEMON', displayName: '恶魔' },
    16: { id: 16, name: 'SCOURGE', displayName: '天灾' },
    17: { id: 17, name: 'MECHANICAL', displayName: '机械' },
    18: { id: 18, name: 'ELEMENTAL', displayName: '元素' },
    19: { id: 19, name: 'OGRE', displayName: '食人魔' },
    20: { id: 20, name: 'PET', displayName: '宠物' },
    21: { id: 21, name: 'TOTEM', displayName: '图腾' },
    22: { id: 22, name: 'NERUBIAN', displayName: '蜘蛛' },
    23: { id: 23, name: 'PIRATE', displayName: '海盗' },
    24: { id: 24, name: 'DRAGON', displayName: '龙' },
    25: { id: 25, name: 'BLANK', displayName: '空白' },
    26: { id: 26, name: 'ALL', displayName: '全部' },
    38: { id: 38, name: 'EGG', displayName: '蛋' },
    43: { id: 43, name: 'QUILBOAR', displayName: '野猪人' },
    80: { id: 80, name: 'CENTAUR', displayName: '半人马' },
    81: { id: 81, name: 'FURBOLG', displayName: '熊怪' },
    83: { id: 83, name: 'HIGHELF', displayName: '高等精灵' },
    84: { id: 84, name: 'TREANT', displayName: '树人' },
    85: { id: 85, name: 'OWLKIN', displayName: '枭兽' },
    88: { id: 88, name: 'HALFORC', displayName: '半兽人' },
    89: { id: 89, name: 'LOCK', displayName: '锁' },
    92: { id: 92, name: 'NAGA', displayName: '纳迦' },
    93: { id: 93, name: 'OLDGOD', displayName: '上古之神' },
    94: { id: 94, name: 'PANDAREN', displayName: '熊猫人' },
    95: { id: 95, name: 'GRONN', displayName: '戈隆' },
    96: { id: 96, name: 'CELESTIAL', displayName: '天神' },
    97: { id: 97, name: 'GNOLL', displayName: '豺狼人' },
    98: { id: 98, name: 'GOLEM', displayName: '傀儡' },
    99: { id: 99, name: 'HARPY', displayName: '鹰身人' },
    100: { id: 100, name: 'VULPERA', displayName: '狐人' }
};

// TAG_SPELL_SCHOOL (1635)
const TAG_SPELL_SCHOOL = {
    0: { id: 0, name: 'NONE', displayName: '无' },
    1: { id: 1, name: 'ARCANE', displayName: '奥术' },
    2: { id: 2, name: 'FIRE', displayName: '火焰' },
    3: { id: 3, name: 'FROST', displayName: '冰霜' },
    4: { id: 4, name: 'NATURE', displayName: '自然' },
    5: { id: 5, name: 'HOLY', displayName: '神圣' },
    6: { id: 6, name: 'SHADOW', displayName: '暗影' },
    7: { id: 7, name: 'FEL', displayName: '邪能' },
    8: { id: 8, name: 'PHYSICAL_COMBAT', displayName: '物理战斗' },
    9: { id: 9, name: 'TAVERN', displayName: '酒馆' },
    10: { id: 10, name: 'SPELLCRAFT', displayName: '法术制作' },
    11: { id: 11, name: 'LESSER_TRINKET', displayName: '较小饰品' },
    12: { id: 12, name: 'GREATER_TRINKET', displayName: '较大饰品' },
    13: { id: 13, name: 'UPGRADE', displayName: '升级' }
};

// 通用获取函数
function getTagValue(tagId, value) {
    switch(tagId) {
        case 199: // CLASS
            return TAG_CLASS[value] || { id: value, name: 'UNKNOWN', displayName: `未知(${value})` };
        case 200: // RACE
            return TAG_RACE[value] || { id: value, name: 'UNKNOWN', displayName: `未知(${value})` };
        case 202: // CARDTYPE
            return TAG_CARDTYPE[value] || { id: value, name: 'UNKNOWN', displayName: `未知(${value})` };
        case 203: // RARITY
            return TAG_RARITY[value] || { id: value, name: 'UNKNOWN', displayName: `未知(${value})` };
        case 183: // CARD_SET
            return TAG_CARD_SET[value] || { id: value, name: 'UNKNOWN', displayName: `未知(${value})` };
        case 1635: // SPELL_SCHOOL
            return TAG_SPELL_SCHOOL[value] || { id: value, name: 'UNKNOWN', displayName: `未知(${value})` };
        default:
            return { id: value, name: 'UNKNOWN', displayName: `${value}` };
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.TAG_CLASS = TAG_CLASS;
    window.TAG_CARDTYPE = TAG_CARDTYPE;
    window.TAG_RARITY = TAG_RARITY;
    window.TAG_CARD_SET = TAG_CARD_SET;
    window.TAG_RACE = TAG_RACE;
    window.TAG_SPELL_SCHOOL = TAG_SPELL_SCHOOL;
    window.getTagValue = getTagValue;
}
