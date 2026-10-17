import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateShopping, clearAppState, createDefaultState, getCounts, loadState, reconcileChecks, recordCook, saveState, shoppingPeriod, storageKey, swapSlots, updateProgress, validateState } from '../src/core.mjs';

const TODAY = '2026-10-17';
const ingredient = (name, quantity, unit, state = '', note = '') => ({ name, quantity, unit, state, aisle: 'テスト', note });
function fixture() {
  return {
    recipes: Array.from({ length: 60 }, (_, i) => ({ id: `dish-${i + 1}`, baseServings: 1, ingredients: [] })),
    days: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, lunchRecipeId: `dish-${i * 2 + 1}`, dinnerRecipeId: `dish-${i * 2 + 2}` })),
  };
}
function storageFixture(initial = {}) {
  const items = new Map(Object.entries(initial));
  return { items, getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
}

test('swapping keeps every one of the 60 recipes and leaves each slot mode in place', () => {
  const data = fixture();
  const state = createDefaultState(data, TODAY);
  state.slots[0].mode = 'hold';
  const next = swapSlots(state, 'day-1-lunch', 'day-30-dinner');
  assert.equal(next.slots[0].recipeId, 'dish-60');
  assert.equal(next.slots[0].mode, 'hold');
  assert.equal(next.slots[59].recipeId, 'dish-1');
  assert.equal(next.slots[59].mode, 'cook');
  assert.deepEqual(next.slots.map(slot => slot.recipeId).sort(), state.slots.map(slot => slot.recipeId).sort());
  assert.equal(state.slots[0].recipeId, 'dish-1');
  assert.deepEqual(validateState(next, data), next);
});

test('shopping safely converts compatible units and separates ingredient states, pieces, and optional quantities', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('しょうゆ', 1, '大さじ'), ingredient('にんじん', 0.1, 'kg'), ingredient('塩', null, 'g'), ingredient('ご飯', 150, 'g', '炊飯済み'), ingredient('水', 200, 'ml')];
  data.recipes[1].ingredients = [ingredient('しょうゆ', 2, '小さじ'), ingredient('しょうゆ', 5, 'ml'), ingredient('にんじん', 50, 'g'), ingredient('にんじん', 1, '本'), ingredient('塩', 2, 'g'), ingredient('ご飯', 75, 'g', '生米')];
  const rows = aggregateShopping(data, createDefaultState(data, TODAY), 1, 1);
  assert.equal(rows.find(row => row.name === 'しょうゆ').quantity, 30);
  assert.equal(rows.find(row => row.name === 'にんじん' && row.unit === 'g').quantity, 150);
  assert.equal(rows.find(row => row.name === 'にんじん' && row.unit === '本').quantity, 1);
  assert.equal(rows.filter(row => row.name === '塩').length, 2);
  assert.equal(rows.filter(row => row.name === 'ご飯').length, 2);
  assert.equal(rows.some(row => row.name === '水'), false);
  assert.deepEqual(rows.find(row => row.name === 'しょうゆ').recipeIds, ['dish-1', 'dish-2']);
});

test('increased quantities invalidate a prior check and reduced quantities retain it', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('卵', 2, '個')];
  const state = createDefaultState(data, TODAY);
  const row = aggregateShopping(data, state, 1, 1)[0];
  state.shoppingChecks[row.key] = { kind: 'bought', quantity: row.quantity, period: shoppingPeriod(state, 1, 1) };
  state.servings = 2;
  const increased = aggregateShopping(data, state, 1, 1);
  assert.equal(increased[0].quantity, 4);
  assert.equal(increased[0].check, null);
  assert.equal(increased[0].needsReview, true);
  assert.deepEqual(reconcileChecks(state, increased).shoppingChecks, {});
  assert.equal(state.shoppingChecks[row.key].quantity, 2);
  state.shoppingChecks[row.key].quantity = 6;
  assert.equal(aggregateShopping(data, state, 1, 1)[0].check, 'bought');
  state.shoppingChecks.stale = { kind: 'pantry', quantity: 1 };
  assert.equal(Object.keys(reconcileChecks(state, aggregateShopping(data, state, 1, 1)).shoppingChecks).length, 1);
});

