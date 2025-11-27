// 炉石传说任务查看器系统
class QuestViewerSystem {
    constructor() {
        this.availableVersions = [];
        this.dataPath = './data';
        this.allQuests = [];
        this.filteredQuests = [];
        this.questPools = [];
        this.rewardLists = [];
        this.rewardItems = [];
        this.boosters = [];
        this.currentVersion = null;
        this.compareMode = false;
        this.oldVersionQuests = [];
        this.newVersionQuests = [];
        this.compareResults = null;
        
        // 任务池类型映射
        this.poolTypes = {
            1: '日常任务',
            2: '周常任务',
            3: '特殊任务',
            4: '事件任务',
            5: '成就任务'
        };
        
        // 奖励类型映射
        this.rewardTrackTypes = {
            0: '无',
            1: '全局奖励',
            2: '酒馆战棋奖励',
            7: '事件奖励',
            8: '学徒奖励',
            9: '宠物奖励'
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 QuestViewerSystem 初始化开始');
        this.setupEventListeners();
        await this.detectVersions();
        console.log('✅ QuestViewerSystem 初始化完成');
    }
    
    setupEventListeners() {
        // 返回首页
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 版本选择
        document.getElementById('versionSelect').addEventListener('change', () => this.onVersionSelect());
        document.getElementById('loadQuestsBtn').addEventListener('click', () => this.loadQuests());
        document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.detectVersions());
        
        // 模式切换
        document.getElementById('singleModeBtn').addEventListener('click', () => this.switchMode('single'));
        document.getElementById('compareModeBtn').addEventListener('click', () => this.switchMode('compare'));
        
        // 对比模式版本选择
        document.getElementById('oldVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('newVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('compareQuestsBtn').addEventListener('click', () => this.compareQuests());
        
        // 任务操作
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelect());
        document.getElementById('exportQuestsBtn').addEventListener('click', () => this.exportQuests());
        
        // 筛选器
        document.getElementById('searchInput').addEventListener('input', () => this.filterQuests());
        document.getElementById('typeFilter').addEventListener('change', () => this.filterQuests());
        document.getElementById('rewardFilter').addEventListener('change', () => this.filterQuests());
        document.getElementById('extraRewardFilter').addEventListener('change', () => this.filterQuests());
        document.getElementById('chainOnlyFilter').addEventListener('change', () => this.filterQuests());
        document.getElementById('abandonableFilter').addEventListener('change', () => this.filterQuests());
        
        // 视图切换
        document.getElementById('viewByQuestBtn').addEventListener('click', () => this.switchView('quest'));
        document.getElementById('viewByPoolBtn').addEventListener('click', () => this.switchView('pool'));
        
        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('questModal').addEventListener('click', (e) => {
            if (e.target.id === 'questModal') this.closeModal();
        });
    }
    
    // 检测版本文件夹
    async detectVersions() {
        console.log('🔍 开始检测版本');
        
        try {
            let scanPath = './data';
            if (window.fileAPI) {
                const defaultPathResult = await window.fileAPI.getDefaultDataPath();
                if (defaultPathResult.success) {
                    scanPath = defaultPathResult.path;
                    this.dataPath = scanPath;
                }
            }
            
            document.getElementById('dataPathInfo').textContent = `数据路径: ${scanPath}`;
            
            const result = await window.fileAPI.scanDirectories(scanPath);
            if (!result.success) {
                throw new Error('无法读取数据目录');
            }
            
            this.availableVersions = result.directories
                .filter(dir => /^\d+\.\d+\.\d+\.\d+$/.test(dir))
                .sort((a, b) => this.compareVersions(b, a));
            
            this.populateVersionSelector();
            this.autoSelectLatestVersion();
            this.showVersionSelector();
            
        } catch (error) {
            console.error('版本检测失败:', error);
            document.getElementById('detectionStatus').textContent = '检测失败: ' + error.message;
        }
    }
    
