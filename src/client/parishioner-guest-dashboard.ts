type GuestParish={id:number;name:string;diocese?:string};
export async function mountGuestDashboard(render:(parish:GuestParish)=>void) {
  const response=await fetch('/api/public/faith-parishes');if(!response.ok)throw new Error('성당 목록을 불러오지 못했습니다.');
  const parishes:GuestParish[]=await response.json();
  let parish=parishes.find(p=>Number(p.id)===Number(new URLSearchParams(location.search).get('parishId')));
  const shell=document.querySelector<HTMLElement>('.member-shell')!;
  const loginDialog=document.createElement('dialog');loginDialog.className='guest-login-dialog';loginDialog.setAttribute('aria-label','신도 로그인');
  const close=document.createElement('button');close.type='button';close.className='guest-login-close';close.textContent='닫기 · 계속 보기';close.onclick=()=>loginDialog.close();loginDialog.append(close);
  const loginContent=document.createElement('div');loginContent.className='member-shell';while(shell.firstChild)loginContent.append(shell.firstChild);loginDialog.append(loginContent);document.body.append(loginDialog);
  let opener:HTMLElement|null=null;
  const login=()=>{if(loginDialog.open)return;opener=document.activeElement as HTMLElement;const id=document.querySelector<HTMLInputElement>('#member-parish-id'),search=document.querySelector<HTMLInputElement>('#member-parish-search');if(parish){if(id)id.value=String(parish.id);if(search)search.value=parish.name}document.body.classList.add('guest-login-open');loginDialog.showModal();document.querySelector<HTMLInputElement>('#member-email')?.focus({preventScroll:true})};
  loginDialog.addEventListener('close',()=>{document.body.classList.remove('guest-login-open');opener?.focus({preventScroll:true})});
  const rawFetch=window.fetch.bind(window);
  function publicUrl(value:string){const u=new URL(value,location.origin);if(u.origin===location.origin&&u.pathname.startsWith('/api/parishioner/')){u.pathname=u.pathname.replace('/api/parishioner/','/api/public/member/');u.searchParams.set('parishId',String(parish!.id))}return u.href}
  function activate(){
    if(!parish)return;
    const url=new URL(location.href);url.searchParams.set('parishId',String(parish.id));url.searchParams.delete('open');history.replaceState(null,'',url);
    window.fetch=async(input,init)=>{
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin);
      if(url.origin!==location.origin||!url.pathname.startsWith('/api/parishioner/'))return rawFetch(input,init);
      const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
      if(method!=='GET'){login();return new Response(JSON.stringify({message:'로그인 후 이용해 주세요.'}),{status:401,headers:{'Content-Type':'application/json'}})}
      const r=await rawFetch(publicUrl(url.href),init);if(r.status===401||r.status===403)login();return r;
    };
    document.body.classList.add('member-guest');render(parish);
    // Retain the member home layout and its existing feature components.
    const heading=shell.querySelector('.member-home>h1');if(heading)heading.textContent=`${parish.name} 성당에 오신 것을 환영합니다.`;
    const copy=shell.querySelector('.member-home>p');if(copy)copy.textContent='로그인 없이 둘러보는 중입니다. 저장·수정·삭제 등 변경 작업은 로그인 후 이용해 주세요.';
    const profile=document.querySelector('.member-profile');if(profile){const b=document.createElement('button');b.type='button';b.className='guest-dashboard-login';b.textContent='로그인';b.onclick=login;profile.append(b)}
    const change=document.createElement('a');change.href='/parishioner/?browse=1';change.textContent='성당 변경';change.className='guest-change-parish';document.querySelector('.member-profile')?.append(change);
    const logout=document.querySelector<HTMLButtonElement>('#member-logout');if(logout){logout.textContent='로그인';logout.onclick=login}
    document.addEventListener('click',e=>{
      const button=(e.target as Element).closest<HTMLElement>('button,a');if(!button||loginDialog.contains(button))return;
      const text=button.textContent?.trim()||'';
      if(/저장|삭제|수정|작성|등록|생성|가입|신청|탈퇴|좋아요|공감|봉헌|내 정보|개인정보|로그아웃/.test(text)||button.matches('[data-prayer-reaction],[data-public-prayer-reaction],#member-notification-button,#member-privacy,#member-logout')){e.preventDefault();e.stopImmediatePropagation();login()}
    },true);
    document.addEventListener('submit',e=>{if(loginDialog.contains(e.target as Node))return;const form=e.target as HTMLFormElement;const submit=(e as SubmitEvent).submitter;const text=submit?.textContent||'';if(/조회|검색/.test(text)||form.matches('[role="search"]'))return;e.preventDefault();e.stopImmediatePropagation();login()},true);
    const rewrite=(root:ParentNode)=>root.querySelectorAll<HTMLElement>('[src],[href]').forEach(node=>{for(const attr of ['src','href']){const value=node.getAttribute(attr);if(value?.startsWith('/api/parishioner/'))node.setAttribute(attr,publicUrl(value))}});
    rewrite(document);new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n instanceof Element){rewrite(n);for(const attr of ['src','href']){const value=n.getAttribute(attr);if(value?.startsWith('/api/parishioner/'))n.setAttribute(attr,publicUrl(value))}}}))).observe(document.body,{childList:true,subtree:true});
  }
  if(parish){activate();return}
  shell.innerHTML='<section class="guest-dashboard-picker"><h1>신앙생활 이어가기</h1><p>성당을 선택하면 신도 메인 화면을 로그인 없이 볼 수 있습니다.</p><label>성당 선택<select aria-label="둘러볼 성당"><option value="">성당을 선택해 주세요</option></select></label><button class="green-button" data-browse type="button" disabled>로그인 없이 둘러보기</button><button class="green-outline" data-login type="button">로그인</button></section>';
  const select=shell.querySelector('select')!;parishes.forEach(p=>select.add(new Option([p.name,p.diocese].filter(Boolean).join(' · '),String(p.id))));select.onchange=()=>{parish=parishes.find(p=>Number(p.id)===Number(select.value));shell.querySelector<HTMLButtonElement>('[data-browse]')!.disabled=!parish};shell.querySelector<HTMLButtonElement>('[data-browse]')!.onclick=activate;shell.querySelector<HTMLButtonElement>('[data-login]')!.onclick=login;
}
