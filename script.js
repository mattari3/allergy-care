const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
};

const nutFoods = ['ピーナッツ','カシューナッツ','くるみ','ヘーゼルナッツ','マカダミアナッツ','その他'];
const foodIcons = {
  'ピーナッツ':'🥜',
  'カシューナッツ':'🌙',
  'くるみ':'🟤',
  'ヘーゼルナッツ':'🌰',
  'マカダミアナッツ':'⚪',
  'その他':'🍽️'
};

const defaultUser = {
  loginType: 'デモ認証',
  email: 'demo@example.com',
  patientId: 'NUTS-0001',
  patientName: '山田 みどり',
  guardianName: '保護者',
  allergies: ['ピーナッツ','カシューナッツ','くるみ','ヘーゼルナッツ','マカダミアナッツ','その他']
};

const state = {
  user: store.get('allergy_user_v3', null) || store.get('allergy_user_v2', null),
  records: store.get('allergy_records_v3', null) || store.get('allergy_records_v2', [
    {id:crypto.randomUUID(), date:'2026-05-11', time:'18:30', food:'ピーナッツ', otherFood:'', amount:'0.2g', symptom:'なし', grades:{skin:'0',resp:'0',gut:'0',all:'0'}, meds:[], hospital:'なし', detail:'問題なく摂取できました。', symptomTime:'', photos:[]},
    {id:crypto.randomUUID(), date:'2026-05-10', time:'17:40', food:'カシューナッツ', otherFood:'', amount:'0.1g', symptom:'あり', grades:{skin:'1',resp:'0',gut:'0',all:'0'}, meds:['抗ヒスタミン薬'], hospital:'なし', detail:'口の周りに軽い赤み。30分程度で改善。', symptomTime:'18:05', photos:[]},
    {id:crypto.randomUUID(), date:'2026-05-09', time:'18:00', food:'くるみ', otherFood:'', amount:'0.1g', symptom:'なし', grades:{skin:'0',resp:'0',gut:'0',all:'0'}, meds:[], hospital:'なし', detail:'症状なし。', symptomTime:'', photos:[]}
  ])
};

function persist(){
  store.set('allergy_records_v3', state.records);
  store.set('allergy_user_v3', state.user);
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
  const items=[['home','🏠','ホーム'],['records','📝','記録'],['calendar','📅','カレンダー'],['profile','👤','設定']];
  return `<nav class="bottom-nav">${items.map(([r,i,t])=>`<button class="nav-item ${active===r?'active':''}" data-go="${r}"><span class="icon">${i}</span><span>${t}</span></button>`).join('')}</nav>`;
}

function render(){
  const r=route();
  if(!state.user && r!=='login') return go('login');
  const app=$('#app');
  if(r==='login') app.innerHTML=loginScreen();
  else if(r==='home') app.innerHTML=homeScreen();
  else if(r==='records') app.innerHTML=recordsScreen();
  else if(r==='new-record') app.innerHTML=recordFormScreen();
  else if(r.startsWith('edit-record/')) app.innerHTML=recordFormScreen(r.split('/')[1]);
  else if(r.startsWith('record/')) app.innerHTML=recordDetailScreen(r.split('/')[1]);
  else if(r==='calendar') app.innerHTML=calendarScreen();
  else if(r==='profile') app.innerHTML=profileScreen();
  else app.innerHTML=homeScreen();
  bind();
}

function loginScreen(){return `<main class="screen login"><section class="card hero" style="width:100%"><div class="logo">🥜</div><div class="h1">ナッツアレルギー記録</div><p class="small">患者ID・患者名を使ってログインし、ナッツ系食品の摂取量・症状・写真を記録します。</p><form id="loginForm"><div class="field"><label class="label">患者ID</label><input class="input" name="patientId" required placeholder="例：NUTS-0001" value="NUTS-0001"></div><div class="field"><label class="label">患者名</label><input class="input" name="patientName" required placeholder="例：山田 みどり" value="山田 みどり"></div><div class="field"><label class="label">保護者名</label><input class="input" name="guardianName" placeholder="例：保護者" value="保護者"></div><button class="btn primary full" type="submit">ログイン</button></form><button class="btn full" id="googleDemoLogin" style="margin-top:10px">Googleでログイン（デモ）</button><div class="notice" style="margin-top:14px">本デモは端末内保存です。本番ではFirebase Authentication、Firestore、Storageへ接続します。</div></section></main>`}

