import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vite tailwind configuration', () => {
  it('loads @tailwindcss/vite plugin', () => {
    const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts')
    const viteConfig = readFileSync(viteConfigPath, 'utf8')

    expect(viteConfig).toContain("import tailwindcss from '@tailwindcss/vite'")
    expect(viteConfig).toContain('tailwindcss()')
  })
})
