<template>
  <footer class="bottom-panel" :style="{ height: height + 'px' }">
    <el-tabs v-model="activeBottomTab" class="bottom-tabs">
      <el-tab-pane :label="t('logs')" name="logs">
        <div class="bottom-tab-content logs-content">
          <el-table :data="logsData" style="width: 100%; height: 100%" stripe border fit>
            <el-table-column prop="timestamp" :label="t('time')" width="180"></el-table-column>
            <el-table-column prop="componentId" :label="t('componentId')" width="200"></el-table-column>
            <el-table-column prop="level" :label="t('level')" width="120"></el-table-column>
            <el-table-column prop="message" :label="t('logInfo')">
              <template #default="{ row, $index }">
                <div class="log-message">
                  <span v-for="(part, i) in parseLogMessage(row.message)" :key="i">
                    <span v-if="!part.isFile">{{ part.text }}</span>
                    <a v-else class="log-link" @click="downloadFile(part.text)">{{ part.text }}</a>
                  </span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </footer>
</template>

<script>
import apiConfig from '../config/api.js'
import { ElMessage } from 'element-plus'

const messages = {
  'English': {
    logs: 'Logs',
    errors: 'Errors',
    time: 'Occurrence Time',
    componentId: 'Component ID',
    level: 'Level',
    logInfo: 'Log Info',
    errorInfo: 'Error Info',
    downloadFailed: 'Failed to download file'
  },
  '简体中文': {
    logs: '运行日志',
    errors: '错误列表',
    time: '发生时间',
    componentId: '组件标识',
    level: '级别',
    logInfo: '日志信息',
    errorInfo: '错误信息',
    downloadFailed: '下载文件失败'
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
    },
    activeTabName: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      activeBottomTab: 'logs',
      errorsData: Array(5).fill({ time: '', message: '' }),
      logsData: Array(5).fill({ timestamp: '', componentId: '', level: '', message: '' }),
      adjustTimer: null,
      pollTimer: null,
      lastLogHash: ''
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.adjustTableRows(this.height)
    })
    if (this.activeTabName) {
      this.loadLogsData()
      this.startPolling()
    }
  },
  beforeDestroy() {
    if (this.adjustTimer) {
      clearTimeout(this.adjustTimer)
    }
    this.stopPolling()
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
    },
    activeTabName: {
      handler(newName, oldName) {
        if (newName !== oldName) {
          this.stopPolling()
          this.lastLogHash = ''
        }
        if (newName) {
          this.loadLogsData()
          this.startPolling()
        }
      },
      immediate: false
    }
  },
  methods: {
    t(key) {
      return messages[this.language]?.[key] || messages['English'][key]
    },
    parseLogMessage(message) {
      if (!message) return [{ text: '', isFile: false }]
      
      const parts = []
      const filePattern = /([a-zA-Z]:\\[^\s"<>|?*]+|\\\\[^\s"<>|?*]+)/g
      let lastIndex = 0
      let match
      
      while ((match = filePattern.exec(message)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ text: message.substring(lastIndex, match.index), isFile: false })
        }
        parts.push({ text: match[0], isFile: true })
        lastIndex = match.index + match[0].length
      }
      
      if (lastIndex < message.length) {
        parts.push({ text: message.substring(lastIndex), isFile: false })
      }
      
      return parts
    },
    async downloadFile(filePath) {
      console.log('下载文件:', filePath)
      try {
        let downloadUrl = filePath
        
        if (filePath.startsWith('/')) {
          downloadUrl = filePath
        } else {
          const publicIndex = filePath.toLowerCase().indexOf('public')
          if (publicIndex !== -1) {
            downloadUrl = filePath.substring(publicIndex + 6).replace(/\\/g, '/')
          } else {
            const fileName = filePath.split(/[\\/]/).pop() || 'file'
            downloadUrl = `/result/report/${fileName}`
          }
        }
        
        console.log('下载URL:', downloadUrl)
        
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = downloadUrl.split(/[\\/]/).pop() || 'file'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('下载文件失败:', error)
        ElMessage.error(this.t('downloadFailed'))
      }
    },
    generateHash(data) {
      const str = JSON.stringify(data)
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return hash.toString()
    },
    startPolling() {
      this.stopPolling()
      this.pollTimer = setInterval(() => {
        if (this.activeTabName && this.activeBottomTab === 'logs') {
          this.loadLogsData(true)
        }
      }, 2000)
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    async loadLogsData(isPolling = false) {
      if (!this.activeTabName) {
        console.log('没有活跃的标签页名称，重置到初始状态')
        this.adjustTableRows(this.height, true)
        return
      }
      
      try {
        if (!isPolling) {
          console.log('加载日志数据，标签页名称:', this.activeTabName)
        }
        const fileName = `${this.activeTabName}_logs.json`
        const response = await fetch(`${apiConfig.publicPath}result/log/${fileName}`)
        
        if (response.ok) {
          const data = await response.json()
          let newData
          if (Array.isArray(data)) {
            newData = data
          } else if (data.logs && Array.isArray(data.logs)) {
            newData = data.logs
          }
          
          if (newData) {
            const currentHash = this.generateHash(newData)
            if (currentHash !== this.lastLogHash) {
              if (!isPolling) {
                console.log('加载到的日志数据:', data)
              } else {
                console.log('日志文件已更新，重新加载')
              }
              this.logsData = newData
              this.lastLogHash = currentHash
            }
          }
        } else {
          if (!isPolling) {
            console.log('日志文件不存在或加载失败，重置到初始状态:', fileName)
            this.adjustTableRows(this.height, true)
            this.lastLogHash = ''
          }
        }
      } catch (error) {
        if (!isPolling) {
          console.error('加载日志数据失败，重置到初始状态:', error)
          this.adjustTableRows(this.height, true)
          this.lastLogHash = ''
        }
      }
    },
    adjustTableRows(height, resetLogs = false) {
      try {
        if (!height || height <= 0) {
          console.warn('Invalid height provided:', height)
          return
        }
        
        const rowHeight = 30
        const padding = 16
        const availableHeight = Math.max(60, height - padding * 2)
        const rowCount = Math.max(1, Math.floor(availableHeight / rowHeight))
        
        console.log('Adjusting table rows, rowCount:', rowCount, 'resetLogs:', resetLogs)
        
        this.errorsData = Array(rowCount).fill({ time: '', message: '' })
        if (resetLogs || !this.logsData || this.logsData.length === 0) {
          this.logsData = Array(rowCount).fill({ timestamp: '', componentId: '', level: '', message: '' })
        }
      } catch (error) {
        console.error('Error adjusting table rows:', error)
        this.errorsData = Array(5).fill({ time: '', message: '' })
        if (resetLogs || !this.logsData || this.logsData.length === 0) {
          this.logsData = Array(5).fill({ timestamp: '', componentId: '', level: '', message: '' })
        }
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

.log-message {
  display: inline;
  word-break: break-all;
}

.log-link {
  color: #409eff;
  text-decoration: underline;
  cursor: pointer;
}

.log-link:hover {
  color: #66b1ff;
}
</style>