test('null quantities keep independent pantry checks and measured amounts still require purchase', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('塩', null, 'g'), ingredient('塩', 1, 'g')];
  const state = createDefaultState(data, TODAY);
  const rows = aggregateShopping(data, state, 1, 1);
  state.shoppingChecks[rows.find(row => row.quantity === null).key] = { kind: 'pantry', quantity: null, period: shoppingPeriod(state, 1, 1) };
  const checked = aggregateShopping(data, state, 1, 1);
  assert.equal(checked.find(row => row.quantity === null).check, 'pantry');
  assert.equal(checked.find(row => row.quantity === 1).check, null);
});

test('shopping checks belong to the selected day range even if another range needs less', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('ご飯', 350, 'g', '炊飯済み')];
  data.recipes[2].ingredients = [ingredient('ご飯', 150, 'g', '炊飯済み')];
  const state = createDefaultState(data, TODAY);
  const first = aggregateShopping(data, state, 1, 1)[0];
  state.shoppingChecks[first.key] = { kind: 'bought', quantity: 350, period: shoppingPeriod(state, 1, 1) };
  assert.equal(aggregateShopping(data, state, 1, 1)[0].check, 'bought');
  const nextDay = aggregateShopping(data, state, 2, 2);
  assert.equal(nextDay[0].quantity, 150);
  assert.equal(nextDay[0].check, null);
  assert.equal(nextDay[0].needsReview, true);
  assert.deepEqual(reconcileChecks(state, nextDay).shoppingChecks, {});
  assert.equal(aggregateShopping(data, state, 1, 1)[0].check, 'bought', 'Returning to the original period can reuse its unchanged check.');
  assert.equal(aggregateShopping(data, state, 1, 2)[0].check, null, 'An extended period is a new purchase scope.');
});

test('changing the plan start date invalidates checks for both bought and pantry items', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('卵', 2, '個'), ingredient('塩', null, '適量')];
  const state = createDefaultState(data, TODAY);
  const period = shoppingPeriod(state, 1, 3);
  for (const row of aggregateShopping(data, state, 1, 3)) state.shoppingChecks[row.key] = { kind: row.name === '塩' ? 'pantry' : 'bought', quantity: row.quantity, period };
  assert.ok(aggregateShopping(data, state, 1, 3).every(row => row.check !== null));
  state.startDate = '2026-10-18';
  assert.notEqual(shoppingPeriod(state, 1, 3), period);
  assert.ok(aggregateShopping(data, state, 1, 3).every(row => row.check === null && row.needsReview));
});

test('compatible unit changes retain same-period checks while increased quantities still require review', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('しょうゆ', 1, '大さじ')];
  const state = createDefaultState(data, TODAY);
  const original = aggregateShopping(data, state, 1, 1)[0];
  state.shoppingChecks[original.key] = { kind: 'bought', quantity: original.quantity, period: shoppingPeriod(state, 1, 1) };
  data.recipes[0].ingredients = [ingredient('しょうゆ', 3, '小さじ')];
  const same = aggregateShopping(data, state, 1, 1)[0];
  assert.equal(same.key, original.key);
  assert.equal(same.quantity, 15);
  assert.equal(same.check, 'bought');
  data.recipes[0].ingredients = [ingredient('しょうゆ', 20, 'ml')];
  const increased = aggregateShopping(data, state, 1, 1)[0];
  assert.equal(increased.check, null);
  assert.equal(increased.needsReview, true);
  data.recipes[0].ingredients = [ingredient('しょうゆ', 15, 'g')];
  assert.equal(aggregateShopping(data, state, 1, 1)[0].check, null, 'Incompatible units never share checks.');
});

