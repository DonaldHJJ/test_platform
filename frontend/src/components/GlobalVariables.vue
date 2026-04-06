<template>
  <div class="variables-section-container">
    <div class="variables-section" :style="{ height: variablesHeight + 'px' }">
      <div class="section-header">
        <span class="section-title">{{ t('globalVariables') }}</span>
        <div class="section-actions">
          <el-button type="primary" size="small" circle @click="handleAddVariable">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
      </div>
      <div class="variables-table">
        <div class="table-header">
          <span class="header-cell">{{ t('variableName') }}</span>
          <span class="header-cell">{{ t('type') }}</span>
        </div>
        <div class="table-body">
          <template v-if="globalVariables.length > 0">
            <div 
              v-for="(variable, index) in globalVariables" 
              :key="index" 
              class="table-row"
              @dblclick="handleEditVariable(variable, index)"
            >
              <span class="table-cell">{{ variable.name }}</span>
              <span class="table-cell">{{ variable.type }}</span>
            </div>
          </template>
          <el-empty v-else :description="t('noVariables')" :image-size="60"></el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Plus } from '@element-plus/icons-vue'

const messages = {
  'English': {
    globalVariables: 'Global Variables',
    variableName: 'Name',
    type: 'Type',
    noVariables: 'No Variables'
  },
  '简体中文': {
    globalVariables: '全局变量',
    variableName: '变量名称',
    type: '类型',
    noVariables: '暂无变量'
  }
}

export default {
  name: 'GlobalVariables',
  components: {
    Plus
  },
  props: {
    variablesHeight: {
      type: Number,
      default: 350
    },
    globalVariables: {
      type: Array,
      default: () => []
    },
    language: {
      type: String,
      default: 'English'
    }
  },
  emits: ['resize-start', 'add-variable', 'edit-variable'],
  methods: {
    t(key) {
      return messages[this.language]?.[key] || messages['English'][key]
    },
    handleAddVariable() {
      this.$emit('add-variable')
    },
    handleEditVariable(variable, index) {
      this.$emit('edit-variable', { variable, index })
    }
  }
}
</script>

<style scoped>
.variables-section-container {
  display: flex;
  flex-direction: column;
  margin: 2px;
}

.variables-section {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  flex-shrink: 0;
  overflow: hidden;
}

.section-header {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.variables-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.table-header {
  display: flex;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
  font-weight: 500;
  color: #606266;
  text-align: center;
}

.header-cell {
  flex: 1;
  text-align: center;
}

.table-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.table-body :deep(.el-empty) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.table-body .table-row {
  width: 100%;
  flex-shrink: 0;
}

.table-row {
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
  color: #606266;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  transition: background-color 0.3s;
}

.table-row:hover {
  background-color: #f5f7fa;
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  flex: 1;
  word-break: break-all;
  text-align: center;
}
</style>
