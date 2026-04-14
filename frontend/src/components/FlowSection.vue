<template>
  <div class="flow-section" @contextmenu.prevent="handleContextMenu($event, null)">
    <div class="flow-tree">
      <el-tree
        v-if="treeData.length > 0"
        :data="treeData"
        :props="treeProps"
        node-key="id"
        :expand-on-click-node="false"
        @node-click="handleNodeClick"
        @node-contextmenu="handleNodeContextMenu"
      >
        <template #default="{ node, data }">
          <div 
            class="custom-tree-node" 
            :draggable="data.type === 'file' || data.type === 'component'"
            @dblclick.stop.prevent="data.type === 'file' ? handleNodeDoubleClick(data) : null"
            @click.stop
            @dragstart="data.type === 'file' ? handleFlowDragStart($event, data) : (data.type === 'component' ? handleComponentDragStart($event, data) : null)"
          >
            <el-icon v-if="data.type === 'folder'" class="folder-icon">
              <Folder />
            </el-icon>
            <el-icon v-else-if="data.type === 'file'" class="file-icon">
              <Document />
            </el-icon>
            <el-icon v-else class="component-icon">
              <Box />
            </el-icon>
            <span class="node-label">{{ node.label }}</span>
            <el-icon 
              v-if="data.type === 'folder' && data.label !== 'default'"
              class="delete-icon" 
              @click.stop="handleDeleteFolder(data)"
            >
              <Delete />
            </el-icon>
          </div>
        </template>
      </el-tree>
      <el-empty v-else :description="t('noContent')" :image-size="60"></el-empty>
    </div>

    <div 
      v-if="contextMenuVisible" 
      class="context-menu" 
      :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
    >
      <div 
        v-if="contextMenuType === 'empty'" 
        class="menu-item" 
        @click="showFolderDialog"
      >
        <el-icon><Plus /></el-icon>
        <span>{{ t('newFolder') }}</span>
      </div>
      <div 
        v-if="contextMenuType === 'folder'" 
        class="menu-item" 
        @click="showFlowDialog"
      >
        <el-icon><Plus /></el-icon>
        <span>{{ t('newFlow') }}</span>
      </div>
      <div 
        v-if="contextMenuType === 'file'" 
        class="menu-item" 
        @click="handleEditFlow"
      >
        <el-icon><Edit /></el-icon>
        <span>{{ t('edit') }}</span>
      </div>
      <div 
        v-if="contextMenuType === 'file'" 
        class="menu-item" 
        @click="handleDeleteFlow"
      >
        <el-icon><Delete /></el-icon>
        <span>{{ t('delete') }}</span>
      </div>
    </div>

    <el-dialog 
      v-model="folderDialogVisible" 
      :title="t('newFolder')" 
      width="400px"
      class="folder-dialog"
    >
      <el-input v-model="folderName" :placeholder="t('enterFolderName')" clearable></el-input>
      <template #footer>
        <el-button @click="folderDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmFolder">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog 
      v-model="flowDialogVisible" 
      :title="t('newFlow')" 
      width="400px"
      class="folder-dialog"
    >
      <el-form ref="flowForm" :model="flowForm" :rules="flowRules" label-width="80px">
        <el-form-item :label="t('name')" prop="flowName">
          <el-input v-model="flowForm.flowName" :placeholder="t('enterFlowName')" clearable></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input 
            v-model="flowForm.description" 
            type="textarea" 
            :rows="3"
            :placeholder="t('enterFlowDescription')"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="flowDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmFlow">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog 
      v-model="editFlowDialogVisible" 
      :title="t('editFlow')" 
      width="400px"
      class="folder-dialog"
    >
      <el-form ref="editFlowForm" :model="editFlowForm" :rules="editFlowRules" label-width="80px">
        <el-form-item :label="t('name')" prop="flowName">
          <el-input v-model="editFlowForm.flowName" :placeholder="t('enterFlowName')" clearable></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input 
            v-model="editFlowForm.description" 
            type="textarea" 
            :rows="3"
            :placeholder="t('enterFlowDescription')"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editFlowDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmEditFlow">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Folder, Plus, Delete, Document, Edit, Box } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const messages = {
  'English': {
    noContent: 'No Content',
    newFolder: 'New Folder',
    newFlow: 'New Flow',
    edit: 'Edit',
    delete: 'Delete',
    enterFolderName: 'Please enter folder name',
    enterFlowName: 'Please enter flow name',
    enterFlowDescription: 'Please enter flow description',
    cancel: 'Cancel',
    confirm: 'Confirm',
    name: 'Name',
    description: 'Description',
    editFlow: 'Edit Flow',
    confirmDelete: 'Confirm Delete',
    confirmDeleteFlow: 'Are you sure you want to delete flow "{name}"?',
    confirmDeleteFolder: 'Are you sure you want to delete folder "{name}"? All files in the folder will be deleted.',
    flowDeleted: 'Flow deleted successfully',
    flowDeleteFailed: 'Failed to delete flow',
    checkServer: 'Please check if server is running',
    flowRenamed: 'Flow renamed successfully',
    flowRenameFailed: 'Failed to rename flow',
    flowCreated: 'Flow created successfully',
    flowCreateFailed: 'Failed to create flow',
    folderCreated: 'Folder created successfully',
    folderCreateFailed: 'Failed to create folder',
    folderDeleted: 'Folder deleted successfully',
    folderDeleteFailed: 'Failed to delete folder',
    pleaseEnterFlowName: 'Please enter flow name',
    pleaseEnterFlowDescription: 'Please enter flow description',
    fileAlreadyExists: 'File already exists',
    folderAlreadyExists: 'Folder already exists',
    failedToEditFlow: 'Failed to edit flow',
    failedToCreateFlow: 'Failed to create flow',
    failedToDeleteFlow: 'Failed to delete flow',
    failedToCreateFolder: 'Failed to create folder',
    failedToDeleteFolder: 'Failed to delete folder'
  },
  '简体中文': {
    noContent: '暂无内容',
    newFolder: '新建分组',
    newFlow: '新建流程',
    edit: '编辑',
    delete: '删除',
    enterFolderName: '请输入分组名称',
    enterFlowName: '请输入流程名称',
    enterFlowDescription: '请输入流程描述',
    cancel: '取消',
    confirm: '确定',
    name: '名称',
    description: '描述',
    editFlow: '编辑流程',
    confirmDelete: '确认删除',
    confirmDeleteFlow: '确定要删除流程"{name}"吗？',
    confirmDeleteFolder: '确定要删除文件夹"{name}"吗？文件夹下的所有文件将被删除。',
    flowDeleted: '流程删除成功',
    flowDeleteFailed: '删除流程失败',
    checkServer: '请检查服务器是否运行',
    flowRenamed: '流程重命名成功',
    flowRenameFailed: '重命名流程失败',
    flowCreated: '流程创建成功',
    flowCreateFailed: '创建流程失败',
    folderCreated: '分组创建成功',
    folderCreateFailed: '创建分组失败',
    folderDeleted: '文件夹删除成功',
    folderDeleteFailed: '删除文件夹失败',
    pleaseEnterFlowName: '请输入流程名称',
    pleaseEnterFlowDescription: '请输入流程描述',
    fileAlreadyExists: '文件已存在',
    folderAlreadyExists: '文件夹已存在',
    failedToEditFlow: '编辑流程失败',
    failedToCreateFlow: '创建流程失败',
    failedToDeleteFlow: '删除流程失败',
    failedToCreateFolder: '创建分组失败',
    failedToDeleteFolder: '删除文件夹失败'
  }
}

