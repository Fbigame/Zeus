// 卡牌详情模态框组件
// 可在多个页面复用的卡牌详情显示组件

class CardDetailModal {
    constructor() {
        this.currentCardData = null;
        // 全局缓存数据，避免重复加载
        this.cachedVersion = null;
        this.cachedCards = null;
        this.cachedCardTags = null;
        this.createModal();
    }
    
    // 创建模态框DOM
    createModal() {
        if (document.getElementById('cardDetailModal')) {
            return; // 已存在
        }
        
        const modalHTML = `
            <div id="cardDetailModal" class="card-detail-modal" style="display: none;">
                <div class="card-detail-modal-content">
                    <div class="card-detail-modal-header">
                        <h3 id="cardDetailModalTitle">卡牌详情</h3>
                        <button id="closeCardDetailModal" class="close-btn">✖️</button>
                    </div>
                    <div class="card-detail-modal-body" id="cardDetailModalBody">
                        <!-- 详情内容将动态生成 -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 绑定关闭事件
        document.getElementById('closeCardDetailModal').addEventListener('click', () => this.close());
        document.getElementById('cardDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'cardDetailModal') this.close();
        });
    }
    
    // 显示卡牌详情
    async show(cardId, version = null) {
        if (!cardId) return;
        
        try {
            // 加载卡牌数据
            const cardData = await this.loadCardData(cardId, version);
            if (!cardData) {
                alert('无法加载卡牌数据');
                return;
            }
            
            this.currentCardData = cardData;
            this.renderCardDetails();
            document.getElementById('cardDetailModal').style.display = 'block';
        } catch (error) {
            console.error('显示卡牌详情失败:', error);
            alert('显示卡牌详情失败: ' + error.message);
        }
    }
    
    // 加载卡牌数据
    async loadCardData(cardId, version) {
        // 如果没有指定版本，尝试从当前系统获取
        if (!version) {
            // 尝试从 cardViewer 获取
            if (window.cardViewer && window.cardViewer.currentVersion) {
                version = window.cardViewer.currentVersion;
                console.log(`📍 从 cardViewer 获取版本: ${version}`);
            }
            // 尝试从 deckSystem 获取
            else if (document.getElementById('versionSelect')) {
                const versionSelect = document.getElementById('versionSelect').value;
                if (versionSelect && versionSelect.trim()) {
                    version = versionSelect;
                    console.log(`📍 从 versionSelect 获取版本: ${version}`);
                }
            }
            // 尝试从 dataManager 获取当前版本
            if (!version && window.dataManager) {
                const dmVersion = window.dataManager.getVersion();
                if (dmVersion) {
                    version = dmVersion;
                    console.log(`📍 从 dataManager 获取版本: ${version}`);
                }
            }
        }
        
        if (!version || version === 'undefined' || version === '') {
            console.error('❌ 无法确定数据版本');
            console.error('调试信息:', {
                cardViewer: window.cardViewer?.currentVersion,
                versionSelect: document.getElementById('versionSelect')?.value,
                dataManager: window.dataManager?.getVersion()
            });
            throw new Error('无法确定数据版本，请先选择版本');
        }
        
        console.log(`📦 加载卡牌数据 (卡牌ID: ${cardId}, 版本: ${version})`);
        
        // 使用全局数据管理器加载数据
        window.dataManager.setVersion(version);
        
        // 加载数据
        const [cardData, tagData] = await Promise.all([
            window.dataManager.loadFile('CARD', version),
            window.dataManager.loadFile('CARD_TAG', version)
        ]);
        
        const cards = cardData.Records || [];
        const tags = tagData.Records || [];
        
        // 查找卡牌
        const card = cards.find(c => (c.m_ID || c.ID) === cardId);
        
        if (!card) {
            throw new Error('未找到卡牌数据');
        }
        
        // 构建卡牌标签映射
        const cardTags = {};
        tags.forEach(tag => {
            const cId = tag.m_cardId || tag.cardId;
            const tagId = tag.m_tagId || tag.tagId;
            const tagValue = tag.m_tagValue || tag.tagValue;
            if (cId === cardId) {
                cardTags[tagId] = tagValue;
            }
        });
        
        return {
            id: card.m_ID || card.ID,
            cardId: card.m_noteMiniGuid || '',
            name: this.extractLocalizedText(card.m_name) || `卡牌 ${cardId}`,
            text: this.extractLocalizedText(card.m_textInHand),
            flavorText: this.extractLocalizedText(card.m_flavorText),
            cardSetId: card.m_cardSetId || card.cardSetId || 0,
            artistName: card.m_artistName || card.artistName || '',
            tags: cardTags,
            rawData: card
        };
    }
    
    // 提取本地化文本
    extractLocalizedText(locData) {
        if (!locData || !locData.m_locValues || !Array.isArray(locData.m_locValues)) {
            return '';
        }
        if (locData.m_locValues[12]) return locData.m_locValues[12];
        if (locData.m_locValues[13]) return locData.m_locValues[13];
        if (locData.m_locValues[0]) return locData.m_locValues[0];
        return locData.m_locValues.find(val => val && val.trim()) || '';
    }
    
    // 渲染卡牌详情
    renderCardDetails() {
        const card = this.currentCardData;
        document.getElementById('cardDetailModalTitle').textContent = card.name;
        
        const cost = card.tags[48] || 0;
        const attack = card.tags[47] || 0;
        const health = card.tags[45] || 0;
        const durability = card.tags[187] || 0;
        const armor = card.tags[292] || 0;
        const typeInfo = window.getTagValue ? window.getTagValue(202, card.tags[202]) : { displayName: `类型${card.tags[202]}` };
        const rarityInfo = window.getTagValue ? window.getTagValue(203, card.tags[203]) : { displayName: `稀有度${card.tags[203]}` };
        const classInfo = card.tags[199] && window.getTagValue ? window.getTagValue(199, card.tags[199]) : { displayName: '未知' };
        const raceInfo = card.tags[200] && window.getTagValue ? window.getTagValue(200, card.tags[200]) : null;
        const spellSchoolInfo = card.tags[1635] && window.getTagValue ? window.getTagValue(1635, card.tags[1635]) : null;
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
        
        document.getElementById('cardDetailModalBody').innerHTML = html;
    }
    
    // 关闭模态框
    close() {
        document.getElementById('cardDetailModal').style.display = 'none';
        this.currentCardData = null;
    }
    
    // 清除缓存（用于切换版本时）
    clearCache() {
        console.log('清除卡牌数据缓存');
        this.cachedVersion = null;
        this.cachedCards = null;
        this.cachedCardTags = null;
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.cardDetailModal = new CardDetailModal();
}
