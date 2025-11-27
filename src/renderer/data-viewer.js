// 炉石传说数据查看器系统
class DataViewerSystem {
    constructor() {
        this.availableVersions = [];
        this.availableFiles = [];
        this.currentData = null;
        this.filteredData = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.currentView = 'table'; // 'table' or 'json'
        this.searchColumn = ''; // 空字符串表示搜索所有字段
        
        this.init();
    }
    
    async init() {
        console.log('🚀 DataViewerSystem 初始化开始');
        this.setupEventListeners();
        await this.detectVersions();
        console.log('✅ DataViewerSystem 初始化完成');
    }
    
    setupEventListeners() {
        // 返回首页
        document.getElementById('backToIndexBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 版本和文件选择
        document.getElementById('versionSelect').addEventListener('change', () => this.onVersionSelect());
        document.getElementById('fileSelect').addEventListener('change', () => this.onFileSelect());
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadData());
        document.getElementById('refreshBtn').addEventListener('click', () => this.detectVersions());
        document.getElementById('hideUsedFilesCheckbox').addEventListener('change', () => this.onVersionSelect());
        
        // 数据操作
        document.getElementById('backToSelectBtn').addEventListener('click', () => this.backToSelect());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('toggleViewBtn').addEventListener('click', () => this.toggleView());
        
        // 搜索和过滤
        document.getElementById('searchInput').addEventListener('input', () => this.filterData());
        document.getElementById('columnSelect').addEventListener('change', () => this.filterData());
        
        // 分页
        document.getElementById('prevPageBtn').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable();
        });
        
        // 模态框
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') this.closeModal();
        });
    }
    
    // 检测版本
    async detectVersions() {
        try {
            let scanPath = './data';
            if (window.fileAPI) {
                const defaultPathResult = await window.fileAPI.getDefaultDataPath();
                if (defaultPathResult.success) {
                    scanPath = defaultPathResult.path;
                }
                
                const result = await window.fileAPI.scanDirectories(scanPath);
                if (result.success) {
                    this.availableVersions = result.directories.filter(dir => 
                        /^\d+(\.\d+)*$/.test(dir)
                    ).sort((a, b) => this.compareVersions(b, a));
                }
            }
            
            this.populateVersionSelector();
            if (this.availableVersions.length > 0) {
                document.getElementById('versionSelect').value = this.availableVersions[0];
                await this.onVersionSelect();
            }
        } catch (error) {
            console.error('版本检测失败:', error);
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
    
    async onVersionSelect() {
        const version = document.getElementById('versionSelect').value;
        const fileSelect = document.getElementById('fileSelect');
        const loadBtn = document.getElementById('loadDataBtn');
        
        if (!version) {
            fileSelect.disabled = true;
            fileSelect.innerHTML = '<option value="">请先选择版本</option>';
            loadBtn.disabled = true;
            return;
        }
        
        // 从全局配置读取已在其他功能中使用的文件列表
        const excludedFiles = window.SharedDataConfig ? window.SharedDataConfig.getUsedFiles() : [];
        const hideUsedFiles = document.getElementById('hideUsedFilesCheckbox').checked;
        
        // 动态扫描版本目录获取所有JSON文件
        let allFiles = [];
        try {
            if (window.fileAPI) {
                const scanPath = `data/${version}`;
                const result = await window.fileAPI.scanFiles(scanPath, '.json');
                
                if (result.success) {
                    // 从文件名中提取不带扩展名的部分
                    allFiles = result.files
                        .filter(file => file.endsWith('.json'))
                        .map(file => file.replace('.json', ''))
                        .sort();
                    
                    console.log(`📁 扫描到 ${allFiles.length} 个JSON文件`);
                } else {
                    console.error('文件扫描失败:', result.error);
                }
            }
        } catch (error) {
            console.error('扫描文件时出错:', error);
        }
        
        // 根据勾选框状态决定是否过滤掉已使用的文件
        this.availableFiles = hideUsedFiles 
            ? allFiles.filter(file => !excludedFiles.includes(file))
            : allFiles;
        
        fileSelect.innerHTML = '<option value="">请选择数据文件</option>';
        this.availableFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file;
            fileSelect.appendChild(option);
        });
        
        fileSelect.disabled = false;
        
        // 显示提示信息
        const infoText = hideUsedFiles 
            ? `可用文件数: ${this.availableFiles.length} (已隐藏 ${excludedFiles.length} 个已使用的文件)`
            : `可用文件数: ${this.availableFiles.length} (共 ${excludedFiles.length} 个已使用的文件)`;
        if (!document.getElementById('fileCountInfo')) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'fileCountInfo';
            infoDiv.style.cssText = 'margin-top: 8px; font-size: 12px; color: #6c757d;';
            infoDiv.textContent = infoText;
            fileSelect.parentElement.appendChild(infoDiv);
        } else {
            document.getElementById('fileCountInfo').textContent = infoText;
        }
    }
    
    onFileSelect() {
        const file = document.getElementById('fileSelect').value;
        const loadBtn = document.getElementById('loadDataBtn');
        loadBtn.disabled = !file;
    }
    
    async loadData() {
        const version = document.getElementById('versionSelect').value;
        const file = document.getElementById('fileSelect').value;
        
        if (!version || !file) return;
        
        try {
            // 使用 DataManager 加载
            window.dataManager.setVersion(version);
            const jsonData = await window.dataManager.loadFile(file, version);
            
            if (!jsonData) {
                throw new Error('无法加载数据文件');
            }
            
            const records = jsonData.Records || [];
            
            // 按 m_ID 排序（如果存在 m_ID 字段）
            if (records.length > 0 && records[0].m_ID !== undefined) {
                records.sort((a, b) => (a.m_ID || 0) - (b.m_ID || 0));
            }
            
            this.currentData = {
                fileName: file,
                version: version,
                records: records,
                metadata: {
                    m_Name: jsonData.m_Name,
                    totalRecords: records.length
                }
            };
            
            this.showDataDisplay();
        } catch (error) {
            console.error('加载数据失败:', error);
            alert('加载数据失败: ' + error.message);
        }
    }
    
    showDataDisplay() {
        document.querySelector('.selection-section').style.display = 'none';
        document.getElementById('dataDisplaySection').style.display = 'block';
        
        document.getElementById('dataTitle').textContent = `📊 ${this.currentData.fileName} - 版本 ${this.currentData.version}`;
        
        this.updateSummary();
        this.populateColumnSelect();
        this.filterData();
    }
    
    updateSummary() {
        const summary = document.getElementById('dataSummary');
        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-value">${this.currentData.records.length}</span>
                <span class="summary-label">总记录数</span>
            </div>
        `;
    }
    
    populateColumnSelect() {
        if (this.currentData.records.length === 0) return;
        
        const firstRecord = this.currentData.records[0];
        const columns = Object.keys(firstRecord);
        
        const select = document.getElementById('columnSelect');
        select.innerHTML = '<option value="">搜索所有字段</option>';
        columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            select.appendChild(option);
        });
    }
    
    filterData() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        const searchColumn = document.getElementById('columnSelect').value;
        
        if (!searchText) {
            this.filteredData = [...this.currentData.records];
        } else {
            this.filteredData = this.currentData.records.filter(record => {
                if (searchColumn) {
                    const value = record[searchColumn];
                    return this.searchInValue(value, searchText);
                } else {
                    return Object.values(record).some(value => 
                        this.searchInValue(value, searchText)
                    );
                }
            });
        }
        
        this.currentPage = 1;
        if (this.currentView === 'table') {
            this.renderTable();
        } else {
            this.renderJson();
        }
    }
    
    searchInValue(value, searchText) {
        if (value === null || value === undefined) return false;
        
        if (typeof value === 'object') {
            if (value.m_locValues && Array.isArray(value.m_locValues)) {
                return value.m_locValues.some(v => 
                    v && v.toString().toLowerCase().includes(searchText)
                );
            }
            return JSON.stringify(value).toLowerCase().includes(searchText);
        }
        
        return value.toString().toLowerCase().includes(searchText);
    }
    
    renderTable() {
        if (this.filteredData.length === 0) {
            document.getElementById('tableBody').innerHTML = 
                '<tr><td colspan="100" style="text-align:center;padding:40px;">没有数据</td></tr>';
            return;
        }
        
        const columns = Object.keys(this.filteredData[0]);
        
        // 渲染表头
        const thead = document.getElementById('tableHead');
        thead.innerHTML = `
            <tr>
                ${columns.map(col => `<th>${col}</th>`).join('')}
                <th>操作</th>
            </tr>
        `;
        
        // 分页
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.filteredData.slice(start, end);
        
        // 渲染数据
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = pageData.map((record, index) => `
            <tr>
                ${columns.map(col => {
                    const value = record[col];
                    return `<td>${this.formatValue(value)}</td>`;
                }).join('')}
                <td>
                    <button class="detail-btn" onclick="dataViewer.showDetail(${start + index})">详情</button>
                </td>
            </tr>
        `).join('');
        
        this.updatePagination();
    }
    
    formatValue(value) {
        if (value === null || value === undefined) return '';
        
        if (typeof value === 'object') {
            if (value.m_locValues && Array.isArray(value.m_locValues)) {
                // 优先显示简体中文（索引12）
                const text = value.m_locValues[12] || value.m_locValues[13] || value.m_locValues[0] || '';
                return text.substring(0, 50) + (text.length > 50 ? '...' : '');
            }
            return '<span class="object-indicator">[对象]</span>';
        }
        
        const str = value.toString();
        return str.length > 50 ? str.substring(0, 50) + '...' : str;
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        document.getElementById('pageInfo').textContent = 
            `第 ${this.currentPage} 页，共 ${totalPages} 页 (共 ${this.filteredData.length} 条记录)`;
        
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === totalPages || totalPages === 0;
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }
    
    toggleView() {
        this.currentView = this.currentView === 'table' ? 'json' : 'table';
        
        if (this.currentView === 'table') {
            document.getElementById('tableView').style.display = 'block';
            document.getElementById('jsonView').style.display = 'none';
            document.getElementById('toggleViewBtn').textContent = '📋 切换视图';
            this.renderTable();
        } else {
            document.getElementById('tableView').style.display = 'none';
            document.getElementById('jsonView').style.display = 'block';
            document.getElementById('toggleViewBtn').textContent = '📊 切换视图';
            this.renderJson();
        }
    }
    
    renderJson() {
        const jsonContent = document.getElementById('jsonContent');
        jsonContent.textContent = JSON.stringify(this.filteredData, null, 2);
    }
    
    showDetail(index) {
        const record = this.filteredData[index];
        document.getElementById('modalTitle').textContent = '详细信息';
        document.getElementById('detailContent').textContent = JSON.stringify(record, null, 2);
        document.getElementById('detailModal').style.display = 'block';
    }
    
    closeModal() {
        document.getElementById('detailModal').style.display = 'none';
    }
    
    backToSelect() {
        document.getElementById('dataDisplaySection').style.display = 'none';
        document.querySelector('.selection-section').style.display = 'block';
        this.currentData = null;
        this.filteredData = [];
    }
    
    async exportData() {
        const exportData = {
            fileName: this.currentData.fileName,
            version: this.currentData.version,
            exportTime: new Date().toISOString(),
            totalRecords: this.filteredData.length,
            records: this.filteredData
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        if (window.fileAPI) {
            try {
                const result = await window.fileAPI.showSaveDialog({
                    title: '导出数据',
                    defaultPath: `${this.currentData.fileName}_${this.currentData.version}.json`,
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
let dataViewer;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dataViewer = new DataViewerSystem();
    });
} else {
    dataViewer = new DataViewerSystem();
}

window.dataViewer = dataViewer;
