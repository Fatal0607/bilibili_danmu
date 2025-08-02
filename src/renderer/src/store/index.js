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
            roomId: '1002320',
            danmuSettings: {
                fontSize: 28,
                color: '#f8f8f8',
                opacity: 0.8,
                displayArea: 0.3,
                display: null,
                speed: 200,
                backgroundOpacity: 0.3,
                intoFontSize: 28,
                // 弹幕窗口离顶部距离
                danmuWindowTopDistance: 0,
            }
        }
    },
    actions: {
        saveDanmuSettings(settings) {
            this.danmuSettings = { ...settings };
        },
        changeRoomId(newRoomId) {
            this.roomId = newRoomId;
        }
    },
    persist: true,
})