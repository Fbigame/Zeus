// ACHIEVE 系统查看器

class AchieveSystem {
    constructor() {
        console.log('🚀 AchieveSystem 初始化开始');
        
        this.allAchieves = [];
        this.filteredAchieves = [];
        this.conditions = {};
        this.regionData = {};
        this.currentVersion = '';
        this.currentView = 'tree'; // 'tree' or 'list'
        this.currentMode = 'normal'; // 'normal' or 'compare'
        this.sortBy = 'id'; // 排序字段
        this.reverseSort = false; // 是否倒序
        
        // 成就类型映射
        this.achTypeMap = {
            0: 'INVALID (无效)',
            1: 'STARTER (新手)',
            2: 'HERO (英雄)',
            3: 'GOLDHERO (金色英雄)',
            4: 'DAILY (日常)',
            5: 'DAILY_REPEATABLE (可重复日常)',
            6: 'HIDDEN (隐藏)',
            7: 'INTERNAL_ACTIVE (内部激活)',
            8: 'INTERNAL_INACTIVE (内部未激活)',
            9: 'LOGIN_ACTIVATED (登录激活)',
            10: 'NORMAL_QUEST (普通任务)',
            11: 'LOGIN_AND_CHAIN_ACTIVATED (登录链激活)',
            12: 'PREMIUMHERO (高级英雄)'
        };
        
        // 触发方式映射
        this.triggerMap = {
            0: 'UNKNOWN (未知)',
            1: 'NONE (无)',
            2: 'WIN (胜利)',
            3: 'FINISH (完成)',
            4: 'LEVEL (等级)',
            5: 'DISENCHANT (分解)',
            6: 'RACE (种族)',
            7: 'GOLDRACE (金色种族)',
            8: 'CARDSET (卡牌集)',
            9: 'DESTROY (摧毁)',
            12: 'SPELL (法术)',
            13: 'DMGHERO (伤害英雄)',
            14: 'DAILY (日常)',
            15: 'CLICK (点击)',
            16: 'PURCHASE (购买)',
            17: 'LICENSEADDED (许可添加)',
            18: 'LICENSEDETECTED (许可检测)',
            19: 'SKIPTUTORIAL (跳过教程)',
            20: 'STARLEVEL (星级)',
            21: 'FSG_FINISH (FSG完成)',
            22: 'EVENT_TIMING_ONLY (仅事件时机)',
            23: 'LOGIN_IGR (IGR登录)',
            24: 'ADVENTURE_PROGRESS (冒险进度)',
            25: 'ZERO_COST_LICENSE (零成本许可)',
            26: 'SPECTATE_WIN (观战胜利)',
            27: 'LOGIN_DEVICE (设备登录)',
            28: 'PACK_READY_TO_OPEN (卡包待开)',
            29: 'LOGIN (登录)',
            30: 'PLAYER_RECRUITED (玩家招募)',
            31: 'PLAY_WITH_TAG (标签游戏)',
            32: 'PLAY_CARD (打出卡牌)',
            34: 'DESTROYED (被摧毁)',
            35: 'ACCOUNT_CREATED (账户创建)',
            36: 'DAILY_OR_SHARED (日常或共享)',
            37: 'DRAW_CARD (抽牌)',
            38: 'END_TURN (回合结束)',
            39: 'PLAY_CARD_OF_COST (打出特定费用卡牌)',
            40: 'PLAY_MINION_OF_COST (打出特定费用随从)',
            41: 'MERCENARIES_BOUNTY_STARTED (佣兵赏金开始)',
            42: 'STARTER_QUESTS_COMPLETED (新手任务完成)'
        };
        
        // 游戏模式映射
        this.gameModeMap = {
            '-1': 'UNKNOWN (未知)',
            0: 'ANY (任意)',
            1: 'ANY_AI (任意AI)',
            2: 'ANY_PRACTICE (任意练习)',
            3: 'BASIC_AI (基础AI)',
            4: 'EXPERT_AI (专家AI)',
            5: 'ADVENTURE (冒险)',
            6: 'TUTORIAL (教程)',
            7: 'MATCHMAKER (匹配)',
            8: 'PLAY_MODE (对战模式)',
            9: 'PLAY_MODE_STANDARD (标准模式)',
            10: 'PLAY_MODE_WILD (狂野模式)',
            11: 'PLAY_MODE_TB (乱斗模式)',
            12: 'RANKED (排名)',
            13: 'CASUAL (休闲)',
            14: 'ARENA (竞技场)',
            15: 'FRIENDLY (友谊赛)',
            16: 'TAVERNBRAWL (酒馆乱斗)',
            17: 'TB_FSG_BRAWL (FSG乱斗)',
            18: 'ANY_FSG_MODE (任意FSG模式)',
            19: 'RANKED_OR_ARENA (排名或竞技场)',
            20: 'OTHER (其他)',
            21: 'ANY_NON_ADVENTURE (非冒险)',
            22: 'BATTLEGROUNDS (酒馆战棋)',
            23: 'DUELS (决斗)',
            24: 'PLAY_MODE_CLASSIC (经典模式)',
            25: 'MERCENARIES (佣兵)'
        };
        
        // 对比模式数据
        this.compareData = {
            newVersion: '',
            oldVersion: '',
            added: [],
            modified: [],
            deleted: []
        };
        
        console.log('🚀 AchieveSystem 初始化完成');
    }

