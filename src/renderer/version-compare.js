// 炉石传说版本对比系统
class VersionCompareSystem {
    constructor() {
        this.availableVersions = [];
        this.oldVersionData = null;
        this.newVersionData = null;
        this.dataPath = './data'; // 默认数据路径
        this.compareResults = {
            added: [],
            modified: [],
            deleted: []
        };
        
        // GameTags定义
        this.GameTags = {
            HEALTH: 45,
            ATK: 47,
            COST: 48,
            DURABILITY: 187,
            ARMOR: 292,
            CLASS: 199,
            CARDTYPE: 202,
            RARITY: 203,
            CARD_SET: 183,
            TAUNT: 190,
            DIVINE_SHIELD: 194,
            CHARGE: 197,
            WINDFURY: 189,
            STEALTH: 191,
            POISONOUS: 363,
            LIFESTEAL: 685,
            RUSH: 791,
            ECHO: 846,
            MAGNETIC: 849,
            REBORN: 1085,
            BATTLECRY: 218,
            DEATHRATTLE: 217,
            SPELLPOWER: 192
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 VersionCompareSystem 初始化开始');
        this.setupEventListeners();
        console.log('📝 事件监听器设置完成');
        await this.detectVersions();
        console.log('✅ VersionCompareSystem 初始化完成');
    }
    
    setupEventListeners() {
        // 版本选择
        const oldVersionSelect = document.getElementById('oldVersionSelect');
        const newVersionSelect = document.getElementById('newVersionSelect');
        const startCompareBtn = document.getElementById('startCompareBtn');
        const refreshVersionsBtn = document.getElementById('refreshVersionsBtn');
        
        if (oldVersionSelect) oldVersionSelect.addEventListener('change', () => this.onVersionSelect());
        if (newVersionSelect) newVersionSelect.addEventListener('change', () => this.onVersionSelect());
        if (startCompareBtn) startCompareBtn.addEventListener('click', () => this.startCompare());
        if (refreshVersionsBtn) refreshVersionsBtn.addEventListener('click', () => this.detectVersions());
        
        // 结果标签页
        const addedTab = document.getElementById('addedTab');
        const modifiedTab = document.getElementById('modifiedTab');
        const deletedTab = document.getElementById('deletedTab');
        
        if (addedTab) addedTab.addEventListener('click', () => this.switchResultTab('added'));
        if (modifiedTab) modifiedTab.addEventListener('click', () => this.switchResultTab('modified'));
        if (deletedTab) deletedTab.addEventListener('click', () => this.switchResultTab('deleted'));
        
        // 操作按钮
        const exportResultsBtn = document.getElementById('exportResultsBtn');
        const newCompareBtn = document.getElementById('newCompareBtn');
        const backToCompareBtn = document.getElementById('backToCompareBtn');
        
        if (exportResultsBtn) exportResultsBtn.addEventListener('click', () => this.exportResults());
        if (newCompareBtn) newCompareBtn.addEventListener('click', () => this.resetCompare());
        if (backToCompareBtn) backToCompareBtn.addEventListener('click', () => this.resetCompare());
        
        // 导出CardID按钮
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        
        if (exportTxtBtn) exportTxtBtn.addEventListener('click', () => this.exportCardIds('txt'));
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportCardIds('excel'));
        
        // 模态框
        const closeModal = document.getElementById('closeModal');
        const cardModal = document.getElementById('cardModal');
        
        if (closeModal) closeModal.addEventListener('click', () => this.closeModal());
        if (cardModal) {
            cardModal.addEventListener('click', (e) => {
                if (e.target.id === 'cardModal') this.closeModal();
            });
        }
    }
    
