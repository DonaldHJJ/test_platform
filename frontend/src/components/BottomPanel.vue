<template>
  <footer class="bottom-panel" :style="{ height: height + 'px' }">
    <el-tabs v-model="activeBottomTab" class="bottom-tabs">
      <el-tab-pane :label="t('logs')" name="logs">
        <div class="bottom-tab-content logs-content">
          <el-table :data="logsData" style="width: 100%; height: 100%" stripe border fit>
            <el-table-column prop="time" :label="t('time')" width="180"></el-table-column>
            <el-table-column prop="log" :label="t('componentId')" width="200"></el-table-column>
            <el-table-column prop="level" :label="t('logInfo')"></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="t('errors')" name="errors">
        <div class="bottom-tab-content errors-content">
          <el-table :data="errorsData" style="width: 100%; height: 100%" stripe border fit>
            <el-table-column prop="time" :label="t('time')" width="180"></el-table-column>
            <el-table-column prop="message" :label="t('errorInfo')"></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </footer>
</template>

<script>
const messages = {
  'English': {
    logs: 'Logs',
    errors: 'Errors',
    time: 'Occurrence Time',
    componentId: 'Component ID',
    logInfo: 'Log Info',
    errorInfo: 'Error Info'
  },
  '简体中文': {
    logs: '运行日志',
    errors: '错误列表',
    time: '发生时间',
    componentId: '组件标识',
    logInfo: '日志信息',
    errorInfo: '错误信息'
  }
}

export default {
  name: 'BottomPanel',
  props: {
    height: {
      type: Number,
      default: 180
    },
    language: {
      type: String,
      default: 'English'
    }
  },
  data() {
    return {
      activeBottomTab: 'logs',
      errorsData: Array(5).fill({ time: '', message: '' }),
      logsData: Array(5).fill({ time: '', log: '', level: '' }),
      adjustTimer: null
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.adjustTableRows(this.height)
    })
  },
  beforeDestroy() {
    if (this.adjustTimer) {
      clearTimeout(this.adjustTimer)
    }
  },
  watch: {
    height: {
      handler(newHeight) {
        if (this.adjustTimer) {
          clearTimeout(this.adjustTimer)
        }
        
        this.adjustTimer = setTimeout(() => {
          if (newHeight && newHeight > 0) {
            this.$nextTick(() => {
              this.adjustTableRows(newHeight)
            })
          }
        }, 100)
      },
      deep: false
    }
  },
  methods: {
    t(key) {
      return messages[this.language]?.[key] || messages['English'][key]
    },
    adjustTableRows(height) {
      try {
        if (!height || height <= 0) {
          console.warn('Invalid height provided:', height)
          return
        }
        
        const rowHeight = 30
        const padding = 16
        const availableHeight = Math.max(60, height - padding * 2)
        const rowCount = Math.max(1, Math.floor(availableHeight / rowHeight))
        
        console.log('Adjusting table rows, rowCount:', rowCount)
        
        this.errorsData = Array(rowCount).fill({ time: '', message: '' })
        this.logsData = Array(rowCount).fill({ time: '', log: '', level: '' })
      } catch (error) {
        console.error('Error adjusting table rows:', error)
        this.errorsData = Array(5).fill({ time: '', message: '' })
        this.logsData = Array(5).fill({ time: '', log: '', level: '' })
      }
    }
  }
}
</script>

<style scoped>
.bottom-panel {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}

.bottom-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 0;
}

.bottom-tabs :deep(.el-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}

.bottom-tabs :deep(.el-tabs__header) {
  padding: 0 20px;
  margin: 0;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.bottom-tabs :deep(.el-tabs__nav) {
  margin: 0;
  padding: 5px 0;
  display: flex;
  justify-content: center;
}

.bottom-tabs :deep(.el-tabs__item) {
  padding: 0 20px;
  font-size: 14px;
  color: #606266;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
}

.bottom-tabs :deep(.el-tabs__item:hover) {
  color: #409eff;
}

.bottom-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-weight: 500;
}

.bottom-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 0;
}

.bottom-tabs :deep(.el-tab-pane) {
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0;
}

.bottom-tab-content {
  flex: 1;
  overflow: hidden;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0;
}

.errors-content,
.logs-content {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}

.bottom-tab-content :deep(.el-table) {
  flex: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
}

.bottom-tab-content :deep(.el-table__inner-wrapper) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.bottom-tab-content :deep(.el-table__body-wrapper) {
  width: 100%;
  height: calc(100% - 30px);
  margin: 0;
  padding: 0;
}

.bottom-tab-content :deep(.el-table th.el-table__cell) {
  height: 30px !important;
  padding: 0 12px !important;
  line-height: 30px !important;
}

.bottom-tab-content :deep(.el-table td.el-table__cell) {
  height: 30px !important;
  padding: 0 12px !important;
  line-height: 30px !important;
}

.bottom-tab-content :deep(.el-table .el-table__row) {
  height: 30px !important;
}
</style>
