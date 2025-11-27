// 全局数据管理器
// 统一管理所有 JSON 数据的加载和缓存

class DataManager {
    constructor() {
        // 当前版本
        this.currentVersion = null;
        
        // 数据缓存
        this.cache = {
            CARD: null,              // 卡牌数据
            CARD_TAG: null,          // 卡牌标签数据
            DECK_TEMPLATE: null,     // 套牌模板数据
            DECK: null,              // 套牌数据
            DECK_CARD: null,         // 套牌卡牌数据
            CLASS: null,             // 职业数据
            SIDEBOARD_CARD: null,    // 备牌数据
            CARD_SET_TIMING: null,   // 卡牌集时间数据
            EventMap: null,          // 事件映射数据
            DECK_RULESET: null,      // 套牌规则集数据
            DECK_RULESET_RULE: null, // 套牌规则集规则数据
            DECK_RULESET_RULE_SUBSET: null, // 套牌规则集规则子集数据
            SUBSET: null,            // 子集数据
            SUBSET_RULE: null        // 子集规则数据
        };
        
        // 加载状态
        this.loadingPromises = {};
        
        console.log('📦 DataManager 初始化完成');
    }
    
    /**
     * 设置当前版本
     * @param {string} version - 版本号
     */
    setVersion(version) {
        if (this.currentVersion !== version) {
            console.log(`🔄 切换版本: ${this.currentVersion} -> ${version}`);
            this.currentVersion = version;
            this.clearCache();
        }
    }
    
    /**
     * 获取当前版本
     * @returns {string|null} 当前版本号
     */
    getVersion() {
        return this.currentVersion;
    }
    
    /**
     * 清除所有缓存
     */
    clearCache() {
        console.log('🗑️ 清除所有数据缓存');
        Object.keys(this.cache).forEach(key => {
            this.cache[key] = null;
        });
        this.loadingPromises = {};
    }
    
    /**
     * 清除特定文件的缓存
     * @param {string} fileName - 文件名
     */
    clearFileCache(fileName) {
        console.log(`🗑️ 清除缓存: ${fileName}`);
        this.cache[fileName] = null;
        delete this.loadingPromises[fileName];
    }
    
    /**
     * 加载 JSON 文件
     * @param {string} fileName - 文件名（不含路径和扩展名）
     * @param {string} version - 版本号（可选，默认使用当前版本）
     * @returns {Promise<Object>} 文件数据
     */
    async loadFile(fileName, version = null) {
        // 使用指定版本或当前版本
        const targetVersion = version || this.currentVersion;
        
        if (!targetVersion) {
            throw new Error('未设置数据版本，请先调用 setVersion()');
        }
        
        // 如果版本不同，清除缓存
        if (version && version !== this.currentVersion) {
            this.setVersion(version);
        }
        
        // 如果已有缓存，直接返回
        if (this.cache[fileName]) {
            console.log(`✅ 使用缓存: ${fileName}`);
            return this.cache[fileName];
        }
        
        // 如果正在加载，返回加载中的 Promise
        if (this.loadingPromises[fileName]) {
            console.log(`⏳ 等待加载: ${fileName}`);
            return this.loadingPromises[fileName];
        }
        
        // 开始加载
        console.log(`📥 加载文件: ${fileName} (版本: ${targetVersion})`);
        
        const loadPromise = this._loadFileFromDisk(fileName, targetVersion);
        this.loadingPromises[fileName] = loadPromise;
        
        try {
            const data = await loadPromise;
            this.cache[fileName] = data;
            delete this.loadingPromises[fileName];
            console.log(`✅ 加载完成: ${fileName} (${data.Records?.length || 0} 条记录)`);
            return data;
        } catch (error) {
            delete this.loadingPromises[fileName];
            console.error(`❌ 加载失败: ${fileName}`, error);
            throw error;
        }
    }
    
    /**
     * 从磁盘加载文件
     * @private
     */
    async _loadFileFromDisk(fileName, version) {
        const filePath = `data/${version}/${fileName}.json`;
        const result = await window.fileAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(`无法读取文件: ${fileName}.json - ${result.error}`);
        }
        
        return JSON.parse(result.data);
    }
    
    /**
     * 批量加载多个文件
     * @param {string[]} fileNames - 文件名数组
     * @param {string} version - 版本号（可选）
     * @returns {Promise<Object>} 文件名到数据的映射
     */
    async loadFiles(fileNames, version = null) {
        console.log(`📥 批量加载 ${fileNames.length} 个文件`);
        
        const promises = fileNames.map(fileName => 
            this.loadFile(fileName, version).then(data => ({ fileName, data }))
        );
        
        const results = await Promise.all(promises);
        
        const dataMap = {};
        results.forEach(({ fileName, data }) => {
            dataMap[fileName] = data;
        });
        
        return dataMap;
    }
    
    /**
     * 获取缓存的数据（不加载）
     * @param {string} fileName - 文件名
     * @returns {Object|null} 缓存的数据或 null
     */
    getCached(fileName) {
        return this.cache[fileName];
    }
    
    /**
     * 检查文件是否已缓存
     * @param {string} fileName - 文件名
     * @returns {boolean} 是否已缓存
     */
    isCached(fileName) {
        return this.cache[fileName] !== null;
    }
    
    /**
     * 预加载常用文件
     * @param {string} version - 版本号
     * @returns {Promise<void>}
     */
    async preloadCommonFiles(version = null) {
        const commonFiles = ['CARD', 'CARD_TAG', 'CLASS'];
        console.log(`🚀 预加载常用文件: ${commonFiles.join(', ')}`);
        
        try {
            await this.loadFiles(commonFiles, version);
            console.log('✅ 预加载完成');
        } catch (error) {
            console.error('❌ 预加载失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getCacheStats() {
        const cached = Object.keys(this.cache).filter(key => this.cache[key] !== null);
        const loading = Object.keys(this.loadingPromises);
        
        return {
            version: this.currentVersion,
            cached: cached,
            cachedCount: cached.length,
            loading: loading,
            loadingCount: loading.length,
            totalSlots: Object.keys(this.cache).length
        };
    }
    
    /**
     * 打印缓存状态
     */
    printCacheStats() {
        const stats = this.getCacheStats();
        console.log('📊 缓存统计:');
        console.log(`  版本: ${stats.version || '未设置'}`);
        console.log(`  已缓存: ${stats.cachedCount}/${stats.totalSlots} 个文件`);
        console.log(`  加载中: ${stats.loadingCount} 个文件`);
        if (stats.cached.length > 0) {
            console.log(`  已缓存文件: ${stats.cached.join(', ')}`);
        }
        if (stats.loading.length > 0) {
            console.log(`  加载中文件: ${stats.loading.join(', ')}`);
        }
    }
}

// 创建全局单例
if (typeof window !== 'undefined') {
    window.dataManager = new DataManager();
    console.log('✅ 全局 DataManager 已创建');
}