    async init() {
        console.log('🚀 AchieveSystem 初始化开始');
        await this.setupEventListeners();
        await this.loadVersions();
        console.log('✅ AchieveSystem 初始化完成');
    }

    async setupEventListeners() {
        // 返回按钮
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // 版本选择
        document.getElementById('versionSelect').addEventListener('change', (e) => {
            this.currentVersion = e.target.value;
            this.updateLoadButton();
        });

        // 加载按钮
        document.getElementById('loadAchievesBtn').addEventListener('click', () => this.loadAchieves());

        // 导出按钮
        document.getElementById('exportAchievesBtn').addEventListener('click', () => this.exportAchieves());
        document.getElementById('exportCompareBtn').addEventListener('click', () => this.exportCompareResults());

        // 视图切换
        document.getElementById('treeViewBtn').addEventListener('click', () => this.switchView('tree'));
        document.getElementById('listViewBtn').addEventListener('click', () => this.switchView('list'));

        // 折叠/展开
        document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAll());
        document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAll());

        // 过滤器
        document.getElementById('searchInput').addEventListener('input', () => this.filterAchieves());
        document.getElementById('achTypeFilter').addEventListener('change', () => this.filterAchieves());
        document.getElementById('enabledFilter').addEventListener('change', () => this.filterAchieves());
        document.getElementById('rewardFilter').addEventListener('change', () => this.filterAchieves());
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.filterAchieves();
        });
        document.getElementById('reverseSortBtn').addEventListener('click', () => {
            this.reverseSort = !this.reverseSort;
            document.getElementById('reverseSortBtn').classList.toggle('active', this.reverseSort);
            this.filterAchieves();
        });

        // 模式切换
        document.getElementById('normalModeBtn').addEventListener('click', () => this.switchMode('normal'));
        document.getElementById('compareModeBtn').addEventListener('click', () => this.switchMode('compare'));

        // 对比版本选择
        document.getElementById('newVersionSelect').addEventListener('change', () => this.updateCompareButton());
        document.getElementById('oldVersionSelect').addEventListener('change', () => this.updateCompareButton());
        document.getElementById('startCompareBtn').addEventListener('click', () => this.startCompare());

        // 对比标签切换
        document.querySelectorAll('.compare-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchCompareTab(tabName);
            });
        });

        // 弹窗关闭
        document.getElementById('achieveModal').addEventListener('click', (e) => {
            if (e.target.id === 'achieveModal') this.closeModal();
        });
    }

    async loadVersions() {
        try {
            console.log('🔍 开始检测版本');
            
            let scanPath = './data';
            if (window.fileAPI) {
                const defaultPathResult = await window.fileAPI.getDefaultDataPath();
                if (defaultPathResult.success) {
                    scanPath = defaultPathResult.path;
                }
            }
            
            const result = await window.fileAPI.scanDirectories(scanPath);
            if (!result.success) {
                throw new Error('无法读取数据目录');
            }
            
            const versions = result.directories
                .filter(dir => /^\d+\.\d+\.\d+\.\d+$/.test(dir))
                .sort((a, b) => this.compareVersions(b, a));
            
            console.log('📦 加载版本列表:', versions);

            const versionSelect = document.getElementById('versionSelect');
            const newVersionSelect = document.getElementById('newVersionSelect');
            const oldVersionSelect = document.getElementById('oldVersionSelect');

            versionSelect.innerHTML = '<option value="">-- 选择版本 --</option>';
            newVersionSelect.innerHTML = '<option value="">-- 选择新版本 --</option>';
            oldVersionSelect.innerHTML = '<option value="">-- 选择旧版本 --</option>';

            versions.forEach(version => {
                const option1 = new Option(version, version);
                const option2 = new Option(version, version);
                const option3 = new Option(version, version);
                versionSelect.add(option1);
                newVersionSelect.add(option2);
                oldVersionSelect.add(option3);
            });

            // 自动选择最新版本（普通模式）
            if (versions.length > 0) {
                versionSelect.value = versions[0];
                this.currentVersion = versions[0];
                this.updateLoadButton();
                
                // 对比模式：自动选择最新的两个版本
                if (versions.length >= 2) {
                    newVersionSelect.value = versions[0]; // 最新版本
                    oldVersionSelect.value = versions[1]; // 第二新的版本
                    this.updateCompareButton();
                }
            }

            console.log('✅ 版本列表加载完成');
        } catch (error) {
            console.error('❌ 加载版本失败:', error);
            this.showError('加载版本列表失败: ' + error.message);
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

    updateLoadButton() {
        const loadBtn = document.getElementById('loadAchievesBtn');
        loadBtn.disabled = !this.currentVersion;
    }

    updateCompareButton() {
        const newVersion = document.getElementById('newVersionSelect').value;
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const startBtn = document.getElementById('startCompareBtn');
        startBtn.disabled = !newVersion || !oldVersion || newVersion === oldVersion;
    }

    switchMode(mode) {
        this.currentMode = mode;

        // 更新按钮状态
        document.getElementById('normalModeBtn').classList.toggle('active', mode === 'normal');
        document.getElementById('compareModeBtn').classList.toggle('active', mode === 'compare');

        // 显示/隐藏相应区域
        document.getElementById('versionSelection').style.display = mode === 'normal' ? 'block' : 'none';
        document.getElementById('normalLoadSection').style.display = mode === 'normal' ? 'block' : 'none';
        document.getElementById('compareVersionSection').style.display = mode === 'compare' ? 'block' : 'none';

        // 隐藏结果区域
        document.getElementById('achieveListSection').style.display = 'none';
        document.getElementById('compareResultsSection').style.display = 'none';
    }

    async loadAchieves() {
        try {
            console.log(`📥 开始加载 ACHIEVE 数据: ${this.currentVersion}`);

            // 显示加载中
            document.getElementById('achieveListSection').style.display = 'block';
            document.getElementById('achieveList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">加载中...</div></div>';

            // 加载主数据
            const achieveData = await window.dataManager.loadFile('ACHIEVE', this.currentVersion);
            this.allAchieves = achieveData.Records || [];
            console.log(`✅ 加载了 ${this.allAchieves.length} 个 ACHIEVE 记录`);

            // 加载关联数据
            await this.loadConditions();
            await this.loadRegionData();

            // 关联数据
            this.associateData();

            // 填充过滤器选项
            this.populateFilters();

            // 更新统计信息
            this.updateSummary();

            // 显示数据
            this.filterAchieves();

            console.log('✅ ACHIEVE 数据加载完成');
        } catch (error) {
            console.error('❌ 加载 ACHIEVE 数据失败:', error);
            this.showError('加载数据失败: ' + error.message);
        }
    }

    async loadConditions() {
        try {
            const data = await window.dataManager.loadFile('ACHIEVE_CONDITION', this.currentVersion);
            this.conditions = {};
            if (data && data.Records) {
                data.Records.forEach(cond => {
                    if (!this.conditions[cond.m_achieveId]) {
                        this.conditions[cond.m_achieveId] = [];
                    }
                    this.conditions[cond.m_achieveId].push({
                        id: cond.m_ID,
                        achieveId: cond.m_achieveId,
                        scenarioId: cond.m_scenarioId,
                        conditionType: cond.m_conditionType || 0,
                        value: cond.m_value || 0
                    });
                });
            }
            console.log(`✅ 加载了 ${Object.keys(this.conditions).length} 个成就的条件`);
        } catch (error) {
            console.error('⚠️ 加载 ACHIEVE_CONDITION 失败:', error);
        }
    }

    async loadRegionData() {
        try {
            const data = await window.dataManager.loadFile('ACHIEVE_REGION_DATA', this.currentVersion);
            this.regionData = {};
            if (data && data.Records) {
                data.Records.forEach(region => {
                    if (!this.regionData[region.m_achieveId]) {
                        this.regionData[region.m_achieveId] = [];
                    }
                    this.regionData[region.m_achieveId].push({
                        id: region.m_ID,
                        achieveId: region.m_achieveId,
                        region: region.m_region,
                        rewardableLimit: region.m_rewardableLimit,
                        rewardableInterval: region.m_rewardableInterval,
                        progressableEvent: region.m_progressableEvent,
                        activateEvent: region.m_activateEvent
                    });
                });
            }
            console.log(`✅ 加载了 ${Object.keys(this.regionData).length} 个成就的区域数据`);
        } catch (error) {
            console.error('⚠️ 加载 ACHIEVE_REGION_DATA 失败:', error);
        }
    }

    associateData() {
        // 关联条件和区域数据到成就
        this.allAchieves.forEach(achieve => {
            achieve.conditions = this.conditions[achieve.m_ID] || [];
            achieve.regionData = this.regionData[achieve.m_ID] || [];
            
            // 解析名称和描述
            achieve.name = this.getLocalizedText(achieve.m_name);
            achieve.description = this.getLocalizedText(achieve.m_description);
        });

        // 构建父子关系
        const achieveMap = {};
        this.allAchieves.forEach(achieve => {
            achieveMap[achieve.m_ID] = achieve;
            achieve.children = [];
        });

        this.allAchieves.forEach(achieve => {
            if (achieve.m_parentAch && achieve.m_parentAch !== 'none') {
                // 通过 noteDesc 查找父成就
                const parent = this.allAchieves.find(a => a.m_noteDesc === achieve.m_parentAch);
                if (parent) {
                    achieve.parent = parent;
                    parent.children.push(achieve);
                }
            }
        });

        console.log('✅ 数据关联完成');
    }

    getLocalizedText(locObj) {
        if (!locObj || !locObj.m_locValues) return '';
        // 优先使用简体中文 (索引12) 或繁体中文 (索引13)
        return locObj.m_locValues[12] || locObj.m_locValues[13] || locObj.m_locValues[0] || '';
    }

    populateFilters() {
        // 填充类型过滤器
        const achTypes = new Set();
        const rewards = new Set();

        this.allAchieves.forEach(achieve => {
            achTypes.add(achieve.m_achType);
            if (achieve.m_reward && achieve.m_reward !== 'none') {
                rewards.add(achieve.m_reward);
            }
        });

        // 类型过滤器
        const achTypeFilter = document.getElementById('achTypeFilter');
        achTypeFilter.innerHTML = '<option value="">全部类型</option>';
        Array.from(achTypes).sort((a, b) => a - b).forEach(type => {
            const typeName = this.achTypeMap[type] || `类型 ${type}`;
            const option = new Option(typeName, type);
            achTypeFilter.add(option);
        });

        // 奖励过滤器
        const rewardFilter = document.getElementById('rewardFilter');
        rewardFilter.innerHTML = '<option value="">全部奖励</option>';
        Array.from(rewards).sort().forEach(reward => {
            const option = new Option(reward, reward);
            rewardFilter.add(option);
        });

        console.log('✅ 过滤器选项填充完成');
    }

    filterAchieves() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const achType = document.getElementById('achTypeFilter').value;
        const enabled = document.getElementById('enabledFilter').value;
        const reward = document.getElementById('rewardFilter').value;

        this.filteredAchieves = this.allAchieves.filter(achieve => {
            // 搜索过滤
            if (searchTerm) {
                const matchesSearch = 
                    achieve.m_ID.toString().includes(searchTerm) ||
                    (achieve.name && achieve.name.toLowerCase().includes(searchTerm)) ||
                    (achieve.description && achieve.description.toLowerCase().includes(searchTerm)) ||
                    (achieve.m_noteDesc && achieve.m_noteDesc.toLowerCase().includes(searchTerm));
                if (!matchesSearch) return false;
            }

            // 类型过滤
            if (achType && achieve.m_achType.toString() !== achType) return false;

            // 启用状态过滤
            if (enabled !== '' && achieve.m_enabled.toString() !== enabled) return false;

            // 奖励过滤
            if (reward && achieve.m_reward !== reward) return false;

            return true;
        });

        // 排序
        this.filteredAchieves.sort((a, b) => {
            let aValue, bValue;
            
            switch(this.sortBy) {
                case 'id':
                    aValue = a.m_ID;
                    bValue = b.m_ID;
                    break;
                case 'achType':
                    aValue = a.m_achType;
                    bValue = b.m_achType;
                    break;
                case 'enabled':
                    aValue = a.m_enabled;
                    bValue = b.m_enabled;
                    break;
                default:
                    aValue = a.m_ID;
                    bValue = b.m_ID;
            }
            
            const result = aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
            return this.reverseSort ? -result : result;
        });

        // 显示过滤后的数据
        if (this.currentView === 'tree') {
            this.displayTreeView();
        } else {
            this.displayListView();
        }

        console.log(`🔍 过滤完成，显示 ${this.filteredAchieves.length} 个成就`);
    }

    displayTreeView() {
        const container = document.getElementById('achieveTreeView');
        container.style.display = 'flex';
        document.getElementById('achieveList').style.display = 'none';

        // 获取根成就（没有父成就或父成就是'none'的）
        const rootAchieves = this.filteredAchieves.filter(achieve => 
            !achieve.m_parentAch || achieve.m_parentAch === 'none'
        );

        if (rootAchieves.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">没有找到匹配的成就</div></div>';
            return;
        }

        container.innerHTML = '';
        rootAchieves.forEach(achieve => {
            container.appendChild(this.createTreeNode(achieve));
        });
    }

    createTreeNode(achieve) {
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.dataset.achieveId = achieve.m_ID;

        const hasChildren = achieve.children && achieve.children.length > 0;

        node.innerHTML = `
            <div class="tree-node-header">
                <div class="tree-node-title">
                    ${hasChildren ? '<span class="tree-node-toggle">▼</span>' : '<span style="width:20px"></span>'}
                    <span>${achieve.name || achieve.m_noteDesc || `ID: ${achieve.m_ID}`}</span>
                    <span class="achieve-tag ${achieve.m_enabled ? 'enabled' : 'disabled'}">
                        ${achieve.m_enabled ? '✓ 启用' : '✗ 禁用'}
                    </span>
                </div>
                <div class="tree-node-info">
                    类型: ${this.achTypeMap[achieve.m_achType] || achieve.m_achType} | 配额: ${achieve.m_achQuota}${achieve.m_reward && achieve.m_reward !== 'none' ? ` | 奖励: ${achieve.m_reward}` : ''}
                </div>
            </div>
            ${hasChildren ? `<div class="tree-node-children"></div>` : ''}
        `;

        // 点击标题查看详情
        const header = node.querySelector('.tree-node-header');
        const title = header.querySelector('.tree-node-title');
        
        if (hasChildren) {
            title.addEventListener('click', (e) => {
                e.stopPropagation();
                node.classList.toggle('collapsed');
            });
        }

        header.addEventListener('click', () => {
            this.showAchieveDetails(achieve);
        });

        // 添加子节点
        if (hasChildren) {
            const childrenContainer = node.querySelector('.tree-node-children');
            achieve.children.forEach(child => {
                if (this.filteredAchieves.includes(child)) {
                    childrenContainer.appendChild(this.createTreeNode(child));
                }
            });
        }

        return node;
    }

    displayListView() {
        const container = document.getElementById('achieveList');
        container.style.display = 'grid';
        document.getElementById('achieveTreeView').style.display = 'none';

        if (this.filteredAchieves.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">没有找到匹配的成就</div></div>';
            return;
        }

        container.innerHTML = '';
        this.filteredAchieves.forEach(achieve => {
            container.appendChild(this.createAchieveCard(achieve));
        });
    }

    createAchieveCard(achieve) {
        const card = document.createElement('div');
        card.className = 'achieve-card';
        card.onclick = () => this.showAchieveDetails(achieve);

        const tags = [];
        if (achieve.m_enabled) {
            tags.push('<span class="achieve-tag enabled">✓ 启用</span>');
        } else {
            tags.push('<span class="achieve-tag disabled">✗ 禁用</span>');
        }

        if (achieve.m_parentAch && achieve.m_parentAch !== 'none') {
            tags.push(`<span class="achieve-tag parent">父: ${achieve.m_parentAch}</span>`);
        }

        if (achieve.m_reward && achieve.m_reward !== 'none') {
            tags.push(`<span class="achieve-tag reward">🎁 ${achieve.m_reward}</span>`);
        }

        if (achieve.m_achQuota > 1) {
            tags.push(`<span class="achieve-tag quota">📊 ${achieve.m_achQuota}</span>`);
        }

        card.innerHTML = `
            <div class="achieve-card-header">
                <span class="achieve-card-id">ID: ${achieve.m_ID}</span>
                <span class="achieve-card-type">${this.achTypeMap[achieve.m_achType] || `类型 ${achieve.m_achType}`}</span>
            </div>
            <div class="achieve-card-name">${achieve.name || achieve.m_noteDesc || '未命名'}</div>
            <div class="achieve-card-desc">${achieve.description || '无描述'}</div>
            <div class="achieve-card-meta">${tags.join('')}</div>
        `;

        return card;
    }

    showAchieveDetails(achieve) {
        const modal = document.getElementById('achieveModal');
        const detailsDiv = document.getElementById('achieveDetails');

        document.getElementById('modalAchieveName').textContent = achieve.name || achieve.m_noteDesc || `成就 ID: ${achieve.m_ID}`;

        let html = `
            <div class="detail-section">
                <h4>基本信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">ID</div>
                        <div class="detail-value">${achieve.m_ID}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">noteDesc</div>
                        <div class="detail-value">${achieve.m_noteDesc || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">类型 (achType)</div>
                        <div class="detail-value">${this.achTypeMap[achieve.m_achType] || achieve.m_achType}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">启用状态</div>
                        <div class="detail-value">${achieve.m_enabled ? '✓ 启用' : '✗ 禁用'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">父成就</div>
                        <div class="detail-value">${achieve.m_parentAch || 'none'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">链接到</div>
                        <div class="detail-value">${achieve.m_linkTo || 'none'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">配额</div>
                        <div class="detail-value">${achieve.m_achQuota}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">触发方式</div>
                        <div class="detail-value">${this.triggerMap[achieve.m_triggered] || achieve.m_triggered}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4>游戏相关</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">游戏模式</div>
                        <div class="detail-value">${this.gameModeMap[achieve.m_gameMode] || achieve.m_gameMode}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">种族ID</div>
                        <div class="detail-value">${achieve.m_raceId || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">卡牌集ID</div>
                        <div class="detail-value">${achieve.m_cardSetId || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">我方英雄职业</div>
                        <div class="detail-value">${achieve.m_myHeroClassId || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">敌方英雄职业</div>
                        <div class="detail-value">${achieve.m_enemyHeroClassId || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">场景ID</div>
                        <div class="detail-value">${achieve.m_scenarioId || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">冒险ID</div>
                        <div class="detail-value">${achieve.m_adventureId || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">冒险模式ID</div>
                        <div class="detail-value">${achieve.m_adventureModeId || '-'}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4>奖励信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">奖励类型</div>
                        <div class="detail-value">${achieve.m_reward || 'none'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">奖励数据1</div>
                        <div class="detail-value">${achieve.m_rewardData1}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">奖励数据2</div>
                        <div class="detail-value">${achieve.m_rewardData2}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">奖励时机</div>
                        <div class="detail-value">${achieve.m_rewardTiming}</div>
                    </div>
                </div>
            </div>
        `;

        // 条件信息
        if (achieve.conditions && achieve.conditions.length > 0) {
            html += `
                <div class="detail-section">
                    <h4>条件 (${achieve.conditions.length})</h4>
                    <div class="detail-grid">
                        ${achieve.conditions.map(cond => `
                            <div class="detail-item">
                                <div class="detail-label">条件 ID ${cond.id}</div>
                                <div class="detail-value">场景: ${cond.scenarioId}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 区域数据
        if (achieve.regionData && achieve.regionData.length > 0) {
            html += `
                <div class="detail-section">
                    <h4>区域数据 (${achieve.regionData.length})</h4>
                    <div class="detail-grid">
                        ${achieve.regionData.map(region => `
                            <div class="detail-item">
                                <div class="detail-label">区域 ${region.region}</div>
                                <div class="detail-value">事件: ${region.progressableEvent}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 子成就
        if (achieve.children && achieve.children.length > 0) {
            html += `
                <div class="detail-section">
                    <h4>子成就 (${achieve.children.length})</h4>
                    <div class="detail-grid">
                        ${achieve.children.map(child => `
                            <div class="detail-item">
                                <div class="detail-label">ID ${child.m_ID}</div>
                                <div class="detail-value">${child.name || child.m_noteDesc || '未命名'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        detailsDiv.innerHTML = html;
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('achieveModal').style.display = 'none';
    }

    switchView(view) {
        this.currentView = view;
        
        document.getElementById('treeViewBtn').classList.toggle('active', view === 'tree');
        document.getElementById('listViewBtn').classList.toggle('active', view === 'list');

        if (view === 'tree') {
            this.displayTreeView();
        } else {
            this.displayListView();
        }
    }

    collapseAll() {
        document.querySelectorAll('.tree-node').forEach(node => {
            node.classList.add('collapsed');
        });
    }

    expandAll() {
        document.querySelectorAll('.tree-node').forEach(node => {
            node.classList.remove('collapsed');
        });
    }

    updateSummary() {
        const totalCount = this.allAchieves.length;
        const enabledCount = this.allAchieves.filter(a => a.m_enabled).length;
        const rootCount = this.allAchieves.filter(a => !a.m_parentAch || a.m_parentAch === 'none').length;
        const childCount = totalCount - rootCount;

        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('enabledCount').textContent = enabledCount;
        document.getElementById('rootCount').textContent = rootCount;
        document.getElementById('childCount').textContent = childCount;
    }

    async startCompare() {
        try {
            const newVersion = document.getElementById('newVersionSelect').value;
            const oldVersion = document.getElementById('oldVersionSelect').value;

            console.log(`🔄 开始对比版本: ${newVersion} vs ${oldVersion}`);

            // 显示对比结果区域
            document.getElementById('compareResultsSection').style.display = 'block';
            document.getElementById('achieveListSection').style.display = 'none';

            // 加载两个版本的数据
            const [newData, oldData] = await Promise.all([
                this.loadVersionData(newVersion),
                this.loadVersionData(oldVersion)
            ]);

            // 对比数据
            const changes = this.findAchieveChanges(newData, oldData);

            this.compareData = {
                newVersion,
                oldVersion,
                added: changes.added,
                modified: changes.modified,
                deleted: changes.deleted
            };

            // 更新统计信息
            document.getElementById('addedCount').textContent = changes.added.length;
            document.getElementById('modifiedCount').textContent = changes.modified.length;
            document.getElementById('deletedCount').textContent = changes.deleted.length;

            // 显示对比结果
            this.displayCompareResults();

            console.log('✅ 对比完成');
        } catch (error) {
            console.error('❌ 对比失败:', error);
            this.showError('对比失败: ' + error.message);
        }
    }

    async loadVersionData(version) {
        const data = await window.dataManager.loadFile('ACHIEVE', version);
        const achieves = data.Records || [];
        
        // 解析名称和描述
        achieves.forEach(achieve => {
            achieve.name = this.getLocalizedText(achieve.m_name);
            achieve.description = this.getLocalizedText(achieve.m_description);
        });

        return achieves;
    }

    findAchieveChanges(newAchieves, oldAchieves) {
        const newMap = new Map(newAchieves.map(a => [a.m_ID, a]));
        const oldMap = new Map(oldAchieves.map(a => [a.m_ID, a]));

        const added = [];
        const modified = [];
        const deleted = [];

        // 查找新增和修改
        for (const [id, newAchieve] of newMap) {
            if (!oldMap.has(id)) {
                added.push(newAchieve);
            } else {
                const oldAchieve = oldMap.get(id);
                const changes = this.compareAchieves(newAchieve, oldAchieve);
                if (changes.length > 0) {
                    modified.push({ achieve: newAchieve, changes, oldAchieve });
                }
            }
        }

        // 查找删除
        for (const [id, oldAchieve] of oldMap) {
            if (!newMap.has(id)) {
                deleted.push(oldAchieve);
            }
        }

        return { added, modified, deleted };
    }

    compareAchieves(newAchieve, oldAchieve) {
        const changes = [];
        const fieldsToCompare = [
            'm_achType', 'm_enabled', 'm_parentAch', 'm_linkTo', 'm_triggered',
            'm_achQuota', 'm_gameMode', 'm_reward', 'm_rewardData1', 'm_rewardData2',
            'name', 'description'
        ];

        fieldsToCompare.forEach(field => {
            if (JSON.stringify(newAchieve[field]) !== JSON.stringify(oldAchieve[field])) {
                changes.push({
                    field,
                    oldValue: oldAchieve[field],
                    newValue: newAchieve[field]
                });
            }
        });

        return changes;
    }

    displayCompareResults() {
        this.switchCompareTab('added');
    }

    switchCompareTab(tabName) {
        // 更新标签状态
        document.querySelectorAll('.compare-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // 更新内容显示
        document.querySelectorAll('.compare-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Content`).classList.add('active');

        // 渲染对应内容
        switch (tabName) {
            case 'added':
                this.renderAddedAchieves();
                break;
            case 'modified':
                this.renderModifiedAchieves();
                break;
            case 'deleted':
                this.renderDeletedAchieves();
                break;
        }
    }

    renderAddedAchieves() {
        const container = document.getElementById('addedContent');
        
        if (this.compareData.added.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">没有新增的成就</div></div>';
            return;
        }

        container.innerHTML = this.compareData.added.map(achieve => `
            <div class="change-item added">
                <div class="change-header">
                    <span class="change-id">ID: ${achieve.m_ID}</span>
                    <span class="achieve-tag added">新增</span>
                </div>
                <div class="achieve-card-name">${achieve.name || achieve.m_noteDesc || '未命名'}</div>
                <div class="achieve-card-desc">${achieve.description || '无描述'}</div>
                <div class="achieve-card-meta">
                    <span class="achieve-tag">类型: ${this.achTypeMap[achieve.m_achType] || achieve.m_achType}</span>
                    <span class="achieve-tag ${achieve.m_enabled ? 'enabled' : 'disabled'}">
                        ${achieve.m_enabled ? '✓ 启用' : '✗ 禁用'}
                    </span>
                    ${achieve.m_reward && achieve.m_reward !== 'none' ? `<span class="achieve-tag reward">🎁 ${achieve.m_reward}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderModifiedAchieves() {
        const container = document.getElementById('modifiedContent');
        
        if (this.compareData.modified.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">没有修改的成就</div></div>';
            return;
        }

        container.innerHTML = this.compareData.modified.map(({ achieve, changes }) => `
            <div class="change-item modified">
                <div class="change-header">
                    <span class="change-id">ID: ${achieve.m_ID}</span>
                    <span class="achieve-tag modified">${changes.length} 处修改</span>
                </div>
                <div class="achieve-card-name">${achieve.name || achieve.m_noteDesc || '未命名'}</div>
                <div class="change-details">
                    ${changes.map(change => `
                        <div class="change-field">
                            <div class="field-name">${this.getFieldLabel(change.field)}</div>
                            <div class="field-value">
                                <span class="old-value">${this.formatFieldValue(change.field, change.oldValue)}</span>
                                <span>→</span>
                                <span class="new-value">${this.formatFieldValue(change.field, change.newValue)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderDeletedAchieves() {
        const container = document.getElementById('deletedContent');
        
        if (this.compareData.deleted.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">没有删除的成就</div></div>';
            return;
        }

        container.innerHTML = this.compareData.deleted.map(achieve => `
            <div class="change-item deleted">
                <div class="change-header">
                    <span class="change-id">ID: ${achieve.m_ID}</span>
                    <span class="achieve-tag deleted">删除</span>
                </div>
                <div class="achieve-card-name">${achieve.name || achieve.m_noteDesc || '未命名'}</div>
                <div class="achieve-card-desc">${achieve.description || '无描述'}</div>
                <div class="achieve-card-meta">
                    <span class="achieve-tag">类型: ${achieve.m_achType}</span>
                    <span class="achieve-tag ${achieve.m_enabled ? 'enabled' : 'disabled'}">
                        ${achieve.m_enabled ? '✓ 启用' : '✗ 禁用'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    getFieldLabel(field) {
        const labels = {
            'm_achType': '类型',
            'm_enabled': '启用状态',
            'm_parentAch': '父成就',
            'm_linkTo': '链接到',
            'm_triggered': '触发方式',
            'm_achQuota': '配额',
            'm_gameMode': '游戏模式',
            'm_reward': '奖励类型',
            'm_rewardData1': '奖励数据1',
            'm_rewardData2': '奖励数据2',
            'name': '名称',
            'description': '描述'
        };
        return labels[field] || field;
    }

    formatValue(value) {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? '✓' : '✗';
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
    }

    formatFieldValue(field, value) {
        // 特殊处理某些字段
        if (field === 'm_achType') {
            return this.achTypeMap[value] || value;
        }
        if (field === 'm_triggered') {
            return this.triggerMap[value] || value;
        }
        if (field === 'm_gameMode') {
            return this.gameModeMap[value] || value;
        }
        return this.formatValue(value);
    }

    async exportAchieves() {
        try {
            const data = {
                version: this.currentVersion,
                exportTime: new Date().toISOString(),
                total: this.allAchieves.length,
                achieves: this.allAchieves.map(achieve => ({
                    id: achieve.m_ID,
                    noteDesc: achieve.m_noteDesc,
                    name: achieve.name,
                    description: achieve.description,
                    achType: achieve.m_achType,
                    enabled: achieve.m_enabled,
                    parentAch: achieve.m_parentAch,
                    linkTo: achieve.m_linkTo,
                    achQuota: achieve.m_achQuota,
                    gameMode: achieve.m_gameMode,
                    reward: achieve.m_reward,
                    rewardData1: achieve.m_rewardData1,
                    rewardData2: achieve.m_rewardData2,
                    conditions: achieve.conditions,
                    regionData: achieve.regionData
                }))
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `achieve_${this.currentVersion}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('✅ 导出完成');
        } catch (error) {
            console.error('❌ 导出失败:', error);
            this.showError('导出失败: ' + error.message);
        }
    }

    async exportCompareResults() {
        try {
            const data = {
                newVersion: this.compareData.newVersion,
                oldVersion: this.compareData.oldVersion,
                exportTime: new Date().toISOString(),
                summary: {
                    added: this.compareData.added.length,
                    modified: this.compareData.modified.length,
                    deleted: this.compareData.deleted.length
                },
                changes: this.compareData
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `achieve_compare_${this.compareData.newVersion}_vs_${this.compareData.oldVersion}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('✅ 对比结果导出完成');
        } catch (error) {
            console.error('❌ 导出失败:', error);
            this.showError('导出失败: ' + error.message);
        }
    }

    showError(message) {
        alert('错误: ' + message);
    }
}

// 初始化
const achieveSystem = new AchieveSystem();
document.addEventListener('DOMContentLoaded', () => achieveSystem.init());
