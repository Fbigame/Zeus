// 卡牌查询页面
class CardViewer {
    constructor() {
        this.currentVersion = null;
        this.allCards = [];
        this.filteredCards = [];
        this.cardTags = {};
        this.selectedCard = null;
        this.rawCardData = {}; // 存储原始卡牌数据
        
        // 分页相关
        this.currentPage = 1;
        this.pageSize = 30;
        this.totalPages = 0;

        this.init();
    }

    // 提取本地化文本(优先简体中文[12],然后繁体中文[13],最后英文[0])
    extractLocalizedText(locData) {
        if (!locData || !locData.m_locValues || !Array.isArray(locData.m_locValues)) {
            return '';
        }
        // 优先简体中文(索引12),然后繁体中文(索引13),最后英文(索引0)
        if (locData.m_locValues[12]) return locData.m_locValues[12];
        if (locData.m_locValues[13]) return locData.m_locValues[13];
        if (locData.m_locValues[0]) return locData.m_locValues[0];
        // 找到第一个非空值
        return locData.m_locValues.find(val => val && val.trim()) || '';
    }

    async init() {
        // 绑定事件
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.loadVersions());
        document.getElementById('versionSelect').addEventListener('change', (e) => this.onVersionSelect(e.target.value));
        document.getElementById('loadCardsBtn').addEventListener('click', () => this.loadCards());
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelection());
        document.getElementById('exportCardsBtn').addEventListener('click', () => this.exportCards());
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterCards());
        document.getElementById('classFilter').addEventListener('change', () => this.filterCards());
        document.getElementById('typeFilter').addEventListener('change', () => this.filterCards());
        document.getElementById('rarityFilter').addEventListener('change', () => this.filterCards());
        document.getElementById('setFilter').addEventListener('change', () => this.filterCards());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());

        // 加载版本列表
        await this.loadVersions();
    }

    async loadVersions() {
        const detectionStatus = document.getElementById('detectionStatus');
        const dataPathInfo = document.getElementById('dataPathInfo');
        
        detectionStatus.textContent = '正在检测版本文件夹...';
        
        try {
            let scanPath = './data';
            
            // 先获取默认数据路径
            const pathResult = await window.fileAPI.getDefaultDataPath();
            if (pathResult.success) {
                scanPath = pathResult.path;
                dataPathInfo.textContent = `数据目录: ${scanPath}`;
            } else {
                dataPathInfo.textContent = `数据目录: ${scanPath} (相对路径)`;
            }

            const result = await window.fileAPI.scanDirectories(scanPath);
            
            if (result.success && result.directories.length > 0) {
                const versions = result.directories
                    .filter(dir => /^\d+\.\d+\.\d+\.\d+$/.test(dir))
                    .sort((a, b) => {
                        const aParts = a.split('.').map(Number);
                        const bParts = b.split('.').map(Number);
                        for (let i = 0; i < 4; i++) {
                            if (aParts[i] !== bParts[i]) {
                                return bParts[i] - aParts[i];
                            }
                        }
                        return 0;
                    });

                if (versions.length > 0) {
                    detectionStatus.innerHTML = `✓ 检测到 ${versions.length} 个版本`;
                    detectionStatus.style.color = '#28a745';
                    
                    const select = document.getElementById('versionSelect');
                    select.innerHTML = '<option value="">请选择版本</option>' +
                        versions.map(v => `<option value="${v}">版本 ${v}</option>`).join('');
                    
                    document.getElementById('versionSelector').style.display = 'block';
                    
                    // 自动选择最新版本
                    if (versions.length > 0) {
                        select.value = versions[0];
                        this.onVersionSelect(versions[0]);
                    }
                } else {
                    throw new Error('未找到有效的版本文件夹');
                }
            } else {
                throw new Error('未找到数据目录或目录为空');
            }
        } catch (error) {
            detectionStatus.innerHTML = `✗ ${error.message}`;
            detectionStatus.style.color = '#dc3545';
            dataPathInfo.innerHTML = '<br>请确保数据文件已放置在正确的目录中。';
        }
    }

    onVersionSelect(version) {
        this.currentVersion = version;
        const loadBtn = document.getElementById('loadCardsBtn');
        const versionInfo = document.getElementById('versionInfo');
        
        if (version) {
            loadBtn.disabled = false;
            versionInfo.textContent = `已选择版本: ${version}`;
        } else {
            loadBtn.disabled = true;
            versionInfo.textContent = '';
        }
    }

    async loadCards() {
        if (!this.currentVersion) return;

        // 显示加载进度
        document.querySelector('.version-selection-section').style.display = 'none';
        document.getElementById('loadProgressSection').style.display = 'block';

        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        try {
            progressText.textContent = '正在加载卡牌数据...';
            progressFill.style.width = '20%';

            const cardPath = `data/${this.currentVersion}/CARD.json`;
            const tagPath = `data/${this.currentVersion}/CARD_TAG.json`;
            const cardSetTimingPath = `data/${this.currentVersion}/CARD_SET_TIMING.json`;
            const eventMapPath = `data/${this.currentVersion}/EventMap.json`;

            const [cardResult, tagResult, cardSetTimingResult, eventMapResult] = await Promise.all([
                window.fileAPI.readFile(cardPath),
                window.fileAPI.readFile(tagPath),
                window.fileAPI.readFile(cardSetTimingPath),
                window.fileAPI.readFile(eventMapPath)
            ]);

            if (!cardResult.success || !tagResult.success) {
                throw new Error('无法加载数据文件');
            }

            progressText.textContent = '正在解析数据...';
            progressFill.style.width = '40%';

            const cardData = JSON.parse(cardResult.data);
            const tagData = JSON.parse(tagResult.data);
            
            // 解析扩展包时序数据和事件映射
            let cardSetTimingData = null;
            let eventMapData = null;
            if (cardSetTimingResult.success && eventMapResult.success) {
                cardSetTimingData = JSON.parse(cardSetTimingResult.data);
                eventMapData = JSON.parse(eventMapResult.data);
                console.log('扩展包时序数据结构:', Object.keys(cardSetTimingData));
                console.log('事件映射数据结构:', Object.keys(eventMapData));
                console.log('EventMap 完整数据:', eventMapData);
            }

            console.log('卡牌数据结构:', Object.keys(cardData));
            console.log('标签数据结构:', Object.keys(tagData));

            // 处理卡牌数据 - CARD.json 的结构是 { Records: [...] }
            const cards = cardData.Records || cardData;
            if (!Array.isArray(cards)) {
                throw new Error('卡牌数据格式错误');
            }

            this.allCards = cards.map(card => {
                const cardId = card.m_ID || card.ID || 0;
                
                // 存储原始数据
                this.rawCardData[cardId] = card;
                
                return {
                    id: cardId,
                    cardId: card.m_noteMiniGuid || '',
                    name: this.extractLocalizedText(card.m_name) || `卡牌 ${cardId}`,
                    text: this.extractLocalizedText(card.m_textInHand),
                    flavorText: this.extractLocalizedText(card.m_flavorText),
                    cardSetId: card.m_cardSetId || card.cardSetId || 0,
                    artistName: card.m_artistName || card.artistName || '',
                    tags: {},
                    cardSets: []  // 存储扩展包事件信息
                };
            });

            // 处理标签数据 - CARD_TAG.json 的结构也是 { Records: [...] }
            const tags = tagData.Records || tagData;
            if (Array.isArray(tags)) {
                tags.forEach(tag => {
                    const cardId = tag.m_cardId || tag.cardId;
                    const tagId = tag.m_tagId || tag.tagId;
                    const tagValue = tag.m_tagValue || tag.tagValue;
                    
                    const card = this.allCards.find(c => c.id === cardId);
                    if (card && tagId !== undefined) {
                        card.tags[tagId] = tagValue;
                    }
                });
            }
            
            // 处理扩展包时序数据 - CARD_SET_TIMING.json
            progressText.textContent = '正在处理扩展包数据...';
            progressFill.style.width = '70%';
            
            if (cardSetTimingData && eventMapData) {
                const cardSetTimings = cardSetTimingData.Records || cardSetTimingData;
                const eventMaps = eventMapData.Records || eventMapData;
                
                // 构建 eventTimingEvent -> eventName 的映射
                const eventMap = {};
                
                // EventMap 结构: m_Values[i] -> m_Keys[i]
                if (eventMaps && eventMaps.m_Keys && eventMaps.m_Values && 
                    Array.isArray(eventMaps.m_Keys) && Array.isArray(eventMaps.m_Values)) {
                    console.log('EventMap m_Keys 数组长度:', eventMaps.m_Keys.length);
                    console.log('EventMap m_Values 数组长度:', eventMaps.m_Values.length);
                    
                    for (let i = 0; i < eventMaps.m_Values.length; i++) {
                        const eventId = eventMaps.m_Values[i];
                        const eventName = eventMaps.m_Keys[i];
                        if (eventName && eventName !== 'none') {
                            eventMap[eventId] = eventName;
                        }
                    }
                } else if (Array.isArray(eventMaps)) {
                    // 如果是 Records 数组，尝试之前的逻辑
                    eventMaps.forEach(event => {
                        const eventId = event.m_Values || event.Values || event.m_values || event.values;
                        const eventName = event.m_Keys || event.Keys || event.m_keys || event.keys;
                        if (eventId !== undefined && eventName) {
                            eventMap[eventId] = eventName;
                        }
                    });
                }
                console.log('事件映射表包含的事件数量:', Object.keys(eventMap).length);
                console.log('示例事件映射:', Object.entries(eventMap).slice(0, 10));
                
                // 将扩展包信息添加到卡牌
                if (Array.isArray(cardSetTimings)) {
                    cardSetTimings.forEach(timing => {
                        const cardId = timing.m_cardId || timing.cardId;
                        const eventTimingEvent = timing.m_eventTimingEvent || timing.eventTimingEvent;
                        const cardSetId = timing.m_cardSetId || timing.cardSetId;
                        
                        const card = this.allCards.find(c => c.id === cardId);
                        if (card && eventTimingEvent !== undefined) {
                            // 事件203特殊处理：显示cardSetId而不是事件名
                            if (eventTimingEvent === 203) {
                                const cardSetInfo = window.getTagValue(183, cardSetId);
                                const event203Name = eventMap[203] || '标准';
                                card.cardSets.push({
                                    eventTimingEvent: eventTimingEvent,
                                    eventName: `${cardSetInfo.displayName} (${event203Name})`,
                                    cardSetId: cardSetId,
                                    isCardSetBased: true  // 标记这是基于cardSetId的
                                });
                            } else {
                                const eventName = eventMap[eventTimingEvent] || `事件${eventTimingEvent}`;
                                // 如果找不到映射，记录日志
                                if (!eventMap[eventTimingEvent]) {
                                    console.warn(`未找到事件映射: eventTimingEvent=${eventTimingEvent}, cardId=${cardId}`);
                                }
                                card.cardSets.push({
                                    eventTimingEvent: eventTimingEvent,
                                    eventName: eventName,
                                    cardSetId: cardSetId,
                                    isCardSetBased: false
                                });
                            }
                        }
                    });
                }
                console.log('扩展包数据处理完成');
            }

            console.log(`加载完成: ${this.allCards.length} 张卡牌`);

            progressText.textContent = '准备显示...';
            progressFill.style.width = '100%';

            // 显示卡牌列表
            setTimeout(() => {
                this.showCardList();
            }, 300);

        } catch (error) {
            progressText.textContent = `加载失败: ${error.message}`;
            progressText.style.color = '#dc3545';
            console.error('加载卡牌数据失败:', error);
            
            setTimeout(() => {
                this.backToVersionSelection();
            }, 2000);
        }
    }

    showCardList() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.getElementById('cardListSection').style.display = 'block';

        // 初始化筛选器
        this.initializeFilters();

        // 显示统计信息
        this.updateSummary();

        // 显示所有卡牌
        this.filteredCards = [...this.allCards];
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredCards.length / this.pageSize);
        this.renderCards();
        this.renderPagination();
    }

    initializeFilters() {
        console.log('=== initializeFilters called ===');
        console.log('window.getTagValue:', typeof window.getTagValue);
        console.log('window.TAG_CARD_SET:', typeof window.TAG_CARD_SET);
        console.log('this.allCards.length:', this.allCards.length);
        
        // 检查 getTagValue 是否可用
        if (typeof window.getTagValue !== 'function') {
            console.error('window.getTagValue is not a function! tag-enums.js may not be loaded.');
            alert('错误:标签枚举未加载,请刷新页面重试');
            return;
        }
        
        // 职业筛选
        const classes = new Set();
        this.allCards.forEach(card => {
            const classTag = card.tags[199]; // CLASS tag
            if (classTag) classes.add(classTag);
        });
        console.log('Found classes:', Array.from(classes));
        const classFilter = document.getElementById('classFilter');
        try {
            classFilter.innerHTML = '<option value="">所有职业</option>' +
                Array.from(classes).sort((a, b) => a - b).map(c => {
                    const classInfo = window.getTagValue(199, c);
                    return `<option value="${c}">${classInfo.displayName}</option>`;
                }).join('');
            console.log('Class filter updated successfully');
        } catch (error) {
            console.error('Error updating class filter:', error);
        }

        // 类型筛选
        const types = new Set();
        this.allCards.forEach(card => {
            const typeTag = card.tags[202]; // CARDTYPE tag
            if (typeTag) types.add(typeTag);
        });
        console.log('Found types:', Array.from(types));
        const typeFilter = document.getElementById('typeFilter');
        try {
            typeFilter.innerHTML = '<option value="">所有类型</option>' +
                Array.from(types).sort((a, b) => a - b).map(t => {
                    const typeInfo = window.getTagValue(202, t);
                    return `<option value="${t}">${typeInfo.displayName}</option>`;
                }).join('');
            console.log('Type filter updated successfully');
        } catch (error) {
            console.error('Error updating type filter:', error);
        }

        // 稀有度筛选
        const rarities = new Set();
        this.allCards.forEach(card => {
            const rarityTag = card.tags[203]; // RARITY tag
            if (rarityTag) rarities.add(rarityTag);
        });
        console.log('Found rarities:', Array.from(rarities));
        const rarityFilter = document.getElementById('rarityFilter');
        try {
            rarityFilter.innerHTML = '<option value="">所有稀有度</option>' +
                Array.from(rarities).sort((a, b) => a - b).map(r => {
                    const rarityInfo = window.getTagValue(203, r);
                    return `<option value="${r}">${rarityInfo.displayName}</option>`;
                }).join('');
            console.log('Rarity filter updated successfully');
        } catch (error) {
            console.error('Error updating rarity filter:', error);
        }

        // 卡牌集筛选 - 使用 cardSets 数据
        const sets = new Map(); // key -> {displayName, isCardSet, value}
        this.allCards.forEach(card => {
            if (card.cardSets && card.cardSets.length > 0) {
                card.cardSets.forEach(cardSet => {
                    if (cardSet.isCardSetBased) {
                        // 事件203：使用 cardSetId 作为筛选值
                        const key = `cardset_${cardSet.cardSetId}`;
                        if (!sets.has(key)) {
                            sets.set(key, {
                                displayName: cardSet.eventName,
                                isCardSet: true,
                                value: cardSet.cardSetId
                            });
                        }
                    } else {
                        // 其他事件：使用 eventTimingEvent 作为筛选值
                        const key = `event_${cardSet.eventTimingEvent}`;
                        if (!sets.has(key)) {
                            sets.set(key, {
                                displayName: cardSet.eventName,
                                isCardSet: false,
                                value: cardSet.eventTimingEvent
                            });
                        }
                    }
                });
            }
        });
        console.log('Found card sets:', Array.from(sets));
        const setFilter = document.getElementById('setFilter');
        try {
            const setOptions = Array.from(sets)
                .sort((a, b) => {
                    // 先按类型排序（cardSet优先），再按值降序
                    if (a[1].isCardSet !== b[1].isCardSet) {
                        return a[1].isCardSet ? -1 : 1;
                    }
                    return b[1].value - a[1].value;
                })
                .map(([key, info]) => {
                    return `<option value="${key}">${info.displayName}</option>`;
                }).join('');
            console.log('Set options HTML length:', setOptions.length);
            setFilter.innerHTML = '<option value="">所有扩展包</option>' + setOptions;
            console.log('Set filter updated successfully, total options:', setFilter.options.length);
        } catch (error) {
            console.error('Error updating set filter:', error);
        }
        
        console.log('=== initializeFilters completed ===');
    }

    // 提取本地化文本（优先简体中文[12]，然后繁体中文[13]，最后英文[0]）
    extractLocalizedText(locData) {
        if (!locData || !locData.m_locValues || !Array.isArray(locData.m_locValues)) {
            return '';
        }
        // 优先简体中文(索引12)，然后繁体中文(索引13)，最后英文(索引0)
        if (locData.m_locValues[12]) return locData.m_locValues[12];
        if (locData.m_locValues[13]) return locData.m_locValues[13];
        if (locData.m_locValues[0]) return locData.m_locValues[0];
        // 找到第一个非空值
        return locData.m_locValues.find(val => val && val.trim()) || '';
    }
    
    filterCards() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        const classFilter = document.getElementById('classFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const rarityFilter = document.getElementById('rarityFilter').value;
        const setFilter = document.getElementById('setFilter').value;

        this.filteredCards = this.allCards.filter(card => {
            // 搜索文本
            if (searchText) {
                const matchName = (card.name || '').toLowerCase().includes(searchText);
                const matchId = card.id.toString().includes(searchText);
                const matchText = (card.text || '').toLowerCase().includes(searchText);
                if (!matchName && !matchId && !matchText) return false;
            }

            // 职业筛选
            if (classFilter && card.tags[199] != classFilter) return false;

            // 类型筛选
            if (typeFilter && card.tags[202] != typeFilter) return false;

            // 稀有度筛选
            if (rarityFilter && card.tags[203] != rarityFilter) return false;

            // 扩展包筛选 - 使用 cardSets 数据
            if (setFilter) {
                const hasMatchingSet = card.cardSets && card.cardSets.some(cardSet => {
                    if (setFilter.startsWith('cardset_')) {
                        // cardSet筛选：匹配cardSetId
                        const cardSetId = parseInt(setFilter.substring(8));
                        return cardSet.isCardSetBased && cardSet.cardSetId === cardSetId;
                    } else if (setFilter.startsWith('event_')) {
                        // event筛选：匹配eventTimingEvent
                        const eventId = parseInt(setFilter.substring(6));
                        return !cardSet.isCardSetBased && cardSet.eventTimingEvent === eventId;
                    }
                    return false;
                });
                if (!hasMatchingSet) return false;
            }

            return true;
        });

        // 重置到第一页
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredCards.length / this.pageSize);
        this.renderCards();
        this.renderPagination();
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('classFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('rarityFilter').value = '';
        document.getElementById('setFilter').value = '';
        this.filterCards();
    }

    renderCards() {
        const cardList = document.getElementById('cardList');
        const cardCount = document.getElementById('cardCount');
        
        cardCount.textContent = `共 ${this.filteredCards.length} 张卡牌 | 第 ${this.currentPage}/${this.totalPages} 页`;
        
        if (this.filteredCards.length === 0) {
            cardList.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;">未找到符合条件的卡牌</div>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }
        
        // 计算当前页的卡牌范围
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredCards.length);
        const pageCards = this.filteredCards.slice(startIndex, endIndex);

        cardList.innerHTML = pageCards.map(card => {
            const typeInfo = window.getTagValue(202, card.tags[202]);
            const rarityInfo = window.getTagValue(203, card.tags[203]);
            const classInfo = card.tags[199] ? window.getTagValue(199, card.tags[199]) : null;
            const cost = card.tags[48] || 0; // COST
            const attack = card.tags[47] || 0; // ATK
            const health = card.tags[45] || 0; // HEALTH
            const durability = card.tags[187] || 0; // DURABILITY
            const armor = card.tags[292] || 0; // ARMOR
            const collectible = card.tags[321] === 1; // COLLECTIBLE
            
            // 构建扩展包显示（显示所有扩展包）
            let cardSetsDisplay = '';
            if (card.cardSets && card.cardSets.length > 0) {
                cardSetsDisplay = card.cardSets.map(cs => cs.eventName).join(', ');
            }
            
            // 构建属性显示
            let statsHtml = `<div><strong>费用:</strong> ${cost}`;
            
            // 根据卡牌类型显示不同属性
            if (card.tags[202] === 4) { // 随从
                statsHtml += ` | <strong>攻击:</strong> ${attack} | <strong>生命:</strong> ${health}`;
            } else if (card.tags[202] === 7) { // 武器
                statsHtml += ` | <strong>攻击:</strong> ${attack} | <strong>耐久:</strong> ${durability}`;
            } else if (card.tags[202] === 3 && armor) { // 英雄带护甲
                statsHtml += ` | <strong>护甲:</strong> ${armor}`;
            }
            
            statsHtml += '</div>';

            return `
                <div class="card-item" data-card-id="${card.id}">
                    <div class="card-item-header">
                        <div class="card-name">${card.name || '未命名卡牌'}</div>
                        <div class="card-id">#${card.id}</div>
                    </div>
                    <div class="card-info">
                        <div><strong>类型:</strong> ${typeInfo.displayName} ${rarityInfo ? `| <strong>稀有度:</strong> ${rarityInfo.displayName}` : ''}</div>
                        ${classInfo ? `<div><strong>职业:</strong> ${classInfo.displayName}</div>` : ''}
                        ${cardSetsDisplay ? `<div><strong>扩展包:</strong> ${cardSetsDisplay}</div>` : ''}
                        ${statsHtml}
                        ${collectible ? '<div style="color: #27ae60; font-size: 12px;">✓ 可收集</div>' : '<div style="color: #95a5a6; font-size: 12px;">✗ 不可收集</div>'}
                    </div>
                    ${card.text ? `<div class="card-text">${card.text}</div>` : ''}
                </div>
            `;
        }).join('');

        // 绑定点击事件
        cardList.querySelectorAll('.card-item').forEach(item => {
            item.addEventListener('click', () => {
                const cardId = parseInt(item.dataset.cardId);
                this.showCardDetails(cardId);
            });
        });
    }

    updateSummary() {
        const summary = document.getElementById('cardSummary');
        const totalCards = this.allCards.length;
        const collectible = this.allCards.filter(c => c.tags[321] === 1).length; // COLLECTIBLE
        const legendary = this.allCards.filter(c => c.tags[203] === 5).length;

        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-value">${totalCards}</span>
                <span class="summary-label">卡牌总数</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${collectible}</span>
                <span class="summary-label">可收集</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${legendary}</span>
                <span class="summary-label">传说卡牌</span>
            </div>
        `;
    }
    
    renderPagination() {
        const pagination = document.getElementById('pagination');
        const paginationTop = document.getElementById('paginationTop');
        
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            paginationTop.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination-controls">';
        
        // 上一页按钮
        html += `<button class="btn btn-secondary" onclick="cardViewer.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>&laquo; 上一页</button>`;
        
        // 页码按钮
        const maxButtons = 7;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        if (startPage > 1) {
            html += `<button class="btn btn-secondary" onclick="cardViewer.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += '<span style="padding: 0 10px;">...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'btn-primary' : 'btn-secondary';
            html += `<button class="btn ${activeClass}" onclick="cardViewer.goToPage(${i})">${i}</button>`;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                html += '<span style="padding: 0 10px;">...</span>';
            }
            html += `<button class="btn btn-secondary" onclick="cardViewer.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }
        
        // 下一页按钮
        html += `<button class="btn btn-secondary" onclick="cardViewer.goToPage(${this.currentPage + 1})" ${this.currentPage === this.totalPages ? 'disabled' : ''}>下一页 &raquo;</button>`;
        
        html += '</div>';
        
        // 同时更新顶部和底部的分页控件
        pagination.innerHTML = html;
        paginationTop.innerHTML = html;
    }
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderCards();
        this.renderPagination();
        // 滚动到顶部
        const cardListContainer = document.querySelector('.card-list-container');
        if (cardListContainer) {
            cardListContainer.scrollTop = 0;
        }
    }

    showCardDetails(cardId) {
        const card = this.allCards.find(c => c.id === cardId);
        if (!card) return;

        this.selectedCard = card;
        
        document.getElementById('modalCardName').textContent = card.name || '未命名卡牌';
        
        // 提取常用标签
        const cost = card.tags[48] || 0;
        const attack = card.tags[47] || 0;
        const health = card.tags[45] || 0;
        const durability = card.tags[187] || 0;
        const armor = card.tags[292] || 0;
        const typeInfo = window.getTagValue(202, card.tags[202]);
        const rarityInfo = window.getTagValue(203, card.tags[203]);
        const classInfo = card.tags[199] ? window.getTagValue(199, card.tags[199]) : { displayName: '未知' };
        const raceInfo = card.tags[200] ? window.getTagValue(200, card.tags[200]) : null;
        const spellSchoolInfo = card.tags[1635] ? window.getTagValue(1635, card.tags[1635]) : null;
        const collectible = card.tags[321] === 1;
        
        let html = `
            <div class="detail-section">
                <h4>基本信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">卡牌名称</div>
                        <div class="detail-value">${card.name || '未命名卡牌'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">卡牌ID</div>
                        <div class="detail-value">${card.cardId || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">DBF ID</div>
                        <div class="detail-value">${card.id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">卡牌类型</div>
                        <div class="detail-value">${typeInfo.displayName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">稀有度</div>
                        <div class="detail-value">${rarityInfo.displayName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">职业</div>
                        <div class="detail-value">${classInfo.displayName}</div>
                    </div>
                    ${card.cardSets && card.cardSets.length > 0 ? `
                    <div class="detail-item">
                        <div class="detail-label">扩展包</div>
                        <div class="detail-value">${card.cardSets.map(cs => cs.eventName).join(', ')}</div>
                    </div>
                    ` : ''}
                    ${raceInfo ? `
                    <div class="detail-item">
                        <div class="detail-label">种族</div>
                        <div class="detail-value">${raceInfo.displayName}</div>
                    </div>
                    ` : ''}
                    ${spellSchoolInfo ? `
                    <div class="detail-item">
                        <div class="detail-label">法术学派</div>
                        <div class="detail-value">${spellSchoolInfo.displayName}</div>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <div class="detail-label">费用</div>
                        <div class="detail-value">${cost}</div>
                    </div>
                    ${card.tags[202] === 4 ? `
                    <div class="detail-item">
                        <div class="detail-label">攻击力</div>
                        <div class="detail-value">${attack}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">生命值</div>
                        <div class="detail-value">${health}</div>
                    </div>
                    ` : ''}
                    ${card.tags[202] === 7 ? `
                    <div class="detail-item">
                        <div class="detail-label">攻击力</div>
                        <div class="detail-value">${attack}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">耐久度</div>
                        <div class="detail-value">${durability}</div>
                    </div>
                    ` : ''}
                    ${armor ? `
                    <div class="detail-item">
                        <div class="detail-label">护甲值</div>
                        <div class="detail-value">${armor}</div>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <div class="detail-label">可收集</div>
                        <div class="detail-value">${collectible ? '✓ 是' : '✗ 否'}</div>
                    </div>
                    ${card.cardSetId ? `
                    <div class="detail-item">
                        <div class="detail-label">扩展包ID</div>
                        <div class="detail-value">${card.cardSetId}</div>
                    </div>
                    ` : ''}
                    ${card.artistName ? `
                    <div class="detail-item">
                        <div class="detail-label">画师</div>
                        <div class="detail-value">${card.artistName}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        if (card.text) {
            html += `
                <div class="detail-section">
                    <h4>卡牌描述</h4>
                    <div style="padding: 12px; background: #f8f9fa; border-radius: 6px;">
                        ${card.text}
                    </div>
                </div>
            `;
        }
        
        if (card.flavorText) {
            html += `
                <div class="detail-section">
                    <h4>趣闻</h4>
                    <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; font-style: italic; color: #7f8c8d;">
                        ${card.flavorText}
                    </div>
                </div>
            `;
        }

        if (Object.keys(card.tags).length > 0) {
            // 按标签ID排序
            const sortedTags = Object.entries(card.tags).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
            
            html += `
                <div class="detail-section">
                    <h4>所有标签 (${Object.keys(card.tags).length})</h4>
                    <div class="tag-list">
                        ${sortedTags.map(([tagId, value]) => {
                            const tagDisplay = window.formatGameTag ? window.formatGameTag(parseInt(tagId), value) : `标签${tagId} (${tagId}=${value})`;
                            return `<div class="tag-item" title="Tag ID: ${tagId}, Value: ${value}">${tagDisplay}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // 添加查看原始JSON按钮
        html += `
            <div class="detail-section">
                <button class="btn btn-secondary" onclick="cardViewer.showRawJSON(${card.id})" style="width: 100%;">
                    查看原始JSON数据
                </button>
            </div>
        `;

        document.getElementById('cardDetails').innerHTML = html;
        document.getElementById('cardModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('cardModal').classList.remove('active');
    }
    
    showRawJSON(cardId) {
        const rawData = this.rawCardData[cardId];
        if (!rawData) {
            alert('未找到原始数据');
            return;
        }
        
        const modal = document.getElementById('cardModal');
        const modalTitle = document.getElementById('modalCardName');
        const modalContent = document.getElementById('cardDetails');
        
        modalTitle.textContent = '原始JSON数据';
        modalContent.innerHTML = `
            <div style="position: relative;">
                <button onclick="cardViewer.copyRawJSON(${cardId})" class="btn btn-primary" style="position: absolute; top: 10px; right: 30px; z-index: 10;">
                    复制JSON
                </button>
                <pre style="background: #2c3e50; color: #ecf0f1; padding: 20px; border-radius: 8px; overflow: auto; max-height: 600px; margin: 0;">${JSON.stringify(rawData, null, 2)}</pre>
            </div>
        `;
        
        modal.classList.add('active');
    }
    
    copyRawJSON(cardId) {
        const rawData = this.rawCardData[cardId];
        if (!rawData) return;
        
        const jsonStr = JSON.stringify(rawData, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            this.showToast('✓ JSON已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            this.showToast('✗ 复制失败', 'error');
        });
    }
    
    showToast(message, type = 'success') {
        // 创建 toast 元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 添加到页面
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 2秒后隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    backToVersionSelection() {
        document.getElementById('cardListSection').style.display = 'none';
        document.getElementById('loadProgressSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
    }

    async exportCards() {
        try {
            const result = await window.fileAPI.showSaveDialog({
                title: '导出卡牌数据',
                defaultPath: `cards_${this.currentVersion}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });

            if (!result.canceled && result.filePath) {
                const data = JSON.stringify(this.filteredCards, null, 2);
                const writeResult = await window.fileAPI.writeFile(result.filePath, data);
                
                if (writeResult.success) {
                    alert('导出成功！');
                } else {
                    alert('导出失败: ' + writeResult.error);
                }
            }
        } catch (error) {
            alert('导出失败: ' + error.message);
        }
    }
}

// 初始化
const cardViewer = new CardViewer();
window.cardViewer = cardViewer;
