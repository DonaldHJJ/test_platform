<template>
  <div class="app">
    <TopHeader 
      @run="handleRun" 
      @export-report="handleExportReport" 
      @save="handleSave"
      :language="currentLanguage"
      @language-change="handleLanguageChange"
    />
    
    <div class="main-content">
      <div class="left-panel-container">
        <LeftPanel 
          ref="leftPanel"
          :width="leftPanelWidth" 
          :language="currentLanguage"
          @command-click="handleCommandClick"
          @show-context-menu="showContextMenu"
          @delete-group="handleDeleteGroup"
          @edit-command="handleEditCommand"
        />
        <div class="resizer resizer-right" 
             @mousedown="startResizing('left', $event, 'width')"></div>
      </div>
      
      <div class="center-area">
        <EditorPanel 
          ref="editorPanel" 
          :global-variables="globalVariables"
          :language="currentLanguage"
          @add-tab-click="handleAddTabClick"
          @drop-command="handleDropCommand"
          @drop-custom-command="handleDropCustomCommand"
          @drop-flow="handleDropFlow"
          @load-global-variables="handleLoadGlobalVariables"
          @active-tab-change="handleActiveTabChange"
          @step-double-click="handleStepDoubleClick"
          @step-delete="handleStepDelete"
        />
        
        <div class="bottom-panel-container">
          <div class="resizer resizer-top" 
               @mousedown="startResizing('bottom', $event, 'height')"></div>
          <BottomPanel :height="bottomPanelHeight" :language="currentLanguage" :active-tab-name="currentActiveTabName" />
        </div>
      </div>
      
      <div class="right-panel-container">
        <div class="resizer resizer-left" 
             @mousedown="startResizing('right', $event, 'width')"></div>
        <RightPanel 
          ref="rightPanel"
          :width="rightPanelWidth" 
          :variables-height="variablesSectionHeight"
          :global-variables="globalVariables"
          :language="currentLanguage"
          @add-variable="handleAddVariable"
          @edit-variable="handleEditVariable"
          @create-flow="handleCreateFlow"
          @delete-flow="handleDeleteFlow"
          @open-flow="handleOpenFlow"
          @rename-flow="handleRenameFlow"
          @delete-folder="handleDeleteFolder"
        />
      </div>
    </div>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenuVisible" 
      class="context-menu" 
      :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
    >
      <div class="menu-item" v-if="clickOnEmpty" @click="showGroupDialog">
        <el-icon><Plus /></el-icon>
        <span>{{ t('newGroup') }}</span>
      </div>
      <div class="menu-item" v-if="!clickOnEmpty && contextMenuType === 'group'" @click="addServerCommand">
        <el-icon><Monitor /></el-icon>
        <span>{{ t('newServerComponent') }}</span>
      </div>
      <div class="menu-item" v-if="!clickOnEmpty && contextMenuType === 'group'" @click="addAPICommand">
        <el-icon><Connection /></el-icon>
        <span>{{ t('newAPIComponent') }}</span>
      </div>
      <div class="menu-item" v-if="!clickOnEmpty && contextMenuType === 'group'" @click="addWebCommand">
        <el-icon><Link /></el-icon>
        <span>{{ t('newWebComponent') }}</span>
      </div>
      <div class="menu-item" v-if="!clickOnEmpty && contextMenuType === 'group'" @click="addDatabaseCommand">
        <el-icon><Document /></el-icon>
        <span>{{ t('newDatabaseComponent') }}</span>
      </div>
      <div class="menu-item" v-if="!clickOnEmpty && contextMenuType === 'group'" @click="addOtherCommand">
        <el-icon><Setting /></el-icon>
        <span>{{ t('newOtherComponent') }}</span>
      </div>
      <div class="menu-item" v-if="contextMenuType === 'command'" @click="editCommand">
        <el-icon><Edit /></el-icon>
        <span>{{ t('edit') }}</span>
      </div>
      <div class="menu-item" v-if="contextMenuType === 'command'" @click="deleteCommand">
        <el-icon><Delete /></el-icon>
        <span>{{ t('delete') }}</span>
      </div>
    </div>

    <!-- 新建分组弹窗 -->
    <el-dialog 
      v-model="groupDialogVisible" 
      :title="t('newGroup')" 
      width="400px"
      class="group-dialog"
    >
      <el-input v-model="groupName" :placeholder="t('pleaseEnterGroupName')" clearable></el-input>
      <template #footer>
        <el-button @click="groupDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmGroup">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑全局变量弹窗 -->
    <el-dialog 
      v-model="variableDialogVisible" 
      :title="editingVariableIndex !== null ? t('editGlobalVariable') : t('addGlobalVariable')" 
      width="400px"
      class="variable-dialog"
    >
      <el-form label-width="80px">
        <el-form-item :label="t('variableName')">
          <el-input v-model="variableName" :placeholder="t('pleaseEnterVariableName')"></el-input>
        </el-form-item>
        <el-form-item :label="t('type')">
          <el-select v-model="variableType" :placeholder="t('pleaseSelectType')">
            <el-option label="Integer" value="Integer"></el-option>
            <el-option label="String" value="String"></el-option>
            <el-option label="Object" value="Object"></el-option>
            <el-option label="Boolean" value="Boolean"></el-option>
            <el-option label="Array" value="Array"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <template v-if="editingVariableIndex !== null">
          <el-button type="danger" @click="deleteVariable">{{ t('delete') }}</el-button>
        </template>
        <el-button @click="variableDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmVariable">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑服务器组件弹窗 -->
    <el-dialog 
      v-model="serverCommandDialogVisible" 
      :title="isEditingCommand ? t('editServerComponent') : t('newServerComponent')" 
      width="500px"
      class="server-command-dialog"
    >
      <el-form ref="serverCommandForm" :model="serverCommandForm" :rules="serverCommandRules" label-width="80px">
        <el-form-item :label="t('componentName')" prop="name">
          <el-input v-model="serverCommandForm.name" :placeholder="t('pleaseEnterComponentName')"></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input v-model="serverCommandForm.description" type="textarea" :placeholder="t('pleaseEnterDescription')"></el-input>
        </el-form-item>
        <el-form-item :label="t('host')" prop="host">
          <el-input v-model="serverCommandForm.host" :placeholder="t('pleaseEnterHost')"></el-input>
        </el-form-item>
        <el-form-item :label="t('uploadFile')">
          <el-switch v-model="serverCommandForm.uploadFile" @change="handleUploadFileChange"></el-switch>
        </el-form-item>
        <el-form-item v-if="!serverCommandForm.uploadFile" :label="t('component')" prop="command">
          <el-input v-model="serverCommandForm.command" type="textarea" :placeholder="t('pleaseEnterComponent')"></el-input>
        </el-form-item>
        <template v-else>
          <el-form-item :label="t('path')" prop="path">
            <el-input v-model="serverCommandForm.path" :placeholder="t('pleaseEnterPath')"></el-input>
          </el-form-item>
          <el-form-item :label="t('file')" prop="serverFile" class="required-item">
            <el-upload
              ref="upload"
              :auto-upload="true"
              :action="'/api/upload-file'"
              :limit="1"
              :file-list="uploadedFileList"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :on-remove="handleUploadRemove"
            >
              <el-button type="primary">{{ t('selectFile') }}</el-button>
              <template #tip>
                <div class="el-upload__tip">
                  {{ t('onlyUploadOneFile') }}
                </div>
              </template>
            </el-upload>
          </el-form-item>
        </template>
        <el-form-item v-if="!serverCommandForm.uploadFile" :label="t('resultVariable')">
          <el-input v-model="serverCommandForm.resultVariable" :placeholder="t('pleaseEnterResultVariable')"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="serverCommandDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmServerCommand">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑API组件弹窗 -->
    <el-dialog 
      v-model="apiCommandDialogVisible" 
      :title="isEditingCommand ? t('editAPIComponent') : t('newAPIComponent')" 
      width="500px"
      class="api-command-dialog"
    >
      <el-form ref="apiCommandForm" :model="apiCommandForm" :rules="apiCommandRules" label-width="80px">
        <el-form-item :label="t('componentName')" prop="name">
          <el-input v-model="apiCommandForm.name" :placeholder="t('pleaseEnterComponentName')"></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input v-model="apiCommandForm.description" type="textarea" :placeholder="t('pleaseEnterDescription')"></el-input>
        </el-form-item>
        <el-form-item :label="t('url')" prop="url">
          <el-input v-model="apiCommandForm.url" :placeholder="t('pleaseEnterUrl')"></el-input>
        </el-form-item>
        <el-form-item :label="t('method')" prop="method">
          <el-select v-model="apiCommandForm.method" :placeholder="t('pleaseSelectRequestMethod')">
            <el-option label="POST" value="POST"></el-option>
            <el-option label="GET" value="GET"></el-option>
            <el-option label="DELETE" value="DELETE"></el-option>
            <el-option label="PUT" value="PUT"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('requestHeaders')">
          <el-input v-model="apiCommandForm.headers" type="textarea" :placeholder="t('pleaseEnterHeaders')"></el-input>
        </el-form-item>
        <el-form-item :label="t('requestBody')">
          <el-input v-model="apiCommandForm.body" type="textarea" :placeholder="t('pleaseEnterBody')"></el-input>
        </el-form-item>
        <el-form-item :label="t('resultVariable')">
          <el-input v-model="apiCommandForm.resultVariable" :placeholder="t('pleaseEnterResultVariable')"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="apiCommandDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmAPICommand">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑WEB组件弹窗 -->
    <el-dialog 
      v-model="webCommandDialogVisible" 
      :title="isEditingCommand ? t('editWebComponent') : t('newWebComponent')" 
      width="500px"
      class="web-command-dialog"
    >
      <el-form ref="webCommandForm" :model="webCommandForm" :rules="webCommandRules" label-width="80px">
        <el-form-item :label="t('componentName')" prop="name">
          <el-input v-model="webCommandForm.name" :placeholder="t('pleaseEnterWebComponentName')"></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input v-model="webCommandForm.description" type="textarea" :placeholder="t('pleaseEnterDescription')"></el-input>
        </el-form-item>
        <el-form-item :label="t('action')" prop="action">
          <el-select v-model="webCommandForm.action" :placeholder="t('pleaseEnterAction')">
            <el-option :label="t('openLink')" value="open-link"></el-option>
            <el-option :label="t('click')" value="click"></el-option>
            <el-option :label="t('doubleClick')" value="double-click"></el-option>
            <el-option :label="t('rightClick')" value="right-click"></el-option>
            <el-option :label="t('input')" value="input"></el-option>
            <el-option :label="t('getValue')" value="get-value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="['click', 'double-click', 'right-click', 'input', 'get-value'].includes(webCommandForm.action)" :label="t('name')" prop="element">
          <el-input v-model="webCommandForm.element" :placeholder="t('pleaseEnterElementSelector')"></el-input>
        </el-form-item>
        <el-form-item v-if="['input', 'open-link'].includes(webCommandForm.action)" :label="t('value')" prop="inputValue">
          <el-input v-model="webCommandForm.inputValue" :placeholder="webCommandForm.action === 'open-link' ? t('pleaseEnterUrl') : t('pleaseEnterValue')"></el-input>
        </el-form-item>
        <el-form-item v-if="webCommandForm.action === 'get-value'" :label="t('resultVariable')">
          <el-input v-model="webCommandForm.resultVariable" :placeholder="t('pleaseEnterResultVariable')"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="webCommandDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmWebCommand">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑其它组件弹窗 -->
    <el-dialog 
      v-model="otherCommandDialogVisible" 
      :title="isEditingCommand ? t('editOtherComponent') : t('newOtherComponent')" 
      width="600px"
    >
      <el-form ref="otherCommandForm" :model="otherCommandForm" :rules="otherCommandRules" label-width="100px">
        <el-form-item :label="t('componentName')" prop="name">
          <el-input v-model="otherCommandForm.name" :placeholder="t('pleaseEnterOtherComponentName')" clearable></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input v-model="otherCommandForm.description" type="textarea" :placeholder="t('pleaseEnterDescription')" :rows="3"></el-input>
        </el-form-item>
        <el-form-item :label="t('subType')" prop="subType">
          <el-select v-model="otherCommandForm.subType" :placeholder="t('pleaseEnterSubType')" @change="handleOtherTypeChange">
            <el-option :label="t('wait')" value="wait"></el-option>
            <el-option :label="t('compareValue')" value="compareValue"></el-option>
            <el-option :label="t('compareFile')" value="compareFile"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="otherCommandForm.subType === 'compareValue' || otherCommandForm.subType === 'compareFile'" :label="t('variable')" prop="resultVariable">
          <el-select v-model="otherCommandForm.resultVariable" :placeholder="t('pleaseSelectVariable')" clearable>
            <template v-if="isFromDrag || editingStepId">
              <el-option v-for="variable in allResultVariables" :key="variable" :label="variable" :value="variable"></el-option>
            </template>
          </el-select>
        </el-form-item>
        <el-form-item v-if="otherCommandForm.subType === 'compareValue'" :label="t('relation')" prop="relation">
          <el-select v-model="otherCommandForm.relation" :placeholder="t('pleaseSelectRelation')" @change="handleRelationChange">
            <el-option :label="t('isNull')" value="isNull"></el-option>
            <el-option :label="t('isNotNull')" value="isNotNull"></el-option>
            <el-option :label="t('lessThan')" value="lessThan"></el-option>
            <el-option :label="t('lessThanOrEqual')" value="lessThanOrEqual"></el-option>
            <el-option :label="t('equal')" value="equal"></el-option>
            <el-option :label="t('greaterThanOrEqual')" value="greaterThanOrEqual"></el-option>
            <el-option :label="t('greaterThan')" value="greaterThan"></el-option>
            <el-option :label="t('contains')" value="contains"></el-option>
            <el-option :label="t('notContains')" value="notContains"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="otherCommandForm.subType === 'wait'" :label="t('waitTime')" prop="waitTime">
          <el-row :gutter="10">
            <el-col :span="14">
              <el-input v-model="otherCommandForm.waitTime" :placeholder="t('pleaseEnterWaitTime')" clearable></el-input>
            </el-col>
            <el-col :span="10">
              <el-form-item prop="waitUnit" style="margin-bottom: 0;">
                <el-select v-model="otherCommandForm.waitUnit" :placeholder="t('type')" style="width: 100%;">
                  <el-option :label="t('millisecond')" value="ms"></el-option>
                  <el-option :label="t('second')" value="s"></el-option>
                  <el-option :label="t('minute')" value="m"></el-option>
                  <el-option :label="t('hour')" value="h"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item v-if="otherCommandForm.subType === 'compareValue' && otherCommandForm.relation !== 'isNull' && otherCommandForm.relation !== 'isNotNull'" :label="t('compareValueLabel')" prop="compareValue">
          <el-input v-model="otherCommandForm.compareValue" :placeholder="t('pleaseEnterCompareValue')" clearable></el-input>
        </el-form-item>
        <el-form-item v-if="otherCommandForm.subType === 'compareFile'" :label="t('compareFileLabel')" prop="compareFile">
          <el-upload
            ref="otherUpload"
            :auto-upload="true"
            :action="'/api/upload-file'"
            :limit="1"
            :file-list="otherUploadedFileList"
            :on-success="handleOtherUploadSuccess"
            :on-error="handleOtherUploadError"
            :on-remove="handleOtherUploadRemove"
          >
            <el-button type="primary">{{ t('selectFile') }}</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="otherCommandForm.subType === 'compareFile'" :label="t('ignoreFields')">
          <el-input v-model="otherCommandForm.ignoreFields" type="textarea" :placeholder="t('pleaseEnterIgnoreFields')" :rows="3"></el-input>
        </el-form-item>
        <el-form-item v-if="otherCommandForm.subType === 'compareFile'" :label="t('replaceFields')">
          <div style="width: 100%;">
            <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
              <el-button type="primary" size="small" @click="addReplaceItem">{{ t('add') }}</el-button>
            </div>
            <el-table :data="otherCommandForm.replaceList" border size="small">
              <el-table-column :label="t('startText')" prop="start" align="center">
                <template #default="{ row, $index }">
                  <el-input v-model="row.start" :placeholder="t('startText')" size="small"></el-input>
                </template>
              </el-table-column>
              <el-table-column :label="t('endText')" prop="end" align="center">
                <template #default="{ row, $index }">
                  <el-input v-model="row.end" :placeholder="t('endText')" size="small"></el-input>
                </template>
              </el-table-column>
              <el-table-column :label="t('replaceValue')" prop="value" align="center">
                <template #default="{ row, $index }">
                  <el-input v-model="row.value" :placeholder="t('replaceValue')" size="small"></el-input>
                </template>
              </el-table-column>
              <el-table-column :label="t('action')" width="80" align="center">
                <template #default="{ $index }">
                  <el-button type="danger" size="small" link @click="removeReplaceItem($index)">{{ t('delete') }}</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="otherCommandDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmOtherCommand">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑数据库组件弹窗 -->
    <el-dialog 
      v-model="databaseCommandDialogVisible" 
      :title="isEditingCommand ? t('editDatabaseComponent') : t('newDatabaseComponent')" 
      width="500px"
      class="database-command-dialog"
    >
      <el-form ref="databaseCommandForm" :model="databaseCommandForm" :rules="databaseCommandRules" label-width="100px">
        <el-form-item :label="t('componentName')" prop="name">
          <el-input v-model="databaseCommandForm.name" :placeholder="t('pleaseEnterComponentName')" clearable></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input v-model="databaseCommandForm.description" type="textarea" :placeholder="t('pleaseEnterDescription')" :rows="3"></el-input>
        </el-form-item>
        <el-form-item :label="t('url')" prop="url">
          <el-input v-model="databaseCommandForm.url" :placeholder="t('pleaseEnterUrl')" clearable></el-input>
        </el-form-item>
        <el-form-item :label="t('scriptType')" prop="type">
          <el-select v-model="databaseCommandForm.type" :placeholder="t('pleaseSelectType')" @change="handleDatabaseTypeChange">
            <el-option :label="t('sqlStatement')" value="sql"></el-option>
            <el-option :label="t('sqlFile')" value="file"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="databaseCommandForm.type === 'sql'" :label="t('sqlStatement')" prop="sql" class="required-item">
          <el-input v-model="databaseCommandForm.sql" type="textarea" :placeholder="t('pleaseEnterSQL')" :rows="4"></el-input>
        </el-form-item>
        <el-form-item v-if="databaseCommandForm.type === 'file'" :label="t('sqlFile')" prop="sqlFile" class="required-item">
          <el-upload
            ref="databaseUpload"
            :auto-upload="true"
            :action="'/api/upload-file'"
            :limit="1"
            accept=".sql"
            :before-upload="beforeDatabaseUpload"
            :file-list="databaseUploadedFileList"
            :on-success="handleDatabaseUploadSuccess"
            :on-error="handleDatabaseUploadError"
            :on-remove="handleDatabaseUploadRemove"
          >
            <el-button type="primary">{{ t('selectFile') }}</el-button>
            <template #tip>
              <div class="el-upload__tip">
                {{ t('onlyUploadOneFile') }}
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item :label="t('resultVariable')">
          <el-input v-model="databaseCommandForm.resultVariable" :placeholder="t('pleaseEnterResultVariable')" clearable></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="databaseCommandDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmDatabaseCommand">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 保存流程弹窗 -->
    <el-dialog 
      v-model="saveFlowDialogVisible" 
      :title="t('saveFlow')" 
      width="400px"
      class="save-flow-dialog"
    >
      <el-form ref="saveFlowForm" :model="saveFlowForm" :rules="saveFlowRules" label-width="80px">
        <el-form-item :label="t('flowName')" prop="flowName">
          <el-input v-model="saveFlowForm.flowName" :placeholder="t('enterFlowName')" clearable></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input 
            v-model="saveFlowForm.description" 
            type="textarea" 
            :rows="3"
            :placeholder="t('enterFlowDescription')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="t('folder')" prop="folderName">
          <el-select v-model="saveFlowForm.folderName" :placeholder="t('enterFolderName')">
            <el-option 
              v-for="folder in flowFolders" 
              :key="folder.name" 
              :label="folder.name" 
              :value="folder.name"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveFlowDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmSaveFlow">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新建流程弹窗 -->
    <el-dialog 
      v-model="createFlowDialogVisible" 
      :title="t('createFlow')" 
      width="400px"
      class="create-flow-dialog"
    >
      <el-form ref="createFlowForm" :model="createFlowForm" :rules="createFlowRules" label-width="80px">
        <el-form-item :label="t('flowName')" prop="flowName">
          <el-input v-model="createFlowForm.flowName" :placeholder="t('enterFlowName')" clearable></el-input>
        </el-form-item>
        <el-form-item :label="t('description')" prop="description">
          <el-input 
            v-model="createFlowForm.description" 
            type="textarea" 
            :rows="3"
            :placeholder="t('enterFlowDescription')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="t('folder')" prop="folderName">
          <el-select v-model="createFlowForm.folderName" :placeholder="t('enterFolderName')">
            <el-option 
              v-for="folder in flowFolders" 
              :key="folder.name" 
              :label="folder.name" 
              :value="folder.name"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createFlowDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="confirmCreateFlow">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Monitor, Connection, Document, ArrowRight, ArrowDown, Plus, Link, Edit, Delete, Setting } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopHeader from './components/TopHeader.vue'
