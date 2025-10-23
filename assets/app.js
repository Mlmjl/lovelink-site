
// Simple state helpers
const store = {
  get(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def } catch(e){ return def }},
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)) }
};

// Seed demo users if none
function seedUsers(){
  let users = store.get('users', []);
  if(users.length===0){
    users = [
      {id:1,email:"alice@example.com",password:"alice123",name:"Alice",age:26,gender:"female",interests:["徒步","摄影","咖啡"]},
      {id:2,email:"bob@example.com",password:"bob12345",name:"Bob",age:29,gender:"male",interests:["跑步","电影","吉他"]},
      {id:3,email:"chen@example.com",password:"chen123",name:"Chen",age:32,gender:"male",interests:["烘焙","旅行","摄影"]},
      {id:4,email:"diana@example.com",password:"diana123",name:"Diana",age:24,gender:"female",interests:["咖啡","画画","旅行"]},
      {id:5,email:"eva@example.com",password:"eva12345",name:"Eva",age:30,gender:"female",interests:["瑜伽","电影","咖啡"]},
      {id:6,email:"frank@example.com",password:"frank123",name:"Frank",age:35,gender:"male",interests:["摄影","徒步","自行车"]}
    ];
    store.set('users', users);
  }
}
seedUsers();

function currentUser(){
  return store.get('currentUser', null);
}
function setCurrentUser(u){
  store.set('currentUser', u);
}

function qs(sel){ return document.querySelector(sel) }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)) }

function renderHomeStats(){
  const el = qs('#home-stats');
  if(!el) return;
  const users = store.get('users', []);
  const reviews = store.get('reviews', []);
  const pairs = store.get('matches', []);
  el.innerHTML = `
    <div class="card"><h3>注册用户</h3><div style="font-size:36px">${users.length}</div></div>
    <div class="card"><h3>已匹配对</h3><div style="font-size:36px">${pairs?.length||0}</div></div>
    <div class="card"><h3>评价条数</h3><div style="font-size:36px">${reviews?.length||0}</div></div>
  `;
}

// Register
function initRegister(){
  const form = qs('#registerForm');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const users = store.get('users', []);
    if(users.find(u=>u.email===data.email)){
      alert('邮箱已存在');
      return;
    }
    const newUser = {
      id: Date.now(),
      email: data.email,
      password: data.password,
      name: data.name,
      age: Number(data.age),
      gender: data.gender,
      interests: (data.interests||'').split(',').map(s=>s.trim()).filter(Boolean)
    };
    users.push(newUser);
    store.set('users', users);
    alert('注册成功，请登录');
    location.href='login.html';
  });
}

// Login
function initLogin(){
  const form = qs('#loginForm');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const users = store.get('users', []);
    const u = users.find(u=>u.email===data.email && u.password===data.password);
    if(!u){ alert('邮箱或密码错误'); return; }
    setCurrentUser({id:u.id,email:u.email,name:u.name});
    alert('登录成功');
    location.href='index.html';
  });
}

