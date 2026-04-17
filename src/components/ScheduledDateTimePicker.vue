<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { CalendarDate, ZonedDateTime } from '@internationalized/date'
import { Time, getLocalTimeZone, toCalendarDate, today } from '@internationalized/date'
import CalendarIcon from '@bitrix24/b24icons-vue/outline/CalendarIcon'

/**
 * B24InputDate в ките — только сегменты DateField, без всплывающего календаря.
 * Здесь: поле-триггер + B24Popover с B24Calendar и B24InputTime.
 */
const props = withDefaults(
  defineProps<{
    hourCycle?: 12 | 24
    minCalendarDate?: CalendarDate
  }>(),
  {
    hourCycle: 24,
    minCalendarDate: undefined
  }
)

const model = defineModel<ZonedDateTime>({ required: true })

const tz = getLocalTimeZone()
const popoverOpen = ref(false)

// #region agent log (console)
async function measurePopover(runId: string = 'pre-fix') {
  if (typeof window === 'undefined') return

  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  const vv = window.visualViewport
  const trigger = document.querySelector('[data-dtp-trigger="1"]') as HTMLElement | null
  const pop = document.querySelector('.dtp-popover') as HTMLElement | null
  const popParent = pop?.parentElement as HTMLElement | null
  const cal = document.querySelector('.dtp-calendar') as HTMLElement | null

  // #region agent log (fix attempt)
  // После открытия поповера библиотека выставляет transform на wrapper (fixed+translate).
  // В низких окнах это приводит к y<0 / y>vh и обрезанию. Перебиваем inline transform с !important.
  try {
    if (window.matchMedia('(max-height: 340px)').matches && popParent) {
      popParent.style.setProperty('transform', 'none', 'important')
      popParent.style.setProperty('top', '0', 'important')
      popParent.style.setProperty('left', '0', 'important')
      popParent.style.setProperty('right', '0', 'important')
      popParent.style.setProperty('bottom', '0', 'important')
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
  } catch {
    // ignore
  }
  // #endregion agent log (fix attempt)

  const rect = (el: HTMLElement | null) =>
    el ? { x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height } : null
  const css = (el: HTMLElement | null) => {
    if (!el) return null
    const s = getComputedStyle(el)
    
    return {
      position: s.position,
      overflow: s.overflow,
      overflowY: s.overflowY,
      maxHeight: s.maxHeight,
      height: s.height,
      transform: 'none'
    }
  }

  try {
    const payload = {
      runId,
      viewport: {
        inner: { w: window.innerWidth, h: window.innerHeight },
        visualViewport: vv ? { w: vv.width, h: vv.height, offsetTop: vv.offsetTop, scale: vv.scale } : null,
        scroll: { x: window.scrollX, y: window.scrollY },
        mq340: window.matchMedia('(max-height: 340px)').matches,
        mq300: window.matchMedia('(max-height: 300px)').matches
      },
      rects: { trigger: rect(trigger), pop: rect(pop), popParent: rect(popParent), cal: rect(cal) },
      styles: { pop: css(pop), popParent: css(popParent), cal: css(cal) },
      ancestors: (() => {
        const res: Array<{ tag: string; id: string; cls: string; transform: string; position: string }> = []
        let n = popParent as HTMLElement | null
        for (let i = 0; i < 10 && n && n !== document.body; i++) {
          const s = getComputedStyle(n)
          res.push({
            tag: n.tagName,
            id: n.id || '',
            cls: (n.className && typeof n.className === 'string') ? n.className : '',
            transform: s.transform,
            position: s.position
          })
          n = n.parentElement as HTMLElement | null
        }
        return res
      })()
    }
    console.groupCollapsed('[DTP] popover measure')
    console.log(payload)
    console.groupEnd()
  } catch {
    // ignore
  }
}

watch(popoverOpen, (open) => {
  if (!open) return

  measurePopover('pre-fix')
})
// #endregion agent log (console)

const minDay = computed(() => props.minCalendarDate ?? today(tz))

const calendarDay = computed({
  get: (): CalendarDate => toCalendarDate(model.value),
  set: (d: CalendarDate) => {
    model.value = model.value.set({
      year: d.year,
      month: d.month,
      day: d.day
    })
  }
})

const timeOnly = computed({
  get: (): Time =>
    new Time(
      model.value.hour,
      model.value.minute,
      model.value.second,
      model.value.millisecond
    ),
  set: (t: Time) => {
    model.value = model.value.set({
      hour: t.hour,
      minute: t.minute,
      second: t.second,
      millisecond: t.millisecond
    })
  }
})

const displayLabel = computed(() =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(model.value.toDate())
)
</script>

<template>
  <B24Modal fullscreen
    class="w-full"
    :b24ui="{
      content:
        'w-full w-fit max-w-[calc(100vw-1rem)] overflow-y-auto'
    }"
  >
    <button
      type="button"
      data-dtp-trigger="1"
      class="flex w-full min-h-10 items-center justify-between gap-2 rounded-(--ui-border-radius-md) border border-(--ui-color-divider-vibrant-accent-more) px-3 py-2 text-left text-(length:--ui-font-size-md) text-(--ui-color-design-plain-heading-content) shadow-sm outline-none transition hover:border-(--ui-color-design-selection-content) focus-visible:ring-2 focus-visible:ring-(--ui-color-design-selection-content) focus-visible:ring-offset-1"
    >
      <span class="min-w-0 truncate">{{ displayLabel }}</span>
      <CalendarIcon
        class="size-5 shrink-0 text-(--ui-color-design-plain-na-content)"
        aria-hidden="true"
      />
    </button>

    <template #content="{ close }">
      
        <div class="dtp-layout inline-flex w-full flex-col gap-3">
          <B24Calendar

            v-model="calendarDay"
            :min-value="minDay"
            class="dtp-calendar w-fit h-full"
          />

          <div class="dtp-controls flex w-full items-end justify-between gap-2">
            <div class="dtp-time flex min-w-0 flex-col gap-1">
              <span
                class="text-(length:--ui-font-size-sm) font-(--ui-font-weight-medium) text-(--ui-color-design-plain-heading-content)"
              >
                Время
              </span>
              <div
                class="rounded-(--ui-border-radius-md) transition focus-within:ring-2 focus-within:ring-(--ui-color-design-selection-content) focus-within:ring-offset-1 hover:bg-(--ui-color-divider-vibrant-accent-less)"
              >
                <B24InputTime
                  v-model="timeOnly"
                  :hour-cycle="hourCycle"
                  class="b24-time-field w-full max-w-[60px]"
                />
              </div>
              <B24Button
              class="dtp-done"
              label="Готово"
              color="air-boost"
              @click="close"
            />
            </div>

            
          </div>
        </div>
    
    </template>
  </B24Modal>
