export async function mountGuestFaith() {
  const apex=location.hostname.toLowerCase()==='paxlink.kr';
  let target=new URLSearchParams(location.search).get('open')||(apex?'home':null);
  if(!target||!(apex?['home','prayer-dream','memorial','gospel-note']:['prayer-dream','memorial','gospel-note']).includes(target))return;
  const context=await fetch(apex?'/api/public/faith-parishes':'/api/parish-context');if(!context.ok)return;
  const data=await context.json();
  const parishes:Array<{id:number;name:string;diocese?:string}>=apex?data:[];
  let parish:{id:number;name:string}=apex?(parishes.find(p=>Number(p.id)===Number(new URLSearchParams(location.search).get('parishId')))||{id:0,name:'성당 선택'}):data;
  if(document.body.classList.contains('member-authenticated'))return;
  const labels:Record<string,string>={'prayer-dream':'기도드림',memorial:'빛의 방','gospel-note':'복음노트'};
  if(apex){Object.assign(labels,{home:'성당 소식'})}
  const shell=document.querySelector<HTMLElement>('.member-shell')!;
  const layer=document.createElement('section');layer.className='guest-faith';
  layer.innerHTML='<header><a href="/">‹ 성당 첫 화면</a><button type="button" data-login>로그인</button><h1></h1><p>공개된 내용을 자유롭게 읽어 보세요. 작성과 참여는 로그인 후 이용할 수 있습니다.</p></header><nav></nav><main aria-live="polite"></main>';
  if(apex){layer.classList.add('guest-apex');layer.querySelector('header a')!.textContent='‹ Paxlink 홈'}
  layer.querySelector('h1')!.textContent=`${parish.name} · ${labels[target]}`;
  const nav=layer.querySelector('nav')!,main=layer.querySelector('main')!;
  const syncParish=()=>{layer.querySelector('h1')!.textContent=`${parish.name} · ${labels[target!]}`;nav.querySelectorAll('a').forEach(a=>{const url=new URL(a.href);if(apex)url.searchParams.set('parishId',String(parish.id));a.href=url.href})};
  let entered=!apex||Boolean(parish.id);
  let selector:HTMLSelectElement|null=null;
  if(apex){const label=document.createElement('label');label.className='guest-parish-selector';label.textContent='성당 선택 ';const select=document.createElement('select');selector=select;select.setAttribute('aria-label','둘러볼 성당');select.add(new Option('성당을 선택해 주세요',''));parishes.forEach(p=>select.add(new Option([p.name,p.diocese].filter(Boolean).join(' · '),String(p.id))));select.value=parish.id?String(parish.id):'';select.onchange=()=>{parish=parishes.find(p=>Number(p.id)===Number(select.value))||{id:0,name:'성당 선택'};if(!parish.id)entered=false;const url=new URL(location.href);url.searchParams.set('parishId',String(parish.id));url.searchParams.set('open',target!);history.replaceState(null,'',url);syncParish();void load()};label.append(select);layer.querySelector('header')!.append(label)}
  const switchMenu=(key:string)=>{if(!labels[key])return;target=key;layer.querySelector('h1')!.textContent=`${parish.name} · ${labels[key]}`;nav.querySelectorAll('a').forEach(a=>{if(new URL(a.href).searchParams.get('open')===key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});void load()};
  Object.entries(labels).forEach(([key,label])=>{const link=document.createElement('a');link.href=`/parishioner?open=${key}`;link.textContent=label;if(key===target)link.setAttribute('aria-current','page');link.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();history.pushState(null,'',link.href);switchMenu(key)};nav.append(link)});
  syncParish();
  const pop=()=>{const params=new URLSearchParams(location.search),key=params.get('open')||(apex?'home':null);if(apex){parish=parishes.find(p=>Number(p.id)===Number(params.get('parishId')))||{id:0,name:'성당 선택'};entered=Boolean(parish.id);if(selector)selector.value=parish.id?String(parish.id):'';syncParish()}if(key)switchMenu(key)};window.addEventListener('popstate',pop);
  const el=(tag:string,text:string)=>{const e=document.createElement(tag);e.textContent=text;return e};
  const marker=document.createComment('login-shell');shell.before(marker);
  const loginDialog=document.createElement('dialog');loginDialog.className='guest-login-dialog';loginDialog.setAttribute('aria-label','로그인');
  const close=document.createElement('button');close.type='button';close.className='guest-login-close';close.textContent='닫기 · 계속 읽기';close.onclick=()=>loginDialog.close();loginDialog.append(close);
  document.body.append(layer,loginDialog);shell.hidden=true;
  let opener:HTMLElement|null=null;
  loginDialog.addEventListener('close',()=>{if(!document.body.classList.contains('member-authenticated')){shell.hidden=true;marker.after(shell);opener?.focus({preventScroll:true})}document.body.classList.remove('guest-login-open')});
  const login=async()=>{
    if(loginDialog.open)return;
    if(apex&&parish.id){const id=document.querySelector<HTMLInputElement>('#member-parish-id'),search=document.querySelector<HTMLInputElement>('#member-parish-search');if(id)id.value=String(parish.id);if(search)search.value=parish.name}
    opener=document.activeElement as HTMLElement;loginDialog.append(shell);shell.hidden=false;
    document.body.classList.add('guest-login-open');loginDialog.showModal();
    document.querySelector<HTMLInputElement>('#member-email')?.focus({preventScroll:true});
  };
  const action=(text:string)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>void login().catch(()=>{b.textContent='연결 오류 · 다시 로그인'});return b};
  layer.querySelector<HTMLButtonElement>('[data-login]')!.onclick=()=>void login();
  const observer=new MutationObserver(()=>{if(document.body.classList.contains('member-authenticated')){marker.after(shell);shell.hidden=false;loginDialog.close();loginDialog.remove();marker.remove();layer.remove();window.removeEventListener('popstate',pop);observer.disconnect()}});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  async function get(url:string){const address=new URL(url,location.origin);if(apex)address.searchParams.set('parishId',String(parish.id));const r=await fetch(address.pathname+address.search,{cache:'no-store'});if(!r.ok)throw new Error('내용을 불러오지 못했습니다. 다시 시도해 주세요.');return r.json()}
  const month=new Date(Date.now()+9*3600000).toISOString().slice(0,7);
  let selectedMonth=month,version=0;
  async function detail(id:number){const v=++version;main.replaceChildren(el('p','추모 공간을 불러오는 중입니다.'));try{const d=await get(`/api/public/faith/memorial/${id}`);if(v!==version)return;const back=el('button','‹ 목록으로');back.onclick=()=>void load();main.replaceChildren(back,el('h2',`${d.name}${d.baptismalName?' ('+d.baptismalName+')':''}`));for(const photo of d.photos){const img=document.createElement('img');img.src=photo;img.alt='추모 사진';main.append(img)}for(const key of ['deathDate','historyText','ordinationText','biography'])if(d[key])main.append(el('p',d[key]));main.append(action('추모글 작성'),action('기도 봉헌'));d.entries.forEach((e:any)=>{const a=el('article','');a.append(el('h3',e.entryType==='prayer'?'기도':'추모글'),el('p',e.content));main.append(a)})}catch(e){showError(e,()=>void detail(id))}}
  function showError(e:unknown,retry:()=>void){main.replaceChildren(el('p',(e as Error).message));const b=el('button','다시 불러오기');b.onclick=retry;main.append(b)}
  async function load(){const v=++version;nav.hidden=apex&&!entered;layer.classList.toggle('guest-apex-selection',apex&&!entered);if(apex&&!entered){layer.querySelector('h1')!.textContent='신앙생활 이어가기';main.replaceChildren(el('h2','어느 성당을 둘러보시겠어요?'),el('p',parishes.length?'성당을 선택하고 로그인 없이 소식과 공개된 내용을 읽어 보세요.':'현재 둘러볼 수 있는 성당이 없습니다.'));const browse=document.createElement('button');browse.type='button';browse.className='guest-browse-button';browse.textContent='로그인 없이 둘러보기';browse.disabled=!parish.id;browse.onclick=()=>{entered=true;syncParish();void load()};main.append(browse,action('로그인하고 이용하기'));return}main.replaceChildren(el('p','내용을 불러오는 중입니다.'));try{const d=await get(`/api/public/faith/${target}?month=${selectedMonth}`);if(v!==version)return;main.replaceChildren();
    if(target==='home'){main.append(el('h2',`${parish.name} 성당 소식`),el('p','비회원으로 둘러보는 중입니다. 저장·수정·삭제 등 변경 작업은 로그인 후 권한에 따라 이용할 수 있습니다.'),action('로그인'));
      main.append(el('h2','공지사항'));if(!d.notices.length)main.append(el('p','등록된 공지사항이 없습니다.'));d.notices.forEach((n:any)=>{const box=document.createElement('details');box.className='guest-notice';box.append(el('summary',n.title),el('p',n.content));main.append(box)});
      main.append(el('h2','이번 달 성당 일정'));if(!d.items.length)main.append(el('p','등록된 일정이 없습니다.'));d.items.forEach((s:any)=>{const a=el('article','');a.append(el('h3',s.title),el('p',[s.scheduleDate,s.startTime,s.location].filter(Boolean).join(' · ')),el('p',s.content||''),action('일정 저장'));main.append(a)});return;
    }
    main.append(action(target==='prayer-dream'?'기도문 작성':target==='memorial'?'추모 공간 등록':'은총일기 작성'));
    if(target==='gospel-note'){const label=el('label','조회 월 '),input=document.createElement('input');input.type='month';input.value=selectedMonth;input.onchange=()=>{if(input.value){selectedMonth=input.value;void load()}};label.append(input);main.append(label,el('p','나의 은총일기와 강론 노트는 로그인 후 확인할 수 있습니다.'))}
    if(!d.items.length)main.append(el('p','등록된 공개 내용이 없습니다.'));
    d.items.forEach((item:any)=>{const article=el('article','');
      if(target==='prayer-dream'){article.append(el('h2','기도드림'),el('p',item.content),action('함께 기도하기'),action('댓글 작성'));item.comments.forEach((c:any)=>article.append(el('blockquote',c.content)))}
      else if(target==='memorial'){article.append(el('h2',item.name),el('p',item.biography||''));const b=el('button','추모 공간 보기');b.onclick=()=>void detail(item.id);article.append(b)}
      else{article.append(el('h2',item.title),el('p',[item.scheduleDate,item.startTime,item.location].filter(Boolean).join(' · ')),el('p',item.content||''));if(item.massOrder.length){article.append(el('h3','미사 순서'));const list=el('ol','');item.massOrder.forEach((step:string)=>list.append(el('li',step)));article.append(list)}article.append(action('강론 노트 작성'),action('일정 저장'))}
      main.append(article);
    });
  }catch(e){if(v===version)showError(e,()=>void load())}}
  await load();
}
