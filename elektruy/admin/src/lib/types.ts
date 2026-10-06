import type { Lang } from './utils'

export type Tr<T> = Record<Lang, T>

export type StepDraft = {
  id: string
  image_path: string | null
  illustration: string | null
  tools: string[]
  t: Tr<{ text: string; warning: string }>
}

export type QuizDraft = {
  id: string
  correct_index: number
  t: Tr<{ question: string; options: string[]; explanation: string }>
}

export type LessonDraft = {
  id: string
  slug: string
  sort_order: number
  difficulty: number
  est_minutes: number
  icon: string | null
  published: boolean
  t: Tr<{ title: string; summary: string }>
  steps: StepDraft[]
  quiz: QuizDraft[]
}

/** Built-in SVGs bundled in the app (assets/illustrations); used when a step has no uploaded picture. */
export const ILLUSTRATIONS = [
  'breaker_off', 'bulb', 'cable_route', 'electrician', 'junction_box', 'lamp', 'lamp_wiring', 'multimeter', 'socket_box',
  'socket_wiring', 'switch_double', 'switch_off', 'switch_pass', 'switch_single', 'tools', 'voltage_tester', 'wago', 'wall_chase',
  'warning_sign', 'wire_colors',
]
