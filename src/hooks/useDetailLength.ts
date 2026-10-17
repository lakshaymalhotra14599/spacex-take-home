import { useEffect, useState } from 'react'
import { DETAIL_LENGTH_RULES, detailLengthRule, type DetailLengthRule } from '../format/detailLength.ts'

const boundedRules = DETAIL_LENGTH_RULES.filter((rule) => Number.isFinite(rule.maxWidth))

export function useDetailLength(): DetailLengthRule {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const mediaQueries = boundedRules.map((rule) => window.matchMedia(`(max-width: ${rule.maxWidth}px)`))
    const update = () => setWidth(window.innerWidth)
    mediaQueries.forEach((query) => query.addEventListener('change', update))
    return () => mediaQueries.forEach((query) => query.removeEventListener('change', update))
  }, [])

  return detailLengthRule(width)
}
