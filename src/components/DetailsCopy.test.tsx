import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetailsCopy } from './DetailsCopy.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mockOverflow(overflows: boolean) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(overflows ? 120 : 40)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40)
}

describe('DetailsCopy', () => {
  it('leaves short details without a more button', () => {
    mockOverflow(false)
    render(<DetailsCopy text="Mission details" lines={4} />)

    expect(screen.getByText('Mission details')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more details' })).not.toBeInTheDocument()
  })

  it('shows the rest of a truncated detail and can collapse it again', async () => {
    mockOverflow(true)
    const user = userEvent.setup()
    render(<DetailsCopy text="A long mission description that does not fit." lines={2} />)

    const copy = screen.getByText('A long mission description that does not fit.')
    expect(copy).toHaveStyle({ WebkitLineClamp: '2' })

    await user.click(screen.getByRole('button', { name: 'Show more details' }))

    expect(copy).toHaveClass('is-open')
    expect(copy).not.toHaveStyle({ WebkitLineClamp: '2' })
    expect(screen.getByRole('button', { name: 'Show less details' })).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Show less details' }))
    expect(screen.getByRole('button', { name: 'Show more details' })).toHaveAttribute('aria-expanded', 'false')
  })
})
