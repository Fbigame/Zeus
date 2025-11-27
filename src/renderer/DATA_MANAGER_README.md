# DataManager 使用指南

全局数据管理器，统一管理所有 JSON 数据的加载和缓存。

## 功能特点

- ✅ **全局单例**：所有页面共享同一个数据管理器
- ✅ **自动缓存**：同一版本的数据只加载一次
- ✅ **版本管理**：切换版本自动清除缓存
- ✅ **并发控制**：同一文件多次请求只加载一次
- ✅ **批量加载**：支持一次加载多个文件
- ✅ **预加载**：支持预加载常用文件

## 基本使用

### 1. 设置版本

```javascript
// 设置当前版本
window.dataManager.setVersion('34.0.2.231191');

// 获取当前版本
const version = window.dataManager.getVersion();
```

### 2. 加载单个文件

```javascript
// 加载 CARD.json
const cardData = await window.dataManager.loadFile('CARD');

// 使用数据
const records = cardData.Records || [];
console.log(`加载了 ${records.length} 张卡牌`);
```

### 3. 加载多个文件

```javascript
// 批量加载
const dataMap = await window.dataManager.loadFiles([
    'CARD',
    'CARD_TAG',
    'CLASS'
]);

// 使用数据
const cards = dataMap.CARD.Records;
const tags = dataMap.CARD_TAG.Records;
const classes = dataMap.CLASS.Records;
```

### 4. 预加载常用文件

```javascript
// 预加载 CARD, CARD_TAG, CLASS
await window.dataManager.preloadCommonFiles('34.0.2.231191');
```

## 高级用法

### 检查缓存

```javascript
// 检查是否已缓存
if (window.dataManager.isCached('CARD')) {
    console.log('CARD 数据已缓存');
}

// 获取缓存的数据（不加载）
const cachedData = window.dataManager.getCached('CARD');
```

### 清除缓存

```javascript
// 清除所有缓存
window.dataManager.clearCache();

// 清除特定文件的缓存
window.dataManager.clearFileCache('CARD');
```

### 查看缓存状态

```javascript
// 获取缓存统计
const stats = window.dataManager.getCacheStats();
console.log('已缓存:', stats.cachedCount, '个文件');
console.log('加载中:', stats.loadingCount, '个文件');

// 打印缓存状态
window.dataManager.printCacheStats();
```

## 在各个模块中使用

### 在 card-viewer.js 中

```javascript
async loadCards() {
    const version = this.currentVersion;
    
    // 设置版本
    window.dataManager.setVersion(version);
    
    // 加载数据（会自动缓存）
    const dataMap = await window.dataManager.loadFiles([
        'CARD',
        'CARD_TAG',
        'CARD_SET_TIMING',
        'EventMap'
    ]);
    
    this.allCards = this.processCardData(
        dataMap.CARD.Records,
        dataMap.CARD_TAG.Records,
        dataMap.CARD_SET_TIMING.Records,
        dataMap.EventMap.Records
    );
}
```

### 在 deck-template.js 中

```javascript
async loadDecks() {
    const version = document.getElementById('versionSelect').value;
    
    // 设置版本
    window.dataManager.setVersion(version);
    
    // 加载数据
    const dataMap = await window.dataManager.loadFiles([
        'DECK_TEMPLATE',
        'DECK',
        'DECK_CARD',
        'CLASS',
        'CARD',
        'CARD_TAG',
        'SIDEBOARD_CARD'
    ]);
    
    // 使用数据
    this.processDeckData(dataMap);
}
```

### 在 card-detail-modal.js 中

```javascript
async loadCardData(cardId, version) {
    // 设置版本
    window.dataManager.setVersion(version);
    
    // 加载数据（如果已缓存会立即返回）
    const [cardData, tagData] = await Promise.all([
        window.dataManager.loadFile('CARD'),
        window.dataManager.loadFile('CARD_TAG')
    ]);
    
    // 查找卡牌
    const cards = cardData.Records || [];
    const card = cards.find(c => c.m_ID === cardId);
    
    return card;
}
```

## 支持的文件列表

- `CARD` - 卡牌数据
- `CARD_TAG` - 卡牌标签数据
- `DECK_TEMPLATE` - 套牌模板数据
- `DECK` - 套牌数据
- `DECK_CARD` - 套牌卡牌数据
- `CLASS` - 职业数据
- `SIDEBOARD_CARD` - 备牌数据
- `CARD_SET_TIMING` - 卡牌集时间数据
- `EventMap` - 事件映射数据
- `DECK_RULESET` - 套牌规则集数据
- `DECK_RULESET_RULE` - 套牌规则集规则数据
- `DECK_RULESET_RULE_SUBSET` - 套牌规则集规则子集数据
- `SUBSET` - 子集数据
- `SUBSET_RULE` - 子集规则数据

## 注意事项

1. **版本切换**：切换版本时会自动清除所有缓存
2. **内存管理**：大型数据集会占用内存，如需释放请手动清除缓存
3. **并发安全**：同一文件多次并发加载会共享同一个 Promise，不会重复加载
4. **错误处理**：加载失败会抛出异常，请使用 try-catch 处理

## 迁移指南

### 旧代码

```javascript
// 旧的方式：每次都重新加载
const result = await window.fileAPI.readFile(`data/${version}/CARD.json`);
const cardData = JSON.parse(result.data);
```

### 新代码

```javascript
// 新的方式：使用 DataManager，自动缓存
window.dataManager.setVersion(version);
const cardData = await window.dataManager.loadFile('CARD');
```

## 性能优势

- **首次加载**：与原有方式相同
- **第二次加载**：直接从内存返回，速度极快
- **跨页面**：不同页面可以共享同一份数据，节省内存和加载时间
- **并发请求**：多个组件同时请求同一文件时，只加载一次

## 示例场景

### 场景1：卡牌详情弹窗

用户在套牌页面点击多张卡牌查看详情，CARD 和 CARD_TAG 数据只加载一次。

### 场景2：切换页面

用户从卡牌查询页面切换到套牌模板页面，两个页面共享 CARD、CARD_TAG、CLASS 数据。

### 场景3：版本切换

用户切换版本后，旧版本的缓存自动清除，新版本的数据重新加载。
