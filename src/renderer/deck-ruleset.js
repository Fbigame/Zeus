// 炉石传说套牌规则集系统
class DeckRulesetSystem {
    constructor() {
        this.availableVersions = [];
        this.dataPath = './data';
        this.allRulesets = [];
        this.filteredRulesets = [];
        this.subsets = {}; // 存储子集数据
        this.subsetRules = {}; // 存储子集规则数据
        
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
        
        container.innerHTML = this.filteredRulesets.map(ruleset => `
            <div class="ruleset-item" onclick="rulesetSystem.showRulesetDetails(${ruleset.id})">
                <div class="ruleset-item-header">
                    <div class="ruleset-name">规则集 ${ruleset.id}</div>
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
        `).join('');
    }
    
    showRulesetDetails(rulesetId) {
        const ruleset = this.allRulesets.find(rs => rs.id === rulesetId);
        if (!ruleset) return;
        
        document.getElementById('modalRulesetName').textContent = `规则集 ${ruleset.id}`;
        
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
            
            <div class="ruleset-details-rules">
                <h4>规则列表 (共${ruleset.rules.length}条)</h4>
                <div class="rule-list">
                    ${ruleset.rules.map(rule => `
                        <div class="rule-list-item">
                            <div class="rule-header">
                                <span class="rule-id">规则 #${rule.id}</span>
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
                                        <button class="view-subset-btn" onclick="rulesetSystem.showSubsetDetails(${rule.appliesToSubsetId}); return false;">🔍 查看</button>
                                    </div>
                                ` : ''}
                                ${rule.tagId ? `
                                    <div class="rule-detail-item">
                                        <strong>标签ID:</strong> ${rule.tagId} (${rule.tagMinValue} - ${rule.tagMaxValue})
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
                                        <strong>关联子集:</strong> ${rule.subsets.join(', ')}
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
                    `).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('rulesetModal').style.display = 'block';
    }
    
    closeModal() {
        document.getElementById('rulesetModal').style.display = 'none';
    }
    
    showSubsetDetails(subsetId) {
        const subset = this.subsets[subsetId];
        if (!subset) {
            alert(`未找到子集 ID: ${subsetId}`);
            return;
        }
        
        document.getElementById('modalSubsetName').textContent = `子集 ${subsetId}`;
        
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
            
            <div class="ruleset-details-rules">
                <h4>子集规则</h4>
                <div class="rule-list">
                    ${this.subsetRules[subsetId] && this.subsetRules[subsetId].length > 0 ? this.subsetRules[subsetId].map((rule, index) => {
                        const ruleTypeName = this.subsetRuleTypes[rule.m_type] || `未知类型(${rule.m_type})`;
                        return `
                            <div class="rule-list-item">
                                <div class="rule-header">
                                    <span class="rule-id">子集规则 #${index + 1}</span>
                                    <span class="rule-type">${ruleTypeName}</span>
                                </div>
                                <div class="rule-details">
                                    ${rule.m_minValue !== undefined || rule.m_maxValue !== undefined ? `
                                        <div class="rule-detail-item">
                                            <strong>范围:</strong> ${rule.m_minValue || 0} - ${rule.m_maxValue || 0}
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
                                        <strong>反转规则:</strong> ${rule.m_not ? '是' : '否'}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') : '<p style="color: #6c757d; text-align: center; padding: 20px;">该子集没有规则</p>'}
                </div>
            </div>
        `;
        
        document.getElementById('subsetModal').style.display = 'block';
    }
    
    closeSubsetModal() {
        document.getElementById('subsetModal').style.display = 'none';
    }
    
    backToVersionSelect() {
        document.getElementById('rulesetListSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
        this.allRulesets = [];
        this.filteredRulesets = [];
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
