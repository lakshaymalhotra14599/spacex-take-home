import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RocketFilter } from './RocketFilter.tsx'

const rockets = [
  { id: 'falcon-9', name: 'Falcon 9' },
  { id: 'falcon-heavy', name: 'Falcon Heavy' },
]

afterEach(() => {
  cleanup()
})

function renderFilter(overrides: Partial<Parameters<typeof RocketFilter>[0]> = {}) {
  const onChange = vi.fn()
  const onRetry = vi.fn()
  render(
    <RocketFilter
      rockets={rockets}
      rocketId="all"
      isLoading={false}
      error={null}
      onRetry={onRetry}
      onChange={onChange}
      {...overrides}
    />,
  )
  return { onChange, onRetry }
}

describe('RocketFilter', () => {
  it('keeps the menu closed until the trigger is opened', async () => {
    const user = userEvent.setup()
    renderFilter()

    expect(screen.getByRole('button', { name: 'Rocket' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('option', { name: 'Falcon Heavy' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rocket' }))

    expect(screen.getByRole('button', { name: 'Rocket' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: 'All rockets' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Falcon 9' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Falcon Heavy' })).toBeInTheDocument()
  })

  it('selects a rocket and closes the menu', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilter()

    await user.click(screen.getByRole('button', { name: 'Rocket' }))
    await user.click(screen.getByRole('option', { name: 'Falcon Heavy' }))

    expect(onChange).toHaveBeenCalledWith('falcon-heavy')
    expect(screen.queryByRole('option', { name: 'Falcon Heavy' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rocket' })).toHaveFocus()
  })

  it('moves through options with the keyboard and selects the focused one', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilter()
    const trigger = screen.getByRole('button', { name: 'Rocket' })

    trigger.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith('falcon-9')
    expect(screen.queryByRole('listbox', { name: 'Rockets' })).not.toBeInTheDocument()
  })

  it('closes on Escape and on a click outside the menu', async () => {
    const user = userEvent.setup()
    renderFilter()
    const trigger = screen.getByRole('button', { name: 'Rocket' })

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox', { name: 'Rockets' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(document.body)
    expect(screen.queryByRole('listbox', { name: 'Rockets' })).not.toBeInTheDocument()
  })

  it('disables the trigger while rocket names are still loading', () => {
    renderFilter({ isLoading: true, rockets: [] })

    expect(screen.getByRole('button', { name: 'Rocket' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rocket' })).toHaveTextContent('Loading rockets')
    expect(screen.getByText('Loading rockets', { selector: 'p' })).toBeInTheDocument()
  })

  it('retries a failed rocket refresh', async () => {
    const user = userEvent.setup()
    const { onRetry } = renderFilter({ error: 'Launch Library request failed (500).' })

    expect(screen.getByRole('status')).toHaveTextContent('Launch Library request failed (500).')
    await user.click(screen.getByRole('button', { name: 'Retry rockets' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('marks the current rocket as selected', async () => {
    const user = userEvent.setup()
    renderFilter({ rocketId: 'falcon-heavy' })

    expect(screen.getByRole('button', { name: 'Rocket' })).toHaveTextContent('Falcon Heavy')
    await user.click(screen.getByRole('button', { name: 'Rocket' }))
    expect(screen.getByRole('option', { name: 'Falcon Heavy' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'All rockets' })).toHaveAttribute('aria-selected', 'false')
  })
})
