(function(){
function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
async function logout(){await fetch('/auth/logout',{method:'POST'});location.href='/login';}
async function load(){try{const r=await fetch('/api/me');if(!r.ok)return;const me=await r.json();const host=document.querySelector('.sidebar-bottom');if(!host||document.getElementById('accountProfile'))return;
const box=make('div','account-profile');box.id='accountProfile';
if(me.mode==='google'){let av;if(me.picture){av=make('img');av.src=me.picture;av.alt='';av.referrerPolicy='no-referrer';}else{av=make('div','account-avatar',(me.name||'U').slice(0,1).toUpperCase());}
box.appendChild(av);const copy=make('div','account-copy');copy.appendChild(make('b','',me.name||'Google user'));copy.appendChild(make('small','',me.email||''));box.appendChild(copy);
const b=make('button','account-logout','Sign out');b.type='button';b.addEventListener('click',logout);box.appendChild(b);}
else{box.appendChild(make('div','account-avatar','L'));const copy=make('div','account-copy');copy.appendChild(make('b','','Local mode'));copy.appendChild(make('small','','Single-user data'));box.appendChild(copy);}
host.insertBefore(box,host.firstChild);}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();