type DetailKind = "location-guide" | "patron-saint" | "pastoral-goals";
type PastoralGoals = { plans: Array<{ year: number; content: { theme: string; scripture: string; direction: string; goals: Array<{ area: string; title: string; plan: string }> } }> };

function renderPastoralGoals(body: HTMLElement, data: PastoralGoals) {
  if (!data.plans.length) { body.append(textElement("p", "아직 등록된 사목 목표가 없습니다.")); return; }
  const label = document.createElement("label"); label.textContent = "연도 ";
  const select = document.createElement("select"); select.setAttribute("aria-label", "사목 목표 연도");
  data.plans.forEach(plan => select.add(new Option(`${plan.year}년`, String(plan.year))));
  const current = new Date().getFullYear();
  select.value = String(data.plans.find(plan => plan.year === current)?.year ?? data.plans[0].year);
  const content = document.createElement("div"); content.className = "member-pastoral-content";
  const render = () => {
    const selected = data.plans.find(plan => plan.year === Number(select.value))!;
    const plan = selected.content;
    content.replaceChildren(textElement("h4", `${selected.year}년 사목 목표`), textElement("h2", plan.theme));
    if (plan.scripture) content.append(textElement("blockquote", plan.scripture));
    if (plan.direction) content.append(textElement("h4", "사목 방향"), textElement("p", plan.direction));
    if (plan.goals.length) content.append(textElement("h4", "중점 목표 및 실천계획"));
    plan.goals.forEach((goal, index) => {
      const article = document.createElement("article"); article.className = "member-transport-guide";
      if (goal.area) article.append(textElement("strong", goal.area));
      article.append(textElement("h4", `${index + 1}. ${goal.title}`));
      if (goal.plan) article.append(textElement("p", goal.plan));
      content.append(article);
    });
  };
  select.onchange = render; label.append(select); body.append(label, content); render();
}
type LocationGuide = { name: string; address: string; addressDetail: string; transportGuides: Array<{ mode: string; route: string; details: string }> };
type PatronSaint = { name: string; contentHtml: string };

