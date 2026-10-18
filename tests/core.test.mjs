import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateShopping, clearAppState, createDefaultState, getCounts, loadState, PANTRY_BASICS, recipeShoppingKey, reconcileChecks, recordCook, resetShoppingChecks, saveState, setPantryBasic, setShoppingCheck, shoppingPeriod, storageKey, swapSlots, updateProgress, validateState } from '../src/core.mjs';

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

test('one recipe shopping ignores planning range, slot status, and fixed breakfast', () => {
  const data = fixture();
  data.recipes[0].baseServings = 2;
  data.recipes[0].ingredients = [ingredient('玉ねぎ', 100, 'g', '生'), ingredient('水', 100, 'ml')];
  data.recipes[1].ingredients = [ingredient('鶏肉', 150, 'g', '生')];
  const state = createDefaultState(data, TODAY);
  state.servings = 3;
  state.breakfast = 'toast';
  for (const mode of ['hold', 'eatout']) {
    state.slots[0].mode = mode;
    const rows = aggregateShopping(data, state, 20, 30, 'dish-1');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, '玉ねぎ');
    assert.equal(rows[0].quantity, 150);
    assert.deepEqual(rows[0].recipeIds, ['dish-1']);
    assert.deepEqual(aggregateShopping(data, state, null, null, 'dish-1'), rows);
  }
  assert.equal(shoppingPeriod(state, 1, 1, 'dish-1'), shoppingPeriod(state, 20, 30, 'dish-1'));
});

test('recipe ingredient keys combine compatible duplicates and isolate optional quantities and preparation states', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('しょうゆ', 1, '大さじ'), ingredient('しょうゆ', 2, '小さじ'), ingredient('ご飯', 150, 'g', '炊飯済み'), ingredient('ご飯', 75, 'g', '生米'), ingredient('塩', 1, 'g'), ingredient('塩', null, 'g')];
  const state = createDefaultState(data, TODAY);
  const rows = aggregateShopping(data, state, 1, 1, 'dish-1');
  const sauce = rows.find(row => row.name === 'しょうゆ');
  assert.equal(sauce.quantity, 25);
  assert.equal(sauce.key, recipeShoppingKey(data.recipes[0].ingredients[0], 'dish-1'));
  assert.equal(sauce.key, recipeShoppingKey(data.recipes[0].ingredients[1], 'dish-1'));
  assert.equal(rows.filter(row => row.name === '塩').length, 2);
  assert.equal(rows.filter(row => row.name === 'ご飯').length, 2);
  assert.equal(recipeShoppingKey(ingredient('水', 100, 'ml'), 'dish-1'), null);
  assert.equal(recipeShoppingKey(ingredient('にんじん', 0.1, 'kg'), 'dish-1'), recipeShoppingKey(ingredient('にんじん', 100, 'g'), 'dish-1'));
});

test('a recipe purchase check cannot mark another recipe or the monthly shopping list as bought', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('卵', 1, '個')];
  data.recipes[1].ingredients = [ingredient('卵', 1, '個')];
  const state = createDefaultState(data, TODAY);
  const first = aggregateShopping(data, state, 1, 1, 'dish-1')[0];
  const second = aggregateShopping(data, state, 1, 1, 'dish-2')[0];
  const periodRow = aggregateShopping(data, state, 1, 1)[0];
  assert.equal(new Set([first.key, second.key, periodRow.key]).size, 3);
  state.shoppingChecks[first.key] = { kind: 'bought', quantity: first.quantity, period: shoppingPeriod(state, 1, 1, 'dish-1') };
  assert.equal(aggregateShopping(data, state, 1, 1, 'dish-2')[0].check, null);
  assert.equal(aggregateShopping(data, state, 1, 1)[0].check, null);
  state.shoppingChecks[second.key] = { kind: 'pantry', quantity: second.quantity, period: shoppingPeriod(state, 1, 1, 'dish-2') };
  state.shoppingChecks[periodRow.key] = { kind: 'bought', quantity: periodRow.quantity, period: shoppingPeriod(state, 1, 1) };
  const restored = validateState(JSON.parse(JSON.stringify(state)), data);
  assert.equal(aggregateShopping(data, restored, 1, 1, 'dish-1')[0].check, 'bought');
  assert.equal(aggregateShopping(data, restored, 1, 1, 'dish-2')[0].check, 'pantry');
  assert.equal(aggregateShopping(data, restored, 1, 1)[0].check, 'bought');
});

