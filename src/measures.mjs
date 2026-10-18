// Supplementary estimates only. Keep the recipe's gram quantity authoritative.
// Sources, discarded parts, product differences and rounding: docs/INGREDIENT_MEASURES.md.
export const MEASURE_SOURCES = Object.freeze([
  { label: '味の素パーク「食材の目安量」', url: 'https://park.ajinomoto.co.jp/contents/basic/ingredients_bunryou/' },
  { label: '古賀市「食材・調味料の量・重さ」', url: 'https://www.city.koga.fukuoka.jp/recipe/seasoning/' },
  { label: 'キッコーマン「大根ともやしのバター醤油」材料の目安', url: 'https://www.kikkoman.com/jp/news/2025/25028.html' },
  { label: 'シマダヤ「真打 もちもちうどん 1食」', url: 'https://www.shimadaya.co.jp/products/category/chilled/udon/006394/' },
  { label: '東洋水産「マルちゃん焼そば 3人前」', url: 'https://www.maruchan.co.jp/products/search/maruchanyakisoba_3ninmae.html' },
  { label: '宝塚市「根菜つくねとかぼちゃのレンジ蒸」', url: 'https://www.city.takarazuka.hyogo.jp/1060682/1060702/1061588/1017522/1017744/1017750/1036416.html' },
]);

// [grams per unit, unit, preparation state, description of the comparison unit]
const COUNTS = {
  '玉ねぎ': [200, '個', '生', '1個200g'],
  'にんじん': [150, '本', '生', '1本150g'],
  '長ねぎ': [100, '本', '生', '1本100g'],
  'キャベツ': [50, '枚', '生', '葉1枚50g'],
  'きゅうり': [100, '本', '生', '1本100g'],
  '小松菜': [300, '束', '生', '1束300g'],
  'しょうが': [12, 'かけ', '生', '1かけ12g'],
  'トマト': [200, '個', '生', '1個200g'],
  'ニラ': [100, '束', '生', '1束100g'],
  'にんにく': [8, 'かけ', '生', '1かけ8g'],
  '白菜': [100, '枚', '生', '葉1枚100g'],
  'パプリカ': [150, '個', '生', '1個150g'],
  'ピーマン': [35, '個', '生', '1個35g'],
  'ブロッコリー': [15, '房', '生', '小房1個15g'],
  'もやし': [200, '袋', '生', '200g入りの場合'],
  'レタス': [30, '枚', '生', '葉1枚30g'],
  'じゃがいも': [150, '個', '生', '1個150g'],
  '長いも': [500, '本', '生', '1本500g'],
  'しめじ': [100, 'パック', '生', '100g入りの場合'],
  'しいたけ': [15, '個', '生', '軸込み1個15g'],
  'たけのこ水煮': [200, '個', '水煮', '水煮1個200g'],
  '木綿豆腐': [300, '丁', '冷蔵', '1丁300gの場合'],
  '厚揚げ': [135, '枚', '冷蔵', '1枚135gの場合'],
  '油揚げ': [30, '枚', '加熱済み', '1枚30gの場合'],
  'ご飯': [150, '杯', '炊飯済み', '茶碗1杯150g'],
  '米': [150, '合', '生', '精白米1合150g'],
  '鶏もも肉': [250, '枚', '生', '1枚250gの場合'],
  '鶏むね肉': [250, '枚', '生', '1枚250gの場合'],
  '鶏ささみ': [40, '本', '生', '1本40gの場合'],
  'ハム': [15, '枚', '加熱済み', '薄切り1枚15gの場合'],
  'ソーセージ': [17, '本', '加熱済み', 'ウインナー1本17gの場合'],
  '生鮭': [100, '切れ', '生', '1切れ100gの場合'],
  'サバ': [80, '切れ', '生', '1切れ80gの場合'],
  'タラ': [100, '切れ', '生', '1切れ100gの場合'],
  'うどん': [200, '玉', 'ゆで', 'ゆで麺1玉200gの場合'],
  '焼きそば麺': [150, '玉', '蒸し', '蒸し麺1玉150gの場合'],
};

// Weight per level 5ml measuring teaspoon. Product-specific powders are excluded.
const SPOONS = {
  '砂糖': [3, '製品', '上白糖'],
  '塩': [6, '製品', '食塩'],
  'みそ': [6, '製品', ''],
  'バター': [4, '製品', ''],
  '粉チーズ': [2, '製品', ''],
  '白いりごま': [3, '製品', ''],
  'マヨネーズ': [4, '製品', ''],
  'ケチャップ': [5, '製品', ''],
  'カレー粉': [2, '製品', ''],
  '薄力粉': [3, '乾燥', ''],
  '片栗粉': [3, '乾燥', ''],
  'ベーキングパウダー': [4, '乾燥', ''],
  'パン粉': [1, '乾燥', '乾燥パン粉'],
};

