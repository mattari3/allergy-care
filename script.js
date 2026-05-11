/*
  Googleログインを本番で使う場合：
  1) FirebaseでWebアプリを作成
  2) Authentication > Google を有効化
  3) Firestore を有効化
  4) 下の firebaseConfig を自分の値に置換
  5) GitHub Pages のドメインを Firebase Authentication の承認済みドメインに追加
*/
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

let fbApp=null, auth=null, db=null;
const firebaseEnabled = !firebaseConfig.apiKey.startsWith('YOUR_');
if(firebaseEnabled){
  fbApp = initializeApp(firebaseConfig);
  auth = getAuth(fbApp);
  db = getFirestore(fbApp);
}

const app=document.getElementById('app');
const ALLERGY_FOODS=[
  {name:'卵',icon:'🥚',unit:'g'},
  {name:'牛乳',icon:'🥛',unit:'ml'},
  {name:'くるみ',icon:'🧠',unit:'g'},
  {name:'小麦',icon:'🌾',unit:'g'},
  {name:'ピーナッツ',icon:'🥜',unit:'g'},
  {name:'カシューナッツ',icon:'🌙',unit:'g'},
  {name:'えび',icon:'🦐',unit:'g'},
  {name:'そば',icon:'🍜',unit:'g'},
  {name:'かに',icon:'🦀',unit:'g'}
];
const BAR_EXCLUDED=['かに'];
let state={page:'home',detailId:null,period:'30',food:'くるみ',editingId:null,shareSearch:'',shareTag:''};
let user=null;
let records=[
{id:1,date:'2026-05-11',time:'18:30',food:'卵',amount:5,unit:'g',symptom:true,skin:1,resp:0,digest:0,whole:0,detail:'口の周りに赤み。30分程度で改善。',med:'抗ヒスタミン薬',hospital:'なし',photoData:''},
{id:2,date:'2026-05-10',time:'12:20',food:'牛乳',amount:80,unit:'ml',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'問題なく摂取できました。',med:'なし',hospital:'なし',photoData:''},
{id:3,date:'2026-05-09',time:'18:00',food:'くるみ',amount:3,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photoData:''},
{id:4,date:'2026-05-08',time:'18:00',food:'ピーナッツ',amount:1,unit:'g',symptom:true,skin:0,resp:1,digest:0,whole:0,detail:'軽い咳がありました。',med:'なし',hospital:'なし',photoData:''},
{id:5,date:'2026-05-07',time:'12:10',food:'くるみ',amount:2,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photoData:''},
{id:6,date:'2026-05-06',time:'07:30',food:'小麦',amount:20,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'問題なし。',med:'なし',hospital:'なし',photoData:''},
{id:7,date:'2026-05-05',time:'18:00',food:'くるみ',amount:1,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photoData:''},
{id:8,date:'2026-05-04',time:'13:00',food:'カシューナッツ',amount:0.5,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photoData:''},
{id:9,date:'2026-05-03',time:'08:10',food:'牛乳',amount:60,unit:'ml',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photoData:''},
{id:10,date:'2026-05-02',time:'18:00',food:'えび',amount:2,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photoData:''},
{id:11,date:'2026-05-01',time:'18:00',food:'そば',amount:5,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photoData:''},
{id:12,date:'2026-04-29',time:'18:00',food:'かに',amount:2,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'記録対象。',med:'なし',hospital:'なし',photoData:''},
{id:13,date:'2026-05-11',time:'08:00',food:'りんご',amount:20,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'その他食材の表示例。',med:'なし',hospital:'なし',photoData:''}
];
let shares=[
 {id:1,body:'卵を少量ずつ続けています。外食時の原材料確認が一番大変です。 #卵アレルギー #外食 #少量摂取',author:'保護者A',created:'2026-05-10 20:31'},
 {id:2,body:'保育園にエピペンを預ける説明資料を作りました。先生方と共有すると安心感が増えました。 #エピペン #保育園 #アナフィラキシー',author:'保護者B',created:'2026-05-09 12:10'},
 {id:3,body:'くるみの摂取記録をカレンダーで見返すと、症状の出た日が整理しやすかったです。 #くるみ #記録 #カレンダー',author:'保護者C',created:'2026-05-08 18:05'}
];