export default {
  name: 'FlowSection',
  components: {
    Folder,
    Plus,
    Delete,
    Document,
    Edit,
    Box
  },
  props: {
    language: {
      type: String,
      default: 'English'
    }
  },
  emits: ['create-flow', 'delete-flow', 'open-flow', 'rename-flow'],
  data() {
    return {
      contextMenuVisible: false,
      contextMenuType: 'empty',
      menuPosition: {
        x: 0,
        y: 0
      },
      rightClickNode: null,
      folderDialogVisible: false,
      folderName: '',
      flowDialogVisible: false,
      flowForm: {
        flowName: '',
        description: ''
      },
      flowRules: {
        flowName: [{ required: true, message: '', trigger: 'blur' }],
        description: [{ required: true, message: '', trigger: 'blur' }]
      },
      editFlowDialogVisible: false,
      editFlowForm: {
        flowName: '',
        description: ''
      },
      editFlowRules: {
        flowName: [{ required: true, message: '', trigger: 'blur' }],
        description: [{ required: true, message: '', trigger: 'blur' }]
      },
      flowFolders: [],
      flowFilesData: {},
      treeProps: {
        children: 'children',
        label: 'label'
      }
    }
  },
  computed: {
    treeData() {
      return this.flowFolders.map((folder, index) => ({
        id: `folder-${index}`,
        label: folder.name,
        type: 'folder',
        folderName: folder.name,
        children: (folder.files || []).map((file, fileIndex) => {
          const fileKey = `${folder.name}-${file}`
          const flowData = this.flowFilesData[fileKey]
          const components = flowData?.nodes?.map((node, nodeIndex) => ({
            id: `folder-${index}-file-${fileIndex}-component-${nodeIndex}`,
            label: node.data?.name || node.name,
            type: 'component',
            componentData: node
          })) || []
          
          return {
            id: `folder-${index}-file-${fileIndex}`,
            label: file,
            type: 'file',
            folderName: folder.name,
            fileName: file,
            children: components
          }
        })
      }))
    }
  },
  created() {
    document.addEventListener('click', this.closeContextMenu)
    this.loadFlowFolders()
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeContextMenu)
  },
  methods: {
    t(key, params = {}) {
      let text = messages[this.language]?.[key] || messages['English'][key]
      Object.keys(params).forEach(paramKey => {
        text = text.replace(`{${paramKey}}`, params[paramKey])
      })
      return text
    },
    getErrorMessage(error) {
      if (!error) return ''
      
      const errorLower = error.toLowerCase()
      
      if (errorLower.includes('file already exists') || 
          errorLower.includes('文件已存在') || 
          (errorLower.includes('文件') && errorLower.includes('已存在')) ||
          (errorLower.includes('流程') && errorLower.includes('已存在'))) {
        return this.t('fileAlreadyExists')
      }
      
      if (errorLower.includes('folder already exists') || errorLower.includes('文件夹已存在') || (errorLower.includes('文件夹') && errorLower.includes('已存在'))) {
        return this.t('folderAlreadyExists')
      }
      
      return error
    },
    handleContextMenu(event, node) {
      this.contextMenuType = node === null ? 'empty' : 'folder'
      this.rightClickNode = node
      this.menuPosition.x = event.clientX
      this.menuPosition.y = event.clientY
      this.contextMenuVisible = true
    },
    handleNodeContextMenu(event, data, node) {
      event.preventDefault()
      event.stopPropagation()
      
      if (data.type === 'component') {
        return
      }
      
      this.contextMenuType = data.type
      this.rightClickNode = data
      this.menuPosition.x = event.clientX
      this.menuPosition.y = event.clientY
      this.contextMenuVisible = true
    },
    handleNodeClick(data) {
    },
    handleNodeDoubleClick(data) {
      if (data.type === 'file') {
        console.log('双击流程节点:', data)
        this.$emit('open-flow', {
          folderName: data.folderName,
          flowName: data.label
        })
      }
    },
    handleFlowDragStart(event, data) {
      console.log('handleFlowDragStart 被调用', data)
      console.log('设置拖拽数据:', { isFlow: 'true', folderName: data.folderName, flowName: data.label })
      event.dataTransfer.setData('isFlow', 'true')
      event.dataTransfer.setData('folderName', data.folderName)
      event.dataTransfer.setData('flowName', data.label)
      event.dataTransfer.effectAllowed = 'copy'
    },
    handleComponentDragStart(event, data) {
      console.log('handleComponentDragStart 被调用', data)
      const node = data.componentData
      const componentData = {
        id: node.id,
        name: node.data?.name || node.name,
        description: node.data?.description || node.description || '',
        type: node.data?.type,
        data: node.data
      }
      console.log('设置组件拖拽数据:', componentData)
      event.dataTransfer.setData('isFromFlowSection', 'true')
      event.dataTransfer.setData('flowComponent', JSON.stringify(componentData))
      event.dataTransfer.effectAllowed = 'copy'
    },
    closeContextMenu() {
      this.contextMenuVisible = false
    },
    showFolderDialog() {
      this.folderDialogVisible = true
      this.folderName = ''
      this.contextMenuVisible = false
    },
    showFlowDialog() {
      this.flowDialogVisible = true
      this.flowForm = {
        flowName: '',
        description: ''
      }
      this.flowRules.flowName[0].message = this.t('pleaseEnterFlowName')
      this.flowRules.description[0].message = this.t('pleaseEnterFlowDescription')
      this.contextMenuVisible = false
      this.$nextTick(() => {
        if (this.$refs.flowForm) {
          this.$refs.flowForm.clearValidate()
        }
      })
    },
    async handleEditFlow() {
      if (this.rightClickNode && this.rightClickNode.type === 'file') {
        this.editFlowRules.flowName[0].message = this.t('pleaseEnterFlowName')
        this.editFlowRules.description[0].message = this.t('pleaseEnterFlowDescription')
        
        try {
          const response = await fetch(`/api/get-flow-file?folderName=${encodeURIComponent(this.rightClickNode.folderName)}&flowName=${encodeURIComponent(this.rightClickNode.fileName)}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            this.editFlowForm.flowName = this.rightClickNode.label
            this.editFlowForm.description = result.data.description || ''
          } else {
            this.editFlowForm.flowName = this.rightClickNode.label
            this.editFlowForm.description = ''
          }
        } catch (error) {
          console.error('读取流程文件失败:', error)
          this.editFlowForm.flowName = this.rightClickNode.label
          this.editFlowForm.description = ''
        }
        
        this.$nextTick(() => {
          if (this.$refs.editFlowForm) {
            this.$refs.editFlowForm.clearValidate()
          }
        })
        
        this.editFlowDialogVisible = true
        this.contextMenuVisible = false
      }
    },
    async handleDeleteFlow() {
      if (this.rightClickNode && this.rightClickNode.type === 'file') {
        try {
          await ElMessageBox.confirm(
            this.t('confirmDeleteFlow', { name: this.rightClickNode.label }),
            this.t('confirmDelete'), 
            {
              confirmButtonText: this.t('confirm'),
              cancelButtonText: this.t('cancel'),
              type: 'warning'
            }
          )

          const response = await fetch('/api/delete-flow-file', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              folderName: this.rightClickNode.folderName,
              fileName: this.rightClickNode.fileName
            })
          })

          if (!response.ok) {
            let errorMessage = this.t('failedToDeleteFlow')
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch (e) {
              try {
                errorMessage = await response.text()
              } catch (e2) {}
            }
            console.error('删除流程失败:', errorMessage)
            ElMessage.error(this.getErrorMessage(errorMessage))
            return
          }

          const data = await response.json()

          if (data.success) {
            console.log('流程删除成功:', data.filePath)
            ElMessage.success(this.t('flowDeleted'))
            const flowName = this.rightClickNode.label
            await this.loadFlowFolders()
            this.$emit('delete-flow', flowName)
          } else {
            console.error('删除流程失败:', data.error)
            ElMessage.error(this.getErrorMessage(data.error))
          }
        } catch (error) {
          if (error !== 'cancel') {
            console.error('删除流程失败:', error)
            ElMessage.error(this.t('flowDeleteFailed') + this.t('checkServer'))
          }
        }
        this.contextMenuVisible = false
      }
    },
    async confirmEditFlow() {
      if (this.$refs.editFlowForm) {
        await this.$refs.editFlowForm.validate(async (valid) => {
          if (valid && this.rightClickNode && this.rightClickNode.type === 'file') {
            try {
              const response = await fetch('/api/edit-flow-file', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  folderName: this.rightClickNode.folderName,
                  oldFileName: this.rightClickNode.fileName,
                  newFileName: this.editFlowForm.flowName,
                  description: this.editFlowForm.description
                })
              })

              if (!response.ok) {
                let errorMessage = this.t('failedToEditFlow')
                try {
                  const errorData = await response.json()
                  errorMessage = errorData.error || errorMessage
                } catch (e) {
                  try {
                    errorMessage = await response.text()
                  } catch (e2) {}
                }
                console.error('编辑流程失败:', errorMessage)
                ElMessage.error(this.getErrorMessage(errorMessage))
                return
              }

              const data = await response.json()

              if (data.success) {
                console.log('流程编辑成功:', data.newFilePath)
                ElMessage.success(this.t('flowRenamed'))
                await this.loadFlowFolders()
                
                if (this.rightClickNode.fileName !== this.editFlowForm.flowName) {
                  this.$emit('rename-flow', {
                    oldFolderName: this.rightClickNode.folderName,
                    oldFlowName: this.rightClickNode.fileName,
                    newFlowName: this.editFlowForm.flowName
                  })
                }
              } else {
                console.error('编辑流程失败:', data.error)
                ElMessage.error(this.getErrorMessage(data.error))
              }
            } catch (error) {
              console.error('编辑流程失败:', error)
              ElMessage.error(this.t('flowRenameFailed') + this.t('checkServer'))
            }

            this.editFlowDialogVisible = false
            this.editFlowForm.flowName = ''
            this.editFlowForm.description = ''
          }
        })
      }
    },
    async confirmFlow() {
      if (this.$refs.flowForm) {
        await this.$refs.flowForm.validate(async (valid) => {
          if (valid && this.rightClickNode && this.rightClickNode.type === 'folder') {
            try {
              const folderName = this.rightClickNode.label
              const response = await fetch('/api/create-flow-file', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  folderName, 
                  flowName: this.flowForm.flowName,
                  description: this.flowForm.description
                })
              })

              if (!response.ok) {
                let errorMessage = this.t('failedToCreateFlow')
                try {
                  const errorData = await response.json()
                  errorMessage = errorData.error || errorMessage
                } catch (e) {
                  try {
                    errorMessage = await response.text()
                  } catch (e2) {}
                }
                console.error('创建流程失败:', errorMessage)
                ElMessage.error(this.getErrorMessage(errorMessage))
                return
              }

              const data = await response.json()

              if (data.success) {
                console.log('流程创建成功:', data.filePath)
                ElMessage.success(this.t('flowCreated'))
                await this.loadFlowFolders()
                this.$emit('create-flow', {
                  folderName: folderName,
                  flowName: this.flowForm.flowName,
                  description: this.flowForm.description
                })
              } else {
                console.error('创建流程失败:', data.error)
                ElMessage.error(this.getErrorMessage(data.error))
              }
            } catch (error) {
              console.error('创建流程失败:', error)
              ElMessage.error(this.t('flowCreateFailed') + this.t('checkServer'))
            }

            this.flowDialogVisible = false
          }
        })
      }
    },
    async handleDeleteFolder(data) {
      try {
        await ElMessageBox.confirm(
          this.t('confirmDeleteFolder', { name: data.label }),
          this.t('confirmDelete'), 
          {
            confirmButtonText: this.t('confirm'),
            cancelButtonText: this.t('cancel'),
            type: 'warning'
          }
        )

        const response = await fetch('/api/delete-flow-folder', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ folderName: data.label })
        })

        if (!response.ok) {
          let errorMessage = this.t('failedToDeleteFolder')
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (e) {
            try {
              errorMessage = await response.text()
            } catch (e2) {}
          }
          console.error('删除文件夹失败:', errorMessage)
          ElMessage.error(this.getErrorMessage(errorMessage))
          return
        }

        const resData = await response.json()

        if (resData.success) {
          console.log('文件夹删除成功:', resData.folderPath)
          ElMessage.success(this.t('folderDeleted'))
          await this.loadFlowFolders()
        } else {
          console.error('删除文件夹失败:', resData.error)
          ElMessage.error(this.getErrorMessage(resData.error))
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除文件夹失败:', error)
          ElMessage.error(this.t('folderDeleteFailed') + this.t('checkServer'))
        }
      }
    },
    async loadFlowFolders() {
      try {
        const response = await fetch('/api/get-flow-folders', {
          method: 'GET'
        })

        const data = await response.json()

        if (data.success) {
          this.flowFolders = data.folders
          
          this.flowFilesData = {}
          for (const folder of data.folders) {
            for (const file of folder.files || []) {
              try {
                const fileResponse = await fetch(`/api/get-flow-file?folderName=${encodeURIComponent(folder.name)}&flowName=${encodeURIComponent(file)}`)
                const fileData = await fileResponse.json()
                if (fileData.success && fileData.data) {
                  const fileKey = `${folder.name}-${file}`
                  this.flowFilesData[fileKey] = fileData.data
                }
              } catch (error) {
                console.error(`读取流程文件 ${folder.name}/${file} 失败:`, error)
              }
            }
          }
        }
      } catch (error) {
        console.error('获取文件夹列表失败:', error)
      }
    },
    async confirmFolder() {
      if (this.folderName.trim()) {
        try {
          const response = await fetch('/api/create-flow-folder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ folderName: this.folderName })
          })

          if (!response.ok) {
            let errorMessage = this.t('failedToCreateFolder')
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch (e) {
              try {
                errorMessage = await response.text()
              } catch (e2) {}
            }
            console.error('创建分组失败:', errorMessage)
            ElMessage.error(this.getErrorMessage(errorMessage))
            return
          }

          const data = await response.json()

          if (data.success) {
            console.log('分组创建成功:', data.folderPath)
            ElMessage.success(this.t('folderCreated'))
            await this.loadFlowFolders()
          } else {
            console.error('创建分组失败:', data.error)
            ElMessage.error(this.getErrorMessage(data.error))
          }
        } catch (error) {
          console.error('创建分组失败:', error)
          ElMessage.error(this.t('folderCreateFailed') + this.t('checkServer'))
        }

        this.folderDialogVisible = false
        this.folderName = ''
      }
    }
  }
}
</script>

<style scoped>
.flow-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin: 2px;
  position: relative;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.flow-tree {
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  height: 0;
}

.flow-tree :deep(.el-tree) {
  background: transparent;
}

.flow-tree::-webkit-scrollbar {
  width: 8px;
}

.flow-tree::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.flow-tree::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.flow-tree::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.flow-tree :deep(.el-empty) {
  padding: 40px 0;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding-right: 8px;
}

.folder-icon,
.file-icon {
  font-size: 14px;
  color: #606266;
}

.component-icon {
  font-size: 14px;
  color: #409eff;
}

.node-label {
  flex: 1;
  color: #303133;
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

.context-menu {
  position: fixed;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 9999 !important;
  min-width: 150px;
  pointer-events: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
}

.menu-item:hover {
  background-color: #f5f7fa;
}

.menu-item el-icon {
  font-size: 14px;
  color: #606266;
}

.menu-item span {
  color: #606266;
}

.folder-dialog {
  z-index: 9999 !important;
}

.folder-dialog :deep(.el-dialog) {
  z-index: 9999 !important;
}

.folder-dialog :deep(.el-dialog__wrapper) {
  z-index: 9999 !important;
}
</style>
