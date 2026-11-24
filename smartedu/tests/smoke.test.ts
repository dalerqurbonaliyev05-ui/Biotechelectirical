import { describe, expect, it } from 'vitest'
import { t } from '@/lib/i18n'

describe('smoke', () => {
  it("o'zbekcha matnlar yuklanadi", () => {
    expect(t.app.name).toBe('SmartEdu')
    expect(t.home.features.length).toBeGreaterThan(0)
  })
})
