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

const iconPaths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 plan:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h2m4 0h2m-8 3h2"/>',
 recipes:'<path d="M12 5v16m0-16C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>',
 shopping:'<path d="M5 7h14l2 14H3L5 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
 progress:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 rice:'<path d="M3 11h18c0 6-4 9-9 9s-9-3-9-9ZM8 21h8M7 7V4m5 3V2m5 5V4"/>',
 noodles:'<path d="M3 12h18c-1 6-4 8-9 8s-8-2-9-8Zm5 9h8M15 3 4 9m15-5L7 10m8-3v5m3-6v6"/>',
 bread:'<path d="M6 9a4 4 0 0 1 0-8h12a4 4 0 0 1 0 8v12H6V9Z" transform="translate(0 1) scale(1 .9)"/><path d="M10 9v4m4-4v4"/>',
 plate:'<circle cx="13" cy="12" r="8"/><circle cx="13" cy="12" r="4"/><path d="M1 3v6m2-6v6M1 7h2M2 9v12"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 print:'<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7Z"/>',
 play:'<path d="m8 4 13 8-13 8V4Z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};
export function icon(name){return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(iconPaths[name]||iconPaths.plate)+'</svg>';}

export function recipeImage(r,root='',detail=false,compact=false){
 const path=root+'assets/recipes/'+r.id;
 const sizes=detail?'(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 50vw, 640px':compact?'(max-width: 700px) calc((100vw - 52px) / 2), (max-width: 1000px) 46vw, 380px':'(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 46vw, 600px';
 return '<img src="'+esc(path+'.webp')+'" srcset="'+esc(path+'-480.webp')+' 480w, '+esc(path+'.webp')+' 960w" sizes="'+sizes+'" width="960" height="640" alt="'+esc(r.title)+'の完成イメージ（AI生成）" loading="'+(detail?'eager':'lazy')+'" decoding="async"'+(detail?' fetchpriority="high"':'')+'>';
}

export function card(r,root='',p,compact=false){
 const type=({'ご飯':'rice','麺':'noodles','パン':'bread','定食':'plate'})[r.mealForm];
 return '<article class="recipe-card"><div class="card-photo">'+recipeImage(r,root,false,compact)+'<span class="image-label">AI生成イメージ</span></div><div class="card-content"><div class="card-top"><span class="dish-mark">'+icon(type)+'</span><span class="card-category">'+esc(r.mealForm)+' · '+esc(r.difficulty)+'</span><span class="recipe-number">'+esc(r.id.slice(-2))+'</span></div><h3><a href="'+esc(root+'recipes/'+r.id+'/')+'">'+esc(r.title)+'</a></h3><p class="skill">'+esc(r.skill)+'</p><div class="card-bottom"><span class="time">'+icon('clock')+'目安 <strong>'+r.estimatedTotalMinutes+'</strong>分</span><span class="status">'+esc(status(p))+'</span></div>'+(r.readyRiceAssumed?'<p class="card-note">炊飯済みご飯を使用</p>':'')+'</div></article>';
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
 return '<nav class="breadcrumb no-print" aria-label="パンくず"><a href="../">60品のレシピ</a><span aria-hidden="true">/</span><span>'+esc(r.title)+'</span></nav><div class="recipe-intro"><div class="recipe-summary"><div class="recipe-heading"><div><p class="eyebrow">THE RECIPE COLLECTION <span>'+esc(r.mealForm)+'</span></p><h1>'+esc(r.title)+'</h1><p class="lead">'+esc(r.skill)+'を覚える一品。</p></div><span class="recipe-index" aria-hidden="true">'+esc(r.id.slice(-2))+'</span></div><div class="recipe-metrics"><div><span>総時間の目安</span><strong>'+r.estimatedTotalMinutes+'<small>分</small></strong></div><div><span>実作業の目安</span><strong>'+r.estimatedActiveMinutes+'<small>分</small></strong></div><div><span>難易度</span><strong class="metric-level">'+esc(r.difficulty)+'</strong></div></div><a class="recipe-jump no-print" href="#ingredients">材料・作り方を見る ↓</a></div><figure class="recipe-visual">'+recipeImage(r,'../../',true)+'<figcaption>完成イメージ（AI生成）。実際の調理写真ではありません。</figcaption></figure></div>'+
 '<div class="recipe-context"><details class="recipe-disclosure"><summary><span class="draft-dot" aria-hidden="true"></span><strong>未試作のレシピ草稿</strong><span>分量・時間は目安です</span></summary><p>表示時間は1人分を作る場合で、分けて調理する時間は追加でかかります。材料と工程内の分量は選んだ人数に合わせています。人数を増やす場合は器具の容量に合わせて分けて調理し、加熱時間は火の通りを見て調整してください。温度・厚さ・加熱時間は自動換算しません。</p></details>'+(r.sourceReview?.status==='reviewed'?'<p class="review-status"><a href="#source-review">材料・手順を公開情報と照合しました '+icon('arrow')+'</a><span>'+esc(r.sourceReview.checkedAt)+' · 実調理は未実施</span></p>':'')+'</div>'+
 '<div class="toolbar recipe-toolbar no-print"><label>人数 <select id="servings" data-action="servings">'+[1,2,3,4].map(n=>'<option value="'+n+'"'+(n===servings?' selected':'')+'>'+n+'人分</option>').join('')+'</select></label><button data-action="cook-mode" class="primary">'+icon('play')+'調理表示にする</button><button data-action="print">'+icon('print')+'印刷</button><a class="button quiet" href="#record">作った記録へ '+icon('arrow')+'</a></div><p class="prep-note">'+text(r.prepNote)+'</p>'+
 '<div class="recipe-layout"><section id="ingredients" class="ingredients"><h2>材料 <small>'+servings+'人分</small></h2><ul class="ingredient-list">'+ingredients+'</ul><p class="fine">端数の卵などは必要量に合わせて取り分けます。加熱は中心まで確認してください。</p><h3>使う道具</h3><p>'+r.equipment.map(text).join('・')+'</p></section>'+
 '<section id="steps"><div class="section-heading"><h2>作り方</h2><a href="#ingredients" class="no-print">材料を見る ↑</a></div><ol class="steps">'+steps+'</ol><section class="inset"><h3>上手に作るコツ</h3><ul>'+r.tips.map(x=>'<li>'+text(x)+'</li>').join('')+'</ul></section><details><summary>代用のヒントと食品の取り扱い</summary><ul>'+[...r.substitutions,...r.safetyNotes].map(x=>'<li>'+text(x)+'</li>').join('')+'</ul></details></section></div>'+
 '<section id="record" class="record-panel no-print"><h2>作った記録</h2><div id="recipe-record"><p>記録機能はJavaScriptを有効にしてお使いください。記録はこのブラウザに保存されます。</p></div></section>'+reviewBody(r);
}