function safeUrl(value: string) {
  if (/^\/(?!\/)/.test(value) && !value.includes("\\")) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
}
// Administrator content is displayed as formatted text and images, never executable markup.
export function cleanPatronContent(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script,style,iframe,object,embed,svg,math,template").forEach(element => element.remove());
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE", "A", "IMG"]);
  const clean = (root: DocumentFragment | Element) => {
    [...root.children].forEach(element => {
      clean(element);
      if (!allowed.has(element.tagName)) { element.replaceWith(...element.childNodes); return; }
      const href = safeUrl(element.getAttribute("href") ?? "");
      const src = safeUrl(element.getAttribute("src") ?? "");
      const alt = element.getAttribute("alt") ?? "주보 성인";
      [...element.attributes].forEach(attribute => element.removeAttribute(attribute.name));
      if (element.tagName === "A") {
        if (!href) { element.replaceWith(...element.childNodes); return; }
        element.setAttribute("href", href); element.setAttribute("target", "_blank"); element.setAttribute("rel", "noopener noreferrer");
      }
      if (element.tagName === "IMG") {
        if (!src) { element.remove(); return; }
        element.setAttribute("src", src); element.setAttribute("alt", alt);
      }
    });
  };
  clean(template.content);
  return template.content;
}
function textElement(tag: string, text: string) {
  const element = document.createElement(tag); element.textContent = text; return element;
}
function renderLocation(body: HTMLElement, data: LocationGuide) {
  body.append(textElement("h4", data.name));
  if (data.address.trim()) {
    body.append(textElement("p", [data.address, data.addressDetail].filter(Boolean).join(" ")));
    const query = encodeURIComponent(data.address.trim());
    const map = document.createElement("iframe");
    map.title = `${data.name} 위치 지도`;
    map.src = `https://maps.google.com/maps?q=${query}&hl=ko&z=16&output=embed`;
    map.referrerPolicy = "no-referrer-when-downgrade"; map.allowFullscreen = true;
    body.append(map);
    const link = document.createElement("a"); link.textContent = "지도 크게 보기 ↗";
    link.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    link.target = "_blank"; link.rel = "noopener noreferrer"; body.append(link);
  } else body.append(textElement("p", "아직 등록된 성당 주소가 없습니다."));
  body.append(textElement("h4", "교통편 안내"));
  if (!data.transportGuides.length) body.append(textElement("p", "아직 등록된 교통편 안내가 없습니다."));
  for (const guide of data.transportGuides) {
    const article = document.createElement("article"); article.className = "member-transport-guide";
    article.append(textElement("strong", guide.mode));
    if (guide.route) article.append(textElement("b", guide.route));
    article.append(textElement("p", guide.details)); body.append(article);
  }
}
export async function openMemberParishDetail(kind: DetailKind) {
  document.querySelector(".member-parish-information-modal")?.remove();
  const opener = document.activeElement as HTMLElement | null;
  document.body.classList.remove("member-menu-open");
  const menu = document.querySelector("#member-mobile-menu"); menu?.classList.remove("open"); menu?.setAttribute("aria-hidden", "true");
  const backdrop = document.querySelector<HTMLElement>("#member-menu-backdrop"); if (backdrop) backdrop.hidden = true;
  const menuButton = document.querySelector<HTMLButtonElement>("#member-menu-button");
  menuButton?.setAttribute("aria-expanded", "false"); menuButton?.setAttribute("aria-label", "메뉴 열기");
  const layer = document.createElement("div"); layer.className = "member-modal member-parish-information-modal member-parish-detail-modal";
  layer.innerHTML = `<section class="member-modal-box" role="dialog" aria-modal="true" aria-labelledby="member-parish-detail-title"><h3 id="member-parish-detail-title"></h3><div class="member-modal-body" aria-live="polite"></div><footer><button class="green-outline" type="button">닫기</button></footer></section>`;
  layer.querySelector("h3")!.textContent = `성당정보 · ${{ "location-guide": "위치 안내", "patron-saint": "주보 성인", "pastoral-goals": "사목 목표" }[kind]}`;
  const body = layer.querySelector<HTMLElement>(".member-modal-body")!;
  const close = layer.querySelector<HTMLButtonElement>("footer button")!;
  const controller = new AbortController();
  close.onclick = () => { controller.abort(); layer.remove(); (menuButton ?? opener)?.focus(); };
  layer.onkeydown = event => { if (event.key === "Escape") { event.preventDefault(); close.click(); } };
  document.body.append(layer); close.focus();
  const load = async () => {
    body.replaceChildren(textElement("p", "성당 정보를 불러오는 중입니다."));
    try {
      const response = await fetch(`/api/parishioner/${kind}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "성당 정보를 불러오지 못했습니다.");
      if (!layer.isConnected) return;
      body.replaceChildren();
      if (kind === "location-guide") renderLocation(body, data as LocationGuide);
      else if (kind === "pastoral-goals") renderPastoralGoals(body, data as PastoralGoals);
      else {
        const patron = data as PatronSaint;
        body.append(textElement("h4", patron.name));
        const content = document.createElement("div"); content.className = "member-patron-content";
        content.append(cleanPatronContent(patron.contentHtml));
        if (!content.textContent?.trim() && !content.querySelector("img")) content.append(textElement("p", "아직 등록된 주보 성인 안내가 없습니다."));
        body.append(content);
      }
    } catch (error) {
      if (!layer.isConnected || controller.signal.aborted) return;
      body.replaceChildren(textElement("p", (error as Error).message));
      const retry = document.createElement("button"); retry.type = "button"; retry.className = "green-outline"; retry.textContent = "다시 불러오기"; retry.onclick = () => void load(); body.append(retry);
    }
  };
  await load();
}
function mountParishDetailMenus() {
  const submenu = document.querySelector("#member-parish-information-menu .member-parish-information-submenu");
  if (!submenu) return;
  for (const [kind, label] of [["location-guide", "위치 안내"], ["patron-saint", "주보 성인"], ["pastoral-goals", "사목 목표"]] as const) {
    if (submenu.querySelector(`[data-member-parish-detail="${kind}"]`)) continue;
    const button = document.createElement("button"); button.type = "button"; button.dataset.memberParishDetail = kind; button.textContent = label;
    button.onclick = () => void openMemberParishDetail(kind); submenu.append(button);
  }
}
new MutationObserver(mountParishDetailMenus).observe(document.body, { childList: true, subtree: true });
mountParishDetailMenus();
document.head.insertAdjacentHTML("beforeend", `<style>
#member-parish-information-menu [data-member-parish-detail="location-guide"]:before{content:"05"}
#member-parish-information-menu [data-member-parish-detail="patron-saint"]:before{content:"06"}
#member-parish-information-menu [data-member-parish-detail="pastoral-goals"]:before{content:"07"}
.member-pastoral-content p,.member-pastoral-content blockquote{white-space:pre-wrap;line-height:1.8}
.member-pastoral-content h2{font-size:20px;line-height:1.5}
.member-parish-detail-modal select{padding:10px;margin:0 0 16px 8px;border:1px solid var(--line);border-radius:8px;background:white;color:var(--green);font:inherit}
.member-parish-detail-modal .member-modal-box{width:min(92vw,800px)}
.member-parish-detail-modal .member-modal-body{overflow-wrap:anywhere}
.member-parish-detail-modal h4{margin:8px 0 14px;font-size:15px;color:var(--green)}
.member-parish-detail-modal iframe{display:block;box-sizing:border-box;width:100%;height:340px;margin:16px 0;border:1px solid var(--line);border-radius:12px}
.member-parish-detail-modal a{color:var(--green)}
.member-parish-detail-modal a+h4{margin-top:26px}
.member-transport-guide{margin:10px 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:#f7fbf9}
.member-transport-guide strong{color:var(--green)}
.member-transport-guide b{margin-left:12px}
.member-transport-guide p{white-space:pre-wrap;line-height:1.8}
.member-patron-content{line-height:1.9}
.member-patron-content img{display:block;max-width:100%;height:auto;margin:12px auto}
@media(max-width:600px){.member-parish-detail-modal iframe{height:280px}.member-parish-detail-modal .member-modal-body{padding:16px}}
</style>`);