function homeScreen(){
  const latest=state.records.slice(0,3).map(recordItem).join('')||'<div class="empty">まだ記録がありません</div>';
  return shell('ホーム', `<section class="card hero"><div class="h1">こんにちは、${escapeHtml(state.user.patientName)}さん</div><p>ナッツ系食品の摂取・症状を記録できます。</p><button class="btn primary full" data-go="new-record">＋ 新しい記録</button></section><section class="notice danger-note">このアプリは記録補助を目的とします。診断・治療・摂取量の判断は必ず主治医に相談してください。</section><section class="card"><div class="h2">最近の記録</div>${latest}</section><button id="installBtn" class="btn full install">ホーム画面に追加</button>`, 'home')
}

function displayFood(x){ return x.food === 'その他' && x.otherFood ? x.otherFood : x.food; }
function iconFor(food){ return foodIcons[food] || foodIcons['その他']; }
function recordItem(x){return `<div class="record" data-go="record/${x.id}"><strong>${x.date} ${iconFor(x.food)} ${escapeHtml(displayFood(x))} ${escapeHtml(x.amount)}</strong><div class="meta"><span>${x.symptom==='あり'?'症状あり':'症状なし'}</span><span>${x.photos?.length?'📷写真あり':''}</span><span>${escapeHtml(x.detail||'')}</span></div></div>`}
function recordsScreen(){return shell('記録一覧', `<div class="toolbar"><button class="btn primary full" data-go="new-record">＋ 新しい記録</button></div><section class="card">${state.records.map(recordItem).join('')||'<div class="empty">記録がありません</div>'}</section>`, 'records')}
function foodOptions(selected=''){ return nutFoods.map(f=>`<option ${selected===f?'selected':''}>${f}</option>`).join(''); }
function gradeSelect(label,name,val='0'){return `<div class="field"><label class="label">${label}</label><select class="select" name="${name}"><option value="0" ${val==='0'?'selected':''}>Grade 0</option><option value="1" ${val==='1'?'selected':''}>Grade 1</option><option value="2" ${val==='2'?'selected':''}>Grade 2</option><option value="3" ${val==='3'?'selected':''}>Grade 3</option></select></div>`}
function checked(arr, val){ return (arr||[]).includes(val) ? 'checked' : ''; }
function recordFormScreen(id=null){
  const x = id ? state.records.find(r=>r.id===id) : null;
  const isEdit = Boolean(x);
  const rec = x || {date:new Date().toISOString().slice(0,10), time:'18:00', food:'ピーナッツ', otherFood:'', amount:'', symptom:'なし', grades:{skin:'0',resp:'0',gut:'0',all:'0'}, meds:[], hospital:'なし', detail:'', symptomTime:'', photos:[]};
  tempPhotos = [...(rec.photos||[])];
  return shell(isEdit?'詳細記録の編集':'摂取・症状記録', `<form id="recordForm" data-id="${id||''}" class="card"><div class="field"><label class="label">食べた日付</label><input class="input" name="date" type="date" required value="${escapeAttr(rec.date)}"></div><div class="field"><label class="label">食べた時間</label><input class="input" name="time" type="time" value="${escapeAttr(rec.time||'')}"></div><div class="field"><label class="label">食べた食材</label><select class="select" name="food" id="foodSelect">${foodOptions(rec.food)}</select></div><div class="field ${rec.food==='その他'?'':'hidden'}" id="otherFoodField"><label class="label">その他の食材名</label><input class="input" name="otherFood" placeholder="例：ピーカンナッツ" value="${escapeAttr(rec.otherFood||'')}"></div><div class="field"><label class="label">食べた量</label><input class="input" name="amount" placeholder="例：0.1g、1/8粒、少量" value="${escapeAttr(rec.amount||'')}"></div><div class="field"><label class="label">症状はありましたか？</label><div class="seg"><button type="button" class="${rec.symptom==='なし'?'active':''}" data-symptom="なし">なし</button><button type="button" class="${rec.symptom==='あり'?'active':''}" data-symptom="あり">あり</button></div><input type="hidden" name="symptom" value="${escapeAttr(rec.symptom)}"></div><div id="symptomBox" class="${rec.symptom==='あり'?'':'hidden'}"><div class="divider"></div>${gradeSelect('皮膚・粘膜','skin',rec.grades?.skin||'0')}${gradeSelect('呼吸器','resp',rec.grades?.resp||'0')}${gradeSelect('消化器','gut',rec.grades?.gut||'0')}${gradeSelect('全身','all',rec.grades?.all||'0')}<div class="field"><label class="label">使用した薬</label><div class="chips"><label class="chip"><input type="checkbox" name="meds" value="抗ヒスタミン薬" ${checked(rec.meds,'抗ヒスタミン薬')}> 抗ヒスタミン薬</label><label class="chip"><input type="checkbox" name="meds" value="気管支拡張薬" ${checked(rec.meds,'気管支拡張薬')}> 気管支拡張薬</label><label class="chip"><input type="checkbox" name="meds" value="エピペン" ${checked(rec.meds,'エピペン')}> エピペン</label></div></div><div class="field"><label class="label">症状写真</label><input class="input" id="photoInput" type="file" accept="image/*" capture="environment" multiple><div id="photoPreview" class="photos" style="margin-top:8px">${tempPhotos.map(p=>`<img class="photo-thumb" src="${p}" alt="症状写真">`).join('')}</div></div><div class="field"><label class="label">症状が出た時間</label><input class="input" name="symptomTime" type="time" value="${escapeAttr(rec.symptomTime||'')}"></div></div><div class="field"><label class="label">病院受診</label><select class="select" name="hospital"><option ${rec.hospital==='なし'?'selected':''}>なし</option><option ${rec.hospital==='あり'?'selected':''}>あり</option></select></div><div class="field"><label class="label">症状・メモ</label><textarea class="textarea" name="detail" placeholder="例：口の周りに赤み。30分で改善。">${escapeHtml(rec.detail||'')}</textarea></div><button class="btn primary full" type="submit">${isEdit?'更新する':'保存する'}</button>${isEdit?`<button class="btn danger full" type="button" id="deleteRecordBtn" style="margin-top:10px">この記録を削除</button>`:''}</form>`, 'records')
}

