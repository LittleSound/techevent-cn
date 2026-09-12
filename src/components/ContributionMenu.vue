<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { eventEditUrl, newEventFileUrl, newEventUrl } from '~/config'
import { buildContributionPrompt } from '~/utils/contribution'

interface TriggerProps {
  triggerStyle?: 'icon' | 'link' | 'primary' | 'secondary'
  label?: string
}

type ContributionMenuProps = TriggerProps & (
  | { intent: 'add', event?: never }
  | { intent: 'edit', event: NormalizedEvent }
)

const {
  intent,
  event,
  triggerStyle = 'link',
  label,
} = defineProps<ContributionMenuProps>()

const isOpen = ref(false)
const triggerElement = ref<HTMLElement>()

const editEvent = computed(() => intent === 'edit' ? event : undefined)

/** The prompt is intentionally prepared before copying so the clipboard action remains synchronous. */
const prompt = computed(() =>
  editEvent.value
    ? buildContributionPrompt({ intent: 'edit', event: editEvent.value })
    : buildContributionPrompt({ intent: 'add' }),
)

const { copy, copied, isSupported } = useClipboard({
  source: prompt,
  legacy: true,
})

const triggerLabel = computed(() =>
  label ?? (editEvent.value ? '编辑或补充此活动' : '贡献活动'),
)

const githubUrl = computed(() =>
  editEvent.value ? eventEditUrl(editEvent.value.id) : newEventFileUrl,
)

const dialogTitle = computed(() =>
  editEvent.value ? '编辑或补充此活动' : '贡献一个新活动',
)

const dialogDescription = computed(() =>
  editEvent.value
    ? `选择适合你的方式，帮助完善「${editEvent.value.name}」的信息。`
    : '选择适合你的方式，把值得参加的技术活动分享给社区。',
)

const copyDescription = computed(() =>
  editEvent.value
    ? '包含贡献指南、调查要求和当前活动上下文'
    : '包含贡献指南和新活动的调查、填写要求',
)

const triggerClass = computed(() => ({
  icon: 'icon-btn',
  link: 'text-teal-600 inline-flex gap-1 items-center hover:underline',
  primary: 'action-button',
  secondary: 'text-sm px-3 py-2 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center justify-center hover:text-teal-600 hover:border-teal-600 dark:border-gray-700',
})[triggerStyle])

/** Open the contribution choices and retain the trigger so keyboard focus can return on close. */
function openMenu(clickEvent: MouseEvent) {
  triggerElement.value = clickEvent.currentTarget instanceof HTMLElement
    ? clickEvent.currentTarget
    : undefined
  isOpen.value = true
}

/** Close the modal and return focus to the entry point that opened it. */
function closeMenu() {
  isOpen.value = false
  nextTick(() => triggerElement.value?.focus())
}

/** Copy the complete Agent prompt while leaving the menu open to show confirmation. */
function copyPrompt() {
  copy()
}

onKeyStroke('Escape', () => {
  if (isOpen.value)
    closeMenu()
})
</script>

<template>
  <button
    type="button"
    :class="triggerClass"
    :title="triggerStyle === 'icon' ? triggerLabel : undefined"
    :aria-label="triggerStyle === 'icon' ? triggerLabel : undefined"
    :aria-expanded="isOpen"
    @click="openMenu"
  >
    <div :class="editEvent ? 'i-carbon-edit' : 'i-carbon-add-alt'" />
    <span v-if="triggerStyle !== 'icon'">{{ triggerLabel }}</span>
  </button>

  <Teleport to="body">
    <div v-if="isOpen" class="inset-0 fixed z-60">
      <button
        type="button"
        class="bg-black/45 inset-0 absolute"
        aria-label="关闭贡献菜单"
        @click="closeMenu"
      />
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="dialogTitle"
        class="text-gray-700 p-5 rounded-xl bg-white max-w-md w-[calc(100%_-_2rem)] shadow-2xl left-1/2 top-1/2 fixed z-1 dark:text-gray-200 dark:bg-gray-900 -translate-x-1/2 -translate-y-1/2"
      >
        <div flex="~ items-start justify-between gap-4">
          <div>
            <h2 text-lg font-700>
              {{ dialogTitle }}
            </h2>
            <p text-sm mt-1 op65>
              {{ dialogDescription }}
            </p>
          </div>
          <button type="button" class="icon-btn shrink-0" title="关闭" @click="closeMenu">
            <div i-carbon-close />
          </button>
        </div>

        <div mt-5 flex="~ col gap-2">
          <button
            type="button"
            class="p-3 text-left border border-gray-200 rounded-lg flex gap-3 w-full transition items-start dark:border-gray-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30"
            :disabled="!isSupported"
            @click="copyPrompt"
          >
            <div :class="copied ? 'i-carbon-checkmark' : 'i-carbon-copy'" text-xl text-teal-600 mt-0.5 shrink-0 />
            <span>
              <span font-600 block>{{ copied ? '提示词已复制' : '复制给 Agent 的提示词' }}</span>
              <span text-xs mt-0.5 op60 block>{{ copied ? '现在可以粘贴给你的编码 Agent' : copyDescription }}</span>
            </span>
          </button>

          <a
            :href="githubUrl"
            target="_blank"
            rel="noopener"
            class="p-3 border border-gray-200 rounded-lg flex gap-3 transition items-start dark:border-gray-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30"
          >
            <div :class="editEvent ? 'i-carbon-edit' : 'i-carbon-document-add'" text-xl text-teal-600 mt-0.5 shrink-0 />
            <span>
              <span font-600 block>{{ editEvent ? '在 GitHub 上编辑此活动' : '在 GitHub 上添加活动' }}</span>
              <span text-xs mt-0.5 op60 block>{{ editEvent ? '直接打开当前活动的 JSON 数据文件' : '在活动目录中新建一份 JSON 数据文件' }}</span>
            </span>
            <div i-carbon-arrow-up-right ml-auto mt-1 op45 shrink-0 />
          </a>

          <a
            :href="newEventUrl"
            target="_blank"
            rel="noopener"
            class="p-3 border border-gray-200 rounded-lg flex gap-3 transition items-start dark:border-gray-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30"
          >
            <div i-carbon-book text-xl text-teal-600 mt-0.5 shrink-0 />
            <span>
              <span font-600 block>阅读贡献指南</span>
              <span text-xs mt-0.5 op60 block>了解活动字段、收录原则和提交步骤</span>
            </span>
            <div i-carbon-arrow-up-right ml-auto mt-1 op45 shrink-0 />
          </a>
        </div>

        <p v-if="!isSupported" text-xs text-red-600 mt-3>
          当前浏览器无法访问剪贴板，请改用贡献指南。
        </p>
      </section>
    </div>
  </Teleport>
</template>
