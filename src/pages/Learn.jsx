const SECTIONS = [
  {
    title: 'The Hidden Harm in "Vegetable Oil"',
    emoji: '🫙',
    content: `When a label says "vegetable oil," it almost always means palm oil or palmolein — the cheapest option. Palm oil is ~50% saturated fat, linked to raised LDL cholesterol. More concerning: refined palm oil contains glycidyl fatty acid esters (GE), classified by EFSA as a possible carcinogen.

What to look for: Products that name the oil specifically — sunflower oil, mustard oil, or cold-pressed coconut oil — are more trustworthy than the blanket "vegetable oil."`,
  },
  {
    title: 'Why TBHQ is in Almost Every Fried Snack',
    emoji: '🧪',
    content: `TBHQ (Tertiary Butylhydroquinone, INS 319) extends the shelf life of fats and oils. It's cheap and effective — which is why you'll find it in Maggi, Lay's, most biscuits, and virtually every Indian fried snack.

FSSAI permits it at up to 200mg/kg. Animal studies at high doses showed precancerous stomach changes. IARC classifies it as Group 3 (not classifiable at human dietary levels). The concern isn't acute harm — it's the cumulative effect of consuming it daily across multiple products.`,
  },
  {
    title: 'The Sugar Problem in "Healthy" Foods',
    emoji: '🍭',
    content: `Many products marketed as healthy — Bournvita, Horlicks, fruit juices, flavoured yoghurt — contain more sugar than a soft drink. Bournvita has 18g of sugar per 20g serving: 90% sugar by weight.

WHO recommends under 25g of added sugar per day. A single glass of a popular health drink can exceed this. The sugar doesn't disappear because it's fortified with vitamins — it's still a metabolic load on your liver and pancreas.`,
  },
  {
    title: 'What "No Added Colours" Actually Means',
    emoji: '🎨',
    content: `"No added colours" means no synthetic dyes — but a product can still contain caramel colour (E150), which is produced by heating sugar with ammonia and sulfites. Class IV caramel colour (the most common) produces 4-MEI as a byproduct — IARC Group 2B: possibly carcinogenic to humans.

You'll find caramel colour in Coca-Cola, many soy sauces, and some Indian snacks. It hides under "contains permitted class IV caramel colour" in the fine print.`,
  },
  {
    title: 'Reading an Indian Ingredient List',
    emoji: '📖',
    content: `Ingredients are listed in descending order of weight. The first 3 ingredients make up the bulk of the product.

Red flags at the top of the list: Maida (refined wheat flour), Sugar, Palmolein.

Watch for hidden names: "Acidity regulator (330)" = citric acid · "INS 211" = sodium benzoate · "INS 319" = TBHQ · "INS 621" = MSG · "INS 102" = tartrazine.

The ingredient list is required to name every additive by its INS number or common name. If it says "contains permitted preservatives" without specifying, that's a label violation — but common in practice.`,
  },
  {
    title: 'Trans Fat: The One You Must Avoid',
    emoji: '❌',
    content: `Trans fat is the only dietary fat with no safe level of consumption, according to WHO. It raises LDL (bad) cholesterol and lowers HDL (good) cholesterol simultaneously — a double cardiovascular hit.

FSSAI limited trans fat to 2% from January 2022. Vanaspati is the most common source in India. It hides under: "partially hydrogenated vegetable oil," "vanaspati," "Dalda."

Even 1–2% of daily calories from trans fat significantly raises cardiovascular risk. When a product says "0g trans fat," check the ingredients — if partially hydrogenated oil is listed, it still contains trace amounts.`,
  },
  {
    title: 'The Ragi Revolution — Why Millets Matter',
    emoji: '🌾',
    content: `Ragi (finger millet), bajra (pearl millet), and jowar (sorghum) were the staple grains of rural India for centuries. They are more nutritious than wheat or rice in almost every dimension: higher protein, higher fibre, lower glycaemic index, and rich in calcium and iron.

The shift to maida-based packaged foods over the last three decades has coincided with a dramatic rise in Type 2 diabetes and obesity. Millet-based products are making a comeback — Saffola, Growfit, and several D2C brands are now making millet snacks and breakfast foods that genuinely earn Grade A or B.`,
  },
  {
    title: 'Probiotics: What the Science Actually Says',
    emoji: '🦠',
    content: `Yakult, probiotic yoghurt, and fermented dairy have real evidence behind them — but the benefits are strain-specific and dose-dependent. Lactobacillus casei Shirota (in Yakult) has the most clinical evidence for gut health improvement.

What the science supports: reduced duration of antibiotic-associated diarrhoea, improved irritable bowel symptoms, and modest immune benefits. What it doesn't support: the broad "improves immunity" claims made by most probiotic marketing.

For gut health, the cheapest and most effective option is plain dahi (curd) — it contains live cultures, is cheap, and has been part of the Indian diet for millennia.`,
  },
]

import { useSEO } from '../hooks/useSEO'

export default function Learn() {
  useSEO({ title: 'Learn', description: 'Plain-language guides to palm oil, TBHQ, sugar, trans fat, and reading Indian ingredient labels.' })
  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>
      <div className="px-6 py-16 max-w-3xl mx-auto">

        <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--ink)' }}>Learn</h1>
        <p className="text-lg mb-12" style={{ color: 'var(--muted)' }}>
          Everything you need to understand India's packaged food industry — in plain language.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((s, i) => (
            <article key={i} className="bg-white rounded-3xl border p-6" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">{s.emoji}</span>
                <div>
                  <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--ink)' }}>{s.title}</h2>
                  {s.content.split('\n\n').map((para, j) => (
                    <p key={j} className="text-sm leading-relaxed mb-3 last:mb-0" style={{ color: 'var(--ink-soft)' }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center p-8 rounded-3xl" style={{ background: 'var(--green-pale)' }}>
          <div className="text-3xl mb-3">🔬</div>
          <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--ink)' }}>Curious about a specific ingredient?</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Check the Ingredient Decoder for detailed health profiles of 28+ additives.
          </p>
          <a href="/ingredients"
            className="inline-block px-6 py-3 rounded-full font-bold text-white text-sm"
            style={{ background: 'var(--green)' }}>
            Open Ingredient Decoder →
          </a>
        </div>
      </div>
    </div>
  )
}
