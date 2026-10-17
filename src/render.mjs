export const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function qty(n){return n===null?'適量':Number(n.toFixed(2)).toLocaleString('ja-JP');}
export function status(p){return p?.mastered?'再現できる':p?.practice?'もう一度練習':p?.dates?.length?'作った':'未着手';}

/** Scale only explicitly reviewed quantity phrases, never arbitrary numbers. */
export function scaleText(value, recipe, servings = 1) {
 const text = String(value ?? '');
 const entries = recipe.scales ?? [];
 if (!entries.length) return text;
 const factor = servings / (recipe.baseServings ?? 1);
 const mappings = new Map(entries.map(entry => [entry.text, entry]));
 const pattern = [...mappings.keys()].sort((a,b) => b.length-a.length)
  .map(token => token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 // A single replacement pass prevents a converted amount matching another rule.
 return text.replace(new RegExp('(?<![\\d.])(?:'+pattern+')','g'), token => {
  const item = mappings.get(token);
  return (item.prefix ?? '') + qty(item.quantity * factor) + item.unit;
 });
}

export function card(r,root='',p){
 const glyph=({'ご飯':'米','麺':'麺','パン':'麦','定食':'菜'})[r.mealForm]||'食';
 return '<article class="recipe-card"><div class="card-top"><span class="dish-mark mark-'+esc(r.mealForm)+'" aria-hidden="true">'+glyph+'</span><span class="time">目安 '+r.estimatedTotalMinutes+'分</span></div><p class="eyebrow">'+esc(r.mealForm)+' · '+esc(r.difficulty)+'</p><h3><a href="'+esc(root+'recipes/'+r.id+'/')+'">'+esc(r.title)+'</a></h3><p class="skill">'+esc(r.skill)+'</p><div class="card-bottom"><span class="status">'+esc(status(p))+'</span>'+(r.readyRiceAssumed?'<span class="fine">炊飯済みご飯を使用</span>':'')+'</div></article>';
}

export function reviewBody(r) {
 const review=r.sourceReview;
 const checked=review?.status==='reviewed';
 const recipeSources=r.sources.filter(s=>s.purpose==='recipe-comparison');
 const safetySources=r.sources.filter(s=>s.purpose!=='recipe-comparison');
 const links=sources=>'<ul>'+sources.map(s=>'<li><a href="'+esc(s.url)+'" rel="noreferrer">'+esc(s.label)+'</a></li>').join('')+'</ul>';
 return '<section id="source-review" class="source-note"><h2>このレシピの確認範囲</h2><p>一般的な家庭料理をもとに独自に編集した草稿です。第三者の文章・写真は転載していません。</p>'+
 (checked?'<p><strong>公開情報との照合：'+esc(review.checkedAt)+'</strong>。材料の比率と作り方を参考資料と比較して見直しました。実際の調理、味、加熱結果、所要時間は未検証です。</p><details><summary>今回の確認・修正内容</summary><p>ここにある分量・時間は、基本の1人分の見直し記録です。</p><ul>'+[...review.checks,...review.changes].map(note=>'<li>'+esc(note)+'</li>').join('')+'</ul></details>':'<p>公開情報との個別照合は未記録です。</p>')+
 (recipeSources.length?'<h3>材料・手順の照合先</h3>'+links(recipeSources):'')+
 '<h3>食品の取り扱いの参考</h3>'+links(safetySources)+'<p>参照先の分量・人数・器具・調味料はこのレシピと異なる場合があります。リンクは試作済みの認定や、第三者の文章・写真の利用許諾を意味しません。</p></section>';
}

export function recipeBody(r,servings=1){
 const text = value => esc(scaleText(value,r,servings));
 const multiplier = servings / (r.baseServings ?? 1);
 const ingredients = r.ingredients.map(i => '<li><span>'+esc(i.name)+(i.note?'<small>'+text(i.note)+'</small>':'')+'</span><strong>'+qty(i.quantity===null?null:i.quantity*multiplier)+(i.quantity===null?'':esc(i.unit))+'</strong></li>').join('');
 const steps = r.steps.map((s,i)=>'<li><label class="step-check"><input type="checkbox" data-step="'+i+'"><span class="step-number">'+String(i+1).padStart(2,'0')+'</span><span><strong>'+text(s.instruction)+'</strong><span class="step-meta">'+esc(s.heat||'')+(s.durationMinutes?' · 目安'+s.durationMinutes+'分':'')+'</span><span class="cue">目印：'+text(s.cue)+'</span></span></label></li>').join('');
 return '<div class="recipe-heading"><p class="eyebrow">RECIPE '+esc(r.id.slice(-2))+' · '+esc(r.mealForm)+'</p><h1>'+esc(r.title)+'</h1><p class="lead">'+esc(r.skill)+'を覚える一品。</p><div class="tags"><span>総時間 目安'+r.estimatedTotalMinutes+'分</span><span>実作業 目安'+r.estimatedActiveMinutes+'分</span><span>'+esc(r.difficulty)+'</span></div></div>'+
 '<div class="notice"><strong>未試作のレシピ草稿</strong> 分量・調理時間は未実測の目安です。表示時間は1人分を作る場合で、分けて調理する時間は追加でかかります。材料と工程内の分量は選んだ人数に合わせています。人数を増やす場合は器具の容量に合わせて分けて調理し、加熱時間は火の通りを見て調整してください。温度・厚さ・加熱時間は自動換算しません。</div>'+(r.sourceReview?.status==='reviewed'?'<p class="review-status"><a href="#source-review">材料・手順を公開情報と照合しました</a> · '+esc(r.sourceReview.checkedAt)+' · 実調理は未実施</p>':'')+'<p>'+text(r.prepNote)+'</p>'+
 '<div class="toolbar no-print"><label>人数 <select id="servings" data-action="servings">'+[1,2,3,4].map(n=>'<option value="'+n+'"'+(n===servings?' selected':'')+'>'+n+'人分</option>').join('')+'</select></label><button data-action="cook-mode" class="primary">調理表示にする</button><button data-action="print">印刷</button><a class="button quiet" href="#record">作った記録へ</a></div>'+
 '<div class="recipe-layout"><section id="ingredients" class="ingredients"><h2>材料 <small>'+servings+'人分</small></h2><ul class="ingredient-list">'+ingredients+'</ul><p class="fine">端数の卵などは必要量に合わせて取り分けます。加熱は中心まで確認してください。</p><h3>使う道具</h3><p>'+r.equipment.map(text).join('・')+'</p></section>'+
 '<section id="steps"><div class="section-heading"><h2>作り方</h2><a href="#ingredients" class="no-print">材料を見る ↑</a></div><ol class="steps">'+steps+'</ol><section class="inset"><h3>上手に作るコツ</h3><ul>'+r.tips.map(x=>'<li>'+text(x)+'</li>').join('')+'</ul></section><details><summary>代用のヒントと食品の取り扱い</summary><ul>'+[...r.substitutions,...r.safetyNotes].map(x=>'<li>'+text(x)+'</li>').join('')+'</ul></details></section></div>'+
 '<section id="record" class="record-panel no-print"><h2>作った記録</h2><div id="recipe-record"><p>記録機能はJavaScriptを有効にしてお使いください。記録はこのブラウザに保存されます。</p></div></section>'+reviewBody(r);
}
