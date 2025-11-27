// 炉石传说套牌模板系统
class DeckTemplateSystem {
    constructor() {
        this.availableVersions = [];
        this.versionData = null;
        this.dataPath = './data';
        this.allDecks = [];
        this.filteredDecks = [];
        this.cardNameMap = new Map(); // 卡牌ID到名称的映射
        
        // 职业映射
        this.classNames = {
            1: '死亡骑士',
            2: '德鲁伊',
            3: '猎人',
            4: '法师',
            5: '圣骑士',
            6: '牧师',
            7: '潜行者',
            8: '萨满祭司',
            9: '术士',
            10: '战士',
            14: '恶魔猎手',
            12: '中立'
        };
        
        // 职业默认英雄ID映射
        this.classHeroIds = {
            1: 78065,  // 死亡骑士
            2: 274,    // 德鲁伊
            3: 31,     // 猎人
            4: 637,    // 法师
            5: 671,    // 圣骑士
            6: 813,    // 牧师
            7: 930,    // 潜行者
            8: 1066,   // 萨满祭司
            9: 893,    // 术士
            10: 7,     // 战士
            14: 56550, // 恶魔猎手
            12: 0      // 中立
        };
        
        this.init();
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
    
    setupEventListeners() {
        // 返回首页
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 版本选择
        document.getElementById('versionSelect').addEventListener('change', () => this.onVersionSelect());
        document.getElementById('loadDecksBtn').addEventListener('click', () => this.loadDecks());
        document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.detectVersions());
        
        // 套牌操作
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelect());
        document.getElementById('exportDecksBtn').addEventListener('click', () => this.exportDecks());
        
        // 搜索和过滤
        document.getElementById('searchInput').addEventListener('input', () => this.filterDecks());
        document.getElementById('classFilter').addEventListener('change', () => this.filterDecks());
        document.getElementById('formatFilter').addEventListener('change', () => this.filterDecks());
        
        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('deckModal').addEventListener('click', (e) => {
            if (e.target.id === 'deckModal') this.closeModal();
        });
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
    populateVersionSelector() {
        const select = document.getElementById('versionSelect');
        select.innerHTML = '<option value="">请选择版本</option>';
        
        this.availableVersions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = `版本 ${version}`;
            select.appendChild(option);
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
        const deckTemplatePath = `data/${version}/DECK_TEMPLATE.json`;
        const deckPath = `data/${version}/DECK.json`;
        const deckCardPath = `data/${version}/DECK_CARD.json`;
        
        try {
            const [templateResult, deckResult, cardResult] = await Promise.all([
                window.fileAPI.readFile(deckTemplatePath),
                window.fileAPI.readFile(deckPath),
                window.fileAPI.readFile(deckCardPath)
            ]);
            
            const missingFiles = [];
            if (!templateResult.success) missingFiles.push('DECK_TEMPLATE.json');
            if (!deckResult.success) missingFiles.push('DECK.json');
            if (!cardResult.success) missingFiles.push('DECK_CARD.json');
            
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
            
            this.updateProgress(80, '正在加载卡牌名称...');
            await this.loadCardNames(version);
            console.log('✅ 卡牌名称加载完成');
            
            this.updateProgress(90, '正在关联数据...');
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
        const filePath = `data/${version}/DECK_TEMPLATE.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(`无法读取 DECK_TEMPLATE.json: ${result.error}`);
        }
        
        const data = JSON.parse(result.data);
        return data.Records || [];
    }
    
    // 加载套牌信息
    async loadDeckInfo(version) {
        const filePath = `data/${version}/DECK.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(`无法读取 DECK.json: ${result.error}`);
        }
        
        const data = JSON.parse(result.data);
        return data.Records || [];
    }
    
    // 加载卡牌信息
    async loadDeckCards(version) {
        const filePath = `data/${version}/DECK_CARD.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(`无法读取 DECK_CARD.json: ${result.error}`);
        }
        
        const data = JSON.parse(result.data);
        return data.Records || [];
    }
    
    // 加载卡牌名称
    async loadCardNames(version) {
        const filePath = `data/${version}/CARD.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            console.warn('无法读取 CARD.json，卡牌名称将不可用');
            return;
        }
        
        const data = JSON.parse(result.data);
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
    
    // 获取卡牌名称
    getCardName(cardId) {
        return this.cardNameMap.get(cardId) || '';
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
                
                // 查找是否已存在该卡牌
                const existingCard = deck.cards.find(c => c.cardId === cardId);
                if (existingCard) {
                    // 如果存在，累加数量
                    existingCard.count += count;
                } else {
                    // 如果不存在，添加新卡牌
                    deck.cards.push({
                        cardId: cardId,
                        count: count
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
            const matchSearch = !searchText || deck.name.toLowerCase().includes(searchText);
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
    showDeckDetails(deckId) {
        const deck = this.allDecks.find(d => d.id === deckId);
        if (!deck) return;
        
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
                    ${deck.cards.map(card => {
                        const cardName = this.getCardName(card.cardId);
                        return `
                        <div class="card-list-item">
                            <span class="card-count">${card.count}x</span>
                            <span class="card-id">CardID: ${card.cardId}</span>
                            ${cardName ? `<span class="card-name-text">${cardName}</span>` : ''}
                        </div>
                        `;
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
        document.getElementById('deckListSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
        this.allDecks = [];
        this.filteredDecks = [];
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
