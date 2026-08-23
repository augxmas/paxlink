"use strict";
(() => {
  // src/client/parish-dictionary.ts
  var dictionaryEscape = (value) => {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  };
  var dictionaryCategories = [];
  var dictionaryTerms = [];
  function ensureParishDictionary() {
    const nav = document.querySelector(".parish-tabs"), anchor = nav?.querySelector('[data-main-view="information"]');
    if (!nav || !anchor || nav.querySelector('[data-main-view="dictionary"]')) return;
    anchor.insertAdjacentHTML("beforebegin", '<button class="parish-tab" data-main-view="dictionary" type="button"><span>\u25A4</span>\uC6A9\uC5B4\uC0AC\uC804</button>');
    const panel = document.createElement("section");
    panel.id = "dictionary-management";
    panel.className = "dictionary-management";
    panel.hidden = true;
    panel.innerHTML = '<header><div><h2>\uAC00\uD1A8\uB9AD \uC6A9\uC5B4\uC0AC\uC804</h2><p>\uCE74\uD14C\uACE0\uB9AC\uBCC4 \uC6A9\uC5B4\uB97C \uAC80\uC0C9\uD558\uACE0 \uC0C8\uB85C\uC6B4 \uC6A9\uC5B4\uB97C \uB4F1\uB85D\uD569\uB2C8\uB2E4.</p></div><button class="primary" data-dictionary-create type="button">+ \uC6A9\uC5B4 \uB4F1\uB85D</button></header><div class="dictionary-filters"><select data-dictionary-category><option value="">\uC804\uCCB4 \uCE74\uD14C\uACE0\uB9AC</option></select><input data-dictionary-query type="search" placeholder="\uC6A9\uC5B4\xB7\uB3D9\uC758\uC5B4\xB7\uC124\uBA85 \uAC80\uC0C9"><button class="secondary" data-dictionary-search type="button">\uAC80\uC0C9</button></div><div class="dictionary-summary" data-dictionary-summary></div><div class="dictionary-grid" data-dictionary-list></div>';
    document.querySelector(".parish-subnav")?.insertAdjacentElement("beforebegin", panel);
    panel.querySelector("[data-dictionary-create]").addEventListener("click", openDictionaryForm);
    panel.querySelector("[data-dictionary-search]").addEventListener("click", renderParishDictionary);
    panel.querySelector("[data-dictionary-query]").addEventListener("keydown", (event) => {
      if (event.key === "Enter") renderParishDictionary();
    });
  }
  function showParishDictionary() {
    ensureParishDictionary();
    const panel = document.querySelector("#dictionary-management");
    document.querySelectorAll("#parish-dashboard [data-main-view]").forEach((button) => button.classList.toggle("active", button.dataset.mainView === "dictionary"));
    ["#parish-profile-form", "#priest-management", "#history-management", "#patron-saint-management", "#administrative-guide-management", "#video-management", "#notice-management", "#parishioner-management", "#information-management", "#sharing-management", "#prayer-management", "#settings-management", "#legion-management"].forEach((selector) => {
      const element = document.querySelector(selector);
      if (element) element.hidden = true;
    });
    document.querySelectorAll(".section-subnav,.parish-subnav").forEach((element) => element.hidden = true);
    const status = document.querySelector("#profile-approval-status");
    if (status) status.hidden = true;
    panel.hidden = false;
    void loadParishDictionary();
  }
  async function loadParishDictionary() {
    const [categoryResponse, termResponse] = await Promise.all([fetch("/api/parish/dictionary/categories"), fetch("/api/parish/dictionary/terms")]);
    const categoryData = await categoryResponse.json(), termData = await termResponse.json();
    if (!categoryResponse.ok || !termResponse.ok) {
      window.dispatchEvent(new CustomEvent("parish:notice", { detail: categoryData.message || termData.message || "\uC6A9\uC5B4\uC0AC\uC804\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." }));
      return;
    }
    dictionaryCategories = categoryData;
    dictionaryTerms = termData;
    const select = document.querySelector("[data-dictionary-category]");
    select.innerHTML = '<option value="">\uC804\uCCB4 \uCE74\uD14C\uACE0\uB9AC</option>' + dictionaryCategories.map((item) => `<option value="${item.id}">${dictionaryEscape(item.name)}</option>`).join("");
    renderParishDictionary();
  }
  function renderParishDictionary() {
    const panel = document.querySelector("#dictionary-management"), query = panel.querySelector("[data-dictionary-query]").value.trim().toLowerCase(), categoryId = Number(panel.querySelector("[data-dictionary-category]").value), category = dictionaryCategories.find((item) => item.id === categoryId)?.name, items = dictionaryTerms.filter((item) => (!category || item.categories.includes(category)) && (!query || [item.term, item.summary, item.description, ...item.aliases].join(" ").toLowerCase().includes(query)));
    panel.querySelector("[data-dictionary-summary]").textContent = `\uCD1D ${items.length}\uAC1C \uC6A9\uC5B4`;
    panel.querySelector("[data-dictionary-list]").innerHTML = items.length ? items.map((item) => `<article><header><div><h3>${dictionaryEscape(item.term)}</h3>${item.aliases.length ? `<small>\uB3D9\uC758\uC5B4 \xB7 ${item.aliases.map(dictionaryEscape).join(", ")}</small>` : ""}</div><b>${item.reviewStatus === "approved" ? "\uC2B9\uC778" : "\uAC80\uD1A0"}</b></header><div class="dictionary-chips">${item.categories.map((value) => `<span>${dictionaryEscape(value)}</span>`).join("")}</div><p>${dictionaryEscape(item.summary)}</p><details><summary>\uC0C1\uC138 \uC124\uBA85</summary><div>${dictionaryEscape(item.description)}</div>${item.sourceUrl ? `<a href="${dictionaryEscape(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">\uCD9C\uCC98 \xB7 ${dictionaryEscape(item.sourceName || item.sourceUrl)}</a>` : ""}</details></article>`).join("") : '<p class="dictionary-empty">\uAC80\uC0C9\uB41C \uC6A9\uC5B4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
  }
  function openDictionaryForm() {
    document.querySelector(".dictionary-editor")?.remove();
    const layer = document.createElement("div");
    layer.className = "priest-modal dictionary-editor";
    layer.innerHTML = `<div class="priest-modal-backdrop" data-close></div><section class="priest-modal-box"><header><div><p>CATHOLIC DICTIONARY</p><h2>\uC6A9\uC5B4 \uB4F1\uB85D</h2></div><button data-close type="button">\xD7</button></header><form><label>\uC6A9\uC5B4 <i>*</i><input name="term" maxlength="200" required></label><fieldset><legend>\uCE74\uD14C\uACE0\uB9AC <i>*</i></legend><div>${dictionaryCategories.map((item) => `<label><input name="categoryIds" type="checkbox" value="${item.id}"> ${dictionaryEscape(item.name)}</label>`).join("")}</div></fieldset><label>\uB3D9\uC758\uC5B4<input name="aliases" maxlength="1000" placeholder="\uC27C\uD45C\uB85C \uAD6C\uBD84\uD574 \uC8FC\uC138\uC694"></label><label>\uC694\uC57D <i>*</i><textarea name="summary" maxlength="1000" rows="3" required></textarea></label><label>\uC0C1\uC138 \uC124\uBA85 <i>*</i><textarea name="description" maxlength="60000" rows="7" required></textarea></label><div class="dictionary-source-fields"><label>\uCD9C\uCC98\uBA85<input name="sourceName" maxlength="200"></label><label>\uCD9C\uCC98 URL<input name="sourceUrl" type="url" maxlength="1000" placeholder="https://"></label></div><p data-error></p><footer><button class="secondary" data-close type="button">\uCDE8\uC18C</button><button class="primary" type="submit">\uB4F1\uB85D</button></footer></form></section>`;
    document.body.append(layer);
    layer.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => layer.remove()));
    const form = layer.querySelector("form");
    form.onsubmit = async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]'), error = form.querySelector("[data-error]"), data = new FormData(form), payload = { term: data.get("term"), summary: data.get("summary"), description: data.get("description"), sourceName: data.get("sourceName"), sourceUrl: data.get("sourceUrl"), categoryIds: data.getAll("categoryIds").map(Number), aliases: String(data.get("aliases") ?? "").split(",").map((value) => value.trim()).filter(Boolean) };
      submit.disabled = true;
      try {
        const response = await fetch("/api/parish/dictionary/terms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), result = await response.json();
        if (!response.ok) throw new Error(result.message);
        layer.remove();
        window.dispatchEvent(new CustomEvent("parish:notice", { detail: result.message }));
        await loadParishDictionary();
      } catch (reason) {
        error.textContent = reason.message;
        submit.disabled = false;
      }
    };
  }
  function showDictionaryCsvResult(result) {
    document.querySelector(".dictionary-csv-result")?.remove();
    const layer = document.createElement("div");
    layer.className = "priest-modal dictionary-csv-result";
    layer.innerHTML = `<div class="priest-modal-backdrop" data-close></div><section class="priest-modal-box"><header><div><p>CSV IMPORT RESULT</p><h2>\uC6A9\uC5B4 \uC77C\uAD04\uB4F1\uB85D \uACB0\uACFC</h2></div><button data-close type="button">\xD7</button></header><div class="dictionary-csv-result-body"><div class="dictionary-csv-counts"><span>\uC804\uCCB4 <b>${result.total}\uAC74</b></span><span class="success">\uB4F1\uB85D <b>${result.inserted}\uAC74</b></span><span class="error">\uAC74\uB108\uB700 <b>${result.skipped}\uAC74</b></span></div>${result.errors.length ? `<div class="dictionary-csv-errors"><table><thead><tr><th>\uD589</th><th>\uC6A9\uC5B4</th><th>\uC624\uB958 \uC0AC\uC720</th></tr></thead><tbody>${result.errors.map((item) => `<tr><td>${item.row}</td><td>${dictionaryEscape(item.term || "-")}</td><td>${dictionaryEscape(item.reason)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="dictionary-csv-complete">\uBAA8\uB4E0 \uB370\uC774\uD130\uAC00 \uC815\uC0C1\uC801\uC73C\uB85C \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.</p>'}</div><footer><button class="primary" data-close type="button">\uD655\uC778</button></footer></section>`;
    document.body.append(layer);
    layer.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => layer.remove()));
  }
  function mountDictionaryCsv() {
    const panel = document.querySelector("#dictionary-management"), header = panel?.querySelector(":scope>header"), create = header?.querySelector("[data-dictionary-create]");
    if (!header || !create || header.querySelector("[data-dictionary-csv]")) return;
    const actions = document.createElement("div");
    actions.className = "dictionary-header-actions";
    actions.innerHTML = '<a class="secondary" href="/assets/catholic-terms-example.csv" download>CSV \uC608\uC81C</a><button class="secondary" data-dictionary-csv type="button">CSV \uC5C5\uB85C\uB4DC</button><input type="file" accept=".csv,text/csv" hidden>';
    create.replaceWith(actions);
    actions.append(create);
    const input = actions.querySelector('input[type="file"]'), button = actions.querySelector("[data-dictionary-csv]");
    button.onclick = () => input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5e6) {
        window.dispatchEvent(new CustomEvent("parish:notice", { detail: "CSV \uD30C\uC77C\uC740 5MB \uC774\uD558\uB9CC \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }));
        input.value = "";
        return;
      }
      button.disabled = true;
      button.textContent = "\uC5C5\uB85C\uB4DC \uC911...";
      try {
        const response = await fetch("/api/parish/dictionary/terms/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: await file.text() }) }), result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showDictionaryCsvResult(result);
        await loadParishDictionary();
      } catch (error) {
        window.dispatchEvent(new CustomEvent("parish:notice", { detail: error.message }));
      } finally {
        button.disabled = false;
        button.textContent = "CSV \uC5C5\uB85C\uB4DC";
        input.value = "";
      }
    };
  }
  function mountDictionaryToolbar() {
    const panel = document.querySelector("#dictionary-management"), toolbar = panel?.querySelector(".dictionary-filters"), actions = panel?.querySelector(".dictionary-header-actions"), search = toolbar?.querySelector("[data-dictionary-search]");
    if (!panel || !toolbar || !actions || !search || toolbar.dataset.complete) return;
    toolbar.dataset.complete = "true";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "secondary";
    reset.dataset.dictionaryReset = "1";
    reset.textContent = "\uCD08\uAE30\uD654";
    reset.onclick = () => {
      panel.querySelector("[data-dictionary-category]").value = "";
      const query = panel.querySelector("[data-dictionary-query]");
      query.value = "";
      renderParishDictionary();
      query.focus();
    };
    search.insertAdjacentElement("afterend", reset);
    [...actions.children].forEach((element) => toolbar.append(element));
    actions.remove();
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest('[data-main-view="dictionary"]');
    if (button) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showParishDictionary();
      return;
    }
    if (event.target.closest('[data-main-view]:not([data-main-view="dictionary"])')) {
      const panel = document.querySelector("#dictionary-management");
      if (panel) panel.hidden = true;
    }
  }, true);
  document.head.insertAdjacentHTML("beforeend", "<style>.dictionary-management{min-height:460px;padding:24px;border:1px solid var(--line);border-radius:12px;background:#fff}.dictionary-management>header{display:flex;align-items:center;justify-content:space-between;gap:16px}.dictionary-management h2{margin:0 0 6px}.dictionary-management header p{margin:0;color:#748096}.dictionary-filters{display:grid;grid-template-columns:180px minmax(200px,1fr) auto;gap:8px;margin:20px 0 10px}.dictionary-filters select,.dictionary-filters input{height:42px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:#fff}.dictionary-summary{margin:12px 0;color:#718096;font-size:11px}.dictionary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.dictionary-grid article{padding:18px;border:1px solid var(--line);border-radius:11px;background:#fbfcfe}.dictionary-grid article>header{display:flex;justify-content:space-between;gap:10px}.dictionary-grid h3{margin:0 0 5px}.dictionary-grid header small{color:#7a8798}.dictionary-grid header>b{height:24px;padding:4px 9px;border-radius:12px;background:#eaf7f1;color:#18815f;font-size:9px}.dictionary-chips{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0}.dictionary-chips span{padding:4px 8px;border-radius:12px;background:#edf4fc;color:#2766ad;font-size:9px}.dictionary-grid article>p{line-height:1.65}.dictionary-grid details{border-top:1px solid var(--line);padding-top:10px}.dictionary-grid summary{color:#1769e0;font-weight:700;cursor:pointer}.dictionary-grid details div{padding:10px 0;line-height:1.7;white-space:pre-wrap}.dictionary-grid details a{color:#1769e0;font-size:9px}.dictionary-empty{grid-column:1/-1;padding:70px;text-align:center;color:#7a8798}.dictionary-editor .priest-modal-box{width:min(94vw,720px)}.dictionary-editor form{display:grid;gap:13px;padding:22px;overflow:auto}.dictionary-editor form>label,.dictionary-source-fields label{display:grid;gap:6px;font-weight:700}.dictionary-editor input,.dictionary-editor textarea{padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit}.dictionary-editor fieldset{border:1px solid var(--line);border-radius:9px}.dictionary-editor fieldset>div{display:flex;flex-wrap:wrap;gap:10px}.dictionary-editor fieldset label{font-weight:600}.dictionary-source-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dictionary-editor [data-error]{min-height:16px;margin:0;color:#c43d49}.dictionary-editor form>footer{display:flex;justify-content:center;gap:8px}@media(max-width:720px){.dictionary-management{padding:15px}.dictionary-management>header{align-items:flex-start}.dictionary-filters{grid-template-columns:1fr}.dictionary-grid{grid-template-columns:1fr}.dictionary-source-fields{grid-template-columns:1fr}.dictionary-editor form{padding:16px}}</style>");
  document.head.insertAdjacentHTML("beforeend", '<style>.dictionary-editor form>label{position:relative}.dictionary-editor form>label>i{position:absolute;top:0;left:-9px;margin:0;color:#d43b4d;font-style:normal;line-height:1}.dictionary-editor fieldset legend{font-weight:700}.dictionary-editor fieldset legend i{display:inline!important;margin:0;color:#d43b4d;font-style:normal}.dictionary-editor fieldset>div{gap:8px 14px}.dictionary-editor fieldset label{display:inline-flex!important;align-items:center;gap:6px;min-height:28px;padding:3px 7px;border:1px solid transparent;border-radius:7px;cursor:pointer}.dictionary-editor fieldset label:hover{border-color:#bfd0e7;background:#f5f8fc}.dictionary-editor fieldset input[type="checkbox"]{flex:0 0 15px!important;width:15px!important;height:15px!important;margin:0!important;padding:0!important;accent-color:var(--blue);cursor:pointer}.dictionary-editor fieldset label:has(input:checked){border-color:#a9c6ea;background:#edf4fc;color:var(--blue)}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.dictionary-header-actions{display:flex;align-items:center;gap:7px}.dictionary-header-actions a,.dictionary-header-actions button{display:inline-flex;width:auto;height:40px;align-items:center;justify-content:center;padding:0 13px;border-radius:8px;text-decoration:none;white-space:nowrap}.dictionary-csv-result .priest-modal-box{width:min(94vw,760px)}.dictionary-csv-result-body{padding:22px;overflow:auto}.dictionary-csv-counts{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px}.dictionary-csv-counts span{padding:14px;border-radius:9px;background:#f3f6fa;color:#64748b}.dictionary-csv-counts b{display:block;margin-top:5px;color:#334155;font-size:18px}.dictionary-csv-counts .success{background:#eaf7f1;color:#16805e}.dictionary-csv-counts .error{background:#fff1f2;color:#b33b4b}.dictionary-csv-errors{max-height:360px;overflow:auto;border:1px solid var(--line);border-radius:9px}.dictionary-csv-errors table{width:100%;border-collapse:collapse}.dictionary-csv-errors th,.dictionary-csv-errors td{padding:10px;border-bottom:1px solid var(--line);text-align:left}.dictionary-csv-errors th{position:sticky;top:0;background:#f5f8fc;color:#637189}.dictionary-csv-errors th:first-child{width:60px}.dictionary-csv-errors th:nth-child(2){width:150px}.dictionary-csv-complete{padding:40px;border-radius:10px;background:#eaf7f1;color:#16805e;text-align:center;font-weight:700}.dictionary-csv-result footer{display:flex;justify-content:center}@media(max-width:720px){.dictionary-management>header{flex-direction:column}.dictionary-header-actions{width:100%;flex-wrap:wrap}.dictionary-header-actions a,.dictionary-header-actions button{flex:1}.dictionary-csv-counts{grid-template-columns:1fr}.dictionary-csv-errors{overflow-x:auto}.dictionary-csv-errors table{min-width:520px}}</style>");
  document.head.insertAdjacentHTML("beforeend", '<style>.dictionary-management>header{display:block}.dictionary-filters[data-complete="true"]{display:flex;align-items:center;gap:7px;overflow-x:auto;padding-bottom:3px}.dictionary-filters[data-complete="true"]>[data-dictionary-category]{flex:0 0 160px}.dictionary-filters[data-complete="true"]>[data-dictionary-query]{flex:1 1 260px;min-width:220px}.dictionary-filters[data-complete="true"]>button,.dictionary-filters[data-complete="true"]>a{display:inline-flex;flex:0 0 auto;width:auto;height:42px;align-items:center;justify-content:center;margin:0!important;padding:0 13px;border-radius:8px;text-decoration:none;white-space:nowrap;box-sizing:border-box}.dictionary-filters[data-complete="true"]>[data-dictionary-create]{order:7;align-self:center;margin:0!important;height:42px!important;line-height:1!important;transform:none}.dictionary-filters[data-complete="true"]>input[type="file"]{display:none}@media(max-width:900px){.dictionary-filters[data-complete="true"]{margin-right:-5px;padding-bottom:8px}.dictionary-filters[data-complete="true"]>[data-dictionary-query]{flex-basis:240px}}</style>');
  ensureParishDictionary();
  mountDictionaryCsv();
  mountDictionaryToolbar();
})();