test('recipe checks require reconfirmation when quantities increase or the plan start date changes', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('玉ねぎ', 50, 'g', '生')];
  const state = createDefaultState(data, TODAY);
  const row = aggregateShopping(data, state, 1, 1, 'dish-1')[0];
  state.shoppingChecks[row.key] = { kind: 'pantry', quantity: 50, period: shoppingPeriod(state, 1, 1, 'dish-1') };
  state.servings = 2;
  assert.equal(aggregateShopping(data, state, 1, 1, 'dish-1')[0].needsReview, true);
  assert.equal(aggregateShopping(data, state, 1, 1, 'dish-1')[0].check, null);
  state.servings = 1;
  assert.equal(aggregateShopping(data, state, 1, 1, 'dish-1')[0].check, 'pantry');
  state.startDate = '2026-10-18';
  assert.equal(aggregateShopping(data, state, 1, 1, 'dish-1')[0].check, null);
  assert.equal(aggregateShopping(data, state, 1, 1, 'dish-1')[0].needsReview, true);
});

test('recipe checks survive storage alongside old schema-1 checks and reject unknown or mismatched recipe IDs', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('卵', 1, '個')];
  const state = createDefaultState(data, TODAY);
  const row = aggregateShopping(data, state, 1, 1, 'dish-1')[0];
  state.shoppingChecks[row.key] = { kind: 'bought', quantity: 1, period: shoppingPeriod(state, 1, 1, 'dish-1') };
  state.shoppingChecks.legacy = { kind: 'pantry', quantity: null };
  const storage = storageFixture();
  const key = storageKey('/cooking60/');
  assert.equal(saveState(storage, key, state).ok, true);
  assert.deepEqual(loadState(storage, key, data, TODAY).state, state);
  for (const invalidId of ['missing', '__proto__', null, 1]) {
    const candidate = structuredClone(state);
    candidate.shoppingChecks[row.key].period = JSON.stringify([TODAY, 'recipe', invalidId]);
    assert.throws(() => validateState(candidate, data));
  }
  for (const invalidPeriod of [JSON.stringify(['2026-02-30', 'recipe', 'dish-1']), JSON.stringify([TODAY, 'recipe', 'dish-2']), shoppingPeriod(state, 1, 1)]) {
    const candidate = structuredClone(state);
    candidate.shoppingChecks[row.key].period = invalidPeriod;
    assert.throws(() => validateState(candidate, data));
  }
  const unknownKey = structuredClone(state);
  unknownKey.shoppingChecks[recipeShoppingKey(data.recipes[0].ingredients[0], 'missing')] = unknownKey.shoppingChecks[row.key];
  assert.throws(() => validateState(unknownKey, data));
  assert.throws(() => aggregateShopping(data, state, 1, 1, 'missing'));
  assert.throws(() => shoppingPeriod(state, 1, 1, 'missing'));
  assert.throws(() => recipeShoppingKey(data.recipes[0].ingredients[0], '__proto__'));
});

test('all twelve basic staples apply across recipe and period lists, including optional amounts', () => {
  const data = fixture();
  assert.deepEqual(PANTRY_BASICS.map(item => item.name).sort(), ['しょうゆ', 'サラダ油', '塩', '砂糖', 'こしょう', 'ケチャップ', '酒', '片栗粉', 'みりん', 'ごま油', 'みそ', '酢'].sort());
  for (const item of PANTRY_BASICS) assert.equal(item.state, item.name === '片栗粉' ? '乾燥' : '製品');
  data.recipes[0].ingredients = PANTRY_BASICS.map(item => ingredient(item.name, 1, 'g', item.state));
  data.recipes[1].ingredients = PANTRY_BASICS.map(item => ingredient(item.name, null, '適量', item.state));
  data.recipes[2].ingredients = PANTRY_BASICS.map(item => ingredient(item.name, 2, 'g', item.state));
  const original = createDefaultState(data, TODAY);
  const state = PANTRY_BASICS.reduce((next, item) => setPantryBasic(next, item.name, true), original);
  for (const [from, to, recipeId] of [[1, 1, 'dish-1'], [1, 1, 'dish-2'], [1, 1, null], [2, 2, null]]) {
    const rows = aggregateShopping(data, state, from, to, recipeId);
    assert.ok(rows.length >= 12);
    assert.ok(rows.every(row => row.check === 'pantry' && row.checkSource === 'basic' && row.basicPantry && !row.needsReview));
  }
  assert.deepEqual(original.pantryBasics, {});
  assert.deepEqual(state.shoppingChecks, {}, 'Inherited checks do not create local purchase records.');
  assert.deepEqual(validateState(state, data), state);
});

