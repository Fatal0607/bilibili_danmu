import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

//引入 element 的包
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'


export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@store': resolve('src/renderer/src/store'),
        '@components': resolve('src/renderer/src/components'),
        '@untils': resolve('src/renderer/src/untils'),
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://api.live.bilibili.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/workers': {
          target: 'https://workers.laplace.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/workers/, '')
        }
      }
    },
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver(),
        // 自动导入图标组件 
        IconsResolver({
          prefix: 'Icon',
        })],
      }),
      Components({
        resolvers: [ElementPlusResolver({
          importStyle: 'css'  // 确保启用样式自动导入
        }),
        // 自动注册图标组件
        IconsResolver({
          enabledCollections: ['ep'],
        })],
      }),
      //图标的导入配置
      Icons({
        autoInstall: true,
      }),
    ]
  }
})
