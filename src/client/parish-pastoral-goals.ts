type Goal = { area: string; title: string; plan: string };
type Plan = { theme: string; scripture: string; direction: string; goals: Goal[] };
const dashboard = document.querySelector<HTMLElement>("#parish-dashboard")!;
const panel = document.createElement("section");
panel.id = "pastoral-goals-management";
panel.hidden = true;
panel.innerHTML = `<h2>사목 목표</h2><p>본당 공동체의 신앙과 삶을 돌보기 위한 사목 방향과 실천계획을 연도별로 관리합니다.</p>
<div class="pastoral-year"><label>연도<input id="pastoral-year" type="number" min="1900" max="2200" step="1"></label><button type="button" id="pastoral-load" class="secondary">불러오기 / 새로 작성</button><label>저장된 연도<select id="pastoral-years"><option value="">선택</option></select></label></div>
<p id="pastoral-status" role="status" aria-live="polite"></p>
<form><fieldset disabled><legend id="pastoral-heading"></legend>
<label>사목 주제 / 표어 *<input name="theme" maxlength="200" required placeholder="올해 본당이 함께 지향하는 사목 주제"></label>
<label>주제 성구<textarea name="scripture" maxlength="1000" rows="2" placeholder="성경 구절과 장·절을 입력해 주세요."></textarea></label>
<label>사목 방향<textarea name="direction" maxlength="10000" rows="5" placeholder="교구의 사목 방향과 본당 상황을 바탕으로 작성해 주세요."></textarea></label>
<h3>중점 목표 및 실천계획</h3><div id="pastoral-rows"></div><button type="button" id="pastoral-add" class="secondary">+ 중점 목표 추가</button>
<datalist id="pastoral-areas"><option value="전례·기도"><option value="말씀·교육"><option value="선교·복음화"><option value="친교·공동체"><option value="나눔·봉사"><option value="청소년·가정"><option value="생태·사회"></datalist>
<div class="pastoral-actions"><button type="submit" class="primary">저장</button><button type="button" id="pastoral-delete" class="secondary" hidden>해당 연도 삭제</button></div>
</fieldset></form>`;
document.querySelector("#parish-profile-form")!.insertAdjacentElement("beforebegin", panel);
const find = <T extends HTMLElement>(s: string) => panel.querySelector<T>(s)!;
const yearInput = find<HTMLInputElement>("#pastoral-year");
const years = find<HTMLSelectElement>("#pastoral-years");
const fieldset = find<HTMLFieldSetElement>("fieldset");
const form = find<HTMLFormElement>("form");
const rows = find<HTMLDivElement>("#pastoral-rows");
const status = find<HTMLParagraphElement>("#pastoral-status");
let year = new Date().getFullYear(), dirty = false, busy = false;
yearInput.value = String(year);
function controls(locked: boolean) { busy = locked; fieldset.disabled = locked; yearInput.disabled = locked; years.disabled = locked; find<HTMLButtonElement>("#pastoral-load").disabled = locked; }
async function api(method = "GET", content?: Plan) {
  const response = await fetch(`/api/parish/pastoral-goals/${year}`, { method, headers: { "Content-Type": "application/json" }, ...(content ? { body: JSON.stringify(content) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "사목 목표 처리에 실패했습니다.");
  return data;
}
function addRow(goal: Goal = { area: "", title: "", plan: "" }) {
  if (rows.children.length >= 30) return;
  const row = document.createElement("div"); row.className = "pastoral-goal";
  row.innerHTML = `<label>분야<input data-field="area" maxlength="80" list="pastoral-areas" placeholder="선택하거나 직접 입력"></label><label>중점 목표 *<input data-field="title" maxlength="300" required></label><label>실천계획<textarea data-field="plan" maxlength="5000" rows="3"></textarea></label><button type="button" class="secondary">목표 삭제</button>`;
  for (const key of ["area", "title", "plan"] as const) row.querySelector<HTMLInputElement>(`[data-field="${key}"]`)!.value = goal[key];
  row.querySelector("button")!.onclick = () => { row.remove(); dirty = true; find<HTMLButtonElement>("#pastoral-add").disabled = false; };
  rows.append(row); find<HTMLButtonElement>("#pastoral-add").disabled = rows.children.length >= 30;
}
async function load() {
  controls(true); status.textContent = "사목 목표를 불러오는 중입니다.";
  try {
    const data = await api();
    const content: Plan = data.content ?? { theme: "", scripture: "", direction: "", goals: [] };
    for (const key of ["theme", "scripture", "direction"] as const) find<HTMLInputElement>(`[name="${key}"]`).value = content[key];
    rows.replaceChildren(); find<HTMLButtonElement>("#pastoral-add").disabled = false; content.goals.forEach(addRow);
    years.replaceChildren(new Option("저장된 연도 선택", "")); data.years.forEach((y: number) => years.add(new Option(`${y}년`, String(y))));
    years.value = data.content ? String(year) : "";
    find("#pastoral-heading").textContent = `${year}년 사목 목표`;
    find("#pastoral-delete").hidden = !data.content;
    status.textContent = data.content ? "저장된 사목 목표를 불러왔습니다." : "등록된 사목 목표가 없습니다. 새로 작성해 주세요.";
    dirty = false; controls(false);
  } catch (e) { status.textContent = (e as Error).message; controls(false); fieldset.disabled = true; }
}
function changeYear(value: number) {
  if (busy) return;
  if (!Number.isInteger(value) || value < 1900 || value > 2200) { status.textContent = "연도는 1900~2200 사이로 입력해 주세요."; return; }
  if (dirty && !confirm("저장하지 않은 내용이 있습니다. 버리고 불러올까요?")) { yearInput.value = String(year); years.value = ""; return; }
  year = value; yearInput.value = String(year); void load();
}
form.oninput = () => { dirty = true; };
find<HTMLButtonElement>("#pastoral-load").onclick = () => changeYear(Number(yearInput.value));
years.onchange = () => { if (years.value) changeYear(Number(years.value)); };
find<HTMLButtonElement>("#pastoral-add").onclick = () => { addRow(); dirty = true; };
form.onsubmit = async e => {
  e.preventDefault(); if (busy || fieldset.disabled || !form.reportValidity()) return;
  const content = { theme: find<HTMLInputElement>('[name="theme"]').value, scripture: find<HTMLTextAreaElement>('[name="scripture"]').value, direction: find<HTMLTextAreaElement>('[name="direction"]').value,
    goals: [...rows.children].map(row => Object.fromEntries(["area", "title", "plan"].map(key => [key, row.querySelector<HTMLInputElement>(`[data-field="${key}"]`)!.value])) as Goal) };
  controls(true);
  try { await api("PUT", content); dirty = false; await load(); status.textContent = `${year}년 사목 목표를 저장했습니다.`; }
  catch (e) { status.textContent = (e as Error).message; controls(false); }
};
find<HTMLButtonElement>("#pastoral-delete").onclick = async () => {
  if (busy || !confirm(`${year}년 사목 목표를 삭제할까요?`)) return;
  controls(true);
  try { await api("DELETE"); dirty = false; await load(); } catch (e) { status.textContent = (e as Error).message; controls(false); }
};
window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("click", e => {
  const target = (e.target as Element).closest<HTMLElement>("[data-parish-view], [data-main-view]");
  if (!target || !dashboard.contains(target)) return;
  setTimeout(() => {
    if (target.dataset.parishView !== "pastoral-goals") { panel.hidden = true; return; }
    panel.parentElement!.querySelectorAll<HTMLElement>(":scope > section, :scope > form").forEach(section => { section.hidden = section !== panel; });
    dashboard.querySelectorAll<HTMLElement>("[data-parish-view]").forEach(button => { button.classList.toggle("active", button === target); button.setAttribute("aria-selected", String(button === target)); });
    findOutside("#profile-approval-status");
    if (!dirty && !busy) void load();
  }, 0);
});
function findOutside(selector: string) { const el = document.querySelector<HTMLElement>(selector); if (el) el.hidden = true; }
export {};