function recordDetailScreen(id){
  const x=state.records.find(r=>r.id===id);
  if(!x) return shell('記録詳細','<div class="empty">見つかりません</div>','records');
  return shell('記録詳細', `<section class="card"><div class="h2">${x.date} ${x.time||''}</div><p><strong>患者ID：</strong>${escapeHtml(state.user.patientId)}</p><p><strong>患者名：</strong>${escapeHtml(state.user.patientName)}</p><p><strong>食材：</strong>${iconFor(x.food)} ${escapeHtml(displayFood(x))}</p><p><strong>量：</strong>${escapeHtml(x.amount)}</p><p><strong>症状：</strong>${x.symptom}</p><p><strong>Grade：</strong>皮膚${x.grades?.skin||'0'} / 呼吸${x.grades?.resp||'0'} / 消化器${x.grades?.gut||'0'} / 全身${x.grades?.all||'0'}</p><p><strong>使用薬：</strong>${x.meds?.join('、')||'なし'}</p><p><strong>病院受診：</strong>${x.hospital}</p><p><strong>症状が出た時間：</strong>${x.symptomTime||'なし'}</p><p><strong>メモ：</strong>${escapeHtml(x.detail||'なし')}</p><div class="photos">${(x.photos||[]).map(p=>`<img class="photo-thumb" src="${p}" alt="症状写真">`).join('')}</div></section><div class="grid2"><button class="btn" data-go="records">一覧へ戻る</button><button class="btn primary" data-go="edit-record/${x.id}">編集する</button></div><button class="btn danger full" id="deleteRecordBtn" data-id="${x.id}" style="margin-top:10px">削除する</button>`, 'records')
}
function calendarScreen(){
  const today=new Date(); const year=today.getFullYear(); const month=today.getMonth()+1;
  const firstDow = (new Date(year, month-1, 1).getDay()+6)%7;
  const last=new Date(year, month, 0).getDate();
  const blanks=Array.from({length:firstDow},()=>'<div class="day empty-day"></div>').join('');
  const days=Array.from({length:last},(_,i)=>i+1);
  return shell('カレンダー', `<section class="card"><div class="h2">${year}年${month}月</div><div class="calendar">${['月','火','水','木','金','土','日'].map(d=>`<strong>${d}</strong>`).join('')}${blanks}${days.map(d=>{const dayRecords=state.records.filter(r=>Number(r.date.slice(-2))===d && Number(r.date.slice(5,7))===month && Number(r.date.slice(0,4))===year); const cls=dayRecords.some(r=>r.symptom==='あり')?'bad':(dayRecords.length?'ok':''); const icons=dayRecords.slice(0,3).map(r=>`<span class="food-icon" title="${escapeAttr(displayFood(r))}">${iconFor(r.food)}</span>`).join(''); const more=dayRecords.length>3?`<span class="food-icon">+${dayRecords.length-3}</span>`:''; const dest=dayRecords[0]?`record/${dayRecords[0].id}`:'new-record'; return `<div class="day ${cls}" data-go="${dest}"><div>${d}</div><div class="day-icons">${icons}${more}</div></div>`}).join('')}</div><div class="legend"><span>🥜 ピーナッツ</span><span>🌙 カシューナッツ</span><span>🟤 くるみ</span><span>🌰 ヘーゼルナッツ</span><span>⚪ マカダミアナッツ</span><span>🍽️ その他</span></div><div class="meta"><span>背景緑：症状なし</span><span>背景赤：症状あり</span></div></section>`, 'calendar')
}
function profileScreen(){return shell('設定', `<section class="card"><div class="h2">ログインユーザ情報</div><p><strong>患者ID：</strong>${escapeHtml(state.user.patientId)}</p><p><strong>患者名：</strong>${escapeHtml(state.user.patientName)}</p><p><strong>保護者名：</strong>${escapeHtml(state.user.guardianName || '')}</p><p><strong>メール：</strong>${escapeHtml(state.user.email || '未設定')}</p><p><strong>ログイン方式：</strong>${escapeHtml(state.user.loginType || 'デモ認証')}</p></section><section class="card"><div class="h2">管理するアレルギー食品</div><div class="chips">${nutFoods.map(f=>`<span class="chip">${foodIcons[f]} ${f}</span>`).join('')}</div></section><section class="card"><div class="h2">ユーザ情報の変更</div><form id="profileForm"><div class="field"><label class="label">患者ID</label><input class="input" name="patientId" value="${escapeAttr(state.user.patientId)}"></div><div class="field"><label class="label">患者名</label><input class="input" name="patientName" value="${escapeAttr(state.user.patientName)}"></div><div class="field"><label class="label">保護者名</label><input class="input" name="guardianName" value="${escapeAttr(state.user.guardianName || '')}"></div><button class="btn primary full" type="submit">保存する</button></form></section><section class="notice">本番実装では、認証済みアカウントと患者IDを紐づけて管理します。</section>`, 'profile')}

