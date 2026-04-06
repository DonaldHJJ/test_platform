<template>
  <header class="top-header">
    <div class="header-left">
      <el-button type="primary" size="small" @click="handleSave">
        <el-icon><Edit /></el-icon>
        {{ t('save') }}
      </el-button>
      <el-button type="primary" size="small" @click="handleRun">
        <el-icon><VideoPlay /></el-icon>
        {{ t('run') }}
      </el-button>
      <el-button type="success" size="small" @click="handleExportReport">
        <el-icon><Document /></el-icon>
        {{ t('exportReport') }}
      </el-button>
    </div>
    <div class="header-right">
      <el-select v-model="currentLanguage" size="small" style="width: 120px;" @change="handleLanguageChange">
        <el-option label="English" value="English"></el-option>
        <el-option label="简体中文" value="简体中文"></el-option>
      </el-select>
    </div>
  </header>
</template>

<script>
import { VideoPlay, Document, Edit } from '@element-plus/icons-vue'
import { ElSelect, ElOption } from 'element-plus'

const messages = {
  'English': {
    save: 'Save',
    run: 'Run',
    exportReport: 'Export Report'
  },
  '简体中文': {
    save: '保存',
    run: '运行',
    exportReport: '导出报告'
  }
}

export default {
  name: 'TopHeader',
  components: {
    VideoPlay,
    Document,
    Edit,
    ElSelect,
    ElOption
  },
  props: {
    language: {
      type: String,
      default: 'English'
    }
  },
  data() {
    return {
      currentLanguage: this.language
    }
  },
  watch: {
    language(newVal) {
      this.currentLanguage = newVal
    }
  },
  methods: {
    t(key) {
      return messages[this.currentLanguage]?.[key] || messages['English'][key]
    },
    handleSave() {
      this.$emit('save')
    },
    handleRun() {
      this.$emit('run')
    },
    handleExportReport() {
      this.$emit('export-report')
    },
    handleLanguageChange(language) {
      this.$emit('language-change', language)
    }
  }
}
</script>

<style scoped>
.top-header {
  height: 48px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left :deep(.el-icon) {
  margin-right: 4px;
}

.header-right {
  display: flex;
  align-items: center;
}
</style>
