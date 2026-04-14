<template>
  <aside class="right-panel" :style="{ width: width + 'px' }">
    <!-- 流程信息、全局变量放在同一个div中 -->
    <div class="right-content">
      <!-- 流程信息 -->
      <FlowSection 
        ref="flowSection"
        @create-flow="$emit('create-flow', $event)" 
        @delete-flow="$emit('delete-flow', $event)"
        @open-flow="$emit('open-flow', $event)"
        @rename-flow="$emit('rename-flow', $event)"
        :language="language"
      />

      <!-- 全局变量 -->
      <!-- <GlobalVariables 
        :variables-height="variablesHeight"
        :global-variables="globalVariables"
        @add-variable="$emit('add-variable')"
        @edit-variable="$emit('edit-variable', $event)"
        :language="language"
      /> -->
    </div>
  </aside>
</template>

<script>
import FlowSection from './FlowSection.vue'
import GlobalVariables from './GlobalVariables.vue'

export default {
  name: 'RightPanel',
  components: {
    FlowSection,
    GlobalVariables
  },
  props: {
    width: {
      type: Number,
      default: 220
    },
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
  emits: ['add-variable', 'edit-variable', 'create-flow', 'delete-flow', 'open-flow', 'rename-flow'],
  methods: {
    refreshFlowFolders() {
      if (this.$refs.flowSection && this.$refs.flowSection.loadFlowFolders) {
        this.$refs.flowSection.loadFlowFolders()
      }
    }
  }
}
</script>

<style scoped>
.right-panel {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px;
  min-height: 0;
  overflow: hidden;
}
</style>
