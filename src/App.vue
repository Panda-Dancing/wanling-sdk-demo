<template>
  <!-- 
    应用根组件
    
    整体布局说明：
    - 使用 DemoScreen 作为主页面组件
    - 演示了 SDK 的完整接入流程
  -->
  <DemoScreen />
</template>

<script setup>
/**
 * App.vue - 应用根组件
 * 
 * 这是整个应用的入口，负责渲染主页面
 * 实际业务逻辑在 DemoScreen.vue 中实现
 */
import DemoScreen from './views/DemoScreen.vue'
</script>

<style>
/* 
  全局样式
  设置页面基础样式，确保全屏显示
*/
#app {
  width: 100%;
  height: 100%;
}
</style>
