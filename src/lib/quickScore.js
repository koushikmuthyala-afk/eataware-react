/**
 * EatAware Quick Score — client-side ingredient text parser
 * Used in ScannerModal "Grade Ingredients" tab
 * Parses raw ingredient text (from a pack label) and returns A-F grade
 */

const RULES = [
  { re: /partially hydrogenat|vanaspati/i,          name: 'Trans fat / PHO',            risk: 'h', pts: -40 },
  { re: /tbhq|ins.?319/i,                           name: 'TBHQ (INS 319)',             risk: 'h', pts: -15 },
  { re: /tartrazine|ins.?102|\be102\b/i,            name: 'Tartrazine (E102)',           risk: 'h', pts: -10 },
  { re: /sunset yellow|ins.?110/i,                  name: 'Sunset Yellow (E110)',        risk: 'h', pts: -8  },
  { re: /allura red|ins.?129/i,                     name: 'Allura Red (E129)',           risk: 'h', pts: -8  },
  { re: /sodium benzoate|ins.?211/i,                name: 'Sodium Benzoate',             risk: 'h', pts: -8  },
  { re: /potassium bromate/i,                       name: 'Potassium Bromate (BANNED)',  risk: 'h', pts: -25 },
  { re: /\bmsg\b|monosodium glutamate|ins.?621/i,  name: 'MSG (INS 621)',               risk: 'c', pts: -5  },
  { re: /palm oil|palmolein|palm fat/i,             name: 'Palm oil',                    risk: 'c', pts: -7  },
  { re: /\bmaida\b|refined wheat|refined flour/i,  name: 'Refined flour (Maida)',       risk: 'c', pts: -5  },
  { re: /maltodextrin/i,                            name: 'Maltodextrin (GI 110)',       risk: 'c', pts: -6  },
  { re: /artificial colou|caramel colou|e150/i,    name: 'Artificial colour',           risk: 'c', pts: -6  },
  { re: /nature identical|artificial flavou/i,     name: 'Artificial flavouring',       risk: 'c', pts: -5  },
  { re: /high fructose corn syrup|hfcs/i,          name: 'HFCS',                        risk: 'h', pts: -12 },
  { re: /added sugar|sucrose(?!\s*ester)/i,        name: 'Added sugar',                 risk: 'c', pts: -6  },
  { re: /lactobacillus|probiotic|live cultur/i,    name: 'Live cultures',               risk: 's', pts: +12 },
  { re: /whole grain|whole wheat|ragi|bajra|jowar|foxtail|rolled oat|\bmillet/i,
                                                    name: 'Whole grain / millet',        risk: 's', pts: +10 },
  { re: /omega.?3|flaxseed|chia seed/i,            name: 'Omega-3 source',              risk: 's', pts: +6  },
  { re: /turmeric|curcumin/i,                      name: 'Turmeric (curcumin)',         risk: 's', pts: +6  },
  { re: /no added sugar|unsweetened/i,              name: 'No added sugar',             risk: 's', pts: +5  },
  { re: /pea protein|whey protein|soy protein/i,   name: 'Real protein source',         risk: 's', pts: +6  },
]

const GRADE_BANDS = [
  { grade: 'A', min: 82 }, { grade: 'B', min: 67 }, { grade: 'C', min: 52 },
  { grade: 'D', min: 32 }, { grade: 'E', min: 12 }, { grade: 'F', min: 0 },
]

export function quickScore(text) {
  const lower = text.toLowerCase()
  let score = 100
  const flags = []
  const used = new Set()

  for (const rule of RULES) {
    if (!used.has(rule.name) && rule.re.test(lower)) {
      flags.push({ name: rule.name, risk: rule.risk, pts: rule.pts })
      score += rule.pts
      used.add(rule.name)
    }
  }

  score = Math.max(0, Math.min(100, score))

  // If zero rules matched, the text likely isn't a real ingredient list
  const unrecognized = flags.length === 0

  let grade = 'F'
  for (const band of GRADE_BANDS) {
    if (score >= band.min) { grade = band.grade; break }
  }

  return { score, grade, flags, unrecognized }
}

export const RISK_LABELS = {
  h: { emoji: '🔴', color: '#dc2626', label: 'High concern' },
  c: { emoji: '🟡', color: '#d97706', label: 'Caution'      },
  s: { emoji: '🟢', color: '#16a34a', label: 'Beneficial'   },
}