// Catalogue
function renderUsers(list){
  const grid = qs('#userGrid');
  if(!grid) return;
  grid.innerHTML = '';
  list.forEach(u=>{
    const tags = (u.interests||[]).map(i=>`<span class="badge">${i}</span>`).join('');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${u.name}</h3>
      <div>年龄：${u.age} ｜ 性别：${u.gender}</div>
      <div>兴趣：${tags}</div>`;
    grid.appendChild(card);
  });
}
function initCatalogue(){
  if(!qs('#userGrid')) return;
  const users = store.get('users', []);
  renderUsers(users);
  qs('#searchBtn')?.addEventListener('click', ()=>{
    const min = Number(qs('#q_age_min').value||0);
    const max = Number(qs('#q_age_max').value||200);
    const g = qs('#q_gender').value;
    const kw = (qs('#q_interest').value||'').trim();
    const res = users.filter(u=>{
      if(u.age<min || u.age>max) return false;
      if(g && u.gender!==g) return false;
      if(kw && !(u.interests||[]).some(i=>i.includes(kw))) return false;
      return true;
    });
    renderUsers(res);
  });
  qs('#resetBtn')?.addEventListener('click', ()=>{
    qsa('#q_age_min,#q_age_max,#q_gender,#q_interest').forEach(i=>i.value='');
    renderUsers(users);
  });
}

// Match
function similarity(a,b){
  const A = new Set((a||[])), B = new Set((b||[]));
  let inter = 0;
  A.forEach(x=>{ if(B.has(x)) inter++ });
  const denom = Math.max(A.size, B.size) || 1;
  return inter/denom;
}
function initMatch(){
  const sel = qs('#currentUserSelect');
  if(!sel) return;
  const users = store.get('users', []);
  sel.innerHTML = users.map(u=>`<option value="${u.id}">${u.name} (${u.email})</option>`).join('');
  qs('#calcMatchBtn')?.addEventListener('click', ()=>{
    const uid = Number(sel.value);
    const me = users.find(u=>u.id===uid);
    const list = users.filter(u=>u.id!==uid).map(u=>({
      user:u,
      score: Math.round(similarity(me.interests, u.interests)*100)
    })).sort((a,b)=>b.score-a.score);
    const box = qs('#matchList'); box.innerHTML='';
    list.forEach(item=>{
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h3>${item.user.name} <span class="badge">匹配度 ${item.score}%</span></h3>
      <div>年龄：${item.user.age} ｜ 性别：${item.user.gender}</div>
      <div>兴趣：${(item.user.interests||[]).map(i=>`<span class='badge'>${i}</span>`).join('')}</div>
      <button data-id="${item.user.id}" class="pairBtn">标记为匹配</button>`;
      box.appendChild(div);
    });
    box.addEventListener('click',(e)=>{
      if(e.target.classList.contains('pairBtn')){
        const otherId = Number(e.target.getAttribute('data-id'));
        const pairs = store.get('matches', []);
        pairs.push({a:uid,b:otherId,ts:Date.now()});
        store.set('matches', pairs);
        alert('已建立匹配（演示）');
      }
    }, {once:true});
  });
}

// Chat
function chatKey(a,b){
  return `chat:${[a,b].sort().join('-')}`
}
function initChat(){
  const ua = qs('#chatUserA'), ub = qs('#chatUserB'), win = qs('#chatWindow');
  if(!ua || !ub) return;
  const users = store.get('users', []);
  const options = users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  ua.innerHTML = options; ub.innerHTML = options;
  function render(){
    const a = Number(ua.value), b = Number(ub.value);
    if(!a||!b||a===b){ win.innerHTML='<div class="small">请选择两位不同的用户。</div>'; return; }
    const msgs = store.get(chatKey(a,b), []);
    win.innerHTML = msgs.map(m=>`<div><b>${m.fromName}:</b> ${m.text} <span class="small">${new Date(m.ts).toLocaleString()}</span></div>`).join('');
    win.scrollTop = win.scrollHeight;
  }
  ua.addEventListener('change', render);
  ub.addEventListener('change', render);
  qs('#sendChatBtn')?.addEventListener('click', ()=>{
    const a = Number(ua.value), b = Number(ub.value);
    const text = qs('#chatInput').value.trim();
    if(!text) return;
    const msgs = store.get(chatKey(a,b), []);
    const from = users.find(u=>u.id===a);
    msgs.push({from:a,fromName:from.name,text,ts:Date.now()});
    store.set(chatKey(a,b), msgs);
    qs('#chatInput').value='';
    render();
  });
  render();
}

// Reviews
function initReviews(){
  const sel = qs('#reviewTarget');
  if(!sel) return;
  const users = store.get('users', []);
  sel.innerHTML = users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  const tbody = qs('#reviewTable tbody');
  function renderTable(){
    const rows = (store.get('reviews', [])||[]).map(r=>{
      const u = users.find(x=>x.id===r.target);
      return `<tr><td>${u?u.name:'未知'}</td><td>${r.rating}</td><td>${r.text}</td><td>${new Date(r.ts).toLocaleString()}</td></tr>`
    }).join('');
    tbody.innerHTML = rows || `<tr><td colspan="4" class="small">暂无评价</td></tr>`;
  }
  renderTable();
  qs('#reviewForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const target = Number(sel.value);
    const rating = Number(qs('#reviewRating').value);
    const text = qs('#reviewText').value.trim();
    if(!text){ alert('请输入评论'); return; }
    const list = store.get('reviews', []);
    list.push({target,rating,text,ts:Date.now()});
    store.set('reviews', list);
    qs('#reviewText').value='';
    renderTable();
  });
}

// Router init
document.addEventListener('DOMContentLoaded', ()=>{
  renderHomeStats();
  initRegister();
  initLogin();
  initCatalogue();
  initMatch();
  initChat();
  initReviews();
});
