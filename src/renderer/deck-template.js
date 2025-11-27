// 炉石传说套牌模板系统
class DeckTemplateSystem {
    constructor() {
        this.availableVersions = [];
        this.versionData = null;
        this.dataPath = './data';
        this.allDecks = [];
        this.filteredDecks = [];
        this.currentVersion = null; // 当前加载的版本
        this.compareMode = false;
        this.oldVersionDecks = [];
        this.newVersionDecks = [];
        this.compareResults = null;
        this.cardNameMap = new Map(); // 卡牌ID到名称的映射
        this.classNames = {}; // 职业ID到名称的映射
        this.classHeroIds = {}; // 职业ID到默认英雄ID的映射
        this.sideboardMap = new Map(); // deckCardId到sideboardCardId的映射
        this.cardCostMap = new Map(); // 卡牌ID到费用的映射
        this.cardSideboardTypeMap = new Map(); // 卡牌ID到SIDEBOARD_TYPE的映射
        
        this.init();
    }
    
    async init() {
        console.log('🚀 DeckTemplateSystem 初始化开始');
        this.setupEventListeners();
        await this.detectVersions();
        console.log('✅ DeckTemplateSystem 初始化完成');
    }
    
    setupEventListeners() {
        // 返回首页
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 版本选择
        document.getElementById('versionSelect').addEventListener('change', () => this.onVersionSelect());
        document.getElementById('loadDecksBtn').addEventListener('click', () => this.loadDecks());
        document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.detectVersions());
        
        // 模式切换
        document.getElementById('singleModeBtn').addEventListener('click', () => this.switchMode('single'));
        document.getElementById('compareModeBtn').addEventListener('click', () => this.switchMode('compare'));
        
        // 对比模式版本选择
        document.getElementById('oldVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('newVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('compareDecksBtn').addEventListener('click', () => this.compareDecks());
        
        // 套牌操作
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelect());
        document.getElementById('exportDecksBtn').addEventListener('click', () => this.exportDecks());
        