test('shared basics require exact names and preparation states and can be turned off', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('塩', 1, 'g', '製品'), ingredient('塩', 1, 'g', '生'), ingredient('塩こしょう', 1, 'g', '製品'), ingredient('片栗粉', 5, 'g', '乾燥'), ingredient('片栗粉', 5, 'g', '製品'), ingredient('卵', 1, '個', '生')];
  let state = setPantryBasic(setPantryBasic(createDefaultState(data, TODAY), '塩', true), '片栗粉', true);
  let rows = aggregateShopping(data, state, 1, 1);
  assert.equal(rows.filter(row => row.check === 'pantry').length, 2);
  assert.ok(rows.filter(row => row.check === null).every(row => !row.basicPantry && row.checkSource === null));
  state = setPantryBasic(state, '塩', false);
  rows = aggregateShopping(data, state, 1, 1);
  assert.ok(rows.filter(row => row.name === '塩').every(row => row.check === null));
  assert.equal(rows.find(row => row.name === '片栗粉' && row.state === '乾燥').check, 'pantry');
  assert.deepEqual(state.pantryBasics, { 片栗粉: true });
});

test('local bought and pantry checks take priority and survive changing the shared basic set', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('しょうゆ', 15, 'ml', '製品'), ingredient('塩', null, '適量', '製品')];
  let state = setPantryBasic(setPantryBasic(createDefaultState(data, TODAY), 'しょうゆ', true), '塩', true);
  const period = shoppingPeriod(state, 1, 1, 'dish-1');
  for (const row of aggregateShopping(data, state, 1, 1, 'dish-1')) state = setShoppingCheck(state, row, row.name === '塩' ? 'pantry' : 'bought', true, period);
  for (const name of ['しょうゆ', '塩']) state = setPantryBasic(state, name, false);
  const rows = aggregateShopping(data, state, 1, 1, 'dish-1');
  assert.equal(rows.find(row => row.name === 'しょうゆ').check, 'bought');
  assert.equal(rows.find(row => row.name === '塩').check, 'pantry');
  assert.ok(rows.every(row => row.checkSource === 'local' && !row.basicPantry));
});

test('a shared staple can be needed for one recipe while other lists inherit it', () => {
  const data = fixture();
  for (const recipe of data.recipes.slice(0, 2)) recipe.ingredients = [ingredient('しょうゆ', 15, 'ml', '製品')];
  let state = setPantryBasic(createDefaultState(data, TODAY), 'しょうゆ', true);
  const first = aggregateShopping(data, state, 1, 1, 'dish-1')[0];
  const period = shoppingPeriod(state, 1, 1, 'dish-1');
  state = setShoppingCheck(state, first, 'pantry', false, period);
  assert.equal(state.shoppingChecks[first.key].kind, 'needed');
  let row = aggregateShopping(data, state, 1, 1, 'dish-1')[0];
  assert.equal(row.check, null);
  assert.equal(row.checkSource, 'override');
  assert.equal(row.needsReview, false);
  assert.equal(aggregateShopping(data, state, 1, 1, 'dish-2')[0].checkSource, 'basic');
  assert.equal(aggregateShopping(data, state, 1, 1)[0].checkSource, 'basic');
  state.servings = 4;
  row = aggregateShopping(data, state, 1, 1, 'dish-1')[0];
  assert.equal(row.checkSource, 'override');
  assert.equal(row.quantity, 60);
  assert.deepEqual(reconcileChecks(state, [row]).shoppingChecks, state.shoppingChecks);
  const restored = validateState(JSON.parse(JSON.stringify(state)), data);
  assert.equal(aggregateShopping(data, restored, 1, 1, 'dish-1')[0].checkSource, 'override');
  state.startDate = '2026-10-18';
  row = aggregateShopping(data, state, 1, 1, 'dish-1')[0];
  assert.equal(row.checkSource, 'basic', 'A needed override is limited to its dated list.');
  assert.equal(row.needsReview, false);
  assert.equal(state.pantryBasics['しょうゆ'], true);
});