function save(){try{localStorage.setItem('allergy_records_v4',JSON.stringify(records));localStorage.setItem('allergy_shares_v4',JSON.stringify(shares));}catch(e){}}
function load(){try{const r=localStorage.getItem('allergy_records_v4');if(r)records=JSON.parse(r);const s=localStorage.getItem('allergy_shares_v4');if(s)shares=JSON.parse(s);}catch(e){}}
load();
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function foodObj(name){return ALLERGY_FOODS.find(f=>f.name===name)||{name:name,icon:'🍽️',unit:'g'};}
function nav(page){state.page=page;state.editingId=null;if(page!=='detail')state.detailId=null;render();window.scrollTo(0,0);} window.nav=nav;
function openDetail(id){state.page='detail';state.detailId=id;state.editingId=null;render();window.scrollTo(0,0);} window.openDetail=openDetail;
function wrap(x){return '<main class="phone">'+x+'</main>';}
function header(title,sub,back){return '<div class="top">'+(back?'<button class="iconbtn" onclick="nav(\''+back+'\')">‹</button>':'<img src="./assets/icon-192.png" class="appicon" alt="">')+'<div class="headtext"><div class="title">'+h(title)+'</div><div class="sub">'+h(sub||'')+'</div></div>'+authButton()+'</div>';}
function authButton(){if(!firebaseEnabled)return '<button class="pillbtn" onclick="nav(\'settings\')">設定</button>';if(user)return '<button class="pillbtn" onclick="logout()">ログアウト</button>';return '<button class="pillbtn" onclick="loginGoogle()">Google</button>';}
function bottom(){const items=[['home','🏠','ホーム'],['newRecord','✍️','記録'],['calendar','📅','カレンダー'],['summary','📊','サマリー'],['share','💬','共有']];let s='<div class="bottom">';items.forEach(it=>{s+='<button class="nav '+(state.page===it[0]?'active':'')+'" onclick="nav(\''+it[0]+'\')"><span>'+it[1]+'</span>'+it[2]+'</button>';});return s+'</div>';}
function latest(n){return records.slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,n||5);}
function weekRange(){const end=new Date('2026-05-11');const day=end.getDay();const diff=(day===0?6:day-1);const start=new Date(end);start.setDate(end.getDate()-diff);return {start,end};}
function fmt(d){return d.toISOString().slice(0,10);}
function weeklyStatus(){const wr=weekRange();let days={};records.forEach(r=>{const d=new Date(r.date);if(d>=wr.start&&d<=wr.end)days[r.date]=true;});const count=Object.keys(days).length;return {count,remain:Math.max(0,3-count),start:fmt(wr.start).slice(5).replace('-','/'),end:fmt(wr.end).slice(5).replace('-','/')};}
function home(){const w=weeklyStatus();let s=header('アレルギー記録',user?'ログイン中：'+(user.displayName||user.email):'主要9食材＋その他を記録');s+='<div class="content"><div class="card hero"><h2>今週の摂取状況</h2><p>目標：週3回以上の摂取</p><div class="goal"><b>'+w.count+'/3回</b><span>'+(w.count>=3?'達成！':'あと'+w.remain+'回')+'</span></div><div class="progress"><i style="width:'+Math.min(100,w.count/3*100)+'%"></i></div><button class="primary full" onclick="nav(\'newRecord\')">＋ 摂取記録を追加</button></div>';
s+='<div class="card"><div class="section-title">最近の記録</div>'+recordList(latest(4))+'</div></div>'+bottom();return wrap(s);}
function foodSelector(){let s='<div class="selector"><label>表示食材</label><select onchange="state.food=this.value;render()">';ALLERGY_FOODS.forEach(f=>{s+='<option value="'+f.name+'" '+(state.food===f.name?'selected':'')+'>'+f.icon+' '+f.name+'</option>';});return s+'</select></div>';}
function intakeTrend(food){return records.filter(r=>r.food===food).sort((a,b)=>a.date.localeCompare(b.date)).slice(-8);}
function lineChart(data){if(!data.length)return '<div class="empty">記録がありません</div>';let max=Math.max(...data.map(r=>Number(r.amount)||0)); if(max<=0)max=1;const pts=data.map((r,i)=>{const x=data.length===1?50:10+(i*(80/(data.length-1)));const y=85-((Number(r.amount)||0)/max*65);return {x,y,r};});const poly=pts.map(p=>p.x+','+p.y).join(' ');let s='<svg class="linechart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="'+poly+'" fill="none" stroke="currentColor" stroke-width="2.5"/>';pts.forEach(p=>{s+='<circle cx="'+p.x+'" cy="'+p.y+'" r="2.3" fill="currentColor"/>';});s+='</svg><div class="axis">';pts.forEach(p=>{s+='<span><b>'+h(p.r.date.slice(5).replace('-','/'))+'</b><em>'+h(p.r.amount)+h(p.r.unit)+'</em></span>';});return s+'</div>';}
function summaryCounts(){let map={};records.forEach(r=>{if(BAR_EXCLUDED.includes(r.food))return;map[r.food]=(map[r.food]||0)+1;});return ALLERGY_FOODS.filter(f=>!BAR_EXCLUDED.includes(f.name)).map(f=>({label:f.icon+' '+f.name,value:map[f.name]||0}));}
function barChart(data){let max=Math.max(...data.map(d=>d.value)); if(max<=0)max=1;let s='<div class="hbars">';data.forEach(d=>{s+='<div class="hbar"><b>'+h(d.label)+'</b><div><i style="width:'+Math.round(d.value/max*100)+'%"></i></div><em>'+d.value+'回</em></div>';});return s+'</div>';}
function recordList(arr){let s='';arr.forEach(r=>{const f=foodObj(r.food);s+='<div class="record" onclick="openDetail('+r.id+')"><h3>'+f.icon+' '+h(r.date)+' '+h(r.food)+' '+h(r.amount)+h(r.unit)+' <span class="right">›</span></h3><div>'+(r.symptom?'<span class="danger">症状あり</span>':'<span class="safe">症状なし</span>')+'</div><div class="muted">'+h(r.detail)+'</div></div>';});return s||'<div class="empty">記録がありません</div>';}
function foodOptions(selected){let s='';ALLERGY_FOODS.forEach(f=>{s+='<option value="'+f.name+'" '+(selected===f.name?'selected':'')+'>'+f.icon+' '+f.name+'</option>';});s+='<option value="その他" '+(!ALLERGY_FOODS.some(f=>f.name===selected)?'selected':'')+'>その他</option>';return s;}
function newRecord(){return recordForm(null,'摂取記録を入力','home');}
function recordForm(r,title,back){const isEdit=!!r;const foodIsOther=isEdit&&!ALLERGY_FOODS.some(f=>f.name===r.food);let s=header(title,'',back);s+='<div class="content"><div class="card form"><label>食べた日時</label><input id="date" type="date" value="'+h(r?.date||'2026-05-11')+'"><input id="time" type="time" value="'+h(r?.time||'18:30')+'"><label>食べた食材</label><select id="food" onchange="toggleOtherFood();syncUnit()">'+foodOptions(r?.food||'卵')+'</select><div id="otherFoodBox" class="'+(foodIsOther?'':'hidden')+'"><label>その他の食材名</label><input id="otherFood" placeholder="例：りんご" value="'+h(foodIsOther?r.food:'')+'"></div><label>食べた量</label><div class="grid2"><input id="amount" type="number" step="0.1" value="'+h(r?.amount||1)+'"><select id="unit"><option '+((r?.unit||'g')==='g'?'selected':'')+'>g</option><option '+((r?.unit||'g')==='ml'?'selected':'')+'>ml</option><option '+((r?.unit||'g')==='個'?'selected':'')+'>個</option></select></div><label>画像</label><input id="photo" type="file" accept="image/*"><div id="photoPreview">'+(r?.photoData?'<img class="photo" src="'+r.photoData+'" alt="投稿画像">':'')+'</div><label>症状はありましたか？</label><div class="seg"><button id="noBtn" class="'+(!r?.symptom?'on':'')+'" onclick="setSym(false)">😊 なし</button><button id="yesBtn" class="'+(r?.symptom?'bad':'')+'" onclick="setSym(true)">😟 あり</button></div><div id="symArea" class="'+(r?.symptom?'':'hidden')+'">'+grade('皮膚・粘膜','skin',r?.skin)+grade('呼吸器','resp',r?.resp)+grade('消化器','digest',r?.digest)+grade('全身','whole',r?.whole)+'<label>使用した薬</label><input id="med" value="'+h(r?.med||'')+'" placeholder="例：抗ヒスタミン薬"><label>症状の詳細</label><textarea id="detail" placeholder="例：口の周りに赤み">'+h(r?.detail||'')+'</textarea></div><button class="primary full" onclick="saveRecord('+(isEdit?r.id:'null')+')">'+(isEdit?'更新する':'保存する')+'</button></div></div>'+bottom();return wrap(s);}
function grade(label,id,v=0){let s='<div class="grade"><b>'+label+'</b><select id="'+id+'">';[0,1,2,3].forEach(n=>s+='<option value="'+n+'" '+(Number(v)===n?'selected':'')+'>Grade '+n+'</option>');return s+'</select></div>';}
window.toggleOtherFood=function(){document.getElementById('otherFoodBox').className=val('food')==='その他'?'':'hidden';};
window.syncUnit=function(){const f=foodObj(val('food'));document.getElementById('unit').value=f.unit;};
window.setSym=function(v){document.getElementById('symArea').className=v?'':'hidden';document.getElementById('noBtn').className=v?'':'on';document.getElementById('yesBtn').className=v?'bad':'';};
async function getPhotoData(){const input=document.getElementById('photo');if(!input||!input.files||!input.files[0])return '';const file=input.files[0];return await new Promise(res=>{const reader=new FileReader();reader.onload=e=>res(e.target.result);reader.readAsDataURL(file);});}
window.saveRecord=async function(id){const sym=document.getElementById('yesBtn').className.includes('bad');let food=val('food');if(food==='その他')food=val('otherFood').trim()||'その他';let old=id?records.find(x=>x.id===id):null;const photoData=await getPhotoData() || old?.photoData || '';const rec={id:id||Date.now(),date:val('date'),time:val('time'),food,amount:Number(val('amount')),unit:val('unit'),symptom:sym,skin:Number(val('skin')||0),resp:Number(val('resp')||0),digest:Number(val('digest')||0),whole:Number(val('whole')||0),detail:val('detail')||'記録しました。',med:val('med')||'なし',hospital:'なし',photoData};if(id){records=records.map(x=>x.id===id?rec:x);}else{records.push(rec);}save();openDetail(rec.id);};
function val(id){const el=document.getElementById(id);return el?el.value:'';}
function calendarPage(){let s=header('カレンダー','日付タップで詳細へ');s+='<div class="content"><div class="card"><div class="link-card"><button class="iconbtn">‹</button><div class="section-title">2026年5月</div><button class="iconbtn">›</button></div><table class="calendar"><thead><tr>';['月','火','水','木','金','土','日'].forEach(d=>{s+='<th>'+d+'</th>';});s+='</tr></thead><tbody>';let day=1;for(let w=0;w<5;w++){s+='<tr>';for(let c=0;c<7;c++){if((w===0&&c<4)||day>31){s+='<td></td>';continue;}const ds='2026-05-'+(day<10?'0'+day:day);const rs=records.filter(r=>r.date===ds);s+='<td class="'+(rs.length?'has':'')+'" '+(rs[0]?'onclick="openDetail('+rs[0].id+')"':'')+'><b>'+day+'</b><div class="icons">';rs.slice(0,4).forEach(r=>{s+='<span title="'+h(r.food)+'">'+foodObj(r.food).icon+'</span>';});s+='</div></td>';day++;}s+='</tr>';}s+='</tbody></table><div class="legend">';ALLERGY_FOODS.forEach(f=>{s+='<span>'+f.icon+' '+f.name+'</span>';});s+='<span>🍽️ その他</span></div></div></div>'+bottom();return wrap(s);}
function detailPage(){const r=records.find(x=>x.id===state.detailId);if(!r)return wrap(header('記録詳細','','home')+'<div class="content empty">記録がありません</div>'+bottom());if(state.editingId===r.id)return recordForm(r,'記録を編集','detail');let s=header('記録の詳細','', 'home');s+='<div class="content"><div class="card"><h2>'+foodObj(r.food).icon+' '+h(r.date)+' '+h(r.time)+'</h2>'+detailRow('食材',r.food)+detailRow('量',r.amount+r.unit)+detailRow('症状',r.symptom?'あり':'なし')+detailRow('最大Grade',Math.max(r.skin,r.resp,r.digest,r.whole))+detailRow('使用した薬',r.med)+detailRow('症状の詳細',r.detail)+(r.photoData?'<img class="photo" src="'+r.photoData+'" alt="投稿画像">':'')+'<div class="actions"><button class="secondary" onclick="editRecord('+r.id+')">編集</button><button class="dangerbtn" onclick="deleteRecord('+r.id+')">削除</button></div></div></div>'+bottom();return wrap(s);}
function detailRow(k,v){return '<div class="detail-row"><b>'+h(k)+'</b><span>'+h(v)+'</span></div>';}
window.editRecord=function(id){state.editingId=id;render();window.scrollTo(0,0);};
window.deleteRecord=function(id){if(!confirm('この記録を削除しますか？'))return;records=records.filter(r=>r.id!==id);save();nav('home');};
function summaryPage(){const w=weeklyStatus();let s=header('サマリー','グラフで確認');s+='<div class="content"><div class="card"><div class="section-title">週3回摂取の達成状況</div><div class="goal"><b>'+w.count+'/3回</b><span>'+(w.count>=3?'達成！':'あと'+w.remain+'回')+'</span></div><div class="progress"><i style="width:'+Math.min(100,w.count/3*100)+'%"></i></div></div>';
s+='<div class="card">'+foodSelector()+'<div class="section-title">食材別 摂取量推移グラフ</div>'+lineChart(intakeTrend(state.food))+'</div>';
s+='<div class="card"><div class="section-title">食材別サマリーグラフ</div>'+barChart(summaryCounts())+'</div></div>'+bottom();return wrap(s);}
function hashtags(text){return [...new Set((text.match(/#[\p{L}\p{N}_一-龠ぁ-んァ-ヶー]+/gu)||[]))];}
function sharePage(){let s=header('悩み共有','ハッシュタグで検索・閲覧');s+='<div class="content"><div class="card form"><label>悩み・工夫を共有</label><textarea id="shareBody" placeholder="例：外食時の確認が大変です。 #外食 #卵アレルギー"></textarea><p class="muted small">タイトルは不要です。本文中に #卵アレルギー のように入力すると検索できます。</p><button class="primary full" onclick="addShare()">投稿する</button></div><div class="card"><div class="section-title">投稿を探す</div><div class="searchbar"><input id="shareSearch" value="'+h(state.shareSearch||state.shareTag)+'" placeholder="キーワードまたは #タグ"><button class="secondary" onclick="searchShare()">検索</button></div>'+hotTags()+shareList()+'</div></div>'+bottom();return wrap(s);}
function hotTags(){const map={};shares.forEach(p=>hashtags(p.body).forEach(t=>map[t]=(map[t]||0)+1));const tags=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);let s='<div class="hashtags">';tags.forEach(([tag])=>{s+='<button class="tag" onclick="tagSearch(\''+h(tag)+'\')">'+h(tag)+'</button>';});return s+'</div>';}
function shareList(){const q=(state.shareSearch||state.shareTag||'').trim().toLowerCase();let arr=shares.slice().sort((a,b)=>b.id-a.id);if(q)arr=arr.filter(p=>p.body.toLowerCase().includes(q)||p.author.toLowerCase().includes(q));let s='';arr.forEach(p=>{s+='<div class="shareitem"><div class="muted small">'+h(p.author)+'・'+h(p.created)+'</div><p>'+linkTags(h(p.body))+'</p><div class="hashtags">'+hashtags(p.body).map(t=>'<button class="tag" onclick="tagSearch(\''+h(t)+'\')">'+h(t)+'</button>').join('')+'</div></div>';});return s||'<div class="empty">該当する投稿はありません</div>';}
function linkTags(text){return text.replace(/#[\p{L}\p{N}_一-龠ぁ-んァ-ヶー]+/gu,m=>'<span class="tag">'+m+'</span>');}
window.addShare=async function(){const body=val('shareBody').trim();if(!body){alert('本文を入力してください');return;}const post={id:Date.now(),body,author:user?.displayName||'匿名ユーザー',created:new Date().toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})};shares.push(post);save();if(firebaseEnabled&&user){try{await addDoc(collection(db,'allergy_posts'),{body,author:post.author,uid:user.uid,createdAt:serverTimestamp()});}catch(e){console.warn(e);}}state.shareSearch='';render();};
window.searchShare=function(){state.shareSearch=val('shareSearch');state.shareTag='';render();};
window.tagSearch=function(tag){state.shareSearch=tag;state.shareTag=tag;render();};
window.loginGoogle=async function(){if(!firebaseEnabled){alert('Firebase設定を入力するとGoogleログインが有効になります。');return;}try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){alert('ログインに失敗しました：'+e.message);}};
window.logout=async function(){if(auth)await signOut(auth);};
function settings(){let s=header('設定','');s+='<div class="content"><div class="card authbox"><h2>Googleログイン</h2>'+(user?'<p><img class="avatar" src="'+h(user.photoURL||'./assets/icon-192.png')+'"></p><p><b>'+h(user.displayName||'ログイン中')+'</b></p><p class="muted">'+h(user.email||'')+'</p><button class="secondary full" onclick="logout()">ログアウト</button>':'<p class="muted">Firebase設定を入れるとGoogle認証でログインできます。</p><button class="primary full" onclick="loginGoogle()">Googleでログイン</button>')+(firebaseEnabled?'':'<div class="notice" style="margin-top:14px">現在はデモ設定です。script.js の firebaseConfig を自分のFirebaseプロジェクト情報に置換してください。</div>')+'</div></div>'+bottom();return wrap(s);}
function render(){let html='';if(state.page==='home')html=home();else if(state.page==='newRecord')html=newRecord();else if(state.page==='calendar')html=calendarPage();else if(state.page==='detail')html=detailPage();else if(state.page==='summary')html=summaryPage();else if(state.page==='share')html=sharePage();else if(state.page==='settings')html=settings();app.innerHTML=html;}
if(firebaseEnabled){onAuthStateChanged(auth,u=>{user=u;render();});}
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{});});}
render();
