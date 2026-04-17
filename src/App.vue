<script setup lang="ts">
import { ru } from '@bitrix24/b24ui-nuxt/locale'
</script>

<template>
  <Suspense>
    <B24App :locale="ru">
      <B24Main class="w-[600px] max-w-full h-[300px] max-h-[300px] overflow-auto">
        <RouterView />
      </B24Main>
    </B24App>
  </Suspense>
</template>
