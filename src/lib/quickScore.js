/**
 * EatAware Quick Score v2 — Robust ingredient grading engine
 * 
 * Philosophy:
 *   - Start at 50 (neutral baseline, not 100)
 *   - Deduct for harmful/concerning ingredients
 *   - Add for beneficial ingredients
 *   - Position-aware: first 5 ingredients weighted 2x (higher quantity)
 *   - Ingredient count penalty: >15 = ultra-processed signal
 *   - 80+ rules covering FSSAI-listed Indian food additives
 */

// ── HIGH CONCERN (red) ──────────────────────────────────────────
const AVOID = [
  // Trans fats & hydrogenation
  { re: /partially hydrogenat|vanaspati/i,        name: 'Trans fat / Vanaspati',        pts: -20 },
  // Banned / restricted preservatives
  { re: /potassium bromate/i,                     name: 'Potassium Bromate (BANNED)',    pts: -25 },
  { re: /tbhq|ins.?319/i,                         name: 'TBHQ (INS 319)',               pts: -12 },
  { re: /\bbha\b|ins.?320/i,                      name: 'BHA (INS 320)',                pts: -10 },
  { re: /\bbht\b|ins.?321/i,                      name: 'BHT (INS 321)',                pts: -8  },
  // Artificial colours (FSSAI restricted)
  { re: /tartrazine|ins.?102|\be102\b/i,          name: 'Tartrazine (E102)',             pts: -10 },
  { re: /sunset yellow|ins.?110|\be110\b/i,       name: 'Sunset Yellow (E110)',          pts: -8  },
  { re: /allura red|ins.?129|\be129\b/i,          name: 'Allura Red (E129)',             pts: -8  },
  { re: /brilliant blue|ins.?133|\be133\b/i,      name: 'Brilliant Blue (E133)',         pts: -6  },
  { re: /carmoisine|ins.?122|\be122\b/i,          name: 'Carmoisine (E122)',             pts: -7  },
  { re: /erythrosine|ins.?127|\be127\b/i,         name: 'Erythrosine (E127)',            pts: -8  },
  { re: /ponceau|ins.?124|\be124\b/i,             name: 'Ponceau 4R (E124)',             pts: -7  },
  // Harmful preservatives
  { re: /sodium benzoate|ins.?211/i,              name: 'Sodium Benzoate (INS 211)',     pts: -7  },
  { re: /potassium sorbate|ins.?202/i,            name: 'Potassium Sorbate (INS 202)',   pts: -4  },
  { re: /sodium nitrite|ins.?250/i,               name: 'Sodium Nitrite (INS 250)',      pts: -10 },
  { re: /sodium nitrate|ins.?251/i,               name: 'Sodium Nitrate (INS 251)',      pts: -8  },
  // Artificial sweeteners
  { re: /aspartame|ins.?951/i,                    name: 'Aspartame (INS 951)',           pts: -10 },
  { re: /acesulfame|ins.?950/i,                   name: 'Acesulfame-K (INS 950)',        pts: -8  },
  { re: /saccharin|ins.?954/i,                    name: 'Saccharin (INS 954)',           pts: -8  },
  { re: /cyclamate|ins.?952/i,                    name: 'Cyclamate (INS 952)',           pts: -10 },
  // High fructose corn syrup
  { re: /high fructose corn syrup|\bhfcs\b/i,     name: 'HFCS',                          pts: -12 },
]

