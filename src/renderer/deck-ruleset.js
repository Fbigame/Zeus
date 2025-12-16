// 炉石传说套牌规则集系统
class DeckRulesetSystem {
    constructor() {
        this.availableVersions = [];
        this.dataPath = './data';
        this.allRulesets = [];
        this.filteredRulesets = [];
        this.allRules = []; // 所有规则数据
        this.filteredRules = []; // 过滤后的规则数据
        this.allSubsets = []; // 所有子集数据
        this.filteredSubsets = []; // 过滤后的子集数据
        this.allSubsetRules = []; // 所有子集规则数据
        this.filteredSubsetRules = []; // 过滤后的子集规则数据
        this.subsets = {}; // 存储子集数据
        this.subsetRules = {}; // 存储子集规则数据
        this.userNotes = { SUBSET: {} }; // 存储用户备注
        this.cardData = {}; // 存储卡牌数据缓存，格式：{ cardId: cardName }
        this.subsetCards = {}; // 存储子集到卡牌的映射，格式：{ subsetId: [cardId1, cardId2, ...] }
        this.currentEditingRuleId = null; // 当前正在编辑备注的规则ID
        this.compareMode = false; // 对比模式（规则集对比）
        this.versionCompareMode = false; // 版本对比模式
        this.viewMode = 'ruleset'; // 查看模式：'ruleset', 'rule', 'subset', 'subsetRule'
        this.sortBy = 'id'; // 排序字段：'id' 或 'ruleCount'
        this.sortOrder = 'asc'; // 排序顺序：'asc' 或 'desc'
        this.reverseOrder = false; // 是否倒序查看
        this.selectedRulesets = new Set(); // 选中的规则集
        this.oldVersionSubsets = []; // 旧版本子集数据
        this.newVersionSubsets = []; // 新版本子集数据
        this.oldVersionRulesets = []; // 旧版本规则集数据
        this.newVersionRulesets = []; // 新版本规则集数据
        // 初始化通用分页组件
        this.pagination = new Pagination({
            pageSize: 20,
            onPageChange: () => this.displayRulesets()
        });
        // 将分页实例暴露到全局，供HTML中的按钮调用
        window.paginationInstance = this.pagination;
        
        // 规则类型映射 (DeckRulesetRule.RuleType)
        this.ruleTypes = {
            0: '无效规则类型',
            1: '具有标签值',
            2: '具有奇数标签值',
            3: '统计套牌中的卡牌数',
            4: '统计每张卡的副本数',
            5: '统计具有标签值的卡牌',
            6: '统计具有奇数标签值的卡牌',
            7: '统计具有相同标签值的卡牌',
            8: '统计唯一标签值数量',
            9: '在任一子集中',
            10: '在所有子集中',
            11: '卡牌文本包含子字符串',
            12: '玩家拥有每张副本',
            13: '未轮换',
            14: '套牌大小',
            15: '是职业或中立卡牌',
            16: '卡牌可用',
            17: '未在联赛中禁用',
            18: '在酒馆战棋中激活',
            19: '在酒馆战棋中抢先体验',
            20: '在卡牌集中',
            21: '在模式中',
            22: '编辑套牌额外卡牌数',
            23: '死亡骑士符文限制',
            24: '备用卡牌数量限制',
            25: '备用卡牌具有标签值',
            27: '玩家拥有套牌模板',
            28: '游客限制',
            29: '是双职业或中立卡牌'
        };
        
        // 子集规则类型映射 (SubsetRule.Type)
        this.subsetRuleTypes = {
            0: '无效',
            1: '具有标签值',
            2: '具有奇数标签值',
            3: '是卡牌数据库ID',
            4: '是最新卡牌集',
            5: '未标记值',
            6: '未轮换',
            7: '可征召',
            8: '卡牌可用',
            9: '在酒馆战棋中激活',
            10: '在酒馆战棋中抢先体验',
            11: '在每个酒馆战棋中',
            12: '是最新扩展卡牌集',
            13: '是多职业',
            14: '具有多种类型'
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 DeckRulesetSystem 初始化开始');
        this.setupEventListeners();
        await this.loadUserNotes();
        await this.detectVersions();
        console.log('✅ DeckRulesetSystem 初始化完成');
    }
    
    setupEventListeners() {
        // 返回首页
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 版本选择
        document.getElementById('versionSelect').addEventListener('change', () => this.onVersionSelect());
        document.getElementById('loadRulesetsBtn').addEventListener('click', () => this.loadRulesets());
        document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.detectVersions());
        
        // 模式切换
        document.getElementById('singleModeBtn').addEventListener('click', () => this.switchVersionMode('single'));
        document.getElementById('versionCompareModeBtn').addEventListener('click', () => this.switchVersionMode('compare'));
        
        // 对比模式版本选择
        document.getElementById('oldVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('newVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('compareRulesetsVersionBtn').addEventListener('click', () => this.compareVersionRulesets());
        document.getElementById('compareRulesVersionBtn').addEventListener('click', () => this.compareVersionRules());
        document.getElementById('compareSubsetsBtn').addEventListener('click', () => this.compareVersionSubsets());
        document.getElementById('compareSubsetRulesVersionBtn').addEventListener('click', () => this.compareVersionSubsetRules());
        
        // 规则集操作
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelect());
        document.getElementById('exportRulesetsBtn').addEventListener('click', () => this.exportRulesets());
        
        // 查看模式切换
        document.getElementById('viewByRulesetBtn').addEventListener('click', () => this.switchViewMode('ruleset'));
        document.getElementById('viewByRuleBtn').addEventListener('click', () => this.switchViewMode('rule'));
        document.getElementById('viewBySubsetBtn').addEventListener('click', () => this.switchViewMode('subset'));
        document.getElementById('viewBySubsetRuleBtn').addEventListener('click', () => this.switchViewMode('subsetRule'));
        
        // 搜索
        document.getElementById('searchInput').addEventListener('input', () => this.filterRulesets());
        
        // 排序
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            const [field, order] = e.target.value.split('-');
            this.sortBy = field;
            this.sortOrder = order;
            this.filterRulesets();
        });
        
        // 倒序查看
        document.getElementById('reverseOrderCheck').addEventListener('change', (e) => {
            this.reverseOrder = e.target.checked;
            this.displayRulesets();
        });
        
        // 子集筛选选项
        document.getElementById('filterSubsetWithRules').addEventListener('change', () => this.filterRulesets());
        document.getElementById('filterSubsetWithCards').addEventListener('change', () => this.filterRulesets());
        
        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('rulesetModal').addEventListener('click', (e) => {
            if (e.target.id === 'rulesetModal') this.closeModal();
        });
        
        // 子集模态框
        document.getElementById('closeSubsetModal').addEventListener('click', () => this.closeSubsetModal());
        document.getElementById('subsetModal').addEventListener('click', (e) => {
            if (e.target.id === 'subsetModal') this.closeSubsetModal();
        });
        
        // 规则备注模态框
        document.getElementById('closeRuleNoteModal').addEventListener('click', () => this.closeRuleNoteModal());
        document.getElementById('cancelRuleNoteBtn').addEventListener('click', () => this.closeRuleNoteModal());
        document.getElementById('saveRuleNoteBtn').addEventListener('click', () => this.saveRuleNoteFromModal());
        document.getElementById('ruleNoteModal').addEventListener('click', (e) => {
            if (e.target.id === 'ruleNoteModal') this.closeRuleNoteModal();
        });
        
        // 对比功能
        document.getElementById('toggleCompareBtn').addEventListener('click', () => this.toggleCompareMode());
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        document.getElementById('compareRulesetsBtn').addEventListener('click', () => this.showCompareResults());
        document.getElementById('clearSelectionBtn').addEventListener('click', () => this.clearSelection());
        document.getElementById('closeCompareModal').addEventListener('click', () => this.closeCompareModal());
        document.getElementById('compareModal').addEventListener('click', (e) => {
            if (e.target.id === 'compareModal') this.closeCompareModal();
        });
        
        // 子集版本对比模态框
        document.getElementById('closeSubsetCompareModal').addEventListener('click', () => this.closeSubsetCompareModal());
        document.getElementById('subsetCompareModal').addEventListener('click', (e) => {
            if (e.target.id === 'subsetCompareModal') this.closeSubsetCompareModal();
        });
        
        // 规则集版本对比模态框
        const closeRulesetCompareBtn = document.getElementById('closeRulesetCompareModal');
        const rulesetCompareModalEl = document.getElementById('rulesetCompareModal');
        if (closeRulesetCompareBtn) {
            closeRulesetCompareBtn.addEventListener('click', () => this.closeRulesetCompareModal());
        }
        if (rulesetCompareModalEl) {
            rulesetCompareModalEl.addEventListener('click', (e) => {
                if (e.target.id === 'rulesetCompareModal') this.closeRulesetCompareModal();
            });
        }
        
        // 规则版本对比模态框
        const closeRuleCompareBtn = document.getElementById('closeRuleCompareModal');
        const ruleCompareModalEl = document.getElementById('ruleCompareModal');
        if (closeRuleCompareBtn) {
            closeRuleCompareBtn.addEventListener('click', () => this.closeRuleCompareModal());
        }
        if (ruleCompareModalEl) {
            ruleCompareModalEl.addEventListener('click', (e) => {
                if (e.target.id === 'ruleCompareModal') this.closeRuleCompareModal();
            });
        }
        
        // 子集规则版本对比模态框
        const closeSubsetRuleCompareBtn = document.getElementById('closeSubsetRuleCompareModal');
        const subsetRuleCompareModalEl = document.getElementById('subsetRuleCompareModal');
        if (closeSubsetRuleCompareBtn) {
            closeSubsetRuleCompareBtn.addEventListener('click', () => this.closeSubsetRuleCompareModal());
        }
        if (subsetRuleCompareModalEl) {
            subsetRuleCompareModalEl.addEventListener('click', (e) => {
                if (e.target.id === 'subsetRuleCompareModal') this.closeSubsetRuleCompareModal();
            });
        }
    }
    
    // 加载用户备注
    async loadUserNotes() {
        try {
            const result = await window.fileAPI.readFile('userdata/user-notes.json');
            if (result.success) {
                this.userNotes = JSON.parse(result.data);
                console.log('✅ 用户备注加载成功');
            } else {
                console.warn('⚠️ 用户备注文件不存在，使用默认配置');
                this.userNotes = { SUBSET: {}, CARD: {}, DECK_RULESET: {}, DECK_RULESET_RULE: {} };
            }
        } catch (error) {
            console.error('❌ 加载用户备注失败:', error);
            this.userNotes = { SUBSET: {}, CARD: {}, DECK_RULESET: {}, DECK_RULESET_RULE: {} };
        }
    }
    
    // 保存用户备注
    async saveUserNotes() {
        try {
            const data = JSON.stringify(this.userNotes, null, 2);
            const result = await window.fileAPI.writeFile('userdata/user-notes.json', data);
            if (result.success) {
                console.log('✅ 用户备注保存成功');
                return true;
            } else {
                console.error('❌ 保存用户备注失败:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ 保存用户备注失败:', error);
            return false;
        }
    }
    
    // 检测版本文件夹
    // 加载卡牌数据
    async loadCardData(version) {
        try {
            console.log(`📦 加载卡牌数据 (版本: ${version})`);
            
            // 使用 DataManager 加载卡牌数据
            const cardData = await window.dataManager.loadFile('CARD', version);
            const cards = cardData.Records || cardData;
            
            if (!Array.isArray(cards)) {
                console.warn('⚠️ 卡牌数据格式不正确');
                return;
            }
            
            // 构建卡牌ID到名称的映射
            cards.forEach(card => {
                const cardId = card.m_ID || card.ID;
                const cardName = this.extractLocalizedText(card.m_name) || `卡牌 ${cardId}`;
                if (cardId) {
                    this.cardData[cardId] = cardName;
                }
            });
            
            console.log(`✅ 加载了 ${Object.keys(this.cardData).length} 张卡牌的数据`);
        } catch (error) {
            console.warn('⚠️ 无法加载卡牌数据:', error);
            // 不抛出错误，允许系统继续运行
        }
    }
    
    // 加载子集卡牌映射
    async loadSubsetCards(version) {
        try {
            console.log(`📦 加载子集卡牌映射 (版本: ${version})`);
            
            // 使用 DataManager 加载 SUBSET_CARD 数据
            const subsetCardData = await window.dataManager.loadFile('SUBSET_CARD', version);
            const subsetCards = subsetCardData.Records || subsetCardData;
            
            if (!Array.isArray(subsetCards)) {
                console.warn('⚠️ 子集卡牌数据格式不正确');
                return;
            }
            
            // 构建子集ID到卡牌ID数组的映射
            this.subsetCards = {};
            subsetCards.forEach(item => {
                const subsetId = item.m_SUBSET_ID || item.m_subsetId;
                const cardId = item.m_CARD_ID || item.m_cardId;
                
                if (subsetId && cardId) {
                    if (!this.subsetCards[subsetId]) {
                        this.subsetCards[subsetId] = [];
                    }
                    this.subsetCards[subsetId].push(cardId);
                }
            });
            
            console.log(`✅ 加载了 ${Object.keys(this.subsetCards).length} 个子集的卡牌映射`);
        } catch (error) {
            console.warn('⚠️ 无法加载子集卡牌映射:', error);
            // 不抛出错误，允许系统继续运行
        }
    }
    
    // 提取本地化文本
    extractLocalizedText(textObj) {
        if (!textObj) return '';
        if (typeof textObj === 'string') return textObj;
        
        // 优先使用中文
        const locales = ['zhCN', 'zh_CN', 'enUS', 'en_US'];
        for (const locale of locales) {
            if (textObj[locale]) {
                return textObj[locale];
            }
        }
        
        // 如果没有匹配的，返回第一个可用值
        const values = Object.values(textObj);
        return values.length > 0 ? values[0] : '';
    }
    
    // 根据卡牌ID获取卡牌名称
    getCardName(cardId) {
        if (!cardId || cardId === 0) return null;
        return this.cardData[cardId] || `未知卡牌 (ID: ${cardId})`;
    }
    
    // 根据子集ID获取该子集包含的所有卡牌信息
    getSubsetCardNames(subsetId) {
        const cardIds = this.subsetCards[subsetId];
        if (!cardIds || cardIds.length === 0) {
            return null;
        }
        
        return cardIds.map(cardId => ({
            id: cardId,
            name: this.cardData[cardId] || `未知卡牌 (ID: ${cardId})`
        }));
    }
    
    async detectVersions() {
        console.log('🔍 开始检测版本');
        
        try {
            document.getElementById('detectionStatus').textContent = '正在检测版本文件夹...';
            
            if (window.fileAPI) {
                let scanPath = './data';
                try {
                    const defaultPathResult = await window.fileAPI.getDefaultDataPath();
                    if (defaultPathResult.success) {
                        scanPath = defaultPathResult.path;
                        this.dataPath = scanPath;
                        document.getElementById('dataPathInfo').textContent = `📍 数据路径: ${scanPath}`;
                    } else {
                        document.getElementById('dataPathInfo').textContent = `📍 数据路径: ${scanPath} (相对路径)`;
                    }
                } catch (error) {
                    console.warn('⚠️ 获取默认路径失败，使用相对路径:', error);
                }
                
                const result = await window.fileAPI.scanDirectories(scanPath);
                if (result.success) {
                    this.availableVersions = result.directories.filter(dir => 
                        /^\d+(\.\d+)*$/.test(dir)
                    ).sort((a, b) => this.compareVersions(b, a));
                } else {
                    throw new Error(result.error);
                }
            } else {
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
    
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const diff = (aParts[i] || 0) - (bParts[i] || 0);
            if (diff !== 0) return diff;
        }
        return 0;
    }
    
    populateVersionSelector() {
        // 单版本选择器
        const select = document.getElementById('versionSelect');
        select.innerHTML = '<option value="">请选择版本</option>';
        this.availableVersions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = `版本 ${version}`;
            select.appendChild(option);
        });
        
        // 对比模式选择器
        const oldSelect = document.getElementById('oldVersionSelect');
        const newSelect = document.getElementById('newVersionSelect');
        
        oldSelect.innerHTML = '<option value="">请选择旧版本</option>';
        newSelect.innerHTML = '<option value="">请选择新版本</option>';
        
        this.availableVersions.forEach(version => {
            const oldOption = document.createElement('option');
            oldOption.value = version;
            oldOption.textContent = `版本 ${version}`;
            oldSelect.appendChild(oldOption);
            
            const newOption = document.createElement('option');
            newOption.value = version;
            newOption.textContent = `版本 ${version}`;
            newSelect.appendChild(newOption);
        });
    }
    
    autoSelectLatestVersion() {
        if (this.availableVersions.length > 0) {
            document.getElementById('versionSelect').value = this.availableVersions[0];
            this.onVersionSelect();
        }
    }
    
    showVersionSelector() {
        document.getElementById('versionDetection').style.display = 'none';
        document.getElementById('versionSelector').style.display = 'block';
    }
    
    async onVersionSelect() {
        const version = document.getElementById('versionSelect').value;
        const loadBtn = document.getElementById('loadRulesetsBtn');
        
        loadBtn.disabled = true;
        
        if (!version) {
            document.getElementById('versionInfo').innerHTML = '';
            return;
        }
        
        const isValid = await this.checkVersionFiles(version);
        loadBtn.disabled = !isValid;
    }
    
    async checkVersionFiles(version) {
        try {
            // 设置 DataManager 版本
            window.dataManager.setVersion(version);
            
            // 尝试加载必要文件来验证
            const missingFiles = [];
            
            try {
                await window.dataManager.loadFile('DECK_RULESET', version);
            } catch (error) {
                missingFiles.push('DECK_RULESET.json');
            }
            
            try {
                await window.dataManager.loadFile('DECK_RULESET_RULE', version);
            } catch (error) {
                missingFiles.push('DECK_RULESET_RULE.json');
            }
            
            try {
                await window.dataManager.loadFile('DECK_RULESET_RULE_SUBSET', version);
            } catch (error) {
                missingFiles.push('DECK_RULESET_RULE_SUBSET.json');
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
    
    async loadRulesets() {
        const version = document.getElementById('versionSelect').value;
        console.log('🚀 开始加载规则集:', version);
        
        // 设置 DataManager 版本
        window.dataManager.setVersion(version);
        
        try {
            this.showProgressSection();
            
            this.updateProgress(20, '正在加载规则集...');
            const rulesets = await this.loadDeckRulesets(version);
            console.log('✅ 规则集加载完成:', rulesets.length);
            
            this.updateProgress(50, '正在加载规则详情...');
            const rules = await this.loadRulesetRules(version);
            console.log('✅ 规则详情加载完成:', rules.length);
            
            this.updateProgress(70, '正在加载规则子集关联...');
            const ruleSubsets = await this.loadRulesetRuleSubsets(version);
            console.log('✅ 规则子集关联加载完成:', ruleSubsets.length);
            
            this.updateProgress(85, '正在加载子集定义...');
            await this.loadSubsets(version);
            console.log('✅ 子集定义加载完成:', Object.keys(this.subsets).length);
            
            this.updateProgress(88, '正在加载卡牌数据...');
            await this.loadCardData(version);
            
            this.updateProgress(92, '正在加载子集卡牌映射...');
            await this.loadSubsetCards(version);
            
            this.updateProgress(95, '正在关联数据...');
            this.allRulesets = this.associateData(rulesets, rules, ruleSubsets);
            this.allRules = rules; // 保存原始规则数据用于按规则查看
            console.log('✅ 数据关联完成:', this.allRulesets.length);
            
            this.updateProgress(100, '加载完成！');
            
            this.showRulesetList();
            
        } catch (error) {
            console.error('❌ 加载规则集失败:', error);
            alert('加载规则集失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    async loadDeckRulesets(version) {
        const data = await window.dataManager.loadFile('DECK_RULESET', version);
        if (!data) {
            throw new Error('无法读取 DECK_RULESET.json');
        }
        return data.Records || [];
    }
    
    async loadRulesetRules(version) {
        const data = await window.dataManager.loadFile('DECK_RULESET_RULE', version);
        if (!data) {
            throw new Error('无法读取 DECK_RULESET_RULE.json');
        }
        return data.Records || [];
    }
    
    async loadSubsets(version) {
        // 加载 SUBSET.json
        let subsetData = null;
        try {
            subsetData = await window.dataManager.loadFile('SUBSET', version);
        } catch (error) {
            console.warn('未能加载子集定义数据，子集详情功能可能不可用');
        }
        
        if (subsetData && subsetData.Records) {
            subsetData.Records.forEach(record => {
                this.subsets[record.m_ID] = record;
            });
            // 填充 allSubsets 用于按子集查看
            this.allSubsets = subsetData.Records.map(record => ({
                m_id: record.m_ID,
                m_assetFlags: record.m_assetFlags
            }));
            console.log(`✅ 加载了 ${this.allSubsets.length} 个子集`);
        }
        
        // 加载 SUBSET_RULE.json
        let subsetRuleData = null;
        try {
            subsetRuleData = await window.dataManager.loadFile('SUBSET_RULE', version);
        } catch (error) {
            console.warn('未能加载子集规则数据');
        }
        
        if (subsetRuleData && subsetRuleData.Records) {
            subsetRuleData.Records.forEach(record => {
                if (!this.subsetRules[record.m_subsetId]) {
                    this.subsetRules[record.m_subsetId] = [];
                }
                this.subsetRules[record.m_subsetId].push(record);
            });
            // 填充 allSubsetRules 用于按子集查看
            this.allSubsetRules = subsetRuleData.Records;
            console.log(`✅ 加载了 ${subsetRuleData.Records.length} 条子集规则`);
        }
    }
    
    async loadRulesetRuleSubsets(version) {
        const data = await window.dataManager.loadFile('DECK_RULESET_RULE_SUBSET', version);
        if (!data) {
            throw new Error('无法读取 DECK_RULESET_RULE_SUBSET.json');
        }
        return data.Records || [];
    }
    
    associateData(rulesets, rules, ruleSubsets) {
        console.log('🔗 开始关联数据...');
        
        // 创建规则子集映射
        const ruleSubsetMap = new Map();
        ruleSubsets.forEach(rs => {
            const ruleId = rs.m_deckRulesetRuleId;
            if (!ruleSubsetMap.has(ruleId)) {
                ruleSubsetMap.set(ruleId, []);
            }
            ruleSubsetMap.get(ruleId).push(rs.m_subsetId);
        });
        
        // 为每个规则集关联规则
        const result = rulesets.map(ruleset => {
            const rulesetId = ruleset.m_ID;
            
            // 找到属于这个规则集的所有规则
            const rulesetRules = rules.filter(rule => rule.m_deckRulesetId === rulesetId)
                .map(rule => ({
                    id: rule.m_ID,
                    ruleType: rule.m_ruleType,
                    ruleTypeName: this.ruleTypes[rule.m_ruleType] || `未知类型(${rule.m_ruleType})`,
                    appliesToSubsetId: rule.m_appliesToSubsetId,
                    appliesToIsNot: rule.m_appliesToIsNot,
                    ruleIsNot: rule.m_ruleIsNot,
                    minValue: rule.m_minValue,
                    maxValue: rule.m_maxValue,
                    tagId: rule.m_tagId,
                    tagMinValue: rule.m_tagMinValue,
                    tagMaxValue: rule.m_tagMaxValue,
                    stringValue: rule.m_stringValue,
                    errorString: this.extractLocalizedText(rule.m_errorString),
                    showInvalidCards: rule.m_showInvalidCards,
                    subsets: ruleSubsetMap.get(rule.m_ID) || []
                }));
            
            return {
                id: rulesetId,
                assetFlags: ruleset.m_assetFlags,
                ruleCount: rulesetRules.length,
                rules: rulesetRules
            };
        });
        
        console.log('✅ 数据关联完成，共生成', result.length, '个规则集');
        return result;
    }
    
    extractLocalizedText(locData) {
        if (!locData || !locData.m_locValues || !Array.isArray(locData.m_locValues)) {
            return '';
        }
        if (locData.m_locValues[12]) return locData.m_locValues[12];
        if (locData.m_locValues[13]) return locData.m_locValues[13];
        if (locData.m_locValues[0]) return locData.m_locValues[0];
        return locData.m_locValues.find(val => val && val.trim()) || '';
    }
    
    showProgressSection() {
        document.querySelector('.version-selection-section').style.display = 'none';
        document.getElementById('loadProgressSection').style.display = 'block';
    }
    
    hideProgressSection() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
    }
    
    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }
    
    showRulesetList() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.getElementById('rulesetListSection').style.display = 'block';
        
        // 初始化过滤数组
        this.filteredSubsets = [...this.allSubsets];
        this.filteredRules = [...this.allRules];
        this.filteredSubsetRules = [...this.allSubsetRules];
        
        this.updateRulesetSummary();
        this.filterRulesets();
    }
    
    updateRulesetSummary() {
        const summary = document.getElementById('rulesetSummary');
        const totalRules = this.allRulesets.reduce((sum, rs) => sum + rs.ruleCount, 0);
        
        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-value">${this.allRulesets.length}</span>
                <span class="summary-label">规则集总数</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${totalRules}</span>
                <span class="summary-label">规则总数</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${this.allSubsets.length}</span>
                <span class="summary-label">子集总数</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${this.allSubsetRules.length}</span>
                <span class="summary-label">子集规则总数</span>
            </div>
        `;
    }
    
    filterRulesets() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        
        this.pagination.reset(); // 搜索/筛选时重置到第一页
        
        if (this.viewMode === 'subset') {
            // 按子集查看模式：搜索子集ID
            this.filteredSubsets = this.allSubsets.filter(subset => {
                // 基本搜索过滤
                if (searchText && !subset.m_id.toString().includes(searchText)) {
                    return false;
                }
                
                // 应用子集筛选选项
                const filterWithRules = document.getElementById('filterSubsetWithRules').checked;
                const filterWithCards = document.getElementById('filterSubsetWithCards').checked;
                
                // 如果勾选"有规则映射"（只检查DECK_RULESET_RULE_SUBSET反向关联）
                if (filterWithRules) {
                    let hasMapping = false;
                    for (const ruleset of this.allRulesets) {
                        for (const rule of ruleset.rules) {
                            if (rule.subsets && rule.subsets.includes(subset.m_id)) {
                                hasMapping = true;
                                break;
                            }
                        }
                        if (hasMapping) break;
                    }
                    if (!hasMapping) {
                        return false;
                    }
                }
                
                // 如果勾选"有卡牌数据"
                if (filterWithCards) {
                    const hasCards = this.subsetCards[subset.m_id] && this.subsetCards[subset.m_id].length > 0;
                    if (!hasCards) {
                        return false;
                    }
                }
                
                return true;
            });
            
            // 排序子集
            this.sortItems(this.filteredSubsets, 'subset');
        } else if (this.viewMode === 'rule') {
            // 按规则查看模式：搜索规则ID或规则集ID
            this.filteredRules = this.allRules.filter(rule => {
                return !searchText || rule.m_ID.toString().includes(searchText) || rule.m_deckRulesetId.toString().includes(searchText);
            });
            
            // 排序规则
            this.sortItems(this.filteredRules, 'rule');
        } else if (this.viewMode === 'subsetRule') {
            // 按子集规则查看模式：搜索规则ID或子集ID
            this.filteredSubsetRules = this.allSubsetRules.filter(rule => {
                return !searchText || rule.m_ID.toString().includes(searchText) || rule.m_subsetId.toString().includes(searchText);
            });
            
            // 排序子集规则
            this.sortItems(this.filteredSubsetRules, 'subsetRule');
        } else {
            // 按规则集查看模式：搜索规则集ID
            this.filteredRulesets = this.allRulesets.filter(ruleset => {
                return !searchText || ruleset.id.toString().includes(searchText);
            });
            
            // 排序规则集
            this.sortItems(this.filteredRulesets, 'ruleset');
        }
        
        this.displayRulesets();
    }
    
    sortItems(items, type) {
        items.sort((a, b) => {
            let aValue, bValue;
            
            if (this.sortBy === 'id') {
                if (type === 'ruleset') {
                    aValue = a.id;
                    bValue = b.id;
                } else if (type === 'rule') {
                    aValue = a.m_ID;
                    bValue = b.m_ID;
                } else if (type === 'subset') {
                    aValue = a.m_id;
                    bValue = b.m_id;
                } else if (type === 'subsetRule') {
                    aValue = a.m_ID;
                    bValue = b.m_ID;
                }
            } else if (this.sortBy === 'ruleCount') {
                if (type === 'ruleset') {
                    aValue = a.ruleCount;
                    bValue = b.ruleCount;
                } else if (type === 'rule') {
                    aValue = a.m_deckRulesetId;
                    bValue = b.m_deckRulesetId;
                } else if (type === 'subset') {
                    // 子集模式：计算该子集的规则数量
                    aValue = this.allSubsetRules.filter(r => r.m_subsetId === a.m_id).length;
                    bValue = this.allSubsetRules.filter(r => r.m_subsetId === b.m_id).length;
                } else if (type === 'subsetRule') {
                    aValue = a.m_subsetId;
                    bValue = b.m_subsetId;
                }
            }
            
            if (this.sortOrder === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });
    }
    
    displayRulesets() {
        const container = document.getElementById('rulesetList');
        
        // 按规则查看模式
        if (this.viewMode === 'rule') {
            if (this.filteredRules.length === 0) {
                document.getElementById('topPagination').innerHTML = '';
                container.innerHTML = '<div class="no-results">没有找到符合条件的规则</div>';
                document.getElementById('bottomPagination').innerHTML = '';
                return;
            }
            
            let displayRules = [...this.filteredRules];
            if (this.reverseOrder) {
                displayRules.reverse();
            }
            
            // 生成分页控件
            const topPagination = this.pagination.generate(displayRules.length);
            const bottomPagination = this.pagination.generate(displayRules.length);
            
            // 获取当前页数据
            const paginatedRules = this.pagination.getPaginatedData(displayRules);
            
            const rulesHtml = paginatedRules.map(rule => {
                const ruleTypeName = this.ruleTypes[rule.m_ruleType] || `未知类型(${rule.m_ruleType})`;
                
                // 查找关联的子集数据
                let subsets = [];
                for (const ruleset of this.allRulesets) {
                    const ruleInRuleset = ruleset.rules.find(r => r.id === rule.m_ID);
                    if (ruleInRuleset && ruleInRuleset.subsets) {
                        subsets = ruleInRuleset.subsets;
                        break;
                    }
                }
                
                return `
                <div class="ruleset-item" onclick="rulesetSystem.showRuleDetails(${rule.m_ID})" style="cursor: pointer;">
                    <div class="ruleset-item-header">
                        <div class="ruleset-name">
                            规则 ${rule.m_ID} - ${ruleTypeName}
                        </div>
                        <div class="ruleset-badge">规则集 ${rule.m_deckRulesetId}</div>
                    </div>
                    <div class="ruleset-info">
                        <div class="ruleset-stat">
                            <span class="stat-label">规则ID:</span>
                            <span class="stat-value">${rule.m_ID}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">规则集ID:</span>
                            <span class="stat-value">${rule.m_deckRulesetId}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">类型:</span>
                            <span class="stat-value">${rule.m_ruleType}</span>
                        </div>
                        ${rule.m_appliesToSubsetId ? `
                        <div class="ruleset-stat">
                            <span class="stat-label">应用子集:</span>
                            <span class="stat-value">${rule.m_appliesToSubsetId}</span>
                        </div>
                        ` : ''}
                        ${subsets.length > 0 ? `
                        <div class="ruleset-stat">
                            <span class="stat-label">关联子集:</span>
                            <span class="stat-value" style="display: flex; flex-wrap: wrap; gap: 4px;">${subsets.map(subsetId => {
                                const note = this.userNotes.SUBSET[subsetId];
                                const title = note ? note : '';
                                return `<span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 10px; font-size: 12px;" title="${title}" onclick="event.stopPropagation(); rulesetSystem.showSubsetDetails(${subsetId});">🗂️ ${subsetId}</span>`;
                            }).join('')}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                `;
            }).join('');
            
            document.getElementById('topPagination').innerHTML = topPagination;
            container.innerHTML = rulesHtml;
            document.getElementById('bottomPagination').innerHTML = bottomPagination;
            return;
        }
        
        // 按子集规则查看模式
        if (this.viewMode === 'subsetRule') {
            if (this.filteredSubsetRules.length === 0) {
                document.getElementById('topPagination').innerHTML = '';
                container.innerHTML = '<div class="no-results">没有找到符合条件的子集规则</div>';
                document.getElementById('bottomPagination').innerHTML = '';
                return;
            }
            
            let displaySubsetRules = [...this.filteredSubsetRules];
            if (this.reverseOrder) {
                displaySubsetRules.reverse();
            }
            
            // 生成分页控件
            const topPagination = this.pagination.generate(displaySubsetRules.length);
            const bottomPagination = this.pagination.generate(displaySubsetRules.length);
            
            // 获取当前页数据
            const paginatedSubsetRules = this.pagination.getPaginatedData(displaySubsetRules);
            
            const subsetRulesHtml = paginatedSubsetRules.map(rule => {
                const tagName = rule.m_tagId ? (window.getGameTagName ? window.getGameTagName(rule.m_tagId) : rule.m_tagId) : '无';
                const ruleTypeName = this.subsetRuleTypes ? (this.subsetRuleTypes[rule.m_ruleType] || `类型${rule.m_ruleType}`) : `类型${rule.m_ruleType}`;
                
                return `
                <div class="ruleset-item" style="cursor: pointer;">
                    <div class="ruleset-item-header">
                        <div class="ruleset-name">
                            子集规则 ${rule.m_ID} - ${ruleTypeName}
                        </div>
                        <div class="ruleset-badge">子集 ${rule.m_subsetId}</div>
                    </div>
                    <div class="ruleset-info">
                        <div class="ruleset-stat">
                            <span class="stat-label">规则ID:</span>
                            <span class="stat-value">${rule.m_ID}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">子集ID:</span>
                            <span class="stat-value">${rule.m_subsetId}</span>
                        </div>
                        ${rule.m_tagId ? `
                        <div class="ruleset-stat">
                            <span class="stat-label">应用标签:</span>
                            <span class="stat-value" style="cursor: pointer; color: #3498db;" onclick="rulesetSystem.showTagDetails(${rule.m_tagId}); event.stopPropagation();">${tagName}</span>
                        </div>
                        ` : ''}
                        ${rule.m_minValue !== undefined || rule.m_maxValue !== undefined ? `
                        <div class="ruleset-stat">
                            <span class="stat-label">值范围:</span>
                            <span class="stat-value">${rule.m_minValue ?? 0} - ${rule.m_maxValue ?? 0}</span>
                        </div>
                        ` : ''}
                        ${rule.m_ruleIsNot !== undefined ? `
                        <div class="ruleset-stat">
                            <span class="stat-label">反转规则:</span>
                            <span class="stat-value">${rule.m_ruleIsNot ? '✅ 是' : '❌ 否'}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                `;
            }).join('');
            
            document.getElementById('topPagination').innerHTML = topPagination;
            container.innerHTML = subsetRulesHtml;
            document.getElementById('bottomPagination').innerHTML = bottomPagination;
            return;
        }
        
        // 按子集查看模式
        if (this.viewMode === 'subset') {
            if (this.filteredSubsets.length === 0) {
                document.getElementById('topPagination').innerHTML = '';
                container.innerHTML = '<div class="no-results">没有找到符合条件的子集</div>';
                document.getElementById('bottomPagination').innerHTML = '';
                return;
            }
            
            let displaySubsets = [...this.filteredSubsets];
            if (this.reverseOrder) {
                displaySubsets.reverse();
            }
            
            // 生成分页控件
            const topPagination = this.pagination.generate(displaySubsets.length);
            const bottomPagination = this.pagination.generate(displaySubsets.length);
            
            // 获取当前页数据
            const paginatedSubsets = this.pagination.getPaginatedData(displaySubsets);
            
            const subsetsHtml = paginatedSubsets.map(subset => {
                const subsetNote = this.userNotes.SUBSET[subset.m_id] || '';
                
                // 查找该子集的所有规则（SUBSET_RULE中的）
                const subsetRules = this.allSubsetRules.filter(r => r.m_subsetId === subset.m_id);
                
                // 查找通过DECK_RULESET_RULE_SUBSET关联的规则
                const linkedRules = [];
                for (const ruleset of this.allRulesets) {
                    for (const rule of ruleset.rules) {
                        if (rule.subsets && rule.subsets.includes(subset.m_id)) {
                            linkedRules.push({
                                id: rule.id,
                                rulesetId: ruleset.id,
                                ruleTypeName: rule.ruleTypeName
                            });
                        }
                    }
                }
                
                return `
                <div class="ruleset-item" onclick="rulesetSystem.showSubsetDetails(${subset.m_id})">
                    <div class="ruleset-item-header">
                        <div class="ruleset-name">
                            子集 ${subset.m_id}
                            ${subsetNote ? `<span style="color: #27ae60; font-size: 13px; margin-left: 8px;">(📝 ${subsetNote})</span>` : ''}
                        </div>
                        <div class="ruleset-badge">${subsetRules.length} 条规则${linkedRules.length > 0 ? ` + ${linkedRules.length} 条映射` : ''}</div>
                    </div>
                    <div class="ruleset-info">
                        <div class="ruleset-stat">
                            <span class="stat-label">子集ID:</span>
                            <span class="stat-value">${subset.m_id}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">资产标志:</span>
                            <span class="stat-value">${subset.m_assetFlags ?? 0}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">规则数量:</span>
                            <span class="stat-value">${subsetRules.length}</span>
                        </div>
                        ${linkedRules.length > 0 ? `
                        <div class="ruleset-stat">
                            <span class="stat-label">规则映射:</span>
                            <span class="stat-value" style="display: flex; flex-wrap: wrap; gap: 4px;">${linkedRules.slice(0, 5).map(lr => {
                                const ruleNote = this.userNotes.DECK_RULESET_RULE[lr.id];
                                const title = ruleNote ? ruleNote : lr.ruleTypeName;
                                return `<span style="background: #fff3e0; color: #f57c00; padding: 2px 8px; border-radius: 10px; font-size: 12px; cursor: pointer;" title="${title}" onclick="event.stopPropagation(); rulesetSystem.showRuleDetails(${lr.id});">📋 ${lr.id}</span>`;
                            }).join('')}${linkedRules.length > 5 ? `<span style="color: #999; font-size: 12px;">+${linkedRules.length - 5}更多</span>` : ''}</span>
                        </div>
                        ` : ''}
                        ${(() => {
                            const subsetCards = this.getSubsetCardNames(subset.m_id);
                            return subsetCards && subsetCards.length > 0 ? `
                        <div class="ruleset-stat" style="grid-column: 1 / -1;">
                            <span class="stat-label">卡牌列表 (${subsetCards.length}张):</span>
                            <div style="margin-top: 8px; max-height: 150px; overflow-y: auto; background: #f8f9fa; padding: 8px; border-radius: 4px;">
                                ${subsetCards.map(card => `<div style="padding: 4px 0; border-bottom: 1px solid #dee2e6;"><span style="color: #6c757d;">ID ${card.id}:</span> <span style="color: #3498db; font-weight: bold;">${card.name}</span></div>`).join('')}
                            </div>
                        </div>
                        ` : '';
                        })()}
                    </div>
                </div>
                `;
            }).join('');
            
            document.getElementById('topPagination').innerHTML = topPagination;
            container.innerHTML = subsetsHtml;
            document.getElementById('bottomPagination').innerHTML = bottomPagination;
            return;
        }
        
        // 按规则集查看模式（原有逻辑）
        if (this.filteredRulesets.length === 0) {
            document.getElementById('topPagination').innerHTML = '';
            container.innerHTML = '<div class="no-results">没有找到符合条件的规则集</div>';
            document.getElementById('bottomPagination').innerHTML = '';
            return;
        }
        
        let displayRulesets = [...this.filteredRulesets];
        if (this.reverseOrder) {
            displayRulesets.reverse();
        }
        
        // 生成分页控件
        const topPagination = this.pagination.generate(displayRulesets.length);
        const bottomPagination = this.pagination.generate(displayRulesets.length);
        
        // 获取当前页数据
        const paginatedRulesets = this.pagination.getPaginatedData(displayRulesets);
        
        const rulesetsHtml = paginatedRulesets.map(ruleset => {
            const rulesetNote = this.userNotes.DECK_RULESET[ruleset.id] || '';
            const isSelected = this.selectedRulesets.has(ruleset.id);
            
            if (this.compareMode) {
                return `
                <div class="ruleset-item ${isSelected ? 'selected' : ''}" onclick="rulesetSystem.toggleRulesetSelection(${ruleset.id})" style="cursor: pointer;">
                    <div class="ruleset-item-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); rulesetSystem.toggleRulesetSelection(${ruleset.id})" style="width: 18px; height: 18px; cursor: pointer;">
                            <div class="ruleset-name">
                                规则集 ${ruleset.id}
                                ${rulesetNote ? `<span style="color: #27ae60; font-size: 13px; margin-left: 8px;">(📝 ${rulesetNote})</span>` : ''}
                            </div>
                        </div>
                        <div class="ruleset-badge">${ruleset.ruleCount} 条规则</div>
                    </div>
                    <div class="ruleset-info">
                        <div class="ruleset-stat">
                            <span class="stat-label">ID:</span>
                            <span class="stat-value">${ruleset.id}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">资产标志:</span>
                            <span class="stat-value">${ruleset.assetFlags}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">规则数量:</span>
                            <span class="stat-value">${ruleset.ruleCount}</span>
                        </div>
                    </div>
                </div>
            `;
            } else {
                return `
                <div class="ruleset-item" onclick="rulesetSystem.showRulesetDetails(${ruleset.id})">
                    <div class="ruleset-item-header">
                        <div class="ruleset-name">
                            规则集 ${ruleset.id}
                            ${rulesetNote ? `<span style="color: #27ae60; font-size: 13px; margin-left: 8px;">(📝 ${rulesetNote})</span>` : ''}
                        </div>
                        <div class="ruleset-badge">${ruleset.ruleCount} 条规则</div>
                    </div>
                    <div class="ruleset-info">
                        <div class="ruleset-stat">
                            <span class="stat-label">ID:</span>
                            <span class="stat-value">${ruleset.id}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">资产标志:</span>
                            <span class="stat-value">${ruleset.assetFlags}</span>
                        </div>
                        <div class="ruleset-stat">
                            <span class="stat-label">规则数量:</span>
                            <span class="stat-value">${ruleset.ruleCount}</span>
                        </div>
                    </div>
                </div>
            `;
            }
        }).join('');
        
        document.getElementById('topPagination').innerHTML = topPagination;
        container.innerHTML = rulesetsHtml;
        document.getElementById('bottomPagination').innerHTML = bottomPagination;
    }
    
    showRulesetDetails(rulesetId) {
        const ruleset = this.allRulesets.find(rs => rs.id === rulesetId);
        if (!ruleset) return;
        
        document.getElementById('modalRulesetName').textContent = `规则集 ${ruleset.id}`;
        
        const currentNote = this.userNotes.DECK_RULESET[rulesetId] || '';
        
        const details = document.getElementById('rulesetDetails');
        details.innerHTML = `
            <div class="ruleset-details-info">
                <h4>基本信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>规则集ID:</strong> ${ruleset.id}
                    </div>
                    <div class="info-item">
                        <strong>资产标志:</strong> ${ruleset.assetFlags}
                    </div>
                    <div class="info-item">
                        <strong>规则数量:</strong> ${ruleset.ruleCount}
                    </div>
                </div>
            </div>
            
            <div class="ruleset-details-info" style="margin-top: 20px;">
                <h4>备注</h4>
                <textarea id="rulesetNoteInput" style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; box-sizing: border-box;" placeholder="在此添加规则集备注...">${currentNote}</textarea>
            </div>
            
            <div class="ruleset-details-rules">
                <h4>规则列表 (共${ruleset.rules.length}条)</h4>
                <div class="rule-list">
                    ${ruleset.rules.map(rule => {
                        const ruleNote = this.userNotes.DECK_RULESET_RULE[rule.id] || '';
                        return `
                        <div class="rule-list-item">
                            <div class="rule-header">
                                <span class="rule-id" style="cursor: pointer;" onclick="rulesetSystem.editRuleNote(${rule.id})" title="点击编辑备注">
                                    规则 #${rule.id}
                                    ${ruleNote ? `<span style="color: #27ae60; font-size: 12px; margin-left: 8px;">(📝 ${ruleNote})</span>` : ''}
                                </span>
                                <span class="rule-type">${rule.ruleTypeName}</span>
                            </div>
                            <div class="rule-details">
                                ${rule.minValue !== 0 || rule.maxValue !== 0 ? `
                                    <div class="rule-detail-item">
                                        <strong>范围:</strong> ${rule.minValue} - ${rule.maxValue}
                                    </div>
                                ` : ''}
                                ${rule.appliesToSubsetId ? `
                                    <div class="rule-detail-item">
                                        <strong>应用于子集:</strong> ${rule.appliesToSubsetId}
                                        ${this.userNotes.SUBSET[rule.appliesToSubsetId] ? `<span style="color: #27ae60; font-size: 12px;"> (${this.userNotes.SUBSET[rule.appliesToSubsetId]})</span>` : ''}
                                        <button class="view-subset-btn" onclick="rulesetSystem.showSubsetDetails(${rule.appliesToSubsetId}); return false;">🔍 查看</button>
                                    </div>
                                ` : ''}
                                ${rule.tagId ? `
                                    <div class="rule-detail-item">
                                        <strong>标签:</strong> ${window.formatGameTag ? window.formatGameTag(rule.tagId) : rule.tagId}
                                        <br>
                                        <strong>标签范围:</strong> ${rule.tagMinValue} - ${rule.tagMaxValue}
                                    </div>
                                ` : ''}
                                ${rule.stringValue ? `
                                    <div class="rule-detail-item">
                                        <strong>字符串值:</strong> ${rule.stringValue}
                                    </div>
                                ` : ''}
                                ${rule.errorString ? `
                                    <div class="rule-detail-item">
                                        <strong>错误消息:</strong> ${rule.errorString}
                                    </div>
                                ` : ''}
                                ${rule.subsets.length > 0 ? `
                                    <div class="rule-detail-item">
                                        <strong>关联子集:</strong> ${rule.subsets.map(subsetId => {
                                            const note = this.userNotes.SUBSET[subsetId];
                                            const noteText = note ? ` <span style="color: #27ae60; font-size: 12px;">(${note})</span>` : '';
                                            return `<a href="#" class="subset-link" onclick="rulesetSystem.showSubsetDetails(${subsetId}); return false;">${subsetId}</a>${noteText}`;
                                        }).join(', ')}
                                    </div>
                                ` : ''}
                                <div class="rule-detail-item">
                                    <strong>反转应用:</strong> ${rule.appliesToIsNot ? '是' : '否'}
                                    &nbsp;&nbsp;
                                    <strong>反转规则:</strong> ${rule.ruleIsNot ? '是' : '否'}
                                    &nbsp;&nbsp;
                                    <strong>显示无效卡牌:</strong> ${rule.showInvalidCards ? '是' : '否'}
                                </div>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;  
        
        document.getElementById('rulesetModal').style.display = 'block';
        
        // 添加失去焦点时自动保存规则集备注
        const rulesetNoteInput = document.getElementById('rulesetNoteInput');
        if (rulesetNoteInput) {
            rulesetNoteInput.addEventListener('blur', () => {
                this.saveRulesetNote(rulesetId);
            });
        }
    }    closeModal() {
        document.getElementById('rulesetModal').style.display = 'none';
    }
    
    showSubsetDetails(subsetId) {
        const subset = this.subsets[subsetId];
        if (!subset) {
            alert(`未找到子集 ID: ${subsetId}`);
            return;
        }
        
        document.getElementById('modalSubsetName').textContent = `子集 ${subsetId}`;
        
        const currentNote = this.userNotes.SUBSET[subsetId] || '';
        
        // 查找使用此子集的规则
        const rulesUsingSubset = this.allRules.filter(rule => 
            rule.m_appliesToSubsetId === subsetId || 
            (rule.m_subsets && rule.m_subsets.includes(subsetId))
        );
        
        const details = document.getElementById('subsetDetails');
        details.innerHTML = `
            <div class="ruleset-details-info">
                <h4>基本信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>子集ID:</strong> ${subset.m_ID}
                    </div>
                    <div class="info-item">
                        <strong>资产标志:</strong> ${subset.m_assetFlags || 'N/A'}
                    </div>
                    ${rulesUsingSubset.length > 0 ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <strong>使用此子集的规则:</strong> 
                        <button onclick="rulesetSystem.showRulesUsingSubset(${subsetId})" style="margin-left: 10px; padding: 5px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                            📋 查看 ${rulesUsingSubset.length} 条规则
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="ruleset-details-info" style="margin-top: 20px;">
                <h4>备注</h4>
                <textarea id="subsetNoteInput" style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; box-sizing: border-box;" placeholder="在此添加子集备注...">${currentNote}</textarea>
            </div>
            
            <div class="ruleset-details-rules">
                <h4>子集规则</h4>
                <div class="rule-list">
                    ${this.subsetRules[subsetId] && this.subsetRules[subsetId].length > 0 ? this.subsetRules[subsetId].map((rule, index) => {
                        const ruleTypeName = this.subsetRuleTypes[rule.m_ruleType] || `未知类型(${rule.m_ruleType})`;
                        // 如果是卡牌数据库ID规则（类型3），获取该子集包含的所有卡牌
                        const subsetCards = (rule.m_ruleType === 3) ? this.getSubsetCardNames(subsetId) : null;
                        return `
                            <div class="rule-list-item">
                                <div class="rule-header">
                                    <span class="rule-id">子集规则 #${rule.m_ID}</span>
                                    <span class="rule-type">${ruleTypeName}</span>
                                </div>
                                <div class="rule-details">
                                    <div class="rule-detail-item">
                                        <strong>规则ID:</strong> ${rule.m_ID}
                                        &nbsp;&nbsp;
                                        <strong>子集ID:</strong> ${rule.m_subsetId}
                                    </div>
                                    ${rule.m_tagId !== undefined ? `
                                        <div class="rule-detail-item">
                                            <strong>标签:</strong> ${window.formatGameTag ? window.formatGameTag(rule.m_tagId) : rule.m_tagId}
                                        </div>
                                    ` : ''}
                                    ${rule.m_minValue !== undefined || rule.m_maxValue !== undefined ? `
                                        <div class="rule-detail-item">
                                            <strong>最小值:</strong> ${rule.m_minValue !== undefined ? rule.m_minValue : 'N/A'}
                                            &nbsp;&nbsp;
                                            <strong>最大值:</strong> ${rule.m_maxValue !== undefined ? rule.m_maxValue : 'N/A'}
                                        </div>
                                    ` : ''}
                                    ${rule.m_intValue !== undefined ? `
                                        <div class="rule-detail-item">
                                            <strong>整数值:</strong> ${rule.m_intValue}
                                        </div>
                                    ` : ''}
                                    ${subsetCards && subsetCards.length > 0 ? `
                                        <div class="rule-detail-item">
                                            <strong>包含卡牌 (${subsetCards.length} 张):</strong>
                                            <div style="margin-top: 8px; max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                                                ${subsetCards.map(card => `<div style="padding: 4px 0; border-bottom: 1px solid #dee2e6;"><span style="color: #6c757d;">ID ${card.id}:</span> <span style="color: #3498db; font-weight: bold;">${card.name}</span></div>`).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                    ${rule.m_stringValue ? `
                                        <div class="rule-detail-item">
                                            <strong>字符串值:</strong> ${rule.m_stringValue}
                                        </div>
                                    ` : ''}
                                    <div class="rule-detail-item">
                                        <strong>反转规则:</strong> ${rule.m_ruleIsNot ? '是' : '否'}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') : '<p style="color: #6c757d; text-align: center; padding: 20px;">该子集没有规则</p>'}
                </div>
            </div>
        `;
        
        document.getElementById('subsetModal').style.display = 'block';
        
        // 添加失去焦点时自动保存
        const noteInput = document.getElementById('subsetNoteInput');
        if (noteInput) {
            noteInput.addEventListener('blur', () => {
                this.saveSubsetNote(subsetId, true);
            });
        }
    }
    
    closeSubsetModal() {
        document.getElementById('subsetModal').style.display = 'none';
    }
    
    // 显示使用指定子集的所有规则
    showRulesUsingSubset(subsetId) {
        const rulesUsingSubset = this.allRules.filter(rule => 
            rule.m_appliesToSubsetId === subsetId || 
            (rule.m_subsets && rule.m_subsets.includes(subsetId))
        );
        
        if (rulesUsingSubset.length === 0) {
            alert(`没有规则使用子集 ${subsetId}`);
            return;
        }
        
        // 创建弹窗HTML
        const modalHtml = `
            <div id="rulesUsingSubsetModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 8px; max-width: 800px; max-height: 80vh; overflow-y: auto; width: 90%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #2c3e50;">📋 使用子集 ${subsetId} 的规则</h3>
                        <button onclick="rulesetSystem.closeRulesUsingSubsetModal()" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">✖ 关闭</button>
                    </div>
                    <div style="color: #7f8c8d; margin-bottom: 15px;">共 ${rulesUsingSubset.length} 条规则使用此子集</div>
                    <div style="display: grid; gap: 12px;">
                        ${rulesUsingSubset.map(rule => {
                            const ruleTypeName = this.ruleTypes[rule.m_ruleType] || `未知类型(${rule.m_ruleType})`;
                            return `
                                <div onclick="rulesetSystem.showRuleDetailsFromSubsetModal(${rule.m_ID})" style="background: #f8f9fa; padding: 15px; border-radius: 6px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s;" onmouseover="this.style.borderColor='#3498db'; this.style.background='#e3f2fd';" onmouseout="this.style.borderColor='transparent'; this.style.background='#f8f9fa';">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <strong style="color: #2c3e50; font-size: 15px;">规则 #${rule.m_ID}</strong>
                                        <span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;">${ruleTypeName}</span>
                                    </div>
                                    <div style="font-size: 13px; color: #7f8c8d;">
                                        ${rule.m_appliesToSubsetId ? `应用于子集: ${rule.m_appliesToSubsetId}` : ''}
                                        ${rule.m_tagId ? ` | 标签: ${rule.m_tagId}` : ''}
                                        ${rule.m_minValue !== undefined || rule.m_maxValue !== undefined ? ` | 范围: ${rule.m_minValue ?? 0} - ${rule.m_maxValue ?? 0}` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // 移除旧的弹窗（如果存在）
        const oldModal = document.getElementById('rulesUsingSubsetModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // 添加新弹窗
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // 关闭规则列表弹窗
    closeRulesUsingSubsetModal() {
        const modal = document.getElementById('rulesUsingSubsetModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // 从子集规则列表弹窗中显示规则详情
    showRuleDetailsFromSubsetModal(ruleId) {
        // 先关闭规则列表弹窗
        this.closeRulesUsingSubsetModal();
        // 显示规则详情
        this.showRuleDetails(ruleId);
    }
    
    saveSubsetNote(subsetId, silent = false) {
        const noteInput = document.getElementById('subsetNoteInput');
        if (!noteInput) return;
        
        const note = noteInput.value.trim();
        
        if (note) {
            this.userNotes.SUBSET[subsetId] = note;
        } else {
            delete this.userNotes.SUBSET[subsetId];
        }
        
        this.saveUserNotes().then(success => {
            if (success) {
                console.log(`✅ 子集 ${subsetId} 备注已保存`);
                // 刷新当前显示的规则集列表
                this.refreshCurrentView();
            } else {
                console.error(`❌ 子集 ${subsetId} 备注保存失败`);
            }
        });
    }
    
    saveRulesetNote(rulesetId) {
        const noteInput = document.getElementById('rulesetNoteInput');
        if (!noteInput) return;
        
        const note = noteInput.value.trim();
        
        if (note) {
            this.userNotes.DECK_RULESET[rulesetId] = note;
        } else {
            delete this.userNotes.DECK_RULESET[rulesetId];
        }
        
        this.saveUserNotes().then(success => {
            if (success) {
                console.log(`✅ 规则集 ${rulesetId} 备注已保存`);
                // 刷新规则集列表以显示更新的备注
                this.displayRulesets();
            } else {
                console.error(`❌ 规则集 ${rulesetId} 备注保存失败`);
            }
        });
    }
    
    // 刷新当前视图以显示最新备注
    refreshCurrentView() {
        // 如果规则集模态框是打开的，刷新它
        const rulesetModal = document.getElementById('rulesetModal');
        if (rulesetModal && rulesetModal.style.display === 'block') {
            // 查找当前显示的规则集ID
            const modalTitle = document.getElementById('modalRulesetName').textContent;
            const match = modalTitle.match(/规则集 (\d+)/);
            if (match) {
                const rulesetId = parseInt(match[1]);
                this.showRulesetDetails(rulesetId);
            }
        }
    }
    
    // 编辑规则备注
    editRuleNote(ruleId) {
        this.currentEditingRuleId = ruleId;
        const currentNote = this.userNotes.DECK_RULESET_RULE[ruleId] || '';
        
        document.getElementById('modalRuleNoteTitle').textContent = `编辑规则 #${ruleId} 备注`;
        document.getElementById('ruleNoteInput').value = currentNote;
        document.getElementById('ruleNoteModal').style.display = 'block';
        
        // 自动聚焦到输入框
        setTimeout(() => {
            document.getElementById('ruleNoteInput').focus();
        }, 100);
    }
    
    // 关闭规则备注模态框
    closeRuleNoteModal() {
        document.getElementById('ruleNoteModal').style.display = 'none';
        this.currentEditingRuleId = null;
    }
    
    // 从模态框保存规则备注
    saveRuleNoteFromModal() {
        const ruleId = this.currentEditingRuleId;
        if (!ruleId) return;
        
        const noteInput = document.getElementById('ruleNoteInput');
        const note = noteInput.value.trim();
        
        if (note) {
            this.userNotes.DECK_RULESET_RULE[ruleId] = note;
        } else {
            delete this.userNotes.DECK_RULESET_RULE[ruleId];
        }
        
        this.saveUserNotes().then(success => {
            if (success) {
                console.log(`✅ 规则 ${ruleId} 备注已保存`);
                this.closeRuleNoteModal();
                this.refreshCurrentView();
            } else {
                console.error(`❌ 规则 ${ruleId} 备注保存失败`);
                alert('保存失败，请重试');
            }
        });
    }
    
    backToVersionSelect() {
        document.getElementById('rulesetListSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
        this.allRulesets = [];
        this.filteredRulesets = [];
        this.compareMode = false;
        this.selectedRulesets.clear();
    }
    
    async exportRulesets() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: document.getElementById('versionSelect').value,
            totalRulesets: this.allRulesets.length,
            rulesets: this.allRulesets
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        if (window.fileAPI) {
            try {
                const result = await window.fileAPI.showSaveDialog({
                    title: '导出规则集数据',
                    defaultPath: `deck_rulesets_${exportData.version}.json`,
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
        }
    }
    
    // 切换对比模式
    toggleCompareMode() {
        this.compareMode = !this.compareMode;
        const toggleBtn = document.getElementById('toggleCompareBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const compareBtn = document.getElementById('compareRulesetsBtn');
        const clearBtn = document.getElementById('clearSelectionBtn');
        
        if (this.compareMode) {
            toggleBtn.textContent = '👁️ 退出对比模式';
            toggleBtn.style.backgroundColor = '#e74c3c';
            selectAllBtn.style.display = 'inline-block';
            compareBtn.style.display = 'inline-block';
            clearBtn.style.display = 'inline-block';
        } else {
            toggleBtn.textContent = '🔄 进入对比模式';
            toggleBtn.style.backgroundColor = '';
            selectAllBtn.style.display = 'none';
            compareBtn.style.display = 'none';
            clearBtn.style.display = 'none';
            this.selectedRulesets.clear();
        }
        
        this.updateSelectionCount();
        this.displayRulesets();
    }
    
    // 切换规则集选择状态
    toggleRulesetSelection(rulesetId) {
        if (!this.compareMode) return;
        
        if (this.selectedRulesets.has(rulesetId)) {
            this.selectedRulesets.delete(rulesetId);
        } else {
            this.selectedRulesets.add(rulesetId);
        }
        
        this.updateSelectionCount();
        this.displayRulesets();
    }
    
    // 更新选择计数
    updateSelectionCount() {
        const countElement = document.getElementById('selectionCount');
        if (this.compareMode) {
            countElement.textContent = `已选择 ${this.selectedRulesets.size} 个规则集`;
        } else {
            countElement.textContent = '';
        }
    }
    
    // 全选
    selectAll() {
        if (!this.compareMode) return;
        
        // 选择当前过滤后的所有规则集
        this.filteredRulesets.forEach(ruleset => {
            this.selectedRulesets.add(ruleset.id);
        });
        
        this.updateSelectionCount();
        this.displayRulesets();
    }
    
    // 清除选择
    clearSelection() {
        this.selectedRulesets.clear();
        this.updateSelectionCount();
        this.displayRulesets();
    }
    
    // 显示对比结果
    showCompareResults() {
        if (this.selectedRulesets.size < 2) {
            alert('请至少选择 2 个规则集进行对比');
            return;
        }
        
        const selectedRulesetsData = Array.from(this.selectedRulesets)
            .map(id => this.allRulesets.find(rs => rs.id === id))
            .filter(rs => rs);
        
        // 同步相同规则的备注
        this.syncNotesForIdenticalRules(selectedRulesetsData);
        
        // 收集所有规则类型
        const allRuleTypes = new Set();
        selectedRulesetsData.forEach(ruleset => {
            ruleset.rules.forEach(rule => {
                allRuleTypes.add(rule.ruleType);
            });
        });
        
        // 按规则类型ID排序
        const sortedRuleTypes = Array.from(allRuleTypes).sort((a, b) => a - b);
        
        // 生成对比表格
        let html = `
            <div style="margin-bottom: 20px;">
                <h4>对比的规则集（${selectedRulesetsData.length}个）</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${selectedRulesetsData.map(rs => {
                        const note = this.userNotes.DECK_RULESET[rs.id] || '';
                        return `<span style="background: #3498db; color: white; padding: 5px 12px; border-radius: 4px; font-size: 14px;">
                            规则集 ${rs.id}${note ? ` (${note})` : ''}
                        </span>`;
                    }).join('')}
                </div>
            </div>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #34495e; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd; min-width: 200px;">规则类型</th>
                            ${selectedRulesetsData.map(rs => {
                                const rulesetNote = this.userNotes.DECK_RULESET[rs.id] || '';
                                const displayName = rulesetNote ? rulesetNote : `规则集 ${rs.id}`;
                                return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; min-width: 120px;">${displayName}</th>`;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        sortedRuleTypes.forEach((ruleType, index) => {
            const ruleTypeName = this.ruleTypes[ruleType] || `未知类型(${ruleType})`;
            const rowColor = index % 2 === 0 ? '#f8f9fa' : 'white';
            
            html += `
                <tr style="background: ${rowColor};">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">
                        ${ruleType} - ${ruleTypeName}
                    </td>
            `;
            
            selectedRulesetsData.forEach(ruleset => {
                const rulesOfType = ruleset.rules.filter(r => r.ruleType === ruleType);
                const count = rulesOfType.length;
                
                if (count > 0) {
                    // 显示该规则类型的详细信息
                    const details = rulesOfType.map(rule => {
                        const ruleNote = this.userNotes.DECK_RULESET_RULE[rule.id] || '';
                        
                        // 如果有备注，只显示备注
                        if (ruleNote) {
                            return `<div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; font-size: 12px;">
                                <div style="color: #27ae60; font-weight: 500;">📝 ${ruleNote}</div>
                            </div>`;
                        }
                        
                        // 没有备注时显示详细信息
                        let info = [];
                        if (rule.minValue !== 0 || rule.maxValue !== 0) {
                            info.push(`范围: ${rule.minValue}-${rule.maxValue}`);
                        }
                        if (rule.appliesToSubsetId) {
                            const subsetNote = this.userNotes.SUBSET[rule.appliesToSubsetId] || '';
                            info.push(`应用于子集: ${rule.appliesToSubsetId}${subsetNote ? ' (' + subsetNote + ')' : ''}`);
                        }
                        if (rule.tagId) {
                            info.push(`标签: ${window.formatGameTag ? window.formatGameTag(rule.tagId) : rule.tagId}`);
                        }
                        if (rule.subsets && rule.subsets.length > 0) {
                            info.push(`关联子集: ${rule.subsets.join(', ')}`);
                        }
                        return `<div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; font-size: 12px;">
                            <div style="font-weight: 500; color: #2c3e50; margin-bottom: 4px;">规则 #${rule.id}</div>
                            ${info.length > 0 ? info.map(i => `<div style="color: #6c757d;">• ${i}</div>`).join('') : ''}
                        </div>`;
                    }).join('');
                    
                    html += `
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: #d4edda;">
                            <div style="font-weight: bold; color: #155724; margin-bottom: 8px;">✓ ${count} 条规则</div>
                            <div style="text-align: left;">${details}</div>
                        </td>
                    `;
                } else {
                    html += `
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #6c757d; background: #f8d7da;">
                            ✗ 无
                        </td>
                    `;
                }
            });
            
            html += '</tr>';
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 4px;">
                <h4 style="margin-top: 0;">📊 统计摘要</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${selectedRulesetsData.map(rs => {
                        const ruleTypeCount = new Set(rs.rules.map(r => r.ruleType)).size;
                        return `
                            <div style="background: white; padding: 10px; border-radius: 4px;">
                                <div style="font-weight: bold; color: #2c3e50;">规则集 ${rs.id}</div>
                                <div style="color: #6c757d; font-size: 13px;">总规则数: ${rs.rules.length}</div>
                                <div style="color: #6c757d; font-size: 13px;">规则类型数: ${ruleTypeCount}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('compareResults').innerHTML = html;
        document.getElementById('compareModal').style.display = 'block';
    }
    
    // 关闭对比模态框
    closeCompareModal() {
        document.getElementById('compareModal').style.display = 'none';
    }
    
    // 同步相同规则的备注
    syncNotesForIdenticalRules(rulesets) {
        let syncCount = 0;
        const syncLog = [];
        
        // 遍历每个规则集
        for (let i = 0; i < rulesets.length; i++) {
            for (let j = i + 1; j < rulesets.length; j++) {
                const ruleset1 = rulesets[i];
                const ruleset2 = rulesets[j];
                
                // 比较两个规则集中的规则
                ruleset1.rules.forEach(rule1 => {
                    ruleset2.rules.forEach(rule2 => {
                        // 检查规则是否完全相同
                        if (this.areRulesIdentical(rule1, rule2)) {
                            const note1 = this.userNotes.DECK_RULESET_RULE[rule1.id];
                            const note2 = this.userNotes.DECK_RULESET_RULE[rule2.id];
                            
                            // 如果前面有备注，后面没有或不同，则同步（以前面为准）
                            if (note1 && note1 !== note2) {
                                this.userNotes.DECK_RULESET_RULE[rule2.id] = note1;
                                syncCount++;
                                if (note2) {
                                    syncLog.push(`规则 #${rule1.id} → 规则 #${rule2.id}: "${note1}" (覆盖原备注: "${note2}")`);
                                } else {
                                    syncLog.push(`规则 #${rule1.id} → 规则 #${rule2.id}: "${note1}"`);
                                }
                            }
                        }
                    });
                });
            }
        }
        
        // 如果有同步操作，保存并提示
        if (syncCount > 0) {
            this.saveUserNotes().then(success => {
                if (success) {
                    console.log(`✅ 同步了 ${syncCount} 条规则备注:`);
                    syncLog.forEach(log => console.log(`  - ${log}`));
                    
                    // 显示同步提示
                    const notification = document.createElement('div');
                    notification.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #27ae60;
                        color: white;
                        padding: 15px 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        z-index: 10000;
                        font-size: 14px;
                        max-width: 400px;
                    `;
                    notification.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 5px;">✅ 备注同步成功</div>
                        <div>已同步 ${syncCount} 条相同规则的备注</div>
                    `;
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.remove();
                    }, 3000);
                } else {
                    console.error('❌ 备注同步保存失败');
                }
            });
        } else {
            console.log('ℹ️ 没有需要同步的备注');
        }
    }
    
    // 判断两个规则是否完全相同
    areRulesIdentical(rule1, rule2) {
        // 如果是同一个规则，返回 false（不需要同步）
        if (rule1.id === rule2.id) return false;
        
        // 比较所有关键属性
        return (
            rule1.ruleType === rule2.ruleType &&
            rule1.appliesToSubsetId === rule2.appliesToSubsetId &&
            rule1.appliesToIsNot === rule2.appliesToIsNot &&
            rule1.ruleIsNot === rule2.ruleIsNot &&
            rule1.minValue === rule2.minValue &&
            rule1.maxValue === rule2.maxValue &&
            rule1.tagId === rule2.tagId &&
            rule1.tagMinValue === rule2.tagMinValue &&
            rule1.tagMaxValue === rule2.tagMaxValue &&
            rule1.stringValue === rule2.stringValue &&
            rule1.errorString === rule2.errorString &&
            rule1.showInvalidCards === rule2.showInvalidCards &&
            this.arraysEqual(rule1.subsets, rule2.subsets)
        );
    }
    
    // 比较两个数组是否相等
    arraysEqual(arr1, arr2) {
        if (!arr1 && !arr2) return true;
        if (!arr1 || !arr2) return false;
        if (arr1.length !== arr2.length) return false;
        
        const sorted1 = [...arr1].sort();
        const sorted2 = [...arr2].sort();
        
        return sorted1.every((val, index) => val === sorted2[index]);
    }
    
    // 切换版本模式（查看/对比）
    switchVersionMode(mode) {
        const singleBtn = document.getElementById('singleModeBtn');
        const compareBtn = document.getElementById('versionCompareModeBtn');
        const singleSection = document.getElementById('singleVersionSection');
        const compareSection = document.getElementById('compareVersionSection');
        const loadBtn = document.getElementById('loadRulesetsBtn');
        const compareRulesetsVersionBtn = document.getElementById('compareRulesetsVersionBtn');
        const compareRulesVersionBtn = document.getElementById('compareRulesVersionBtn');
        const compareSubsetsBtn = document.getElementById('compareSubsetsBtn');
        const compareSubsetRulesVersionBtn = document.getElementById('compareSubsetRulesVersionBtn');
        
        if (mode === 'single') {
            this.versionCompareMode = false;
            singleBtn.classList.add('active');
            compareBtn.classList.remove('active');
            singleSection.style.display = 'block';
            compareSection.style.display = 'none';
            loadBtn.style.display = 'inline-block';
            compareRulesetsVersionBtn.style.display = 'none';
            compareRulesVersionBtn.style.display = 'none';
            compareSubsetsBtn.style.display = 'none';
            compareSubsetRulesVersionBtn.style.display = 'none';
        } else {
            this.versionCompareMode = true;
            singleBtn.classList.remove('active');
            compareBtn.classList.add('active');
            singleSection.style.display = 'none';
            compareSection.style.display = 'block';
            loadBtn.style.display = 'none';
            compareRulesetsVersionBtn.style.display = 'inline-block';
            compareRulesVersionBtn.style.display = 'inline-block';
            compareSubsetsBtn.style.display = 'inline-block';
            compareSubsetRulesVersionBtn.style.display = 'inline-block';
            
            // 自动选择最新的两个版本
            if (this.availableVersions.length >= 2) {
                document.getElementById('newVersionSelect').value = this.availableVersions[0]; // 最新版本
                document.getElementById('oldVersionSelect').value = this.availableVersions[1]; // 次新版本
                this.onCompareVersionSelect();
            }
        }
    }
    
    // 对比模式版本选择
    async onCompareVersionSelect() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        const compareRulesetsVersionBtn = document.getElementById('compareRulesetsVersionBtn');
        const compareRulesVersionBtn = document.getElementById('compareRulesVersionBtn');
        const compareSubsetsBtn = document.getElementById('compareSubsetsBtn');
        const compareSubsetRulesVersionBtn = document.getElementById('compareSubsetRulesVersionBtn');
        
        let oldValid = false;
        let newValid = false;
        
        if (oldVersion) {
            oldValid = await this.checkVersionFilesForInfo(oldVersion, 'oldVersionInfo');
        } else {
            document.getElementById('oldVersionInfo').innerHTML = '';
        }
        
        if (newVersion) {
            newValid = await this.checkVersionFilesForInfo(newVersion, 'newVersionInfo');
        } else {
            document.getElementById('newVersionInfo').innerHTML = '';
        }
        
        const enabled = oldValid && newValid && oldVersion !== newVersion;
        compareRulesetsVersionBtn.disabled = !enabled;
        compareRulesVersionBtn.disabled = !enabled;
        compareSubsetsBtn.disabled = !enabled;
        compareSubsetRulesVersionBtn.disabled = !enabled;
    }
    
    // 检查版本文件（带info元素ID参数）
    async checkVersionFilesForInfo(version, infoElementId) {
        try {
            window.dataManager.setVersion(version);
            
            const missingFiles = [];
            
            try {
                await window.dataManager.loadFile('SUBSET', version);
            } catch (error) {
                missingFiles.push('SUBSET.json');
            }
            
            try {
                await window.dataManager.loadFile('SUBSET_RULE', version);
            } catch (error) {
                missingFiles.push('SUBSET_RULE.json');
            }
            
            const isValid = missingFiles.length === 0;
            
            const infoElement = document.getElementById(infoElementId);
            if (infoElement) {
                if (isValid) {
                    infoElement.innerHTML = `
                        <div><strong>版本号:</strong> ${version}</div>
                        <div><strong>状态:</strong> <span class="status-ready">✅ 准备就绪</span></div>
                    `;
                } else {
                    infoElement.innerHTML = `
                        <div><strong>版本号:</strong> ${version}</div>
                        <div><strong>状态:</strong> <span class="status-error">❌ 缺少文件: ${missingFiles.join(', ')}</span></div>
                    `;
                }
            }
            
            return isValid;
        } catch (error) {
            const infoElement = document.getElementById(infoElementId);
            if (infoElement) {
                infoElement.innerHTML = `
                    <div><strong>版本号:</strong> ${version}</div>
                    <div><strong>状态:</strong> <span class="status-error">❌ 检测失败: ${error.message}</span></div>
                `;
            }
            return false;
        }
    }
    
    // 对比版本间的子集
    async compareVersionSubsets() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        console.log('🔍 开始对比子集:', oldVersion, 'vs', newVersion);
        
        try {
            this.showProgressSection();
            
            // 加载旧版本数据
            this.updateProgress(20, '正在加载旧版本子集...');
            this.oldVersionSubsets = await this.loadVersionSubsets(oldVersion);
            
            // 加载新版本数据
            this.updateProgress(50, '正在加载新版本子集...');
            this.newVersionSubsets = await this.loadVersionSubsets(newVersion);
            
            // 加载卡牌数据（使用新版本）
            this.updateProgress(70, '正在加载卡牌数据...');
            await this.loadCardData(newVersion);
            
            this.updateProgress(75, '正在加载子集卡牌映射...');
            await this.loadSubsetCards(newVersion);
            
            // 对比数据
            this.updateProgress(90, '正在对比数据...');
            const compareResults = this.performSubsetComparison(this.oldVersionSubsets, this.newVersionSubsets);
            
            this.updateProgress(100, '对比完成！');
            
            // 延迟显示结果
            setTimeout(() => {
                this.hideProgressSection();
                this.showSubsetCompareResults(oldVersion, newVersion, compareResults);
            }, 500);
            
        } catch (error) {
            console.error('对比子集失败:', error);
            alert('对比子集失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载指定版本的子集数据
    async loadVersionSubsets(version) {
        window.dataManager.setVersion(version);
        
        // 加载子集数据
        const subsetData = await window.dataManager.loadFile('SUBSET', version);
        const subsets = subsetData?.Records || [];
        
        // 加载子集规则数据
        const subsetRuleData = await window.dataManager.loadFile('SUBSET_RULE', version);
        const allSubsetRules = subsetRuleData?.Records || [];
        
        // 为每个子集关联规则
        return subsets.map(subset => {
            const rules = allSubsetRules.filter(rule => rule.m_subsetId === subset.m_ID);
            return {
                id: subset.m_ID,
                assetFlags: subset.m_assetFlags ?? 0,
                ruleCount: rules.length,
                rules: rules.map(rule => ({
                    id: rule.m_ID,
                    subsetId: rule.m_subsetId,
                    ruleType: rule.m_ruleType,
                    ruleTypeName: this.subsetRuleTypes[rule.m_ruleType] || `未知类型(${rule.m_ruleType})`,
                    tagId: rule.m_tagId,
                    minValue: rule.m_minValue,
                    maxValue: rule.m_maxValue,
                    intValue: rule.m_intValue,
                    stringValue: rule.m_stringValue,
                    ruleIsNot: rule.m_ruleIsNot
                }))
            };
        });
    }
    
    // 执行子集对比
    performSubsetComparison(oldSubsets, newSubsets) {
        const oldMap = new Map(oldSubsets.map(s => [s.id, s]));
        const newMap = new Map(newSubsets.map(s => [s.id, s]));
        
        const added = [];
        const removed = [];
        const modified = [];
        
        // 查找新增和修改的子集
        newSubsets.forEach(newSubset => {
            const oldSubset = oldMap.get(newSubset.id);
            if (!oldSubset) {
                added.push(newSubset);
            } else {
                const changes = this.getSubsetChanges(oldSubset, newSubset);
                if (changes.length > 0) {
                    modified.push({ old: oldSubset, new: newSubset, changes });
                }
            }
        });
        
        // 查找移除的子集
        oldSubsets.forEach(oldSubset => {
            if (!newMap.has(oldSubset.id)) {
                removed.push(oldSubset);
            }
        });
        
        return { added, removed, modified };
    }
    
    // 获取子集变化
    getSubsetChanges(oldSubset, newSubset) {
        const changes = [];
        
        // 检查资产标志变化
        if (oldSubset.assetFlags !== newSubset.assetFlags) {
            changes.push({
                field: '资产标志',
                oldValue: oldSubset.assetFlags,
                newValue: newSubset.assetFlags
            });
        }
        
        // 检查规则数量变化
        if (oldSubset.ruleCount !== newSubset.ruleCount) {
            changes.push({
                field: '规则数量',
                oldValue: oldSubset.ruleCount,
                newValue: newSubset.ruleCount
            });
        }
        
        // 详细对比规则
        const ruleChanges = this.compareSubsetRules(oldSubset.rules, newSubset.rules);
        if (ruleChanges.length > 0) {
            changes.push({
                field: '规则详情',
                oldValue: ruleChanges.filter(c => c.type === 'removed').length + ' 条移除',
                newValue: ruleChanges.filter(c => c.type === 'added').length + ' 条新增',
                details: ruleChanges
            });
        }
        
        return changes;
    }
    
    // 对比子集规则
    compareSubsetRules(oldRules, newRules) {
        const changes = [];
        const oldRuleMap = new Map(oldRules.map(r => [r.id, r]));
        const newRuleMap = new Map(newRules.map(r => [r.id, r]));
        
        // 查找新增的规则
        newRules.forEach(newRule => {
            if (!oldRuleMap.has(newRule.id)) {
                changes.push({ type: 'added', rule: newRule });
            }
        });
        
        // 查找移除的规则
        oldRules.forEach(oldRule => {
            if (!newRuleMap.has(oldRule.id)) {
                changes.push({ type: 'removed', rule: oldRule });
            }
        });
        
        return changes;
    }
    
    // 显示子集对比结果
    showSubsetCompareResults(oldVersion, newVersion, results) {
        const modal = document.getElementById('subsetCompareModal');
        const resultsContainer = document.getElementById('subsetCompareResults');
        
        let html = `
            <div style="margin-bottom: 25px;">
                <h3>📊 对比摘要</h3>
                <div style="display: flex; gap: 20px; margin-top: 15px;">
                    <div style="flex: 1; padding: 15px; background: #d4edda; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #155724;">${results.added.length}</div>
                        <div style="color: #155724;">新增子集</div>
                    </div>
                    <div style="flex: 1; padding: 15px; background: #f8d7da; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #721c24;">${results.removed.length}</div>
                        <div style="color: #721c24;">移除子集</div>
                    </div>
                    <div style="flex: 1; padding: 15px; background: #fff3cd; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #856404;">${results.modified.length}</div>
                        <div style="color: #856404;">修改子集</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>对比版本</h4>
                <div style="display: flex; gap: 15px;">
                    <span style="background: #e9ecef; padding: 8px 15px; border-radius: 4px;">旧版本: ${oldVersion}</span>
                    <span style="background: #e9ecef; padding: 8px 15px; border-radius: 4px;">新版本: ${newVersion}</span>
                </div>
            </div>
        `;
        
        // 显示新增的子集
        if (results.added.length > 0) {
            html += `
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #155724;">➕ 新增的子集 (${results.added.length})</h4>
                    ${results.added.map(subset => {
                        const note = this.userNotes.SUBSET[subset.id] || '';
                        return `
                            <div style="padding: 15px; margin-bottom: 15px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                                <div style="font-weight: bold; margin-bottom: 10px;">
                                    子集 ${subset.id}${note ? ` (${note})` : ''}
                                </div>
                                <div style="margin: 8px 0; color: #155724;">
                                    <strong>资产标志:</strong> ${subset.assetFlags}
                                </div>
                                <div style="margin: 8px 0; color: #155724;">
                                    <strong>规则数量:</strong> ${subset.ruleCount}
                                </div>
                                ${subset.rules.length > 0 ? `
                                    <div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px;">
                                        <strong>规则详情:</strong>
                                        <div style="margin-top: 8px;">
                                            ${subset.rules.map(rule => {
                                                const tagInfo = rule.tagId ? ` | 标签: <span class="tag-link" data-tag-id="${rule.tagId}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${rule.tagId}</span>` : '';
                                                return `<div style="color: #155724; padding: 5px;">• ${rule.ruleTypeName} (ID: <span class="rule-link" data-rule="${encodeURIComponent(JSON.stringify(rule))}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${rule.id}</span>)${tagInfo}</div>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // 显示移除的子集
        if (results.removed.length > 0) {
            html += `
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #721c24;">➖ 移除的子集 (${results.removed.length})</h4>
                    ${results.removed.map(subset => {
                        const note = this.userNotes.SUBSET[subset.id] || '';
                        return `
                            <div style="padding: 15px; margin-bottom: 15px; background: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
                                <div style="font-weight: bold; margin-bottom: 10px;">
                                    子集 ${subset.id}${note ? ` (${note})` : ''}
                                </div>
                                <div style="margin: 8px 0; color: #721c24;">
                                    <strong>资产标志:</strong> ${subset.assetFlags}
                                </div>
                                <div style="margin: 8px 0; color: #721c24;">
                                    <strong>规则数量:</strong> ${subset.ruleCount}
                                </div>
                                ${subset.rules.length > 0 ? `
                                    <div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px;">
                                        <strong>规则详情:</strong>
                                        <div style="margin-top: 8px;">
                                            ${subset.rules.map(rule => {
                                                const tagInfo = rule.tagId ? ` | 标签: <span class="tag-link" data-tag-id="${rule.tagId}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${rule.tagId}</span>` : '';
                                                return `<div style="color: #721c24; padding: 5px;">• ${rule.ruleTypeName} (ID: <span class="rule-link" data-rule="${encodeURIComponent(JSON.stringify(rule))}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${rule.id}</span>)${tagInfo}</div>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // 显示修改的子集
        if (results.modified.length > 0) {
            html += `
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #856404;">✏️ 修改的子集 (${results.modified.length})</h4>
                    ${results.modified.map(mod => {
                        const note = this.userNotes.SUBSET[mod.new.id] || '';
                        return `
                            <div style="padding: 15px; margin-bottom: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                                <div style="font-weight: bold; margin-bottom: 10px;">
                                    子集 ${mod.new.id}${note ? ` (${note})` : ''}
                                </div>
                                ${mod.changes.map(change => {
                                    if (change.field === '规则详情' && change.details) {
                                        return `
                                            <div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px;">
                                                <strong>${change.field}:</strong>
                                                <div style="margin-top: 8px;">
                                                    ${change.details.map(detail => {
                                                        if (detail.type === 'added') {
                                                            const tagInfo = detail.rule.tagId ? ` | 标签: <span class="tag-link" data-tag-id="${detail.rule.tagId}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${detail.rule.tagId}</span>` : '';
                                                            return `<div style="color: #155724; padding: 5px;">➕ 新增规则: ${detail.rule.ruleTypeName} (ID: <span class="rule-link" data-rule="${encodeURIComponent(JSON.stringify(detail.rule))}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${detail.rule.id}</span>)${tagInfo}</div>`;
                                                        } else {
                                                            const tagInfo = detail.rule.tagId ? ` | 标签: <span class="tag-link" data-tag-id="${detail.rule.tagId}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${detail.rule.tagId}</span>` : '';
                                                            return `<div style="color: #721c24; padding: 5px;">➖ 移除规则: ${detail.rule.ruleTypeName} (ID: <span class="rule-link" data-rule="${encodeURIComponent(JSON.stringify(detail.rule))}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${detail.rule.id}</span>)${tagInfo}</div>`;
                                                        }
                                                    }).join('')}
                                                </div>
                                            </div>
                                        `;
                                    } else {
                                        return `
                                            <div style="margin: 8px 0; color: #856404;">
                                                <strong>${change.field}:</strong>
                                                <span style="text-decoration: line-through; color: #721c24;">${change.oldValue}</span>
                                                <span style="margin: 0 8px;">→</span>
                                                <span style="color: #155724;">${change.newValue}</span>
                                            </div>
                                        `;
                                    }
                                }).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        resultsContainer.innerHTML = html;
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // 为规则链接添加点击事件
        resultsContainer.querySelectorAll('.rule-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const ruleData = JSON.parse(decodeURIComponent(link.getAttribute('data-rule')));
                this.showRuleDetails(ruleData);
            });
        });
        
        // 为标签链接添加点击事件
        resultsContainer.querySelectorAll('.tag-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const tagId = parseInt(link.getAttribute('data-tag-id'));
                this.showTagDetails(tagId);
            });
        });
    }
    
    // 关闭子集对比模态框
    closeSubsetCompareModal() {
        const modal = document.getElementById('subsetCompareModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    closeRuleCompareModal() {
        const modal = document.getElementById('ruleCompareModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    closeSubsetRuleCompareModal() {
        const modal = document.getElementById('subsetRuleCompareModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    // 对比规则版本
    async compareVersionRules() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        if (!oldVersion || !newVersion) {
            alert('请选择两个版本进行对比');
            return;
        }
        
        if (oldVersion === newVersion) {
            alert('请选择不同的版本进行对比');
            return;
        }
        
        try {
            this.showProgressSection();
            
            // 加载旧版本规则
            this.updateProgress(25, '正在加载旧版本规则...');
            const oldRules = await this.loadVersionRules(oldVersion);
            
            // 加载新版本规则
            this.updateProgress(60, '正在加载新版本规则...');
            const newRules = await this.loadVersionRules(newVersion);
            
            // 对比数据
            this.updateProgress(90, '正在对比数据...');
            const compareResults = this.performRulesComparison(oldRules, newRules);
            
            this.updateProgress(100, '对比完成！');
            
            // 延迟显示结果
            setTimeout(() => {
                this.hideProgressSection();
                this.showRulesCompareResults(oldVersion, newVersion, compareResults);
            }, 500);
            
        } catch (error) {
            console.error('对比规则失败:', error);
            alert('对比规则失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载指定版本的规则数据
    async loadVersionRules(version) {
        window.dataManager.setVersion(version);
        const data = await window.dataManager.loadFile('DECK_RULESET_RULE', version);
        return data?.Records || [];
    }
    
    // 执行规则对比
    performRulesComparison(oldRules, newRules) {
        const oldMap = new Map(oldRules.map(r => [r.m_ID, r]));
        const newMap = new Map(newRules.map(r => [r.m_ID, r]));
        
        const added = [];
        const removed = [];
        const modified = [];
        
        // 查找新增和修改的规则
        newRules.forEach(newRule => {
            const oldRule = oldMap.get(newRule.m_ID);
            if (!oldRule) {
                added.push(newRule);
            } else {
                const changes = this.getRuleChanges(oldRule, newRule);
                if (changes.length > 0) {
                    modified.push({ old: oldRule, new: newRule, changes });
                }
            }
        });
        
        // 查找移除的规则
        oldRules.forEach(oldRule => {
            if (!newMap.has(oldRule.m_ID)) {
                removed.push(oldRule);
            }
        });
        
        return { added, removed, modified };
    }
    
    // 获取规则变化
    getRuleChanges(oldRule, newRule) {
        const changes = [];
        
        if (oldRule.m_deckRulesetId !== newRule.m_deckRulesetId) {
            changes.push({
                field: '规则集ID',
                oldValue: oldRule.m_deckRulesetId,
                newValue: newRule.m_deckRulesetId
            });
        }
        
        if (oldRule.m_ruleType !== newRule.m_ruleType) {
            changes.push({
                field: '规则类型',
                oldValue: oldRule.m_ruleType,
                newValue: newRule.m_ruleType
            });
        }
        
        if (oldRule.m_appliesToSubsetId !== newRule.m_appliesToSubsetId) {
            changes.push({
                field: '应用于子集ID',
                oldValue: oldRule.m_appliesToSubsetId,
                newValue: newRule.m_appliesToSubsetId
            });
        }
        
        if (oldRule.m_minValue !== newRule.m_minValue) {
            changes.push({
                field: '最小值',
                oldValue: oldRule.m_minValue,
                newValue: newRule.m_minValue
            });
        }
        
        if (oldRule.m_maxValue !== newRule.m_maxValue) {
            changes.push({
                field: '最大值',
                oldValue: oldRule.m_maxValue,
                newValue: newRule.m_maxValue
            });
        }
        
        return changes;
    }
    
    // 显示规则对比结果
    showRulesCompareResults(oldVersion, newVersion, results) {
        console.log('📝 显示规则对比结果:', { oldVersion, newVersion, results });
        const modal = document.getElementById('ruleCompareModal');
        const content = document.getElementById('ruleCompareResults');
        
        if (!modal || !content) {
            console.error('❌ 模态框元素未找到:', { modal: !!modal, content: !!content });
            return;
        }
        
        let html = `
            <div style="padding: 20px;">
                <h2 style="margin-bottom: 20px; color: #2c3e50;">📝 规则版本对比</h2>
                <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
                    <strong>对比版本:</strong> ${oldVersion} ➜ ${newVersion}
                </div>
        `;
        
        // 新增的规则
        if (results.added.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #27ae60; margin-bottom: 15px;">✨ 新增规则 (${results.added.length})</h3>
                    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px;">
            `;
            
            results.added.forEach(rule => {
                const ruleTypeName = this.deckRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                html += `
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; cursor: pointer;"
                         onclick="window.deckRulesetManager.showRuleDetails(${rule.m_ID})">
                        <strong>规则 #${rule.m_ID}</strong> - ${ruleTypeName}
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            规则集ID: ${rule.m_deckRulesetId || 'N/A'}, 
                            子集ID: ${rule.m_appliesToSubsetId || 'N/A'}
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        // 移除的规则
        if (results.removed.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #c0392b; margin-bottom: 15px;">🗑️ 移除规则 (${results.removed.length})</h3>
                    <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 4px;">
            `;
            
            results.removed.forEach(rule => {
                const ruleTypeName = this.deckRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                html += `
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                        <strong>规则 #${rule.m_ID}</strong> - ${ruleTypeName}
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            规则集ID: ${rule.m_deckRulesetId || 'N/A'}, 
                            子集ID: ${rule.m_appliesToSubsetId || 'N/A'}
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        // 修改的规则
        if (results.modified.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #f39c12; margin-bottom: 15px;">✏️ 修改规则 (${results.modified.length})</h3>
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px;">
            `;
            
            results.modified.forEach(item => {
                const rule = item.new;
                const ruleTypeName = this.deckRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                html += `
                    <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; cursor: pointer;"
                         onclick="window.deckRulesetManager.showRuleDetails(${rule.m_ID})">
                        <strong>规则 #${rule.m_ID}</strong> - ${ruleTypeName}
                        <div style="margin-top: 10px; font-size: 0.9em;">
                `;
                
                item.changes.forEach(change => {
                    html += `
                        <div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 3px;">
                            <strong>${change.field}:</strong>
                            <span style="color: #dc3545;">${change.oldValue ?? 'N/A'}</span>
                            →
                            <span style="color: #28a745;">${change.newValue ?? 'N/A'}</span>
                        </div>
                    `;
                });
                
                html += `</div></div>`;
            });
            
            html += `</div></div>`;
        }
        
        if (results.added.length === 0 && results.removed.length === 0 && results.modified.length === 0) {
            html += `
                <div style="padding: 40px; text-align: center; color: #7f8c8d;">
                    <h3>✅ 两个版本的规则完全相同</h3>
                </div>
            `;
        }
        
        html += `</div>`;
        
        content.innerHTML = html;
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    
    // 对比子集规则版本
    async compareVersionSubsetRules() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        if (!oldVersion || !newVersion) {
            alert('请选择两个版本进行对比');
            return;
        }
        
        if (oldVersion === newVersion) {
            alert('请选择不同的版本进行对比');
            return;
        }
        
        try {
            this.showProgressSection();
            
            // 加载旧版本子集规则
            this.updateProgress(20, '正在加载旧版本子集规则...');
            const oldSubsetRules = await this.loadVersionSubsetRules(oldVersion);
            
            // 加载新版本子集规则
            this.updateProgress(50, '正在加载新版本子集规则...');
            const newSubsetRules = await this.loadVersionSubsetRules(newVersion);
            
            // 加载卡牌数据（使用新版本）
            this.updateProgress(70, '正在加载卡牌数据...');
            await this.loadCardData(newVersion);
            
            this.updateProgress(75, '正在加载子集卡牌映射...');
            await this.loadSubsetCards(newVersion);
            
            // 对比数据
            this.updateProgress(90, '正在对比数据...');
            const compareResults = this.performSubsetRulesComparison(oldSubsetRules, newSubsetRules);
            
            this.updateProgress(100, '对比完成！');
            
            // 延迟显示结果
            setTimeout(() => {
                this.hideProgressSection();
                this.showSubsetRulesCompareResults(oldVersion, newVersion, compareResults);
            }, 500);
            
        } catch (error) {
            console.error('对比子集规则失败:', error);
            alert('对比子集规则失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载指定版本的子集规则数据
    async loadVersionSubsetRules(version) {
        window.dataManager.setVersion(version);
        const data = await window.dataManager.loadFile('SUBSET_RULE', version);
        return data?.Records || [];
    }
    
    // 执行子集规则对比
    performSubsetRulesComparison(oldRules, newRules) {
        const oldMap = new Map(oldRules.map(r => [r.m_ID, r]));
        const newMap = new Map(newRules.map(r => [r.m_ID, r]));
        
        const added = [];
        const removed = [];
        const modified = [];
        
        // 查找新增和修改的规则
        newRules.forEach(newRule => {
            const oldRule = oldMap.get(newRule.m_ID);
            if (!oldRule) {
                added.push(newRule);
            } else {
                const changes = this.getSubsetRuleChanges(oldRule, newRule);
                if (changes.length > 0) {
                    modified.push({ old: oldRule, new: newRule, changes });
                }
            }
        });
        
        // 查找移除的规则
        oldRules.forEach(oldRule => {
            if (!newMap.has(oldRule.m_ID)) {
                removed.push(oldRule);
            }
        });
        
        return { added, removed, modified };
    }
    
    // 获取子集规则变化
    getSubsetRuleChanges(oldRule, newRule) {
        const changes = [];
        
        if (oldRule.m_subsetId !== newRule.m_subsetId) {
            changes.push({
                field: '子集ID',
                oldValue: oldRule.m_subsetId,
                newValue: newRule.m_subsetId
            });
        }
        
        if (oldRule.m_ruleType !== newRule.m_ruleType) {
            changes.push({
                field: '规则类型',
                oldValue: oldRule.m_ruleType,
                newValue: newRule.m_ruleType
            });
        }
        
        if (oldRule.m_tagId !== newRule.m_tagId) {
            changes.push({
                field: '标签ID',
                oldValue: oldRule.m_tagId,
                newValue: newRule.m_tagId
            });
        }
        
        if (oldRule.m_minValue !== newRule.m_minValue) {
            changes.push({
                field: '最小值',
                oldValue: oldRule.m_minValue,
                newValue: newRule.m_minValue
            });
        }
        
        if (oldRule.m_maxValue !== newRule.m_maxValue) {
            changes.push({
                field: '最大值',
                oldValue: oldRule.m_maxValue,
                newValue: newRule.m_maxValue
            });
        }
        
        if (oldRule.m_intValue !== newRule.m_intValue) {
            changes.push({
                field: '整数值',
                oldValue: oldRule.m_intValue,
                newValue: newRule.m_intValue
            });
        }
        
        if (oldRule.m_stringValue !== newRule.m_stringValue) {
            changes.push({
                field: '字符串值',
                oldValue: oldRule.m_stringValue,
                newValue: newRule.m_stringValue
            });
        }
        
        if (oldRule.m_ruleIsNot !== newRule.m_ruleIsNot) {
            changes.push({
                field: '取反规则',
                oldValue: oldRule.m_ruleIsNot,
                newValue: newRule.m_ruleIsNot
            });
        }
        
        return changes;
    }
    
    // 显示子集规则对比结果
    showSubsetRulesCompareResults(oldVersion, newVersion, results) {
        console.log('🔧 显示子集规则对比结果:', { oldVersion, newVersion, results });
        const modal = document.getElementById('subsetRuleCompareModal');
        const content = document.getElementById('subsetRuleCompareResults');
        
        if (!modal || !content) {
            console.error('❌ 模态框元素未找到:', { modal: !!modal, content: !!content });
            return;
        }
        
        let html = `
            <div style="padding: 20px;">
                <h2 style="margin-bottom: 20px; color: #2c3e50;">🔧 子集规则版本对比</h2>
                <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
                    <strong>对比版本:</strong> ${oldVersion} ➜ ${newVersion}
                </div>
        `;
        
        // 新增的子集规则
        if (results.added.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #27ae60; margin-bottom: 15px;">✨ 新增子集规则 (${results.added.length})</h3>
                    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px;">
            `;
            
            results.added.forEach(rule => {
                const ruleTypeName = this.subsetRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                const tagName = window.gameTags?.[rule.m_tagId] || `标签#${rule.m_tagId}`;
                html += `
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                        <strong>规则 #${rule.m_ID}</strong> - ${ruleTypeName}
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            子集ID: ${rule.m_subsetId}, 标签: ${tagName}
                            ${rule.m_minValue !== undefined ? `, 最小值: ${rule.m_minValue}` : ''}
                            ${rule.m_maxValue !== undefined ? `, 最大值: ${rule.m_maxValue}` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        // 移除的子集规则
        if (results.removed.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #c0392b; margin-bottom: 15px;">🗑️ 移除子集规则 (${results.removed.length})</h3>
                    <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 4px;">
            `;
            
            results.removed.forEach(rule => {
                const ruleTypeName = this.subsetRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                const tagName = window.gameTags?.[rule.m_tagId] || `标签#${rule.m_tagId}`;
                html += `
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                        <strong>规则 #${rule.m_ID}</strong> - ${ruleTypeName}
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            子集ID: ${rule.m_subsetId}, 标签: ${tagName}
                            ${rule.m_minValue !== undefined ? `, 最小值: ${rule.m_minValue}` : ''}
                            ${rule.m_maxValue !== undefined ? `, 最大值: ${rule.m_maxValue}` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        // 修改的子集规则
        if (results.modified.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #f39c12; margin-bottom: 15px;">✏️ 修改子集规则 (${results.modified.length})</h3>
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px;">
            `;
            
            results.modified.forEach(item => {
                const rule = item.new;
                const ruleTypeName = this.subsetRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                const tagName = window.gameTags?.[rule.m_tagId] || `标签#${rule.m_tagId}`;
                html += `
                    <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px;">
                        <strong>规则 #${rule.m_ID}</strong> - ${ruleTypeName} (${tagName})
                        <div style="margin-top: 10px; font-size: 0.9em;">
                `;
                
                item.changes.forEach(change => {
                    html += `
                        <div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 3px;">
                            <strong>${change.field}:</strong>
                            <span style="color: #dc3545;">${change.oldValue ?? 'N/A'}</span>
                            →
                            <span style="color: #28a745;">${change.newValue ?? 'N/A'}</span>
                        </div>
                    `;
                });
                
                html += `</div></div>`;
            });
            
            html += `</div></div>`;
        }
        
        if (results.added.length === 0 && results.removed.length === 0 && results.modified.length === 0) {
            html += `
                <div style="padding: 40px; text-align: center; color: #7f8c8d;">
                    <h3>✅ 两个版本的子集规则完全相同</h3>
                </div>
            `;
        }
        
        html += `</div>`;
        
        content.innerHTML = html;
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    
    // 显示规则详情
    showRuleDetails(ruleParam) {
        try {
            let rule;
            
            // 如果传入的是数字ID，则查找对应的规则
            if (typeof ruleParam === 'number') {
                // 从关联数据中查找（包含subsets信息）
                let foundRule = null;
                for (const ruleset of this.allRulesets) {
                    const ruleInRuleset = ruleset.rules.find(r => r.id === ruleParam);
                    if (ruleInRuleset) {
                        foundRule = ruleInRuleset;
                        break;
                    }
                }
                
                // 如果在关联数据中找不到，从原始数据查找
                if (!foundRule) {
                    const rawRule = this.allRules.find(r => r.m_ID === ruleParam);
                    if (!rawRule) {
                        alert('未找到规则ID: ' + ruleParam);
                        return;
                    }
                    
                    // 转换为显示格式
                    foundRule = {
                        id: rawRule.m_ID,
                        subsetId: rawRule.m_appliesToSubsetId || 0,
                        ruleType: rawRule.m_ruleType,
                        ruleTypeName: this.ruleTypes[rawRule.m_ruleType] || `未知类型(${rawRule.m_ruleType})`,
                        ruleIsNot: rawRule.m_ruleIsNot,
                        tagId: rawRule.m_tagId,
                        minValue: rawRule.m_minValue,
                        maxValue: rawRule.m_maxValue,
                        intValue: rawRule.m_intValue,
                        stringValue: rawRule.m_stringValue,
                        subsets: []
                    };
                }
                
                rule = foundRule;
            } else {
                // 如果传入的是对象，直接使用
                rule = ruleParam;
            }
            
            // 构建详情HTML
            let detailsHtml = `
                <div style="padding: 20px;">
                    <h3 style="margin-bottom: 20px; color: #2c3e50;">📋 规则详情</h3>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="margin-bottom: 12px;"><strong>规则ID:</strong> ${rule.id}</div>
                        <div style="margin-bottom: 12px;"><strong>子集ID:</strong> ${rule.subsetId || '无'}</div>
                        <div style="margin-bottom: 12px;"><strong>规则类型:</strong> ${rule.ruleTypeName} (${rule.ruleType})</div>
                        <div style="margin-bottom: 12px;"><strong>取反:</strong> ${rule.ruleIsNot ? '✅ 是' : '❌ 否'}</div>
            `;
            
            // 显示关联的子集
            if (rule.subsets && rule.subsets.length > 0) {
                detailsHtml += `
                    <div style="margin-bottom: 12px;">
                        <strong>关联子集:</strong>
                        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
                            ${rule.subsets.map(subsetId => `
                                <span class="subset-link-in-modal" data-subset-id="${subsetId}" 
                                      style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 12px; cursor: pointer; font-size: 13px; border: 1px solid #90caf9; transition: all 0.2s;"
                                      onmouseover="this.style.background='#1976d2'; this.style.color='white';"
                                      onmouseout="this.style.background='#e3f2fd'; this.style.color='#1976d2';">
                                    🗂️ ${subsetId}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            // 显示标签信息（可点击）
            if (rule.tagId) {
                detailsHtml += `<div style="margin-bottom: 12px;"><strong>标签ID:</strong> <span class="tag-link-in-modal" data-tag-id="${rule.tagId}" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${rule.tagId}</span></div>`;
            }
            
            // 显示值信息
            if (rule.minValue !== undefined && rule.minValue !== null) {
                detailsHtml += `<div style="margin-bottom: 12px;"><strong>最小值:</strong> ${rule.minValue}</div>`;
            }
            if (rule.maxValue !== undefined && rule.maxValue !== null) {
                detailsHtml += `<div style="margin-bottom: 12px;"><strong>最大值:</strong> ${rule.maxValue}</div>`;
            }
            if (rule.intValue !== undefined && rule.intValue !== null) {
                detailsHtml += `<div style="margin-bottom: 12px;"><strong>整数值:</strong> ${rule.intValue}</div>`;
            }
            if (rule.stringValue) {
                detailsHtml += `<div style="margin-bottom: 12px;"><strong>字符串值:</strong> ${rule.stringValue}</div>`;
            }
            
            detailsHtml += `
                    </div>
                    <div style="text-align: center;">
                        <button onclick="document.getElementById('ruleDetailsModal').style.display='none'" 
                                style="padding: 10px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            关闭
                        </button>
                    </div>
                </div>
            `;
            
            // 创建或更新规则详情模态框
            let ruleModal = document.getElementById('ruleDetailsModal');
            if (!ruleModal) {
                ruleModal = document.createElement('div');
                ruleModal.id = 'ruleDetailsModal';
                ruleModal.className = 'modal';
                ruleModal.style.cssText = 'display: none; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6);';
                
                const modalContent = document.createElement('div');
                modalContent.style.cssText = 'background-color: white; margin: 10% auto; padding: 0; border-radius: 12px; width: 600px; max-width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
                
                ruleModal.appendChild(modalContent);
                document.body.appendChild(ruleModal);
                
                // 点击模态框外部关闭
                ruleModal.addEventListener('click', (e) => {
                    if (e.target === ruleModal) {
                        ruleModal.style.display = 'none';
                    }
                });
            }
            
            ruleModal.querySelector('div').innerHTML = detailsHtml;
            ruleModal.style.display = 'block';
            
            // 为模态框内的标签链接添加点击事件
            ruleModal.querySelectorAll('.tag-link-in-modal').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tagId = parseInt(link.getAttribute('data-tag-id'));
                    // 先关闭规则详情模态框
                    ruleModal.style.display = 'none';
                    // 显示标签详情
                    this.showTagDetails(tagId);
                });
            });
            
            // 为模态框内的子集链接添加点击事件
            ruleModal.querySelectorAll('.subset-link-in-modal').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const subsetId = parseInt(link.getAttribute('data-subset-id'));
                    // 先关闭规则详情模态框
                    ruleModal.style.display = 'none';
                    // 显示子集详情
                    this.showSubsetDetails(subsetId);
                });
            });
            
        } catch (error) {
            console.error('显示规则详情失败:', error);
            alert('显示规则详情失败: ' + error.message);
        }
    }
    
    // 显示标签详情
    showTagDetails(tagId) {
        try {
            // 使用game-tags.js中的getGameTagName函数
            const tagName = window.getGameTagName ? window.getGameTagName(tagId) : (window.GameTags?.[tagId] || `未知标签(${tagId})`);
            
            // 构建详情HTML
            let detailsHtml = `
                <div style="padding: 20px;">
                    <h3 style="margin-bottom: 20px; color: #2c3e50;">🏷️ 标签详情</h3>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="margin-bottom: 12px;"><strong>标签ID:</strong> ${tagId}</div>
                        <div style="margin-bottom: 12px;"><strong>标签名称:</strong> ${tagName}</div>
                        <div style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 6px; font-size: 13px; color: #1976d2;">
                            💡 这是炉石传说游戏中使用的标签（GameTag），用于定义卡牌属性、机制和规则。
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <button onclick="document.getElementById('tagDetailsModal').style.display='none'" 
                                style="padding: 10px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            关闭
                        </button>
                    </div>
                </div>
            `;
            
            // 创建或更新标签详情模态框
            let tagModal = document.getElementById('tagDetailsModal');
            if (!tagModal) {
                tagModal = document.createElement('div');
                tagModal.id = 'tagDetailsModal';
                tagModal.className = 'modal';
                tagModal.style.cssText = 'display: none; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6);';
                
                const modalContent = document.createElement('div');
                modalContent.style.cssText = 'background-color: white; margin: 10% auto; padding: 0; border-radius: 12px; width: 600px; max-width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
                
                tagModal.appendChild(modalContent);
                document.body.appendChild(tagModal);
                
                // 点击模态框外部关闭
                tagModal.addEventListener('click', (e) => {
                    if (e.target === tagModal) {
                        tagModal.style.display = 'none';
                    }
                });
            }
            
            tagModal.querySelector('div').innerHTML = detailsHtml;
            tagModal.style.display = 'block';
            
        } catch (error) {
            console.error('加载标签详情失败:', error);
            alert('加载标签详情失败: ' + error.message);
        }
    }
    
    // 切换查看模式
    switchViewMode(mode) {
        console.log(`🔄 切换查看模式: ${mode}`);
        console.log(`📊 allRulesets 数量: ${this.allRulesets.length}`);
        console.log(`📊 allRules 数量: ${this.allRules.length}`);
        console.log(`📊 allSubsets 数量: ${this.allSubsets.length}`);
        console.log(`📊 allSubsetRules 数量: ${this.allSubsetRules.length}`);
        
        this.viewMode = mode;
        this.pagination.reset(); // 切换模式时重置到第一页
        
        // 显示/隐藏子集筛选选项
        const subsetFilterWithRulesLabel = document.getElementById('subsetFilterWithRulesLabel');
        const subsetFilterWithCardsLabel = document.getElementById('subsetFilterWithCardsLabel');
        if (mode === 'subset') {
            subsetFilterWithRulesLabel.style.display = 'flex';
            subsetFilterWithCardsLabel.style.display = 'flex';
        } else {
            subsetFilterWithRulesLabel.style.display = 'none';
            subsetFilterWithCardsLabel.style.display = 'none';
        }
        
        // 更新按钮状态
        const rulesetBtn = document.getElementById('viewByRulesetBtn');
        const ruleBtn = document.getElementById('viewByRuleBtn');
        const subsetBtn = document.getElementById('viewBySubsetBtn');
        const subsetRuleBtn = document.getElementById('viewBySubsetRuleBtn');
        
        // 移除所有active
        [rulesetBtn, ruleBtn, subsetBtn, subsetRuleBtn].forEach(btn => btn.classList.remove('active'));
        
        // 添加当前active
        if (mode === 'ruleset') {
            rulesetBtn.classList.add('active');
        } else if (mode === 'rule') {
            ruleBtn.classList.add('active');
        } else if (mode === 'subset') {
            subsetBtn.classList.add('active');
        } else if (mode === 'subsetRule') {
            subsetRuleBtn.classList.add('active');
        }
        
        // 重新渲染
        this.filterRulesets();
    }
    
    // 关闭规则集版本对比模态框
    closeRulesetCompareModal() {
        const modal = document.getElementById('rulesetCompareModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }
    
    // 规则集版本对比
    async compareVersionRulesets() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        if (!oldVersion || !newVersion) {
            alert('请选择两个版本进行对比');
            return;
        }
        
        if (oldVersion === newVersion) {
            alert('请选择不同的版本进行对比');
            return;
        }
        
        // 加载两个版本的规则集数据
        const oldData = await this.loadVersionRulesets(oldVersion);
        const newData = await this.loadVersionRulesets(newVersion);
        
        if (!oldData || !newData) {
            alert('加载版本数据失败');
            return;
        }
        
        // 执行对比
        const compareResults = this.performRulesetComparison(oldData, newData);
        
        // 显示对比结果
        this.showRulesetCompareResults(oldVersion, newVersion, compareResults);
    }
    
    // 加载指定版本的规则集数据
    async loadVersionRulesets(version) {
        try {
            window.dataManager.setVersion(version);
            
            // 加载 DECK_RULESET
            const rulesetData = await window.dataManager.loadFile('DECK_RULESET', version);
            const rulesets = rulesetData?.Records || [];
            
            // 加载 DECK_RULESET_RULE
            const ruleData = await window.dataManager.loadFile('DECK_RULESET_RULE', version);
            const rules = ruleData?.Records || [];
            
            return { rulesets, rules };
        } catch (error) {
            console.error(`加载版本 ${version} 数据失败:`, error);
            return null;
        }
    }
    
    // 执行规则集对比
    performRulesetComparison(oldData, newData) {
        const oldRulesets = oldData.rulesets;
        const newRulesets = newData.rulesets;
        const oldRules = oldData.rules;
        const newRules = newData.rules;
        
        // 创建映射
        const oldMap = new Map(oldRulesets.map(r => [r.m_ID, r]));
        const newMap = new Map(newRulesets.map(r => [r.m_ID, r]));
        const oldRulesMap = new Map();
        const newRulesMap = new Map();
        
        // 按规则集ID分组规则
        oldRules.forEach(rule => {
            if (!oldRulesMap.has(rule.m_deckRulesetId)) {
                oldRulesMap.set(rule.m_deckRulesetId, []);
            }
            oldRulesMap.get(rule.m_deckRulesetId).push(rule);
        });
        
        newRules.forEach(rule => {
            if (!newRulesMap.has(rule.m_deckRulesetId)) {
                newRulesMap.set(rule.m_deckRulesetId, []);
            }
            newRulesMap.get(rule.m_deckRulesetId).push(rule);
        });
        
        const added = [];
        const removed = [];
        const modified = [];
        
        // 查找新增和修改的规则集
        newRulesets.forEach(newRuleset => {
            const oldRuleset = oldMap.get(newRuleset.m_ID);
            
            if (!oldRuleset) {
                // 新增的规则集
                added.push({
                    ruleset: newRuleset,
                    rules: newRulesMap.get(newRuleset.m_ID) || []
                });
            } else {
                // 检查是否有变化
                const oldRulesList = oldRulesMap.get(newRuleset.m_ID) || [];
                const newRulesList = newRulesMap.get(newRuleset.m_ID) || [];
                
                // 比较规则集属性和规则
                const rulesetChanged = JSON.stringify(oldRuleset) !== JSON.stringify(newRuleset);
                const rulesChanged = JSON.stringify(oldRulesList) !== JSON.stringify(newRulesList);
                
                if (rulesetChanged || rulesChanged) {
                    modified.push({
                        oldRuleset,
                        newRuleset,
                        oldRules: oldRulesList,
                        newRules: newRulesList
                    });
                }
            }
        });
        
        // 查找删除的规则集
        oldRulesets.forEach(oldRuleset => {
            if (!newMap.has(oldRuleset.m_ID)) {
                removed.push({
                    ruleset: oldRuleset,
                    rules: oldRulesMap.get(oldRuleset.m_ID) || []
                });
            }
        });
        
        return { added, removed, modified };
    }
    
    // 显示规则集版本对比结果
    showRulesetCompareResults(oldVersion, newVersion, results) {
        console.log('📊 显示规则集对比结果:', { oldVersion, newVersion, results });
        const modal = document.getElementById('rulesetCompareModal');
        const content = document.getElementById('rulesetCompareResults');
        
        if (!modal || !content) {
            console.error('❌ 模态框元素未找到:', { modal: !!modal, content: !!content });
            return;
        }
        
        let html = `
            <div style="padding: 20px;">
                <h2 style="margin-bottom: 20px; color: #2c3e50;">📊 规则集版本对比</h2>
                <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
                    <strong>对比版本:</strong> ${oldVersion} ➜ ${newVersion}
                </div>
        `;
        
        // 新增的规则集
        if (results.added.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #27ae60; margin-bottom: 15px;">✨ 新增规则集 (${results.added.length})</h3>
            `;
            
            results.added.forEach(item => {
                const ruleset = item.ruleset;
                const rules = item.rules;
                
                html += `
                    <div style="margin-bottom: 20px; padding: 15px; background: #d5f4e6; border-left: 4px solid #27ae60; border-radius: 6px;">
                        <div style="margin-bottom: 10px;"><strong>ID:</strong> ${ruleset.m_ID}</div>
                        <div style="margin-bottom: 10px;"><strong>规则数量:</strong> ${rules.length}</div>
                `;
                
                if (rules.length > 0) {
                    html += `<div style="margin-top: 10px;"><strong>规则列表:</strong></div><div style="margin-left: 20px;">`;
                    rules.forEach(rule => {
                        const ruleTypeName = this.deckRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                        html += `
                            <div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px; font-size: 13px;">
                                <div><strong>规则ID:</strong> <span class="rule-id-link" data-rule-id="${rule.m_ID}" style="color: #3498db; cursor: pointer; text-decoration: underline;" onclick="window.deckRulesetManager.showRuleDetails(${rule.m_ID})">${rule.m_ID}</span></div>
                                <div><strong>类型:</strong> ${ruleTypeName}</div>
                                <div><strong>应用于子集ID:</strong> ${rule.m_appliesToSubsetId ?? '无'}</div>
                                <div><strong>最小值:</strong> ${rule.m_minValue ?? '无'}</div>
                                <div><strong>最大值:</strong> ${rule.m_maxValue ?? '无'}</div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        }
        
        // 删除的规则集
        if (results.removed.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #e74c3c; margin-bottom: 15px;">🗑️ 删除规则集 (${results.removed.length})</h3>
            `;
            
            results.removed.forEach(item => {
                const ruleset = item.ruleset;
                const rules = item.rules;
                
                html += `
                    <div style="margin-bottom: 20px; padding: 15px; background: #fadbd8; border-left: 4px solid #e74c3c; border-radius: 6px;">
                        <div style="margin-bottom: 10px;"><strong>ID:</strong> ${ruleset.m_ID}</div>
                        <div style="margin-bottom: 10px;"><strong>规则数量:</strong> ${rules.length}</div>
                `;
                
                if (rules.length > 0) {
                    html += `<div style="margin-top: 10px;"><strong>规则列表:</strong></div><div style="margin-left: 20px;">`;
                    rules.forEach(rule => {
                        const ruleTypeName = this.deckRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                        html += `
                            <div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px; font-size: 13px;">
                                <div><strong>规则ID:</strong> ${rule.m_ID}</div>
                                <div><strong>类型:</strong> ${ruleTypeName}</div>
                                <div><strong>应用于子集ID:</strong> ${rule.m_appliesToSubsetId ?? '无'}</div>
                                <div><strong>最小值:</strong> ${rule.m_minValue ?? '无'}</div>
                                <div><strong>最大值:</strong> ${rule.m_maxValue ?? '无'}</div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        }
        
        // 修改的规则集
        if (results.modified.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #f39c12; margin-bottom: 15px;">🔄 修改规则集 (${results.modified.length})</h3>
            `;
            
            results.modified.forEach(item => {
                const oldRuleset = item.oldRuleset;
                const newRuleset = item.newRuleset;
                const oldRules = item.oldRules;
                const newRules = item.newRules;
                
                html += `
                    <div style="margin-bottom: 20px; padding: 15px; background: #fef5e7; border-left: 4px solid #f39c12; border-radius: 6px;">
                        <div style="margin-bottom: 10px;"><strong>规则集ID:</strong> ${newRuleset.m_ID}</div>
                `;
                
                // 比较规则变化
                const oldRuleIds = new Set(oldRules.map(r => r.m_ID));
                const newRuleIds = new Set(newRules.map(r => r.m_ID));
                
                const addedRules = newRules.filter(r => !oldRuleIds.has(r.m_ID));
                const removedRules = oldRules.filter(r => !newRuleIds.has(r.m_ID));
                const commonRules = newRules.filter(r => oldRuleIds.has(r.m_ID));
                
                if (addedRules.length > 0) {
                    html += `<div style="margin-top: 10px; color: #27ae60;"><strong>➕ 新增规则 (${addedRules.length}):</strong></div><div style="margin-left: 20px;">`;
                    addedRules.forEach(rule => {
                        const ruleTypeName = this.deckRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                        html += `
                            <div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px; font-size: 13px;">
                                <div><strong>规则ID:</strong> <span class="rule-id-link" data-rule-id="${rule.m_ID}" style="color: #3498db; cursor: pointer; text-decoration: underline;" onclick="window.deckRulesetManager.showRuleDetails(${rule.m_ID})">${rule.m_ID}</span></div>
                                <div><strong>类型:</strong> ${ruleTypeName}</div>
                                <div><strong>应用于子集ID:</strong> ${rule.m_appliesToSubsetId ?? '无'}</div>
                                <div><strong>最小值:</strong> ${rule.m_minValue ?? '无'}</div>
                                <div><strong>最大值:</strong> ${rule.m_maxValue ?? '无'}</div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
                
                if (removedRules.length > 0) {
                    html += `<div style="margin-top: 10px; color: #e74c3c;"><strong>➖ 删除规则 (${removedRules.length}):</strong></div><div style="margin-left: 20px;">`;
                    removedRules.forEach(rule => {
                        const ruleTypeName = this.deckRuleTypes[rule.m_ruleType] || `未知(${rule.m_ruleType})`;
                        html += `
                            <div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px; font-size: 13px;">
                                <div><strong>规则ID:</strong> ${rule.m_ID}</div>
                                <div><strong>类型:</strong> ${ruleTypeName}</div>
                                <div><strong>应用于子集ID:</strong> ${rule.m_appliesToSubsetId ?? '无'}</div>
                                <div><strong>最小值:</strong> ${rule.m_minValue ?? '无'}</div>
                                <div><strong>最大值:</strong> ${rule.m_maxValue ?? '无'}</div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        }
        
        if (results.added.length === 0 && results.removed.length === 0 && results.modified.length === 0) {
            html += `<div style="padding: 30px; text-align: center; color: #7f8c8d;">📝 两个版本的规则集完全相同</div>`;
        }
        
        html += `</div>`;
        
        content.innerHTML = html;
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // 添加规则ID点击事件
        content.querySelectorAll('.rule-id-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const ruleId = parseInt(e.target.dataset.ruleId);
                this.showRuleDetails(ruleId);
            });
        });
        
        // 添加标签ID点击事件
        content.querySelectorAll('.tag-id-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const tagId = parseInt(e.target.dataset.tagId);
                this.showTagDetails(tagId);
            });
        });
    }
}

// 初始化系统
let rulesetSystem;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        rulesetSystem = new DeckRulesetSystem();
    });
} else {
    rulesetSystem = new DeckRulesetSystem();
}

window.rulesetSystem = rulesetSystem;
