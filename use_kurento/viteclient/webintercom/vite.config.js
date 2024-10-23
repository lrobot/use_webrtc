import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
import fs from 'fs';
import { resolve } from 'path';

import react from '@vitejs/plugin-react'



var server = {}
if (fs.existsSync('./_keys/server.crt') && fs.existsSync('./_keys/server.key')) {
  server = {
    https : {
        key: fs.readFileSync('./_keys/server.key'),
        cert: fs.readFileSync('./_keys/server.crt')
      }
    }
    console.log(' https://srv.rbat.tk:5173/')
} else {
    console.log(' http://srv.rbat.tk:5173/')
}
// https://vitejs.dev/config/
export default defineConfig({
  // 配置公共基础路径，通常是相对路径或绝对路径
  base: './',
  build: {
    // 输出目录，默认为 'dist'
    outDir: 'dist',

    // 清除dist目录中的旧文件
    emptyOutDir: true,

    // 指定构建后文件的哈希命名方式
    assetsDir: 'assets',  // 资源文件夹名
    assetsInlineLimit: 4096,  // 小于此大小（以字节为单位）的资源将以 base64 编码内联

    // 是否启用 CSS 代码拆分
    cssCodeSplit: true,

    // 压缩选项，默认为 'esbuild'
    minify: 'esbuild', // 也可以使用 'terser'，但构建速度较慢

    // 生成 sourcemap 文件
    sourcemap: false, // 设为 true 来生成 source maps

    // rollup 的额外配置
    rollupOptions: {
      input: {
        // 指定入口文件
        // main: './src/main.js',
        main: resolve(__dirname, 'index.html'),
        mcu: resolve(__dirname, 'mcu.html'),
        batchcall: resolve(__dirname, 'batchcall.html'),
        // 也可以为每个页面指定入口文件
        // page1: './src/page1.js',
        // page2: './src/page2.js',

      },
      output: {
        // 用于自定义 chunks 分包
        manualChunks: {
          // 将 node_modules 中的模块拆分为单独的 chunk
          vendor: []//['vue', 'axios'], // 根据使用的库调整
        },
      },
    },

    // 目标浏览器
    target: 'esnext', // 如果需要兼容较旧的浏览器，可以指定其他值
  },
  server,
  plugins: [react()],
});
