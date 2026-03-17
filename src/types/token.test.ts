import { describe, it, expect } from 'vitest'
import { createToken, type TokenSize } from './token'

describe('createToken', () => {
  it('creates a token with the given name', () => {
    const token = createToken('Goblin')
    expect(token.name).toBe('Goblin')
  })

  it('defaults size to 1', () => {
    const token = createToken('Goblin')
    expect(token.size).toBe(1)
  })

  it('accepts a custom size', () => {
    const sizes: TokenSize[] = [0.5, 1, 2, 3, 4]
    for (const size of sizes) {
      const token = createToken('Token', size)
      expect(token.size).toBe(size)
    }
  })

  it('sets image to undefined when not provided', () => {
    const token = createToken('Goblin')
    expect(token.image).toBeUndefined()
  })

  it('sets image when provided', () => {
    const url = 'https://example.com/goblin.png'
    const token = createToken('Goblin', 1, url)
    expect(token.image).toBe(url)
  })

  it('generates a non-empty string ID', () => {
    const token = createToken('Goblin')
    expect(typeof token.id).toBe('string')
    expect(token.id.length).toBeGreaterThan(0)
  })

  it('generates unique IDs for every call', () => {
    const ids = Array.from({ length: 1000 }, () => createToken('Token').id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(1000)
  })
})
