// 炉石传说成就系统
class AchievementSystem {
    constructor() {
        this.availableVersions = [];
        this.dataPath = './data';
        this.allAchievements = [];
        this.filteredAchievements = [];
        this.categories = {};
        this.subcategories = {};
        this.sections = {};
        this.currentView = 'achievement'; // 'achievement' or 'category'
        this.currentMode = 'normal'; // 'normal' or 'compare'
        this.compareData = {
            newVersion: null,
            oldVersion: null,
            added: [],
            modified: [],
            deleted: []
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 AchievementSystem 初始化开始');
        this.setupEventListeners();
        await this.detectVersions();
        console.log('✅ AchievementSystem 初始化完成');
    }
    
    setupEventListeners() {
        // 返回首页
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 版本选择
        document.getElementById('versionSelect').addEventListener('change', () => this.onVersionSelect());
        document.getElementById('loadAchievementsBtn').addEventListener('click', () => this.loadAchievements());
        document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.detectVersions());
        
        // 成就操作
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelect());
        document.getElementById('exportAchievementsBtn').addEventListener('click', () => this.exportAchievements());
        
        // 模式切换
        document.getElementById('normalModeBtn').addEventListener('click', () => this.switchMode('normal'));
        document.getElementById('compareModeBtn').addEventListener('click', () => this.switchMode('compare'));
        
