<template>
  <div class="app">
    <header class="app__header">
      <h1>Demo 前端</h1>
    </header>
    <main class="app__main">
      <section class="app__section">
        <h2>健康检查</h2>
        <div class="health">
          <button class="btn" @click="checkHealth">检查 /api/health</button>
          <pre class="health__result">{{ healthResult }}</pre>
        </div>
      </section>
      <section class="app__section">
        <h2>示例页面</h2>
        <ExamplePage />
      </section>
    </main>
  </div>
  </template>

<script setup lang="ts">
import { ref } from 'vue';
import { getHealth } from './api/client';
import ExamplePage from './pages/Example.vue';

const healthResult = ref('未检查');

async function checkHealth() {
  try {
    const data = await getHealth();
    healthResult.value = JSON.stringify(data, null, 2);
  } catch (err) {
    healthResult.value = `请求失败: ${String(err)}`;
  }
}
</script>

<style scoped>
.app { max-width: 980px; margin: 0 auto; padding: 24px; }
.app__header { margin-bottom: 16px; }
.app__main { display: grid; gap: 24px; }
.app__section { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
.btn { padding: 8px 12px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
.btn:hover { background: #1d4ed8; }
.health__result { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; }
</style>