<template>
    <div class="danmu-container" :style="`height: ${height}px;`">
       
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import { useStore } from '@store'
    const store = useStore()
    
    const props = defineProps({
        height: {
            type: Number,
            default: 200
        }
    })
</script>
<style scoped>
    .danmu-container {
        width: 100dvw;
        height: 100dvh;
        /* background-color: transparent; */
    }
</style>