<template>
  <main class="editor">
    <el-tabs v-model="activeFlowTabId" class="flow-tabs" type="card" closable @tab-remove="closeFlowTab" @tab-click="handleFlowTabClick">
      <el-tab-pane 
        v-for="tab in flowTabs" 
        :key="tab.id" 
        :label="tab.name" 
        :name="tab.id.toString()"
      >
        <div class="flow-tab-content">
          <div 
            class="flow-canvas"
            :class="{ 'drag-over': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragenter.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop="handleDrop"
          >
            <template v-if="tab.steps && tab.steps.length > 0">
              <div class="steps-container">
                <div 
                  v-for="(step, index) in tab.steps" 
                  :key="step.id" 
                  class="step-card"
                  :class="{ 
                    'dragging': draggedTabId === tab.id && draggedIndex === index, 
                    'drag-over': draggedTabId === tab.id && dragOverIndex === index,
                    'flow-step': step.commandData?.isFlow
                  }"
                  draggable="true"
                  @dragstart="handleStepDragStart(tab.id, index)"
                  @dragover.prevent="handleStepDragOver(tab.id, index)"
                  @dragenter.prevent="handleStepDragEnter(tab.id, index)"
                  @dragleave="handleStepDragLeave(tab.id, index)"
                  @drop="handleStepDrop(tab.id, index)"
                  @dragend="handleStepDragEnd"
                >
                  <div class="step-number">{{ step.stepNumber }}</div>
                  <div class="step-content">
                    <div class="step-description">{{ step.description }}</div>
                  </div>
                  <el-button 
                    class="delete-btn" 
                    type="danger" 
                    size="small" 
                    circle
                    @click="deleteStep(tab.id, step.id)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <el-empty v-else :description="t('dragFromLeftOrRight')">
              <el-icon><Plus /></el-icon>
            </el-empty>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <div class="add-tab-btn" @click="handleAddTabClick">
      <el-icon><Plus /></el-icon>
    </div>
  </main>
</template>

<script>
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const messages = {
  'English': {
    unsaved: 'Unsaved',
    unnamed: 'Unnamed',
    dragFromLeftOrRight: 'Drag from left component area or right flow area'
  },
  '简体中文': {
    unsaved: '未保存',
    unnamed: '未命名',
    dragFromLeftOrRight: '从左侧组件区或右侧流程区拖入'
  }
}

