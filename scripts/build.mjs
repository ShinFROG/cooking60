import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {esc,card,recipeBody} from '../src/render.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(base,p),'utf8'));
const candidate=await read('data/public/candidates.json');
const recipes=[...await read('data/public/recipes-lunch.json'),...await read('data/public/recipes-dinner.json')].sort((a,b)=>a.id.localeCompare(b.id));
const reviewedCount=recipes.filter(r=>r.sourceReview?.status==='reviewed').length;
const within30Count=recipes.filter(r=>r.estimatedTotalMinutes<=30).length;
const data={schemaVersion:1,edition:'preview',editedAt:'2026-10-17',recipes,days:candidate.days};
const dist=path.join(base,'dist');
await fs.rm(dist,{recursive:true,force:true});await fs.mkdir(path.join(dist,'assets'),{recursive:true});
for(const name of ['app.mjs','core.mjs','render.mjs','style.css'])await fs.copyFile(path.join(base,'src',name),path.join(dist,'assets',name));
await fs.cp(path.join(base,'public/assets'),path.join(dist,'assets'),{recursive:true});
await fs.writeFile(path.join(dist,'assets/data.json'),JSON.stringify(data));
await fs.writeFile(path.join(dist,'.nojekyll'),'');
await fs.copyFile(path.join(base,'CONTENT-LICENSE.md'),path.join(dist,'CONTENT-LICENSE.txt'));
await fs.copyFile(path.join(base,'LICENSE'),path.join(dist,'CODE-LICENSE.txt'));
function shell(title,page,body,root='',id=''){
 const nav=[['home','','ホーム'],['plan','plan/','献立'],['recipes','recipes/','60品'],['shopping','shopping/','買物'],['progress','progress/','記録']];
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="'+esc(title)+'。30日の昼・夜で60種類の料理を練習する、無料の料理学習サイト。"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\'; connect-src \'self\'; font-src \'none\'; object-src \'none\'; base-uri \'self\'; form-action \'none\'"><title>'+esc(title)+' | Cooking60</title><link rel="icon" href="'+root+'assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="'+root+'assets/style.css"><script type="module" src="'+root+'assets/app.mjs"></script></head><body data-page="'+page+'" data-recipe-id="'+id+'"><a class="skip" href="#main">本文へスキップ</a><header class="site-header"><a class="brand" href="'+root+'./"><img src="'+root+'assets/favicon.svg" alt="" width="36" height="36"><span>Cooking60<small>毎日のごはん、60の得意。</small></span></a><nav class="main-nav" aria-label="メインメニュー">'+nav.map(([key,p,label])=>'<a href="'+root+p+'"'+(page===key||(page==='recipe'&&key==='recipes')?' aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav></header><div id="app-alert" role="alert" hidden></div><main id="main"><noscript><p class="notice">レシピ本文はこのまま読めます。献立の変更・買物集計・記録にはJavaScriptが必要です。</p></noscript><div id="app">'+body+'</div></main><footer class="site-footer"><div><a href="'+root+'guide/">使い方・料理の基本</a><a href="'+root+'about/">このサイトについて</a></div><span>Cooking60 · 公開準備版 / 全60品未試作</span></footer><div id="toast" role="status" aria-live="polite"></div></body></html>';
}
async function page(file,title,type,body,root='',id=''){const target=path.join(dist,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,shell(title,type,body,root,id));}
const intro='<p class="eyebrow">30 DAYS · 60 DISHES</p><h1>毎日のごはんを、自分の得意に。</h1><p class="lead">昼と夜にひとつずつ。いつもの食材で、作れる料理を少しずつ増やす30日。</p><p><a class="button primary" href="recipes/">60品を見る →</a></p><div class="notice">公開準備版：全60品の材料・手順を公開情報と照合しました。実際の調理は未試作です。</div>';
await page('index.html','毎日のごはんを、自分の得意に','home',intro+'<div class="grid">'+recipes.slice(0,6).map(r=>card(r)).join('')+'</div>');
await page('recipes/index.html','60品の料理','recipes','<h1>作れるようになる、60品。</h1><p>すべて独自作成・未試作の草稿です。時間は目安です。</p><div class="grid">'+recipes.map(r=>card(r,'../')).join('')+'</div>','../');
await page('plan/index.html','30日の献立','plan','<h1>30日の献立</h1>'+data.days.map(d=>'<section class="day-block"><h2>DAY '+d.day+'</h2><div class="grid two">'+[d.lunchRecipeId,d.dinnerRecipeId].map(id=>card(recipes.find(r=>r.id===id),'../')).join('')+'</div></section>').join(''),'../');
await page('shopping/index.html','買物リスト','shopping','<h1>買物リスト</h1><p>JavaScriptを有効にすると、献立と人数から材料を集計できます。</p><a href="../recipes/">料理ごとの材料を見る</a>','../');
await page('progress/index.html','作った料理の記録','progress','<h1>作った料理の記録</h1><p>JavaScriptを有効にすると、このブラウザ内に作った日・メモを保存できます。データは外部に送信されません。</p>','../');
for(const r of recipes)await page('recipes/'+r.id+'/index.html',r.title,'recipe',recipeBody(r),'../../',r.id);
await page('guide/index.html','使い方・料理の基本','guide',await fs.readFile(path.join(base,'src/guide.html'),'utf8'),'../');
const references=await read('data/public/references.json');
const about='<article class="prose"><p class="eyebrow">ABOUT COOKING60</p><h1>このサイトについて</h1><p class="lead">家庭料理の基本を、30日・昼夜60品の小さな練習に分けました。</p><h2>公開準備版の範囲</h2><p>60品の材料・手順・コツは、このサイトのために独自作成した草稿です。全件未試作で、調理時間は未実測です。時間目安では'+within30Count+'品が30分以内ですが、実際の所要時間を保証しません。ご飯の準備条件や長い待ち時間は各料理に記載しています。</p><p>'+reviewedCount+'品について公開レシピの材料比率と手順を照合し、初心者が迷う表現を見直しました。各料理の「確認範囲」に照合先と修正内容を記録しています。文献照合と実際の調理試作は区別しています。</p><p>献立は学習順の提案です。全員に適した栄養計画、アレルギー対応、疾患別の食事計画ではありません。商品表示と自分の食べられる材料を確認してください。</p><h2>文章・画像・参考リンク</h2><p>レシピ本文と食卓イラストは独自制作です。第三者のレシピ本文、料理写真、会員限定の情報は転載していません。参考先は設計、材料・手順の比較、一般的な食品の取り扱いを調べるためのリンクで、転載許諾や料理の試作済み認定を意味しません。</p><p>独自の本文・データ・SVGは <a href="https://creativecommons.org/licenses/by/4.0/deed.ja" rel="noreferrer">CC BY 4.0</a>、コードはMIT Licenseで提供します。表示名はCooking60 contributorsです。利用時は出典・ライセンス・変更点を明示してください。第三者の参照先の権利は各権利者にあります。<a href="../CONTENT-LICENSE.txt">コンテンツの利用条件</a> / <a href="../CODE-LICENSE.txt">コードの利用条件</a></p><h2>プライバシー</h2><p>アカウント登録、広告、アクセス解析、外部API、外部フォントは使いません。調理記録とメモはブラウザのlocalStorageに保存し、サイトからサーバーへ送信しません。閲覧時の通信は配信事業者GitHubの運用に従います。書き出した個人記録は公開リポジトリへ追加しないでください。</p><h2>設計時に調べた100サイト</h2><p>2026年10月17日時点で、公開本文や機能説明を参考にしました。利用者として全機能を操作した評価、転載許可の確認、掲載料理の試作は含みません。</p><details><summary>参考サイト一覧を開く（100件）</summary><ul>'+references.map(s=>'<li><a href="'+esc(s.url)+'" rel="noreferrer">'+esc(s.name)+'</a> <small>'+esc(s.category)+' · '+esc(s.status)+'</small></li>').join('')+'</ul></details><p class="fine">最終編集：2026年10月17日</p></article>';
await page('about/index.html','このサイトについて','about',about,'../');
await fs.writeFile(path.join(dist,'404.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ページが見つかりません | Cooking60</title><body><main><h1>ページが見つかりません</h1><p>URLをご確認ください。ブラウザの戻るボタンから前のページに戻れます。</p></main></body></html>');
console.log('Built '+(recipes.length+8)+' HTML pages. Public preview: '+recipes.length+' untested recipes. Output: dist/');
