import * as core from './core.mjs';
import {esc,qty,status,card,recipeBody} from './render.mjs';

const root = new URL('../', import.meta.url);
const app = document.querySelector('#app');
const page = document.body.dataset.page;
const today = () => { const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const copy = value => JSON.parse(JSON.stringify(value));
const link = path => root.pathname+path;
const message = text => { const el=document.querySelector('#toast');el.textContent=text;clearTimeout(message.timer);message.timer=setTimeout(()=>el.textContent='',5000); };
const alert = text => {const el=document.querySelector('#app-alert');el.textContent=text;el.hidden=!text;if(text&&!persistent){const button=document.createElement('button');button.textContent='今の記録をJSONで保存';button.dataset.action='export';el.append(' ',button);if(protectedRaw!==null){const original=document.createElement('button');original.textContent='保護中の保存データを取り出す';original.dataset.action='export-original';el.append(' ',original);}}};
let data,state,storage,key,persistent=true,lastSwap=null,pendingImport=null,unsaved=false,protectedRaw=null;
let planView='all',fromDay=1,toDay=7,progressFilter='all';
const filter={q:'',form:'',time:'',equipment:'',progress:''};
const byId = id => data.recipes.find(r=>r.id===id);
const dayNumber = () => Math.floor((Date.parse(today()+'T00:00:00Z')-Date.parse(state.startDate+'T00:00:00Z'))/86400000)+1;
const activeDay = () => Math.min(30,Math.max(1,dayNumber()));
const dateFor = day => {const d=new Date(state.startDate+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+day-1);return d.toISOString().slice(0,10);};
const option = (v,t,current) => '<option value="'+esc(v)+'"'+(String(v)===String(current)?' selected':'')+'>'+esc(t)+'</option>';
const servings = () => '<label>人数 <select data-action="servings">'+[1,2,3,4].map(n=>option(n,n+'人分',state.servings)).join('')+'</select></label>';
const headline = (eyebrow,title,description) => '<div class="page-heading"><p class="eyebrow">'+eyebrow+'</p><h1>'+title+'</h1><p class="lead">'+description+'</p></div>';
function commit(next,notice='',redraw=true){
  state=core.validateState(next,data);unsaved=true;
  if(persistent){const result=core.saveState(storage,key,state);if(result.ok)unsaved=false;if(!result.ok){persistent=false;alert('このブラウザに保存できません。この画面では使えます。この警告内のボタンからJSONを保存してください。ページを移動すると未保存の変更は失われます。');}}
  if(redraw)render();if(!persistent&&unsaved)alert('変更はこの画面内だけにあります。ページを移動する前にJSONで保存してください。元の保存データは上書きしていません。');if(notice)message(notice);
}
function stats(){
 const c=core.getCounts(state);
 return '<div class="overview"><div class="stat"><span>作った料理</span><strong>'+c.cooked+'<small> / 60品</small></strong></div><div class="stat"><span>再現できる</span><strong>'+c.mastered+'<small> / 60品</small></strong></div><div class="stat"><span>もう一度練習</span><strong>'+c.practice+'<small> 品</small></strong></div></div>';
}
function home(){
 const d=activeDay(),n=dayNumber();
 return '<section class="hero"><div><p class="eyebrow">30 DAYS · 60 DISHES</p><h1>毎日のごはんを、<br>自分の得意に。</h1><p class="lead">昼と夜にひとつずつ。いつもの食材で、<br>作れる料理を少しずつ増やす30日。</p><div class="toolbar"><a class="button primary" href="'+link('plan/')+'">30日の献立を見る <span aria-hidden="true">→</span></a><a href="'+link('guide/')+'">はじめての方へ</a></div><p class="fine">1〜4人分に対応 · 記録はこの端末内に保存</p></div><div class="hero-art"><img src="'+link('assets/plate.svg')+'" alt="ご飯、卵、野菜を盛り付けた食卓のイラスト" width="500" height="400"></div></section>'+stats()+'<section><div class="section-heading"><div><p class="eyebrow">YOUR NEXT MEAL</p><h2>'+(n<1?'開始日の献立':n>30?'30日目の献立':'今日の献立')+' <small>DAY '+String(d).padStart(2,'0')+'</small></h2></div><a href="'+link('plan/')+'">献立を調整する →</a></div><div class="grid two">'+state.slots.filter(s=>s.day===d).map(s=>'<div><p class="meal-status">'+(s.meal==='lunch'?'昼ごはん':'夜ごはん')+(s.mode!=='cook'?' · '+(s.mode==='hold'?'保留':'外食'):'')+'</p>'+card(byId(s.recipeId),root.pathname,state.progress[s.recipeId])+'</div>').join('')+'</div></section><section class="inset"><h2>作る前に、買うものをひとまとめ。</h2><p>献立と人数から材料を集計します。家にあるものはチェックして、必要な分だけ買い物へ。</p><a class="button quiet" href="'+link('shopping/')+'">買物リストを開く →</a></section><div class="notice"><strong>公開準備版</strong> 60品の手順は独自作成した未試作の草稿です。時間・分量は目安として掲載しています。<a href="'+link('about/')+'">内容と検証状況</a></div>';
}
function plan(){
 const start=planView==='all'?1:planView==='today'?activeDay():Number(planView);
 const end=planView==='all'?30:planView==='today'?start:Math.min(30,start+6);
 const slotOptions = state.slots.map(s=>option(s.key,'DAY '+s.day+' '+(s.meal==='lunch'?'昼':'夜')+' · '+byId(s.recipeId).title,'')).join('');
 return headline('MONTHLY PLAN','30日の献立','昼と夜で60種類。都合に合わせて順番を入れ替えられます。')+'<div class="settings no-print"><label>開始日 <input type="date" data-action="start-date" value="'+state.startDate+'" required></label>'+servings()+'<label>表示 <select data-action="plan-view">'+option('all','30日すべて',planView)+option('today','今日',planView)+[1,8,15,22,29].map(n=>option(n,'DAY '+n+'〜'+Math.min(30,n+6),planView)).join('')+'</select></label><button data-action="print">印刷</button></div><details class="no-print"><summary>献立の順番を入れ替える</summary><form id="swap-form" class="swap-form"><label>入替元 <select name="first">'+slotOptions+'</select></label><label>入替先 <select name="second">'+slotOptions+'</select></label><button class="primary">2つの料理を交換</button>'+(lastSwap?'<button type="button" data-action="undo-swap">直前の交換を戻す</button>':'')+'</form><p class="fine">料理を交換するので60種類は保たれます。保留・外食の設定はその日時の枠に残ります。</p></details>'+Array.from({length:end-start+1},(_,i)=>i+start).map(d=>'<section class="day-block"><div class="day-heading"><h2>DAY '+String(d).padStart(2,'0')+'</h2><span>'+dateFor(d)+'</span>'+(d===dayNumber()?'<span class="status">今日</span>':'')+'</div><div class="day-meals">'+state.slots.filter(s=>s.day===d).map(s=>{const r=byId(s.recipeId);return '<article class="meal-line"><p class="eyebrow">'+(s.meal==='lunch'?'LUNCH · 昼':'DINNER · 夜')+'</p><h3><a href="'+link('recipes/'+r.id+'/')+'">'+esc(r.title)+'</a></h3><p class="fine">'+esc(r.skill)+' · 目安'+r.estimatedTotalMinutes+'分</p><span class="status">'+status(state.progress[r.id])+'</span><label class="no-print">予定 <select data-action="slot-mode" data-key="'+s.key+'">'+option('cook','作る',s.mode)+option('hold','保留',s.mode)+option('eatout','外食',s.mode)+'</select></label><span class="print-only">'+(s.mode==='hold'?'保留':s.mode==='eatout'?'外食':'作る')+'</span></article>';}).join('')+'</div></section>').join('');
}
function catalogue(){
 const forms=[...new Set(data.recipes.map(r=>r.mealForm))];
 const equipment=[...new Set(data.recipes.flatMap(r=>r.equipment))].sort();
 return headline('RECIPE COLLECTION','作れるようになる、60品。','料理名や食材で探して、今日の一品を選びましょう。')+'<div class="filters no-print"><label class="search">料理名・材料 <input type="search" id="search" placeholder="例：鶏肉、卵、うどん" value="'+esc(filter.q)+'"></label><label>料理の種類 <select data-filter="form">'+option('','すべて',filter.form)+forms.map(x=>option(x,x,filter.form)).join('')+'</select></label><label>目安時間 <select data-filter="time">'+option('','すべて',filter.time)+option('30','30分以内',filter.time)+option('15','15分以内',filter.time)+'</select></label><label>使う道具 <select data-filter="equipment">'+option('','すべて',filter.equipment)+equipment.map(x=>option(x,x,filter.equipment)).join('')+'</select></label><label>記録 <select data-filter="progress">'+option('','すべて',filter.progress)+['未着手','作った','再現できる','もう一度練習'].map(x=>option(x,x,filter.progress)).join('')+'</select></label><button data-action="clear-filter">条件をクリア</button></div><p id="result-count" class="result-count" role="status"></p><div id="recipe-grid" class="grid"></div>';
}
function filterRecipes(){
 const q=filter.q.trim().toLowerCase().normalize('NFKC');
 const matches=data.recipes.filter(r=>(!q||[r.title,...r.ingredients.map(i=>i.name)].join(' ').normalize('NFKC').toLowerCase().includes(q))&&(!filter.form||r.mealForm===filter.form)&&(!filter.time||r.estimatedTotalMinutes<=Number(filter.time))&&(!filter.equipment||r.equipment.includes(filter.equipment))&&(!filter.progress||status(state.progress[r.id])===filter.progress));
 document.querySelector('#result-count').textContent=matches.length+'品 / 全60品（調理時間は未実測の目安）';
 document.querySelector('#recipe-grid').innerHTML=matches.length?matches.map(r=>card(r,root.pathname,state.progress[r.id])).join(''):'<p class="empty">該当する料理がありません。検索語や条件を減らしてください。</p>';
}
function recordPanel(id){
 const p=state.progress[id]||{dates:[],mastered:false,practice:false,note:''};
 return '<p>同じ料理を何度作っても「作った料理」は1品として数えます。「再現できる」は作った後の自己評価です。</p><form id="record-form" class="toolbar"><label>作った日 <input name="date" type="date" value="'+today()+'" required></label><button class="primary">作った日を記録</button></form><div class="dates">'+p.dates.map(d=>'<span class="date-chip">'+d+' <button data-action="remove-date" data-date="'+d+'" aria-label="'+d+'の記録を削除">×</button></span>').join('')+'</div><div class="toolbar"><label><input type="checkbox" data-action="mastered"'+(p.mastered?' checked':'')+(!p.dates.length?' disabled':'')+'> 再現できる</label><label><input type="checkbox" data-action="practice"'+(p.practice?' checked':'')+'> もう一度練習</label></div><form id="note-form"><label for="note">次に作るときのメモ（この端末内だけに保存）</label><textarea id="note" maxlength="1000" rows="3" placeholder="火を少し弱める、など">'+esc(p.note)+'</textarea><button>メモを保存</button></form>';
}
function shopping(){
 const rows=core.aggregateShopping(data,state,fromDay,toDay);
 const aisles=[...new Set(rows.map(r=>r.aisle))];
 return headline('SHOPPING LIST','買うものを、ひとまとめに。','選んだ期間の「作る」予定から、必要な材料を集計します。')+'<div class="settings no-print"><label>開始 <select data-action="from-day">'+Array.from({length:30},(_,i)=>option(i+1,'DAY '+(i+1),fromDay)).join('')+'</select></label><label>終了 <select data-action="to-day">'+Array.from({length:30},(_,i)=>option(i+1,'DAY '+(i+1),toDay)).join('')+'</select></label>'+servings()+'<label>毎日の朝食 <select data-action="breakfast">'+option('none','含めない',state.breakfast)+option('toast','パン・ヨーグルト・バナナ',state.breakfast)+option('rice','ご飯・納豆',state.breakfast)+'</select></label></div><div class="toolbar no-print"><button data-action="range" data-days="3">開始日から3日分</button><button data-action="range" data-days="7">開始日から7日分</button><button data-action="print">印刷</button><button data-action="reset-checks">買物チェックを外す</button></div><p class="result-count">DAY '+fromDay+'〜'+toDay+' · '+state.servings+'人分 · '+rows.length+'材料</p><p class="fine">炊いたご飯と生米、乾麺とゆで麺は別集計です。適量は必要に応じて用意してください。生鮮品は保存期限を確認し、小分けの買物も検討してください。</p>'+aisles.map(a=>'<section class="shopping-group"><h2>'+esc(a)+'</h2>'+rows.filter(r=>r.aisle===a).map(r=>'<div class="shopping-row'+(r.check?' checked':'')+'"><div class="item-name"><strong>'+esc(r.name)+'</strong> <small>'+esc(r.state)+'</small><p class="fine">'+esc(r.notes.join(' / '))+'</p>'+(r.needsReview?'<span class="review-tag">対象期間または必要量が変わりました。再確認してください</span>':'')+'</div><strong class="amount">'+qty(r.quantity)+(r.quantity===null?'':esc(r.unit))+'</strong><label><input type="checkbox" data-action="shopping-check" data-kind="bought" data-key="'+esc(r.key)+'"'+(r.check==='bought'?' checked':'')+'> 買った</label><label><input type="checkbox" data-action="shopping-check" data-kind="pantry" data-key="'+esc(r.key)+'"'+(r.check==='pantry'?' checked':'')+'> 家にある</label></div>').join('')+'</section>').join('')+(!rows.length?'<p class="empty">この期間は調理する予定がありません。</p>':'')+'<section class="shopping-group'+(state.extraItems.length?'':' no-print')+'"><h2>追加の買物</h2><p class="fine">自分で追加したものは期間を変えても残ります。</p><form id="extra-form" class="toolbar no-print"><label>品物 <input name="name" required maxlength="100" placeholder="例：台所用スポンジ"></label><button>追加</button></form>'+state.extraItems.map(i=>'<div class="shopping-row'+(i.done?' checked':'')+'"><label><input type="checkbox" data-action="extra-done" data-id="'+esc(i.id)+'"'+(i.done?' checked':'')+'> '+esc(i.name)+'</label><button class="no-print" data-action="extra-remove" data-id="'+esc(i.id)+'">削除</button></div>').join('')+'</section>';
}
function progress(){
 const list=data.recipes.filter(r=>progressFilter==='all'||status(state.progress[r.id])===progressFilter);
 return headline('MY COOKING LOG','できた料理が、増えていく。','作った日と小さなコツを残して、自分の定番に。')+stats()+'<div class="toolbar no-print"><label>記録を絞る <select data-action="progress-filter">'+option('all','すべて',progressFilter)+['未着手','作った','再現できる','もう一度練習'].map(x=>option(x,x,progressFilter)).join('')+'</select></label></div><div>'+list.map(r=>{const p=state.progress[r.id];return '<article class="progress-row"><div><h3><a href="'+link('recipes/'+r.id+'/#record')+'">'+esc(r.title)+'</a></h3>'+(p?.note?'<p>'+esc(p.note)+'</p>':'')+'<p class="fine">'+(p?.dates.length?'作った日：'+p.dates.join('、'):'まだ記録はありません')+'</p></div><span class="status">'+status(p)+'</span></article>';}).join('')+(!list.length?'<p class="empty">この状態の料理はまだありません。</p>':'')+'</div><section class="inset no-print"><h2>記録のバックアップ</h2><p>記録はこのブラウザの保存領域にあります。ブラウザのデータを消すと失われます。JSONを書き出して別の端末へ移せます。メモは公開リポジトリへ入れないでください。</p><div class="toolbar"><button class="primary" data-action="export">JSONを書き出す</button><label class="button">JSONを読み込む <input type="file" id="import-file" accept=".json,application/json"></label><button data-action="reset">このサイトの記録を初期化</button></div><p class="fine">読込上限1MB。読み込む内容を確認してから現在の記録を置き換えます。</p></section>';
}
function render(){
 if(page==='home')app.innerHTML=home();
 if(page==='plan')app.innerHTML=plan();
 if(page==='recipes'){app.innerHTML=catalogue();filterRecipes();}
 if(page==='recipe'){const r=byId(document.body.dataset.recipeId);app.innerHTML=recipeBody(r,state.servings);document.querySelector('#recipe-record').innerHTML=recordPanel(r.id);}
 if(page==='shopping')app.innerHTML=shopping();
 if(page==='progress')app.innerHTML=progress();
}
function download(){
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cooking60-records-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('バックアップを書き出しました。');
}
function dialog(title,body,confirmLabel,onConfirm){
 const el=document.createElement('dialog');el.innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(body)+'</p><div class="toolbar"><button class="primary" id="dialog-confirm">'+esc(confirmLabel)+'</button><button id="dialog-cancel">キャンセル</button></div>';
 document.body.append(el);el.addEventListener('close',()=>el.remove());el.querySelector('#dialog-confirm').onclick=()=>{el.close();onConfirm();};el.querySelector('#dialog-cancel').onclick=()=>el.close();el.showModal();el.querySelector('#dialog-cancel').focus();
}
window.addEventListener('beforeunload',e=>{if(unsaved){e.preventDefault();e.returnValue='';}});
const printedDetails=new Map();
window.addEventListener('beforeprint',()=>{document.querySelectorAll('.recipe-layout details').forEach(el=>{printedDetails.set(el,el.open);el.open=true;});});
window.addEventListener('afterprint',()=>{for(const [el,open] of printedDetails)el.open=open;printedDetails.clear();});
document.addEventListener('input',e=>{if(e.target.id==='search'){filter.q=e.target.value;filterRecipes();}});
document.addEventListener('change',async e=>{
 const el=e.target,a=el.dataset.action;
 try{
 if(el.dataset.filter){filter[el.dataset.filter]=el.value;filterRecipes();return;}
 if(el.id==='import-file'){
  const file=el.files[0];if(!file)return;
  if(file.size>1048576)throw new Error('1MB以下のJSONを選んでください。');
  pendingImport=core.validateState(JSON.parse(await file.text()),data);
  const c=core.getCounts(pendingImport);
  dialog('バックアップを読み込みますか？','作った料理 '+c.cooked+'品、再現できる '+c.mastered+'品。開始日 '+pendingImport.startDate+'。現在の記録を置き換えます。','読み込んで置き換える',()=>{persistent=!!storage;protectedRaw=null;alert('');commit(pendingImport,'バックアップを読み込みました。');pendingImport=null;});
 }
 if(a==='servings')commit({...state,servings:Number(el.value)},'人数を変更しました。');
 if(a==='start-date')commit({...state,startDate:el.value},'開始日を変更しました。');
 if(a==='plan-view'){planView=el.value;render();}
 if(a==='slot-mode'){const n=copy(state);n.slots.find(s=>s.key===el.dataset.key).mode=el.value;commit(n,'予定を変更しました。');}
 if(a==='from-day'){fromDay=Number(el.value);toDay=Math.max(toDay,fromDay);render();}
 if(a==='to-day'){toDay=Number(el.value);fromDay=Math.min(fromDay,toDay);render();}
 if(a==='breakfast')commit({...state,breakfast:el.value},'朝食の設定を変更しました。');
 if(a==='shopping-check'){
  const r=core.aggregateShopping(data,state,fromDay,toDay).find(r=>r.key===el.dataset.key),n=copy(state);
  if(el.checked)n.shoppingChecks[r.key]={kind:el.dataset.kind,quantity:r.quantity,period:core.shoppingPeriod(state,fromDay,toDay)};else delete n.shoppingChecks[r.key];
  commit(n,'買物チェックを更新しました。');
 }
 if(a==='extra-done'){const n=copy(state);n.extraItems.find(i=>i.id===el.dataset.id).done=el.checked;commit(n);}
 if(a==='mastered'||a==='practice')commit(core.updateProgress(state,document.body.dataset.recipeId,{[a]:el.checked}),'記録を更新しました。');
 if(a==='progress-filter'){progressFilter=el.value;render();}
 }catch(err){message('変更できませんでした：'+err.message);if(a)render();if(el.id==='import-file')el.value='';}
});
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');if(!el||el.tagName==='SELECT'||el.type==='checkbox')return;
 const a=el.dataset.action;
 try{
 if(a==='print')window.print();
 if(a==='cook-mode'){const on=document.body.classList.toggle('cook-mode');el.textContent=on?'通常表示に戻す':'調理表示にする';}
 if(a==='clear-filter'){Object.keys(filter).forEach(k=>filter[k]='');render();}
 if(a==='range'){toDay=Math.min(30,fromDay+Number(el.dataset.days)-1);render();}
 if(a==='remove-date'){const id=document.body.dataset.recipeId;commit(core.updateProgress(state,id,{dates:state.progress[id].dates.filter(d=>d!==el.dataset.date)}),'記録日を削除しました。');}
 if(a==='extra-remove'){commit({...state,extraItems:state.extraItems.filter(i=>i.id!==el.dataset.id)},'追加項目を削除しました。');}
 if(a==='reset-checks')commit({...state,shoppingChecks:{}},'買物チェックを外しました。');
 if(a==='undo-swap'&&lastSwap){const n=core.swapSlots(state,...lastSwap);lastSwap=null;commit(n,'交換を戻しました。');}
 if(a==='export')download();
 if(a==='export-original'&&protectedRaw!==null){const url=URL.createObjectURL(new Blob([protectedRaw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cooking60-protected-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 if(a==='reset')dialog('このサイトの記録を初期化しますか？','献立の変更、調理記録、メモ、買物チェックを削除します。必要な記録は先にJSONを書き出してください。','初期化する',()=>{const result=core.clearAppState(storage,key);persistent=result.ok;protectedRaw=null;state=core.createDefaultState(data,today());commit(state,'このサイトの記録を初期化しました。');alert(result.ok?'':'保存領域を操作できません。この画面内だけ初期化しました。');});
 }catch(err){message(err.message);}
});
document.addEventListener('submit',e=>{
 const form=e.target;e.preventDefault();
 try{
 if(form.id==='swap-form'){const fd=new FormData(form),a=fd.get('first'),b=fd.get('second');if(a===b){message('異なる2つの枠を選んでください。');return;}const n=core.swapSlots(state,a,b);lastSwap=[a,b];commit(n,'2つの料理を交換しました。');}
 if(form.id==='record-form'){const id=document.body.dataset.recipeId,d=new FormData(form).get('date'),exists=state.progress[id]?.dates.includes(d);commit(core.recordCook(state,id,d),exists?'この日はすでに記録されています。':'作った日を記録しました。');}
 if(form.id==='note-form')commit(core.updateProgress(state,document.body.dataset.recipeId,{note:document.querySelector('#note').value}),'メモを保存しました。');
 if(form.id==='extra-form'){const name=new FormData(form).get('name').trim();if(!name)return;commit({...state,extraItems:[...state.extraItems,{id:'extra-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name,done:false}]},'買物を追加しました。');}
 }catch(err){message(err.message);}
});
async function start(){
 try{
  const response=await fetch(new URL('data.json',import.meta.url));if(!response.ok)throw new Error('data');
  data=await response.json();
  try{storage=window.localStorage;}catch{storage=null;}
  key=core.storageKey(root.pathname);
  const loaded=core.loadState(storage,key,data,today());state=loaded.state;persistent=loaded.persistent;
  if(!persistent&&storage){try{protectedRaw=storage.getItem(key)??storage.getItem(key.replace(/:v1$/,':v0'));}catch{}}
  if(loaded.warnings.length)alert(loaded.warnings.join(' '));
  fromDay=activeDay();toDay=Math.min(30,fromDay+6);
  render();
  window.addEventListener('storage',e=>{if(e.key===key){persistent=false;alert('別の画面で記録が変更されました。この画面の自動保存を停止しました。変更を反映するには再読み込みしてください。');}});
 }catch(err){alert('記録機能を読み込めませんでした。レシピ本文は読めます。通信状況を確認して再読み込みしてください。');console.error(err);}
}
start();
