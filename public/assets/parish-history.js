"use strict";
(() => {
  // src/client/parish-history.ts
  var panel = document.querySelector("#history-management");
  var profile = document.querySelector("#parish-profile-form");
  var clergy = document.querySelector("#priest-management");
  var form = document.querySelector("#history-form");
  var year = document.querySelector("#history-year");
  var month = document.querySelector("#history-month");
  var title = document.querySelector("#history-title");
  var description = document.querySelector("#history-description");
  var id = document.querySelector("#history-id");
  var errorBox = document.querySelector("#history-form-error");
  var items = [];
  for (let value = 1; value <= 12; value++) month.add(new Option(`${value}\uC6D4`, String(value)));
  async function api(url, options) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers ?? {} } });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."), { errors: data.errors });
    return data;
  }
  function notice(message) {
    window.dispatchEvent(new CustomEvent("parish:notice", { detail: message }));
  }
  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }
  document.querySelectorAll("[data-parish-view]").forEach((button) => button.addEventListener("click", async () => {
    const active = button.dataset.parishView === "history";
    panel.hidden = !active;
    if (active) {
      profile.hidden = true;
      clergy.hidden = true;
      document.querySelector("#profile-approval-status").hidden = true;
      await loadHistory();
    } else panel.hidden = true;
  }));
  async function loadHistory(enabledOnly = false) {
    const result = await api(`/api/parish/history${enabledOnly ? "?enabled=true" : ""}`);
    if (!enabledOnly) {
      items = result.items;
      document.querySelector("#history-sort").value = result.sortDirection;
      renderAdmin();
    }
    return result.items;
  }
  function renderAdmin() {
    const list = document.querySelector("#history-list");
    list.replaceChildren();
    for (const item of items) {
      const article = document.createElement("article");
      article.className = `history-item${item.enabled ? "" : " is-disabled"}`;
      article.innerHTML = `<time><strong>${item.year}</strong><span>${String(item.month).padStart(2, "0")}\uC6D4</span></time><div class="history-copy"><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div><div class="history-item-actions"><label class="history-enable"><input type="checkbox" ${item.enabled ? "checked" : ""}> <span>${item.enabled ? "\uC0AC\uC6A9" : "\uBBF8\uC0AC\uC6A9"}</span></label><button class="history-edit" type="button">\uC218\uC815</button><button class="history-delete" type="button">\uC0AD\uC81C</button></div>`;
      const enabled = article.querySelector(".history-enable input");
      enabled.addEventListener("change", async () => {
        await saveItem(item, { enabled: enabled.checked });
        notice(enabled.checked ? "\uC5F0\uD601\uC774 \uD65C\uC131\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : "\uC5F0\uD601\uC774 \uBE44\uD65C\uC131\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      });
      article.querySelector(".history-edit").addEventListener("click", () => startEdit(item));
      article.querySelector(".history-delete").addEventListener("click", () => removeItem(item));
      list.append(article);
    }
    document.querySelector("#history-empty").hidden = items.length > 0;
  }
  function payload(item) {
    return { year: Number(year.value), month: Number(month.value), title: title.value.trim(), description: description.value.trim(), enabled: item?.enabled ?? true };
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";
    const current = items.find((item) => item.id === Number(id.value));
    try {
      const result = await api(current ? `/api/parish/history/${current.id}` : "/api/parish/history", { method: current ? "PATCH" : "POST", body: JSON.stringify(payload(current)) });
      resetForm();
      await loadHistory();
      notice(result.message);
    } catch (error) {
      const failure = error;
      errorBox.textContent = failure.errors ? Object.values(failure.errors)[0] ?? failure.message : failure.message;
    }
  });
  async function saveItem(item, changes) {
    try {
      const result = await api(`/api/parish/history/${item.id}`, { method: "PATCH", body: JSON.stringify({ ...item, ...changes }) });
      await loadHistory();
      return result;
    } catch (error) {
      notice(error.message);
      await loadHistory();
      throw error;
    }
  }
  function startEdit(item) {
    id.value = String(item.id);
    year.value = String(item.year);
    month.value = String(item.month);
    title.value = item.title;
    description.value = item.description ?? "";
    document.querySelector("#history-submit").textContent = "\uC800\uC7A5";
    document.querySelector("#history-cancel-edit").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function resetForm() {
    form.reset();
    id.value = "";
    errorBox.textContent = "";
    document.querySelector("#history-submit").textContent = "\uCD94\uAC00";
    document.querySelector("#history-cancel-edit").hidden = true;
  }
  document.querySelector("#history-cancel-edit").addEventListener("click", resetForm);
  async function removeItem(item) {
    if (!window.confirm(`${item.year}\uB144 ${item.month}\uC6D4 \uC5F0\uD601\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`)) return;
    try {
      const result = await api(`/api/parish/history/${item.id}`, { method: "DELETE" });
      if (id.value === String(item.id)) resetForm();
      await loadHistory();
      notice(result.message);
    } catch (error) {
      notice(error.message);
    }
  }
  document.querySelector("#history-sort").addEventListener("change", async (event) => {
    const sortDirection = event.currentTarget.value;
    try {
      const result = await api("/api/parish/history/preferences", { method: "PUT", body: JSON.stringify({ sortDirection }) });
      await loadHistory();
      notice(result.message);
    } catch (error) {
      notice(error.message);
    }
  });
  var preview = document.querySelector("#history-preview");
  document.querySelector("#history-view-all").addEventListener("click", async () => {
    const enabled = await loadHistory(true), list = document.querySelector("#history-preview-list");
    list.innerHTML = enabled.length ? enabled.map((item) => `<article><time><strong>${item.year}</strong><span>${String(item.month).padStart(2, "0")}\uC6D4</span></time><div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("") : '<div class="history-empty">\uD45C\uC2DC\uD560 \uC5F0\uD601\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
    preview.hidden = false;
    document.body.classList.add("modal-open");
  });
  document.querySelectorAll("[data-history-preview-close]").forEach((element) => element.addEventListener("click", () => {
    preview.hidden = true;
    document.body.classList.remove("modal-open");
  }));
})();
