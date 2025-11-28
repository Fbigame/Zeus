// 炉石传说奖励轨道系统
class RewardTrackSystem {
    constructor() {
        this.availableVersions = [];
        this.dataPath = './data';
        this.allTracks = [];
        this.allLevels = [];
        this.allRewardLists = [];
        this.filteredTracks = [];
        this.currentCategory = 'all';
        
        // 奖励轨道类型映射
        this.trackTypes = {
            0: { name: '无', category: 'none', color: '#999' },
            1: { name: '全局轨道', category: 'global', color: '#1976d2' },
            2: { name: '酒馆战棋', category: 'battlegrounds', color: '#f57c00' },
            7: { name: '活动轨道', category: 'event', color: '#7b1fa2' },
            8: { name: '学徒轨道', category: 'apprentice', color: '#4caf50' }
        };
        
        this.init();
        
        // 设置全局引用以便在HTML中调用
        window.rewardTrackSystem = this;
    }
    
    async init() {
        console.log('🚀 RewardTrackSystem 初始化开始');
        this.setupEventListeners();
        await this.detectVersions();
        console.log('✅ RewardTrackSystem 初始化完成');
    }
    
    setupEventListeners() {
        // 返回首页
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 版本选择
        document.getElementById('versionSelect').addEventListener('change', () => this.onVersionSelect());
        document.getElementById('loadRewardTracksBtn').addEventListener('click', () => this.loadRewardTracks());
        document.getElementById('refreshVersionsBtn').addEventListener('click', () => this.detectVersions());
        
        // 轨道操作
        document.getElementById('backToVersionBtn').addEventListener('click', () => this.backToVersionSelect());
        document.getElementById('exportTracksBtn').addEventListener('click', () => this.exportTracks());
        
        // 分类切换
        document.getElementById('categoryTabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                this.switchCategory(e.target.dataset.type);
            }
        });
        
        // 搜索和过滤
        document.getElementById('searchInput').addEventListener('input', () => this.filterTracks());
        document.getElementById('seasonFilter').addEventListener('change', () => this.filterTracks());
        document.getElementById('typeFilter').addEventListener('change', () => this.filterTracks());
        
        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('trackModal').addEventListener('click', (e) => {
            if (e.target.id === 'trackModal') this.closeModal();
        });
        
        document.getElementById('closeLevelModal').addEventListener('click', () => this.closeLevelModal());
        document.getElementById('levelModal').addEventListener('click', (e) => {
            if (e.target.id === 'levelModal') this.closeLevelModal();
        });
        
        // ESC 键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeLevelModal();
            }
        });
    }
    
    async detectVersions() {
        console.log('🔍 开始检测版本');
        
        const detectionStatus = document.getElementById('detectionStatus');
        const dataPathInfo = document.getElementById('dataPathInfo');
        const versionSelector = document.getElementById('versionSelector');
        
        detectionStatus.textContent = '正在检测版本文件夹...';
        
        try {
            // 使用 fileAPI 检测版本
            if (window.fileAPI) {
                // 获取默认数据路径
                const defaultPathResult = await window.fileAPI.getDefaultDataPath();
                if (!defaultPathResult.success) {
                    throw new Error(defaultPathResult.error);
                }
                
                const scanPath = defaultPathResult.path;
                const result = await window.fileAPI.scanDirectories(scanPath);
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                // 过滤出版本目录（格式：x.x.x.x）
                this.availableVersions = result.directories
                    .filter(dir => /^\d+\.\d+\.\d+\.\d+$/.test(dir))
                    .sort();
                
                this.dataPath = scanPath;
            } else {
                throw new Error('fileAPI 未可用');
            }
            
            dataPathInfo.textContent = `数据路径: ${this.dataPath}`;
            
            if (this.availableVersions.length === 0) {
                detectionStatus.textContent = '❌ 未找到版本文件夹';
                return;
            }
            
            detectionStatus.textContent = `✅ 找到 ${this.availableVersions.length} 个版本`;
            
            // 填充版本选择器
            const versionSelect = document.getElementById('versionSelect');
            versionSelect.innerHTML = '<option value="">请选择版本</option>';
            
            this.availableVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                versionSelect.appendChild(option);
            });
            
            // 自动选择最新版本
            if (this.availableVersions.length > 0) {
                const latestVersion = this.availableVersions[this.availableVersions.length - 1];
                versionSelect.value = latestVersion;
                this.onVersionSelect();
            }
            
            versionSelector.style.display = 'block';
            
        } catch (error) {
            console.error('检测版本时出错:', error);
            detectionStatus.textContent = `❌ 检测失败: ${error.message}`;
            dataPathInfo.textContent = '';
        }
    }
    
    onVersionSelect() {
        const versionSelect = document.getElementById('versionSelect');
        const loadBtn = document.getElementById('loadRewardTracksBtn');
        const versionInfo = document.getElementById('versionInfo');
        
        if (versionSelect.value) {
            loadBtn.disabled = false;
            versionInfo.textContent = `已选择版本: ${versionSelect.value}`;
            versionInfo.style.color = '#27ae60';
        } else {
            loadBtn.disabled = true;
            versionInfo.textContent = '';
        }
    }
    
    async loadRewardTracks() {
        console.log('📥 开始加载奖励轨道');
        
        const versionSelect = document.getElementById('versionSelect');
        const selectedVersion = versionSelect.value;
        
        if (!selectedVersion) {
            alert('请选择版本');
            return;
        }
        
        // 显示加载进度
        this.showLoadingProgress();
        
        try {
            // 设置版本
            window.dataManager.setVersion(selectedVersion);
            
            // 1. 加载奖励轨道数据
            this.updateProgress(20, '正在加载奖励轨道数据...');
            const tracksData = await window.dataManager.loadFile('REWARD_TRACK', selectedVersion);
            
            // 2. 加载等级数据
            this.updateProgress(40, '正在加载等级数据...');
            const levelsData = await window.dataManager.loadFile('REWARD_TRACK_LEVEL', selectedVersion);
            
            // 3. 加载奖励列表数据
            this.updateProgress(70, '正在加载奖励列表数据...');
            const rewardListsData = await window.dataManager.loadFile('REWARD_LIST', selectedVersion);
            
            // 4. 处理数据
            this.updateProgress(85, '正在处理数据...');
            this.allTracks = tracksData.Records || [];
            this.allLevels = levelsData.Records || [];
            this.allRewardLists = rewardListsData.Records || [];
            
            // 关联轨道和等级数据
            this.processTrackData();
            
            this.updateProgress(100, '加载完成!');
            
            // 显示轨道列表
            setTimeout(() => {
                this.hideLoadingProgress();
                this.showTrackList();
            }, 500);
            
        } catch (error) {
            console.error('加载奖励轨道时出错:', error);
            this.hideLoadingProgress();
            alert(`加载失败: ${error.message}`);
        }
    }
    
    processTrackData() {
        // 为每个轨道添加等级信息
        this.allTracks.forEach(track => {
            track.levels = this.allLevels.filter(level => level.m_rewardTrackId === track.m_ID);
            track.levelCount = track.levels.length;
            track.maxLevel = Math.max(...track.levels.map(l => l.m_level), 0);
            track.totalXP = track.levels.reduce((sum, l) => sum + (l.m_xpNeeded || 0), 0);
        });
        
        // 按 ID 倒序排序
        this.allTracks.sort((a, b) => b.m_ID - a.m_ID);
        
        // 初始过滤
        this.filteredTracks = [...this.allTracks];
        this.populateFilters();
    }
    
    populateFilters() {
        // 填充赛季过滤器
        const seasonFilter = document.getElementById('seasonFilter');
        const seasons = [...new Set(this.allTracks.map(t => t.m_season).filter(s => s))].sort((a, b) => b - a);
        
        seasonFilter.innerHTML = '<option value="">全部赛季</option>';
        seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = `第 ${season} 赛季`;
            seasonFilter.appendChild(option);
        });
    }
    
    showLoadingProgress() {
        document.querySelector('.version-selection-section').style.display = 'none';
        document.getElementById('loadProgressSection').style.display = 'block';
    }
    
    hideLoadingProgress() {
        document.getElementById('loadProgressSection').style.display = 'none';
    }
    
    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = text;
    }
    
    showTrackList() {
        document.getElementById('trackListSection').style.display = 'block';
        this.updateTrackSummary();
        this.renderTrackList();
    }
    
    backToVersionSelect() {
        document.getElementById('trackListSection').style.display = 'none';
        document.querySelector('.version-selection-section').style.display = 'block';
        this.allTracks = [];
        this.allLevels = [];
        this.allRewardLists = [];
        this.filteredTracks = [];
    }
    
    updateTrackSummary() {
        const summaryElement = document.getElementById('trackSummary');
        const total = this.allTracks.length;
        const seasonTracks = this.allTracks.filter(t => t.m_rewardTrackType === 1).length;
        const eventTracks = this.allTracks.filter(t => t.m_rewardTrackType === 2).length;
        const totalLevels = this.allLevels.length;
        
        summaryElement.innerHTML = `
            <span>轨道总数: <strong>${total}</strong></span>
            <span>赛季轨道: <strong>${seasonTracks}</strong></span>
            <span>活动轨道: <strong>${eventTracks}</strong></span>
            <span>等级总数: <strong>${totalLevels}</strong></span>
        `;
    }
    
    switchCategory(type) {
        this.currentCategory = type;
        
        // 更新标签状态
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        this.filterTracks();
    }
    
    filterTracks() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const seasonFilter = document.getElementById('seasonFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        
        this.filteredTracks = this.allTracks.filter(track => {
            // 分类过滤
            if (this.currentCategory !== 'all') {
                const trackType = track.m_rewardTrackType.toString();
                if (this.currentCategory !== trackType) return false;
            }
            
            // 搜索过滤
            if (searchTerm) {
                const name = this.getTrackName(track).toLowerCase();
                const id = track.m_ID.toString();
                if (!name.includes(searchTerm) && !id.includes(searchTerm)) return false;
            }
            
            // 赛季过滤
            if (seasonFilter && track.m_season != seasonFilter) return false;
            
            // 类型过滤
            if (typeFilter && track.m_rewardTrackType != typeFilter) return false;
            
            return true;
        });
        
        this.renderTrackList();
    }
    
    getTrackName(track) {
        if (track.m_name && track.m_name.m_locValues && track.m_name.m_locValues.length > 0) {
            // 优先选择中文名称（通常在索引12或13）
            return track.m_name.m_locValues[12] || track.m_name.m_locValues[13] || track.m_name.m_locValues[0] || '未知轨道';
        }
        return `轨道 ${track.m_ID}`;
    }
    
    getRewardList(rewardListId) {
        return this.allRewardLists.find(list => list.m_ID === rewardListId);
    }
    
    renderTrackList() {
        const listElement = document.getElementById('trackList');
        
        if (this.filteredTracks.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎁</div>
                    <div class="empty-state-text">没有找到匹配的奖励轨道</div>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = this.filteredTracks.map(track => this.createTrackCard(track)).join('');
        
        // 添加点击事件
        listElement.querySelectorAll('.track-item').forEach(item => {
            item.addEventListener('click', () => {
                const trackId = parseInt(item.dataset.trackId);
                this.showTrackDetails(trackId);
            });
        });
    }
    
    createTrackCard(track) {
        const trackTypeInfo = this.trackTypes[track.m_rewardTrackType] || this.trackTypes[0];
        const name = this.getTrackName(track);
        
        return `
            <div class="track-item" data-track-id="${track.m_ID}">
                <div class="track-item-header">
                    <div class="track-id">${track.m_ID}</div>
                    <div class="track-type ${trackTypeInfo.category}">${trackTypeInfo.name}</div>
                </div>
                <div class="track-name">${name}</div>
                <div class="track-info">
                    <div class="track-detail">
                        <span class="track-detail-label">赛季:</span>
                        <span class="track-detail-value">${track.m_season || '未知'}</span>
                    </div>
                    <div class="track-detail">
                        <span class="track-detail-label">版本:</span>
                        <span class="track-detail-value">${track.m_version || 1}</span>
                    </div>
                    <div class="track-detail">
                        <span class="track-detail-label">等级上限:</span>
                        <span class="track-detail-value">${track.m_levelCapSoft || track.maxLevel || 0}</span>
                    </div>
                </div>
                <div class="track-levels-preview">
                    <div class="levels-bar">
                        <div class="levels-progress">
                            <div class="levels-fill" style="width: ${track.levelCount > 0 ? 100 : 0}%"></div>
                        </div>
                        <div class="levels-text">${track.levelCount} 等级</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    showTrackDetails(trackId) {
        const track = this.allTracks.find(t => t.m_ID === trackId);
        if (!track) return;
        
        const modal = document.getElementById('trackModal');
        const modalName = document.getElementById('modalTrackName');
        const modalDetails = document.getElementById('trackDetails');
        
        modalName.textContent = this.getTrackName(track);
        
        const trackTypeInfo = this.trackTypes[track.m_rewardTrackType] || this.trackTypes[0];
        
        modalDetails.innerHTML = `
            <div class="track-detail-grid">
                <div class="track-detail-item">
                    <div class="track-detail-item-label">轨道 ID</div>
                    <div class="track-detail-item-value">${track.m_ID}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">类型</div>
                    <div class="track-detail-item-value">${trackTypeInfo.name}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">赛季</div>
                    <div class="track-detail-item-value">${track.m_season || '未知'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">版本</div>
                    <div class="track-detail-item-value">${track.m_version}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">活动 ID</div>
                    <div class="track-detail-item-value">${track.m_event || '无'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">账户许可 ID</div>
                    <div class="track-detail-item-value">${track.m_accountLicenseId || '无'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">通行证产品 ID</div>
                    <div class="track-detail-item-value">${track.m_seasonPassProductId || '无'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">等级上限</div>
                    <div class="track-detail-item-value">${track.m_levelCapSoft || '无限制'}</div>
                </div>
            </div>
            
            ${track.levels && track.levels.length > 0 ? `
                <div class="levels-section">
                    <h4>🎯 等级列表 (${track.levels.length} 个等级)</h4>
                    <div class="levels-list">
                        ${track.levels.map(level => this.createLevelCard(level)).join('')}
                    </div>
                </div>
            ` : '<p style="text-align: center; color: #999; margin-top: 20px;">暂无等级数据</p>'}
        `;
        
        // 添加等级卡片点击事件
        modalDetails.querySelectorAll('.level-item').forEach(item => {
            item.addEventListener('click', () => {
                const levelId = parseInt(item.dataset.levelId);
                this.showLevelDetails(levelId);
            });
        });
        
        // 添加奖励链接点击事件
        modalDetails.querySelectorAll('.reward-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const rewardId = parseInt(link.dataset.rewardId);
                this.showRewardDetails(rewardId);
            });
        });
        
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    
    createLevelCard(level) {
        return `
            <div class="level-item" data-level-id="${level.m_ID}">
                <div class="level-header">
                    <div class="level-number">等级 ${level.m_level}</div>
                    <div class="level-xp">${level.m_xpNeeded || 0} XP</div>
                </div>
                <div class="level-rewards">
                    ${level.m_freeRewardListId ? `
                        <div class="reward-type reward-free">
                            <span class="reward-icon">🎁</span>
                            <span>免费奖励: <span class="reward-link" data-reward-id="${level.m_freeRewardListId}">${level.m_freeRewardListId}</span></span>
                        </div>
                    ` : ''}
                    ${level.m_paidRewardListId ? `
                        <div class="reward-type reward-paid">
                            <span class="reward-icon">💎</span>
                            <span>付费奖励: <span class="reward-link" data-reward-id="${level.m_paidRewardListId}">${level.m_paidRewardListId}</span></span>
                        </div>
                    ` : ''}
                    ${level.m_paidPremiumRewardListId ? `
                        <div class="reward-type reward-premium">
                            <span class="reward-icon">👑</span>
                            <span>高级奖励: <span class="reward-link" data-reward-id="${level.m_paidPremiumRewardListId}">${level.m_paidPremiumRewardListId}</span></span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    showLevelDetails(levelId) {
        const level = this.allLevels.find(l => l.m_ID === levelId);
        if (!level) return;
        
        const modal = document.getElementById('levelModal');
        const modalTitle = document.getElementById('modalLevelTitle');
        const modalDetails = document.getElementById('levelDetails');
        
        modalTitle.textContent = `等级 ${level.m_level} 详情`;
        
        modalDetails.innerHTML = `
            <div class="track-detail-grid">
                <div class="track-detail-item">
                    <div class="track-detail-item-label">等级 ID</div>
                    <div class="track-detail-item-value">${level.m_ID}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">轨道 ID</div>
                    <div class="track-detail-item-value">${level.m_rewardTrackId}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">等级</div>
                    <div class="track-detail-item-value">${level.m_level}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">所需经验</div>
                    <div class="track-detail-item-value">${level.m_xpNeeded || 0} XP</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">样式名称</div>
                    <div class="track-detail-item-value">${level.m_styleName || '无'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">免费奖励列表 ID</div>
                    <div class="track-detail-item-value">${level.m_freeRewardListId || '无'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">付费奖励列表 ID</div>
                    <div class="track-detail-item-value">${level.m_paidRewardListId || '无'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">高级奖励列表 ID</div>
                    <div class="track-detail-item-value">${level.m_paidPremiumRewardListId || '无'}</div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    
    closeModal() {
        const modal = document.getElementById('trackModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    closeLevelModal() {
        const modal = document.getElementById('levelModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    showRewardDetails(rewardId) {
        const rewardList = this.getRewardList(rewardId);
        if (!rewardList) {
            alert(`未找到奖励列表 ID: ${rewardId}`);
            return;
        }
        
        // 创建临时模态框显示奖励详情
        const existingModal = document.getElementById('rewardModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'rewardModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>奖励列表详情 - ID: ${rewardId}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">✖️</button>
                </div>
                <div class="modal-body">
                    ${this.generateRewardDetails(rewardList)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // ESC键关闭
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        });
    }
    
    generateRewardDetails(rewardList) {
        const description = this.getRewardDescription(rewardList);
        
        let html = `
            <div class="track-detail-grid">
                <div class="track-detail-item">
                    <div class="track-detail-item-label">奖励列表 ID</div>
                    <div class="track-detail-item-value">${rewardList.m_ID}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">奖励类型</div>
                    <div class="track-detail-item-value">${rewardList.m_random ? '随机奖励' : '固定奖励'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">选择模式</div>
                    <div class="track-detail-item-value">${rewardList.m_chooseOne ? '选择其一' : '全部获得'}</div>
                </div>
                <div class="track-detail-item">
                    <div class="track-detail-item-label">是否锁定</div>
                    <div class="track-detail-item-value">${rewardList.m_locked ? '是' : '否'}</div>
                </div>
        `;
        
        // 显示备用奖励列表
        if (rewardList.m_fallbackRewardListId && rewardList.m_fallbackRewardListId > 0) {
            html += `
                <div class="track-detail-item">
                    <div class="track-detail-item-label">备用奖励列表 ID</div>
                    <div class="track-detail-item-value">
                        <span class="reward-link" onclick="window.rewardTrackSystem.showRewardDetails(${rewardList.m_fallbackRewardListId})">${rewardList.m_fallbackRewardListId}</span>
                    </div>
                </div>
            `;
        }
        
        // 显示退出奖励列表
        if (rewardList.m_exitRewardListId && rewardList.m_exitRewardListId > 0) {
            html += `
                <div class="track-detail-item">
                    <div class="track-detail-item-label">退出奖励列表 ID</div>
                    <div class="track-detail-item-value">
                        <span class="reward-link" onclick="window.rewardTrackSystem.showRewardDetails(${rewardList.m_exitRewardListId})">${rewardList.m_exitRewardListId}</span>
                    </div>
                </div>
            `;
        }
        
        // 显示奖励描述
        if (description) {
            html += `
                <div class="track-detail-item" style="grid-column: 1 / -1;">
                    <div class="track-detail-item-label">奖励描述</div>
                    <div class="reward-description">${description}</div>
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }
    
    getRewardDescription(rewardList) {
        if (rewardList.m_description && rewardList.m_description.m_locValues && rewardList.m_description.m_locValues.length > 0) {
            // 优先选择中文描述（通常在索引12或13）
            return rewardList.m_description.m_locValues[12] || rewardList.m_description.m_locValues[13] || rewardList.m_description.m_locValues[0] || '无描述';
        }
        return '无描述';
    }
    
    async exportTracks() {
        try {
            const dataToExport = {
                tracks: this.filteredTracks,
                levels: this.allLevels,
                exportTime: new Date().toISOString(),
                totalTracks: this.filteredTracks.length,
                totalLevels: this.allLevels.length
            };
            
            // 使用文件对话框让用户选择保存位置
            const saveOptions = {
                title: '导出奖励轨道数据',
                defaultPath: `reward-tracks-${new Date().toISOString().split('T')[0]}.json`,
                filters: [
                    { name: 'JSON文件', extensions: ['json'] }
                ]
            };
            
            const saveResult = await window.fileAPI.showSaveDialog(saveOptions);
            
            if (!saveResult.canceled) {
                const writeResult = await window.fileAPI.writeFile(saveResult.filePath, JSON.stringify(dataToExport, null, 2));
                
                if (writeResult.success) {
                    alert(`导出成功！文件已保存到: ${saveResult.filePath}`);
                } else {
                    alert(`导出失败: ${writeResult.error}`);
                }
            }
        } catch (error) {
            console.error('导出奖励轨道时出错:', error);
            alert(`导出失败: ${error.message}`);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new RewardTrackSystem();
});