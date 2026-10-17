import { useEffect, useRef, useState, type CSSProperties } from 'react'

type DetailsCopyProps = {
  text: string
  lines: number
}

export function DetailsCopy({ text, lines }: DetailsCopyProps) {
  const copyRef = useRef<HTMLParagraphElement>(null)
  const [truncated, setTruncated] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const clampedStyle = {
    '--detail-lines': String(lines),
    WebkitLineClamp: lines,
    lineClamp: lines,
  } as CSSProperties

  useEffect(() => {
    const element = copyRef.current
    if (!element || expanded) return

    const measure = () => {
      setTruncated(element.scrollHeight > element.clientHeight + 1)
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [text, lines, expanded])

  return (
    <div className="details-cell">
      <p ref={copyRef} className={expanded ? 'details-copy is-open' : 'details-copy'} style={expanded ? undefined : clampedStyle}>
        {text}
      </p>
      {truncated || expanded ? (
        <button
          type="button"
          className={expanded ? 'details-more is-open' : 'details-more'}
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less details' : 'Show more details'}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      ) : null}
    </div>
  )
}
