// 炉石传说套牌规则集系统
class DeckRulesetSystem {
    constructor() {
        this.availableVersions = [];
        this.dataPath = './data';
        this.allRulesets = [];
        this.filteredRulesets = [];
        this.subsets = {}; // 存储子集数据
        this.subsetRules = {}; // 存储子集规则数据
        this.userNotes = { SUBSET: {} }; // 存储用户备注
        this.currentEditingRuleId = null; // 当前正在编辑备注的规则ID
        this.compareMode = false; // 对比模式
        this.selectedRulesets = new Set(); // 选中的规则集
        
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
        
        // 规则集操作
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelect());
        document.getElementById('exportRulesetsBtn').addEventListener('click', () => this.exportRulesets());
        
        // 搜索
        document.getElementById('searchInput').addEventListener('input', () => this.filterRulesets());
        
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
    }
    
    // 加载用户备注
    async loadUserNotes() {
        try {
            const result = await window.fileAPI.readFile('data/user-notes.json');
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
            const result = await window.fileAPI.writeFile('data/user-notes.json', data);
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
        const select = document.getElementById('versionSelect');
        select.innerHTML = '<option value="">请选择版本</option>';
        this.availableVersions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = `版本 ${version}`;
            select.appendChild(option);
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
        const rulesetPath = `data/${version}/DECK_RULESET.json`;
        const rulePath = `data/${version}/DECK_RULESET_RULE.json`;
        const subsetPath = `data/${version}/DECK_RULESET_RULE_SUBSET.json`;
        
        try {
            const [rulesetResult, ruleResult, subsetResult] = await Promise.all([
                window.fileAPI.readFile(rulesetPath),
                window.fileAPI.readFile(rulePath),
                window.fileAPI.readFile(subsetPath)
            ]);
            
            const missingFiles = [];
            if (!rulesetResult.success) missingFiles.push('DECK_RULESET.json');
            if (!ruleResult.success) missingFiles.push('DECK_RULESET_RULE.json');
            if (!subsetResult.success) missingFiles.push('DECK_RULESET_RULE_SUBSET.json');
            
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
            
            this.updateProgress(95, '正在关联数据...');
            this.allRulesets = this.associateData(rulesets, rules, ruleSubsets);
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
        const filePath = `data/${version}/DECK_RULESET.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(`无法读取 DECK_RULESET.json: ${result.error}`);
        }
        
        const data = JSON.parse(result.data);
        return data.Records || [];
    }
    
    async loadRulesetRules(version) {
        const filePath = `data/${version}/DECK_RULESET_RULE.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(`无法读取 DECK_RULESET_RULE.json: ${result.error}`);
        }
        
        const data = JSON.parse(result.data);
        return data.Records || [];
    }
    
    async loadSubsets(version) {
        // 加载 SUBSET.json
        const subsetPath = `data/${version}/SUBSET.json`;
        const subsetResult = await window.fileAPI.readFile(subsetPath);
        
        if (subsetResult.success) {
            const data = JSON.parse(subsetResult.data);
            if (data.Records) {
                data.Records.forEach(record => {
                    this.subsets[record.m_ID] = record;
                });
            }
        } else {
            console.warn('未能加载子集定义数据，子集详情功能可能不可用');
        }
        
        // 加载 SUBSET_RULE.json
        const subsetRulePath = `data/${version}/SUBSET_RULE.json`;
        const subsetRuleResult = await window.fileAPI.readFile(subsetRulePath);
        
        if (subsetRuleResult.success) {
            const data = JSON.parse(subsetRuleResult.data);
            if (data.Records) {
                data.Records.forEach(record => {
                    if (!this.subsetRules[record.m_subsetId]) {
                        this.subsetRules[record.m_subsetId] = [];
                    }
                    this.subsetRules[record.m_subsetId].push(record);
                });
                console.log(`✅ 加载了 ${data.Records.length} 条子集规则`);
            }
        } else {
            console.warn('未能加载子集规则数据');
        }
    }
    
    async loadRulesetRuleSubsets(version) {
        const filePath = `data/${version}/DECK_RULESET_RULE_SUBSET.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(`无法读取 DECK_RULESET_RULE_SUBSET.json: ${result.error}`);
        }
        
        const data = JSON.parse(result.data);
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
        `;
    }
    
    filterRulesets() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        
        this.filteredRulesets = this.allRulesets.filter(ruleset => {
            return !searchText || ruleset.id.toString().includes(searchText);
        });
        
        this.displayRulesets();
    }
    
    displayRulesets() {
        const container = document.getElementById('rulesetList');
        
        if (this.filteredRulesets.length === 0) {
            container.innerHTML = '<div class="no-results">没有找到符合条件的规则集</div>';
            return;
        }
        
        container.innerHTML = this.filteredRulesets.map(ruleset => {
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
                            ${selectedRulesetsData.map(rs => 
                                `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; min-width: 120px;">规则集 ${rs.id}</th>`
                            ).join('')}
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
