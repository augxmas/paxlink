type Information = { basic: Record<string, string>; priests: Array<Record<string,string>>; history: Array<{year:number;month:number;title:string;description:string}>; transportGuides:Array<{mode:string;route:string;details:string}>; patronHtml:string; guideHtml:string; plans:Array<{year:number;content:{theme:string;scripture:string;direction:string;goals:Array<{area:string;title:string;plan:string}>}}> };
const photo = document.querySelector<HTMLElement>(".parish-photo");
if (photo && location.hostname === "hopyeongdong.paxlink.kr") {
  const cards = [["priests","👨‍⚕️","신부님 소개"],["location","📍","위치 안내"],["history","📜","본당 연혁"],["patron","⭐","주보 성인"],["guide","📋","행정 안내"],["territory","🗺️","관할 구역"],["pastoral","🎯","사목 목표"],["basic","🏫","성당 소개"],["contact","☎️","성당연락처"]];
  photo.removeAttribute("aria-hidden"); photo.setAttribute("role","button"); photo.tabIndex=0; photo.setAttribute("aria-label","성당 안내 열기"); photo.setAttribute("aria-haspopup","dialog");
  const dialog=document.createElement("dialog");dialog.id="intro-information";dialog.setAttribute("aria-labelledby","intro-info-title");
  dialog.innerHTML='<header class="intro-info-header"><button type="button" aria-label="이전 화면">‹</button><div><h2 id="intro-info-title">호평동 성당 안내</h2><p>확인할 성당 정보를 선택해 주세요</p></div></header><div class="intro-info-grid"></div><div class="intro-info-content" aria-live="polite" hidden></div>';
  document.body.append(dialog);
  const grid=dialog.querySelector<HTMLElement>(".intro-info-grid")!, body=dialog.querySelector<HTMLElement>(".intro-info-content")!,title=dialog.querySelector("h2")!,hint=dialog.querySelector<HTMLElement>("header p")!,back=dialog.querySelector<HTMLButtonElement>("header button")!;
  let active="", version=0, opener:HTMLButtonElement|null=null;
  const el=(tag:string,text:string)=>{const e=document.createElement(tag);e.textContent=text;return e};
  const empty=()=>body.append(el("p","아직 등록된 정보가 없습니다."));
  function markup(html:string){
    const t=document.createElement("template");t.innerHTML=html;
    t.content.querySelectorAll("script,style,iframe,object,embed,svg,math,template").forEach(e=>e.remove());
    const allowed=new Set(['P','BR','STRONG','B','EM','I','U','UL','OL','LI','H1','H2','H3','H4','BLOCKQUOTE','A','IMG','TABLE','THEAD','TBODY','TR','TD','TH','DIV','SPAN']);
    const clean=(root:DocumentFragment|Element)=>{[...root.children].forEach(e=>{clean(e);if(!allowed.has(e.tagName)){e.replaceWith(...e.childNodes);return}const url=e.getAttribute(e.tagName==='IMG'?'src':'href');[...e.attributes].forEach(a=>e.removeAttribute(a.name));if(url&&['A','IMG'].includes(e.tagName)){try{const parsed=new URL(url,location.origin);if(['http:','https:'].includes(parsed.protocol)){e.setAttribute(e.tagName==='IMG'?'src':'href',parsed.href);if(e.tagName==='A'){e.setAttribute('target','_blank');e.setAttribute('rel','noopener noreferrer')}else e.setAttribute('alt','성당 안내 이미지')}}catch{}}})};clean(t.content);
    if(!t.content.textContent?.trim()&&!t.content.querySelector('img[src]'))empty();else body.append(t.content);
  }
  function render(kind:string,data:Information){
    const b=data.basic;
    if(kind==='patron'||kind==='guide'){markup(kind==='patron'?data.patronHtml:data.guideHtml);return}
    if(kind==='basic'||kind==='contact'||kind==='territory'){
      const fields=kind==='basic'?[['name','성당명'],['diocese','교구'],['district','지구'],['address','주소'],['addressDetail','상세주소']]:kind==='territory'?[['diocese','교구'],['district','지구'],['jurisdiction','관할 구역']]:[['phone','대표전화'],['officePhone','사무실'],['fax','팩스'],['address','주소']];
      fields.forEach(([key,label])=>body.append(el('h3',label),el('p',b[key]||'등록된 정보가 없습니다.')));return;
    }
    if(kind==='priests'){if(!data.priests.length)empty();data.priests.forEach(p=>{const a=el('article','');a.append(el('h3',`${p.name}${p.baptismalName?' ('+p.baptismalName+')':''}`),el('p',[p.role,p.affiliation].filter(Boolean).join(' · ')));body.append(a)});return}
    if(kind==='history'){if(!data.history.length)empty();data.history.forEach(h=>{const a=el('article','');a.append(el('h3',`${h.year}.${String(h.month).padStart(2,'0')} · ${h.title}`),el('p',h.description||''));body.append(a)});return}
    if(kind==='location'){
      if(b.address){body.append(el('p',[b.address,b.addressDetail].filter(Boolean).join(' ')));const map=document.createElement('iframe');map.title='성당 위치 지도';map.src=`https://maps.google.com/maps?q=${encodeURIComponent(b.address)}&hl=ko&z=16&output=embed`;body.append(map)}else empty();
      body.append(el('h3','교통편 안내'));if(!data.transportGuides.length)empty();data.transportGuides.forEach(g=>{const a=el('article','');a.append(el('h3',[g.mode,g.route].filter(Boolean).join(' · ')),el('p',g.details));body.append(a)});return;
    }
    if(kind==='pastoral'){
      if(!data.plans.length){empty();return}const label=el('label','연도 '),select=document.createElement('select'),content=el('div','');select.setAttribute('aria-label','사목 목표 연도');data.plans.forEach(p=>select.add(new Option(`${p.year}년`,String(p.year))));select.value=String(data.plans.find(p=>p.year===new Date().getFullYear())?.year??data.plans[0].year);
      const show=()=>{const p=data.plans.find(p=>p.year===Number(select.value))!.content;content.replaceChildren(el('h3',p.theme));if(p.scripture)content.append(el('blockquote',p.scripture));if(p.direction)content.append(el('p',p.direction));p.goals.forEach(g=>{const a=el('article','');a.append(el('h3',[g.area,g.title].filter(Boolean).join(' · ')),el('p',g.plan));content.append(a)})};select.onchange=show;label.append(select);body.append(label,content);show();
    }
  }
  async function open(kind:string,label:string){
    const request=++version;active=kind;grid.hidden=true;body.hidden=false;title.textContent=label;hint.hidden=true;back.focus();dialog.scrollTop=0;body.replaceChildren(el('p','성당 정보를 불러오는 중입니다.'));
    try{const response=await fetch('/api/public/parish-information',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.message||'성당 정보를 불러오지 못했습니다.');if(request!==version||!dialog.open)return;body.replaceChildren();render(kind,data)}catch(e){if(request!==version||!dialog.open)return;body.replaceChildren(el('p',(e as Error).message));const retry=el('button','다시 불러오기');retry.onclick=()=>void open(kind,label);body.append(retry)}
  }
  cards.forEach(([kind,icon,label])=>{const button=document.createElement('button');button.type='button';button.dataset.kind=kind;const emoji=el('span',icon);emoji.setAttribute('aria-hidden','true');button.append(emoji,el('strong',label));button.onclick=()=>{opener=button;void open(kind,label)};grid.append(button)});
  const reset=()=>{++version;active='';grid.hidden=false;body.hidden=true;title.textContent='호평동 성당 안내';hint.hidden=false;dialog.scrollTop=0};
  back.onclick=()=>{if(active){reset();opener?.focus()}else dialog.close()};
  dialog.addEventListener('cancel',e=>{if(active){e.preventDefault();reset();opener?.focus()}});
  dialog.addEventListener('close',()=>{++version;photo.focus()});
  photo.onclick=()=>{reset();dialog.showModal();back.focus()};
  photo.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();photo.click()}};
}
export {};
