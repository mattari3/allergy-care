const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
};

const nutFoods = ['ピーナッツ','カシューナッツ','くるみ','アーモンド','ヘーゼルナッツ','マカダミアナッツ','ピスタチオ','ペカンナッツ','ブラジルナッツ','その他ナッツ'];
const recommendedTags = ['ピーナッツ','カシューナッツ','くるみ','アーモンド','ヘーゼルナッツ','少量摂取','負荷試験','皮膚症状','咳','嘔吐','腹痛','エピペン','受診','相談','成功体験','外食','学校','保育園'];

const defaultUser = {
  loginType: 'デモ認証',
  email: 'demo@example.com',
  patientId: 'NUTS-0001',
  patientName: '山田 みどり',
  guardianName: '保護者',
  allergies: ['ピーナッツ','カシューナッツ','くるみ']
};

const state = {
  user: store.get('allergy_user_v2', null),
  records: store.get('allergy_records_v2', [
    {id:crypto.randomUUID(), date:'2026-05-11', time:'18:30', food:'ピーナッツ', amount:'0.2g', symptom:'なし', grades:{skin:'0',resp:'0',gut:'0',all:'0'}, meds:[], hospital:'なし', detail:'問題なく摂取できました。', symptomTime:'', photos:[]},
    {id:crypto.randomUUID(), date:'2026-05-10', time:'17:40', food:'カシューナッツ', amount:'0.1g', symptom:'あり', grades:{skin:'1',resp:'0',gut:'0',all:'0'}, meds:['抗ヒスタミン薬'], hospital:'なし', detail:'口の周りに軽い赤み。30分程度で改善。', symptomTime:'18:05', photos:[]}
  ]),
  posts: store.get('allergy_posts_v2', [
    {id:crypto.randomUUID(), author:'匿名の保護者', body:'ナッツ類の少量摂取を続けるコツを知りたいです。曜日を決めていますか？', tags:['ナッツ','少量摂取','相談'], likes:6, comments:['曜日を決めると続けやすかったです。'], created:'2026-05-11'},
    {id:crypto.randomUUID(), author:'匿名の保護者', body:'外食時にナッツ混入が不安です。確認しているポイントを共有したいです。', tags:['外食','ナッツ','工夫'], likes:9, comments:[], created:'2026-05-10'}
  ]),
  tagFilter: '',
  query: ''
};

function persist(){
  store.set('allergy_records_v2', state.records);
  store.set('allergy_posts_v2', state.posts);
  store.set('allergy_user_v2', state.user);
}
function route(){ return location.hash.replace('#','') || (state.user ? 'home' : 'login'); }
function go(r){ location.hash = r; }
window.addEventListener('hashchange', render);
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; const btn=$('#installBtn'); if(btn) btn.classList.add('show'); });

function shell(title, body, active='home'){
  const auth = state.user ? `<button class="btn ghost" id="logoutBtn">ログアウト</button>` : '';
  return `<div class="topbar"><div><div class="brand">${title}</div><div class="small">ナッツアレルギー記録</div></div>${auth}</div><main class="screen">${body}</main>${state.user ? nav(active) : ''}`;
}
function nav(active){
  const items=[['home','🏠','ホーム'],['records','📝','記録'],['calendar','📅','カレンダー'],['community','💬','掲示板'],['profile','👤','設定']];
  return `<nav class="bottom-nav">${items.map(([r,i,t])=>`<button class="nav-item ${active===r?'active':''}" data-go="${r}"><span class="icon">${i}</span><span>${t}</span></button>`).join('')}</nav>`;
}

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

function loginScreen(){return `<main class="screen login"><section class="card hero" style="width:100%"><div class="logo">🥜</div><div class="h1">ナッツアレルギー記録</div><p class="small">患者ID・患者名を使ってログインし、摂取量・症状・写真を記録します。</p><form id="loginForm"><div class="field"><label class="label">患者ID</label><input class="input" name="patientId" required placeholder="例：NUTS-0001" value="NUTS-0001"></div><div class="field"><label class="label">患者名</label><input class="input" name="patientName" required placeholder="例：山田 みどり" value="山田 みどり"></div><div class="field"><label class="label">保護者名</label><input class="input" name="guardianName" placeholder="例：保護者" value="保護者"></div><button class="btn primary full" type="submit">ログイン</button></form><button class="btn full" id="googleDemoLogin" style="margin-top:10px">Googleでログイン（デモ）</button><div class="notice" style="margin-top:14px">本デモは端末内保存です。本番ではFirebase Authentication、Firestore、Storageへ接続します。</div></section></main>`}

