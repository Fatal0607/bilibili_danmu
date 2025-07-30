<template>
    <div class="page-container">
        <div class="top-view">
            <h2 class="title">Bilibili 直播弹幕机</h2>
        </div>
        <div class="link-container">
            <el-card class="control-card" header="连接直播间" style="min-height: 200px;width: 100%;">
                <el-form @submit.prevent="handleConnect">
                    <el-input v-model="roomId" placeholder="请输入房间号" clearable :disabled="isConnectingOrConnected"
                        @keyup.enter="handleConnect">
                        <template #prepend>房间号</template>
                    </el-input>

                    <el-button :type="connectionButtonType" @click="handleConnect" :disabled="isConnectingOrConnected"
                        :loading="isConnecting">
                        {{ connectionButtonText }}
                    </el-button>
                    <el-button v-if="connectionState === ConnectionState.CONNECTED" @click="handleDisconnect"
                        type="danger">
                        断开连接
                    </el-button>
                </el-form>
            </el-card>
            <el-card header="用户信息" style="min-height: 200px;flex: none;">

                <div v-if="userInfo.isLogin" class="user-info">
                    <el-avatar :size="50" :src="userInfo.avatar" />
                    <div>
                        <el-text class="mx-1">{{ userInfo.name }}</el-text>
                    </div>

                </div>
                <div v-else class="unlogin">
                    <el-button type="primary" @click="handleLogin">去登录</el-button>
                    <div>
                        <el-text class="mx-1">未登录将无法获取到发送弹幕的用户名，弹幕内容依然可以正常获取</el-text>
                    </div>
                </div>
            </el-card>
        </div>
        <div>
            <el-card header="弹幕样式设置" style="min-height: 200px;">
                <div class="setting-container">
                    <div class="setting-item">
                        <div class="setting-item-content">
                            <el-text>弹幕字体大小</el-text>
                            <el-popover placement="top-start" title="弹幕字体大小" :width="200" trigger="hover"
                                content="用于设置显示弹幕字体大小">
                                <template #reference>
                                    <el-icon><i-ep-InfoFilled /></el-icon>
                                </template>
                            </el-popover>
                        </div>
                        <div class="setting-item-content">
                            <el-slider v-model="danmuInfo.fontSize" :min="10" :max="30" :step="1" />
                            <el-text>{{ danmuInfo.fontSize }}</el-text>
                        </div>

                    </div>
                    <div class="setting-item">
                        <div class="setting-item-content">
                            <el-text>弹幕字体颜色</el-text>
                            <el-popover placement="top-start" title="弹幕字体颜色" :width="200" trigger="hover"
                                content="用于设置显示弹幕字体颜色">
                                <template #reference>
                                    <el-icon><i-ep-InfoFilled /></el-icon>
                                </template>
                            </el-popover>
                        </div>
                        <div class="setting-item-content">
                            <el-color-picker v-model="danmuInfo.color" />
                            <el-text>{{ danmuInfo.color }}</el-text>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-content">
                            <el-text>弹幕透明度</el-text>
                            <el-popover placement="top-start" title="弹幕透明度" :width="200" trigger="hover"
                                content="用于设置弹幕透明度，1为完全不透明，0为完全透明">
                                <template #reference>
                                    <el-icon><i-ep-InfoFilled /></el-icon>
                                </template>
                            </el-popover>
                        </div>
                        <div class="setting-item-content">
                            <el-slider v-model="danmuInfo.opacity" :min="0" :max="1" :step="0.01" />
                            <el-text>{{ danmuInfo.opacity }}</el-text>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-content">
                            <el-text>弹幕显示区域</el-text>
                            <el-popover placement="top-start" title="弹幕显示区域" :width="200" trigger="hover"
                                content="用于调整弹幕显示区域的占比，1 为占满整个屏幕，0.5 为占满一半屏幕。位置始终显示在上方。">
                                <template #reference>
                                    <el-icon><i-ep-InfoFilled /></el-icon>
                                </template>
                            </el-popover>
                        </div>
                        <div class="setting-item-content">
                            <el-slider v-model="danmuInfo.displayArea" :min="0.1" :max="1" :step="0.1" />
                            <el-text>{{ danmuInfo.displayArea }}</el-text>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-content">
                            <el-text>弹幕滚动速度</el-text>
                            <el-popover placement="top-start" title="弹幕滚动速度" :width="200" trigger="hover"
                                content="用于设置弹幕滚动速度，单位为秒，例如 10 就是 从右侧滚动到左侧消失需要 10 秒。">
                                <template #reference>
                                    <el-icon><i-ep-InfoFilled /></el-icon>
                                </template>
                            </el-popover>
                        </div>
                        <div class="setting-item-content">
                            <el-slider v-model="danmuInfo.speed" :min="2" :max="30" :step="1" />
                            <el-text>{{ danmuInfo.speed }}</el-text>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-content">
                            <el-text>选择显示器</el-text>
                            <el-popover placement="top-start" title="弹幕展示的显示器" :width="200" trigger="hover"
                                content="用于选择弹幕在哪个显示器上展示">
                                <template #reference>
                                    <el-icon><i-ep-InfoFilled /></el-icon>
                                </template>
                            </el-popover>
                        </div>
                        <div class="setting-item-content">
                            <el-select v-model="danmuInfo.display" placeholder="请选择显示器" value-key="id"
                                style="width: 240px">
                                <el-option v-for="item in displays" :key="item.id" :label="item.label"
                                    :value="item.id" />
                            </el-select>
                            <el-icon @click="refreshDisplayInfo"><i-ep-Refresh /></el-icon>
                        </div>
                    </div>
                </div>
                <el-button type="primary" @click="handleSave">保存弹幕设置</el-button>
                <el-button type="primary" @click="handlePreview">预览弹幕</el-button>
            </el-card>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onUnmounted, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

