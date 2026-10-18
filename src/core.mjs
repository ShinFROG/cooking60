/** Browser-independent planning, progress, shopping and private storage rules. */
const MODES = new Set(['cook', 'hold', 'eatout']);
const BREAKFASTS = new Set(['none', 'toast', 'rice']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_NOTE = 1000;

export const PANTRY_BASICS = Object.freeze([
  'しょうゆ', 'サラダ油', '塩', '砂糖', 'こしょう', 'ケチャップ', '酒', '片栗粉', 'みりん', 'ごま油', 'みそ', '酢',
].map(name => Object.freeze({ name, state: name === '片栗粉' ? '乾燥' : '製品' })));
const pantryStates = new Map(PANTRY_BASICS.map(item => [item.name, item.state]));

const clone = value => JSON.parse(JSON.stringify(value));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const cleanText = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
const round = value => Math.round((value + Number.EPSILON) * 1e6) / 1e6;

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function recipeIds(data) {
  assert(isObject(data) && Array.isArray(data.recipes) && Array.isArray(data.days), '献立データが不正です。');
  const ids = new Set(data.recipes.map(recipe => recipe.id));
  assert(ids.size === data.recipes.length && [...ids].every(id => typeof id === 'string' && id && !FORBIDDEN_KEYS.has(id)), '料理IDが不正です。');
  return ids;
}

function defaultSlots(data) {
  return data.days.flatMap(day => [
    { key: `day-${day.day}-lunch`, day: day.day, meal: 'lunch', recipeId: day.lunchRecipeId, mode: 'cook' },
    { key: `day-${day.day}-dinner`, day: day.day, meal: 'dinner', recipeId: day.dinnerRecipeId, mode: 'cook' },
  ]);
}

export function createDefaultState(data, today = localToday()) {
  recipeIds(data);
  assert(validDate(today), '開始日が正しくありません。');
  return {
    schemaVersion: 1,
    startDate: today,
    servings: 1,
    breakfast: 'none',
    slots: defaultSlots(data),
    progress: {},
    pantryBasics: {},
    shoppingChecks: {},
    extraItems: [],
  };
}

function normalizeProgress(value) {
  assert(isObject(value), '料理記録が不正です。');
  assert(Array.isArray(value.dates) && value.dates.length <= 10000 && value.dates.every(validDate), '料理記録の日付が不正です。');
  assert(typeof value.mastered === 'boolean' && typeof value.practice === 'boolean', '料理記録の状態が不正です。');
  assert(typeof value.note === 'string' && value.note.length <= MAX_NOTE, `メモは${MAX_NOTE}文字以内で入力してください。`);
  const dates = [...new Set(value.dates)].sort();
  return { dates, mastered: dates.length > 0 && value.mastered, practice: value.practice, note: value.note };
}

function normalizeShoppingPeriod(value, maxDay, ids) {
  assert(typeof value === 'string' && value.length <= 80, '買物チェックの期間が不正です。');
  let parts;
  try { parts = JSON.parse(value); } catch { fail('買物チェックの期間が不正です。'); }
  assert(Array.isArray(parts) && parts.length === 3, '買物チェックの期間が不正です。');
  if (parts[1] === 'recipe') {
    assert(validDate(parts[0]) && ids.has(parts[2]), '買物チェックの料理が不正です。');
    return JSON.stringify(parts);
  }
  assert(parts[2] <= maxDay, '買物チェックの期間が不正です。');
  return shoppingPeriod({ startDate: parts[0] }, parts[1], parts[2]);
}

/** Reject malformed imports before any existing state or storage is changed. */
export function validateState(input, data) {
  const ids = recipeIds(data);
  assert(isObject(input), 'バックアップの形式が不正です。');
  assert(input.schemaVersion === 1, 'このバックアップの形式には対応していません。');
  assert(validDate(input.startDate), '開始日が正しくありません。');
  assert(Number.isInteger(input.servings) && input.servings >= 1 && input.servings <= 4, '人数は1〜4人にしてください。');
  assert(BREAKFASTS.has(input.breakfast), '朝食の設定が不正です。');
  const expected = defaultSlots(data);
  assert(Array.isArray(input.slots) && input.slots.length === expected.length, '献立の枠数が正しくありません。');
  const byKey = new Map();
  for (const slot of input.slots) {
    assert(isObject(slot) && typeof slot.key === 'string' && !byKey.has(slot.key), '献立の枠が重複しているか不正です。');
    assert(ids.has(slot.recipeId), '不明な料理が献立に含まれています。');
    assert(MODES.has(slot.mode), '献立の状態が不正です。');
    byKey.set(slot.key, slot);
  }
  const slots = expected.map(expectedSlot => {
    const slot = byKey.get(expectedSlot.key);
    assert(slot && slot.day === expectedSlot.day && slot.meal === expectedSlot.meal, '献立の日時が不正です。');
    return { ...expectedSlot, recipeId: slot.recipeId, mode: slot.mode };
  });
  assert(new Set(slots.map(slot => slot.recipeId)).size === slots.length, '献立内で料理が重複しています。');
  assert(isObject(input.progress), '料理記録が不正です。');
  const progress = Object.fromEntries(Object.entries(input.progress).map(([id, value]) => {
    assert(ids.has(id), '不明な料理の記録が含まれています。');
    return [id, normalizeProgress(value)];
  }));
  const pantryInput = input.pantryBasics === undefined ? {} : input.pantryBasics;
  assert(isObject(pantryInput), '基本セットの状態が不正です。');
  const pantryBasics = Object.fromEntries(Object.entries(pantryInput).filter(([name, checked]) => {
    assert(pantryStates.has(name) && typeof checked === 'boolean', '基本セットの項目が不正です。');
    return checked;
  }));
  assert(isObject(input.shoppingChecks) && Object.keys(input.shoppingChecks).length <= 10000, '買物チェックが不正です。');
  const shoppingChecks = Object.fromEntries(Object.entries(input.shoppingChecks).map(([key, value]) => {
    assert(key.length > 0 && key.length <= 500 && !FORBIDDEN_KEYS.has(key) && isObject(value), '買物チェックのキーが不正です。');
    assert(['bought', 'pantry', 'needed'].includes(value.kind), '買物チェックの状態が不正です。');
    assert(value.quantity === null || (Number.isFinite(value.quantity) && value.quantity >= 0), '買物チェックの数量が不正です。');
    const normalized = { kind: value.kind, quantity: value.quantity };
    if (value.period !== undefined) normalized.period = normalizeShoppingPeriod(value.period, data.days.length, ids);
    assert(value.kind !== 'needed' || normalized.period !== undefined, '買物チェックの期間が不正です。');
    if (key.startsWith('recipe:')) {
      let parts;
      try { parts = JSON.parse(key.slice(7)); } catch { fail('買物チェックの料理キーが不正です。'); }
      assert(Array.isArray(parts) && parts.length === 5 && ids.has(parts[0]) && parts.slice(1, 4).every(part => typeof part === 'string') && ['optional', 'measured'].includes(parts[4]), '買物チェックの料理キーが不正です。');
      assert(normalized.period !== undefined && JSON.parse(normalized.period)[1] === 'recipe' && JSON.parse(normalized.period)[2] === parts[0], '買物チェックの料理が一致しません。');
    } else if (normalized.period !== undefined) {
      assert(JSON.parse(normalized.period)[1] !== 'recipe', '買物チェックの料理キーが不正です。');
    }
    return [key, normalized];
  }));
  assert(Array.isArray(input.extraItems) && input.extraItems.length <= 500, '追加の買物リストが不正です。');
  const extraIds = new Set();
  const extraItems = input.extraItems.map(item => {
    assert(isObject(item) && typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 100 && !FORBIDDEN_KEYS.has(item.id) && !extraIds.has(item.id), '追加項目のIDが不正です。');
    assert(typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 200 && typeof item.done === 'boolean', '追加項目の内容が不正です。');
    extraIds.add(item.id);
    return { id: item.id, name: item.name.trim(), done: item.done };
  });
  return { schemaVersion: 1, startDate: input.startDate, servings: input.servings, breakfast: input.breakfast, slots, progress, pantryBasics, shoppingChecks, extraItems };
}

export function setPantryBasic(state, name, checked) {
  assert(pantryStates.has(name) && typeof checked === 'boolean', '基本セットの項目が不正です。');
  const next = clone(state);
  next.pantryBasics ??= {};
  if (checked) next.pantryBasics[name] = true;
  else delete next.pantryBasics[name];
  return next;
}

function hasPantryBasic(state, ingredient) {
  return own(state.pantryBasics ?? {}, ingredient.name) && state.pantryBasics[ingredient.name] === true && pantryStates.get(ingredient.name) === ingredient.state;
}

export function swapSlots(state, keyA, keyB) {
  const next = clone(state);
  const first = next.slots.find(slot => slot.key === keyA);
  const second = next.slots.find(slot => slot.key === keyB);
  assert(first && second, '入れ替える献立が見つかりません。');
  [first.recipeId, second.recipeId] = [second.recipeId, first.recipeId];
  return next;
}

function hasRecipe(state, recipeId) {
  assert(typeof recipeId === 'string' && !FORBIDDEN_KEYS.has(recipeId) && state.slots.some(slot => slot.recipeId === recipeId), '料理が見つかりません。');
}

function emptyProgress() { return { dates: [], mastered: false, practice: false, note: '' }; }

export function recordCook(state, recipeId, date = localToday()) {
  hasRecipe(state, recipeId);
  assert(validDate(date), '記録の日付が正しくありません。');
  const next = clone(state);
  const value = own(next.progress, recipeId) ? next.progress[recipeId] : emptyProgress();
  next.progress[recipeId] = normalizeProgress({ ...value, dates: [...value.dates, date] });
  return next;
}

export function updateProgress(state, recipeId, patch) {
  hasRecipe(state, recipeId);
  assert(isObject(patch), '料理記録の変更内容が不正です。');
  const next = clone(state);
  const value = own(next.progress, recipeId) ? next.progress[recipeId] : emptyProgress();
  const allowedPatch = Object.fromEntries(['dates', 'mastered', 'practice', 'note'].filter(key => own(patch, key)).map(key => [key, patch[key]]));
  next.progress[recipeId] = normalizeProgress({ ...value, ...allowedPatch });
  return next;
}

export function getCounts(state) {
  return Object.values(state.progress).reduce((counts, value) => ({
    cooked: counts.cooked + Number(value.dates.length > 0),
    mastered: counts.mastered + Number(value.dates.length > 0 && value.mastered),
    practice: counts.practice + Number(value.practice),
  }), { cooked: 0, mastered: 0, practice: 0 });
}

function canonicalUnit(unit) {
  const normalized = cleanText(unit);
  if (normalized === '大さじ') return { unit: 'ml', factor: 15 };
  if (normalized === '小さじ') return { unit: 'ml', factor: 5 };
  if (['ml', 'mL', 'ミリリットル'].includes(normalized)) return { unit: 'ml', factor: 1 };
  if (normalized === 'kg') return { unit: 'g', factor: 1000 };
  return { unit: normalized, factor: 1 };
}

function checkStillCovers(check, quantity) {
  if (!check || !['bought', 'pantry'].includes(check.kind)) return false;
  if (check.quantity === null || quantity === null) return check.quantity === quantity;
  return Number.isFinite(check.quantity) && check.quantity >= quantity;
}

/** A purchased amount belongs to one dated planning period, not every future meal. */
export function shoppingPeriod(state, fromDay, toDay, recipeId = null) {
  assert(validDate(state.startDate), '買物の開始日が正しくありません。');
  if (recipeId !== null) {
    hasRecipe(state, recipeId);
    return JSON.stringify([state.startDate, 'recipe', recipeId]);
  }
  assert(Number.isInteger(fromDay) && Number.isInteger(toDay) && fromDay >= 1 && fromDay <= toDay && toDay <= 30, '買物の対象日が正しくありません。');
  return JSON.stringify([state.startDate, fromDay, toDay]);
}

/** Match recipe ingredient controls to their combined shopping row; water is omitted. */
export function recipeShoppingKey(ingredient, recipeId) {
  assert(typeof recipeId === 'string' && recipeId && !FORBIDDEN_KEYS.has(recipeId), '料理が見つかりません。');
  const name = cleanText(ingredient.name);
  if (!name || name === '水') return null;
  return `recipe:${JSON.stringify([recipeId, name, cleanText(ingredient.state), canonicalUnit(ingredient.unit).unit, ingredient.quantity === null ? 'optional' : 'measured'])}`;
}

/** Exact names and preparation states are kept separate; only safe units convert. */
export function aggregateShopping(data, state, fromDay, toDay, recipeId = null) {
  if (recipeId === null) assert(Number.isInteger(fromDay) && Number.isInteger(toDay) && fromDay >= 1 && fromDay <= toDay && toDay <= data.days.length, '買物の対象日が正しくありません。');
  else assert(recipeIds(data).has(recipeId), '料理が見つかりません。');
  assert(Number.isInteger(state.servings) && state.servings >= 1 && state.servings <= 4, '人数は1〜4人にしてください。');
  const period = shoppingPeriod(state, fromDay, toDay, recipeId);
  const recipes = new Map(data.recipes.map(recipe => [recipe.id, recipe]));
  const combined = new Map();
  const add = (ingredient, multiplier, sourceRecipeId = null, extraNote = '') => {
    const name = cleanText(ingredient.name);
    if (!name || name === '水') return;
    const preparation = cleanText(ingredient.state);
    const { unit, factor } = canonicalUnit(ingredient.unit);
    const isOptional = ingredient.quantity === null;
    assert(isOptional || (Number.isFinite(ingredient.quantity) && ingredient.quantity >= 0), `材料「${name}」の数量が不正です。`);
    const quantity = isOptional ? null : round(ingredient.quantity * multiplier * factor);
    const key = recipeId === null ? JSON.stringify([name, preparation, unit, isOptional ? 'optional' : 'measured']) : recipeShoppingKey(ingredient, recipeId);
    if (!combined.has(key)) combined.set(key, { key, name, state: preparation, unit, quantity: isOptional ? null : 0, aisle: cleanText(ingredient.aisle) || 'その他', notes: [], recipeIds: [], check: null, needsReview: false });
    const row = combined.get(key);
    if (quantity !== null) row.quantity = round(row.quantity + quantity);
    for (const note of [cleanText(ingredient.note), extraNote]) if (note && !row.notes.includes(note)) row.notes.push(note);
    if (sourceRecipeId && !row.recipeIds.includes(sourceRecipeId)) row.recipeIds.push(sourceRecipeId);
  };
  const selectedRecipes = recipeId === null
    ? state.slots.filter(slot => slot.day >= fromDay && slot.day <= toDay && slot.mode === 'cook').map(slot => recipes.get(slot.recipeId))
    : [recipes.get(recipeId)];
  for (const recipe of selectedRecipes) {
    assert(recipe && Array.isArray(recipe.ingredients), '材料データが見つかりません。');
    const baseServings = recipe.baseServings ?? 1;
    assert(Number.isFinite(baseServings) && baseServings > 0, '材料の基準人数が不正です。');
    for (const ingredient of recipe.ingredients) add(ingredient, state.servings / baseServings, recipe.id);
  }
  const breakfastItems = {
    toast: [
      { name: '食パン', quantity: 1, unit: '枚', state: '焼成済み', aisle: '米・麺・パン' },
      { name: 'ヨーグルト', quantity: 100, unit: 'g', state: '製品', aisle: '卵・乳' },
      { name: 'バナナ', quantity: 1, unit: '本', state: '生', aisle: '野菜' },
    ],
    rice: [
      { name: 'ご飯', quantity: 150, unit: 'g', state: '炊飯済み', aisle: '米・麺・パン' },
      { name: '納豆', quantity: 1, unit: 'パック', state: '製品', aisle: '豆・加工品' },
    ],
  };
  const dayCount = toDay - fromDay + 1;
  if (recipeId === null) for (const ingredient of breakfastItems[state.breakfast] ?? []) add(ingredient, dayCount * state.servings, null, `朝食${dayCount}日分を含む`);
  for (const row of combined.values()) {
    const previous = own(state.shoppingChecks, row.key) ? state.shoppingChecks[row.key] : null;
    const valid = previous?.period === period && checkStillCovers(previous, row.quantity);
    const needed = previous?.kind === 'needed' && previous.period === period;
    row.basicPantry = hasPantryBasic(state, row);
    row.needsReview = Boolean(previous && previous.kind !== 'needed' && !valid);
    row.check = valid ? previous.kind : !needed && !row.needsReview && row.basicPantry ? 'pantry' : null;
    row.checkSource = valid ? 'local' : needed ? 'override' : row.check === 'pantry' ? 'basic' : null;
  }
  return [...combined.values()].sort((a, b) => a.aisle.localeCompare(b.aisle, 'ja') || a.name.localeCompare(b.name, 'ja') || a.state.localeCompare(b.state, 'ja') || a.unit.localeCompare(b.unit, 'ja'));
}

function writeShoppingCheck(next, row, kind, checked, period) {
  assert(isObject(row) && typeof row.key === 'string' && row.key && !FORBIDDEN_KEYS.has(row.key), '買物チェックの項目が不正です。');
  assert(row.quantity === null || (Number.isFinite(row.quantity) && row.quantity >= 0), '買物チェックの数量が不正です。');
  assert(['bought', 'pantry'].includes(kind) && typeof checked === 'boolean', '買物チェックの状態が不正です。');
  if (checked) next.shoppingChecks[row.key] = { kind, quantity: row.quantity, period };
  else if (hasPantryBasic(next, row)) next.shoppingChecks[row.key] = { kind: 'needed', quantity: row.quantity, period };
  else delete next.shoppingChecks[row.key];
}

/** A shared staple can be required again for this list without changing other lists. */
export function setShoppingCheck(state, row, kind, checked, period) {
  const next = clone(state);
  const normalizedPeriod = normalizeShoppingPeriod(period, 30, new Set(state.slots.map(slot => slot.recipeId)));
  writeShoppingCheck(next, row, kind, checked, normalizedPeriod);
  return next;
}

/** Only the displayed list is reset; the household's basic set is preserved. */
export function resetShoppingChecks(state, rows, period) {
  const next = clone(state);
  const normalizedPeriod = normalizeShoppingPeriod(period, 30, new Set(state.slots.map(slot => slot.recipeId)));
  for (const row of rows) writeShoppingCheck(next, row, 'pantry', false, normalizedPeriod);
  return next;
}

export function reconcileChecks(state, rows) {
  const next = clone(state);
  next.shoppingChecks = Object.fromEntries(rows.filter(row => own(state.shoppingChecks, row.key) && (row.checkSource === 'override' || (row.check !== null && row.check === state.shoppingChecks[row.key].kind && checkStillCovers(state.shoppingChecks[row.key], row.quantity)))).map(row => [row.key, clone(state.shoppingChecks[row.key])]));
  return next;
}

/** Separate GitHub Pages repositories on one origin without storing personal data remotely. */
export function storageKey(repoPath = '/') {
  let path = String(repoPath).split(/[?#]/, 1)[0].replace(/\/+/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/index\.html?$/i, '/');
  if (!path.endsWith('/')) path += '/';
  return `cooking60:${path}:v1`;
}

const previousKey = key => key.replace(/:v1$/, ':v0');

function normalizeLegacy(input, data, today) {
  assert(isObject(input) && (input.version === 0 || input.schemaVersion === 0), '旧バックアップの形式が不正です。');
  const defaults = createDefaultState(data, today);
  return validateState({ ...defaults, ...input, schemaVersion: 1 }, data);
}

export function loadState(storage, key, data, today = localToday()) {
  const defaults = createDefaultState(data, today);
  const warnings = [];
  let text;
  let sourceKey = key;
  try {
    text = storage.getItem(key);
    if (text === null && previousKey(key) !== key) {
      sourceKey = previousKey(key);
      text = storage.getItem(sourceKey);
    }
  } catch {
    return { state: defaults, warnings: ['ブラウザの保存領域を読み込めません。今回の変更は保存されません。'], persistent: false };
  }
  if (text === null) return { state: defaults, warnings, persistent: true };
  try {
    const parsed = JSON.parse(text);
    if (isObject(parsed) && (parsed.schemaVersion > 1 || parsed.version > 1)) {
      return { state: defaults, warnings: ['新しい形式の保存データがあるため、上書きを停止しました。元のデータは残っています。'], persistent: false };
    }
    const legacy = isObject(parsed) && (parsed.version === 0 || parsed.schemaVersion === 0);
    const state = legacy ? normalizeLegacy(parsed, data, today) : validateState(parsed, data);
    if (legacy || sourceKey !== key) {
      const saved = saveState(storage, key, state);
      warnings.push(saved.ok ? '以前の保存データを移行しました。旧データも残しています。' : '以前の保存データを読み込みましたが、新しい形式で保存できません。旧データは残っています。');
      return { state, warnings, persistent: saved.ok };
    }
    return { state, warnings, persistent: true };
  } catch {
    return { state: defaults, warnings: ['保存データを読み込めません。元のデータを保護するため、上書きを停止しました。'], persistent: false };
  }
}

export function saveState(storage, key, state) {
  try {
    storage.setItem(key, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, error: 'ブラウザに保存できません。バックアップをダウンロードして記録を保管してください。' };
  }
}

export function clearAppState(storage, key) {
  try {
    storage.removeItem(key);
    if (previousKey(key) !== key) storage.removeItem(previousKey(key));
    return { ok: true };
  } catch {
    return { ok: false, error: 'ブラウザの保存データを削除できませんでした。' };
  }
}