let tempPhotos=[];
function bind(){
  $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $('#logoutBtn')?.addEventListener('click',()=>{state.user=null;persist();go('login')});
  $('#loginForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); state.user={...defaultUser, patientId:fd.get('patientId'), patientName:fd.get('patientName'), guardianName:fd.get('guardianName')||'保護者', loginType:'患者IDログイン'}; persist(); go('home'); });
  $('#googleDemoLogin')?.addEventListener('click',()=>{state.user={...defaultUser, loginType:'Googleデモ認証'};persist();go('home')});
  $('#installBtn')?.addEventListener('click',async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }});
  $('#foodSelect')?.addEventListener('change', e=>{ $('#otherFoodField')?.classList.toggle('hidden', e.target.value !== 'その他'); });
  $$('[data-symptom]').forEach(b=>b.onclick=()=>{ $$('[data-symptom]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $('[name=symptom]').value=b.dataset.symptom; $('#symptomBox').classList.toggle('hidden', b.dataset.symptom==='なし'); });
  $('#photoInput')?.addEventListener('change', async e=>{ tempPhotos=[]; for(const f of e.target.files){ tempPhotos.push(await fileToDataUrl(f, 900, .72)); } $('#photoPreview').innerHTML=tempPhotos.map(p=>`<img class="photo-thumb" src="${p}" alt="症状写真">`).join(''); });
  $('#recordForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); const id=e.target.dataset.id; const meds=fd.getAll('meds'); const data={id:id || crypto.randomUUID(), date:fd.get('date'), time:fd.get('time'), food:fd.get('food'), otherFood:fd.get('food')==='その他' ? fd.get('otherFood') : '', amount:fd.get('amount'), symptom:fd.get('symptom'), grades:{skin:fd.get('skin')||'0',resp:fd.get('resp')||'0',gut:fd.get('gut')||'0',all:fd.get('all')||'0'}, meds, hospital:fd.get('hospital'), detail:fd.get('detail'), symptomTime:fd.get('symptomTime'), photos:tempPhotos}; if(id){ const i=state.records.findIndex(r=>r.id===id); if(i>=0) state.records[i]=data; } else { state.records.unshift(data); } tempPhotos=[]; persist(); go(`record/${data.id}`); });
  $('#deleteRecordBtn')?.addEventListener('click', e=>{ const id=e.currentTarget.dataset.id || $('#recordForm')?.dataset.id; if(!id) return; if(confirm('この記録を削除しますか？')){ state.records=state.records.filter(r=>r.id!==id); persist(); go('records'); } });
  $('#profileForm')?.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(e.target); state.user={...state.user, patientId:fd.get('patientId'), patientName:fd.get('patientName'), guardianName:fd.get('guardianName')}; persist(); render(); });
}
function escapeHtml(s){return String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function escapeAttr(s){return escapeHtml(s).replace(/`/g,'&#96;');}
function fileToDataUrl(file,max=900,quality=.75){return new Promise((resolve)=>{ const img=new Image(); const reader=new FileReader(); reader.onload=()=>{img.onload=()=>{ const scale=Math.min(1,max/Math.max(img.width,img.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',quality));}; img.src=reader.result;}; reader.readAsDataURL(file); });}
render();