import { useStore } from '@store'
const store = useStore()

console.log(store.danmuSettings)

// 连接状态枚举
const ConnectionState = {
    IDLE: 'idle',       // 空闲状态
    CONNECTING: 'connecting', // 连接中
    CONNECTED: 'connected'   // 已连接
}

const roomId = ref('')
const connectionState = ref(ConnectionState.IDLE)
const errorMessage = ref('')

// 计算属性：按钮类型
const connectionButtonType = computed(() => {
    switch (connectionState.value) {
        case ConnectionState.CONNECTING: return 'warning'
        case ConnectionState.CONNECTED: return 'success'
        default: return 'primary'
    }
})

// 计算属性：按钮文本
const connectionButtonText = computed(() => {
    switch (connectionState.value) {
        case ConnectionState.CONNECTING: return '连接中...'
        case ConnectionState.CONNECTED: return '已连接'
        default: return '连接直播间'
    }
})

// 检查连接状态
const isConnectingOrConnected = computed(() =>
    connectionState.value !== ConnectionState.IDLE
)

const isConnecting = computed(() =>
    connectionState.value === ConnectionState.CONNECTING
)

// 连接处理函数
let connectTimer = null

const handleConnect = () => {
    // 验证输入
    if (!validateRoomId()) return

    // 更新状态
    connectionState.value = ConnectionState.CONNECTING
    errorMessage.value = ''

    // 模拟连接过程
    connectTimer = setTimeout(() => {
        connectionState.value = ConnectionState.CONNECTED
        ElMessage({
            message: `成功连接房间：${roomId.value}`,
            type: 'success',
            plain: true,
        })
    }, 1500)
}

// 房间号验证
const validateRoomId = () => {
    if (!roomId.value.trim()) {
        errorMessage.value = '请输入有效的房间号'
        ElMessage({
            message: errorMessage.value,
            type: 'error',
            plain: true,
        })
        return false
    }

    if (!/^\d+$/.test(roomId.value)) {
        errorMessage.value = '房间号只能包含数字'
        ElMessage({
            message: errorMessage.value,
            type: 'error',
            plain: true,
        })
        return false
    }

    return true
}

// 断开连接
const handleDisconnect = () => {
    connectionState.value = ConnectionState.IDLE
    clearTimer()
}


// 清理定时器
const clearTimer = () => {
    if (connectTimer) {
        clearTimeout(connectTimer)
        connectTimer = null
    }
}



const userInfo = reactive({
    isLogin: false,
    name: '用户名',
    avatar: 'https://avatars.githubusercontent.com/u/70570907?v=4&size=64',
})

//登录
const handleLogin = () => {
    // window.electron.ipcRenderer.send('login')
}


const danmuInfo = reactive(store.danmuSettings)

//弹幕设置
const handlePreview = () => {
    // window.electron.ipcRenderer.send('preview')
}

// 保存弹幕设置
const handleSave = async () => {
    store.saveDanmuSettings(danmuInfo)
    ElMessage.success('设置保存成功')
    console.log(electron)
    electron.ipcRenderer.invoke('show-danmu-window', JSON.stringify(danmuInfo))

    //   showDanmuWindow: (danmuSettings) => ipcRenderer.send('show-danmu-window',danmuSettings)
    //   await window.electronAPI.showDanmuWindow();
}
//弹幕信息



// 显示器信息
const displays = ref([]);

// 获取显示器信息
async function fetchDisplayInfo() {
    try {
        const info = await window.electronAPI.getDisplayInfo();
        console.log(info)
        displays.value = info.displays;
        danmuInfo.display = info.primaryDisplay;
    } catch (error) {
        console.error('获取显示器信息失败:', error);
    }
}

// 刷新显示器信息
async function refreshDisplayInfo() {
    try {
        await fetchDisplayInfo();
        ElMessage.success('刷新成功')
    } catch (err) {
        console.error('刷新显示器信息失败:', err);
        ElMessage.error('刷新失败')
    }
}

onMounted(() => {
    fetchDisplayInfo();
});

// 组件卸载时清理
onUnmounted(clearTimer)
</script>

<style scoped>
.page-container {
    min-width: 600px;
    max-width: 100vw;
    margin: 0 auto;
    padding: 20px;
}

.title {
    text-align: center;
    color: #00a1d6;
    /* B站主题色 */
    margin-bottom: 24px;
}

.el-form {
    display: flex;
    gap: 12px;
}

.link-container {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.unlogin {
    width: 300px;
}

.user-info {
    width: 300px;
    text-align: center;
}

.setting-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px 30px;
}


.setting-item-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.preview-danmu {
    margin-top: 30px;
    border-radius: 10px;
    width: 100%;
    height: 200px;
    border: 1px solid #d1d5db;
}
</style>
