// 全局数据管理器
// 统一管理所有 JSON 数据的加载和缓存

class DataManager {
    constructor() {
        // 当前版本
        this.currentVersion = null;
        
        // 多版本数据缓存：{ 'version:fileName': data }
        // 例如：{ '34.0.2.231191:CARD': {...}, '34.0.0.220000:CARD': {...} }
        this.cache = new Map();
        
        // 加载状态：{ 'version:fileName': Promise }
        this.loadingPromises = new Map();
        
        console.log('📦 DataManager 初始化完成 (多版本缓存模式)');
    }
    
    /**
     * 设置当前版本
     * @param {string} version - 版本号
     */
    setVersion(version) {
        if (this.currentVersion !== version) {
            console.log(`🔄 切换版本: ${this.currentVersion} -> ${version}`);
            this.currentVersion = version;
            // 不再清除缓存，保留所有版本的数据
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
     * 生成缓存 key
     * @private
     */
    _getCacheKey(fileName, version) {
        return `${version}:${fileName}`;
    }
    
    /**
     * 清除所有缓存
     */
    clearCache() {
        console.log('🗑️ 清除所有数据缓存');
        this.cache.clear();
        this.loadingPromises.clear();
    }
    
    /**
     * 清除特定版本的所有缓存
     * @param {string} version - 版本号
     */
    clearVersionCache(version) {
        console.log(`🗑️ 清除版本缓存: ${version}`);
        const keysToDelete = [];
        
        // 查找该版本的所有缓存
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${version}:`)) {
                keysToDelete.push(key);
            }
        }
        
        // 删除缓存
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.loadingPromises.delete(key);
        });
        
        console.log(`✅ 已清除 ${keysToDelete.length} 个缓存项`);
    }
    
    /**
     * 清除特定文件的缓存（所有版本）
     * @param {string} fileName - 文件名
     */
    clearFileCache(fileName) {
        console.log(`🗑️ 清除文件缓存: ${fileName}`);
        const keysToDelete = [];
        
        // 查找该文件的所有版本缓存
        for (const key of this.cache.keys()) {
            if (key.endsWith(`:${fileName}`)) {
                keysToDelete.push(key);
            }
        }
        
        // 删除缓存
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.loadingPromises.delete(key);
        });
        
        console.log(`✅ 已清除 ${keysToDelete.length} 个缓存项`);
    }
    
    /**
     * 清除特定版本的特定文件缓存
     * @param {string} fileName - 文件名
     * @param {string} version - 版本号
     */
    clearSpecificCache(fileName, version) {
        const key = this._getCacheKey(fileName, version);
        console.log(`🗑️ 清除缓存: ${key}`);
        this.cache.delete(key);
        this.loadingPromises.delete(key);
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
        
        const cacheKey = this._getCacheKey(fileName, targetVersion);
        
        // 如果已有缓存，直接返回
        if (this.cache.has(cacheKey)) {
            console.log(`✅ 使用缓存: ${cacheKey}`);
            return this.cache.get(cacheKey);
        }
        
        // 如果正在加载，返回加载中的 Promise
        if (this.loadingPromises.has(cacheKey)) {
            console.log(`⏳ 等待加载: ${cacheKey}`);
            return this.loadingPromises.get(cacheKey);
        }
        
        // 开始加载
        console.log(`📥 加载文件: ${cacheKey}`);
        
        const loadPromise = this._loadFileFromDisk(fileName, targetVersion, cacheKey);
        this.loadingPromises.set(cacheKey, loadPromise);
        
        try {
            const data = await loadPromise;
            this.cache.set(cacheKey, data);
            this.loadingPromises.delete(cacheKey);
            console.log(`✅ 加载完成: ${cacheKey} (${data.Records?.length || Object.keys(data || {}).length} 项)`);
            return data;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            console.error(`❌ 加载失败: ${cacheKey}`, error);
            throw error;
        }
    }
    
    /**
     * 从磁盘加载文件
     * @private
     */
    async _loadFileFromDisk(fileName, version, cacheKey) {
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
     * @param {string} version - 版本号（可选，默认使用当前版本）
     * @returns {Object|null} 缓存的数据或 null
     */
    getCached(fileName, version = null) {
        const targetVersion = version || this.currentVersion;
        if (!targetVersion) return null;
        
        const cacheKey = this._getCacheKey(fileName, targetVersion);
        return this.cache.get(cacheKey) || null;
    }
    
    /**
     * 检查文件是否已缓存
     * @param {string} fileName - 文件名
     * @param {string} version - 版本号（可选，默认使用当前版本）
     * @returns {boolean} 是否已缓存
     */
    isCached(fileName, version = null) {
        const targetVersion = version || this.currentVersion;
        if (!targetVersion) return false;
        
        const cacheKey = this._getCacheKey(fileName, targetVersion);
        return this.cache.has(cacheKey);
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
        // 统计缓存信息
        const versionMap = new Map(); // version -> files[]
        const cached = [];
        
        for (const key of this.cache.keys()) {
            const [version, fileName] = key.split(':');
            cached.push(key);
            
            if (!versionMap.has(version)) {
                versionMap.set(version, []);
            }
            versionMap.get(version).push(fileName);
        }
        
        // 统计加载中的文件
        const loading = Array.from(this.loadingPromises.keys());
        
        // 按版本分组统计
        const versionStats = {};
        for (const [version, files] of versionMap.entries()) {
            versionStats[version] = {
                fileCount: files.length,
                files: files
            };
        }
        
        return {
            currentVersion: this.currentVersion,
            totalCached: cached.length,
            totalLoading: loading.length,
            cachedKeys: cached,
            loadingKeys: loading,
            versions: Object.keys(versionStats),
            versionCount: versionStats.length || Object.keys(versionStats).length,
            byVersion: versionStats
        };
    }
    
    /**
     * 打印缓存状态
     */
    printCacheStats() {
        const stats = this.getCacheStats();
        console.log('📊 数据缓存统计:');
        console.log(`  当前版本: ${stats.currentVersion || '未设置'}`);
        console.log(`  已缓存: ${stats.totalCached} 项`);
        console.log(`  加载中: ${stats.totalLoading} 项`);
        console.log(`  版本数: ${stats.versionCount}`);
        
        if (Object.keys(stats.byVersion).length > 0) {
            console.log('\n  按版本统计:');
            for (const [version, info] of Object.entries(stats.byVersion)) {
                console.log(`    ${version}: ${info.fileCount} 个文件 (${info.files.join(', ')})`);
            }
        }
        
        if (stats.totalLoading > 0) {
            console.log(`\n  加载中: ${stats.loadingKeys.join(', ')}`);
        }
    }
}

// 创建全局单例
if (typeof window !== 'undefined') {
    window.dataManager = new DataManager();
    console.log('✅ 全局 DataManager 已创建');
}