// ── CAUTION (yellow) ────────────────────────────────────────────
const CAUTION = [
  // Processed sugars
  { re: /added sugar/i,                           name: 'Added sugar',                   pts: -5  },
  { re: /sucrose(?!\s*ester)/i,                   name: 'Sucrose',                       pts: -3  },
  { re: /dextrose/i,                              name: 'Dextrose',                      pts: -3  },
  { re: /invert sugar/i,                          name: 'Invert sugar syrup',            pts: -4  },
  { re: /corn syrup(?!.*high fructose)/i,         name: 'Corn syrup',                    pts: -4  },
  { re: /glucose syrup/i,                         name: 'Glucose syrup',                 pts: -4  },
  // Refined ingredients
  { re: /\bmaida\b|refined wheat|refined flour|all.?purpose flour/i, name: 'Refined flour (Maida)', pts: -5 },
  { re: /palm oil|palmolein|palm fat/i,           name: 'Palm oil',                      pts: -5  },
  { re: /maltodextrin/i,                          name: 'Maltodextrin (GI 110)',          pts: -5  },
  { re: /modified (?:food )?starch/i,             name: 'Modified starch',               pts: -3  },
  // MSG and flavour enhancers
  { re: /\bmsg\b|monosodium glutamate|ins.?621/i, name: 'MSG (INS 621)',                 pts: -4  },
  { re: /disodium guanylate|ins.?627/i,           name: 'Disodium Guanylate (INS 627)',  pts: -3  },
  { re: /disodium inosinate|ins.?631/i,           name: 'Disodium Inosinate (INS 631)',  pts: -3  },
  // Artificial flavour/colour
  { re: /artificial colou|synthetic colou/i,      name: 'Artificial colour',             pts: -5  },
  { re: /caramel colou|ins.?150[a-d]?/i,          name: 'Caramel colour (INS 150)',      pts: -4  },
  { re: /nature.?identical|artificial flavou/i,   name: 'Artificial flavouring',         pts: -4  },
  // Emulsifiers & thickeners of concern
  { re: /carrageenan|ins.?407/i,                  name: 'Carrageenan (INS 407)',         pts: -4  },
  { re: /polysorbate|ins.?4[36][05]/i,            name: 'Polysorbate',                   pts: -3  },
  { re: /pgpr|ins.?476/i,                         name: 'PGPR (INS 476)',                pts: -3  },
  // Phosphates
  { re: /phosphoric acid|ins.?338/i,              name: 'Phosphoric acid',               pts: -4  },
  { re: /sodium phosphate|ins.?339/i,             name: 'Sodium phosphate',              pts: -3  },
  // Bleaching / anti-caking
  { re: /calcium peroxide|ins.?930/i,             name: 'Calcium peroxide (bleach)',      pts: -4  },
  { re: /azodicarbonamide/i,                      name: 'Azodicarbonamide (banned in EU)',pts: -6  },
  // Sucralose (moderate concern)
  { re: /sucralose|ins.?955/i,                    name: 'Sucralose (INS 955)',            pts: -4  },
  // Mineral oil
  { re: /mineral oil|liquid paraffin/i,           name: 'Mineral oil',                   pts: -4  },
]

