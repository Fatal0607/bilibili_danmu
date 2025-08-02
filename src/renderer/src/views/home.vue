<template>
    <div class="page-container">
        <div class="top-view">
            <h2 class="title">Bilibili 直播弹幕机</h2>
        </div>
        <div class="content-container">
            <div class="danmu-container" :style="`height:${actionContainerHeight}px`">
                <el-text  type="info">新弹幕在上面，旧弹幕在下面</el-text>
                <DynamicScroller :items="danmuList" :min-item-size="54" class="danmu-scroller" ref="danmuScroller">
                    <template v-slot="{ item, index, active }">
                        <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[
                            item.message,
                        ]" :data-index="index">
                           <div class="danmu-item">
                             <div  style="display: flex;flex-shrink: 0">
                                <el-avatar :src="item.sender?.base?.face" :size="28" />
                                <el-text style="flex-shrink: 0" type="primary">{{ item.sender?.base?.name }}:</el-text>
                             </div>
                             <el-text >{{ item.message }}</el-text>
                           </div>
                        </DynamicScrollerItem>
                    </template>
                </DynamicScroller>
            </div>
            <div class="action-container" ref="actionContainer">
                <div class="link-container">
                    <el-card class="control-card" header="连接直播间" style="min-height: 200px;width: 100%;">
                        <el-form @submit.prevent="handleConnect">
                            <el-input v-model="roomId" placeholder="请输入房间号" clearable
                                :disabled="isConnectingOrConnected" @keyup.enter="handleConnect" style="width: 240px;">
                                <template #prepend>房间号</template>
                            </el-input>

                            <el-button :type="connectionButtonType" @click="handleConnect"
                                :disabled="isConnectingOrConnected" :loading="isConnecting">
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
                                <el-slider v-model="danmuSettings.fontSize" :min="16" :max="60" :step="2" />
                                <el-text>{{ danmuSettings.fontSize }}</el-text>
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
                                <el-color-picker v-model="danmuSettings.color" />
                                <el-text>{{ danmuSettings.color }}</el-text>
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
                                <el-slider v-model="danmuSettings.opacity" :min="0" :max="1" :step="0.01" />
                                <el-text>{{ danmuSettings.opacity }}</el-text>
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
                                <el-slider v-model="danmuSettings.displayArea" :min="0.1" :max="1" :step="0.1" />
                                <el-text>{{ danmuSettings.displayArea }}</el-text>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-item-content">
                                <el-text>弹幕滚动速度</el-text>
                                <el-popover placement="top-start" title="弹幕滚动速度" :width="200" trigger="hover"
                                    content="用于设置弹幕滚动速度，单位为每秒移动的像素数，数值越大速度越快">
                                    <template #reference>
                                        <el-icon><i-ep-InfoFilled /></el-icon>
                                    </template>
                                </el-popover>
                            </div>
                            <div class="setting-item-content">
                                <el-slider v-model="danmuSettings.speed" :min="40" :max="600" :step="20" />
                                <el-text>{{ danmuSettings.speed }}</el-text>
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
                                <el-select v-model="danmuSettings.display" placeholder="请选择显示器" value-key="id"
                                    style="width: 240px">
                                    <el-option v-for="item in displays" :key="item.id" :label="item.label"
                                        :value="item.id" />
                                </el-select>
                                <el-icon @click="refreshDisplayInfo"><i-ep-Refresh /></el-icon>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-item-content">
                                <el-text>弹幕窗口背景透明度</el-text>
                                <el-popover placement="top-start" title="弹幕窗口背景透明度" :width="200" trigger="hover"
                                    content="用于设置弹幕窗口的背景透明度">
                                    <template #reference>
                                        <el-icon><i-ep-InfoFilled /></el-icon>
                                    </template>
                                </el-popover>
                            </div>
                            <div class="setting-item-content">
                                <el-slider v-model="danmuSettings.backgroundOpacity" :min="0" :max="1" :step="0.1" />
                                <el-text>{{ danmuSettings.backgroundOpacity }}</el-text>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-item-content">
                                <el-text>进入房间字体大小</el-text>
                                <el-popover placement="top-start" title="进入房间字体大小" :width="200" trigger="hover"
                                    content="用于设置进入房间字体大小">
                                    <template #reference>
                                        <el-icon><i-ep-InfoFilled /></el-icon>
                                    </template>
                                </el-popover>
                            </div>
                            <div class="setting-item-content">
                                <el-slider v-model="danmuSettings.intoFontSize" :min="24" :max="40" :step="1" />
                                <el-text>{{ danmuSettings.intoFontSize }}</el-text>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-item-content">
                                <el-text>弹幕窗口离顶部距离</el-text>
                                <el-popover placement="top-start" title="弹幕窗口离顶部距离" :width="200" trigger="hover"
                                    content="用于设置弹幕窗口离顶部的距离">
                                    <template #reference>
                                        <el-icon><i-ep-InfoFilled /></el-icon>
                                    </template>
                                </el-popover>
                            </div>
                            <div class="setting-item-content">
                                <el-slider v-model="danmuSettings.danmuWindowTopDistance" :min="0" :max="800" :step="20" />
                                <el-text>{{ danmuSettings.danmuWindowTopDistance }}</el-text>
                            </div>
                        </div>
                        
                    </div>
                    <el-button type="primary" @click="handleSave">保存弹幕设置</el-button>
                    <el-button type="primary" @click="handlePreview">预览弹幕</el-button>
                </el-card>
            </div>
        </div>


    </div>
