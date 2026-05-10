const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
};
const state = {
  user: store.get('allergy_user', null),
  records: store.get('allergy_records', [
    {id:crypto.randomUUID(), date:'2026-05-11', time:'18:30', food:'卵', amount:'1g', symptom:'なし', grades:{skin:'0',resp:'0',gut:'0',all:'0'}, meds:[], hospital:'なし', detail:'問題なく摂取できました。', symptomTime:'', photos:[]},
    {id:crypto.randomUUID(), date:'2026-05-10', time:'17:40', food:'牛乳', amount:'5ml', symptom:'あり', grades:{skin:'1',resp:'0',gut:'0',all:'0'}, meds:['抗ヒスタミン薬'], hospital:'なし', detail:'口の周りに軽い赤み。30分程度で改善。', symptomTime:'18:05', photos:[]}
  ]),
  posts: store.get('allergy_posts', [
    {id:crypto.randomUUID(), author:'匿名の保護者', body:'少量摂取の記録を続けるコツを知りたいです。みなさんは何曜日に固定していますか？', tags:['卵','少量摂取','相談'], likes:6, comments:['曜日を決めると続けやすかったです。'], created:'2026-05-11'},
    {id:crypto.randomUUID(), author:'匿名の保護者', body:'保育園に症状記録を共有する時、写真付きの記録があると説明しやすかったです。', tags:['保育園','症状写真','工夫'], likes:9, comments:[], created:'2026-05-10'}
  ]),
  selectedRecord: null,
  tagFilter: '',
  query: ''
};
const recommendedTags = ['卵','牛乳','小麦','ピーナッツ','ナッツ','少量摂取','負荷試験','保育園','学校','外食','皮膚症状','咳','嘔吐','腹痛','エピペン','受診','相談','成功体験','工夫','不安'];
function persist(){ store.set('allergy_records', state.records); store.set('allergy_posts', state.posts); store.set('allergy_user', state.user); }
function route(){ return location.hash.replace('#','') || (state.user ? 'home' : 'login'); }
function go(r){ location.hash = r; }
window.addEventListener('hashchange', render);
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; const btn=$('#installBtn'); if(btn) btn.classList.add('show'); });
function shell(title, body, active='home'){
  const auth = state.user ? `<button class="btn ghost" id="logoutBtn">ログアウト</button>` : '';
  return `<div class="topbar"><div><div class="brand">${title}</div><div class="small">食物アレルギー記録</div></div>${auth}</div><main class="screen">${body}</main>${state.user ? nav(active) : ''}`;
}
function nav(active){ const items=[['home','🏠','ホーム'],['records','📝','記録'],['calendar','📅','カレンダー'],['community','💬','掲示板'],['profile','👤','設定']]; return `<nav class="bottom-nav">${items.map(([r,i,t])=>`<button class="nav-item ${active===r?'active':''}" data-go="${r}"><span class="icon">${i}</span><span>${t}</span></button>`).join('')}</nav>`; }
function render(){
  const r=route();
  if(!state.user && r!=='login') return go('login');
  const app=$('#app');
  if(r==='login') app.innerHTML=loginScreen();
  else if(r==='home') app.innerHTML=homeScreen();
  else if(r==='records') app.innerHTML=recordsScreen();
  else if(r==='new-record') app.innerHTML=newRecordScreen();
  else if(r.startsWith('record/')) app.innerHTML=recordDetailScreen(r.split('/')[1]);
  else if(r==='calendar') app.innerHTML=calendarScreen();
  else if(r==='community') app.innerHTML=communityScreen();
  else if(r==='new-post') app.innerHTML=newPostScreen();
  else if(r.startsWith('post/')) app.innerHTML=postDetailScreen(r.split('/')[1]);
  else if(r==='profile') app.innerHTML=profileScreen();
  bind();
}
function loginScreen(){return `<main class="screen login"><section class="card hero" style="width:100%"><div class="logo">🌿</div><div class="h1">アレルギー記録</div><p class="small">摂取量・症状写真・保護者向け掲示板をスマホで管理します。</p><button class="btn primary full" id="demoLogin">Googleでログイン（デモ）</button><button class="btn full" id="mailLogin">メールでログイン（デモ）</button><div class="notice" style="margin-top:14px">本デモは端末内保存です。本番ではFirebase Authentication、Firestore、Storageへ接続します。</div></section></main>`}
function homeScreen(){ const latest=state.records.slice(0,3).map(recordItem).join('')||'<div class="empty">まだ記録がありません</div>'; return shell('ホーム', `<section class="card hero"><div class="h1">こんにちは、${state.user.name}さん</div><p>今日の摂取・症状をすぐ記録できます。</p><div class="grid2"><button class="btn primary" data-go="new-record">＋ 摂取記録</button><button class="btn danger" data-go="new-record">📷 症状記録</button></div></section><section class="notice danger-note">このアプリは経験共有と記録補助を目的とします。診断・治療・摂取量の判断は必ず主治医に相談してください。</section><section class="card"><div class="h2">最近の記録</div>${latest}</section><section class="card"><div class="h2">よく使うタグ</div><div class="chips">${recommendedTags.slice(0,10).map(t=>`<button class="chip" data-tag="${t}">#${t}</button>`).join('')}</div></section><button id="installBtn" class="btn full install">ホーム画面に追加</button>`, 'home') }
function recordItem(x){return `<div class="record" data-go="record/${x.id}"><strong>${x.date} ${x.food} ${x.amount}</strong><div class="meta"><span>${x.symptom==='あり'?'症状あり':'症状なし'}</span><span>${x.photos?.length?'📷写真あり':''}</span><span>${x.detail||''}</span></div></div>`}
function recordsScreen(){return shell('記録一覧', `<div class="toolbar"><button class="btn primary full" data-go="new-record">＋ 新しい記録</button></div><section class="card">${state.records.map(recordItem).join('')||'<div class="empty">記録がありません</div>'}</section>`, 'records')}
function newRecordScreen(){return shell('摂取・症状記録', `<form id="recordForm" class="card"><div class="field"><label class="label">食べた日付</label><input class="input" name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label class="label">食べた時間</label><input class="input" name="time" type="time" value="18:00"></div><div class="field"><label class="label">食べた食材</label><select class="select" name="food"><option>卵</option><option>牛乳</option><option>小麦</option><option>ピーナッツ</option><option>ナッツ</option><option>その他</option></select></div><div class="field"><label class="label">食べた量</label><input class="input" name="amount" placeholder="例：1g、5ml、1/8個"></div><div class="field"><label class="label">症状はありましたか？</label><div class="seg"><button type="button" class="active" data-symptom="なし">なし</button><button type="button" data-symptom="あり">あり</button></div><input type="hidden" name="symptom" value="なし"></div><div id="symptomBox" class="hidden"><div class="divider"></div>${gradeSelect('皮膚・粘膜','skin')}${gradeSelect('呼吸器','resp')}${gradeSelect('消化器','gut')}${gradeSelect('全身','all')}<div class="field"><label class="label">使用した薬</label><div class="chips"><label class="chip"><input type="checkbox" name="meds" value="抗ヒスタミン薬"> 抗ヒスタミン薬</label><label class="chip"><input type="checkbox" name="meds" value="気管支拡張薬"> 気管支拡張薬</label><label class="chip"><input type="checkbox" name="meds" value="エピペン"> エピペン</label></div></div><div class="field"><label class="label">症状写真</label><input class="input" id="photoInput" type="file" accept="image/*" capture="environment" multiple><div id="photoPreview" class="photos" style="margin-top:8px"></div></div><div class="field"><label class="label">症状が出た時間</label><input class="input" name="symptomTime" type="time"></div></div><div class="field"><label class="label">病院受診</label><select class="select" name="hospital"><option>なし</option><option>あり</option></select></div><div class="field"><label class="label">症状・メモ</label><textarea class="textarea" name="detail" placeholder="例：口の周りに赤み。30分で改善。"></textarea></div><button class="btn primary full" type="submit">保存する</button></form>`, 'records')}
function gradeSelect(label,name){return `<div class="field"><label class="label">${label}</label><select class="select" name="${name}"><option value="0">Grade 0</option><option value="1">Grade 1</option><option value="2">Grade 2</option><option value="3">Grade 3</option></select></div>`}
function recordDetailScreen(id){ const x=state.records.find(r=>r.id===id); if(!x) return shell('記録詳細','<div class="empty">見つかりません</div>','records'); return shell('記録詳細', `<section class="card"><div class="h2">${x.date} ${x.time}</div><p><strong>食材：</strong>${x.food}</p><p><strong>量：</strong>${x.amount}</p><p><strong>症状：</strong>${x.symptom}</p><p><strong>Grade：</strong>皮膚${x.grades.skin} / 呼吸${x.grades.resp} / 消化器${x.grades.gut} / 全身${x.grades.all}</p><p><strong>使用薬：</strong>${x.meds?.join('、')||'なし'}</p><p><strong>病院受診：</strong>${x.hospital}</p><p><strong>メモ：</strong>${x.detail||'なし'}</p><div class="photos">${(x.photos||[]).map(p=>`<img class="photo-thumb" src="${p}" alt="症状写真">`).join('')}</div></section><button class="btn full" data-go="records">一覧へ戻る</button>`, 'records')}
function calendarScreen(){ const days=Array.from({length:31},(_,i)=>i+1); return shell('カレンダー', `<section class="card"><div class="h2">2026年5月</div><div class="calendar">${['月','火','水','木','金','土','日'].map(d=>`<strong>${d}</strong>`).join('')}${days.map(d=>{const rec=state.records.find(r=>Number(r.date.slice(-2))===d); const cls=rec?(rec.symptom==='あり'?'bad':'ok'):''; return `<div class="day ${cls}">${d}<br>${rec?(rec.symptom==='あり'?'△':'○'):''}</div>`}).join('')}</div><div class="meta"><span>○ 症状なし</span><span>△ 症状あり</span></div></section>`, 'calendar')}
function communityScreen(){ const q=state.query.toLowerCase(); let posts=state.posts.filter(p=>(!state.tagFilter||p.tags.includes(state.tagFilter)) && (!q || p.body.toLowerCase().includes(q) || p.tags.some(t=>t.toLowerCase().includes(q)))); return shell('保護者掲示板', `<div class="notice">経験共有の場です。診断・治療・摂取量の判断は主治医に相談してください。</div><div class="search"><input id="communitySearch" class="input" placeholder="キーワード・#タグで検索" value="${state.query}"></div><section class="card"><div class="h2">タグで探す</div><div class="chips"><button class="chip ${!state.tagFilter?'active':''}" data-filter="">すべて</button>${recommendedTags.map(t=>`<button class="chip ${state.tagFilter===t?'active':''}" data-filter="${t}">#${t}</button>`).join('')}</div></section><button class="btn primary full" data-go="new-post">＋ 投稿する</button><section class="card">${posts.map(postItem).join('')||'<div class="empty">該当する投稿がありません</div>'}</section>`, 'community')}
function postItem(p){return `<div class="post" data-go="post/${p.id}"><div><strong>${p.author}</strong> <span class="small">${p.created}</span></div><div class="post-body">${escapeHtml(p.body)}</div><div class="chips">${p.tags.map(t=>`<span class="chip">#${t}</span>`).join('')}</div><div class="meta"><span class="like">♥ ${p.likes}</span><span>💬 ${p.comments.length}</span></div></div>`}
function newPostScreen(){return shell('新しい投稿', `<form id="postForm" class="card"><div class="field"><label class="label">相談・共有内容</label><textarea class="textarea" name="body" required placeholder="個人が特定される内容や医療判断を求める内容は避けてください。"></textarea></div><div class="field"><label class="label">タグを選択</label><div class="chips">${recommendedTags.map(t=>`<label class="chip"><input type="checkbox" name="tags" value="${t}"> #${t}</label>`).join('')}</div></div><div class="field"><label class="label">自由タグ（任意・カンマ区切り）</label><input class="input" name="freeTags" placeholder="例：給食,旅行"></div><div class="notice danger-note">子どもの顔写真・氏名・園名など、個人が特定される情報は投稿しないでください。</div><button class="btn primary full" type="submit">投稿する</button></form>`, 'community')}
function postDetailScreen(id){ const p=state.posts.find(x=>x.id===id); if(!p) return shell('投稿詳細','<div class="empty">見つかりません</div>','community'); return shell('投稿詳細', `<section class="card">${postItem(p)}<button class="btn danger" id="reportBtn">通報</button></section><section class="card"><div class="h2">コメント</div>${p.comments.map(c=>`<div class="record">${escapeHtml(c)}</div>`).join('')||'<div class="empty">コメントはまだありません</div>'}<form id="commentForm" class="field"><input class="input" name="comment" placeholder="経験共有としてコメント"><button class="btn primary full" style="margin-top:8px">送信</button></form></section>`, 'community')}
function profileScreen(){return shell('設定', `<section class="card"><div class="h2">保護者プロフィール</div><p>表示名：${state.user.name}</p><p>ログイン：デモ認証</p></section><section class="card"><div class="h2">子どもプロフィール</div><div class="field"><label class="label">ニックネーム</label><input class="input" value="みどりちゃん"></div><div class="field"><label class="label">アレルギー食品</label><div class="chips"><span class="chip">#卵</span><span class="chip">#牛乳</span></div></div></section><section class="notice">本番実装では、Google認証と保護者アカウントに子どもプロフィールを紐づけます。</section>`, 'profile')}
let tempPhotos=[];
function bind(){
  $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $('#logoutBtn')?.addEventListener('click',()=>{state.user=null;persist();go('login')});
  $('#demoLogin')?.addEventListener('click',()=>{state.user={name:'保護者'};persist();go('home')});
  $('#mailLogin')?.addEventListener('click',()=>{state.user={name:'保護者'};persist();go('home')});
  $('#installBtn')?.addEventListener('click',async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }});
  $$('[data-tag]').forEach(b=>b.onclick=()=>{state.tagFilter=b.dataset.tag; go('community')});
  $$('[data-filter]').forEach(b=>b.onclick=()=>{state.tagFilter=b.dataset.filter; render()});
  $('#communitySearch')?.addEventListener('input', e=>{state.query=e.target.value; render()});
  $$('[data-symptom]').forEach(b=>b.onclick=()=>{ $$('[data-symptom]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $('[name=symptom]').value=b.dataset.symptom; $('#symptomBox').classList.toggle('hidden', b.dataset.symptom==='なし'); });
  $('#photoInput')?.addEventListener('change', async e=>{ tempPhotos=[]; for(const f of e.target.files){ tempPhotos.push(await fileToDataUrl(f, 900, .72)); } $('#photoPreview').innerHTML=tempPhotos.map(p=>`<img class="photo-thumb" src="${p}" alt="症状写真">`).join(''); });
  $('#recordForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); const meds=fd.getAll('meds'); state.records.unshift({id:crypto.randomUUID(), date:fd.get('date'), time:fd.get('time'), food:fd.get('food'), amount:fd.get('amount'), symptom:fd.get('symptom'), grades:{skin:fd.get('skin')||'0',resp:fd.get('resp')||'0',gut:fd.get('gut')||'0',all:fd.get('all')||'0'}, meds, hospital:fd.get('hospital'), detail:fd.get('detail'), symptomTime:fd.get('symptomTime'), photos:tempPhotos}); tempPhotos=[]; persist(); go('records'); });
  $('#postForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); const selected=fd.getAll('tags'); const free=(fd.get('freeTags')||'').split(',').map(s=>s.trim().replace(/^#/, '')).filter(Boolean).slice(0,3); const tags=[...new Set([...selected,...free])].slice(0,6); state.posts.unshift({id:crypto.randomUUID(), author:'匿名の保護者', body:fd.get('body'), tags:tags.length?tags:['相談'], likes:0, comments:[], created:new Date().toISOString().slice(0,10)}); persist(); go('community'); });
  $('#commentForm')?.addEventListener('submit', e=>{ e.preventDefault(); const id=route().split('/')[1]; const p=state.posts.find(x=>x.id===id); const c=new FormData(e.target).get('comment'); if(p&&c){p.comments.push(c); persist(); render();} });
  $('#reportBtn')?.addEventListener('click',()=>alert('通報を受け付けました（デモ）。本番では管理者レビューへ送信します。'));
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function fileToDataUrl(file,max=900,quality=.75){return new Promise((resolve)=>{ const img=new Image(); const reader=new FileReader(); reader.onload=()=>{img.onload=()=>{ const scale=Math.min(1,max/Math.max(img.width,img.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',quality));}; img.src=reader.result;}; reader.readAsDataURL(file); });}
render();
