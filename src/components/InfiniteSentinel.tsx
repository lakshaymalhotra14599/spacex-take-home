import { useEffect, useRef } from 'react'

type InfiniteSentinelProps = {
  enabled: boolean
  resetKey: number
  onVisible: (isVisible: boolean) => void
}

export function InfiniteSentinel({ enabled, resetKey, onVisible }: InfiniteSentinelProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const onVisibleRef = useRef(onVisible)
  onVisibleRef.current = onVisible

  useEffect(() => {
    const node = nodeRef.current
    if (!enabled || !node) return undefined

    const observer = new IntersectionObserver((entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting)
      onVisibleRef.current(isVisible)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, resetKey])

  return <div ref={nodeRef} className="scroll-sentinel" data-testid="scroll-sentinel" />
}