        // 筛选和搜索
        document.getElementById('classFilter').addEventListener('change', () => this.filterDecks());
        document.getElementById('searchInput').addEventListener('input', () => this.filterDecks());
        document.getElementById('formatFilter').addEventListener('change', () => this.filterDecks());
        
        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('deckModal').addEventListener('click', (e) => {
            if (e.target.id === 'deckModal') this.closeModal();
        });
    }
    
    // Varint 编码
    encodeVarint(value) {
        const bytes = [];
        while (value > 0) {
            let byte = value & 0x7F;
            value >>>= 7;
            if (value > 0) {
                byte |= 0x80;
            }
            bytes.push(byte);
        }
        return bytes.length > 0 ? bytes : [0];
    }
    
    // 生成套牌代码
    generateDeckCode(deck, format = 2) {
        try {
            const bytes = [];
            
            // 保留字节
            bytes.push(0);
            
            // 版本号
            bytes.push(1);
            
            // 格式 (2=标准, 1=狂野)
            bytes.push(format);
            
            // 英雄数量和ID
            bytes.push(1); // 1个英雄
            const heroId = this.classHeroIds[deck.classId] || 0;
            bytes.push(...this.encodeVarint(heroId));
            
            // 按数量分组卡牌
            const cardGroups = { 1: [], 2: [], n: [] };
            deck.cards.forEach(card => {
                const count = card.count || 1;
                if (count === 1) {
                    cardGroups[1].push(card.cardId);
                } else if (count === 2) {
                    cardGroups[2].push(card.cardId);
                } else {
                    cardGroups.n.push({ id: card.cardId, count: count });
                }
            });
            
            // 单张卡牌
            bytes.push(...this.encodeVarint(cardGroups[1].length));
            cardGroups[1].sort((a, b) => a - b).forEach(cardId => {
                bytes.push(...this.encodeVarint(cardId));
            });
            
            // 双张卡牌
            bytes.push(...this.encodeVarint(cardGroups[2].length));
            cardGroups[2].sort((a, b) => a - b).forEach(cardId => {
                bytes.push(...this.encodeVarint(cardId));
            });
            
            // N张卡牌
            bytes.push(...this.encodeVarint(cardGroups.n.length));
            cardGroups.n.sort((a, b) => a.id - b.id).forEach(card => {
                bytes.push(...this.encodeVarint(card.id));
                bytes.push(...this.encodeVarint(card.count));
            });
            
            // 收集备牌信息：需要知道每个备牌对应的主卡
            const sideboardData = [];
            deck.cards.forEach(card => {
                if (card.deckCardIds && card.deckCardIds.length > 0) {
                    card.deckCardIds.forEach(deckCardId => {
                        const sideboardCardIds = this.sideboardMap.get(deckCardId);
                        if (sideboardCardIds && Array.isArray(sideboardCardIds)) {
                            sideboardCardIds.forEach(sideboardCardId => {
                                sideboardData.push({
                                    sideboardCardId: sideboardCardId,
                                    linkCardId: card.cardId  // 关联到主卡
                                });
                            });
                        }
                    });
                }
            });
            
            if (sideboardData.length > 0) {
                // 有备牌
                bytes.push(...this.encodeVarint(1));
                
                // 按备牌ID分组计数
                const sideboardCounts = new Map();
                sideboardData.forEach(item => {
                    const key = `${item.sideboardCardId}_${item.linkCardId}`;
                    if (!sideboardCounts.has(key)) {
                        sideboardCounts.set(key, {
                            sideboardCardId: item.sideboardCardId,
                            linkCardId: item.linkCardId,
                            count: 0
                        });
                    }
                    sideboardCounts.get(key).count++;
                });
                
                // 按数量分组备牌
                const sideboardGroups = { 1: [], 2: [], n: [] };
                sideboardCounts.forEach((item) => {
                    if (item.count === 1) {
                        sideboardGroups[1].push(item);
                    } else if (item.count === 2) {
                        sideboardGroups[2].push(item);
                    } else {
                        sideboardGroups.n.push(item);
                    }
                });
                
                // 单张备牌
                bytes.push(...this.encodeVarint(sideboardGroups[1].length));
                sideboardGroups[1].sort((a, b) => a.sideboardCardId - b.sideboardCardId).forEach(item => {
                    bytes.push(...this.encodeVarint(item.sideboardCardId));  // 备牌ID
                    bytes.push(...this.encodeVarint(item.linkCardId));       // 关联主卡ID
                });
                
                // 双张备牌
                bytes.push(...this.encodeVarint(sideboardGroups[2].length));
                sideboardGroups[2].sort((a, b) => a.sideboardCardId - b.sideboardCardId).forEach(item => {
                    bytes.push(...this.encodeVarint(item.sideboardCardId));
                    bytes.push(...this.encodeVarint(item.linkCardId));
                });
                
                // N张备牌
                bytes.push(...this.encodeVarint(sideboardGroups.n.length));
                sideboardGroups.n.sort((a, b) => a.sideboardCardId - b.sideboardCardId).forEach(item => {
                    bytes.push(...this.encodeVarint(item.count));           // 数量
                    bytes.push(...this.encodeVarint(item.sideboardCardId));
                    bytes.push(...this.encodeVarint(item.linkCardId));
                });
            } else {
                // 没有备牌
                bytes.push(...this.encodeVarint(0));
            }
            
            // 转换为 Uint8Array 并进行 Base64 编码
            const uint8Array = new Uint8Array(bytes);
            const base64 = btoa(String.fromCharCode.apply(null, uint8Array));
            
            return base64;
        } catch (error) {
            console.error('生成套牌代码失败:', error);
            return null;
        }
    }
    
    async init() {
        console.log('🚀 DeckTemplateSystem 初始化开始');
        this.setupEventListeners();
        console.log('📝 事件监听器设置完成');
        await this.detectVersions();
        console.log('✅ DeckTemplateSystem 初始化完成');
    }
    
    // 模式切换
    switchMode(mode) {
        this.compareMode = (mode === 'compare');
        
        // 更新按钮状态
        document.getElementById('singleModeBtn').classList.toggle('active', !this.compareMode);
        document.getElementById('compareModeBtn').classList.toggle('active', this.compareMode);
        
        if (this.compareMode) {
            // 对比模式
            document.getElementById('singleVersionSection').style.display = 'none';
            document.getElementById('compareVersionSection').style.display = 'flex';
            document.getElementById('loadDecksBtn').style.display = 'none';
            document.getElementById('compareDecksBtn').style.display = 'inline-block';
            document.getElementById('deckListSection').style.display = 'none';
            document.getElementById('deckCompareView').style.display = 'none';
            
            // 填充版本选择器
            this.populateVersionSelector(document.getElementById('oldVersionSelect'));
            this.populateVersionSelector(document.getElementById('newVersionSelect'));
            
            // 自动选择最新的两个版本
            if (this.availableVersions.length >= 2) {
                document.getElementById('newVersionSelect').value = this.availableVersions[0]; // 最新版本
                document.getElementById('oldVersionSelect').value = this.availableVersions[1]; // 次新版本
                this.onCompareVersionSelect();
            }
        } else {
            // 单版本模式
            document.getElementById('singleVersionSection').style.display = 'flex';
            document.getElementById('compareVersionSection').style.display = 'none';
            document.getElementById('loadDecksBtn').style.display = 'inline-block';
            document.getElementById('compareDecksBtn').style.display = 'none';
            document.getElementById('deckListSection').style.display = this.allDecks.length > 0 ? 'block' : 'none';
            document.getElementById('deckCompareView').style.display = 'none';
        }
    }
    
    // 对比模式版本选择
    onCompareVersionSelect() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        const compareBtn = document.getElementById('compareDecksBtn');
        const oldVersionInfo = document.getElementById('oldVersionInfo');
        const newVersionInfo = document.getElementById('newVersionInfo');
        
        // 更新版本信息显示
        if (oldVersion) {
            oldVersionInfo.innerHTML = '<span style="color: #27ae60;">✓ 旧版本已选择</span>';
        } else {
            oldVersionInfo.innerHTML = '';
        }
        
        if (newVersion) {
            newVersionInfo.innerHTML = '<span style="color: #27ae60;">✓ 新版本已选择</span>';
        } else {
            newVersionInfo.innerHTML = '';
        }
        
        // 两个版本都选择且不同时才能对比
        if (oldVersion && newVersion && oldVersion !== newVersion) {
            compareBtn.disabled = false;
            oldVersionInfo.innerHTML = '<span style="color: #27ae60;">✓ 已就绪</span>';
            newVersionInfo.innerHTML = '<span style="color: #27ae60;">✓ 已就绪</span>';
        } else {
            compareBtn.disabled = true;
            if (oldVersion && newVersion && oldVersion === newVersion) {
                oldVersionInfo.innerHTML = '<span style="color: #e74c3c;">⚠ 请选择不同的版本</span>';
                newVersionInfo.innerHTML = '<span style="color: #e74c3c;">⚠ 请选择不同的版本</span>';
            }
        }
    }
    
    // 对比套牌
    async compareDecks() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        if (!oldVersion || !newVersion || oldVersion === newVersion) {
            alert('请选择两个不同的版本进行对比');
            return;
        }
        
        console.log(`🔍 开始对比套牌: ${oldVersion} vs ${newVersion}`);
        
        try {
            // 加载两个版本的套牌
            const oldDecks = await this.loadVersionDecks(oldVersion);
            const newDecks = await this.loadVersionDecks(newVersion);
            
            if (!oldDecks || !newDecks) {
                alert('加载套牌数据失败');
                return;
            }
            
            this.oldVersionDecks = oldDecks;
            this.newVersionDecks = newDecks;
            
            // 执行对比
            this.compareResults = this.performComparison(oldDecks, newDecks);
            
            console.log('📊 对比结果:', this.compareResults);
            
            // 显示对比结果
            this.displayCompareResults();
            
            // 隐藏版本选择区域，显示对比结果
            document.querySelector('.version-selection-section').style.display = 'none';
            document.getElementById('deckListSection').style.display = 'block';
            
        } catch (error) {
            console.error('❌ 对比套牌失败:', error);
            alert('对比失败: ' + error.message);
        }
    }
    
    // 加载指定版本的套牌
    async loadVersionDecks(version) {
        console.log(`📂 加载版本 ${version} 的套牌数据`);
        
        try {
            await window.dataManager.setVersion(version);
            const data = await window.dataManager.loadFile('DECK_TEMPLATE');
            
            if (data && data.Records) {
                console.log(`✅ 版本 ${version} 套牌数据加载成功:`, data.Records.length, '个套牌');
                return data.Records;
            } else {
                console.error(`❌ 版本 ${version} 套牌数据格式错误:`, data);
                return null;
            }
        } catch (error) {
            console.error(`❌ 加载版本 ${version} 失败:`, error);
            return null;
        }
    }
    
    // 执行对比
    performComparison(oldDecks, newDecks) {
        const added = [];
        const removed = [];
        const modified = [];
        
        // 创建ID映射
        const oldMap = new Map(oldDecks.map(d => [d.m_id, d]));
        const newMap = new Map(newDecks.map(d => [d.m_id, d]));
        
        // 查找新增和修改的套牌
        for (const newDeck of newDecks) {
            const oldDeck = oldMap.get(newDeck.m_id);
            if (!oldDeck) {
                added.push(newDeck);
            } else {
                const changes = this.getDeckChanges(oldDeck, newDeck);
                if (changes.length > 0) {
                    modified.push({
                        deck: newDeck,
                        changes: changes
                    });
                }
            }
        }
        
        // 查找移除的套牌
        for (const oldDeck of oldDecks) {
            if (!newMap.has(oldDeck.m_id)) {
                removed.push(oldDeck);
            }
        }
        
        return { added, removed, modified };
    }
    
    // 获取套牌变化
    getDeckChanges(oldDeck, newDeck) {
        const changes = [];
        
        // 比较基本字段
        const fieldsToCompare = [
            { key: 'm_name', label: '套牌名称' },
            { key: 'm_deckType', label: '套牌类型', format: v => v === 1 ? '标准' : v === 2 ? '狂野' : v === 3 ? '经典' : v === 4 ? '扭曲' : `类型${v}` },
            { key: 'm_heroDbfId', label: '英雄ID' },
            { key: 'm_heroPowerDbfId', label: '英雄技能ID' },
            { key: 'm_classId', label: '职业', format: v => this.classNames[v] || `职业${v}` },
            { key: 'm_sortOrder', label: '排序' }
        ];
        
        for (const field of fieldsToCompare) {
            if (oldDeck[field.key] !== newDeck[field.key]) {
                const oldValue = field.format ? field.format(oldDeck[field.key]) : oldDeck[field.key];
                const newValue = field.format ? field.format(newDeck[field.key]) : newDeck[field.key];
                changes.push({
                    field: field.label,
                    old: oldValue,
                    new: newValue
                });
            }
        }
        
        // 比较卡牌列表
        const oldCards = oldDeck.m_cardDbfIds || [];
        const newCards = newDeck.m_cardDbfIds || [];
        if (JSON.stringify(oldCards) !== JSON.stringify(newCards)) {
            changes.push({
                field: '卡牌列表',
                old: `${oldCards.length}张卡牌`,
                new: `${newCards.length}张卡牌`,
                detail: this.getCardListDiff(oldCards, newCards)
            });
        }
        
        // 比较备牌
        const oldSideboard = oldDeck.m_sideboardCards || [];
        const newSideboard = newDeck.m_sideboardCards || [];
        if (JSON.stringify(oldSideboard) !== JSON.stringify(newSideboard)) {
            changes.push({
                field: '备牌',
                old: `${oldSideboard.length}张备牌`,
                new: `${newSideboard.length}张备牌`
            });
        }
        
        return changes;
    }
    
    // 获取卡牌列表差异
    getCardListDiff(oldCards, newCards) {
        const oldCounts = {};
        const newCounts = {};
        
        oldCards.forEach(id => oldCounts[id] = (oldCounts[id] || 0) + 1);
        newCards.forEach(id => newCounts[id] = (newCounts[id] || 0) + 1);
        
        const allCardIds = new Set([...oldCards, ...newCards]);
        const diff = [];
        
        for (const cardId of allCardIds) {
            const oldCount = oldCounts[cardId] || 0;
            const newCount = newCounts[cardId] || 0;
            if (oldCount !== newCount) {
                const cardName = this.cardNameMap[cardId] || `卡牌${cardId}`;
                diff.push(`${cardName}: ${oldCount} → ${newCount}`);
            }
        }
        
        return diff.join(', ');
    }
    
    // 显示对比结果
    displayCompareResults() {
        const container = document.getElementById('deckCompareView');
        const { added, removed, modified } = this.compareResults;
        
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        let html = `
            <div class="compare-summary">
                <h3>对比结果: ${oldVersion} → ${newVersion}</h3>
                <div class="compare-stats">
                    <span class="stat-item added">新增: ${added.length}</span>
                    <span class="stat-item removed">移除: ${removed.length}</span>
                    <span class="stat-item modified">修改: ${modified.length}</span>
                </div>
            </div>
            
            <div class="compare-tabs">
                <button class="compare-tab active" data-tab="added">新增 (${added.length})</button>
                <button class="compare-tab" data-tab="removed">移除 (${removed.length})</button>
                <button class="compare-tab" data-tab="modified">修改 (${modified.length})</button>
            </div>
            
            <div class="compare-content">
                <div class="compare-tab-content active" id="addedContent">
                    ${this.renderDeckList(added, 'added')}
                </div>
                <div class="compare-tab-content" id="removedContent">
                    ${this.renderDeckList(removed, 'removed')}
                </div>
                <div class="compare-tab-content" id="modifiedContent">
                    ${this.renderModifiedDecks(modified)}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // 添加标签切换事件
        container.querySelectorAll('.compare-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                container.querySelectorAll('.compare-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.compare-tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                container.querySelector(`#${targetTab}Content`).classList.add('active');
            });
        });
        
        // 为对比卡片添加点击事件
        container.querySelectorAll('.compare-deck-card').forEach(card => {
            const deckIdStr = card.dataset.deckId;
            const deckVersion = card.dataset.deckVersion;
            
            // 只有有效的ID才添加点击事件
            if (deckIdStr && deckVersion) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => {
                    const deckId = parseInt(deckIdStr);
                    console.log('🖱️ 点击套牌卡片:', { deckId, deckVersion });
                    
                    // 根据版本查找对应的套牌数据
                    let deck = null;
                    if (deckVersion === 'old') {
                        deck = this.oldVersionDecks.find(d => d.m_id === deckId);
                        console.log('📂 从旧版本查找:', deck ? '找到' : '未找到', this.oldVersionDecks.length, '个套牌');
                    } else if (deckVersion === 'new') {
                        deck = this.newVersionDecks.find(d => d.m_id === deckId);
                        console.log('📂 从新版本查找:', deck ? '找到' : '未找到', this.newVersionDecks.length, '个套牌');
                    }
                    if (deck) {
                        console.log('✅ 显示套牌详情:', deck);
                        this.showDeckDetails(deck);
                    } else {
                        console.error('❌ 未找到套牌:', deckId);
                    }
                });
            }
        });
    }
    
    // 渲染套牌列表
    renderDeckList(decks, type) {
        if (decks.length === 0) {
            return '<div class="empty-state">无数据</div>';
        }
        
        // 确定版本来源：added/modified使用新版本，removed使用旧版本
        const deckVersion = type === 'removed' ? 'old' : 'new';
        
        return decks.map(deck => {
            const deckId = deck.m_id; // 保持原始ID用于查找
            const displayId = deckId !== undefined && deckId !== null ? deckId : '未知';
            const deckName = deck.m_name || '未命名套牌';
            const className = deck.m_classId !== undefined && deck.m_classId !== null 
                ? (this.classNames[deck.m_classId] || `职业${deck.m_classId}`) 
                : '未知职业';
            const deckType = deck.m_deckType === 1 ? '标准' : 
                           deck.m_deckType === 2 ? '狂野' : 
                           deck.m_deckType === 3 ? '经典' : 
                           deck.m_deckType === 4 ? '扭曲' : 
                           deck.m_deckType !== undefined && deck.m_deckType !== null ? `类型${deck.m_deckType}` : '未知类型';
            const cardCount = (deck.m_cardDbfIds || []).length;
            const sideboardCount = (deck.m_sideboardCards || []).length;
            
            // 只有有效ID才添加data属性
            const dataAttrs = deckId !== undefined && deckId !== null ? `data-deck-id="${deckId}" data-deck-version="${deckVersion}"` : '';
            
            return `
                <div class="compare-deck-card ${type}" ${dataAttrs}>
                    <div class="deck-header">
                        <span class="deck-id">#${displayId}</span>
                        <span class="deck-name">${deckName}</span>
                    </div>
                    <div class="deck-info">
                        <span>职业: ${className}</span>
                        <span>类型: ${deckType}</span>
                        <span>卡牌: ${cardCount}张</span>
                        ${sideboardCount > 0 ? `<span>备牌: ${sideboardCount}张</span>` : ''}
                    </div>
                    <div class="deck-actions" style="margin-top: 10px; text-align: right;">
                        <span style="color: #3498db; font-size: 12px;">👁️ 点击查看详情</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 渲染修改的套牌
    renderModifiedDecks(modified) {
        if (modified.length === 0) {
            return '<div class="empty-state">无数据</div>';
        }
        
        return modified.map(item => {
            const deck = item.deck;
            const deckId = deck.m_id; // 保持原始ID用于查找
            const displayId = deckId !== undefined && deckId !== null ? deckId : '未知';
            const deckName = deck.m_name || '未命名套牌';
            const className = deck.m_classId !== undefined && deck.m_classId !== null 
                ? (this.classNames[deck.m_classId] || `职业${deck.m_classId}`) 
                : '未知职业';
            const deckType = deck.m_deckType === 1 ? '标准' : 
                           deck.m_deckType === 2 ? '狂野' : 
                           deck.m_deckType === 3 ? '经典' : 
                           deck.m_deckType === 4 ? '扭曲' : 
                           deck.m_deckType !== undefined && deck.m_deckType !== null ? `类型${deck.m_deckType}` : '未知类型';
            
            // 只有有效ID才添加data属性
            const dataAttrs = deckId !== undefined && deckId !== null ? `data-deck-id="${deckId}" data-deck-version="new"` : '';
            
            const changesHtml = item.changes.map(change => {
                let detailHtml = '';
                if (change.detail) {
                    detailHtml = `<div class="change-detail">${change.detail}</div>`;
                }
                return `
                    <div class="compare-change-item">
                        <strong>${change.field}:</strong> 
                        <span class="old-value">${change.old !== undefined && change.old !== null ? change.old : '无'}</span> 
                        → 
                        <span class="new-value">${change.new !== undefined && change.new !== null ? change.new : '无'}</span>
                        ${detailHtml}
                    </div>
                `;
            }).join('');
            
            return `
                <div class="compare-deck-card modified" ${dataAttrs}>
                    <div class="deck-header">
                        <span class="deck-id">#${displayId}</span>
                        <span class="deck-name">${deckName}</span>
                    </div>
                    <div class="deck-info">
                        <span>职业: ${className}</span>
                        <span>类型: ${deckType}</span>
                    </div>
                    <div class="compare-changes">
                        <div class="changes-header">变更详情:</div>
                        ${changesHtml}
                    </div>
                    <div class="deck-actions" style="margin-top: 10px; text-align: right;">
                        <span style="color: #3498db; font-size: 12px;">👁️ 点击查看详情</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 检测版本文件夹
    async detectVersions() {
        console.log('🔍 开始检测版本');
        
        try {
            document.getElementById('detectionStatus').textContent = '正在检测版本文件夹...';
            
            if (window.fileAPI) {
                // 获取默认数据路径
                let scanPath = './data';
                try {
                    const defaultPathResult = await window.fileAPI.getDefaultDataPath();
                    if (defaultPathResult.success) {
                        scanPath = defaultPathResult.path;
                        this.dataPath = scanPath;
                        console.log('📍 使用默认数据路径:', scanPath);
                        document.getElementById('dataPathInfo').textContent = `📍 数据路径: ${scanPath}`;
                    } else {
                        document.getElementById('dataPathInfo').textContent = `📍 数据路径: ${scanPath} (相对路径)`;
                    }
                } catch (error) {
                    console.warn('⚠️ 获取默认路径失败，使用相对路径:', error);
                }
                
                // 扫描目录
                const result = await window.fileAPI.scanDirectories(scanPath);
                console.log('📊 扫描结果:', result);
                
                if (result.success) {
                    this.availableVersions = result.directories.filter(dir => 
                        /^\d+(\.\d+)*$/.test(dir)
                    ).sort((a, b) => this.compareVersions(b, a));
                    console.log('✅ 筛选后的版本列表:', this.availableVersions);
                } else {
                    throw new Error(result.error);
                }
            } else {
                console.warn('⚠️ 使用降级方案：预设版本');
                this.availableVersions = ['34.0.2.231191', '34.0.0.229984', '33.4.2.228373'];
            }
            
            if (this.availableVersions.length > 0) {
                this.populateVersionSelector();
                this.autoSelectLatestVersion();
                this.showVersionSelector();
            } else {
                throw new Error('未找到有效的版本文件夹');
            }
            
        } catch (error) {
            console.error('版本检测失败:', error);
            document.getElementById('detectionStatus').textContent = '版本检测失败: ' + error.message;
        }
    }
    
    // 版本号比较
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            
            if (aPart !== bPart) {
                return aPart - bPart;
            }
        }
        return 0;
    }
    
    // 填充版本选择器
    populateVersionSelector(selectElement = null) {
        const selects = selectElement ? [selectElement] : [document.getElementById('versionSelect')];
        
        selects.forEach(select => {
            if (!select) return;
            
            select.innerHTML = '<option value="">请选择版本</option>';
            
            this.availableVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = `版本 ${version}`;
                select.appendChild(option);
            });
        });
    }
    
    // 自动选择最新版本
    autoSelectLatestVersion() {
        if (this.availableVersions.length > 0) {
            document.getElementById('versionSelect').value = this.availableVersions[0];
            this.onVersionSelect();
        }
    }
    
    // 显示版本选择器
    showVersionSelector() {
        document.getElementById('versionDetection').style.display = 'none';
        document.getElementById('versionSelector').style.display = 'block';
    }
    
    // 版本选择事件
    async onVersionSelect() {
        const version = document.getElementById('versionSelect').value;
        const loadBtn = document.getElementById('loadDecksBtn');
        
        loadBtn.disabled = true;
        
        if (!version) {
            document.getElementById('versionInfo').innerHTML = '';
            return;
        }
        
        const isValid = await this.checkVersionFiles(version);
        loadBtn.disabled = !isValid;
    }
    
    // 检查版本文件
    async checkVersionFiles(version) {
        try {
            // 设置 DataManager 版本
            window.dataManager.setVersion(version);
            
            // 尝试加载必要文件来验证
            const missingFiles = [];
            
            try {
                await window.dataManager.loadFile('DECK_TEMPLATE', version);
            } catch (error) {
                missingFiles.push('DECK_TEMPLATE.json');
            }
            
            try {
                await window.dataManager.loadFile('DECK', version);
            } catch (error) {
                missingFiles.push('DECK.json');
            }
            
            try {
                await window.dataManager.loadFile('DECK_CARD', version);
            } catch (error) {
                missingFiles.push('DECK_CARD.json');
            }
            
            const isValid = missingFiles.length === 0;
            
            let status = '';
            let statusClass = '';
            
            if (isValid) {
                status = '✅ 准备就绪';
                statusClass = 'status-ready';
            } else {
                status = `❌ 缺少文件: ${missingFiles.join(', ')}`;
                statusClass = 'status-error';
            }
            
            document.getElementById('versionInfo').innerHTML = `
                <div><strong>版本号:</strong> ${version}</div>
                <div><strong>路径:</strong> data/${version}/</div>
                <div><strong>状态:</strong> <span class="${statusClass}">${status}</span></div>
            `;
            
            return isValid;
        } catch (error) {
            document.getElementById('versionInfo').innerHTML = `
                <div><strong>版本号:</strong> ${version}</div>
                <div><strong>状态:</strong> <span class="status-error">❌ 检测失败: ${error.message}</span></div>
            `;
            return false;
        }
    }
    
    // 加载套牌
    async loadDecks() {
        const version = document.getElementById('versionSelect').value;
        
        console.log('🚀 开始加载套牌:', version);
        
        // 保存当前版本
        this.currentVersion = version;
        
        // 设置 DataManager 版本
        window.dataManager.setVersion(version);
        
        try {
            this.showProgressSection();
            
            this.updateProgress(10, '正在加载套牌模板...');
            const templates = await this.loadDeckTemplates(version);
            console.log('✅ 套牌模板加载完成:', templates.length);
            
            this.updateProgress(40, '正在加载套牌信息...');
            const decks = await this.loadDeckInfo(version);
            console.log('✅ 套牌信息加载完成:', decks.length);
            
            this.updateProgress(70, '正在加载卡牌信息...');
            const cards = await this.loadDeckCards(version);
            console.log('✅ 卡牌信息加载完成:', cards.length);
            
            this.updateProgress(75, '正在加载职业信息...');
            await this.loadClassInfo(version);
            console.log('✅ 职业信息加载完成');
            
            this.updateProgress(85, '正在加载卡牌名称...');
            await this.loadCardNames(version);
            console.log('✅ 卡牌名称加载完成');
            
            this.updateProgress(88, '正在加载卡牌标签...');
            await this.loadCardTags(version);
            console.log('✅ 卡牌标签加载完成');
            
            this.updateProgress(90, '正在加载备牌信息...');
            await this.loadSideboardCards(version);
            console.log('✅ 备牌信息加载完成');
            
            this.updateProgress(95, '正在关联数据...');
            this.allDecks = this.associateData(templates, decks, cards);
            console.log('✅ 数据关联完成:', this.allDecks.length);
            
            this.updateProgress(100, '加载完成！');
            
            this.showDeckList();
            
        } catch (error) {
            console.error('❌ 加载套牌失败:', error);
            alert('加载套牌失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载套牌模板
    async loadDeckTemplates(version) {
        const data = await window.dataManager.loadFile('DECK_TEMPLATE', version);
        if (!data) {
            throw new Error('无法读取 DECK_TEMPLATE.json');
        }
        return data.Records || [];
    }
    
    // 加载套牌信息
    async loadDeckInfo(version) {
        const data = await window.dataManager.loadFile('DECK', version);
        if (!data) {
            throw new Error('无法读取 DECK.json');
        }
        return data.Records || [];
    }
    
    // 加载卡牌信息
    async loadDeckCards(version) {
        const data = await window.dataManager.loadFile('DECK_CARD', version);
        if (!data) {
            throw new Error('无法读取 DECK_CARD.json');
        }
        return data.Records || [];
    }
    
    // 加载职业信息
    async loadClassInfo(version) {
        let data = null;
        
        try {
            data = await window.dataManager.loadFile('CLASS', version);
        } catch (error) {
            console.warn('无法读取 CLASS.json，使用默认职业信息');
        }
        
        if (!data) {
            // 使用默认值
            this.classNames = {
                1: '死亡骑士', 2: '德鲁伊', 3: '猎人', 4: '法师',
                5: '圣骑士', 6: '牧师', 7: '潜行者', 8: '萨满祭司',
                9: '术士', 10: '战士', 14: '恶魔猎手', 12: '中立'
            };
            this.classHeroIds = {
                1: 78065, 2: 274, 3: 31, 4: 637, 5: 671, 6: 813,
                7: 930, 8: 1066, 9: 893, 10: 7, 14: 56550, 12: 0
            };
            return;
        }
        const classes = data.Records || [];
        
        // 创建职业映射
        this.classNames = {};
        this.classHeroIds = {};
        
        classes.forEach(cls => {
            const classId = cls.m_ID;
            const className = cls.m_name ? this.extractLocalizedText(cls.m_name) : `职业${classId}`;
            const heroId = cls.m_defaultHeroCardId || 0;
            
            this.classNames[classId] = className;
            this.classHeroIds[classId] = heroId;
        });
        
        console.log(`✅ 已加载 ${Object.keys(this.classNames).length} 个职业信息`);
    }
    
    // 加载卡牌名称
    async loadCardNames(version) {
        let data = null;
        
        try {
            data = await window.dataManager.loadFile('CARD', version);
        } catch (error) {
            console.warn('无法读取 CARD.json，卡牌名称将不可用');
            return;
        }
        const cards = data.Records || [];
        
        // 创建卡牌ID到名称的映射
        this.cardNameMap.clear();
        cards.forEach(card => {
            const cardId = card.m_ID || card.ID;
            const cardName = card.m_name ? this.extractLocalizedText(card.m_name) : '';
            
            if (cardId && cardName) {
                this.cardNameMap.set(cardId, cardName);
            }
        });
        
        console.log(`✅ 已加载 ${this.cardNameMap.size} 张卡牌的名称`);
    }
    
    // 加载卡牌标签（费用等信息）
    async loadCardTags(version) {
        let data = null;
        
        try {
            data = await window.dataManager.loadFile('CARD_TAG', version);
        } catch (error) {
            console.warn('无法读取 CARD_TAG.json，卡牌费用将不可用');
            return;
        }
        const tags = data.Records || [];
        
        // 创建卡牌ID到费用和SIDEBOARD_TYPE的映射
        this.cardCostMap.clear();
        this.cardSideboardTypeMap.clear();
        tags.forEach(tag => {
            const cardId = tag.m_cardId || tag.cardId;
            const tagId = tag.m_tagId || tag.tagId;
            const tagValue = tag.m_tagValue || tag.tagValue;
            
            if (cardId && tagId === 48) {  // 48 是费用标签
                this.cardCostMap.set(cardId, tagValue || 0);
            } else if (cardId && tagId === 3427) {  // 3427 是 SIDEBOARD_TYPE
                this.cardSideboardTypeMap.set(cardId, tagValue || 0);
            }
        });
        
        console.log(`✅ 已加载 ${this.cardCostMap.size} 张卡牌的费用信息`);
    }
    
    // 获取卡牌名称
    getCardName(cardId) {
        return this.cardNameMap.get(cardId) || '';
    }
    
    // 获取卡牌费用（如果是SIDEBOARD_TYPE=2的卡，计算备牌费用之和）
    getCardCost(cardId, sideboardCardIds = null) {
        const baseCost = this.cardCostMap.get(cardId) || 0;
        
        // 检查是否有SIDEBOARD_TYPE=2
        const sideboardType = this.cardSideboardTypeMap.get(cardId);
        if (sideboardType === 2 && sideboardCardIds && sideboardCardIds.length > 0) {
            // 计算所有备牌的费用之和
            let totalSideboardCost = 0;
            sideboardCardIds.forEach(sideboardCardId => {
                totalSideboardCost += this.cardCostMap.get(sideboardCardId) || 0;
            });
            return totalSideboardCost;
        }
        
        return baseCost;
    }
    
    // 加载备牌信息
    async loadSideboardCards(version) {
        let data = null;
        
        try {
            data = await window.dataManager.loadFile('SIDEBOARD_CARD', version);
        } catch (error) {
            console.warn('无法读取 SIDEBOARD_CARD.json，备牌信息将不可用');
            return;
        }
        const sideboardCards = data.Records || [];
        
        // 创建 deckCardId 到 sideboardCardId数组 的映射（一个卡可能有多个备牌）
        this.sideboardMap.clear();
        sideboardCards.forEach(sideboard => {
            const deckCardId = sideboard.m_deckCardId;
            const sideboardCardId = sideboard.m_sideboardCardId;
            if (deckCardId && sideboardCardId) {
                if (!this.sideboardMap.has(deckCardId)) {
                    this.sideboardMap.set(deckCardId, []);
                }
                this.sideboardMap.get(deckCardId).push(sideboardCardId);
            }
        });
        
        console.log(`✅ 已加载 ${this.sideboardMap.size} 条备牌映射`);
    }
    
    // 关联数据
    associateData(templates, decks, cards) {
        console.log('🔗 开始关联数据...');
        
        // 创建映射
        const deckMap = new Map();
        decks.forEach(deck => {
            deckMap.set(deck.m_ID, {
                id: deck.m_ID,
                name: deck.m_name ? this.extractLocalizedText(deck.m_name) : `套牌 ${deck.m_ID}`,
                classId: deck.m_classId || 0,
                className: this.classNames[deck.m_classId] || '未知',
                deckType: deck.m_deckType || 0,
                sortOrder: deck.m_sortOrder || 0,
                cards: []
            });
        });
        
        // 关联卡牌并合并相同卡牌的数量
        cards.forEach(card => {
            const deckId = card.m_deckId;
            if (deckMap.has(deckId)) {
                const deck = deckMap.get(deckId);
                const cardId = card.m_cardId;
                const count = card.m_count || 1;
                const deckCardId = card.m_ID; // 保存 DECK_CARD 的 m_ID 用于查找备牌
                
                // 查找是否已存在该卡牌
                const existingCard = deck.cards.find(c => c.cardId === cardId);
                if (existingCard) {
                    // 如果存在，累加数量
                    existingCard.count += count;
                    // 如果之前没有 deckCardId，添加一个数组
                    if (!existingCard.deckCardIds) {
                        existingCard.deckCardIds = [];
                    }
                    existingCard.deckCardIds.push(deckCardId);
                } else {
                    // 如果不存在，添加新卡牌
                    deck.cards.push({
                        cardId: cardId,
                        count: count,
                        deckCardIds: [deckCardId] // 保存所有对应的 deckCardId
                    });
                }
            }
        });
        
        // 关联模板并更新职业信息
        const result = [];
        templates.forEach(template => {
            const deckId = template.m_deckId;
            if (deckMap.has(deckId)) {
                const deck = deckMap.get(deckId);
                // 使用 DECK_TEMPLATE 的职业信息
                const classId = template.m_classId || deck.classId;
                result.push({
                    ...deck,
                    templateId: template.m_ID,
                    templateDeckId: template.m_deckId,
                    classId: classId,
                    className: this.classNames[classId] || '未知'
                });
            }
        });
        
        console.log('✅ 数据关联完成，共生成', result.length, '个套牌');
        return result;
    }
    
    // 提取本地化文本
    extractLocalizedText(locData) {
        if (!locData || !locData.m_locValues || !Array.isArray(locData.m_locValues)) {
            return '';
        }
        
        // 优先选择中文
        if (locData.m_locValues[12]) return locData.m_locValues[12];
        if (locData.m_locValues[13]) return locData.m_locValues[13];
        if (locData.m_locValues[0]) return locData.m_locValues[0];
        
        return locData.m_locValues.find(val => val && val.trim()) || '';
    }
    
    // 显示进度区域
    showProgressSection() {
        document.querySelector('.version-selection-section').style.display = 'none';
        document.getElementById('loadProgressSection').style.display = 'block';
    }
    
    // 隐藏进度区域
    hideProgressSection() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
    }
    
    // 更新进度
    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }
    
    // 显示套牌列表
    showDeckList() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.getElementById('deckListSection').style.display = 'block';
        
        this.updateDeckSummary();
        this.populateClassFilter();
        this.filterDecks();
    }
    
    // 更新套牌摘要
    updateDeckSummary() {
        const summary = document.getElementById('deckSummary');
        const classCount = new Set(this.allDecks.map(d => d.classId)).size;
        const totalCards = this.allDecks.reduce((sum, d) => sum + d.cards.length, 0);
        
        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-value">${this.allDecks.length}</span>
                <span class="summary-label">套牌总数</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${classCount}</span>
                <span class="summary-label">职业数量</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${totalCards}</span>
                <span class="summary-label">卡牌总数</span>
            </div>
        `;
    }
    
    // 填充职业过滤器
    populateClassFilter() {
        const classFilter = document.getElementById('classFilter');
        const classes = new Set(this.allDecks.map(d => d.classId));
        
        classFilter.innerHTML = '<option value="">所有职业</option>';
        classes.forEach(classId => {
            const option = document.createElement('option');
            option.value = classId;
            option.textContent = this.classNames[classId] || `职业 ${classId}`;
            classFilter.appendChild(option);
        });
    }
    
    // 过滤套牌
    filterDecks() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        const classFilter = document.getElementById('classFilter').value;
        
        this.filteredDecks = this.allDecks.filter(deck => {
            // 搜索支持：套牌名称、套牌ID
            const matchSearch = !searchText || 
                deck.name.toLowerCase().includes(searchText) ||
                deck.id.toString().includes(searchText);
            const matchClass = !classFilter || deck.classId == classFilter;
            return matchSearch && matchClass;
        });
        
        this.displayDecks();
    }
    
    // 显示套牌
    displayDecks() {
        const container = document.getElementById('deckList');
        
        if (this.filteredDecks.length === 0) {
            container.innerHTML = '<div class="no-results">没有找到符合条件的套牌</div>';
            return;
        }
        
        container.innerHTML = this.filteredDecks.map(deck => `
            <div class="deck-item" onclick="deckSystem.showDeckDetails(${deck.id})">
                <div class="deck-item-header">
                    <div class="deck-name">${deck.name}</div>
                    <div class="deck-class">${deck.className}</div>
                </div>
                <div class="deck-info">
                    <div class="deck-stat">
                        <span class="stat-label">套牌ID:</span>
                        <span class="stat-value">${deck.id}</span>
                    </div>
                    <div class="deck-stat">
                        <span class="stat-label">卡牌数量:</span>
                        <span class="stat-value">${deck.cards.reduce((sum, card) => sum + card.count, 0)}</span>
                    </div>
                    <div class="deck-stat">
                        <span class="stat-label">类型:</span>
                        <span class="stat-value">${deck.deckType}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 显示套牌详情
    showDeckDetails(deckIdOrDeck) {
        let deck;
        
        // 判断传入的是ID还是对象
        if (typeof deckIdOrDeck === 'object') {
            // 传入的是对比视图的原始套牌对象，需要转换格式
            const rawDeck = deckIdOrDeck;
            deck = {
                id: rawDeck.m_id,
                name: rawDeck.m_name ? this.extractLocalizedText(rawDeck.m_name) : `套牌 ${rawDeck.m_id}`,
                classId: rawDeck.m_classId || 0,
                className: this.classNames[rawDeck.m_classId] || '未知',
                deckType: rawDeck.m_deckType || 0,
                sortOrder: rawDeck.m_sortOrder || 0,
                cards: (rawDeck.m_cardDbfIds || []).map(cardId => ({
                    cardId: cardId,
                    count: 1, // 原始数据中每个ID代表一张卡
                    deckCardIds: []
                }))
            };
            
            // 合并相同卡牌并统计数量
            const cardMap = new Map();
            deck.cards.forEach(card => {
                if (cardMap.has(card.cardId)) {
                    cardMap.get(card.cardId).count++;
                } else {
                    cardMap.set(card.cardId, card);
                }
            });
            deck.cards = Array.from(cardMap.values());
        } else {
            // 传入的是ID，从allDecks中查找
            const deckId = deckIdOrDeck;
            deck = this.allDecks.find(d => d.id === deckId);
            if (!deck) return;
        }
        
        document.getElementById('modalDeckName').textContent = deck.name;
        
        // 生成套牌代码
        const deckCode = this.generateDeckCode(deck);
        
        const details = document.getElementById('deckDetails');
        details.innerHTML = `
            <div class="deck-details-info">
                <h4>基本信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>套牌ID:</strong> ${deck.id}
                    </div>
                    <div class="info-item">
                        <strong>职业:</strong> ${deck.className}
                    </div>
                    <div class="info-item">
                        <strong>类型:</strong> ${deck.deckType}
                    </div>
                    <div class="info-item">
                        <strong>排序:</strong> ${deck.sortOrder}
                    </div>
                </div>
            </div>
            
            ${deckCode ? `
            <div class="deck-code-section">
                <h4>套牌代码</h4>
                <div class="deck-code-container">
                    <input type="text" class="deck-code-input" value="${deckCode}" readonly id="deckCodeInput">
                    <button class="copy-code-btn" onclick="deckSystem.copyDeckCode()">📋 复制</button>
                </div>
                <div class="deck-code-info">点击复制按钮可将套牌代码复制到剪贴板，然后在游戏中导入</div>
            </div>
            ` : ''}
            
            <div class="deck-details-cards">
                <h4>卡牌列表 (共${deck.cards.reduce((sum, card) => sum + card.count, 0)}张，${deck.cards.length}种)</h4>
                <div class="card-list">
                    ${deck.cards
                        // 按费用排序，费用相同则按卡牌ID排序
                        .sort((a, b) => {
                            // 先获取备牌信息用于计算费用
                            const getSideboardCards = (card) => {
                                const sideboardCards = [];
                                if (card.deckCardIds && card.deckCardIds.length > 0) {
                                    card.deckCardIds.forEach(deckCardId => {
                                        const sideboardCardIds = this.sideboardMap.get(deckCardId);
                                        if (sideboardCardIds && Array.isArray(sideboardCardIds)) {
                                            sideboardCardIds.forEach(sideboardCardId => {
                                                if (!sideboardCards.includes(sideboardCardId)) {
                                                    sideboardCards.push(sideboardCardId);
                                                }
                                            });
                                        }
                                    });
                                }
                                return sideboardCards;
                            };
                            
                            const sideboardA = getSideboardCards(a);
                            const sideboardB = getSideboardCards(b);
                            const costA = this.getCardCost(a.cardId, sideboardA);
                            const costB = this.getCardCost(b.cardId, sideboardB);
                            
                            if (costA !== costB) {
                                return costA - costB;
                            }
                            return a.cardId - b.cardId;
                        })
                        .map(card => {
                        const cardName = this.getCardName(card.cardId);
                        
                        // 查找该卡的所有备牌
                        const sideboardCards = [];
                        if (card.deckCardIds && card.deckCardIds.length > 0) {
                            card.deckCardIds.forEach(deckCardId => {
                                const sideboardCardIds = this.sideboardMap.get(deckCardId);
                                if (sideboardCardIds && Array.isArray(sideboardCardIds)) {
                                    sideboardCardIds.forEach(sideboardCardId => {
                                        if (!sideboardCards.includes(sideboardCardId)) {
                                            sideboardCards.push(sideboardCardId);
                                        }
                                    });
                                }
                            });
                        }
                        
                        // 获取费用（如果是SIDEBOARD_TYPE=2，会自动计算备牌费用之和）
                        const cardCost = this.getCardCost(card.cardId, sideboardCards);
                        
                        let html = `
                        <div class="card-list-item">
                            <span class="card-cost">[费用${cardCost}]</span>
                            <span class="card-count">${card.count}x</span>
                            <span class="card-id">ID: ${card.cardId}</span>
                            ${cardName ? `<span class="card-name-text clickable-card" onclick="window.cardDetailModal.show(${card.cardId}, '${this.currentVersion}')">${cardName}</span>` : ''}
                        </div>
                        `;
                        
                        // 如果有备牌，显示备牌信息
                        if (sideboardCards.length > 0) {
                            sideboardCards.forEach(sideboardCardId => {
                                const sideboardCardName = this.getCardName(sideboardCardId);
                                const sideboardCardCost = this.getCardCost(sideboardCardId);
                                html += `
                                <div class="card-list-item sideboard-item">
                                    <span class="card-cost">[费用${sideboardCardCost}]</span>
                                    <span class="card-id">ID: ${sideboardCardId}</span>
                                    ${sideboardCardName ? `<span class="card-name-text clickable-card" onclick="window.cardDetailModal.show(${sideboardCardId}, '${this.currentVersion}')">${sideboardCardName}</span>` : ''}
                                </div>
                                `;
                            });
                        }
                        
                        return html;
                    }).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('deckModal').style.display = 'block';
    }
    
    // 复制套牌代码
    copyDeckCode() {
        const input = document.getElementById('deckCodeInput');
        if (input) {
            input.select();
            document.execCommand('copy');
            
            // 显示复制成功提示
            const btn = document.querySelector('.copy-code-btn');
            const originalText = btn.textContent;
            btn.textContent = '✅ 已复制';
            btn.style.backgroundColor = '#27ae60';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
            }, 2000);
        }
    }
    
    // 关闭模态框
    closeModal() {
        document.getElementById('deckModal').style.display = 'none';
    }
    
    // 返回版本选择
    backToVersionSelect() {
        if (this.compareMode) {
            // 对比模式：清空对比结果，返回版本选择
            document.getElementById('deckListSection').style.display = 'none';
            document.querySelector('.version-selection-section').style.display = 'block';
            document.getElementById('deckCompareView').style.display = 'none';
            document.getElementById('compareVersionSection').style.display = 'flex';
            this.oldVersionDecks = [];
            this.newVersionDecks = [];
            this.compareResults = null;
            document.getElementById('oldVersionSelect').value = '';
            document.getElementById('newVersionSelect').value = '';
            document.getElementById('compareDecksBtn').disabled = true;
        } else {
            // 单版本模式：返回版本选择
            document.getElementById('deckListSection').style.display = 'none';
            document.querySelector('.version-selection-section').style.display = 'block';
            this.allDecks = [];
            this.filteredDecks = [];
        }
    }
    
    // 导出套牌
    async exportDecks() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: document.getElementById('versionSelect').value,
            totalDecks: this.allDecks.length,
            decks: this.allDecks
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        if (window.fileAPI) {
            try {
                const result = await window.fileAPI.showSaveDialog({
                    title: '导出套牌数据',
                    defaultPath: `decks_${exportData.version}.json`,
                    filters: [
                        { name: 'JSON文件', extensions: ['json'] },
                        { name: '所有文件', extensions: ['*'] }
                    ]
                });
                
                if (!result.canceled) {
                    const writeResult = await window.fileAPI.writeFile(result.filePath, dataStr);
                    if (writeResult.success) {
                        alert('导出成功');
                    } else {
                        throw new Error(writeResult.error);
                    }
                }
            } catch (error) {
                alert('导出失败: ' + error.message);
            }
        } else {
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `decks_${exportData.version}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
}

// 初始化系统
let deckSystem;

console.log('📝 deck-template.js 脚本开始加载');

if (document.readyState === 'loading') {
    console.log('📄 DOM正在加载，等待DOMContentLoaded事件');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM内容已加载，开始初始化DeckTemplateSystem');
        deckSystem = new DeckTemplateSystem();
    });
} else {
    console.log('📄 DOM已就绪，立即初始化DeckTemplateSystem');
    deckSystem = new DeckTemplateSystem();
}

window.addEventListener('load', () => {
    console.log('🌐 窗口完全加载');
    if (!deckSystem) {
        console.log('⚠️ 系统未初始化，重新创建DeckTemplateSystem');
        deckSystem = new DeckTemplateSystem();
    }
});

window.deckSystem = deckSystem;

console.log('✅ deck-template.js 脚本加载完成');