import LeftPanel from './components/LeftPanel.vue'
import EditorPanel from './components/EditorPanel.vue'
import BottomPanel from './components/BottomPanel.vue'
import RightPanel from './components/RightPanel.vue'
import apiConfig from './config/api.js'

const messages = {
  'English': {
    pageTitle: 'Test Case Management Platform',
    newGroup: 'New Group',
    newServerComponent: 'New Server Component',
    newAPIComponent: 'New API Component',
    newWebComponent: 'New Web Component',
    newDatabaseComponent: 'New Database Component',
    newOtherComponent: 'New Other Component',
    edit: 'Edit',
    delete: 'Delete',
    pleaseEnterGroupName: 'Please enter group name',
    cancel: 'Cancel',
    confirm: 'Confirm',
    addGlobalVariable: 'Add Global Variable',
    editGlobalVariable: 'Edit Global Variable',
    variableName: 'Name',
    pleaseEnterVariableName: 'Please enter variable name',
    type: 'Type',
    scriptType: 'Script',
    pleaseSelectType: 'Please select type',
    pleaseEnterComponentName: 'Please enter name',
    pleaseEnterDescription: 'Please enter description',
    pleaseEnterHost: 'Please enter host',
    pleaseEnterComponent: 'Please enter shell',
    pleaseEnterPath: 'Please enter path',
    pleaseEnterUrl: 'Please enter URL',
    pleaseSelectRequestMethod: 'Please select request method',
    pleaseEnterHeaders: 'Please enter headers (JSON format)',
    pleaseEnterBody: 'Please enter body (JSON format)',
    pleaseEnterResultVariable: 'Please enter variable',
    pleaseEnterWebComponentName: 'Please enter web component name',
    pleaseEnterAction: 'Please select action',
    openLink: 'Open Link',
    click: 'Click',
    doubleClick: 'Double Click',
    rightClick: 'Right Click',
    input: 'Input',
    getValue: 'Get Value',
    pleaseEnterElementSelector: 'Please enter element',
    pleaseEnterValue: 'Please enter value',
    pleaseEnterOtherComponentName: 'Please enter other component name',
    pleaseEnterSubType: 'Please select type',
    wait: 'Wait',
    compareValue: 'Compare Value',
    compareFile: 'Compare File',
    element: 'Element',
    variable: 'Variable',
    relation: 'Relation',
    pleaseSelectVariable: 'Please select variable',  
    pleaseSelectElement: 'Please select element',
    pleaseSelectRelation: 'Please select relation',
    isNull: 'Is Null',
    isNotNull: 'Is Not Null',
    lessThan: 'Less Than',
    lessThanOrEqual: 'Less Than or Equal',
    equal: 'Equal',
    greaterThanOrEqual: 'Greater Than or Equal',
    greaterThan: 'Greater Than',
    contains: 'Contains',
    notContains: 'Not Contains',
    pleaseEnterWaitTime: 'Please enter wait time',
    millisecond: 'ms',
    second: 's',
    minute: 'm',
    hour: 'h',
    pleaseEnterCompareValue: 'Please enter compare value',
    selectFile: 'Select File',
    onlyUploadOneFile: 'Only 1 file can be uploaded',
    pleaseEnterIgnoreFields: 'Please enter ignore fields, separated by commas',
    field: 'Field',
    startText: 'Start Text',
    endText: 'End Text',
    replaceValue: 'Value',
    action: 'Action',
    add: 'Add',
    editServerComponent: 'Edit Server Component',
    editAPIComponent: 'Edit API Component',
    editWebComponent: 'Edit Web Component',
    editDatabaseComponent: 'Edit Database Component',
    editOtherComponent: 'Edit Other Component',
    uploadFile: 'Upload',
    saveFlow: 'Save Flow',
    flowName: 'Name',
    enterFlowName: 'Please enter flow name',
    enterFlowDescription: 'Please enter flow description',
    enterFolderName: 'Please select folder',
    createFlow: 'Create Flow',
    variableAlreadyExists: 'Variable name already exists',
    componentNameAlreadyExists: 'Component name already exists',
    fileAlreadyExists: 'File already exists',
    folderAlreadyExists: 'Folder already exists',
    saveSuccess: 'Save Success',
    createSuccess: 'Create Success',
    createFailed: 'Create Failed',
    runSuccess: 'Run Success',
    runFailed: 'Run Failed',
    noActiveTab: 'No active tab',
    pleaseCheckServer: 'Please check if server is running',
    confirmDownloadReport: 'Confirm download report?',
    downloadReport: 'Download Report',
    noReportFile: 'No report file found',
    pleaseSaveFirst: 'Please save the flow first',
    loadFailed: 'Load Failed',
    saveFailed: 'Save Failed',
    renameSuccess: 'Rename Success',
    renameFailed: 'Rename Failed',
    deleteSuccess: 'Delete Success',
    deleteFailed: 'Delete Failed',
    confirmDelete: 'Confirm Delete',
    confirmDeleteFlow: 'Are you sure you want to delete flow "{name}"?',
    confirmDeleteFolder: 'Are you sure you want to delete folder "{name}"? All files in the folder will be deleted.',
    name: 'Element',
    value: 'Value',
    description: 'Description',
    folder: 'Folder',
    componentName: 'Name',
    host: 'Host',
    component: 'Shell',
    path: 'Path',
    url: 'URL',
    method: 'Method',
    requestHeaders: 'Hearders',
    requestBody: 'Body',
    resultVariable: 'Variable',
    webComponentName: 'Web Component Name',
    otherComponentName: 'Other Component Name',
    subType: 'Type',
    waitTime: 'Wait Time',
    compareValueLabel: 'Value',
    compareFileLabel: 'File',
    ignoreFields: 'Ignore',
    replaceFields: 'Replace',
    file: 'File',
    sqlFile: 'SQL File',
    sqlStatement: 'SQL Statement',
    pleaseEnterName: 'Please enter name',
    pleaseEnterShell: 'Please enter shell',
    pleaseEnterVariable: 'Please enter variable',
    pleaseEnterFlowName: 'Please enter flow name',
    pleaseEnterFlowDescription: 'Please enter flow description',
    pleaseSelectFolder: 'Please select folder',
    pleaseEnterElement: 'Please enter element',
    cannotDragToSelf: 'Cannot drag current tab to itself',
    componentNotFound: 'Component not found',
    groupNotFound: 'Group not found',
    componentDeleteSuccess: 'Component deleted successfully',
    componentDeleteFailed: 'Failed to delete component',
    fileUploadSuccess: 'File uploaded successfully',
    fileUploadFailed: 'File upload failed',
    sqlFileOnly: 'Only .sql files are allowed',
    pleaseSelectGroup: 'Please select a group',
    componentAddedSuccess: 'Component added successfully',
    flowIsRunning: 'Flow is already running, please wait for it to complete',
    runFailed: 'Run failed',
    createServerComponentFailed: 'Failed to create server component, please check if server is running',
    updateServerComponentFailed: 'Failed to update server component, please check if server is running',
    createAPIComponentFailed: 'Failed to create API component, please check if server is running',
    updateAPIComponentFailed: 'Failed to update API component, please check if server is running',
    createWebComponentFailed: 'Failed to create Web component, please check if server is running',
    updateWebComponentFailed: 'Failed to update Web component, please check if server is running',
    createOtherComponentFailed: 'Failed to create other component, please check if server is running',
    updateOtherComponentFailed: 'Failed to update other component, please check if server is running',
    createDatabaseComponentFailed: 'Failed to create database component, please check if server is running',
    updateDatabaseComponentFailed: 'Failed to update database component, please check if server is running',
    createGroupFailed: 'Failed to create group, please check if server is running',
    groupDeleteSuccess: 'Group deleted successfully',
    groupDeleteFailed: 'Failed to delete group',
    saveFlowFailed: 'Failed to save flow, please check if server is running',
    confirmDeleteGroup: 'Are you sure you want to delete the group "{groupName}"? This action cannot be undone.',
    confirmDeleteComponent: 'Are you sure you want to delete this component?',
    confirmDelete: 'Confirm Delete',
    pleaseEnterSQL: 'Please enter SQL statement',
    pleaseUploadFile: 'Please upload file',
    pleaseUploadSQLFile: 'Please upload SQL file',
    pleaseUploadCompareFile: 'Please upload compare file',
    serverComponentUpdateSuccess: 'Server component updated successfully',
    serverComponentCreateSuccess: 'Server component created successfully',
    apiComponentUpdateSuccess: 'API component updated successfully',
    apiComponentCreateSuccess: 'API component created successfully',
    webComponentUpdateSuccess: 'Web component updated successfully',
    webComponentCreateSuccess: 'Web component created successfully',
    otherComponentUpdateSuccess: 'Other component updated successfully',
    otherComponentCreateSuccess: 'Other component created successfully',
    databaseComponentUpdateSuccess: 'Database component updated successfully',
    databaseComponentCreateSuccess: 'Database component created successfully',
    downloadSuccess: 'Download success',
    downloadFailed: 'Download failed',
    updateSuccess: 'Update success'
  },
  '简体中文': {
    pageTitle: '测试案例管理平台',
    newGroup: '新建分组',
    newServerComponent: '新建服务器组件',
    newAPIComponent: '新建API组件',
    newWebComponent: '新建Web组件',
    newDatabaseComponent: '新建数据库组件',
    newOtherComponent: '新建其它组件',
    edit: '编辑',
    delete: '删除',
    pleaseEnterGroupName: '请输入分组名称',
    cancel: '取消',
    confirm: '确定',
    addGlobalVariable: '新增全局变量',
    editGlobalVariable: '编辑全局变量',
    variableName: '变量名称',
    pleaseEnterVariableName: '请输入变量名称',
    type: '类型',
    scriptType: '脚本',
    pleaseSelectType: '请选择类型',
    pleaseEnterComponentName: '请输入组件名称',
    pleaseEnterDescription: '请输入描述',
    pleaseEnterHost: '请输入host',
    pleaseEnterComponent: '请输入脚本',
    pleaseEnterPath: '请输入路径',
    pleaseEnterUrl: '请输入URL',
    pleaseSelectRequestMethod: '请选择请求方法',
    pleaseEnterHeaders: '请输入请求头（JSON格式）',
    pleaseEnterBody: '请输入请求体（JSON格式）',
    pleaseEnterResultVariable: '请输入结果变量',
    pleaseEnterWebComponentName: '请输入Web组件名称',
    pleaseEnterAction: '请选择操作',
    openLink: '打开链接',
    click: '单击',
    doubleClick: '双击',
    rightClick: '右击',
    input: '输入',
    getValue: '获取值',
    pleaseEnterElementSelector: '请输入元素',
    pleaseEnterValue: '请输入值',
    pleaseEnterOtherComponentName: '请输入其它组件名称',
    pleaseEnterSubType: '请选择类型',
    wait: '等待',
    compareValue: '对比值',
    compareFile: '对比文件',
    element: '元素',
    variable: '变量',
    relation: '关系',
    pleaseSelectElement: '请选择元素',
    pleaseSelectRelation: '请选择关系',
    pleaseSelectVariable: '请选择变量',  
    isNull: '为空',
    isNotNull: '不为空',
    lessThan: '小于',
    lessThanOrEqual: '小于等于',
    equal: '等于',
    greaterThanOrEqual: '大于等于',
    greaterThan: '大于',
    contains: '包含',
    notContains: '不包含',
    pleaseEnterWaitTime: '请输入等待时间',
    millisecond: '毫秒',
    second: '秒',
    minute: '分',
    hour: '时',
    pleaseEnterCompareValue: '请输入对比值',
    selectFile: '选择文件',
    onlyUploadOneFile: '只能上传1个文件',
    pleaseEnterIgnoreFields: '请输入忽略字段，多个用逗号分隔',
    field: '字段',
    startText: '开始文本',
    endText: '结束文本',
    replaceValue: '替换值',
    action: '操作',
    add: '添加',
    editServerComponent: '编辑服务器组件',
    editAPIComponent: '编辑API组件',
    editWebComponent: '编辑Web组件',
    editDatabaseComponent: '编辑数据库组件',
    editOtherComponent: '编辑其它组件',
    uploadFile: '上传文件',
    saveFlow: '保存流程',
    flowName: '名称',
    enterFlowName: '请输入流程名称',
    enterFlowDescription: '请输入流程描述',
    enterFolderName: '请选择分组',
    createFlow: '新建流程',
    variableAlreadyExists: '变量名已存在',
    componentNameAlreadyExists: '组件名称已存在',
    fileAlreadyExists: '文件已存在',
    folderAlreadyExists: '文件夹已存在',
    saveSuccess: '保存成功',
    createSuccess: '创建成功',
    createFailed: '创建失败',
    runSuccess: '运行成功',
    runFailed: '运行失败',
    noActiveTab: '没有活跃的标签页',
    pleaseCheckServer: '请检查服务器是否运行',
    confirmDownloadReport: '确认下载报告吗？',
    downloadReport: '下载报告',
    noReportFile: '未找到报告文件',
    pleaseSaveFirst: '请先保存流程',
    loadFailed: '加载失败',
    saveFailed: '保存失败',
    renameSuccess: '重命名成功',
    renameFailed: '重命名失败',
    deleteSuccess: '删除成功',
    deleteFailed: '删除失败',
    confirmDelete: '确认删除',
    confirmDeleteFlow: '确定要删除流程"{name}"吗？',
    confirmDeleteFolder: '确定要删除文件夹"{name}"吗？文件夹下的所有文件将被删除。',
    name: '元素',
    value: '值',
    description: '描述',
    folder: '分组',
    componentName: '组件名称',
    host: 'Host',
    component: '脚本',
    path: '路径',
    url: 'URL',
    method: '方法',
    requestHeaders: '请求头',
    requestBody: '请求体',
    resultVariable: '结果变量',
    webComponentName: 'WEB组件',
    otherComponentName: '其它组件',
    subType: '类型',
    waitTime: '等待时间',
    compareValueLabel: '对比值',
    compareFileLabel: '对比文件',
    ignoreFields: '忽略字段',
    replaceFields: '替换字段',
    file: '文件',
    sqlFile: 'SQL文件',
    sqlStatement: 'SQL语句',
    pleaseEnterName: '请输入名称',
    pleaseEnterShell: '请输入脚本',
    pleaseEnterVariable: '请输入变量',
    pleaseEnterFlowName: '请输入流程名称',
    pleaseEnterFlowDescription: '请输入流程描述',
    pleaseSelectFolder: '请选择分组',
    pleaseEnterElement: '请输入元素',
    cannotDragToSelf: '不能拖拽当前标签页对应的流程到自身',
    componentNotFound: '组件不存在',
    groupNotFound: '分组不存在',
    componentDeleteSuccess: '组件删除成功',
    componentDeleteFailed: '删除组件失败，请检查服务器是否运行',
    fileUploadSuccess: '文件上传成功',
    fileUploadFailed: '文件上传失败',
    sqlFileOnly: '只能上传.sql格式的文件！',
    pleaseSelectGroup: '请选择一个分组',
    componentAddedSuccess: '组件添加成功',
    flowIsRunning: '流程正在运行中，请等待完成',
    runFailed: '运行失败',
    createServerComponentFailed: '创建服务器组件失败，请检查服务器是否运行',
    updateServerComponentFailed: '更新服务器组件失败，请检查服务器是否运行',
    createAPIComponentFailed: '创建API组件失败，请检查服务器是否运行',
    updateAPIComponentFailed: '更新API组件失败，请检查服务器是否运行',
    createWebComponentFailed: '创建WEB组件失败，请检查服务器是否运行',
    updateWebComponentFailed: '更新WEB组件失败，请检查服务器是否运行',
    createOtherComponentFailed: '创建其它组件失败，请检查服务器是否运行',
    updateOtherComponentFailed: '更新其它组件失败，请检查服务器是否运行',
    createDatabaseComponentFailed: '创建数据库组件失败，请检查服务器是否运行',
    updateDatabaseComponentFailed: '更新数据库组件失败，请检查服务器是否运行',
    createGroupFailed: '创建分组失败，请检查服务器是否运行',
    groupDeleteSuccess: '分组删除成功',
    groupDeleteFailed: '删除分组失败，请检查服务器是否运行',
    saveFlowFailed: '保存失败，请检查服务器是否运行',
    confirmDeleteGroup: '确定要删除分组"{groupName}"吗？此操作不可恢复。',
    confirmDeleteComponent: '确定要删除该组件吗？',
    confirmDelete: '确认删除',
    pleaseEnterSQL: '请输入SQL语句',
    pleaseUploadFile: '请上传文件',
    pleaseUploadSQLFile: '请上传SQL文件',
    pleaseUploadCompareFile: '请上传对比文件',
    serverComponentUpdateSuccess: '服务器组件更新成功',
    serverComponentCreateSuccess: '服务器组件创建成功',
    apiComponentUpdateSuccess: 'API组件更新成功',
    apiComponentCreateSuccess: 'API组件创建成功',
    webComponentUpdateSuccess: 'WEB组件更新成功',
    webComponentCreateSuccess: 'WEB组件创建成功',
    otherComponentUpdateSuccess: '其它组件更新成功',
    otherComponentCreateSuccess: '其它组件创建成功',
    databaseComponentUpdateSuccess: '数据库组件更新成功',
    databaseComponentCreateSuccess: '数据库组件创建成功',
    downloadSuccess: '下载成功',
    downloadFailed: '下载失败',
    updateSuccess: '更新成功'
  }
}