    // 版本号比较
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const diff = (aParts[i] || 0) - (bParts[i] || 0);
            if (diff !== 0) return diff;
        }
        return 0;
    }
    
    // 填充版本选择器
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
        const loadBtn = document.getElementById('loadQuestsBtn');
        
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
                await window.dataManager.loadFile('QUEST', version);
            } catch (error) {
                missingFiles.push('QUEST.json');
            }
            
            try {
                await window.dataManager.loadFile('QUEST_POOL', version);
            } catch (error) {
                missingFiles.push('QUEST_POOL.json');
            }
            
            const isValid = missingFiles.length === 0;
            
            if (isValid) {
                document.getElementById('versionInfo').innerHTML = `
                    <div><strong>版本号:</strong> ${version}</div>
                    <div><strong>路径:</strong> ./data/${version}/</div>
                    <div><strong>状态:</strong> <span style="color: green;">✅ 准备就绪</span></div>
                `;
            } else {
                document.getElementById('versionInfo').innerHTML = `
                    <div><strong>版本号:</strong> ${version}</div>
                    <div><strong>路径:</strong> ./data/${version}/</div>
                    <div><strong>状态:</strong> <span style="color: red;">❌ 缺少文件: ${missingFiles.join(', ')}</span></div>
                `;
            }
            
            return isValid;
        } catch (error) {
            document.getElementById('versionInfo').innerHTML = `
                <div><strong>版本号:</strong> ${version}</div>
                <div><strong>路径:</strong> ./data/${version}/</div>
                <div><strong>状态:</strong> <span style="color: red;">❌ 检测失败: ${error.message}</span></div>
            `;
            return false;
        }
    }
    
    // 加载任务
    async loadQuests() {
        const version = document.getElementById('versionSelect').value;
        
        console.log('🚀 开始加载任务:', version);
        
        // 保存当前版本
        this.currentVersion = version;
        
        // 设置 DataManager 版本
        window.dataManager.setVersion(version);
        
        try {
            this.showProgressSection();
            
            // 加载任务池
            this.updateProgress(15, '正在加载任务池...');
            this.questPools = await this.loadQuestPools(version);
            
            // 加载奖励数据
            this.updateProgress(30, '正在加载奖励数据...');
            await this.loadRewardData(version);
            
            // 加载任务
            this.updateProgress(50, '正在加载任务数据...');
            const quests = await this.loadQuestData(version);
            
            // 关联数据
            this.updateProgress(80, '正在关联数据...');
            this.allQuests = this.associateData(quests, this.questPools);
            
            this.updateProgress(100, '加载完成！');
            
            // 延迟显示结果
            setTimeout(() => this.showQuestList(), 500);
            
        } catch (error) {
            console.error('加载任务失败:', error);
            alert('加载任务失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载任务池
    async loadQuestPools(version) {
        const data = await window.dataManager.loadFile('QUEST_POOL', version);
        if (!data) {
            throw new Error('无法读取 QUEST_POOL.json');
        }
        return data.Records || [];
    }
    
    // 加载任务数据
    async loadQuestData(version) {
        const data = await window.dataManager.loadFile('QUEST', version);
        if (!data) {
            throw new Error('无法读取 QUEST.json');
        }
        return data.Records || [];
    }
    
    // 加载奖励数据
    async loadRewardData(version) {
        try {
            const rewardListData = await window.dataManager.loadFile('REWARD_LIST', version);
            this.rewardLists = rewardListData?.Records || [];
            
            const rewardItemData = await window.dataManager.loadFile('REWARD_ITEM', version);
            this.rewardItems = rewardItemData?.Records || [];
            
            const boosterData = await window.dataManager.loadFile('BOOSTER', version);
            this.boosters = boosterData?.Records || [];
            
            console.log('✅ 奖励数据加载完成:', this.rewardLists.length, '个奖励列表,', this.rewardItems.length, '个奖励项,', this.boosters.length, '个卡包');
        } catch (error) {
            console.warn('⚠️ 奖励数据加载失败，将跳过奖励显示:', error);
            this.rewardLists = [];
            this.rewardItems = [];
            this.boosters = [];
        }
    }
    
    // 关联数据
    associateData(quests, questPools) {
        console.log('🔗 开始关联数据...');
        
        // 创建任务池映射
        const poolMap = new Map();
        questPools.forEach(pool => {
            poolMap.set(pool.m_ID, pool);
        });
        
        // 创建奖励映射
        const rewardListMap = new Map();
        this.rewardLists.forEach(list => {
            rewardListMap.set(list.m_ID, list);
        });
        
        const rewardItemMap = new Map();
        this.rewardItems.forEach(item => {
            if (!rewardItemMap.has(item.m_rewardListId)) {
                rewardItemMap.set(item.m_rewardListId, []);
            }
            rewardItemMap.get(item.m_rewardListId).push(item);
        });
        
        // 关联任务和任务池
        const result = quests.map(quest => {
            const pool = poolMap.get(quest.m_questPoolId);
            
            return {
                id: quest.m_ID,
                name: this.extractLocalizedText(quest.m_name) || `任务 ${quest.m_ID}`,
                description: this.extractLocalizedText(quest.m_description) || '',
                quota: quest.m_quota || 0,
                questPoolId: quest.m_questPoolId,
                poolType: pool ? (this.poolTypes[pool.m_questPoolType] || '其他') : '未知',
                poolTypeId: pool ? pool.m_questPoolType : 0,
                nextInChainId: quest.m_nextInChainId || 0,
                rewardXP: quest.m_rewardTrackXp || 0,
                rewardListId: quest.m_rewardListId || 0,
                event: quest.m_event || 0,
                icon: quest.m_icon || '',
                deepLink: quest.m_deepLink || '',
                canAbandon: quest.m_canAbandon === 1,
                poolGuaranteed: quest.m_poolGuaranteed === 1,
                instantGrantDay: quest.m_poolInstantGrantDay || 0,
                rewardTrackType: quest.m_rewardTrackType || 0,
                poolData: pool || null,
                rewardListId: quest.m_rewardListId || 0,
                rewardList: rewardListMap.get(quest.m_rewardListId) || null,
                rewardItems: rewardItemMap.get(quest.m_rewardListId) || [],
                rawData: quest
            };
        });
        
        console.log('✅ 数据关联完成，共生成', result.length, '个任务');
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
    
    // 显示任务列表
    showQuestList() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.getElementById('questListSection').style.display = 'block';
        
        this.updateQuestSummary();
        this.populateTypeFilter();
        this.filterQuests();
    }
    
    // 更新任务摘要
    updateQuestSummary() {
        const summary = document.getElementById('questSummary');
        const totalQuests = this.allQuests.length;
        const chainQuests = this.allQuests.filter(q => q.nextInChainId > 0).length;
        const totalRewards = this.allQuests.reduce((sum, q) => sum + q.rewardXP, 0);
        
        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-value">${totalQuests}</span>
                <span class="summary-label">任务总数</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${chainQuests}</span>
                <span class="summary-label">链式任务</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${totalRewards.toLocaleString()}</span>
                <span class="summary-label">总奖励经验</span>
            </div>
        `;
    }
    
    // 填充类型过滤器
    populateTypeFilter() {
        const types = new Set();
        this.allQuests.forEach(quest => {
            if (quest.poolType) types.add(quest.poolType);
        });
        
        const filter = document.getElementById('typeFilter');
        filter.innerHTML = '<option value="">所有类型</option>';
        
        Array.from(types).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            filter.appendChild(option);
        });
    }
    
    // 过滤任务
    filterQuests() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        const rewardFilter = document.getElementById('rewardFilter').value;
        const extraRewardOnly = document.getElementById('extraRewardFilter').checked;
        const chainOnly = document.getElementById('chainOnlyFilter').checked;
        const abandonableOnly = document.getElementById('abandonableFilter').checked;
        
        this.filteredQuests = this.allQuests.filter(quest => {
            // 搜索过滤
            if (searchText) {
                const matchName = quest.name.toLowerCase().includes(searchText);
                const matchDesc = quest.description.toLowerCase().includes(searchText);
                if (!matchName && !matchDesc) return false;
            }
            
            // 类型过滤
            if (typeFilter && quest.poolType !== typeFilter) return false;
            
            // 奖励过滤
            if (rewardFilter) {
                if (rewardFilter === 'low' && quest.rewardXP > 400) return false;
                if (rewardFilter === 'medium' && (quest.rewardXP <= 400 || quest.rewardXP >= 1000)) return false;
                if (rewardFilter === 'high' && quest.rewardXP < 1000) return false;
            }
            
            // 额外奖励过滤
            if (extraRewardOnly && quest.rewardItems.length === 0) return false;
            
            // 链式任务过滤
            if (chainOnly && quest.nextInChainId === 0) return false;
            
            // 可放弃过滤
            if (abandonableOnly && !quest.canAbandon) return false;
            
            return true;
        });
        
        this.displayQuests();
    }
    
    // 显示任务
    displayQuests() {
        const container = document.getElementById('questList');
        
        if (this.filteredQuests.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #95a5a6;">未找到匹配的任务</div>';
            return;
        }
        
        // 替换描述中的 $q 占位符
        const getDescription = (quest) => {
            return quest.description.replace(/\$q/g, quest.quota);
        };
        
        container.innerHTML = this.filteredQuests.map(quest => `
            <div class="quest-card" onclick="questViewer.showQuestDetails(${quest.id})">
                <div class="quest-name">${quest.name}</div>
                <div class="quest-description">${getDescription(quest)}</div>
                <div class="quest-meta">
                    <span class="quest-badge badge-type">📋 ${quest.poolType}</span>
                    ${quest.rewardXP > 0 ? `<span class="quest-badge badge-reward">⭐ ${quest.rewardXP} XP</span>` : ''}
                    ${quest.rewardItems.length > 0 ? `<span class="quest-badge badge-reward">🎁 ${quest.rewardItems.length}项奖励</span>` : ''}
                    ${quest.quota > 0 ? `<span class="quest-badge badge-quota">🎯 ${quest.quota}</span>` : ''}
                    ${quest.nextInChainId > 0 ? '<span class="quest-badge badge-chain">🔗 链式</span>' : ''}
                    ${quest.canAbandon ? '<span class="quest-badge badge-abandon">🚫 可放弃</span>' : ''}
                </div>
                <div class="quest-footer">
                    <span>任务ID: ${quest.id}</span>
                    ${quest.event > 0 ? `<span>事件ID: ${quest.event}</span>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // 显示任务详情
    showQuestDetails(questId) {
        const quest = this.allQuests.find(q => q.id === questId);
        if (!quest) return;
        
        document.getElementById('modalQuestName').textContent = quest.name;
        
        const getDescription = (q) => q.description.replace(/\$q/g, q.quota);
        
        const details = document.getElementById('questDetails');
        details.innerHTML = `
            <div class="detail-section">
                <h4>任务信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">任务ID</div>
                        <div class="detail-value">${quest.id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">任务类型</div>
                        <div class="detail-value">${quest.poolType}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">目标数量</div>
                        <div class="detail-value">${quest.quota}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">奖励经验</div>
                        <div class="detail-value">${quest.rewardXP} XP</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">奖励类型</div>
                        <div class="detail-value">${this.rewardTrackTypes[quest.rewardTrackType] || '未知'}</div>
                    </div>
                    ${quest.event > 0 ? `
                    <div class="detail-item">
                        <div class="detail-label">事件ID</div>
                        <div class="detail-value">${quest.event}</div>
                    </div>
                    ` : ''}
                    ${quest.nextInChainId > 0 ? `
                    <div class="detail-item">
                        <div class="detail-label">下一任务ID</div>
                        <div class="detail-value">${quest.nextInChainId}</div>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <div class="detail-label">可放弃</div>
                        <div class="detail-value">${quest.canAbandon ? '✓ 是' : '✗ 否'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">任务池ID</div>
                        <div class="detail-value">${quest.questPoolId}</div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>任务描述</h4>
                <div class="detail-description">${getDescription(quest)}</div>
            </div>
            
            ${quest.deepLink ? `
            <div class="detail-section">
                <h4>深度链接</h4>
                <div class="detail-description">${quest.deepLink}</div>
            </div>
            ` : ''}
            
            ${quest.rewardList || quest.rewardItems.length > 0 ? `
            <div class="detail-section">
                <h4>🎁 任务奖励</h4>
                ${quest.rewardList ? `
                    <div class="detail-description" style="margin-bottom: 15px;">
                        ${this.extractLocalizedText(quest.rewardList.m_description)}
                    </div>
                ` : ''}
                ${quest.rewardItems.length > 0 ? `
                    <div class="detail-grid">
                        ${quest.rewardItems.map(item => this.formatRewardItem(item)).join('')}
                    </div>
                ` : ''}
            </div>
            ` : ''}
            
            ${quest.poolData ? `
            <div class="detail-section">
                <h4>任务池配置</h4>
                <div class="detail-grid">
                    ${quest.poolData.m_grantDayOfWeek >= 0 ? `
                    <div class="detail-item">
                        <div class="detail-label">发放星期</div>
                        <div class="detail-value">${quest.poolData.m_grantDayOfWeek === -1 ? '每天' : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][quest.poolData.m_grantDayOfWeek]}</div>
                    </div>
                    ` : ''}
                    ${quest.poolData.m_numQuestsGranted > 0 ? `
                    <div class="detail-item">
                        <div class="detail-label">每次发放数量</div>
                        <div class="detail-value">${quest.poolData.m_numQuestsGranted}</div>
                    </div>
                    ` : ''}
                    ${quest.poolData.m_maxQuestsActive > 0 ? `
                    <div class="detail-item">
                        <div class="detail-label">最大激活数</div>
                        <div class="detail-value">${quest.poolData.m_maxQuestsActive}</div>
                    </div>
                    ` : ''}
                    ${quest.poolData.m_rerollCountMax > 0 ? `
                    <div class="detail-item">
                        <div class="detail-label">最大重掷次数</div>
                        <div class="detail-value">${quest.poolData.m_rerollCountMax}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
        `;
        
        document.getElementById('questModal').classList.add('active');
    }
    
    // 关闭模态框
    closeModal() {
        document.getElementById('questModal').classList.remove('active');
    }
    
    // 格式化奖励项
    formatRewardItem(item) {
        const rewardTypes = {
            1: '💰 金币',
            2: '✨ 奥术之尘',
            3: '🃏 卡牌',
            4: '📦 卡包',
            5: '🎴 卡背',
            6: '🎭 英雄皮肤',
            7: '🎯 竞技场门票',
            8: '💎 符文',
            9: '🏆 奖杯'
        };
        
        const typeName = rewardTypes[item.m_rewardType] || `奖励类型 ${item.m_rewardType}`;
        let details = `${item.m_quantity}个`;
        
        // 如果是卡包，显示卡包名称
        if (item.m_boosterId > 0) {
            const booster = this.boosters.find(b => b.m_ID === item.m_boosterId);
            if (booster) {
                const boosterName = this.extractLocalizedText(booster.m_name) || `卡包 ${item.m_boosterId}`;
                details = `${item.m_quantity}个 ${boosterName}`;
            } else {
                details += ` (卡包ID: ${item.m_boosterId})`;
            }
        }
        if (item.m_cardId > 0) {
            details += ` (卡牌ID: ${item.m_cardId})`;
        }
        
        return `
            <div class="detail-item">
                <div class="detail-label">${typeName}</div>
                <div class="detail-value">${details}</div>
            </div>
        `;
    }
    
    // 返回版本选择
    backToVersionSelect() {
        document.getElementById('questListSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
        
        // 恢复标题和UI
        document.querySelector('#questListSection h2').textContent = '🎯 任务列表';
        document.querySelector('.quest-filters').style.display = 'flex';
        document.querySelector('.view-toggle').style.display = 'flex';
        document.getElementById('questCompareView').style.display = 'none';
        
        this.allQuests = [];
        this.filteredQuests = [];
        this.oldVersionQuests = [];
        this.newVersionQuests = [];
        this.compareResults = null;
    }
    
    // 导出任务
    async exportQuests() {
        const exportData = {
            version: this.currentVersion,
            exportTime: new Date().toISOString(),
            totalQuests: this.filteredQuests.length,
            quests: this.filteredQuests
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const fileName = `quests_${this.currentVersion}_${Date.now()}.json`;
        
        if (window.fileAPI) {
            const result = await window.fileAPI.saveFile(fileName, dataStr);
            if (result.success) {
                alert(`成功导出 ${this.filteredQuests.length} 个任务到:\n${result.path}`);
            } else {
                alert('导出失败: ' + result.error);
            }
        } else {
            // 浏览器环境下载
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
    
    // 切换视图
    switchView(viewType) {
        const questBtn = document.getElementById('viewByQuestBtn');
        const poolBtn = document.getElementById('viewByPoolBtn');
        const questList = document.getElementById('questList');
        const poolView = document.getElementById('questPoolView');
        const filters = document.querySelector('.quest-filters');
        
        if (viewType === 'quest') {
            questBtn.classList.add('active');
            poolBtn.classList.remove('active');
            questList.style.display = 'grid';
            poolView.style.display = 'none';
            filters.style.display = 'block';
        } else {
            questBtn.classList.remove('active');
            poolBtn.classList.add('active');
            questList.style.display = 'none';
            poolView.style.display = 'flex';
            filters.style.display = 'none';
            this.displayPoolView();
        }
    }
    
    // 显示任务池视图
    displayPoolView() {
        const container = document.getElementById('questPoolView');
        
        // 按任务池分组
        const poolMap = new Map();
        this.allQuests.forEach(quest => {
            const poolId = quest.questPoolId;
            if (!poolMap.has(poolId)) {
                poolMap.set(poolId, []);
            }
            poolMap.get(poolId).push(quest);
        });
        
        // 生成任务池卡片
        const poolCards = Array.from(poolMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([poolId, quests]) => {
                const pool = quests[0].poolData;
                const poolName = quests[0].poolType || `任务池 ${poolId}`;
                const totalXP = quests.reduce((sum, q) => sum + q.rewardXP, 0);
                
                const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                const grantDay = pool?.m_grantDayOfWeek >= 0 ? weekDays[pool.m_grantDayOfWeek] : '每天';
                
                return `
                    <div class="pool-card">
                        <div class="pool-header" onclick="questViewer.togglePool(${poolId})">
                            <div class="pool-info">
                                <div class="pool-name">${poolName} (ID: ${poolId})</div>
                                <div class="pool-stats">
                                    <span class="pool-stat">📋 ${quests.length} 个任务</span>
                                    <span class="pool-stat">⭐ ${totalXP.toLocaleString()} 总经验</span>
                                    ${pool ? `
                                        <span class="pool-stat">📅 ${grantDay}发放</span>
                                        <span class="pool-stat">🎯 每次${pool.m_numQuestsGranted}个</span>
                                        <span class="pool-stat">📊 最多${pool.m_maxQuestsActive}个激活</span>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="pool-toggle" id="toggle-${poolId}">▼</div>
                        </div>
                        <div class="pool-quests" id="pool-${poolId}">
                            <div class="pool-quest-grid">
                                ${quests.map(quest => this.generatePoolQuestItem(quest)).join('')}
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('');
        
        container.innerHTML = poolCards || '<div style="text-align: center; padding: 40px; color: #95a5a6;">暂无任务池数据</div>';
    }
    
    // 生成任务池中的任务项
    generatePoolQuestItem(quest) {
        const getDescription = (q) => q.description.replace(/\$q/g, q.quota);
        
        return `
            <div class="pool-quest-item" onclick="questViewer.showQuestDetails(${quest.id})">
                <div class="pool-quest-name">${quest.name}</div>
                <div class="pool-quest-desc">${getDescription(quest).substring(0, 80)}${getDescription(quest).length > 80 ? '...' : ''}</div>
                <div class="pool-quest-badges">
                    ${quest.rewardXP > 0 ? `<span class="quest-badge badge-reward">⭐ ${quest.rewardXP} XP</span>` : ''}
                    ${quest.rewardItems.length > 0 ? `<span class="quest-badge badge-reward">🎁 ${quest.rewardItems.length}项</span>` : ''}
                    ${quest.quota > 0 ? `<span class="quest-badge badge-quota">🎯 ${quest.quota}</span>` : ''}
                    ${quest.nextInChainId > 0 ? '<span class="quest-badge badge-chain">🔗 链式</span>' : ''}
                    ${quest.canAbandon ? '<span class="quest-badge badge-abandon">🚫 可放弃</span>' : ''}
                </div>
            </div>
        `;
    }
    
    // 切换任务池展开/收起
    togglePool(poolId) {
        const poolQuests = document.getElementById(`pool-${poolId}`);
        const toggle = document.getElementById(`toggle-${poolId}`);
        
        if (poolQuests.classList.contains('expanded')) {
            poolQuests.classList.remove('expanded');
            toggle.classList.remove('expanded');
        } else {
            poolQuests.classList.add('expanded');
            toggle.classList.add('expanded');
        }
    }
    
    // 切换模式（查看/对比）
    switchMode(mode) {
        const singleBtn = document.getElementById('singleModeBtn');
        const compareBtn = document.getElementById('compareModeBtn');
        const singleSection = document.getElementById('singleVersionSection');
        const compareSection = document.getElementById('compareVersionSection');
        const loadBtn = document.getElementById('loadQuestsBtn');
        const compareQuestBtn = document.getElementById('compareQuestsBtn');
        
        if (mode === 'single') {
            this.compareMode = false;
            singleBtn.classList.add('active');
            compareBtn.classList.remove('active');
            singleSection.style.display = 'block';
            compareSection.style.display = 'none';
            loadBtn.style.display = 'inline-block';
            compareQuestBtn.style.display = 'none';
        } else {
            this.compareMode = true;
            singleBtn.classList.remove('active');
            compareBtn.classList.add('active');
            singleSection.style.display = 'none';
            compareSection.style.display = 'block';
            loadBtn.style.display = 'none';
            compareQuestBtn.style.display = 'inline-block';
            
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
        const compareBtn = document.getElementById('compareQuestsBtn');
        
        let oldValid = false;
        let newValid = false;
        
        if (oldVersion) {
            oldValid = await this.checkVersionFiles(oldVersion, 'oldVersionInfo');
        } else {
            document.getElementById('oldVersionInfo').innerHTML = '';
        }
        
        if (newVersion) {
            newValid = await this.checkVersionFiles(newVersion, 'newVersionInfo');
        } else {
            document.getElementById('newVersionInfo').innerHTML = '';
        }
        
        compareBtn.disabled = !(oldValid && newValid && oldVersion !== newVersion);
    }
    
    // 检查版本文件（带info元素ID参数）
    async checkVersionFiles(version, infoElementId) {
        try {
            window.dataManager.setVersion(version);
            
            const missingFiles = [];
            
            try {
                await window.dataManager.loadFile('QUEST', version);
            } catch (error) {
                missingFiles.push('QUEST.json');
            }
            
            try {
                await window.dataManager.loadFile('QUEST_POOL', version);
            } catch (error) {
                missingFiles.push('QUEST_POOL.json');
            }
            
            const isValid = missingFiles.length === 0;
            
            const infoElement = document.getElementById(infoElementId);
            if (infoElement) {
                if (isValid) {
                    infoElement.innerHTML = `
                        <div><strong>版本号:</strong> ${version}</div>
                        <div><strong>状态:</strong> <span style="color: green;">✅ 准备就绪</span></div>
                    `;
                } else {
                    infoElement.innerHTML = `
                        <div><strong>版本号:</strong> ${version}</div>
                        <div><strong>状态:</strong> <span style="color: red;">❌ 缺少文件: ${missingFiles.join(', ')}</span></div>
                    `;
                }
            }
            
            return isValid;
        } catch (error) {
            const infoElement = document.getElementById(infoElementId);
            if (infoElement) {
                infoElement.innerHTML = `
                    <div><strong>版本号:</strong> ${version}</div>
                    <div><strong>状态:</strong> <span style="color: red;">❌ 检测失败: ${error.message}</span></div>
                `;
            }
            return false;
        }
    }
    
    // 对比任务
    async compareQuests() {
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const newVersion = document.getElementById('newVersionSelect').value;
        
        console.log('🔍 开始对比任务:', oldVersion, 'vs', newVersion);
        
        try {
            this.showProgressSection();
            
            // 加载旧版本数据
            this.updateProgress(20, '正在加载旧版本任务...');
            this.oldVersionQuests = await this.loadVersionQuests(oldVersion);
            
            // 加载新版本数据
            this.updateProgress(50, '正在加载新版本任务...');
            this.newVersionQuests = await this.loadVersionQuests(newVersion);
            
            // 对比数据
            this.updateProgress(80, '正在对比数据...');
            this.compareResults = this.performComparison(this.oldVersionQuests, this.newVersionQuests);
            
            this.updateProgress(100, '对比完成！');
            
            // 延迟显示结果
            setTimeout(() => this.showCompareResults(oldVersion, newVersion), 500);
            
        } catch (error) {
            console.error('对比任务失败:', error);
            alert('对比任务失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载指定版本的任务数据
    async loadVersionQuests(version) {
        window.dataManager.setVersion(version);
        
        // 加载任务池
        const poolData = await window.dataManager.loadFile('QUEST_POOL', version);
        const pools = poolData?.Records || [];
        
        // 加载任务
        const questData = await window.dataManager.loadFile('QUEST', version);
        const quests = questData?.Records || [];
        
        // 关联数据
        const poolMap = new Map();
        pools.forEach(pool => poolMap.set(pool.m_ID, pool));
        
        return quests.map(quest => ({
            id: quest.m_ID,
            name: this.extractLocalizedText(quest.m_name) || `任务 ${quest.m_ID}`,
            description: this.extractLocalizedText(quest.m_description) || '',
            quota: quest.m_quota || 0,
            questPoolId: quest.m_questPoolId,
            poolType: poolMap.get(quest.m_questPoolId) ? (this.poolTypes[poolMap.get(quest.m_questPoolId).m_questPoolType] || '其他') : '未知',
            rewardXP: quest.m_rewardTrackXp || 0,
            rewardTrackType: quest.m_rewardTrackType || 0,
            rewardListId: quest.m_rewardListId || 0,
            nextInChainId: quest.m_nextInChainId || 0,
            canAbandon: quest.m_canAbandon === 1,
            event: quest.m_event || 0
        }));
    }
    
    // 执行对比
    performComparison(oldQuests, newQuests) {
        const oldMap = new Map(oldQuests.map(q => [q.id, q]));
        const newMap = new Map(newQuests.map(q => [q.id, q]));
        
        const added = [];
        const removed = [];
        const modified = [];
        
        // 查找新增和修改的任务
        newQuests.forEach(newQuest => {
            const oldQuest = oldMap.get(newQuest.id);
            if (!oldQuest) {
                added.push(newQuest);
            } else {
                const changes = this.getQuestChanges(oldQuest, newQuest);
                if (changes.length > 0) {
                    modified.push({ old: oldQuest, new: newQuest, changes });
                }
            }
        });
        
        // 查找移除的任务
        oldQuests.forEach(oldQuest => {
            if (!newMap.has(oldQuest.id)) {
                removed.push(oldQuest);
            }
        });
        
        return { added, removed, modified };
    }
    
    // 获取任务变化
    getQuestChanges(oldQuest, newQuest) {
        const changes = [];
        const fields = [
            { key: 'name', label: '名称' },
            { key: 'description', label: '描述' },
            { key: 'quota', label: '目标数量' },
            { key: 'rewardXP', label: '奖励经验' },
            { key: 'rewardTrackType', label: '奖励类型', format: (val) => this.rewardTrackTypes[val] || '未知' },
            { key: 'rewardListId', label: '奖励列表ID' },
            { key: 'poolType', label: '任务类型' },
            { key: 'nextInChainId', label: '下一任务ID' },
            { key: 'canAbandon', label: '可放弃' }
        ];
        
        fields.forEach(field => {
            if (oldQuest[field.key] !== newQuest[field.key]) {
                changes.push({
                    field: field.label,
                    oldValue: field.format ? field.format(oldQuest[field.key]) : oldQuest[field.key],
                    newValue: field.format ? field.format(newQuest[field.key]) : newQuest[field.key]
                });
            }
        });
        
        return changes;
    }
    
    // 显示对比结果
    showCompareResults(oldVersion, newVersion) {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.getElementById('questListSection').style.display = 'block';
        
        // 隐藏筛选器和其他视图
        document.querySelector('.quest-filters').style.display = 'none';
        document.querySelector('.view-toggle').style.display = 'none';
        document.getElementById('questList').style.display = 'none';
        document.getElementById('questPoolView').style.display = 'none';
        document.getElementById('questCompareView').style.display = 'block';
        
        // 更新标题
        document.querySelector('#questListSection h2').textContent = `🔍 任务对比: ${oldVersion} → ${newVersion}`;
        
        // 显示摘要
        const summary = document.getElementById('questSummary');
        summary.innerHTML = `
            <div class="summary-item" style="border-left: 4px solid #27ae60;">
                <span class="summary-value">${this.compareResults.added.length}</span>
                <span class="summary-label">新增任务</span>
            </div>
            <div class="summary-item" style="border-left: 4px solid #e74c3c;">
                <span class="summary-value">${this.compareResults.removed.length}</span>
                <span class="summary-label">移除任务</span>
            </div>
            <div class="summary-item" style="border-left: 4px solid #f39c12;">
                <span class="summary-value">${this.compareResults.modified.length}</span>
                <span class="summary-label">修改任务</span>
            </div>
        `;
        
        // 显示对比内容
        this.displayCompareResults();
    }
    
    // 显示对比详情
    displayCompareResults() {
        const container = document.getElementById('questCompareView');
        
        container.innerHTML = `
            <div class="compare-tabs">
                <button class="compare-tab active" onclick="questViewer.switchCompareTab('added')">
                    ➕ 新增任务 (${this.compareResults.added.length})
                </button>
                <button class="compare-tab" onclick="questViewer.switchCompareTab('removed')">
                    ➖ 移除任务 (${this.compareResults.removed.length})
                </button>
                <button class="compare-tab" onclick="questViewer.switchCompareTab('modified')">
                    ✏️ 修改任务 (${this.compareResults.modified.length})
                </button>
            </div>
            
            <div class="compare-content active" id="compare-added">
                ${this.compareResults.added.map(q => this.renderAddedQuest(q)).join('')}
            </div>
            
            <div class="compare-content" id="compare-removed">
                ${this.compareResults.removed.map(q => this.renderRemovedQuest(q)).join('')}
            </div>
            
            <div class="compare-content" id="compare-modified">
                ${this.compareResults.modified.map(m => this.renderModifiedQuest(m)).join('')}
            </div>
        `;
    }
    
    // 渲染新增任务
    renderAddedQuest(quest) {
        return `
            <div class="compare-quest-card added">
                <div class="compare-quest-header">
                    <div class="compare-quest-title">${quest.name}</div>
                    <span class="compare-quest-badge added">新增</span>
                </div>
                <div style="color: #7f8c8d; margin-bottom: 10px;">${quest.description.replace(/\$q/g, quest.quota)}</div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.9em;">
                    <span>📋 ${quest.poolType}</span>
                    <span>⭐ ${quest.rewardXP} XP</span>
                    <span>🎯 ${quest.quota}</span>
                    <span>ID: ${quest.id}</span>
                </div>
            </div>
        `;
    }
    
    // 渲染移除任务
    renderRemovedQuest(quest) {
        return `
            <div class="compare-quest-card removed">
                <div class="compare-quest-header">
                    <div class="compare-quest-title">${quest.name}</div>
                    <span class="compare-quest-badge removed">移除</span>
                </div>
                <div style="color: #7f8c8d; margin-bottom: 10px;">${quest.description.replace(/\$q/g, quest.quota)}</div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.9em;">
                    <span>📋 ${quest.poolType}</span>
                    <span>⭐ ${quest.rewardXP} XP</span>
                    <span>🎯 ${quest.quota}</span>
                    <span>ID: ${quest.id}</span>
                </div>
            </div>
        `;
    }
    
    // 渲染修改任务
    renderModifiedQuest(modified) {
        const quest = modified.new;
        return `
            <div class="compare-quest-card modified">
                <div class="compare-quest-header">
                    <div class="compare-quest-title">${quest.name}</div>
                    <span class="compare-quest-badge modified">修改</span>
                </div>
                <div class="compare-quest-changes">
                    ${modified.changes.map(change => `
                        <div class="compare-change-item">
                            <div class="compare-change-label">${change.field}</div>
                            <div class="compare-change-value">
                                <span class="compare-old-value">${this.formatChangeValue(change.oldValue)}</span>
                                <span class="compare-arrow">→</span>
                                <span class="compare-new-value">${this.formatChangeValue(change.newValue)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 格式化变更值
    formatChangeValue(value) {
        if (typeof value === 'boolean') {
            return value ? '✓ 是' : '✗ 否';
        }
        if (value === 0 || value === '') {
            return '无';
        }
        if (typeof value === 'string' && value.length > 50) {
            return value.substring(0, 50) + '...';
        }
        return value;
    }
    
    // 切换对比标签页
    switchCompareTab(tabName) {
        document.querySelectorAll('.compare-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.compare-content').forEach(content => content.classList.remove('active'));
        
        event.target.classList.add('active');
        document.getElementById(`compare-${tabName}`).classList.add('active');
    }
}

// 初始化系统
let questViewer;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        questViewer = new QuestViewerSystem();
    });
} else {
    questViewer = new QuestViewerSystem();
}

window.questViewer = questViewer;