test('resetting a list removes local checks and overrides shared basics only in that list', () => {
  const data = fixture();
  for (const recipe of data.recipes.slice(0, 2)) recipe.ingredients = [ingredient('塩', null, '適量', '製品'), ingredient('卵', 1, '個', '生')];
  let state = setPantryBasic(createDefaultState(data, TODAY), '塩', true);
  for (const recipeId of ['dish-1', 'dish-2']) {
    const egg = aggregateShopping(data, state, 1, 1, recipeId).find(row => row.name === '卵');
    state = setShoppingCheck(state, egg, 'bought', true, shoppingPeriod(state, 1, 1, recipeId));
  }
  const original = structuredClone(state);
  const rows = aggregateShopping(data, state, 1, 1, 'dish-1');
  const next = resetShoppingChecks(state, rows, shoppingPeriod(state, 1, 1, 'dish-1'));
  assert.ok(aggregateShopping(data, next, 1, 1, 'dish-1').every(row => row.check === null));
  const otherRows = aggregateShopping(data, next, 1, 1, 'dish-2');
  assert.equal(otherRows.find(row => row.name === '卵').check, 'bought');
  assert.equal(otherRows.find(row => row.name === '塩').checkSource, 'basic');
  assert.deepEqual(next.pantryBasics, { 塩: true });
  assert.deepEqual(state, original, 'Reset never mutates the previous state.');
  const uncheckedEgg = setShoppingCheck(state, rows.find(row => row.name === '卵'), 'bought', false, shoppingPeriod(state, 1, 1, 'dish-1'));
  assert.equal(uncheckedEgg.shoppingChecks[rows.find(row => row.name === '卵').key], undefined);
});

test('a stale local amount or period remains visible for reconfirmation despite shared stock', () => {
  const data = fixture();
  data.recipes[0].ingredients = [ingredient('しょうゆ', 15, 'ml', '製品')];
  let state = setPantryBasic(createDefaultState(data, TODAY), 'しょうゆ', true);
  const row = aggregateShopping(data, state, 1, 1)[0];
  state = setShoppingCheck(state, row, 'bought', true, shoppingPeriod(state, 1, 1));
  for (const update of [next => { next.servings = 2; }, next => { next.startDate = '2026-10-18'; }]) {
    const changed = structuredClone(state);
    update(changed);
    const stale = aggregateShopping(data, changed, 1, 1)[0];
    assert.equal(stale.basicPantry, true);
    assert.equal(stale.needsReview, true);
    assert.equal(stale.check, null);
    assert.equal(stale.checkSource, null);
  }
  assert.equal(aggregateShopping(data, state, 1, 2)[0].needsReview, true);
});

test('schema-1 backups without basics preserve personal records and new basics survive storage', () => {
  const data = fixture();
  let state = recordCook(createDefaultState(data, TODAY), 'dish-1', TODAY);
  state.extraItems = [{ id: 'remember', name: '買い足すもの', done: true }];
  state.shoppingChecks.legacy = { kind: 'pantry', quantity: null };
  delete state.pantryBasics;
  const original = structuredClone(state);
  const normalized = validateState(state, data);
  assert.deepEqual(normalized.pantryBasics, {});
  assert.deepEqual(normalized.progress, state.progress);
  assert.deepEqual(normalized.extraItems, state.extraItems);
  assert.deepEqual(normalized.shoppingChecks, state.shoppingChecks);
  assert.deepEqual(state, original);
  state = setPantryBasic(normalized, 'みそ', true);
  const storage = storageFixture();
  const key = storageKey('/cooking60/');
  assert.equal(saveState(storage, key, state).ok, true);
  assert.deepEqual(loadState(storage, key, data, TODAY).state, state);
  assert.deepEqual(validateState({ ...state, pantryBasics: { みそ: true, 塩: false } }, data).pantryBasics, { みそ: true });
});

test('invalid basic sets and purchase overrides are rejected without replacing saved data', () => {
  const data = fixture();
  const state = createDefaultState(data, TODAY);
  for (const pantryBasics of [null, [], true, { 卵: true }, { 塩: 'true' }, { 塩: 1 }, { 塩: null }, JSON.parse('{"__proto__":true}')]) {
    assert.throws(() => validateState({ ...state, pantryBasics }, data));
  }
  for (const [name, checked] of [['卵', true], ['塩', 'true'], ['__proto__', true]]) assert.throws(() => setPantryBasic(state, name, checked));
  for (const check of [{ kind: 'unknown', quantity: 1 }, { kind: 'needed', quantity: 1 }, { kind: 'needed', quantity: -1, period: shoppingPeriod(state, 1, 1) }]) {
    assert.throws(() => validateState({ ...state, shoppingChecks: { row: check } }, data));
  }
  const key = storageKey('/cooking60/');
  const malformed = JSON.stringify({ ...state, pantryBasics: { 未知の品: true } });
  const storage = storageFixture({ [key]: malformed });
  assert.equal(loadState(storage, key, data, TODAY).persistent, false);
  assert.equal(storage.getItem(key), malformed);
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
