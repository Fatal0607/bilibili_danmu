<template>
    <div class="danmu-window" :style="`background-color: rgba(0,0,0,${danmuSettings.backgroundOpacity});`">
        <vue-danmaku ref="danmakuRef" style="height: 100dvh;" v-model:danmus="danmuList" :speeds="danmuSettings.speed">
            <template #danmu="{ danmu }">
                <div class="danmu-item"
                    :style="`font-size: ${danmuSettings.fontSize}px; color: ${danmuSettings.color};opacity: ${danmuSettings.opacity};`">
                    <el-avatar :src="danmu.avatar" :size="danmuSettings.fontSize * 1.2" />
                    <span>{{ danmu.name }}：{{ danmu.text }}</span>
                </div>
            </template>
        </vue-danmaku>
    </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@store'

import vueDanmaku from 'vue-danmaku'

import pako from 'pako'

const danmuList = ref([])

const danmuSettings = ref(useStore().danmuSettings)

const danmakuRef = ref(null)

onMounted(async () => {
    danmakuRef.value.play()

})

electron.ipcRenderer.on('preview-danmu', () => {
    danmakuRef.value.insert({ name: '用户1', text: '这是一条预览弹幕', avatar: "https://i1.hdslb.com/bfs/face/2a2b3c81e92fb1ac798cb0ed66f2cfef9cf42d99.jpg" })
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

// 监听弹幕消息
danmuExtractor.on('MsgData', (content) => {
    // console.log("接收到的数据", content)
    if (content.cmd === 'DANMU_MSG') {
        const sendUser = content.info[0][15]?.user || null;
        const userName = content.info[2][1]  || '';
        const message = content.info[1] || '';
        console.log("收到弹幕", userName, sendUser, message);
        if(danmakuRef.value){
            danmakuRef.value.insert({ name: userName, text: message, avatar: sendUser?.base?.face || userName })
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
        uid: 0,
        roomid: roomId,
        protover: 2,
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
    /* background-color: #00000080; */
}

.danmu-item {
    display: flex;
    align-items: center;
}
</style>