export default {
  name: 'App',
  components: {
    Search,
    Monitor,
    Connection,
    Document,
    ArrowRight,
    ArrowDown,
    Plus,
    Link,
    Edit,
    Delete,
    Setting,
    TopHeader,
    LeftPanel,
    EditorPanel,
    BottomPanel,
    RightPanel
  },
  data() {
    const savedLanguage = localStorage.getItem('currentLanguage')
    return {
      currentLanguage: savedLanguage || 'English',
      projectRootPath: '',
      leftPanelWidth: 240,
      rightPanelWidth: 280,
      bottomPanelHeight: 200,
      variablesSectionHeight: 300,
      currentActiveTabName: '',
      isResizing: false,
      currentResizer: null,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      mouseMoveListener: null,
      mouseUpListener: null,
      // 右键菜单相关
      contextMenuVisible: false,
      clickOnEmpty: false,
      contextMenuType: 'empty',
      currentGroupIndex: null,
      currentCommandIndex: null,
      menuPosition: {
        x: 0,
        y: 0
      },
      // 新建分组相关
      groupDialogVisible: false,
      groupName: '',
      // 新增全局变量相关
      variableDialogVisible: false,
      variableName: '',
      variableType: '',
      editingVariableIndex: null,
      // 全局变量列表
      globalVariables: [],
      // 新建服务器指令相关
      serverCommandDialogVisible: false,
      isEditingCommand: false,
      editingStepId: null,
      uploadedFileList: [],
      serverCommandForm: {
        name: '',
        description: '',
        host: '',
        uploadFile: false,
        command: '',
        path: '',
        fileName: '',
        storedFilename: '',
        absolutePath: '',
        resultVariable: ''
      },
      // 新建API组件相关
      apiCommandDialogVisible: false,
      apiCommandForm: {
        name: '',
        description: '',
        url: '',
        method: 'POST',
        headers: '',
        body: '',
        resultVariable: ''
      },
      // 新建WEB组件相关
      webCommandDialogVisible: false,
      webCommandForm: {
        name: '',
        description: '',
        action: '',
        element: '',
        inputValue: '',
        resultVariable: ''
      },
      // 新建其它组件相关
      otherCommandDialogVisible: false,
      otherUploadedFileList: [],
      otherCommandForm: {
        name: '',
        description: '',
        subType: '',
        waitTime: '',
        waitUnit: '',
        compareValue: '',
        fileName: '',
        storedFilename: '',
        absolutePath: '',
        resultVariable: '',
        relation: '',
        ignoreFields: '',
        replaceList: []
      },
      // 新建数据库组件相关
      databaseCommandDialogVisible: false,
      databaseUploadedFileList: [],
      databaseCommandForm: {
        name: '',
        description: '',
        url: '',
        type: '',
        sql: '',
        fileName: '',
        storedFilename: '',
        absolutePath: '',
        resultVariable: ''
      },
      // 保存流程相关
      saveFlowDialogVisible: false,
      flowFolders: [],
      saveFlowForm: {
        flowName: '',
        folderName: '',
        description: ''
      },
      // 新建流程相关
      createFlowDialogVisible: false,
      createFlowForm: {
        flowName: '',
        folderName: '',
        description: ''
      },
      // 是否通过拖拽打开对话框
      isFromDrag: false
    }
  },
  computed: {
    allResultVariables() {
      const variables = []
      
      const activeTab = this.$refs?.editorPanel?.getActiveTab?.()
      if (activeTab && activeTab.steps) {
        activeTab.steps.forEach(step => {
          const resultVariable = step.commandData?.resultVariable
          if (resultVariable && resultVariable.trim()) {
            if (!variables.includes(resultVariable)) {
              variables.push(resultVariable)
            }
          }
        })
      }
      
      return variables
    },
    serverCommandRules() {
      const isRequired = this.isFromDrag || this.editingStepId
      const rules = {
        name: [{ required: true, message: this.t('pleaseEnterComponentName'), trigger: 'blur' }]
      }
      
      if (isRequired) {
        rules.description = [{ required: true, message: this.t('pleaseEnterDescription'), trigger: 'blur' }]
        rules.host = [{ required: true, message: this.t('pleaseEnterHost'), trigger: 'blur' }]
      }
      
      if (!this.serverCommandForm.uploadFile) {
        if (isRequired) {
          rules.command = [{ required: true, message: this.t('pleaseEnterComponent'), trigger: 'blur' }]
        }
      } else {
        if (isRequired) {
          rules.path = [{ required: true, message: this.t('pleaseEnterPath'), trigger: 'blur' }]
        }
        rules.serverFile = [{ 
          validator: (rule, value, callback) => {
            if (isRequired && !this.serverCommandForm.storedFilename) {
              callback(new Error(this.t('pleaseUploadFile')))
            } else {
              callback()
            }
          }, 
          trigger: 'change' 
        }]
      }
      
      return rules
    },
    apiCommandRules() {
      const isRequired = this.isFromDrag || this.editingStepId
      const rules = {
        name: [{ required: true, message: this.t('pleaseEnterComponentName'), trigger: 'blur' }]
      }
      
      if (isRequired) {
        rules.description = [{ required: true, message: this.t('pleaseEnterDescription'), trigger: 'blur' }]
        rules.url = [{ required: true, message: this.t('pleaseEnterUrl'), trigger: 'blur' }]
        rules.method = [{ required: true, message: this.t('pleaseSelectRequestMethod'), trigger: 'change' }]
      }
      
      return rules
    },
    webCommandRules() {
      const isRequired = this.isFromDrag || this.editingStepId
      const rules = {
        name: [{ required: true, message: this.t('pleaseEnterComponentName'), trigger: 'blur' }]
      }
      
      if (isRequired) {
        rules.description = [{ required: true, message: this.t('pleaseEnterDescription'), trigger: 'blur' }]
        rules.action = [{ required: true, message: this.t('pleaseEnterAction'), trigger: 'change' }]
      }
      
      if (['click', 'double-click', 'right-click', 'input', 'get-value'].includes(this.webCommandForm.action) && isRequired) {
        rules.element = [{ required: true, message: this.t('pleaseEnterElement'), trigger: 'blur' }]
      }
      
      if (['input', 'open-link'].includes(this.webCommandForm.action) && isRequired) {
        rules.inputValue = [{ required: true, message: this.webCommandForm.action === 'open-link' ? this.t('pleaseEnterUrl') : this.t('pleaseEnterValue'), trigger: 'blur' }]
      }
      
      return rules
    },
    otherCommandRules() {
      const isRequired = this.isFromDrag || this.editingStepId
      const rules = {
        name: [{ required: true, message: this.t('pleaseEnterComponentName'), trigger: 'blur' }]
      }
      
      if (isRequired) {
        rules.description = [{ required: true, message: this.t('pleaseEnterDescription'), trigger: 'blur' }]
        rules.subType = [{ required: true, message: this.t('pleaseEnterSubType'), trigger: 'change' }]
      }
      
      if (this.otherCommandForm.subType === 'wait' && isRequired) {
        rules.waitTime = [{ required: true, message: this.t('pleaseEnterWaitTime'), trigger: 'blur' }]
        rules.waitUnit = [{ required: true, message: this.t('pleaseSelectType'), trigger: 'change' }]
      }
      
      if ((this.otherCommandForm.subType === 'compareValue' || this.otherCommandForm.subType === 'compareFile') && isRequired) {
        rules.resultVariable = [{ required: true, message: this.t('pleaseSelectVariable'), trigger: 'change' }]
      }
      
      if (this.otherCommandForm.subType === 'compareValue' && isRequired) {
        rules.relation = [{ required: true, message: this.t('pleaseSelectRelation'), trigger: 'change' }]
      }
      
      if (this.otherCommandForm.subType === 'compareValue' && this.otherCommandForm.relation !== 'isNull' && this.otherCommandForm.relation !== 'isNotNull' && isRequired) {
        rules.compareValue = [{ required: true, message: this.t('pleaseEnterCompareValue'), trigger: 'blur' }]
      }
      
      if (this.otherCommandForm.subType === 'compareFile') {
        rules.compareFile = [{ 
          validator: (rule, value, callback) => {
            if (isRequired && !this.otherCommandForm.storedFilename) {
              callback(new Error(this.t('pleaseUploadCompareFile')))
            } else {
              callback()
            }
          }, 
          trigger: 'change' 
        }]
      }
      
      return rules
    },
    databaseCommandRules() {
      const isRequired = this.isFromDrag || this.editingStepId
      const rules = {
        name: [{ required: true, message: this.t('pleaseEnterComponentName'), trigger: 'blur' }]
      }
      
      if (isRequired) {
        rules.description = [{ required: true, message: this.t('pleaseEnterDescription'), trigger: 'blur' }]
        rules.url = [{ required: true, message: this.t('pleaseEnterUrl'), trigger: 'blur' }]
        rules.type = [{ required: true, message: this.t('pleaseEnterSubType'), trigger: 'change' }]
      }
      
      if (this.databaseCommandForm.type === 'sql' && isRequired) {
        rules.sql = [{ required: true, message: this.t('pleaseEnterSQL'), trigger: 'blur' }]
      } else {
        rules.sqlFile = [{ 
          validator: (rule, value, callback) => {
            if (isRequired && !this.databaseCommandForm.storedFilename) {
              callback(new Error(this.t('pleaseUploadSQLFile')))
            } else {
              callback()
            }
          }, 
          trigger: 'change' 
        }]
      }
      
      return rules
    },
    saveFlowRules() {
      return {
        flowName: [{ required: true, message: this.t('pleaseEnterFlowName'), trigger: 'blur' }],
        description: [{ required: true, message: this.t('pleaseEnterFlowDescription'), trigger: 'blur' }],
        folderName: [{ required: true, message: this.t('pleaseSelectFolder'), trigger: 'change' }]
      }
    },
    createFlowRules() {
      return {
        flowName: [{ required: true, message: this.t('pleaseEnterFlowName'), trigger: 'blur' }],
        description: [{ required: true, message: this.t('pleaseEnterFlowDescription'), trigger: 'blur' }],
        folderName: [{ required: true, message: this.t('pleaseSelectFolder'), trigger: 'change' }]
      }
    }
  },
  async created() {
    try {
      const response = await fetch('/api/get-project-root', { method: 'GET' })
      const result = await response.json()
      if (result.success) {
        this.projectRootPath = result.rootPath
        console.log('项目根路径:', this.projectRootPath)
      }
    } catch (error) {
      console.error('获取项目根路径失败:', error)
    }
    // 设置初始页面标题
    document.title = this.t('pageTitle')
    // 添加点击外部关闭菜单的事件监听
    document.addEventListener('click', this.closeContextMenu)
    // 添加保存快捷键监听
    document.addEventListener('keydown', this.handleKeyDown)
  },
  beforeUnmount() {
    // 移除事件监听
    document.removeEventListener('click', this.closeContextMenu)
    document.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    t(key, params = {}) {
      let text = messages[this.currentLanguage]?.[key] || messages['English'][key]
      Object.keys(params).forEach(paramKey => {
        text = text.replace(`{${paramKey}}`, params[paramKey])
      })
      return text
    },
    getErrorMessage(error) {
      console.log('getErrorMessage 被调用，error:', error)
      if (!error) return ''
      
      const errorLower = error.toLowerCase()
      
      console.log('errorLower:', errorLower)
      console.log('当前语言:', this.currentLanguage)
      console.log('t(folderAlreadyExists):', this.t('folderAlreadyExists'))
      
      if (errorLower.includes('file already exists') || 
          errorLower.includes('文件已存在') || 
          (errorLower.includes('文件') && errorLower.includes('已存在')) ||
          (errorLower.includes('流程') && errorLower.includes('已存在'))) {
        const result = this.t('fileAlreadyExists')
        console.log('返回 fileAlreadyExists:', result)
        return result
      }
      
      if (errorLower.includes('folder already exists') || errorLower.includes('文件夹已存在') || (errorLower.includes('文件夹') && errorLower.includes('已存在'))) {
        const result = this.t('folderAlreadyExists')
        console.log('返回 folderAlreadyExists:', result)
        return result
      }
      
      if (errorLower.includes('component name already exists') || errorLower.includes('组件名称已存在')) {
        const result = this.t('componentNameAlreadyExists')
        console.log('返回 componentNameAlreadyExists:', result)
        return result
      }
      
      console.log('返回原始错误:', error)
      return error
    },
    async handleSave() {
      if (!this.$refs.editorPanel) {
        ElMessage.success(this.t('saveSuccess'))
        return
      }
      
      const activeTab = this.$refs.editorPanel.getActiveTab()
      if (!activeTab) {
        ElMessage.success(this.t('saveSuccess'))
        return
      }
      
      if (activeTab.folderName && activeTab.flowName) {
        console.log('已有JSON文件，直接保存')
        await this.$refs.editorPanel.saveFlowToFile(activeTab)
        ElMessage.success(this.t('saveSuccess'))
        // 保存成功后，刷新流程区显示
        if (this.$refs.rightPanel && this.$refs.rightPanel.refreshFlowFolders) {
          this.$refs.rightPanel.refreshFlowFolders()
        }
      } else {
        console.log('没有JSON文件，弹出对话框')
        await this.loadFlowFolders()
        this.saveFlowForm.flowName = ''
        this.saveFlowForm.folderName = ''
        this.saveFlowForm.description = ''
        this.saveFlowDialogVisible = true
      }
    },
    async handleAddTabClick() {
      if (!this.$refs.editorPanel) {
        return
      }
      
      await this.loadFlowFolders()
      this.createFlowForm.flowName = ''
      this.createFlowForm.folderName = ''
      this.createFlowForm.description = ''
      this.createFlowDialogVisible = true
    },
    handleLoadGlobalVariables(variables) {
      console.log('=== handleLoadGlobalVariables 被调用 ===')
      console.log('handleLoadGlobalVariables - 接收到的 variables:', variables)
      console.log('handleLoadGlobalVariables - 之前的 globalVariables:', this.globalVariables)
      if (variables && Array.isArray(variables)) {
        this.globalVariables = [...variables]
        console.log('handleLoadGlobalVariables - 更新后的 globalVariables:', this.globalVariables)
      } else {
        console.log('handleLoadGlobalVariables - variables 无效，不更新')
      }
    },
    handleStepDelete({ resultVariable, steps }) {
      console.log('=== handleStepDelete 被调用 ===', { resultVariable, steps })
      
      const index = this.globalVariables.findIndex(v => v.name === resultVariable)
      if (index !== -1) {
        this.globalVariables.splice(index, 1)
        console.log('删除了全局变量:', resultVariable)
      }
    },
    handleLanguageChange(language) {
      console.log('handleLanguageChange 被调用:', language)
      this.currentLanguage = language
      localStorage.setItem('currentLanguage', language)
      document.title = this.t('pageTitle')
    },
    handleActiveTabChange(tabName) {
      console.log('handleActiveTabChange 被调用:', tabName)
      this.currentActiveTabName = tabName
    },
    async confirmCreateFlow() {
      if (!this.$refs.createFlowForm) {
        return
      }
      
      this.$refs.createFlowForm.validate(async (valid) => {
        if (!valid) {
          return
        }
        
        try {
          const response = await fetch('/api/create-flow-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              folderName: this.createFlowForm.folderName,
              flowName: this.createFlowForm.flowName,
              description: this.createFlowForm.description
            })
          })
          
          const data = await response.json()
          
          if (data.success) {
            ElMessage.success(this.t('createSuccess'))
            this.createFlowDialogVisible = false
            
            if (this.$refs.editorPanel) {
              this.$refs.editorPanel.addFlowTab(
                this.createFlowForm.flowName,
                this.createFlowForm.folderName,
                this.createFlowForm.flowName,
                this.createFlowForm.description
              )
            }
            
            if (this.$refs.rightPanel && this.$refs.rightPanel.refreshFlowFolders) {
              this.$refs.rightPanel.refreshFlowFolders()
            }
          } else {
            ElMessage.error(data.error || this.t('createFailed'))
          }
        } catch (error) {
          console.error('创建流程失败:', error)
          ElMessage.error(this.t('createFailed') + '，' + this.t('pleaseCheckServer'))
        }
      })
    },
    handleDropCommand({ commandId, commandType }) {
      console.log('拖拽组件:', commandId, commandType)
      
      this.isFromDrag = true
      this.isEditingCommand = false
      this.editingStepId = null
      
      switch (commandType) {
        case 'server':
          this.resetServerCommandForm()
          this.serverCommandDialogVisible = true
          break
        case 'api':
          this.resetAPICommandForm()
          this.apiCommandDialogVisible = true
          break
        case 'web':
          this.resetWebCommandForm()
          this.webCommandDialogVisible = true
          break
        case 'database':
          this.resetDatabaseCommandForm()
          this.databaseCommandDialogVisible = true
          this.$nextTick(() => {
            this.handleDatabaseTypeChange()
          })
          break
        case 'other':
          this.resetOtherCommandForm()
          this.otherCommandDialogVisible = true
          this.$nextTick(() => {
            this.handleOtherTypeChange()
          })
          break
      }
    },
    handleDropCustomCommand({ command }) {
      console.log('拖拽自定义组件:', command)
      
      this.isFromDrag = true
      this.isEditingCommand = false
      this.editingStepId = null
      
      if (command.type === 'api') {
        this.apiCommandForm = {
          name: command.name,
          description: command.description,
          url: command.url,
          method: command.method,
          headers: command.headers || '',
          body: command.body || '',
          resultVariable: command.resultVariable || ''
        }
        this.apiCommandDialogVisible = true
      } else if (command.type === 'web') {
        this.webCommandForm = {
          name: command.name,
          description: command.description,
          action: command.action || '',
          element: command.element || '',
          inputValue: command.inputValue || '',
          resultVariable: command.resultVariable || ''
        }
        this.webCommandDialogVisible = true
      } else if (command.type === 'other') {
        this.otherCommandForm = {
          name: command.name,
          description: command.description,
          subType: command.subType || '',
          waitTime: command.waitTime || '',
          waitUnit: command.waitUnit || '',
          compareValue: command.compareValue || '',
          fileName: command.fileName || '',
          storedFilename: command.storedFilename || '',
          absolutePath: command.absolutePath || '',
          resultVariable: command.resultVariable || '',
          relation: command.relation || '',
          ignoreFields: command.ignoreFields || '',
          replaceList: command.replaceList || []
        }
        if (this.otherCommandForm.subType === 'compareFile' && this.otherCommandForm.storedFilename) {
          this.otherUploadedFileList = [{
            name: this.otherCommandForm.fileName,
            url: `/uploadFiles/${this.otherCommandForm.storedFilename}`
          }]
        } else {
          this.otherUploadedFileList = []
        }
        this.otherCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleOtherTypeChange()
        })
      } else if (command.type === 'database') {
        this.databaseCommandForm = {
          name: command.name,
          description: command.description,
          url: command.url,
          type: (command.scriptType && command.scriptType !== '') ? command.scriptType : (command.type && command.type !== 'database') ? command.type : 'sql',
          sql: command.sql || '',
          fileName: command.fileName || '',
          storedFilename: command.storedFilename || '',
          absolutePath: command.absolutePath || '',
          resultVariable: command.resultVariable || ''
        }
        if (this.databaseCommandForm.type === 'file' && this.databaseCommandForm.storedFilename) {
          this.databaseUploadedFileList = [{
            name: this.databaseCommandForm.fileName,
            url: `/uploadFiles/${this.databaseCommandForm.storedFilename}`
          }]
        } else {
          this.databaseUploadedFileList = []
        }
        this.databaseCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleDatabaseTypeChange()
        })
      } else {
        this.serverCommandForm = {
          name: command.name,
          description: command.description,
          host: command.host,
          uploadFile: command.uploadFile,
          command: command.command || '',
          path: command.path || '',
          fileName: command.fileName || '',
          storedFilename: command.storedFilename || '',
          absolutePath: command.absolutePath || '',
          resultVariable: command.resultVariable || ''
        }
        if (this.serverCommandForm.uploadFile && this.serverCommandForm.storedFilename) {
          this.uploadedFileList = [{
            name: this.serverCommandForm.fileName,
            url: `/uploadFiles/${this.serverCommandForm.storedFilename}`
          }]
        } else {
          this.uploadedFileList = []
        }
        this.serverCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleUploadFileChange()
        })
      }
    },
    handleDropFlow({ folderName, flowName, description }) {
      console.log('handleDropFlow 被调用', { folderName, flowName, description })
      
      if (this.$refs.editorPanel) {
        const activeTab = this.$refs.editorPanel.getActiveTab()
        console.log('handleDropFlow - activeTab:', activeTab)
        
        const isSameFlow = 
          (activeTab?.flowName === flowName && activeTab?.folderName === folderName) ||
          (activeTab?.name === flowName)
        
        if (isSameFlow) {
          ElMessage.warning(this.t('cannotDragToSelf'))
          return
        }
        
        const filePath = this.projectRootPath ? 
          `${this.projectRootPath}\\src\\flow\\${folderName}\\${flowName}.json` : 
          `src/flow/${folderName}/${flowName}.json`
        
        console.log('流程文件绝对路径:', filePath)
        
        this.$refs.editorPanel.addStep({
          name: flowName,
          description: description || flowName
        }, {
          isFlow: true,
          folderName: folderName,
          flowName: flowName,
          description: description,
          filePath: filePath
        })
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
        }
      } catch (error) {
        console.error('获取流程文件夹失败:', error)
      }
    },
    async confirmSaveFlow() {
      if (!this.$refs.saveFlowForm) {
        return
      }
      
      this.$refs.saveFlowForm.validate(async (valid) => {
        if (!valid) {
          return
        }
        
        try {
          const activeTab = this.$refs.editorPanel.getActiveTab()
          console.log('confirmSaveFlow - activeTab:', activeTab)
          
          let nodes = []
          
          if (activeTab && activeTab.steps) {
            nodes = activeTab.steps.map((step, index) => ({
              id: step.id,
              name: step.name,
              description: step.description,
              data: step.commandData || null,
              stepNumber: step.stepNumber || (index + 1)
            }))
          }
          
          console.log('confirmSaveFlow - nodes:', nodes)
          
          const response = await fetch('/api/create-flow-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              folderName: this.saveFlowForm.folderName,
              flowName: this.saveFlowForm.flowName,
              description: this.saveFlowForm.description,
              nodes: nodes
            })
          })
          
          const data = await response.json()
          console.log('confirmSaveFlow - API 响应:', data)
          
          if (data.success) {
            ElMessage.success(this.t('saveSuccess'))
            this.$refs.editorPanel.renameActiveTab(this.saveFlowForm.flowName)
            
            if (activeTab) {
              console.log('准备调用 setFlowInfo...')
              this.$refs.editorPanel.setFlowInfo(
                activeTab.id,
                this.saveFlowForm.folderName,
                this.saveFlowForm.flowName,
                this.saveFlowForm.description
              )
            }
            
            if (this.$refs.rightPanel && this.$refs.rightPanel.refreshFlowFolders) {
              this.$refs.rightPanel.refreshFlowFolders()
            }
            this.saveFlowDialogVisible = false
          } else {
            ElMessage.error(data.error || this.t('saveFailed'))
          }
        } catch (error) {
          console.error('保存流程失败:', error)
          ElMessage.error(this.t('saveFlowFailed'))
        }
      })
    },
    handleCreateFlow(data) {
      if (this.$refs.editorPanel) {
        if (typeof data === 'string') {
          this.$refs.editorPanel.addFlowTab(data)
        } else {
          this.$refs.editorPanel.addFlowTab(
            data.flowName,
            data.folderName,
            data.flowName,
            data.description
          )
        }
      }
    },
    async handleOpenFlow({ folderName, flowName }) {
      console.log('=== handleOpenFlow 被调用 ===', { folderName, flowName })
      if (this.$refs.editorPanel) {
        console.log('准备调用 editorPanel.openFlowTab')
        await this.$refs.editorPanel.openFlowTab(folderName, flowName)
        console.log('editorPanel.openFlowTab 调用完成')
      }
    },
    handleDeleteFlow(flowName) {
      if (this.$refs.editorPanel) {
        this.$refs.editorPanel.closeFlowTabByName(flowName)
      }
    },
    handleDeleteFolder(folderName) {
      console.log('handleDeleteFolder 被调用', { folderName })
      if (this.$refs.editorPanel) {
        this.$refs.editorPanel.closeFlowTabsByFolder(folderName)
      }
    },
    handleRenameFlow({ oldFolderName, oldFlowName, newFlowName }) {
      console.log('handleRenameFlow 被调用', { oldFolderName, oldFlowName, newFlowName })
      if (this.$refs.editorPanel) {
        this.$refs.editorPanel.renameFlowTabs(oldFolderName, oldFlowName, newFlowName)
      }
    },
    handleKeyDown(event) {
      // Ctrl+S 保存
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        this.handleSave()
      }
    },
    async handleRun() {
      console.log('运行流程')
      
      const activeTab = this.$refs.editorPanel?.getActiveTab()
      if (!activeTab) {
        ElMessage.error(this.t('noActiveTab'))
        return
      }
      
      if (!activeTab.hasJsonFile) {
        ElMessage.warning(this.t('pleaseSaveFirst'))
        return
      }
      
      // 保存当前流程的信息，避免切换标签页后丢失
      const currentFolderName = activeTab.folderName
      const currentFlowName = activeTab.flowName
      
      if (!currentFolderName || !currentFlowName) {
        ElMessage.warning(this.t('pleaseSaveFirst'))
        return
      }
      
      let didSetRunning = false
      
      try {
        const isRunning = await this.$refs.editorPanel.checkFlowRunningStatus(currentFolderName, currentFlowName)
        if (isRunning) {
          ElMessage.warning(this.t('flowIsRunning'))
          return
        }
        
        await this.$refs.editorPanel.updateFlowRunningStatus(currentFolderName, currentFlowName, true)
        didSetRunning = true
        
        const flowData = {
          name: currentFlowName || activeTab.name,
          description: activeTab.description || '',
          nodes: activeTab.steps.map((step, index) => ({
            id: step.id,
            name: step.name,
            description: step.description,
            data: step.commandData || null,
            stepNumber: step.stepNumber || (index + 1),
            disabled: step.disabled || false
          })),
          edges: [],
          globalVariables: this.globalVariables || []
        }
        
        const response = await fetch(`${apiConfig.apiBaseUrl}${apiConfig.endpoints.runFlow}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(flowData)
        })
        
        const result = await response.json()
        
        if (result.success) {
          ElMessage.success(this.t('runSuccess'))
        } else {
          ElMessage.error(result.error || this.t('runFailed'))
        }
      } catch (error) {
        console.error('运行流程失败:', error)
        ElMessage.error(this.t('runFailed') + ', ' + this.t('pleaseCheckServer'))
      } finally {
        if (didSetRunning && currentFolderName && currentFlowName) {
          await this.$refs.editorPanel.updateFlowRunningStatus(currentFolderName, currentFlowName, false)
        }
      }
    },
    
    async handleExportReport() {
      console.log('导出报告')
      
      const activeTab = this.$refs.editorPanel?.getActiveTab()
      if (!activeTab) {
        ElMessage.error(this.t('noActiveTab'))
        return
      }
      
      if (!activeTab.hasJsonFile) {
        ElMessage.warning(this.t('pleaseSaveFirst'))
        return
      }
      
      const tabName = activeTab.flowName || activeTab.name
      
      try {
        ElMessageBox.confirm(
          this.t('confirmDownloadReport'),
          this.t('exportReport'),
          {
            confirmButtonText: this.t('confirm'),
            cancelButtonText: this.t('cancel'),
            type: 'info'
          }
        ).then(async () => {
          try {
            console.log('调用导出报告接口，标签页名称:', tabName)
            const response = await fetch(`${apiConfig.apiBaseUrl}${apiConfig.endpoints.getReport}?tabName=${encodeURIComponent(tabName)}`, {
              method: 'GET'
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log('后端返回的文件路径:', result)
              
              if (result.success && result.filePath) {
                const filePath = result.filePath
                const fileName = filePath.split(/[\\/]/).pop() || `${tabName}_report.xlsx`
                
                console.log('开始下载文件:', filePath)
                
                const downloadResponse = await fetch(`${apiConfig.apiBaseUrl}/api/download-file?filePath=${encodeURIComponent(filePath)}`, {
                  method: 'GET'
                })
                
                if (downloadResponse.ok) {
                  const blob = await downloadResponse.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = fileName
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  window.URL.revokeObjectURL(url)
                  
                  ElMessage.success(this.t('downloadSuccess'))
                } else {
                  ElMessage.error(this.t('downloadFailed'))
                }
              } else {
                ElMessage.error(result.error || this.t('downloadFailed'))
              }
            } else {
              ElMessage.error(this.t('downloadFailed'))
            }
          } catch (error) {
            console.error('导出报告失败:', error)
            ElMessage.error(this.t('downloadFailed'))
          }
        }).catch(() => {
        })
      } catch (error) {
      }
    },
    
    handleCommandClick(command) {
      console.log('选择组件:', command)
    },
    
    handleAddVariable() {
      this.variableDialogVisible = true
      this.variableName = ''
      this.variableType = ''
      this.editingVariableIndex = null
    },
    
    handleEditVariable({ variable, index }) {
      this.variableDialogVisible = true
      this.variableName = variable.name
      this.variableType = variable.type
      this.editingVariableIndex = index
    },
    
    confirmVariable() {
      if (this.variableName.trim() && this.variableType) {
        if (this.editingVariableIndex !== null) {
          const exists = this.globalVariables.some((v, i) => i !== this.editingVariableIndex && v.name === this.variableName.trim())
          if (exists) {
            ElMessage.error(this.t('variableAlreadyExists'))
            return
          }
          console.log('编辑全局变量:', this.variableName, this.variableType)
          this.globalVariables[this.editingVariableIndex] = {
            name: this.variableName,
            type: this.variableType
          }
        } else {
          const exists = this.globalVariables.some(v => v.name === this.variableName.trim())
          if (exists) {
            ElMessage.error(this.t('variableAlreadyExists'))
            return
          }
          console.log('添加全局变量:', this.variableName, this.variableType)
          this.globalVariables.push({
            name: this.variableName,
            type: this.variableType
          })
        }
        
        this.variableDialogVisible = false
        this.variableName = ''
        this.variableType = ''
        this.editingVariableIndex = null
        
        if (this.$refs.editorPanel) {
          const activeTab = this.$refs.editorPanel.getActiveTab()
          if (activeTab) {
            this.$refs.editorPanel.saveFlowToFile(activeTab)
          }
        }
      }
    },
    
    async deleteVariable() {
      try {
        await ElMessageBox.confirm(
          `确定要删除变量"${this.variableName}"吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        console.log('删除全局变量:', this.variableName)
        this.globalVariables.splice(this.editingVariableIndex, 1)
        this.variableDialogVisible = false
        this.variableName = ''
        this.variableType = ''
        this.editingVariableIndex = null
        
        if (this.$refs.editorPanel) {
          const activeTab = this.$refs.editorPanel.getActiveTab()
          if (activeTab) {
            this.$refs.editorPanel.saveFlowToFile(activeTab)
          }
        }
      } catch {
        console.log('用户取消删除')
      }
    },
    
    startResizing(resizer, event, type) {
      event.preventDefault()
      event.stopPropagation()
      
      this.isResizing = true
      this.currentResizer = resizer
      this.startX = event.clientX
      this.startY = event.clientY
      
      if (type === 'width') {
        if (resizer === 'left') {
          this.startWidth = this.leftPanelWidth
        } else if (resizer === 'right') {
          this.startWidth = this.rightPanelWidth
        }
      } else if (type === 'height') {
        if (resizer === 'bottom') {
          this.startHeight = this.bottomPanelHeight
        } else if (resizer === 'variables') {
          this.startHeight = this.variablesSectionHeight
        }
      }
      
      const handleMouseMove = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.handleMouseMove(e)
      }
      
      const stopResizing = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.stopResizing()
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', stopResizing)
      
      this.mouseMoveListener = handleMouseMove
      this.mouseUpListener = stopResizing
    },
    
    handleMouseMove(event) {
      if (!this.isResizing) return
      
      const deltaX = event.clientX - this.startX
      const deltaY = event.clientY - this.startY
      
      if (this.currentResizer === 'left') {
        const newWidth = Math.max(200, Math.min(400, this.startWidth + deltaX))
        this.leftPanelWidth = newWidth
      } else if (this.currentResizer === 'right') {
        const newWidth = Math.max(200, Math.min(400, this.startWidth - deltaX))
        this.rightPanelWidth = newWidth
      } else if (this.currentResizer === 'bottom') {
        const newHeight = Math.max(100, Math.min(400, this.startHeight - deltaY))
        this.bottomPanelHeight = newHeight
      } else if (this.currentResizer === 'variables') {
        const newHeight = Math.max(100, Math.min(300, this.startHeight - deltaY))
        this.variablesSectionHeight = newHeight
      }
    },
    
    stopResizing() {
      this.isResizing = false
      this.currentResizer = null
      
      if (this.mouseMoveListener) {
        document.removeEventListener('mousemove', this.mouseMoveListener)
        this.mouseMoveListener = null
      }
      if (this.mouseUpListener) {
        document.removeEventListener('mouseup', this.mouseUpListener)
        this.mouseUpListener = null
      }
    },

    showContextMenu(event, type, data) {
      event.preventDefault()
      this.menuPosition.x = event.clientX
      this.menuPosition.y = event.clientY
      this.clickOnEmpty = type === 'empty'
      this.contextMenuType = type
      if (type === 'group') {
        this.currentGroupIndex = data
      } else if (type === 'command') {
        this.currentGroupIndex = data.groupIndex
        this.currentCommandIndex = data.cmdIndex
      }
      this.contextMenuVisible = true
    },
    
    closeContextMenu() {
      this.contextMenuVisible = false
    },
    
    showGroupDialog() {
      this.$refs.leftPanel.activeTab = 'custom'
      this.groupDialogVisible = true
      this.groupName = ''
      this.contextMenuVisible = false
    },

    async confirmGroup() {
      if (this.groupName.trim()) {
        try {
          const response = await fetch('/api/create-group', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ groupName: this.groupName })
          })

          const data = await response.json()

          if (data.success) {
            console.log('分组创建成功:', data.filePath)
            ElMessage.success(this.t('createSuccess'))
            this.$refs.leftPanel.activeTab = 'custom'
            await this.$refs.leftPanel.loadCustomGroups()
          } else {
            console.error('创建分组失败:', data.error)
            ElMessage.error(this.getErrorMessage(data.error))
          }
        } catch (error) {
          console.error('创建分组失败:', error)
          ElMessage.error(this.t('createGroupFailed'))
        }

        this.groupDialogVisible = false
        this.groupName = ''
      }
    },
    
    async handleDeleteGroup({ groupIndex, groupName }) {
      this.contextMenuVisible = false
      try {
        await ElMessageBox.confirm(
          this.t('confirmDeleteGroup', { groupName }),
          this.t('confirmDelete'),
          {
            confirmButtonText: this.t('confirm'),
            cancelButtonText: this.t('cancel'),
            type: 'warning'
          }
        )

        try {
          const response = await fetch('/api/delete-group', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ groupName })
          })

          const data = await response.json()

          if (data.success) {
            console.log('分组删除成功:', data.filePath)
            ElMessage.success(this.t('groupDeleteSuccess'))
            this.$refs.leftPanel.activeTab = 'custom'
            await this.$refs.leftPanel.loadCustomGroups()
          } else {
            console.error('删除分组失败:', data.error)
            ElMessage.error(this.getErrorMessage(data.error))
          }
        } catch (error) {
          console.error('删除分组失败:', error)
          ElMessage.error(this.t('groupDeleteFailed'))
        }
      } catch {
        console.log('用户取消删除')
      }
    },
    
    addServerCommand() {
      console.log('添加服务器组件')
      this.contextMenuVisible = false
      this.isEditingCommand = false
      this.isFromDrag = false
      this.editingStepId = null
      this.resetServerCommandForm()
      this.serverCommandDialogVisible = true
      this.$nextTick(() => {
        this.handleUploadFileChange()
      })
    },
    handleStepDoubleClick(step) {
      console.log('双击编辑区卡片:', step)
      const commandData = step.commandData
      if (!commandData) {
        return
      }
      
      if (commandData.isFlow) {
        console.log('双击引用流程卡片，打开流程标签页:', { folderName: commandData.folderName, flowName: commandData.flowName })
        if (this.$refs.editorPanel) {
          this.$refs.editorPanel.openFlowTab(commandData.folderName, commandData.flowName)
        }
        return
      }
      
      this.isEditingCommand = true
      this.isFromDrag = false
      this.editingStepId = step.id
      
      if (commandData.type === 'api') {
        this.apiCommandForm = {
          name: commandData.name || '',
          description: commandData.description || '',
          url: commandData.url || '',
          method: commandData.method || 'GET',
          headers: commandData.headers || '',
          body: commandData.body || '',
          resultVariable: commandData.resultVariable || ''
        }
        this.apiCommandDialogVisible = true
      } else if (commandData.type === 'web') {
        this.webCommandForm = {
          name: commandData.name || '',
          description: commandData.description || '',
          action: commandData.action || '',
          element: commandData.element || '',
          inputValue: commandData.inputValue || '',
          resultVariable: commandData.resultVariable || ''
        }
        this.webCommandDialogVisible = true
      } else if (commandData.type === 'other') {
        this.otherCommandForm = {
          name: commandData.name || '',
          description: commandData.description || '',
          subType: commandData.subType || '',
          waitTime: commandData.waitTime || '',
          waitUnit: commandData.waitUnit || '',
          compareValue: commandData.compareValue || '',
          fileName: commandData.fileName || '',
          storedFilename: commandData.storedFilename || '',
          absolutePath: commandData.absolutePath || '',
          resultVariable: commandData.resultVariable || '',
          relation: commandData.relation || '',
          ignoreFields: commandData.ignoreFields || '',
          replaceList: commandData.replaceList || []
        }
        if (this.otherCommandForm.subType === 'compareFile' && this.otherCommandForm.storedFilename) {
          this.otherUploadedFileList = [{
            name: this.otherCommandForm.fileName,
            url: `/uploadFiles/${this.otherCommandForm.storedFilename}`
          }]
        } else {
          this.otherUploadedFileList = []
        }
        this.otherCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleOtherTypeChange()
        })
      } else if (commandData.type === 'database') {
        this.databaseCommandForm = {
          name: commandData.name || '',
          description: commandData.description || '',
          url: commandData.url || '',
          type: (commandData.scriptType && commandData.scriptType !== '') ? commandData.scriptType : (commandData.type && commandData.type !== 'database') ? commandData.type : 'sql',
          sql: commandData.sql || '',
          fileName: commandData.fileName || '',
          storedFilename: commandData.storedFilename || '',
          absolutePath: commandData.absolutePath || '',
          resultVariable: commandData.resultVariable || ''
        }
        if (this.databaseCommandForm.type === 'file' && this.databaseCommandForm.storedFilename) {
          this.databaseUploadedFileList = [{
            name: this.databaseCommandForm.fileName,
            url: `/uploadFiles/${this.databaseCommandForm.storedFilename}`
          }]
        } else {
          this.databaseUploadedFileList = []
        }
        this.databaseCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleDatabaseTypeChange()
        })
      } else {
        this.serverCommandForm = {
          name: commandData.name || '',
          description: commandData.description || '',
          host: commandData.host || '',
          uploadFile: commandData.uploadFile || false,
          command: commandData.command || '',
          path: commandData.path || '',
          fileName: commandData.fileName || '',
          storedFilename: commandData.storedFilename || '',
          absolutePath: commandData.absolutePath || '',
          resultVariable: commandData.resultVariable || ''
        }
        if (this.serverCommandForm.uploadFile && this.serverCommandForm.storedFilename) {
          this.uploadedFileList = [{
            name: this.serverCommandForm.fileName,
            url: `/uploadFiles/${this.serverCommandForm.storedFilename}`
          }]
        } else {
          this.uploadedFileList = []
        }
        this.serverCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleUploadFileChange()
        })
      }
    },
    handleEditCommand(data) {
      console.log('双击编辑组件', data)
      this.currentGroupIndex = data.groupIndex
      this.currentCommandIndex = data.cmdIndex
      this.editCommand()
    },
    editCommand() {
      console.log('编辑组件')
      this.contextMenuVisible = false
      this.isFromDrag = false
      this.editingStepId = null
      this.isEditingCommand = false
      
      const group = this.$refs.leftPanel.customGroups[this.currentGroupIndex]
      if (!group || !group.commands[this.currentCommandIndex]) {
        ElMessage.error(this.t('componentNotFound'))
        return
      }
      
      const command = group.commands[this.currentCommandIndex]
      this.isEditingCommand = true
      
      if (command.type === 'api') {
        this.apiCommandForm = {
          name: command.name,
          description: command.description,
          url: command.url,
          method: command.method,
          headers: command.headers || '',
          body: command.body || '',
          resultVariable: command.resultVariable || ''
        }
        this.apiCommandDialogVisible = true
      } else if (command.type === 'web') {
        this.webCommandForm = {
          name: command.name,
          description: command.description,
          action: command.action || '',
          element: command.element || '',
          inputValue: command.inputValue || '',
          resultVariable: command.resultVariable || ''
        }
        this.webCommandDialogVisible = true
      } else if (command.type === 'other') {
        this.otherCommandForm = {
          name: command.name,
          description: command.description,
          subType: command.subType || '',
          waitTime: command.waitTime || '',
          waitUnit: command.waitUnit || '',
          compareValue: command.compareValue || '',
          fileName: command.fileName || '',
          storedFilename: command.storedFilename || '',
          absolutePath: command.absolutePath || '',
          resultVariable: command.resultVariable || '',
          relation: command.relation || '',
          ignoreFields: command.ignoreFields || '',
          replaceList: command.replaceList || []
        }
        if (this.otherCommandForm.subType === 'compareFile' && this.otherCommandForm.storedFilename) {
          this.otherUploadedFileList = [{
            name: this.otherCommandForm.fileName,
            url: `/uploadFiles/${this.otherCommandForm.storedFilename}`
          }]
        } else {
          this.otherUploadedFileList = []
        }
        this.otherCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleOtherTypeChange()
        })
      } else if (command.type === 'database') {
        this.databaseCommandForm = {
          name: command.name,
          description: command.description,
          url: command.url,
          type: (command.scriptType && command.scriptType !== '') ? command.scriptType : (command.type && command.type !== 'database') ? command.type : 'sql',
          sql: command.sql || '',
          fileName: command.fileName || '',
          storedFilename: command.storedFilename || '',
          absolutePath: command.absolutePath || '',
          resultVariable: command.resultVariable || ''
        }
        if (this.databaseCommandForm.type === 'file' && this.databaseCommandForm.storedFilename) {
          this.databaseUploadedFileList = [{
            name: this.databaseCommandForm.fileName,
            url: `/uploadFiles/${this.databaseCommandForm.storedFilename}`
          }]
        } else {
          this.databaseUploadedFileList = []
        }
        this.databaseCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleDatabaseTypeChange()
        })
      } else {
        this.serverCommandForm = {
          name: command.name,
          description: command.description,
          host: command.host,
          uploadFile: command.uploadFile,
          command: command.command || '',
          path: command.path || '',
          fileName: command.fileName || '',
          storedFilename: command.storedFilename || '',
          absolutePath: command.absolutePath || '',
          resultVariable: command.resultVariable || ''
        }
        if (this.serverCommandForm.uploadFile && this.serverCommandForm.storedFilename) {
          this.uploadedFileList = [{
            name: this.serverCommandForm.fileName,
            url: `/uploadFiles/${this.serverCommandForm.storedFilename}`
          }]
        } else {
          this.uploadedFileList = []
        }
        this.serverCommandDialogVisible = true
        this.$nextTick(() => {
          this.handleUploadFileChange()
        })
      }
    },
    async deleteCommand() {
      console.log('删除组件')
      this.contextMenuVisible = false
      
      try {
        await ElMessageBox.confirm(this.t('confirmDeleteComponent'), this.t('confirmDelete'), {
          confirmButtonText: this.t('confirm'),
          cancelButtonText: this.t('cancel'),
          type: 'warning'
        })
        
        const group = this.$refs.leftPanel.customGroups[this.currentGroupIndex]
        if (!group) {
          ElMessage.error(this.t('groupNotFound'))
          return
        }
        
        const groupName = group.name
        
        const response = await fetch('/api/delete-command', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            groupName, 
            commandIndex: this.currentCommandIndex 
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          console.log('组件删除成功:', data)
          ElMessage.success(this.t('componentDeleteSuccess'))
          await this.$refs.leftPanel.loadCustomGroups()
        } else {
          console.error('删除组件失败:', data.error)
          ElMessage.error(this.getErrorMessage(data.error))
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除组件失败:', error)
          ElMessage.error(this.t('componentDeleteFailed'))
        }
      }
    },
    resetServerCommandForm() {
      this.serverCommandForm = {
        name: '',
        description: '',
        host: '',
        uploadFile: false,
        command: '',
        path: '',
        fileName: '',
        storedFilename: '',
        absolutePath: '',
        resultVariable: ''
      }
      this.uploadedFileList = []
      if (this.$refs.upload) {
        this.$refs.upload.clearFiles()
      }
    },
    handleUploadFileChange() {
      if (this.$refs.serverCommandForm) {
        this.$refs.serverCommandForm.clearValidate()
        if (this.serverCommandForm.uploadFile) {
          this.$refs.serverCommandForm.validateField('serverFile')
        }
      }
    },
    handleUploadSuccess(response, file) {
      if (response.success) {
        this.serverCommandForm.fileName = response.filename
        this.serverCommandForm.storedFilename = response.storedFilename
        this.serverCommandForm.absolutePath = response.absolutePath
        this.uploadedFileList = [{
          name: response.originalFilename,
          url: response.filePath
        }]
        ElMessage.success(this.t('fileUploadSuccess'))
        if (this.$refs.serverCommandForm) {
          this.$refs.serverCommandForm.clearValidate('serverFile')
        }
      } else {
        ElMessage.error(response.error || this.t('fileUploadFailed'))
      }
    },
    handleUploadError(error) {
      console.error('文件上传失败:', error)
      ElMessage.error(this.t('fileUploadFailed'))
    },
    handleUploadRemove() {
      this.serverCommandForm.fileName = ''
      this.serverCommandForm.storedFilename = ''
      this.serverCommandForm.absolutePath = ''
      this.uploadedFileList = []
      if (this.$refs.serverCommandForm) {
        this.$refs.serverCommandForm.validateField('storedFilename')
      }
    },
    beforeDatabaseUpload(file) {
      const isSql = file.name.toLowerCase().endsWith('.sql')
      if (!isSql) {
        ElMessage.error(this.t('sqlFileOnly'))
        return false
      }
      return true
    },
    handleDatabaseUploadSuccess(response, file) {
      if (response.success) {
        this.databaseCommandForm.fileName = response.filename
        this.databaseCommandForm.storedFilename = response.storedFilename
        this.databaseCommandForm.absolutePath = response.absolutePath
        this.databaseUploadedFileList = [{
          name: response.originalFilename,
          url: response.filePath
        }]
        ElMessage.success(this.t('fileUploadSuccess'))
        if (this.$refs.databaseCommandForm) {
          this.$refs.databaseCommandForm.clearValidate('storedFilename')
        }
      } else {
        ElMessage.error(response.error || this.t('fileUploadFailed'))
      }
    },
    handleDatabaseUploadError(error) {
      console.error('文件上传失败:', error)
      ElMessage.error(this.t('fileUploadFailed'))
    },
    handleDatabaseUploadRemove() {
      this.databaseCommandForm.fileName = ''
      this.databaseCommandForm.storedFilename = ''
      this.databaseCommandForm.absolutePath = ''
      this.databaseUploadedFileList = []
      if (this.$refs.databaseCommandForm) {
        this.$refs.databaseCommandForm.validateField('storedFilename')
      }
    },
    handleDatabaseTypeChange() {
      if (this.$refs.databaseCommandForm) {
        this.$refs.databaseCommandForm.clearValidate()
        if (this.databaseCommandForm.type === 'file') {
          this.$refs.databaseCommandForm.validateField('storedFilename')
        }
      }
    },
    handleOtherTypeChange() {
      if (this.$refs.otherCommandForm) {
        this.$refs.otherCommandForm.clearValidate()
      }
    },
    handleRelationChange() {
      this.handleOtherTypeChange()
    },
    addReplaceItem() {
      this.otherCommandForm.replaceList.push({
        start: '',
        end: '',
        value: ''
      })
    },
    removeReplaceItem(index) {
      this.otherCommandForm.replaceList.splice(index, 1)
    },
    handleOtherUploadSuccess(response, file) {
      if (response.success) {
        this.otherCommandForm.fileName = response.filename
        this.otherCommandForm.storedFilename = response.storedFilename
        this.otherCommandForm.absolutePath = response.absolutePath
        this.otherUploadedFileList = [{
          name: response.originalFilename,
          url: response.filePath
        }]
        ElMessage.success(this.t('fileUploadSuccess'))
        if (this.$refs.otherCommandForm) {
          this.$refs.otherCommandForm.clearValidate('compareFile')
        }
      } else {
        ElMessage.error(response.error || this.t('fileUploadFailed'))
      }
    },
    handleOtherUploadError(error) {
      console.error('文件上传失败:', error)
      ElMessage.error(this.t('fileUploadFailed'))
    },
    handleOtherUploadRemove() {
      this.otherCommandForm.fileName = ''
      this.otherCommandForm.storedFilename = ''
      this.otherCommandForm.absolutePath = ''
      this.otherUploadedFileList = []
      if (this.$refs.otherCommandForm) {
        this.$refs.otherCommandForm.validateField('compareFile')
      }
    },
    async confirmServerCommand() {
      this.$refs.serverCommandForm.validate(async (valid) => {
        if (valid) {
          try {
            if (!this.isFromDrag && !this.editingStepId && (this.currentGroupIndex === null || !this.$refs.leftPanel.customGroups[this.currentGroupIndex])) {
              ElMessage.error(this.t('pleaseSelectGroup'))
              return
            }
            
            let groupName = null
            if (!this.isFromDrag && !this.editingStepId) {
              groupName = this.$refs.leftPanel.customGroups[this.currentGroupIndex].name
              
              const group = this.$refs.leftPanel.customGroups[this.currentGroupIndex]
              if (group && group.commands) {
                const existingCommand = group.commands.find(cmd => cmd.name === this.serverCommandForm.name)
                if (existingCommand && !this.isEditingCommand) {
                  ElMessage.error(this.t('componentNameAlreadyExists'))
                  return
                }
              }
            }
            
            const commandData = {
              type: 'server',
              name: this.serverCommandForm.name,
              description: this.serverCommandForm.description,
              host: this.serverCommandForm.host,
              uploadFile: this.serverCommandForm.uploadFile,
              resultVariable: this.serverCommandForm.resultVariable
            }
            
            if (!this.serverCommandForm.uploadFile) {
              commandData.command = this.serverCommandForm.command
            } else {
              commandData.path = this.serverCommandForm.path
              commandData.fileName = this.serverCommandForm.fileName
              commandData.storedFilename = this.serverCommandForm.storedFilename
              commandData.absolutePath = this.serverCommandForm.absolutePath
            }
            
            if (this.editingStepId) {
              const activeTab = this.$refs.editorPanel?.getActiveTab()
              if (activeTab) {
                const step = activeTab.steps.find(s => s.id === this.editingStepId)
                if (step) {
                  step.name = this.serverCommandForm.name
                  step.description = this.serverCommandForm.description
                  step.commandData = commandData
                  if (activeTab.folderName && activeTab.flowName) {
                    this.$refs.editorPanel.saveFlowToFile(activeTab)
                  }
                  ElMessage.success(this.t('updateSuccess'))
                }
              }
              this.serverCommandDialogVisible = false
              this.editingStepId = null
              this.isEditingCommand = false
              return
            }
            
            if (this.isFromDrag) {
              this.$refs.editorPanel.addStep({
                name: this.serverCommandForm.name,
                description: this.serverCommandForm.description
              }, commandData)
              ElMessage.success(this.t('componentAddedSuccess'))
              this.serverCommandDialogVisible = false
              this.isFromDrag = false
              return
            }
            
            let response, successMessage
            if (this.isEditingCommand) {
              response = await fetch('/api/update-command', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  groupName, 
                  commandIndex: this.currentCommandIndex, 
                  command: commandData 
                })
              })
              successMessage = this.t('serverComponentUpdateSuccess')
            } else {
              response = await fetch('/api/create-server-command', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ groupName, command: commandData })
              })
              successMessage = this.t('serverComponentCreateSuccess')
            }
            
            const data = await response.json()
            
            if (data.success) {
              console.log(this.isEditingCommand ? '服务器组件更新成功:' : '服务器组件创建成功:', data)
              ElMessage.success(successMessage)
              await this.$refs.leftPanel.loadCustomGroups()
              this.serverCommandDialogVisible = false
            } else {
              console.error(this.isEditingCommand ? '更新服务器组件失败:' : '创建服务器组件失败:', data.error)
              ElMessage.error(this.getErrorMessage(data.error))
            }
          } catch (error) {
            console.error(this.isEditingCommand ? '更新服务器组件失败:' : '创建服务器组件失败:', error)
            ElMessage.error(this.isEditingCommand ? this.t('updateServerComponentFailed') : this.t('createServerComponentFailed'))
          }
        }
      })
    },
    
    addAPICommand() {
      console.log('添加API组件')
      this.contextMenuVisible = false
      this.isEditingCommand = false
      this.isFromDrag = false
      this.editingStepId = null
      this.apiCommandDialogVisible = true
      this.resetAPICommandForm()
    },
    resetAPICommandForm() {
      this.apiCommandForm = {
        name: '',
        description: '',
        url: '',
        method: 'POST',
        headers: '',
        body: '',
        resultVariable: ''
      }
    },
    async confirmAPICommand() {
      this.$nextTick(() => {
        this.$refs.apiCommandForm.validate(async (valid) => {
          if (valid) {
            try {
              if (!this.isFromDrag && !this.editingStepId && (this.currentGroupIndex === null || !this.$refs.leftPanel.customGroups[this.currentGroupIndex])) {
                ElMessage.error(this.t('pleaseSelectGroup'))
                return
              }
              
              let groupName = null
              if (!this.isFromDrag && !this.editingStepId) {
                groupName = this.$refs.leftPanel.customGroups[this.currentGroupIndex].name
                
                const group = this.$refs.leftPanel.customGroups[this.currentGroupIndex]
                if (group && group.commands) {
                  const existingCommand = group.commands.find(cmd => cmd.name === this.apiCommandForm.name)
                  if (existingCommand && !this.isEditingCommand) {
                    ElMessage.error(this.t('componentNameAlreadyExists'))
                    return
                  }
                }
              }
              
              const commandData = {
                type: 'api',
                name: this.apiCommandForm.name,
                description: this.apiCommandForm.description,
                url: this.apiCommandForm.url,
                method: this.apiCommandForm.method,
                headers: this.apiCommandForm.headers,
                body: this.apiCommandForm.body,
                resultVariable: this.apiCommandForm.resultVariable
              }
              
              if (this.editingStepId) {
                const activeTab = this.$refs.editorPanel?.getActiveTab()
                if (activeTab) {
                  const step = activeTab.steps.find(s => s.id === this.editingStepId)
                  if (step) {
                    step.name = this.apiCommandForm.name
                    step.description = this.apiCommandForm.description
                    step.commandData = commandData
                    if (activeTab.folderName && activeTab.flowName) {
                      this.$refs.editorPanel.saveFlowToFile(activeTab)
                    }
                    ElMessage.success(this.t('updateSuccess'))
                  }
                }
                this.apiCommandDialogVisible = false
                this.editingStepId = null
                this.isEditingCommand = false
                return
              }
              
              if (this.isFromDrag) {
                this.$refs.editorPanel.addStep({
                  name: this.apiCommandForm.name,
                  description: this.apiCommandForm.description
                }, commandData)
                ElMessage.success(this.t('componentAddedSuccess'))
                this.apiCommandDialogVisible = false
                this.isFromDrag = false
                return
              }
              
              let response, successMessage
              if (this.isEditingCommand) {
                response = await fetch('/api/update-command', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ 
                    groupName, 
                    commandIndex: this.currentCommandIndex, 
                    command: commandData 
                  })
                })
                successMessage = this.t('apiComponentUpdateSuccess')
              } else {
                response = await fetch('/api/create-api-command', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ groupName, command: commandData })
                })
                successMessage = this.t('apiComponentCreateSuccess')
              }
              
              const data = await response.json()
              
              if (data.success) {
                console.log(this.isEditingCommand ? 'API组件更新成功:' : 'API组件创建成功:', data)
                ElMessage.success(successMessage)
                await this.$refs.leftPanel.loadCustomGroups()
                this.apiCommandDialogVisible = false
              } else {
                console.error(this.isEditingCommand ? '更新API组件失败:' : '创建API组件失败:', data.error)
                ElMessage.error(this.getErrorMessage(data.error))
              }
            } catch (error) {
              console.error(this.isEditingCommand ? '更新API组件失败:' : '创建API组件失败:', error)
              ElMessage.error(this.isEditingCommand ? this.t('updateAPIComponentFailed') : this.t('createAPIComponentFailed'))
            }
          }
        })
      })
    },
    
    addWebCommand() {
      console.log('添加Web组件')
      this.contextMenuVisible = false
      this.isEditingCommand = false
      this.isFromDrag = false
      this.editingStepId = null
      this.webCommandDialogVisible = true
      this.resetWebCommandForm()
    },
    resetWebCommandForm() {
      this.webCommandForm = {
        name: '',
        description: '',
        action: '',
        element: '',
        inputValue: '',
        resultVariable: ''
      }
    },
    async confirmWebCommand() {
      this.$nextTick(() => {
        this.$refs.webCommandForm.validate(async (valid) => {
          if (valid) {
            try {
              if (!this.isFromDrag && !this.editingStepId && (this.currentGroupIndex === null || !this.$refs.leftPanel.customGroups[this.currentGroupIndex])) {
                ElMessage.error(this.t('pleaseSelectGroup'))
                return
              }
              
              let groupName = null
              if (!this.isFromDrag && !this.editingStepId) {
                groupName = this.$refs.leftPanel.customGroups[this.currentGroupIndex].name
                
                const group = this.$refs.leftPanel.customGroups[this.currentGroupIndex]
                if (group && group.commands) {
                  const existingCommand = group.commands.find(cmd => cmd.name === this.webCommandForm.name)
                  if (existingCommand && !this.isEditingCommand) {
                    ElMessage.error(this.t('componentNameAlreadyExists'))
                    return
                  }
                }
              }
              
              const commandData = {
                type: 'web',
                name: this.webCommandForm.name,
                description: this.webCommandForm.description,
                action: this.webCommandForm.action,
                element: this.webCommandForm.element,
                inputValue: this.webCommandForm.inputValue,
                resultVariable: this.webCommandForm.resultVariable
              }
              
              if (this.editingStepId) {
                const activeTab = this.$refs.editorPanel?.getActiveTab()
                if (activeTab) {
                  const step = activeTab.steps.find(s => s.id === this.editingStepId)
                  if (step) {
                    step.name = this.webCommandForm.name
                    step.description = this.webCommandForm.description
                    step.commandData = commandData
                    if (activeTab.folderName && activeTab.flowName) {
                      this.$refs.editorPanel.saveFlowToFile(activeTab)
                    }
                    ElMessage.success(this.t('updateSuccess'))
                  }
                }
                this.webCommandDialogVisible = false
                this.editingStepId = null
                this.isEditingCommand = false
                return
              }
              
              if (this.isFromDrag) {
                this.$refs.editorPanel.addStep({
                  name: this.webCommandForm.name,
                  description: this.webCommandForm.description
                }, commandData)
                ElMessage.success(this.t('componentAddedSuccess'))
                this.webCommandDialogVisible = false
                this.isFromDrag = false
                return
              }
              
              let response, successMessage
              if (this.isEditingCommand) {
                response = await fetch('/api/update-command', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ 
                    groupName, 
                    commandIndex: this.currentCommandIndex, 
                    command: commandData 
                  })
                })
                successMessage = 'WEB组件更新成功'
              } else {
                response = await fetch('/api/create-web-command', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ groupName, command: commandData })
                })
                successMessage = 'WEB组件创建成功'
              }
              
              const data = await response.json()
              
              if (data.success) {
                console.log(this.isEditingCommand ? 'WEB组件更新成功:' : 'WEB组件创建成功:', data)
                ElMessage.success(successMessage)
                await this.$refs.leftPanel.loadCustomGroups()
                this.webCommandDialogVisible = false
              } else {
                console.error(this.isEditingCommand ? '更新WEB组件失败:' : '创建WEB组件失败:', data.error)
                ElMessage.error(this.getErrorMessage(data.error))
              }
            } catch (error) {
              console.error(this.isEditingCommand ? '更新WEB组件失败:' : '创建WEB组件失败:', error)
              ElMessage.error(this.isEditingCommand ? '更新WEB组件失败，请检查服务器是否运行' : '创建WEB组件失败，请检查服务器是否运行')
            }
          }
        })
      })
    },
    
    addOtherCommand() {
      console.log('添加其它组件')
      this.contextMenuVisible = false
      this.isEditingCommand = false
      this.isFromDrag = false
      this.editingStepId = null
      this.resetOtherCommandForm()
      this.otherCommandDialogVisible = true
      this.$nextTick(() => {
        this.handleOtherTypeChange()
      })
    },
    
    resetOtherCommandForm() {
      this.otherCommandForm = {
        name: '',
        description: '',
        subType: '',
        waitTime: '',
        waitUnit: '',
        compareValue: '',
        fileName: '',
        storedFilename: '',
        absolutePath: '',
        resultVariable: '',
        relation: '',
        ignoreFields: '',
        replaceList: []
      }
      this.otherUploadedFileList = []
      if (this.$refs.otherUpload) {
        this.$refs.otherUpload.clearFiles()
      }
    },
    
    async confirmOtherCommand() {
      this.$refs.otherCommandForm.validate(async (valid) => {
        if (valid) {
          try {
            if (!this.isFromDrag && !this.editingStepId && (this.currentGroupIndex === null || !this.$refs.leftPanel.customGroups[this.currentGroupIndex])) {
              ElMessage.error(this.t('pleaseSelectGroup'))
              return
            }
            
            let groupName = null
            if (!this.isFromDrag && !this.editingStepId) {
              groupName = this.$refs.leftPanel.customGroups[this.currentGroupIndex].name
              
              const group = this.$refs.leftPanel.customGroups[this.currentGroupIndex]
              if (group && group.commands) {
                const existingCommand = group.commands.find(cmd => cmd.name === this.otherCommandForm.name)
                if (existingCommand && !this.isEditingCommand) {
                  ElMessage.error(this.t('componentNameAlreadyExists'))
                  return
                }
              }
            }
            
            const commandData = {
              type: 'other',
              name: this.otherCommandForm.name,
              description: this.otherCommandForm.description,
              subType: this.otherCommandForm.subType,
              resultVariable: this.otherCommandForm.resultVariable
            }
            
            if (this.otherCommandForm.subType === 'wait') {
              commandData.waitTime = this.otherCommandForm.waitTime
              commandData.waitUnit = this.otherCommandForm.waitUnit
            } else if (this.otherCommandForm.subType === 'compareValue') {
              commandData.compareValue = this.otherCommandForm.compareValue
              commandData.resultVariable = this.otherCommandForm.resultVariable
              commandData.relation = this.otherCommandForm.relation
            } else if (this.otherCommandForm.subType === 'compareFile') {
              commandData.fileName = this.otherCommandForm.fileName
              commandData.storedFilename = this.otherCommandForm.storedFilename
              commandData.absolutePath = this.otherCommandForm.absolutePath
              commandData.resultVariable = this.otherCommandForm.resultVariable
              commandData.ignoreFields = this.otherCommandForm.ignoreFields
              commandData.replaceList = this.otherCommandForm.replaceList
            }
            
            if (this.editingStepId) {
              const activeTab = this.$refs.editorPanel?.getActiveTab()
              if (activeTab) {
                const step = activeTab.steps.find(s => s.id === this.editingStepId)
                if (step) {
                  step.name = this.otherCommandForm.name
                  step.description = this.otherCommandForm.description
                  step.commandData = commandData
                  if (activeTab.folderName && activeTab.flowName) {
                    this.$refs.editorPanel.saveFlowToFile(activeTab)
                  }
                  ElMessage.success(this.t('updateSuccess'))
                }
              }
              this.otherCommandDialogVisible = false
              this.editingStepId = null
              this.isEditingCommand = false
              return
            }
            
            if (this.isFromDrag) {
              this.$refs.editorPanel.addStep({
                name: this.otherCommandForm.name,
                description: this.otherCommandForm.description
              }, commandData)
              ElMessage.success(this.t('componentAddedSuccess'))
              this.otherCommandDialogVisible = false
              this.isFromDrag = false
              return
            }
            
            let response, successMessage
            if (this.isEditingCommand) {
              response = await fetch('/api/update-command', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  groupName, 
                  commandIndex: this.currentCommandIndex, 
                  command: commandData 
                })
              })
              successMessage = '其它组件更新成功'
            } else {
              response = await fetch('/api/create-other-command', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ groupName, command: commandData })
              })
              successMessage = '其它组件创建成功'
            }
            
            const data = await response.json()
            
            if (data.success) {
              console.log(this.isEditingCommand ? '其它组件更新成功:' : '其它组件创建成功:', data)
              ElMessage.success(successMessage)
              await this.$refs.leftPanel.loadCustomGroups()
              this.otherCommandDialogVisible = false
            } else {
              console.error(this.isEditingCommand ? '更新其它组件失败:' : '创建其它组件失败:', data.error)
              ElMessage.error(this.getErrorMessage(data.error))
            }
          } catch (error) {
            console.error(this.isEditingCommand ? '更新其它组件失败:' : '创建其它组件失败:', error)
            ElMessage.error(this.isEditingCommand ? '更新其它组件失败，请检查服务器是否运行' : '创建其它组件失败，请检查服务器是否运行')
          }
        }
      })
    },
    
    addDatabaseCommand() {
      console.log('添加数据库组件')
      this.contextMenuVisible = false
      this.isEditingCommand = false
      this.isFromDrag = false
      this.editingStepId = null
      this.resetDatabaseCommandForm()
      this.databaseCommandDialogVisible = true
      this.$nextTick(() => {
        this.handleDatabaseTypeChange()
      })
    },
    
    resetDatabaseCommandForm() {
      this.databaseCommandForm = {
        name: '',
        description: '',
        url: '',
        type: '',
        sql: '',
        fileName: '',
        storedFilename: '',
        absolutePath: '',
        resultVariable: ''
      }
      this.databaseUploadedFileList = []
    },
    
    async confirmDatabaseCommand() {
      this.$refs.databaseCommandForm.validate(async (valid) => {
        if (valid) {
          try {
            if (!this.isFromDrag && !this.editingStepId && (this.currentGroupIndex === null || !this.$refs.leftPanel.customGroups[this.currentGroupIndex])) {
              ElMessage.error(this.t('pleaseSelectGroup'))
              return
            }
            
            let groupName = null
            if (!this.isFromDrag && !this.editingStepId) {
              groupName = this.$refs.leftPanel.customGroups[this.currentGroupIndex].name
              
              const group = this.$refs.leftPanel.customGroups[this.currentGroupIndex]
              if (group && group.commands) {
                const existingCommand = group.commands.find(cmd => cmd.name === this.databaseCommandForm.name)
                if (existingCommand && !this.isEditingCommand) {
                  ElMessage.error(this.t('componentNameAlreadyExists'))
                  return
                }
              }
            }
            
            const commandData = {
              type: 'database',
              name: this.databaseCommandForm.name,
              description: this.databaseCommandForm.description,
              url: this.databaseCommandForm.url,
              scriptType: this.databaseCommandForm.type,
              resultVariable: this.databaseCommandForm.resultVariable
            }
            
            if (this.databaseCommandForm.type === 'sql') {
              commandData.sql = this.databaseCommandForm.sql
            } else if (this.databaseCommandForm.type === 'file') {
              commandData.fileName = this.databaseCommandForm.fileName
              commandData.storedFilename = this.databaseCommandForm.storedFilename
              commandData.absolutePath = this.databaseCommandForm.absolutePath
            }
            
            if (this.editingStepId) {
              const activeTab = this.$refs.editorPanel?.getActiveTab()
              if (activeTab) {
                const step = activeTab.steps.find(s => s.id === this.editingStepId)
                if (step) {
                  step.name = this.databaseCommandForm.name
                  step.description = this.databaseCommandForm.description
                  step.commandData = commandData
                  if (activeTab.folderName && activeTab.flowName) {
                    this.$refs.editorPanel.saveFlowToFile(activeTab)
                  }
                  ElMessage.success(this.t('updateSuccess'))
                }
              }
              this.databaseCommandDialogVisible = false
              this.editingStepId = null
              this.isEditingCommand = false
              return
            }
            
            if (this.isFromDrag) {
              this.$refs.editorPanel.addStep({
                name: this.databaseCommandForm.name,
                description: this.databaseCommandForm.description
              }, commandData)
              ElMessage.success(this.t('componentAddedSuccess'))
              this.databaseCommandDialogVisible = false
              this.isFromDrag = false
              return
            }
            
            let response, successMessage
            if (this.isEditingCommand) {
              response = await fetch('/api/update-command', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  groupName, 
                  commandIndex: this.currentCommandIndex, 
                  command: commandData 
                })
              })
              successMessage = '数据库组件更新成功'
            } else {
              response = await fetch('/api/create-database-command', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ groupName, command: commandData })
              })
              successMessage = '数据库组件创建成功'
            }
            
            const data = await response.json()
            
            if (data.success) {
              console.log(this.isEditingCommand ? '数据库组件更新成功:' : '数据库组件创建成功:', data)
              ElMessage.success(successMessage)
              await this.$refs.leftPanel.loadCustomGroups()
              this.databaseCommandDialogVisible = false
            } else {
              console.error(this.isEditingCommand ? '更新数据库组件失败:' : '创建数据库组件失败:', data.error)
              ElMessage.error(this.getErrorMessage(data.error))
            }
          } catch (error) {
            console.error(this.isEditingCommand ? '更新数据库组件失败:' : '创建数据库组件失败:', error)
            ElMessage.error(this.isEditingCommand ? '更新数据库组件失败，请检查服务器是否运行' : '创建数据库组件失败，请检查服务器是否运行')
          }
        }
      })
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.required-mark {
  color: #f56c6c;
  margin-right: 4px;
}

