<script setup lang="ts">
import { calendarUrl, newEventUrl, repoUrl } from '~/config'

const subscribeOpen = ref(false)
/** Webcal scheme lets calendar apps subscribe with one click on most platforms. */
const webcalUrl = computed(() => `webcal://${location.host}${calendarUrl}`)
</script>

<template>
  <header flex="~ wrap items-center gap-3 justify-between" px-5 py-4>
    <div>
      <h1 text-xl tracking-tight font-700>
        techevent-cn
      </h1>
      <p text-sm op60>
        中国（及周边）科技活动日历
      </p>
    </div>

    <nav flex="~ items-center gap-4">
      <div relative>
        <button class="icon-btn" title="订阅日历" @click="subscribeOpen = !subscribeOpen">
          <div i-carbon-calendar-add />
        </button>
        <div
          v-if="subscribeOpen"
          text-sm mt-2 p-3 card w-64 shadow-lg right-0 absolute z-10
        >
          <p font-600 mb-2>
            订阅日历
          </p>
          <p mb-3 op70>
            在日历应用中订阅，新活动会自动同步。
          </p>
          <a :href="webcalUrl" class="chip chip-idle" mb-2 w-full justify-center>
            <div i-carbon-add /> 一键订阅 (webcal)
          </a>
          <a :href="calendarUrl" download class="chip chip-idle" w-full justify-center>
            <div i-carbon-download /> 下载 .ics 文件
          </a>
        </div>
      </div>

      <a :href="newEventUrl" target="_blank" rel="noopener" class="icon-btn" title="提交活动">
        <div i-carbon-add-alt />
      </a>
      <a :href="repoUrl" target="_blank" rel="noopener" class="icon-btn" title="GitHub 仓库">
        <div i-carbon-logo-github />
      </a>
      <button class="icon-btn" title="切换暗色模式" @click="toggleDark()">
        <div i-carbon-sun dark:i-carbon-moon />
      </button>
    </nav>
  </header>
</template>
