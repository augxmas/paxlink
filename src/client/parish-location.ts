type TransportGuide = { mode: string; route: string; details: string };
type LocationGuide = { name: string; address: string; addressDetail: string; transportGuides: TransportGuide[]; updatedAt: string | null };

const dashboard = document.querySelector<HTMLElement>("#parish-dashboard")!;
const panel = document.createElement("section");
panel.id = "location-guide-management";
panel.hidden = true;
panel.className = "location-guide-management";
panel.innerHTML = `<header><div><h2>위치 안내</h2><p>성당의 위치와 찾아오시는 교통편을 안내합니다.</p></div></header>
  <div class="location-guide-body">
    <section class="location-map-section"><h3>성당 위치</h3><p id="location-address"></p>
      <p class="location-address-help">기본정보에 저장한 주소가 지도에 반영됩니다.</p>
      <div id="location-map-empty" hidden>기본정보에서 성당 주소를 입력하고 저장해 주세요.</div>
      <iframe id="location-map" title="성당 위치 지도" referrerpolicy="no-referrer-when-downgrade" allowfullscreen hidden></iframe>
      <div class="location-map-actions"><button id="location-edit-address" class="secondary" type="button">기본정보에서 주소 수정</button><a id="location-map-link" target="_blank" rel="noopener noreferrer" hidden>지도 크게 보기 ↗</a></div>
    </section>
    <form id="location-transport-form"><fieldset disabled><div class="location-transport-heading"><div><h3>교통편 안내</h3><p>이용수단과 노선, 하차 위치 등을 입력해 주세요.</p></div><button id="location-add-transport" class="secondary" type="button">+ 교통편 추가</button></div>
      <div id="location-transport-rows"></div><p id="location-transport-empty">등록된 교통편이 없습니다. 교통편 추가 버튼으로 안내를 작성해 주세요.</p>
      <datalist id="location-transport-modes"><option value="지하철"><option value="버스"><option value="자가용"><option value="도보"></datalist>
      <div class="location-save-actions"><button id="location-save" class="primary" type="submit">저장</button></div>
    </fieldset></form>
    <p id="location-status" role="status" aria-live="polite"></p><button id="location-retry" class="secondary" type="button" hidden>다시 불러오기</button>
  </div>`;
document.querySelector("#parish-profile-form")!.insertAdjacentElement("beforebegin", panel);
const form = panel.querySelector<HTMLFormElement>("form")!;
const fieldset = panel.querySelector<HTMLFieldSetElement>("fieldset")!;
const rows = panel.querySelector<HTMLElement>("#location-transport-rows")!;
const status = panel.querySelector<HTMLElement>("#location-status")!;
const retry = panel.querySelector<HTMLButtonElement>("#location-retry")!;
const save = panel.querySelector<HTMLButtonElement>("#location-save")!;
const add = panel.querySelector<HTMLButtonElement>("#location-add-transport")!;
const map = panel.querySelector<HTMLIFrameElement>("#location-map")!;
let loadVersion = 0;
let rowId = 0;

async function api<T>(options?: RequestInit): Promise<T> {
  const response = await fetch("/api/parish/location-guide", { ...options, headers: { "Content-Type": "application/json" } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "위치 안내를 불러오지 못했습니다.");
  return data as T;
}
function syncRows() {
  panel.querySelector<HTMLElement>("#location-transport-empty")!.hidden = rows.children.length > 0;
  add.disabled = rows.children.length >= 30;
}
function addRow(guide: TransportGuide = { mode: "", route: "", details: "" }, focus = false) {
  const row = document.createElement("div");
  row.className = "location-transport-row";
  const id = ++rowId;
  row.innerHTML = `<label for="transport-mode-${id}">이용수단 <span>*</span><input id="transport-mode-${id}" data-field="mode" list="location-transport-modes" maxlength="80" required placeholder="예: 지하철"></label>
    <label for="transport-route-${id}">노선<input id="transport-route-${id}" data-field="route" maxlength="160" placeholder="예: 경춘선"></label>
    <label for="transport-details-${id}">상세안내 <span>*</span><textarea id="transport-details-${id}" data-field="details" maxlength="2000" required rows="2" placeholder="예: 평내호평역 하차, 1번 출구"></textarea></label>
    <button type="button" class="location-remove" aria-label="이 교통편 삭제">삭제</button>`;
  for (const field of ["mode", "route", "details"] as const) row.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${field}"]`)!.value = guide[field];
  row.querySelector("button")!.addEventListener("click", () => { row.remove(); syncRows(); });
  rows.append(row); syncRows();
  if (focus) row.querySelector("input")!.focus();
}
async function load() {
  const version = ++loadVersion;
  fieldset.disabled = true; retry.hidden = true; status.textContent = "위치 안내를 불러오는 중입니다.";
  try {
    const data = await api<LocationGuide>();
    if (version !== loadVersion) return;
    panel.querySelector("#location-address")!.textContent = [data.address, data.addressDetail].filter(Boolean).join(" ");
    const hasAddress = Boolean(data.address.trim());
    map.hidden = !hasAddress;
    panel.querySelector<HTMLElement>("#location-map-empty")!.hidden = hasAddress;
    const link = panel.querySelector<HTMLAnchorElement>("#location-map-link")!;
    link.hidden = !hasAddress;
    if (hasAddress) {
      const query = encodeURIComponent(data.address.trim());
      map.src = `https://maps.google.com/maps?q=${query}&hl=ko&z=16&output=embed`;
      link.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    } else { map.removeAttribute("src"); link.removeAttribute("href"); }
    rows.replaceChildren(); data.transportGuides.forEach(guide => addRow(guide)); syncRows();
    fieldset.disabled = false;
    status.textContent = data.updatedAt ? `마지막 저장: ${new Date(data.updatedAt).toLocaleString("ko-KR")}` : "";
  } catch (error) {
    if (version !== loadVersion) return;
    status.textContent = (error as Error).message; retry.hidden = false;
  }
}
add.onclick = () => { if (rows.children.length < 30) addRow(undefined, true); };
retry.onclick = () => void load();
panel.querySelector("#location-edit-address")!.addEventListener("click", () => document.querySelector<HTMLButtonElement>('[data-parish-view="basic"]')?.click());
form.onsubmit = async event => {
  event.preventDefault();
  if (fieldset.disabled || !form.reportValidity()) return;
  const transportGuides = [...rows.children].map(row => Object.fromEntries(["mode", "route", "details"].map(field => [field, row.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${field}"]`)!.value.trim()])));
  fieldset.disabled = true; save.textContent = "저장 중…";
  try { const data = await api<{ message: string }>({ method: "PUT", body: JSON.stringify({ transportGuides }) }); status.textContent = data.message; }
  catch (error) { status.textContent = (error as Error).message; }
  finally { fieldset.disabled = false; save.textContent = "저장"; }
};
document.addEventListener("click", event => {
  const target = (event.target as Element).closest<HTMLElement>("[data-parish-view], [data-main-view]");
  if (!target || !dashboard.contains(target)) return;
  window.setTimeout(() => {
    if (target.dataset.parishView !== "location-guide") { panel.hidden = true; return; }
    panel.parentElement!.querySelectorAll<HTMLElement>(":scope > section, :scope > form").forEach(section => { section.hidden = section !== panel; });
    dashboard.querySelectorAll<HTMLElement>("[data-parish-view]").forEach(button => { const active = button === target; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    panel.hidden = false;
    document.querySelector<HTMLElement>("#profile-approval-status")!.hidden = true;
    void load();
  }, 0);
});
export {};
