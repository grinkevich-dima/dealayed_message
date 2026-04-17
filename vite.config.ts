import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import bitrix24UIPluginVite from '@bitrix24/b24ui-nuxt/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
// Один HTML с инлайном JS/CSS — иначе Chrome блокирует ES-модули с file:// (CORS / null origin)
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    bitrix24UIPluginVite({
      colorMode: true,
      colorModeInitialValue: 'light',
      colorModeTypeLight: 'light',
      colorModeStorageKey: 'bitrix24-starter-b24ui-vue'
    }),
    viteSingleFile()
  ]
})
