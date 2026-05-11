/**
 * EatAware Scoring Engine — 24 rules
 * Pure JS — no DOM dependency — fully testable
 */

const RULES = [
  // Penalties
  { id:'trans_fat',       label:'Trans fat / PHO',               points:-40, cat:'fat',
    match:(p,i)=>i.some(x=>/hydrogenat|vanaspati/i.test(x.name+' '+x.desc)) },
  { id:'tbhq',            label:'TBHQ (INS 319)',                 points:-15, cat:'additive',
    match:(p,i)=>i.some(x=>/tbhq|ins.?319/i.test(x.name+' '+x.desc)) },
  { id:'tartrazine',      label:'Tartrazine / azo dyes',         points:-10, cat:'colour',
    match:(p,i)=>i.some(x=>/tartrazine|ins.?102|allura red|ins.?129|sunset yellow|ins.?110/i.test(x.name+' '+x.desc)) },
  { id:'art_colour',      label:'Artificial / caramel colour',   points:-6,  cat:'colour',
    match:(p,i)=>i.some(x=>/artificial colou|caramel colou|e150|synthetic colou/i.test(x.name+' '+x.desc)) },
  { id:'msg_enhancer',    label:'MSG / flavour enhancers',       points:-5,  cat:'additive',
    match:(p,i)=>i.some(x=>/\bmsg\b|monosodium glutamate|flavour enhancer/i.test(x.name+' '+x.desc)) },
  { id:'art_flavour',     label:'Artificial flavouring',         points:-5,  cat:'additive',
    match:(p,i)=>i.some(x=>/nature identical|artificial flavou|synthetic flavou/i.test(x.name+' '+x.desc)) },
  { id:'palm_oil',        label:'Palm oil / palmolein',          points:-7,  cat:'fat',
    match:(p,i)=>i.some(x=>/palm oil|palmolein|palm fat/i.test(x.name)) },
  { id:'very_high_sodium',label:'Very high sodium (>800mg)',     points:-18, cat:'nutrition',
    match:(p,i)=>{ const m=/(\d{3,4})\s*mg\s+sodium|sodium[^\d]*(\d{3,4})\s*mg/i.exec(p.impact||''); return !!(m&&parseInt(m[1]||m[2])>800) }},
  { id:'high_sodium',     label:'High sodium (400-800mg)',       points:-10, cat:'nutrition',
    match:(p,i)=>{ const m=/(\d{3,4})\s*mg\s+sodium|sodium[^\d]*(\d{3,4})\s*mg/i.exec(p.impact||''); const v=m&&parseInt(m[1]||m[2]); return !!(v&&v>400&&v<=800) }},
  { id:'very_high_sugar', label:'Very high sugar (>30g/100g)',   points:-25, cat:'sugar',
    match:(p,i)=>{ const m=/(\d{2,3})g\s+(?:per\s+100g\s+)?sugar|sugar[^\d]*(\d{2,3})g/i.exec(p.impact||''); return !!(m&&parseInt(m[1]||m[2])>=30) }},
  { id:'high_sugar',      label:'Sugar as primary ingredient',   points:-10, cat:'sugar',
    match:(p,i)=>i.some(x=>x.dot==='dot-avoid'&&/^sugar$/i.test(x.name)) },
  { id:'maltodextrin',    label:'Maltodextrin (GI 110)',         points:-6,  cat:'sugar',
    match:(p,i)=>i.some(x=>/maltodextrin/i.test(x.name+' '+x.desc)) },
  { id:'refined_flour',   label:'Refined flour / Maida',         points:-5,  cat:'nutrition',
    match:(p,i)=>i.some(x=>/\bmaida\b|refined wheat|refined flour/i.test(x.name+' '+x.desc)) },
  // Bonuses
  { id:'live_cultures',   label:'Live probiotic cultures',       points:+12, cat:'positive',
    match:(p,i)=>i.some(x=>/lactobacillus|probiotic|live cultur/i.test(x.name+' '+x.desc)) },
  { id:'whole_grain',     label:'Whole grain / millet',          points:+10, cat:'positive',
    match:(p,i)=>i.some(x=>x.dot==='dot-safe'&&/whole grain|whole wheat|ragi|bajra|jowar|foxtail|rolled oat|millet/i.test(x.name)) },
  { id:'clean_label',     label:'Clean label (<=3 ingredients)', points:+10, cat:'positive',
    match:(p,i)=>i.length<=3&&i.every(x=>x.dot==='dot-safe') },
  { id:'real_protein',    label:'Real protein source',           points:+6,  cat:'positive',
    match:(p,i)=>i.some(x=>x.dot==='dot-safe'&&/pea protein|whey protein|casein|soy protein/i.test(x.name)) },
  { id:'omega3',          label:'Omega-3 source',                points:+6,  cat:'positive',
    match:(p,i)=>i.some(x=>x.dot==='dot-safe'&&/omega.?3|flaxseed|chia seed/i.test(x.name)) },
  { id:'real_spices',     label:'Real spices',                   points:+4,  cat:'positive',
    match:(p,i)=>i.some(x=>x.dot==='dot-safe'&&/turmeric|mustard seed|curry leaf|curcumin/i.test(x.name)) },
  { id:'no_sugar',        label:'No added sugar',                points:+6,  cat:'positive',
    match:(p,i)=>/no added sugar|zero sugar|unsweetened/i.test(p.impact||'')&&!i.some(x=>x.dot==='dot-avoid'&&/sugar/i.test(x.name)) },
  // Dot-based fallbacks
  { id:'dot_avoid_sugar', label:'Sugar/sweetener (dot-avoid)',   points:-10, cat:'sugar',
    match:(p,i)=>i.some(x=>x.dot==='dot-avoid'&&/sugar|sweetener|corn.?syrup|fructose|glucose|sucrose|dextrose/i.test(x.name)) },
  { id:'dot_avoid_acid',  label:'Acidic additive (dot-avoid)',   points:-8,  cat:'additive',
    match:(p,i)=>i.some(x=>x.dot==='dot-avoid'&&/phosphoric|benzoate|sorbate|citric acid|e330|preservative/i.test(x.name)) },
  { id:'dot_avoid_other', label:'Other avoid ingredient',        points:-8,  cat:'additive',
    match:(p,i)=>{ const caught=/hydrogenat|vanaspati|tbhq|tartrazine|allura red|sunset yellow|caramel colou|e150|msg|monosodium|flavour enhancer|palm oil|palmolein|maltodextrin|maida|refined wheat|sugar|sweetener|corn.?syrup|fructose|glucose|sucrose|dextrose|phosphoric|benzoate|sorbate|citric acid|e330|preservative/i; return i.some(x=>x.dot==='dot-avoid'&&!caught.test(x.name)) }},
  { id:'beverage_sugar',  label:'Sugary beverage',               points:-20, cat:'sugar',
    match:(p,i)=>{ const b=/beverage|sugary drink|soda|cola|energy drink|sports drink/i.test(p.category||''); const s=i.some(x=>x.dot==='dot-avoid'&&/sugar|sweetener|syrup|added sugar/i.test(x.name)); return b&&s }},
]

