<template>
  <aside class="left-panel" :style="{ width: width + 'px' }">
    <div class="panel-content">
      <el-tabs v-model="activeTab" class="command-tabs" type="card">
        <el-tab-pane :label="t('standardComponents')" name="standard">
          <div class="command-components">
            <div 
              v-for="command in standardCommands" 
              :key="command.id" 
              class="command-item" 
              @click="handleCommandClick(command.id)"
              draggable="true"
              @dragstart="handleDragStart($event, command)"
            >
              <el-icon class="command-icon">
                <component :is="command.icon" />
              </el-icon>
              <span class="command-name">{{ t(command.id) }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="t('customComponents')" name="custom">
          <div class="command-components custom-commands" @contextmenu.prevent="$emit('show-context-menu', $event, 'empty')">
            <div v-for="(group, groupIndex) in customGroups" :key="groupIndex" class="custom-group" @contextmenu.stop.prevent="$emit('show-context-menu', $event, 'group', groupIndex)">
              <div class="group-header" @click="toggleGroup(groupIndex)">
                <el-icon class="group-icon">
                  <component :is="group.collapsed ? 'ArrowRight' : 'ArrowDown'" />
                </el-icon>
                <span class="group-name">{{ group.name }}</span>
                <el-icon 
                  class="delete-icon" 
                  @click.stop="handleDeleteGroup(groupIndex, group.name)"
                >
                  <Delete />
                </el-icon>
              </div>
              <div class="group-commands" v-show="!group.collapsed">
                <div 
                  v-for="(command, cmdIndex) in group.commands" 
                  :key="cmdIndex" 
                  class="command-item" 
                  @click="handleCommandClick('custom', groupIndex, cmdIndex)"
                  @dblclick.stop.prevent="$emit('edit-command', { groupIndex, cmdIndex })"
                  @contextmenu.stop.prevent="$emit('show-context-menu', $event, 'command', { groupIndex, cmdIndex })"
                  draggable="true"
                  @dragstart="handleCustomDragStart($event, command, groupIndex, cmdIndex)"
                >
                  <el-icon class="command-icon">
                    <component :is="getCommandIcon(command.type)" />
                  </el-icon>
                  <span class="command-name">{{ command.name || t('component') + (cmdIndex + 1) }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </aside>
</template>

<script>
import { Search, Monitor, Connection, Document, ArrowRight, ArrowDown, Plus, Link, Delete, Operation, Tools, Setting } from '@element-plus/icons-vue'
import standardCommandsData from '../system-config/standard-commands.json'

const messages = {
  'English': {
    standardComponents: 'Standard',
    customComponents: 'Custom',
    component: 'Component',
    server: 'Server Component',
    api: 'API Component',
    web: 'Web Component',
    database: 'Database Component',
    other: 'Other Component'
  },
  '简体中文': {
    standardComponents: '标准组件',
    customComponents: '自定义组件',
    component: '组件',
    server: '服务器组件',
    api: 'API组件',
    web: 'Web组件',
    database: '数据库组件',
    other: '其它组件'
  }
}

export default {
  name: 'LeftPanel',
  components: {
    Search,
    Monitor,
    Connection,
    Document,
    ArrowRight,
    ArrowDown,
    Plus,
    Link,
    Delete,
    Operation,
    Tools,
    Setting
  },
  props: {
    width: {
      type: Number,
      default: 200
    },
    language: {
      type: String,
      default: 'English'
    }
  },
  emits: ['resize-start', 'command-click', 'show-context-menu', 'delete-group', 'edit-command', 'drag-start', 'drop-custom-command'],
  data() {
    return {
      searchText: '',
      activeTab: localStorage.getItem('activeTab') || 'standard',
      standardCommands: [],
      customGroups: []
    }
  },
  watch: {
    activeTab(newVal) {
      localStorage.setItem('activeTab', newVal)
    }
  },
  async created() {
    this.loadStandardCommands()
    await this.loadCustomGroups()
  },
  methods: {
    t(key) {
      return messages[this.language]?.[key] || messages['English'][key]
    },
    loadStandardCommands() {
      this.standardCommands = standardCommandsData.commands
    },
    
    async loadCustomGroups() {
      try {
        console.log('开始加载自定义分组')
        const modules = import.meta.glob('../system-config/custom/*.json', { eager: true })
        console.log('找到的模块:', Object.keys(modules))
        const groups = []
        
        Object.keys(modules).forEach(path => {
          console.log('加载模块:', path)
          const module = modules[path]
          console.log('模块内容:', module.default)
          groups.push({
            ...module.default,
            collapsed: false
          })
        })
        
        console.log('加载的分组:', groups)
        this.customGroups = groups
      } catch (error) {
        console.error('加载自定义分组失败:', error)
        this.customGroups = []
      }
    },
    
    handleCommandClick(type, groupIndex, commandIndex) {
      this.$emit('command-click', { type, groupIndex, commandIndex })
    },
    
    handleDragStart(event, command) {
      event.dataTransfer.setData('commandId', command.id)
      event.dataTransfer.setData('commandType', command.id)
      this.$emit('drag-start', command)
    },
    
    handleCustomDragStart(event, command, groupIndex, cmdIndex) {
      event.dataTransfer.setData('customCommand', JSON.stringify(command))
      event.dataTransfer.setData('isCustom', 'true')
      this.$emit('drop-custom-command', { command, groupIndex, cmdIndex })
    },
    
    toggleGroup(index) {
      if (this.customGroups[index]) {
        this.customGroups[index].collapsed = !this.customGroups[index].collapsed
      }
    },
    
    handleDeleteGroup(groupIndex, groupName) {
      this.$emit('delete-group', { groupIndex, groupName })
    },
    getCommandIcon(type) {
      switch (type) {
        case 'server':
          return 'Monitor'
        case 'api':
          return 'Connection'
        case 'web':
          return 'Link'
        case 'database':
          return 'Document'
        case 'other':
          return 'Setting'
        default:
          return 'Document'
      }
    }
  }
}
</script>

<style scoped>
.left-panel {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
}

.panel-header {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-icon {
  font-size: 14px;
  color: #909399;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  width: 100%;
  position: relative;
}

.command-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
}

.command-tabs :deep(.el-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
}

.command-tabs :deep(.el-tabs__header) {
  margin: 0;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  width: 100%;
  position: relative;
}

.command-tabs :deep(.el-tabs__nav) {
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: stretch;
  width: 100%;
}

.command-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  color: #606266;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  flex: 1;
  width: 50%;
  padding: 0;
  margin: 0;
}

.command-tabs :deep(.el-tabs__item:hover) {
  color: #409eff;
}

.command-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-weight: 500;
}

