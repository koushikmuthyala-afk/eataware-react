/**
 * EatAware Quick Score v4 — Context-aware ingredient grading engine
 * 
 * Key improvements over v3:
 *   - Distinguishes natural sugars (dates, raisins, fruit) from added sugars
 *   - Context-aware: "wheat flour (maida)" vs "whole wheat flour"
 *   - Handles Indian label patterns: "permitted natural colour" = likely synthetic
 *   - Strips allergen warnings before scoring ("Contains: milk, soy, nuts")
 *   - Natural dried fruit & whole fruit recognized as POSITIVE
 *   - Sugar stacking only counts REFINED sources
 *   - Fruit concentrate = moderate (not penalized as hard as refined sugar)
 *   - Ambiguity handling: "vegetable oil" alone vs "vegetable oil (palm)"
 */

// ═══════════════════════════════════════════════════════════════
// PRE-PROCESSING: Strip non-ingredient text before scoring
// ═══════════════════════════════════════════════════════════════
function preprocessText(text) {
  var cleaned = text
    // Remove allergen warnings (these are NOT ingredients)
    .replace(/contains?\s*:?\s*(?:milk|soy|wheat|nuts|peanut|egg|fish|shellfish|gluten|tree nut|sesame|mustard|celery|lupin|mollusc)[^,.]*/gi, '')
    .replace(/may contain(?:s)?\s+(?:traces?\s+of\s+)?[^,.]+/gi, '')
    .replace(/allergen\s+(?:information|warning|advice)\s*:?[^,.]+/gi, '')
    // Remove "BEST BEFORE", "MFG", "MRP", nutritional info headers
    .replace(/(?:best before|mfg|mfd|use by|exp|mrp|net (?:weight|wt|qty)|batch|lot)\s*[:.]?\s*[^,]*/gi, '')
    .replace(/(?:nutritional?|nutrition)\s+(?:information|facts?|value)[^]*/gi, '')
    // Remove percentage info like "(40%)" but keep the ingredient
    .replace(/\(\d+\.?\d*\s*%?\)/g, '')
    // Clean up
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim()
  return cleaned
}

// ═══════════════════════════════════════════════════════════════
// HIGH CONCERN — AVOID (red dot)
// ═══════════════════════════════════════════════════════════════
var AVOID = [
  // ── Trans fats & hydrogenation ──
  { re: /partially hydrogenat/i,                   name: 'Partially hydrogenated fat (trans fat)', pts: -20 },
  { re: /\bvanaspati\b|\bdalda\b/i,                name: 'Vanaspati / Dalda (trans fat risk)',     pts: -15 },
  { re: /inter.?esterified/i,                      name: 'Interesterified fat',                   pts: -8  },

  // ── Banned / heavily restricted ──
  { re: /potassium bromate/i,                      name: 'Potassium Bromate (BANNED)',             pts: -25 },
  { re: /azodicarbonamide/i,                       name: 'Azodicarbonamide (banned in EU/UK)',     pts: -12 },

  // ── Petroleum-derived antioxidant preservatives ──
  { re: /tbhq|ins.?319/i,                          name: 'TBHQ (INS 319)',                        pts: -12 },
  { re: /\bbha\b|ins.?320/i,                       name: 'BHA (INS 320)',                         pts: -10 },
  { re: /\bbht\b|ins.?321/i,                       name: 'BHT (INS 321)',                         pts: -8  },

  // ── Synthetic azo dyes (hyperactivity risk) ──
  { re: /tartrazine|ins.?102|\be102\b/i,           name: 'Tartrazine E102 (azo dye)',              pts: -10 },
  { re: /sunset yellow|ins.?110|\be110\b/i,        name: 'Sunset Yellow E110 (azo dye)',           pts: -8  },
  { re: /allura red|ins.?129|\be129\b/i,           name: 'Allura Red E129 (azo dye)',              pts: -8  },
  { re: /carmoisine|ins.?122|\be122\b/i,           name: 'Carmoisine E122 (azo dye)',              pts: -7  },
  { re: /ponceau|ins.?124|\be124\b/i,              name: 'Ponceau 4R E124 (azo dye)',              pts: -7  },
  { re: /erythrosine|ins.?127|\be127\b/i,          name: 'Erythrosine E127',                      pts: -8  },
  { re: /brilliant blue|ins.?133|\be133\b/i,       name: 'Brilliant Blue E133',                   pts: -6  },
  { re: /patent blue|ins.?131/i,                   name: 'Patent Blue E131',                      pts: -6  },
  { re: /fast green|ins.?143/i,                    name: 'Fast Green FCF E143',                   pts: -6  },
  { re: /quinoline yellow|ins.?104/i,              name: 'Quinoline Yellow E104',                  pts: -7  },

  // ── Harmful preservatives ──
  { re: /sodium nitrite|ins.?250/i,                name: 'Sodium Nitrite INS 250 (carcinogen risk)', pts: -12 },
  { re: /sodium nitrate|ins.?251/i,                name: 'Sodium Nitrate INS 251',                pts: -8  },
  { re: /potassium nitrate|ins.?252/i,             name: 'Potassium Nitrate INS 252',             pts: -7  },

  // ── Artificial sweeteners (WHO 2B / concerns) ──
  { re: /aspartame|ins.?951/i,                     name: 'Aspartame INS 951 (WHO Group 2B)',       pts: -10 },
  { re: /saccharin|ins.?954/i,                     name: 'Saccharin INS 954',                     pts: -8  },
  { re: /cyclamate|ins.?952/i,                     name: 'Cyclamate INS 952 (banned in US)',       pts: -10 },

  // ── HFCS ──
  { re: /high fructose corn syrup|\bhfcs\b/i,      name: 'High Fructose Corn Syrup',              pts: -12 },

  // ── Sodium benzoate (forms benzene with Vit C) ──
  { re: /sodium benzoate|ins.?211/i,               name: 'Sodium Benzoate INS 211',               pts: -7  },
  { re: /potassium benzoate|ins.?212/i,            name: 'Potassium Benzoate INS 212',            pts: -6  },
]