export default {
  name: 'EditorPanel',
  components: {
    Plus,
    Delete
  },
  props: {
    globalVariables: {
      type: Array,
      default: () => []
    },
    language: {
      type: String,
      default: 'English'
    }
  },
  emits: ['add-tab-click', 'drop-command', 'drop-custom-command', 'drop-flow', 'load-global-variables'],
  data() {
    const savedTabs = localStorage.getItem('editorFlowTabs')
    const savedActiveTab = localStorage.getItem('editorActiveTabId')
    
    let initialTabs = [
      { id: 1, name: this.t('unsaved'), steps: [], folderName: null, flowName: null }
    ]
    let initialActiveTab = '1'
    
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs)
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialTabs = parsed.map(tab => ({
            id: tab.id || Date.now(),
            name: tab.name || this.t('unnamed'),
            steps: Array.isArray(tab.steps) ? tab.steps : [],
            folderName: tab.folderName || null,
            flowName: tab.flowName || null,
            description: tab.description || ''
          }))
        }
      } catch (e) {
        console.error('解析保存的标签页失败:', e)
      }
    }
    
    if (savedActiveTab) {
      const tabExists = initialTabs.some(tab => tab.id.toString() === savedActiveTab)
      if (tabExists) {
        initialActiveTab = savedActiveTab
      } else {
        initialActiveTab = initialTabs[0].id.toString()
      }
    }
    
    return {
      flowTabs: initialTabs,
      activeFlowTabId: initialActiveTab,
      isDragOver: false,
      draggedTabId: null,
      draggedIndex: null,
      dragOverTabId: null,
      dragOverIndex: null
    }
  },
  watch: {
    flowTabs: {
      handler(newVal) {
        localStorage.setItem('editorFlowTabs', JSON.stringify(newVal))
      },
      deep: true
    },
    activeFlowTabId: {
      handler(newVal) {
        localStorage.setItem('editorActiveTabId', newVal)
        this.handleTabChange(newVal)
      }
    },
    language(newLang) {
      this.updateTabNames(newLang)
    }
  },
  async created() {
    this.loadFlowTabsData()
    if (this.activeFlowTabId) {
      this.handleTabChange(this.activeFlowTabId)
    }
  },
  computed: {
    activeTab() {
      return this.flowTabs.find(tab => tab.id.toString() === this.activeFlowTabId)
    }
  },
  methods: {
    t(key) {
      return messages[this.language]?.[key] || messages['English'][key]
    },
    updateTabNames(newLang) {
      this.flowTabs = this.flowTabs.map(tab => {
        if (!tab.folderName && !tab.flowName) {
          return {
            ...tab,
            name: messages[newLang]?.unsaved || messages['English'].unsaved
          }
        }
        return tab
      })
    },
    async handleTabChange(tabIdStr) {
      console.log('=== handleTabChange 被调用 ===', tabIdStr)
      const tabId = parseInt(tabIdStr)
      const tab = this.flowTabs.find(t => t.id === tabId)
      
      console.log('handleTabChange - 当前所有标签页:', this.flowTabs.map(t => ({ id: t.id, name: t.name, folderName: t.folderName, flowName: t.flowName })))
      console.log('handleTabChange - 找到的 tab:', tab)
      
      if (tab && tab.folderName && tab.flowName) {
        try {
          console.log('handleTabChange - 准备加载流程文件:', { folderName: tab.folderName, flowName: tab.flowName })
          const response = await fetch(`/api/get-flow-file?folderName=${tab.folderName}&flowName=${tab.flowName}`, {
            method: 'GET'
          })
          const data = await response.json()
          console.log('handleTabChange - 加载的流程数据:', data)
          if (data.success && data.data) {
            if (data.data.globalVariables && Array.isArray(data.data.globalVariables)) {
              console.log('切换标签页，加载全局变量:', data.data.globalVariables)
              this.$emit('load-global-variables', data.data.globalVariables)
            } else {
              console.log('handleTabChange - 没有找到 globalVariables，初始化为空数组')
              this.$emit('load-global-variables', [])
            }
          }
        } catch (error) {
          console.error('切换标签页加载全局变量失败:', error)
        }
      } else {
        console.log('handleTabChange - tab 没有 folderName 或 flowName，初始化全局变量')
        this.$emit('load-global-variables', [])
      }
    },
    resetEditor() {
      localStorage.removeItem('editorFlowTabs')
      localStorage.removeItem('editorActiveTabId')
      this.flowTabs = [
        { id: 1, name: this.t('unsaved'), steps: [], folderName: null, flowName: null }
      ]
      this.activeFlowTabId = '1'
      console.log('resetEditor - 重置编辑器，初始化全局变量')
      this.$emit('load-global-variables', [])
    },
    getActiveTab() {
      return this.activeTab
    },
    async loadFlowTabsData() {
      for (const tab of this.flowTabs) {
        if (tab.folderName && tab.flowName) {
          try {
            const response = await fetch(`/api/get-flow-file?folderName=${tab.folderName}&flowName=${tab.flowName}`, {
              method: 'GET'
            })
            const data = await response.json()
            if (data.success && data.data) {
              if (data.data.nodes && Array.isArray(data.data.nodes)) {
                tab.steps = data.data.nodes.map((node, index) => ({
                  id: node.id || Date.now() + index,
                  stepNumber: index + 1,
                  name: node.name || '',
                  description: node.description || '',
                  commandData: node.data || null
                }))
              }
            }
          } catch (error) {
            console.error('加载流程数据失败:', error)
          }
        }
      }
    },
    async saveFlowToFile(tab) {
      if (!tab.folderName || !tab.flowName) {
        console.log('不保存：缺少 folderName 或 flowName', { folderName: tab.folderName, flowName: tab.flowName })
        return
      }
      
      try {
        const flowData = {
          name: tab.flowName,
          description: tab.description || '',
          nodes: tab.steps.map((step, index) => ({
            id: step.id,
            name: step.name,
            description: step.description,
            data: step.commandData || null,
            stepNumber: step.stepNumber || (index + 1)
          })),
          edges: [],
          globalVariables: this.globalVariables || []
        }
        
        console.log('准备保存流程到文件:', { folderName: tab.folderName, flowName: tab.flowName, flowData })
        
        const response = await fetch('/api/update-flow-file', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            folderName: tab.folderName,
            flowName: tab.flowName,
            data: flowData
          })
        })
        
        const result = await response.json()
        console.log('保存流程结果:', result)
      } catch (error) {
        console.error('保存流程到文件失败:', error)
      }
    },
    handleAddTabClick() {
      this.$emit('add-tab-click')
    },
    async handleDrop(event) {
      console.log('=== handleDrop 被调用 ===', event)
      event.preventDefault()
      this.isDragOver = false
      
      console.log('dataTransfer types:', event.dataTransfer.types)
      
      const isFlow = event.dataTransfer.getData('isFlow')
      console.log('isFlow value:', isFlow, 'type:', typeof isFlow)
      
      if (isFlow === 'true') {
        const folderName = event.dataTransfer.getData('folderName')
        const flowName = event.dataTransfer.getData('flowName')
        
        console.log('handleDrop - 检测到流程拖拽:', { isFlow, folderName, flowName })
        
        if (folderName && flowName) {
          try {
            const response = await fetch(`/api/get-flow-file?folderName=${encodeURIComponent(folderName)}&flowName=${encodeURIComponent(flowName)}`)
            const result = await response.json()
            
            let description = ''
            if (result.success && result.data) {
              description = result.data.description || ''
            }
            
            console.log('拖拽流程到编辑区:', { folderName, flowName, description })
            this.$emit('drop-flow', {
              folderName,
              flowName,
              description
            })
          } catch (error) {
            console.error('获取流程描述失败:', error)
            this.$emit('drop-flow', {
              folderName,
              flowName,
              description: ''
            })
          }
        }
      } else {
        const isCustom = event.dataTransfer.getData('isCustom')
        
        if (isCustom === 'true') {
          const customCommand = event.dataTransfer.getData('customCommand')
          if (customCommand) {
            try {
              const command = JSON.parse(customCommand)
              this.$emit('drop-custom-command', { command })
            } catch (e) {
              console.error('解析自定义指令失败:', e)
            }
          }
        } else {
          const commandId = event.dataTransfer.getData('commandId')
          const commandType = event.dataTransfer.getData('commandType')
          
          if (commandId && commandType) {
            this.$emit('drop-command', { commandId, commandType })
          }
        }
      }
    },
    addStep(stepData, commandData) {
      console.log('addStep 被调用', { stepData, commandData, activeTab: this.activeTab })
      if (this.activeTab) {
        const newStep = {
          id: Date.now(),
          stepNumber: this.activeTab.steps.length + 1,
          ...stepData,
          commandData: commandData || null
        }
        this.activeTab.steps.push(newStep)
        console.log('添加步骤后:', this.activeTab)
        
        if (this.activeTab.folderName && this.activeTab.flowName) {
          console.log('准备保存到文件...')
          this.saveFlowToFile(this.activeTab)
        }
      }
    },
    deleteStep(tabId, stepId) {
      const tab = this.flowTabs.find(t => t.id === tabId)
      if (tab) {
        const index = tab.steps.findIndex(s => s.id === stepId)
        if (index !== -1) {
          tab.steps.splice(index, 1)
          tab.steps.forEach((step, i) => {
            step.stepNumber = i + 1
          })
          
          if (tab.folderName && tab.flowName) {
            this.saveFlowToFile(tab)
          }
        }
      }
    },
    addFlowTab(name, folderName, flowName, description) {
      const existingTab = this.flowTabs.find(tab => tab.name === name)
      if (existingTab) {
        this.activeFlowTabId = existingTab.id.toString()
        return
      }
      const newId = Date.now()
      const newTab = {
        id: newId,
        name: name || this.t('unsaved'),
        steps: [],
        folderName: folderName || null,
        flowName: flowName || null,
        description: description || ''
      }
      this.flowTabs.push(newTab)
      this.activeFlowTabId = newId.toString()
      
      if (!folderName && !flowName) {
        console.log('addFlowTab - 新建未保存标签页，初始化全局变量')
        this.$emit('load-global-variables', [])
      }
    },
    async openFlowTab(folderName, flowName) {
      console.log('openFlowTab 被调用', { folderName, flowName })
      
      const existingTab = this.flowTabs.find(tab => 
        tab.folderName === folderName && tab.flowName === flowName
      )
      
      if (existingTab) {
        console.log('找到已存在的标签页，切换到它', existingTab)
        this.activeFlowTabId = existingTab.id.toString()
        return
      }
      
      try {
        console.log('从服务器加载流程数据...')
        const response = await fetch(`/api/get-flow-file?folderName=${encodeURIComponent(folderName)}&flowName=${encodeURIComponent(flowName)}`)
        const result = await response.json()
        
        console.log('服务器返回结果:', result)
        
        if (result.success && result.data) {
          const steps = (result.data.nodes || []).map(node => ({
            id: node.id,
            name: node.name,
            description: node.description,
            commandData: node.data || null,
            stepNumber: node.stepNumber
          }))
          
          const newId = Date.now()
          const newTab = {
            id: newId,
            name: flowName,
            steps: steps,
            folderName: folderName,
            flowName: flowName,
            description: result.data.description || ''
          }
          
          console.log('创建新标签页:', newTab)
          this.flowTabs.push(newTab)
          this.activeFlowTabId = newId.toString()
        } else {
          ElMessage.error(result.error || '加载流程失败')
        }
      } catch (error) {
        console.error('加载流程失败:', error)
        ElMessage.error('加载流程失败，请检查服务器是否运行')
      }
    },
    
    handleFlowTabClick(tab) {
      this.activeFlowTabId = tab.paneName
    },
    
    closeFlowTab(tabId) {
      if (this.flowTabs.length <= 1) return
      
      const index = this.flowTabs.findIndex(tab => tab.id.toString() === tabId)
      if (index !== -1) {
        this.flowTabs.splice(index, 1)
        if (tabId === this.activeFlowTabId && this.flowTabs.length > 0) {
          const newIndex = Math.max(0, index - 1)
          this.activeFlowTabId = this.flowTabs[newIndex].id.toString()
        }
      }
    },
    closeFlowTabByName(tabName) {
      const tabIndex = this.flowTabs.findIndex(tab => tab.name === tabName)
      if (tabIndex === -1) return
      
      const isLastTab = this.flowTabs.length === 1
      
      if (isLastTab) {
        const newId = this.flowTabs.length + 1
        const newTab = {
          id: newId,
          name: this.t('unsaved'),
          steps: [],
          folderName: null,
          flowName: null
        }
        this.flowTabs.push(newTab)
        this.activeFlowTabId = newId.toString()
      } else {
        if (this.flowTabs[tabIndex].id.toString() === this.activeFlowTabId) {
          const newIndex = Math.max(0, tabIndex - 1)
          this.activeFlowTabId = this.flowTabs[newIndex].id.toString()
        }
      }
      
      this.flowTabs.splice(tabIndex, 1)
    },
    async setFlowInfo(tabId, folderName, flowName, description) {
      console.log('setFlowInfo 被调用', { tabId, folderName, flowName, description })
      const tab = this.flowTabs.find(t => t.id === tabId)
      if (tab) {
        tab.folderName = folderName
        tab.flowName = flowName
        tab.description = description
        console.log('设置流程信息后的 tab:', tab)
        
        if (folderName && flowName) {
          try {
            const response = await fetch(`/api/get-flow-file?folderName=${folderName}&flowName=${flowName}`, {
              method: 'GET'
            })
            const data = await response.json()
            if (data.success && data.data) {
              if (data.data.globalVariables && Array.isArray(data.data.globalVariables)) {
                this.$emit('load-global-variables', data.data.globalVariables)
              } else {
                this.$emit('load-global-variables', [])
              }
            }
          } catch (error) {
            console.error('加载全局变量失败:', error)
          }
          
          console.log('准备保存流程到文件...')
          this.saveFlowToFile(tab)
        }
      }
    },
    renameActiveTab(newName) {
      const tabIndex = this.flowTabs.findIndex(tab => tab.id.toString() === this.activeFlowTabId)
      if (tabIndex !== -1) {
        this.flowTabs[tabIndex].name = newName
      }
    },
    handleStepDragStart(tabId, index) {
      this.draggedTabId = tabId
      this.draggedIndex = index
    },
    handleStepDragOver(tabId, index) {
    },
    handleStepDragEnter(tabId, index) {
      if (this.draggedTabId === tabId && this.draggedIndex !== index) {
        this.dragOverTabId = tabId
        this.dragOverIndex = index
      }
    },
    handleStepDragLeave(tabId, index) {
      if (this.dragOverTabId === tabId && this.dragOverIndex === index) {
        this.dragOverTabId = null
        this.dragOverIndex = null
      }
    },
    handleStepDrop(tabId, index) {
      if (this.draggedTabId === tabId && this.draggedIndex !== null && this.draggedIndex !== index) {
        const tab = this.flowTabs.find(t => t.id === tabId)
        if (tab) {
          const draggedStep = tab.steps[this.draggedIndex]
          tab.steps.splice(this.draggedIndex, 1)
          tab.steps.splice(index, 0, draggedStep)
          tab.steps.forEach((step, i) => {
            step.stepNumber = i + 1
          })
          
          if (tab.folderName && tab.flowName) {
            this.saveFlowToFile(tab)
          }
        }
      }
      this.dragOverTabId = null
      this.dragOverIndex = null
    },
    handleStepDragEnd() {
      this.draggedTabId = null
      this.draggedIndex = null
      this.dragOverTabId = null
      this.dragOverIndex = null
    }
  }
}
</script>

