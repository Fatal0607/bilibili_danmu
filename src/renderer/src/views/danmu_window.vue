<template>
    <div class="danmu-window" :style="`background-color: rgba(0,0,0,${danmuSettings.backgroundOpacity});`">
        <vue-danmaku ref="danmakuRef" class="danmaku-container" v-model:danmus="danmuList"
            :speeds="danmuSettings.speed">
            <template #danmu="{ danmu }">
                <div class="danmu-item" v-if="danmu.type === 'danmu'" :class="`uid-${danmu.uid}`"
                    :style="`font-size: ${danmuSettings.fontSize}px; color: ${danmuSettings.color};opacity: ${danmuSettings.opacity};`">
                    <el-avatar :src="danmu.avatar" :size="danmuSettings.fontSize * 1.2" />
                    <span class="danmu-name">{{ danmu.name }}：<span class="danmu-text">{{ danmu.text }}</span></span>
                </div>

            </template>
        </vue-danmaku>
        <div class="into-container">
            <DynamicScroller :items="intoList" :min-item-size="100" class="into-scroller" ref="intoScroller">
                <template v-slot="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[
                        item.name,
                    ]" :data-index="index" >
                    <div class="into-item-container">
                         <div class="into-item" :class="`uid-${item.uid}`"
                            :style="`font-size: ${danmuSettings.intoFontSize}px;color: ${danmuSettings.color};opacity: ${danmuSettings.opacity};`">
                            <el-avatar :src="item.avatar" :size="danmuSettings.fontSize * 1.2" style="flex-shrink: 0"/>
                            <span class="danmu-name" :line-clamp="1">{{ item.name }}<span class="danmu-text">进入了直播间</span></span>
                        </div>
                    </div>
                       
                    </DynamicScrollerItem>
                </template>
            </DynamicScroller>
        </div>
    </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@store'

import vueDanmaku from 'vue-danmaku'

import pako from 'pako'

import { parseBilibiliPB } from '@untils/interact_word_v2_parser.js'

import { throttle } from 'throttle-debounce';

const danmuList = ref([])

const danmuSettings = ref(useStore().danmuSettings)

const danmakuRef = ref(null)

onMounted(async () => {
    danmakuRef.value.play()
})

electron.ipcRenderer.on('preview-danmu', () => {
    danmakuRef.value.insert({ type: 'danmu', name: '用户1', text: '这是一条预览弹幕', avatar: "https://i1.hdslb.com/bfs/face/2a2b3c81e92fb1ac798cb0ed66f2cfef9cf42d99.jpg" })
})

electron.ipcRenderer.on('change-danmu-settings', (event, settings) => {
    const newSettings = JSON.parse(settings)
    if (newSettings.displayArea !== danmuSettings.value.displayArea) {
        console.log("改变了弹幕区域")
        danmakuRef.value.resize()
    }
    danmuSettings.value = newSettings
})

electron.ipcRenderer.on('connect-to-room', (event, danmuInfo, roomId) => {
    console.log("连接弹幕服务器", danmuInfo, roomId);
    connectToRoom(danmuInfo, roomId)
})

electron.ipcRenderer.on('disconnect-from-room', () => {
    console.log("断开弹幕服务器连接");
    disconnect()
    window.electronAPI.closeDanMuWindow()
})

let ws = null;
let heartbeatInterval = null;

