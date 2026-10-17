import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recipeBody, scaleText } from '../src/render.mjs';

const read = part => JSON.parse(readFileSync(new URL('../data/public/recipes-'+part+'.json',import.meta.url),'utf8'));
const recipes = [...read('lunch'),...read('dinner')];
const recipe = id => recipes.find(r=>r.id===id);
const prose = r => [r.prepNote,...r.ingredients.map(i=>i.note),...r.steps.flatMap(s=>[s.instruction,s.cue]),...r.tips,...r.substitutions,...r.equipment,...r.safetyNotes];

test('Tianjin rice scales water allocation with ingredients for one through four servings',()=>{
 const r=recipe('dish-19');
 for(const servings of [1,2,3,4]){
  const html=recipeBody(r,servings);
  assert.ok(html.includes('<strong>'+150*servings+'ml</strong>'));
  assert.ok(html.includes('小鍋に水'+140*servings+'ml'));
  assert.ok(html.includes('片栗粉を水'+10*servings+'mlで溶く'));
 }
 assert.ok(recipeBody(r,4).includes('卵液と油を人数分に分け、1人分ずつ焼く'));
});

test('recipe-specific scaling never multiplies heat, time, thickness or bread slice grade',()=>{
 const r=recipe('dish-24'),html=recipeBody(r,4);
 assert.ok(html.includes('8等分して空気を抜き、厚さ1.5cm'));
 assert.ok(html.includes('8個とも中心75℃以上'));
 assert.ok(html.includes('600Wで約1分半'));
 assert.ok(!html.includes('中心300℃'));
 assert.ok(recipeBody(recipe('dish-09'),4).includes('6枚切り'));
 assert.ok(recipeBody(recipe('dish-47'),4).includes('直径18cm・厚さ3mm'));
 assert.ok(recipeBody(recipe('dish-52'),4).includes('牛肉を1枚ずつ'));
 assert.ok(recipeBody(recipe('dish-58'),4).includes('1切れを2〜3等分'));
});

test('rice cooker quantity and total wrapped portions scale; individual portions stay small',()=>{
 const rice=recipeBody(recipe('dish-37'),4);
 assert.ok(rice.includes('生米300g（約2合）'));
 assert.ok(rice.includes('説明書の2合の水位'));
 assert.ok(recipeBody(recipe('dish-14'),4).includes('40等分'));
 assert.ok(recipeBody(recipe('dish-44'),4).includes('32個分'));
 assert.ok(recipeBody(recipe('dish-56'),4).includes('具を皮の枚数に合わせて等分する'));
 assert.ok(recipeBody(recipe('dish-47'),4).includes('生地を人数分に分け、1枚ずつ焼く'));
 assert.ok(recipeBody(recipe('dish-21'),4).includes('具とソースを生地の枚数に合わせて分け'));
});

test('replacements are explicit, numeric-boundary safe and single pass',()=>{
 const r={baseServings:1,scales:[{text:'5g',quantity:5,unit:'g'},{text:'20g',quantity:20,unit:'g'}]};
 assert.equal(scaleText('5g、20g、125g、1.5g、75℃、5分、1cm',r,4),'20g、80g、125g、1.5g、75℃、5分、1cm');
 assert.equal(scaleText('水10ml',{baseServings:2,scales:[{text:'10ml',quantity:10,unit:'ml'}]},4),'水20ml');
 assert.equal(scaleText('未指定の10ml',{baseServings:1},4),'未指定の10ml');
});

test('scaled prose is HTML escaped before insertion',()=>{
 const r=structuredClone(recipe('dish-19'));
 r.prepNote='<img src=x onerror=alert(1)> 水140ml';
 r.steps[0].instruction='<script>alert(1)</script> 水10ml';
 const html=recipeBody(r,4);
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt; 水560ml'));
 assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; 水40ml'));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(!html.includes('<script>'));
});

test('all 60 recipes have reviewed maps and render at every supported serving count',()=>{
 assert.equal(recipes.length,60);
 for(const r of recipes){
  assert.ok(Array.isArray(r.scales),r.id);
  const tokens=new Set(r.scales.map(s=>s.text));
  assert.equal(tokens.size,r.scales.length,r.id);
  for(const s of r.scales){
   assert.ok(Number.isFinite(s.quantity)&&s.quantity>0,r.id);
   assert.ok(['g','ml','合','個','等分','枚'].includes(s.unit),r.id);
   assert.ok(prose(r).some(t=>t.includes(s.text)),r.id+' unused '+s.text);
  }
  // Catch newly added fixed ingredient amounts unless an editor supplies a rule.
  for(const text of prose(r)){
   for(const m of text.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)(g|ml|合)/g))assert.ok(tokens.has(m[0]),r.id+' missing '+m[0]);
  }
  // These notes are also rendered in the shopping list, where amounts aggregate.
  for(const i of r.ingredients)assert.ok(!/\d+(?:\.\d+)?(?:g|ml|合)/.test(i.note),r.id+' fixed shopping note');
  for(const n of [1,2,3,4]){
   const html=recipeBody(r,n);
   assert.ok(html.includes(n+'人分</small>'),r.id);
   assert.ok(!html.includes('NaN')&&!html.includes('undefined'),r.id);
  }
 }
});