// ═══════════════════════════════════════════════════════════════
// CAUTION — MODERATE CONCERN (yellow dot)
// ═══════════════════════════════════════════════════════════════

// --- REFINED/ADDED SUGARS (tracked for stacking penalty) ---
var REFINED_SUGARS = [
  { re: /(?:^|[^a-z])sugar(?!.*(?:cane|free|less|no added))/i, name: 'Refined sugar',           pts: -4, sugar: true },
  { re: /\bsucrose\b(?!\s*ester)/i,                name: 'Sucrose',                       pts: -3, sugar: true },
  { re: /\bdextrose\b/i,                           name: 'Dextrose',                      pts: -3, sugar: true },
  { re: /\bfructose\b(?!.*corn)/i,                 name: 'Fructose (isolated)',            pts: -3, sugar: true },
  { re: /invert sugar/i,                           name: 'Invert sugar syrup',            pts: -4, sugar: true },
  { re: /corn syrup(?!.*high fructose)/i,          name: 'Corn syrup',                    pts: -4, sugar: true },
  { re: /glucose syrup|glucose.?fructose syrup/i,  name: 'Glucose syrup',                 pts: -4, sugar: true },
  { re: /\brice syrup\b/i,                         name: 'Rice syrup',                    pts: -3, sugar: true },
  { re: /\bagave\b/i,                              name: 'Agave syrup',                   pts: -3, sugar: true },
  { re: /\bmaltose\b/i,                            name: 'Maltose',                       pts: -3, sugar: true },
  { re: /\btreacle\b/i,                            name: 'Treacle',                       pts: -3, sugar: true },
  { re: /icing sugar|powdered sugar|confectioner/i, name: 'Powdered sugar',               pts: -4, sugar: true },
]

