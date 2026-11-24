import { describe, expect, it } from 'vitest'
import { decideAdvance, type AdvanceInput } from '@/lib/checkpoint-flow'

const base: AdvanceInput = {
  hasOpenQuestion: false,
  skip: false,
  pendingRegular: 0,
  bonusReady: false,
  slide: 3,
  pageCount: 10,
}
const d = (p: Partial<AdvanceInput>) => decideAdvance({ ...base, ...p })

describe('decideAdvance (nazorat nuqtasi oqimi)', () => {
  it('nuqta yo‘q: oddiy keyingi slayd', () => {
    expect(d({})).toBe('advance')
  })
  it('nuqtada savol bor: doska to‘xtaydi (savol ochiladi), slayd O‘ZGARMAYDI', () => {
    expect(d({ pendingRegular: 2 })).toBe('open_next')
  })
  it('ochiq savol: "Keyingi" avval uni yopadi', () => {
    expect(d({ hasOpenQuestion: true, pendingRegular: 1 })).toBe('close')
  })
  it('yopilgach yana "Keyingi": nuqtadagi keyingi savol (yakuniy test: ketma-ket)', () => {
    expect(d({ pendingRegular: 3 })).toBe('open_next')
    expect(d({ pendingRegular: 1 })).toBe('open_next')
    expect(d({ pendingRegular: 0 })).toBe('advance')
  })
  it('o‘tkazib yuborish: ochiq savol yopiladi va slayd almashadi; ochiq yo‘q bo‘lsa — to‘g‘ridan-to‘g‘ri keyingi slayd', () => {
    expect(d({ hasOpenQuestion: true, skip: true, pendingRegular: 2 })).toBe('close_and_advance')
    expect(d({ skip: true, pendingRegular: 2 })).toBe('advance')
    expect(d({ skip: true, bonusReady: true })).toBe('advance')
  })
  it('bonus: oddiy savollar tugagach, slayd almashishidan oldin', () => {
    expect(d({ bonusReady: true })).toBe('open_bonus')
    expect(d({ bonusReady: true, pendingRegular: 1 })).toBe('open_next')
  })
  it('oxirgi slayd: nuqta tugagach joyida qoladi', () => {
    expect(d({ slide: 10 })).toBe('stay')
    expect(d({ slide: 10, pendingRegular: 1 })).toBe('open_next')
  })
})
