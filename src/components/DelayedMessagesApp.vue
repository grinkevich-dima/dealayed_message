<script setup lang="ts">
import { shallowRef, ref, computed, watch } from 'vue'
import { getLocalTimeZone, now } from '@internationalized/date'
import type { TabsItem } from '@bitrix24/b24ui-nuxt'
import ChatsIcon from '@bitrix24/b24icons-vue/outline/ChatsIcon'
import BulletedListIcon from '@bitrix24/b24icons-vue/outline/BulletedListIcon'
import ScheduledDateTimePicker from './ScheduledDateTimePicker.vue'

const tz = getLocalTimeZone()

const scheduledAt = shallowRef(now(tz))

const messageText = ref('')
const attachment = ref<File[]>([])
const scheduleError = ref('')

watch(scheduledAt, () => {
  scheduleError.value = ''
})

type ScheduledMessage = {
  id: string
  text: string
  scheduledAt: Date
  fileNames?: string[]
}

const scheduledMessages = ref<ScheduledMessage[]>([])

const items = [
  {
    label: 'Новое сообщение',
    icon: ChatsIcon,
    slot: 'compose' as const
  },
  {
    label: 'Запланированные',
    icon: BulletedListIcon,
    slot: 'list' as const
  }
] satisfies TabsItem[]

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short'
})

function fileLabels(files: File[]): string[] | undefined {
  const names = files.map((f) => f.name).filter(Boolean)
  return names.length ? names : undefined
}

const formState = computed(() => ({
  messageText: messageText.value,
  scheduledAt: scheduledAt.value,
  attachment: attachment.value
}))

function onAttachmentChange(e: Event) {
  const input = e.target as HTMLInputElement | null
  const selected = input?.files ? Array.from(input.files) : []
  if (!selected.length) return

  const existing = attachment.value
  const key = (f: File) => `${f.name}::${f.size}::${f.lastModified}`
  const existingKeys = new Set(existing.map(key))
  attachment.value = [...existing, ...selected.filter((f) => !existingKeys.has(key(f)))]

  // Позволяет повторно выбрать те же файлы в следующий раз.
  if (input) input.value = ''
}

function removeAttachment(index: number) {
  attachment.value = attachment.value.filter((_, i) => i !== index)
}

function addPreset(hours: number, days: number) {
  scheduledAt.value = scheduledAt.value.add({ hours, days })
}

function onSchedule() {
  const text = messageText.value.trim()
  if (!text) return

  scheduleError.value = ''
  const at = scheduledAt.value.toDate()
  if (at.getTime() <= Date.now()) {
    scheduleError.value =
      'Укажите время в будущем: сегодняшний день уже не может быть в прошлом по времени.'
    return
  }

  const names = fileLabels(attachment.value)

  scheduledMessages.value.push({
    id: crypto.randomUUID(),
    text,
    scheduledAt: at,
    fileNames: names
  })

  messageText.value = ''
  attachment.value = []
}
</script>

<template>
  <div class="w-[600px] max-w-full mx-auto px-2 py-2">
    <h1
      class="text-lg font-semibold text-(--ui-color-design-plain-heading-content) mb-2"
    >
      Отложенные сообщения
    </h1>

    <B24Tabs
      variant="link"
      :items="items"
      class="gap-2 w-full"
      :b24ui="{ trigger: 'w-auto px-2', list: 'flex gap-2 flex-wrap' }"
    >
      <template #compose>
        <B24Form
          :state="formState"
          class="flex flex-col gap-3 mt-2"
          @submit.prevent="onSchedule"
        >
          <B24FormField
            label="Текст сообщения"
            name="messageText"
            required
          >
            <B24Textarea
              v-model="messageText"
              required
              class="w-full min-h-[64px]"
              placeholder="Введите текст…"
            />
          </B24FormField>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
            <div class="w-full sm:flex-1 min-w-0 self-start">
              <B24FormField
                label="Дата и время отправки"
                name="scheduledAt"
              >
                <ScheduledDateTimePicker
                  v-model="scheduledAt"
                  :hour-cycle="24"
                />
              </B24FormField>
              <div class="mt-1 flex flex-wrap gap-2">
                <B24Button
                  label="+1ч"
                  variant="outline"
                  size="sm"
                  @click="addPreset(1, 0)"
                />
                <B24Button
                  label="+1д"
                  variant="outline"
                  size="sm"
                  @click="addPreset(0, 1)"
                />
                <B24Button
                  label="+1нед"
                  variant="outline"
                  size="sm"
                  @click="addPreset(0, 7)"
                />
              </div>
            </div>

            <B24FormField
              label="Файлы"
              name="attachment"
              class="w-full sm:w-[280px] min-w-0 self-start"
            >
              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-3">
                  <input
                    type="file"
                    multiple
                    class="block w-full max-w-[260px] text-(length:--ui-font-size-sm) text-(--ui-color-design-plain-na-content) file:mr-3 file:rounded-(--ui-border-radius-sm) file:border-0 file:bg-(--ui-color-design-selection-bg) file:px-3 file:py-1.5 file:text-(--ui-color-design-selection-content)"
                    @change="onAttachmentChange"
                  >
                </div>

                <ul
                  v-if="attachment.length"
                  class="max-h-20 overflow-auto pr-1"
                >
                  <li
                    v-for="(f, idx) in attachment"
                    :key="`${f.name}-${f.size}-${f.lastModified}`"
                    class="flex items-center gap-2 py-0.5"
                  >
                    <span
                      class="min-w-0 flex-1 truncate whitespace-nowrap text-(length:--ui-font-size-sm) text-(--ui-color-design-plain-na-content)"
                      :title="f.name"
                    >
                      {{ f.name }}
                    </span>
                    <B24Button
                      label="×"
                      variant="ghost"
                      size="sm"
                      @click="removeAttachment(idx)"
                    />
                  </li>
                </ul>
              </div>
            </B24FormField>
          </div>

          <B24Alert
            v-if="scheduleError"
            color="air-primary-alert"
            title="Некорректное время"
            :description="scheduleError"
            class="w-full"
          />

          <B24Button
            type="submit"
            label="Запланировать"
            color="air-boost"
            class="self-start"
          />
        </B24Form>
      </template>

      <template #list>
        <div class="mt-2">
          <B24Empty
            v-if="scheduledMessages.length === 0"
            title="Пока ничего нет"
            description="Запланируйте сообщение на вкладке «Новое сообщение»."
            class="min-h-28"
          />

          <div
            v-else
            class="flex flex-col gap-3"
          >
            <B24Card
              v-for="row in scheduledMessages"
              :key="row.id"
              variant="outline"
              class="p-3"
            >
              <p class="text-(length:--ui-font-size-sm) text-(--ui-color-design-plain-na-content) mb-1">
                {{ dateTimeFormatter.format(row.scheduledAt) }}
              </p>
              <p class="text-(length:--ui-font-size-md) text-(--ui-color-design-plain-heading-content) whitespace-pre-wrap">
                {{ row.text }}
              </p>
              <p
                v-if="row.fileNames?.length"
                class="text-(length:--ui-font-size-sm) text-(--ui-color-design-plain-na-content) mt-2"
              >
                Файлы: {{ row.fileNames.join(', ') }}
              </p>
            </B24Card>
          </div>
        </div>
      </template>
    </B24Tabs>
  </div>
</template>
