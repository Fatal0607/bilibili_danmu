<template>
    <div>
        <Danmu :height="damuViewHeight" />
        <button @click="changeDisplayArea">改变弹幕区域</button>
    </div>
</template>
<script setup>
    import { ref,watch,onMounted} from 'vue'
    import { useStore } from '@store'
    
    import Danmu from '@components/danmu.vue'

    const damuViewHeight = ref(0)

    onMounted(async() => {
        
         let display = await useStore().danmuSettings.display
         damuViewHeight.value = display.size.height * useStore().danmuSettings.displayArea
    })
    watch(() => useStore().danmuSettings.displayArea, async() => {
        console.log(useStore().danmuSettings.displayArea)
        console.log('displayArea改变了')
        let display = await useStore().danmuSettings.display
        damuViewHeight.value = display.size.height * useStore().danmuSettings.displayArea
    })
    watch(() => useStore().danmuSettings.display, async() => {
        let display = await useStore().danmuSettings.display
        damuViewHeight.value = display.size.height * useStore().danmuSettings.displayArea
    })
    const changeDisplayArea = () => {
        useStore().danmuSettings.displayArea = 0.3
    }

</script>

<style scoped>
    
</style>