.command-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
}

.command-tabs :deep(.el-tab-pane) {
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
}

.command-components {
  flex: 1;
  overflow: hidden;
  padding: 8px;
  height: 100%;
  width: 100%;
  margin: 0;
  box-sizing: border-box;
  position: relative;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.command-item:hover {
  background-color: #f5f7fa;
}

.command-icon {
  font-size: 16px;
  color: #606266;
}

.command-name {
  font-size: 13px;
  color: #606266;
}

.custom-commands {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
  width: 100%;
  margin: 0;
  min-height: 100px;
  box-sizing: border-box;
  position: relative;
}

.custom-group {
  margin-bottom: 8px;
  width: 100%;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
  box-sizing: border-box;
}

.group-header:hover {
  background-color: #ecf5ff;
}

.group-icon {
  font-size: 12px;
  color: #909399;
  transition: transform 0.3s;
}

.group-name {
  font-size: 13px;
  color: #303133;
  flex: 1;
}

.delete-icon {
  font-size: 14px;
  color: #909399;
  cursor: pointer;
  transition: all 0.3s;
  padding: 2px;
  border-radius: 2px;
}

.delete-icon:hover {
  color: #f56c6c;
  background-color: #fef0f0;
}

.group-commands {
  padding-left: 20px;
  width: 100%;
  box-sizing: border-box;
}
</style>