</template>

<style>
.dtp-popover {
  /* Пузырь не должен “улетать” в край экрана */
  transform-origin: top center;
}

/* Компактный режим для низких окон (например 600x300) */
@media (max-height: 340px) {
  .dtp-popover {
    /* Фиксируем контент к viewport, чтобы его не уводило collision-ом выше экрана */
    position: fixed !important;
    top: 0.5rem !important;
    right: 0.5rem !important;
    bottom: 0.5rem !important;
    left: 0.5rem !important;
    width: calc(100vw - 1rem) !important;
    height: calc(100vh - 1rem) !important;
    display: block !important;
    max-height: none !important;
    overflow: auto !important;
    transform: none !important;
    z-index: 2147483000;
  }

  .dtp-card {
    padding: 0.25rem;
  }

  .dtp-calendar {
    /* Мягкое масштабирование календаря вместо скролла */
    transform: scale(0.75);
    transform-origin: top center;
  }

  .dtp-layout {
    /* Календарь слева, управление справа */
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 0.5rem;
    align-items: start;
  }

  .dtp-controls {
    /* Правая колонка на всю высоту календаря */
    align-self: stretch;
    height: 80%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 110px;
  }

  .dtp-time {
    align-items: flex-start;
  }

  .dtp-done {
    align-self: flex-end;
    margin-top: 120px;
  }
}

.b24-time-field :deep(button),
.b24-time-field :deep([role='spinbutton']),
.b24-time-field :deep(input),
.b24-time-field :deep([contenteditable='true']) {
  border-radius: var(--ui-border-radius-sm);
  transition: background-color 120ms ease, outline-color 120ms ease, box-shadow 120ms ease;
}

.b24-time-field :deep(button:hover),
.b24-time-field :deep([role='spinbutton']:hover),
.b24-time-field :deep(input:hover),
.b24-time-field :deep([contenteditable='true']:hover) {
  background-color: var(--ui-color-divider-vibrant-accent-less);
}

.b24-time-field :deep(button:focus-visible),
.b24-time-field :deep([role='spinbutton']:focus-visible),
.b24-time-field :deep(input:focus-visible),
.b24-time-field :deep([contenteditable='true']:focus-visible) {
  outline: 2px solid var(--ui-color-design-selection-content);
  outline-offset: 1px;
}
</style>
