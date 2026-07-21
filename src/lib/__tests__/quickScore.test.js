import { describe, it, expect } from 'vitest'
import { quickScore } from '../quickScore.js'

describe('grade correctness', () => {
  it('grades clean single-ingredient products A/B', () => {
    const r = quickScore('Rolled Oats (100%)')
    expect(['A', 'B']).toContain(r.grade)
    expect(r.unrecognized).toBeFalsy()
  })

  it('grades trans-fat products E/F', () => {
    const r = quickScore('Refined Wheat Flour (Maida), Vanaspati, Sugar, Invert Sugar Syrup')
    expect(['E', 'F']).toContain(r.grade)
  })

  it('keeps TBHQ + artificial colour products in D-F', () => {
    const r = quickScore('Refined Wheat Flour (Maida), Palmolein (TBHQ), Salt, Tartrazine (INS 102)')
    expect(['D', 'E', 'F']).toContain(r.grade)
  })

  it('rewards clean formulations', () => {
    const r = quickScore('Rolled Oats (40%), Almonds, Raisins, Pumpkin Seeds, Chia Seeds, Cocoa Solids, Pink Salt')
    expect(['A', 'B']).toContain(r.grade)
  })
})

describe('junk resistance', () => {
  it('marks pure garbage unrecognized', () => {
    expect(quickScore('(, Manufatyreq &').unrecognized).toBe(true)
  })

  it('no simplicity bonus for garbage', () => {
    const r = quickScore('(, Manufatyreq &')
    expect(r.flags.find(f => f.name.includes('Single ingredient'))).toBeUndefined()
  })

  it('junk fragments never trigger count penalty', () => {
    const junky = quickScore('Water, Almond (3%), Emulsifier (INS 322), Salt, TT, ===, eee RT, =, q')
    // No processing penalty invented from junk...
    expect(junky.flags.find(f => f.name.includes('processed)'))).toBeUndefined()
    // ...and the user is told the scan is unreliable
    expect(junky.flags.find(f => f.name.includes('estimate'))).toBeDefined()
  })
})

describe('natural vs refined sugar (v4)', () => {
  it('natural fruit sugars not penalized', () => {
    expect(['A', 'B']).toContain(quickScore('Dates, Raisins, Almonds, Cashews').grade)
  })

  it('refined sugar first penalized', () => {
    expect(['C', 'D', 'E', 'F']).toContain(quickScore('Sugar, Wheat Flour, Palm Oil, Cocoa Solids').grade)
  })
})