test('schema-1 checks without periods remain importable but require reconfirmation', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('卵', 2, '個')];
  const state = createDefaultState(data, TODAY);
  const row = aggregateShopping(data, state, 1, 1)[0];
  state.shoppingChecks[row.key] = { kind: 'bought', quantity: 2 };
  const imported = validateState(state, data);
  assert.deepEqual(imported.shoppingChecks[row.key], { kind: 'bought', quantity: 2 });
  assert.equal(aggregateShopping(data, imported, 1, 1)[0].check, null);
  assert.equal(aggregateShopping(data, imported, 1, 1)[0].needsReview, true);
  imported.shoppingChecks[row.key].period = shoppingPeriod(imported, 1, 1);
  assert.deepEqual(validateState(imported, data).shoppingChecks, imported.shoppingChecks);
  assert.equal(aggregateShopping(data, imported, 1, 1)[0].check, 'bought');
  imported.shoppingChecks[row.key].period = '["2026-02-30",1,1]';
  assert.throws(() => validateState(imported, data));
  assert.throws(() => shoppingPeriod(state, 0, 1));
});

test('hold and eatout omit ingredients, while fixed breakfast scales by days and servings', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('卵', 2, '個')];
  data.recipes[1].ingredients = [ingredient('牛乳', 100, 'ml')];
  const state = createDefaultState(data, TODAY);
  state.slots[0].mode = 'hold';
  state.slots[1].mode = 'eatout';
  state.breakfast = 'toast';
  state.servings = 2;
  const rows = aggregateShopping(data, state, 1, 3);
  assert.equal(rows.length, 3);
  assert.equal(rows.find(row => row.name === '食パン').quantity, 6);
  assert.equal(rows.find(row => row.name === 'ヨーグルト').quantity, 600);
  state.breakfast = 'rice';
  const rice = aggregateShopping(data, state, 1, 2);
  assert.equal(rice.find(row => row.name === 'ご飯').quantity, 600);
  assert.equal(rice.find(row => row.name === '納豆').quantity, 4);
});

test('recipe base servings are respected and decimal conversion stays stable', () => {
  const data = fixture();
  data.recipes[0].baseServings = 2;
  data.recipes[0].ingredients = [ingredient('しょうゆ', 0.5, '小さじ')];
  const state = createDefaultState(data, TODAY);
  state.servings = 3;
  assert.equal(aggregateShopping(data, state, 1, 1)[0].quantity, 3.75);
  assert.throws(() => aggregateShopping(data, state, 0, 1));
  assert.throws(() => aggregateShopping(data, state, 3, 2));
});

test('cooking dates are unique per day, counts mean distinct dishes, and mastery needs cooking', () => {
  const data = fixture();
  const original = createDefaultState(data, TODAY);
  let state = updateProgress(original, 'dish-1', { mastered: true, practice: true });
  assert.equal(state.progress['dish-1'].mastered, false);
  state = recordCook(state, 'dish-1', TODAY);
  state = recordCook(state, 'dish-1', TODAY);
  state = recordCook(state, 'dish-1', '2026-10-18');
  state = updateProgress(state, 'dish-1', { mastered: true });
  state = recordCook(state, 'dish-2', TODAY);
  assert.deepEqual(getCounts(state), { cooked: 2, mastered: 1, practice: 1 });
  assert.deepEqual(state.progress['dish-1'].dates, [TODAY, '2026-10-18']);
  assert.deepEqual(original.progress, {});
  state = updateProgress(state, 'dish-1', { dates: [] });
  assert.equal(state.progress['dish-1'].mastered, false);
  assert.throws(() => recordCook(state, 'missing', TODAY));
  assert.throws(() => recordCook(state, 'dish-1', '2026-02-30'));
  assert.throws(() => updateProgress(state, 'dish-1', { note: 'a'.repeat(1001) }));
});

test('imports accept plain text HTML and URLs but return an independent, normalized copy', () => {
  const data = fixture();
  const state = createDefaultState(data, TODAY);
  state.progress['dish-1'] = { dates: [TODAY, TODAY], mastered: true, practice: false, note: '<img src=x onerror=alert(1)> https://example.org/' };
  state.ignored = 'not in schema';
  const normalized = validateState(state, data);
  assert.equal(normalized.progress['dish-1'].note, state.progress['dish-1'].note);
  assert.deepEqual(normalized.progress['dish-1'].dates, [TODAY]);
  assert.equal(normalized.ignored, undefined);
  normalized.slots[0].mode = 'hold';
  assert.equal(state.slots[0].mode, 'cook');
});

