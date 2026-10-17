import test from 'node:test';
import assert from 'node:assert/strict';
import { readPublicData, validateData } from '../scripts/validate.mjs';
import { aggregateShopping, createDefaultState, validateState } from '../src/core.mjs';

const data = await readPublicData();

test('the actual public data passes the preview gate with all 60 distinct meals', () => {
  const result = validateData(data);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.stats.recipeCount, 60);
  assert.equal(result.stats.dayCount, 30);
  assert.equal(result.stats.sourceReviewedCount, 60);
  assert.equal(result.stats.estimatedWithin30, data.recipes.filter(recipe => recipe.estimatedTotalMinutes <= 30).length, 'Estimated durations are counted from the reviewed content, never forced to meet a target.');
});

test('all 30 days use each public recipe exactly once and round-trip through state validation', () => {
  const state = createDefaultState(data, '2026-10-17');
  assert.equal(state.slots.length, 60);
  assert.equal(new Set(state.slots.map(slot => slot.recipeId)).size, 60);
  assert.deepEqual(validateState(state, data), state);
  assert.deepEqual(data.days.map(day => day.day).sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual(state.slots.map(slot => slot.recipeId).sort(), data.recipes.map(recipe => recipe.id).sort());
});

test('every set meal includes its rice in the shopping quantities and prepared-rice assumptions are explicit', () => {
  for (const recipe of data.recipes.filter(recipe => recipe.mealForm === '定食' || recipe.readyRiceAssumed)) {
    const rice = recipe.ingredients.find(item => item.name === 'ご飯' && item.state === '炊飯済み');
    assert.ok(rice?.quantity > 0, `${recipe.id} includes rice in the complete meal`);
    assert.match(recipe.prepNote, /炊飯済み|炊いた|炊いて|炊きたて/);
  }
  const state = createDefaultState(data, '2026-10-17');
  const rows = aggregateShopping(data, state, 1, 30);
  const riceRow = rows.find(row => row.name === 'ご飯' && row.state === '炊飯済み' && row.unit === 'g');
  const expectedRice = data.recipes.flatMap(recipe => recipe.ingredients).filter(item => item.name === 'ご飯' && item.state === '炊飯済み' && item.unit === 'g').reduce((total, item) => total + item.quantity, 0);
  assert.equal(riceRow.quantity, expectedRice);
});

test('all current recipes remain explicitly untested and the release gate prevents false verification claims', () => {
  assert.ok(data.recipes.every(recipe => recipe.validation.status === 'untested'));
  const result = validateData(data, { release: true });
  assert.equal(result.ok, false);
  assert.equal(result.stats.verifiedCount, 0);
  assert.equal(result.stats.measuredWithin30, 0);
  assert.equal(result.stats.sourceReviewedCount, 60, 'A public-source comparison does not count as an actual cooking trial.');
  assert.ok(result.errors.some(error => error.includes('全60品に実調理')));
  assert.ok(result.errors.some(error => error.includes('48品で実測')));
});

test('a verified flag alone cannot turn untested estimates into a release', () => {
  const changed = structuredClone(data);
  for (const recipe of changed.recipes) recipe.validation = { status: 'verified', note: '確認済みという宣言だけ' };
  const result = validateData(changed, { release: true });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes('実調理した日付')));
  assert.ok(result.errors.some(error => error.includes('実測総時間measuredTotalMinutes')));
  assert.equal(result.stats.measuredWithin30, 0);
});

test('the release gate uses measured durations and refuses a measured 30-minute shortfall', () => {
  const changed = structuredClone(data);
  for (const [index, recipe] of changed.recipes.entries()) recipe.validation = { status: 'verified', testedOn: '2026-10-17', measuredTotalMinutes: index < 48 ? 30 : 40, note: 'TEST FIXTURE ONLY: simulated cooking record, never published.' };
  assert.equal(validateData(changed, { release: true }).ok, true);
  changed.recipes[47].validation.measuredTotalMinutes = 31;
  const failed = validateData(changed, { release: true });
  assert.equal(failed.ok, false);
  assert.equal(failed.stats.measuredWithin30, 47);
});

test('public content validation catches missing rice, duplicate menus, unsafe URLs, invalid quantities, and missing rights', () => {
  const cases = [
    changed => { const recipe = changed.recipes.find(recipe => recipe.mealForm === '定食'); recipe.ingredients = recipe.ingredients.filter(item => item.name !== 'ご飯'); },
    changed => { changed.days[0].lunchRecipeId = changed.days[0].dinnerRecipeId; },
    changed => { changed.recipes[0].sources[0].url = 'javascript:alert(1)'; },
    changed => { changed.recipes[0].sources[0].url = 'https://user:secret@example.com/'; },
    changed => { changed.recipes[0].ingredients[0].quantity = -1; },
    changed => { changed.recipes[0].rights.license = 'unknown'; },
    changed => { changed.recipes[0].validation = { status: 'untested', note: '公開版です' }; },
    changed => { changed.recipes[0].prepNote = '/Users/private-user/secrets.json'; },
    changed => { delete changed.recipes[0].sourceReview; },
    changed => { changed.recipes[0].sourceReview.sourceUrls = ['https://example.com/unlinked-reference']; },
    changed => { changed.recipes[0].sources.find(source => source.purpose === 'recipe-comparison').checkedAt = '2026-02-30'; },
  ];
  for (const change of cases) {
    const changed = structuredClone(data);
    change(changed);
    assert.equal(validateData(changed).ok, false);
  }
  assert.equal(validateData(data).ok, true, 'Checks do not mutate the actual public data.');
});