// --- OTHER CAUTION ITEMS (not sugar) ---
var CAUTION = [
  // ── Refined flour & starch ──
  { re: /\bmaida\b/i,                              name: 'Maida (refined flour)',          pts: -6  },
  { re: /refined (?:wheat )?flour/i,               name: 'Refined flour',                 pts: -5  },
  // "wheat flour" alone (without "whole" or "maida") = ambiguous, mild penalty
  { re: /wheat flour(?!\s*\(maida)(?!\s*\(whole)/i, name: 'Wheat flour (likely refined)',  pts: -3  },
  { re: /all.?purpose flour/i,                     name: 'All-purpose flour (refined)',    pts: -5  },
  { re: /modified (?:food )?starch/i,              name: 'Modified starch',               pts: -3  },
  { re: /maltodextrin/i,                           name: 'Maltodextrin (GI 110)',          pts: -5  },
  { re: /\bmalt extract\b(?!.*whole)|barley malt/i, name: 'Malt extract (hidden sugar)',  pts: -3  },

  // ── Palm oil (context-aware) ──
  { re: /palm oil|palmolein|palm fat|palm kernel/i, name: 'Palm oil / palmolein',          pts: -5  },
  { re: /\bshortening\b/i,                         name: 'Shortening (likely palm)',       pts: -4  },
  // "vegetable oil" without specifying type = likely palm
  { re: /vegetable oil(?!\s*\((?:sunflower|olive|rice|groundnut|mustard|sesame|coconut|safflower|canola))/i,
                                                    name: 'Vegetable oil (type unknown — likely palm)', pts: -3 },

  // ── MSG & flavour enhancers ──
  { re: /\bmsg\b|monosodium glutamate|ins.?621|ajinomoto/i, name: 'MSG / Ajinomoto (INS 621)', pts: -5 },
  { re: /disodium guanylate|ins.?627/i,            name: 'Disodium Guanylate INS 627',    pts: -3  },
  { re: /disodium inosinate|ins.?631/i,            name: 'Disodium Inosinate INS 631',    pts: -3  },
  { re: /hydrolysed (?:vegetable |plant )?protein|hvp/i, name: 'Hydrolysed protein (hidden MSG)', pts: -4 },
  { re: /yeast extract/i,                          name: 'Yeast extract (hidden MSG)',     pts: -3  },

  // ── Artificial flavours & colours ──
  { re: /artificial (?:colour|color)|synthetic (?:colour|color)/i, name: 'Artificial colour', pts: -5 },
  { re: /caramel colou|ins.?150[a-d]?(?:\b|[^0-9])/i, name: 'Caramel colour INS 150',    pts: -4  },
  { re: /nature.?identical/i,                      name: 'Nature-identical flavouring (synthetic)', pts: -4 },
  { re: /artificial flavou/i,                      name: 'Artificial flavouring',          pts: -4  },
  { re: /added flavou|flavouring substance/i,      name: 'Added flavouring',              pts: -2  },

  // ── Emulsifiers & stabilisers ──
  { re: /carrageenan|ins.?407/i,                   name: 'Carrageenan INS 407',           pts: -4  },
  { re: /polysorbate|ins.?4[36][05]/i,             name: 'Polysorbate (emulsifier)',       pts: -3  },
  { re: /\bpgpr\b|ins.?476/i,                      name: 'PGPR INS 476 (cocoa butter substitute)', pts: -3 },
  { re: /sodium carboxymethyl cellulose|ins.?466/i, name: 'CMC INS 466',                  pts: -2  },

  // ── Phosphates ──
  { re: /phosphoric acid|ins.?338/i,               name: 'Phosphoric acid (enamel damage)', pts: -5 },
  { re: /sodium phosphate|ins.?339/i,              name: 'Sodium phosphate',               pts: -3  },

  // ── Sweeteners (moderate) ──
  { re: /acesulfame|ins.?950/i,                    name: 'Acesulfame-K INS 950',           pts: -6  },
  { re: /sucralose|ins.?955/i,                     name: 'Sucralose INS 955',              pts: -4  },
  { re: /\bsorbitol\b|ins.?420/i,                  name: 'Sorbitol INS 420',               pts: -2  },
  { re: /\bmaltitol\b|ins.?965/i,                  name: 'Maltitol INS 965',               pts: -2  },

  // ── Preservatives (lower concern) ──
  { re: /potassium sorbate|ins.?202/i,             name: 'Potassium Sorbate INS 202',     pts: -3  },
  { re: /calcium propionate|ins.?282/i,            name: 'Calcium Propionate INS 282',    pts: -3  },
  { re: /sulphur dioxide|ins.?220|sulphite/i,      name: 'Sulphites (allergen)',           pts: -4  },

  // ── Bleaching ──
  { re: /calcium peroxide|ins.?930/i,              name: 'Calcium peroxide (flour bleach)', pts: -4 },
  { re: /benzoyl peroxide/i,                       name: 'Benzoyl peroxide (bleach)',       pts: -4 },

  // ── Mineral oil ──
  { re: /mineral oil|liquid paraffin/i,            name: 'Mineral oil',                    pts: -5 },

  // ── Indian label "permitted" pattern (signals synthetic) ──
  { re: /permitted (?:synthetic )?(?:colour|color)/i, name: 'Permitted colour (likely synthetic)', pts: -4 },
  { re: /permitted (?:class ii )?preservative/i,   name: 'Permitted preservative',         pts: -2 },

  // ── From concentrate ──
  { re: /from concentrate|reconstituted/i,         name: 'From concentrate (fibre removed)', pts: -2 },
]

// ═══════════════════════════════════════════════════════════════
// BENEFICIAL — GOOD (green dot)
// ═══════════════════════════════════════════════════════════════
var GOOD = [
  // ── NATURAL SUGARS & DRIED FRUITS (positive, NOT penalized) ──
  { re: /\braisin|dried grape|sultana|currant/i,   name: 'Raisins/dried grapes (natural sugar + iron)', pts: +4 },
  { re: /\bdate(?:s)?\b(?!\s*(?:of|code))/i,      name: 'Dates (natural sugar + fibre + potassium)', pts: +4 },
  { re: /\bfig(?:s)?\b|anjeer/i,                   name: 'Figs/Anjeer (natural sugar + calcium)',    pts: +3 },
  { re: /dried (?:apricot|cranberr|blueberr|mango|pineapple|papaya|strawberr)/i,
                                                    name: 'Dried fruit (natural sugar + vitamins)', pts: +3 },
  { re: /\bprune(?:s)?\b/i,                        name: 'Prunes (natural sugar + fibre)',  pts: +3  },
  { re: /\bapricot/i,                              name: 'Apricot',                        pts: +2  },

  // ── WHOLE FRUITS & VEGETABLES (strong positive) ──
  { re: /mango pulp|mango puree/i,                 name: 'Real mango pulp',                pts: +3  },
  { re: /tomato paste|tomato puree/i,              name: 'Tomato paste/puree',             pts: +3  },
  { re: /fruit (?:pulp|puree|juice)(?!\s*(?:from concentrate|concentrate))/i,
                                                    name: 'Real fruit pulp/juice',          pts: +3  },
  { re: /\bbanana\b(?!\s*flavou)/i,                name: 'Banana (real)',                   pts: +2  },
  { re: /\bapple\b(?!\s*flavou)/i,                 name: 'Apple (real)',                    pts: +2  },
  { re: /\bberr(?:y|ies)\b|strawberr|blueberr|raspberry|blackberr/i, name: 'Berries', pts: +3 },

  // ── Whole grains & millets ──
  { re: /whole wheat|whole grain/i,                name: 'Whole grain / whole wheat',      pts: +8  },
  { re: /\bragi\b|finger millet/i,                 name: 'Ragi (finger millet)',            pts: +8  },
  { re: /\bbajra\b|pearl millet/i,                 name: 'Bajra (pearl millet)',            pts: +7  },
  { re: /\bjowar\b|sorghum/i,                      name: 'Jowar (sorghum)',                pts: +7  },
  { re: /foxtail millet|kangni|korra/i,            name: 'Foxtail millet',                 pts: +7  },
  { re: /barnyard millet|sanwa/i,                  name: 'Barnyard millet',                pts: +6  },
  { re: /little millet|kutki|sama/i,               name: 'Little millet',                  pts: +6  },
  { re: /kodo millet|kodra/i,                      name: 'Kodo millet',                    pts: +6  },
  { re: /\bmillet\b/i,                             name: 'Millet',                          pts: +5  },
  { re: /rolled oat|steel.?cut oat|\boats\b/i,    name: 'Oats',                            pts: +6  },
  { re: /\bquinoa\b/i,                             name: 'Quinoa',                         pts: +7  },
  { re: /brown rice/i,                             name: 'Brown rice',                      pts: +5  },
  { re: /\bamaranth\b|rajgira/i,                   name: 'Amaranth / Rajgira',             pts: +6  },
  { re: /\bbuckwheat\b|kuttu/i,                    name: 'Buckwheat / Kuttu',              pts: +5  },

  // ── Healthy fats & oils ──
  { re: /olive oil/i,                              name: 'Olive oil',                      pts: +5  },
  { re: /coconut oil/i,                            name: 'Coconut oil',                    pts: +4  },
  { re: /\bghee\b/i,                               name: 'Ghee',                           pts: +4  },
  { re: /mustard oil/i,                            name: 'Mustard oil',                    pts: +5  },
  { re: /sesame oil|gingelly|til oil/i,            name: 'Sesame oil',                     pts: +5  },
  { re: /groundnut oil|peanut oil/i,               name: 'Groundnut oil',                  pts: +4  },
  { re: /cold.?press|wood.?press|kachi ghani/i,    name: 'Cold/wood pressed oil',          pts: +5  },
  { re: /rice bran oil/i,                          name: 'Rice bran oil',                  pts: +3  },
  { re: /\bcocoa butter\b/i,                       name: 'Cocoa butter (real)',             pts: +3  },
  { re: /\bflaxseed oil|linseed oil/i,             name: 'Flaxseed oil (omega-3)',         pts: +4  },

  // ── Seeds & nuts ──
  { re: /flaxseed|flax seed|\balsi\b/i,           name: 'Flaxseed (omega-3)',              pts: +5  },
  { re: /chia seed/i,                              name: 'Chia seed',                      pts: +5  },
  { re: /pumpkin seed/i,                           name: 'Pumpkin seed (zinc)',             pts: +4  },
  { re: /sunflower seed/i,                         name: 'Sunflower seed (Vit E)',          pts: +4  },
  { re: /\bsesame\b(?! oil)/i,                     name: 'Sesame seeds',                   pts: +3  },
  { re: /\balmond(?:s)?\b/i,                       name: 'Almonds',                        pts: +4  },
  { re: /\bwalnut(?:s)?\b|akhrot/i,                name: 'Walnuts (omega-3)',              pts: +4  },
  { re: /\bcashew(?:s)?\b|kaju/i,                  name: 'Cashews',                        pts: +3  },
  { re: /\bpistachio/i,                            name: 'Pistachio',                      pts: +3  },
  { re: /\bpeanut(?:s)?\b|groundnut(?:s)?\b/i,    name: 'Peanuts/Groundnuts',             pts: +3  },
  { re: /\bcoconut\b(?!\s*(?:oil|sugar|cream))/i,  name: 'Coconut',                       pts: +3  },

  // ── Probiotics & fermentation ──
  { re: /lactobacillus|bifidobacterium/i,          name: 'Probiotic strains',              pts: +10 },
  { re: /\bprobiotic\b/i,                          name: 'Probiotic',                      pts: +8  },
  { re: /live cultur/i,                            name: 'Live cultures',                  pts: +8  },
  { re: /\bfermented\b/i,                          name: 'Fermented',                      pts: +6  },

  // ── Anti-inflammatory spices & herbs ──
  { re: /\bturmeric\b|curcumin|\bhaldi\b/i,        name: 'Turmeric (curcumin)',            pts: +5  },
  { re: /\bginger\b|\badrak\b|\bsonth\b/i,         name: 'Ginger',                        pts: +3  },
  { re: /\bcinnamon\b|\bdalchini\b/i,              name: 'Cinnamon',                       pts: +3  },
  { re: /black pepper|piperine|\bkali mirch/i,    name: 'Black pepper (piperine)',         pts: +3  },
  { re: /\bcumin\b|\bjeera\b/i,                    name: 'Cumin / Jeera',                  pts: +2  },
  { re: /\bfenugreek\b|\bmethi\b/i,                name: 'Fenugreek / Methi',              pts: +3  },
  { re: /\bcardamom\b|\belaichi\b/i,               name: 'Cardamom',                       pts: +2  },
  { re: /\bclove\b|\blaung\b/i,                    name: 'Clove',                          pts: +2  },
  { re: /\bcoriander\b|\bdhania\b/i,               name: 'Coriander',                      pts: +2  },
  { re: /\basafoetida\b|\bhing\b/i,                name: 'Asafoetida / Hing',              pts: +2  },
  { re: /\bgarlic\b|\blahsun\b/i,                  name: 'Garlic',                         pts: +2  },

  // ── Protein sources ──
  { re: /whey protein/i,                           name: 'Whey protein',                   pts: +5  },
  { re: /pea protein/i,                            name: 'Pea protein',                    pts: +5  },
  { re: /soy protein/i,                            name: 'Soy protein',                    pts: +4  },
  { re: /casein/i,                                 name: 'Casein protein',                 pts: +3  },

  // ── Omega-3 & essential fatty acids ──
  { re: /omega.?3|\bdha\b|\bepa\b/i,              name: 'Omega-3 / DHA / EPA',             pts: +5  },

  // ── Fibre & prebiotics ──
  { re: /dietary fibre|dietary fiber/i,            name: 'Dietary fibre',                   pts: +5  },
  { re: /\bprebiotic\b|\binulin\b|chicory/i,       name: 'Prebiotic / Inulin',             pts: +5  },
  { re: /psyllium|\bisabgol\b/i,                   name: 'Psyllium / Isabgol',             pts: +4  },
  { re: /\boat fibre\b|beta.?glucan/i,             name: 'Oat beta-glucan fibre',          pts: +4  },

  // ── Vitamins & minerals ──
  { re: /vitamin d3|cholecalciferol/i,             name: 'Vitamin D3',                     pts: +3  },
  { re: /vitamin c|ascorbic acid/i,                name: 'Vitamin C',                      pts: +2  },
  { re: /iron(?! oxide)|ferrous/i,                 name: 'Iron',                           pts: +2  },
  { re: /\bzinc\b/i,                               name: 'Zinc',                           pts: +2  },
  { re: /folic acid|folate/i,                      name: 'Folic acid',                     pts: +2  },

  // ── Clean label signals ──
  { re: /no added sugar|unsweetened|sugar.?free/i, name: 'No added sugar',                  pts: +6  },
  { re: /no artificial|no preservative|no synthetic/i, name: 'No artificial additives',     pts: +6  },
  { re: /no (?:added )?(?:colour|color|flavour|flavor)/i, name: 'No added colour/flavour', pts: +4  },
  { re: /\borganic\b/i,                            name: 'Organic',                        pts: +4  },
  { re: /non.?gmo/i,                               name: 'Non-GMO',                        pts: +3  },
  { re: /preservative.?free/i,                     name: 'Preservative-free',               pts: +4  },
  { re: /gluten.?free/i,                           name: 'Gluten-free',                    pts: +2  },

  // ── Indian superfoods ──
  { re: /\bamla\b|indian gooseberry/i,             name: 'Amla (Vitamin C)',               pts: +4  },
  { re: /\bmoringa\b/i,                            name: 'Moringa',                        pts: +4  },
  { re: /\bashwagandha\b/i,                        name: 'Ashwagandha',                    pts: +3  },
  { re: /\btulsi\b|holy basil/i,                   name: 'Tulsi / Holy basil',             pts: +3  },
  { re: /\bgiloy\b|tinospora/i,                    name: 'Giloy',                          pts: +3  },
  { re: /\bshatavari\b/i,                          name: 'Shatavari',                      pts: +3  },
  { re: /\btriphala\b/i,                           name: 'Triphala',                       pts: +3  },

  // ── Natural sweeteners (better than refined, still moderate) ──
  { re: /\bstevia\b|steviol/i,                     name: 'Stevia (natural zero-cal)',       pts: +4  },
  { re: /\berythritol\b/i,                         name: 'Erythritol (natural sugar alcohol)', pts: +3 },
  { re: /\bjaggery\b|\bgur\b(?!am)|\bgud\b/i,     name: 'Jaggery / Gur (less refined)',   pts: +2  },
  { re: /\bhoney\b/i,                              name: 'Honey (natural)',                pts: +2  },
  { re: /coconut sugar|palm sugar/i,               name: 'Coconut/palm sugar (less refined)', pts: +1 },
  { re: /date syrup|date paste|date sugar/i,       name: 'Date sweetener (natural)',        pts: +3  },

  // ── Permitted natural colour (genuinely natural) ──
  { re: /\bannatto\b|beta.?carotene|paprika (?:colour|extract)|turmeric (?:colour|extract)/i,
                                                    name: 'Natural colour (plant-based)',   pts: +2  },
]

// ── GRADE BANDS ─────────────────────────────────────────────────
var GRADE_BANDS = [
  { grade: 'A', min: 72 },
  { grade: 'B', min: 58 },
  { grade: 'C', min: 42 },
  { grade: 'D', min: 28 },
  { grade: 'E', min: 14 },
  { grade: 'F', min: 0  },
]

// ═══════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════
export function quickScore(rawText) {
  // Step 1: Preprocess — strip allergen warnings, nutrition tables, etc
  var text = preprocessText(rawText)
  var lower = text.toLowerCase()

  // Step 2: Split into individual ingredients
  var ingredients = lower
    .split(/,|;|\|/)
    .map(function(s) { return s.trim() })
    .filter(function(s) { return s.length > 1 })

  var score = 50  // Neutral baseline
  var flags = []
  var used = {}
  var refinedSugarCount = 0

  function checkRule(rule, riskLevel) {
    if (used[rule.name]) return
    if (!rule.re.test(lower)) return
    used[rule.name] = true

    // Position weighting: first 3 ingredients have 1.5x impact
    var multiplier = 1
    if (ingredients.length > 0) {
      var firstThree = ingredients.slice(0, 3).join(' ')
      if (rule.re.test(firstThree)) multiplier = 1.5
    }

    var adjustedPts = Math.round(rule.pts * multiplier)
    score += adjustedPts
    flags.push({ name: rule.name, risk: riskLevel, pts: adjustedPts })

    if (rule.sugar) refinedSugarCount++
  }

  // Step 3: Apply rules — GOOD first so "no added sugar" blocks "added sugar"
  for (var i = 0; i < GOOD.length; i++) checkRule(GOOD[i], 's')
  for (var i = 0; i < AVOID.length; i++) checkRule(AVOID[i], 'h')

  // Refined sugars — skip if "No added sugar" matched
  for (var i = 0; i < REFINED_SUGARS.length; i++) {
    if (used['No added sugar'] && REFINED_SUGARS[i].name !== 'Refined sugar') continue
    checkRule(REFINED_SUGARS[i], 'c')
  }

  // Other caution items
  for (var i = 0; i < CAUTION.length; i++) {
    // Skip "Wheat flour (likely refined)" if "Whole grain" or "Maida" already matched
    if (CAUTION[i].name === 'Wheat flour (likely refined)' && (used['Whole grain / whole wheat'] || used['Maida (refined flour)'])) continue
    // Skip "Vegetable oil (type unknown)" if specific oil already matched
    if (CAUTION[i].name === 'Vegetable oil (type unknown — likely palm)' && (used['Palm oil / palmolein'] || used['Olive oil'] || used['Coconut oil'] || used['Groundnut oil'] || used['Sesame oil'] || used['Mustard oil'] || used['Rice bran oil'])) continue
    checkRule(CAUTION[i], 'c')
  }

  // Step 4: REFINED sugar stacking (only refined, not natural)
  if (refinedSugarCount >= 4) {
    score -= 10
    flags.push({ name: refinedSugarCount + ' refined sugar sources (heavy sugar stacking)', risk: 'h', pts: -10 })
  } else if (refinedSugarCount >= 3) {
    score -= 6
    flags.push({ name: refinedSugarCount + ' refined sugar sources (sugar stacking)', risk: 'c', pts: -6 })
  } else if (refinedSugarCount >= 2) {
    score -= 3
    flags.push({ name: refinedSugarCount + ' refined sugar sources', risk: 'c', pts: -3 })
  }

  // Step 5: Sugar-as-#1 ingredient (only for REFINED sugar)
  if (ingredients.length > 0) {
    var first = ingredients[0]
    // Only penalize if first ingredient is a REFINED sugar, not natural (dates, honey, jaggery, fruit)
    if (/^(?:sugar|sucrose|glucose|fructose|corn syrup|invert sugar|maltose|dextrose)/.test(first)) {
      score -= 12
      flags.push({ name: 'Refined sugar is #1 ingredient (majority by weight)', risk: 'h', pts: -12 })
    } else if (ingredients.length > 1 && /^(?:sugar|sucrose|glucose|fructose)/.test(ingredients[1])) {
      score -= 7
      flags.push({ name: 'Refined sugar is #2 ingredient', risk: 'h', pts: -7 })
    }
  }

  // Step 6: NOVA-4 ultra-processing detection
  var hasArtColour = used['Artificial colour'] || used['Caramel colour INS 150'] || used['Permitted colour (likely synthetic)']
  var hasArtFlavour = used['Artificial flavouring'] || used['Nature-identical flavouring (synthetic)'] || used['Added flavouring']
  var hasMSG = used['MSG / Ajinomoto (INS 621)'] || used['Hydrolysed protein (hidden MSG)'] || used['Yeast extract (hidden MSG)']
  var cosmeticCount = (hasArtColour ? 1 : 0) + (hasArtFlavour ? 1 : 0) + (hasMSG ? 1 : 0)
  if (cosmeticCount >= 2) {
    score -= 5
    flags.push({ name: 'Ultra-processed signals (NOVA-4)', risk: 'c', pts: -5 })
  }

  // Step 7: Simplicity bonus
  if (ingredients.length === 1) {
    score += 15
    flags.push({ name: 'Single ingredient — unprocessed', risk: 's', pts: +15 })
  } else if (ingredients.length >= 2 && ingredients.length <= 3) {
    score += 10
    flags.push({ name: ingredients.length + ' ingredients — minimal processing', risk: 's', pts: +10 })
  } else if (ingredients.length >= 4 && ingredients.length <= 5) {
    score += 5
    flags.push({ name: ingredients.length + ' ingredients — simple', risk: 's', pts: +5 })
  }

  // Step 8: Ingredient count penalty
  if (ingredients.length > 25) {
    score -= 10
    flags.push({ name: ingredients.length + ' ingredients — ultra-processed', risk: 'h', pts: -10 })
  } else if (ingredients.length > 20) {
    score -= 7
    flags.push({ name: ingredients.length + ' ingredients — highly processed', risk: 'c', pts: -7 })
  } else if (ingredients.length > 15) {
    score -= 4
    flags.push({ name: ingredients.length + ' ingredients — processed', risk: 'c', pts: -4 })
  }

  // Step 9: Clean base ingredient bonus
  if (ingredients.length > 0) {
    var first = ingredients[0]
    if (/^(?:pasteuris|toned milk|full cream|cow milk|buffalo milk|milk |cream |curd|dahi|butter |paneer|yogurt|yoghurt)/.test(first)) {
      score += 8
      flags.push({ name: 'Clean dairy base', risk: 's', pts: +8 })
    } else if (/^(?:water|filtered water|purified water|carbonated water)/.test(first)) {
      score += 3
      flags.push({ name: 'Water base', risk: 's', pts: +3 })
    } else if (/^(?:chickpea|chana|moong|toor|urad|masoor|lentil|rajma|dal |black gram|bengal gram|horse gram)/.test(first)) {
      score += 8
      flags.push({ name: 'Legume/dal base — high protein', risk: 's', pts: +8 })
    } else if (/^(?:tomato|onion|garlic|spinach|vegetable|carrot|potato|pumpkin|beetroot|broccoli|cauliflower|cabbage|okra|gourd)/.test(first)) {
      score += 6
      flags.push({ name: 'Vegetable base', risk: 's', pts: +6 })
    } else if (/^(?:mango|apple|orange|banana|guava|pomegranate|grape|fruit|berr|strawberr|blueberr|amla|lemon|lime|pineapple)/.test(first)) {
      score += 6
      flags.push({ name: 'Fruit base', risk: 's', pts: +6 })
    } else if (/^(?:peanut|almond|cashew|walnut|pistachio|hazelnut|coconut|cocoa|date)/.test(first)) {
      score += 6
      flags.push({ name: 'Nut/seed/date base', risk: 's', pts: +6 })
    } else if (/^(?:whole wheat|atta|besan|gram flour|rice flour|ragi|jowar|bajra|millet|oat|semolina|suji|rava)/.test(first)) {
      score += 4
      flags.push({ name: 'Whole grain/flour base', risk: 's', pts: +4 })
    } else if (/^(?:honey|jaggery|gur)/.test(first)) {
      score += 3
      flags.push({ name: 'Natural sweetener base', risk: 's', pts: +3 })
    }
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // Unrecognized check
  var unrecognized = flags.length === 0

  var grade = 'F'
  for (var b = 0; b < GRADE_BANDS.length; b++) {
    if (score >= GRADE_BANDS[b].min) { grade = GRADE_BANDS[b].grade; break }
  }

  return { score: score, grade: grade, flags: flags, unrecognized: unrecognized }
}

export var RISK_LABELS = {
  h: { emoji: '\uD83D\uDD34', color: '#dc2626', label: 'High concern' },
  c: { emoji: '\uD83D\uDFE1', color: '#d97706', label: 'Caution'      },
  s: { emoji: '\uD83D\uDFE2', color: '#16a34a', label: 'Beneficial'   },
}
