import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Rocket } from '../api/spacex.ts'

type RocketFilterProps = {
  rockets: Rocket[]
  rocketId: string
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onChange: (rocketId: string) => void
}

const ALL_ROCKETS: Rocket = { id: 'all', name: 'All rockets' }

export function RocketFilter({ rockets, rocketId, isLoading, error, onRetry, onChange }: RocketFilterProps) {
  const options = [ALL_ROCKETS, ...rockets]
  const selected = options.find((rocket) => rocket.id === rocketId) ?? ALL_ROCKETS
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const waiting = isLoading && rockets.length === 0

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    return () => document.removeEventListener('pointerdown', closeOnOutside)
  }, [open])

  function openMenu(index = options.findIndex((rocket) => rocket.id === selected.id)) {
    setActiveIndex(index < 0 ? 0 : index)
    setOpen(true)
  }

  function choose(id: string) {
    onChange(id)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openMenu()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu()
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + options.length) % options.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(options[activeIndex]?.id ?? selected.id)
    }
  }

  return (
    <form className="rocket-filter" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="rocket-filter">Rocket</label>
      <div className="rocket-filter-control" ref={rootRef}>
        <button
          ref={triggerRef}
          id="rocket-filter"
          type="button"
          className="rocket-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={waiting}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onTriggerKeyDown}
        >
          <span>{waiting ? 'Loading rockets' : selected.name}</span>
          <span className="rocket-chevron" aria-hidden="true" />
        </button>
        <div
          id={listId}
          className="rocket-menu"
          role="listbox"
          aria-label="Rockets"
          hidden={!open}
          onKeyDown={onMenuKeyDown}
        >
          {options.map((rocket, index) => (
            <button
              key={rocket.id}
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              type="button"
              role="option"
              aria-selected={rocket.id === selected.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(rocket.id)}
            >
              {rocket.name}
              {rocket.id === selected.id ? <span className="rocket-mark" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </div>
      {waiting ? <p className="hint">Loading rockets</p> : null}
      {error ? (
        <p className="inline-error" role="status">
          Rocket names could not be refreshed. {error}{' '}
          <button type="button" onClick={onRetry}>
            Retry rockets
          </button>
        </p>
      ) : null}
    </form>
  )
}
