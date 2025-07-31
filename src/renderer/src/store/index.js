import { defineStore } from 'pinia'

async function fetchPrimaryDisplay() {
    try {
        const displayInfo = await window.electronAPI.getDisplayInfo();
        return displayInfo.primaryDisplay;
    } catch (error) {
        throw new Error('获取显示器信息失败');
    }
}

export const useStore = defineStore('storeId', {
    state:  () => {
        return {
            danmuSettings: {
                fontSize: 24,
                color: '#ffffff',
                opacity: 0.8,
                displayArea: 0.5,
                display: null,
                speed: 200,
                backgroundOpacity: 1,
            }
        }
    },
    actions: {
        saveDanmuSettings(settings) {
            this.danmuSettings = { ...settings };
        }
    },
    persist: true,
})