        // 对比版本选择
        document.getElementById('newVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('oldVersionSelect').addEventListener('change', () => this.onCompareVersionSelect());
        document.getElementById('startCompareBtn').addEventListener('click', () => this.startCompare());
        document.getElementById('newCompareBtn').addEventListener('click', () => this.switchMode('compare'));
        
        // 视图切换
        document.getElementById('achievementViewBtn').addEventListener('click', () => this.switchView('achievement'));
        document.getElementById('categoryViewBtn').addEventListener('click', () => this.switchView('category'));
        
        // 搜索和过滤
        document.getElementById('searchInput').addEventListener('input', () => this.filterAchievements());
        document.getElementById('categoryFilter').addEventListener('change', () => this.filterAchievements());
        document.getElementById('sectionFilter').addEventListener('change', () => this.filterAchievements());
        
        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('achievementModal').addEventListener('click', (e) => {
            if (e.target.id === 'achievementModal') this.closeModal();
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
        const loadBtn = document.getElementById('loadAchievementsBtn');
        
        loadBtn.disabled = true;
        
        if (!version) {
            document.getElementById('versionInfo').innerHTML = '';
            return;
        }
        
        const isValid = await this.checkVersionFiles(version);
        loadBtn.disabled = !isValid;
    }
    
    // 检查版本文件
    async checkVersionFiles(version, infoElementId = 'versionInfo') {
        try {
            window.dataManager.setVersion(version);
            
            const missingFiles = [];
            
            try {
                await window.dataManager.loadFile('ACHIEVEMENT', version);
            } catch (error) {
                missingFiles.push('ACHIEVEMENT.json');
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
            
            document.getElementById(infoElementId).innerHTML = `
                <div><strong>版本号:</strong> ${version}</div>
                <div><strong>路径:</strong> data/${version}/</div>
                <div><strong>状态:</strong> <span class="${statusClass}">${status}</span></div>
            `;
            
            return isValid;
        } catch (error) {
            document.getElementById(infoElementId).innerHTML = `
                <div><strong>版本号:</strong> ${version}</div>
                <div><strong>状态:</strong> <span class="status-error">❌ 检测失败: ${error.message}</span></div>
            `;
            return false;
        }
    }
    
    // 加载成就
    async loadAchievements() {
        const version = document.getElementById('versionSelect').value;
        console.log('🚀 开始加载成就:', version);
        
        window.dataManager.setVersion(version);
        
        try {
            this.showProgressSection();
            
            this.updateProgress(10, '正在加载成就数据...');
            const achievements = await this.loadAchievementData(version);
            console.log('✅ 成就数据加载完成:', achievements.length);
            
            this.updateProgress(30, '正在加载成就分类...');
            await this.loadCategories(version);
            console.log('✅ 分类加载完成:', Object.keys(this.categories).length);
            
            this.updateProgress(50, '正在加载子分类...');
            await this.loadSubcategories(version);
            console.log('✅ 子分类加载完成:', Object.keys(this.subcategories).length);
            
            this.updateProgress(70, '正在加载章节...');
            await this.loadSections(version);
            console.log('✅ 章节加载完成:', Object.keys(this.sections).length);
            
            this.updateProgress(90, '正在关联数据...');
            this.allAchievements = this.associateData(achievements);
            console.log('✅ 数据关联完成:', this.allAchievements.length);
            
            this.updateProgress(100, '加载完成！');
            
            this.showAchievementList();
            
        } catch (error) {
            console.error('❌ 加载成就失败:', error);
            alert('加载成就失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载成就数据
    async loadAchievementData(version) {
        const data = await window.dataManager.loadFile('ACHIEVEMENT', version);
        if (!data) {
            throw new Error('无法读取 ACHIEVEMENT.json');
        }
        return data.Records || [];
    }
    
    // 加载分类
    async loadCategories(version) {
        try {
            const data = await window.dataManager.loadFile('ACHIEVEMENT_CATEGORY', version);
            if (data && data.Records) {
                data.Records.forEach(category => {
                    this.categories[category.m_ID] = {
                        id: category.m_ID,
                        name: this.extractLocalizedText(category.m_name)
                    };
                });
            }
        } catch (error) {
            console.warn('未能加载分类数据:', error);
        }
    }
    
    // 加载子分类
    async loadSubcategories(version) {
        try {
            const data = await window.dataManager.loadFile('ACHIEVEMENT_SUBCATEGORY', version);
            if (data && data.Records) {
                data.Records.forEach(subcat => {
                    this.subcategories[subcat.m_ID] = {
                        id: subcat.m_ID,
                        categoryId: subcat.m_categoryId,
                        name: this.extractLocalizedText(subcat.m_name)
                    };
                });
            }
        } catch (error) {
            console.warn('未能加载子分类数据:', error);
        }
    }
    
    // 加载章节
    async loadSections(version) {
        try {
            const data = await window.dataManager.loadFile('ACHIEVEMENT_SECTION', version);
            if (data && data.Records) {
                data.Records.forEach(section => {
                    this.sections[section.m_ID] = {
                        id: section.m_ID,
                        name: this.extractLocalizedText(section.m_name)
                    };
                });
            }
        } catch (error) {
            console.warn('未能加载章节数据:', error);
        }
    }
    
    // 关联数据
    associateData(achievements) {
        return achievements.map(ach => {
            const sectionId = ach.m_achievementSectionId;
            const section = this.sections[sectionId];
            
            return {
                id: ach.m_ID,
                sectionId: sectionId,
                sectionName: section ? section.name : `章节${sectionId}`,
                sortOrder: ach.m_sortOrder || 0,
                enabled: ach.m_enabled || 0,
                name: this.extractLocalizedText(ach.m_name),
                description: this.extractLocalizedText(ach.m_description),
                quota: ach.m_quota || 0,
                points: ach.m_points || 0,
                rewardTrackId: ach.m_rewardTrackId || 0,
                raw: ach
            };
        });
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
    
    // 显示成就列表
    showAchievementList() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.getElementById('achievementListSection').style.display = 'block';
        
        this.updateAchievementSummary();
        this.populateFilters();
        this.filterAchievements();
    }
    
    // 切换模式
    switchMode(mode) {
        this.currentMode = mode;
        
        document.getElementById('normalModeBtn').classList.toggle('active', mode === 'normal');
        document.getElementById('compareModeBtn').classList.toggle('active', mode === 'compare');
        
        // 隐藏所有版本选择内容
        document.querySelector('.version-single').style.display = mode === 'normal' ? 'block' : 'none';
        document.querySelector('.load-controls').style.display = mode === 'normal' ? 'flex' : 'none';
        document.getElementById('compareVersionSection').style.display = mode === 'compare' ? 'block' : 'none';
        
        if (mode === 'compare') {
            this.populateCompareVersionSelectors();
            this.autoSelectCompareVersions();
        }
    }
    
    // 填充对比版本选择器
    populateCompareVersionSelectors() {
        const newSelect = document.getElementById('newVersionSelect');
        const oldSelect = document.getElementById('oldVersionSelect');
        
        newSelect.innerHTML = '<option value="">请选择新版本</option>';
        oldSelect.innerHTML = '<option value="">请选择旧版本</option>';
        
        this.availableVersions.forEach(version => {
            const newOption = document.createElement('option');
            newOption.value = version;
            newOption.textContent = `版本 ${version}`;
            newSelect.appendChild(newOption);
            
            const oldOption = document.createElement('option');
            oldOption.value = version;
            oldOption.textContent = `版本 ${version}`;
            oldSelect.appendChild(oldOption);
        });
    }
    
    // 自动选择对比版本（最新两个）
    autoSelectCompareVersions() {
        if (this.availableVersions.length >= 2) {
            document.getElementById('newVersionSelect').value = this.availableVersions[0];
            document.getElementById('oldVersionSelect').value = this.availableVersions[1];
            this.onCompareVersionSelect();
        }
    }
    
    // 对比版本选择事件
    async onCompareVersionSelect() {
        const newVersion = document.getElementById('newVersionSelect').value;
        const oldVersion = document.getElementById('oldVersionSelect').value;
        const startBtn = document.getElementById('startCompareBtn');
        
        startBtn.disabled = true;
        
        if (!newVersion || !oldVersion) {
            document.getElementById('newVersionInfo').innerHTML = '';
            document.getElementById('oldVersionInfo').innerHTML = '';
            return;
        }
        
        if (newVersion === oldVersion) {
            document.getElementById('newVersionInfo').innerHTML = '<span class="status-error">❌ 不能选择相同版本</span>';
            document.getElementById('oldVersionInfo').innerHTML = '<span class="status-error">❌ 不能选择相同版本</span>';
            return;
        }
        
        const newValid = await this.checkVersionFiles(newVersion, 'newVersionInfo');
        const oldValid = await this.checkVersionFiles(oldVersion, 'oldVersionInfo');
        
        startBtn.disabled = !(newValid && oldValid);
    }
    
    // 开始对比
    async startCompare() {
        const newVersion = document.getElementById('newVersionSelect').value;
        const oldVersion = document.getElementById('oldVersionSelect').value;
        
        console.log('🔍 开始对比成就:', newVersion, 'vs', oldVersion);
        
        try {
            this.showProgressSection();
            
            this.updateProgress(20, '正在加载新版本数据...');
            const newData = await this.loadVersionData(newVersion);
            
            this.updateProgress(50, '正在加载旧版本数据...');
            const oldData = await this.loadVersionData(oldVersion);
            
            this.updateProgress(80, '正在对比数据...');
            this.compareAchievements(newData, oldData);
            
            this.updateProgress(100, '对比完成！');
            
            setTimeout(() => {
                this.showCompareResults();
            }, 500);
            
        } catch (error) {
            console.error('❌ 对比失败:', error);
            alert('对比失败: ' + error.message);
            this.hideProgressSection();
        }
    }
    
    // 加载版本数据
    async loadVersionData(version) {
        window.dataManager.setVersion(version);
        
        const achievements = await this.loadAchievementData(version);
        const categories = {};
        const sections = {};
        
        try {
            const categoryData = await window.dataManager.loadFile('ACHIEVEMENT_CATEGORY', version);
            if (categoryData && categoryData.Records) {
                categoryData.Records.forEach(cat => {
                    categories[cat.m_ID] = {
                        id: cat.m_ID,
                        name: this.extractLocalizedText(cat.m_name)
                    };
                });
            }
        } catch (error) {
            console.warn('未能加载分类数据:', error);
        }
        
        try {
            const sectionData = await window.dataManager.loadFile('ACHIEVEMENT_SECTION', version);
            if (sectionData && sectionData.Records) {
                sectionData.Records.forEach(sec => {
                    sections[sec.m_ID] = {
                        id: sec.m_ID,
                        name: this.extractLocalizedText(sec.m_name)
                    };
                });
            }
        } catch (error) {
            console.warn('未能加载章节数据:', error);
        }
        
        return {
            achievements: achievements.map(ach => ({
                id: ach.m_ID,
                sectionId: ach.m_achievementSectionId,
                sectionName: sections[ach.m_achievementSectionId]?.name || `章节${ach.m_achievementSectionId}`,
                sortOrder: ach.m_sortOrder || 0,
                enabled: ach.m_enabled || 0,
                name: this.extractLocalizedText(ach.m_name),
                description: this.extractLocalizedText(ach.m_description),
                quota: ach.m_quota || 0,
                points: ach.m_points || 0,
                rewardTrackId: ach.m_rewardTrackId || 0,
                raw: ach
            })),
            categories,
            sections
        };
    }
    
    // 对比成就
    compareAchievements(newData, oldData) {
        const newMap = new Map(newData.achievements.map(a => [a.id, a]));
        const oldMap = new Map(oldData.achievements.map(a => [a.id, a]));
        
        this.compareData = {
            newVersion: document.getElementById('newVersionSelect').value,
            oldVersion: document.getElementById('oldVersionSelect').value,
            added: [],
            modified: [],
            deleted: []
        };
        
        // 查找新增
        newMap.forEach((ach, id) => {
            if (!oldMap.has(id)) {
                this.compareData.added.push(ach);
            }
        });
        
        // 查找删除
        oldMap.forEach((ach, id) => {
            if (!newMap.has(id)) {
                this.compareData.deleted.push(ach);
            }
        });
        
        // 查找修改
        newMap.forEach((newAch, id) => {
            const oldAch = oldMap.get(id);
            if (oldAch) {
                const changes = this.findAchievementChanges(oldAch, newAch);
                if (changes.length > 0) {
                    this.compareData.modified.push({
                        ...newAch,
                        changes,
                        oldData: oldAch
                    });
                }
            }
        });
        
        console.log('📊 对比结果:', this.compareData);
    }
    
    // 查找成就变化
    findAchievementChanges(oldAch, newAch) {
        const changes = [];
        const fields = [
            { key: 'name', label: '名称' },
            { key: 'description', label: '描述' },
            { key: 'points', label: '成就点数' },
            { key: 'quota', label: '目标数量' },
            { key: 'enabled', label: '状态', format: v => v ? '启用' : '禁用' },
            { key: 'sortOrder', label: '排序' },
            { key: 'sectionName', label: '章节' },
            { key: 'rewardTrackId', label: '奖励轨道ID' }
        ];
        
        fields.forEach(field => {
            const oldVal = oldAch[field.key];
            const newVal = newAch[field.key];
            
            if (oldVal !== newVal) {
                changes.push({
                    field: field.label,
                    oldValue: field.format ? field.format(oldVal) : oldVal,
                    newValue: field.format ? field.format(newVal) : newVal
                });
            }
        });
        
        return changes;
    }
    
    // 显示对比结果
    showCompareResults() {
        document.getElementById('loadProgressSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'none';
        document.getElementById('achievementListSection').style.display = 'none';
        document.getElementById('compareResultsSection').style.display = 'block';
        
        this.updateCompareSummary();
        this.setupResultTabs();
        this.displayCompareTab('added');
    }
    
    // 更新对比摘要
    updateCompareSummary() {
        const summary = document.getElementById('compareSummary');
        summary.innerHTML = `
            <div class="compare-summary-item added">
                <span class="summary-value">${this.compareData.added.length}</span>
                <span class="summary-label">新增成就</span>
            </div>
            <div class="compare-summary-item modified">
                <span class="summary-value">${this.compareData.modified.length}</span>
                <span class="summary-label">修改成就</span>
            </div>
            <div class="compare-summary-item deleted">
                <span class="summary-value">${this.compareData.deleted.length}</span>
                <span class="summary-label">删除成就</span>
            </div>
        `;
    }
    
    // 设置结果标签页
    setupResultTabs() {
        document.querySelectorAll('.result-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.displayCompareTab(tab.dataset.tab);
            });
        });
    }
    
    // 显示对比标签页
    displayCompareTab(tab) {
        const container = document.getElementById('compareContent');
        let data = [];
        let type = '';
        
        switch (tab) {
            case 'added':
                data = this.compareData.added;
                type = 'added';
                break;
            case 'modified':
                data = this.compareData.modified;
                type = 'modified';
                break;
            case 'deleted':
                data = this.compareData.deleted;
                type = 'deleted';
                break;
        }
        
        if (data.length === 0) {
            container.innerHTML = '<div class="no-results">暂无数据</div>';
            return;
        }
        
        if (type === 'modified') {
            container.innerHTML = data.map(ach => `
                <div class="compare-item modified" onclick="achievementSystem.showAchievementDetails(${ach.id})">
                    <div class="compare-item-header">
                        <div class="compare-item-name">${ach.name || `成就 ${ach.id}`}</div>
                        <div class="compare-item-id">ID: ${ach.id}</div>
                    </div>
                    <div class="compare-changes">
                        ${ach.changes.map(change => `
                            <div class="change-field">
                                <div class="change-field-name">${change.field}</div>
                                <div class="change-value">
                                    <span class="old-value">${change.oldValue || '(空)'}</span>
                                    <span class="arrow">→</span>
                                    <span class="new-value">${change.newValue || '(空)'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = data.map(ach => `
                <div class="compare-item ${type}" onclick="achievementSystem.showAchievementDetails(${ach.id})">
                    <div class="compare-item-header">
                        <div class="compare-item-name">${ach.name || `成就 ${ach.id}`}</div>
                        <div class="compare-item-id">ID: ${ach.id}</div>
                    </div>
                    ${ach.description ? `<div style="margin-top: 10px; color: #666;">${ach.description}</div>` : ''}
                    <div class="compare-changes">
                        <div class="change-field">
                            <div class="change-field-name">章节</div>
                            <div class="change-value">${ach.sectionName}</div>
                        </div>
                        <div class="change-field">
                            <div class="change-field-name">成就点数</div>
                            <div class="change-value">${ach.points}</div>
                        </div>
                        ${ach.quota > 0 ? `
                        <div class="change-field">
                            <div class="change-field-name">目标数量</div>
                            <div class="change-value">${ach.quota}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    }
    
    // 更新成就摘要
    updateAchievementSummary() {
        const summary = document.getElementById('achievementSummary');
        const sectionCount = new Set(this.allAchievements.map(a => a.sectionId)).size;
        const totalPoints = this.allAchievements.reduce((sum, a) => sum + a.points, 0);
        
        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-value">${this.allAchievements.length}</span>
                <span class="summary-label">成就总数</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${sectionCount}</span>
                <span class="summary-label">章节数量</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${totalPoints}</span>
                <span class="summary-label">总成就点数</span>
            </div>
        `;
    }
    
    // 填充过滤器
    populateFilters() {
        // 填充章节过滤器
        const sectionFilter = document.getElementById('sectionFilter');
        const sections = new Set(this.allAchievements.map(a => a.sectionId));
        
        sectionFilter.innerHTML = '<option value="">所有章节</option>';
        sections.forEach(sectionId => {
            const section = this.sections[sectionId];
            if (section) {
                const option = document.createElement('option');
                option.value = sectionId;
                option.textContent = section.name;
                sectionFilter.appendChild(option);
            }
        });
    }
    
    // 切换视图
    switchView(view) {
        this.currentView = view;
        
        document.getElementById('achievementViewBtn').classList.toggle('active', view === 'achievement');
        document.getElementById('categoryViewBtn').classList.toggle('active', view === 'category');
        
        document.getElementById('achievementList').style.display = view === 'achievement' ? 'grid' : 'none';
        document.getElementById('achievementCategoryView').style.display = view === 'category' ? 'block' : 'none';
        
        if (view === 'achievement') {
            this.displayAchievements();
        } else {
            this.displayCategoryView();
        }
    }
    
    // 过滤成就
    filterAchievements() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        const sectionFilter = document.getElementById('sectionFilter').value;
        
        this.filteredAchievements = this.allAchievements.filter(ach => {
            const matchSearch = !searchText || 
                ach.name.toLowerCase().includes(searchText) ||
                ach.description.toLowerCase().includes(searchText) ||
                ach.id.toString().includes(searchText);
            const matchSection = !sectionFilter || ach.sectionId == sectionFilter;
            return matchSearch && matchSection;
        });
        
        if (this.currentView === 'achievement') {
            this.displayAchievements();
        } else {
            this.displayCategoryView();
        }
    }
    
    // 显示成就列表
    displayAchievements() {
        const container = document.getElementById('achievementList');
        
        if (this.filteredAchievements.length === 0) {
            container.innerHTML = '<div class="no-results">没有找到符合条件的成就</div>';
            return;
        }
        
        container.innerHTML = this.filteredAchievements.map(ach => `
            <div class="achievement-item" onclick="achievementSystem.showAchievementDetails(${ach.id})">
                <div class="achievement-item-header">
                    <div class="achievement-name">${ach.name || `成就 ${ach.id}`}</div>
                    ${ach.points > 0 ? `<div class="achievement-badge">${ach.points} 点</div>` : ''}
                </div>
                ${ach.description ? `<div class="achievement-description">${ach.description}</div>` : ''}
                <div class="achievement-info">
                    <div class="achievement-stat">
                        <span class="stat-label">ID:</span>
                        <span class="stat-value">${ach.id}</span>
                    </div>
                    <div class="achievement-stat">
                        <span class="stat-label">章节:</span>
                        <span class="stat-value">${ach.sectionName}</span>
                    </div>
                    ${ach.quota > 0 ? `
                    <div class="achievement-stat">
                        <span class="stat-label">目标:</span>
                        <span class="stat-value">${ach.quota}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // 显示分类视图
    displayCategoryView() {
        const container = document.getElementById('achievementCategoryView');
        
        // 按章节分组
        const grouped = {};
        this.filteredAchievements.forEach(ach => {
            if (!grouped[ach.sectionId]) {
                grouped[ach.sectionId] = [];
            }
            grouped[ach.sectionId].push(ach);
        });
        
        container.innerHTML = Object.entries(grouped).map(([sectionId, achievements]) => {
            const sectionName = this.sections[sectionId]?.name || `章节${sectionId}`;
            
            return `
                <div class="category-group">
                    <div class="category-header" onclick="this.nextElementSibling.classList.toggle('expanded')">
                        <div class="category-name">${sectionName}</div>
                        <div class="category-count">${achievements.length} 个成就</div>
                    </div>
                    <div class="category-content">
                        <div class="category-achievements">
                            ${achievements.map(ach => `
                                <div class="achievement-item" onclick="achievementSystem.showAchievementDetails(${ach.id})">
                                    <div class="achievement-item-header">
                                        <div class="achievement-name">${ach.name || `成就 ${ach.id}`}</div>
                                        ${ach.points > 0 ? `<div class="achievement-badge">${ach.points} 点</div>` : ''}
                                    </div>
                                    ${ach.description ? `<div class="achievement-description">${ach.description}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 显示成就详情
    showAchievementDetails(achId) {
        const achievement = this.allAchievements.find(a => a.id === achId);
        if (!achievement) return;
        
        document.getElementById('modalAchievementName').textContent = achievement.name || `成就 ${achievement.id}`;
        
        const details = document.getElementById('achievementDetails');
        details.innerHTML = `
            <div class="achievement-details-info">
                <h4>基本信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>成就ID:</strong> ${achievement.id}
                    </div>
                    <div class="info-item">
                        <strong>章节:</strong> ${achievement.sectionName}
                    </div>
                    <div class="info-item">
                        <strong>成就点数:</strong> ${achievement.points}
                    </div>
                    <div class="info-item">
                        <strong>目标数量:</strong> ${achievement.quota}
                    </div>
                    <div class="info-item">
                        <strong>排序:</strong> ${achievement.sortOrder}
                    </div>
                    <div class="info-item">
                        <strong>状态:</strong> ${achievement.enabled ? '启用' : '禁用'}
                    </div>
                    ${achievement.rewardTrackId > 0 ? `
                    <div class="info-item">
                        <strong>奖励轨道ID:</strong> ${achievement.rewardTrackId}
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${achievement.description ? `
            <div class="achievement-details-info">
                <h4>成就描述</h4>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; line-height: 1.8;">
                    ${achievement.description}
                </div>
            </div>
            ` : ''}
        `;
        
        document.getElementById('achievementModal').style.display = 'block';
    }
    
    // 关闭模态框
    closeModal() {
        document.getElementById('achievementModal').style.display = 'none';
    }
    
    // 返回版本选择
    backToVersionSelect() {
        document.getElementById('achievementListSection').style.display = 'none';
        document.getElementById('compareResultsSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
        
        // 重置到查看模式
        this.currentMode = 'normal';
        document.getElementById('normalModeBtn').classList.add('active');
        document.getElementById('compareModeBtn').classList.remove('active');
        document.querySelector('.version-single').style.display = 'block';
        document.querySelector('.load-controls').style.display = 'flex';
        document.getElementById('compareVersionSection').style.display = 'none';
        
        this.allAchievements = [];
        this.filteredAchievements = [];
    }
    
    // 导出成就
    async exportAchievements() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: document.getElementById('versionSelect').value,
            totalAchievements: this.allAchievements.length,
            achievements: this.allAchievements
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        if (window.fileAPI) {
            try {
                const result = await window.fileAPI.showSaveDialog({
                    title: '导出成就数据',
                    defaultPath: `achievements_${exportData.version}.json`,
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
            a.download = `achievements_${exportData.version}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
}

// 初始化系统
let achievementSystem;

console.log('📝 achievement-viewer.js 脚本开始加载');

if (document.readyState === 'loading') {
    console.log('📄 DOM正在加载，等待DOMContentLoaded事件');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM内容已加载，开始初始化AchievementSystem');
        achievementSystem = new AchievementSystem();
    });
} else {
    console.log('📄 DOM已就绪，立即初始化AchievementSystem');
    achievementSystem = new AchievementSystem();
}

window.addEventListener('load', () => {
    console.log('🌐 窗口完全加载');
    if (!achievementSystem) {
        console.log('⚠️ 系统未初始化，重新创建AchievementSystem');
        achievementSystem = new AchievementSystem();
    }
});

window.achievementSystem = achievementSystem;

console.log('✅ achievement-viewer.js 脚本加载完成');
