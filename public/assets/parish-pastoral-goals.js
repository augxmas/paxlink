"use strict";
(() => {
  // src/client/parish-pastoral-goals.ts
  var dashboard = document.querySelector("#parish-dashboard");
  var panel = document.createElement("section");
  panel.id = "pastoral-goals-management";
  panel.hidden = true;
  panel.innerHTML = `<h2>\uC0AC\uBAA9 \uBAA9\uD45C</h2><p>\uBCF8\uB2F9 \uACF5\uB3D9\uCCB4\uC758 \uC2E0\uC559\uACFC \uC0B6\uC744 \uB3CC\uBCF4\uAE30 \uC704\uD55C \uC0AC\uBAA9 \uBC29\uD5A5\uACFC \uC2E4\uCC9C\uACC4\uD68D\uC744 \uC5F0\uB3C4\uBCC4\uB85C \uAD00\uB9AC\uD569\uB2C8\uB2E4.</p>
<div class="pastoral-year"><label>\uC5F0\uB3C4<input id="pastoral-year" type="number" min="1900" max="2200" step="1"></label><button type="button" id="pastoral-load" class="secondary">\uBD88\uB7EC\uC624\uAE30 / \uC0C8\uB85C \uC791\uC131</button><label>\uC800\uC7A5\uB41C \uC5F0\uB3C4<select id="pastoral-years"><option value="">\uC120\uD0DD</option></select></label></div>
<p id="pastoral-status" role="status" aria-live="polite"></p>
<form><fieldset disabled><legend id="pastoral-heading"></legend>
<label>\uC0AC\uBAA9 \uC8FC\uC81C / \uD45C\uC5B4 *<input name="theme" maxlength="200" required placeholder="\uC62C\uD574 \uBCF8\uB2F9\uC774 \uD568\uAED8 \uC9C0\uD5A5\uD558\uB294 \uC0AC\uBAA9 \uC8FC\uC81C"></label>
<label>\uC8FC\uC81C \uC131\uAD6C<textarea name="scripture" maxlength="1000" rows="2" placeholder="\uC131\uACBD \uAD6C\uC808\uACFC \uC7A5\xB7\uC808\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea></label>
<label>\uC0AC\uBAA9 \uBC29\uD5A5<textarea name="direction" maxlength="10000" rows="5" placeholder="\uAD50\uAD6C\uC758 \uC0AC\uBAA9 \uBC29\uD5A5\uACFC \uBCF8\uB2F9 \uC0C1\uD669\uC744 \uBC14\uD0D5\uC73C\uB85C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label>
<h3>\uC911\uC810 \uBAA9\uD45C \uBC0F \uC2E4\uCC9C\uACC4\uD68D</h3><div id="pastoral-rows"></div><button type="button" id="pastoral-add" class="secondary">+ \uC911\uC810 \uBAA9\uD45C \uCD94\uAC00</button>
<datalist id="pastoral-areas"><option value="\uC804\uB840\xB7\uAE30\uB3C4"><option value="\uB9D0\uC500\xB7\uAD50\uC721"><option value="\uC120\uAD50\xB7\uBCF5\uC74C\uD654"><option value="\uCE5C\uAD50\xB7\uACF5\uB3D9\uCCB4"><option value="\uB098\uB214\xB7\uBD09\uC0AC"><option value="\uCCAD\uC18C\uB144\xB7\uAC00\uC815"><option value="\uC0DD\uD0DC\xB7\uC0AC\uD68C"></datalist>
<div class="pastoral-actions"><button type="submit" class="primary">\uC800\uC7A5</button><button type="button" id="pastoral-delete" class="secondary" hidden>\uD574\uB2F9 \uC5F0\uB3C4 \uC0AD\uC81C</button></div>
</fieldset></form>`;
  document.querySelector("#parish-profile-form").insertAdjacentElement("beforebegin", panel);
  var find = (s) => panel.querySelector(s);
  var yearInput = find("#pastoral-year");
  var years = find("#pastoral-years");
  var fieldset = find("fieldset");
  var form = find("form");
  var rows = find("#pastoral-rows");
  var status = find("#pastoral-status");
  var year = (/* @__PURE__ */ new Date()).getFullYear();
  var dirty = false;
  var busy = false;
  yearInput.value = String(year);
  function controls(locked) {
    busy = locked;
    fieldset.disabled = locked;
    yearInput.disabled = locked;
    years.disabled = locked;
    find("#pastoral-load").disabled = locked;
  }
  async function api(method = "GET", content) {
    const response = await fetch(`/api/parish/pastoral-goals/${year}`, { method, headers: { "Content-Type": "application/json" }, ...content ? { body: JSON.stringify(content) } : {} });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "\uC0AC\uBAA9 \uBAA9\uD45C \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  function addRow(goal = { area: "", title: "", plan: "" }) {
    if (rows.children.length >= 30) return;
    const row = document.createElement("div");
    row.className = "pastoral-goal";
    row.innerHTML = `<label>\uBD84\uC57C<input data-field="area" maxlength="80" list="pastoral-areas" placeholder="\uC120\uD0DD\uD558\uAC70\uB098 \uC9C1\uC811 \uC785\uB825"></label><label>\uC911\uC810 \uBAA9\uD45C *<input data-field="title" maxlength="300" required></label><label>\uC2E4\uCC9C\uACC4\uD68D<textarea data-field="plan" maxlength="5000" rows="3"></textarea></label><button type="button" class="secondary">\uBAA9\uD45C \uC0AD\uC81C</button>`;
    for (const key of ["area", "title", "plan"]) row.querySelector(`[data-field="${key}"]`).value = goal[key];
    row.querySelector("button").onclick = () => {
      row.remove();
      dirty = true;
      find("#pastoral-add").disabled = false;
    };
    rows.append(row);
    find("#pastoral-add").disabled = rows.children.length >= 30;
  }
  async function load() {
    controls(true);
    status.textContent = "\uC0AC\uBAA9 \uBAA9\uD45C\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.";
    try {
      const data = await api();
      const content = data.content ?? { theme: "", scripture: "", direction: "", goals: [] };
      for (const key of ["theme", "scripture", "direction"]) find(`[name="${key}"]`).value = content[key];
      rows.replaceChildren();
      find("#pastoral-add").disabled = false;
      content.goals.forEach(addRow);
      years.replaceChildren(new Option("\uC800\uC7A5\uB41C \uC5F0\uB3C4 \uC120\uD0DD", ""));
      data.years.forEach((y) => years.add(new Option(`${y}\uB144`, String(y))));
      years.value = data.content ? String(year) : "";
      find("#pastoral-heading").textContent = `${year}\uB144 \uC0AC\uBAA9 \uBAA9\uD45C`;
      find("#pastoral-delete").hidden = !data.content;
      status.textContent = data.content ? "\uC800\uC7A5\uB41C \uC0AC\uBAA9 \uBAA9\uD45C\uB97C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4." : "\uB4F1\uB85D\uB41C \uC0AC\uBAA9 \uBAA9\uD45C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C \uC791\uC131\uD574 \uC8FC\uC138\uC694.";
      dirty = false;
      controls(false);
    } catch (e) {
      status.textContent = e.message;
      controls(false);
      fieldset.disabled = true;
    }
  }
  function changeYear(value) {
    if (busy) return;
    if (!Number.isInteger(value) || value < 1900 || value > 2200) {
      status.textContent = "\uC5F0\uB3C4\uB294 1900~2200 \uC0AC\uC774\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
      return;
    }
    if (dirty && !confirm("\uC800\uC7A5\uD558\uC9C0 \uC54A\uC740 \uB0B4\uC6A9\uC774 \uC788\uC2B5\uB2C8\uB2E4. \uBC84\uB9AC\uACE0 \uBD88\uB7EC\uC62C\uAE4C\uC694?")) {
      yearInput.value = String(year);
      years.value = "";
      return;
    }
    year = value;
    yearInput.value = String(year);
    void load();
  }
  form.oninput = () => {
    dirty = true;
  };
  find("#pastoral-load").onclick = () => changeYear(Number(yearInput.value));
  years.onchange = () => {
    if (years.value) changeYear(Number(years.value));
  };
  find("#pastoral-add").onclick = () => {
    addRow();
    dirty = true;
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy || fieldset.disabled || !form.reportValidity()) return;
    const content = {
      theme: find('[name="theme"]').value,
      scripture: find('[name="scripture"]').value,
      direction: find('[name="direction"]').value,
      goals: [...rows.children].map((row) => Object.fromEntries(["area", "title", "plan"].map((key) => [key, row.querySelector(`[data-field="${key}"]`).value])))
    };
    controls(true);
    try {
      await api("PUT", content);
      dirty = false;
      await load();
      status.textContent = `${year}\uB144 \uC0AC\uBAA9 \uBAA9\uD45C\uB97C \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.`;
    } catch (e2) {
      status.textContent = e2.message;
      controls(false);
    }
  };
  find("#pastoral-delete").onclick = async () => {
    if (busy || !confirm(`${year}\uB144 \uC0AC\uBAA9 \uBAA9\uD45C\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694?`)) return;
    controls(true);
    try {
      await api("DELETE");
      dirty = false;
      await load();
    } catch (e) {
      status.textContent = e.message;
      controls(false);
    }
  };
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-parish-view], [data-main-view]");
    if (!target || !dashboard.contains(target)) return;
    setTimeout(() => {
      if (target.dataset.parishView !== "pastoral-goals") {
        panel.hidden = true;
        return;
      }
      panel.parentElement.querySelectorAll(":scope > section, :scope > form").forEach((section) => {
        section.hidden = section !== panel;
      });
      dashboard.querySelectorAll("[data-parish-view]").forEach((button) => {
        button.classList.toggle("active", button === target);
        button.setAttribute("aria-selected", String(button === target));
      });
      findOutside("#profile-approval-status");
      if (!dirty && !busy) void load();
    }, 0);
  });
  function findOutside(selector) {
    const el = document.querySelector(selector);
    if (el) el.hidden = true;
  }
})();