<style scoped>
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  position: relative;
  min-height: 0;
}

.flow-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.flow-tabs :deep(.el-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.flow-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.flow-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flow-tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.flow-canvas {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background-color: #fafafa;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  margin: 8px;
  min-height: 200px;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.3s;
}

.flow-canvas.drag-over {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.steps-container {
  width: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.step-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  cursor: grab;
}

.step-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.step-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.step-card.drag-over {
  border-color: #409eff;
  background-color: #ecf5ff;
  transform: scale(1.02);
}

.step-card.flow-step {
  background-color: #e6f7ff;
  border: 2px solid #91d5ff;
  border-left: 6px solid #1890ff;
}

.step-card.flow-step:hover {
  border-color: #1890ff;
  border-left-color: #096dd9;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.step-card.flow-step .step-number {
  background-color: #1890ff;
}

.step-card.flow-step .step-description {
  color: #0050b3;
  font-weight: 500;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  background-color: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.delete-btn {
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.step-card:hover .delete-btn {
  opacity: 1;
}

.add-tab-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #909399;
  font-size: 18px;
  font-weight: 300;
  line-height: 1;
  transition: all 0.3s ease;
  background: transparent;
}

.add-tab-btn:hover {
  color: #409eff;
  background-color: #ecf5ff;
  transform: translateY(-1px);
}
</style>