</template>

<script setup>
import { ref, computed, onUnmounted, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const actionContainer = ref(null)

const actionContainerHeight = computed(() => {
    if (actionContainer.value) {
        return actionContainer.value.offsetHeight
    }
    return 0
})

const danmuScroller = ref(null)

import { useStore } from '@store'
const store = useStore()

// 连接状态枚举
const ConnectionState = {
    IDLE: 'idle',       // 空闲状态
    CONNECTING: 'connecting', // 连接中
    CONNECTED: 'connected'   // 已连接
}

const roomId = ref(store.roomId)
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



// 获取真实房间号
async function getRoomId(shortId) {
    try {
        let url = `https://api.live.bilibili.com/room/v1/Room/room_init?id=${shortId}`
        if (import.meta.env.DEV) {
            url = `/api/room/v1/Room/room_init?id=${shortId}`
        }
        const response = await fetch(url);
        const data = await response.json();
        console.log("获取真实房间号", data.data.room_id);
        return data.data.room_id;
    } catch (error) {
        throw new Error('获取房间信息失败: ' + error.message);
    }
}

// 获取消息流服务器和密钥
async function getDanmuInfo(roomId) {
    try {
        let url = `https://workers.laplace.cn/bilibili/room-conn-info/${roomId}?loginSync=b9zkt47rz2JRogFPZxfvrQ%40mmT45C1eVwT9eFcnELt8rt`
        if (import.meta.env.DEV) {
            url = `/workers/bilibili/room-conn-info/${roomId}?loginSync=b9zkt47rz2JRogFPZxfvrQ%40mmT45C1eVwT9eFcnELt8rt`
        }
        const response = await fetch(url);
        const data = await response.json();
        return data.data;
    } catch (error) {
        throw new Error('获取弹幕服务器信息失败: ' + error.message);
    }
}


const danmuSettings = reactive(store.danmuSettings)

const handleConnect = async () => {
    // 验证输入
    if (!validateRoomId()) return

    // 更新状态
    connectionState.value = ConnectionState.CONNECTING
    errorMessage.value = ''

    // 连接过程
    try {
        window.electronAPI.openDanMuWindow(JSON.stringify(danmuSettings))
        const realyRoomId = await getRoomId(roomId.value)
        const danmuInfo = await getDanmuInfo(realyRoomId)
        console.log("获取消息流服务器和密钥", danmuInfo);
        await window.electronAPI.connectToRoom(danmuInfo, realyRoomId)
        store.changeRoomId(roomId.value)
        connectionState.value = ConnectionState.CONNECTED
        ElMessage({
            message: `成功连接房间：${roomId.value}`,
            type: 'success',
            plain: true,
        })
    } catch (error) {
        connectionState.value = ConnectionState.IDLE
        ElMessage({
            message: `连接失败：${error.message}`,
            type: 'error',
            plain: true,
        })
    }
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
    window.electronAPI.disconnectFromRoom()
    danmuList.value = []
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


//发送预览弹幕
const handlePreview = async () => {
    const res = await window.electronAPI.previewDanmu()
    ElMessage({
        message: res.message,
        type: res.type,
        plain: true,
    })
}

// 保存弹幕设置
const handleSave = async () => {
    store.saveDanmuSettings(danmuSettings)
    window.electronAPI.changeDanmuSettings(JSON.stringify(danmuSettings))
    ElMessage.success('设置保存成功')
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
        danmuSettings.display = info.primaryDisplay.id;
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
    // if(actionContainer.value){
    //     actionContainerHeight.value = actionContainer.value.offsetHeight
    // }
});


const danmuList = ref([])

electron.ipcRenderer.on('update-danmu-list', (event, list) => {
    danmuList.value.unshift(...list)
    // console.log("更新弹幕列表", danmuList.value)
    // if(danmuScroller.value){
    //     danmuScroller.value.scrollToBottom()
    // }
})

// 组件卸载时清理
// onUnmounted(clearTimer)
</script>

<style scoped>
.page-container {
    min-width: 600px;
    max-width: 100vw;
    margin: 0 auto;
    padding: 20px;
    overflow: hidden;
    user-select: none;
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

.content-container {
    display: flex;
    align-items: center;
    gap: 20px;
}

.danmu-container {
    width: 300px;
    background-color: #ffffff;
    border-radius: 5px;
    padding: 5px;
}

.danmu-scroller {
    height: calc(100% - 30px);
}
.danmu-item{
    padding: 5px 0;
    display: flex ;
    align-items: flex-start;
    gap: 10px;
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
