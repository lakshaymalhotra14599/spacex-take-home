import { describe, expect, it } from 'vitest'
import { detailLengthRule } from './detailLength.ts'

describe('detailLengthRule', () => {
  it('uses fewer lines as the viewport gets narrower', () => {
    expect(detailLengthRule(390).maxLines).toBe(2)
    expect(detailLengthRule(640).maxLines).toBe(2)
    expect(detailLengthRule(800).maxLines).toBe(3)
    expect(detailLengthRule(1100).maxLines).toBe(3)
    expect(detailLengthRule(1440).maxLines).toBe(4)
  })
})
