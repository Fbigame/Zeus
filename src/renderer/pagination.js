// 通用分页组件
class Pagination {
    constructor(options = {}) {
        this.currentPage = 1;
        this.pageSize = options.pageSize || 20;
        this.onPageChange = options.onPageChange || (() => {}); // 页面变化回调
    }
    
    // 生成分页HTML
    generate(totalItems) {
        const totalPages = Math.ceil(totalItems / this.pageSize);
        
        if (totalPages <= 1) {
            return ''; // 只有一页或没有数据时不显示分页
        }
        
        // 确保当前页在有效范围内
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }
        
        const paginationId = `pagination_${Math.random().toString(36).substr(2, 9)}`;
        
        return `
            <div class="pagination" style="display: flex; justify-content: center; align-items: center; gap: 10px; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
                <button onclick="window.paginationInstance.goToPage(1)" ${this.currentPage === 1 ? 'disabled' : ''} 
                        style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; ${this.currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    首页
                </button>
                <button onclick="window.paginationInstance.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''} 
                        style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; ${this.currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    上一页
                </button>
                <span style="padding: 0 15px; color: #333; font-weight: bold;">
                    第 ${this.currentPage} / ${totalPages} 页 (共 ${totalItems} 项)
                </span>
                <button onclick="window.paginationInstance.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; ${this.currentPage === totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    下一页
                </button>
                <button onclick="window.paginationInstance.goToPage(${totalPages})" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; ${this.currentPage === totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    末页
                </button>
                <input type="number" id="${paginationId}_input" min="1" max="${totalPages}" value="${this.currentPage}" 
                       style="width: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center;"
                       onkeypress="if(event.key === 'Enter') window.paginationInstance.goToPage(parseInt(this.value))">
                <button onclick="window.paginationInstance.goToPage(parseInt(document.getElementById('${paginationId}_input').value))" 
                        style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: #3498db; color: white; cursor: pointer;">
                    跳转
                </button>
            </div>
        `;
    }
    
    // 跳转到指定页
    goToPage(page) {
        // 不在这里验证，由回调函数处理
        if (isNaN(page) || page < 1) {
            return;
        }
        
        this.currentPage = page;
        this.onPageChange(page); // 触发回调
    }
    
    // 获取分页后的数据
    getPaginatedData(dataArray) {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return dataArray.slice(startIndex, endIndex);
    }
    
    // 重置到第一页
    reset() {
        this.currentPage = 1;
    }
    
    // 设置页面大小
    setPageSize(size) {
        this.pageSize = size;
        this.currentPage = 1;
    }
}
