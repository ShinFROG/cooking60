import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function isPublicHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.') && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname) && !/\.(local|internal)$/i.test(url.hostname);
  } catch { return false; }
}

export async function readPublicData(root = projectRoot) {
  const [lunch, dinner, candidates] = await Promise.all([
    'recipes-lunch.json', 'recipes-dinner.json', 'candidates.json',
  ].map(async filename => JSON.parse(await readFile(resolve(root, 'data/public', filename), 'utf8'))));
  if (!Array.isArray(lunch) || !Array.isArray(dinner)) throw new Error('昼食・夕食JSONの最上位は配列である必要があります。');
  return { recipes: [...lunch, ...dinner].sort((a, b) => String(a?.id).localeCompare(String(b?.id))), days: candidates.days, candidates: candidates.recipes };
}

/** Static content checks cannot certify taste, safety, originality, or an actual cooking trial. */
export function validateData(data, { release = false } = {}) {
  const errors = [];
  const warnings = [];
  const stats = { recipeCount: 0, dayCount: 0, estimatedWithin30: 0, verifiedCount: 0, untestedCount: 0, measuredWithin30: 0 };
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!isObject(data)) return { ok: false, errors: ['公開データはオブジェクトである必要があります。'], warnings, stats };
  const recipes = Array.isArray(data.recipes) ? data.recipes : [];
  const days = Array.isArray(data.days) ? data.days : [];
  stats.recipeCount = recipes.length;
  stats.dayCount = days.length;
  check(recipes.length === 60, `料理は60件必要です（現在${recipes.length}件）。`);
  check(days.length === 30, `献立は30日必要です（現在${days.length}日）。`);
  const ids = new Set();
  const titles = new Set();
  const validRecipeMap = new Map();
  for (const [index, recipe] of recipes.entries()) {
    const label = text(recipe?.id) ? recipe.id : `料理${index + 1}`;
    if (!isObject(recipe)) { errors.push(`${label}: オブジェクトである必要があります。`); continue; }
    check(/^dish-(0[1-9]|[1-5][0-9]|60)$/.test(recipe.id), `${label}: dish-01〜dish-60のIDが必要です。`);
    check(!ids.has(recipe.id), `${label}: 料理IDが重複しています。`);
    ids.add(recipe.id);
    validRecipeMap.set(recipe.id, recipe);
    check(text(recipe.title), `${label}: 料理名が必要です。`);
    const normalizedTitle = String(recipe.title ?? '').normalize('NFKC').trim();
    check(!titles.has(normalizedTitle), `${label}: 料理名が重複しています。`);
    titles.add(normalizedTitle);
    check(['ご飯', '麺', 'パン', '定食'].includes(recipe.mealForm), `${label}: 食事の形式が不正です。`);
    for (const key of ['skill', 'difficulty', 'prepNote']) check(text(recipe[key]), `${label}: ${key}が必要です。`);
    check(recipe.baseServings === 1, `${label}: 基準量は1人分にしてください。`);
    check(positive(recipe.estimatedActiveMinutes), `${label}: 実作業時間の目安が必要です。`);
    check(positive(recipe.estimatedTotalMinutes) && recipe.estimatedTotalMinutes >= recipe.estimatedActiveMinutes, `${label}: 総時間の目安は実作業時間以上にしてください。`);
    if (positive(recipe.estimatedTotalMinutes) && recipe.estimatedTotalMinutes <= 30) stats.estimatedWithin30++;
    check(typeof recipe.readyRiceAssumed === 'boolean', `${label}: 炊飯済みご飯の前提を明記してください。`);
    for (const key of ['equipment', 'tips', 'substitutions', 'safetyNotes']) {
      check(Array.isArray(recipe[key]) && recipe[key].length > 0 && recipe[key].every(text), `${label}: ${key}には空でない説明の配列が必要です。`);
    }
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    check(ingredients.length > 0, `${label}: 材料が必要です。`);
    for (const [ingredientIndex, ingredient] of ingredients.entries()) {
      const ingredientLabel = `${label}: 材料${ingredientIndex + 1}`;
      if (!isObject(ingredient)) { errors.push(`${ingredientLabel}が不正です。`); continue; }
      for (const key of ['name', 'unit', 'state', 'aisle']) check(text(ingredient[key]), `${ingredientLabel}の${key}が必要です。`);
      check(typeof ingredient.note === 'string', `${ingredientLabel}のnoteは文字列にしてください。`);
      check(ingredient.quantity === null || positive(ingredient.quantity), `${ingredientLabel}の分量は正数かnull（適量）にしてください。`);
      if (ingredient.quantity === null) check(/適量|少々|好み/.test(`${ingredient.unit} ${ingredient.note}`), `${ingredientLabel}: nullの分量は適量等と明記してください。`);
    }
    const foodNames = ingredients.filter(isObject).map(item => item.name);
    const rice = ingredients.find(item => item?.name === 'ご飯' && item?.state === '炊飯済み' && positive(item?.quantity));
    if (recipe.mealForm === '定食' || /とご飯$/.test(recipe.title)) check(Boolean(rice), `${label}: 定食の材料には炊飯済みご飯を含めてください。`);
    if (recipe.readyRiceAssumed === true) {
      check(Boolean(rice), `${label}: 炊飯済みご飯を使う前提と材料が一致していません。`);
      check(/炊飯済み|炊いた|炊いて|炊きたて/.test(recipe.prepNote), `${label}: 炊飯済みご飯の準備条件が必要です。`);
    }
    check(foodNames.some(name => /^(ご飯|米|うどん|スパゲティ|食パン|トルティーヤ|焼きそば麺|そば|中華麺|薄力粉|マカロニ)$/.test(name)), `${label}: 一食分の主食材料が見つかりません。`);
    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    check(steps.length >= 3, `${label}: 作り方は3工程以上必要です。`);
    for (const [stepIndex, step] of steps.entries()) {
      const stepLabel = `${label}: 工程${stepIndex + 1}`;
      check(isObject(step) && text(step.instruction) && text(step.heat) && text(step.cue), `${stepLabel}には説明・火加減・仕上がりの目印が必要です。`);
      check(positive(step?.durationMinutes), `${stepLabel}には時間の目安が必要です。`);
    }
    check(recipe.rights?.status === 'original' && recipe.rights?.license === 'CC-BY-4.0', `${label}: 独自作成・CC-BY-4.0の権利情報が必要です。`);
    const sources = Array.isArray(recipe.sources) ? recipe.sources : [];
    check(sources.length > 0, `${label}: 安全情報の参照先が必要です。`);
    for (const source of sources) check(isObject(source) && text(source.label) && isPublicHttps(source.url) && source.kind === 'reference-only', `${label}: 参照先は公開HTTPS URLとreference-onlyの区分が必要です。`);
    const validation = recipe.validation;
    check(isObject(validation) && ['untested', 'verified'].includes(validation.status) && text(validation.note), `${label}: 試作状況と説明が必要です。`);
    if (validation?.status === 'untested') {
      stats.untestedCount++;
      check(/未試作/.test(validation.note), `${label}: 未試作であることを明記してください。`);
      check(validation.measuredTotalMinutes === undefined || validation.measuredTotalMinutes === null, `${label}: 未試作データに実測時間を付けることはできません。`);
    }
    if (validation?.status === 'verified') {
      stats.verifiedCount++;
      check(dateValid(validation.testedOn), `${label}: 実調理した日付testedOnが必要です。`);
      check(positive(validation.measuredTotalMinutes), `${label}: verifiedには実測総時間measuredTotalMinutesが必要です。`);
      check(!/未試作/.test(validation.note), `${label}: verifiedと未試作の説明が矛盾しています。`);
      if (dateValid(validation.testedOn) && positive(validation.measuredTotalMinutes) && validation.measuredTotalMinutes <= 30) stats.measuredWithin30++;
    }
  }
  const dayNumbers = new Set();
  const plannedIds = [];
  for (const day of days) {
    check(isObject(day) && Number.isInteger(day.day) && day.day >= 1 && day.day <= 30 && !dayNumbers.has(day.day), '献立の日付は1〜30日目を重複なく含めてください。');
    dayNumbers.add(day?.day);
    for (const meal of ['lunchRecipeId', 'dinnerRecipeId']) {
      check(ids.has(day?.[meal]), `${day?.day ?? '?'}日目: ${meal}の料理が見つかりません。`);
      plannedIds.push(day?.[meal]);
    }
  }
  check(plannedIds.length === 60 && new Set(plannedIds).size === 60 && [...ids].every(id => plannedIds.includes(id)), '30日×昼夕の献立には60料理を1回ずつ割り当ててください。');
  if (data.candidates !== undefined) {
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    check(candidates.length === 60, '候補データには60料理が必要です。');
    check(new Set(candidates.map(candidate => candidate?.id)).size === 60, '候補の料理IDが重複しています。');
    for (const candidate of candidates) {
      const recipe = validRecipeMap.get(candidate?.id);
      check(recipe && candidate.title === recipe.title, `${candidate?.id ?? '?'}: 元の候補と公開料理のID・名前が一致していません。`);
    }
  }
  const serialized = JSON.stringify(data);
  check(!/(\/Users\/|\/Volumes\/|file:\/\/|-----BEGIN [A-Z ]*PRIVATE KEY-----|github_pat_[a-zA-Z0-9_]+|gh[pousr]_[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9_-]{20,})/.test(serialized), '公開JSONにローカルパスまたは機密情報らしい文字列が含まれています。');
  if (stats.untestedCount > 0) warnings.push(`${stats.untestedCount}品は未試作です。分量・時間は目安として表示してください。`);
  if (stats.estimatedWithin30 < 48) warnings.push(`目安30分以内は${stats.estimatedWithin30}品です。設計目標48品に届いていません。`);
  if (release) {
    check(stats.verifiedCount === 60, `正式版ゲート: 全60品に実調理の検証が必要です（verified ${stats.verifiedCount}/60）。`);
    check(stats.measuredWithin30 >= 48, `正式版ゲート: 少なくとも48品で実測総時間30分以内の裏付けが必要です（現在${stats.measuredWithin30}/48）。目安時間は実測として扱いません。`);
  }
  return { ok: errors.length === 0, errors, warnings, stats };
}

async function main() {
  const release = process.argv.includes('--release');
  try {
    const result = validateData(await readPublicData(), { release });
    console.log(`${release ? '正式版' : 'プレビュー'}検証: 料理${result.stats.recipeCount}品 / 献立${result.stats.dayCount}日 / 目安30分以内${result.stats.estimatedWithin30}品 / 実調理検証${result.stats.verifiedCount}品 / 実測30分以内${result.stats.measuredWithin30}品`);
    for (const warning of result.warnings) console.warn(`注意: ${warning}`);
    for (const error of result.errors) console.error(`エラー: ${error}`);
    if (!release) console.log('未試作の明示を伴うプレビューを検査しています。正式版の条件は --release で確認できます。');
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`公開データの読込に失敗しました: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