// 弹幕提取器类
class DanmuExtractor {
    constructor() {
        this.callbacks = {};
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

    getDmMsg(data) {
        // 获取数据包长度，协议类型和操作类型
        const packetLen = this.readUInt32BE(data, 0);
        const proto = this.readUInt16BE(data, 6);
        const op = this.readUInt32BE(data, 8);

        // 若数据包是连着的，则根据第一个数据包的长度进行切分
        if (data.byteLength > packetLen) {
            this.getDmMsg(data.slice(packetLen));
            data = data.slice(0, packetLen);
        }

        // 判断协议类型，若为 2 则用 pako 解压
        if (proto === 2) {
            try {
                const decompressed = pako.inflate(data.slice(16));
                this.getDmMsg(decompressed.buffer);
                return;
            } catch (e) {
                console.error('解压失败:', e);
                return;
            }
        }

        if (op === 3) {
            console.info("HeartBeat");
        }

        // 判断消息类型
        if (op === 5) {
            try {
                // 解析 json
                const content = JSON.parse(new TextDecoder().decode(data.slice(16)));
                // 发送数据
                this.emit('MsgData', content);
            } catch (e) {
                console.error(`[GETDATA ERROR]: ${e}`);
            }
        }
    }

    readUInt32BE(buffer, offset) {
        const view = new DataView(buffer);
        return view.getUint32(offset, false);
    }

    readUInt16BE(buffer, offset) {
        const view = new DataView(buffer);
        return view.getUint16(offset, false);
    }
}

// 初始化弹幕提取器
const danmuExtractor = new DanmuExtractor();
// 添加进入直播间信息
const intoList = ref([])
// const throttleFunc = throttle(5000, (uname, avatar, uid) => {
//     danmakuRef.value.insert({ type: 'into', name: uname, text: '进入了直播间', avatar: avatar, uid: uid })
// })

// 用于存储最新未发送的弹幕
let newDanmuList = []

//将弹幕列表更新到主窗口,设置节流，1秒更新一次，并且为了减少数据量，每次只发送最新未发送的弹幕
const updateDanmuList = throttle(1000, () => {
    electron.ipcRenderer.send('update-danmu-list', newDanmuList)
    newDanmuList = [] // 清空已发送的弹幕列表
})

// 创建变量用于存储是否已经发送链接成功的弹幕
let isConnected = false

// 监听弹幕消息
danmuExtractor.on('MsgData', async (content) => {
    if (!isConnected) {
        danmakuRef.value.insert({ type: 'danmu', name: '系统', text: '已连接弹幕服务器', avatar: "https://youke1.picui.cn/s1/2025/08/02/688ddabe847cf.png" })
        isConnected = true
    }
    if (content.cmd === 'DANMU_MSG') {
        console.log(content)
        const sendUser = content.info[0][15]?.user || null;
        const userName = content.info[2][1] || '';
        const message = content.info[1] || '';
        if (danmakuRef.value) {
            danmakuRef.value.insert({ type: 'danmu', name: userName, text: message, avatar: sendUser?.base?.face || userName, uid: sendUser?.uid })
        }
        //将弹幕添加到最新未发送的弹幕列表
        let id = sendUser?.uid + '-' + Date.now()
        newDanmuList.push({ sender: sendUser, message: message, id: id })
        updateDanmuList()
    }
    //此处处理互动消息   
    if (content.cmd === 'INTERACT_WORD_V2') {
        try {
            const interactWord = await parseBilibiliPB(content.data.pb)

            if (interactWord.msgType === '1') {
                const avatar = interactWord?.uinfo?.base?.face || '';
                const uname = interactWord?.uname || '';
                const uid = interactWord?.uinfo?.uid || '';
                const id = uid + '-' + Date.now()
                intoList.value.unshift({ name: uname, avatar: avatar, uid: uid, id: id })
                
            }
        } catch (err) {
            console.error(err)
        }
    }

});



// 生成鉴权包
function generateCertificate(roomId, token) {
    const headerLength = 16;
    const protocol = 1;
    const type = 7;
    const sequence = 2;
    const body = JSON.stringify({
        uid: 18755900,
        roomid: roomId,
        protover: 0,
        buvid: '',
        platform: 'web',
        type: 2,
        key: token,
    });

    const bodyBytes = new TextEncoder().encode(body);
    const headerBuffer = new ArrayBuffer(headerLength);
    const headerView = new DataView(headerBuffer);

    headerView.setUint32(0, headerLength + bodyBytes.length, false);
    headerView.setUint16(4, headerLength, false);
    headerView.setUint16(6, protocol, false);
    headerView.setUint32(8, type, false);
    headerView.setUint32(12, sequence, false);

    const result = new Uint8Array(headerLength + bodyBytes.length);
    result.set(new Uint8Array(headerBuffer), 0);
    result.set(bodyBytes, headerLength);

    return result.buffer;
}

// 生成心跳包
function generateHeartbeat() {
    const headerLength = 16;
    const protocol = 1;
    const type = 2;
    const sequence = 2;
    const body = '[Object object]';

    const bodyBytes = new TextEncoder().encode(body);
    const headerBuffer = new ArrayBuffer(headerLength);
    const headerView = new DataView(headerBuffer);

    headerView.setUint32(0, headerLength + bodyBytes.length, false);
    headerView.setUint16(4, headerLength, false);
    headerView.setUint16(6, protocol, false);
    headerView.setUint32(8, type, false);
    headerView.setUint32(12, sequence, false);

    const result = new Uint8Array(headerLength + bodyBytes.length);
    result.set(new Uint8Array(headerBuffer), 0);
    result.set(bodyBytes, headerLength);

    return result.buffer;
}

// 连接到直播间
async function connectToRoom(danmuInfo, roomId) {

    try {
        const wsUrl = `wss://${danmuInfo.host_list[0].host}:${danmuInfo.host_list[0].wss_port}/sub`;
        console.log("WebSocket地址:", wsUrl);

        ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('WebSocket 连接成功');
            // 发送认证包
            const certificate = generateCertificate(roomId, danmuInfo.token);
            ws.send(certificate);

            // 开始心跳
            heartbeatInterval = setInterval(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(generateHeartbeat());
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            danmuExtractor.getDmMsg(event.data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket 错误:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket 连接关闭');

            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
        };

    } catch (error) {
        console.error('连接失败:', error);
    }
}

// 断开连接
function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
    }
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

</script>

<style scoped>
.danmu-window {
    width: 100dvw;
    height: 100dvh;
    display: flex;
    align-items: center;
}

.danmaku-container {
    width: calc(100% - 500px);
    height: 100vh;
}

.danmu-item {
    display: flex;
    align-items: center;
}

.into-container {
    width: 500px;
    height: 100vh;
    padding: 10px;
}

.into-scroller {
    height: 100%;
    /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
}
.into-item-container{
    padding: 0;
}
.into-item {
    display: flex;
    align-items: flex-start;
    padding: 4px 10px;
    border-radius: 100px;
    /* background: linear-gradient(135deg, #13F1FC, #0470DC); */
}

.uid-18755900 {
    padding: 4px 10px !important;
    border-radius: 100px !important;
    background: linear-gradient(135deg, #3B2667, #BC78EC) !important;
}

.uid-18755900 .danmu-name {
    color: #FD6E6A !important;
}

.uid-18755900 .danmu-text {
    color: #FFC600 !important;
}
</style>