(function(){
'use strict';
var app=document.getElementById('app');
var ALLERGY_FOODS=[
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
var BAR_EXCLUDED=['かに'];
var state={page:'home',detailId:null,period:'30',food:'くるみ'};
var records=[
{id:1,date:'2026-05-11',time:'18:30',food:'卵',amount:5,unit:'g',symptom:true,skin:1,resp:0,digest:0,whole:0,detail:'口の周りに赤み。30分程度で改善。',med:'抗ヒスタミン薬',hospital:'なし',photo:true},
{id:2,date:'2026-05-10',time:'12:20',food:'牛乳',amount:80,unit:'ml',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'問題なく摂取できました。',med:'なし',hospital:'なし',photo:false},
{id:3,date:'2026-05-09',time:'18:00',food:'くるみ',amount:3,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photo:false},
{id:4,date:'2026-05-08',time:'18:00',food:'ピーナッツ',amount:1,unit:'g',symptom:true,skin:0,resp:1,digest:0,whole:0,detail:'軽い咳がありました。',med:'なし',hospital:'なし',photo:false},
{id:5,date:'2026-05-07',time:'12:10',food:'くるみ',amount:2,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photo:false},
{id:6,date:'2026-05-06',time:'07:30',food:'小麦',amount:20,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'問題なし。',med:'なし',hospital:'なし',photo:false},
{id:7,date:'2026-05-05',time:'18:00',food:'くるみ',amount:1,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photo:false},
{id:8,date:'2026-05-04',time:'13:00',food:'カシューナッツ',amount:0.5,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photo:false},
{id:9,date:'2026-05-03',time:'08:10',food:'牛乳',amount:60,unit:'ml',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photo:false},
{id:10,date:'2026-05-02',time:'18:00',food:'えび',amount:2,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photo:false},
{id:11,date:'2026-05-01',time:'18:00',food:'そば',amount:5,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'症状なし。',med:'なし',hospital:'なし',photo:false},
{id:12,date:'2026-04-29',time:'18:00',food:'かに',amount:2,unit:'g',symptom:false,skin:0,resp:0,digest:0,whole:0,detail:'記録対象。棒グラフからは除外。',med:'なし',hospital:'なし',photo:false}
];
function save(){try{localStorage.setItem('allergy_records_v3',JSON.stringify(records));}catch(e){}}
function load(){try{var r=localStorage.getItem('allergy_records_v3');if(r)records=JSON.parse(r);}catch(e){}}
load();
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function foodObj(name){return ALLERGY_FOODS.find(function(f){return f.name===name;})||{name:name,icon:'●',unit:'g'};}
function nav(page){state.page=page;if(page!=='detail')state.detailId=null;render();window.scrollTo(0,0);} window.nav=nav;
function openDetail(id){state.page='detail';state.detailId=id;render();window.scrollTo(0,0);} window.openDetail=openDetail;
function wrap(x){return '<main class="phone">'+x+'</main>';}
function header(title,sub,back){return '<div class="top">'+(back?'<button class="iconbtn" onclick="nav(\''+back+'\')">‹</button>':'<img src="./assets/icon-192.png" class="appicon" alt="">')+'<div class="headtext"><div class="title">'+h(title)+'</div><div class="sub">'+h(sub||'')+'</div></div><button class="pillbtn" onclick="nav(\'settings\')">設定</button></div>';}
function bottom(){var items=[['home','🏠','ホーム'],['newRecord','✍️','記録'],['calendar','📅','カレンダー'],['summary','📊','サマリー']];var s='<div class="bottom">';items.forEach(function(it){s+='<button class="nav '+(state.page===it[0]?'active':'')+'" onclick="nav(\''+it[0]+'\')"><span>'+it[1]+'</span>'+it[2]+'</button>';});return s+'</div>';}
function latest(n){return records.slice().sort(function(a,b){return (b.date+b.time).localeCompare(a.date+a.time);}).slice(0,n||5);}
function weekRange(){var end=new Date('2026-05-11');var day=end.getDay();var diff=(day===0?6:day-1);var start=new Date(end);start.setDate(end.getDate()-diff);return {start:start,end:end};}
function fmt(d){return d.toISOString().slice(0,10);}
function weeklyStatus(){var wr=weekRange();var days={};records.forEach(function(r){var d=new Date(r.date);if(d>=wr.start&&d<=wr.end)days[r.date]=true;});var count=Object.keys(days).length;return {count:count,remain:Math.max(0,3-count),start:fmt(wr.start).slice(5).replace('-','/'),end:fmt(wr.end).slice(5).replace('-','/')};}
function home(){var w=weeklyStatus();var s=header('アレルギー記録','主要9食材を管理');s+='<div class="content"><div class="card hero"><h2>今週の摂取状況</h2><p>目標：週3回以上の摂取</p><div class="goal"><b>'+w.count+'/3回</b><span>'+(w.count>=3?'達成！':'あと'+w.remain+'回')+'</span></div><div class="progress"><i style="width:'+Math.min(100,w.count/3*100)+'%"></i></div><button class="primary" onclick="nav(\'newRecord\')">＋ 摂取記録を追加</button></div>';
s+='<div class="notice">管理食材：卵・牛乳・くるみ・小麦・ピーナッツ・カシューナッツ・えび・そば・かに。かには記録対象ですが、棒グラフからは除外しています。</div>';
s+='<div class="card">'+foodSelector('home')+'<div class="section-title">食材別 摂取量推移グラフ</div>'+lineChart(intakeTrend(state.food),state.food)+'</div>';
s+='<div class="card"><div class="section-title">食材別サマリーグラフ</div>'+barChart(summaryCounts())+'</div>';
s+='<div class="card"><div class="section-title">最近の記録</div>'+recordList(latest(4))+'</div></div>'+bottom();return wrap(s);}
function foodSelector(page){var s='<div class="selector"><label>表示食材</label><select onchange="state.food=this.value;render()">';ALLERGY_FOODS.forEach(function(f){s+='<option value="'+f.name+'" '+(state.food===f.name?'selected':'')+'>'+f.icon+' '+f.name+'</option>';});return s+'</select></div>';}
function intakeTrend(food){return records.filter(function(r){return r.food===food;}).sort(function(a,b){return a.date.localeCompare(b.date);}).slice(-8);}
function lineChart(data,food){if(!data.length)return '<div class="empty">記録がありません</div>';var max=Math.max.apply(null,data.map(function(r){return Number(r.amount)||0;})); if(max<=0)max=1;var pts=data.map(function(r,i){var x=data.length===1?50:10+(i*(80/(data.length-1)));var y=85-((Number(r.amount)||0)/max*65);return {x:x,y:y,r:r};});var poly=pts.map(function(p){return p.x+','+p.y;}).join(' ');var s='<svg class="linechart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="'+poly+'" fill="none" stroke="currentColor" stroke-width="2.5"/>';pts.forEach(function(p){s+='<circle cx="'+p.x+'" cy="'+p.y+'" r="2.3" fill="currentColor"/>';});s+='</svg><div class="axis">';pts.forEach(function(p){s+='<span><b>'+h(p.r.date.slice(5).replace('-','/'))+'</b><em>'+h(p.r.amount)+h(p.r.unit)+'</em></span>';});return s+'</div>';}
function summaryCounts(){var map={};records.forEach(function(r){if(BAR_EXCLUDED.indexOf(r.food)>=0)return;map[r.food]=(map[r.food]||0)+1;});return ALLERGY_FOODS.filter(function(f){return BAR_EXCLUDED.indexOf(f.name)<0;}).map(function(f){return {label:f.icon+' '+f.name,value:map[f.name]||0};});}
function barChart(data){var max=Math.max.apply(null,data.map(function(d){return d.value;})); if(max<=0)max=1;var s='<div class="hbars">';data.forEach(function(d){s+='<div class="hbar"><b>'+h(d.label)+'</b><div><i style="width:'+Math.round(d.value/max*100)+'%"></i></div><em>'+d.value+'回</em></div>';});return s+'</div>';}
function recordList(arr){var s='';arr.forEach(function(r){var f=foodObj(r.food);s+='<div class="record" onclick="openDetail('+r.id+')"><h3>'+f.icon+' '+h(r.date)+' '+h(r.food)+' '+h(r.amount)+h(r.unit)+' <span class="right">›</span></h3><div>'+(r.symptom?'<span class="danger">症状あり</span>':'<span class="safe">症状なし</span>')+'</div><div class="muted">'+h(r.detail)+'</div></div>';});return s||'<div class="empty">記録がありません</div>';}
function newRecord(){var s=header('摂取記録を入力','', 'home');s+='<div class="content"><div class="card form"><label>食べた日時</label><input id="date" type="date" value="2026-05-11"><input id="time" type="time" value="18:30"><label>食べた食材</label><select id="food" onchange="syncUnit()">';ALLERGY_FOODS.forEach(function(f){s+='<option value="'+f.name+'">'+f.icon+' '+f.name+'</option>';});s+='</select><label>食べた量</label><div class="grid2"><input id="amount" type="number" step="0.1" value="1"><select id="unit"><option>g</option><option>ml</option><option>個</option></select></div><label>症状はありましたか？</label><div class="seg"><button id="noBtn" class="on" onclick="setSym(false)">😊 なし</button><button id="yesBtn" onclick="setSym(true)">😟 あり</button></div><div id="symArea" class="hidden">'+grade('皮膚・粘膜','skin')+grade('呼吸器','resp')+grade('消化器','digest')+grade('全身','whole')+'<label>使用した薬</label><input id="med" placeholder="例：抗ヒスタミン薬"><label>症状の詳細</label><textarea id="detail" placeholder="例：口の周りに赤み"></textarea></div><button class="primary full" onclick="addRecord()">保存する</button></div></div>'+bottom();return wrap(s);}
function grade(label,id){return '<div class="grade"><b>'+label+'</b><select id="'+id+'"><option value="0">Grade 0</option><option value="1">Grade 1</option><option value="2">Grade 2</option><option value="3">Grade 3</option></select></div>';}
window.syncUnit=function(){var f=foodObj(val('food'));document.getElementById('unit').value=f.unit;};
window.setSym=function(v){document.getElementById('symArea').className=v?'':'hidden';document.getElementById('noBtn').className=v?'':'on';document.getElementById('yesBtn').className=v?'bad':'';};
window.addRecord=function(){var sym=document.getElementById('yesBtn').className.indexOf('bad')>=0;var rec={id:Date.now(),date:val('date'),time:val('time'),food:val('food'),amount:Number(val('amount')),unit:val('unit'),symptom:sym,skin:Number(val('skin')||0),resp:Number(val('resp')||0),digest:Number(val('digest')||0),whole:Number(val('whole')||0),detail:val('detail')||'記録しました。',med:val('med')||'なし',hospital:'なし',photo:false};records.push(rec);save();openDetail(rec.id);};
function val(id){var el=document.getElementById(id);return el?el.value:'';}
function calendarPage(){var s=header('カレンダー','日付タップで詳細へ');s+='<div class="content"><div class="card"><div class="link-card"><button class="iconbtn">‹</button><div class="section-title">2026年5月</div><button class="iconbtn">›</button></div><table class="calendar"><thead><tr>';['月','火','水','木','金','土','日'].forEach(function(d){s+='<th>'+d+'</th>';});s+='</tr></thead><tbody>';var day=1;for(var w=0;w<5;w++){s+='<tr>';for(var c=0;c<7;c++){if(w===0&&c<4||day>31){s+='<td></td>';continue;}var ds='2026-05-'+(day<10?'0'+day:day);var rs=records.filter(function(r){return r.date===ds;});s+='<td class="'+(rs.length?'has':'')+'" '+(rs[0]?'onclick="openDetail('+rs[0].id+')"':'')+'><b>'+day+'</b><div class="icons">';rs.slice(0,3).forEach(function(r){s+='<span>'+foodObj(r.food).icon+'</span>';});s+='</div></td>';day++;}s+='</tr>';}s+='</tbody></table><div class="legend">';ALLERGY_FOODS.forEach(function(f){s+='<span>'+f.icon+' '+f.name+'</span>';});s+='</div></div></div>'+bottom();return wrap(s);}
function detailPage(){var r=records.find(function(x){return x.id===state.detailId;});if(!r)return wrap(header('記録詳細','','home')+'<div class="content empty">記録がありません</div>'+bottom());var s=header('記録の詳細','', 'home');s+='<div class="content"><div class="card"><h2>'+foodObj(r.food).icon+' '+h(r.date)+' '+h(r.time)+'</h2>'+detailRow('食材',r.food)+detailRow('量',r.amount+r.unit)+detailRow('症状',r.symptom?'あり':'なし')+detailRow('最大Grade',Math.max(r.skin,r.resp,r.digest,r.whole))+detailRow('使用した薬',r.med)+detailRow('症状の詳細',r.detail)+'</div></div>'+bottom();return wrap(s);}
function detailRow(k,v){return '<div class="detail-row"><b>'+h(k)+'</b><span>'+h(v)+'</span></div>';}
function summaryPage(){var s=header('サマリー','グラフで確認');s+='<div class="content"><div class="card"><div class="section-title">週3回摂取の達成状況</div>';var w=weeklyStatus();s+='<div class="goal"><b>'+w.count+'/3回</b><span>'+(w.count>=3?'達成！':'あと'+w.remain+'回')+'</span></div><div class="progress"><i style="width:'+Math.min(100,w.count/3*100)+'%"></i></div></div>';
s+='<div class="card">'+foodSelector('summary')+'<div class="section-title">食材別 摂取量推移グラフ</div>'+lineChart(intakeTrend(state.food),state.food)+'</div>';
s+='<div class="card"><div class="section-title">食材別サマリーグラフ</div>'+barChart(summaryCounts())+'</div></div>'+bottom();return wrap(s);}
function settings(){return wrap(header('設定','')+'<div class="content"><div class="card"><h2>設定</h2><p class="muted">PWA対応。GitHub Pagesではこのフォルダ一式をアップロードしてください。</p></div></div>'+bottom());}
function render(){var html='';if(state.page==='home')html=home();else if(state.page==='newRecord')html=newRecord();else if(state.page==='calendar')html=calendarPage();else if(state.page==='detail')html=detailPage();else if(state.page==='summary')html=summaryPage();else if(state.page==='settings')html=settings();app.innerHTML=html;}
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){});});}
render();
})();
