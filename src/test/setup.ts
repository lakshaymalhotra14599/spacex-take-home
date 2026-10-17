import '@testing-library/jest-dom/vitest'

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => {
    const maxWidth = Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return {
      matches: window.innerWidth <= maxWidth,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
    }
  }
}
