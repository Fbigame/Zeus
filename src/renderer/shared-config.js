// 全局共享配置
// 用于管理各功能模块使用的数据文件，避免在数据查看器中重复显示

const SharedDataConfig = {
    // 已被功能模块使用的文件列表
    usedFiles: new Set(),
    
    // 注册已使用的文件
    registerUsedFiles: function(fileNames) {
        if (Array.isArray(fileNames)) {
            fileNames.forEach(file => this.usedFiles.add(file));
        } else {
            this.usedFiles.add(fileNames);
        }
        console.log('📝 已注册使用的文件:', Array.from(this.usedFiles));
    },
    
    // 获取已使用的文件列表
    getUsedFiles: function() {
        return Array.from(this.usedFiles);
    },
    
    // 检查文件是否已被使用
    isFileUsed: function(fileName) {
        return this.usedFiles.has(fileName);
    },
    
    // 清空已使用文件列表（用于测试或重置）
    clearUsedFiles: function() {
        this.usedFiles.clear();
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.SharedDataConfig = SharedDataConfig;
}