const FRACTIONS = [[1, 20], [1, 16], [1, 15], [1, 12], [1, 10], [1, 8], [1, 6], [1, 5], [1, 4], [1, 3], [3, 8], [2, 5], [1, 2], [3, 5], [2, 3], [3, 4], [4, 5], [5, 6], [7, 8], [1, 1]];

function fraction(value) {
  if (value >= 10) return String(Math.round(value));
  if (value >= 1) {
    // Mixed numbers stay in familiar quarter units, also after serving changes.
    const quarters = Math.round(value * 4);
    const whole = Math.floor(quarters / 4);
    const remainder = ['', '1/4', '1/2', '3/4'][quarters % 4];
    return remainder ? `${whole}と${remainder}` : String(whole);
  }
  const [numerator, denominator] = FRACTIONS.reduce((best, current) =>
    Math.abs(current[0] / current[1] - value) < Math.abs(best[0] / best[1] - value) ? current : best);
  if (Math.abs(numerator / denominator - value) / value > 0.15) return '';
  return denominator === 1 ? '1' : `${numerator}/${denominator}`;
}

function countHint(quantity, measure) {
  const [grams, unit, , basis] = measure;
  const amount = fraction(quantity / grams);
  return amount ? `約${amount}${unit}（${basis}${basis.endsWith('場合') ? '' : '目安'}）` : '';
}

function notesOf(ingredient) {
  return [ingredient.note, ...(Array.isArray(ingredient.notes) ? ingredient.notes : [])].filter(value => typeof value === 'string').join(' ');
}

/** Approximate physical size alongside (never instead of) a gram quantity. */
export function measureHint(ingredient, quantity = ingredient?.quantity) {
  if (!ingredient || ingredient.unit !== 'g' || !Number.isFinite(quantity) || quantity <= 0) return '';
  const { name, state } = ingredient;
  const notes = notesOf(ingredient);

  if (name === 'キャベツ' && state === '生' && /包める|肉だね/.test(notes)) {
    // A rolled cabbage must use intact leaves; a fractional leaf would not wrap it.
    return '包める大きな葉を肉だねの個数分';
  }
  if (name === 'キャベツ' && state === '生' && quantity >= 300) return countHint(quantity, [1200, '玉', state, '1玉1.2kg']);
  if (name === '白菜' && state === '生' && quantity >= 500) return countHint(quantity, [2000, '玉', state, '1玉2kg']);
  if (name === 'レタス' && state === '生' && quantity >= 200) return countHint(quantity, [400, '玉', state, '1玉400g']);
  if (name === '大根' && state === '生') {
    if (quantity >= 500) return countHint(quantity, [1000, '本', state, '1本1kg']);
    const length = Math.round(quantity / 25 * 2) / 2;
    return length > 0 ? `輪切り約${length}cm（厚さ1cm25g目安）` : '';
  }
  if (name === 'ごぼう' && state === '生') {
    if (quantity >= 150) return countHint(quantity, [150, '本', state, '1本150g']);
    const length = Math.round(quantity / 2);
    return length > 0 ? `約${length}cm（10cm20g目安）` : '';
  }
  if (name === 'バジル' && state === '生') return countHint(quantity, [0.5, '枚', state, '2枚1g']);
  if (name === '米' && state === '生' && /無洗米/.test(notes)) return countHint(quantity, [160, '合', '生', '無洗米1合160g']);
  if (name === 'しいたけ' && state === '生' && /軸を取った|軸を除いた/.test(notes)) return countHint(quantity, [10, '枚', state, '軸なし1枚10g']);

  const measure = Object.hasOwn(COUNTS, name) ? COUNTS[name] : null;
  if (measure && state === measure[2]) return countHint(quantity, measure);

  const spoon = Object.hasOwn(SPOONS, name) ? SPOONS[name] : null;
  if (!spoon || state !== spoon[1]) return '';
  // A different sugar or salt cannot inherit the density of the default product.
  if (name === '砂糖' && /グラニュー|ざらめ|三温糖|きび|黒糖/.test(notes)) return '';
  if (name === '塩' && /粗塩|あら塩|ほんじお|岩塩/.test(notes)) return '';
  const [teaspoonGrams, , kind] = spoon;
  const tablespoon = quantity >= teaspoonGrams * 3;
  const grams = teaspoonGrams * (tablespoon ? 3 : 1);
  const amount = fraction(quantity / grams);
  // Tiny spoon fractions invite inaccurate seasoning; retain the gram-only label.
  if (!amount || quantity < teaspoonGrams / 8) return '';
  const unit = tablespoon ? '大さじ' : '小さじ';
  return `${unit}約${amount}（${kind ? `${kind}・` : ''}${unit}1杯${grams}g目安）`;
}
