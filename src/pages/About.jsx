export default function About() {
  return (
    <div className="min-h-screen pt-16" style={{ background: 'var(--surface)' }}>
      <div className="px-6 py-16 max-w-3xl mx-auto">

        <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--ink)' }}>About EatAware</h1>
        <p className="text-lg mb-12" style={{ color: 'var(--muted)' }}>
          India's first ingredient intelligence platform — built to put consumers in control of what they eat.
        </p>

        {/* Mission */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--ink)' }}>Our Mission</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--ink-soft)' }}>
            India has over 500 million packaged food consumers — but almost no plain-language guide to what's inside. Ingredient lists are long, use E-codes and INS numbers, and are designed to be unreadable.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            EatAware translates every ingredient into plain language, grades every product A–F based on its overall nutritional and additive profile, and gives you the health context you need to make informed choices.
          </p>
        </section>

        {/* How we grade */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--ink)' }}>How We Grade (A–F)</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ink-soft)' }}>
            Each product starts at a score of 100. Deductions are applied for harmful additives, high sugar, trans fat, refined flour, and other health concerns. Bonuses are applied for whole grains, probiotics, real protein, and clean labels.
          </p>
          <div className="space-y-2">
            {[
              ['A', '#16a34a', '82–100', 'Excellent — safe for daily use'],
              ['B', '#65a30d', '67–81',  'Good — fine for regular consumption'],
              ['C', '#d97706', '52–66',  'Moderate — occasional is better'],
              ['D', '#dc2626', '32–51',  'High concern — limit to occasional'],
              ['E', '#7f1d1d', '12–31',  'Very high concern — monthly at most'],
              ['F', '#1c1917', '0–11',   'Avoid as a routine food'],
            ].map(([g, col, range, label]) => (
              <div key={g} className="flex items-center gap-4 p-3 rounded-2xl bg-white border"
                style={{ borderColor: '#f3f4f6' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                  style={{ background: col }}>{g}</div>
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{range} · </span>
                  <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
            The displayed grade is reviewed and set by our team. The score is for reference and may differ from the displayed grade.
          </p>
        </section>

        {/* Data sources */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--ink)' }}>Data Sources</h2>
          <div className="space-y-2">
            {[
              ['FSSAI', 'Food Safety and Standards Authority of India — permitted additives and limits'],
              ['WHO', 'Dietary guidelines on trans fat, sugar, and sodium'],
              ['IARC', 'International Agency for Research on Cancer — carcinogen classifications'],
              ['EFSA', 'European Food Safety Authority — additive safety assessments'],
              ['ICMR-NIN', 'Indian Council of Medical Research — National Institute of Nutrition dietary guidelines'],
              ['Open Food Facts', 'Open-source global food product database (barcode lookups)'],
            ].map(([source, desc]) => (
              <div key={source} className="flex gap-3 items-start">
                <span className="px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--green-pale)', color: 'var(--green)' }}>{source}</span>
                <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="p-5 rounded-2xl" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: '#92400e' }}>⚠️ Disclaimer</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
            EatAware grades are informational only and are not a substitute for medical advice. Grades reflect long-term dietary pattern risk based on FSSAI-referenced label data and published public-health evidence — not single-serving harm. Always consult a qualified healthcare professional for personal health decisions. EatAware is not affiliated with, endorsed by, or verified by FSSAI. Last methodology update: April 2026.
          </p>
        </section>

        {/* Contact */}
        <section className="mt-10 text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Get in Touch</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Found an error? Want to submit a product? We'd love to hear from you.
          </p>
          <a href="mailto:koushik@eataware.in"
            className="inline-block px-6 py-3 rounded-full font-bold text-white text-sm"
            style={{ background: 'var(--green)' }}>
            koushik@eataware.in
          </a>
        </section>
      </div>
    </div>
  )
}