.required-label {
  display: inline-flex;
  align-items: center;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

/* 让上传组件的文件名完整显示 */
.el-upload-list__item {
  height: auto !important;
  min-height: 40px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

.el-upload-list__item-info {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.el-upload-list__item-name {
  white-space: normal !important;
  word-break: break-all !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: none !important;
  width: auto !important;
}

.el-upload-list__item-file-name {
  padding: 0 3px !important;
}

.el-upload-list__item-status-label {
  flex-shrink: 0;
  margin-right: 8px;
}

.el-icon--close {
  flex-shrink: 0;
  z-index: 10;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
  width: 100%;
  position: relative;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 2px;
  padding: 2px;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.left-panel-container {
  display: flex;
  gap: 2px;
}

.center-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.right-panel-container {
  display: flex;
  gap: 2px;
  min-width: 0;
  min-height: 0;
}

.bottom-panel-container {
  display: flex;
  flex-direction: column;
}

.resizer {
  background-color: #e0e0e0;
  position: relative;
}

.resizer:hover {
  background-color: #409eff;
  cursor: col-resize;
}

.resizer-right {
  width: 4px;
  height: 100%;
  cursor: col-resize;
}

.resizer-left {
  width: 4px;
  height: 100%;
  cursor: col-resize;
}

.resizer-top {
  height: 4px;
  width: 100%;
  cursor: row-resize;
}

.resizer-top:hover {
  background-color: #409eff;
  cursor: row-resize;
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
  left: 0;
  top: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
  z-index: 9999 !important;
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

.group-dialog {
  z-index: 9999 !important;
}

.group-dialog :deep(.el-dialog) {
  z-index: 9999 !important;
}

.group-dialog :deep(.el-dialog__wrapper) {
  z-index: 9999 !important;
}

.required-item :deep(.el-form-item__label)::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.group-dialog {
  z-index: 9999 !important;
}

.group-dialog :deep(.el-dialog) {
  z-index: 9999 !important;
}

.group-dialog :deep(.el-dialog__wrapper) {
  z-index: 9999 !important;
}
</style>
