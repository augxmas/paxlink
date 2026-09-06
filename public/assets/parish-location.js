"use strict";
(() => {
  // src/client/parish-location.ts
  var dashboard = document.querySelector("#parish-dashboard");
  var panel = document.createElement("section");
  panel.id = "location-guide-management";
  panel.hidden = true;
  panel.className = "location-guide-management";
  panel.innerHTML = `<header><div><h2>\uC704\uCE58 \uC548\uB0B4</h2><p>\uC131\uB2F9\uC758 \uC704\uCE58\uC640 \uCC3E\uC544\uC624\uC2DC\uB294 \uAD50\uD1B5\uD3B8\uC744 \uC548\uB0B4\uD569\uB2C8\uB2E4.</p></div></header>
  <div class="location-guide-body">
    <section class="location-map-section"><h3>\uC131\uB2F9 \uC704\uCE58</h3><p id="location-address"></p>
      <p class="location-address-help">\uAE30\uBCF8\uC815\uBCF4\uC5D0 \uC800\uC7A5\uD55C \uC8FC\uC18C\uAC00 \uC9C0\uB3C4\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4.</p>
      <div id="location-map-empty" hidden>\uAE30\uBCF8\uC815\uBCF4\uC5D0\uC11C \uC131\uB2F9 \uC8FC\uC18C\uB97C \uC785\uB825\uD558\uACE0 \uC800\uC7A5\uD574 \uC8FC\uC138\uC694.</div>
      <iframe id="location-map" title="\uC131\uB2F9 \uC704\uCE58 \uC9C0\uB3C4" referrerpolicy="no-referrer-when-downgrade" allowfullscreen hidden></iframe>
      <div class="location-map-actions"><button id="location-edit-address" class="secondary" type="button">\uAE30\uBCF8\uC815\uBCF4\uC5D0\uC11C \uC8FC\uC18C \uC218\uC815</button><a id="location-map-link" target="_blank" rel="noopener noreferrer" hidden>\uC9C0\uB3C4 \uD06C\uAC8C \uBCF4\uAE30 \u2197</a></div>
    </section>
    <form id="location-transport-form"><fieldset disabled><div class="location-transport-heading"><div><h3>\uAD50\uD1B5\uD3B8 \uC548\uB0B4</h3><p>\uC774\uC6A9\uC218\uB2E8\uACFC \uB178\uC120, \uD558\uCC28 \uC704\uCE58 \uB4F1\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.</p></div><button id="location-add-transport" class="secondary" type="button">+ \uAD50\uD1B5\uD3B8 \uCD94\uAC00</button></div>
      <div id="location-transport-rows"></div><p id="location-transport-empty">\uB4F1\uB85D\uB41C \uAD50\uD1B5\uD3B8\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uAD50\uD1B5\uD3B8 \uCD94\uAC00 \uBC84\uD2BC\uC73C\uB85C \uC548\uB0B4\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694.</p>
      <datalist id="location-transport-modes"><option value="\uC9C0\uD558\uCCA0"><option value="\uBC84\uC2A4"><option value="\uC790\uAC00\uC6A9"><option value="\uB3C4\uBCF4"></datalist>
      <div class="location-save-actions"><button id="location-save" class="primary" type="submit">\uC800\uC7A5</button></div>
    </fieldset></form>
    <p id="location-status" role="status" aria-live="polite"></p><button id="location-retry" class="secondary" type="button" hidden>\uB2E4\uC2DC \uBD88\uB7EC\uC624\uAE30</button>
  </div>`;
  document.querySelector("#parish-profile-form").insertAdjacentElement("beforebegin", panel);
  var form = panel.querySelector("form");
  var fieldset = panel.querySelector("fieldset");
  var rows = panel.querySelector("#location-transport-rows");
  var status = panel.querySelector("#location-status");
  var retry = panel.querySelector("#location-retry");
  var save = panel.querySelector("#location-save");
  var add = panel.querySelector("#location-add-transport");
  var map = panel.querySelector("#location-map");
  var loadVersion = 0;
  var rowId = 0;
  async function api(options) {
    const response = await fetch("/api/parish/location-guide", { ...options, headers: { "Content-Type": "application/json" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "\uC704\uCE58 \uC548\uB0B4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  function syncRows() {
    panel.querySelector("#location-transport-empty").hidden = rows.children.length > 0;
    add.disabled = rows.children.length >= 30;
  }
  function addRow(guide = { mode: "", route: "", details: "" }, focus = false) {
    const row = document.createElement("div");
    row.className = "location-transport-row";
    const id = ++rowId;
    row.innerHTML = `<label for="transport-mode-${id}">\uC774\uC6A9\uC218\uB2E8 <span>*</span><input id="transport-mode-${id}" data-field="mode" list="location-transport-modes" maxlength="80" required placeholder="\uC608: \uC9C0\uD558\uCCA0"></label>
    <label for="transport-route-${id}">\uB178\uC120<input id="transport-route-${id}" data-field="route" maxlength="160" placeholder="\uC608: \uACBD\uCD98\uC120"></label>
    <label for="transport-details-${id}">\uC0C1\uC138\uC548\uB0B4 <span>*</span><textarea id="transport-details-${id}" data-field="details" maxlength="2000" required rows="2" placeholder="\uC608: \uD3C9\uB0B4\uD638\uD3C9\uC5ED \uD558\uCC28, 1\uBC88 \uCD9C\uAD6C"></textarea></label>
    <button type="button" class="location-remove" aria-label="\uC774 \uAD50\uD1B5\uD3B8 \uC0AD\uC81C">\uC0AD\uC81C</button>`;
    for (const field of ["mode", "route", "details"]) row.querySelector(`[data-field="${field}"]`).value = guide[field];
    row.querySelector("button").addEventListener("click", () => {
      row.remove();
      syncRows();
    });
    rows.append(row);
    syncRows();
    if (focus) row.querySelector("input").focus();
  }
  async function load() {
    const version = ++loadVersion;
    fieldset.disabled = true;
    retry.hidden = true;
    status.textContent = "\uC704\uCE58 \uC548\uB0B4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.";
    try {
      const data = await api();
      if (version !== loadVersion) return;
      panel.querySelector("#location-address").textContent = [data.address, data.addressDetail].filter(Boolean).join(" ");
      const hasAddress = Boolean(data.address.trim());
      map.hidden = !hasAddress;
      panel.querySelector("#location-map-empty").hidden = hasAddress;
      const link = panel.querySelector("#location-map-link");
      link.hidden = !hasAddress;
      if (hasAddress) {
        const query = encodeURIComponent(data.address.trim());
        map.src = `https://maps.google.com/maps?q=${query}&hl=ko&z=16&output=embed`;
        link.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
      } else {
        map.removeAttribute("src");
        link.removeAttribute("href");
      }
      rows.replaceChildren();
      data.transportGuides.forEach((guide) => addRow(guide));
      syncRows();
      fieldset.disabled = false;
      status.textContent = data.updatedAt ? `\uB9C8\uC9C0\uB9C9 \uC800\uC7A5: ${new Date(data.updatedAt).toLocaleString("ko-KR")}` : "";
    } catch (error) {
      if (version !== loadVersion) return;
      status.textContent = error.message;
      retry.hidden = false;
    }
  }
  add.onclick = () => {
    if (rows.children.length < 30) addRow(void 0, true);
  };
  retry.onclick = () => void load();
  panel.querySelector("#location-edit-address").addEventListener("click", () => document.querySelector('[data-parish-view="basic"]')?.click());
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (fieldset.disabled || !form.reportValidity()) return;
    const transportGuides = [...rows.children].map((row) => Object.fromEntries(["mode", "route", "details"].map((field) => [field, row.querySelector(`[data-field="${field}"]`).value.trim()])));
    fieldset.disabled = true;
    save.textContent = "\uC800\uC7A5 \uC911\u2026";
    try {
      const data = await api({ method: "PUT", body: JSON.stringify({ transportGuides }) });
      status.textContent = data.message;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      fieldset.disabled = false;
      save.textContent = "\uC800\uC7A5";
    }
  };
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-parish-view], [data-main-view]");
    if (!target || !dashboard.contains(target)) return;
    window.setTimeout(() => {
      if (target.dataset.parishView !== "location-guide") {
        panel.hidden = true;
        return;
      }
      panel.parentElement.querySelectorAll(":scope > section, :scope > form").forEach((section) => {
        section.hidden = section !== panel;
      });
      dashboard.querySelectorAll("[data-parish-view]").forEach((button) => {
        const active = button === target;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      panel.hidden = false;
      document.querySelector("#profile-approval-status").hidden = true;
      void load();
    }, 0);
  });
})();