// ── BENEFICIAL (green) ──────────────────────────────────────────
const GOOD = [
  // Dried fruits & nuts (natural sugars — v4: positive, not penalized)
  { re: /\bdates?\b|khajur/i,                     name: 'Dates (natural sugar + fibre)',  pts: +4  },
  { re: /\braisins?\b|kishmish/i,                 name: 'Raisins (natural sugar + iron)', pts: +3  },
  { re: /\bfigs?\b|anjeer/i,                      name: 'Figs (natural sugar + fibre)',   pts: +3  },
  { re: /\balmonds?\b|badam/i,                    name: 'Almonds',                        pts: +4  },
  { re: /\bcashews?\b|kaju/i,                     name: 'Cashews',                        pts: +3  },
  { re: /\bwalnuts?\b|akhrot/i,                   name: 'Walnuts (omega-3)',              pts: +4  },
  { re: /\bpistachios?\b|pista/i,                 name: 'Pistachios',                     pts: +3  },
  { re: /\bmakhana\b|fox ?nuts?/i,                name: 'Makhana (fox nuts)',             pts: +5  },
  // Whole grains & millets
  { re: /whole grain|whole wheat/i,               name: 'Whole grain',                   pts: +8  },
  { re: /\bragi\b|finger millet/i,                name: 'Ragi (finger millet)',           pts: +8  },
  { re: /\bbajra\b|pearl millet/i,                name: 'Bajra (pearl millet)',           pts: +7  },
  { re: /\bjowar\b|sorghum/i,                     name: 'Jowar (sorghum)',                pts: +7  },
  { re: /foxtail millet|kangni/i,                 name: 'Foxtail millet',                pts: +7  },
  { re: /\bmillet\b/i,                            name: 'Millet',                         pts: +6  },
  { re: /rolled oat|steel.?cut oat|\boats\b/i,   name: 'Oats',                           pts: +6  },
  { re: /\bquinoa\b/i,                            name: 'Quinoa',                         pts: +7  },
  { re: /brown rice/i,                            name: 'Brown rice',                     pts: +5  },
  // Healthy fats
  { re: /olive oil/i,                             name: 'Olive oil',                      pts: +5  },
  { re: /coconut oil/i,                           name: 'Coconut oil',                    pts: +4  },
  { re: /\bghee\b/i,                              name: 'Ghee',                           pts: +4  },
  { re: /mustard oil|sesame oil|groundnut oil/i,  name: 'Traditional pressed oil',        pts: +5  },
  { re: /cold.?press|wood.?press|kachi ghani/i,   name: 'Cold/wood pressed',              pts: +5  },
  // Seeds & nuts
  { re: /flaxseed|flax seed|alsi/i,              name: 'Flaxseed (omega-3)',              pts: +5  },
  { re: /chia seed/i,                             name: 'Chia seed',                      pts: +5  },
  { re: /pumpkin seed/i,                          name: 'Pumpkin seed',                   pts: +4  },
  { re: /sunflower seed/i,                        name: 'Sunflower seed',                 pts: +4  },
  // Probiotics & fermentation
  { re: /lactobacillus|bifidobacterium|probiotic/i, name: 'Probiotic cultures',          pts: +10 },
  { re: /live cultur|fermented/i,                 name: 'Live/fermented cultures',        pts: +8  },
  // Anti-inflammatory spices
  { re: /turmeric|curcumin|haldi/i,               name: 'Turmeric (curcumin)',            pts: +5  },
  { re: /\bginger\b|adrak/i,                      name: 'Ginger',                         pts: +3  },
  { re: /\bcinnamon\b|dalchini/i,                 name: 'Cinnamon',                       pts: +3  },
  { re: /black pepper|piperine/i,                 name: 'Black pepper (piperine)',         pts: +3  },
  // Protein sources
  { re: /whey protein|pea protein|soy protein/i,  name: 'Protein source',                 pts: +5  },
  // Omega-3
  { re: /omega.?3|dha|epa/i,                      name: 'Omega-3 / DHA',                  pts: +5  },
  // Fibre
  { re: /\bfibre\b|\bfiber\b|prebiotic|inulin/i, name: 'Dietary fibre/prebiotic',         pts: +5  },
  // Clean label signals
  { re: /no added sugar|unsweetened/i,            name: 'No added sugar',                  pts: +5  },
  { re: /no artificial|no preservative/i,         name: 'No artificial additives',         pts: +6  },
  { re: /\borganic\b/i,                           name: 'Organic',                         pts: +4  },
  // Superfoods
  { re: /\bamla\b|indian gooseberry/i,            name: 'Amla (Vitamin C)',                pts: +4  },
  { re: /moringa|drumstick/i,                     name: 'Moringa',                         pts: +4  },
  { re: /ashwagandha/i,                           name: 'Ashwagandha',                     pts: +3  },
  { re: /tulsi|holy basil/i,                      name: 'Tulsi',                           pts: +3  },
]

// ── GRADE BANDS ─────────────────────────────────────────────────
const GRADE_BANDS = [
  { grade: 'A', min: 75 },
  { grade: 'B', min: 60 },
  { grade: 'C', min: 45 },
  { grade: 'D', min: 30 },
  { grade: 'E', min: 15 },
  { grade: 'F', min: 0  },
]

