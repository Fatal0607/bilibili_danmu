<template>
  <router-view />
</template>
<script setup>
  //应用初始化完成后构建弹幕通道
  onMounted(() => {
    const { ipcRenderer } = require('electron')
    ipcRenderer.send('build-danmu-channel')
  })
</script>

<style>
  @import './assets/main.css';
</style>