<template>
  <!-- 
    MapPanel.vue - 地图展示面板组件
    
    【组件功能】
    这是一个简化的地图展示组件，用于演示：
    1. 业务数据展示（城市列表）
    2. 用户交互（点击城市）
    3. 与 AvatarPanel 的联动
    
    【使用方式】
    <MapPanel
      :city-data="cityData"
      :selected-city="selectedCity"
      @select-city="onSelectCity"
    />
  -->
  <div class="map-panel">
    <!-- 标题区域 -->
    <div class="panel-header">
      <h2 class="title">🏙️ 城市数据展示</h2>
      <p class="subtitle">点击城市查看详情，虚拟人会自动介绍</p>
    </div>
    
    <!-- 城市列表 -->
    <div class="city-list">
      <div
        v-for="city in cityData"
        :key="city.name"
        class="city-card"
        :class="{ active: selectedCity === city.name }"
        @click="onClickCity(city.name)"
      >
        <!-- 城市名称 -->
        <div class="city-name">{{ city.name }}</div>
        
        <!-- 数据指标 -->
        <div class="city-value">
          <span class="value">{{ formatNumber(city.value) }}</span>
          <span class="unit">万人次</span>
        </div>
        
        <!-- 描述 -->
        <div class="city-desc">{{ city.desc }}</div>
        
        <!-- 选中指示器 -->
        <div v-if="selectedCity === city.name" class="selected-indicator">
          ✓ 已选中
        </div>
      </div>
    </div>
    
    <!-- 提示信息 -->
    <div class="panel-footer">
      <div class="hint">
        <span class="hint-icon">💡</span>
        <span class="hint-text">点击上方城市卡片，虚拟人将为您介绍该城市</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * MapPanel 组件 - 业务数据展示示例
 * 
 * 【设计说明】
 * 本组件模拟了一个简单的数据展示场景：
 * - 展示城市列表和基础数据
 * - 用户点击城市后触发事件
 * - 父组件（DemoScreen）接收到事件后，调用 AvatarPanel 的方法
 * 
 * 【与 SDK 的关联】
 * 这个组件本身不直接使用 SDK，但演示了如何：
 * 1. 将业务数据传递给 SDK（通过 pageData）
 * 2. 通过事件触发 SDK 交互（调用 askCity 方法）
 */

// ==================== Props 定义 ====================

const props = defineProps({
  /** 城市数据列表 */
  cityData: {
    type: Array,
    default: () => []
  },
  /** 当前选中的城市名称 */
  selectedCity: {
    type: String,
    default: ''
  }
})

// ==================== Emits 定义 ====================

const emit = defineEmits(['select-city'])

// ==================== 方法定义 ====================

/**
 * 城市卡片点击事件
 * @param {string} cityName - 城市名称
 */
function onClickCity(cityName) {
  console.log('[MapPanel] 选中城市:', cityName)
  emit('select-city', cityName)
}

/**
 * 格式化数字（添加千分位）
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num) {
  if (!num && num !== 0) return '-'
  return num.toLocaleString('zh-CN')
}
</script>

<style scoped>
/* ==================== 面板容器 ==================== */

.map-panel {
  width: 100%;
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(15, 35, 60, 0.9) 0%, rgba(10, 22, 40, 0.95) 100%);
  color: #e0e0e0;
  overflow: hidden;
}

/* ==================== 标题区域 ==================== */

.panel-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(59, 123, 196, 0.3);
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* ==================== 城市列表 ==================== */

.city-list {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding-right: 8px;
}

/* 自定义滚动条 */
.city-list::-webkit-scrollbar {
  width: 6px;
}

.city-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.city-list::-webkit-scrollbar-thumb {
  background: rgba(59, 123, 196, 0.5);
  border-radius: 3px;
}

.city-list::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 123, 196, 0.7);
}

/* ==================== 城市卡片 ==================== */

.city-card {
  position: relative;
  padding: 20px;
  background: rgba(30, 58, 95, 0.4);
  border: 1px solid rgba(59, 123, 196, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.city-card:hover {
  background: rgba(43, 90, 143, 0.5);
  border-color: rgba(59, 123, 196, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.city-card.active {
  background: rgba(43, 90, 143, 0.7);
  border-color: rgba(59, 123, 196, 0.9);
  box-shadow: 0 0 20px rgba(59, 123, 196, 0.3);
}

/* 城市名称 */
.city-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

/* 数据指标 */
.city-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.value {
  font-size: 28px;
  font-weight: 700;
  color: #4fc3f7;
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* 描述 */
.city-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

/* 选中指示器 */
.selected-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  border-radius: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ==================== 底部提示 ==================== */

.panel-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(59, 123, 196, 0.2);
}

.hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(59, 123, 196, 0.15);
  border-radius: 8px;
  border-left: 3px solid rgba(59, 123, 196, 0.6);
}

.hint-icon {
  font-size: 16px;
}

.hint-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

/* ==================== 响应式适配 ==================== */

@media (max-width: 768px) {
  .map-panel {
    padding: 16px;
  }
  
  .title {
    font-size: 20px;
  }
  
  .city-list {
    grid-template-columns: 1fr;
  }
  
  .value {
    font-size: 24px;
  }
}
</style>