// ── MAIN SCORING FUNCTION ───────────────────────────────────────
export function quickScore(text) {
  const lower = text.toLowerCase()

  // Split into individual ingredients for position analysis.
  // Only keep PLAUSIBLE fragments — OCR junk ("=", "TT", "eee", symbol noise)
  // must never inflate the ingredient count or trigger processing penalties.
  const allFragments = lower
    .split(/,|;|\|/)
    .map(s => s.trim())
    .filter(s => s.length > 1)

  const isPlausible = (f) =>
    /ins\s*\d+|^e\s*\d{3}\b|\d+(\.\d+)?\s*%/.test(f) ||
    (f.length >= 3 &&
     /[aeiou]/.test(f) &&
     !/\b(\w)\1{2,}\b/.test(f) &&
     ((f.match(/[a-z]/g) || []).length / f.length) >= 0.5)

  const ingredients = allFragments.filter(isPlausible)
  const junkRatio = allFragments.length > 0
    ? 1 - (ingredients.length / allFragments.length) : 0

  let score = 50  // Neutral baseline
  const flags = []
  const used = new Set()

  // Helper: check a rule and apply position-weighted score
  function checkRule(rule, riskLevel) {
    if (used.has(rule.name)) return
    if (!rule.re.test(lower)) return
    used.add(rule.name)

    // Position weighting: if found in first 3 ingredients, double the penalty/bonus
    let multiplier = 1
    if (ingredients.length > 0) {
      const firstThree = ingredients.slice(0, 3).join(' ')
      if (rule.re.test(firstThree)) multiplier = 1.5
    }

    const adjustedPts = Math.round(rule.pts * multiplier)
    score += adjustedPts
    flags.push({ name: rule.name, risk: riskLevel, pts: adjustedPts })
  }

  // Apply rules — GOOD first so "no added sugar" blocks "added sugar"
  for (const rule of GOOD)    checkRule(rule, 's')
  for (const rule of AVOID)   checkRule(rule, 'h')
  for (const rule of CAUTION) {
    // Skip "Added sugar" if "No added sugar" already matched
    if (rule.name === 'Added sugar' && used.has('No added sugar')) continue
    checkRule(rule, 'c')
  }

  // ── Simplicity bonus (fewer ingredients = less processed) ──
  // Requires a readable scan AND at least one recognized food term.
  const hasRecognizedTerm = used.size > 0
  if (junkRatio <= 0.4 && hasRecognizedTerm && ingredients.length <= 1 && ingredients.length > 0) {
    score += 15
    flags.push({ name: 'Single ingredient — unprocessed', risk: 's', pts: +15 })
  } else if (junkRatio <= 0.4 && hasRecognizedTerm && ingredients.length <= 3) {
    score += 10
    flags.push({ name: 'Only ' + ingredients.length + ' ingredients — minimal processing', risk: 's', pts: +10 })
  } else if (junkRatio <= 0.4 && hasRecognizedTerm && ingredients.length <= 5) {
    score += 5
    flags.push({ name: ingredients.length + ' ingredients — simple formulation', risk: 's', pts: +5 })
  }

  // ── Clean base ingredient bonus ──
  if (ingredients.length > 0) {
    const first = ingredients[0]
    if (/^(?:pasteuris|toned milk|full cream|cow milk|buffalo milk|milk |cream|curd|dahi|butter |water |filtered water|purified water)/.test(first)) {
      score += 8
      flags.push({ name: 'Clean dairy/water base', risk: 's', pts: +8 })
    } else if (/^(?:chickpea|chana|moong|toor|urad|masoor|lentil|rajma|dal )/.test(first)) {
      score += 8
      flags.push({ name: 'Legume/dal base — high protein', risk: 's', pts: +8 })
    } else if (/^(?:tomato|onion|garlic|spinach|vegetable|carrot|potato|fruit|mango|apple|orange|banana)/.test(first)) {
      score += 6
      flags.push({ name: 'Fruit/vegetable base', risk: 's', pts: +6 })
    } else if (/^(?:dates?|raisin|peanut|almond|cashew|walnut|pistachio|hazelnut|cocoa|coconut)/.test(first)) {
      score += 6
      flags.push({ name: 'Nut/seed base', risk: 's', pts: +6 })
    }
  }

  // ── Ingredient count penalty (ultra-processing signal) ──
  // Skipped when >40% of fragments are unreadable — low-quality scans must
  // not be punished for junk the OCR invented.
  if (junkRatio > 0.4) {
    flags.push({ name: 'Some label text could not be read — grade is an estimate, verify with the label', risk: 'c', pts: 0 })
  } else if (ingredients.length > 20) {
    score -= 8
    flags.push({ name: `${ingredients.length} ingredients (ultra-processed)`, risk: 'c', pts: -8 })
  } else if (ingredients.length > 15) {
    score -= 4
    flags.push({ name: `${ingredients.length} ingredients (highly processed)`, risk: 'c', pts: -4 })
  }

  // ── Sugar-as-first-ingredient penalty ──
  if (ingredients.length > 0 && /^sugar|^sucrose|^glucose|^fructose|^jaggery|^gur/.test(ingredients[0])) {
    score -= 10
    flags.push({ name: 'Sugar is the #1 ingredient', risk: 'h', pts: -10 })
  } else if (ingredients.length > 1 && /^sugar|^sucrose|^glucose|^fructose/.test(ingredients[1])) {
    score -= 6
    flags.push({ name: 'Sugar is the #2 ingredient', risk: 'h', pts: -6 })
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // If zero rules matched, the text likely is not a real ingredient list
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