function homeScreen(){
  const latest=state.records.slice(0,3).map(recordItem).join('')||'<div class="empty">まだ記録がありません</div>';
  return shell('ホーム', `<section class="card hero"><div class="h1">こんにちは、${escapeHtml(state.user.patientName)}さん</div><p>ナッツ系食品の摂取・症状を記録できます。</p><button class="btn primary full" data-go="new-record">＋ 新しい記録</button></section><section class="notice danger-note">このアプリは経験共有と記録補助を目的とします。診断・治療・摂取量の判断は必ず主治医に相談してください。</section><section class="card"><div class="h2">最近の記録</div>${latest}</section><button id="installBtn" class="btn full install">ホーム画面に追加</button>`, 'home')
}

function recordItem(x){return `<div class="record" data-go="record/${x.id}"><strong>${x.date} ${x.food} ${x.amount}</strong><div class="meta"><span>${x.symptom==='あり'?'症状あり':'症状なし'}</span><span>${x.photos?.length?'📷写真あり':''}</span><span>${escapeHtml(x.detail||'')}</span></div></div>`}
function recordsScreen(){return shell('記録一覧', `<div class="toolbar"><button class="btn primary full" data-go="new-record">＋ 新しい記録</button></div><section class="card">${state.records.map(recordItem).join('')||'<div class="empty">記録がありません</div>'}</section>`, 'records')}
function foodOptions(){ return nutFoods.map(f=>`<option>${f}</option>`).join(''); }
function newRecordScreen(){return shell('摂取・症状記録', `<form id="recordForm" class="card"><div class="field"><label class="label">食べた日付</label><input class="input" name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label class="label">食べた時間</label><input class="input" name="time" type="time" value="18:00"></div><div class="field"><label class="label">食べた食材</label><select class="select" name="food">${foodOptions()}</select></div><div class="field"><label class="label">食べた量</label><input class="input" name="amount" placeholder="例：0.1g、1/8粒、少量"></div><div class="field"><label class="label">症状はありましたか？</label><div class="seg"><button type="button" class="active" data-symptom="なし">なし</button><button type="button" data-symptom="あり">あり</button></div><input type="hidden" name="symptom" value="なし"></div><div id="symptomBox" class="hidden"><div class="divider"></div>${gradeSelect('皮膚・粘膜','skin')}${gradeSelect('呼吸器','resp')}${gradeSelect('消化器','gut')}${gradeSelect('全身','all')}<div class="field"><label class="label">使用した薬</label><div class="chips"><label class="chip"><input type="checkbox" name="meds" value="抗ヒスタミン薬"> 抗ヒスタミン薬</label><label class="chip"><input type="checkbox" name="meds" value="気管支拡張薬"> 気管支拡張薬</label><label class="chip"><input type="checkbox" name="meds" value="エピペン"> エピペン</label></div></div><div class="field"><label class="label">症状写真</label><input class="input" id="photoInput" type="file" accept="image/*" capture="environment" multiple><div id="photoPreview" class="photos" style="margin-top:8px"></div></div><div class="field"><label class="label">症状が出た時間</label><input class="input" name="symptomTime" type="time"></div></div><div class="field"><label class="label">病院受診</label><select class="select" name="hospital"><option>なし</option><option>あり</option></select></div><div class="field"><label class="label">症状・メモ</label><textarea class="textarea" name="detail" placeholder="例：口の周りに赤み。30分で改善。"></textarea></div><button class="btn primary full" type="submit">保存する</button></form>`, 'records')}
function gradeSelect(label,name){return `<div class="field"><label class="label">${label}</label><select class="select" name="${name}"><option value="0">Grade 0</option><option value="1">Grade 1</option><option value="2">Grade 2</option><option value="3">Grade 3</option></select></div>`}
function recordDetailScreen(id){ const x=state.records.find(r=>r.id===id); if(!x) return shell('記録詳細','<div class="empty">見つかりません</div>','records'); return shell('記録詳細', `<section class="card"><div class="h2">${x.date} ${x.time}</div><p><strong>患者ID：</strong>${escapeHtml(state.user.patientId)}</p><p><strong>患者名：</strong>${escapeHtml(state.user.patientName)}</p><p><strong>食材：</strong>${x.food}</p><p><strong>量：</strong>${escapeHtml(x.amount)}</p><p><strong>症状：</strong>${x.symptom}</p><p><strong>Grade：</strong>皮膚${x.grades.skin} / 呼吸${x.grades.resp} / 消化器${x.grades.gut} / 全身${x.grades.all}</p><p><strong>使用薬：</strong>${x.meds?.join('、')||'なし'}</p><p><strong>病院受診：</strong>${x.hospital}</p><p><strong>メモ：</strong>${escapeHtml(x.detail||'なし')}</p><div class="photos">${(x.photos||[]).map(p=>`<img class="photo-thumb" src="${p}" alt="症状写真">`).join('')}</div></section><button class="btn full" data-go="records">一覧へ戻る</button>`, 'records')}
function calendarScreen(){ const today=new Date(); const year=today.getFullYear(); const month=today.getMonth()+1; const last=new Date(year, month, 0).getDate(); const days=Array.from({length:last},(_,i)=>i+1); return shell('カレンダー', `<section class="card"><div class="h2">${year}年${month}月</div><div class="calendar">${['月','火','水','木','金','土','日'].map(d=>`<strong>${d}</strong>`).join('')}${days.map(d=>{const rec=state.records.find(r=>Number(r.date.slice(-2))===d && Number(r.date.slice(5,7))===month); const cls=rec?(rec.symptom==='あり'?'bad':'ok'):''; return `<div class="day ${cls}" data-go="${rec?`record/${rec.id}`:'new-record'}">${d}<br>${rec?(rec.symptom==='あり'?'△':'○'):''}</div>`}).join('')}</div><div class="meta"><span>○ 症状なし</span><span>△ 症状あり</span></div></section>`, 'calendar')}
function communityScreen(){ const q=state.query.toLowerCase(); let posts=state.posts.filter(p=>(!state.tagFilter||p.tags.includes(state.tagFilter)) && (!q || p.body.toLowerCase().includes(q) || p.tags.some(t=>t.toLowerCase().includes(q)))); return shell('保護者掲示板', `<div class="notice">ナッツアレルギーの経験共有の場です。診断・治療・摂取量の判断は主治医に相談してください。</div><div class="search"><input id="communitySearch" class="input" placeholder="キーワード・#タグで検索" value="${state.query}"></div><section class="card"><div class="h2">タグで探す</div><div class="chips"><button class="chip ${!state.tagFilter?'active':''}" data-filter="">すべて</button>${recommendedTags.map(t=>`<button class="chip ${state.tagFilter===t?'active':''}" data-filter="${t}">#${t}</button>`).join('')}</div></section><button class="btn primary full" data-go="new-post">＋ 投稿する</button><section class="card">${posts.map(postItem).join('')||'<div class="empty">該当する投稿がありません</div>'}</section>`, 'community')}
function postItem(p){return `<div class="post" data-go="post/${p.id}"><div><strong>${p.author}</strong> <span class="small">${p.created}</span></div><div class="post-body">${escapeHtml(p.body)}</div><div class="chips">${p.tags.map(t=>`<span class="chip">#${t}</span>`).join('')}</div><div class="meta"><span class="like">♥ ${p.likes}</span><span>💬 ${p.comments.length}</span></div></div>`}
function newPostScreen(){return shell('新しい投稿', `<form id="postForm" class="card"><div class="field"><label class="label">相談・共有内容</label><textarea class="textarea" name="body" required placeholder="個人が特定される内容や医療判断を求める内容は避けてください。"></textarea></div><div class="field"><label class="label">タグを選択</label><div class="chips">${recommendedTags.map(t=>`<label class="chip"><input type="checkbox" name="tags" value="${t}"> #${t}</label>`).join('')}</div></div><div class="field"><label class="label">自由タグ（任意・カンマ区切り）</label><input class="input" name="freeTags" placeholder="例：給食,旅行"></div><div class="notice danger-note">子どもの顔写真・氏名・園名など、個人が特定される情報は投稿しないでください。</div><button class="btn primary full" type="submit">投稿する</button></form>`, 'community')}
function postDetailScreen(id){ const p=state.posts.find(x=>x.id===id); if(!p) return shell('投稿詳細','<div class="empty">見つかりません</div>','community'); return shell('投稿詳細', `<section class="card">${postItem(p)}<button class="btn danger" id="reportBtn">通報</button></section><section class="card"><div class="h2">コメント</div>${p.comments.map(c=>`<div class="record">${escapeHtml(c)}</div>`).join('')||'<div class="empty">コメントはまだありません</div>'}<form id="commentForm" class="field"><input class="input" name="comment" placeholder="経験共有としてコメント"><button class="btn primary full" style="margin-top:8px">送信</button></form></section>`, 'community')}
function profileScreen(){return shell('設定', `<section class="card"><div class="h2">ログインユーザ情報</div><p><strong>患者ID：</strong>${escapeHtml(state.user.patientId)}</p><p><strong>患者名：</strong>${escapeHtml(state.user.patientName)}</p><p><strong>保護者名：</strong>${escapeHtml(state.user.guardianName || '')}</p><p><strong>メール：</strong>${escapeHtml(state.user.email || '未設定')}</p><p><strong>ログイン方式：</strong>${escapeHtml(state.user.loginType || 'デモ認証')}</p></section><section class="card"><div class="h2">管理するアレルギー食品</div><div class="chips">${(state.user.allergies||nutFoods.slice(0,3)).map(f=>`<span class="chip">#${f}</span>`).join('')}</div></section><section class="card"><div class="h2">ユーザ情報の変更</div><form id="profileForm"><div class="field"><label class="label">患者ID</label><input class="input" name="patientId" value="${escapeAttr(state.user.patientId)}"></div><div class="field"><label class="label">患者名</label><input class="input" name="patientName" value="${escapeAttr(state.user.patientName)}"></div><div class="field"><label class="label">保護者名</label><input class="input" name="guardianName" value="${escapeAttr(state.user.guardianName || '')}"></div><button class="btn primary full" type="submit">保存する</button></form></section><section class="notice">本番実装では、認証済みアカウントと患者IDを紐づけて管理します。</section>`, 'profile')}

let tempPhotos=[];
function bind(){
  $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $('#logoutBtn')?.addEventListener('click',()=>{state.user=null;persist();go('login')});
  $('#loginForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); state.user={...defaultUser, patientId:fd.get('patientId'), patientName:fd.get('patientName'), guardianName:fd.get('guardianName')||'保護者', loginType:'患者IDログイン'}; persist(); go('home'); });
  $('#googleDemoLogin')?.addEventListener('click',()=>{state.user={...defaultUser, loginType:'Googleデモ認証'};persist();go('home')});
  $('#installBtn')?.addEventListener('click',async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }});
  $$('[data-filter]').forEach(b=>b.onclick=()=>{state.tagFilter=b.dataset.filter; render()});
  $('#communitySearch')?.addEventListener('input', e=>{state.query=e.target.value; render()});
  $$('[data-symptom]').forEach(b=>b.onclick=()=>{ $$('[data-symptom]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $('[name=symptom]').value=b.dataset.symptom; $('#symptomBox').classList.toggle('hidden', b.dataset.symptom==='なし'); });
  $('#photoInput')?.addEventListener('change', async e=>{ tempPhotos=[]; for(const f of e.target.files){ tempPhotos.push(await fileToDataUrl(f, 900, .72)); } $('#photoPreview').innerHTML=tempPhotos.map(p=>`<img class="photo-thumb" src="${p}" alt="症状写真">`).join(''); });
  $('#recordForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); const meds=fd.getAll('meds'); state.records.unshift({id:crypto.randomUUID(), date:fd.get('date'), time:fd.get('time'), food:fd.get('food'), amount:fd.get('amount'), symptom:fd.get('symptom'), grades:{skin:fd.get('skin')||'0',resp:fd.get('resp')||'0',gut:fd.get('gut')||'0',all:fd.get('all')||'0'}, meds, hospital:fd.get('hospital'), detail:fd.get('detail'), symptomTime:fd.get('symptomTime'), photos:tempPhotos}); tempPhotos=[]; persist(); go('records'); });
  $('#postForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); const selected=fd.getAll('tags'); const free=(fd.get('freeTags')||'').split(',').map(s=>s.trim().replace(/^#/, '')).filter(Boolean).slice(0,3); const tags=[...new Set([...selected,...free])].slice(0,6); state.posts.unshift({id:crypto.randomUUID(), author:'匿名の保護者', body:fd.get('body'), tags:tags.length?tags:['相談'], likes:0, comments:[], created:new Date().toISOString().slice(0,10)}); persist(); go('community'); });
  $('#commentForm')?.addEventListener('submit', e=>{ e.preventDefault(); const id=route().split('/')[1]; const p=state.posts.find(x=>x.id===id); const c=new FormData(e.target).get('comment'); if(p&&c){p.comments.push(c); persist(); render();} });
  $('#profileForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); state.user={...state.user, patientId:fd.get('patientId'), patientName:fd.get('patientName'), guardianName:fd.get('guardianName')}; persist(); render(); });
  $('#reportBtn')?.addEventListener('click',()=>alert('通報を受け付けました（デモ）。本番では管理者レビューへ送信します。'));
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function escapeAttr(s){return escapeHtml(s).replace(/`/g,'&#96;');}
function fileToDataUrl(file,max=900,quality=.75){return new Promise((resolve)=>{ const img=new Image(); const reader=new FileReader(); reader.onload=()=>{img.onload=()=>{ const scale=Math.min(1,max/Math.max(img.width,img.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',quality));}; img.src=reader.result;}; reader.readAsDataURL(file); });}
render();