const HARD_CAPS = [
  { label:'Trans fat -> Force F', check:(p,i)=>i.some(x=>/hydrogenat|vanaspati/i.test(x.name+' '+(x.desc||''))), forceGrade:'F' },
  { label:'Sugary beverage -> Max D', check:(p,i)=>{ const b=/beverage|drink|juice|soda|cola/i.test((p.category||p.name||'')); return b&&i.some(x=>x.dot==='dot-avoid'&&/sugar|sweetener|syrup|added sugar/i.test(x.name)) }, maxGrade:'D' },
]

const GRADE_BANDS = [
  {grade:'A',min:82},{grade:'B',min:67},{grade:'C',min:52},{grade:'D',min:32},{grade:'E',min:12},{grade:'F',min:0}
]
const GRADE_ORDER = ['A','B','C','D','E','F']

export function scoreProduct(product) {
  const ings = product.ings || []
  let score = 100
  const firedRules = []

  RULES.forEach(rule => {
    if (rule.match(product, ings)) {
      score += rule.points
      firedRules.push({ id:rule.id, label:rule.label, points:rule.points, cat:rule.cat })
    }
  })

  const avoidCount = ings.filter(x => x.dot === 'dot-avoid').length
  if (avoidCount >= 3) {
    const penalty = -(avoidCount - 2) * 4
    score += penalty
    firedRules.push({ id:'stack_penalty', label:`Stack penalty (${avoidCount} avoid ingredients)`, points:penalty, cat:'additive' })
  }

  score = Math.max(0, Math.min(100, score))

  let computedGrade = 'F'
  for (const band of GRADE_BANDS) {
    if (score >= band.min) { computedGrade = band.grade; break }
  }

  let hardCap = null
  for (const cap of HARD_CAPS) {
    if (cap.check(product, ings)) {
      if (cap.forceGrade) { computedGrade = cap.forceGrade; hardCap = cap.label }
      if (cap.maxGrade) {
        if (GRADE_ORDER.indexOf(computedGrade) < GRADE_ORDER.indexOf(cap.maxGrade)) {
          computedGrade = cap.maxGrade; hardCap = cap.label
        }
      }
    }
  }

  return { score, computedGrade, displayedGrade: product.grade || computedGrade, rules: firedRules, avoidCount, hardCap }
}

export const gradeColor = g => ({A:'#16a34a',B:'#65a30d',C:'#d97706',D:'#dc2626',E:'#7f1d1d',F:'#1c1917'}[g]||'#888')
export const gradeBg    = g => ({A:'#f0fdf4',B:'#f7fee7',C:'#fffbeb',D:'#fef2f2',E:'#fff1f2',F:'#fafaf9'}[g]||'#f9fafb')
export const gradeLabel = g => ({
  A:'Excellent — safe for daily use', B:'Good — fine for regular use',
  C:'Moderate — occasional is better', D:'High concern — limit to occasional',
  E:'Very high concern — monthly at most', F:'Avoid as routine'
}[g]||'')
