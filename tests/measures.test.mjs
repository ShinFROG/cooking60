import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { measureHint } from '../src/measures.mjs';

const ingredient = (name, quantity, state = '生', note = '') => ({ name, quantity, state, unit: 'g', note });

test('vegetable estimates scale with the supplied grams without mutating the ingredient', () => {
  const onion = ingredient('玉ねぎ', 50);
  assert.match(measureHint(onion), /^約1\/4個/);
  assert.match(measureHint(onion, 100), /^約1\/2個/);
  assert.match(measureHint(onion, 150), /^約3\/4個/);
  assert.match(measureHint(onion, 200), /^約1個/);
  assert.equal(onion.quantity, 50);
});

test('shopping totals use familiar whole units and do not wrap at a full item', () => {
  assert.match(measureHint(ingredient('玉ねぎ', 500)), /^約2と1\/2個/);
  assert.match(measureHint(ingredient('玉ねぎ', 4000)), /^約20個/);
  assert.match(measureHint(ingredient('キャベツ', 600)), /^約1\/2玉/);
  assert.match(measureHint(ingredient('白菜', 1000)), /^約1\/2玉/);
  assert.match(measureHint(ingredient('レタス', 200)), /^約1\/2玉/);
});

test('small leafy portions stay in leaves and cabbage rolls require intact leaves', () => {
  assert.match(measureHint(ingredient('キャベツ', 50)), /^約1枚/);
  assert.match(measureHint(ingredient('白菜', 200)), /^約2枚/);
  assert.equal(measureHint(ingredient('キャベツ', 160, '生', '包める大きな葉を肉だねの個数分用意する')), '包める大きな葉を肉だねの個数分');
  assert.equal(measureHint({ ...ingredient('キャベツ', 640), notes: ['包める大きな葉を用意する'] }), '包める大きな葉を肉だねの個数分');
});

test('rice and noodles respect cooking state and the actual weight basis', () => {
  assert.match(measureHint(ingredient('米', 75)), /^約1\/2合（精白米1合150g/);
  assert.match(measureHint(ingredient('米', 80, '生', '無洗米')), /^約1\/2合（無洗米1合160g/);
  assert.equal(measureHint(ingredient('米', 150, '炊飯済み', '無洗米')), '');
  assert.match(measureHint(ingredient('ご飯', 150, '炊飯済み')), /^約1杯（茶碗1杯150g/);
  assert.equal(measureHint(ingredient('ご飯', 150, '生')), '');
  assert.match(measureHint(ingredient('うどん', 400, 'ゆで')), /^約2玉/);
  assert.equal(measureHint(ingredient('うどん', 200, '乾燥')), '');
  assert.match(measureHint(ingredient('焼きそば麺', 150, '蒸し')), /^約1玉/);
});

test('packages give their assumed size while drained cans never inherit can weight', () => {
  assert.match(measureHint(ingredient('木綿豆腐', 150, '冷蔵')), /^約1\/2丁（1丁300gの場合）$/);
  assert.match(measureHint(ingredient('もやし', 100)), /^約1\/2袋（200g入りの場合）$/);
  assert.match(measureHint(ingredient('しめじ', 50)), /^約1\/2パック（100g入りの場合）$/);
  assert.equal(measureHint(ingredient('ツナ缶', 70, '加熱済み', '液を切った量')), '');
  assert.equal(measureHint(ingredient('サバ水煮缶', 100, '加熱済み', '汁を切った魚の重さ')), '');
  assert.equal(measureHint(ingredient('豚こま切れ肉', 120)), '');
});

test('spoon weights differ by ingredient and switch from teaspoons to tablespoons', () => {
  assert.match(measureHint(ingredient('砂糖', 3, '製品')), /^小さじ約1（上白糖・小さじ1杯3g/);
  assert.match(measureHint(ingredient('砂糖', 9, '製品')), /^大さじ約1（上白糖・大さじ1杯9g/);
  assert.match(measureHint(ingredient('塩', 1, '製品')), /^小さじ約1\/6（食塩・小さじ1杯6g/);
  assert.match(measureHint(ingredient('ケチャップ', 15, '製品')), /^大さじ約1（大さじ1杯15g/);
  assert.match(measureHint(ingredient('片栗粉', 9, '乾燥')), /^大さじ約1（大さじ1杯9g/);
  assert.equal(measureHint(ingredient('塩', 0.5, '製品')), '');
  assert.equal(measureHint(ingredient('砂糖', 3, '製品', 'グラニュー糖')), '');
  assert.equal(measureHint({ ...ingredient('塩', 6, '製品'), notes: ['粗塩'] }), '');
  assert.equal(measureHint(ingredient('鶏がらスープの素', 2, '製品')), '');
});

test('length and trimmed mushroom estimates distinguish their preparation basis', () => {
  assert.match(measureHint(ingredient('大根', 200)), /^輪切り約8cm/);
  assert.match(measureHint(ingredient('ごぼう', 10)), /^約5cm/);
  assert.match(measureHint(ingredient('しいたけ', 30)), /^約2個（軸込み/);
  assert.match(measureHint(ingredient('しいたけ', 30, '生', '軸を取った量')), /^約3枚（軸なし/);
});

test('unmeasured, unsupported and invalid quantities never produce misleading zero estimates', () => {
  for (const quantity of [null, undefined, NaN, Infinity, -10, 0, '100']) {
    assert.equal(measureHint({ name: '玉ねぎ', unit: 'g', state: '生', quantity }), '');
  }
  assert.equal(measureHint({ ...ingredient('玉ねぎ', 1), unit: '個' }), '');
  assert.equal(measureHint(ingredient('玉ねぎ', 0.01)), '');
  assert.equal(measureHint(ingredient('大根', 0.01)), '');
  assert.equal(measureHint(ingredient('ごぼう', 0.01)), '');
  assert.equal(measureHint({ name: 'toString', unit: 'g', quantity: 100 }), '');
  assert.equal(measureHint(), '');
});

test('every published recipe has a useful estimate at all supported serving sizes', async () => {
  const recipes = (await Promise.all(['lunch', 'dinner'].map(async meal => JSON.parse(await readFile(new URL(`../data/public/recipes-${meal}.json`, import.meta.url), 'utf8'))))).flat();
  assert.equal(recipes.length, 60);
  for (const recipe of recipes) {
    for (const servings of [1, 2, 3, 4]) {
      const hints = recipe.ingredients.map(item => measureHint(item, item.quantity === null ? null : item.quantity * servings / recipe.baseServings));
      assert.ok(hints.some(Boolean), `${recipe.id}: ${servings} servings`);
      for (const hint of hints) assert.doesNotMatch(hint, /NaN|Infinity|undefined|約0(?:[個本枚玉杯丁]|と)/);
    }
  }
});
