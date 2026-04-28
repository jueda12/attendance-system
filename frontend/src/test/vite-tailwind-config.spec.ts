// @vitest-environment node
import { describe, expect, it } from 'vitest'
import viteConfig from '../../vite.config'

describe('vite tailwind configuration', () => {
  it('loads @tailwindcss/vite plugin', () => {
    const plugins = (viteConfig.plugins ?? []).flat()
    const hasTailwind = plugins.some(
      (p) =>
        p !== null &&
        p !== false &&
        typeof p === 'object' &&
        'name' in p &&
        typeof (p as { name: string }).name === 'string' &&
        (p as { name: string }).name.includes('tailwind')
    )
    expect(hasTailwind).toBe(true)
  })
})