test('invalid imported schemas, ids, duplicate slots, quantities and impossible dates are rejected without mutation', () => {
  const data = fixture();
  const baseline = createDefaultState(data, TODAY);
  const badCases = [
    state => { state.schemaVersion = 2; },
    state => { state.startDate = '2026-02-30'; },
    state => { state.servings = 0; },
    state => { state.breakfast = 'unknown'; },
    state => { state.slots[0].recipeId = 'missing'; },
    state => { state.slots[0] = { ...state.slots[1] }; },
    state => { state.slots[0].recipeId = state.slots[1].recipeId; },
    state => { state.slots[0].mode = 'unknown'; },
    state => { state.progress.unknown = { dates: [], mastered: false, practice: false, note: '' }; },
    state => { state.shoppingChecks.foo = { kind: 'bought', quantity: -1 }; },
    state => { state.extraItems = [{ id: 'a', name: '', done: false }]; },
  ];
  for (const change of badCases) {
    const candidate = structuredClone(baseline);
    change(candidate);
    assert.throws(() => validateState(candidate, data));
  }
  assert.deepEqual(baseline, createDefaultState(data, TODAY));
});

test('storage keys isolate Pages projects and remain stable for index paths', () => {
  assert.equal(storageKey('/cooking60/'), 'cooking60:/cooking60/:v1');
  assert.equal(storageKey('/cooking60/index.html?x=1'), storageKey('/cooking60/'));
  assert.notEqual(storageKey('/cooking60/'), storageKey('/other-project/'));
});

test('storage migration preserves old keys and normalizes version 0', () => {
  const data = fixture();
  const key = storageKey('/cooking60/');
  const oldKey = key.replace(/v1$/, 'v0');
  const legacy = { ...createDefaultState(data, TODAY), version: 0 };
  delete legacy.schemaVersion;
  legacy.servings = 3;
  const storage = storageFixture({ [oldKey]: JSON.stringify(legacy), unrelated: 'keep' });
  const result = loadState(storage, key, data, TODAY);
  assert.equal(result.state.servings, 3);
  assert.equal(result.state.schemaVersion, 1);
  assert.equal(result.persistent, true);
  assert.equal(result.warnings.length, 1);
  assert.equal(storage.items.has(oldKey), true);
  assert.equal(storage.items.has(key), true);
  assert.equal(storage.items.get('unrelated'), 'keep');
});

test('future and malformed stored data are preserved with writes disabled', () => {
  const data = fixture();
  const key = storageKey('/cooking60/');
  for (const text of ['{bad json', JSON.stringify({ schemaVersion: 2 }), JSON.stringify({ version: 3 })]) {
    const storage = storageFixture({ [key]: text });
    const loaded = loadState(storage, key, data, TODAY);
    assert.equal(loaded.persistent, false);
    assert.equal(loaded.warnings.length, 1);
    assert.equal(storage.items.get(key), text);
  }
});

test('unavailable storage returns temporary state and quota errors are reported', () => {
  const data = fixture();
  const key = storageKey('/cooking60/');
  const unavailable = { getItem() { throw new Error('security'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('security'); } };
  assert.equal(loadState(unavailable, key, data, TODAY).persistent, false);
  assert.equal(saveState(unavailable, key, createDefaultState(data, TODAY)).ok, false);
  assert.equal(clearAppState(unavailable, key).ok, false);
  const oldKey = key.replace(/v1$/, 'v0');
  const migrationStorage = storageFixture({ [oldKey]: JSON.stringify({ version: 0 }) });
  migrationStorage.setItem = unavailable.setItem;
  const migrated = loadState(migrationStorage, key, data, TODAY);
  assert.equal(migrated.persistent, false);
  assert.equal(migrationStorage.items.has(oldKey), true);
});

test('reset removes only this app and prior version, preserving other apps and projects', () => {
  const key = storageKey('/cooking60/');
  const oldKey = key.replace(/v1$/, 'v0');
  const otherKey = storageKey('/other/');
  const storage = storageFixture({ [key]: '{}', [oldKey]: '{}', [otherKey]: 'keep', theme: 'dark' });
  assert.deepEqual(clearAppState(storage, key), { ok: true });
  assert.deepEqual([...storage.items.entries()], [[otherKey, 'keep'], ['theme', 'dark']]);
});