    // 检测版本文件夹
    async detectVersions() {
        console.log('🔍 开始检测版本');
        
        try {
            document.getElementById('detectionStatus').textContent = '正在检测版本文件夹...';
            console.log('📂 开始扫描版本文件夹');
            
            if (window.fileAPI) {
                console.log('🔧 使用Electron API扫描文件夹');
                
                // 首先尝试获取默认数据路径
                let scanPath = './data';
                try {
                    const defaultPathResult = await window.fileAPI.getDefaultDataPath();
                    if (defaultPathResult.success) {
                        scanPath = defaultPathResult.path;
                        this.dataPath = scanPath; // 存储数据路径供后续使用
                        console.log('📍 使用默认数据路径:', scanPath);
                        document.getElementById('dataPathInfo').textContent = `📍 数据路径: ${scanPath}`;
                    } else {
                        console.log('📍 使用相对数据路径:', scanPath);
                        document.getElementById('dataPathInfo').textContent = `📍 数据路径: ${scanPath} (相对路径)`;
                    }
                } catch (error) {
                    console.warn('⚠️ 获取默认路径失败，使用相对路径:', error);
                }
                
                // 通过Electron API读取data文件夹
                const result = await window.fileAPI.scanDirectories(scanPath);
                console.log('📊 扫描结果:', result);
                
                if (result.success) {
                    console.log('📁 原始目录列表:', result.directories);
                    this.availableVersions = result.directories.filter(dir => 
                        /^\d+(\.\d+)*$/.test(dir) // 匹配版本号格式
                    ).sort((a, b) => this.compareVersions(b, a)); // 降序排列
                    console.log('✅ 筛选后的版本列表:', this.availableVersions);
                } else {
                    console.error('❌ 扫描失败:', result.error);
                    throw new Error(result.error);
                }
            } else {
                console.warn('⚠️ 使用降级方案：预设版本');
                // 降级方案：使用预设版本
                this.availableVersions = ['30.6.0', '30.4.0', '30.2.0', '30.0.0'];
            }
            
            if (this.availableVersions.length >= 2) {
                this.populateVersionSelectors();
                this.autoSelectLatestVersions();
                this.showVersionSelector();
            } else {
                throw new Error('至少需要2个版本文件夹才能进行对比，请在数据目录下添加以版本号命名的文件夹，并将dbf解包后的所有json文件放进版本文件夹内。');
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
    populateVersionSelectors() {
        const oldSelect = document.getElementById('oldVersionSelect');
        const newSelect = document.getElementById('newVersionSelect');
        
        // 清空现有选项
        oldSelect.innerHTML = '<option value="">请选择旧版本</option>';
        newSelect.innerHTML = '<option value="">请选择新版本</option>';
        
        // 添加版本选项
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
    
    // 自动选择最新的两个版本
    autoSelectLatestVersions() {
        if (this.availableVersions.length >= 2) {
            document.getElementById('newVersionSelect').value = this.availableVersions[0];
            document.getElementById('oldVersionSelect').value = this.availableVersions[1];
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
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        // 立即禁用对比按钮
        const startBtn = document.getElementById('startCompareBtn');
        startBtn.disabled = true;
        
        // 更新版本信息
        const oldVersionValid = await this.updateVersionInfo('oldVersionInfo', oldVersion);
        const newVersionValid = await this.updateVersionInfo('newVersionInfo', newVersion);
        
        // 只有当所有条件都满足时才启用对比按钮
        const canCompare = oldVersion && newVersion && 
                          oldVersion !== newVersion && 
                          oldVersionValid && newVersionValid;
        startBtn.disabled = !canCompare;
        
        if (oldVersion === newVersion && oldVersion) {
            alert('请选择不同的版本进行对比');
        }
    }
    
    // 更新版本信息显示
    async updateVersionInfo(elementId, version) {
        const element = document.getElementById(elementId);
        if (!version) {
            element.innerHTML = '';
            return false;
        }
        
        // 检测必要文件是否存在
        const cardPath = `./data/${version}/CARD.json`;
        const tagPath = `./data/${version}/CARD_TAG.json`;
        
        try {
            const [cardResult, tagResult] = await Promise.all([
                window.fileAPI.readFile(cardPath),
                window.fileAPI.readFile(tagPath)
            ]);
            
            let status = '';
            let statusClass = '';
            const missingFiles = [];
            
            if (!cardResult.success) {
                missingFiles.push('CARD.json');
            }
            if (!tagResult.success) {
                missingFiles.push('CARD_TAG.json');
            }
            
            const isValid = missingFiles.length === 0;
            
            if (isValid) {
                status = '✅ 准备就绪';
                statusClass = 'status-ready';
            } else {
                status = `❌ 缺少文件: ${missingFiles.join(', ')}`;
                statusClass = 'status-error';
            }
            
            element.innerHTML = `
                <div><strong>版本号:</strong> ${version}</div>
                <div><strong>路径:</strong> ./data/${version}/</div>
                <div><strong>状态:</strong> <span class="${statusClass}">${status}</span></div>
            `;
            
            return isValid;
        } catch (error) {
            element.innerHTML = `
                <div><strong>版本号:</strong> ${version}</div>
                <div><strong>路径:</strong> ./data/${version}/</div>
                <div><strong>状态:</strong> <span class="status-error">❌ 检测失败: ${error.message}</span></div>
            `;
            return false;
        }
    }
    
    // 开始对比
    async startCompare() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        console.log('🚀 开始版本对比流程:', { oldVersion, newVersion });
        
        try {
            // 显示进度区域
            console.log('📺 显示进度区域');
            this.showProgressSection();
            
            // 加载版本数据
            console.log('📁 开始加载版本数据');
            await this.loadVersionData(oldVersion, newVersion);
            console.log('✅ 版本数据加载完成');
            
            // 执行对比
            console.log('🔍 开始执行对比');
            await this.performComparison();
            console.log('✅ 对比执行完成');
            
            // 显示结果
            console.log('📊 显示对比结果');
            this.showResults();
            console.log('🎉 完整对比流程完成');
            
        } catch (error) {
            console.error('❌ 对比失败:', error);
            alert('对比失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 显示进度区域
    showProgressSection() {
        document.querySelector('.version-selection-section').style.display = 'none';
        document.getElementById('compareProgressSection').style.display = 'block';
        this.updateProgress(0, '准备加载数据...');
    }
    
    // 隐藏进度区域
    hideProgressSection() {
        document.getElementById('compareProgressSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
    }
    
    // 更新进度
    updateProgress(percent, text) {
        console.log(`📊 进度更新: ${percent}% - ${text}`);
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }
    
    // 加载版本数据
    async loadVersionData(oldVersion, newVersion) {
        console.log('🔄 开始加载版本数据:', { oldVersion, newVersion });
        
        try {
            this.updateProgress(10, '正在加载旧版本数据...');
            console.log('📁 开始加载旧版本:', oldVersion);
            this.oldVersionData = await this.loadSingleVersionData(oldVersion);
            console.log('✅ 旧版本数据加载完成:', this.oldVersionData?.cards?.length || 0, '张卡牌');
            
            this.updateProgress(40, '正在加载新版本数据...');
            console.log('📁 开始加载新版本:', newVersion);
            this.newVersionData = await this.loadSingleVersionData(newVersion);
            console.log('✅ 新版本数据加载完成:', this.newVersionData?.cards?.length || 0, '张卡牌');
            
            this.updateProgress(60, '数据加载完成，准备对比...');
            console.log('🎉 所有数据加载完成');
        } catch (error) {
            console.error('❌ 加载版本数据失败:', error);
            throw error;
        }
    }
    
    // 加载单个版本的数据
    async loadSingleVersionData(version) {
        console.log(`📂 开始加载版本 ${version} 的数据`);
        
        try {
            // 使用简单的相对路径，让主进程处理实际路径转换
            const cardPath = `data/${version}/CARD.json`;
            const tagPath = `data/${version}/CARD_TAG.json`;
            
            console.log(`🔍 尝试加载文件:`, { cardPath, tagPath });
            
            // 使用IPC调用来读取文件，而不是fetch
            const [cardResult, tagResult] = await Promise.all([
                window.fileAPI.readFile(cardPath),
                window.fileAPI.readFile(tagPath)
            ]);
            
            console.log(`📥 文件读取结果:`, {
                cardSuccess: cardResult.success,
                tagSuccess: tagResult.success
            });
            
            if (!cardResult.success || !tagResult.success) {
                throw new Error(`无法加载版本 ${version} 的数据文件 - CARD: ${cardResult.success ? 'OK' : cardResult.error}, TAG: ${tagResult.success ? 'OK' : tagResult.error}`);
            }
            
            console.log(`⏳ 开始解析JSON数据...`);
            const cardData = JSON.parse(cardResult.data);
            const tagData = JSON.parse(tagResult.data);
            
            console.log(`📊 原始数据统计:`, {
                cardDataKeys: Object.keys(cardData),
                cardRecordsLength: cardData.Records?.length || 0,
                tagDataKeys: Object.keys(tagData),
                tagRecordsLength: tagData.Records?.length || 0
            });
            
            console.log(`🔧 开始处理数据...`);
            const processedCards = this.processCardData(cardData);
            const processedTags = this.processTagData(tagData);
            
            console.log(`✅ 版本 ${version} 数据处理完成:`, {
                cardsCount: processedCards.length,
                tagsCount: processedTags.length
            });
            
            return {
                version,
                cards: processedCards,
                tags: processedTags
            };
            
        } catch (error) {
            console.error(`❌ 加载版本 ${version} 失败:`, error);
            throw new Error(`加载版本 ${version} 失败: ${error.message}`);
        }
    }
    
    // 处理卡牌数据
    processCardData(data) {
        if (data.Records) {
            return data.Records.map(card => ({
                id: card.m_ID || card.ID || 0,
                cardId: card.m_noteMiniGuid || '',
                name: card.m_name ? this.extractLocalizedText(card.m_name) : `卡牌 ${card.m_ID || card.ID}`,
                cost: card.m_cost || card.cost || 0,
                rarity: card.m_rarity || card.rarity || 1,
                cardClass: card.m_class || card.cardClass || 0,
                cardType: card.m_type || card.type || 0,
                cardSet: card.m_set || card.set || 0,
                text: card.m_textInHand ? this.extractLocalizedText(card.m_textInHand) : '',
                raw: card
            }));
        }
        return [];
    }
    
    // 处理标签数据
    processTagData(data) {
        if (data.Records) {
            return data.Records.map(tag => ({
                cardId: tag.m_cardId,
                tagId: tag.m_tagId,
                tagValue: tag.m_tagValue
            }));
        }
        return [];
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
    
    // 执行对比
    async performComparison() {
        const totalStartTime = performance.now();
        console.log('🔍 开始执行对比分析');
        
        this.updateProgress(70, '正在对比卡牌数据...');
        
        // 创建卡牌映射
        console.log('📊 创建卡牌映射...');
        const mapStartTime = performance.now();
        const oldCards = new Map();
        const newCards = new Map();
        
        this.oldVersionData.cards.forEach(card => oldCards.set(card.id, card));
        this.newVersionData.cards.forEach(card => newCards.set(card.id, card));
        
        console.log(`✅ 卡牌映射创建完成，耗时 ${(performance.now() - mapStartTime).toFixed(2)}ms`, {
            oldCardsCount: oldCards.size,
            newCardsCount: newCards.size
        });
        
        // 创建标签映射
        console.log('🏷️ 创建标签映射...');
        const tagStartTime = performance.now();
        const oldTags = this.createTagMap(this.oldVersionData.tags);
        const newTags = this.createTagMap(this.newVersionData.tags);
        
        console.log(`✅ 标签映射创建完成，耗时 ${(performance.now() - tagStartTime).toFixed(2)}ms`, {
            oldTagsCount: oldTags.size,
            newTagsCount: newTags.size
        });
        
        this.updateProgress(80, '正在分析卡牌变化...');
        console.log('🔍 开始分析卡牌变化');
        
        // 重置结果
        this.compareResults = { added: [], modified: [], deleted: [] };
        console.log('🔄 重置对比结果');
        
        // 查找新增卡牌
        console.log('➕ 开始查找新增卡牌...');
        let addedCount = 0;
        newCards.forEach((card, id) => {
            if (!oldCards.has(id)) {
                this.compareResults.added.push(this.enrichCardWithTags(card, newTags));
                addedCount++;
                if (addedCount % 100 === 0) {
                    console.log(`➕ 已处理 ${addedCount} 张新增卡牌`);
                }
            }
        });
        console.log(`✅ 新增卡牌查找完成，共找到 ${this.compareResults.added.length} 张`);
        
        // 查找删除卡牌
        console.log('🗑️ 开始查找删除卡牌...');
        let deletedCount = 0;
        oldCards.forEach((card, id) => {
            if (!newCards.has(id)) {
                this.compareResults.deleted.push(this.enrichCardWithTags(card, oldTags));
                deletedCount++;
                if (deletedCount % 100 === 0) {
                    console.log(`🗑️ 已处理 ${deletedCount} 张删除卡牌`);
                }
            }
        });
        console.log(`✅ 删除卡牌查找完成，共找到 ${this.compareResults.deleted.length} 张`);
        
        // 查找修改卡牌
        console.log('✏️ 开始查找修改卡牌...');
        let modifiedCount = 0;
        let processedCount = 0;
        newCards.forEach((newCard, id) => {
            if (oldCards.has(id)) {
                processedCount++;
                if (processedCount % 500 === 0) {
                    console.log(`✏️ 已检查 ${processedCount} 张卡牌的修改情况`);
                }
                
                const oldCard = oldCards.get(id);
                const changes = this.compareCards(oldCard, newCard, oldTags, newTags);
                if (changes.length > 0) {
                    this.compareResults.modified.push({
                        ...this.enrichCardWithTags(newCard, newTags),
                        changes,
                        oldCard: this.enrichCardWithTags(oldCard, oldTags)
                    });
                    modifiedCount++;
                    if (modifiedCount % 50 === 0) {
                        console.log(`✏️ 已找到 ${modifiedCount} 张修改卡牌`);
                    }
                }
            }
        });
        console.log(`✅ 修改卡牌查找完成，共找到 ${this.compareResults.modified.length} 张`);
        
        console.log('🎉 所有卡牌变化分析完成！', {
            added: this.compareResults.added.length,
            modified: this.compareResults.modified.length,
            deleted: this.compareResults.deleted.length,
            totalChecked: processedCount
        });
        
        const totalEndTime = performance.now();
        const totalDuration = totalEndTime - totalStartTime;
        console.log(`⏱️ 整个对比流程耗时 ${(totalDuration / 1000).toFixed(2)} 秒`);
        
        this.updateProgress(100, '对比完成！');
    }
    
    // 创建标签映射（优化版：按卡牌ID建立索引）
    createTagMap(tags) {
        const startTime = performance.now();
        console.log(`🏷️ 开始创建标签映射，处理 ${tags.length} 个标签`);
        
        const tagMap = new Map(); // 原有的key-value映射，保持兼容性
        const cardTagsIndex = new Map(); // 新增：按卡牌ID索引的标签数组
        let processedCount = 0;
        
        tags.forEach(tag => {
            // 保持原有的映射方式
            const key = `${tag.cardId}_${tag.tagId}`;
            tagMap.set(key, tag.tagValue);
            
            // 新增：按卡牌ID建立索引
            if (!cardTagsIndex.has(tag.cardId)) {
                cardTagsIndex.set(tag.cardId, []);
            }
            cardTagsIndex.get(tag.cardId).push({ tagId: tag.tagId, value: tag.tagValue });
            
            processedCount++;
            if (processedCount % 10000 === 0) {
                console.log(`🏷️ 已处理 ${processedCount} 个标签映射`);
            }
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`✅ 标签映射创建完成，耗时 ${duration.toFixed(2)}ms`, {
            totalMappings: tagMap.size,
            uniqueCards: cardTagsIndex.size,
            avgTagsPerCard: (tags.length / cardTagsIndex.size).toFixed(1)
        });
        
        // 将索引附加到tagMap对象上
        tagMap.cardTagsIndex = cardTagsIndex;
        return tagMap;
    }
    
    // 为卡牌添加标签信息
    enrichCardWithTags(card, tagMap) {
        const getTagValue = (tagId) => {
            const key = `${card.id}_${tagId}`;
            return tagMap.get(key) || 0;
        };
        
        return {
            ...card,
            attack: getTagValue(this.GameTags.ATK),
            health: getTagValue(this.GameTags.HEALTH),
            durability: getTagValue(this.GameTags.DURABILITY),
            armor: getTagValue(this.GameTags.ARMOR),
            tags: this.getCardTags(card.id, tagMap)
        };
    }
    
    // 获取卡牌所有标签（优化版：使用索引）
    getCardTags(cardId, tagMap) {
        const startTime = performance.now();
        
        // 优先使用索引
        if (tagMap.cardTagsIndex && tagMap.cardTagsIndex.has(cardId)) {
            const tags = tagMap.cardTagsIndex.get(cardId);
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // 只有耗时超过1ms才记录（因为现在应该很快）
            if (duration > 1) {
                console.log(`⚡ 卡牌 ${cardId} 标签获取耗时 ${duration.toFixed(2)}ms（索引方式），找到 ${tags.length} 个标签`);
            }
            
            return tags;
        }
        
        // 降级到原有的遍历方式
        console.log(`⚠️ 卡牌 ${cardId} 使用降级方式获取标签`);
        const tags = [];
        let checkedCount = 0;
        
        tagMap.forEach((value, key) => {
            checkedCount++;
            const [id, tagId] = key.split('_');
            if (parseInt(id) === cardId) {
                tags.push({ tagId: parseInt(tagId), value });
            }
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`⚠️ 卡牌 ${cardId} 标签获取耗时 ${duration.toFixed(2)}ms（遍历方式），检查了 ${checkedCount} 个标签映射，找到 ${tags.length} 个标签`);
        
        return tags;
    }
    
    // 对比两张卡牌
    compareCards(oldCard, newCard, oldTags, newTags) {
        const startTime = performance.now();
        const changes = [];
        
        // 对比基本属性
        const basicFields = ['name', 'cost', 'rarity', 'cardClass', 'cardType', 'cardSet', 'text'];
        basicFields.forEach(field => {
            if (oldCard[field] !== newCard[field]) {
                changes.push({
                    field,
                    label: this.getFieldLabel(field),
                    oldValue: oldCard[field],
                    newValue: newCard[field],
                    type: 'basic'
                });
            }
        });
        
        // 对比标签
        const oldCardTags = this.getCardTags(oldCard.id, oldTags);
        const newCardTags = this.getCardTags(newCard.id, newTags);
        
        const oldTagMap = new Map(oldCardTags.map(tag => [tag.tagId, tag.value]));
        const newTagMap = new Map(newCardTags.map(tag => [tag.tagId, tag.value]));
        
        // 检查所有标签变化
        const allTagIds = new Set([...oldTagMap.keys(), ...newTagMap.keys()]);
        allTagIds.forEach(tagId => {
            const oldValue = oldTagMap.get(tagId) || 0;
            const newValue = newTagMap.get(tagId) || 0;
            
            if (oldValue !== newValue) {
                changes.push({
                    field: `tag_${tagId}`,
                    label: this.getTagLabel(tagId),
                    oldValue,
                    newValue,
                    type: 'tag'
                });
            }
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // 如果某张卡牌处理时间超过10ms，记录日志
        if (duration > 10) {
            console.log(`⚠️ 卡牌 ${newCard.name || newCard.id} 处理耗时 ${duration.toFixed(2)}ms，变化数：${changes.length}`);
        }
        
        return changes;
    }
    
    // 获取字段标签
    getFieldLabel(field) {
        const labels = {
            name: '名称',
            cost: '法力消耗',
            rarity: '稀有度',
            cardClass: '职业',
            cardType: '卡牌类型',
            cardSet: '卡牌集',
            text: '描述文本'
        };
        return labels[field] || field;
    }
    
    // 获取标签标签
    getTagLabel(tagId) {
        const tagNames = Object.keys(this.GameTags);
        const tagName = tagNames.find(name => this.GameTags[name] === tagId);
        return tagName || `标签${tagId}`;
    }
    
    // 显示结果
    showResults() {
        document.getElementById('compareProgressSection').style.display = 'none';
        document.getElementById('compareResultsSection').style.display = 'block';
        
        this.updateResultsSummary();
        this.displayResults();
    }
    
    // 更新结果摘要
    updateResultsSummary() {
        const summary = document.getElementById('resultsSummary');
        summary.innerHTML = `
            <div class="summary-item added">
                <span class="summary-value">${this.compareResults.added.length}</span>
                <span class="summary-label">新增卡牌</span>
            </div>
            <div class="summary-item modified">
                <span class="summary-value">${this.compareResults.modified.length}</span>
                <span class="summary-label">修改卡牌</span>
            </div>
            <div class="summary-item deleted">
                <span class="summary-value">${this.compareResults.deleted.length}</span>
                <span class="summary-label">删除卡牌</span>
            </div>
        `;
    }
    
    // 显示结果内容
    displayResults() {
        this.displayAddedCards();
        this.displayModifiedCards();
        this.displayDeletedCards();
    }
    
    // 显示新增卡牌
    displayAddedCards() {
        const container = document.getElementById('addedCards');
        if (this.compareResults.added.length === 0) {
            container.innerHTML = '<div class="no-results"><h3>没有新增卡牌</h3></div>';
            return;
        }
        
        container.innerHTML = this.compareResults.added.map(card => `
            <div class="card-compare-item added" onclick="versionCompare.showCardDetails('${card.id}', 'added')">
                <div class="card-compare-header">
                    <span class="card-name">${card.name}</span>
                    <span class="card-id">CardID: ${card.cardId}</span>
                </div>
                <div class="card-changes">
                    <div class="change-item">
                        <div class="change-label">法力消耗</div>
                        <div class="change-value new-value">${card.cost}</div>
                    </div>
                    <div class="change-item">
                        <div class="change-label">攻击力</div>
                        <div class="change-value new-value">${card.attack}</div>
                    </div>
                    <div class="change-item">
                        <div class="change-label">生命值</div>
                        <div class="change-value new-value">${card.health}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 显示修改卡牌
    displayModifiedCards() {
        const container = document.getElementById('modifiedCards');
        if (this.compareResults.modified.length === 0) {
            container.innerHTML = '<div class="no-results"><h3>没有修改卡牌</h3></div>';
            return;
        }
        
        container.innerHTML = this.compareResults.modified.map(card => `
            <div class="card-compare-item modified" onclick="versionCompare.showCardDetails('${card.id}', 'modified')">
                <div class="card-compare-header">
                    <span class="card-name">${card.name}</span>
                    <span class="card-id">CardID: ${card.cardId}</span>
                </div>
                <div class="card-changes">
                    ${card.changes.slice(0, 3).map(change => `
                        <div class="change-item">
                            <div class="change-label">${change.label}</div>
                            <div class="change-value">
                                <span class="old-value">${change.oldValue}</span>
                                <span class="arrow">→</span>
                                <span class="new-value">${change.newValue}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${card.changes.length > 3 ? `<div class="change-item"><div class="change-label">还有 ${card.changes.length - 3} 个变化...</div></div>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // 显示删除卡牌
    displayDeletedCards() {
        const container = document.getElementById('deletedCards');
        if (this.compareResults.deleted.length === 0) {
            container.innerHTML = '<div class="no-results"><h3>没有删除卡牌</h3></div>';
            return;
        }
        
        container.innerHTML = this.compareResults.deleted.map(card => `
            <div class="card-compare-item deleted" onclick="versionCompare.showCardDetails('${card.id}', 'deleted')">
                <div class="card-compare-header">
                    <span class="card-name">${card.name}</span>
                    <span class="card-id">CardID: ${card.cardId}</span>
                </div>
                <div class="card-changes">
                    <div class="change-item">
                        <div class="change-label">法力消耗</div>
                        <div class="change-value old-value">${card.cost}</div>
                    </div>
                    <div class="change-item">
                        <div class="change-label">攻击力</div>
                        <div class="change-value old-value">${card.attack}</div>
                    </div>
                    <div class="change-item">
                        <div class="change-label">生命值</div>
                        <div class="change-value old-value">${card.health}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 切换结果标签页
    switchResultTab(tab) {
        document.querySelectorAll('.result-tab').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tab + 'Tab').classList.add('active');
        
        document.querySelectorAll('.result-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tab + 'Cards').classList.add('active');
    }
    
    // 显示卡牌详情
    showCardDetails(cardId, type) {
        let card, comparison = null;
        
        if (type === 'added') {
            card = this.compareResults.added.find(c => c.id == cardId);
        } else if (type === 'modified') {
            const modifiedCard = this.compareResults.modified.find(c => c.id == cardId);
            card = modifiedCard;
            comparison = modifiedCard.changes;
        } else if (type === 'deleted') {
            card = this.compareResults.deleted.find(c => c.id == cardId);
        }
        
        if (!card) return;
        
        document.getElementById('modalCardName').textContent = `${card.name} - ${type === 'added' ? '新增' : type === 'modified' ? '修改' : '删除'}`;
        
        const details = document.getElementById('cardCompareDetails');
        details.innerHTML = this.generateCardDetailsHTML(card, comparison, type);
        
        document.getElementById('cardModal').style.display = 'block';
    }
    
    // 生成卡牌详情HTML
    generateCardDetailsHTML(card, comparison, type) {
        let html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <h4>基本信息</h4>
                    <p><strong>卡牌ID:</strong> ${card.cardId}</p>
                    <p><strong>内部ID:</strong> ${card.id}</p>
                    <p><strong>名称:</strong> ${card.name}</p>
                    <p><strong>法力消耗:</strong> ${card.cost}</p>
                    <p><strong>攻击力:</strong> ${card.attack}</p>
                    <p><strong>生命值:</strong> ${card.health}</p>
                </div>
                <div>
                    <h4>分类信息</h4>
                    <p><strong>稀有度:</strong> ${card.rarity}</p>
                    <p><strong>职业:</strong> ${card.cardClass}</p>
                    <p><strong>类型:</strong> ${card.cardType}</p>
                    <p><strong>卡牌集:</strong> ${card.cardSet}</p>
                </div>
            </div>
        `;
        
        if (card.text) {
            html += `
                <div style="margin-bottom: 20px;">
                    <h4>卡牌描述</h4>
                    <p style="background: #f8f9fa; padding: 15px; border-radius: 8px;">${card.text}</p>
                </div>
            `;
        }
        
        if (comparison && comparison.length > 0) {
            html += `
                <div style="margin-bottom: 20px;">
                    <h4>变化详情</h4>
                    <div style="display: grid; gap: 10px;">
                        ${comparison.map(change => `
                            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <strong>${change.label}:</strong>
                                <div>
                                    <span style="color: #e74c3c; text-decoration: line-through;">${change.oldValue}</span>
                                    <span style="margin: 0 10px;">→</span>
                                    <span style="color: #2ecc71; font-weight: 500;">${change.newValue}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    // 关闭模态框
    closeModal() {
        document.getElementById('cardModal').style.display = 'none';
    }
    
    // 导出结果
    async exportResults() {
        const exportData = {
            timestamp: new Date().toISOString(),
            oldVersion: this.oldVersionData.version,
            newVersion: this.newVersionData.version,
            summary: {
                added: this.compareResults.added.length,
                modified: this.compareResults.modified.length,
                deleted: this.compareResults.deleted.length
            },
            results: this.compareResults
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        if (window.fileAPI) {
            try {
                const result = await window.fileAPI.showSaveDialog({
                    title: '导出对比结果',
                    defaultPath: `compare_${this.oldVersionData.version}_to_${this.newVersionData.version}.json`,
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
            // 降级方案
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compare_${this.oldVersionData.version}_to_${this.newVersionData.version}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
    
    // 导出CardID
    exportCardIds(format) {
        if (!this.compareResults) {
            alert('请先进行版本对比');
            return;
        }
        
        // 获取当前活动标签页的卡牌
        const activeTab = document.querySelector('.result-tab.active').id;
        let cards = [];
        let fileName = '';
        
        switch(activeTab) {
            case 'addedTab':
                cards = this.compareResults.added;
                fileName = '新增卡牌CardID';
                break;
            case 'modifiedTab':
                cards = this.compareResults.modified;
                fileName = '修改卡牌CardID';
                break;
            case 'deletedTab':
                cards = this.compareResults.deleted;
                fileName = '删除卡牌CardID';
                break;
            default:
                cards = [...this.compareResults.added, ...this.compareResults.modified, ...this.compareResults.deleted];
                fileName = '所有卡牌CardID';
        }
        
        if (cards.length === 0) {
            alert('当前标签页没有卡牌数据');
            return;
        }
        
        // 提取有效的CardID（去除空值）
        const cardIds = cards.map(card => card.cardId).filter(id => id && id.trim() !== '');
        
        if (cardIds.length === 0) {
            alert('没有找到有效的CardID');
            return;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        
        if (format === 'txt') {
            // 导出为TXT文件，使用英文逗号分隔
            const content = cardIds.join(',');
            const blob = new Blob([content], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}_${this.oldVersionData.version}_vs_${this.newVersionData.version}_${timestamp}.txt`;
            link.click();
        } else if (format === 'excel') {
            // 导出为Excel格式（CSV）
            let csvContent = 'CardID,卡牌名称,内部ID\n';
            cards.forEach(card => {
                if (card.cardId && card.cardId.trim() !== '') {
                    // 对CSV内容进行转义处理
                    const escapedCardId = `"${card.cardId.replace(/"/g, '""')}"`;
                    const escapedName = `"${card.name.replace(/"/g, '""')}"`;
                    csvContent += `${escapedCardId},${escapedName},${card.id}\n`;
                }
            });
            
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}_${this.oldVersionData.version}_vs_${this.newVersionData.version}_${timestamp}.csv`;
            link.click();
        }
        
        // 显示导出成功提示
        const exportedCount = format === 'txt' ? cardIds.length : cards.filter(card => card.cardId && card.cardId.trim() !== '').length;
    }
    
    // 重置对比
    resetCompare() {
        document.getElementById('compareResultsSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
        
        this.compareResults = { added: [], modified: [], deleted: [] };
        this.oldVersionData = null;
        this.newVersionData = null;
    }
}

// 初始化系统
let versionCompare;

console.log('📝 version-compare.js 脚本开始加载');

if (document.readyState === 'loading') {
    console.log('📄 DOM正在加载，等待DOMContentLoaded事件');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM内容已加载，开始初始化VersionCompareSystem');
        versionCompare = new VersionCompareSystem();
    });
} else {
    console.log('📄 DOM已就绪，立即初始化VersionCompareSystem');
    versionCompare = new VersionCompareSystem();
}

window.addEventListener('load', () => {
    console.log('🌐 窗口完全加载');
    if (!versionCompare) {
        console.log('⚠️ 系统未初始化，重新创建VersionCompareSystem');
        versionCompare = new VersionCompareSystem();
    }
});

window.versionCompare = versionCompare;

console.log('✅ version-compare.js 脚本加载完成');