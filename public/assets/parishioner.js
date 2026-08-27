"use strict";
(() => {
  // src/client/session-countdown.ts
  var options = null;
  var deadline = 0;
  var timer = 0;
  var dismissed = false;
  var nativeFetch = window.fetch.bind(window);
  function removeCountdown() {
    document.querySelector("#session-countdown-modal")?.remove();
  }
  function resetDeadline() {
    if (!options) return;
    deadline = Date.now() + 10 * 60 * 1e3;
    dismissed = false;
    removeCountdown();
  }
  window.fetch = (async (input, init) => {
    const response = await nativeFetch(input, init), url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    if (options && url.includes(options.logoutUrl)) {
      stopSessionCountdown();
    } else if (options && response.ok && url.includes("/api/")) resetDeadline();
    return response;
  });
  function showCountdown(seconds) {
    if (!options || dismissed) return;
    let layer = document.querySelector("#session-countdown-modal");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "session-countdown-modal";
      layer.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="session-countdown-title"><div class="session-timeout-icon">\u23F1</div><h2 id="session-countdown-title">\uC138\uC158 \uB9CC\uB8CC \uC608\uC815</h2><p>\uB85C\uADF8\uC778 \uC138\uC158\uC774 \uACE7 \uB9CC\uB8CC\uB429\uB2C8\uB2E4.</p><strong><span data-session-seconds></span>\uCD08</strong><small class="session-error" aria-live="polite"></small><footer><button class="session-extend" type="button">\uB85C\uADF8\uC778 \uC5F0\uC7A5</button><button class="session-logout" type="button">\uB85C\uADF8\uC544\uC6C3</button></footer></section>`;
      layer.style.setProperty("--session-color", options.color);
      document.body.append(layer);
      layer.querySelector(".session-extend").onclick = () => void extendSession();
      layer.querySelector(".session-logout").onclick = () => void logoutNow();
    }
    layer.querySelector("[data-session-seconds]").textContent = String(seconds);
  }
  async function extendSession() {
    const current = options, layer = document.querySelector("#session-countdown-modal");
    if (!current || !layer) return;
    const button = layer.querySelector(".session-extend"), error = layer.querySelector(".session-error"), extendUrl = current.extendUrl ?? current.logoutUrl.replace(/\/logout$/, "/me");
    button.disabled = true;
    button.textContent = "\uC5F0\uC7A5 \uC911...";
    error.textContent = "";
    try {
      const response = await nativeFetch(extendUrl, { method: current.extendMethod ?? "GET", cache: "no-store" });
      if (response.status === 401) {
        stopSessionCountdown();
        location.href = current.redirectUrl;
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "\uB85C\uADF8\uC778 \uC5F0\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }
      resetDeadline();
    } catch (reason) {
      button.disabled = false;
      button.textContent = "\uB85C\uADF8\uC778 \uC5F0\uC7A5";
      error.textContent = reason.message;
    }
  }
  async function logoutNow() {
    const current = options;
    if (!current) return;
    stopSessionCountdown();
    try {
      await nativeFetch(current.logoutUrl, { method: "POST" });
    } finally {
      location.href = current.redirectUrl;
    }
  }
  function tick() {
    if (!options) return;
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1e3));
    if (seconds <= 60) showCountdown(seconds);
    if (seconds === 0) void logoutNow();
  }
  function startSessionCountdown(value) {
    options = value;
    resetDeadline();
    window.clearInterval(timer);
    timer = window.setInterval(tick, 250);
    tick();
  }
  function stopSessionCountdown() {
    options = null;
    deadline = 0;
    window.clearInterval(timer);
    timer = 0;
    removeCountdown();
  }
  var style = document.createElement("style");
  style.textContent = `#session-countdown-modal{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:rgba(8,22,42,.58);backdrop-filter:blur(3px)}#session-countdown-modal section{width:min(100%,390px);padding:32px;border-radius:18px;background:#fff;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.28)}#session-countdown-modal .session-timeout-icon{display:grid;width:54px;height:54px;margin:0 auto 16px;place-items:center;border-radius:16px;background:color-mix(in srgb,var(--session-color) 12%,white);font-size:25px}#session-countdown-modal h2{margin:0;font-size:21px}#session-countdown-modal p{margin:9px 0;color:#748197;font-size:13px}#session-countdown-modal strong{display:block;margin:18px 0 8px;color:var(--session-color);font-size:27px}#session-countdown-modal .session-error{display:block;min-height:18px;margin-bottom:8px;color:#d94350;font-size:11px}#session-countdown-modal footer{display:grid;grid-template-columns:1fr 1fr;gap:9px}#session-countdown-modal button{height:46px;border:0;border-radius:9px;font:inherit;font-weight:800;cursor:pointer}#session-countdown-modal button:disabled{opacity:.55;cursor:wait}#session-countdown-modal .session-extend{border:1px solid color-mix(in srgb,var(--session-color) 35%,white);background:#fff;color:var(--session-color)}#session-countdown-modal .session-logout{background:var(--session-color);color:#fff}`;
  document.head.append(style);

  // src/client/parishioner-legion.ts
  function mountLegionCardLayout() {
    document.querySelectorAll(".member-legion>div>article").forEach((card) => {
      if (card.dataset.layoutMounted) return;
      const footer = card.querySelector(":scope>footer"), president = card.querySelector(":scope>.legion-card-president");
      if (!footer || !president) return;
      card.dataset.layoutMounted = "1";
      const edit = footer.querySelector("[data-edit-org]"), raw = [...footer.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? "").join("").trim(), parts = raw.split("\xB7").map((value) => value.trim()).filter(Boolean);
      if (parts[0] && parts[0] !== "\uAC00\uC785 \uC804") {
        const meta = document.createElement("span");
        meta.className = "legion-card-member-meta";
        meta.textContent = `\uC5ED\uD560: ${parts[0]}${parts[1] ? ` \xB7 \uAC00\uC785\uC77C: ${parts[1]}` : ""}`;
        president.append(meta);
      }
      if (edit) {
        let actions = card.querySelector(":scope>.legion-card-actions");
        if (!actions) {
          actions = document.createElement("nav");
          actions.className = "legion-card-actions";
          footer.insertAdjacentElement("beforebegin", actions);
        }
        actions.append(edit);
      }
      footer.hidden = true;
    });
  }
  new MutationObserver(mountLegionCardLayout).observe(document.documentElement, { childList: true, subtree: true });
  mountLegionCardLayout();
  function placeLegionEditButtonLast() {
    document.querySelectorAll(".member-legion>div>article").forEach((card) => {
      const edit = card.querySelector("[data-edit-org]"), community = card.querySelector(":scope>.legion-community-actions"), actions = community ?? card.querySelector(":scope>.legion-card-actions");
      if (edit && actions && actions.lastElementChild !== edit) actions.append(edit);
    });
  }
  new MutationObserver(placeLegionEditButtonLast).observe(document.documentElement, { childList: true, subtree: true });
  placeLegionEditButtonLast();
  function mergeLegionCardActions() {
    document.querySelectorAll(".member-legion>div>article").forEach((card) => {
      const primary = card.querySelector(":scope>.legion-card-actions"), community = card.querySelector(":scope>.legion-community-actions");
      if (!primary || !community || primary === community) return;
      [...community.children].forEach((button) => primary.append(button));
      community.remove();
      placeLegionEditButtonLast();
    });
  }
  new MutationObserver(mergeLegionCardActions).observe(document.documentElement, { childList: true, subtree: true });
  mergeLegionCardActions();
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion>div>article{display:flex;min-height:100%;flex-direction:column}.member-legion>div>article>.legion-card-actions,.member-legion>div>article>.legion-community-actions{display:flex!important;flex-wrap:nowrap!important;width:100%;margin-top:auto!important;margin-bottom:0!important;padding-top:14px;overflow-x:auto}.member-legion>div>article>.legion-card-actions [data-edit-org],.member-legion>div>article>.legion-community-actions [data-edit-org]{order:999;margin-left:auto!important}.member-legion>div>article>.legion-card-actions::-webkit-scrollbar,.member-legion>div>article>.legion-community-actions::-webkit-scrollbar{height:4px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion article .legion-card-member-meta{width:auto!important;margin-left:0!important}.member-legion article>.legion-community-actions [data-edit-org]{margin-left:0;border-color:var(--green);background:#fff;color:var(--green)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion article .legion-card-president{display:flex;flex-wrap:wrap;align-items:center;gap:7px}.legion-card-member-meta{margin-left:auto;padding:5px 9px;border-radius:12px;background:#edf7f3;color:#31725c!important;font-size:9px;font-weight:700;white-space:nowrap}.member-legion article>.legion-card-actions [data-edit-org]{margin-left:0;border-color:var(--green);background:#fff;color:var(--green)}.member-legion article>footer[hidden]{display:none!important}@media(max-width:560px){.legion-card-member-meta{width:100%;margin:5px 0 0}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion article.legion-praesidium>.legion-card-title{max-width:none!important}.member-legion article.legion-praesidium>.legion-card-title h3{overflow:visible!important;text-overflow:clip!important}.member-legion article.legion-praesidium>.legion-card-title+small{max-width:none!important;overflow:visible!important;text-overflow:clip!important}.member-legion article.legion-praesidium.has-icon>.legion-card-title+small{padding-right:0}@media(max-width:520px){.member-legion article.legion-praesidium>.legion-card-title{max-width:none!important}.member-legion article.legion-praesidium>.legion-card-title+small{max-width:none!important;font-size:inherit!important}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion article.legion-praesidium{white-space:nowrap}.member-legion article.legion-praesidium>.legion-card-title{display:inline-flex;max-width:calc(100% - 115px);margin:10px 8px 0 0;vertical-align:middle}.member-legion article.legion-praesidium>.legion-card-title h3{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.member-legion article.legion-praesidium>.legion-card-title+small{display:inline-flex;max-width:110px;margin-top:10px;overflow:hidden;color:#65776f;text-overflow:ellipsis;vertical-align:middle;white-space:nowrap}.member-legion article.legion-praesidium>header,.member-legion article.legion-praesidium>p,.member-legion article.legion-praesidium>footer{white-space:normal}@media(max-width:520px){.member-legion article.legion-praesidium>.legion-card-title{max-width:calc(100% - 95px)}.member-legion article.legion-praesidium>.legion-card-title+small{max-width:90px;font-size:8px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion>div{grid-template-columns:repeat(auto-fit,minmax(360px,1fr))}.member-legion article.legion-praesidium>.legion-card-actions,.member-legion article.legion-praesidium>.legion-community-actions{display:inline-flex;flex-wrap:nowrap;gap:4px;margin:12px 4px 14px 0;vertical-align:middle}.member-legion article.legion-praesidium>.legion-card-actions button,.member-legion article.legion-praesidium>.legion-community-actions button{flex:none;height:32px;padding:0 8px;font-size:9px;white-space:nowrap}@media(max-width:430px){.member-legion>div{grid-template-columns:minmax(0,1fr)}.member-legion article.legion-praesidium>.legion-card-actions,.member-legion article.legion-praesidium>.legion-community-actions{gap:3px}.member-legion article.legion-praesidium>.legion-card-actions button,.member-legion article.legion-praesidium>.legion-community-actions button{padding:0 6px;font-size:8px}}</style>");
  var roles = { president: "\uB2E8\uC7A5", vice_president: "\uBD80\uB2E8\uC7A5", secretary: "\uC11C\uAE30", treasurer: "\uD68C\uACC4", member: "\uB2E8\uC6D0", curia_president: "\uC0C1\uC704 \uAFB8\uB9AC\uC544 \uB2E8\uC7A5", visitor: "\uAC00\uC785 \uC804" };
  var organizationStatuses = { draft: "\uC791\uC131\uC911", requested: "\uC2B9\uC778 \uB300\uAE30\uC911", approved: "\uD65C\uB3D9\uC911", rejected: "\uBC18\uB824", ended: "\uC885\uB8CC" };
  function esc(v) {
    const d = document.createElement("div");
    d.textContent = String(v ?? "");
    return d.innerHTML;
  }
  async function api(url, options2) {
    const editForm = document.querySelector(".member-legion-edit form");
    if (options2?.method === "POST" && /\/api\/parishioner\/legion\/organizations\/\d+\/edit-requests$/.test(url) && editForm?.dataset.onlyIcon === "true") {
      const payload = JSON.parse(String(options2.body ?? "{}"));
      const organizationId = url.match(/organizations\/(\d+)/)?.[1];
      const iconResponse = await fetch(`/api/parishioner/legion/organizations/${organizationId}/icon`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ iconType: payload.iconType, iconData: payload.iconData }) });
      const iconResult = await iconResponse.json();
      if (!iconResponse.ok) throw new Error(iconResult.message ?? "\uC870\uC9C1 \uC544\uC774\uCF58\uC744 \uBCC0\uACBD\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      return iconResult;
    }
    if (options2?.method === "POST" && /\/api\/parishioner\/legion\/organizations\/\d+\/posts$/.test(url)) {
      const file = document.querySelector('.legion-content-modal .legion-post-form input[name="attachment"]')?.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("\uCCA8\uBD80\uD30C\uC77C\uC740 5MB \uC774\uD558\uC758 \uD30C\uC77C 1\uAC1C\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
        const payload = JSON.parse(String(options2.body ?? "{}"));
        payload.attachment = { name: file.name, type: file.type || "application/octet-stream", data: await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject(new Error("\uCCA8\uBD80\uD30C\uC77C\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
          reader.readAsDataURL(file);
        }) };
        options2 = { ...options2, body: JSON.stringify(payload) };
      }
    }
    const response = await fetch(url, { ...options2, headers: { "Content-Type": "application/json", ...options2?.headers ?? {} } });
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(response.ok ? "\uC11C\uBC84 \uC751\uB2F5\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." : "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC11C\uBC84 \uBC18\uC601 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
    }
    if (!response.ok) throw new Error(data.message ?? "\uC694\uCCAD \uC2E4\uD328");
    if (url === "/api/parishioner/legion/organizations" && options2?.method === "POST" && data.id) {
      const file = document.querySelector(".member-legion-create [data-legion-icon]")?.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) throw new Error("\uC870\uC9C1 \uC544\uC774\uCF58\uC740 2MB \uC774\uD558 \uC774\uBBF8\uC9C0\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
        const iconData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject(new Error("\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
          reader.readAsDataURL(file);
        });
        const iconResponse = await fetch(`/api/parishioner/legion/organizations/${data.id}/icon`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ iconType: file.type, iconData }) });
        if (!iconResponse.ok) {
          const error = await iconResponse.json();
          throw new Error(error.message ?? "\uC870\uC9C1 \uC544\uC774\uCF58\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
        }
      }
    }
    return data;
  }
  function panel() {
    let p = document.querySelector(".member-legion");
    if (p) return p;
    p = document.createElement("section");
    p.className = "member-legion";
    p.hidden = true;
    p.innerHTML = '<header><div><small>LEGIO MARIAE</small><h2>\uB808\uC9C0\uC624\uB9C8\uB9AC\uC5D0</h2></div><button class="green-button" type="button">+ \uC870\uC9C1 \uC0DD\uC131</button></header><div></div>';
    document.querySelector("main").append(p);
    p.querySelector("button").onclick = create;
    return p;
  }
  async function show() {
    document.querySelectorAll("main>section").forEach((s) => s.hidden = true);
    const p = panel();
    p.hidden = false;
    const list = p.lastElementChild;
    try {
      const [items, profile] = await Promise.all([api("/api/parishioner/legion/organizations"), api("/api/parishioner/profile")]);
      list.innerHTML = items.length ? items.map((o) => {
        const presidentName = o.presidentName || (o.role === "president" ? profile.name : null), presidentBaptismalName = o.presidentBaptismalName || (o.role === "president" ? profile.baptismalName : null), directMember = o.role !== "curia_president";
        return `<article class="legion-${o.organizationType} ${o.hasIcon ? "has-icon" : ""}">${o.hasIcon ? `<img class="legion-card-icon" src="/api/parishioner/legion/organizations/${o.id}/icon" alt="${esc(o.name)} \uC544\uC774\uCF58">` : ""}<header><b>${o.organizationType === "curia" ? "\uAFB8\uB9AC\uC544" : "\uC058\uB808\uC2DC\uB514\uC6C0"}</b></header><div class="legion-card-title"><h3>${esc(o.name)}</h3><span class="legion-card-status ${o.status}">${organizationStatuses[o.status] ?? esc(o.status)}</span></div>${o.parentName ? `<small>\uC0C1\uC704 \uAFB8\uB9AC\uC544 \xB7 ${esc(o.parentName)}</small>` : ""}<p class="legion-card-president"><b>\uB2E8\uC7A5</b><span>${esc(presidentName ?? "\uC815\uBCF4 \uC5C6\uC74C")}${presidentBaptismalName ? ` <em>(${esc(presidentBaptismalName)})</em>` : ""}</span></p><p>${esc(o.description ?? "-")}</p>${directMember ? `<nav class="legion-card-actions"><button data-legion-view="notice" data-org="${o.id}" data-name="${esc(o.name)}" type="button">\uACF5\uC9C0\uC0AC\uD56D</button><button data-legion-view="board" data-org="${o.id}" data-name="${esc(o.name)}" type="button">\uAC8C\uC2DC\uD310</button><button data-legion-view="account" data-org="${o.id}" data-name="${esc(o.name)}" type="button">\uD68C\uACC4</button></nav>` : ""}<footer>${roles[o.role]} \xB7 ${new Date(o.joinedAt).toLocaleDateString("ko-KR")}${o.role === "president" && o.status !== "ended" ? `<button data-edit-org="${o.id}" type="button">\uC870\uC9C1\uC815\uBCF4 \uC218\uC815</button>` : ""}</footer></article>`;
      }).join("") : "<p>\uC18C\uC18D\uB418\uAC70\uB098 \uC2B9\uC778 \uC2E0\uCCAD\uD55C \uC870\uC9C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>";
      list.querySelectorAll("[data-edit-org]").forEach((button) => button.onclick = () => void openOrganizationEdit(Number(button.dataset.editOrg)));
      list.querySelectorAll("[data-legion-view]").forEach((button) => button.onclick = () => void openLegionViewer(Number(button.dataset.org), button.dataset.name ?? "\uC870\uC9C1", button.dataset.legionView));
    } catch (e) {
      list.textContent = e.message;
    }
  }
  function customConfirm(name) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-create-confirm";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uC870\uC9C1 \uC2B9\uC778 \uC2E0\uCCAD</h3><div><strong>${esc(name)}</strong><p>\uC2B9\uC778 \uC2E0\uCCAD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><footer><button data-choice="no" type="button">\uCDE8\uC18C</button><button data-choice="yes" class="green-button" type="button">\uC2B9\uC778 \uC2E0\uCCAD</button></footer></section>`;
      document.body.append(layer);
      layer.querySelectorAll("[data-choice]").forEach((button) => button.onclick = () => {
        layer.remove();
        resolve(button.dataset.choice === "yes");
      });
    });
  }
  function showLegionResult(message2, reload) {
    document.querySelector(".legion-request-result")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal legion-request-result";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uC2B9\uC778 \uC694\uCCAD \uACB0\uACFC</h3><div class="member-modal-body"><p>${esc(message2)}</p></div><footer><button class="green-button" type="button">\uD655\uC778</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("button").addEventListener("click", () => {
      if (reload) window.location.reload();
      else layer.remove();
    });
  }
  function alert(message2) {
    showLegionResult(message2, true);
  }
  function confirmEditRequest() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-create-confirm legion-edit-confirm";
      layer.innerHTML = '<section class="member-modal-box"><h3>\uC870\uC9C1\uC815\uBCF4 \uC218\uC815 \uC2B9\uC778 \uC694\uCCAD</h3><div><p>\uC218\uC815 \uC2B9\uC778 \uC694\uCCAD\uC744 \uD560\uAE4C\uC694?</p></div><footer><button data-choice="no" type="button">\uCDE8\uC18C</button><button data-choice="yes" class="green-button" type="button">\uC218\uC815 \uC2B9\uC778 \uC694\uCCAD</button></footer></section>';
      document.body.append(layer);
      layer.querySelectorAll("[data-choice]").forEach((button) => button.onclick = () => {
        layer.remove();
        resolve(button.dataset.choice === "yes");
      });
    });
  }
  function personPicker(title, selected) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-person-picker";
      layer.innerHTML = `<section class="member-modal-box"><h3>${title} \uC9C0\uC815</h3><div><div class="picker-search"><input type="search" placeholder="\uC774\uB984, \uC138\uB840\uBA85 \uB610\uB294 \uC774\uBA54\uC77C (3\uAE00\uC790 \uC774\uC0C1)"><button class="green-button" type="button">\uAC80\uC0C9</button></div><div class="picker-results"><p>\uAC80\uC0C9\uC5B4\uB97C 3\uAE00\uC790 \uC774\uC0C1 \uC785\uB825\uD574 \uC8FC\uC138\uC694.</p></div></div><footer><button type="button" data-close>\uCDE8\uC18C</button></footer></section>`;
      document.body.append(layer);
      const input = layer.querySelector("input"), results2 = layer.querySelector(".picker-results");
      let searchTimer = 0, searchSequence = 0;
      const close = () => {
        clearTimeout(searchTimer);
        layer.remove();
        resolve(null);
      }, search2 = async () => {
        const q = input.value.trim(), sequence = ++searchSequence;
        if (q.length < 3) {
          results2.innerHTML = "<p>\uAC80\uC0C9\uC5B4\uB97C 3\uAE00\uC790 \uC774\uC0C1 \uC785\uB825\uD574 \uC8FC\uC138\uC694.</p>";
          return;
        }
        results2.innerHTML = "<p>\uAC80\uC0C9 \uC911\uC785\uB2C8\uB2E4.</p>";
        try {
          const people = await api(`/api/parishioner/legion/people?q=${encodeURIComponent(q)}`);
          if (sequence !== searchSequence) return;
          const available = people.filter((person) => !selected.has(person.id));
          results2.innerHTML = available.map((person) => `<button type="button" data-person="${person.id}"><span><strong>${esc(person.name)}${person.baptismalName ? ` (${esc(person.baptismalName)})` : ""}</strong><small>${esc(person.email)}</small></span><b>\uC120\uD0DD</b></button>`).join("") || "<p>\uC120\uD0DD\uD560 \uC218 \uC788\uB294 \uC2E0\uB3C4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>";
          results2.querySelectorAll("[data-person]").forEach((button, index) => button.onclick = () => {
            layer.remove();
            resolve(available[index]);
          });
        } catch (error) {
          if (sequence === searchSequence) results2.textContent = error.message;
        }
      };
      layer.querySelector("[data-close]").addEventListener("click", close);
      layer.querySelector(".picker-search button").onclick = () => {
        clearTimeout(searchTimer);
        void search2();
      };
      input.oninput = () => {
        clearTimeout(searchTimer);
        if (input.value.trim().length < 3) {
          searchSequence++;
          results2.innerHTML = "<p>\uAC80\uC0C9\uC5B4\uB97C 3\uAE00\uC790 \uC774\uC0C1 \uC785\uB825\uD574 \uC8FC\uC138\uC694.</p>";
          return;
        }
        searchTimer = window.setTimeout(() => void search2(), 300);
      };
      input.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          clearTimeout(searchTimer);
          void search2();
        }
      };
      input.focus();
    });
  }
  function curiaPicker(curias) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-person-picker";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uC0C1\uC704 \uAFB8\uB9AC\uC544 \uC9C0\uC815</h3><div><div class="picker-search"><input type="search" placeholder="\uAFB8\uB9AC\uC544 \uBA85\uCE6D \uB610\uB294 \uB2E8\uC7A5 \uAC80\uC0C9"></div><div class="picker-results"></div></div><footer><button type="button" data-close>\uCDE8\uC18C</button></footer></section>`;
      document.body.append(layer);
      const input = layer.querySelector("input"), results2 = layer.querySelector(".picker-results"), render = () => {
        const q = input.value.trim().toLowerCase(), items = curias.filter((item) => `${item.name} ${item.presidentName} ${item.presidentBaptismalName ?? ""}`.toLowerCase().includes(q));
        results2.innerHTML = items.map((item) => `<button type="button"><span><strong>${esc(item.name)}</strong><small>\uB2E8\uC7A5 ${esc(item.presidentName)}${item.presidentBaptismalName ? ` (${esc(item.presidentBaptismalName)})` : ""}</small></span><b>\uC120\uD0DD</b></button>`).join("") || "<p>\uAC80\uC0C9\uB41C \uAFB8\uB9AC\uC544\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>";
        results2.querySelectorAll("button").forEach((button, index) => button.onclick = () => {
          layer.remove();
          resolve(items[index]);
        });
      };
      layer.querySelector("[data-close]").addEventListener("click", () => {
        layer.remove();
        resolve(null);
      });
      input.oninput = render;
      render();
      input.focus();
    });
  }
  async function openOrganizationEdit(id) {
    try {
      const data = await api(`/api/parishioner/legion/organizations/${id}/manage`), layer = document.createElement("div"), byRole = (role) => data.members.find((member) => member.role === role);
      layer.className = "member-modal member-legion-edit";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uC870\uC9C1\uC815\uBCF4 \uC218\uC815 \uC2B9\uC778 \uC694\uCCAD</h3><form><div><strong>${esc(data.organization.name)}</strong><label>\uC124\uBA85 <i>*</i><textarea name="description" maxlength="2000" rows="5" required>${esc(data.organization.description)}</textarea></label><label>\uC544\uC774\uCF58 <small>${data.organization.hasIcon ? "\uC0C8 \uD30C\uC77C\uC744 \uC120\uD0DD\uD558\uC9C0 \uC54A\uC73C\uBA74 \uD604\uC7AC \uC544\uC774\uCF58 \uC720\uC9C0" : "\uC120\uD0DD \uC0AC\uD56D \xB7 \uCD5C\uB300 2MB"}</small><input name="icon" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>${[["vice_president", "\uBD80\uB2E8\uC7A5"], ["secretary", "\uC11C\uAE30"], ["treasurer", "\uD68C\uACC4"]].map(([role, label]) => {
        const member = byRole(role);
        return `<label>${label} <i>*</i><div><input data-edit-label="${role}" value="${esc(member ? `${member.name}${member.baptismalName ? ` (${member.baptismalName})` : ""}` : "")}" readonly><button data-edit-role="${role}" data-title="${label}" type="button">\uC2E0\uB3C4 \uAC80\uC0C9</button></div><input name="${role}" type="hidden" value="${member?.id ?? ""}"></label>`;
      }).join("")}<p data-error></p></div><footer><button data-close type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uC218\uC815 \uC2B9\uC778 \uC694\uCCAD</button></footer></form></section>`;
      document.body.append(layer);
      const form = layer.querySelector("form");
      layer.querySelector("[data-close]").addEventListener("click", () => layer.remove());
      layer.querySelectorAll("[data-edit-role]").forEach((button) => button.onclick = async () => {
        const selectedIds = new Set([...form.querySelectorAll('input[type="hidden"]')].map((input) => Number(input.value)).filter(Boolean)), person = await personPicker(button.dataset.title, selectedIds);
        if (person) {
          const role = button.dataset.editRole;
          form.elements.namedItem(role).value = String(person.id);
          form.querySelector(`[data-edit-label="${role}"]`).value = `${person.name}${person.baptismalName ? ` (${person.baptismalName})` : ""}`;
        }
      });
      form.onsubmit = async (event) => {
        event.preventDefault();
        const file = form.elements.namedItem("icon").files?.[0];
        if (file && file.size > 2 * 1024 * 1024) {
          layer.querySelector("[data-error]").textContent = "\uC544\uC774\uCF58\uC740 2MB \uC774\uD558 \uC774\uBBF8\uC9C0\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.";
          return;
        }
        const payload = { description: form.elements.namedItem("description").value, vicePresidentId: Number(form.elements.namedItem("vice_president").value), secretaryId: Number(form.elements.namedItem("secretary").value), treasurerId: Number(form.elements.namedItem("treasurer").value) };
        if (file) {
          payload.iconType = file.type;
          payload.iconData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = () => reject(new Error("\uC544\uC774\uCF58\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
            reader.readAsDataURL(file);
          });
        }
        try {
          const result = await api(`/api/parishioner/legion/organizations/${id}/edit-requests`, { method: "POST", body: JSON.stringify(payload) });
          layer.remove();
          showLegionResult(result.message, true);
        } catch (error) {
          layer.querySelector("[data-error]").textContent = error.message;
        }
      };
    } catch (error) {
      showLegionResult(error.message, false);
    }
  }
  async function create() {
    const [curias, profile] = await Promise.all([api("/api/parishioner/legion/curias"), api("/api/parishioner/profile")]);
    const layer = document.createElement("div");
    layer.className = "member-modal member-legion-create";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uB808\uC9C0\uC624\uB9C8\uB9AC\uC5D0 \uC870\uC9C1 \uC0DD\uC131</h3><form><div class="legion-form-scroll"><fieldset class="legion-kind"><legend>\uAD6C\uBD84 <i>*</i></legend><label><input type="checkbox" value="curia"> \uAFB8\uB9AC\uC544</label><label><input type="checkbox" value="praesidium"> \uC058\uB808\uC2DC\uB514\uC6C0</label><input name="organizationType" type="hidden"></fieldset><label class="legion-parent" hidden>\uC0C1\uC704 \uAFB8\uB9AC\uC544 <i>*</i><div><input name="parentLabel" readonly placeholder="\uC2B9\uC778\uB41C \uAFB8\uB9AC\uC544\uB97C \uC9C0\uC815\uD574 \uC8FC\uC138\uC694"><button type="button">\uAC80\uC0C9 \uC9C0\uC815</button></div><input name="parentId" type="hidden"></label><label>\uC870\uC9C1 \uBA85\uCE6D <i>*</i><div class="legion-name"><input name="name" maxlength="200" required><button type="button">\uC911\uBCF5\uD655\uC778</button></div><small data-name-message></small></label><label>\uC124\uBA85 <i>*</i><textarea name="description" maxlength="2000" rows="4" required></textarea></label><label>\uB2E8\uC7A5 <i>*</i><input value="${esc(profile.name)}${profile.baptismalName ? ` (${esc(profile.baptismalName)})` : ""}" readonly></label><div class="legion-officer-fields">${[["vice_president", "\uBD80\uB2E8\uC7A5"], ["secretary", "\uC11C\uAE30"], ["treasurer", "\uD68C\uACC4"]].map(([key, label]) => `<label>${label} <i>*</i><div><input data-officer-label="${key}" readonly placeholder="\uC2E0\uB3C4\uB97C \uC9C0\uC815\uD574 \uC8FC\uC138\uC694"><button data-officer="${key}" data-title="${label}" type="button">\uC2E0\uB3C4 \uAC80\uC0C9</button></div><input name="${key}" type="hidden"></label>`).join("")}</div><p data-error></p></div><footer><button type="button" data-close>\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uC2B9\uC778 \uC2E0\uCCAD</button></footer></form></section>`;
    document.body.append(layer);
    const form = layer.querySelector("form"), typeInput = form.elements.namedItem("organizationType"), parentId = form.elements.namedItem("parentId"), parentLabel = form.elements.namedItem("parentLabel"), name = form.elements.namedItem("name"), description = form.elements.namedItem("description"), submit2 = form.querySelector('button[type="submit"]');
    let nameChecked = "";
    const sync = () => {
      const officers = ["vice_president", "secretary", "treasurer"].every((key) => form.elements.namedItem(key).value), parentOk = typeInput.value === "curia" || Boolean(parentId.value);
      submit2.disabled = !typeInput.value || !parentOk || nameChecked !== name.value.trim() || !description.value.trim() || !officers;
    };
    layer.querySelectorAll(".legion-kind input[type=checkbox]").forEach((check) => check.onchange = () => {
      if (check.checked) layer.querySelectorAll(".legion-kind input[type=checkbox]").forEach((other) => {
        if (other !== check) other.checked = false;
      });
      typeInput.value = check.checked ? check.value : "";
      layer.querySelector(".legion-parent").hidden = typeInput.value !== "praesidium";
      if (typeInput.value !== "praesidium") {
        parentId.value = "";
        parentLabel.value = "";
      }
      nameChecked = "";
      sync();
    });
    layer.querySelector(".legion-parent button").onclick = async () => {
      const selected = await curiaPicker(curias);
      if (selected) {
        parentId.value = String(selected.id);
        parentLabel.value = `${selected.name} \xB7 \uB2E8\uC7A5 ${selected.presidentName}${selected.presidentBaptismalName ? ` (${selected.presidentBaptismalName})` : ""}`;
        sync();
      }
    };
    name.oninput = () => {
      nameChecked = "";
      layer.querySelector("[data-name-message]").textContent = "";
      sync();
    };
    layer.querySelector(".legion-name button").onclick = async () => {
      try {
        const result = await api(`/api/parishioner/legion/name-availability?organizationType=${encodeURIComponent(typeInput.value)}&name=${encodeURIComponent(name.value.trim())}`), message2 = layer.querySelector("[data-name-message]");
        message2.textContent = result.message;
        message2.className = result.available ? "available" : "unavailable";
        nameChecked = result.available ? name.value.trim() : "";
        sync();
      } catch (error) {
        layer.querySelector("[data-name-message]").textContent = error.message;
      }
    };
    layer.querySelectorAll("[data-officer]").forEach((button) => button.onclick = async () => {
      const selectedIds = new Set([...form.querySelectorAll('.legion-officer-fields input[type="hidden"]')].map((input) => Number(input.value)).filter(Boolean)), person = await personPicker(button.dataset.title, selectedIds);
      if (person) {
        const key = button.dataset.officer;
        form.elements.namedItem(key).value = String(person.id);
        form.querySelector(`[data-officer-label="${key}"]`).value = `${person.name}${person.baptismalName ? ` (${person.baptismalName})` : ""}`;
        sync();
      }
    });
    description.oninput = sync;
    layer.querySelector("[data-close]").addEventListener("click", () => layer.remove());
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (submit2.disabled || !await customConfirm(name.value.trim())) return;
      submit2.disabled = true;
      try {
        const payload = Object.fromEntries(new FormData(form));
        delete payload.parentLabel;
        const result = await api("/api/parishioner/legion/organizations", { method: "POST", body: JSON.stringify(payload) });
        layer.remove();
        alert(result.message);
        await show();
      } catch (error) {
        form.querySelector("[data-error]").textContent = error.message;
        sync();
      }
    };
  }
  function menu() {
    const nav = document.querySelector("#member-mobile-menu>nav"), anchor = nav?.querySelector('[data-member-target=".member-groups"]');
    if (!nav || !anchor || nav.querySelector("[data-legion-menu]")) return;
    const b = document.createElement("button");
    b.dataset.legionMenu = "1";
    b.type = "button";
    b.innerHTML = '<span class="member-legion-menu-icon" aria-hidden="true">\u2720</span><span>\uB808\uC9C0\uC624\uB9C8\uB9AC\uC5D0</span>';
    anchor.insertAdjacentElement("afterend", b);
    b.onclick = () => {
      const menu2 = document.querySelector("#member-mobile-menu"), backdrop = document.querySelector("#member-menu-backdrop"), menuButton = document.querySelector("#member-menu-button");
      document.body.classList.remove("member-menu-open");
      menu2?.classList.remove("open");
      menu2?.setAttribute("aria-hidden", "true");
      if (backdrop) backdrop.hidden = true;
      menuButton?.setAttribute("aria-expanded", "false");
      menuButton?.setAttribute("aria-label", "\uBA54\uB274 \uC5F4\uAE30");
      void show();
    };
  }
  document.addEventListener("member:gateway-legion", (event) => {
    const action = event.detail.action;
    void (async () => {
      await show();
      requestAnimationFrame(() => {
        document.querySelector(".member-legion")?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (action !== "home") window.setTimeout(() => document.querySelector(action === "members" ? ".legion-praesidium [data-legion-members]" : ".legion-praesidium [data-community-schedule]")?.click(), 250);
      });
    })();
  });
  document.addEventListener("member:gateway-faith", () => void openFaithActivityFromMainMenu("grace_diary"));
  function mountOfficerClearButtons() {
    const modal2 = document.querySelector(".member-legion-create"), form = modal2?.querySelector("form");
    if (!modal2 || !form) return;
    modal2.querySelectorAll("[data-officer]").forEach((search2) => {
      if (search2.parentElement?.querySelector("[data-officer-clear]")) return;
      const clear = document.createElement("button");
      clear.type = "button";
      clear.dataset.officerClear = search2.dataset.officer;
      clear.textContent = "\uCD08\uAE30\uD654";
      clear.addEventListener("click", () => {
        const key = clear.dataset.officerClear, hidden = form.elements.namedItem(key), label = form.querySelector(`[data-officer-label="${key}"]`);
        hidden.value = "";
        label.value = "";
        form.querySelector('button[type="submit"]').disabled = true;
      });
      search2.insertAdjacentElement("afterend", clear);
    });
  }
  function mountCreateProgressiveState() {
    const modal2 = document.querySelector(".member-legion-create"), form = modal2?.querySelector("form");
    if (!modal2 || !form || modal2.dataset.progressiveMounted) return;
    modal2.dataset.progressiveMounted = "1";
    const description = form.elements.namedItem("description"), iconLabel = document.createElement("label");
    iconLabel.className = "legion-icon-field";
    iconLabel.innerHTML = '\uC870\uC9C1 \uC544\uC774\uCF58 <small>\uC120\uD0DD \uC0AC\uD56D \xB7 JPG, PNG, WEBP, GIF \xB7 \uCD5C\uB300 2MB</small><input data-legion-icon type="file" accept="image/jpeg,image/png,image/webp,image/gif">';
    description.closest("label").insertAdjacentElement("beforebegin", iconLabel);
    const message2 = form.querySelector("[data-name-message]"), error = form.querySelector("[data-error]"), detailControls = () => form.querySelectorAll("textarea,.legion-form-scroll>label:not(.legion-parent)>input[readonly],.legion-officer-fields input,.legion-officer-fields button"), setDetailEnabled = (enabled) => detailControls().forEach((control) => control.disabled = !enabled), lock = () => {
      setDetailEnabled(false);
      form.querySelector('button[type="submit"]').disabled = true;
    }, syncAvailability = () => setDetailEnabled(message2.classList.contains("available") && Boolean(message2.textContent?.trim()));
    lock();
    form.querySelector('[name="name"]').addEventListener("input", lock);
    form.querySelectorAll(".legion-kind input[type=checkbox]").forEach((input) => input.addEventListener("change", lock));
    new MutationObserver(syncAvailability).observe(message2, { attributes: true, childList: true, subtree: true });
    new MutationObserver(() => {
      const text = error.textContent?.trim();
      if (text) showLegionResult(text, false);
    }).observe(error, { childList: true, subtree: true });
  }
  function mountLegionIconDropzones() {
    document.querySelectorAll('.member-legion-create [data-legion-icon],.member-legion-edit input[name="icon"]').forEach((input) => {
      if (input.dataset.dropzoneMounted) return;
      input.dataset.dropzoneMounted = "1";
      const zone = document.createElement("div");
      zone.className = "legion-icon-dropzone";
      zone.tabIndex = 0;
      zone.innerHTML = '<span>\uC774\uBBF8\uC9C0\uB97C \uC774\uACF3\uC5D0 \uB04C\uC5B4\uB2E4 \uB193\uC73C\uC138\uC694</span><small>\uB610\uB294 \uD074\uB9AD\uD558\uC5EC \uC774\uBBF8\uC9C0 \uD30C\uC77C \uC120\uD0DD</small><img hidden alt="\uC544\uC774\uCF58 \uBBF8\uB9AC\uBCF4\uAE30"><b></b>';
      input.insertAdjacentElement("beforebegin", zone);
      zone.append(input);
      const preview = zone.querySelector("img"), name = zone.querySelector("b"), apply = (file) => {
        if (!file.type.startsWith("image/")) {
          name.textContent = "\uC774\uBBF8\uC9C0 \uD30C\uC77C\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
          zone.classList.add("invalid");
          input.value = "";
          preview.hidden = true;
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          name.textContent = "2MB \uC774\uD558 \uC774\uBBF8\uC9C0\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
          zone.classList.add("invalid");
          input.value = "";
          preview.hidden = true;
          return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        zone.classList.remove("invalid");
        name.textContent = file.name;
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
      };
      zone.onclick = (event) => {
        if (event.target !== input) input.click();
      };
      zone.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          input.click();
        }
      };
      zone.ondragover = (event) => {
        event.preventDefault();
        zone.classList.add("dragging");
      };
      zone.ondragleave = () => zone.classList.remove("dragging");
      zone.ondrop = (event) => {
        event.preventDefault();
        zone.classList.remove("dragging");
        const file = event.dataTransfer?.files?.[0];
        if (file) apply(file);
      };
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) apply(file);
      };
    });
  }
  function mountEditConfirmation() {
    document.querySelectorAll(".member-legion-edit form").forEach((form) => {
      if (form.dataset.confirmMounted) return;
      form.dataset.confirmMounted = "1";
      const button = form.querySelector('button[type="submit"]'), description = form.elements.namedItem("description"), icon = form.elements.namedItem("icon"), roles2 = ["vice_president", "secretary", "treasurer"], initial = { description: description.value, ...Object.fromEntries(roles2.map((role) => [role, form.elements.namedItem(role).value])) }, detailsChanged = () => description.value !== initial.description || roles2.some((role) => form.elements.namedItem(role).value !== initial[role]), changed = () => detailsChanged() || Boolean(icon.files?.length), sync = () => {
        button.disabled = !changed() || !form.checkValidity();
      };
      button.type = "button";
      button.disabled = true;
      form.addEventListener("input", sync);
      form.addEventListener("change", sync);
      const timer3 = window.setInterval(() => {
        if (!form.isConnected) {
          clearInterval(timer3);
          return;
        }
        sync();
      }, 200);
      button.onclick = async () => {
        sync();
        if (button.disabled) return;
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        if (!await confirmEditRequest()) return;
        form.dataset.onlyIcon = String(Boolean(icon.files?.length) && !detailsChanged());
        button.type = "submit";
        form.requestSubmit(button);
        button.type = "button";
      };
    });
  }
  function moveLegionRequiredMarkers() {
    document.querySelectorAll(".member-legion-create label,.member-legion-create legend,.member-legion-edit label").forEach((field) => {
      const marker = field.querySelector(":scope>i");
      if (!marker || field.firstElementChild === marker) return;
      marker.textContent = "*";
      field.prepend(marker, document.createTextNode(" "));
    });
  }
  new MutationObserver(menu).observe(document.documentElement, { childList: true, subtree: true });
  menu();
  new MutationObserver(mountOfficerClearButtons).observe(document.documentElement, { childList: true, subtree: true });
  mountOfficerClearButtons();
  new MutationObserver(mountCreateProgressiveState).observe(document.documentElement, { childList: true, subtree: true });
  mountCreateProgressiveState();
  new MutationObserver(() => {
    mountLegionIconDropzones();
    mountEditConfirmation();
    moveLegionRequiredMarkers();
  }).observe(document.documentElement, { childList: true, subtree: true });
  mountLegionIconDropzones();
  mountEditConfirmation();
  moveLegionRequiredMarkers();
  document.head.insertAdjacentHTML("beforeend", `<style>
.member-legion{padding:22px}.member-legion>header{display:flex;justify-content:space-between;align-items:center}.member-legion>header small{color:var(--green)}.member-legion>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.member-legion article{position:relative;padding:16px;border:1px solid var(--line);border-radius:12px}.member-legion article header{display:flex;justify-content:space-between}.member-legion article p{color:var(--muted)}.legion-card-icon{width:58px;height:58px;margin-bottom:10px;border:1px solid var(--line);border-radius:14px;object-fit:cover}.legion-card-status.requested{color:#a66a00;font-weight:700}.legion-card-status.approved{color:var(--green);font-weight:700}.legion-icon-field small{display:block;margin:4px 0 6px;color:var(--muted);font-weight:400}
.member-legion-create .member-modal-box{display:flex;width:min(94vw,680px);max-height:min(90vh,800px);flex-direction:column;overflow:hidden}.member-legion-create .member-modal-box>h3{flex:none;margin:0;padding:20px;background:var(--green)!important;color:#fff!important;text-align:center}.member-legion-create form{display:flex;min-height:0;flex:1;flex-direction:column}.legion-form-scroll{display:grid;gap:14px;min-height:0;overflow-y:auto;padding:20px 26px}.member-legion-create label,.legion-kind legend{color:#34483f;font-size:11px;font-weight:700}.member-legion-create i{color:#dc4350}.member-legion-create input,.member-legion-create textarea{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff}.member-legion-create input[readonly]{background:#f5f8f7}.legion-kind{display:flex;gap:22px;margin:0;padding:0;border:0}.legion-kind legend{margin-bottom:8px}.legion-kind label{display:flex;align-items:center;gap:7px}.legion-kind input{width:17px;height:17px;accent-color:var(--green)}.legion-parent>div,.legion-name,.legion-officer-fields label>div{display:grid;grid-template-columns:1fr 100px;gap:7px;margin-top:6px}.member-legion-create label>textarea{display:block;margin-top:6px;resize:vertical}.member-legion-create label button{border:1px solid var(--green);border-radius:8px;background:#fff;color:var(--green);font-size:10px;font-weight:700}.member-legion-create [data-name-message]{display:block;min-height:16px;margin-top:4px}.member-legion-create [data-name-message].available{color:var(--green)}.member-legion-create [data-name-message].unavailable,[data-error]{color:#dc4350}.legion-officer-fields{display:grid;gap:12px}.member-legion-create form>footer{display:flex;flex:none;justify-content:center;gap:10px;padding:15px;border-top:1px solid var(--line);background:#fff}.member-legion-create form>footer button,.legion-create-confirm footer button{min-width:112px;height:42px;border:1px solid #b9c8c2;border-radius:9px;background:#fff;color:#52635d;font-weight:700}.member-legion-create form>footer button.green-button,.legion-create-confirm footer .green-button{border-color:var(--green);background:var(--green);color:#fff}.member-legion-create form>footer button:disabled{border-color:#dce5e2;background:#dce5e2;cursor:not-allowed}
.legion-person-picker .member-modal-box{display:flex;width:min(92vw,580px);max-height:75vh;flex-direction:column;overflow:hidden}.legion-person-picker h3,.legion-create-confirm h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-person-picker .member-modal-box>div{min-height:0;overflow:auto;padding:18px}.picker-search{display:flex;gap:7px}.picker-search input{flex:1;padding:10px;border:1px solid var(--line);border-radius:8px}.legion-person-picker .picker-results{position:static;z-index:auto;inset:auto;width:100%;max-height:260px;margin-top:10px;overflow-y:auto;border:1px solid var(--line);border-radius:8px;background:#fff;box-shadow:none}.legion-person-picker .picker-results>p{margin:0;padding:14px;color:var(--muted);text-align:center}.legion-person-picker .picker-results>button{position:static;display:flex;width:100%;align-items:center;justify-content:space-between;padding:11px;border:0;border-bottom:1px solid var(--line);background:#fff;text-align:left}.legion-person-picker .picker-results>button:last-child{border-bottom:0}.picker-results span{display:flex;flex-direction:column}.picker-results small{margin-top:3px;color:var(--muted)}.picker-results b{color:var(--green)}.legion-person-picker footer,.legion-create-confirm footer{display:flex;justify-content:center;padding:14px;border-top:1px solid var(--line)}.legion-person-picker footer button{min-width:100px;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff}.legion-create-confirm .member-modal-box{width:min(90vw,430px)}.legion-create-confirm .member-modal-box>div{padding:28px;text-align:center}.legion-create-confirm footer{gap:9px}
.legion-request-result .member-modal-box{width:min(90vw,430px)}.legion-request-result h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-request-result .member-modal-body{padding:28px;text-align:center}.legion-request-result footer{display:flex;justify-content:center;padding:0 18px 18px}.legion-request-result footer button{min-width:112px;height:42px}
.member-legion-create .legion-form-scroll>label,.member-legion-create .legion-officer-fields>label,.member-legion-create .legion-kind,.member-legion-create .legion-kind legend,.member-legion-create .legion-kind label{text-align:left!important}.member-legion-create .legion-officer-fields label>div{grid-template-columns:minmax(0,1fr) 100px 76px}.member-legion-create [data-officer-clear]{border-color:#b9c8c2;color:#68766f}.member-legion-create [data-officer-clear]:hover{border-color:#dc7780;background:#fff6f7;color:#bd3d49}
.member-legion-create input:disabled,.member-legion-create textarea:disabled,.member-legion-create button:disabled:not([type="submit"]){border-color:#dce5e2;background:#edf1f0;color:#9aa5a1;cursor:not-allowed;opacity:.72}
.legion-icon-dropzone{display:grid;min-height:126px;padding:14px;place-items:center;border:2px dashed #9fcbbb;border-radius:12px;background:#f5fbf8;color:#41675a;text-align:center;cursor:pointer;transition:.18s}.legion-icon-dropzone.dragging{border-color:var(--green);background:#e4f6ef;transform:scale(1.01)}.legion-icon-dropzone.invalid{border-color:#d95b68;background:#fff5f6;color:#b43b47}.legion-icon-dropzone>small{color:var(--muted);font-weight:400}.legion-icon-dropzone>img{width:64px;height:64px;margin:7px 0;border-radius:12px;object-fit:cover}.legion-icon-dropzone>input{position:absolute;width:1px!important;height:1px;padding:0!important;opacity:0;pointer-events:none}.legion-icon-dropzone>b{font-size:10px}.member-legion-create [data-close],.member-legion-edit [data-close]{border:1px solid #aebdb7!important;background:#fff!important;color:#42534c!important;box-shadow:0 2px 7px rgba(26,62,50,.08)}.member-legion-create [data-close]:hover,.member-legion-edit [data-close]:hover{border-color:#71867e!important;background:#f4f7f6!important;color:#203a31!important}
.member-legion-create label>i:first-child,.member-legion-create legend>i:first-child,.member-legion-edit label>i:first-child{margin-right:2px;color:#dc4350;font-style:normal}
</style>`);
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion article>footer{display:flex;align-items:center;gap:10px}.member-legion article>footer button{margin-left:auto;padding:7px 11px;border:1px solid var(--green);border-radius:7px;background:#fff;color:var(--green)}.member-legion-edit .member-modal-box{width:min(92vw,620px);max-height:88vh}.member-legion-edit h3{margin:0;padding:18px;background:var(--green);color:#fff}.member-legion-edit form>div{display:grid;gap:14px;max-height:65vh;padding:22px;overflow:auto}.member-legion-edit label{display:grid;gap:6px;text-align:left;font-size:11px;font-weight:700}.member-legion-edit label>div{display:grid;grid-template-columns:1fr 100px;gap:7px}.member-legion-edit input,.member-legion-edit textarea{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px}.member-legion-edit label button{border:1px solid var(--green);border-radius:8px;background:#fff;color:var(--green)}.member-legion-edit form>footer{display:flex;justify-content:center;gap:8px;padding:14px;border-top:1px solid var(--line)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-mobile-menu [data-legion-menu]{display:flex!important;align-items:center}.member-legion-menu-icon{display:grid;width:25px;height:25px;flex:0 0 25px;margin-right:10px;place-items:center;border-radius:8px;background:#e2f4ed;color:var(--green);font-family:Georgia,serif;font-size:14px;font-weight:800}@media(max-width:600px){.member-legion-menu-icon{width:21px;height:21px;flex-basis:21px;margin-right:8px;border-radius:7px;font-size:11px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion-edit label{display:block!important;text-align:left!important}.member-legion-edit label>i:first-child{display:inline!important;position:static!important;margin:0 3px 0 0!important;vertical-align:baseline}.member-legion-edit label>textarea,.member-legion-edit label>div,.member-legion-edit label>.legion-icon-dropzone{display:block;margin-top:6px}.member-legion-edit label>div{display:grid}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion-edit form>footer{align-items:center;gap:10px}.member-legion-edit form>footer [data-close]{min-width:112px;height:42px;padding:0 20px;border:1px solid #aebdb7!important;border-radius:9px!important;background:#fff!important;color:#42534c!important;font-size:12px;font-weight:700;box-shadow:0 2px 7px rgba(26,62,50,.08)}.member-legion-edit form>footer [data-close]:hover{border-color:#71867e!important;background:#f4f7f6!important;color:#203a31!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion article.has-icon{padding-right:90px}.member-legion article .legion-card-icon{position:absolute;top:16px;right:16px;width:58px;height:58px;margin:0}.legion-card-title{display:flex;align-items:center;gap:8px;margin-top:8px}.legion-card-title h3{margin:0}.legion-card-status{display:inline-flex;align-items:center;padding:4px 8px;border-radius:12px;background:#edf2f1;color:#60736c;font-size:9px;font-weight:800;white-space:nowrap}.legion-card-status.approved{background:#e7f7ef;color:#16845f}.legion-card-status.requested{background:#fff4dc;color:#a66a00}.legion-card-status.rejected,.legion-card-status.ended{background:#fff0f1;color:#bb3947}.member-legion article .legion-card-president{margin:12px 0 0;color:#34483f;font-weight:700}@media(max-width:520px){.member-legion article.has-icon{padding-right:78px}.member-legion article .legion-card-icon{width:48px;height:48px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-card-president{display:flex;align-items:center;gap:7px}.legion-card-president>b{color:#203a31}.legion-card-president>span{color:#34483f}.legion-card-president em{color:var(--green);font-style:normal;font-weight:700}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-legion article.legion-curia>header,.member-legion article.legion-praesidium>header{padding:10px 12px;border-radius:9px;color:#fff;box-shadow:0 3px 9px rgba(28,72,61,.12)}.member-legion article.legion-curia>header{background:#256b4f}.member-legion article.legion-praesidium>header{background:#287f86}.member-legion article.legion-curia{border-top-color:#256b4f}.member-legion article.legion-praesidium{border-top-color:#287f86}</style>");
  var accountCategories = { member_offering: "\uB2E8\uC6D0 \uD5CC\uAE08", secret_bag: "\uBE44\uBC00\uC8FC\uBA38\uB2C8", praesidium_contribution: "\uC058\uB808\uC2DC\uB514\uC6C0 \uC758\uC5F0\uAE08", contribution: "\uC758\uC5F0\uAE08", event: "\uD589\uC0AC\uBE44", administration: "\uD589\uC815\uBE44", other: "\uAE30\uD0C0" };
  function legionPostPasswordConfirm(message2, confirmLabel) {
    if (confirmLabel === "\uD65C\uB3D9\uBCF4\uACE0 \uB4F1\uB85D") return Promise.resolve("no-password-required");
    if (document.querySelector(".legion-content-modal[data-mass-grace-diary] .legion-post-form:not([hidden])")) return Promise.resolve("mass-diary-no-password");
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-post-confirm";
      layer.innerHTML = `<section class="member-modal-box"><h3>${esc(confirmLabel)}</h3><form><p>${esc(message2)}</p><label><span>* \uBE44\uBC00\uBC88\uD638</span><input name="password" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="\uC22B\uC790 4\uC790\uB9AC"></label><small>\uB4F1\uB85D\uD560 \uB54C \uC815\uD55C \uC22B\uC790 4\uC790\uB9AC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.</small><p data-error></p><footer><button data-cancel type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>${esc(confirmLabel)}</button></footer></form></section>`;
      document.body.append(layer);
      const form = layer.querySelector("form"), input = form.elements.namedItem("password"), submit2 = form.querySelector('button[type="submit"]');
      const close = (value) => {
        layer.remove();
        resolve(value);
      };
      input.oninput = () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 4);
        submit2.disabled = !/^\d{4}$/.test(input.value);
      };
      form.onsubmit = (event) => {
        event.preventDefault();
        if (/^\d{4}$/.test(input.value)) close(input.value);
      };
      layer.querySelector("[data-cancel]").addEventListener("click", () => close(null));
      input.focus();
    });
  }
  function legionPostDecision(message2, confirmLabel) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-post-decision";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uD655\uC778</h3><div class="member-modal-body"><p>${esc(message2)}</p></div><footer><button data-decision="no" type="button">\uCDE8\uC18C</button><button data-decision="yes" class="green-button" type="button">${esc(confirmLabel)}</button></footer></section>`;
      document.body.append(layer);
      layer.querySelectorAll("[data-decision]").forEach((button) => button.onclick = () => {
        layer.remove();
        resolve(button.dataset.decision === "yes");
      });
    });
  }
  function legionPostEditDialog(post, kind) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-post-confirm legion-post-edit-dialog";
      layer.innerHTML = `<section class="member-modal-box"><h3>${esc(kind)} \uC218\uC815</h3><form><p>${esc(kind)}\uC744 \uC218\uC815\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p><label><span>* \uC81C\uBAA9</span><input name="title" maxlength="300" value="${esc(post.title)}"></label><label><span>* \uB0B4\uC6A9</span><textarea name="content" maxlength="60000" rows="6">${esc(post.content)}</textarea></label><label><span>* \uBE44\uBC00\uBC88\uD638</span><input name="password" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="\uB4F1\uB85D \uC2DC \uBE44\uBC00\uBC88\uD638 \uC22B\uC790 4\uC790\uB9AC"></label><p data-error></p><footer><button data-cancel type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uC218\uC815 \uD655\uC778</button></footer></form></section>`;
      document.body.append(layer);
      const form = layer.querySelector("form"), title = form.elements.namedItem("title"), content = form.elements.namedItem("content"), password = form.elements.namedItem("password"), submit2 = form.querySelector('button[type="submit"]'), sync = () => submit2.disabled = !title.value.trim() || !content.value.trim() || !/^\d{4}$/.test(password.value), close = (value) => {
        layer.remove();
        resolve(value);
      };
      form.oninput = () => {
        password.value = password.value.replace(/\D/g, "").slice(0, 4);
        sync();
      };
      form.onsubmit = (event) => {
        event.preventDefault();
        sync();
        if (!submit2.disabled) close({ title: title.value.trim(), content: content.value.trim(), password: password.value });
      };
      layer.querySelector("[data-cancel]").addEventListener("click", () => close(null));
      sync();
      title.focus();
    });
  }
  async function openLegionViewer(id, name, view) {
    const layer = document.createElement("div");
    layer.className = "member-modal legion-content-modal";
    const title = view === "notice" ? "\uACF5\uC9C0\uC0AC\uD56D" : view === "board" ? "\uAC8C\uC2DC\uD310" : view === "story" ? "\uC774\uC57C\uAE30" : view === "grace_diary" ? "\uC740\uCD1D\uC77C\uAE30" : view === "activity_report" ? "\uD65C\uB3D9\uBCF4\uACE0" : "\uD68C\uACC4";
    layer.innerHTML = `<section class="member-modal-box"><h3>${esc(name)} \xB7 ${title}</h3><div class="legion-content-body"><p class="legion-content-loading">\uBD88\uB7EC\uC624\uB294 \uC911...</p></div><footer><button data-close type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("[data-close]").addEventListener("click", () => layer.remove());
    const body = layer.querySelector(".legion-content-body");
    try {
      if (view === "account") {
        const data = await api(`/api/parishioner/legion/organizations/${id}/account`), income = data.entries.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0), expense = data.entries.filter((item) => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0), opening = Number(data.openingBalance ?? 0), balance = opening + income - expense;
        body.innerHTML = `<div class="legion-account-summary"><span>\uC774\uC6D4\uAE08\uC561<b>${opening.toLocaleString("ko-KR")}\uC6D0</b></span><span>\uC785\uAE08<b>${income.toLocaleString("ko-KR")}\uC6D0</b></span><span>\uCD9C\uAE08<b>${expense.toLocaleString("ko-KR")}\uC6D0</b></span><span>\uC794\uC561<b>${balance.toLocaleString("ko-KR")}\uC6D0</b></span></div>${data.openingBalance === null ? '<p class="legion-empty">\uC544\uC9C1 \uD68C\uACC4\uAC00 \uAC1C\uC124\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.</p>' : data.entries.length ? `<div class="legion-account-table"><table><thead><tr><th>\uC77C\uC790</th><th>\uAD6C\uBD84</th><th>\uD56D\uBAA9</th><th>\uB0B4\uC6A9</th><th>\uAE08\uC561</th><th>\uC99D\uBE59</th><th>\uAC10\uC0AC</th></tr></thead><tbody>${data.entries.map((item) => `<tr data-account-entry="${item.id}" class="${item.reportId ? "" : "editable"}"><td>${esc(item.entryDate)}</td><td>${item.direction === "income" ? "\uC785\uAE08" : "\uCD9C\uAE08"}</td><td>${esc(accountCategories[item.category] ?? item.category)}</td><td>${esc(item.description ?? "-")}</td><td class="${item.direction}">${item.amount.toLocaleString("ko-KR")}\uC6D0</td><td>${item.receiptName ? `<button class="legion-receipt-view" data-receipt="${item.id}" data-name="${esc(item.receiptName)}" type="button">\uBCF4\uAE30</button>` : "-"}</td><td><b class="legion-audit ${item.auditStatus ?? "none"}">${item.auditStatus === "approved" ? "\uC2B9\uC778" : item.auditStatus === "rejected" ? "\uBC18\uB824" : item.auditStatus === "requested" ? "\uC2B9\uC778 \uB300\uAE30" : "\uBBF8\uC81C\uCD9C"}</b></td></tr>`).join("")}</tbody></table></div>` : '<p class="legion-empty">\uB4F1\uB85D\uB41C \uD68C\uACC4 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}`;
        body.querySelectorAll(":scope>.legion-account-table tbody tr").forEach((row, index) => {
          const item = data.entries[index];
          if (item?.category === "praesidium_contribution" && item.sourceOrganizationName) row.cells[2].textContent = `\uC058\uB808\uC2DC\uB514\uC6C0-${item.sourceOrganizationName}`;
        });
        body.querySelectorAll("[data-receipt]").forEach((button) => button.onclick = (event) => {
          event.stopPropagation();
          openLegionReceipt(Number(button.dataset.receipt), button.dataset.name ?? "\uC99D\uBE59\uC790\uB8CC");
        });
        if (data.role === "treasurer") mountLegionAccountManager(body, id, name, data);
        if (data.role === "president") mountLegionReportReview(body, id, name, data);
      } else {
        const renderPosts = async () => {
          const [posts, profile] = await Promise.all([api(`/api/parishioner/legion/organizations/${id}/posts?type=${view}`), api("/api/parishioner/profile")]), list = body.querySelector("[data-legion-post-list]"), isMine = (post) => post.isAuthor === true || post.isAuthor === void 0 && post.authorName === profile.name && (post.baptismalName ?? null) === (profile.baptismalName ?? null), canEdit = (post) => isMine(post) && Number(post.otherReadCount ?? 0) === 0, kind = view === "notice" ? "\uACF5\uC9C0\uC0AC\uD56D" : "\uAC8C\uC2DC\uAE00";
          list.innerHTML = posts.length ? `<div class="legion-content-list">${posts.map((post) => `<article><header><strong>${esc(post.title)}</strong><time>${new Date(post.createdAt).toLocaleString("ko-KR")}</time></header><small>${esc(post.authorName)}${post.baptismalName ? ` (${esc(post.baptismalName)})` : ""}</small><p>${esc(post.content)}</p>${post.attachmentName ? `<a class="legion-post-attachment" href="/api/parishioner/legion/posts/${post.id}/attachment">\uCCA8\uBD80\uD30C\uC77C \xB7 ${esc(post.attachmentName)}</a>` : ""}<footer>${view === "board" ? `<span>\uC77D\uC74C ${post.readCount ?? 0}</span><button class="legion-like ${post.liked ? "liked" : ""}" data-legion-like="${post.id}" type="button">\uC88B\uC544\uC694 <b>${post.likeCount}</b></button><button class="legion-comments-toggle" data-legion-comments="${post.id}" type="button">\uB313\uAE00 <b>${post.commentCount}</b></button>` : `<span>\uC77D\uC74C ${post.readCount ?? 0}</span>`}${isMine(post) && !canEdit(post) ? '<small class="legion-notice-locked">\uB2E4\uB978 \uB2E8\uC6D0\uC774 \uC77D\uC5B4 \uC218\uC815\xB7\uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</small>' : ""}${canEdit(post) ? `<nav><button data-edit-post="${post.id}" type="button">\uC218\uC815</button><button data-delete-post="${post.id}" type="button">\uC0AD\uC81C</button></nav>` : ""}</footer>${view === "board" ? `<section class="legion-comments-panel" data-comments-panel="${post.id}" hidden></section>` : ""}</article>`).join("")}</div>` : `<p class="legion-empty">\uB4F1\uB85D\uB41C ${title}\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>`;
          list.querySelectorAll("[data-edit-post]").forEach((button) => button.onclick = async () => {
            const post = posts.find((item) => item.id === Number(button.dataset.editPost));
            if (!post || !canEdit(post)) return;
            const values = await legionPostEditDialog(post, kind);
            if (!values) return;
            try {
              await api(`/api/parishioner/legion/posts/${post.id}`, { method: "PATCH", body: JSON.stringify(values) });
              await renderPosts();
            } catch (reason) {
              showLegionResult(reason.message, false);
            }
          });
          list.querySelectorAll("[data-delete-post]").forEach((button) => button.onclick = async () => {
            const post = posts.find((item) => item.id === Number(button.dataset.deletePost));
            if (!post || !canEdit(post)) return;
            const password = await legionPostPasswordConfirm(`${kind}\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`, `${kind} \uC0AD\uC81C`);
            if (!password) return;
            try {
              await api(`/api/parishioner/legion/posts/${post.id}`, { method: "DELETE", body: JSON.stringify({ password }) });
              await renderPosts();
            } catch (reason) {
              showLegionResult(reason.message, false);
            }
          });
        };
        body.innerHTML = `<div class="legion-post-list-head"><h4>\uB4F1\uB85D\uB41C ${title}</h4><button class="green-button" data-open-post-form type="button">${view === "notice" ? "\uACF5\uC9C0" : view === "story" ? "\uC774\uC57C\uAE30" : view === "grace_diary" ? "\uC77C\uAE30" : "\uAC8C\uC2DC\uAE00"} \uB4F1\uB85D</button></div><div data-legion-post-list><p class="legion-content-loading">\uBD88\uB7EC\uC624\uB294 \uC911...</p></div><form class="legion-post-form" hidden><h4>${view === "notice" ? "\uACF5\uC9C0\uAE00" : view === "story" ? "\uC774\uC57C\uAE30" : view === "grace_diary" ? "\uC77C\uAE30" : "\uAC8C\uC2DC\uAE00"} \uC791\uC131</h4><label><span>* \uC81C\uBAA9</span><input name="title" maxlength="300" required placeholder="\uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></label><label><span>* \uB0B4\uC6A9</span><textarea name="content" maxlength="60000" rows="5" required placeholder="\uB0B4\uC6A9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></textarea></label>${view === "story" || view === "grace_diary" ? '<div class="legion-story-emojis" aria-label="\uC774\uBAA8\uD2F0\uCF58 \uC120\uD0DD"><span>\uC774\uBAA8\uD2F0\uCF58</span><button type="button">\u{1F600}</button><button type="button">\u{1F60A}</button><button type="button">\u{1F970}</button><button type="button">\u{1F64F}</button><button type="button">\u{1F44F}</button><button type="button">\u2764\uFE0F</button><button type="button">\u{1F44D}</button><button type="button">\u{1F389}</button><button type="button">\u{1F33F}</button><button type="button">\u2728</button></div>' : ""}<p data-post-error></p><div class="legion-post-form-actions"><button data-cancel-post type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>${view === "grace_diary" ? "\uC77C\uAE30 \uB4F1\uB85D" : "\uB4F1\uB85D"}</button></div></form>`;
        const form = body.querySelector(".legion-post-form"), openForm = body.querySelector("[data-open-post-form]"), cancelForm = form.querySelector("[data-cancel-post]"), submit2 = form.querySelector('button[type="submit"]'), error = form.querySelector("[data-post-error]"), contentInput = form.elements.namedItem("content"), sync = () => submit2.disabled = !form.elements.namedItem("title").value.trim() || !contentInput.value.trim(), closeForm = () => {
          form.hidden = true;
          openForm.hidden = false;
          form.reset();
          error.textContent = "";
          sync();
        };
        form.querySelectorAll(".legion-story-emojis button").forEach((button) => button.onclick = () => {
          const start = contentInput.selectionStart, end = contentInput.selectionEnd;
          contentInput.setRangeText(button.textContent ?? "", start, end, "end");
          contentInput.focus();
          sync();
        });
        openForm.onclick = () => {
          openForm.hidden = true;
          form.hidden = false;
          form.elements.namedItem("title").focus();
          form.scrollIntoView({ behavior: "smooth", block: "start" });
        };
        cancelForm.onclick = closeForm;
        form.addEventListener("input", sync);
        form.onsubmit = async (event) => {
          event.preventDefault();
          sync();
          if (submit2.disabled) return;
          const password = await legionPostPasswordConfirm("\uB4F1\uB85D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", "\uB4F1\uB85D");
          if (!password) return;
          submit2.disabled = true;
          error.textContent = "";
          try {
            await api(`/api/parishioner/legion/organizations/${id}/posts`, { method: "POST", body: JSON.stringify({ postType: view, title: form.elements.namedItem("title").value, content: contentInput.value, password }) });
            closeForm();
            await renderPosts();
          } catch (reason) {
            error.textContent = reason.message;
            sync();
          }
        };
        await renderPosts();
      }
    } catch (error) {
      body.innerHTML = `<p class="legion-empty error">${esc(error.message)}</p>`;
    }
  }
  function openLegionReportEntries(report, entries) {
    const items = entries.filter((item) => item.reportId === report.id), income = items.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0), expense = items.filter((item) => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0), layer = document.createElement("div");
    layer.className = "member-modal legion-report-entries-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${esc(report.title || "\uD68C\uACC4\uBCF4\uACE0")}</h3><div class="legion-report-entries-body"><div class="legion-account-report-summary"><b>${esc(report.periodFrom)} ~ ${esc(report.periodTo)}</b><span>\uC785\uAE08 ${income.toLocaleString("ko-KR")}\uC6D0</span><span>\uCD9C\uAE08 ${expense.toLocaleString("ko-KR")}\uC6D0</span><span>\uCC28\uC561 ${(income - expense).toLocaleString("ko-KR")}\uC6D0</span><b class="legion-audit ${report.status}">${report.status === "requested" ? "\uC2B9\uC778 \uB300\uAE30" : report.status === "approved" ? "\uC2B9\uC778" : "\uBC18\uB824"}</b></div>${items.length ? `<div class="legion-account-table"><table><thead><tr><th>\uC77C\uC790</th><th>\uAD6C\uBD84</th><th>\uD56D\uBAA9</th><th>\uB0B4\uC6A9</th><th>\uAE08\uC561</th><th>\uC99D\uBE59</th></tr></thead><tbody>${items.map((item) => `<tr><td>${esc(item.entryDate)}</td><td>${item.direction === "income" ? "\uC785\uAE08" : "\uCD9C\uAE08"}</td><td>${esc(accountCategories[item.category] ?? item.category)}</td><td>${esc(item.description ?? "-")}</td><td class="${item.direction}">${item.amount.toLocaleString("ko-KR")}\uC6D0</td><td>${item.receiptName ? `<button class="legion-receipt-view" data-receipt="${item.id}" data-name="${esc(item.receiptName)}" type="button">\uBCF4\uAE30</button>` : "-"}</td></tr>`).join("")}</tbody></table></div>` : '<p class="legion-empty">\uBCF4\uACE0\uC11C\uC5D0 \uD3EC\uD568\uB41C \uD68C\uACC4 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}${report.rejectionReason ? `<p class="legion-report-rejection"><b>\uBC18\uB824 \uC0AC\uC720</b>${esc(report.rejectionReason)}</p>` : ""}</div><footer><button type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").addEventListener("click", () => layer.remove());
    layer.querySelectorAll("[data-receipt]").forEach((button) => button.onclick = () => openLegionReceipt(Number(button.dataset.receipt), button.dataset.name ?? "\uC99D\uBE59\uC790\uB8CC"));
  }
  function mountLegionReportReview(body, id, name, data) {
    const section = document.createElement("section");
    section.className = "legion-report-review";
    section.innerHTML = `<h4>\uD68C\uACC4\uBCF4\uACE0 \uAC10\uC0AC</h4>${data.reports.length ? `<div>${data.reports.map((report) => `<article><div><strong>${esc(report.title || `${report.periodFrom} ~ ${report.periodTo} \uD68C\uACC4\uBCF4\uACE0`)}</strong><small>${esc(report.periodFrom)} ~ ${esc(report.periodTo)}</small>${report.rejectionReason ? `<p>\uBC18\uB824 \uC0AC\uC720: ${esc(report.rejectionReason)}</p>` : ""}</div><b class="legion-audit ${report.status}">${report.status === "requested" ? "\uC2B9\uC778 \uB300\uAE30" : report.status === "approved" ? "\uC2B9\uC778" : "\uBC18\uB824"}</b><footer><button data-report-view="${report.id}" type="button">\uB0B4\uC5ED \uBCF4\uAE30</button>${report.status === "requested" ? `<button data-report-reject="${report.id}" type="button">\uBC18\uB824</button><button class="green-button" data-report-approve="${report.id}" type="button">\uC2B9\uC778</button>` : ""}</footer></article>`).join("")}</div>` : '<p class="legion-empty">\uC81C\uCD9C\uB41C \uD68C\uACC4\uBCF4\uACE0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}`;
    body.prepend(section);
    const decide = async (reportId, status) => {
      const reason = status === "rejected" ? window.prompt("\uBC18\uB824 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.")?.trim() ?? "" : "";
      if (status === "rejected" && !reason) return;
      try {
        await api(`/api/parishioner/legion/account/reports/${reportId}/decision`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
        body.closest(".legion-content-modal")?.remove();
        void openLegionViewer(id, name, "account");
      } catch (error) {
        showLegionResult(error.message, false);
      }
    };
    section.querySelectorAll("[data-report-view]").forEach((button) => button.onclick = () => {
      const report = data.reports.find((item) => item.id === Number(button.dataset.reportView));
      if (report) openLegionReportEntries(report, data.entries);
    });
    section.querySelectorAll("[data-report-approve]").forEach((button) => button.onclick = () => void decide(Number(button.dataset.reportApprove), "approved"));
    section.querySelectorAll("[data-report-reject]").forEach((button) => button.onclick = () => void decide(Number(button.dataset.reportReject), "rejected"));
  }
  function confirmLegionEntryChange() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-entry-confirm";
      layer.innerHTML = '<section class="member-modal-box"><h3>\uD68C\uACC4 \uB0B4\uC5ED \uC218\uC815</h3><div class="member-modal-body"><p>\uBCC0\uACBD\uB0B4\uC5ED\uC744 \uC800\uC7A5\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><footer><button data-change="no" type="button">\uCDE8\uC18C</button><button class="green-button" data-change="yes" type="button">\uC800\uC7A5</button></footer></section>';
      document.body.append(layer);
      layer.querySelectorAll("[data-change]").forEach((button) => button.onclick = () => {
        layer.remove();
        resolve(button.dataset.change === "yes");
      });
    });
  }
  function openLegionReceipt(entryId, fileName) {
    const layer = document.createElement("div");
    layer.className = "member-modal legion-receipt-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${esc(fileName)}</h3><div><img src="/api/parishioner/legion/account-entries/${entryId}/receipt" alt="${esc(fileName)} \uC99D\uBE59\uC790\uB8CC"></div><footer><button type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("button").addEventListener("click", () => layer.remove());
  }
  function setupLegionEntryEditing(section, body, data, id, name) {
    const form = section.querySelector("[data-account-entry]"), submit2 = form?.querySelector('button[type="submit"]'), direction = form?.elements.namedItem("direction"), category = form?.elements.namedItem("category"), entryDate = form?.elements.namedItem("entryDate"), amount = form?.elements.namedItem("amount"), description = form?.elements.namedItem("description"), receipt = form?.elements.namedItem("receipt"), receiptLabel = section.querySelector(".legion-account-dropzone em");
    if (!form || !submit2 || !direction || !category || !entryDate || !amount || !description) return;
    body.querySelectorAll("tr.editable[data-account-entry]").forEach((row) => row.onclick = (event) => {
      if (event.target.closest("button")) return;
      const item = data.entries.find((entry) => entry.id === Number(row.dataset.accountEntry));
      if (!item) return;
      body.querySelectorAll("tr[data-account-entry]").forEach((other) => other.classList.toggle("selected", other === row));
      form.dataset.editId = String(item.id);
      direction.value = item.direction;
      direction.onchange?.(new Event("change"));
      category.value = item.category;
      entryDate.value = item.entryDate;
      amount.value = item.amount.toLocaleString("ko-KR");
      description.value = item.description ?? "";
      if (receipt) receipt.value = "";
      if (receiptLabel) receiptLabel.textContent = item.receiptName ? `\uD604\uC7AC \uC99D\uBE59: ${item.receiptName}` : "";
      submit2.textContent = "\uB0B4\uC5ED \uC218\uC815";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("submit", (event) => {
      const editId = Number(form.dataset.editId);
      if (!editId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void (async () => {
        if (!await confirmLegionEntryChange()) return;
        const error = form.querySelector("[data-error]"), file = receipt?.files?.[0];
        submit2.disabled = true;
        error.textContent = "";
        try {
          if (file && file.size > 5 * 1024 * 1024) throw new Error("\uC99D\uBE59\uC790\uB8CC\uB294 5MB \uC774\uD558 \uD30C\uC77C\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
          let receiptData = "";
          if (file) receiptData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = () => reject(new Error("\uC99D\uBE59\uC790\uB8CC\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
            reader.readAsDataURL(file);
          });
          await api(`/api/parishioner/legion/account-entries/${editId}`, { method: "PATCH", body: JSON.stringify({ direction: direction.value, category: category.value, entryDate: entryDate.value, amount: Number(amount.value.replace(/,/g, "")), description: description.value, receiptName: file?.name ?? "", receiptType: file?.type || "application/octet-stream", receiptData }) });
          body.closest(".legion-content-modal")?.remove();
          void openLegionViewer(id, name, "account");
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      })();
    }, true);
  }
  function promptLegionReportTitle(defaultTitle) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-report-title-modal";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uD68C\uACC4\uBCF4\uACE0 \uC81C\uCD9C</h3><form><label>\uD68C\uACC4\uBCF4\uACE0 \uC81C\uBAA9 <i>*</i><input name="title" maxlength="300" value="${esc(defaultTitle)}" required></label><p data-error></p><footer><button data-cancel type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uC81C\uCD9C</button></footer></form></section>`;
      document.body.append(layer);
      const form = layer.querySelector("form"), input = form.elements.namedItem("title"), error = form.querySelector("[data-error]"), close = (value) => {
        layer.remove();
        resolve(value);
      };
      layer.querySelector("[data-cancel]").addEventListener("click", () => close(null));
      form.onsubmit = (event) => {
        event.preventDefault();
        const title = input.value.trim();
        if (!title) {
          error.textContent = "\uD68C\uACC4\uBCF4\uACE0 \uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
          input.focus();
          return;
        }
        close(title);
      };
      input.select();
    });
  }
  function promptLegionReportRejection() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-report-rejection-modal";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uD68C\uACC4\uBCF4\uACE0 \uBC18\uB824</h3><form><label>\uBC18\uB824 \uC0AC\uC720 <i>*</i><textarea name="reason" maxlength="1000" rows="5" required placeholder="\uBC18\uB824 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea></label><p data-error></p><footer><button data-cancel type="button">\uCDE8\uC18C</button><button class="reject-button" type="submit">\uBC18\uB824</button></footer></form></section>`;
      document.body.append(layer);
      const form = layer.querySelector("form"), input = form.elements.namedItem("reason"), error = form.querySelector("[data-error]"), close = (value) => {
        layer.remove();
        resolve(value);
      };
      layer.querySelector("[data-cancel]").addEventListener("click", () => close(null));
      form.onsubmit = (event) => {
        event.preventDefault();
        const reason = input.value.trim();
        if (!reason) {
          error.textContent = "\uBC18\uB824 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
          input.focus();
          return;
        }
        close(reason);
      };
      input.focus();
    });
  }
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-report-reject]") : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void (async () => {
      const reason = await promptLegionReportRejection();
      if (!reason) return;
      target.disabled = true;
      try {
        const result = await api(`/api/parishioner/legion/account/reports/${Number(target.dataset.reportReject)}/decision`, { method: "PATCH", body: JSON.stringify({ status: "rejected", reason }) });
        target.closest(".legion-content-modal")?.remove();
        showLegionResult(result.message, true);
      } catch (error) {
        showLegionResult(error.message, false);
        target.disabled = false;
      }
    })();
  }, true);
  function mountLegionAccountManager(body, id, name, data) {
    const section = document.createElement("section");
    section.className = "legion-account-manager";
    section.innerHTML = data.openingBalance !== null ? `<h4>\uD68C\uACC4 \uAD00\uB9AC</h4><form data-account-entry><label>\uAD6C\uBD84<select name="direction"><option value="income">\uC785\uAE08</option><option value="expense">\uCD9C\uAE08</option></select></label><label>\uD56D\uBAA9<select name="category"></select></label><label>\uC77C\uC790<input name="entryDate" type="date" required></label><label>\uAE08\uC561<input name="amount" type="text" inputmode="numeric" pattern="[0-9,]+" placeholder="0" required></label><label>\uB0B4\uC6A9<input name="description" maxlength="2000"></label><label class="legion-account-receipt">\uC99D\uBE59\uC790\uB8CC <small>\uC120\uD0DD \xB7 \uCD5C\uB300 5MB</small><span class="legion-account-dropzone" tabindex="0" role="button"><b>\uD30C\uC77C\uC744 \uB04C\uC5B4\uB2E4 \uB193\uAC70\uB098 \uD074\uB9AD\uD574 \uC120\uD0DD\uD558\uC138\uC694</b><em></em></span><input name="receipt" type="file" hidden></label><button class="green-button" type="submit">\uB0B4\uC5ED \uB4F1\uB85D</button><p data-error></p></form><form data-account-report><label>\uBCF4\uACE0 \uC2DC\uC791\uC77C<input name="periodFrom" type="date" required></label><label>\uBCF4\uACE0 \uC885\uB8CC\uC77C<input name="periodTo" type="date" required></label><button class="green-outline" data-account-search type="button">\uAC80\uC0C9</button><button class="green-button" type="submit" disabled>\uD68C\uACC4\uBCF4\uACE0 \uC81C\uCD9C</button><p data-error></p><div class="legion-account-report-result"></div></form>` : `<h4>\uD68C\uACC4 \uAC1C\uC124</h4><form data-account-open><label>\uC774\uC6D4\uAE08\uC561<input name="openingBalance" type="text" inputmode="numeric" pattern="[0-9,]+" placeholder="0" required></label><button class="green-button" type="submit">\uD68C\uACC4 \uAC1C\uC124</button><p data-error></p></form>`;
    body.prepend(section);
    setupLegionEntryEditing(section, body, data, id, name);
    queueMicrotask(() => {
      const form = section.querySelector("[data-account-report]"), search2 = form?.querySelector("[data-account-search]"), submit2 = form?.querySelector("[data-account-submit]"), from = form?.elements.namedItem("periodFrom"), to = form?.elements.namedItem("periodTo"), error = form?.querySelector("[data-error]"), summary = body.querySelector(":scope>.legion-account-summary"), rows = [...body.querySelectorAll(":scope>.legion-account-table tbody tr[data-account-entry]")];
      section.querySelector(".legion-account-report-result")?.remove();
      if (!form || !search2 || !submit2 || !from || !to || !error || !summary) return;
      const render = (entries) => {
        const ids = new Set(entries.map((item) => item.id)), income = entries.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0), expense = entries.filter((item) => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0), opening = Number(data.openingBalance ?? 0), values = summary.querySelectorAll("b");
        if (values[0]) values[0].textContent = `${opening.toLocaleString("ko-KR")}\uC6D0`;
        if (values[1]) values[1].textContent = `${income.toLocaleString("ko-KR")}\uC6D0`;
        if (values[2]) values[2].textContent = `${expense.toLocaleString("ko-KR")}\uC6D0`;
        if (values[3]) values[3].textContent = `${(opening + income - expense).toLocaleString("ko-KR")}\uC6D0`;
        rows.forEach((row) => row.hidden = !ids.has(Number(row.dataset.accountEntry)));
      };
      const reset = () => render(data.entries);
      from.onchange = () => {
        submit2.disabled = true;
        delete form.dataset.searched;
        reset();
      };
      to.onchange = () => {
        submit2.disabled = true;
        delete form.dataset.searched;
        reset();
      };
      search2.onclick = () => {
        error.textContent = "";
        if (!from.value || !to.value || from.value > to.value) {
          submit2.disabled = true;
          delete form.dataset.searched;
          error.textContent = "\uBCF4\uACE0 \uAE30\uAC04\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
          return;
        }
        render(data.entries.filter((item) => item.entryDate >= from.value && item.entryDate <= to.value));
        form.dataset.searched = `${from.value}:${to.value}`;
        submit2.disabled = false;
      };
      submit2.onclick = async () => {
        if (submit2.disabled) return;
        const title = await promptLegionReportTitle(`${from.value} ~ ${to.value} \uD68C\uACC4\uBCF4\uACE0`);
        if (!title) return;
        submit2.disabled = true;
        error.textContent = "";
        try {
          await api(`/api/parishioner/legion/organizations/${id}/account/reports`, { method: "POST", body: JSON.stringify({ periodFrom: from.value, periodTo: to.value, title }) });
          body.closest(".legion-content-modal")?.remove();
          void openLegionViewer(id, name, "account");
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      };
    });
    const entryDate = section.querySelector('input[name="entryDate"]');
    if (entryDate) entryDate.max = new Date(Date.now() + 9 * 60 * 60 * 1e3).toISOString().slice(0, 10);
    const direction = section.querySelector('select[name="direction"]'), category = section.querySelector('select[name="category"]');
    if (direction && category) {
      const options2 = { income: [["member_offering", "\uB2E8\uC6D0 \uD5CC\uAE08"], ["secret_bag", "\uBE44\uBC00\uC8FC\uBA38\uB2C8"], ["other", "\uAE30\uD0C0"]], expense: [["contribution", "\uC758\uC5F0\uAE08"], ["event", "\uD589\uC0AC\uBE44"], ["administration", "\uD589\uC815\uBE44"], ["other", "\uAE30\uD0C0"]] }, render = () => {
        category.innerHTML = options2[direction.value].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
      };
      direction.onchange = render;
      render();
    }
    const openingInput = section.querySelector('input[name="openingBalance"]');
    if (openingInput) openingInput.oninput = () => {
      const digits = openingInput.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      openingInput.value = digits ? Number(digits).toLocaleString("ko-KR") : "";
    };
    const amountInput = section.querySelector('input[name="amount"]');
    if (amountInput) amountInput.oninput = () => {
      const digits = amountInput.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      amountInput.value = digits ? Number(digits).toLocaleString("ko-KR") : "";
    };
    section.querySelector("[data-account-entry]")?.addEventListener("formdata", (event) => {
      if (amountInput) event.formData.set("amount", amountInput.value.replace(/,/g, ""));
    });
    const receiptInput = section.querySelector('input[name="receipt"]'), dropzone = section.querySelector(".legion-account-dropzone"), receiptName = dropzone?.querySelector("em");
    if (receiptInput && dropzone && receiptName) {
      const select = (file) => {
        if (file.size > 5 * 1024 * 1024) {
          receiptInput.value = "";
          receiptName.textContent = "5MB \uC774\uD558 \uD30C\uC77C\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
          dropzone.classList.add("invalid");
          return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        receiptInput.files = transfer.files;
        dropzone.classList.remove("invalid");
        receiptName.textContent = `${file.name} \xB7 ${(file.size / 1024 / 1024).toFixed(2)}MB`;
      };
      dropzone.onclick = () => receiptInput.click();
      dropzone.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          receiptInput.click();
        }
      };
      receiptInput.onchange = () => {
        const file = receiptInput.files?.[0];
        if (file) select(file);
      };
      dropzone.ondragover = (event) => {
        event.preventDefault();
        dropzone.classList.add("dragging");
      };
      dropzone.ondragleave = () => dropzone.classList.remove("dragging");
      dropzone.ondrop = (event) => {
        event.preventDefault();
        dropzone.classList.remove("dragging");
        const file = event.dataTransfer?.files?.[0];
        if (file) select(file);
      };
    }
    const reportForm = section.querySelector("[data-account-report]");
    if (reportForm) {
      const from = reportForm.elements.namedItem("periodFrom"), to = reportForm.elements.namedItem("periodTo"), search2 = reportForm.querySelector("[data-account-search]"), submit2 = reportForm.querySelector('button[type="submit"]'), result = reportForm.querySelector(".legion-account-report-result"), error = reportForm.querySelector("[data-error]"), key = () => `${from.value}:${to.value}`, invalidate = () => {
        submit2.disabled = true;
        delete reportForm.dataset.searched;
        result.innerHTML = "";
      };
      from.onchange = invalidate;
      to.onchange = invalidate;
      search2.onclick = () => {
        error.textContent = "";
        if (!from.value || !to.value || from.value > to.value) {
          invalidate();
          error.textContent = "\uBCF4\uACE0 \uAE30\uAC04\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
          return;
        }
        const entries = data.entries.filter((item) => item.entryDate >= from.value && item.entryDate <= to.value), income = entries.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0), expense = entries.filter((item) => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0);
        result.innerHTML = `<div class="legion-account-report-summary"><b>${from.value} ~ ${to.value}</b><span>\uC785\uAE08 ${income.toLocaleString("ko-KR")}\uC6D0</span><span>\uCD9C\uAE08 ${expense.toLocaleString("ko-KR")}\uC6D0</span><span>\uCC28\uC561 ${(income - expense).toLocaleString("ko-KR")}\uC6D0</span></div>${entries.length ? `<div class="legion-account-table"><table><thead><tr><th>\uC77C\uC790</th><th>\uAD6C\uBD84</th><th>\uD56D\uBAA9</th><th>\uAE08\uC561</th><th>\uB0B4\uC6A9</th></tr></thead><tbody>${entries.map((item) => `<tr><td>${esc(item.entryDate)}</td><td>${item.direction === "income" ? "\uC785\uAE08" : "\uCD9C\uAE08"}</td><td>${esc(accountCategories[item.category] ?? item.category)}</td><td>${item.amount.toLocaleString("ko-KR")}\uC6D0</td><td>${esc(item.description ?? "-")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="legion-empty">\uC870\uD68C \uAE30\uAC04\uC5D0 \uB4F1\uB85D\uB41C \uD68C\uACC4 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}`;
        reportForm.dataset.searched = key();
        submit2.disabled = false;
      };
      reportForm.addEventListener("submit", (event) => {
        if (reportForm.dataset.searched !== key()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          submit2.disabled = true;
          error.textContent = "\uBCF4\uACE0 \uAE30\uAC04\uC744 \uAC80\uC0C9\uD55C \uD6C4 \uC81C\uCD9C\uD574 \uC8FC\uC138\uC694.";
        }
      }, true);
    }
    const reportActions = section.querySelector("[data-account-report]");
    if (reportActions) {
      const search2 = reportActions.querySelector("[data-account-search]"), submit2 = reportActions.querySelector('button[type="submit"]'), from = reportActions.elements.namedItem("periodFrom"), to = reportActions.elements.namedItem("periodTo"), error = reportActions.querySelector("[data-error]"), download = document.createElement("button");
      submit2.type = "button";
      submit2.dataset.accountSubmit = "";
      download.type = "button";
      download.className = "green-outline";
      download.textContent = "\uC5D1\uC140\uB2E4\uC6B4\uB85C\uB4DC";
      download.disabled = true;
      submit2.insertAdjacentElement("beforebegin", download);
      const disable = () => download.disabled = true;
      from.addEventListener("change", disable);
      to.addEventListener("change", disable);
      search2.addEventListener("click", () => download.disabled = submit2.disabled);
      download.onclick = () => {
        if (download.disabled) return;
        window.location.href = `/api/parishioner/legion/organizations/${id}/account/export?from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}`;
      };
      submit2.onclick = async () => {
        if (submit2.disabled) return;
        const title = window.prompt("\uBCF4\uACE0\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.", `${from.value} ~ ${to.value} \uD68C\uACC4\uBCF4\uACE0`)?.trim();
        if (!title) return;
        if (title.length > 300) {
          error.textContent = "\uBCF4\uACE0\uC11C \uC81C\uBAA9\uC740 300\uC790 \uC774\uB0B4\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
          return;
        }
        submit2.disabled = true;
        error.textContent = "";
        try {
          await api(`/api/parishioner/legion/organizations/${id}/account/reports`, { method: "POST", body: JSON.stringify({ periodFrom: from.value, periodTo: to.value, title }) });
          body.closest(".legion-content-modal")?.remove();
          void openLegionViewer(id, name, "account");
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      };
    }
    const refresh = () => {
      body.closest(".legion-content-modal")?.remove();
      void openLegionViewer(id, name, "account");
    };
    section.querySelectorAll("form").forEach((form) => form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]'), error = form.querySelector("[data-error]");
      button.disabled = true;
      error.textContent = "";
      try {
        const values = Object.fromEntries(new FormData(form));
        let path = "", payload = values;
        if (form.hasAttribute("data-account-open")) payload = { openingBalance: Number(String(values.openingBalance).replace(/,/g, "")) };
        else if (form.hasAttribute("data-account-entry")) {
          path = "/entries";
          const receipt = form.querySelector('input[name="receipt"]')?.files?.[0];
          if (receipt && receipt.size > 5 * 1024 * 1024) throw new Error("\uC99D\uBE59\uC790\uB8CC\uB294 5MB \uC774\uD558 \uD30C\uC77C\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
          let receiptData = "";
          if (receipt) receiptData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = () => reject(new Error("\uC99D\uBE59\uC790\uB8CC\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
            reader.readAsDataURL(receipt);
          });
          payload = { direction: values.direction, category: values.category, entryDate: values.entryDate, amount: Number(values.amount), description: values.description, receiptName: receipt?.name ?? "", receiptType: receipt?.type || "application/octet-stream", receiptData };
        } else path = "/reports";
        await api(`/api/parishioner/legion/organizations/${id}/account${path}`, { method: "POST", body: JSON.stringify(payload) });
        refresh();
      } catch (reason) {
        error.textContent = reason.message;
        button.disabled = false;
      }
    });
  }
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-account-manager{margin-bottom:18px;padding:15px;border:1px solid var(--line);border-radius:10px;background:#f8fbfa}.legion-account-manager h4{margin:0 0 11px}.legion-account-manager form{display:flex;flex-wrap:wrap;align-items:end;gap:8px;margin-top:9px}.legion-account-manager label{display:grid;flex:1 1 120px;gap:5px;font-size:9px;font-weight:700}.legion-account-manager input,.legion-account-manager select{height:36px;padding:0 8px;border:1px solid var(--line);border-radius:7px;background:#fff}.legion-account-manager button{height:36px;padding:0 13px;border:0;border-radius:7px}.legion-account-manager [data-error]{flex-basis:100%;margin:0;color:#c43d49;font-size:9px}.legion-account-manager .legion-account-receipt{flex-basis:100%}.legion-account-dropzone{display:grid;min-height:82px;padding:12px;place-items:center;border:2px dashed #9fcbbb;border-radius:9px;background:#fff;color:#41675a;text-align:center;cursor:pointer}.legion-account-dropzone.dragging{border-color:var(--green);background:#e4f6ef}.legion-account-dropzone.invalid{border-color:#d95b68;background:#fff5f6;color:#b43b47}.legion-account-dropzone em{font-size:9px;font-style:normal}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-card-actions{display:flex;gap:7px;margin:14px 0}.legion-card-actions button{height:34px;padding:0 13px;border:1px solid var(--green);border-radius:8px;background:#fff;color:var(--green);font-size:10px;font-weight:700;cursor:pointer}.legion-card-actions button:hover{background:#edf8f4}.legion-content-modal .member-modal-box{display:flex;width:min(94vw,820px);max-height:86vh;flex-direction:column;overflow:hidden;text-align:left}.legion-content-modal h3{flex:none;margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-content-body{min-height:240px;padding:20px;overflow:auto}.legion-content-modal>.member-modal-box>footer{display:flex;flex:none;justify-content:center;padding:14px;border-top:1px solid var(--line)}.legion-content-modal [data-close]{min-width:112px;height:42px;border:1px solid #aebdb7;border-radius:9px;background:#fff;color:#42534c;font-weight:700}.legion-content-loading,.legion-empty{padding:45px 15px;color:var(--muted);text-align:center}.legion-empty.error{color:#c43d49}.legion-content-list{display:grid;gap:11px}.legion-content-list article{padding:15px;border:1px solid var(--line);border-radius:10px}.legion-content-list article header{display:flex;align-items:center;justify-content:space-between;gap:12px}.legion-content-list time,.legion-content-list small{color:var(--muted);font-size:9px}.legion-content-list article>p{white-space:pre-wrap;line-height:1.7}.legion-content-list article>footer{display:flex;gap:12px;color:var(--green);font-size:9px}.legion-account-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}.legion-account-summary span{padding:12px;border-radius:9px;background:#f3f8f6;color:var(--muted);font-size:9px}.legion-account-summary b{display:block;margin-top:5px;color:#263b34;font-size:13px}.legion-account-table{overflow:auto}.legion-account-table table{width:100%;min-width:650px;border-collapse:collapse}.legion-account-table th,.legion-account-table td{padding:10px;border-bottom:1px solid var(--line);font-size:9px;text-align:left}.legion-account-table th{background:#f4f8f6}.legion-account-table td.income{color:#16845f}.legion-account-table td.expense{color:#c43d49}@media(max-width:600px){.legion-card-actions{flex-wrap:wrap}.legion-account-summary{grid-template-columns:repeat(2,1fr)}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-post-form{display:grid;gap:11px;margin-bottom:22px;padding:16px;border:1px solid var(--line);border-radius:11px;background:#f8fbfa}.legion-post-form h4,.legion-post-list-head h4{margin:0;color:#263b34}.legion-post-form label{display:grid;gap:6px;color:#34483f;font-size:10px;font-weight:700}.legion-post-form input,.legion-post-form textarea{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;resize:vertical}.legion-post-form input:focus,.legion-post-form textarea:focus{border-color:var(--green);outline:none;box-shadow:0 0 0 3px rgba(39,145,105,.1)}.legion-post-form [data-post-error]{min-height:14px;margin:0;color:#c43d49;font-size:9px}.legion-post-form>button{justify-self:end;min-width:100px;height:38px;border:0;border-radius:8px}.legion-post-form>button:disabled{background:#dce5e2;color:#fff;cursor:not-allowed}.legion-post-list-head{margin-bottom:10px;padding-bottom:9px;border-bottom:1px solid var(--line)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-post-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.legion-post-list-head>button{height:36px;padding:0 15px;border:0;border-radius:8px}.legion-post-form[hidden]{display:none!important}.legion-post-form{margin-top:20px;margin-bottom:0}.legion-post-form-actions{display:flex;justify-content:flex-end;gap:8px}.legion-post-form-actions button{min-width:100px;height:38px;border:1px solid #aebdb7;border-radius:8px;background:#fff;color:#42534c;font-weight:700}.legion-post-form-actions .green-button{border-color:var(--green);background:var(--green);color:#fff}.legion-post-form-actions .green-button:disabled{border-color:#dce5e2;background:#dce5e2}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-content-list article>footer{align-items:center}.legion-content-list article>footer nav{display:flex;gap:6px;margin-left:auto}.legion-content-list article>footer nav button{height:28px;padding:0 10px;border:1px solid var(--line);border-radius:7px;background:#fff;color:#52635d;font-size:9px}.legion-content-list article>footer nav button:last-child{border-color:#e4b7bc;color:#b63c48}.legion-post-confirm .member-modal-box{width:min(92vw,470px);overflow:hidden;text-align:left}.legion-post-confirm h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-post-confirm form{display:grid;gap:11px;padding:22px}.legion-post-confirm form>p:first-child{margin:0 0 5px;text-align:center;font-weight:700}.legion-post-confirm label{display:grid;gap:6px;font-size:10px;font-weight:700}.legion-post-confirm input,.legion-post-confirm textarea{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px}.legion-post-confirm small{color:var(--muted)}.legion-post-confirm [data-error]{min-height:12px;margin:0;color:#c43d49}.legion-post-confirm footer{display:flex;justify-content:center;gap:9px;margin:5px -22px -22px;padding:14px;border-top:1px solid var(--line)}.legion-post-confirm footer button{min-width:105px;height:40px;border:1px solid #aebdb7;border-radius:8px;background:#fff;color:#42534c;font-weight:700}.legion-post-confirm footer .green-button{border-color:var(--green);background:var(--green);color:#fff}.legion-post-confirm footer .green-button:disabled{border-color:#dce5e2;background:#dce5e2}.legion-post-edit-dialog .member-modal-box{width:min(94vw,620px)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-notice-locked{margin-left:8px;color:#b46a00!important;font-size:9px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-post-confirm,.legion-post-decision{z-index:100005!important}.legion-post-decision .member-modal-box{width:min(90vw,430px);overflow:hidden}.legion-post-decision h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-post-decision .member-modal-body{padding:28px;text-align:center}.legion-post-decision .member-modal-body p{margin:0}.legion-post-decision footer{display:flex;justify-content:center;gap:9px;padding:14px;border-top:1px solid var(--line)}.legion-post-decision footer button{min-width:105px;height:40px;border:1px solid #aebdb7;border-radius:8px;background:#fff;color:#42534c;font-weight:700}.legion-post-decision footer .green-button{border-color:var(--green);background:var(--green);color:#fff}</style>");
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-post],[data-delete-post]");
    if (!button) return;
    if (button.dataset.decisionConfirmed === "true") {
      delete button.dataset.decisionConfirmed;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const isNotice = button.closest(".legion-content-modal")?.querySelector("h3")?.textContent?.includes("\uACF5\uC9C0\uC0AC\uD56D") === true, kind = isNotice ? "\uACF5\uC9C0\uC0AC\uD56D" : "\uAC8C\uC2DC\uAE00", action = button.hasAttribute("data-edit-post") ? "\uC218\uC815" : "\uC0AD\uC81C";
    void legionPostDecision(`${kind}\uC744 ${action}\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`, `${action} \uC9C4\uD589`).then((confirmed) => {
      if (!confirmed) return;
      button.dataset.decisionConfirmed = "true";
      button.click();
    });
  }, true);
  function mountLegionBoardAttachment() {
    document.querySelectorAll(".legion-content-modal .legion-post-form").forEach((form) => {
      if (form.dataset.attachmentMounted || !form.closest(".legion-content-modal")?.querySelector("h3")?.textContent?.includes("\uAC8C\uC2DC\uD310")) return;
      form.dataset.attachmentMounted = "true";
      const error = form.querySelector("[data-post-error]"), label = document.createElement("label");
      label.className = "legion-board-attachment";
      label.innerHTML = '<span>\uCCA8\uBD80\uD30C\uC77C <small>\uC120\uD0DD \uC0AC\uD56D \xB7 \uD30C\uC77C 1\uAC1C \xB7 \uCD5C\uB300 5MB</small></span><div class="legion-board-dropzone" tabindex="0"><b>\uD30C\uC77C\uC744 \uC774\uACF3\uC5D0 \uB04C\uC5B4\uB2E4 \uB193\uC73C\uC138\uC694</b><small>\uB610\uB294 \uD074\uB9AD\uD558\uC5EC \uD30C\uC77C \uC120\uD0DD</small><em></em><input name="attachment" type="file"></div>';
      error.insertAdjacentElement("beforebegin", label);
      const zone = label.querySelector(".legion-board-dropzone"), input = label.querySelector("input"), name = label.querySelector("em"), apply = (file) => {
        if (file.size > 5 * 1024 * 1024) {
          name.textContent = "5MB \uC774\uD558 \uD30C\uC77C\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
          zone.classList.add("invalid");
          input.value = "";
          return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        zone.classList.remove("invalid");
        name.textContent = file.name;
      };
      zone.onclick = (event) => {
        if (event.target !== input) input.click();
      };
      zone.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          input.click();
        }
      };
      zone.ondragover = (event) => {
        event.preventDefault();
        zone.classList.add("dragging");
      };
      zone.ondragleave = () => zone.classList.remove("dragging");
      zone.ondrop = (event) => {
        event.preventDefault();
        zone.classList.remove("dragging");
        const file = event.dataTransfer?.files?.[0];
        if (file) apply(file);
      };
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) apply(file);
      };
    });
  }
  new MutationObserver(mountLegionBoardAttachment).observe(document.documentElement, { childList: true, subtree: true });
  mountLegionBoardAttachment();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-board-attachment>span small{margin-left:6px;color:var(--muted);font-weight:400}.legion-board-dropzone{display:grid;min-height:105px;margin-top:6px;padding:14px;place-items:center;border:2px dashed #9fcbbb;border-radius:10px;background:#f5fbf8;color:#41675a;text-align:center;cursor:pointer}.legion-board-dropzone.dragging{border-color:var(--green);background:#e4f6ef}.legion-board-dropzone.invalid{border-color:#d95b68;background:#fff5f6;color:#b43b47}.legion-board-dropzone small{color:var(--muted);font-weight:400}.legion-board-dropzone em{font-size:10px;font-style:normal;font-weight:700}.legion-board-dropzone input{position:absolute;width:1px!important;height:1px;padding:0!important;opacity:0;pointer-events:none}.legion-post-attachment{display:inline-flex;margin:0 0 10px;padding:6px 9px;border-radius:7px;background:var(--soft);color:var(--green);font-size:9px;font-weight:700;text-decoration:none}</style>");
  async function loadLegionComments(postId, panel2) {
    panel2.innerHTML = '<p class="legion-comments-loading">\uB313\uAE00\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...</p>';
    try {
      const comments = await api(`/api/parishioner/legion/posts/${postId}/comments`);
      panel2.innerHTML = `<div class="legion-comment-list">${comments.map((comment) => `<article><header><b>${esc(comment.authorName)}${comment.baptismalName ? ` (${esc(comment.baptismalName)})` : ""}</b><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time></header><p>${esc(comment.content)}</p></article>`).join("") || "<p>\uB4F1\uB85D\uB41C \uB313\uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>"}</div><form><input name="content" maxlength="3000" placeholder="\uB313\uAE00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694" required><button class="green-button" type="submit" disabled>\uB4F1\uB85D</button></form><p data-comment-error></p>`;
      const form = panel2.querySelector("form"), input = form.elements.namedItem("content"), submit2 = form.querySelector("button"), error = panel2.querySelector("[data-comment-error]");
      input.oninput = () => submit2.disabled = !input.value.trim();
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (!input.value.trim()) return;
        submit2.disabled = true;
        try {
          await api(`/api/parishioner/legion/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ content: input.value }) });
          await loadLegionComments(postId, panel2);
          const countButton = panel2.closest("article")?.querySelector("[data-legion-comments] b");
          if (countButton) countButton.textContent = String(Number(countButton.textContent || 0) + 1);
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      };
    } catch (reason) {
      panel2.innerHTML = `<p class="legion-comments-error">${esc(reason.message)}</p>`;
    }
  }
  document.addEventListener("click", (event) => {
    const like = event.target.closest("[data-legion-like]");
    if (like) {
      const id = Number(like.dataset.legionLike);
      like.disabled = true;
      void api(`/api/parishioner/legion/posts/${id}/like`, { method: "POST" }).then((result) => {
        like.classList.toggle("liked", result.liked);
        const count = like.querySelector("b");
        count.textContent = String(Math.max(0, Number(count.textContent || 0) + (result.liked ? 1 : -1)));
      }).catch((reason) => showLegionResult(reason.message, false)).finally(() => like.disabled = false);
      return;
    }
    const toggle = event.target.closest("[data-legion-comments]");
    if (toggle) {
      const panel2 = toggle.closest("article")?.querySelector("[data-comments-panel]");
      if (!panel2) return;
      panel2.hidden = !panel2.hidden;
      if (!panel2.hidden) void loadLegionComments(Number(toggle.dataset.legionComments), panel2);
    }
  }, false);
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-content-list article>footer>.legion-like,.legion-content-list article>footer>.legion-comments-toggle{height:28px;padding:0 9px;border:1px solid var(--line);border-radius:14px;background:#fff;color:#60736c;font-size:9px;cursor:pointer}.legion-content-list article>footer>.legion-like.liked{border-color:#8fd3bd;background:var(--soft);color:var(--green)}.legion-comments-panel{margin-top:12px;padding:13px;border-radius:9px;background:#f6f9f8}.legion-comments-panel[hidden]{display:none}.legion-comment-list{display:grid;gap:8px}.legion-comment-list article{padding:9px!important;background:#fff}.legion-comment-list header{display:flex;justify-content:space-between}.legion-comment-list time{font-size:8px}.legion-comment-list p{margin:5px 0 0!important;font-size:10px;white-space:pre-wrap}.legion-comments-panel>form{display:flex;gap:7px;margin-top:10px}.legion-comments-panel>form input{flex:1;min-width:0;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px}.legion-comments-panel>form button{width:70px;height:36px;border:0;border-radius:8px}.legion-comments-panel>form button:disabled{background:#dce5e2}.legion-comments-panel>[data-comment-error],.legion-comments-error{margin:5px 0 0;color:#c43d49;font-size:9px}.legion-comments-loading{text-align:center}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-rejection-modal form label{display:grid;gap:8px;text-align:left}.legion-rejection-modal textarea{min-height:150px;padding:11px;border:1px solid var(--line);border-radius:9px;resize:vertical}.legion-rejection-modal form>footer{display:flex;justify-content:center;gap:8px;margin:8px -20px -20px;padding:14px;border-top:1px solid var(--line)}.legion-rejection-modal form>footer button{min-width:110px;height:40px;border:1px solid #aebdb7;border-radius:8px;background:#fff}.legion-rejection-modal form>footer .green-button{border-color:#c64b58;background:#c64b58;color:#fff}.legion-rejection-modal form>footer .green-button:disabled{border-color:#e3e8e6;background:#e3e8e6}</style>");
  function legionRejectionReason() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-community-modal legion-rejection-modal";
      layer.innerHTML = '<section class="member-modal-box"><h3>\uAC00\uC785 \uC694\uCCAD \uBC18\uB824</h3><form class="member-modal-body"><label><b>* \uBC18\uB824 \uC0AC\uC720</b><textarea maxlength="1000" required placeholder="\uBC18\uB824 \uC0AC\uC720\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694"></textarea></label><p data-error></p><footer><button type="button" data-close>\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uBC18\uB824 \uC9C4\uD589</button></footer></form></section>';
      document.body.append(layer);
      const form = layer.querySelector("form"), textarea = form.querySelector("textarea"), submit2 = form.querySelector('button[type="submit"]'), close = () => {
        layer.remove();
        resolve(null);
      };
      textarea.oninput = () => submit2.disabled = !textarea.value.trim();
      layer.querySelector("[data-close]").addEventListener("click", close);
      form.onsubmit = (event) => {
        event.preventDefault();
        const reason = textarea.value.trim();
        if (!reason) return;
        layer.remove();
        resolve(reason);
      };
      textarea.focus();
    });
  }
  function legionCommunityModal(title) {
    const layer = document.createElement("div");
    layer.className = "member-modal legion-community-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${esc(title)}</h3><div class="member-modal-body"><p class="legion-content-loading">\uBD88\uB7EC\uC624\uB294 \uC911...</p></div><footer><button type="button" data-close>\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("[data-close]").addEventListener("click", () => layer.remove());
    return { layer, body: layer.querySelector(".member-modal-body") };
  }
  async function openLegionInquiries(id, name, canReply) {
    const { body } = legionCommunityModal(`${name} \xB7 \uBB38\uC758\uC0AC\uD56D`);
    const render = async () => {
      try {
        const items = await api(`/api/parishioner/legion/organizations/${id}/inquiries`);
        body.innerHTML = `<div class="legion-inquiry-list">${items.map((item) => `<article><header><strong>${esc(item.authorName)}${item.authorBaptismalName ? ` (${esc(item.authorBaptismalName)})` : ""}</strong><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></header><p>${esc(item.content)}</p>${item.response ? `<section><b>\uB2F5\uBCC0 \xB7 ${esc(item.responderName ?? "")}${item.responderBaptismalName ? ` (${esc(item.responderBaptismalName)})` : ""}</b><p>${esc(item.response)}</p></section>` : canReply ? `<form data-reply="${item.id}"><textarea maxlength="3000" required placeholder="\uB2F5\uBCC0\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></textarea><button class="green-button" type="submit">\uB2F5\uBCC0 \uBCF4\uB0B4\uAE30</button></form>` : "<small>\uB2F5\uBCC0 \uB300\uAE30\uC911</small>"}</article>`).join("") || '<p class="legion-empty">\uB4F1\uB85D\uB41C \uBB38\uC758\uC0AC\uD56D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}</div><form class="legion-inquiry-new"><textarea maxlength="3000" required placeholder="\uBB38\uC758\uC0AC\uD56D\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></textarea><button class="green-button" type="submit">\uBB38\uC758 \uBCF4\uB0B4\uAE30</button></form><p data-error></p>`;
        body.querySelector(".legion-inquiry-new").onsubmit = async (event) => {
          event.preventDefault();
          const form = event.currentTarget, content = form.querySelector("textarea").value.trim();
          if (!content) return;
          if (!await legionPostDecision("\uBB38\uC758\uC0AC\uD56D\uC744 \uBCF4\uB0B4\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", "\uBCF4\uB0B4\uAE30")) return;
          try {
            await api(`/api/parishioner/legion/organizations/${id}/inquiries`, { method: "POST", body: JSON.stringify({ content }) });
            await render();
          } catch (error) {
            body.querySelector("[data-error]").textContent = error.message;
          }
        };
        body.querySelectorAll("[data-reply]").forEach((form) => form.onsubmit = async (event) => {
          event.preventDefault();
          const response = form.querySelector("textarea").value.trim();
          if (!response) return;
          if (!await legionPostDecision("\uB2F5\uBCC0\uC744 \uBCF4\uB0B4\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", "\uB2F5\uBCC0 \uBCF4\uB0B4\uAE30")) return;
          try {
            await api(`/api/parishioner/legion/inquiries/${form.dataset.reply}/reply`, { method: "POST", body: JSON.stringify({ response }) });
            await render();
          } catch (error) {
            body.querySelector("[data-error]").textContent = error.message;
          }
        });
      } catch (error) {
        body.innerHTML = `<p class="legion-empty error">${esc(error.message)}</p>`;
      }
    };
    await render();
  }
  async function openLegionApplications(id, name) {
    const { body } = legionCommunityModal(`${name} \xB7 \uAC00\uC785 \uC694\uCCAD`);
    const render = async () => {
      try {
        const items = await api(`/api/parishioner/legion/organizations/${id}/applications`);
        body.innerHTML = `<div class="legion-application-list">${items.map((item) => `<article><div><strong>${esc(item.name)}${item.baptismalName ? ` (${esc(item.baptismalName)})` : ""}</strong><small>${esc(item.email)} \xB7 ${new Date(item.requestedAt).toLocaleString("ko-KR")}</small></div><b class="legion-card-status ${item.status}">${organizationStatuses[item.status] ?? esc(item.status)}</b><p class="legion-application-motivation"><b>\uAC00\uC785 \uB3D9\uAE30</b>${esc(item.motivation)}</p>${item.status === "requested" ? `<footer><button data-application="${item.id}" data-status="rejected" type="button">\uBC18\uB824</button><button class="green-button" data-application="${item.id}" data-status="approved" type="button">\uC2B9\uC778</button></footer>` : item.rejectionReason ? `<p>\uBC18\uB824 \uC0AC\uC720: ${esc(item.rejectionReason)}</p>` : ""}</article>`).join("") || '<p class="legion-empty">\uAC00\uC785 \uC694\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}</div><p data-error></p>`;
        body.querySelectorAll("[data-application]").forEach((button) => button.onclick = async () => {
          const status = button.dataset.status, reason = status === "rejected" ? await legionRejectionReason() : "";
          if (status === "rejected" && !reason) return;
          if (!await legionPostDecision(status === "approved" ? "\uAC00\uC785\uC744 \uC2B9\uC778\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?" : "\uAC00\uC785\uC744 \uBC18\uB824\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", status === "approved" ? "\uC2B9\uC778" : "\uBC18\uB824")) return;
          try {
            await api(`/api/parishioner/legion/applications/${button.dataset.application}/decision`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
            await render();
          } catch (error) {
            body.querySelector("[data-error]").textContent = error.message;
          }
        });
      } catch (error) {
        body.innerHTML = `<p class="legion-empty error">${esc(error.message)}</p>`;
      }
    };
    await render();
  }
  async function openLegionSchedules(id, name) {
    const { body } = legionCommunityModal(`${name} \xB7 \uBAA8\uC784 \uC77C\uC815`);
    const render = async () => {
      try {
        const result = await api(`/api/parishioner/legion/organizations/${id}/schedules`);
        body.innerHTML = `<div class="legion-schedule-toolbar"><h4>\uB4F1\uB85D\uB41C \uBAA8\uC784 \uC77C\uC815</h4>${result.canCreate ? '<button class="green-button" data-new-schedule type="button">\uC77C\uC815 \uB4F1\uB85D</button>' : ""}</div><div class="legion-schedule-list">${result.items.map((item) => {
          const date = new Date(item.startsAt);
          return `<article><b>${item.roundNo}\uD68C</b><div><strong>${date.toLocaleDateString("ko-KR")}</strong><span>${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span><small>\uC7A5\uC18C \xB7 ${esc(item.location)}</small></div></article>`;
        }).join("") || '<p class="legion-empty">\uB4F1\uB85D\uB41C \uBAA8\uC784 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}</div><p data-error></p>`;
        body.querySelector("[data-new-schedule]")?.addEventListener("click", () => {
          body.innerHTML = `<form class="legion-schedule-form"><label><b>* \uD68C\uCC28</b><input name="roundNo" type="number" min="1" max="999999" ${result.nextRound ? `value="${result.nextRound}" disabled` : 'placeholder="\uCD5C\uCD08 \uBAA8\uC784 \uD68C\uCC28\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694" required'}></label><label><b>* \uBAA8\uC784 \uC77C\uC790</b><input name="date" type="date" required></label><label><b>* \uC2DC\uAC04</b><input name="time" type="time" required></label><label><b>* \uC7A5\uC18C</b><input name="location" maxlength="300" required placeholder="\uBAA8\uC784 \uC7A5\uC18C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694"></label><p data-error></p><footer><button data-cancel type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uB4F1\uB85D</button></footer></form>`;
          const form = body.querySelector("form");
          form.querySelector("[data-cancel]").addEventListener("click", () => void render());
          form.onsubmit = async (event) => {
            event.preventDefault();
            const data = new FormData(form), roundNo = result.nextRound ?? Number(data.get("roundNo")), startsAt = `${data.get("date")}T${data.get("time")}`, location2 = String(data.get("location") ?? "").trim();
            if (!await legionPostDecision(`${roundNo}\uD68C \uBAA8\uC784 \uC77C\uC815\uC744 \uB4F1\uB85D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`, "\uC77C\uC815 \uB4F1\uB85D")) return;
            try {
              const saved = await api(`/api/parishioner/legion/organizations/${id}/schedules`, { method: "POST", body: JSON.stringify({ roundNo, startsAt, location: location2 }) });
              showLegionResult(saved.message, false);
              await render();
            } catch (error) {
              form.querySelector("[data-error]").textContent = error.message;
            }
          };
        });
      } catch (error) {
        body.innerHTML = `<p class="legion-empty error">${esc(error.message)}</p>`;
      }
    };
    await render();
  }
  async function openLegionMembers(id, name) {
    const { body } = legionCommunityModal(`${name} \xB7 \uB2E8\uC6D0`);
    try {
      const members = await api(`/api/parishioner/legion/organizations/${id}/members`), labels2 = { president: "\uB2E8\uC7A5", vice_president: "\uBD80\uB2E8\uC7A5", secretary: "\uC11C\uAE30", treasurer: "\uD68C\uACC4", member: "\uD3C9\uD68C\uC6D0" };
      body.innerHTML = `<div class="legion-member-summary">\uCD1D <b>${members.length}</b>\uBA85</div><div class="legion-member-list">${members.map((member) => `<article><div><strong>${esc(member.name)}</strong>${member.baptismalName ? `<span>${esc(member.baptismalName)}</span>` : ""}</div><b class="role-${member.role}">${labels2[member.role]}</b><time>\uAC00\uC785\uC77C \xB7 ${new Date(member.joinedAt).toLocaleDateString("ko-KR")}</time></article>`).join("") || '<p class="legion-empty">\uAC00\uC785\uB41C \uB2E8\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}</div>`;
    } catch (error) {
      body.innerHTML = `<p class="legion-empty error">${esc(error.message)}</p>`;
    }
  }
  function mountLegionMemberGrid() {
    document.querySelectorAll(".legion-member-list:not([data-grid-mounted])").forEach((list) => {
      list.dataset.gridMounted = "1";
      const articles = [...list.querySelectorAll(":scope>article")];
      if (!articles.length) return;
      const rows = articles.map((article) => {
        const name = article.querySelector("strong")?.textContent ?? "", baptismalName = article.querySelector("div>span")?.textContent ?? "-", role = article.querySelector(":scope>b")?.textContent ?? "", joinedAt = (article.querySelector("time")?.textContent ?? "").replace(/^가입일\s*·\s*/, "");
        return `<div class="legion-member-grid-row"><span>${esc(name)}</span><span>${esc(baptismalName)}</span><b>${esc(role)}</b><time>${esc(joinedAt)}</time></div>`;
      }).join("");
      list.innerHTML = `<div class="legion-member-grid-head"><b>\uC774\uB984</b><b>\uC138\uB840\uBA85</b><b>\uC5ED\uD560</b><b>\uAC00\uC785\uC77C</b></div>${rows}`;
    });
  }
  new MutationObserver(mountLegionMemberGrid).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-new-schedule]")) return;
    queueMicrotask(() => {
      const form = document.querySelector(".legion-schedule-form");
      if (!form) return;
      const submit2 = form.querySelector('button[type="submit"]'), update = () => {
        const round = form.elements.namedItem("roundNo"), date = form.elements.namedItem("date"), time = form.elements.namedItem("time"), location2 = form.elements.namedItem("location");
        submit2.disabled = !(Number(round.value) >= 1 && date.value && time.value && location2.value.trim());
      };
      form.addEventListener("input", update);
      form.addEventListener("change", update);
      update();
    });
  });
  var legionAttendanceMounting = false;
  async function mountLegionAttendance() {
    const modal2 = [...document.querySelectorAll(".legion-community-modal")].find((item) => item.dataset.scheduleOrg), list = modal2?.querySelector(".legion-schedule-list");
    if (!modal2 || !list || legionAttendanceMounting || list.dataset.attendanceMounted) return;
    legionAttendanceMounting = true;
    try {
      const id = Number(modal2.dataset.scheduleOrg), result = await api(`/api/parishioner/legion/organizations/${id}/schedules`), articles = list.querySelectorAll(":scope>article");
      articles.forEach((article, index) => {
        const item = result.items[index];
        if (!item) return;
        const attendance = document.createElement("div");
        attendance.className = "legion-schedule-attendance";
        attendance.innerHTML = `<span>\uCC38\uC11D <b>${item.attendanceCount}</b>\uBA85</span><button type="button" ${item.attended ? "disabled" : ""}>${item.attended ? "\uCD9C\uC11D \uC644\uB8CC" : "\uCD9C\uC11D"}</button>`;
        article.append(attendance);
        attendance.querySelector("button").onclick = async () => {
          const button = attendance.querySelector("button");
          button.disabled = true;
          try {
            const saved = await api(`/api/parishioner/legion/schedules/${item.id}/attendance`, { method: "POST" });
            attendance.querySelector("b").textContent = String(saved.attendanceCount);
            button.textContent = "\uCD9C\uC11D \uC644\uB8CC";
          } catch (error) {
            button.disabled = false;
            showLegionResult(error.message, false);
          }
        };
      });
      list.dataset.attendanceMounted = "1";
    } finally {
      legionAttendanceMounting = false;
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-community-schedule]");
    if (!button) return;
    const cards = [...document.querySelectorAll(".member-legion>div>article")], index = cards.indexOf(button.closest("article"));
    void api("/api/parishioner/legion/organizations").then((items) => {
      const modal2 = [...document.querySelectorAll(".legion-community-modal")].at(-1), item = items[index];
      if (!modal2 || !item) return;
      modal2.dataset.scheduleOrg = String(item.id);
      void mountLegionAttendance();
    });
  });
  new MutationObserver(() => void mountLegionAttendance()).observe(document.documentElement, { childList: true, subtree: true });
  var legionAttendanceSummaryMounting = false;
  async function mountLegionAttendanceSummary() {
    const modal2 = [...document.querySelectorAll(".legion-community-modal")].find((item) => item.dataset.scheduleOrg), list = modal2?.querySelector(".legion-schedule-list[data-attendance-mounted]");
    if (!modal2 || !list || list.dataset.summaryMounted || legionAttendanceSummaryMounting) return;
    legionAttendanceSummaryMounting = true;
    try {
      const result = await api(`/api/parishioner/legion/organizations/${modal2.dataset.scheduleOrg}/schedules`), articles = list.querySelectorAll(":scope>article");
      articles.forEach((article, index) => {
        const item = result.items[index], summary = article.querySelector(".legion-schedule-attendance>span");
        if (!item || !summary) return;
        const total = item.totalMemberCount, percent = total ? Math.round(item.attendanceCount / total * 100) : 0;
        summary.dataset.total = String(total);
        summary.innerHTML = `\uCC38\uC11D\uC790 : <b>${item.attendanceCount}</b>\uBA85 / \uCD1D ${total}\uBA85 (<em>${percent}%</em>)`;
      });
      list.dataset.summaryMounted = "1";
    } finally {
      legionAttendanceSummaryMounting = false;
    }
  }
  new MutationObserver(() => {
    void mountLegionAttendanceSummary();
    document.querySelectorAll(".legion-schedule-attendance>span[data-total]").forEach((summary) => {
      const attended = Number(summary.querySelector("b")?.textContent || 0), total = Number(summary.dataset.total || 0), percent = total ? Math.round(attended / total * 100) : 0;
      const value = summary.querySelector("em");
      if (value && value.textContent !== `${percent}%`) value.textContent = `${percent}%`;
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("mouseover", (event) => {
    const target = event.target.closest(".legion-schedule-attendance>span");
    if (!target || target.dataset.tooltipLoading || target.querySelector(".legion-attendance-tooltip")) return;
    const modal2 = target.closest(".legion-community-modal"), list = target.closest(".legion-schedule-list"), article = target.closest("article");
    if (!modal2?.dataset.scheduleOrg || !list || !article) return;
    target.dataset.tooltipLoading = "1";
    const index = [...list.querySelectorAll(":scope>article")].indexOf(article);
    void api(`/api/parishioner/legion/organizations/${modal2.dataset.scheduleOrg}/schedules`).then((result) => {
      const schedule = result.items[index];
      if (!schedule) return null;
      return api(`/api/parishioner/legion/schedules/${schedule.id}/attendance`);
    }).then((items) => {
      if (!items) return;
      const tooltip = document.createElement("div");
      tooltip.className = "legion-attendance-tooltip";
      tooltip.innerHTML = items.length ? `<b>\uCC38\uAC00 \uC778\uC6D0</b>${items.map((item) => `<span>${esc(item.name)}${item.baptismalName ? ` / ${esc(item.baptismalName)}` : ""}</span>`).join("")}` : "<span>\uCC38\uAC00\uD55C \uB2E8\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</span>";
      target.append(tooltip);
    }).catch(() => delete target.dataset.tooltipLoading);
  });
  document.addEventListener("mouseover", (event) => {
    const target = event.target.closest(".legion-schedule-attendance>span");
    if (!target || target.dataset.portalTooltip) return;
    const modal2 = target.closest(".legion-community-modal"), list = target.closest(".legion-schedule-list"), article = target.closest("article");
    if (!modal2?.dataset.scheduleOrg || !list || !article) return;
    target.dataset.tooltipLoading = "1";
    target.dataset.portalTooltip = "1";
    const index = [...list.querySelectorAll(":scope>article")].indexOf(article), close = () => {
      document.querySelector(`[data-attendance-tooltip-for="${target.dataset.portalTooltipId}"]`)?.remove();
      delete target.dataset.portalTooltip;
      delete target.dataset.tooltipLoading;
      delete target.dataset.portalTooltipId;
    };
    target.addEventListener("mouseleave", close, { once: true });
    void api(`/api/parishioner/legion/organizations/${modal2.dataset.scheduleOrg}/schedules`).then((result) => {
      const schedule = result.items[index];
      return schedule ? api(`/api/parishioner/legion/schedules/${schedule.id}/attendance`) : null;
    }).then((items) => {
      if (!items || !target.matches(":hover")) {
        close();
        return;
      }
      const tooltip = document.createElement("div"), key = `attendance-${Date.now()}-${Math.random().toString(36).slice(2)}`, rect = target.getBoundingClientRect();
      target.dataset.portalTooltipId = key;
      tooltip.className = "legion-attendance-portal";
      tooltip.dataset.attendanceTooltipFor = key;
      tooltip.innerHTML = items.length ? `<b>\uCC38\uAC00 \uC778\uC6D0</b>${items.map((item) => `<span>${esc(item.name)}${item.baptismalName ? ` / ${esc(item.baptismalName)}` : ""}</span>`).join("")}` : "<span>\uCC38\uAC00\uD55C \uB2E8\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</span>";
      document.body.append(tooltip);
      const width = tooltip.offsetWidth, left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.left + rect.width / 2 - width / 2));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(8, rect.top - tooltip.offsetHeight - 9)}px`;
    }).catch(close);
  }, true);
  var legionAttendancePointer = { x: 0, y: 0 };
  document.addEventListener("mousemove", (event) => {
    legionAttendancePointer = { x: event.clientX, y: event.clientY };
    const tooltip = document.querySelector(".legion-attendance-portal");
    if (tooltip) positionLegionAttendanceTooltip(tooltip);
  });
  function positionLegionAttendanceTooltip(tooltip) {
    const width = tooltip.offsetWidth, height = tooltip.offsetHeight, left = Math.min(window.innerWidth - width - 8, Math.max(8, legionAttendancePointer.x - width / 2)), top = Math.max(8, legionAttendancePointer.y - height - 14);
    tooltip.style.setProperty("left", `${left}px`, "important");
    tooltip.style.setProperty("top", `${top}px`, "important");
  }
  new MutationObserver(() => {
    const tooltip = document.body.querySelector(":scope>.legion-attendance-portal");
    if (!tooltip) return;
    document.documentElement.append(tooltip);
    positionLegionAttendanceTooltip(tooltip);
  }).observe(document.body, { childList: true });
  var legionCommunityMounting = false;
  async function mountLegionCommunityActions() {
    const panel2 = document.querySelector(".member-legion"), cards = panel2?.querySelectorAll(":scope>div>article");
    if (!panel2 || panel2.hidden || !cards?.length || legionCommunityMounting || [...cards].every((card) => card.dataset.communityMounted)) return;
    legionCommunityMounting = true;
    try {
      const items = await api("/api/parishioner/legion/organizations");
      cards.forEach((card, index) => {
        const item = items[index];
        if (!item || item.organizationType !== "praesidium" || card.dataset.communityMounted) return;
        card.dataset.communityMounted = "1";
        const nav = document.createElement("nav");
        nav.className = "legion-community-actions";
        nav.innerHTML = `${item.role !== "visitor" ? '<button data-community-schedule type="button">\uC77C\uC815</button>' : ""}<button data-community-inquiry type="button">\uBB38\uC758\uC0AC\uD56D</button>${item.role === "visitor" ? `<button class="green-button" data-community-join type="button" ${item.applicationStatus === "requested" ? "disabled" : ""}>${item.applicationStatus === "requested" ? "\uAC00\uC785 \uC2B9\uC778 \uB300\uAE30\uC911" : "\uAC00\uC785\uD558\uAE30"}</button>` : ""}${item.role === "president" ? '<button data-community-applications type="button">\uAC00\uC785 \uC694\uCCAD</button>' : ""}`;
        card.querySelector("footer").insertAdjacentElement("beforebegin", nav);
        nav.querySelector("[data-community-schedule]")?.addEventListener("click", () => void openLegionSchedules(item.id, item.name));
        nav.querySelector("[data-community-inquiry]").onclick = () => void openLegionInquiries(item.id, item.name, ["president", "vice_president"].includes(item.role));
        nav.querySelector("[data-community-join]")?.addEventListener("click", async (event) => {
          const button = event.currentTarget;
          if (!await legionPostDecision(`'${item.name}'\uC5D0 \uAC00\uC785 \uC2E0\uCCAD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`, "\uAC00\uC785 \uC2E0\uCCAD")) return;
          button.disabled = true;
          try {
            const result = await api(`/api/parishioner/legion/organizations/${item.id}/applications`, { method: "POST" });
            showLegionResult(result.message, false);
            button.textContent = "\uAC00\uC785 \uC2B9\uC778 \uB300\uAE30\uC911";
          } catch (error) {
            showLegionResult(error.message, false);
            button.disabled = false;
          }
        });
        nav.querySelector("[data-community-applications]")?.addEventListener("click", () => void openLegionApplications(item.id, item.name));
      });
    } finally {
      legionCommunityMounting = false;
    }
  }
  new MutationObserver(() => void mountLegionCommunityActions()).observe(document.documentElement, { childList: true, subtree: true });
  void mountLegionCommunityActions();
  var legionMemberButtonsMounting = false;
  async function mountLegionMemberButtons() {
    const panel2 = document.querySelector(".member-legion"), cards = panel2?.querySelectorAll(":scope>div>article");
    if (!panel2 || panel2.hidden || !cards?.length || legionMemberButtonsMounting || [...cards].every((card) => card.dataset.memberButtonMounted)) return;
    legionMemberButtonsMounting = true;
    try {
      const items = await api("/api/parishioner/legion/organizations");
      cards.forEach((card, index) => {
        const item = items[index];
        if (!item || card.dataset.memberButtonMounted) return;
        card.dataset.memberButtonMounted = "1";
        if (item.organizationType !== "praesidium" || item.role === "visitor") return;
        const actions = card.querySelector(":scope>.legion-card-actions,:scope>.legion-community-actions");
        if (!actions) return;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.legionMembers = String(item.id);
        button.textContent = "\uB2E8\uC6D0";
        button.onclick = () => void openLegionMembers(item.id, item.name);
        const edit = actions.querySelector("[data-edit-org]");
        if (edit) actions.insertBefore(button, edit);
        else actions.append(button);
      });
    } finally {
      legionMemberButtonsMounting = false;
    }
  }
  new MutationObserver(() => void mountLegionMemberButtons()).observe(document.documentElement, { childList: true, subtree: true });
  void mountLegionMemberButtons();
  function legionJoinMotivation(name) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal legion-community-modal legion-join-modal";
      layer.innerHTML = `<section class="member-modal-box"><h3>${esc(name)} \uAC00\uC785 \uC2E0\uCCAD</h3><form class="member-modal-body"><label><b>* \uAC00\uC785 \uB3D9\uAE30</b><textarea maxlength="2000" required placeholder="\uAC00\uC785 \uB3D9\uAE30\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694"></textarea></label><p data-error></p><footer><button type="button" data-close>\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uC2B9\uC778 \uC694\uCCAD</button></footer></form></section>`;
      document.body.append(layer);
      const form = layer.querySelector("form"), textarea = form.querySelector("textarea"), submit2 = form.querySelector('button[type="submit"]'), close = () => {
        layer.remove();
        resolve(null);
      };
      textarea.oninput = () => submit2.disabled = !textarea.value.trim();
      layer.querySelector("[data-close]").addEventListener("click", close);
      form.onsubmit = async (event) => {
        event.preventDefault();
        const motivation = textarea.value.trim();
        if (!motivation) return;
        if (!await legionPostDecision("\uAC00\uC785 \uC2B9\uC778\uC744 \uC694\uCCAD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", "\uC2B9\uC778 \uC694\uCCAD")) return;
        layer.remove();
        resolve(motivation);
      };
      textarea.focus();
    });
  }
  var legionJoinMounting = false;
  async function mountLegionJoinMotivation() {
    const cards = document.querySelectorAll(".member-legion>div>article"), buttons = document.querySelectorAll(".member-legion [data-community-join]:not([data-motivation-mounted])");
    if (!cards.length || !buttons.length || legionJoinMounting) return;
    legionJoinMounting = true;
    try {
      const items = await api("/api/parishioner/legion/organizations");
      cards.forEach((card, index) => {
        const original = card.querySelector("[data-community-join]:not([data-motivation-mounted])"), item = items[index];
        if (!original || !item) return;
        const button = original.cloneNode(true);
        button.dataset.motivationMounted = "1";
        original.replaceWith(button);
        button.onclick = async () => {
          const motivation = await legionJoinMotivation(item.name);
          if (!motivation) return;
          button.disabled = true;
          try {
            const result = await api(`/api/parishioner/legion/organizations/${item.id}/applications`, { method: "POST", body: JSON.stringify({ motivation }) });
            showLegionResult(result.message, false);
            button.textContent = "\uAC00\uC785 \uC2B9\uC778 \uB300\uAE30\uC911";
          } catch (error) {
            showLegionResult(error.message, false);
            button.disabled = false;
          }
        };
      });
    } finally {
      legionJoinMounting = false;
    }
  }
  new MutationObserver(() => void mountLegionJoinMotivation()).observe(document.documentElement, { childList: true, subtree: true });
  void mountLegionJoinMotivation();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-join-modal form label{display:grid;gap:8px;text-align:left}.legion-join-modal textarea{min-height:150px;padding:11px;border:1px solid var(--line);border-radius:9px;resize:vertical}.legion-join-modal form>footer{display:flex;justify-content:center;gap:8px;margin:8px -20px -20px;padding:14px;border-top:1px solid var(--line)}.legion-join-modal form>footer button{min-width:110px;height:40px;border:1px solid #aebdb7;border-radius:8px;background:#fff}.legion-join-modal form>footer .green-button{border-color:var(--green);background:var(--green);color:#fff}.legion-join-modal form>footer .green-button:disabled{border-color:#dce5e2;background:#dce5e2}.legion-application-motivation{width:100%;margin:4px 0;padding:10px;border-radius:8px;background:#f5f8f7;line-height:1.6;white-space:pre-wrap}.legion-application-motivation b{display:block;margin-bottom:4px;color:var(--green)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-community-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 14px}.legion-community-actions button{height:34px;padding:0 13px;border:1px solid #287f86;border-radius:8px;background:#fff;color:#287f86;font-size:10px;font-weight:700}.legion-community-actions .green-button{border-color:var(--green);background:var(--green);color:#fff}.legion-community-actions button:disabled{border-color:#cbd8d4;background:#e4ebe8;color:#87978f}.legion-community-modal .member-modal-box{display:flex;width:min(94vw,720px);max-height:88vh;flex-direction:column;overflow:hidden}.legion-community-modal h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-community-modal .member-modal-body{padding:20px;overflow:auto}.legion-community-modal>.member-modal-box>footer{display:flex;justify-content:center;padding:13px;border-top:1px solid var(--line)}.legion-community-modal>.member-modal-box>footer button{min-width:110px;height:40px;border:1px solid #aebdb7;border-radius:8px;background:#fff}.legion-inquiry-list,.legion-application-list{display:grid;gap:10px}.legion-inquiry-list>article,.legion-application-list>article{padding:14px;border:1px solid var(--line);border-radius:10px}.legion-inquiry-list header,.legion-application-list>article{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}.legion-inquiry-list time,.legion-inquiry-list small,.legion-application-list small{display:block;color:var(--muted);font-size:9px}.legion-inquiry-list article>p{width:100%;white-space:pre-wrap}.legion-inquiry-list article>section{width:100%;padding:11px;border-left:3px solid var(--green);background:#f3f8f6}.legion-inquiry-list form,.legion-inquiry-new{display:grid;width:100%;gap:7px;margin-top:10px}.legion-inquiry-list textarea,.legion-inquiry-new textarea{min-height:85px;padding:10px;border:1px solid var(--line);border-radius:8px;resize:vertical}.legion-inquiry-list form button,.legion-inquiry-new button{justify-self:end;height:36px;padding:0 14px;border:0;border-radius:8px}.legion-inquiry-new{margin-top:16px;padding-top:15px;border-top:1px solid var(--line)}.legion-application-list footer{display:flex;gap:6px}.legion-application-list footer button{height:32px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:#fff}.legion-application-list footer .green-button{border-color:var(--green);background:var(--green);color:#fff}</style>");
  function syncLegionInquirySubmit() {
    document.querySelectorAll(".legion-inquiry-new").forEach((form) => {
      const textarea = form.querySelector("textarea"), button = form.querySelector('button[type="submit"]');
      if (!textarea || !button) return;
      button.disabled = !textarea.value.trim();
      if (form.dataset.submitSync) return;
      form.dataset.submitSync = "1";
      textarea.addEventListener("input", () => button.disabled = !textarea.value.trim());
    });
  }
  new MutationObserver(syncLegionInquirySubmit).observe(document.documentElement, { childList: true, subtree: true });
  syncLegionInquirySubmit();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-inquiry-new button:disabled{border-color:#d8e2de!important;background:#e8eeeb!important;color:#93a19b!important;cursor:not-allowed;opacity:1}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-inquiry-list>article>p,.legion-inquiry-list>article>section>p{box-sizing:border-box;width:100%;margin:10px 0;text-align:left!important;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.legion-inquiry-list>article>section{text-align:left!important}</style>");
  function syncLegionInquiryReplies() {
    document.querySelectorAll(".legion-inquiry-list form[data-reply]").forEach((form) => {
      const textarea = form.querySelector("textarea"), button = form.querySelector('button[type="submit"]');
      if (!textarea || !button) return;
      button.disabled = !textarea.value.trim();
      if (form.dataset.replySubmitSync) return;
      form.dataset.replySubmitSync = "1";
      textarea.addEventListener("input", () => button.disabled = !textarea.value.trim());
    });
  }
  new MutationObserver(syncLegionInquiryReplies).observe(document.documentElement, { childList: true, subtree: true });
  syncLegionInquiryReplies();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-inquiry-list form[data-reply] button:disabled{border-color:#d8e2de!important;background:#e8eeeb!important;color:#93a19b!important;cursor:not-allowed;opacity:1}</style>");
  var legionDemographicsMounting = false;
  async function mountLegionDemographics() {
    const cards = [...document.querySelectorAll(".member-legion>div>article.legion-praesidium")].filter((card) => !card.querySelector("[data-legion-demographics]"));
    if (!cards.length || legionDemographicsMounting) return;
    legionDemographicsMounting = true;
    try {
      const items = await api("/api/parishioner/legion/demographics"), byId = new Map(items.map((item) => [item.id, item]));
      cards.forEach((card) => {
        const source = card.querySelector("[data-org]"), title = card.querySelector(".legion-card-title"), item = byId.get(Number(source?.dataset.org));
        if (!title || !item) return;
        const summary = document.createElement("span");
        summary.dataset.legionDemographics = "1";
        summary.className = "legion-card-demographics";
        summary.textContent = `\uCD1D ${item.totalCount}\uBA85 (\uB0A8/\uC5EC: ${item.maleCount}/${item.femaleCount}, \uC131\uC778: ${item.adultCount}, \uCCAD\uB144: ${item.youthCount}, \uCCAD\uC18C\uB144: ${item.adolescentCount}, \uC18C\uB144: ${item.childCount})`;
        title.append(summary);
      });
    } catch {
    } finally {
      legionDemographicsMounting = false;
    }
  }
  new MutationObserver(() => void mountLegionDemographics()).observe(document.documentElement, { childList: true, subtree: true });
  void mountLegionDemographics();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-card-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.legion-card-demographics{min-width:0;margin-left:4px;color:#536860;font-size:10px;font-weight:700;line-height:1.5;white-space:nowrap}.legion-card-title .legion-card-status+.legion-card-demographics{margin-left:4px}@media(max-width:700px){.legion-card-demographics{width:100%;margin:3px 0 0;white-space:normal}}</style>");
  function normalizeLegionGenderTotals() {
    document.querySelectorAll(".legion-card-demographics").forEach((summary) => {
      const match = summary.textContent?.match(/총 (\d+)명 \(남\/여: (\d+)\/(\d+),/);
      if (!match) return;
      const total = Number(match[1]), male = Number(match[2]), female = Number(match[3]), missing = Math.max(0, total - male - female);
      if (!missing) return;
      const normalizedMale = male + (male > 0 || female === 0 ? missing : 0), normalizedFemale = female + (male === 0 && female > 0 ? missing : 0);
      summary.textContent = summary.textContent.replace(`\uB0A8/\uC5EC: ${male}/${female}`, `\uB0A8/\uC5EC: ${normalizedMale}/${normalizedFemale}`);
    });
  }
  new MutationObserver(normalizeLegionGenderTotals).observe(document.documentElement, { childList: true, subtree: true });
  normalizeLegionGenderTotals();
  var curiaDemographicsMounting = false;
  async function mountCuriaDemographics() {
    const cards = [...document.querySelectorAll(".member-legion>div>article.legion-curia")].filter((card) => !card.querySelector("[data-curia-demographics]"));
    if (!cards.length || curiaDemographicsMounting) return;
    curiaDemographicsMounting = true;
    try {
      const items = await api("/api/parishioner/legion/curia-demographics"), byId = new Map(items.map((item) => [item.id, item]));
      cards.forEach((card) => {
        const source = card.querySelector("[data-org]"), title = card.querySelector(".legion-card-title"), item = byId.get(Number(source?.dataset.org));
        if (!title || !item) return;
        const summary = document.createElement("span");
        summary.dataset.curiaDemographics = "1";
        summary.className = "legion-card-demographics curia";
        summary.textContent = `\uC0B0\uD558 \uC058\uB808\uC2DC\uB514\uC6C0 ${item.praesidiumCount}\uAC1C / \uCD1D ${item.totalCount}\uBA85 (\uB0A8/\uC5EC: ${item.maleCount}/${item.femaleCount}, \uC131\uC778: ${item.adultCount}, \uCCAD\uB144: ${item.youthCount}, \uCCAD\uC18C\uB144: ${item.adolescentCount}, \uC18C\uB144: ${item.childCount})`;
        title.append(summary);
      });
    } catch {
    } finally {
      curiaDemographicsMounting = false;
    }
  }
  new MutationObserver(() => void mountCuriaDemographics()).observe(document.documentElement, { childList: true, subtree: true });
  void mountCuriaDemographics();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-card-demographics.curia{color:#45645a}</style>");
  function mountPraesidiumMemberTooltips() {
    document.querySelectorAll("article.legion-praesidium .legion-card-demographics:not([data-member-tooltip-mounted])").forEach((summary) => {
      const match = summary.textContent?.match(/총 \d+명/), card = summary.closest("article.legion-praesidium"), source = card?.querySelector("[data-org]");
      if (!match || !source) return;
      summary.dataset.memberTooltipMounted = "1";
      const text = summary.textContent, trigger = document.createElement("span");
      trigger.className = "legion-member-tooltip-trigger";
      trigger.textContent = match[0];
      summary.textContent = "";
      summary.append(document.createTextNode(text.slice(0, match.index)), trigger, document.createTextNode(text.slice((match.index ?? 0) + match[0].length)));
      let members = null, portal = null;
      const close = () => {
        portal?.remove();
        portal = null;
      }, open = async () => {
        try {
          members ??= await api(`/api/parishioner/legion/organizations/${source.dataset.org}/members`);
          close();
          portal = document.createElement("div");
          portal.className = "legion-member-tooltip-portal";
          portal.innerHTML = `<strong>${match[0]} \uB2E8\uC6D0</strong><div>${members.map((member) => `<span>${esc(member.name)}${member.baptismalName ? ` <em>(${esc(member.baptismalName)})</em>` : ""}</span>`).join("") || "<span>\uB4F1\uB85D\uB41C \uB2E8\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</span>"}</div>`;
          document.body.append(portal);
          const rect = trigger.getBoundingClientRect(), width = portal.offsetWidth, left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2));
          portal.style.left = `${left}px`;
          portal.style.top = `${Math.max(8, rect.bottom + 8)}px`;
        } catch {
          close();
        }
      };
      trigger.addEventListener("mouseenter", () => void open());
      trigger.addEventListener("mouseleave", close);
      trigger.addEventListener("focus", () => void open());
      trigger.addEventListener("blur", close);
      trigger.tabIndex = 0;
    });
  }
  new MutationObserver(() => queueMicrotask(mountPraesidiumMemberTooltips)).observe(document.documentElement, { childList: true, subtree: true });
  queueMicrotask(mountPraesidiumMemberTooltips);
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-tooltip-trigger{border-bottom:1px dotted var(--green);color:var(--green);cursor:help;font-weight:800}.legion-member-tooltip-trigger:focus{outline:none;box-shadow:0 2px 0 rgba(21,149,111,.2)}.legion-member-tooltip-portal{position:fixed;z-index:2147483647;width:max-content;min-width:170px;max-width:min(320px,calc(100vw - 16px));padding:11px 13px;border-radius:9px;background:#173f35;color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.3);pointer-events:none}.legion-member-tooltip-portal>strong{display:block;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.22);font-size:10px}.legion-member-tooltip-portal>div{display:grid;max-height:220px;gap:5px;padding-top:8px;overflow:auto}.legion-member-tooltip-portal span{color:#fff;font-size:10px;line-height:1.5}.legion-member-tooltip-portal em{color:#cfe8df;font-style:normal}</style>");
  function correctLegionMemberTooltipPosition() {
    const portal = document.querySelector(".legion-member-tooltip-portal"), trigger = document.querySelector(".legion-member-tooltip-trigger:hover,.legion-member-tooltip-trigger:focus");
    if (!portal || !trigger) return;
    portal.style.position = "absolute";
    portal.style.right = "auto";
    portal.style.bottom = "auto";
    const rect = trigger.getBoundingClientRect(), width = portal.offsetWidth, height = portal.offsetHeight, viewportBottom = window.scrollY + window.innerHeight, below = window.scrollY + rect.bottom + 8, top = below + height <= viewportBottom - 8 ? below : Math.max(window.scrollY + 8, window.scrollY + rect.top - height - 8), left = Math.max(window.scrollX + 8, Math.min(window.scrollX + window.innerWidth - width - 8, window.scrollX + rect.left + rect.width / 2 - width / 2));
    portal.style.left = `${left}px`;
    portal.style.top = `${top}px`;
  }
  new MutationObserver(() => queueMicrotask(correctLegionMemberTooltipPosition)).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", correctLegionMemberTooltipPosition);
  window.addEventListener("scroll", correctLegionMemberTooltipPosition, { passive: true });
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-tooltip-portal{position:absolute!important}</style>");
  function anchorLegionMemberTooltip() {
    const portal = document.querySelector(".legion-member-tooltip-portal"), trigger = document.querySelector(".legion-member-tooltip-trigger:hover,.legion-member-tooltip-trigger:focus");
    if (!portal || !trigger) return;
    if (portal.parentElement !== trigger) trigger.append(portal);
    portal.style.position = "absolute";
    portal.style.left = "50%";
    portal.style.top = "calc(100% + 8px)";
    portal.style.right = "auto";
    portal.style.bottom = "auto";
    portal.style.transform = "translateX(-50%)";
  }
  new MutationObserver(() => queueMicrotask(anchorLegionMemberTooltip)).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", anchorLegionMemberTooltip);
  window.addEventListener("scroll", anchorLegionMemberTooltip, { passive: true });
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-tooltip-trigger{position:relative;display:inline-block}.legion-member-tooltip-trigger>.legion-member-tooltip-portal{position:absolute!important;top:calc(100% + 8px)!important;left:50%!important;right:auto!important;bottom:auto!important;margin:0!important;transform:translateX(-50%)!important}</style>");
  function mountCuriaChildrenTooltips() {
    document.querySelectorAll("article.legion-curia .legion-card-demographics:not([data-children-tooltip-mounted])").forEach((summary) => {
      const match = summary.textContent?.match(/산하 쁘레시디움 \d+개/), card = summary.closest("article.legion-curia"), source = card?.querySelector("[data-org]");
      if (!match || !source) return;
      summary.dataset.childrenTooltipMounted = "1";
      const text = summary.textContent, trigger = document.createElement("span");
      trigger.className = "legion-children-tooltip-trigger";
      trigger.tabIndex = 0;
      trigger.textContent = match[0];
      summary.textContent = "";
      summary.append(trigger, document.createTextNode(text.slice((match.index ?? 0) + match[0].length)));
      let children = null, tooltip = null;
      const close = () => {
        tooltip?.remove();
        tooltip = null;
      }, open = async () => {
        try {
          children ??= await api(`/api/parishioner/legion/curias/${source.dataset.org}/children`);
          close();
          tooltip = document.createElement("div");
          tooltip.className = "legion-children-tooltip";
          tooltip.innerHTML = `<strong>${match[0]}</strong><div>${children.map((child) => `<span>${esc(child.name)}</span>`).join("") || "<span>\uB4F1\uB85D\uB41C \uC0B0\uD558 \uC058\uB808\uC2DC\uB514\uC6C0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</span>"}</div>`;
          trigger.append(tooltip);
        } catch {
          close();
        }
      };
      trigger.addEventListener("mouseenter", () => void open());
      trigger.addEventListener("mouseleave", close);
      trigger.addEventListener("focus", () => void open());
      trigger.addEventListener("blur", close);
    });
  }
  new MutationObserver(() => queueMicrotask(mountCuriaChildrenTooltips)).observe(document.documentElement, { childList: true, subtree: true });
  queueMicrotask(mountCuriaChildrenTooltips);
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-children-tooltip-trigger{position:relative;display:inline-block;border-bottom:1px dotted var(--green);color:var(--green);cursor:help;font-weight:800}.legion-children-tooltip-trigger:focus{outline:none;box-shadow:0 2px 0 rgba(21,149,111,.2)}.legion-children-tooltip{position:absolute;z-index:2147483647;top:calc(100% + 8px);left:50%;width:max-content;min-width:190px;max-width:min(320px,calc(100vw - 16px));padding:11px 13px;border-radius:9px;background:#173f35;color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.3);transform:translateX(-50%);pointer-events:none}.legion-children-tooltip>strong{display:block;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.22);font-size:10px}.legion-children-tooltip>div{display:grid;max-height:220px;gap:5px;padding-top:8px;overflow:auto}.legion-children-tooltip span{color:#fff;font-size:10px;line-height:1.5}</style>");
  async function openLegionMembersWithApplications(id, name) {
    await openLegionMembers(id, name);
    const modal2 = [...document.querySelectorAll(".legion-community-modal")].at(-1), body = modal2?.querySelector(".member-modal-body"), summary = body?.querySelector(".legion-member-summary");
    if (!modal2 || !body || !summary) return;
    const toolbar = document.createElement("div");
    toolbar.className = "legion-member-toolbar";
    toolbar.append(summary);
    body.prepend(toolbar);
    try {
      await api(`/api/parishioner/legion/organizations/${id}/applications`);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "green-outline";
      button.textContent = "\uAC00\uC785\uC694\uCCAD";
      button.onclick = () => void openLegionApplications(id, name);
      toolbar.append(button);
    } catch (error) {
      if (!error.message.includes("\uB2E8\uC7A5\uB9CC")) {
        const notice = document.createElement("p");
        notice.className = "legion-empty error";
        notice.textContent = error.message;
        body.append(notice);
      }
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-legion-members]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const card = button.closest("article"), name = card?.querySelector(".legion-card-title h3")?.textContent?.trim() ?? "\uC058\uB808\uC2DC\uB514\uC6C0";
    void openLegionMembersWithApplications(Number(button.dataset.legionMembers), name);
  }, true);
  function removeCardApplicationButtons() {
    document.querySelectorAll("[data-community-applications]").forEach((button) => button.remove());
  }
  new MutationObserver(removeCardApplicationButtons).observe(document.documentElement, { childList: true, subtree: true });
  removeCardApplicationButtons();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-applications{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}.legion-member-applications>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.legion-member-applications>header h4{margin:0}.legion-member-applications>header span{color:var(--muted);font-size:9px}.legion-member-applications .legion-application-list>article{display:flex}.legion-member-applications [data-error]{color:#c43d49}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-toolbar{display:flex;align-items:center;justify-content:flex-start;gap:9px;margin-bottom:12px}.legion-member-toolbar .legion-member-summary{margin:0!important;padding:7px 10px;border-radius:8px;background:#edf6f2;color:#536860;text-align:left!important}.legion-member-toolbar .legion-member-summary b{color:var(--green)}.legion-member-toolbar button{display:inline-flex;width:auto;min-width:86px;height:34px;align-items:center;justify-content:center;padding:0 13px;border:1px solid var(--green);border-radius:8px;background:#fff;color:var(--green);font-weight:700;white-space:nowrap}.legion-member-toolbar button:hover{background:#edf8f4}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-toolbar{width:100%;justify-content:space-between!important}.legion-member-toolbar button{margin-left:auto}</style>");
  async function openLegionPostsCombined(id, name, view = "notice") {
    await openLegionViewer(id, name, view);
    const modal2 = [...document.querySelectorAll(".legion-content-modal")].at(-1), box = modal2?.querySelector(".member-modal-box");
    if (!modal2 || !box) return;
    const heading = box.querySelector(":scope>h3");
    if (heading) heading.textContent = `${name} \xB7 \uACF5\uC9C0/\uAC8C\uC2DC`;
    const tabs = document.createElement("nav");
    tabs.className = "legion-post-combined-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "\uACF5\uC9C0 \uBC0F \uAC8C\uC2DC\uD310");
    tabs.innerHTML = `<button class="${view === "notice" ? "active" : ""}" data-combined-view="notice" type="button" role="tab" aria-selected="${view === "notice"}">\uACF5\uC9C0\uC0AC\uD56D</button><button class="${view === "board" ? "active" : ""}" data-combined-view="board" type="button" role="tab" aria-selected="${view === "board"}">\uAC8C\uC2DC\uD310</button>`;
    heading?.nextElementSibling ? box.insertBefore(tabs, heading.nextElementSibling) : box.prepend(tabs);
    tabs.querySelectorAll("[data-combined-view]").forEach((button) => button.onclick = () => {
      const next = button.dataset.combinedView;
      if (next === view) return;
      modal2.remove();
      void openLegionPostsCombined(id, name, next);
    });
  }
  function mergeLegionPostButtons() {
    document.querySelectorAll("article .legion-card-actions").forEach((actions) => {
      const notice = actions.querySelector('[data-legion-view="notice"]'), board = actions.querySelector('[data-legion-view="board"]');
      if (!notice || !board || actions.querySelector("[data-legion-posts-combined]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.legionPostsCombined = notice.dataset.org;
      button.textContent = "\uACF5\uC9C0/\uAC8C\uC2DC";
      button.onclick = () => void openLegionPostsCombined(Number(notice.dataset.org), notice.dataset.name ?? "\uC870\uC9C1");
      actions.insertBefore(button, notice);
      notice.remove();
      board.remove();
    });
  }
  new MutationObserver(mergeLegionPostButtons).observe(document.documentElement, { childList: true, subtree: true });
  mergeLegionPostButtons();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-content-modal>.member-modal-box>.legion-post-combined-tabs{display:flex;gap:6px;margin:0;padding:12px 18px;border-bottom:1px solid var(--line);background:#f8fbfa}.legion-post-combined-tabs button{min-width:92px;height:36px;padding:0 15px;border:1px solid var(--green);border-radius:8px;background:#fff;color:var(--green);font-weight:700}.legion-post-combined-tabs button.active{background:var(--green);color:#fff}.legion-post-combined-tabs button:hover:not(.active){background:#edf8f4}</style>");
  function mountPraesidiumStoryButtons() {
    document.querySelectorAll(".legion-praesidium .legion-card-actions").forEach((actions) => {
      if (actions.querySelector("[data-legion-story]")) return;
      const source = actions.querySelector("[data-org],[data-legion-posts-combined]");
      if (!source) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.legionStory = source.dataset.org ?? source.dataset.legionPostsCombined;
      button.textContent = "\uC774\uC57C\uAE30";
      button.onclick = () => void openLegionViewer(Number(button.dataset.legionStory), source.dataset.name ?? source.closest("article")?.querySelector("h3")?.textContent?.trim() ?? "\uC058\uB808\uC2DC\uB514\uC6C0", "story");
      const edit = actions.querySelector("[data-edit-org]");
      if (edit) actions.insertBefore(button, edit);
      else actions.append(button);
    });
  }
  new MutationObserver(mountPraesidiumStoryButtons).observe(document.documentElement, { childList: true, subtree: true });
  mountPraesidiumStoryButtons();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-story-emojis{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:9px;background:#f7faf9}.legion-story-emojis>span{margin-right:4px;color:var(--muted);font-size:10px;font-weight:700}.legion-story-emojis button{width:34px;height:34px;padding:0;border:1px solid transparent;border-radius:7px;background:#fff;font-size:18px;cursor:pointer}.legion-story-emojis button:hover{border-color:var(--green);background:#edf8f4}</style>");
  async function openPersonalGraceDiary(prefill = {}) {
    document.querySelector(".personal-grace-diary-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal legion-content-modal personal-grace-diary-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uC2E0\uC559\uD65C\uB3D9 \xB7 \uC740\uCD1D\uC77C\uAE30</h3><div class="legion-content-body"><div class="legion-post-list-head"><div><h4>\uB098\uC758 \uC740\uCD1D\uC77C\uAE30</h4><small>\uB098\uB9CC \uD655\uC778\uD560 \uC218 \uC788\uB294 \uAC1C\uC778 \uC2E0\uC559 \uAE30\uB85D\uC785\uB2C8\uB2E4.</small></div><button class="green-button" data-open-post-form type="button">\uC77C\uAE30 \uB4F1\uB85D</button></div><form class="legion-post-form" hidden><h4>\uC77C\uAE30 \uC791\uC131</h4><label><span>* \uC81C\uBAA9</span><input name="title" maxlength="300" required placeholder="\uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></label><label><span>* \uB0B4\uC6A9</span><textarea name="content" maxlength="60000" rows="6" required placeholder="\uC624\uB298 \uBC1B\uC740 \uC740\uCD1D\uC744 \uAE30\uB85D\uD574 \uC8FC\uC138\uC694"></textarea></label><div class="legion-story-emojis" aria-label="\uC774\uBAA8\uD2F0\uCF58 \uC120\uD0DD"><span>\uC774\uBAA8\uD2F0\uCF58</span>${["\u{1F600}", "\u{1F60A}", "\u{1F970}", "\u{1F64F}", "\u{1F44F}", "\u2764\uFE0F", "\u{1F44D}", "\u{1F33F}", "\u2728"].map((value) => `<button type="button">${value}</button>`).join("")}</div><p data-post-error></p><div class="legion-post-form-actions"><button data-cancel-post type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>${prefill.sourceType === "mass" ? "\uC77C\uAE30\uB4F1\uB85D" : "\uC77C\uAE30 \uB4F1\uB85D"}</button></div></form><div data-grace-diary-list><p class="legion-content-loading">\uBD88\uB7EC\uC624\uB294 \uC911...</p></div></div><footer><button data-close type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    const form = layer.querySelector(".legion-post-form"), openButton = layer.querySelector("[data-open-post-form]"), submit2 = form.querySelector('button[type="submit"]'), titleInput = form.elements.namedItem("title"), contentInput = form.elements.namedItem("content"), error = form.querySelector("[data-post-error]"), list = layer.querySelector("[data-grace-diary-list]");
    const sync = () => submit2.disabled = !titleInput.value.trim() || !contentInput.value.trim();
    const closeForm = () => {
      form.hidden = true;
      openButton.hidden = false;
      form.reset();
      error.textContent = "";
      sync();
    };
    const openForm = () => {
      openButton.hidden = true;
      form.hidden = false;
      titleInput.value = prefill.title ?? "";
      contentInput.value = prefill.content ?? "";
      sync();
      (prefill.content ? contentInput : titleInput).focus();
    };
    const load2 = async () => {
      try {
        const diaries = await api("/api/parishioner/grace-diaries");
        list.innerHTML = diaries.length ? `<div class="legion-content-list personal-grace-diary-list">${diaries.map((item) => `<article><header><strong>${esc(item.title)}</strong><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></header>${item.sourceType === "mass" ? `<small>\uBBF8\uC0AC\uC5D0\uC11C \uAE30\uB85D${item.sourceDate ? ` \xB7 ${esc(item.sourceDate)}` : ""}</small>` : ""}<p>${esc(item.content)}</p></article>`).join("")}</div>` : '<p class="legion-empty">\uC544\uC9C1 \uC791\uC131\uD55C \uC740\uCD1D\uC77C\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      } catch (reason) {
        list.innerHTML = `<p class="legion-empty error">${esc(reason.message)}</p>`;
      }
    };
    layer.querySelector("[data-close]").onclick = () => layer.remove();
    layer.querySelector("[data-cancel-post]").onclick = closeForm;
    openButton.onclick = openForm;
    form.addEventListener("input", sync);
    form.querySelectorAll(".legion-story-emojis button").forEach((button) => button.onclick = () => {
      contentInput.setRangeText(button.textContent ?? "", contentInput.selectionStart, contentInput.selectionEnd, "end");
      contentInput.focus();
      sync();
    });
    form.onsubmit = async (event) => {
      event.preventDefault();
      sync();
      if (submit2.disabled) return;
      submit2.disabled = true;
      error.textContent = "";
      try {
        await api("/api/parishioner/grace-diaries", { method: "POST", body: JSON.stringify({ title: titleInput.value.trim(), content: contentInput.value.trim(), sourceType: prefill.sourceType ?? "direct", sourceDate: prefill.sourceDate ?? null, sourceScheduleId: prefill.sourceScheduleId ?? null }) });
        closeForm();
        await load2();
      } catch (reason) {
        error.textContent = reason.message;
        sync();
      }
    };
    await load2();
    if (prefill.title || prefill.content) openForm();
  }
  var legionActivityGroups = [
    { name: "\uC785\uAD50\uAD8C\uBA74", icon: "\uFF0B", items: ["\uC678\uC778 \uC785\uAD50 \uAD8C\uBA74 (\uBA85)", "\uAD50\uB9AC \uC911\uB2E8\uC790 \uC7AC\uAD8C\uBA74 (\uBA85)", "\uB0C9\uB2F4\uC790 \uC7AC\uAD8C\uBA74 (\uBA85)", "\uC18C\uC678 \uC9C0\uC5ED \uC120\uAD50 \uD65C\uB3D9 (\uD68C)"] },
    { name: "\uC608\uBE44\uC2E0\uC790 \uB3CC\uBD04", icon: "\u{1F33F}", items: ["\uC608\uBE44\uC2E0\uC790 \uAC00\uC815 \uBC29\uBB38 (\uD68C)", "\uAD50\uB9AC \uACA9\uB824 \uBC29\uBB38 (\uD68C)", "\uC138\uB840 \uC900\uBE44 \uC9C0\uC6D0 (\uD68C)", "\uC601\uC138 \uD6C4 \uC0AC\uD6C4 \uAD00\uB9AC (\uD68C)"] },
    { name: "\uAD50\uC6B0 \uB3CC\uBD04", icon: "\u{1F91D}", items: ["\uBCD1\uC790\xB7\uD658\uC790 \uBC29\uBB38 (\uD68C)", "\uB3C5\uAC70 \uB178\uC778 \uBC29\uBB38 (\uD68C)", "\uC7A5\uC560\uC778 \uB3CC\uBD04 (\uD68C)", "\uC77C\uBC18 \uAC00\uC815 \uBC29\uBB38 (\uD68C)", "\uC694\uC591\uC6D0\xB7\uC2DC\uC124 \uBC29\uBB38 (\uD68C)"] },
    { name: "\uC5B4\uB824\uC6C0\uACAA\uB294\uBD84\uB3CC\uBD04", icon: "\u{1F499}", items: ["\uACBD\uC81C\uC801 \uC5B4\uB824\uC6C0 \uC0C1\uB2F4\xB7\uC9C0\uC6D0 (\uD68C)", "\uAC00\uC815 \uBD88\uD654\xB7\uAC08\uB4F1 \uC0C1\uB2F4 (\uD68C)", "\uC0AC\uD68C\uBCF5\uC9C0 \uC5F0\uACC4 (\uD68C)", "\uC704\uAE30 \uAC00\uC815 \uB3CC\uBD04 (\uD68C)"] },
    { name: "\uB808\uC9C0\uC624 \uD655\uC7A5", icon: "\u2B50", items: ["\uBCF4\uC870\uB2E8\uC6D0 \uBAA8\uC9D1 (\uBA85)", "\uB808\uC9C0\uC624 \uD64D\uBCF4 \uD65C\uB3D9 (\uD68C)", "\uC0C8 \uC058\uB808\uC2DC\uB514\uC6C0 \uC124\uB9BD \uC9C0\uC6D0 (\uD68C)"] },
    { name: "\uBCF8\uB2F9 \uD611\uC870", icon: "\u26EA", items: ["\uBCF8\uB2F9 \uD589\uC0AC \uD611\uC870 (\uD68C)", "\uC804\uB840\xB7\uC81C\uB2E8 \uBD09\uC0AC (\uD68C)", "\uC131\uB2F9 \uCCAD\uC18C\xB7\uAD00\uB9AC \uBD09\uC0AC (\uD68C)", "\uBCF8\uB2F9 \uD504\uB85C\uADF8\uB7A8 \uBCF4\uC870 (\uD68C)", "\uC8FC\uCC28 \uBD09\uC0AC (\uD68C)"] },
    { name: "\uD2B9\uBCC4 \uD65C\uB3D9", icon: "\u{1F31F}", items: ["\uC131\uC9C0\uC21C\uB840 \uB3D9\uBC18 (\uD68C)", "\uD53C\uC815 \uCC38\uC5EC \uAD8C\uC720 (\uBA85)", "\uD2B9\uBCC4 \uBD09\uC0AC \uD65C\uB3D9 (\uD68C)", "\uC790\uC120 \uD589\uC0AC \uCC38\uC5EC (\uD68C)", "\uCC28\uB7C9 \uBD09\uC0AC (\uD68C)"] },
    { name: "\uCCAD\uC18C\uB144\uBD84\uACFC \uD65C\uB3D9", icon: "\u{1F3AF}", items: ["\uCCAD\uC18C\uB144 \uC2E0\uC559 \uC9C0\uB3C4 (\uD68C)", "\uC8FC\uC77C\uD559\uAD50 \uD611\uC870 (\uD68C)", "\uCCAD\uB144 \uB2E8\uCCB4 \uC5F0\uACC4 (\uD68C)"] },
    { name: "\uC18C\uACF5\uB3D9\uCCB4", icon: "\u{1F465}", items: ["\uC18C\uACF5\uB3D9\uCCB4 \uBAA8\uC784 \uCC38\uC5EC\xB7\uC9C0\uC6D0 (\uD68C)", "\uC18C\uACF5\uB3D9\uCCB4 \uB9AC\uB354 \uC591\uC131 \uC9C0\uC6D0 (\uD68C)"] },
    { name: "\uC0AC\uD68C\uBCF5\uC9C0", icon: "\u{1F497}", items: ["\uBCF5\uC9C0\uC2DC\uC124 \uBD09\uC0AC (\uD68C)", "\uBB34\uB8CC\uAE09\uC2DD \uBD09\uC0AC (\uD68C)", "\uB178\uC219\uC790\xB7\uCDE8\uC57D\uACC4\uCE35 \uC9C0\uC6D0 (\uD68C)", "\uC9C0\uC5ED\uC0AC\uD68C \uD658\uACBD \uBD09\uC0AC (\uD68C)"] },
    { name: "\uAE30\uD0C0 \uD65C\uB3D9", icon: "\u{1F4DD}", items: ["\uD1B5\uC2E0 \uC0AC\uB3C4\uC9C1 (\uD3B8\uC9C0\xB7SNS) (\uD68C)", "\uBB35\uC8FC\uAE30\uB3C4 \uBD09\uD5CC (\uB2E8\uC6D0\uC678) (\uD68C)", "\uAE30\uD0C0 \uC0AC\uB3C4\uC9C1 \uD65C\uB3D9 (\uD68C)", "\uC120\uD589 (\uD68C)"] },
    { name: "\uC804\uB3C4 \uCD08\uB300", icon: "\u{1F347}", items: ["\uAE30\uB3C4\uB4DC\uB9BC \uCD08\uB300 \uBC1C\uC1A1 (\uD68C)"] }
  ];
  async function openActivityReportModal(id, name) {
    const layer = document.createElement("div");
    layer.className = "member-modal legion-content-modal legion-activity-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${esc(name)} \xB7 \uC2E0\uC559\uD65C\uB3D9</h3><nav class="legion-post-combined-tabs legion-faith-tabs"><button data-switch-faith="grace_diary" type="button">\uC740\uCD1D\uC77C\uAE30</button><button class="active" type="button">\uD65C\uB3D9\uBCF4\uACE0</button></nav><div class="legion-content-body"><form class="legion-activity-form"><div class="legion-activity-date"><label>\uD65C\uB3D9\uC77C\uC790<input name="activityDate" type="date" max="${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}" value="${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}" required></label><button class="green-button" type="submit" disabled>\uD65C\uB3D9\uBCF4\uACE0 \uB4F1\uB85D</button></div><nav class="legion-activity-tabs" role="tablist">${legionActivityGroups.map((group, index) => `<button class="${index === 0 ? "active" : ""}" data-activity-tab="${index}" type="button">${group.icon} ${esc(group.name)}</button>`).join("")}</nav><div class="legion-activity-groups">${legionActivityGroups.map((group, index) => `<section data-activity-panel="${index}" ${index ? "hidden" : ""}><header><b>${group.icon} ${esc(group.name)}</b></header>${group.items.map((item, itemIndex) => `<div class="legion-activity-row"><span>${esc(item)}</span><div><button data-count-step="-1" type="button" aria-label="\uAC10\uC18C">\u2212</button><input name="count_${index}_${itemIndex}" value="0" inputmode="numeric" readonly><button data-count-step="1" type="button" aria-label="\uC99D\uAC00">\uFF0B</button></div></div>`).join("")}</section>`).join("")}</div><label class="legion-activity-other"><span>\uD56D\uBAA9\uC73C\uB85C \uAD6C\uBD84\uB418\uC9C0 \uC54A\uC740 \uD65C\uB3D9 \uB0B4\uC5ED</span><textarea name="otherActivity" rows="4" maxlength="5000" placeholder="\uC704 \uD56D\uBAA9\uC5D0 \uC5C6\uB294 \uD65C\uB3D9 \uB0B4\uC6A9\uC744 \uC790\uC720\uB86D\uAC8C \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea></label><p data-activity-error></p></form><section class="legion-activity-history"><h4>\uB4F1\uB85D\uB41C \uD65C\uB3D9\uBCF4\uACE0</h4><div data-activity-history><p class="legion-content-loading">\uBD88\uB7EC\uC624\uB294 \uC911...</p></div></section></div><footer><button data-close type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    const form = layer.querySelector(".legion-activity-form"), submit2 = form.querySelector('button[type="submit"]'), other = form.elements.namedItem("otherActivity"), counts = [...form.querySelectorAll('[name^="count_"]')], sync = () => submit2.disabled = !other.value.trim() && !counts.some((input) => Number(input.value) > 0);
    layer.querySelector("[data-close]").onclick = () => layer.remove();
    layer.querySelector("[data-switch-faith]").onclick = () => {
      layer.remove();
      void openFaithActivity(id, name, "grace_diary");
    };
    layer.querySelectorAll("[data-activity-tab]").forEach((button) => button.onclick = () => {
      layer.querySelectorAll("[data-activity-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
      layer.querySelectorAll("[data-activity-panel]").forEach((panel2) => panel2.hidden = panel2.dataset.activityPanel !== button.dataset.activityTab);
    });
    layer.querySelectorAll("[data-count-step]").forEach((button) => button.onclick = () => {
      const input = button.parentElement.querySelector("input");
      input.value = String(Math.max(0, Number(input.value) + Number(button.dataset.countStep)));
      sync();
    });
    other.oninput = sync;
    const load2 = async () => {
      const posts = await api(`/api/parishioner/legion/organizations/${id}/posts?type=activity_report`), target = layer.querySelector("[data-activity-history]");
      target.innerHTML = posts.length ? posts.map((post) => {
        let summary = post.content;
        try {
          const parsed = JSON.parse(post.content);
          const total = Object.values(parsed.counts).reduce((sum, value) => sum + Number(value), 0);
          summary = `\uCD1D \uD65C\uB3D9 ${total}\uD68C${parsed.other ? ` \xB7 ${parsed.other}` : ""}`;
        } catch {
        }
        return `<article><div><strong>${esc(post.title)}</strong><small>${new Date(post.createdAt).toLocaleString("ko-KR")}</small></div><p>${esc(summary)}</p></article>`;
      }).join("") : '<p class="legion-empty">\uB4F1\uB85D\uB41C \uD65C\uB3D9\uBCF4\uACE0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    };
    form.onsubmit = async (event) => {
      event.preventDefault();
      sync();
      if (submit2.disabled) return;
      const password = await legionPostPasswordConfirm("\uD65C\uB3D9\uBCF4\uACE0\uB97C \uB4F1\uB85D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", "\uD65C\uB3D9\uBCF4\uACE0 \uB4F1\uB85D");
      if (!password) return;
      const values = Object.fromEntries(counts.filter((input) => Number(input.value) > 0).map((input) => [input.name, Number(input.value)])), date = form.elements.namedItem("activityDate").value, error = form.querySelector("[data-activity-error]");
      submit2.disabled = true;
      try {
        await api(`/api/parishioner/legion/organizations/${id}/posts`, { method: "POST", body: JSON.stringify({ postType: "activity_report", title: `${date} \uD65C\uB3D9\uBCF4\uACE0`, content: JSON.stringify({ counts: values, other: other.value.trim() }), password }) });
        form.reset();
        counts.forEach((input) => input.value = "0");
        sync();
        await load2();
      } catch (reason) {
        error.textContent = reason.message;
        sync();
      }
    };
    sync();
    void load2();
  }
  async function openFaithActivity(id, name, view = "grace_diary") {
    if (view === "activity_report") return openActivityReportModal(id, name);
    await openLegionViewer(id, name, view);
    const modal2 = [...document.querySelectorAll(".legion-content-modal")].at(-1), box = modal2?.querySelector(".member-modal-box");
    if (!modal2 || !box) return;
    const heading = box.querySelector(":scope>h3");
    if (heading) heading.textContent = `${name} \xB7 \uC2E0\uC559\uD65C\uB3D9`;
    const tabs = document.createElement("nav");
    tabs.className = "legion-post-combined-tabs legion-faith-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "\uC2E0\uC559\uD65C\uB3D9");
    tabs.innerHTML = `<button class="${view === "grace_diary" ? "active" : ""}" data-faith-view="grace_diary" type="button" role="tab" aria-selected="${view === "grace_diary"}">\uC740\uCD1D\uC77C\uAE30</button><button class="${view === "activity_report" ? "active" : ""}" data-faith-view="activity_report" type="button" role="tab" aria-selected="${view === "activity_report"}">\uD65C\uB3D9\uBCF4\uACE0</button>`;
    heading?.nextElementSibling ? box.insertBefore(tabs, heading.nextElementSibling) : box.prepend(tabs);
    tabs.querySelectorAll("[data-faith-view]").forEach((button) => button.onclick = () => {
      const next = button.dataset.faithView;
      if (next === view) return;
      modal2.remove();
      void openFaithActivity(id, name, next);
    });
  }
  function removePraesidiumFaithButtons() {
    document.querySelectorAll(".legion-praesidium [data-legion-faith]").forEach((button) => button.remove());
  }
  async function openFaithActivityFromMainMenu(view) {
    if (view === "grace_diary") return openPersonalGraceDiary();
    try {
      const organizations = await api("/api/parishioner/legion/organizations"), praesidium = organizations.find((item) => item.organizationType === "praesidium" && item.role !== "visitor");
      if (!praesidium) throw new Error("\uD65C\uB3D9\uBCF4\uACE0\uB97C \uB4F1\uB85D\uD560 \uC18C\uC18D \uC058\uB808\uC2DC\uB514\uC6C0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
      void openFaithActivity(praesidium.id, praesidium.name, view);
    } catch (error) {
      showLegionResult(error.message, false);
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".legion-activity-modal [data-switch-faith]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.closest(".legion-activity-modal")?.remove();
    void openPersonalGraceDiary();
  }, true);
  document.addEventListener("member:personal-grace-diary", (event) => {
    const detail = event.detail;
    void openPersonalGraceDiary({ title: `${detail.scheduleDate} ${detail.title}`, content: `${detail.scheduleType ? `${detail.scheduleType} ` : ""}\uBBF8\uC0AC\uB97C \uD1B5\uD574 \uBC1B\uC740 \uC740\uCD1D\uC744 \uAE30\uB85D\uD569\uB2C8\uB2E4.

`, sourceType: "mass", sourceDate: detail.scheduleDate, sourceScheduleId: detail.scheduleId });
  });
  document.addEventListener("member:mass-grace-diary", (event) => {
    const detail = event.detail;
    void (async () => {
      try {
        const organizations = await api("/api/parishioner/legion/organizations"), praesidium = organizations.find((item) => item.organizationType === "praesidium" && item.role !== "visitor");
        if (!praesidium) throw new Error("\uC740\uCD1D\uC77C\uAE30\uB97C \uAE30\uB85D\uD560 \uC18C\uC18D \uC058\uB808\uC2DC\uB514\uC6C0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
        await openFaithActivity(praesidium.id, praesidium.name, "grace_diary");
        const modal2 = [...document.querySelectorAll(".legion-content-modal")].at(-1), open = modal2?.querySelector("[data-open-post-form]");
        open?.click();
        const form = modal2?.querySelector(".legion-post-form"), title = form?.elements.namedItem("title"), content = form?.elements.namedItem("content");
        if (title) title.value = `${detail.scheduleDate} ${detail.title}`;
        if (content) {
          content.value = `${detail.scheduleType ? `${detail.scheduleType} ` : ""}\uBBF8\uC0AC\uB97C \uD1B5\uD574 \uBC1B\uC740 \uC740\uCD1D\uC744 \uAE30\uB85D\uD569\uB2C8\uB2E4.

`;
          content.focus();
          content.setSelectionRange(content.value.length, content.value.length);
        }
        form?.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (error) {
        showLegionResult(error.message, false);
      }
    })();
  });
  document.addEventListener("member:mass-grace-diary", () => {
    document.body.dataset.massGraceDiary = "1";
  });
  new MutationObserver(() => {
    if (document.body.dataset.massGraceDiary !== "1") return;
    const modal2 = [...document.querySelectorAll(".legion-content-modal")].at(-1);
    if (!modal2?.querySelector(".legion-post-form")) return;
    modal2.dataset.massGraceDiary = "1";
    delete document.body.dataset.massGraceDiary;
  }).observe(document.documentElement, { childList: true, subtree: true });
  function mountMainFaithActivityMenu() {
    removePraesidiumFaithButtons();
    const nav = document.querySelector("#member-mobile-menu>nav");
    if (!nav || nav.querySelector(".member-faith-activity-menu")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "member-parish-information-menu member-faith-activity-menu";
    wrapper.innerHTML = '<button class="member-parish-information-toggle" type="button" aria-expanded="false">\uC2E0\uC559\uD65C\uB3D9 <span>\u2304</span></button><div class="member-parish-information-submenu" hidden><button type="button" data-main-faith="grace_diary">\uC740\uCD1D\uC77C\uAE30</button><button type="button" data-main-faith="activity_report">\uD65C\uB3D9\uBCF4\uACE0</button></div>';
    const sharing = nav.querySelector('[data-member-target=".member-sharing"]');
    if (sharing) sharing.insertAdjacentElement("beforebegin", wrapper);
    else nav.append(wrapper);
    const toggle = wrapper.querySelector(".member-parish-information-toggle"), submenu = wrapper.querySelector(".member-parish-information-submenu");
    toggle.onclick = () => {
      const open = submenu.hidden;
      submenu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    };
    wrapper.querySelectorAll("[data-main-faith]").forEach((button) => button.onclick = () => {
      document.body.classList.remove("member-menu-open");
      const menu2 = document.querySelector("#member-mobile-menu"), backdrop = document.querySelector("#member-menu-backdrop"), menuButton = document.querySelector("#member-menu-button");
      menu2?.classList.remove("open");
      menu2?.setAttribute("aria-hidden", "true");
      if (backdrop) backdrop.hidden = true;
      menuButton?.setAttribute("aria-expanded", "false");
      void openFaithActivityFromMainMenu(button.dataset.mainFaith);
    });
  }
  new MutationObserver(mountMainFaithActivityMenu).observe(document.documentElement, { childList: true, subtree: true });
  mountMainFaithActivityMenu();
  document.head.insertAdjacentHTML("beforeend", '<style>.member-mobile-menu .member-faith-activity-menu>.member-parish-information-toggle:before{content:"\u2020"}.member-mobile-menu .member-faith-activity-menu .member-parish-information-submenu button:nth-child(1):before{content:"01"}.member-mobile-menu .member-faith-activity-menu .member-parish-information-submenu button:nth-child(2):before{content:"02"}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-activity-modal .member-modal-box{width:min(96vw,900px)}.legion-activity-date{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:15px}.legion-activity-date label{display:grid;gap:6px;font-weight:700}.legion-activity-date input{height:40px;padding:0 10px;border:1px solid var(--line);border-radius:8px}.legion-activity-date button{height:40px;padding:0 16px}.legion-activity-tabs{display:flex;gap:6px;margin-bottom:12px;padding-bottom:8px;overflow-x:auto}.legion-activity-tabs button{flex:none;height:37px;padding:0 12px;border:1px solid #bad3ca;border-radius:18px;background:#fff;color:#45645a;font-weight:700}.legion-activity-tabs button.active{border-color:var(--green);background:var(--green);color:#fff}.legion-activity-groups>section{overflow:hidden;border:1px solid #8ebaaa;border-radius:11px}.legion-activity-groups>section>header{padding:13px 15px;background:#edf8f4;color:#285c4b}.legion-activity-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 13px;border-top:1px solid #c9ded7}.legion-activity-row>span{font-size:10px}.legion-activity-row>div{display:grid;grid-template-columns:32px 42px 32px;overflow:hidden;border:1px solid #d8dfdc;border-radius:20px;background:#f5f6f6}.legion-activity-row button{height:32px;border:0;background:transparent;color:#75857f;font-size:17px;font-weight:800}.legion-activity-row input{width:42px;border:0;background:transparent;text-align:center}.legion-activity-other{display:grid;gap:7px;margin-top:15px;text-align:left}.legion-activity-other>span{font-weight:700}.legion-activity-other textarea{padding:11px;border:1px solid var(--line);border-radius:9px;resize:vertical}.legion-activity-form [data-activity-error]{color:#c43d49}.legion-activity-history{margin-top:22px;padding-top:17px;border-top:1px solid var(--line)}.legion-activity-history>h4{margin:0 0 10px}.legion-activity-history article{display:grid;gap:6px;padding:12px;border-bottom:1px solid var(--line)}.legion-activity-history article>div{display:flex;justify-content:space-between;gap:12px}.legion-activity-history article small{color:var(--muted)}.legion-activity-history article p{margin:0;white-space:pre-wrap;text-align:left}@media(max-width:600px){.legion-activity-date{align-items:stretch;flex-direction:column}.legion-activity-row{align-items:flex-start;flex-direction:column}.legion-activity-row>div{align-self:flex-end}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-summary{margin-bottom:12px;color:var(--muted);text-align:right}.legion-member-summary b{color:var(--green)}.legion-member-list{display:grid;gap:9px}.legion-member-list article{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:5px 12px;padding:13px 15px;border:1px solid var(--line);border-radius:10px}.legion-member-list article>div{display:flex;align-items:center;gap:7px}.legion-member-list article>div strong{font-size:11px}.legion-member-list article>div span{color:var(--green);font-size:10px}.legion-member-list article>b{grid-row:1/3;grid-column:2;padding:5px 9px;border-radius:12px;background:var(--soft);color:var(--green);font-size:9px}.legion-member-list article>b.role-president{background:#e1f2eb;color:#126e51}.legion-member-list time{grid-column:1;color:var(--muted);font-size:9px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-list[data-grid-mounted]{display:block;min-width:560px;overflow:hidden;border:1px solid var(--line);border-radius:10px}.legion-member-grid-head,.legion-member-grid-row{display:grid;grid-template-columns:1.15fr 1.15fr .8fr 1fr;align-items:center}.legion-member-grid-head{background:#edf6f2;color:#31564a}.legion-member-grid-head>b,.legion-member-grid-row>*{margin:0;padding:11px 13px;border-right:1px solid var(--line);text-align:left}.legion-member-grid-head>b:last-child,.legion-member-grid-row>*:last-child{border-right:0}.legion-member-grid-row{border-top:1px solid var(--line);background:#fff}.legion-member-grid-row:nth-child(odd){background:#f9fbfa}.legion-member-grid-row>span:nth-child(2){color:var(--green)}.legion-member-grid-row>b{color:#31564a}.legion-member-grid-row>time{color:var(--muted);font-size:9px}.legion-community-modal .member-modal-body:has(.legion-member-list){overflow:auto}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-list[data-grid-mounted] .legion-member-grid-row>time{grid-column:auto!important;grid-row:auto!important;display:block;width:auto;margin:0;padding:11px 13px;color:var(--muted);font-size:9px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-member-list[data-grid-mounted] .legion-member-grid-head>b{text-align:center}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-schedule-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.legion-schedule-toolbar h4{margin:0}.legion-schedule-toolbar button,.legion-schedule-form .green-button{height:38px;padding:0 15px;border:0;border-radius:8px;background:var(--green);color:#fff;font-weight:700}.legion-schedule-list{display:grid;gap:9px}.legion-schedule-list article{display:flex;align-items:center;gap:14px;padding:13px;border:1px solid var(--line);border-radius:10px}.legion-schedule-list article>b{display:grid;min-width:54px;height:40px;place-items:center;border-radius:20px;background:var(--soft);color:var(--green)}.legion-schedule-list article div{display:flex;flex-wrap:wrap;align-items:center;gap:7px}.legion-schedule-list article small{width:100%;color:var(--muted)}.legion-schedule-form{display:grid;gap:14px}.legion-schedule-form label{display:grid;gap:7px;text-align:left}.legion-schedule-form input{height:44px;padding:0 11px;border:1px solid var(--line);border-radius:8px}.legion-schedule-form input:disabled{background:#eef3f1;color:#60736c}.legion-schedule-form footer{display:flex;justify-content:center;gap:8px;margin-top:6px}.legion-schedule-form footer button{min-width:105px;height:40px;border:1px solid #aebdb7;border-radius:8px;background:#fff}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-schedule-form footer .green-button:disabled{border-color:#dce5e2;background:#dce5e2;color:#87978f;cursor:not-allowed}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-schedule-attendance{display:flex!important;flex:1;justify-content:flex-end;gap:10px!important}.legion-schedule-attendance span{color:var(--muted);font-size:10px}.legion-schedule-attendance button{height:32px;padding:0 13px;border:1px solid var(--green);border-radius:8px;background:#fff;color:var(--green);font-weight:700}.legion-schedule-attendance button:disabled{border-color:#cbd8d4;background:#e4ebe8;color:#87978f}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-schedule-attendance>span>b,.legion-schedule-attendance>span>em{color:var(--green);font-style:normal;font-weight:800}</style>");
  document.head.insertAdjacentHTML("beforeend", '<style>.legion-schedule-attendance>span{position:relative;padding:8px 2px;cursor:help}.legion-attendance-tooltip{position:absolute;z-index:20;right:50%;bottom:calc(100% + 7px);display:none!important;min-width:150px;max-width:240px;padding:11px 13px;border-radius:9px;background:#173f35!important;color:#fff!important;box-shadow:0 8px 22px rgba(0,0,0,.24);transform:translateX(50%);white-space:nowrap}.legion-attendance-tooltip:after{position:absolute;top:100%;right:50%;border:6px solid transparent;border-top-color:#173f35;content:"";transform:translateX(50%)}.legion-attendance-tooltip b,.legion-attendance-tooltip span{display:block;color:#fff!important;line-height:1.7}.legion-attendance-tooltip b{margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.25);font-size:10px}.legion-schedule-attendance>span:hover .legion-attendance-tooltip{display:block!important}</style>');
  document.head.insertAdjacentHTML("beforeend", '<style>.legion-attendance-portal{position:fixed;z-index:2147483647;min-width:150px;max-width:260px;padding:11px 13px;border-radius:9px;background:#173f35;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.38);pointer-events:none;white-space:nowrap}.legion-attendance-portal:after{position:absolute;top:100%;left:50%;border:6px solid transparent;border-top-color:#173f35;content:"";transform:translateX(-50%)}.legion-attendance-portal b,.legion-attendance-portal span{display:block;color:#fff;line-height:1.7}.legion-attendance-portal b{margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.25);font-size:10px}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-account-report-result{flex-basis:100%;margin-top:8px}.legion-account-report-summary{display:flex;flex-wrap:wrap;gap:12px;padding:12px;border-radius:8px;background:#eef6f3}.legion-account-report-summary b{flex-basis:100%}.legion-account-report-summary span{font-size:10px;font-weight:700}.legion-account-report-result .legion-empty{padding:24px 10px}.legion-account-report-result .legion-account-table{margin-top:10px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-audit{display:inline-flex;padding:4px 8px;border-radius:12px;background:#edf1ef;color:#66766f;font-size:9px;white-space:nowrap}.legion-audit.requested{background:#fff4d8;color:#9a6700}.legion-audit.approved{background:#dff5eb;color:#187554}.legion-audit.rejected{background:#fde7e9;color:#b33d49}.legion-report-review{margin-bottom:18px;padding:15px;border:1px solid var(--line);border-radius:10px;background:#f8fbfa}.legion-report-review h4{margin:0 0 11px}.legion-report-review>div{display:grid;gap:8px}.legion-report-review article{display:flex;align-items:center;gap:12px;padding:11px;border:1px solid var(--line);border-radius:8px;background:#fff}.legion-report-review article>div{display:grid;flex:1;gap:4px}.legion-report-review article small{color:var(--muted)}.legion-report-review article p{margin:0;color:#b33d49;font-size:9px}.legion-report-review footer{display:flex;gap:6px}.legion-report-review footer button{height:32px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:#fff}.legion-report-review footer .green-button{border-color:var(--green);background:var(--green);color:#fff}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-account-table tr.editable{cursor:pointer}.legion-account-table tr.editable:hover,.legion-account-table tr.selected{background:#edf8f4}.legion-receipt-view{height:27px;padding:0 10px;border:1px solid var(--green);border-radius:7px;background:#fff;color:var(--green);font-size:9px;font-weight:700}.legion-receipt-modal{z-index:100006!important}.legion-receipt-modal .member-modal-box{width:min(94vw,850px);overflow:hidden}.legion-receipt-modal h3{margin:0;padding:17px;background:var(--green);color:#fff;text-align:center}.legion-receipt-modal .member-modal-box>div{display:grid;max-height:68vh;padding:18px;place-items:center;overflow:auto;background:#eef2f0}.legion-receipt-modal img{display:block;max-width:100%;height:auto;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.15)}.legion-receipt-modal footer,.legion-entry-confirm footer{display:flex;justify-content:center;gap:8px;padding:13px}.legion-receipt-modal footer button,.legion-entry-confirm footer button{min-width:105px;height:40px;border:1px solid var(--line);border-radius:8px;background:#fff}.legion-entry-confirm{z-index:100007!important}.legion-entry-confirm .member-modal-box{width:min(90vw,430px);overflow:hidden}.legion-entry-confirm h3{margin:0;padding:17px;background:var(--green);color:#fff;text-align:center}.legion-entry-confirm .member-modal-body{padding:28px;text-align:center}.legion-entry-confirm footer .green-button{border-color:var(--green);background:var(--green);color:#fff}</style>");
  document.head.insertAdjacentHTML("beforeend", '<style>.legion-account-manager form>button{display:inline-flex;align-items:center;justify-content:center;min-width:118px;height:44px;padding:0 16px;border-radius:9px;font-size:11px;font-weight:800;line-height:1;white-space:nowrap;cursor:pointer;transition:background .15s,border-color .15s,color .15s}.legion-account-manager form>button.green-button{border:1px solid var(--green);background:var(--green);color:#fff}.legion-account-manager form>button.green-outline{border:1px solid var(--green);background:#fff;color:var(--green)}.legion-account-manager form>button.green-outline:hover{background:#edf8f4}.legion-account-manager form>button.green-button:hover{filter:brightness(.96)}.legion-account-manager form>button:disabled{border-color:#d8e2de!important;background:#e8eeeb!important;color:#93a19b!important;cursor:not-allowed;filter:none!important}.legion-account-manager form[data-account-entry]>button[type="submit"]{margin-left:auto}.legion-account-manager form[data-account-report]{column-gap:10px}.legion-account-manager form[data-account-report]>button{align-self:end}@media(max-width:680px){.legion-account-manager form>button{flex:1 1 118px}.legion-account-manager form[data-account-entry]>button[type="submit"]{margin-left:0}}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-account-report-result:empty{display:none}.legion-account-table tr[hidden]{display:none}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-report-title-modal{z-index:100008!important}.legion-report-title-modal .member-modal-box{width:min(92vw,500px);overflow:hidden}.legion-report-title-modal h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-report-title-modal form{display:grid;gap:10px;padding:22px}.legion-report-title-modal label{display:grid;gap:7px;color:#34483f;font-size:11px;font-weight:700}.legion-report-title-modal label i{color:#c43d49}.legion-report-title-modal input{width:100%;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:9px;font:inherit}.legion-report-title-modal input:focus{border-color:var(--green);outline:none;box-shadow:0 0 0 3px rgba(39,145,105,.12)}.legion-report-title-modal [data-error]{min-height:14px;margin:0;color:#c43d49;font-size:9px}.legion-report-title-modal footer{display:flex;justify-content:center;gap:8px;margin:4px -22px -22px;padding:14px;border-top:1px solid var(--line)}.legion-report-title-modal footer button{min-width:110px;height:42px;border:1px solid var(--line);border-radius:8px;background:#fff;font-weight:700}.legion-report-title-modal footer .green-button{border-color:var(--green);background:var(--green);color:#fff}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-report-entries-modal{z-index:100006!important}.legion-report-entries-modal .member-modal-box{display:flex;width:min(95vw,920px);max-height:88vh;flex-direction:column;overflow:hidden}.legion-report-entries-modal h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-report-entries-body{padding:18px;overflow:auto}.legion-report-entries-body>.legion-account-table{margin-top:14px}.legion-report-entries-modal .member-modal-box>footer{display:flex;justify-content:center;padding:13px;border-top:1px solid var(--line)}.legion-report-entries-modal .member-modal-box>footer button{min-width:110px;height:40px;border:1px solid var(--line);border-radius:8px;background:#fff;font-weight:700}.legion-report-rejection{display:grid;gap:5px;margin:13px 0 0;padding:12px;border-radius:8px;background:#fff0f1;color:#a93945}</style>");
  var legionFileBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("\uC0AC\uC9C4\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
    reader.readAsDataURL(file);
  });
  async function openPraesidiumMemorials(organizationId, organizationName) {
    document.querySelector(".legion-memorial-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal legion-content-modal legion-memorial-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${esc(organizationName)} \xB7 \uCD94\uBAA8\uC758 \uACF5\uAC04</h3><div class="legion-memorial-body">\uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</div><footer><button class="green-outline" data-close type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("[data-close]").addEventListener("click", () => layer.remove());
    try {
      const items = await api(`/api/parishioner/legion/organizations/${organizationId}/memorials`), body = layer.querySelector(".legion-memorial-body");
      body.innerHTML = `<header><div><h4>\uD568\uAED8 \uAE30\uC5B5\uD558\uACE0 \uAE30\uB3C4\uD569\uB2C8\uB2E4</h4><p>\uCD94\uBAA8 \uB300\uC0C1\uACFC \uCC38\uC5EC\uC790\uB294 \uC774 \uC058\uB808\uC2DC\uB514\uC6C0\uC758 \uB2E8\uC6D0\uC73C\uB85C \uC81C\uD55C\uB429\uB2C8\uB2E4.</p></div><button class="green-button" data-create type="button">+ \uCD94\uBAA8 \uACF5\uAC04 \uB4F1\uB85D</button></header><div class="legion-memorial-list">${items.map((item) => `<article>${item.coverPhotoId ? `<img src="/api/parishioner/legion/memorial-photos/${item.coverPhotoId}" alt="${esc(item.name)}">` : '<div class="legion-memorial-placeholder">\u271D</div>'}<div><h4>${esc(item.name)}${item.baptismalName ? ` <small>(${esc(item.baptismalName)})</small>` : ""}</h4><time>${item.deathDate} \uC120\uC885</time><p>${esc(item.biography)}</p><footer><span>\uCD94\uBAA8 \uBA54\uC2DC\uC9C0 ${item.messageCount} \xB7 \uAE30\uB3C4\uBB38 ${item.prayerCount}</span><button class="green-outline" data-detail="${item.id}" type="button">\uC0C1\uC138\uBCF4\uAE30</button></footer></div></article>`).join("") || '<p class="legion-empty">\uB4F1\uB85D\uB41C \uCD94\uBAA8 \uACF5\uAC04\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}</div>`;
      body.querySelector("[data-create]").onclick = () => void openPraesidiumMemorialForm(organizationId, organizationName);
      body.querySelectorAll("[data-detail]").forEach((button) => button.onclick = () => void openPraesidiumMemorialDetail(Number(button.dataset.detail), organizationId, organizationName));
    } catch (error) {
      layer.querySelector(".legion-memorial-body").textContent = error.message;
    }
  }
  async function openPraesidiumMemorialForm(organizationId, organizationName) {
    try {
      const members = await api(`/api/parishioner/legion/organizations/${organizationId}/memorial-members`);
      document.querySelector(".legion-memorial-form-modal")?.remove();
      const layer = document.createElement("div");
      layer.className = "member-modal legion-memorial-form-modal";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uCD94\uBAA8 \uACF5\uAC04 \uB4F1\uB85D</h3><form><label>* \uCD94\uBAA8 \uB300\uC0C1 \uB2E8\uC6D0<select name="subjectMemberId" required><option value="">\uB2E8\uC6D0\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694</option>${members.map((member) => `<option value="${member.id}">${esc(member.name)}${member.baptismalName ? ` (${esc(member.baptismalName)})` : ""} \xB7 ${esc(roles[member.role] ?? member.role)}</option>`).join("")}</select></label><label>* \uC120\uC885\uC77C<input name="deathDate" type="date" max="${new Date(Date.now() + 9 * 60 * 60 * 1e3).toISOString().slice(0, 10)}" required></label><label class="full">* \uC57D\uB825<textarea name="biography" maxlength="20000" rows="5" required></textarea></label><label class="full">* \uC0AC\uC9C4 <small>1~5\uC7A5, \uC7A5\uB2F9 2MB</small><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label><p data-error></p><footer><button class="green-outline" data-cancel type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uB4F1\uB85D</button></footer></form></section>`;
      document.body.append(layer);
      layer.querySelector("[data-cancel]").addEventListener("click", () => layer.remove());
      const form = layer.querySelector("form");
      form.onsubmit = async (event) => {
        event.preventDefault();
        const error = form.querySelector("[data-error]"), files = [...form.elements.namedItem("photos").files ?? []];
        if (files.length < 1 || files.length > 5 || files.some((file) => file.size > 2 * 1024 * 1024)) {
          error.textContent = "\uC0AC\uC9C4\uC740 1~5\uC7A5, \uC7A5\uB2F9 2MB \uC774\uD558\uB85C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.";
          return;
        }
        try {
          const photos = await Promise.all(files.map(async (file) => ({ type: file.type, data: await legionFileBase64(file) })));
          await api(`/api/parishioner/legion/organizations/${organizationId}/memorials`, { method: "POST", body: JSON.stringify({ subjectMemberId: Number(form.elements.namedItem("subjectMemberId").value), deathDate: form.elements.namedItem("deathDate").value, biography: form.elements.namedItem("biography").value, photos }) });
          layer.remove();
          document.querySelector(".legion-memorial-modal")?.remove();
          void openPraesidiumMemorials(organizationId, organizationName);
        } catch (reason) {
          error.textContent = reason.message;
        }
      };
    } catch (error) {
      showLegionResult(error.message, false);
    }
  }
  async function openPraesidiumMemorialDetail(memorialId, organizationId, organizationName) {
    document.querySelector(".legion-memorial-detail-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal legion-memorial-detail-modal";
    layer.innerHTML = '<section class="member-modal-box"><h3>\uCD94\uBAA8\uC758 \uACF5\uAC04</h3><div class="member-modal-body">\uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</div><footer><button class="green-outline" data-close type="button">\uB2EB\uAE30</button></footer></section>';
    document.body.append(layer);
    layer.querySelector("[data-close]").addEventListener("click", () => layer.remove());
    try {
      const item = await api(`/api/parishioner/legion/memorials/${memorialId}`), body = layer.querySelector(".member-modal-body");
      body.innerHTML = `<div class="legion-memorial-gallery">${item.photos.map((photo) => `<img src="/api/parishioner/legion/memorial-photos/${photo.id}" alt="${esc(item.name)}">`).join("")}</div><h4>${esc(item.name)}${item.baptismalName ? ` (${esc(item.baptismalName)})` : ""}</h4><p>${esc(item.deathDate)} \uC120\uC885</p><p>${esc(item.biography)}</p><section class="legion-memorial-entries">${item.entries.map((entry) => `<article><b>${entry.entryType === "prayer" ? "\uAE30\uB3C4\uBB38" : "\uCD94\uBAA8 \uBA54\uC2DC\uC9C0"}</b><strong>${esc(entry.authorName)}${entry.baptismalName ? ` (${esc(entry.baptismalName)})` : ""}</strong><p>${esc(entry.content)}</p></article>`).join("") || "<p>\uC544\uC9C1 \uB0A8\uACA8\uC9C4 \uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>"}<form><select name="entryType"><option value="message">\uCD94\uBAA8 \uBA54\uC2DC\uC9C0</option><option value="prayer">\uAE30\uB3C4\uBB38</option></select><textarea name="content" maxlength="3000" required placeholder="\uB9C8\uC74C\uC744 \uB2F4\uC544 \uAE00\uC744 \uB0A8\uACA8 \uC8FC\uC138\uC694."></textarea><button class="green-button" type="submit">\uB0A8\uAE30\uAE30</button></form></section>`;
      body.querySelector("form").onsubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        await api(`/api/parishioner/legion/memorials/${memorialId}/entries`, { method: "POST", body: JSON.stringify({ entryType: form.elements.namedItem("entryType").value, content: form.elements.namedItem("content").value }) });
        layer.remove();
        void openPraesidiumMemorialDetail(memorialId, organizationId, organizationName);
      };
    } catch (error) {
      layer.querySelector(".member-modal-body").textContent = error.message;
    }
  }
  function mountPraesidiumMemorialButtons() {
    document.querySelectorAll(".legion-praesidium .legion-card-actions").forEach((actions) => {
      if (actions.querySelector("[data-legion-memorial]")) return;
      const source = actions.querySelector("[data-org]");
      if (!source) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.legionMemorial = source.dataset.org;
      button.textContent = "\uCD94\uBAA8\uC758 \uACF5\uAC04";
      button.onclick = () => void openPraesidiumMemorials(Number(source.dataset.org), source.dataset.name ?? "\uC058\uB808\uC2DC\uB514\uC6C0");
      actions.append(button);
    });
  }
  new MutationObserver(mountPraesidiumMemorialButtons).observe(document.documentElement, { childList: true, subtree: true });
  mountPraesidiumMemorialButtons();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-modal .member-modal-box,.legion-memorial-detail-modal .member-modal-box{display:flex;width:min(94vw,900px);max-height:90vh;flex-direction:column;overflow:hidden}.legion-memorial-body,.legion-memorial-detail-modal .member-modal-body{padding:20px;overflow:auto}.legion-memorial-body>header{display:flex;align-items:center;justify-content:space-between}.legion-memorial-body>header h4,.legion-memorial-body>header p{margin:0 0 5px}.legion-memorial-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.legion-memorial-list>article{display:grid;grid-template-columns:100px 1fr;gap:12px;padding:12px;border:1px solid var(--line);border-radius:10px}.legion-memorial-list img,.legion-memorial-placeholder{width:100px;height:125px;border-radius:8px;object-fit:cover}.legion-memorial-placeholder{display:grid;place-items:center;background:#eef7f4;color:var(--green);font-size:26px}.legion-memorial-list h4,.legion-memorial-list p{margin:0 0 7px}.legion-memorial-list footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.legion-memorial-list footer span{font-size:9px}.legion-memorial-form-modal .member-modal-box{width:min(94vw,620px);overflow:hidden}.legion-memorial-form-modal form{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px}.legion-memorial-form-modal label{display:grid;gap:6px;font-weight:700}.legion-memorial-form-modal .full,.legion-memorial-form-modal [data-error],.legion-memorial-form-modal footer{grid-column:1/-1}.legion-memorial-form-modal input,.legion-memorial-form-modal select,.legion-memorial-form-modal textarea{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit}.legion-memorial-form-modal footer,.legion-memorial-modal>.member-modal-box>footer,.legion-memorial-detail-modal>.member-modal-box>footer{display:flex;justify-content:center;gap:8px;padding:13px;border-top:1px solid var(--line)}.legion-memorial-gallery{display:flex;gap:8px;overflow:auto}.legion-memorial-gallery img{width:180px;height:210px;border-radius:9px;object-fit:cover}.legion-memorial-entries article{margin-top:8px;padding:12px;border-radius:8px;background:#f5f9f7}.legion-memorial-entries article b{margin-right:8px;color:var(--green)}.legion-memorial-entries form{display:grid;grid-template-columns:110px 1fr 90px;gap:8px;margin-top:12px}.legion-memorial-entries select,.legion-memorial-entries textarea{padding:9px;border:1px solid var(--line);border-radius:8px}@media(max-width:700px){.legion-memorial-list{grid-template-columns:1fr}.legion-memorial-form-modal form,.legion-memorial-entries form{grid-template-columns:1fr}.legion-memorial-form-modal .full,.legion-memorial-form-modal [data-error],.legion-memorial-form-modal footer{grid-column:auto}}</style>");
  function mountLegionMemorialDropzone() {
    const modal2 = document.querySelector(".legion-memorial-form-modal"), input = modal2?.querySelector('input[name="photos"]');
    if (!modal2 || !input || input.dataset.dropzoneMounted) return;
    input.dataset.dropzoneMounted = "1";
    const label = input.closest("label");
    label.classList.add("legion-memorial-dropzone-label");
    const zone = document.createElement("div");
    zone.className = "legion-memorial-dropzone";
    zone.tabIndex = 0;
    zone.setAttribute("role", "button");
    zone.setAttribute("aria-label", "\uCD94\uBAA8 \uC0AC\uC9C4 \uC120\uD0DD \uB610\uB294 \uB4DC\uB798\uADF8 \uC564 \uB4DC\uB86D");
    zone.innerHTML = "<strong>\uC0AC\uC9C4\uC744 \uB04C\uC5B4 \uB193\uC73C\uC138\uC694</strong><span>\uB610\uB294 \uD074\uB9AD\uD558\uC5EC \uC0AC\uC9C4 \uC120\uD0DD</span><em>JPG, PNG, WEBP \xB7 1~5\uC7A5 \xB7 \uC7A5\uB2F9 2MB</em>";
    input.insertAdjacentElement("beforebegin", zone);
    input.classList.add("legion-memorial-file-input");
    const status = document.createElement("p");
    status.className = "legion-memorial-file-status";
    input.insertAdjacentElement("afterend", status);
    const render = () => {
      const files = [...input.files ?? []];
      status.textContent = files.length ? `${files.length}\uC7A5 \uC120\uD0DD \xB7 ${files.map((file) => file.name).join(", ")}` : "\uC120\uD0DD\uB41C \uC0AC\uC9C4\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
      zone.classList.toggle("has-files", files.length > 0);
    };
    zone.onclick = () => input.click();
    zone.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    };
    for (const type of ["dragenter", "dragover"]) zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add("dragging");
    });
    for (const type of ["dragleave", "drop"]) zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.remove("dragging");
    });
    zone.addEventListener("drop", (event) => {
      const files = [...event.dataTransfer?.files ?? []].filter((file) => /^image\/(jpeg|png|webp)$/i.test(file.type)).slice(0, 5), transfer = new DataTransfer();
      files.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      render();
    });
    input.addEventListener("change", render);
    render();
  }
  new MutationObserver(mountLegionMemorialDropzone).observe(document.documentElement, { childList: true, subtree: true });
  mountLegionMemorialDropzone();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-dropzone-label{display:block!important}.legion-memorial-dropzone{display:grid;min-height:130px;margin-top:7px;padding:20px;border:2px dashed #9fcdbd;border-radius:10px;background:#f7fbfa;color:#45665b;place-content:center;text-align:center;cursor:pointer;transition:.15s}.legion-memorial-dropzone:hover,.legion-memorial-dropzone:focus,.legion-memorial-dropzone.dragging{border-color:var(--green);background:#eaf7f2;outline:none;box-shadow:0 0 0 3px rgba(21,149,111,.1)}.legion-memorial-dropzone.has-files{border-style:solid}.legion-memorial-dropzone strong{color:var(--green);font-size:12px}.legion-memorial-dropzone span{margin-top:5px;font-size:10px}.legion-memorial-dropzone em{margin-top:8px;color:var(--muted);font-size:9px;font-style:normal}.legion-memorial-file-input{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;border:0!important;clip:rect(0 0 0 0);overflow:hidden}.legion-memorial-file-status{margin:7px 0 0;color:var(--muted);font-size:9px;font-weight:500;overflow-wrap:anywhere}</style>");
  function arrangeLegionMemorialDetail() {
    const body = document.querySelector(".legion-memorial-detail-modal .member-modal-body"), gallery = body?.querySelector(":scope>.legion-memorial-gallery");
    if (!body || !gallery || body.dataset.detailArranged) return;
    const title = gallery.nextElementSibling, date = title?.nextElementSibling, biography = date?.nextElementSibling;
    if (!(title instanceof HTMLElement) || !(date instanceof HTMLElement) || !(biography instanceof HTMLElement)) return;
    const hero = document.createElement("section"), profile = document.createElement("div");
    hero.className = "legion-memorial-hero";
    profile.className = "legion-memorial-hero-profile";
    profile.append(title, date, biography);
    hero.append(gallery, profile);
    body.prepend(hero);
    body.dataset.detailArranged = "1";
  }
  new MutationObserver(arrangeLegionMemorialDetail).observe(document.documentElement, { childList: true, subtree: true });
  arrangeLegionMemorialDetail();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-hero{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:stretch;margin-bottom:18px}.legion-memorial-hero .legion-memorial-gallery{display:block;overflow:auto}.legion-memorial-hero .legion-memorial-gallery img{display:block;width:220px;height:270px;margin-bottom:8px;object-fit:cover}.legion-memorial-hero-profile{display:flex;min-height:230px;flex-direction:column;justify-content:center;padding:22px;border:1px solid #b9dfd1;border-radius:10px;background:#f5fbf8;text-align:center}.legion-memorial-hero-profile h4{margin:0 0 16px;color:var(--ink);font-size:16px}.legion-memorial-hero-profile p{margin:5px 0;color:#445950;line-height:1.8;white-space:pre-wrap}.legion-memorial-entries form{align-items:end}.legion-memorial-entries form select,.legion-memorial-entries form textarea{box-sizing:border-box;width:100%;height:42px;margin:0;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);font:inherit;font-size:11px;outline:none}.legion-memorial-entries form textarea{min-height:42px;max-height:110px;padding-top:11px;line-height:1.5;resize:vertical}.legion-memorial-entries form textarea::placeholder{color:#93a19b;font-family:inherit;font-size:11px;opacity:1}.legion-memorial-entries form select:focus,.legion-memorial-entries form textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(21,149,111,.1)}.legion-memorial-entries form .green-button{height:42px;padding:0 14px;border-radius:8px;white-space:nowrap}@media(max-width:700px){.legion-memorial-hero{grid-template-columns:1fr}.legion-memorial-hero .legion-memorial-gallery{display:flex}.legion-memorial-hero .legion-memorial-gallery img{width:160px;height:195px;flex:0 0 auto}.legion-memorial-hero-profile{min-height:0}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-detail-modal .member-modal-body{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px}.memorial-detail-modal .memorial-gallery{display:block;grid-column:1;overflow:auto}.memorial-detail-modal .memorial-gallery img{display:block;width:220px;height:270px;margin-bottom:8px}.memorial-detail-modal .memorial-profile{display:flex;grid-column:2;min-height:230px;flex-direction:column;justify-content:center;padding:22px;border:1px solid #b9dfd1;border-radius:10px;background:#f5fbf8;text-align:center}.memorial-detail-modal .memorial-profile h4{margin:0 0 16px}.memorial-detail-modal .memorial-profile dl{display:grid;grid-template-columns:80px 1fr;text-align:left}.memorial-detail-modal .memorial-entries{grid-column:1/-1}.memorial-detail-modal .memorial-entries textarea::placeholder{color:#93a19b!important;font-family:inherit!important;font-size:11px!important;opacity:1}.memorial-detail-modal .memorial-entries select,.memorial-detail-modal .memorial-entries textarea{border-color:var(--line)!important;color:var(--ink);font-family:inherit!important}.memorial-detail-modal .memorial-entries select:focus,.memorial-detail-modal .memorial-entries textarea:focus{border-color:var(--green)!important;outline:none;box-shadow:0 0 0 3px rgba(21,149,111,.1)}@media(max-width:700px){.memorial-detail-modal .member-modal-body{grid-template-columns:1fr}.memorial-detail-modal .memorial-gallery,.memorial-detail-modal .memorial-profile,.memorial-detail-modal .memorial-entries{grid-column:1}.memorial-detail-modal .memorial-gallery{display:flex}.memorial-detail-modal .memorial-gallery img{width:160px;height:195px;flex:0 0 auto}.memorial-detail-modal .memorial-profile{min-height:0}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-hero-profile,.memorial-detail-modal .memorial-profile{justify-content:flex-start!important;padding:0!important;overflow:hidden;text-align:left!important}.legion-memorial-hero-profile>h4,.memorial-detail-modal .memorial-profile>h4{box-sizing:border-box;width:100%;margin:0!important;padding:16px 20px;border-bottom:1px solid #b9dfd1;background:#e7f5ef;color:#244a3d;text-align:center;font-size:16px;font-weight:800}.legion-memorial-hero-profile>p{box-sizing:border-box;width:100%;margin:0!important;padding:12px 20px 0;text-align:left!important}.legion-memorial-hero-profile>p:last-child{padding-bottom:18px}.memorial-detail-modal .memorial-profile>dl{box-sizing:border-box;width:100%;margin:0;padding:10px 18px 18px;text-align:left!important}.memorial-detail-modal .memorial-profile dt,.memorial-detail-modal .memorial-profile dd{text-align:left!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-list>article>div{display:flex;min-width:0;flex-direction:column}.legion-memorial-list>article>div>footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px}.legion-memorial-list footer button.green-outline{display:inline-flex!important;width:auto!important;min-width:82px!important;height:34px!important;flex:0 0 auto;align-items:center;justify-content:center;padding:0 13px!important;border:1px solid var(--green)!important;border-radius:8px!important;background:#fff!important;color:var(--green)!important;font-size:10px!important;font-weight:700!important;line-height:1!important;white-space:nowrap;cursor:pointer}.legion-memorial-list footer button.green-outline:hover{background:#edf8f4!important}.legion-memorial-list footer button.green-outline:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(21,149,111,.14)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-list>article{align-items:stretch}.legion-memorial-list>article>div{position:relative;min-height:125px;padding-bottom:42px}.legion-memorial-list>article>div>p{display:-webkit-box!important;max-height:3.4em;margin:0!important;overflow:hidden;line-height:1.7;white-space:pre-line;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2;text-overflow:ellipsis}.legion-memorial-list>article>div>footer{position:absolute;right:0;bottom:0;left:0;margin:0!important;padding:8px 0 0!important;border-top:1px solid #edf2ef}.legion-memorial-list>article>div>footer span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-list>article{position:relative;min-height:185px;padding-bottom:56px!important}.legion-memorial-list>article>div{position:static!important;min-height:125px;padding-bottom:0!important}.legion-memorial-list>article>div>footer{position:absolute!important;right:12px!important;bottom:10px!important;left:12px!important;box-sizing:border-box;width:auto;margin:0!important;padding:9px 0 0!important;border-top:1px solid #dfe8e4}.legion-memorial-list>article>div>footer span{padding-left:2px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-list>article>div>footer{border-top:0!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-entries article p,.memorial-detail-modal .memorial-entries article p{width:100%;margin:8px 0 0;text-align:left!important;white-space:pre-wrap;overflow-wrap:anywhere}</style>");
  function arrangeMemorialComments() {
    document.querySelectorAll(".legion-memorial-entries article,.memorial-detail-modal .memorial-entries article").forEach((article) => {
      if (article.dataset.commentArranged) return;
      const type = article.querySelector(":scope>b"), author = article.querySelector(":scope>strong");
      if (!type || !author) return;
      const header = document.createElement("header"), avatar = document.createElement("span");
      header.className = "memorial-comment-head";
      avatar.className = "memorial-comment-avatar";
      avatar.textContent = (author.textContent?.trim().charAt(0) || "\uCD94").toUpperCase();
      header.append(avatar, author, type);
      article.prepend(header);
      article.dataset.commentArranged = "1";
    });
  }
  new MutationObserver(arrangeMemorialComments).observe(document.documentElement, { childList: true, subtree: true });
  arrangeMemorialComments();
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-memorial-entries article,.memorial-detail-modal .memorial-entries article{box-sizing:border-box;width:100%;margin-top:10px!important;padding:14px 16px!important;border:1px solid var(--line);border-radius:10px!important;background:#fff!important;text-align:left!important;box-shadow:0 1px 2px rgba(28,54,45,.04)}.memorial-comment-head{display:flex;align-items:center;gap:8px}.memorial-comment-avatar{display:grid;width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:#e5f4ee;color:var(--green);font-size:11px;font-weight:800;place-items:center}.memorial-comment-head strong{color:#263b34;font-size:11px;font-weight:800}.memorial-comment-head>b{order:3;margin:0!important;padding:3px 7px;border-radius:10px;background:#edf8f4;color:var(--green)!important;font-size:8px;font-weight:700}.legion-memorial-entries article>p,.memorial-detail-modal .memorial-entries article>p{box-sizing:border-box;width:100%;margin:10px 0 0!important;padding-left:40px;color:#34483f;line-height:1.7;text-align:left!important;white-space:pre-wrap;overflow-wrap:anywhere}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.legion-report-rejection-modal{z-index:100009!important}.legion-report-rejection-modal .member-modal-box{width:min(92vw,500px);overflow:hidden}.legion-report-rejection-modal h3{margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.legion-report-rejection-modal form{display:grid;gap:10px;padding:22px}.legion-report-rejection-modal label{display:grid;gap:7px;color:#34483f;font-size:11px;font-weight:700}.legion-report-rejection-modal label i{color:#c43d49}.legion-report-rejection-modal textarea{width:100%;min-height:120px;padding:12px;border:1px solid var(--line);border-radius:9px;resize:vertical;font:inherit}.legion-report-rejection-modal textarea:focus{border-color:var(--green);outline:none;box-shadow:0 0 0 3px rgba(39,145,105,.12)}.legion-report-rejection-modal [data-error]{min-height:14px;margin:0;color:#c43d49;font-size:9px}.legion-report-rejection-modal footer{display:flex;justify-content:center;gap:8px;margin:4px -22px -22px;padding:14px;border-top:1px solid var(--line)}.legion-report-rejection-modal footer button{min-width:110px;height:42px;border:1px solid var(--line);border-radius:8px;background:#fff;font-weight:700}.legion-report-rejection-modal footer .reject-button{border-color:#b33d49;background:#b33d49;color:#fff}</style>");

  // src/client/parishioner-gateway.ts
  var gatewayTargets = {
    schedule: () => openGatewaySection(".member-schedule-section"),
    groups: () => openGatewaySection(".member-groups"),
    legion: () => {
      closeGateway();
      document.dispatchEvent(new CustomEvent("member:gateway-legion", { detail: { action: "home" } }));
    },
    faith: () => {
      closeGateway();
      document.dispatchEvent(new CustomEvent("member:gateway-faith"));
    },
    shrines: () => openGatewaySection(".member-shrines"),
    sharing: () => openGatewaySharing("catacomb"),
    videos: () => openGatewaySection(".member-videos"),
    notices: () => openGatewaySection(".member-notices"),
    parish: () => {
      closeGateway();
      requestAnimationFrame(() => document.querySelector('[data-parish-information="basic"]')?.click());
    },
    dictionary: () => {
      closeGateway();
      document.dispatchEvent(new CustomEvent("member:gateway-dictionary"));
    },
    home: () => openGatewaySection(".member-home")
  };
  function closeGateway() {
    document.querySelector(".member-faith-gateway")?.remove();
    document.body.classList.remove("member-gateway-open");
  }
  function openGatewaySection(selector) {
    closeGateway();
    requestAnimationFrame(() => document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function openGatewaySharing(tab) {
    closeGateway();
    requestAnimationFrame(() => {
      document.querySelector(".member-sharing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector(`[data-member-sharing="${tab}"]`)?.click();
    });
  }
  function mountMemberFaithGateway() {
    if (!document.body.classList.contains("member-authenticated") || document.querySelector(".member-faith-gateway") || document.body.dataset.gatewayShown) return;
    document.body.dataset.gatewayShown = "1";
    const layer = document.createElement("section");
    layer.className = "member-faith-gateway";
    layer.setAttribute("aria-label", "\uC2E0\uB3C4 \uC11C\uBE44\uC2A4 \uC2DC\uC791 \uBA54\uB274");
    layer.innerHTML = `<div class="faith-gateway-glass" aria-hidden="true"><i></i><i></i><i></i><i></i></div><header><div class="faith-gateway-cross" aria-hidden="true">\u271D</div><small>PAXLINK CATHOLIC COMMUNITY</small><h1>\uD568\uAED8 \uAE30\uB3C4\uD558\uACE0,<br>\uB098\uB204\uACE0, \uC131\uC7A5\uD569\uB2C8\uB2E4</h1><p>\uC77C\uC0C1 \uC548\uC5D0\uC11C \uC774\uC5B4\uC9C0\uB294 \uCC9C\uC8FC\uAD50 \uACF5\uB3D9\uCCB4</p></header><main class="faith-gateway-dashboard"><button class="faith-gateway-home" data-gateway="home" type="button"><span>\uC624\uB298\uC758 \uACF5\uB3D9\uCCB4</span><strong>\uCC2C\uBBF8 \uC608\uC218\uB2D8</strong><small>\uC2E0\uB3C4 \uD648\uC73C\uB85C \uC774\uB3D9</small><i>\u203A</i></button><section><h2>\uC2E0\uC559\uC0DD\uD65C</h2><div class="faith-gateway-grid"><button data-gateway="schedule" type="button"><span class="blue">\u25A3</span><b>\uC131\uB2F9 \uC77C\uC815</b><small>\uBBF8\uC0AC\uC640 \uBCF8\uB2F9 \uC77C\uC815</small></button><button data-gateway="faith" type="button"><span class="violet">\u2726</span><b>\uC2E0\uC559\uD65C\uB3D9</b><small>\uC740\uCD1D\uC77C\uAE30\uC640 \uD65C\uB3D9\uBCF4\uACE0</small></button><button data-gateway="shrines" type="button"><span class="gold">\u2302</span><b>\uC131\uC9C0\uC21C\uB840</b><small>\uC21C\uB840\uC9C0\uC640 \uBC29\uBB38 \uAE30\uB85D</small></button><button data-gateway="legion" type="button"><span class="green">\u2720</span><b>\uB808\uC9C0\uC624\uB9C8\uB9AC\uC560</b><small>\uC870\uC9C1\uACFC \uACF5\uB3D9\uCCB4 \uD65C\uB3D9</small></button></div></section><section><h2>\uACF5\uB3D9\uCCB4</h2><div class="faith-gateway-grid compact"><button data-gateway="groups" type="button"><span class="rose">\u2659</span><b>\uB2E8\uCCB4</b></button><button data-gateway="sharing" type="button"><span class="sky">\u2661</span><b>\uB098\uB214</b></button><button data-gateway="videos" type="button"><span class="red">\u25B6</span><b>\uB3D9\uC601\uC0C1</b></button><button data-gateway="notices" type="button"><span class="amber">!</span><b>\uACF5\uC9C0\uC0AC\uD56D</b></button></div></section><button class="faith-gateway-parish" data-gateway="parish" type="button"><span>\u24D8</span><b>\uC131\uB2F9\uC815\uBCF4</b><small>\uBCF8\uB2F9 \uAE30\uBCF8\uC815\uBCF4\uC640 \uC2E0\uBD80\uB2D8 \uC548\uB0B4</small><i>\u203A</i></button><button class="faith-gateway-parish faith-gateway-dictionary" data-gateway="dictionary" type="button"><span>\u25A4</span><b>\uC6A9\uC5B4\uC0AC\uC804</b><small>\uAC00\uD1A8\uB9AD \uC2E0\uC559 \uC6A9\uC5B4\uB97C \uC27D\uAC8C \uCC3E\uC544\uBCF4\uAE30</small><i>\u203A</i></button></main>`;
    document.body.append(layer);
    document.body.classList.add("member-gateway-open");
    const gatewayCross = layer.querySelector(".faith-gateway-cross");
    gatewayCross.setAttribute("role", "link");
    gatewayCross.setAttribute("tabindex", "0");
    gatewayCross.setAttribute("aria-label", "Paxlink \uD648\uD398\uC774\uC9C0\uB85C \uC774\uB3D9");
    gatewayCross.style.cursor = "pointer";
    gatewayCross.onclick = () => location.href = "/";
    gatewayCross.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        location.href = "/";
      }
    };
    layer.querySelectorAll("[data-gateway]").forEach((button) => button.onclick = () => gatewayTargets[button.dataset.gateway]?.());
    const requestedMenu = new URLSearchParams(location.search).get("menu");
    if (requestedMenu && gatewayTargets[requestedMenu]) requestAnimationFrame(() => gatewayTargets[requestedMenu]());
  }
  new MutationObserver(() => void mountMemberFaithGateway()).observe(document.documentElement, { childList: true, subtree: true });
  queueMicrotask(() => void mountMemberFaithGateway());
  document.head.insertAdjacentHTML("beforeend", `<style>
body.member-gateway-open{overflow:hidden}.member-faith-gateway{position:fixed;z-index:2147483000;inset:0;display:flex;min-height:100dvh;align-items:center;flex-direction:column;overflow:auto;padding:42px 20px 34px;box-sizing:border-box;background:radial-gradient(circle at 50% 62%,#203d78 0,#142b58 37%,#0b1c40 78%);color:#f4d36b;font-family:Georgia,"Noto Serif KR",serif}.member-faith-gateway:before{position:absolute;inset:0;border-top:2px solid #6955dc;background:linear-gradient(135deg,rgba(255,255,255,.035),transparent 38%);content:"";pointer-events:none}.faith-gateway-decor{position:absolute;width:250px;height:250px;border:1px solid rgba(212,180,82,.12);border-radius:50%;pointer-events:none}.faith-gateway-decor.one{top:-85px;right:-80px}.faith-gateway-decor.two{bottom:-150px;left:-120px}.member-faith-gateway>header{position:relative;z-index:1;text-align:center}.faith-gateway-mary{position:relative;display:grid;width:124px;height:124px;margin:0 auto 17px;place-items:center;border:2px solid rgba(213,179,74,.72);border-radius:50%;background:radial-gradient(circle at 50% 38%,#fff7d5 0,#d6c1a0 18%,#738bb5 42%,#0a1531 70%);box-shadow:0 0 26px rgba(244,200,70,.18),inset 0 0 25px rgba(0,0,0,.5)}.faith-gateway-mary span{position:absolute;top:14px;color:#fff2aa;font-size:20px}.faith-gateway-mary b{color:#fff4d2;font-size:52px;text-shadow:0 2px 12px #fff}.member-faith-gateway header small{letter-spacing:6px;color:#ba9950;font-size:10px}.member-faith-gateway header h1{margin:11px 0 4px;color:#fff;font-size:25px}.member-faith-gateway header p{margin:0;color:#b9943d;font-size:14px;letter-spacing:3px}.faith-gateway-orbit{position:relative;width:340px;height:350px;margin:35px auto 6px;border:1px dashed rgba(210,176,73,.25);border-radius:50%}.faith-gateway-item,.faith-gateway-center{position:absolute;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px solid rgba(216,181,71,.5);border-radius:50%;background:radial-gradient(circle at 40% 30%,#294679,#12264f);color:#f1ce5f;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.24);transition:.18s}.faith-gateway-item{width:78px;height:78px}.faith-gateway-item:hover,.faith-gateway-item:focus-visible,.faith-gateway-center:hover,.faith-gateway-center:focus-visible{border-color:#ffe17b;transform:scale(1.07);box-shadow:0 0 24px rgba(255,211,82,.3)}.faith-gateway-item span{font-family:Arial,sans-serif;font-size:25px;line-height:1}.faith-gateway-item b{margin-top:7px;font-size:12px}.faith-gateway-center{top:94px;left:94px;width:150px;height:150px;border-width:2px;background:radial-gradient(circle,#fffadc 0 3%,#ffe066 4%,#e4a825 15%,#72506c 38%,#172e62 66%);box-shadow:0 0 30px rgba(250,200,53,.38),inset 0 0 30px rgba(255,226,118,.35)}.faith-gateway-center span{color:#fff7aa;font-size:73px;line-height:.75;text-shadow:0 0 16px #fff,0 0 28px #ffd745}.faith-gateway-center b{margin-top:16px;color:#ffe25f;font-size:14px;text-shadow:0 2px 4px #000}.faith-gateway-item.choir{top:-38px;left:130px}.faith-gateway-item.prayer{top:33px;left:-25px}.faith-gateway-item.members{top:33px;right:-25px}.faith-gateway-item.desk{bottom:40px;left:-25px}.faith-gateway-item.sharing{right:-25px;bottom:40px}.faith-gateway-item.meeting{bottom:-38px;left:130px}.faith-gateway-guide{position:relative;margin:22px 0 0;color:#a68a4d;font-size:11px;letter-spacing:2px}@media(max-width:430px){.member-faith-gateway{padding-top:28px}.faith-gateway-mary{width:104px;height:104px}.member-faith-gateway header h1{font-size:22px}.faith-gateway-orbit{width:290px;height:300px;margin-top:30px}.faith-gateway-item{width:68px;height:68px}.faith-gateway-item span{font-size:22px}.faith-gateway-center{top:80px;left:80px;width:128px;height:128px}.faith-gateway-center span{font-size:62px}.faith-gateway-item.choir{top:-34px;left:111px}.faith-gateway-item.prayer{top:29px;left:-21px}.faith-gateway-item.members{top:29px;right:-21px}.faith-gateway-item.desk{bottom:34px;left:-21px}.faith-gateway-item.sharing{right:-21px;bottom:34px}.faith-gateway-item.meeting{bottom:-34px;left:111px}}
</style>`);
  document.head.insertAdjacentHTML("beforeend", `<style>
.faith-gateway-orbit{width:400px;height:400px;margin-top:32px}.faith-gateway-item{width:76px;height:76px}.faith-gateway-item b{max-width:68px;font-family:"Noto Sans KR",sans-serif;font-size:10px;line-height:1.25;white-space:normal}.faith-gateway-center{top:125px;left:125px;width:148px;height:148px}.faith-gateway-item.item-1{top:-30px;left:162px}.faith-gateway-item.item-2{top:23px;right:25px}.faith-gateway-item.item-3{top:133px;right:-37px}.faith-gateway-item.item-4{right:5px;bottom:45px}.faith-gateway-item.item-5{right:103px;bottom:-35px}.faith-gateway-item.item-6{bottom:-10px;left:62px}.faith-gateway-item.item-7{bottom:78px;left:-27px}.faith-gateway-item.item-8{top:88px;left:-37px}.faith-gateway-item.item-9{top:4px;left:57px}@media(max-width:460px){.faith-gateway-orbit{width:320px;height:320px}.faith-gateway-item{width:64px;height:64px}.faith-gateway-item span{font-size:20px}.faith-gateway-item b{max-width:58px;font-size:9px}.faith-gateway-center{top:99px;left:99px;width:120px;height:120px}.faith-gateway-item.item-1{top:-27px;left:128px}.faith-gateway-item.item-2{top:17px;right:18px}.faith-gateway-item.item-3{top:105px;right:-28px}.faith-gateway-item.item-4{right:4px;bottom:34px}.faith-gateway-item.item-5{right:82px;bottom:-29px}.faith-gateway-item.item-6{bottom:-8px;left:48px}.faith-gateway-item.item-7{bottom:61px;left:-22px}.faith-gateway-item.item-8{top:68px;left:-28px}.faith-gateway-item.item-9{top:3px;left:44px}}
</style>`);
  document.head.insertAdjacentHTML("beforeend", `<style>
.member-faith-gateway{display:block;padding:0 0 42px;background:#f4f1eb;color:#263c35;font-family:"Noto Sans KR",Arial,sans-serif}.member-faith-gateway:before{border:0;background:none}.member-faith-gateway>header{position:relative;display:block;min-height:245px;padding:42px 28px 70px;box-sizing:border-box;overflow:hidden;background:linear-gradient(145deg,#092f2a,#105744 65%,#287863);color:#fff;text-align:left}.member-faith-gateway>header:after{position:absolute;right:-65px;bottom:-115px;width:260px;height:260px;border:1px solid rgba(255,225,147,.18);border-radius:50%;content:""}.faith-gateway-cross{display:grid;width:46px;height:46px;margin-bottom:21px;place-items:center;border:1px solid rgba(255,230,170,.45);border-radius:15px;background:rgba(255,255,255,.1);color:#f5d88b;font-family:Georgia,serif;font-size:25px;box-shadow:0 8px 25px rgba(0,0,0,.14)}.member-faith-gateway>header small{color:#e8cc83;font-size:9px;font-weight:800;letter-spacing:3px}.member-faith-gateway>header h1{margin:11px 0 9px;color:#fff;font-family:Georgia,"Noto Serif KR",serif;font-size:27px;line-height:1.42}.member-faith-gateway>header p{margin:0;color:#d1e2dc;font-size:11px;letter-spacing:0}.faith-gateway-glass{position:absolute;z-index:2;top:20px;right:18px;display:grid;width:100px;height:100px;grid-template-columns:1fr 1fr;gap:3px;opacity:.22;transform:rotate(12deg);pointer-events:none}.faith-gateway-glass i{border-radius:45% 8%;background:#f0c760}.faith-gateway-glass i:nth-child(2){background:#77b7dc}.faith-gateway-glass i:nth-child(3){background:#9d79c4}.faith-gateway-glass i:nth-child(4){background:#e88378}.faith-gateway-dashboard{position:relative;z-index:3;width:min(100% - 28px,620px);margin:-40px auto 0}.faith-gateway-home,.faith-gateway-parish{position:relative;display:grid;width:100%;grid-template-columns:1fr auto;padding:18px 20px;border:1px solid #dce6e1;border-radius:17px;background:#fff;color:#263c35;text-align:left;box-shadow:0 12px 30px rgba(18,61,48,.12);cursor:pointer}.faith-gateway-home span{grid-column:1;color:#32866b;font-size:9px;font-weight:800}.faith-gateway-home strong{grid-column:1;margin-top:4px;font-family:Georgia,"Noto Serif KR",serif;font-size:18px}.faith-gateway-home small{grid-column:1;margin-top:4px;color:#84918c}.faith-gateway-home i,.faith-gateway-parish i{grid-row:1/4;grid-column:2;align-self:center;color:#4d9a81;font-size:25px;font-style:normal}.faith-gateway-dashboard>section{margin-top:22px}.faith-gateway-dashboard>section>h2{margin:0 0 10px 4px;color:#42564e;font-size:12px}.faith-gateway-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.faith-gateway-grid button{display:grid;min-height:118px;grid-template-columns:43px 1fr;align-content:center;align-items:center;gap:2px 11px;padding:15px;border:1px solid #e0e7e3;border-radius:16px;background:#fff;color:#31463e;text-align:left;box-shadow:0 4px 15px rgba(30,66,55,.055);cursor:pointer;transition:.18s}.faith-gateway-grid button:hover,.faith-gateway-grid button:focus-visible{border-color:#78bca7;transform:translateY(-2px);box-shadow:0 9px 20px rgba(27,87,68,.12)}.faith-gateway-grid button>span{display:grid;width:43px;height:43px;grid-row:1/3;place-items:center;border-radius:13px;background:#e9f2ff;color:#3975ad;font-family:Georgia,serif;font-size:19px;font-weight:800}.faith-gateway-grid button>span.violet{background:#f1ebfb;color:#7954aa}.faith-gateway-grid button>span.gold{background:#fff4d9;color:#a97512}.faith-gateway-grid button>span.green{background:#e4f4ed;color:#247459}.faith-gateway-grid button>span.rose{background:#fcebed;color:#ac5361}.faith-gateway-grid button>span.sky{background:#e6f4fa;color:#347d9d}.faith-gateway-grid button>span.red{background:#fee9e7;color:#bc4e43}.faith-gateway-grid button>span.amber{background:#fff1dc;color:#a96b16}.faith-gateway-grid button>b{align-self:end;font-size:12px}.faith-gateway-grid button>small{align-self:start;color:#87938e;font-size:8px;line-height:1.35}.faith-gateway-grid.compact button{min-height:82px}.faith-gateway-grid.compact button>span{grid-row:1}.faith-gateway-grid.compact button>b{align-self:center}.faith-gateway-parish{margin-top:18px;grid-template-columns:38px 1fr auto;align-items:center;padding:14px 17px;box-shadow:none}.faith-gateway-parish>span{grid-row:1/3;display:grid;width:32px;height:32px;place-items:center;border-radius:10px;background:#edf5f2;color:#3d806a}.faith-gateway-parish>b{grid-column:2;font-size:11px}.faith-gateway-parish>small{grid-column:2;color:#87938e;font-size:8px}.faith-gateway-parish>i{grid-row:1/3;grid-column:3}@media(max-width:430px){.member-faith-gateway>header{min-height:225px;padding:30px 22px 62px}.member-faith-gateway>header h1{font-size:24px}.faith-gateway-dashboard{width:calc(100% - 24px)}.faith-gateway-grid button{min-height:105px;padding:12px;grid-template-columns:39px 1fr;gap-left:8px}.faith-gateway-grid button>span{width:39px;height:39px}.faith-gateway-grid.compact button{min-height:76px}.faith-gateway-home{padding:16px 17px}}
</style>`);

  // src/client/pwa-install.ts
  var DISMISSED_DATE_KEY = "paxlink-pwa-install-dismissed-date";
  var mobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia("(pointer: coarse)").matches;
  var iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  var deferredInstallPrompt = null;
  var modalShown = false;
  function localDateKey() {
    const now = /* @__PURE__ */ new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  function isStandalone() {
    const pwaNavigator = navigator;
    return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || pwaNavigator.standalone === true;
  }
  function dismissedToday() {
    try {
      return localStorage.getItem(DISMISSED_DATE_KEY) === localDateKey();
    } catch {
      return false;
    }
  }
  function rememberToday() {
    try {
      localStorage.setItem(DISMISSED_DATE_KEY, localDateKey());
    } catch {
    }
  }
  async function isAlreadyInstalled() {
    if (isStandalone()) return true;
    const pwaNavigator = navigator;
    if (!pwaNavigator.getInstalledRelatedApps) return false;
    try {
      return (await pwaNavigator.getInstalledRelatedApps()).length > 0;
    } catch {
      return false;
    }
  }
  function closeInstallModal(modal2) {
    modal2.remove();
    deferredInstallPrompt = null;
  }
  async function showInstallModal() {
    if (modalShown || !mobileDevice || dismissedToday() || await isAlreadyInstalled()) return;
    if (!iosDevice && !deferredInstallPrompt) return;
    modalShown = true;
    const modal2 = document.createElement("div");
    modal2.className = "member-modal pwa-install-modal";
    modal2.setAttribute("role", "dialog");
    modal2.setAttribute("aria-modal", "true");
    modal2.setAttribute("aria-labelledby", "pwa-install-title");
    modal2.innerHTML = `
    <section class="member-modal-box">
      <div class="pwa-install-icon"><img src="/assets/paxlink-pwa-192.png" alt=""></div>
      <h3 id="pwa-install-title">Paxlink\uB97C \uC124\uCE58\uD574 \uBCF4\uC138\uC694</h3>
      <div class="member-modal-body">
        <p>\uD648 \uD654\uBA74\uC5D0\uC11C \uBC14\uB85C \uC5F4\uBA74 \uBCF8\uB2F9 \uC18C\uC2DD\uACFC \uC2E0\uC559 \uACF5\uB3D9\uCCB4\uB97C \uB354 \uD3B8\uB9AC\uD558\uAC8C \uB9CC\uB0A0 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p>
        ${iosDevice ? '<p class="pwa-install-guide"><b>\uACF5\uC720</b> \uBC84\uD2BC\uC744 \uB204\uB978 \uB4A4 <b>\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00</b>\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.</p>' : ""}
        <label class="pwa-install-today"><input type="checkbox"> \uC624\uB298 \uD558\uB8E8 \uC548 \uBCF4\uAE30</label>
      </div>
      <footer class="pwa-install-actions">
        <button type="button" class="green-outline" data-pwa-close>\uB2E4\uC74C\uC5D0</button>
        <button type="button" class="green-button" data-pwa-install>${iosDevice ? "\uD655\uC778" : "\uC124\uCE58\uD558\uAE30"}</button>
      </footer>
    </section>`;
    document.body.append(modal2);
    const today = modal2.querySelector(".pwa-install-today input");
    const close = () => {
      if (today.checked) rememberToday();
      closeInstallModal(modal2);
    };
    modal2.querySelector("[data-pwa-close]").addEventListener("click", close);
    modal2.addEventListener("click", (event) => {
      if (event.target === modal2) close();
    });
    modal2.querySelector("[data-pwa-install]").addEventListener("click", async () => {
      if (today.checked) rememberToday();
      if (iosDevice || !deferredInstallPrompt) {
        closeInstallModal(modal2);
        return;
      }
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === "accepted") closeInstallModal(modal2);
    });
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    void showInstallModal();
  });
  window.addEventListener("appinstalled", () => {
    document.querySelector(".pwa-install-modal")?.remove();
    deferredInstallPrompt = null;
  });
  window.addEventListener("load", () => {
    if (iosDevice) void showInstallModal();
  });

  // src/client/parishioner-suggestions.ts
  var labels = { like: "\u{1F44D} \uC88B\uC544\uC694", best: "\u{1F31F} \uCD5C\uACE0\uC608\uC694", cheer: "\u{1F4AA} \uD798\uB0B4\uC694", funny: "\u{1F604} \uC6C3\uACA8\uC694", cool: "\u2728 \uBA4B\uC838\uC694", dislike: "\u{1F44E} \uBCC4\uB85C\uC608\uC694" };
  var esc2 = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  async function api2(url, init) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers ?? {} } }), data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  function fileData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("\uCCA8\uBD80\uD30C\uC77C\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      reader.readAsDataURL(file);
    });
  }
  var suggestions = [];
  var visibleCount = 2;
  var editableIds = /* @__PURE__ */ new Set();
  function mount() {
    const tabs = document.querySelector(".member-sharing-tabs"), sharing = document.querySelector(".member-sharing");
    if (!tabs || !sharing || tabs.querySelector('[data-member-sharing="suggestion"]')) return;
    tabs.insertAdjacentHTML("beforeend", '<button data-member-sharing="suggestion" type="button" role="tab" aria-selected="false">\uC81C\uC548\uD558\uAE30</button>');
    sharing.insertAdjacentHTML("beforeend", '<div class="member-sharing-panel suggestion-panel" data-member-sharing-panel="suggestion" hidden><form id="suggestion-form"><header><div><h3>\uC131\uB2F9\uC5D0 \uC81C\uC548\uD558\uAE30</h3><p>\uB354 \uC88B\uC740 \uACF5\uB3D9\uCCB4\uB97C \uC704\uD55C \uC758\uACAC\uC744 \uC790\uC720\uB86D\uAC8C \uC81C\uC548\uD574 \uC8FC\uC138\uC694.</p></div><button class="green-button" type="submit">\uC81C\uC548 \uC81C\uCD9C</button></header><label>\uC81C\uBAA9<input name="title" maxlength="200" required></label><label>\uB0B4\uC6A9<textarea name="content" rows="6" maxlength="20000" required></textarea></label><label>\uD0DC\uADF8<input name="tags" maxlength="1000" placeholder="\uC27C\uD45C \uB610\uB294 \uB744\uC5B4\uC4F0\uAE30\uB85C \uAD6C\uBD84"></label><label>\uCCA8\uBD80\uD30C\uC77C <small>\uCD5C\uB300 5MB</small><input name="attachment" type="file"></label><label class="suggestion-anonymous"><input name="anonymous" type="checkbox"> \uC775\uBA85\uC73C\uB85C \uC81C\uC548</label><p class="suggestion-error"></p></form><header class="suggestion-list-head"><h3>\uC81C\uC548 \uBAA9\uB85D</h3><span></span><button class="green-outline suggestion-refresh" type="button">\uC0C8\uB85C\uACE0\uCE68</button></header><div class="suggestion-list"></div><button class="green-outline suggestion-more" type="button" hidden>more</button></div>');
    const button = tabs.querySelector('[data-member-sharing="suggestion"]'), form = sharing.querySelector("#suggestion-form");
    button.onclick = () => {
      document.querySelectorAll("[data-member-sharing]").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-member-sharing-panel]").forEach((panel2) => panel2.hidden = panel2.dataset.memberSharingPanel !== "suggestion");
      void load(true);
    };
    form.onsubmit = submit;
    sharing.querySelector(".suggestion-refresh").onclick = () => void load(true);
    sharing.querySelector(".suggestion-more").onclick = () => {
      visibleCount = Math.min(visibleCount + 2, suggestions.length);
      renderList();
    };
    enhanceTagPreview();
    void load(true);
  }
  function enhanceTagPreview() {
    const form = document.querySelector("#suggestion-form"), input = form?.querySelector('[name="tags"]');
    if (!form || !input || input.dataset.previewReady) return;
    input.dataset.previewReady = "true";
    const preview = document.createElement("div");
    preview.className = "suggestion-tag-preview";
    preview.hidden = true;
    input.insertAdjacentElement("afterend", preview);
    const render = () => {
      const tags = [...new Set(input.value.split(/[,\s]+/).map((value) => value.replace(/^#/, "").trim()).filter(Boolean))].slice(0, 20);
      preview.innerHTML = tags.map((tag) => `<span>#${esc2(tag)}</span>`).join("");
      preview.hidden = !tags.length;
    };
    input.oninput = render;
    form.addEventListener("reset", () => queueMicrotask(render));
    render();
  }
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget, error = form.querySelector(".suggestion-error"), file = form.attachment.files?.[0];
    error.textContent = "";
    if (file && file.size > 5 * 1024 * 1024) {
      error.textContent = "\uCCA8\uBD80\uD30C\uC77C\uC740 5MB \uC774\uD558\uB85C \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.";
      return;
    }
    try {
      await api2("/api/parishioner/suggestions", { method: "POST", body: JSON.stringify({ title: form.title.value, content: form.content.value, tags: form.tags.value, anonymous: form.anonymous.checked, attachment: file ? { name: file.name, type: file.type, data: await fileData(file) } : null }) });
      form.reset();
      await load(true);
    } catch (errorValue) {
      error.textContent = errorValue.message;
    }
  }
  async function load(reset = false) {
    const list = document.querySelector(".suggestion-list");
    if (!list) return;
    try {
      const [items, editable] = await Promise.all([api2("/api/parishioner/suggestions"), api2("/api/parishioner/suggestions-editable")]);
      suggestions = items;
      editableIds = new Set(editable);
      if (reset) visibleCount = 2;
      renderList();
    } catch (error) {
      list.textContent = error.message;
    }
  }
  function renderList() {
    const list = document.querySelector(".suggestion-list"), more = document.querySelector(".suggestion-more"), count = document.querySelector(".suggestion-list-head span");
    if (!list || !more || !count) return;
    count.textContent = `\uCD1D ${suggestions.length}\uAC74`;
    list.innerHTML = suggestions.length ? suggestions.slice(0, visibleCount).map((item) => `<article class="suggestion-summary"><header><div><b>${esc2(item.authorName)}</b><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></div><span class="status ${item.status}">${item.status === "requested" ? "\uAC80\uD1A0 \uC911" : item.status === "approved" ? "\uC2B9\uC778" : "\uBC18\uB824"}</span></header><h3>${esc2(item.title)}</h3><p>${esc2(item.content.slice(0, 150))}${item.content.length > 150 ? "\u2026" : ""}</p>${item.tags.length ? `<div class="suggestion-tags">${item.tags.map((tag) => `<span>#${esc2(tag)}</span>`).join("")}</div>` : ""}<footer><span>\uD3C9\uAC00 ${item.reactions.reduce((sum, value) => sum + value.count, 0)} \xB7 \uB313\uAE00 ${item.comments.length}</span><button class="green-outline" data-suggestion-detail="${item.id}" type="button">\uC0C1\uC138\uBCF4\uAE30</button></footer></article>`).join("") : '<p class="suggestion-empty">\uB4F1\uB85D\uB41C \uC81C\uC548\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    more.hidden = visibleCount >= suggestions.length;
    list.querySelectorAll("[data-suggestion-detail]").forEach((button) => button.onclick = () => openDetail(Number(button.dataset.suggestionDetail)));
  }
  function openDetail(id) {
    const item = suggestions.find((value) => value.id === id);
    if (!item) return;
    document.querySelector(".suggestion-detail-member-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal suggestion-detail-member-modal";
    layer.innerHTML = `<section class="member-modal-box"><header class="suggestion-detail-head"><h3>${esc2(item.title)}</h3><button type="button" aria-label="\uB2EB\uAE30">\xD7</button></header><div class="member-modal-body"><section class="suggestion-detail-meta"><b>${esc2(item.authorName)}</b><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time><span class="status ${item.status}">${item.status === "requested" ? "\uAC80\uD1A0 \uC911" : item.status === "approved" ? "\uC2B9\uC778" : "\uBC18\uB824"}</span></section><article class="suggestion-detail-content">${esc2(item.content)}</article>${item.tags.length ? `<div class="suggestion-tags">${item.tags.map((tag) => `<span>#${esc2(tag)}</span>`).join("")}</div>` : ""}${item.attachmentName ? `<a class="suggestion-file" href="/api/parishioner/suggestions/${item.id}/attachment">\u{1F4CE} ${esc2(item.attachmentName)}</a>` : ""}${item.decisionExplanation ? `<section class="suggestion-decision"><b>\uC131\uB2F9 \uACB0\uC815 \uBC0F \uC124\uBA85</b><p>${esc2(item.decisionExplanation)}</p>${item.actionContent ? `<strong>\uC870\uCE58 \uB0B4\uC6A9</strong><p>${esc2(item.actionContent)}</p>` : ""}</section>` : ""}<div class="suggestion-reactions">${Object.entries(labels).map(([key, label]) => `<button class="${item.myReaction === key ? "selected" : ""}" data-reaction="${key}" type="button">${label} <b>${item.reactions.find((value) => value.reaction === key)?.count ?? 0}</b></button>`).join("")}</div><section class="suggestion-comments"><h4>\uB313\uAE00 ${item.comments.length}\uAC1C</h4>${item.comments.map((comment) => `<article><b>${esc2(comment.authorName)}</b><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time><p>${esc2(comment.content)}</p></article>`).join("")}<form><input maxlength="2000" required placeholder="\uB313\uAE00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"><button class="green-outline" type="submit">\uB4F1\uB85D</button></form></section></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    const close = () => layer.remove();
    layer.querySelector(".suggestion-detail-head button").onclick = close;
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = close;
    layer.querySelectorAll("[data-reaction]").forEach((button) => button.onclick = async () => {
      await api2(`/api/parishioner/suggestions/${id}/reaction`, { method: "PUT", body: JSON.stringify({ reaction: button.dataset.reaction }) });
      await load();
      layer.remove();
      openDetail(id);
    });
    layer.querySelector(".suggestion-comments form").onsubmit = async (event) => {
      event.preventDefault();
      const input = event.currentTarget.querySelector("input");
      await api2(`/api/parishioner/suggestions/${id}/comments`, { method: "POST", body: JSON.stringify({ content: input.value }) });
      await load();
      layer.remove();
      openDetail(id);
    };
  }
  function enhanceEditButton() {
    const layer = document.querySelector(".suggestion-detail-member-modal");
    if (!layer || layer.dataset.editReady) return;
    const title = layer.querySelector(".suggestion-detail-head h3")?.textContent, item = suggestions.find((value) => value.title === title);
    layer.dataset.editReady = "true";
    if (!item || !editableIds.has(item.id)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "green-button suggestion-edit-button";
    button.textContent = "\uC81C\uC548 \uC218\uC815";
    button.onclick = () => {
      layer.remove();
      openEdit(item);
    };
    layer.querySelector(":scope>.member-modal-box>footer").append(button);
  }
  function openEdit(item) {
    const layer = document.createElement("div");
    layer.className = "member-modal suggestion-edit-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uC81C\uC548 \uC218\uC815</h3><form><label>\uC81C\uBAA9<input name="title" maxlength="200" required value="${esc2(item.title)}"></label><label>\uB0B4\uC6A9<textarea name="content" rows="8" maxlength="20000" required>${esc2(item.content)}</textarea></label><label>\uD0DC\uADF8<input name="tags" maxlength="1000" value="${esc2(item.tags.join(", "))}"></label><label class="suggestion-anonymous"><input name="anonymous" type="checkbox" ${item.authorName === "\uC775\uBA85" ? "checked" : ""}> \uC775\uBA85\uC73C\uB85C \uC81C\uC548</label><p></p><footer><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uC218\uC815 \uC800\uC7A5</button></footer></form></section>`;
    document.body.append(layer);
    layer.querySelector('button[type="button"]').onclick = () => layer.remove();
    layer.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget, error = form.querySelector("p");
      try {
        await api2(`/api/parishioner/suggestions/${item.id}`, { method: "PATCH", body: JSON.stringify({ title: form.title.value, content: form.content.value, tags: form.tags.value, anonymous: form.anonymous.checked }) });
        layer.remove();
        await load(true);
      } catch (reason) {
        error.textContent = reason.message;
      }
    };
  }
  function alignSuggestionSummaryCards() {
    document.querySelectorAll(".suggestion-summary:not([data-summary-aligned])").forEach((card) => {
      const header = card.querySelector(":scope>header"), title = card.querySelector(":scope>h3"), status = header?.querySelector(".status"), detail = card.querySelector("[data-suggestion-detail]");
      if (!header || !title || !status || !detail) return;
      card.dataset.summaryAligned = "true";
      const titleRow = document.createElement("div");
      titleRow.className = "suggestion-summary-title-row";
      header.insertAdjacentElement("beforebegin", titleRow);
      titleRow.append(title, status);
      header.classList.add("suggestion-summary-author-row");
      detail.classList.add("suggestion-summary-detail");
    });
  }
  new MutationObserver(() => {
    mount();
    enhanceEditButton();
    alignSuggestionSummaryCards();
  }).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => {
    mount();
    alignSuggestionSummaryCards();
  });
  document.head.insertAdjacentHTML("beforeend", "<style>.suggestion-panel{display:block!important;padding:0!important;border:0!important;background:transparent!important}.suggestion-panel[hidden]{display:none!important}#suggestion-form,.suggestion-summary{padding:20px;border:1px solid var(--line);border-radius:13px;background:#fff}#suggestion-form header,.suggestion-list-head,.suggestion-summary>header,.suggestion-summary>header>div,.suggestion-summary>footer,.suggestion-detail-meta{display:flex;align-items:center;gap:10px}#suggestion-form header,.suggestion-summary>header,.suggestion-summary>footer{justify-content:space-between}#suggestion-form label{display:block;margin-top:11px;font-size:11px;font-weight:700}#suggestion-form input:not([type=checkbox]),#suggestion-form textarea{width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:8px}.suggestion-anonymous{display:flex!important;align-items:center;gap:7px}.suggestion-anonymous input{width:15px;height:15px}.suggestion-error{color:#d94350}.suggestion-list-head{margin:22px 0 10px}.suggestion-list-head>span{margin-left:auto}.suggestion-refresh{width:auto!important;height:34px;padding:0 13px}.suggestion-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.suggestion-summary{display:flex;min-width:0;flex-direction:column;box-shadow:0 3px 12px rgba(20,70,54,.04)}.suggestion-summary h3{margin:14px 0 7px}.suggestion-summary>p{display:-webkit-box;min-height:42px;margin:0;overflow:hidden;color:#50615a;line-height:1.7;-webkit-box-orient:vertical;-webkit-line-clamp:3}.suggestion-summary time,.suggestion-comments time{color:var(--muted);font-size:9px}.suggestion-summary .status,.suggestion-detail-meta .status{margin-left:auto;padding:4px 8px;border-radius:11px;background:var(--soft);color:var(--green);font-size:9px}.status.rejected{background:#fff0f1!important;color:#c43b48!important}.suggestion-summary>footer{margin-top:auto;padding-top:14px}.suggestion-summary>footer button{width:auto;height:34px;padding:0 13px}.suggestion-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.suggestion-tags span,.suggestion-tag-preview span{padding:4px 9px;border:1px solid #a8d8c8;border-radius:13px;background:#fff;color:var(--green);font-size:9px}.suggestion-more{display:block;width:145px;margin:16px auto 0}.suggestion-more[hidden]{display:none}.suggestion-tag-preview{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding:9px 10px;border:1px dashed #b9dace;border-radius:8px;background:#f1faf7}.suggestion-tag-preview[hidden]{display:none}.suggestion-detail-member-modal .member-modal-box{display:flex;width:min(94vw,850px);max-height:90vh;flex-direction:column;overflow:hidden;text-align:left}.suggestion-detail-head{display:flex;flex:0 0 auto;align-items:center;justify-content:center;padding:20px 60px;background:var(--green);color:#fff}.suggestion-detail-head h3{margin:0}.suggestion-detail-head button{position:absolute;right:20px;border:0;background:none;color:#fff;font-size:25px}.suggestion-detail-member-modal .member-modal-body{padding:22px;overflow-y:auto}.suggestion-detail-content{margin-top:15px;padding:17px;border-radius:10px;background:#f7faf9;line-height:1.85;white-space:pre-wrap}.suggestion-file{display:inline-block;margin-top:12px;color:var(--green)}.suggestion-decision{margin-top:14px;padding:14px;border-left:3px solid var(--green);background:#f6faf8}.suggestion-decision p{white-space:pre-wrap}.suggestion-reactions{display:flex;flex-wrap:wrap;gap:6px;margin-top:15px}.suggestion-reactions button{padding:6px 9px;border:1px solid var(--line);border-radius:15px;background:#fff}.suggestion-reactions button.selected{border-color:var(--green);background:var(--soft);color:var(--green)}.suggestion-comments{margin-top:15px;padding-top:12px;border-top:1px solid var(--line)}.suggestion-comments article{margin-top:6px;padding:9px;background:#f8faf9}.suggestion-comments article p{margin:5px 0;white-space:pre-wrap}.suggestion-comments form{display:flex;gap:7px;margin-top:9px}.suggestion-comments form input{flex:1;padding:9px;border:1px solid var(--line);border-radius:7px}.suggestion-detail-member-modal>.member-modal-box>footer{display:flex;flex:0 0 auto;justify-content:center;padding:12px;border-top:1px solid var(--line)}@media(max-width:700px){.suggestion-list{grid-template-columns:1fr}.suggestion-detail-member-modal .member-modal-body{padding:14px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>#suggestion-form>header{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;column-gap:12px}#suggestion-form>header>div{min-width:0}#suggestion-form>header h3{margin:0;white-space:nowrap}#suggestion-form>header p{margin:6px 0 0}#suggestion-form>header>button{width:auto!important;min-width:82px;height:36px;padding:0 13px;white-space:nowrap}@media(max-width:400px){#suggestion-form{padding:16px}#suggestion-form>header{column-gap:8px}#suggestion-form>header h3{font-size:13px}#suggestion-form>header p{font-size:9px}#suggestion-form>header>button{min-width:76px;height:34px;padding:0 10px;font-size:10px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.suggestion-summary-title-row{display:flex;min-width:0;align-items:center;gap:8px}.suggestion-summary-title-row h3{min-width:0;flex:1;margin:0!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.suggestion-summary-title-row .status{flex:0 0 auto;margin-left:auto}.suggestion-summary-author-row{justify-content:flex-start!important;margin-top:6px}.suggestion-summary-author-row>div{display:flex;min-width:0;align-items:center;gap:7px}.suggestion-summary-author-row b{font-size:10px}.suggestion-summary-author-row time{white-space:nowrap}.suggestion-summary-detail{width:auto!important;height:28px!important;padding:0 11px!important;border-radius:8px!important;font-size:9px!important;white-space:nowrap}@media(max-width:600px){.suggestion-summary-detail{height:26px!important;padding:0 9px!important}.suggestion-summary-author-row b{font-size:9px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.suggestion-list-head h3,.suggestion-list-head>span,.suggestion-list-head .suggestion-refresh{font-size:14px!important}.suggestion-list-head .suggestion-refresh{height:38px;padding:0 14px;font-weight:700}@media(max-width:600px){.suggestion-list-head h3,.suggestion-list-head>span,.suggestion-list-head .suggestion-refresh{font-size:12px!important}.suggestion-list-head .suggestion-refresh{height:34px;padding:0 12px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-pilgrimage-more,.member-video-more,.received-prayer-more,.member-schedule-more,.member-notice-more,.suggestion-more,#suggestion-form>header>button{font-size:14px!important}@media(max-width:400px){#suggestion-form>header h3,#suggestion-form>header>button,.member-pilgrimage-more,.member-video-more,.received-prayer-more,.member-schedule-more,.member-notice-more,.suggestion-more{font-size:13px!important}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.suggestion-edit-modal .member-modal-box{width:min(94vw,650px);text-align:left}.suggestion-edit-modal .member-modal-box>h3{text-align:center}.suggestion-edit-modal form{display:grid;gap:11px;padding:22px}.suggestion-edit-modal form>label{font-size:11px;font-weight:700}.suggestion-edit-modal form input:not([type=checkbox]),.suggestion-edit-modal form textarea{width:100%;margin-top:6px;padding:10px;border:1px solid var(--line);border-radius:8px}.suggestion-edit-modal form>p{margin:0;color:#d94350}.suggestion-edit-modal footer{display:flex;justify-content:center;gap:8px}.suggestion-edit-button{width:auto!important}</style>");

  // src/client/parishioner-schedule.ts
  var memberCategoryLabels = { mass: "\uBBF8\uC0AC", sacrament: "\uC131\uC0AC", devotion: "\uC2E0\uC2EC", liturgical: "\uC804\uB840\uB825", other: "\uAE30\uD0C0" };
  var memberEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  var memberScheduleMonth = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1);
  var memberSchedules = [];
  var visibleMemberScheduleCount = 2;
  var memberDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  function mountMemberSchedule() {
    const notices = document.querySelector(".member-notices");
    if (!notices || document.querySelector(".member-schedule-section")) return;
    notices.insertAdjacentHTML("beforebegin", '<section class="member-schedule-section"><header><div><h2>\uC131\uB2F9 \uC77C\uC815</h2><p>\uBCF8\uB2F9\uC758 \uBBF8\uC0AC, \uC131\uC0AC, \uC2E0\uC2EC \uBC0F \uC8FC\uC694 \uC77C\uC815\uC744 \uD655\uC778\uD558\uC138\uC694.</p></div><button class="green-outline member-schedule-today" type="button">\uC624\uB298</button></header><div class="member-calendar-toolbar"><button data-member-month="prev" type="button">\u2039</button><h3></h3><button data-member-month="next" type="button">\u203A</button></div><div class="member-calendar"><div class="member-calendar-week"><b>\uC77C</b><b>\uC6D4</b><b>\uD654</b><b>\uC218</b><b>\uBAA9</b><b>\uAE08</b><b>\uD1A0</b></div><div class="member-calendar-days"></div></div></section>');
    const section = document.querySelector(".member-schedule-section");
    section.querySelector('[data-member-month="prev"]').onclick = () => changeMemberMonth(-1);
    section.querySelector('[data-member-month="next"]').onclick = () => changeMemberMonth(1);
    section.querySelector(".member-schedule-today").onclick = () => {
      const now = /* @__PURE__ */ new Date();
      memberScheduleMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      void loadMemberSchedule();
    };
    void loadMemberSchedule();
  }
  async function changeMemberMonth(amount) {
    memberScheduleMonth = new Date(memberScheduleMonth.getFullYear(), memberScheduleMonth.getMonth() + amount, 1);
    await loadMemberSchedule();
  }
  async function loadMemberSchedule() {
    const section = document.querySelector(".member-schedule-section");
    if (!section) return;
    const month = memberDateKey(memberScheduleMonth).slice(0, 7);
    try {
      const response = await fetch(`/api/parishioner/schedules?month=${month}`), data = await response.json();
      if (!response.ok) throw new Error(data.message || "\uC77C\uC815\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      memberSchedules = data;
      visibleMemberScheduleCount = 2;
      renderMemberSchedule();
    } catch (error) {
      section.querySelector(".member-calendar-days").textContent = error.message;
    }
  }
  function renderMemberSchedule() {
    const section = document.querySelector(".member-schedule-section");
    section.querySelector(".member-calendar-toolbar h3").textContent = `${memberScheduleMonth.getFullYear()}\uB144 ${memberScheduleMonth.getMonth() + 1}\uC6D4`;
    const first = new Date(memberScheduleMonth.getFullYear(), memberScheduleMonth.getMonth(), 1), start = new Date(first);
    start.setDate(1 - first.getDay());
    const today = memberDateKey(/* @__PURE__ */ new Date()), days = section.querySelector(".member-calendar-days");
    days.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = memberDateKey(day), items = memberSchedules.filter((item) => item.scheduleDate === key);
      return `<button class="member-calendar-day ${day.getMonth() !== memberScheduleMonth.getMonth() ? "outside" : ""} ${key === today ? "today" : ""} ${items.length ? "has-schedule" : ""}" data-member-date="${key}" type="button"><span>${day.getDate()}</span><div>${items.slice(0, 2).map((item) => `<em class="${item.category}">${memberCategoryLabels[item.category]}${item.scheduleType ? `\xB7${memberEscape(item.scheduleType)}` : ""} ${memberEscape(item.title)}</em>`).join("")}${items.length > 2 ? `<small>+${items.length - 2}</small>` : ""}</div></button>`;
    }).join("");
    days.querySelectorAll("[data-member-date]").forEach((button) => button.onclick = () => openMemberScheduleDay(button.dataset.memberDate));
  }
  function openMemberScheduleDay(date, scheduleId) {
    const items = memberSchedules.filter((item) => item.scheduleDate === date && (!scheduleId || item.id === scheduleId));
    if (!items.length) return;
    const layer = document.createElement("div");
    layer.className = "member-modal member-schedule-modal";
    if (scheduleId) layer.dataset.scheduleId = String(scheduleId);
    layer.innerHTML = `<section class="member-modal-box"><h3>${date} \uC77C\uC815</h3><div class="member-modal-body">${items.map((item) => `<article class="${item.category}"><header><span>${memberCategoryLabels[item.category]}${item.scheduleType ? ` \xB7 ${memberEscape(item.scheduleType)}` : ""}</span><time>${item.startTime ?? "\uC2DC\uAC04 \uBBF8\uC815"}${item.endTime ? ` ~ ${item.endTime}` : ""}</time></header><h4>${memberEscape(item.title)}</h4>${item.location ? `<p class="member-schedule-location">\uC7A5\uC18C \xB7 ${memberEscape(item.location)}</p>` : ""}${item.content ? `<p>${memberEscape(item.content)}</p>` : ""}${item.attachmentName ? `<a class="member-schedule-attachment" href="/api/parishioner/schedules/${item.id}/attachment">\u{1F4CE} ${memberEscape(item.attachmentName)}</a>` : ""}</article>`).join("")}</div><footer><div class="member-schedule-actions"></div><button class="green-outline" data-close type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("[data-close]").onclick = () => layer.remove();
  }
  function nextMemberDate(date) {
    const value = /* @__PURE__ */ new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + 1);
    return memberDateKey(value);
  }
  function googleCalendarUrl(item) {
    const compact = (value) => value.replace(/[-:]/g, "");
    const dates = item.startTime ? `${compact(item.scheduleDate)}T${compact(item.startTime)}00/${compact(item.scheduleDate)}T${compact(item.endTime || item.startTime)}00` : `${compact(item.scheduleDate)}/${compact(nextMemberDate(item.scheduleDate))}`;
    const details = [`${memberCategoryLabels[item.category]}${item.scheduleType ? ` \xB7 ${item.scheduleType}` : ""}`, item.content ?? ""].filter(Boolean).join("\n");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item.title)}&dates=${dates}&ctz=Asia%2FSeoul&details=${encodeURIComponent(details)}&location=${encodeURIComponent(item.location ?? "")}`;
  }
  function saveIcs(item) {
    const stamp = (value) => value.replace(/[-:]/g, "").replace("T", "");
    const escapeIcs = (value) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const start = item.startTime ? `DTSTART;TZID=Asia/Seoul:${stamp(`${item.scheduleDate}T${item.startTime}00`)}` : `DTSTART;VALUE=DATE:${stamp(item.scheduleDate)}`, end = item.startTime ? `DTEND;TZID=Asia/Seoul:${stamp(`${item.scheduleDate}T${item.endTime || item.startTime}00`)}` : `DTEND;VALUE=DATE:${stamp(nextMemberDate(item.scheduleDate))}`, ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Paxlink//Parish Schedule//KO", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:paxlink-parish-${item.id}@paxlink`, start, end, `SUMMARY:${escapeIcs(item.title)}`, `DESCRIPTION:${escapeIcs(item.content ?? "")}`, `LOCATION:${escapeIcs(item.location ?? "")}`, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${escapeIcs(item.title)} \uC77C\uC815\uC774 \uB0B4\uC77C \uC788\uC2B5\uB2C8\uB2E4.`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n"), url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" })), anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${item.scheduleDate}-${item.title.replace(/[\\/:*?"<>|]/g, "-")}.ics`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function enhanceMemberCalendarSave() {
    const modal2 = document.querySelector(".member-schedule-modal");
    if (!modal2 || modal2.dataset.calendarSaveReady) return;
    modal2.dataset.calendarSaveReady = "true";
    const date = modal2.querySelector("h3")?.textContent?.slice(0, 10) ?? "", scheduleId = Number(modal2.dataset.scheduleId), items = memberSchedules.filter((item) => item.scheduleDate === date && (!scheduleId || item.id === scheduleId)), actions = modal2.querySelector(".member-schedule-actions"), isAndroid = /Android/i.test(navigator.userAgent), isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "green-outline member-calendar-save";
      button.dataset.scheduleId = String(item.id);
      button.textContent = isAndroid ? "Google \uC77C\uC815\uC5D0 \uB4F1\uB85D" : isApple ? "Apple \uCE98\uB9B0\uB354\uC5D0 \uB4F1\uB85D" : "\uAE30\uAE30 \uCE98\uB9B0\uB354\uC5D0 \uC800\uC7A5";
      button.onclick = () => {
        if (isAndroid) window.open(googleCalendarUrl(item), "_blank", "noopener");
        else saveIcs(item);
      };
      actions.append(button);
    });
  }
  async function enhanceMassGraceDiaryButtons() {
    const modal2 = document.querySelector(".member-schedule-modal");
    if (!modal2 || modal2.dataset.massDiaryReady) return;
    modal2.dataset.massDiaryReady = "true";
    const date = modal2.querySelector("h3")?.textContent?.slice(0, 10) ?? "", scheduleId = Number(modal2.dataset.scheduleId), items = memberSchedules.filter((item) => item.scheduleDate === date && (!scheduleId || item.id === scheduleId)), actions = modal2.querySelector(".member-schedule-actions"), massItems = items.filter((item) => item.category === "mass"), buttons = /* @__PURE__ */ new Map();
    massItems.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "green-outline member-mass-diary";
      button.disabled = true;
      button.textContent = "\uD655\uC778 \uC911...";
      button.onclick = () => {
        modal2.remove();
        document.dispatchEvent(new CustomEvent("member:personal-grace-diary", { detail: { scheduleId: item.id, scheduleDate: item.scheduleDate, title: item.title, scheduleType: item.scheduleType } }));
      };
      buttons.set(item.id, button);
      actions.append(button);
    });
    if (!massItems.length) return;
    try {
      const response = await fetch("/api/parishioner/grace-diaries"), data = await response.json();
      if (!response.ok) throw new Error(data.message || "\uC740\uCD1D\uC77C\uAE30 \uAE30\uB85D\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      const completed = new Set(data.map((item) => Number(item.sourceScheduleId)).filter(Boolean));
      massItems.forEach((item) => {
        const button = buttons.get(item.id);
        button.disabled = completed.has(item.id);
        button.textContent = button.disabled ? "\uC740\uCD1D\uC77C\uAE30 \uC791\uC131\uC644\uB8CC" : "\uC740\uCD1D\uC77C\uAE30 \uC791\uC131";
      });
    } catch {
      massItems.forEach((item) => {
        const button = buttons.get(item.id);
        button.disabled = true;
        button.textContent = "\uC791\uC131 \uC5EC\uBD80 \uD655\uC778 \uC2E4\uD328";
      });
    }
  }
  function trackMemberScheduleSaves() {
    const modal2 = document.querySelector(".member-schedule-modal");
    if (!modal2 || modal2.dataset.saveTracked) return;
    modal2.dataset.saveTracked = "true";
    modal2.querySelectorAll(".member-calendar-save").forEach((button) => {
      const id = Number(button.dataset.scheduleId);
      if (!id) return;
      button.addEventListener("click", () => {
        void fetch(`/api/parishioner/schedules/${id}/save`, { method: "POST", headers: { "Content-Type": "application/json" } });
      }, { capture: true });
    });
  }
  function enhanceMemberScheduleViews() {
    const section = document.querySelector(".member-schedule-section");
    if (!section) return;
    if (!section.querySelector(".member-schedule-view-tabs")) {
      section.querySelector(":scope>header").insertAdjacentHTML("afterend", '<nav class="member-schedule-view-tabs"><button class="active" data-schedule-view="blocks" type="button">\uBAA9\uB85D\uC73C\uB85C \uBCF4\uAE30</button><button data-schedule-view="calendar" type="button">\uB2EC\uB825\uC73C\uB85C \uBCF4\uAE30</button></nav><div class="member-schedule-blocks"></div><button class="green-outline member-schedule-more" type="button" hidden>more</button>');
      section.dataset.scheduleView = "blocks";
      section.querySelectorAll("[data-schedule-view]").forEach((button) => button.onclick = () => {
        const view = button.dataset.scheduleView;
        section.dataset.scheduleView = view;
        section.querySelectorAll("[data-schedule-view]").forEach((tab) => tab.classList.toggle("active", tab === button));
        syncMemberScheduleView();
      });
      section.querySelector(".member-schedule-more").onclick = () => {
        visibleMemberScheduleCount += 2;
        renderMemberScheduleBlocks();
      };
    }
    const signature = `${memberDateKey(memberScheduleMonth).slice(0, 7)}:${visibleMemberScheduleCount}:${memberSchedules.map((item) => item.id).join(",")}`;
    if (section.dataset.blockSignature !== signature) {
      section.dataset.blockSignature = signature;
      renderMemberScheduleBlocks();
    }
    syncMemberScheduleView();
  }
  function memberScheduleDates() {
    const today = memberDateKey(/* @__PURE__ */ new Date());
    return [...new Set(memberSchedules.filter((item) => item.scheduleDate >= today).map((item) => item.scheduleDate))];
  }
  function renderMemberScheduleBlocks() {
    const section = document.querySelector(".member-schedule-section");
    if (!section) return;
    section.dataset.blockSignature = `${memberDateKey(memberScheduleMonth).slice(0, 7)}:${visibleMemberScheduleCount}:${memberSchedules.map((item) => item.id).join(",")}`;
    const blocks = section.querySelector(".member-schedule-blocks"), more = section.querySelector(".member-schedule-more");
    if (!blocks || !more) return;
    const dates = memberScheduleDates(), visibleDates = new Set(dates.slice(0, visibleMemberScheduleCount)), visibleItems = memberSchedules.filter((item) => visibleDates.has(item.scheduleDate));
    blocks.innerHTML = visibleItems.length ? visibleItems.map((item) => `<button class="member-schedule-block ${item.category}" data-schedule-block-date="${item.scheduleDate}" data-schedule-block-id="${item.id}" type="button"><time><b>${Number(item.scheduleDate.slice(8, 10))}</b><span>${(/* @__PURE__ */ new Date(`${item.scheduleDate}T00:00:00`)).toLocaleDateString("ko-KR", { weekday: "short" })}</span></time><div><small>${memberCategoryLabels[item.category]}${item.scheduleType ? ` \xB7 ${memberEscape(item.scheduleType)}` : ""}</small><h3>${memberEscape(item.title)}</h3><p>${item.startTime ?? "\uC2DC\uAC04 \uBBF8\uC815"}${item.endTime ? ` ~ ${item.endTime}` : ""}${item.location ? ` \xB7 ${memberEscape(item.location)}` : ""}</p></div></button>`).join("") : '<p class="member-schedule-block-empty">\uC774 \uB2EC\uC5D0 \uB4F1\uB85D\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    blocks.querySelectorAll("[data-schedule-block-date]").forEach((button) => button.onclick = () => openMemberScheduleDay(button.dataset.scheduleBlockDate, Number(button.dataset.scheduleBlockId)));
    more.hidden = section.dataset.scheduleView === "calendar" || visibleMemberScheduleCount >= dates.length;
  }
  function syncMemberScheduleView() {
    const section = document.querySelector(".member-schedule-section");
    if (!section) return;
    const calendar = section.dataset.scheduleView === "calendar";
    section.querySelector(".member-schedule-blocks").hidden = calendar;
    section.querySelector(".member-calendar-toolbar").hidden = !calendar;
    section.querySelector(".member-calendar").hidden = !calendar;
    const more = section.querySelector(".member-schedule-more");
    if (more) more.hidden = calendar || visibleMemberScheduleCount >= memberScheduleDates().length;
  }
  new MutationObserver(() => {
    mountMemberSchedule();
    enhanceMemberScheduleViews();
    enhanceMemberCalendarSave();
    enhanceMassGraceDiaryButtons();
    trackMemberScheduleSaves();
  }).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => {
    mountMemberSchedule();
    enhanceMemberScheduleViews();
  });
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-section{margin-top:22px;padding:22px;border:1px solid var(--line);border-radius:14px;background:#fff}.member-schedule-section>header{display:flex;align-items:center;justify-content:space-between}.member-schedule-section h2{margin:0 0 5px}.member-schedule-section header p{margin:0;color:var(--muted)}.member-schedule-today{flex:0 0 auto;width:auto!important;min-width:54px;padding:0 14px;white-space:nowrap}.member-calendar-toolbar{display:flex;align-items:center;justify-content:center;gap:18px;padding:14px}.member-calendar-toolbar h3{min-width:130px;margin:0;text-align:center}.member-calendar-toolbar button{width:34px;height:34px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--green);font-size:22px}.member-calendar{overflow:hidden;border:1px solid var(--line);border-radius:10px}.member-calendar-week,.member-calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.member-calendar-week{background:#f5f9f7}.member-calendar-week b{padding:9px;text-align:center}.member-calendar-week b:first-child{color:#d34c56}.member-calendar-week b:last-child{color:#3d70be}.member-calendar-day{min-height:88px;padding:6px;border:0;border-top:1px solid var(--line);border-right:1px solid var(--line);background:#fff;text-align:left}.member-calendar-day:nth-child(7n){border-right:0}.member-calendar-day.outside{background:#fafbfb;color:#adb6b2}.member-calendar-day.has-schedule{cursor:pointer}.member-calendar-day.has-schedule:hover{background:#f2faf7}.member-calendar-day.today>span{display:grid;width:23px;height:23px;place-items:center;border-radius:50%;background:var(--green);color:#fff}.member-calendar-day>div{display:grid;gap:3px;margin-top:5px}.member-calendar-day em{display:block;overflow:hidden;padding:3px 4px;border-radius:4px;background:#e9f7f1;color:#18775b;font-size:8px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.member-calendar-day em.sacrament{background:#fff3df;color:#966912}.member-calendar-day em.devotion{background:#fff0f5;color:#a74668}.member-calendar-day em.other{background:#edf2fa;color:#486489}.member-calendar-day small{font-size:8px}.member-schedule-modal .member-modal-box{display:flex;width:min(92vw,650px);max-height:86vh;flex-direction:column;overflow:hidden;text-align:left}.member-schedule-modal .member-modal-box>h3{flex:0 0 auto;text-align:center}.member-schedule-modal .member-modal-body{display:grid;gap:9px;overflow-y:auto}.member-schedule-modal article{padding:14px;border-left:3px solid var(--green);border-radius:8px;background:#f7faf9}.member-schedule-modal article header{display:flex;justify-content:space-between}.member-schedule-modal article header span{color:var(--green);font-weight:800}.member-schedule-modal article time{color:var(--muted)}.member-schedule-modal article h4{margin:9px 0}.member-schedule-modal article p{line-height:1.7;white-space:pre-wrap}.member-schedule-location{color:var(--green)}.member-schedule-modal footer{display:flex;flex:0 0 auto;justify-content:center;padding:11px;border-top:1px solid var(--line)}@media(max-width:700px){.member-schedule-section{padding:14px}.member-schedule-section>header{gap:10px}.member-schedule-section>header>div{min-width:0}.member-schedule-today{min-width:52px;padding:0 12px}.member-calendar-day{min-height:65px;padding:4px}.member-calendar-day em{font-size:7px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-calendar-save{display:block;width:auto!important;height:34px;margin:11px 0 0 auto;padding:0 13px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-modal article .member-mass-diary{display:block;width:auto!important;height:34px;margin:8px 0 0 auto;padding:0 13px;border-color:var(--green);background:var(--green);color:#fff}.member-schedule-modal article:has(.member-mass-diary) .member-calendar-save{display:inline-flex;margin-left:6px}.member-schedule-modal article:has(.member-mass-diary) .member-mass-diary{display:inline-flex;align-items:center;justify-content:center}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-modal article:has(.member-mass-diary) .member-calendar-save,.member-schedule-modal article:has(.member-mass-diary) .member-mass-diary{display:inline-flex!important;width:auto!important;height:34px!important;align-items:center;justify-content:center;margin-top:11px!important;margin-bottom:0!important;vertical-align:top;box-sizing:border-box;line-height:1}.member-schedule-modal article:has(.member-mass-diary) .member-calendar-save{margin-right:0!important;margin-left:0!important}.member-schedule-modal article:has(.member-mass-diary) .member-mass-diary{margin-right:0!important;margin-left:6px!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-modal article>p:not(.member-schedule-location){white-space:pre-wrap;overflow-wrap:anywhere}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-view-tabs{display:flex;justify-content:center;gap:7px;margin:16px 0}.member-schedule-view-tabs button{height:36px;padding:0 16px;border:1px solid var(--line);border-radius:18px;background:#fff;color:var(--muted);font-weight:700;cursor:pointer}.member-schedule-view-tabs button.active{border-color:var(--green);background:var(--soft);color:var(--green)}.member-schedule-blocks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.member-schedule-blocks[hidden],.member-calendar-toolbar[hidden],.member-calendar[hidden]{display:none!important}.member-schedule-block{display:grid;min-width:0;grid-template-columns:58px minmax(0,1fr);gap:12px;padding:14px;border:1px solid var(--line);border-left:4px solid var(--green);border-radius:11px;background:#fff;text-align:left;cursor:pointer}.member-schedule-block:hover{background:#f7fbf9;box-shadow:0 4px 13px rgba(20,70,54,.07)}.member-schedule-block.sacrament{border-left-color:#c58a22}.member-schedule-block.devotion{border-left-color:#bd5d7e}.member-schedule-block.other{border-left-color:#627ba4}.member-schedule-block>time{display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid var(--line)}.member-schedule-block>time b{color:var(--green);font-size:23px}.member-schedule-block>time span{color:var(--muted);font-size:9px}.member-schedule-block small{color:var(--green);font-size:9px;font-weight:800}.member-schedule-block h3{margin:6px 0 5px;overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.member-schedule-block p{margin:0;color:var(--muted);font-size:10px}.member-schedule-block-empty{grid-column:1/-1;padding:36px;text-align:center;color:var(--muted)}@media(max-width:700px){.member-schedule-blocks{grid-template-columns:1fr}.member-schedule-block{grid-template-columns:54px minmax(0,1fr);gap:10px;padding:14px 12px}.member-schedule-block>div{min-width:0}.member-schedule-block small{font-size:11px;line-height:1.4}.member-schedule-block h3{margin:7px 0 6px;font-size:15px;line-height:1.35}.member-schedule-block p{font-size:11px;line-height:1.45}.member-schedule-block>time b{font-size:24px}.member-schedule-block>time span{font-size:10px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-calendar-day em.liturgical{background:#f3edff;color:#684ca0}.member-schedule-block.liturgical{border-left-color:#8062b5}.member-schedule-block.liturgical small{color:#684ca0}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-more{display:block;width:144px!important;height:42px;margin:14px auto 0}.member-schedule-more[hidden]{display:none!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-view-tabs{gap:6px;margin:12px 0 14px}.member-schedule-view-tabs button{width:auto;min-width:96px;height:30px;padding:0 12px;border-color:#cbded7;border-radius:15px;background:#fff;color:#64736d;font-size:10px;font-weight:700;line-height:1;box-shadow:none}.member-schedule-view-tabs button:hover{border-color:#83c9b2;color:var(--green)}.member-schedule-view-tabs button.active{border-color:var(--green);background:#e8f7f2;color:var(--green);box-shadow:inset 0 0 0 1px rgba(21,149,111,.04)}.member-schedule-more{width:120px!important;height:36px!important;margin:12px auto 0!important;padding:0 12px!important;border-radius:8px!important;font-size:14px!important;font-weight:700;line-height:1}@media(max-width:600px){.member-schedule-view-tabs{margin:10px 0 12px}.member-schedule-view-tabs button{min-width:88px;height:28px;padding:0 10px;font-size:9px}.member-schedule-more{width:112px!important;height:34px!important;font-size:13px!important}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-modal article.mass{border-left-color:#16775b;background:#e8f7f1}.member-schedule-modal article.mass header span,.member-schedule-modal article.mass .member-schedule-location{color:#16775b}.member-schedule-modal article.sacrament{border-left-color:#c58a22;background:#fff3df}.member-schedule-modal article.sacrament header span,.member-schedule-modal article.sacrament .member-schedule-location{color:#9c6a13}.member-schedule-modal article.liturgical{border-left-color:#8062b5;background:#f3edff}.member-schedule-modal article.liturgical header span,.member-schedule-modal article.liturgical .member-schedule-location{color:#684ca0}.member-schedule-modal article.other{border-left-color:#627ba4;background:#edf2fa}.member-schedule-modal article.other header span,.member-schedule-modal article.other .member-schedule-location{color:#486489}</style>");
  document.head.insertAdjacentHTML("beforeend", '<style>.member-schedule-modal .member-modal-box>footer{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px}.member-schedule-modal .member-modal-box>footer::after{content:""}.member-schedule-actions{display:flex;align-items:center;justify-content:flex-start;gap:6px;min-width:0}.member-schedule-actions .member-calendar-save,.member-schedule-actions .member-mass-diary{display:inline-flex!important;width:auto!important;height:34px!important;align-items:center;justify-content:center;margin:0!important;padding:0 11px!important;box-sizing:border-box;white-space:nowrap;line-height:1}.member-schedule-actions .member-mass-diary{border-color:var(--green);background:var(--green);color:#fff}@media(max-width:520px){.member-schedule-modal .member-modal-box>footer{grid-template-columns:1fr auto;align-items:end}.member-schedule-modal .member-modal-box>footer::after{display:none}.member-schedule-actions{flex-wrap:wrap}.member-schedule-actions .member-calendar-save,.member-schedule-actions .member-mass-diary{height:32px!important;padding:0 8px!important;font-size:9px}}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-actions .member-mass-diary:disabled{border-color:#cbd7d2!important;background:#dfe7e4!important;color:#82918b!important;cursor:not-allowed;box-shadow:none}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-block.mass{border-left-color:#16775b;background:#e8f7f1}.member-schedule-block.mass>time b,.member-schedule-block.mass small{color:#16775b}.member-schedule-block.sacrament{border-left-color:#c58a22;background:#fff3df}.member-schedule-block.sacrament>time b,.member-schedule-block.sacrament small{color:#9c6a13}.member-schedule-block.devotion{border-left-color:#bd5d7e;background:#fff0f5}.member-schedule-block.devotion>time b,.member-schedule-block.devotion small{color:#a74668}.member-schedule-block.liturgical{border-left-color:#8062b5;background:#f3edff}.member-schedule-block.liturgical>time b,.member-schedule-block.liturgical small{color:#684ca0}.member-schedule-block.other{border-left-color:#627ba4;background:#edf2fa}.member-schedule-block.other>time b,.member-schedule-block.other small{color:#486489}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-schedule-attachment{display:inline-block;margin-top:10px;padding:7px 10px;border:1px solid currentColor;border-radius:7px;color:var(--green);font-size:11px;font-weight:700;text-decoration:none;background:#fff}.member-schedule-attachment:hover{filter:brightness(.97)}</style>");

  // src/client/parishioner-memorials.ts
  var memEsc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  async function memApi(url, init) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers ?? {} } }), data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  var memorials = [];
  function fileBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("\uC0AC\uC9C4\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      reader.readAsDataURL(file);
    });
  }
  function mountMemorials() {
    const tabs = document.querySelector(".member-sharing-tabs"), sharing = document.querySelector(".member-sharing");
    if (!tabs || !sharing) return false;
    if (tabs.querySelector('[data-member-sharing="memorial"]')) return true;
    tabs.insertAdjacentHTML("beforeend", '<button data-member-sharing="memorial" type="button" role="tab" aria-selected="false">\uCD94\uBAA8\uC758 \uACF5\uAC04</button>');
    sharing.insertAdjacentHTML("beforeend", '<div class="member-sharing-panel memorial-panel" data-member-sharing-panel="memorial" hidden><header class="memorial-head"><div><h3>\uCD94\uBAA8\uC758 \uACF5\uAC04</h3><p>\uB3CC\uC544\uAC00\uC2E0 \uBD84\uC744 \uAE30\uC5B5\uD558\uACE0 \uD568\uAED8 \uAE30\uB3C4\uD558\uB294 \uACF5\uAC04\uC785\uB2C8\uB2E4.</p></div><button class="green-button" type="button">+ \uCD94\uBAA8 \uACF5\uAC04 \uB4F1\uB85D</button></header><div class="memorial-list"><p class="memorial-empty">\uCD94\uBAA8 \uACF5\uAC04\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p></div></div>');
    const tab = tabs.querySelector('[data-member-sharing="memorial"]'), panel2 = sharing.querySelector('[data-member-sharing-panel="memorial"]');
    tab.onclick = () => {
      document.querySelectorAll("[data-member-sharing]").forEach((item) => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-member-sharing-panel]").forEach((item) => item.hidden = item !== panel2);
      void loadMemorials();
    };
    panel2.querySelector(".memorial-head button").onclick = openMemorialForm;
    return true;
  }
  async function loadMemorials() {
    const list = document.querySelector(".memorial-list");
    if (!list) return;
    try {
      memorials = await memApi("/api/parishioner/memorials");
      list.innerHTML = memorials.length ? memorials.map((item) => `<article class="memorial-card ${item.status}">${item.status === "approved" && item.coverPhotoId ? `<img src="/api/parishioner/memorial-photos/${item.coverPhotoId}" alt="${memEsc(item.name)}">` : '<div class="memorial-photo-placeholder">\u271D</div>'}<div><header><h4>${memEsc(item.name)}${item.baptismalName ? ` <small>(${memEsc(item.baptismalName)})</small>` : ""}</h4><b>${item.status === "approved" ? "\uACF5\uAC1C" : item.status === "requested" ? "\uC2B9\uC778 \uB300\uAE30" : "\uBC18\uB824"}</b></header><time>${memEsc(item.deathDate)} \uC120\uC885</time><p>${memEsc(item.biography)}</p>${item.status === "rejected" ? `<em>\uBC18\uB824 \uC0AC\uC720: ${memEsc(item.rejectionReason)}</em>` : ""}<footer><span>\uCD94\uBAA8 \uBA54\uC2DC\uC9C0 ${item.messageCount} \xB7 \uAE30\uB3C4\uBB38 ${item.prayerCount}</span>${item.status === "approved" ? `<button class="green-outline" data-memorial-detail="${item.id}" type="button">\uC0C1\uC138\uBCF4\uAE30</button>` : ""}</footer></div></article>`).join("") : '<p class="memorial-empty">\uB4F1\uB85D\uB41C \uCD94\uBAA8 \uACF5\uAC04\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      list.querySelectorAll("[data-memorial-detail]").forEach((button) => button.onclick = () => openMemorialDetail(Number(button.dataset.memorialDetail)));
    } catch (error) {
      list.innerHTML = `<p class="memorial-empty">${memEsc(error.message)}</p>`;
    }
  }
  function confirmMemorialRegistration() {
    return new Promise((resolve) => {
      document.querySelector(".memorial-submit-confirm")?.remove();
      const layer = document.createElement("div");
      layer.className = "member-modal memorial-submit-confirm";
      layer.innerHTML = '<section class="member-modal-box confirm-box"><h3>\uCD94\uBAA8 \uACF5\uAC04 \uB4F1\uB85D \uD655\uC778</h3><div class="member-modal-body"><p>\uC791\uC131\uD55C \uCD94\uBAA8 \uACF5\uAC04\uC744 \uC2B9\uC778 \uC694\uCCAD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><div class="modal-actions"><button class="green-outline" data-memorial-confirm="false" type="button">\uCDE8\uC18C</button><button class="green-button" data-memorial-confirm="true" type="button">\uC2B9\uC778 \uC694\uCCAD</button></div></section>';
      document.body.append(layer);
      const done = (confirmed) => {
        layer.remove();
        resolve(confirmed);
      };
      layer.querySelectorAll("[data-memorial-confirm]").forEach((button) => button.onclick = () => done(button.dataset.memorialConfirm === "true"));
      layer.onclick = (event) => {
        if (event.target === layer) done(false);
      };
    });
  }
  function confirmMemorialEntry(label) {
    return new Promise((resolve) => {
      document.querySelector(".memorial-entry-confirm")?.remove();
      const layer = document.createElement("div");
      layer.className = "member-modal memorial-entry-confirm";
      layer.innerHTML = `<section class="member-modal-box confirm-box"><h3>${memEsc(label)} \uC800\uC7A5 \uD655\uC778</h3><div class="member-modal-body"><p>\uC791\uC131\uD55C ${memEsc(label)}\uB97C \uC800\uC7A5\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><div class="modal-actions"><button class="green-outline" data-entry-confirm="false" type="button">\uCDE8\uC18C</button><button class="green-button" data-entry-confirm="true" type="button">\uC800\uC7A5</button></div></section>`;
      document.body.append(layer);
      const done = (confirmed) => {
        layer.remove();
        resolve(confirmed);
      };
      layer.querySelectorAll("[data-entry-confirm]").forEach((button) => button.onclick = () => done(button.dataset.entryConfirm === "true"));
      layer.onclick = (event) => {
        if (event.target === layer) done(false);
      };
    });
  }
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.matches(".memorial-entries form") || form.dataset.entryConfirmed === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const type = form.elements.namedItem("entryType").value, label = type === "prayer" ? "\uAE30\uB3C4\uBB38" : "\uCD94\uBAA8 \uBA54\uC2DC\uC9C0";
    void confirmMemorialEntry(label).then((confirmed) => {
      if (!confirmed) return;
      form.dataset.entryConfirmed = "true";
      form.requestSubmit();
      queueMicrotask(() => delete form.dataset.entryConfirmed);
    });
  }, true);
  function openMemorialForm() {
    document.querySelector(".memorial-form-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal memorial-form-modal";
    layer.innerHTML = '<section class="member-modal-box"><h3>\uCD94\uBAA8 \uACF5\uAC04 \uB4F1\uB85D</h3><form><div class="memorial-form-grid"><label>* \uC774\uB984<input name="name" maxlength="100" required></label><label>\uC138\uB840\uBA85<input name="baptismalName" maxlength="100"></label><label>* \uB098\uC640\uC758 \uAD00\uACC4<select name="relationType" required><option value="">\uC120\uD0DD\uD574 \uC8FC\uC138\uC694</option><option value="family">\uAC00\uC871</option><option value="friend">\uCE5C\uAD6C</option><option value="priest">\uC0AC\uC81C</option><option value="other">\uAE30\uD0C0</option></select></label><label>* \uAD00\uACC4 \uC0C1\uC138<input name="relationDetail" maxlength="100" required placeholder="\uC608: \uC544\uBC84\uC9C0, \uCE5C\uAD6C, \uBCF8\uB2F9 \uC2E0\uBD80\uB2D8"></label><label class="full">\uC774\uB825<textarea name="historyText" maxlength="20000" rows="3"></textarea></label><label>\uC0AC\uC81C\uC11C\uD488<input name="ordinationText" maxlength="300" placeholder="\uD574\uB2F9\uD558\uB294 \uACBD\uC6B0 \uC785\uB825"></label><label>* \uC120\uC885\uC77C<input name="deathDate" type="date" required></label><label class="full">* \uC57D\uB825<textarea name="biography" maxlength="20000" rows="5" required></textarea></label><label class="full">* \uC0AC\uC9C4 <small>1~5\uC7A5, \uC7A5\uB2F9 2MB</small><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label></div><p class="memorial-form-error"></p><footer><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uC2B9\uC778 \uC694\uCCAD</button></footer></form></section>';
    document.body.append(layer);
    layer.querySelector('button[type="button"]').onclick = () => layer.remove();
    const form = layer.querySelector("form"), submit2 = form.querySelector('button[type="submit"]'), photoInput = form.elements.namedItem("photos"), sync = () => {
      const files = [...photoInput.files ?? []];
      submit2.disabled = !form.checkValidity() || files.length < 1 || files.length > 5 || files.some((file) => file.size > 2 * 1024 * 1024);
    };
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    sync();
    form.onsubmit = async (event) => {
      event.preventDefault();
      const error = form.querySelector(".memorial-form-error"), files = [...photoInput.files ?? []];
      sync();
      if (submit2.disabled) return;
      if (!await confirmMemorialRegistration()) return;
      submit2.disabled = true;
      error.textContent = "";
      try {
        const photos = await Promise.all(files.map(async (file) => ({ type: file.type, data: await fileBase64(file) }))), values = Object.fromEntries(new FormData(form).entries());
        await memApi("/api/parishioner/memorials", { method: "POST", body: JSON.stringify({ ...values, photos }) });
        layer.remove();
        await loadMemorials();
      } catch (reason) {
        error.textContent = reason.message;
        sync();
      }
    };
  }
  async function openMemorialDetail(id) {
    document.querySelector(".memorial-detail-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal memorial-detail-modal";
    layer.innerHTML = '<section class="member-modal-box"><h3>\uCD94\uBAA8\uC758 \uACF5\uAC04</h3><div class="member-modal-body">\uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>';
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    try {
      const item = await memApi(`/api/parishioner/memorials/${id}`), body = layer.querySelector(".member-modal-body");
      body.innerHTML = `<div class="memorial-gallery">${item.photos.map((p) => `<img src="${p.url}" alt="${memEsc(item.name)}">`).join("")}</div><section class="memorial-profile"><h4>${memEsc(item.name)}${item.baptismalName ? ` (${memEsc(item.baptismalName)})` : ""}</h4><dl><dt>\uC120\uC885</dt><dd>${memEsc(item.deathDate)}</dd><dt>\uC0AC\uC81C\uC11C\uD488</dt><dd>${memEsc(item.ordinationText || "-")}</dd><dt>\uC774\uB825</dt><dd>${memEsc(item.historyText || "-")}</dd><dt>\uC57D\uB825</dt><dd>${memEsc(item.biography)}</dd></dl></section><section class="memorial-entries"><h4>\uD568\uAED8 \uAE30\uC5B5\uD558\uACE0 \uAE30\uB3C4\uD569\uB2C8\uB2E4</h4>${item.entries.map((e) => `<article><b>${e.entryType === "prayer" ? "\uAE30\uB3C4\uBB38" : "\uCD94\uBAA8 \uBA54\uC2DC\uC9C0"}</b><strong>${memEsc(e.authorName)}${e.baptismalName ? ` (${memEsc(e.baptismalName)})` : ""}</strong><p>${memEsc(e.content)}</p><time>${new Date(e.createdAt).toLocaleString("ko-KR")}</time></article>`).join("") || "<p>\uC544\uC9C1 \uB0A8\uACA8\uC9C4 \uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>"}<form><select name="entryType"><option value="message">\uCD94\uBAA8 \uBA54\uC2DC\uC9C0</option><option value="prayer">\uAE30\uB3C4\uBB38</option></select><textarea name="content" maxlength="3000" rows="3" required placeholder="\uB9C8\uC74C\uC744 \uB2F4\uC544 \uAE00\uC744 \uB0A8\uACA8 \uC8FC\uC138\uC694."></textarea><button class="green-button" type="submit">\uB0A8\uAE30\uAE30</button></form></section>`;
      body.querySelector("form").onsubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        await memApi(`/api/parishioner/memorials/${id}/entries`, { method: "POST", body: JSON.stringify({ entryType: form.entryType.value, content: form.content.value }) });
        layer.remove();
        await openMemorialDetail(id);
        await loadMemorials();
      };
    } catch (error) {
      layer.querySelector(".member-modal-body").textContent = error.message;
    }
  }
  var memorialMountObserver = new MutationObserver(() => {
    if (mountMemorials()) memorialMountObserver.disconnect();
  });
  memorialMountObserver.observe(document.documentElement, { childList: true, subtree: true });
  queueMicrotask(() => {
    if (mountMemorials()) memorialMountObserver.disconnect();
  });
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-head button.green-button{width:150px;min-width:150px;height:34px;padding:0 16px;border-radius:17px;font-size:11px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-form-grid select{width:100%;margin-top:6px;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-submit-confirm{z-index:1200}.memorial-submit-confirm .confirm-box{width:min(90vw,430px);text-align:center}.memorial-submit-confirm .member-modal-body{padding:28px 24px}.memorial-submit-confirm .member-modal-body p{margin:0;color:#40534b;font-size:12px}.memorial-submit-confirm .modal-actions{display:flex;justify-content:center;gap:9px;padding:0 20px 20px}.memorial-submit-confirm .modal-actions button{width:105px;height:40px}.memorial-form-modal button:disabled{cursor:not-allowed;opacity:.45}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-card footer{gap:10px}.memorial-card footer span{color:var(--muted);font-size:9px;font-weight:500;line-height:1.4;white-space:nowrap}.memorial-card footer button{flex:0 0 auto}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-card>div{display:flex;min-width:0;flex-direction:column}.memorial-card footer{margin-top:auto;padding-top:10px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-card{align-items:stretch}.memorial-card>div{position:relative;height:100%;padding-bottom:38px}.memorial-card footer{position:absolute;right:0;bottom:0;left:0;margin:0;padding:0}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-entries form{grid-template-columns:110px minmax(0,1fr) 92px;align-items:end;gap:8px}.memorial-entries select,.memorial-entries textarea{width:100%;height:40px;margin:0;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);font:inherit;font-size:11px;outline:none}.memorial-entries textarea{min-height:40px;max-height:100px;padding-top:10px;line-height:1.5;resize:vertical}.memorial-entries select:focus,.memorial-entries textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(21,149,111,.1)}.memorial-entries form button.green-button{width:92px;height:40px;padding:0 12px;border-radius:8px;font-size:11px;white-space:nowrap}@media(max-width:700px){.memorial-entries form{grid-template-columns:1fr}.memorial-entries form button.green-button{width:100%}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-entry-confirm{z-index:1200}.memorial-entry-confirm .confirm-box{width:min(90vw,430px);text-align:center}.memorial-entry-confirm .member-modal-body{padding:28px 24px}.memorial-entry-confirm .member-modal-body p{margin:0;color:#40534b;font-size:12px}.memorial-entry-confirm .modal-actions{display:flex;justify-content:center;gap:9px;padding:0 20px 20px}.memorial-entry-confirm .modal-actions button{width:105px;height:40px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.memorial-panel{display:block!important;padding:0!important;border:0!important;background:transparent!important}.memorial-panel[hidden]{display:none!important}.memorial-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.memorial-head h3{margin:0}.memorial-head p{margin:5px 0 0;color:var(--muted)}.memorial-head button{width:auto;padding:0 15px}.memorial-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.memorial-card{display:grid;grid-template-columns:110px 1fr;gap:13px;padding:13px;border:1px solid var(--line);border-radius:12px;background:#fff}.memorial-card>img,.memorial-photo-placeholder{width:110px;height:130px;border-radius:9px;object-fit:cover}.memorial-photo-placeholder{display:grid;place-items:center;background:#eef7f4;color:var(--green);font-size:27px}.memorial-card header{display:flex;justify-content:space-between}.memorial-card h4{margin:0}.memorial-card header b{color:var(--green);font-size:9px}.memorial-card time{display:block;margin-top:6px;color:var(--muted);font-size:9px}.memorial-card p{display:-webkit-box;overflow:hidden;line-height:1.7;-webkit-box-orient:vertical;-webkit-line-clamp:3}.memorial-card em{color:#c43b48}.memorial-card footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px}.memorial-card footer button{width:auto;height:28px;padding:0 11px;font-size:9px}.memorial-form-modal .member-modal-box{width:min(94vw,680px);text-align:left}.memorial-form-modal .member-modal-box>h3{text-align:center}.memorial-form-modal form{padding:20px}.memorial-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.memorial-form-grid label{font-weight:700}.memorial-form-grid .full{grid-column:1/-1}.memorial-form-grid input,.memorial-form-grid textarea{width:100%;margin-top:6px;padding:10px;border:1px solid var(--line);border-radius:8px}.memorial-form-modal footer{display:flex;justify-content:center;gap:8px}.memorial-form-error{color:#d94350}.memorial-detail-modal .member-modal-box{display:flex;width:min(94vw,850px);max-height:90vh;flex-direction:column;overflow:hidden;text-align:left}.memorial-detail-modal .member-modal-box>h3{text-align:center}.memorial-detail-modal .member-modal-body{overflow-y:auto}.memorial-gallery{display:flex;gap:8px;overflow-x:auto}.memorial-gallery img{width:180px;height:210px;flex:0 0 auto;border-radius:9px;object-fit:cover}.memorial-profile h4{font-size:18px}.memorial-profile dl{display:grid;grid-template-columns:80px 1fr}.memorial-profile dt,.memorial-profile dd{margin:0;padding:10px;border-bottom:1px solid var(--line)}.memorial-profile dt{color:var(--green);font-weight:700}.memorial-profile dd{white-space:pre-wrap}.memorial-entries article{position:relative;margin-top:8px;padding:12px;border-radius:9px;background:#f7faf9}.memorial-entries article>b{margin-right:8px;color:var(--green)}.memorial-entries article p{white-space:pre-wrap}.memorial-entries article time{color:var(--muted);font-size:8px}.memorial-entries form{display:grid;grid-template-columns:120px 1fr auto;gap:8px;margin-top:12px}.memorial-entries select,.memorial-entries textarea{padding:9px;border:1px solid var(--line);border-radius:8px}.memorial-entries button{width:auto;padding:0 14px}.memorial-detail-modal>.member-modal-box>footer{display:flex;justify-content:center;padding:12px;border-top:1px solid var(--line)}@media(max-width:700px){.memorial-list{grid-template-columns:1fr}.memorial-head{align-items:flex-start}.memorial-card{grid-template-columns:82px 1fr}.memorial-card>img,.memorial-photo-placeholder{width:82px;height:105px}.memorial-form-grid{grid-template-columns:1fr}.memorial-form-grid .full{grid-column:auto}.memorial-entries form{grid-template-columns:1fr}.memorial-entries button{height:36px}}</style>");

  // src/client/parishioner-dictionary.ts
  var memberDictionaryEscape = (value) => {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  };
  var memberDictionaryTerms = [];
  var memberDictionaryCategories = [];
  function mountMemberDictionaryMenu() {
    const nav = document.querySelector("#member-mobile-menu>nav");
    if (!nav || nav.querySelector("[data-open-dictionary]")) return;
    const notices = nav.querySelector('[data-member-target=".member-notices"]');
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.openDictionary = "1";
    button.innerHTML = '<span class="member-dictionary-menu-icon" aria-hidden="true">\u25A4</span><span>\uC6A9\uC5B4\uC0AC\uC804</span>';
    notices?.insertAdjacentElement("beforebegin", button) ?? nav.append(button);
  }
  async function openMemberDictionary() {
    document.body.classList.remove("member-menu-open");
    document.querySelector("#member-mobile-menu")?.classList.remove("open");
    const backdrop = document.querySelector("#member-menu-backdrop");
    if (backdrop) backdrop.hidden = true;
    document.querySelector(".member-dictionary-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal member-dictionary-modal";
    layer.innerHTML = '<section class="member-modal-box"><h3>\uAC00\uD1A8\uB9AD \uC6A9\uC5B4\uC0AC\uC804</h3><div class="member-dictionary-body"><div class="member-dictionary-search"><select><option value="">\uC804\uCCB4 \uCE74\uD14C\uACE0\uB9AC</option></select><input type="search" placeholder="\uC6A9\uC5B4\xB7\uB3D9\uC758\uC5B4\xB7\uC124\uBA85 \uAC80\uC0C9"><button class="green-button" data-dictionary-search type="button">\uAC80\uC0C9</button><button class="green-outline" data-dictionary-reset type="button">\uCD08\uAE30\uD654</button></div><small data-result-count></small><div data-dictionary-results><p class="member-dictionary-empty">\uC6A9\uC5B4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p></div></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>';
    document.body.append(layer);
    layer.querySelector("footer button").onclick = () => layer.remove();
    try {
      const [categoryResponse, termResponse] = await Promise.all([fetch("/api/parishioner/dictionary/categories"), fetch("/api/parishioner/dictionary/terms")]), categories = await categoryResponse.json(), terms = await termResponse.json();
      if (!categoryResponse.ok || !termResponse.ok) throw new Error(categories.message || terms.message || "\uC6A9\uC5B4\uC0AC\uC804\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      memberDictionaryCategories = categories;
      memberDictionaryTerms = terms;
      const select = layer.querySelector("select"), input = layer.querySelector(".member-dictionary-search input");
      select.innerHTML = '<option value="">\uC804\uCCB4 \uCE74\uD14C\uACE0\uB9AC</option>' + memberDictionaryCategories.map((item) => `<option value="${item.id}">${memberDictionaryEscape(item.name)}</option>`).join("");
      const render = () => {
        const query = input.value.trim().toLowerCase(), categoryName = memberDictionaryCategories.find((item) => item.id === Number(select.value))?.name, items = memberDictionaryTerms.filter((item) => (!categoryName || item.categories.includes(categoryName)) && (!query || [item.term, item.summary, item.description, ...item.aliases].join(" ").toLowerCase().includes(query)));
        layer.querySelector("[data-result-count]").textContent = `\uAC80\uC0C9 \uACB0\uACFC ${items.length}\uAC1C`;
        layer.querySelector("[data-dictionary-results]").innerHTML = items.length ? items.map((item) => `<article><header><h4>${memberDictionaryEscape(item.term)}</h4>${item.aliases.length ? `<small>${item.aliases.map(memberDictionaryEscape).join(" \xB7 ")}</small>` : ""}</header><div>${item.categories.map((value) => `<span>${memberDictionaryEscape(value)}</span>`).join("")}</div><p>${memberDictionaryEscape(item.summary)}</p><details><summary>\uC790\uC138\uD788 \uBCF4\uAE30</summary><section>${memberDictionaryEscape(item.description)}</section>${item.sourceUrl ? `<a href="${memberDictionaryEscape(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">\uCD9C\uCC98 \uD655\uC778</a>` : ""}</details></article>`).join("") : '<p class="member-dictionary-empty">\uAC80\uC0C9\uB41C \uC6A9\uC5B4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      };
      layer.querySelector("[data-dictionary-search]").onclick = render;
      layer.querySelector("[data-dictionary-reset]").onclick = () => {
        select.value = "";
        input.value = "";
        render();
        input.focus();
      };
      input.onkeydown = (event) => {
        if (event.key === "Enter") render();
      };
      select.onchange = render;
      render();
    } catch (error) {
      layer.querySelector("[data-dictionary-results]").innerHTML = `<p class="member-dictionary-empty">${memberDictionaryEscape(error.message)}</p>`;
    }
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-open-dictionary]")) return;
    const menu2 = document.querySelector("#member-mobile-menu"), menuButton = document.querySelector("#member-menu-button"), backdrop = document.querySelector("#member-menu-backdrop");
    menu2?.classList.remove("open");
    menu2?.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "\uBA54\uB274 \uC5F4\uAE30");
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("member-menu-open");
    void openMemberDictionary();
  });
  document.addEventListener("member:gateway-dictionary", () => void openMemberDictionary());
  new MutationObserver(mountMemberDictionaryMenu).observe(document.documentElement, { childList: true, subtree: true });
  mountMemberDictionaryMenu();
  document.head.insertAdjacentHTML("beforeend", "<style>.member-dictionary-modal .member-modal-box{display:flex;width:min(94vw,850px);max-height:88vh;flex-direction:column;overflow:hidden;text-align:left}.member-dictionary-modal h3{flex:none;margin:0;padding:18px;background:var(--green);color:#fff;text-align:center}.member-dictionary-body{padding:18px;overflow:auto}.member-dictionary-search{display:grid;grid-template-columns:170px minmax(180px,1fr) auto auto;gap:8px;margin-bottom:10px}.member-dictionary-search select,.member-dictionary-search input{height:42px;padding:0 11px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit}.member-dictionary-search button{height:42px;padding:0 18px;border-radius:8px;white-space:nowrap}.member-dictionary-search [data-dictionary-search]{border:0}.member-dictionary-body>[data-result-count]{display:block;margin:10px 0;color:var(--muted)}.member-dictionary-body [data-dictionary-results]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.member-dictionary-body article{padding:15px;border:1px solid var(--line);border-radius:10px;background:#fbfdfc}.member-dictionary-body article header{display:flex;align-items:baseline;gap:8px}.member-dictionary-body h4{margin:0;font-size:15px}.member-dictionary-body article header small{color:var(--muted)}.member-dictionary-body article>div{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}.member-dictionary-body article>div span{padding:4px 8px;border-radius:11px;background:#eaf7f1;color:var(--green);font-size:9px}.member-dictionary-body article>p{line-height:1.65}.member-dictionary-body details{padding-top:9px;border-top:1px solid var(--line)}.member-dictionary-body summary{color:var(--green);font-weight:700;cursor:pointer}.member-dictionary-body details section{padding:10px 0;line-height:1.7;white-space:pre-wrap}.member-dictionary-body details a{color:var(--green);font-size:9px}.member-dictionary-empty{grid-column:1/-1;padding:50px;text-align:center;color:var(--muted)}.member-dictionary-modal .member-modal-box>footer{display:flex;justify-content:center;padding:13px;border-top:1px solid var(--line)}@media(max-width:620px){.member-dictionary-body{padding:13px}.member-dictionary-search{grid-template-columns:1fr 1fr}.member-dictionary-search select,.member-dictionary-search input{grid-column:1/-1}.member-dictionary-search button{height:40px}.member-dictionary-body [data-dictionary-results]{grid-template-columns:1fr}.member-dictionary-modal .member-modal-box{width:96vw;max-height:92vh}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-mobile-menu [data-open-dictionary]{display:flex;align-items:center}.member-dictionary-menu-icon{display:grid;width:25px;height:25px;flex:0 0 25px;margin-right:10px;place-items:center;border-radius:8px;background:#e1f5ee;color:var(--green);font-size:12px;font-weight:800}@media(max-width:600px){.member-mobile-menu [data-open-dictionary]{height:38px;min-height:38px;padding:0 10px;font-size:11px}.member-dictionary-menu-icon{width:21px;height:21px;flex-basis:21px;margin-right:8px;border-radius:7px;font-size:10px}}</style>");

  // src/client/table-sort.ts
  function sortableValue(cell) {
    const raw = (cell.dataset.sortValue ?? cell.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!raw) return { kind: 0, value: "" };
    const date = Date.parse(raw.replace(/\./g, "-").replace(/오전\s*/, "AM ").replace(/오후\s*/, "PM "));
    if (/\d{4}[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}/.test(raw) && Number.isFinite(date)) return { kind: 2, value: date };
    const numeric = raw.replace(/,/g, "").match(/^[-+]?\d+(?:\.\d+)?(?:\s*(?:건|개|명|회|원|%))?$/);
    if (numeric) return { kind: 2, value: Number.parseFloat(numeric[0]) };
    return { kind: 1, value: raw };
  }
  function compareCells(left, right) {
    const a = left ? sortableValue(left) : { kind: 0, value: "" }, b = right ? sortableValue(right) : { kind: 0, value: "" };
    if (a.kind !== b.kind) return a.kind - b.kind;
    if (typeof a.value === "number" && typeof b.value === "number") return a.value - b.value;
    return String(a.value).localeCompare(String(b.value), "ko", { numeric: true, sensitivity: "base" });
  }
  document.addEventListener("click", (event) => {
    const target = event.target, header = target.closest("table thead th");
    if (!header || header.colSpan > 1 || header.dataset.noSort !== void 0) return;
    if (target.closest("input,select,textarea,a") || header.dataset.sort || header.querySelector("[data-sort]")) return;
    const table = header.closest("table");
    if (!table) return;
    const index = [...header.parentElement.children].indexOf(header);
    if (table.matches(".shrine-grid") && index < 7) return;
    const body = table.tBodies[0];
    if (!body || body.rows.length < 2) return;
    const direction = header.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
    table.querySelectorAll("thead th").forEach((cell) => {
      cell.removeAttribute("aria-sort");
      cell.classList.remove("table-sort-asc", "table-sort-desc");
    });
    header.setAttribute("aria-sort", direction);
    header.classList.add(direction === "ascending" ? "table-sort-asc" : "table-sort-desc");
    const rows = [...body.rows].map((row, position) => ({ row, position }));
    rows.sort((a, b) => {
      const result = compareCells(a.row.cells[index], b.row.cells[index]);
      return (result || a.position - b.position) * (direction === "ascending" ? 1 : -1);
    });
    rows.forEach((item) => body.append(item.row));
  });
  document.head.insertAdjacentHTML("beforeend", '<style>table thead th:not([data-no-sort]){cursor:pointer;user-select:none}table thead th.table-sort-asc:after,table thead th.table-sort-desc:after{display:inline-block;margin-left:6px;color:currentColor;font-size:9px}table thead th.table-sort-asc:after{content:"\u25B2"}table thead th.table-sort-desc:after{content:"\u25BC"}</style>');

  // src/client/required-markers.ts
  var REQUIRED_MARKER_SELECTOR = "label > i, legend > i, label > span > i";
  function normalizeRequiredMarkers(root = document) {
    root.querySelectorAll(REQUIRED_MARKER_SELECTOR).forEach((marker) => {
      if (marker.textContent?.trim() !== "*" || marker.dataset.requiredLeading === "true") return;
      const parent = marker.parentElement;
      if (!parent) return;
      marker.dataset.requiredLeading = "true";
      parent.insertBefore(document.createTextNode(" "), parent.firstChild);
      parent.insertBefore(marker, parent.firstChild);
    });
  }
  function mountRequiredMarkers() {
    normalizeRequiredMarkers();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        normalizeRequiredMarkers(node.matches(REQUIRED_MARKER_SELECTOR) ? node.parentElement ?? document : node);
      }));
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // src/client/parishioner.ts
  function confirmMissionAnswer() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal mission-answer-confirm";
      layer.innerHTML = '<section class="member-modal-box"><h3>\uB2F5\uBCC0 \uB4F1\uB85D</h3><div class="member-modal-body"><p>\uB2F5\uC7A5\uC744 \uBCF4\uB0B4\uC2DC\uACA0\uC2B5\uB2C8\uAE4C</p></div><div class="mission-answer-confirm-actions"><button class="green-outline" type="button" data-answer-confirm="false">\uCDE8\uC18C</button><button class="green-button" type="button" data-answer-confirm="true">\uD655\uC778</button></div></section>';
      document.body.append(layer);
      layer.querySelectorAll("[data-answer-confirm]").forEach((button) => button.onclick = () => {
        layer.remove();
        resolve(button.dataset.answerConfirm === "true");
      });
    });
  }
  function prepareMissionAnswerForms() {
    document.querySelectorAll("[data-owner-answer],[data-mission-answer]").forEach((form) => {
      if (form.dataset.answerReady) return;
      form.dataset.answerReady = "true";
      const textarea = form.querySelector("textarea"), submit2 = form.querySelector('button[type="submit"]');
      if (!textarea || !submit2) return;
      const sync = () => submit2.disabled = !textarea.value.trim();
      textarea.addEventListener("input", sync);
      sync();
    });
  }
  new MutationObserver(prepareMissionAnswerForms).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.matches("[data-owner-answer],[data-mission-answer]") || form.dataset.answerConfirmed === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const textarea = form.querySelector("textarea");
    if (!textarea?.value.trim()) return;
    void confirmMissionAnswer().then((confirmed) => {
      if (!confirmed) return;
      form.dataset.answerConfirmed = "true";
      form.requestSubmit();
      queueMicrotask(() => delete form.dataset.answerConfirmed);
    });
  }, true);
  function promptApplicationRejection() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal application-reject-modal";
      layer.innerHTML = '<section class="member-modal-box"><h3>\uBBF8\uC158 \uC9C0\uC6D0 \uBC18\uB824</h3><form><label>\uBC18\uB824 \uC0AC\uC720<textarea maxlength="1000" rows="6" required placeholder="\uC9C0\uC6D0\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 \uBC18\uB824 \uC0AC\uC720\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><p></p><div><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uBC18\uB824</button></div></form></section>';
      document.body.append(layer);
      const textarea = layer.querySelector("textarea"), submit2 = layer.querySelector('button[type="submit"]');
      textarea.oninput = () => submit2.disabled = !textarea.value.trim();
      layer.querySelector('button[type="button"]').onclick = () => {
        layer.remove();
        resolve(null);
      };
      layer.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        const reason = textarea.value.trim();
        if (!reason) return;
        layer.remove();
        resolve(reason);
      };
    });
  }
  var search = document.querySelector("#member-parish-search");
  var parishId = document.querySelector("#member-parish-id");
  var results = document.querySelector("#member-parish-results");
  var email = document.querySelector("#member-email");
  var code = document.querySelector("#member-code");
  var codePanel = document.querySelector("#member-code-panel");
  var message = document.querySelector("#member-message");
  var timer2;
  var savedParishKey = "paxlink.parishioner.login.parish";
  var savedEmailKey = "paxlink.parishioner.login.email";
  email.insertAdjacentHTML("afterend", `<div class="login-save-options"><label><input id="member-save-parish" type="checkbox"> \uC131\uB2F9 \uC800\uC7A5\uD558\uAE30</label><label><input id="member-save-email" type="checkbox"> \uC774\uBA54\uC77C \uC800\uC7A5\uD558\uAE30</label></div>`);
  var saveParish = document.querySelector("#member-save-parish");
  var saveEmail = document.querySelector("#member-save-email");
  try {
    const savedParish = JSON.parse(localStorage.getItem(savedParishKey) ?? "null");
    if (savedParish?.id && savedParish.name) {
      parishId.value = String(savedParish.id);
      search.value = savedParish.name;
      saveParish.checked = true;
    }
    const savedEmail = localStorage.getItem(savedEmailKey);
    if (savedEmail) {
      email.value = savedEmail;
      saveEmail.checked = true;
    }
  } catch {
    localStorage.removeItem(savedParishKey);
  }
  function persistLoginFields() {
    if (saveParish.checked && parishId.value && search.value.trim()) localStorage.setItem(savedParishKey, JSON.stringify({ id: Number(parishId.value), name: search.value.trim() }));
    else localStorage.removeItem(savedParishKey);
    if (saveEmail.checked && email.value.trim()) localStorage.setItem(savedEmailKey, email.value.trim());
    else localStorage.removeItem(savedEmailKey);
  }
  document.querySelector("#member-send-code").addEventListener("click", persistLoginFields);
  document.querySelector("#member-login-form").addEventListener("submit", persistLoginFields);
  function setMessage(text, error = false) {
    message.textContent = text;
    message.style.color = error ? "#d94350" : "";
  }
  function modal(title, body) {
    const layer = document.createElement("div");
    layer.className = "member-modal";
    const securityNotice = title === "\uC774\uC804 \uC811\uC18D \uC815\uBCF4" ? '<p style="margin:18px 0 0;padding-top:14px;border-top:1px solid var(--line);color:#c53c48;font-size:11px;font-weight:700;line-height:1.5">\uBCF8\uC778\uC758 \uAE30\uB85D\uC774 \uC544\uB2C8\uBA74 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD574 \uC8FC\uC138\uC694.</p>' : "";
    layer.innerHTML = `<div class="member-modal-box"><h3>${title}</h3><div class="member-modal-body">${body}${securityNotice}</div><button class="green-button" type="button">\uD655\uC778</button></div>`;
    document.body.append(layer);
    layer.querySelector("button").addEventListener("click", () => layer.remove());
  }
  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }
  function renderMember(user) {
    const baptismal = user.baptismalName ?? user.baptismal_name;
    const parish = user.parishName ?? user.parish_name ?? "";
    startSessionCountdown({ logoutUrl: "/api/parishioner-auth/logout", redirectUrl: "/parishioner", color: "#15956f" });
    document.body.classList.add("member-authenticated");
    document.body.insertAdjacentHTML("afterbegin", `<header class="member-topbar"><a class="member-logo" href="/parishioner"><b>P</b> Paxlink</a><div class="member-profile"><button id="member-notification-button" type="button" aria-label="\uC54C\uB9BC">\u{1F514}<b hidden>0</b></button><span><strong>${escapeHtml(user.name)}</strong>${baptismal ? ` (${escapeHtml(baptismal)})` : ""}<small>${escapeHtml(parish)} \xB7 ${escapeHtml(user.email)}</small></span><button id="member-menu-button" class="member-menu-button" type="button" aria-label="\uBA54\uB274 \uC5F4\uAE30" aria-expanded="false" aria-controls="member-mobile-menu"><i></i><i></i><i></i></button></div></header><div id="member-menu-backdrop" class="member-menu-backdrop" hidden></div><aside id="member-mobile-menu" class="member-mobile-menu" aria-hidden="true"><header><strong>\uC804\uCCB4 \uBA54\uB274</strong><button id="member-menu-close" type="button" aria-label="\uBA54\uB274 \uB2EB\uAE30">\xD7</button></header><div class="member-menu-user"><b>${escapeHtml(user.name)}${baptismal ? ` (${escapeHtml(baptismal)})` : ""}</b><small>${escapeHtml(parish)}</small></div><nav><button data-member-target=".member-schedule-section" type="button">\uC131\uB2F9 \uC77C\uC815</button><button data-member-target=".member-groups" type="button">\uB2E8\uCCB4</button><button data-member-target=".member-shrines" type="button">\uC131\uC9C0\uC21C\uB840</button><button data-member-target=".member-sharing" type="button">\uB098\uB214</button><button data-member-target=".member-videos" type="button">\uB3D9\uC601\uC0C1</button><button data-member-target=".member-notices" type="button">\uACF5\uC9C0\uC0AC\uD56D</button></nav><footer><button id="member-privacy" type="button">\uAC1C\uC778\uC815\uBCF4</button><button id="member-logout" type="button">\uB85C\uADF8\uC544\uC6C3</button></footer></aside>`);
    document.querySelector(".member-shell").innerHTML = `<section class="member-home"><h1>${escapeHtml(user.name)}\uB2D8, \uD658\uC601\uD569\uB2C8\uB2E4.</h1><p>\uC2E0\uB3C4 \uC11C\uBE44\uC2A4\uC5D0 \uB85C\uADF8\uC778\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.</p><section class="member-notices"><header><h2>\uACF5\uC9C0\uC0AC\uD56D</h2><span id="member-notice-count"></span></header><div id="member-notice-list"></div><p id="member-notice-empty" hidden>\uB4F1\uB85D\uB41C \uACF5\uC9C0\uC0AC\uD56D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p></section></section>`;
    const menu2 = document.querySelector("#member-mobile-menu"), backdrop = document.querySelector("#member-menu-backdrop"), menuButton = document.querySelector("#member-menu-button"), setMenu = (open) => {
      menu2.classList.toggle("open", open);
      menu2.setAttribute("aria-hidden", String(!open));
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "\uBA54\uB274 \uB2EB\uAE30" : "\uBA54\uB274 \uC5F4\uAE30");
      backdrop.hidden = !open;
      document.body.classList.toggle("member-menu-open", open);
    };
    menuButton.onclick = () => setMenu(!menu2.classList.contains("open"));
    document.querySelector("#member-menu-close").onclick = () => setMenu(false);
    backdrop.onclick = () => setMenu(false);
    menu2.querySelectorAll("[data-member-target]").forEach((button) => button.onclick = () => {
      setMenu(false);
      document.querySelector(button.dataset.memberTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.querySelector("#member-privacy").addEventListener("click", () => {
      setMenu(false);
      modal("\uAC1C\uC778\uC815\uBCF4", `<dl><dt>\uC774\uB984</dt><dd>${escapeHtml(user.name)}${baptismal ? ` (${escapeHtml(baptismal)})` : ""}</dd><dt>\uC18C\uC18D \uC131\uB2F9</dt><dd>${escapeHtml(parish)}</dd><dt>\uC774\uBA54\uC77C</dt><dd>${escapeHtml(user.email)}</dd></dl>`);
    });
    document.querySelector("#member-logout").addEventListener("click", async () => {
      await fetch("/api/parishioner-auth/logout", { method: "POST" });
      location.href = "/parishioner";
    });
    mountRealtimeNotifications();
    void loadNotices();
  }
  function arrangeMemberProfile() {
    const profile = document.querySelector(".member-profile"), copy = profile?.querySelector(":scope > span"), notification = profile?.querySelector("#member-notification-button"), name = copy?.querySelector("strong"), email2 = copy?.querySelector("small");
    if (!profile || !copy || !notification || !name || !email2 || copy.classList.contains("member-profile-copy")) return;
    name.textContent = [...copy.childNodes].filter((node) => node !== email2).map((node) => node.textContent ?? "").join("").trim();
    [...copy.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => node.remove());
    copy.classList.add("member-profile-copy");
    email2.textContent = email2.textContent?.split(" \xB7 ").at(-1)?.trim() ?? "";
    copy.insertBefore(notification, email2);
  }
  var memberProfileObserver = new MutationObserver(() => arrangeMemberProfile());
  memberProfileObserver.observe(document.body, { childList: true });
  async function openMemberProfileForm() {
    document.querySelector(".member-profile-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal member-profile-modal";
    layer.innerHTML = '<section class="member-modal-box"><h3>\uAC1C\uC778\uC815\uBCF4 \uC218\uC815</h3><div class="member-modal-body">\uD68C\uC6D0 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911...</div></section>';
    document.body.append(layer);
    try {
      const response = await fetch("/api/parishioner/profile"), profile = await response.json();
      if (!response.ok) throw new Error(profile.message);
      layer.querySelector(".member-modal-body").innerHTML = `<form id="member-profile-form"><section><h4>\uAC1C\uC778\uC815\uBCF4</h4><div class="member-profile-grid"><label>\uC774\uB984 <i>*</i><input name="name" maxlength="100" required value="${escapeHtml(profile.name)}"></label><label>\uC138\uB840\uBA85<input name="baptismalName" maxlength="100" value="${escapeHtml(profile.baptismalName ?? "")}"></label><label class="full">\uC774\uBA54\uC77C<input type="email" value="${escapeHtml(profile.email)}" readonly><small>\uC774\uBA54\uC77C\uC740 \uB85C\uADF8\uC778 \uC2DD\uBCC4 \uC815\uBCF4\uC774\uBBC0\uB85C \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</small></label><label>\uC0DD\uB144\uC6D4\uC77C <i>*</i><input name="birthDate" type="date" required value="${profile.birthDate}"></label><label>\uC804\uD654\uBC88\uD638 <i>*</i><input name="phone" maxlength="13" required value="${escapeHtml(profile.phone)}"></label><label>\uBAA8\uBC14\uC77C\uD3F0\uBC88\uD638 <i>*</i><input name="mobile" maxlength="13" required value="${escapeHtml(profile.mobile)}"></label><label>\uC6B0\uD3B8\uBC88\uD638 <i>*</i><input name="postalCode" maxlength="5" required value="${escapeHtml(profile.postalCode)}"></label><label class="full">\uC8FC\uC18C <i>*</i><input name="address" maxlength="500" required value="${escapeHtml(profile.address)}"></label><label class="full">\uC0C1\uC138\uC8FC\uC18C<input name="addressDetail" maxlength="300" value="${escapeHtml(profile.addressDetail ?? "")}"></label></div></section><section><h4>\uBE44\uBC00\uBC88\uD638</h4><label>\uC0C8 \uBE44\uBC00\uBC88\uD638<input name="password" type="password" minlength="8" autocomplete="new-password" placeholder="${profile.hasPassword ? "\uBCC0\uACBD\uD560 \uACBD\uC6B0\uC5D0\uB9CC 8\uC790 \uC774\uC0C1 \uC785\uB825" : "\uC124\uC815\uD558\uB824\uBA74 8\uC790 \uC774\uC0C1 \uC785\uB825"}"></label><small>\uD604\uC7AC \uB85C\uADF8\uC778\uC740 \uC774\uBA54\uC77C \uC778\uC99D\uCF54\uB4DC \uBC29\uC2DD\uC744 \uC0AC\uC6A9\uD569\uB2C8\uB2E4.</small></section><section><h4>\uC218\uC2E0 \uC124\uC815</h4><label class="profile-consent"><input name="pushOptIn" type="checkbox" ${profile.pushOptIn ? "checked" : ""}> \uC54C\uB9BC(Push) \uC218\uC2E0 \uB3D9\uC758</label><label class="profile-consent"><input name="emailOptIn" type="checkbox" ${profile.emailOptIn ? "checked" : ""}> \uC774\uBA54\uC77C \uC218\uC2E0 \uB3D9\uC758</label></section><section><h4>\uD544\uC218 \uB3D9\uC758 \uD604\uD669</h4><label class="profile-consent confirmed"><input type="checkbox" checked disabled> \uC774\uC6A9\uC57D\uAD00 \uB3D9\uC758 <small>${escapeHtml(profile.termsAgreedAt)}</small></label><label class="profile-consent confirmed"><input type="checkbox" checked disabled> \uAC1C\uC778\uC815\uBCF4 \uC218\uC9D1\xB7\uC774\uC6A9 \uB3D9\uC758 <small>${escapeHtml(profile.privacyAgreedAt)}</small></label></section><p class="member-profile-error"></p><footer><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uC800\uC7A5</button></footer></form>`;
      const form = layer.querySelector("#member-profile-form");
      form.querySelector('button[type="button"]').onclick = () => layer.remove();
      form.onsubmit = async (event) => {
        event.preventDefault();
        const submit2 = form.querySelector('button[type="submit"]'), error = form.querySelector(".member-profile-error");
        submit2.disabled = true;
        error.textContent = "";
        const values = Object.fromEntries(new FormData(form).entries());
        try {
          const save = await fetch("/api/parishioner/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, pushOptIn: form.elements.namedItem("pushOptIn").checked, emailOptIn: form.elements.namedItem("emailOptIn").checked }) }), result = await save.json();
          if (!save.ok) throw new Error(result.message);
          layer.remove();
          location.reload();
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      };
    } catch (error) {
      layer.querySelector(".member-modal-body").innerHTML = `<p>${escapeHtml(error.message)}</p><button class="green-outline" type="button">\uB2EB\uAE30</button>`;
      layer.querySelector("button").onclick = () => layer.remove();
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("#member-privacy");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.body.classList.remove("member-menu-open");
    const menu2 = document.querySelector("#member-mobile-menu"), backdrop = document.querySelector("#member-menu-backdrop"), menuButton = document.querySelector("#member-menu-button");
    menu2?.classList.remove("open");
    menu2?.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "\uBA54\uB274 \uC5F4\uAE30");
    if (backdrop) backdrop.hidden = true;
    void openMemberProfileForm();
  }, true);
  function arrangeMemberProfileModal() {
    const form = document.querySelector("#member-profile-form:not([data-layout-ready])");
    if (!form) return;
    form.dataset.layoutReady = "true";
    const footer = form.querySelector(":scope>footer"), scroll = document.createElement("div");
    scroll.className = "member-profile-scroll";
    [...form.children].filter((child) => child !== footer).forEach((child) => scroll.append(child));
    form.insertBefore(scroll, footer);
    enhanceMemberProfileForm(form);
    enhanceMemberProfileConfirmation(form);
    enhanceMemberProfilePassword(form);
    enhanceMemberProfileChrome(form);
    enhanceMemberProfileGender(form);
  }
  new MutationObserver(arrangeMemberProfileModal).observe(document.body, { childList: true, subtree: true });
  var kakaoPostcodeLoader = null;
  function loadKakaoPostcode() {
    if (window.daum?.Postcode) return Promise.resolve();
    if (kakaoPostcodeLoader) return kakaoPostcodeLoader;
    kakaoPostcodeLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("\uCE74\uCE74\uC624 \uC8FC\uC18C \uAC80\uC0C9\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      document.head.append(script);
    });
    return kakaoPostcodeLoader;
  }
  function openAgreementDetail(kind) {
    const termsText = "Paxlink\uB294 \uC131\uB2F9 \uACF5\uB3D9\uCCB4\uC758 \uC2E0\uB3C4 \uC815\uBCF4 \uD655\uC778\uACFC \uC11C\uBE44\uC2A4 \uC81C\uACF5\uC744 \uC704\uD55C \uD50C\uB7AB\uD3FC\uC785\uB2C8\uB2E4. \uD68C\uC6D0\uC740 \uC815\uD655\uD55C \uC815\uBCF4\uB97C \uC81C\uACF5\uD558\uACE0 \uD0C0\uC778\uC758 \uC815\uBCF4\uB97C \uB3C4\uC6A9\uD558\uC9C0 \uC54A\uC544\uC57C \uD569\uB2C8\uB2E4. \uC11C\uBE44\uC2A4 \uC6B4\uC601\uC744 \uBC29\uD574\uD558\uAC70\uB098 \uBD88\uBC95\uC801\uC778 \uBAA9\uC801\uC73C\uB85C \uC774\uC6A9\uD560 \uC218 \uC5C6\uC73C\uBA70, \uD68C\uC6D0\uC740 \uC5B8\uC81C\uB4E0\uC9C0 \uD0C8\uD1F4\uB97C \uC694\uCCAD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", privacyText = "\uC218\uC9D1 \uD56D\uBAA9: \uC18C\uC18D \uC131\uB2F9, \uC774\uB984, \uC138\uB840\uBA85, \uC774\uBA54\uC77C, \uC0DD\uB144\uC6D4\uC77C, \uC804\uD654\uBC88\uD638, \uBAA8\uBC14\uC77C\uD3F0\uBC88\uD638, \uC8FC\uC18C, \uC6B0\uD3B8\uBC88\uD638. \uC774\uC6A9 \uBAA9\uC801: \uC2E0\uB3C4 \uC2DD\uBCC4, \uC131\uB2F9 \uACF5\uB3D9\uCCB4 \uC11C\uBE44\uC2A4 \uBC0F \uACF5\uC9C0 \uC81C\uACF5, \uBB38\uC758 \uC751\uB300. \uBCF4\uC720 \uAE30\uAC04: \uD68C\uC6D0 \uD0C8\uD1F4 \uB610\uB294 \uAD00\uB828 \uBC95\uB839\uC5D0 \uB530\uB978 \uBCF4\uAD00 \uAE30\uAC04\uAE4C\uC9C0. \uB3D9\uC758\uB97C \uAC70\uBD80\uD560 \uC218 \uC788\uC73C\uB098 \uD68C\uC6D0\uAC00\uC785\uC774 \uC81C\uD55C\uB429\uB2C8\uB2E4.";
    modal(kind === "terms" ? "\uC774\uC6A9\uC57D\uAD00" : "\uAC1C\uC778\uC815\uBCF4 \uC218\uC9D1\xB7\uC774\uC6A9 \uB3D9\uC758", `<p style="text-align:left;line-height:1.8;white-space:pre-wrap">${kind === "terms" ? termsText : privacyText}</p>`);
  }
  function enhanceMemberProfileForm(form) {
    const postal = form.elements.namedItem("postalCode"), address = form.elements.namedItem("address"), addressDetail = form.elements.namedItem("addressDetail"), postalLabel = postal.closest("label");
    const addressButton = document.createElement("button");
    addressButton.className = "green-outline member-profile-address-search";
    addressButton.type = "button";
    addressButton.textContent = "\uCE74\uCE74\uC624 \uC8FC\uC18C \uAC80\uC0C9";
    postalLabel.insertAdjacentElement("afterend", addressButton);
    addressButton.onclick = async () => {
      addressButton.disabled = true;
      try {
        await loadKakaoPostcode();
        new window.daum.Postcode({ oncomplete: (data) => {
          postal.value = data.zonecode;
          address.value = data.roadAddress || data.jibunAddress;
          addressDetail.focus();
        } }).open();
      } catch (error) {
        form.querySelector(".member-profile-error").textContent = error.message;
      } finally {
        addressButton.disabled = false;
      }
    };
    form.querySelectorAll(".profile-consent.confirmed").forEach((label, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "agreement-detail-button";
      button.textContent = "\uB0B4\uC6A9 \uD655\uC778";
      button.onclick = () => openAgreementDetail(index === 0 ? "terms" : "privacy");
      label.append(button);
    });
  }
  document.head.insertAdjacentHTML("beforeend", "<style>.member-profile-modal>.member-modal-box{display:flex;height:min(90vh,820px);flex-direction:column;overflow:hidden}.member-profile-modal>.member-modal-box>h3{flex:0 0 auto;text-align:center}.member-profile-modal .member-modal-body{display:flex;min-height:0;flex:1;padding:0;overflow:hidden}.member-profile-modal #member-profile-form{display:flex;min-height:0;width:100%;flex-direction:column}.member-profile-scroll{min-height:0;flex:1;padding:20px;overflow-y:auto}.member-profile-scroll>section+section{margin-top:12px}.member-profile-modal #member-profile-form>footer{position:static;flex:0 0 auto;margin:0;padding:14px 20px;border-top:1px solid var(--line);background:#fff}.member-profile-modal label:has(>i){position:relative;padding-left:10px}.member-profile-modal label>i{position:absolute;top:0;left:0}@media(max-width:600px){.member-profile-scroll{padding:12px}.member-profile-modal #member-profile-form>footer{padding:12px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-profile-scroll>section{padding:16px;border:1px solid var(--line);border-radius:11px}.member-profile-scroll>section+section{margin-top:12px}@media(max-width:600px){.member-profile-scroll>section{padding:13px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-profile-address-search{height:42px;align-self:end}.member-profile-address-search:disabled{opacity:.5;cursor:wait}.member-profile-modal .profile-consent.confirmed{flex-wrap:wrap}.agreement-detail-button{margin-left:8px;padding:5px 10px;border:1px solid #9dd7c4;border-radius:7px;background:#fff;color:var(--green);font-size:9px;font-weight:700;cursor:pointer}.member-profile-modal .profile-consent.confirmed>small{margin-left:auto}@media(max-width:600px){.member-profile-address-search{width:100%}.agreement-detail-button{margin-left:auto}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-profile-modal>.member-modal-box{position:relative}.member-profile-modal-close{position:absolute;z-index:3;top:8px;right:10px;width:36px;height:36px;padding:0;border:0!important;background:transparent!important;color:#fff!important;font-size:27px;line-height:1;cursor:pointer}.member-profile-address-search.aligned{width:100%;margin:0;justify-self:stretch}.member-profile-detail-address{grid-column:1/-1!important}.member-password-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}@media(max-width:700px){.member-password-grid{grid-template-columns:1fr}.member-profile-modal-close{top:7px;right:7px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-profile-grid>.member-profile-blue-align,.member-profile-grid>.member-profile-address-search{width:calc(100% - 10px);margin-left:10px}</style>");
  function enhanceMemberProfileChrome(form) {
    const box = form.closest(".member-modal-box"), layer = box.closest(".member-modal"), grid = form.querySelector(".member-profile-grid"), addressButton = form.querySelector(".member-profile-address-search"), postal = form.elements.namedItem("postalCode").closest("label"), address = form.elements.namedItem("address").closest("label"), detail = form.elements.namedItem("addressDetail").closest("label"), email2 = form.querySelector('input[type="email"]').closest("label");
    addressButton.textContent = "\uC8FC\uC18C \uAC80\uC0C9";
    addressButton.classList.add("aligned");
    address.classList.remove("full");
    detail.classList.remove("full", "member-profile-detail-address");
    detail.classList.add("member-profile-blue-align");
    email2.classList.add("member-profile-blue-align");
    grid.append(address, addressButton, detail, postal);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "member-profile-modal-close";
    close.setAttribute("aria-label", "\uB2EB\uAE30");
    close.textContent = "\xD7";
    close.onclick = () => layer.remove();
    box.append(close);
  }
  function enhanceMemberProfileConfirmation(form) {
    form.addEventListener("submit", (event) => {
      if (form.dataset.saveConfirmed === "true") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      document.querySelector(".member-profile-save-confirm")?.remove();
      const layer = document.createElement("div");
      layer.className = "member-modal member-profile-save-confirm";
      layer.innerHTML = '<section class="member-modal-box confirm-box"><h3>\uAC1C\uC778\uC815\uBCF4 \uC800\uC7A5</h3><div class="member-modal-body"><p>\uC800\uC7A5\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><div class="modal-actions"><button class="green-outline" type="button" data-profile-save="cancel">\uCDE8\uC18C</button><button class="green-button" type="button" data-profile-save="confirm">\uC800\uC7A5</button></div></section>';
      document.body.append(layer);
      layer.querySelector('[data-profile-save="cancel"]').onclick = () => layer.remove();
      layer.querySelector('[data-profile-save="confirm"]').onclick = () => {
        layer.remove();
        form.dataset.saveConfirmed = "true";
        form.requestSubmit();
      };
    }, true);
  }
  function enhanceMemberProfilePassword(form) {
    const original = form.elements.namedItem("password"), section = original?.closest("section");
    if (!original || !section) return;
    const hasPassword = original.placeholder.includes("\uBCC0\uACBD\uD560 \uACBD\uC6B0");
    section.innerHTML = `<h4>\uBE44\uBC00\uBC88\uD638 \uC218\uC815</h4><div class="member-password-grid"><label>\uD604\uC7AC \uBE44\uBC00\uBC88\uD638<input name="currentPassword" type="password" autocomplete="current-password" ${hasPassword ? "" : "disabled"} placeholder="${hasPassword ? "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638 \uC785\uB825" : "\uAE30\uC874 \uBE44\uBC00\uBC88\uD638 \uC5C6\uC74C"}"></label><label>\uC0C8 \uBE44\uBC00\uBC88\uD638<input name="newPassword" type="password" minlength="8" autocomplete="new-password" placeholder="8\uC790 \uC774\uC0C1 \uC785\uB825"></label><label>\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778<input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" placeholder="\uC0C8 \uBE44\uBC00\uBC88\uD638 \uB2E4\uC2DC \uC785\uB825"></label></div><small>${hasPassword ? "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638 \uD655\uC778 \uD6C4 \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." : "\uD604\uC7AC \uB85C\uADF8\uC778\uC740 \uC774\uBA54\uC77C \uC778\uC99D\uCF54\uB4DC \uBC29\uC2DD\uC774\uBA70 \uC0C8 \uBE44\uBC00\uBC88\uD638\uB97C \uC124\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</small>`;
    form.addEventListener("submit", (event) => {
      if (form.dataset.passwordVerified === "true") {
        delete form.dataset.passwordVerified;
        return;
      }
      const current = form.elements.namedItem("currentPassword"), newPassword = form.elements.namedItem("newPassword"), confirmPassword = form.elements.namedItem("confirmPassword");
      if (!current.value && !newPassword.value && !confirmPassword.value) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const error = form.querySelector(".member-profile-error");
      error.textContent = "";
      if (hasPassword && !current.value) {
        error.textContent = "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
        current.focus();
        return;
      }
      if (newPassword.value.length < 8) {
        error.textContent = "\uC0C8 \uBE44\uBC00\uBC88\uD638\uB294 8\uC790 \uC774\uC0C1 \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
        newPassword.focus();
        return;
      }
      if (newPassword.value !== confirmPassword.value) {
        error.textContent = "\uC0C8 \uBE44\uBC00\uBC88\uD638\uC640 \uD655\uC778 \uAC12\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
        confirmPassword.focus();
        return;
      }
      void fetch("/api/parishioner/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current.value, newPassword: newPassword.value, confirmPassword: confirmPassword.value }) }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        form.dataset.passwordVerified = "true";
        current.value = newPassword.value = confirmPassword.value = "";
        form.requestSubmit();
      }).catch((reason) => {
        error.textContent = reason.message;
      });
    }, true);
  }
  function enhanceMemberProfileGender(form) {
    const birth = form.elements.namedItem("birthDate").closest("label"), label = document.createElement("label");
    label.className = "member-profile-gender";
    label.innerHTML = '<span>\uC131\uBCC4</span><select name="gender"><option value="">\uC120\uD0DD \uC548 \uD568</option><option value="male">\uB0A8\uC131</option><option value="female">\uC5EC\uC131</option><option value="other">\uAE30\uD0C0</option></select>';
    birth.insertAdjacentElement("afterend", label);
    const select = label.querySelector("select");
    void fetch("/api/parishioner/profile/gender").then(async (response) => {
      const result = await response.json();
      if (response.ok) select.value = String(result.gender ?? "");
    });
    form.addEventListener("submit", (event) => {
      if (form.dataset.genderVerified === "true") {
        delete form.dataset.genderVerified;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const error = form.querySelector(".member-profile-error");
      void fetch("/api/parishioner/profile/gender", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gender: select.value }) }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        form.dataset.genderVerified = "true";
        form.requestSubmit();
      }).catch((reason) => {
        error.textContent = reason.message;
      });
    }, true);
  }
  document.head.insertAdjacentHTML("beforeend", "<style>.member-profile-gender select{width:100%;height:42px;padding:0 11px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-groups>header>div{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}.member-groups #member-group-count{color:var(--green);font-size:11px;font-weight:700;white-space:nowrap}</style>");
  var notificationTimer = 0;
  var notificationInitialized = false;
  var latestNotificationId = 0;
  var notificationItems = [];
  function openNotificationCenter() {
    document.querySelector(".member-notification-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal member-notification-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uC54C\uB9BC</h3><div class="member-modal-body">${notificationItems.length ? notificationItems.map((item) => `<article class="member-notification-item ${item.unread ? "unread" : ""}"><div><strong>${escapeHtml(item.title)}</strong>${item.unread ? "<b>\uC77D\uC9C0 \uC54A\uC74C</b>" : '<b class="read">\uC77D\uC74C</b>'}</div><p>${escapeHtml(item.message)}</p><footer><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time>${item.unread ? `<button class="member-notification-read" data-notification-read="${item.id}" type="button">\uC77D\uC74C</button>` : ""}</footer></article>`).join("") : '<p class="member-notification-empty">\uB3C4\uCC29\uD55C \uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}</div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").addEventListener("click", () => layer.remove());
    layer.querySelectorAll("[data-notification-read]").forEach((button) => button.onclick = async () => {
      button.disabled = true;
      const response = await fetch(`/api/parishioner/notifications/${button.dataset.notificationRead}/read`, { method: "POST" });
      if (!response.ok) {
        button.disabled = false;
        return;
      }
      location.reload();
    });
  }
  function showRealtimeNotification(item) {
    document.querySelector(".member-realtime-toast")?.remove();
    const toast = document.createElement("button");
    toast.className = "member-realtime-toast";
    toast.type = "button";
    toast.innerHTML = `<span>\uC0C8 \uC54C\uB9BC</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p>`;
    document.body.append(toast);
    toast.onclick = () => {
      toast.remove();
      openNotificationCenter();
    };
    window.setTimeout(() => toast.remove(), 8e3);
  }
  async function pollNotifications(announce = true) {
    try {
      const response = await fetch("/api/parishioner/notifications"), items = await response.json();
      if (!response.ok) return;
      const newest = items[0]?.id ?? 0;
      if (notificationInitialized && announce && newest > latestNotificationId) {
        const arrived = items.find((item) => item.id > latestNotificationId);
        if (arrived) showRealtimeNotification(arrived);
      }
      notificationItems = items;
      latestNotificationId = Math.max(latestNotificationId, newest);
      notificationInitialized = true;
      const unread = items.filter((item) => item.unread).length, badge = document.querySelector("#member-notification-button b");
      badge.textContent = String(unread);
      badge.hidden = !unread;
    } catch (error) {
      console.error(error);
    }
  }
  function mountRealtimeNotifications() {
    document.querySelector("#member-notification-button")?.addEventListener("click", openNotificationCenter);
    window.clearInterval(notificationTimer);
    void pollNotifications(false);
    notificationTimer = window.setInterval(() => void pollNotifications(), 3e3);
  }
  async function getNotices(url) {
    const response = await fetch(url), data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  var memberNotices = [];
  var visibleMemberNoticeCount = 2;
  function openMemberNoticeDetail(item) {
    document.querySelector(".member-notice-detail-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal member-notice-detail-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(item.title)}</h3><div class="member-modal-body"><div class="member-notice-detail-meta">${item.pinned ? "<b>\uC0C1\uB2E8 \uACE0\uC815</b>" : ""}<time>${new Date(item.createdAt).toLocaleDateString("ko-KR")}</time></div><p>${escapeHtml(item.content)}</p>${item.attachments.length ? `<div class="popup-files">${item.attachments.map((file) => `<a href="/api/parishioner/notices/${item.id}/attachments/${file.slot}">\u{1F4CE} ${escapeHtml(file.name)}</a>`).join("")}</div>` : ""}</div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("footer button").onclick = () => layer.remove();
  }
  function renderMemberNotices() {
    const list = document.querySelector("#member-notice-list"), empty = document.querySelector("#member-notice-empty"), more = document.querySelector(".member-notice-more");
    if (!list || !empty || !more) return;
    list.innerHTML = memberNotices.slice(0, visibleMemberNoticeCount).map((item) => `<article class="member-notice"><div>${item.pinned ? "<b>\uC0C1\uB2E8 \uACE0\uC815</b>" : ""}<time>${new Date(item.createdAt).toLocaleDateString("ko-KR")}</time></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><button class="member-notice-detail green-outline" data-member-notice-detail="${item.id}" type="button">\uC0C1\uC138\uBCF4\uAE30</button></article>`).join("");
    list.querySelectorAll("[data-member-notice-detail]").forEach((button) => button.onclick = () => {
      const item = memberNotices.find((notice) => notice.id === Number(button.dataset.memberNoticeDetail));
      if (item) openMemberNoticeDetail(item);
    });
    more.hidden = visibleMemberNoticeCount >= memberNotices.length;
    empty.hidden = memberNotices.length > 0;
  }
  async function loadNotices() {
    try {
      memberNotices = await getNotices("/api/parishioner/notices");
      visibleMemberNoticeCount = 2;
      const header = document.querySelector(".member-notices>header");
      if (!header.querySelector(".member-notice-more")) {
        const button = document.createElement("button");
        button.className = "member-notice-more green-outline";
        button.type = "button";
        button.textContent = "more";
        button.onclick = () => {
          visibleMemberNoticeCount += 2;
          renderMemberNotices();
        };
        header.append(button);
      }
      document.querySelector("#member-notice-count").textContent = `\uCD1D ${memberNotices.length}\uAC1C`;
      renderMemberNotices();
      await showNoticePopup();
    } catch (error) {
      console.error(error);
    }
  }
  async function showNoticePopup() {
    const notices = await getNotices("/api/parishioner/notices/popups/active"), today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA"), item = notices.find((value) => localStorage.getItem(`paxlink.parishioner.notice.${value.id}`) !== today);
    if (!item) return;
    const layer = document.createElement("div");
    layer.className = "member-modal member-notice-popup";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(item.title)}</h3><div class="member-modal-body"><p>${escapeHtml(item.content)}</p>${item.attachments.length ? `<div class="popup-files">${item.attachments.map((file) => `<a href="/api/parishioner/notices/${item.id}/attachments/${file.slot}">\u{1F4CE} ${escapeHtml(file.name)}</a>`).join("")}</div>` : ""}</div><label class="popup-today"><input type="checkbox"> \uC624\uB298 \uD558\uB8E8 \uBCF4\uC9C0 \uC54A\uAE30</label><button class="green-button" type="button">\uD655\uC778</button></section>`;
    document.body.append(layer);
    layer.querySelector("button").addEventListener("click", () => {
      if (layer.querySelector("input").checked) localStorage.setItem(`paxlink.parishioner.notice.${item.id}`, today);
      layer.remove();
    });
  }
  var memberGroupStatus = { requested: "\uC2B9\uC778\uC2E0\uCCAD", approved: "\uC2B9\uC778", rejected: "\uBC18\uB824", suspended: "\uC911\uC9C0" };
  async function loadMemberGroups() {
    const response = await fetch("/api/parishioner/groups"), groups = await response.json();
    if (!response.ok) throw new Error(groups.message);
    document.querySelector("#member-group-list").innerHTML = groups.map((group) => `<article class="member-group-card">${group.hasIcon ? `<img src="/api/parishioner/groups/${group.id}/icon" alt="">` : '<span class="member-group-icon">\u2659</span>'}<div><b class="group-state ${group.status}">${memberGroupStatus[group.status]}</b><h3>${escapeHtml(group.nameKo)}</h3><small>${escapeHtml(group.nameEn ?? "")}</small><p>${escapeHtml(group.description ?? "\uC124\uBA85\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.")}</p><em>${escapeHtml(group.regularMeeting ?? "\uC815\uAE30\uBBF8\uD305 \uBBF8\uC815")} \xB7 \uC6B4\uC601\uC790 ${escapeHtml(group.operatorName)}</em></div></article>`).join("");
    const created = groups.filter((group) => group.isOperator).length, joined = groups.filter((group) => !group.isOperator && group.membershipStatus === "approved").length;
    document.querySelector("#member-group-count").textContent = `\uCD1D ${groups.length}\uAC1C (\uC6B4\uC601: ${created} / \uAC00\uC785: ${joined})`;
    document.querySelector("#member-group-empty").hidden = groups.length > 0;
  }
  function openMemberGroupForm() {
    const layer = document.createElement("div");
    layer.className = "member-modal member-group-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uB2E8\uCCB4 \uC0DD\uC131 \uC2E0\uCCAD</h3><form><label>\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0<input id="member-group-icon" type="file" accept="image/*"></label><label>\uB2E8\uCCB4\uBA85(\uAD6D\uBB38) *<input id="member-group-ko" maxlength="200" required></label><label>\uB2E8\uCCB4\uBA85(\uC601\uBB38)<input id="member-group-en" maxlength="300"></label><label>\uC815\uAE30\uBBF8\uD305<input id="member-group-meeting" maxlength="500"></label><label>\uBAA8\uC784\uC124\uBA85<textarea id="member-group-description" rows="5"></textarea></label><p></p><div><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uC2B9\uC778 \uC2E0\uCCAD</button></div></form></section>`;
    document.body.append(layer);
    layer.querySelector('button[type="button"]').onclick = () => layer.remove();
    layer.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      const error = layer.querySelector("form>p");
      try {
        const file = layer.querySelector("#member-group-icon").files?.[0];
        if (file && file.size > 2 * 1024 * 1024) throw new Error("\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0\uB294 2MB\uAE4C\uC9C0 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
        const icon = file ? await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ iconType: file.type, iconData: String(reader.result).split(",")[1] ?? "" });
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }) : { iconType: "", iconData: "" }, payload = { ...icon, nameKo: layer.querySelector("#member-group-ko").value, nameEn: layer.querySelector("#member-group-en").value, regularMeeting: layer.querySelector("#member-group-meeting").value, description: layer.querySelector("#member-group-description").value }, save = await fetch("/api/parishioner/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), result = await save.json();
        if (!save.ok) throw new Error(result.errors ? Object.values(result.errors)[0] : result.message);
        layer.remove();
        await loadMemberGroups();
        modal("\uB2E8\uCCB4 \uC0DD\uC131", `<p>${escapeHtml(result.message)}</p>`);
      } catch (reason) {
        error.textContent = reason.message;
      }
    };
  }
  function mountMemberGroups() {
    const home = document.querySelector(".member-home");
    if (!home || document.querySelector(".member-groups")) return;
    home.querySelector(".member-notices")?.insertAdjacentHTML("beforebegin", `<section class="member-groups"><header><div><h2>\uB2E8\uCCB4</h2><span id="member-group-count"></span></div><button id="member-group-create" class="green-button" type="button">+ \uB2E8\uCCB4 \uC0DD\uC131</button></header><div id="member-group-list" class="member-group-list"></div><p id="member-group-empty" hidden>\uB4F1\uB85D\uB41C \uB2E8\uCCB4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p></section>`);
    document.querySelector("#member-group-create").addEventListener("click", openMemberGroupForm);
    void loadMemberGroups();
  }
  new MutationObserver(mountMemberGroups).observe(document.body, { childList: true, subtree: true });
  function mountMembershipResults() {
    const groups = document.querySelector(".member-groups");
    if (!groups || groups.getAttribute("data-membership-results-mounted")) return;
    groups.setAttribute("data-membership-results-mounted", "true");
    void loadMembershipResults();
  }
  new MutationObserver(mountMembershipResults).observe(document.body, { childList: true, subtree: true });
  async function loadMembershipResults() {
    try {
      const response = await fetch("/api/parishioner/group-membership-results"), results2 = await response.json();
      if (!response.ok) throw new Error(results2.message);
      const unread = results2.find((item) => item.unread);
      if (unread && !document.querySelector(".membership-result-modal")) showMembershipResult(unread);
    } catch (error) {
      console.error(error);
    }
  }
  function showMembershipResult(item) {
    const layer = document.createElement("div");
    layer.className = "member-modal membership-result-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uB2E8\uCCB4 \uAC00\uC785 \uACB0\uACFC</h3><div class="member-modal-body"><strong>${escapeHtml(item.groupName)}</strong><b class="result-${item.status}">${item.status === "approved" ? "\uAC00\uC785\uC774 \uC2B9\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : "\uAC00\uC785\uC774 \uBC18\uB824\uB418\uC5C8\uC2B5\uB2C8\uB2E4."}</b>${item.status === "rejected" ? `<dl><dt>\uBC18\uB824 \uC0AC\uC720</dt><dd>${escapeHtml(item.rejectionReason ?? "-")}</dd></dl>` : ""}</div><button class="green-button" type="button">\uD655\uC778</button></section>`;
    document.body.append(layer);
    layer.querySelector("button").onclick = async () => {
      await fetch(`/api/parishioner/group-membership-results/${item.id}/read`, { method: "POST" });
      layer.remove();
      await loadMembershipResults();
    };
  }
  var decoratingMemberGroups = false;
  new MutationObserver(async () => {
    const list = document.querySelector("#member-group-list");
    if (!list || !list.children.length || list.querySelector(".member-group-join") || decoratingMemberGroups) return;
    decoratingMemberGroups = true;
    try {
      const response = await fetch("/api/parishioner/groups"), groups = await response.json();
      [...list.querySelectorAll(".member-group-card")].forEach((card, index) => {
        const group = groups[index], actions = document.createElement("div");
        actions.className = "member-group-actions";
        const action = document.createElement("button");
        action.type = "button";
        action.className = "member-group-join";
        action.textContent = group.isOperator ? "\uB0B4\uAC00 \uB9CC\uB4E0 \uB2E8\uCCB4" : group.membershipStatus === "approved" ? "\uD0C8\uD1F4 \uC694\uCCAD" : group.membershipStatus === "withdrawal_requested" ? "\uD0C8\uD1F4 \uC2B9\uC778 \uB300\uAE30" : group.membershipStatus === "requested" ? "\uAC00\uC785 \uC2E0\uCCAD \uC911" : "\uAC00\uC785 \uC2E0\uCCAD";
        action.disabled = group.isOperator || group.membershipStatus === "requested" || group.membershipStatus === "withdrawal_requested" || group.status !== "approved";
        action.onclick = () => group.membershipStatus === "approved" ? requestGroupWithdrawal(group) : joinGroup(group.id, group.nameKo);
        actions.append(action);
        if (group.isOperator) {
          const manage = document.createElement("button");
          manage.type = "button";
          manage.className = "member-group-withdrawals";
          manage.textContent = `\uD0C8\uD1F4 \uC694\uCCAD ${group.withdrawalCount}\uBA85`;
          manage.onclick = () => openGroupWithdrawals(group);
          actions.append(manage);
        }
        card.querySelector("div").append(actions);
      });
    } finally {
      decoratingMemberGroups = false;
    }
  }).observe(document.body, { childList: true, subtree: true });
  function requestGroupJoinMessage(groupName) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal group-join-message-modal";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uB2E8\uCCB4 \uAC00\uC785 \uC2E0\uCCAD</h3><form><strong>${escapeHtml(groupName)}</strong><label>\uB4F1\uB85D\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 \uBA54\uC2DC\uC9C0<textarea maxlength="2000" rows="7" placeholder="\uAC00\uC785 \uB3D9\uAE30\uB098 \uB4F1\uB85D\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 \uB0B4\uC6A9\uC744 \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><p></p><footer><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uAC00\uC785 \uC2E0\uCCAD</button></footer></form></section>`;
      document.body.append(layer);
      const textarea = layer.querySelector("textarea"), submit2 = layer.querySelector('button[type="submit"]');
      textarea.oninput = () => submit2.disabled = !textarea.value.trim();
      layer.querySelector('button[type="button"]').onclick = () => {
        layer.remove();
        resolve(null);
      };
      layer.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        const message2 = textarea.value.trim();
        if (!message2) return;
        layer.remove();
        resolve(message2);
      };
      textarea.focus();
    });
  }
  async function joinGroup(id, name) {
    const message2 = await requestGroupJoinMessage(name);
    if (message2 === null) return;
    try {
      const response = await fetch(`/api/parishioner/groups/${id}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: message2 }) }), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      await loadMemberGroups();
      modal("\uB2E8\uCCB4 \uAC00\uC785", `<p>${escapeHtml(result.message)}</p>`);
    } catch (error) {
      modal("\uB2E8\uCCB4 \uAC00\uC785", `<p>${escapeHtml(error.message)}</p>`);
    }
  }
  function confirmGroupWithdrawal(name) {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal group-withdraw-confirm";
      layer.innerHTML = `<section class="member-modal-box"><h3>\uB2E8\uCCB4 \uD0C8\uD1F4 \uC694\uCCAD</h3><form><strong>${escapeHtml(name)}</strong><label>\uD0C8\uD1F4 \uC694\uCCAD \uC0AC\uC720<textarea maxlength="2000" rows="6" placeholder="\uB2E8\uCCB4 \uB4F1\uB85D\uC790\uAC00 \uD655\uC778\uD560 \uD0C8\uD1F4 \uC0AC\uC720\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><footer><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uD0C8\uD1F4 \uC694\uCCAD</button></footer></form></section>`;
      document.body.append(layer);
      const textarea = layer.querySelector("textarea"), submit2 = layer.querySelector('button[type="submit"]'), done = (value) => {
        layer.remove();
        resolve(value);
      };
      textarea.oninput = () => submit2.disabled = !textarea.value.trim();
      layer.querySelector('button[type="button"]').onclick = () => done(null);
      layer.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        const reason = textarea.value.trim();
        if (!reason) return;
        done(reason);
      };
      textarea.focus();
    });
  }
  async function requestGroupWithdrawal(group) {
    const reason = await confirmGroupWithdrawal(group.nameKo);
    if (reason === null) return;
    try {
      const response = await fetch(`/api/parishioner/groups/${group.id}/withdraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      await loadMemberGroups();
      modal("\uB2E8\uCCB4 \uD0C8\uD1F4 \uC694\uCCAD", `<p>${escapeHtml(result.message)}</p>`);
    } catch (error) {
      modal("\uB2E8\uCCB4 \uD0C8\uD1F4 \uC694\uCCAD", `<p>${escapeHtml(error.message)}</p>`);
    }
  }
  function requestWithdrawalRejection() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "member-modal withdrawal-reject-modal";
      layer.innerHTML = '<section class="member-modal-box"><h3>\uD0C8\uD1F4 \uC694\uCCAD \uBC18\uB824</h3><form><label>\uBC18\uB824 \uC0AC\uC720<textarea maxlength="1000" rows="6" placeholder="\uD68C\uC6D0\uC5D0\uAC8C \uC804\uB2EC\uD560 \uBC18\uB824 \uC0AC\uC720\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><footer><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uBC18\uB824 \uD655\uC815</button></footer></form></section>';
      document.body.append(layer);
      const textarea = layer.querySelector("textarea"), submit2 = layer.querySelector('button[type="submit"]');
      textarea.oninput = () => submit2.disabled = !textarea.value.trim();
      layer.querySelector('button[type="button"]').onclick = () => {
        layer.remove();
        resolve(null);
      };
      layer.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        const reason = textarea.value.trim();
        if (!reason) return;
        layer.remove();
        resolve(reason);
      };
      textarea.focus();
    });
  }
  async function openGroupWithdrawals(group) {
    document.querySelector(".group-withdrawals-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal group-withdrawals-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(group.nameKo)} \uD0C8\uD1F4 \uC694\uCCAD</h3><div class="member-modal-body">\uBD88\uB7EC\uC624\uB294 \uC911...</div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    try {
      const result = await catacombApi(`/api/parishioner/groups/${group.id}/withdrawals`), body = layer.querySelector(".member-modal-body");
      body.innerHTML = result.items.length ? `<div class="group-withdrawals-grid"><table><thead><tr><th>\uD68C\uC6D0</th><th>\uC5F0\uB77D\uCC98</th><th>\uD0C8\uD1F4 \uC0AC\uC720</th><th>\uC694\uCCAD\uC77C</th><th>\uACB0\uC815</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escapeHtml(item.name)}${item.baptismalName ? ` (${escapeHtml(item.baptismalName)})` : ""}</strong></td><td>${escapeHtml(item.email)}<br>${escapeHtml(item.mobile ?? "-")}</td><td class="withdrawal-request-reason">${escapeHtml(item.requestReason ?? "-")}</td><td>${new Date(item.requestedAt).toLocaleString("ko-KR")}</td><td><div><button data-withdrawal="${item.id}" data-decision="rejected" type="button">\uBC18\uB824</button><button data-withdrawal="${item.id}" data-decision="approved" type="button">\uC2B9\uC778</button></div></td></tr>`).join("")}</tbody></table></div>` : '<p class="member-notification-empty">\uB300\uAE30 \uC911\uC778 \uD0C8\uD1F4 \uC694\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      body.querySelectorAll("[data-withdrawal]").forEach((button) => button.onclick = async () => {
        const decision = button.dataset.decision, reason = decision === "rejected" ? await requestWithdrawalRejection() : "";
        if (decision === "rejected" && reason === null) return;
        await catacombApi(`/api/parishioner/groups/${group.id}/withdrawals/${button.dataset.withdrawal}`, { method: "PATCH", body: JSON.stringify({ decision, reason }) });
        layer.remove();
        await loadMemberGroups();
        modal("\uB2E8\uCCB4 \uD0C8\uD1F4 \uCC98\uB9AC", `<p>${decision === "approved" ? "\uD0C8\uD1F4\uB97C \uC2B9\uC778\uD588\uC2B5\uB2C8\uB2E4." : "\uD0C8\uD1F4 \uC694\uCCAD\uC744 \uBC18\uB824\uD588\uC2B5\uB2C8\uB2E4."}</p>`);
      });
    } catch (error) {
      layer.querySelector(".member-modal-body").textContent = error.message;
    }
  }
  var groupMeetingDays = [{ key: "mon", label: "\uC6D4" }, { key: "tue", label: "\uD654" }, { key: "wed", label: "\uC218" }, { key: "thu", label: "\uBAA9" }, { key: "fri", label: "\uAE08" }, { key: "sat", label: "\uD1A0" }, { key: "sun", label: "\uC77C" }];
  new MutationObserver(() => {
    const input = document.querySelector("#member-group-meeting");
    if (!input || input.dataset.scheduleReady) return;
    input.dataset.scheduleReady = "true";
    input.hidden = true;
    input.closest("label").classList.add("meeting-field");
    input.insertAdjacentHTML("afterend", `<div class="meeting-schedule">${groupMeetingDays.map((day) => `<div data-member-meeting="${day.key}"><label><input type="checkbox"> ${day.label}\uC694\uC77C</label><input class="meeting-from" type="time" disabled><span>~</span><input class="meeting-to" type="time" disabled></div>`).join("")}</div>`);
    const root = input.closest("label");
    root.querySelectorAll("[data-member-meeting]").forEach((row) => {
      const check = row.querySelector('input[type="checkbox"]');
      check.onchange = () => row.querySelectorAll('input[type="time"]').forEach((time) => {
        time.disabled = !check.checked;
        if (!check.checked) time.value = "";
      });
    });
    input.closest("form").addEventListener("submit", () => {
      input.value = JSON.stringify([...root.querySelectorAll("[data-member-meeting]")].filter((row) => row.querySelector('input[type="checkbox"]').checked).map((row) => ({ day: row.dataset.memberMeeting, from: row.querySelector(".meeting-from").value, to: row.querySelector(".meeting-to").value })));
    }, { capture: true });
  }).observe(document.body, { childList: true, subtree: true });
  function mountMemberSharing() {
    const home = document.querySelector(".member-home"), notices = document.querySelector(".member-notices");
    if (!home || !notices || document.querySelector(".member-sharing")) return;
    notices.insertAdjacentHTML("beforebegin", `<section class="member-sharing"><header><div><h2>\uB098\uB214</h2><p>\uBCF8\uB2F9 \uACF5\uB3D9\uCCB4\uC640 \uD568\uAED8\uD558\uB294 \uB098\uB214 \uACF5\uAC04\uC785\uB2C8\uB2E4.</p></div></header><nav class="member-sharing-tabs" role="tablist" aria-label="\uB098\uB214 \uBA54\uB274"><button class="active" data-member-sharing="catacomb" type="button" role="tab" aria-selected="true">\uCE74\uD0C0\uCF64</button><button data-member-sharing="talent" type="button" role="tab" aria-selected="false">\uB2EC\uB780\uD2B8</button><button data-member-sharing="prayer-dream" type="button" role="tab" aria-selected="false">\uAE30\uB3C4\uB4DC\uB9BC</button></nav><div class="member-sharing-panel" data-member-sharing-panel="catacomb"><span>\u2661</span><div><h3>\uCE74\uD0C0\uCF64</h3><p>\uCE74\uD0C0\uCF64 \uB098\uB214 \uD65C\uB3D9\uC744 \uD655\uC778\uD558\uACE0 \uCC38\uC5EC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div></div><div class="member-sharing-panel" data-member-sharing-panel="talent" hidden><span>\u25C7</span><div><h3>\uB2EC\uB780\uD2B8</h3><p>\uC11C\uB85C\uC758 \uC7AC\uB2A5\uC744 \uB098\uB204\uB294 \uB2EC\uB780\uD2B8 \uD65C\uB3D9\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div></div><div class="member-sharing-panel" data-member-sharing-panel="prayer-dream" hidden><span>\u2020</span><div><h3>\uAE30\uB3C4\uB4DC\uB9BC</h3><p>\uAE30\uB3C4\uB97C \uB098\uB204\uACE0 \uD568\uAED8 \uB9C8\uC74C\uC744 \uBAA8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div></div></section>`);
    document.querySelectorAll("[data-member-sharing]").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll("[data-member-sharing]").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-member-sharing-panel]").forEach((panel2) => panel2.hidden = panel2.dataset.memberSharingPanel !== button.dataset.memberSharing);
    }));
  }
  new MutationObserver(mountMemberSharing).observe(document.body, { childList: true, subtree: true });
  function mountMemberMission() {
    const sharing = document.querySelector(".member-sharing"), tabs = sharing?.querySelector(".member-sharing-tabs");
    if (!sharing || !tabs || tabs.querySelector('[data-member-sharing="mission"]')) return;
    const talentTab = tabs.querySelector('[data-member-sharing="talent"]');
    talentTab?.insertAdjacentHTML("beforebegin", '<button data-member-sharing="mission" type="button" role="tab" aria-selected="false">\uBBF8\uC158</button>');
    sharing.insertAdjacentHTML("beforeend", '<div class="member-sharing-panel" data-member-sharing-panel="mission" hidden><span>\u2713</span><div><h3>\uBBF8\uC158</h3><p>\uBCF8\uB2F9 \uACF5\uB3D9\uCCB4\uC640 \uD568\uAED8\uD558\uB294 \uBBF8\uC158\uC744 \uD655\uC778\uD558\uACE0 \uCC38\uC5EC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div></div>');
    const button = tabs.querySelector('[data-member-sharing="mission"]');
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-member-sharing]").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-member-sharing-panel]").forEach((panel2) => panel2.hidden = panel2.dataset.memberSharingPanel !== "mission");
    });
  }
  new MutationObserver(mountMemberMission).observe(document.body, { childList: true, subtree: true });
  function mountMissionWorkspaces() {
    const mission = document.querySelector('[data-member-sharing-panel="mission"]'), talent = document.querySelector('[data-member-sharing-panel="talent"]');
    if (mission && !mission.dataset.ready) {
      mission.dataset.ready = "true";
      mission.classList.add("mission-member-panel");
      mission.innerHTML = `<form id="member-mission-form" class="catacomb-form mission-form"><header><div><h3>\uBBF8\uC158 \uC791\uC131</h3><p>\uB4F1\uB85D\uD55C \uBBF8\uC158\uC740 \uAD00\uB9AC\uC790 \uC2B9\uC778 \uD6C4 \uB2EC\uB780\uD2B8\uC5D0 \uACF5\uAC1C\uB429\uB2C8\uB2E4.</p></div><button class="green-button" type="submit">\uC2B9\uC778 \uC694\uCCAD</button></header><label>\uC81C\uBAA9<input id="member-mission-title" maxlength="200" required placeholder="\uBBF8\uC158 \uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></label><label>\uB0B4\uC6A9<textarea id="member-mission-content" maxlength="20000" rows="5" required placeholder="\uD560\uC77C\uACFC \uD544\uC694\uD55C \uC5ED\uB7C9\uC5D0 \uB300\uD574 \uC801\uC5B4\uC8FC\uC138\uC694"></textarea></label><div class="mission-period"><label>\uB2EC\uB780\uD2B8 \uBAA8\uC9D1 \uC2DC\uC791\uC77C<input id="member-mission-from" type="date" required></label><span>~</span><label>\uB2EC\uB780\uD2B8 \uBAA8\uC9D1 \uC885\uB8CC\uC77C<input id="member-mission-to" type="date" required></label></div><label>\uD0DC\uADF8<input id="member-mission-tags" maxlength="1000" placeholder="\uC27C\uD45C(,) \uB610\uB294 \uB744\uC5B4\uC4F0\uAE30\uB85C \uAD6C\uBD84"></label><div id="member-mission-tag-preview" class="catacomb-tag-preview" hidden></div><p id="member-mission-error"></p></form><div class="catacomb-feed-head"><h3>\uB0B4 \uBBF8\uC158 \uB4F1\uB85D \uD604\uD669</h3><span id="member-mission-count"></span></div><div id="member-mission-list" class="member-mission-list"></div>`;
      document.querySelector("#member-mission-form").onsubmit = createMission;
      document.querySelector("#member-mission-tags").oninput = renderMissionTags;
      void loadMyMissions();
    }
    if (talent && !talent.dataset.ready) {
      talent.dataset.ready = "true";
      talent.classList.add("talent-mission-panel");
      talent.innerHTML = `<header class="talent-head"><div><h3>\uB2EC\uB780\uD2B8 \uBBF8\uC158</h3><p>\uC2B9\uC778\uB41C \uBBF8\uC158\uC744 \uD655\uC778\uD558\uACE0 \uC9C0\uC6D0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div><span id="talent-mission-count"></span></header><div id="talent-mission-list" class="talent-mission-list"></div><p id="talent-mission-empty" class="catacomb-empty" hidden>\uD604\uC7AC \uC9C0\uC6D0\uD560 \uC218 \uC788\uB294 \uBBF8\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>`;
      void loadTalentMissions();
    }
  }
  new MutationObserver(mountMissionWorkspaces).observe(document.body, { childList: true, subtree: true });
  var memberMissionFormSync = /* @__PURE__ */ new WeakMap();
  function prepareMemberMissionRegistration() {
    const form = document.querySelector("#member-mission-form");
    if (!form) return;
    let actions = document.querySelector("[data-member-mission-actions]");
    const existing = memberMissionFormSync.get(form);
    if (existing && actions) {
      existing();
      const footer2 = form.closest(".registration-form-modal")?.querySelector(":scope>.member-modal-box>footer");
      if (footer2 && !footer2.contains(actions)) footer2.prepend(actions);
      return;
    }
    form.querySelector(":scope>header")?.remove();
    const title = form.querySelector("#member-mission-title"), content = form.querySelector("#member-mission-content"), from = form.querySelector("#member-mission-from"), to = form.querySelector("#member-mission-to"), tags = form.querySelector("#member-mission-tags");
    [title, content, from, to, tags].forEach((control) => {
      control.required = true;
      const label = control.closest("label");
      if (label && !label.querySelector(".mission-required")) label.insertAdjacentHTML("afterbegin", '<span class="mission-required" aria-hidden="true">* </span>');
    });
    actions = document.createElement("div");
    actions.className = "member-mission-form-actions";
    actions.dataset.memberMissionActions = "true";
    actions.innerHTML = '<button class="green-button" type="submit" form="member-mission-form" disabled>\uC2B9\uC778 \uC694\uCCAD</button>';
    form.append(actions);
    const submit2 = actions.querySelector("button"), sync = () => {
      to.min = from.value;
      submit2.disabled = !title.value.trim() || !content.value.trim() || !from.value || !to.value || to.value < from.value || !tags.value.trim() || !form.checkValidity();
    };
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    memberMissionFormSync.set(form, sync);
    sync();
    const footer = form.closest(".registration-form-modal")?.querySelector(":scope>.member-modal-box>footer");
    if (footer) footer.prepend(actions);
  }
  new MutationObserver(prepareMemberMissionRegistration).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(prepareMemberMissionRegistration);
  document.head.insertAdjacentHTML("beforeend", "<style>.mission-required{color:#d94350;font-weight:800}.member-mission-form-actions{display:flex;justify-content:center;margin:20px -20px -20px;padding:16px 20px;border-top:1px solid var(--line);background:#fff}.member-mission-form-actions .green-button{width:auto;min-width:150px;margin:0}.member-mission-form-actions .green-button:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}.registration-form-modal-body #member-mission-form{padding-top:0}.registration-form-modal-body #member-mission-form>.member-mission-form-actions{margin-right:-24px;margin-bottom:-20px;margin-left:-24px}.registration-form-modal>.member-modal-box>footer>.member-mission-form-actions{display:contents}.registration-form-modal>.member-modal-box>footer:has(.member-mission-form-actions){gap:10px}.registration-form-modal>.member-modal-box>footer:has(.member-mission-form-actions)>button,.registration-form-modal>.member-modal-box>footer .member-mission-form-actions button{width:auto;min-width:130px;height:42px;margin:0}@media(max-width:650px){.registration-form-modal-body #member-mission-form>.member-mission-form-actions{margin-right:-14px;margin-left:-14px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.talent-mission-card .talent-applicant-count{height:auto;margin:0;padding:5px 9px;border:1px solid #8fcfba;border-radius:14px;background:var(--soft);color:var(--green);font-size:9px;font-weight:800;cursor:pointer}.talent-mission-card .talent-applicant-count:hover{background:#dff4ec}.talent-mission-card.is-closed .talent-applicant-count{border-color:#8fcfba;background:var(--soft);color:var(--green);cursor:pointer}.talent-mission-card>button.mission-owner-activity{margin-left:7px;border-color:#8fcfba;background:#fff;color:var(--green);cursor:pointer}.talent-mission-card>button.mission-owner-activity:hover{background:var(--soft)}</style>");
  function renderMissionTags() {
    const input = document.querySelector("#member-mission-tags"), preview = document.querySelector("#member-mission-tag-preview");
    if (!input || !preview) return;
    const tags = [...new Set(input.value.split(/[,\s]+/).map((value) => value.replace(/^#/, "").trim()).filter(Boolean))];
    preview.innerHTML = tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("");
    preview.hidden = !tags.length;
  }
  async function createMission(event) {
    event.preventDefault();
    const title = document.querySelector("#member-mission-title"), content = document.querySelector("#member-mission-content"), tags = document.querySelector("#member-mission-tags"), from = document.querySelector("#member-mission-from"), to = document.querySelector("#member-mission-to"), icon = document.querySelector("#member-mission-icon"), error = document.querySelector("#member-mission-error"), registrationModal = event.currentTarget.closest(".registration-form-modal");
    error.textContent = "";
    try {
      const file = icon?.files?.[0];
      if (file && file.size > 2 * 1024 * 1024) throw new Error("\uBBF8\uC158 \uC544\uC774\uCF58\uC740 2MB \uC774\uD558\uB85C \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.");
      if (file && !file.type.startsWith("image/")) throw new Error("\uBBF8\uC158 \uC544\uC774\uCF58\uC740 \uC774\uBBF8\uC9C0 \uD30C\uC77C\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
      const iconPayload = file ? await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ iconType: file.type, iconData: String(reader.result).split(",")[1] ?? "" });
        reader.onerror = () => reject(new Error("\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
        reader.readAsDataURL(file);
      }) : { iconType: "", iconData: "" };
      await catacombApi("/api/parishioner/missions", { method: "POST", body: JSON.stringify({ title: title.value, content: content.value, tags: tags.value, applicationFrom: from.value, applicationTo: to.value, anonymous: false, ...iconPayload }) });
      title.value = "";
      content.value = "";
      tags.value = "";
      from.value = "";
      to.value = "";
      if (icon) icon.value = "";
      renderMissionTags();
      registrationModal?.remove();
      document.body.classList.remove("modal-open");
      await loadMyMissions();
      modal("\uBBF8\uC158 \uB4F1\uB85D", "<p>\uAD00\uB9AC\uC790\uC5D0\uAC8C \uC2B9\uC778 \uC694\uCCAD\uC744 \uC804\uB2EC\uD588\uC2B5\uB2C8\uB2E4.</p>");
    } catch (reason) {
      error.textContent = reason.message;
    }
  }
  var missionStatusLabels = { requested: "\uC2B9\uC778 \uB300\uAE30", approved: "\uC2B9\uC778", rejected: "\uBC18\uB824", ended: "\uC885\uB8CC" };
  document.head.insertAdjacentHTML("beforeend", "<style>.mission-state.ended{background:#edf0f4;color:#657185}</style>");
  async function loadMyMissions() {
    try {
      const items = await catacombApi("/api/parishioner/missions/mine"), list = document.querySelector("#member-mission-list");
      list.innerHTML = items.map((item) => `<article class="member-mission-card"><header><b class="mission-state ${item.status}">${missionStatusLabels[item.status]}</b><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></header><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><small class="mission-period-label">\uBAA8\uC9D1\uAE30\uAC04 ${item.applicationFrom ?? "-"} ~ ${item.applicationTo ?? "-"}</small>${item.tags.length ? `<div class="catacomb-tags">${item.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}<button class="member-mission-applicants" data-owner-applicants="${item.id}" data-title="${escapeHtml(item.title)}" type="button">\uC2B9\uC778/\uBC18\uB824/\uC9C0\uC6D0 : ${item.approvedApplicationCount ?? 0} / ${item.rejectedApplicationCount ?? 0} / ${item.applicationCount ?? 0}</button>${item.status === "rejected" ? `<div class="member-mission-reason"><strong>\uBC18\uB824 \uC0AC\uC720</strong><p>${escapeHtml(item.rejectionReason ?? "-")}</p></div>` : ""}</article>`).join("");
      document.querySelector("#member-mission-count").textContent = `\uCD1D ${items.length}\uAC1C`;
      list.querySelectorAll("[data-owner-applicants]").forEach((button) => button.onclick = () => openOwnerApplicants(Number(button.dataset.ownerApplicants), button.dataset.title ?? "\uBBF8\uC158"));
      const rejected = items.find((item) => item.status === "rejected" && item.decidedAt && localStorage.getItem(`paxlink.mission.rejected.${item.id}`) !== item.decidedAt);
      if (rejected) {
        localStorage.setItem(`paxlink.mission.rejected.${rejected.id}`, String(rejected.decidedAt));
        modal("\uBBF8\uC158 \uC2B9\uC778 \uACB0\uACFC", `<strong>${escapeHtml(rejected.title)}</strong><p>\uBBF8\uC158\uC774 \uBC18\uB824\uB418\uC5C8\uC2B5\uB2C8\uB2E4.</p><dl><dt>\uBC18\uB824 \uC0AC\uC720</dt><dd>${escapeHtml(rejected.rejectionReason ?? "-")}</dd></dl>`);
      }
    } catch (error) {
      console.error(error);
    }
  }
  async function loadTalentMissions() {
    try {
      const items = await catacombApi("/api/parishioner/talent/missions"), list = document.querySelector("#talent-mission-list");
      list.innerHTML = items.map((item) => {
        const total = item.applicationCount ?? 0, pending = item.requestedApplicationCount ?? 0, approved = item.approvedApplicationCount ?? 0, summary = `${item.applicationOpen ? "\uBAA8\uC9D1\uC911" : "\uBAA8\uC9D1\uC885\uB8CC"} \xB7 \uC2B9\uC778 ${approved}\uBA85 \xB7 \uC9C0\uC6D0\uC790 ${pending}\uBA85`, applicants = item.isOwner && total > 0 ? `<button class="talent-applicant-count" data-talent-applicants="${item.id}" data-title="${escapeHtml(item.title)}" type="button">${summary}</button>` : `<b>${summary}</b>`;
        return `<article class="talent-mission-card ${item.applicationOpen ? "" : "is-closed"}"><header><div><strong>${escapeHtml(item.authorName ?? "\uC775\uBA85")}</strong><time>${new Date(item.createdAt).toLocaleDateString("ko-KR")}</time></div>${applicants}</header><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><small class="mission-period-label">\uBAA8\uC9D1\uAE30\uAC04 ${item.applicationFrom ?? "-"} ~ ${item.applicationTo ?? "-"}</small>${item.tags.length ? `<div class="catacomb-tags">${item.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}${item.applicationStatus === "rejected" ? `<div class="application-rejection-result"><strong>\uC9C0\uC6D0 \uBC18\uB824 \uC0AC\uC720</strong><p>${escapeHtml(item.applicationRejectionReason ?? "\uBC18\uB824 \uC0AC\uC720\uAC00 \uC800\uC7A5\uB418\uC9C0 \uC54A\uC740 \uC774\uC804 \uCC98\uB9AC \uAC74\uC785\uB2C8\uB2E4.")}</p></div>` : ""}${item.isOwner ? '<button class="owner-disabled" type="button" disabled>\uB0B4\uAC00 \uB4F1\uB85D\uD55C \uBBF8\uC158</button>' : item.applicationStatus === "requested" ? `<button class="mission-application-cancel" data-mission-cancel="${item.id}" data-mission-apply="${item.id}" type="button">\uC9C0\uC6D0 \uCDE8\uC18C</button>` : `<button class="${item.applicationStatus && item.applicationStatus !== "rejected" ? "applied" : ""}" data-mission-apply="${item.id}" type="button" ${item.applicationStatus && item.applicationStatus !== "rejected" || !item.applicationOpen ? "disabled" : ""}>${item.applicationStatus === "approved" ? "\uC9C0\uC6D0 \uC2B9\uB099" : item.applicationStatus === "rejected" && item.applicationOpen ? "\uC7AC\uC9C0\uC6D0" : item.applicationStatus === "rejected" ? "\uC9C0\uC6D0 \uBC18\uB824" : item.applicationOpen ? "\uBBF8\uC158 \uC9C0\uC6D0" : "\uBAA8\uC9D1 \uC885\uB8CC"}</button>`}</article>`;
      }).join("");
      document.querySelector("#talent-mission-count").textContent = `\uC2B9\uC778 \uBBF8\uC158 ${items.length}\uAC1C`;
      document.querySelector("#talent-mission-empty").hidden = items.length > 0;
      list.querySelectorAll("[data-talent-applicants]").forEach((button) => button.onclick = () => openOwnerApplicants(Number(button.dataset.talentApplicants), button.dataset.title ?? "\uBBF8\uC158"));
      list.querySelectorAll("[data-mission-apply]:not(:disabled):not([data-mission-cancel])").forEach((button) => button.onclick = () => applyMission(Number(button.dataset.missionApply)));
      list.querySelectorAll("[data-mission-cancel]").forEach((button) => button.onclick = () => cancelMissionApplication(Number(button.dataset.missionCancel)));
      const rejected = items.find((item) => item.applicationStatus === "rejected" && item.applicationDecidedAt && localStorage.getItem(`paxlink.mission.application.rejected.${item.id}`) !== item.applicationDecidedAt);
      if (rejected) {
        localStorage.setItem(`paxlink.mission.application.rejected.${rejected.id}`, String(rejected.applicationDecidedAt));
        modal("\uBBF8\uC158 \uC9C0\uC6D0 \uACB0\uACFC", `<strong>${escapeHtml(rejected.title)}</strong><p>\uC9C0\uC6D0\uC774 \uBC18\uB824\uB418\uC5C8\uC2B5\uB2C8\uB2E4.</p><dl><dt>\uBC18\uB824 \uC0AC\uC720</dt><dd>${escapeHtml(rejected.applicationRejectionReason ?? "\uBC18\uB824 \uC0AC\uC720\uAC00 \uC800\uC7A5\uB418\uC9C0 \uC54A\uC740 \uC774\uC804 \uCC98\uB9AC \uAC74\uC785\uB2C8\uB2E4.")}</dd></dl>`);
      }
    } catch (error) {
      console.error(error);
    }
  }
  function markParticipatingMissions() {
    document.querySelectorAll(".talent-mission-card [data-mission-apply].applied").forEach((button) => {
      if (button.textContent !== "\uC9C0\uC6D0 \uC2B9\uB099") return;
      const card = button.closest(".talent-mission-card"), summary = card?.querySelector("header>b"), missionId = Number(button.dataset.missionApply), title = card?.querySelector("h3")?.textContent ?? "\uBBF8\uC158";
      if (summary && !summary.querySelector(".participating-status")) {
        summary.insertAdjacentHTML("beforeend", '<span class="participating-status">\uCC38\uC5EC\uC911</span>');
        const activity = document.createElement("button");
        activity.type = "button";
        activity.className = "mission-activity-open";
        activity.textContent = "\uD65C\uB3D9\uC77C\uC9C0";
        activity.onclick = (event) => {
          event.stopPropagation();
          void openMissionActivity(missionId, title);
        };
        summary.append(activity);
      }
      button.textContent = "\uCC38\uC5EC\uC911";
      button.classList.add("participating");
    });
  }
  new MutationObserver(markParticipatingMissions).observe(document.documentElement, { childList: true, subtree: true });
  document.head.insertAdjacentHTML("beforeend", "<style>.mission-activity-modal>.member-modal-box{display:flex;flex-direction:column}.mission-activity-modal>.member-modal-box>.mission-activity-body{flex:1;min-height:0}.mission-activity-modal>.member-modal-box>footer{flex:0 0 auto;align-items:center;justify-content:center;min-height:70px;margin:0;padding:14px 20px;border-top:1px solid var(--line);background:#fff}.mission-activity-modal>.member-modal-box>footer .green-outline{width:120px;min-width:120px;height:42px;margin:0;border-radius:9px;font-weight:700}.mission-activity-form.owner-view-only{display:none}.member-mission-owner-activity{margin:12px 0 0 6px;padding:6px 10px;border:1px solid #8fcfba;border-radius:12px;background:#fff;color:var(--green);font-size:9px;font-weight:700;cursor:pointer}@media(max-width:620px){.mission-activity-modal>.member-modal-box>footer{min-height:62px;padding:10px 14px}.mission-activity-modal>.member-modal-box>footer .green-outline{width:110px;min-width:110px;height:40px}}</style>");
  async function openMissionActivity(missionId, title, viewOnly = false) {
    document.querySelector(".mission-activity-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal mission-activity-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(title)} \uD65C\uB3D9\uC77C\uC9C0</h3><div class="mission-activity-body"><form class="mission-activity-form${viewOnly ? " owner-view-only" : ""}"><h4>\uD65C\uB3D9\uC77C\uC9C0 \uB4F1\uB85D</h4><div class="mission-activity-schedule"><label>\uD65C\uB3D9\uC77C<input type="date" name="activityDate" required></label><label>\uC2DC\uC791\uC2DC\uAC04<input type="time" name="timeFrom" required></label><span>~</span><label>\uC885\uB8CC\uC2DC\uAC04<input type="time" name="timeTo" required></label></div><label>\uD55C \uC77C<textarea name="content" maxlength="5000" rows="5" required placeholder="\uBBF8\uC158\uC5D0\uC11C \uD55C \uC77C\uC744 \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><footer><p></p><button class="green-button" type="submit" disabled>\uD65C\uB3D9\uC77C\uC9C0 \uB4F1\uB85D</button></footer></form><section class="mission-activity-list"><header><h4>\uCC38\uC5EC\uC790 \uD65C\uB3D9 \uB0B4\uC5ED</h4><span data-activity-count></span></header><div class="mission-activity-items">\uBD88\uB7EC\uC624\uB294 \uC911...</div></section></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    const form = layer.querySelector("form"), date = form.querySelector('[name="activityDate"]'), from = form.querySelector('[name="timeFrom"]'), to = form.querySelector('[name="timeTo"]'), content = form.querySelector('[name="content"]'), submit2 = form.querySelector('button[type="submit"]'), sync = () => submit2.disabled = !date.value || !from.value || !to.value || from.value >= to.value || !content.value.trim();
    form.addEventListener("input", sync);
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (viewOnly || submit2.disabled) return;
      submit2.disabled = true;
      const error = form.querySelector("p");
      error.textContent = "";
      try {
        await catacombApi(`/api/parishioner/missions/${missionId}/activity-logs`, { method: "POST", body: JSON.stringify({ activityDate: date.value, timeFrom: from.value, timeTo: to.value, content: content.value }) });
        layer.remove();
        await openMissionActivity(missionId, title);
      } catch (reason) {
        error.textContent = reason.message;
        sync();
      }
    };
    try {
      const items = await catacombApi(`/api/parishioner/missions/${missionId}/activity-logs`), itemsRoot = layer.querySelector(".mission-activity-items");
      layer.querySelector("[data-activity-count]").textContent = `\uCD1D ${items.length}\uAC74`;
      itemsRoot.innerHTML = items.length ? items.map((item) => `<article class="mission-activity-log"><header><strong>${escapeHtml(item.authorName)}</strong><time>${item.activityDate} \xB7 ${item.timeFrom} ~ ${item.timeTo}</time></header><p>${escapeHtml(item.content)}</p><small>\uC791\uC131 ${new Date(item.createdAt).toLocaleString("ko-KR")}</small></article>`).join("") : '<p class="mission-activity-empty">\uB4F1\uB85D\uB41C \uD65C\uB3D9\uC77C\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    } catch (error) {
      layer.querySelector(".mission-activity-items").textContent = error.message;
    }
  }
  function mountOwnerActivityButtons() {
    document.querySelectorAll(".member-mission-applicants").forEach((applicants) => {
      const card = applicants.closest(".member-mission-card");
      if (!card || card.querySelector("[data-member-owner-activity]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "member-mission-owner-activity";
      button.dataset.memberOwnerActivity = applicants.dataset.ownerApplicants;
      button.textContent = "\uD65C\uB3D9\uC77C\uC9C0 \uD655\uC778";
      button.onclick = () => openMissionActivity(Number(applicants.dataset.ownerApplicants), applicants.dataset.title ?? "\uBBF8\uC158", true);
      applicants.insertAdjacentElement("afterend", button);
    });
  }
  new MutationObserver(mountOwnerActivityButtons).observe(document.body, { childList: true, subtree: true });
  mountOwnerActivityButtons();
  function applyMission(id) {
    const layer = document.createElement("div");
    layer.className = "member-modal mission-apply-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uBBF8\uC158 \uC9C0\uC6D0 \uC694\uCCAD</h3><form><label>\uB4F1\uB85D\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 \uBA54\uC2DC\uC9C0<textarea maxlength="2000" rows="7" required placeholder="\uC9C0\uC6D0 \uB3D9\uAE30\uC640 \uC804\uB2EC\uD560 \uBA54\uC2DC\uC9C0\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><p></p><div><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uC9C0\uC6D0 \uC694\uCCAD</button></div></form></section>`;
    document.body.append(layer);
    const textarea = layer.querySelector("textarea"), submit2 = layer.querySelector('button[type="submit"]');
    textarea.addEventListener("input", () => submit2.disabled = !textarea.value.trim());
    layer.querySelector('button[type="button"]').onclick = () => layer.remove();
    layer.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      if (!textarea.value.trim()) return;
      const error = layer.querySelector("form>p");
      submit2.disabled = true;
      try {
        await catacombApi(`/api/parishioner/missions/${id}/apply`, { method: "POST", body: JSON.stringify({ message: textarea.value }) });
        layer.remove();
        await loadTalentMissions();
        modal("\uC9C0\uC6D0\uD558\uC600\uC2B5\uB2C8\uB2E4", "<p>\uC9C0\uC6D0\uD558\uC600\uC2B5\uB2C8\uB2E4.</p>");
      } catch (reason) {
        error.textContent = reason.message;
        submit2.disabled = !textarea.value.trim();
      }
    };
  }
  async function cancelMissionApplication(id) {
    try {
      const result = await catacombApi(`/api/parishioner/missions/${id}/application`, { method: "DELETE" });
      await loadTalentMissions();
      modal("\uC9C0\uC6D0 \uCDE8\uC18C", `<p>${escapeHtml(result.message)}</p>`);
    } catch (error) {
      modal("\uC9C0\uC6D0 \uCDE8\uC18C", `<p>${escapeHtml(error.message)}</p>`);
    }
  }
  async function openOwnerApplicants(id, title) {
    const layer = document.createElement("div");
    layer.className = "member-modal owner-applicants-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(title)} \uC9C0\uC6D0\uC790</h3><div class="member-modal-body owner-applicants-body">\uBD88\uB7EC\uC624\uB294 \uC911...</div><button class="green-outline" type="button">\uB2EB\uAE30</button></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>button").onclick = () => layer.remove();
    try {
      const result = await catacombApi(`/api/parishioner/missions/${id}/applicants`);
      const labels2 = { requested: "\uACB0\uC815 \uB300\uAE30", approved: "\uC2B9\uC778", rejected: "\uBC18\uB824" };
      layer.querySelector(".owner-applicants-body").innerHTML = result.items.length ? `<div class="owner-applicants-grid"><table><thead><tr><th>\uC774\uB984</th><th>\uC5F0\uB77D\uCC98</th><th>\uC9C0\uC6D0\uC77C</th><th>\uC2B9\uC778\uC77C</th><th>\uC9C0\uC6D0 \uBA54\uC2DC\uC9C0</th><th>\uC0C1\uD0DC</th><th>\uACB0\uC815</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escapeHtml(item.name)}${item.baptismalName ? ` (${escapeHtml(item.baptismalName)})` : ""}</strong></td><td>${escapeHtml(item.email)}<br>${escapeHtml(item.mobile ?? "-")}</td><td class="owner-applicant-date">${escapeHtml(item.appliedAt)}</td><td class="owner-applicant-date">${escapeHtml(item.approvedAt ?? "-")}</td><td class="owner-applicant-message">${escapeHtml(item.message)}${item.rejectionReason ? `<div class="owner-application-reason"><strong>\uBC18\uB824 \uC0AC\uC720</strong><p>${escapeHtml(item.rejectionReason)}</p></div>` : ""}</td><td><b class="owner-applicant-status ${item.status}">${labels2[item.status]}</b></td><td>${item.status === "requested" ? `<div class="owner-applicant-decisions"><button data-owner-decision="rejected" data-id="${item.id}" type="button">\uBC18\uB824</button><button data-owner-decision="approved" data-id="${item.id}" type="button">\uC2B9\uC778</button></div>` : "-"}</td></tr>`).join("")}</tbody></table></div>` : "<p>\uC9C0\uC6D0\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>";
      layer.querySelectorAll("[data-owner-decision]").forEach((button) => button.onclick = async () => {
        const status = button.dataset.ownerDecision, rejectionReason = status === "rejected" ? await promptApplicationRejection() : "";
        if (status === "rejected" && rejectionReason === null) return;
        await catacombApi(`/api/parishioner/mission-applications/${button.dataset.id}/decision`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) });
        layer.remove();
        await Promise.all([loadMyMissions(), loadTalentMissions()]);
      });
    } catch (error) {
      layer.querySelector(".owner-applicants-body").textContent = error.message;
    }
  }
  new MutationObserver(() => {
    document.querySelectorAll(".member-mission-applicants").forEach((applicants) => {
      const card = applicants.closest(".member-mission-card");
      if (!card || card.querySelector("[data-owner-questions]")) return;
      const button = document.createElement("button"), missionId = Number(applicants.dataset.ownerApplicants);
      button.type = "button";
      button.className = "member-mission-questions";
      button.dataset.ownerQuestions = String(missionId);
      button.textContent = "\uB2F5\uBCC0/\uC9C8\uBB38 : 0 / 0";
      button.onclick = () => openOwnerQuestions(missionId, applicants.dataset.title ?? "\uBBF8\uC158");
      applicants.insertAdjacentElement("afterend", button);
      void catacombApi(`/api/parishioner/missions/${missionId}/community`).then((data) => button.textContent = `\uB2F5\uBCC0/\uC9C8\uBB38 : ${data.questions.filter((question) => Boolean(question.answer)).length} / ${data.questions.length}`).catch(() => {
        button.textContent = "\uB2F5\uBCC0/\uC9C8\uBB38 \uD655\uC778";
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
  async function openOwnerQuestions(missionId, title) {
    const layer = document.createElement("div");
    layer.className = "member-modal owner-questions-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(title)} \uC9C8\uBB38\xB7\uB2F5\uBCC0</h3><div class="member-modal-body owner-questions-body">\uBD88\uB7EC\uC624\uB294 \uC911...</div><button class="green-outline" type="button">\uB2EB\uAE30</button></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>button").onclick = () => layer.remove();
    try {
      const data = await catacombApi(`/api/parishioner/missions/${missionId}/community`), root = layer.querySelector(".owner-questions-body");
      root.innerHTML = data.questions.length ? data.questions.map((question) => `<article class="owner-question"><header><strong>${escapeHtml(question.askerName)}</strong><time>${new Date(question.createdAt).toLocaleString("ko-KR")}</time></header><p>${escapeHtml(question.question)}</p>${question.answer ? `<div class="owner-answer"><b>\uB0B4 \uB2F5\uBCC0</b><p>${escapeHtml(question.answer)}</p></div>` : data.isOwner ? `<form data-owner-answer="${question.id}"><textarea maxlength="5000" rows="5" required placeholder="\uC9C8\uBB38\uC5D0 \uB300\uD55C \uB2F5\uBCC0\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea><button class="green-button" type="submit">\uB2F5\uBCC0 \uB4F1\uB85D</button></form>` : "<small>\uB2F5\uBCC0 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</small>"}</article>`).join("") : '<p class="owner-question-empty">\uB4F1\uB85D\uB41C \uC9C8\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      root.querySelectorAll("[data-owner-answer]").forEach((form) => form.onsubmit = async (event) => {
        event.preventDefault();
        await catacombApi(`/api/parishioner/mission-questions/${form.dataset.ownerAnswer}/answer`, { method: "PATCH", body: JSON.stringify({ answer: form.querySelector("textarea").value }) });
        layer.remove();
        await loadMyMissions();
      });
    } catch (error) {
      layer.querySelector(".owner-questions-body").textContent = error.message;
    }
  }
  var missionCommunityLabels = { like: "\u{1F44D} \uC88B\uC544\uC694", best: "\u{1F31F} \uCD5C\uACE0\uC608\uC694", cheer: "\u{1F4AA} \uD798\uB0B4\uC694", funny: "\u{1F602} \uC6C3\uACA8\uC694", cool: "\u{1F60E} \uBA4B\uC838\uC694", sad: "\u{1F622} \uC2AC\uD37C\uC694", regret: "\u{1F614} \uC544\uC26C\uC6CC\uC694" };
  new MutationObserver(() => {
    document.querySelectorAll(".talent-mission-card").forEach((card) => {
      if (card.dataset.communityReady) return;
      const apply = card.querySelector("[data-mission-apply]");
      if (!apply) return;
      card.dataset.communityReady = "true";
      const root = document.createElement("section");
      root.className = "mission-community";
      root.dataset.missionId = apply.dataset.missionApply;
      apply.insertAdjacentElement("beforebegin", root);
      void loadMissionCommunity(Number(apply.dataset.missionApply), root);
    });
  }).observe(document.body, { childList: true, subtree: true });
  async function loadMissionCommunity(missionId, root) {
    try {
      const data = await catacombApi(`/api/parishioner/missions/${missionId}/community`), counts = (target, key) => target.find((item) => item.reaction === key);
      root.innerHTML = `<div class="mission-main-reactions">${["like", "best", "cheer", "funny", "cool"].map((key) => {
        const item = counts(data.reactions, key);
        return `<button class="${item?.mine ? "selected" : ""}" data-mission-community-reaction="${key}" type="button">${missionCommunityLabels[key]} <b>${item?.count ?? 0}</b></button>`;
      }).join("")}</div><div class="mission-qa"><header><strong>\uC9C8\uBB38\uACFC \uB2F5\uBCC0</strong><span>${data.questions.length}\uAC1C</span></header><div class="mission-question-list">${data.questions.map((question) => `<article class="mission-question"><header><strong>${escapeHtml(question.askerName)}</strong><time>${new Date(question.createdAt).toLocaleString("ko-KR")}</time></header><p>${escapeHtml(question.question)}</p>${reactionButtons(question.id, "question", question.reactions)}${question.answer ? `<div class="mission-answer"><b>\uB4F1\uB85D\uC790 \uB2F5\uBCC0</b><p>${escapeHtml(question.answer)}</p>${reactionButtons(question.id, "answer", question.reactions)}</div>` : data.isOwner ? `<form data-mission-answer="${question.id}"><textarea maxlength="5000" required placeholder="\uB4F1\uB85D\uC790 \uB2F5\uBCC0\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea><button type="submit">\uB2F5\uBCC0 \uB4F1\uB85D</button></form>` : '<small class="answer-waiting">\uB4F1\uB85D\uC790\uC758 \uB2F5\uBCC0\uC744 \uAE30\uB2E4\uB9AC\uACE0 \uC788\uC2B5\uB2C8\uB2E4.</small>'}</article>`).join("")}</div><form class="mission-question-form"><input class="mission-question-input" maxlength="2000" required placeholder="\uBBF8\uC158\uC5D0 \uB300\uD574 \uC9C8\uBB38\uD574 \uC8FC\uC138\uC694"><button type="submit">\uC9C8\uBB38 \uB4F1\uB85D</button></form></div>`;
      root.querySelectorAll("[data-mission-community-reaction]").forEach((button) => button.onclick = async () => {
        await catacombApi(`/api/parishioner/missions/${missionId}/reaction`, { method: "PUT", body: JSON.stringify({ reaction: button.dataset.missionCommunityReaction }) });
        await loadMissionCommunity(missionId, root);
      });
      root.querySelectorAll("[data-qa-reaction]").forEach((button) => button.onclick = async () => {
        await catacombApi(`/api/parishioner/mission-questions/${button.dataset.question}/reaction`, { method: "PUT", body: JSON.stringify({ target: button.dataset.target, reaction: button.dataset.qaReaction }) });
        await loadMissionCommunity(missionId, root);
      });
      root.querySelector(".mission-question-form").onsubmit = async (event) => {
        event.preventDefault();
        const input = event.currentTarget.querySelector(".mission-question-input");
        await catacombApi(`/api/parishioner/missions/${missionId}/questions`, { method: "POST", body: JSON.stringify({ question: input.value }) });
        await loadMissionCommunity(missionId, root);
      };
      root.querySelectorAll("[data-mission-answer]").forEach((form) => form.onsubmit = async (event) => {
        event.preventDefault();
        await catacombApi(`/api/parishioner/mission-questions/${form.dataset.missionAnswer}/answer`, { method: "PATCH", body: JSON.stringify({ answer: form.querySelector("textarea").value }) });
        await loadMissionCommunity(missionId, root);
      });
    } catch (error) {
      root.innerHTML = `<p class="community-error">${escapeHtml(error.message)}</p>`;
    }
  }
  function reactionButtons(questionId, target, items) {
    return `<div class="mission-qa-reactions">${Object.keys(missionCommunityLabels).map((key) => {
      const item = items.find((value) => value.target === target && value.reaction === key);
      return `<button class="${item?.mine ? "selected" : ""}" data-qa-reaction="${key}" data-question="${questionId}" data-target="${target}" type="button">${missionCommunityLabels[key]} <b>${item?.count ?? 0}</b></button>`;
    }).join("")}</div>`;
  }
  new MutationObserver(() => {
    document.querySelectorAll(".mission-community").forEach((root) => {
      const missionId = Number(root.dataset.missionId), data = missionCommunityCache.get(missionId), form = root.querySelector(".mission-question-form");
      if (form && !form.querySelector(".mission-question-anonymous")) form.insertAdjacentHTML("afterbegin", '<label class="mission-question-anonymous"><input type="checkbox"> \uC775\uBA85\uC73C\uB85C \uC9C8\uBB38</label>');
      if (!data) return;
      if (data.isOwner && form && !form.classList.contains("is-owner-disabled")) {
        const apply = root.closest(".talent-mission-card")?.querySelector("[data-mission-apply]");
        if (apply && !apply.classList.contains("owner-disabled")) {
          apply.disabled = true;
          apply.classList.add("owner-disabled");
          apply.textContent = "\uB0B4 \uBBF8\uC158";
        }
        form.classList.add("is-owner-disabled");
        form.querySelectorAll("input,button").forEach((control) => control.disabled = true);
        const questionInput = form.querySelector('input:not([type="checkbox"])');
        if (questionInput) questionInput.placeholder = "\uB0B4 \uBBF8\uC158\uC5D0\uB294 \uC9C8\uBB38\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
      }
      root.querySelectorAll(".mission-question").forEach((article, index) => {
        const question = data.questions[index];
        if (!question?.canEdit || article.dataset.editReady) return;
        article.dataset.editReady = "true";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mission-question-edit";
        button.textContent = "\uC218\uC815";
        button.onclick = () => openQuestionEdit(missionId, question.id, question.question, question.anonymous, root);
        article.querySelector("header").append(button);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
  function openQuestionEdit(missionId, questionId, question, anonymous, root) {
    const layer = document.createElement("div");
    layer.className = "member-modal question-edit-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uC9C8\uBB38 \uC218\uC815</h3><form><label><textarea aria-label="\uC9C8\uBB38" maxlength="2000" rows="7" required>${escapeHtml(question)}</textarea></label><label class="question-edit-anonymous"><input type="checkbox" ${anonymous ? "checked" : ""}> \uC775\uBA85\uC73C\uB85C \uC9C8\uBB38</label><p></p><div><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit" disabled>\uC218\uC815 \uC800\uC7A5</button></div></form></section>`;
    document.body.append(layer);
    const textarea = layer.querySelector("textarea"), submit2 = layer.querySelector('button[type="submit"]');
    const syncSubmit = () => submit2.disabled = !textarea.value.trim();
    textarea.addEventListener("input", syncSubmit);
    syncSubmit();
    layer.querySelector('button[type="button"]').onclick = () => layer.remove();
    layer.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      if (!textarea.value.trim()) return;
      const error = layer.querySelector("form>p");
      submit2.disabled = true;
      try {
        await catacombApi(`/api/parishioner/mission-questions/${questionId}`, { method: "PATCH", body: JSON.stringify({ question: textarea.value, anonymous: layer.querySelector(".question-edit-anonymous input").checked }) });
        layer.remove();
        await loadMissionCommunity(missionId, root);
      } catch (reason) {
        error.textContent = reason.message;
        syncSubmit();
      }
    };
  }
  new MutationObserver(() => {
    document.querySelectorAll(".mission-question-anonymous").forEach((label) => {
      label.style.cssText = "display:flex;flex:0 0 100%;align-items:center;justify-content:flex-end;gap:4px;margin-left:auto;text-align:right";
      const input = label.querySelector("input");
      if (input) input.style.cssText = "flex:0 0 14px;width:14px;height:14px;margin:0;padding:0";
    });
  }).observe(document.body, { childList: true, subtree: true });
  var catacombReactionLabels = { pat: "\u{1FAF3} \uD1A0\uB2E5\uD1A0\uB2E5", cheer: "\u{1F4AA} \uD798\uB0B4\uC138\uC694", sad: "\u{1F622} \uC18D\uC0C1\uD574\uC694", empathy: "\u{1FAF6} \uACF5\uAC10\uD574\uC694", same: "\u{1F64B} \uB098\uB3C4\uADF8\uB798\uC694", hug: "\u{1F917} \uC548\uC544\uC904\uAC8C\uC694" };
  var prayerReactionLabels = { like: "\u{1F44D} \uC88B\uC544\uC694", best: "\u{1F31F} \uCD5C\uACE0\uC608\uC694", cheer: "\u{1F4AA} \uD798\uB0B4\uC694", funny: "\u{1F604} \uC6C3\uACA8\uC694", cool: "\u2728 \uBA4B\uC838\uC694" };
  function mountPrayerDream() {
    const panel2 = document.querySelector('[data-member-sharing-panel="prayer-dream"]');
    if (!panel2 || panel2.dataset.ready) return;
    panel2.dataset.ready = "true";
    panel2.classList.add("prayer-dream-panel");
    panel2.innerHTML = `<form id="prayer-dream-form" class="prayer-compose"><header><div><h3>\uAE30\uB3C4\uBB38 \uBCF4\uB0B4\uAE30</h3><p>\uB300\uC0C1\uC790\uB97C \uCC3E\uC544 \uB9C8\uC74C\uC744 \uB2F4\uC740 \uAE30\uB3C4\uBB38\uC744 \uC804\uD574 \uC8FC\uC138\uC694.</p></div><button class="green-button" type="submit" disabled>\uAE30\uB3C4\uBB38 \uBCF4\uB0B4\uAE30</button></header><label>\uAE30\uB3C4 \uB300\uC0C1\uC790<div class="prayer-recipient-picker"><input id="prayer-recipient-search" autocomplete="off" placeholder="\uC774\uB984, \uC138\uB840\uBA85 \uB610\uB294 \uC774\uBA54\uC77C\uB85C \uAC80\uC0C9"><div id="prayer-recipient-results" hidden></div></div></label><input id="prayer-recipient-id" type="hidden"><label>\uAE30\uB3C4\uBB38<textarea id="prayer-dream-text" maxlength="10000" rows="7" required placeholder="\uB300\uC0C1\uC790\uB97C \uC704\uD55C \uAE30\uB3C4\uBB38\uC744 \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><p id="prayer-dream-error"></p></form><div class="prayer-history-head"><h3>\uAE30\uB3C4\uB4DC\uB9BC \uB0B4\uC5ED</h3><span id="prayer-unread-count"></span></div><div class="prayer-history-tabs"><button class="active" data-prayer-view="received" type="button">\uBC1B\uC740 \uAE30\uB3C4\uBB38</button><button data-prayer-view="sent" type="button">\uB0B4\uAC00 \uB4DC\uB9B0 \uAE30\uB3C4</button></div><div id="prayer-dream-list"></div>`;
    const search2 = panel2.querySelector("#prayer-recipient-search"), recipientId = panel2.querySelector("#prayer-recipient-id"), text = panel2.querySelector("#prayer-dream-text"), submit2 = panel2.querySelector('button[type="submit"]'), results2 = panel2.querySelector("#prayer-recipient-results");
    const sync = () => submit2.disabled = !recipientId.value || !text.value.trim();
    text.oninput = sync;
    search2.oninput = async () => {
      recipientId.value = "";
      sync();
      const q = search2.value.trim();
      if (q.length < 2) {
        results2.hidden = true;
        return;
      }
      const people = await catacombApi(`/api/parishioner/prayer-dream/recipients?q=${encodeURIComponent(q)}`);
      results2.innerHTML = people.map((person) => `<button type="button" data-prayer-recipient="${person.id}" data-name="${escapeHtml(person.name)}${person.baptismalName ? ` (${escapeHtml(person.baptismalName)})` : ""}"><strong>${escapeHtml(person.name)}${person.baptismalName ? ` (${escapeHtml(person.baptismalName)})` : ""}</strong><small>${escapeHtml(person.email)}</small></button>`).join("") || "<p>\uAC80\uC0C9\uB41C \uC2E0\uB3C4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>";
      results2.hidden = false;
      results2.querySelectorAll("[data-prayer-recipient]").forEach((button) => button.onclick = () => {
        recipientId.value = button.dataset.prayerRecipient;
        search2.value = button.dataset.name;
        results2.hidden = true;
        sync();
      });
    };
    panel2.querySelector("#prayer-dream-form").onsubmit = async (event) => {
      event.preventDefault();
      submit2.disabled = true;
      const error = panel2.querySelector("#prayer-dream-error");
      error.textContent = "";
      try {
        await catacombApi("/api/parishioner/prayer-dream", { method: "POST", body: JSON.stringify({ recipientId: Number(recipientId.value), prayerText: text.value }) });
        recipientId.value = "";
        search2.value = "";
        text.value = "";
        sync();
        modal("\uAE30\uB3C4\uB4DC\uB9BC", "<p>\uAE30\uB3C4\uBB38\uC744 \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4.</p>");
        await loadPrayerDreams();
      } catch (reason) {
        error.textContent = reason.message;
        sync();
      }
    };
    panel2.querySelectorAll("[data-prayer-view]").forEach((button) => button.onclick = () => {
      panel2.querySelectorAll("[data-prayer-view]").forEach((tab) => tab.classList.toggle("active", tab === button));
      void loadPrayerDreams(button.dataset.prayerView);
    });
    void loadPrayerDreams();
  }
  async function loadPrayerDreams(view = "received") {
    const list = document.querySelector("#prayer-dream-list");
    if (!list) return;
    try {
      const items = await catacombApi("/api/parishioner/prayer-dream"), unread = items.filter((item) => item.unread).length, filtered = items.filter((item) => item.direction === view);
      document.querySelector("#prayer-unread-count").textContent = unread ? `\uC0C8 \uAE30\uB3C4\uBB38 ${unread}\uAC1C` : "\uC0C8 \uAE30\uB3C4\uBB38 \uC5C6\uC74C";
      list.innerHTML = filtered.length ? filtered.map((item) => `<article class="prayer-card ${item.unread ? "unread" : ""}"><header><div><b>${view === "received" ? `\uBCF4\uB0B8 \uBD84 ${escapeHtml(item.senderName)}${item.senderBaptismalName ? ` (${escapeHtml(item.senderBaptismalName)})` : ""}` : `\uBC1B\uB294 \uBD84 ${escapeHtml(item.recipientName)}${item.recipientBaptismalName ? ` (${escapeHtml(item.recipientBaptismalName)})` : ""}`}</b>${item.unread ? "<em>\uC0C8 \uAE30\uB3C4\uBB38</em>" : ""}</div><small>\uC791\uC131 ${new Date(item.createdAt).toLocaleString("ko-KR")}<br>\uC77D\uC74C ${item.readAt ? new Date(item.readAt).toLocaleString("ko-KR") : "\uBBF8\uD655\uC778"}</small></header><p class="prayer-text">${escapeHtml(item.prayerText)}</p>${item.unread ? `<button class="prayer-read" data-prayer-read="${item.id}" type="button">\uAE30\uB3C4\uBB38 \uD655\uC778</button>` : ""}<div class="prayer-reactions">${Object.entries(prayerReactionLabels).map(([key, label]) => `<button class="${item.myReaction === key ? "selected" : ""}" data-prayer-reaction="${key}" data-prayer="${item.id}" type="button">${label} <b>${item.reactions.find((value) => value.reaction === key)?.count ?? 0}</b></button>`).join("")}</div><section class="prayer-comments"><h4>\uB300\uD654 ${item.comments.length}\uAC1C <small>\uAE30\uB3C4 \uB2F9\uC0AC\uC790\uB9CC \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.</small></h4>${item.comments.map((comment) => `<article><header><strong>${escapeHtml(comment.authorName)}</strong><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time></header><p>${escapeHtml(comment.content)}</p></article>`).join("")}<form data-prayer-comment="${item.id}"><input maxlength="2000" required placeholder="\uB313\uAE00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"><button class="green-outline" type="submit">\uB313\uAE00 \uB4F1\uB85D</button></form></section></article>`).join("") : '<p class="prayer-empty">\uAE30\uB3C4\uB4DC\uB9BC \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      list.querySelectorAll("[data-prayer-read]").forEach((button) => button.onclick = async () => {
        await catacombApi(`/api/parishioner/prayer-dream/${button.dataset.prayerRead}/read`, { method: "POST" });
        await loadPrayerDreams(view);
      });
      list.querySelectorAll("[data-prayer-reaction]").forEach((button) => button.onclick = async () => {
        await catacombApi(`/api/parishioner/prayer-dream/${button.dataset.prayer}/reaction`, { method: "PUT", body: JSON.stringify({ reaction: button.dataset.prayerReaction }) });
        await loadPrayerDreams(view);
      });
      list.querySelectorAll("[data-prayer-comment]").forEach((form) => form.onsubmit = async (event) => {
        event.preventDefault();
        const input = form.querySelector("input");
        await catacombApi(`/api/parishioner/prayer-dream/${form.dataset.prayerComment}/comments`, { method: "POST", body: JSON.stringify({ content: input.value }) });
        await loadPrayerDreams(view);
      });
      if (unread && !sessionStorage.getItem("paxlink.prayer.unread.alert")) {
        sessionStorage.setItem("paxlink.prayer.unread.alert", "1");
        modal("\uAE30\uB3C4\uB4DC\uB9BC", `<p>\uC0C8\uB85C\uC6B4 \uAE30\uB3C4\uBB38 ${unread}\uAC1C\uAC00 \uB3C4\uCC29\uD588\uC2B5\uB2C8\uB2E4.</p>`);
      }
    } catch (error) {
      list.textContent = error.message;
    }
  }
  new MutationObserver(mountPrayerDream).observe(document.body, { childList: true, subtree: true });
  var prayerDreamFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === "/api/parishioner/prayer-dream" && init?.method === "POST" && typeof init.body === "string") {
      const payload = JSON.parse(init.body);
      payload.isPublic = document.querySelector("#prayer-dream-public")?.checked === true;
      payload.viewerIds = [...document.querySelectorAll("[data-prayer-viewer-id]")].map((item) => Number(item.dataset.prayerViewerId));
      payload.recipientIds = [...document.querySelectorAll("[data-prayer-extra-recipient-id]")].map((item) => Number(item.dataset.prayerExtraRecipientId));
      init = { ...init, body: JSON.stringify(payload) };
    }
    return prayerDreamFetch(input, init);
  };
  function enhancePrayerComposeModal() {
    const form = document.querySelector("#prayer-dream-form");
    if (!form) return;
    if (!form.querySelector("#prayer-dream-public")) {
      const error = form.querySelector("#prayer-dream-error");
      error.insertAdjacentHTML("beforebegin", '<label class="prayer-public-option"><input id="prayer-dream-public" type="checkbox"> \uBAA8\uB4E0 \uC2E0\uC790\uC5D0\uAC8C \uACF5\uAC1C <small>\uC120\uD0DD\uD558\uC9C0 \uC54A\uC73C\uBA74 \uBCF4\uB0B8 \uBD84\uACFC \uAE30\uB3C4 \uB300\uC0C1\uC790\uB9CC \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.</small></label>');
    }
    const modal2 = form.closest(".registration-form-modal"), submit2 = form.querySelector('button[type="submit"],.prayer-modal-submit'), header = form.querySelector(":scope>header");
    if (modal2 && submit2 && submit2.parentElement !== modal2.querySelector(":scope>.member-modal-box>footer")) {
      form.id = "prayer-dream-form";
      submit2.type = "button";
      submit2.classList.add("prayer-modal-submit");
      submit2.onclick = () => form.requestSubmit();
      modal2.querySelector(":scope>.member-modal-box>footer").append(submit2);
      header?.remove();
    }
  }
  function fixPrayerModalErrorTarget() {
    const modal2 = document.querySelector(".registration-form-modal"), form = modal2?.querySelector("#prayer-dream-form"), panel2 = document.querySelector('[data-member-sharing-panel="prayer-dream"]');
    if (!modal2 || !form || !panel2 || form.querySelector(".prayer-modal-form-error")) return;
    const source = form.querySelector("#prayer-dream-error");
    if (!source) return;
    const display = document.createElement("p");
    display.className = "prayer-modal-form-error";
    source.insertAdjacentElement("beforebegin", display);
    source.hidden = true;
    panel2.append(source);
    const sync = () => {
      display.textContent = source.textContent ?? "";
    };
    new MutationObserver(sync).observe(source, { childList: true, characterData: true, subtree: true });
    sync();
  }
  function enhancePrayerViewerPicker() {
    const form = document.querySelector("#prayer-dream-form"), publicOption = form?.querySelector(".prayer-public-option"), publicCheck = form?.querySelector("#prayer-dream-public");
    if (!form || !publicOption || !publicCheck) return;
    let picker = form.querySelector(".prayer-viewer-picker");
    if (!picker) {
      picker = document.createElement("section");
      picker.className = "prayer-viewer-picker";
      picker.innerHTML = '<label>\uCD94\uAC00\uB85C \uACF5\uAC1C\uD560 \uC2E0\uB3C4 <small>\uC774\uB984, \uC138\uB840\uBA85 \uB610\uB294 \uC774\uBA54\uC77C\uB85C \uAC80\uC0C9\uD574 \uC5EC\uB7EC \uBA85\uC744 \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</small><input type="search" autocomplete="off" placeholder="\uACF5\uAC1C\uD560 \uC2E0\uB3C4 \uAC80\uC0C9"></label><div class="prayer-viewer-results" hidden></div><div class="prayer-viewer-selected"></div>';
      publicOption.insertAdjacentElement("afterend", picker);
      const search2 = picker.querySelector('input[type="search"]'), results2 = picker.querySelector(".prayer-viewer-results"), selected = picker.querySelector(".prayer-viewer-selected");
      search2.oninput = async () => {
        const q = search2.value.trim();
        if (q.length < 2) {
          results2.hidden = true;
          return;
        }
        const people = await catacombApi(`/api/parishioner/prayer-dream/recipients?q=${encodeURIComponent(q)}`), chosen = new Set([...selected.querySelectorAll("[data-prayer-viewer-id]")].map((item) => Number(item.dataset.prayerViewerId)));
        results2.innerHTML = people.filter((person) => !chosen.has(person.id)).map((person) => `<button type="button" data-add-prayer-viewer="${person.id}" data-viewer-name="${escapeHtml(person.name)}${person.baptismalName ? ` (${escapeHtml(person.baptismalName)})` : ""}"><strong>${escapeHtml(person.name)}${person.baptismalName ? ` (${escapeHtml(person.baptismalName)})` : ""}</strong><small>${escapeHtml(person.email)}</small></button>`).join("") || "<p>\uCD94\uAC00\uD560 \uC218 \uC788\uB294 \uC2E0\uB3C4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>";
        results2.hidden = false;
        results2.querySelectorAll("[data-add-prayer-viewer]").forEach((button) => button.onclick = () => {
          selected.insertAdjacentHTML("beforeend", `<button type="button" data-prayer-viewer-id="${button.dataset.addPrayerViewer}">${button.dataset.viewerName}<span>\xD7</span></button>`);
          selected.querySelectorAll("[data-prayer-viewer-id]").forEach((chip) => chip.onclick = () => chip.remove());
          search2.value = "";
          results2.hidden = true;
        });
      };
    }
    const sync = () => {
      picker.hidden = publicCheck.checked;
    };
    if (!publicCheck.dataset.viewerToggleReady) {
      publicCheck.dataset.viewerToggleReady = "true";
      publicCheck.addEventListener("change", sync);
    }
    sync();
  }
  function enhancePrayerExtraRecipients() {
    const form = document.querySelector("#prayer-dream-form"), primary = form?.querySelector("#prayer-recipient-id");
    if (!form || !primary || form.querySelector(".prayer-extra-recipients")) return;
    const section = document.createElement("section");
    section.className = "prayer-extra-recipients prayer-viewer-picker";
    section.innerHTML = '<label>\uAE30\uB3C4 \uB300\uC0C1\uC790 \uCD94\uAC00 <small>\uAC19\uC740 \uAE30\uB3C4\uBB38\uC744 \uD568\uAED8 \uBC1B\uC744 \uB300\uC0C1\uC790\uB97C \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</small><input type="search" autocomplete="off" placeholder="\uCD94\uAC00 \uAE30\uB3C4 \uB300\uC0C1\uC790 \uAC80\uC0C9"></label><div class="prayer-viewer-results" hidden></div><div class="prayer-viewer-selected"></div>';
    primary.insertAdjacentElement("afterend", section);
    const search2 = section.querySelector('input[type="search"]'), results2 = section.querySelector(".prayer-viewer-results"), selected = section.querySelector(".prayer-viewer-selected");
    search2.oninput = async () => {
      const q = search2.value.trim();
      if (q.length < 2) {
        results2.hidden = true;
        return;
      }
      const people = await catacombApi(`/api/parishioner/prayer-dream/recipients?q=${encodeURIComponent(q)}`), chosen = new Set([...selected.querySelectorAll("[data-prayer-extra-recipient-id]")].map((item) => Number(item.dataset.prayerExtraRecipientId)));
      results2.innerHTML = people.filter((person) => !chosen.has(person.id) && person.id !== Number(primary.value)).map((person) => `<button type="button" data-add-prayer-recipient="${person.id}" data-recipient-name="${escapeHtml(person.name)}${person.baptismalName ? ` (${escapeHtml(person.baptismalName)})` : ""}"><strong>${escapeHtml(person.name)}${person.baptismalName ? ` (${escapeHtml(person.baptismalName)})` : ""}</strong><small>${escapeHtml(person.email)}</small></button>`).join("") || "<p>\uCD94\uAC00\uD560 \uC218 \uC788\uB294 \uC2E0\uB3C4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>";
      results2.hidden = false;
      results2.querySelectorAll("[data-add-prayer-recipient]").forEach((button) => button.onclick = () => {
        selected.insertAdjacentHTML("beforeend", `<button type="button" data-prayer-extra-recipient-id="${button.dataset.addPrayerRecipient}">${button.dataset.recipientName}<span>\xD7</span></button>`);
        selected.querySelectorAll("[data-prayer-extra-recipient-id]").forEach((chip) => chip.onclick = () => chip.remove());
        search2.value = "";
        results2.hidden = true;
      });
    };
  }
  async function loadPublicPrayerDreams() {
    const list = document.querySelector("#prayer-dream-list");
    if (!list) return;
    try {
      const items = (await catacombApi("/api/parishioner/prayer-dream")).filter((item) => item.isPublic || item.sharedWithMe);
      list.innerHTML = items.length ? items.map((item) => `<article class="prayer-card public"><header><div><b>\uAE30\uB3C4 \uB300\uC0C1 ${escapeHtml(item.recipientName)}${item.recipientBaptismalName ? ` (${escapeHtml(item.recipientBaptismalName)})` : ""}</b><em>${item.isPublic ? "\uC804\uCCB4 \uACF5\uAC1C" : "\uB098\uC5D0\uAC8C \uACF5\uAC1C"}</em></div><small>\uC791\uC131\uC790 ${escapeHtml(item.senderName)}${item.senderBaptismalName ? ` (${escapeHtml(item.senderBaptismalName)})` : ""}<br>${new Date(item.createdAt).toLocaleString("ko-KR")}</small></header><p class="prayer-text">${escapeHtml(item.prayerText)}</p><div class="prayer-reactions">${Object.entries(prayerReactionLabels).map(([key, label]) => `<button class="${item.myReaction === key ? "selected" : ""}" data-public-prayer-reaction="${key}" data-prayer="${item.id}" type="button">${label} <b>${item.reactions.find((value) => value.reaction === key)?.count ?? 0}</b></button>`).join("")}</div><section class="prayer-comments"><h4>\uB313\uAE00 ${item.comments.length}\uAC1C <small>${item.isPublic ? "\uBAA8\uB4E0 \uC2E0\uC790\uAC00 \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4." : "\uC9C0\uC815\uB41C \uC2E0\uC790\uC640 \uB2F9\uC0AC\uC790\uB9CC \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</small></h4>${item.comments.map((comment) => `<article><header><strong>${escapeHtml(comment.authorName)}</strong><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time></header><p>${escapeHtml(comment.content)}</p></article>`).join("")}<form data-public-prayer-comment="${item.id}"><input maxlength="2000" required placeholder="\uB313\uAE00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"><button class="green-outline" type="submit">\uB313\uAE00 \uB4F1\uB85D</button></form></section></article>`).join("") : '<p class="prayer-empty">\uACF5\uAC1C\uB41C \uAE30\uB3C4\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      list.querySelectorAll("[data-public-prayer-reaction]").forEach((button) => button.onclick = async () => {
        await catacombApi(`/api/parishioner/prayer-dream/${button.dataset.prayer}/reaction`, { method: "PUT", body: JSON.stringify({ reaction: button.dataset.publicPrayerReaction }) });
        await loadPublicPrayerDreams();
      });
      list.querySelectorAll("[data-public-prayer-comment]").forEach((form) => form.onsubmit = async (event) => {
        event.preventDefault();
        const input = form.querySelector("input");
        await catacombApi(`/api/parishioner/prayer-dream/${form.dataset.publicPrayerComment}/comments`, { method: "POST", body: JSON.stringify({ content: input.value }) });
        await loadPublicPrayerDreams();
      });
    } catch (error) {
      list.textContent = error.message;
    }
  }
  function enhancePublicPrayerTab() {
    const tabs = document.querySelector(".prayer-history-tabs");
    if (!tabs || tabs.querySelector('[data-prayer-view="public"]')) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.prayerView = "public";
    button.textContent = "\uACF5\uAC1C \uAE30\uB3C4\uBB38";
    button.onclick = () => {
      tabs.querySelectorAll("button").forEach((tab) => tab.classList.toggle("active", tab === button));
      void loadPublicPrayerDreams();
    };
    tabs.append(button);
  }
  document.head.insertAdjacentHTML("beforeend", "<style>.prayer-history-tabs{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;width:100%}.prayer-history-tabs button{width:100%;min-width:0;height:40px;padding:0 6px!important;font-size:12px!important;line-height:1.2!important;letter-spacing:-.25px;white-space:nowrap}@media(max-width:420px){.prayer-history-tabs{gap:5px}.prayer-history-tabs button{height:38px;padding:0 3px!important;font-size:10px!important;letter-spacing:-.5px}}</style>");
  function decorateClergyPrayerSearch() {
    document.querySelectorAll("#prayer-recipient-results button,.prayer-viewer-results button").forEach((button) => {
      const small = button.querySelector("small");
      if (small && ["\uC2E0\uBD80", "\uC218\uB140"].includes(small.textContent?.trim() ?? "")) small.classList.add("prayer-clergy-badge");
    });
  }
  var clergyPrayerTargetsLoading = false;
  async function decorateClergyPrayerHistory() {
    const cards = [...document.querySelectorAll("#prayer-dream-list .prayer-card:not([data-clergy-checked])")];
    if (!cards.length || clergyPrayerTargetsLoading) return;
    clergyPrayerTargetsLoading = true;
    try {
      const targets = await catacombApi("/api/parishioner/prayer-dream/clergy-targets"), byId = new Map(targets.map((item) => [item.id, item]));
      cards.forEach((card) => {
        card.dataset.clergyChecked = "true";
        const id = Number(card.querySelector("[data-prayer]")?.dataset.prayer ?? card.querySelector("[data-prayer-comment]")?.dataset.prayerComment), target = byId.get(id), heading = card.querySelector("header b");
        if (!target || !heading) return;
        heading.innerHTML = `\uBC1B\uB294 \uBD84 ${escapeHtml(target.targetName)}${target.targetBaptismalName ? ` (${escapeHtml(target.targetBaptismalName)})` : ""} <em class="prayer-clergy-target-badge">${target.targetType === "priest" ? "\uC2E0\uBD80" : "\uC218\uB140"}</em>`;
      });
    } finally {
      clergyPrayerTargetsLoading = false;
    }
  }
  new MutationObserver(() => {
    decorateClergyPrayerSearch();
    void decorateClergyPrayerHistory();
  }).observe(document.body, { childList: true, subtree: true });
  document.head.insertAdjacentHTML("beforeend", "<style>.prayer-clergy-badge{display:inline-flex!important;width:auto!important;margin-left:auto;padding:3px 8px;border-radius:10px;background:#e8f7f1;color:var(--green)!important;font-size:8px!important;font-weight:800}.prayer-clergy-target-badge{display:inline-flex!important;margin-left:5px;padding:3px 7px!important;border-radius:9px;background:#e8f7f1!important;color:var(--green)!important;font-size:8px!important;font-style:normal}</style>");
  function preservePrayerSubmitOnClose() {
    const modal2 = document.querySelector(".registration-form-modal"), form = modal2?.querySelector("#prayer-dream-form"), close = modal2?.querySelector(":scope>.member-modal-box>footer>.green-outline"), submit2 = modal2?.querySelector(".prayer-modal-submit");
    if (!form || !close || !submit2 || close.dataset.prayerCloseReady) return;
    close.dataset.prayerCloseReady = "true";
    close.addEventListener("click", () => form.append(submit2), { capture: true });
  }
  function enhancePrayerSuccessModal() {
    const registration = document.querySelector(".registration-form-modal"), layers = [...document.querySelectorAll("body>.member-modal")], success = layers.find((layer) => layer !== registration && layer.querySelector(":scope>.member-modal-box>h3")?.textContent === "\uAE30\uB3C4\uB4DC\uB9BC" && layer.querySelector(".member-modal-body")?.textContent?.includes("\uAE30\uB3C4\uBB38\uC744 \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4."));
    if (!registration || !success || success.dataset.prayerSuccessReady) return;
    success.dataset.prayerSuccessReady = "true";
    document.querySelectorAll(".prayer-history-tabs button").forEach((button) => button.classList.toggle("active", button.dataset.prayerView === "sent"));
    void loadPrayerDreams("sent");
    const confirm = success.querySelector("button"), closeRegistration = registration.querySelector(":scope>.member-modal-box>footer>.green-outline");
    confirm.onclick = () => {
      closeRegistration.click();
      success.remove();
    };
  }
  var visibleReceivedPrayerCount = 2;
  var receivedPrayerSignature = "";
  function openReceivedPrayerDetail(card) {
    document.querySelector(".prayer-detail-modal")?.remove();
    const placeholder = document.createComment("prayer-card-placeholder"), layer = document.createElement("div"), readButton = card.querySelector("[data-prayer-read]");
    card.before(placeholder);
    card.classList.remove("prayer-summary-card");
    card.hidden = false;
    layer.className = "member-modal prayer-detail-modal";
    layer.innerHTML = '<section class="member-modal-box"><h3>\uBC1B\uC740 \uAE30\uB3C4\uBB38 \uC0C1\uC138\uBCF4\uAE30</h3><div class="member-modal-body"></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>';
    layer.querySelector(".member-modal-body").append(card);
    document.body.append(layer);
    let closed = false, markedRead = false;
    const close = () => {
      if (closed) return;
      closed = true;
      placeholder.before(card);
      placeholder.remove();
      layer.remove();
      if (markedRead) void loadPrayerDreams("received");
      else enhanceReceivedPrayerList();
    };
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = close;
    if (readButton) {
      const prayerId = readButton.dataset.prayerRead;
      readButton.remove();
      void catacombApi(`/api/parishioner/prayer-dream/${prayerId}/read`, { method: "POST" }).then(() => {
        markedRead = true;
        card.classList.remove("unread");
        card.querySelector("header em")?.remove();
        const meta = card.querySelector("header small");
        if (meta) meta.innerHTML = meta.innerHTML.replace("\uC77D\uC74C \uBBF8\uD655\uC778", `\uC77D\uC74C ${(/* @__PURE__ */ new Date()).toLocaleString("ko-KR")}`);
        if (closed) void loadPrayerDreams("received");
      }).catch((error) => {
        const notice = document.createElement("p");
        notice.className = "prayer-detail-read-error";
        notice.textContent = error.message;
        card.prepend(notice);
      });
    }
  }
  function enhancePrayerDetailReactions() {
    const modal2 = document.querySelector(".prayer-detail-modal");
    if (!modal2 || modal2.dataset.reactionReady) return;
    modal2.dataset.reactionReady = "true";
    modal2.addEventListener("click", (event) => {
      const button = event.target.closest("[data-prayer-reaction]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const prayerId = button.dataset.prayer, reaction = button.dataset.prayerReaction, buttons = [...modal2.querySelectorAll("[data-prayer-reaction]")], wasSelected = button.classList.contains("selected"), previous = buttons.find((item) => item.classList.contains("selected"));
      buttons.forEach((item) => item.disabled = true);
      void catacombApi(`/api/parishioner/prayer-dream/${prayerId}/reaction`, { method: "PUT", body: JSON.stringify({ reaction }) }).then(() => {
        const changeCount = (item, amount) => {
          const count = item.querySelector("b");
          if (count) count.textContent = String(Math.max(0, Number(count.textContent ?? 0) + amount));
        };
        if (wasSelected) {
          button.classList.remove("selected");
          changeCount(button, -1);
        } else {
          if (previous && previous !== button) {
            previous.classList.remove("selected");
            changeCount(previous, -1);
          }
          button.classList.add("selected");
          changeCount(button, 1);
        }
        const selectedReaction = buttons.find((item) => item.classList.contains("selected"))?.dataset.prayerReaction ?? null;
        document.querySelectorAll(`#prayer-dream-list [data-prayer="${prayerId}"][data-prayer-reaction]`).forEach((item) => {
          item.classList.toggle("selected", item.dataset.prayerReaction === selectedReaction);
          const source = buttons.find((value) => value.dataset.prayerReaction === item.dataset.prayerReaction), count = item.querySelector("b"), sourceCount = source?.querySelector("b");
          if (count && sourceCount) count.textContent = sourceCount.textContent;
        });
      }).catch((error) => {
        const notice = modal2.querySelector(".prayer-detail-read-error") ?? document.createElement("p");
        notice.className = "prayer-detail-read-error";
        notice.textContent = error.message;
        if (!notice.parentElement) modal2.querySelector(".prayer-card")?.prepend(notice);
      }).finally(() => buttons.forEach((item) => item.disabled = false));
    }, { capture: true });
  }
  function enhancePrayerDetailComments() {
    const modal2 = document.querySelector(".prayer-detail-modal"), section = modal2?.querySelector(".prayer-comments");
    if (!modal2 || !section || modal2.dataset.commentReady) return;
    modal2.dataset.commentReady = "true";
    const setHeading = (count) => {
      const heading = section.querySelector("h4");
      if (!heading) return;
      const note = heading.querySelector("small")?.outerHTML ?? "";
      heading.innerHTML = `\uB313\uAE00 ${count}\uAC1C ${note}`;
    };
    setHeading(section.querySelectorAll(":scope>article").length);
    modal2.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-prayer-comment]");
      if (!form) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const input = form.querySelector("input"), submit2 = form.querySelector('button[type="submit"]'), prayerId = Number(form.dataset.prayerComment), content = input.value.trim();
      if (!content) return;
      submit2.disabled = true;
      void catacombApi(`/api/parishioner/prayer-dream/${prayerId}/comments`, { method: "POST", body: JSON.stringify({ content }) }).then(async () => {
        const items = await catacombApi("/api/parishioner/prayer-dream"), item = items.find((value) => value.id === prayerId);
        if (!item) return;
        section.querySelectorAll(":scope>article").forEach((article) => article.remove());
        form.insertAdjacentHTML("beforebegin", item.comments.map((comment) => `<article><header><strong>${escapeHtml(comment.authorName)}</strong><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time></header><p>${escapeHtml(comment.content)}</p></article>`).join(""));
        setHeading(item.comments.length);
        input.value = "";
      }).catch((error) => {
        const notice = modal2.querySelector(".prayer-detail-read-error") ?? document.createElement("p");
        notice.className = "prayer-detail-read-error";
        notice.textContent = error.message;
        if (!notice.parentElement) modal2.querySelector(".prayer-card")?.prepend(notice);
      }).finally(() => submit2.disabled = false);
    }, { capture: true });
  }
  function enhanceReceivedPrayerList() {
    const list = document.querySelector("#prayer-dream-list"), received = document.querySelector('[data-prayer-view="received"]')?.classList.contains("active"), existingMore = document.querySelector(".received-prayer-more");
    if (!list || !received) {
      if (existingMore) existingMore.hidden = true;
      return;
    }
    if (document.querySelector(".prayer-detail-modal")) return;
    const cards = [...list.querySelectorAll(":scope>.prayer-card")], signature = cards.map((card) => card.querySelector("[data-prayer]")?.dataset.prayer ?? card.textContent?.slice(0, 30)).join(",");
    if (signature !== receivedPrayerSignature) {
      receivedPrayerSignature = signature;
      visibleReceivedPrayerCount = 2;
    }
    cards.forEach((card, index) => {
      card.classList.add("prayer-summary-card");
      card.hidden = index >= visibleReceivedPrayerCount;
      if (!card.querySelector(".received-prayer-detail")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "green-outline received-prayer-detail";
        button.textContent = "\uC0C1\uC138\uBCF4\uAE30";
        button.onclick = () => openReceivedPrayerDetail(card);
        card.append(button);
      }
    });
    const more = existingMore ?? document.createElement("button");
    if (!existingMore) {
      more.type = "button";
      more.className = "green-outline received-prayer-more";
      more.textContent = "more";
      more.onclick = () => {
        visibleReceivedPrayerCount += 2;
        enhanceReceivedPrayerList();
      };
      list.insertAdjacentElement("afterend", more);
    }
    more.hidden = visibleReceivedPrayerCount >= cards.length;
  }
  function alignReceivedPrayerDetailButtons() {
    document.querySelectorAll("#prayer-dream-list .prayer-summary-card:not([data-detail-aligned])").forEach((card) => {
      const text = card.querySelector(".prayer-text"), button = card.querySelector(".received-prayer-detail");
      if (!text || !button) return;
      card.dataset.detailAligned = "true";
      const content = document.createElement("div");
      content.className = "prayer-summary-content";
      text.insertAdjacentElement("beforebegin", content);
      content.append(text, button);
    });
  }
  new MutationObserver(alignReceivedPrayerDetailButtons).observe(document.documentElement, { childList: true, subtree: true });
  document.head.insertAdjacentHTML("beforeend", "<style>.prayer-summary-content{position:relative;margin-top:12px}.prayer-summary-content .prayer-text{min-height:64px;margin:0;padding:14px 96px 38px 14px;box-sizing:border-box}.prayer-summary-content .received-prayer-detail{position:absolute;right:9px;bottom:8px;width:auto;height:28px;margin:0;padding:0 11px;border-radius:8px;font-size:9px;white-space:nowrap}.prayer-detail-modal .prayer-summary-content{margin-top:0}.prayer-detail-modal .prayer-summary-content .prayer-text{min-height:0;padding:14px}@media(max-width:600px){.prayer-summary-content .prayer-text{padding-right:86px}.prayer-summary-content .received-prayer-detail{height:26px;padding:0 9px}.prayer-detail-modal .prayer-summary-content .prayer-text{padding:14px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.catacomb-comments>form,.prayer-comments>form{display:flex;align-items:stretch;gap:7px}.catacomb-comments>form input,.prayer-comments>form input{min-width:0;height:34px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:#fff;font-size:10px;line-height:34px}.catacomb-comments>form input::placeholder,.prayer-comments>form input::placeholder{color:#87958f;font-size:10px}.catacomb-comments>form button,.prayer-comments>form button{width:auto!important;min-width:76px;height:34px!important;padding:0 11px!important;border-radius:7px;font-size:10px;line-height:1;white-space:nowrap}@media(max-width:700px){.catacomb-comments>form,.prayer-comments>form{flex-direction:row!important}.catacomb-comments>form button,.prayer-comments>form button{min-width:70px;padding:0 9px!important;font-size:9px}.catacomb-comments>form input,.prayer-comments>form input,.catacomb-comments>form input::placeholder,.prayer-comments>form input::placeholder{font-size:9px}}</style>");
  new MutationObserver(() => {
    enhancePrayerComposeModal();
    fixPrayerModalErrorTarget();
    enhancePrayerExtraRecipients();
    enhancePrayerViewerPicker();
    enhancePublicPrayerTab();
    preservePrayerSubmitOnClose();
    enhancePrayerSuccessModal();
    enhancePrayerDetailReactions();
    enhancePrayerDetailComments();
    enhanceReceivedPrayerList();
  }).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => {
    enhancePrayerComposeModal();
    enhancePublicPrayerTab();
  });
  function enforcePrayerSendState() {
    const form = document.querySelector("#prayer-dream-form");
    if (!form || form.dataset.sendStateReady) return;
    const recipient = form.querySelector("#prayer-recipient-id"), prayer = form.querySelector("#prayer-dream-text"), submit2 = form.querySelector('button[type="submit"]') ?? document.querySelector(".prayer-modal-submit");
    if (!recipient || !prayer || !submit2) return;
    form.dataset.sendStateReady = "true";
    const sync = () => submit2.disabled = !recipient.value || !prayer.value.trim();
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    form.addEventListener("submit", (event) => {
      if (!recipient.value || !prayer.value.trim()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sync();
      }
    }, { capture: true });
    new MutationObserver(sync).observe(recipient, { attributes: true, attributeFilter: ["value"] });
    sync();
  }
  new MutationObserver(enforcePrayerSendState).observe(document.body, { childList: true, subtree: true });
  function enhancePrayerEdits() {
    const sentActive = document.querySelector('[data-prayer-view="sent"]')?.classList.contains("active");
    if (!sentActive) return;
    document.querySelectorAll("#prayer-dream-list .prayer-card").forEach((card) => {
      if (card.dataset.editReady) return;
      const prayerId = Number(card.querySelector("[data-prayer]")?.dataset.prayer);
      if (!prayerId) return;
      card.dataset.editReady = "true";
      const unread = card.querySelector("header small")?.textContent?.includes("\uBBF8\uD655\uC778") === true, button = document.createElement("button");
      button.type = "button";
      button.className = "prayer-edit";
      button.textContent = "\uAE30\uB3C4\uBB38 \uC218\uC815";
      button.disabled = !unread;
      button.title = unread ? "\uB300\uC0C1\uC790\uAC00 \uC77D\uAE30 \uC804\uAE4C\uC9C0 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." : "\uB300\uC0C1\uC790\uAC00 \uC774\uBBF8 \uC77D\uC5B4 \uC218\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
      if (unread) button.onclick = () => openPrayerEdit(prayerId, card.querySelector(".prayer-text")?.textContent ?? "");
      card.querySelector(".prayer-text")?.insertAdjacentElement("afterend", button);
    });
  }
  function openPrayerEdit(prayerId, prayerText) {
    const layer = document.createElement("div");
    layer.className = "member-modal prayer-edit-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uAE30\uB3C4\uBB38 \uC218\uC815</h3><form><textarea maxlength="10000" rows="9" required aria-label="\uAE30\uB3C4\uBB38">${escapeHtml(prayerText)}</textarea><p></p><div><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uC218\uC815 \uC800\uC7A5</button></div></form></section>`;
    document.body.append(layer);
    const textarea = layer.querySelector("textarea"), submit2 = layer.querySelector('button[type="submit"]'), sync = () => submit2.disabled = !textarea.value.trim();
    textarea.oninput = sync;
    sync();
    layer.querySelector('button[type="button"]').onclick = () => layer.remove();
    layer.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      if (!textarea.value.trim()) return;
      submit2.disabled = true;
      const error = layer.querySelector("form>p");
      try {
        await catacombApi(`/api/parishioner/prayer-dream/${prayerId}`, { method: "PATCH", body: JSON.stringify({ prayerText: textarea.value }) });
        layer.remove();
        await loadPrayerDreams("sent");
        modal("\uAE30\uB3C4\uB4DC\uB9BC", "<p>\uAE30\uB3C4\uBB38\uC744 \uC218\uC815\uD588\uC2B5\uB2C8\uB2E4.</p>");
      } catch (reason) {
        error.textContent = reason.message;
        sync();
      }
    };
  }
  document.head.insertAdjacentHTML("beforeend", "<style>.prayer-edit-modal .member-modal-box>h3{text-align:center}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.prayer-edit:disabled{border-color:#d9e1de;background:#edf1ef;color:#929d99;cursor:not-allowed;opacity:.75}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.prayer-card>.prayer-read,.prayer-card>.prayer-edit{display:inline-flex;width:auto;min-width:86px;height:32px;align-items:center;justify-content:center;margin:10px 8px 10px 0;padding:0 12px;border-radius:7px;font-size:10px;line-height:1;vertical-align:middle}.prayer-card>.prayer-read+.prayer-edit,.prayer-card>.prayer-edit+.prayer-read{margin-left:2px}.prayer-card>.prayer-read+.prayer-reactions,.prayer-card>.prayer-edit+.prayer-reactions{margin-top:2px}@media(max-width:600px){.prayer-card>.prayer-read,.prayer-card>.prayer-edit{min-width:78px;height:30px;padding:0 10px;font-size:9px}}</style>");
  new MutationObserver(enhancePrayerEdits).observe(document.body, { childList: true, subtree: true });
  function mountCatacomb() {
    const panel2 = document.querySelector('[data-member-sharing-panel="catacomb"]');
    if (!panel2 || panel2.dataset.ready) return;
    panel2.dataset.ready = "true";
    panel2.classList.add("catacomb-panel");
    panel2.innerHTML = `<form id="catacomb-form" class="catacomb-form"><header><div><h3>\uCE74\uD0C0\uCF64 \uAE00\uC4F0\uAE30</h3><p>\uC11C\uB85C\uC758 \uC774\uC57C\uAE30\uC5D0 \uB530\uB73B\uD55C \uB9C8\uC74C\uC744 \uC804\uD574 \uC8FC\uC138\uC694.</p></div><button class="green-button" type="submit">\uB4F1\uB85D</button></header><label>\uC81C\uBAA9<input id="catacomb-title" maxlength="200" required placeholder="\uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></label><label>\uB0B4\uC6A9<textarea id="catacomb-content" maxlength="20000" rows="5" required placeholder="\uB098\uB204\uACE0 \uC2F6\uC740 \uC774\uC57C\uAE30\uB97C \uC801\uC5B4 \uC8FC\uC138\uC694"></textarea></label><label>\uD0DC\uADF8<input id="catacomb-tags" maxlength="1000" placeholder="\uC27C\uD45C(,) \uB610\uB294 \uB744\uC5B4\uC4F0\uAE30\uB85C \uAD6C\uBD84"></label><div id="catacomb-tag-preview" class="catacomb-tag-preview" aria-live="polite" hidden></div><small>\uC27C\uD45C \uB610\uB294 \uACF5\uBC31\uC744 \uC785\uB825\uD558\uBA74 \uD0DC\uADF8\uBCC4\uB85C \uAD6C\uBD84\uB418\uC5B4 \uD45C\uC2DC\uB429\uB2C8\uB2E4.</small><label class="catacomb-anonymous"><input id="catacomb-anonymous" type="checkbox"> \uC775\uBA85\uC73C\uB85C \uB4F1\uB85D</label><p id="catacomb-form-error"></p></form><div class="catacomb-feed-head"><h3>\uCE74\uD0C0\uCF64 \uC774\uC57C\uAE30</h3><span id="catacomb-count"></span></div><div id="catacomb-post-list" class="catacomb-post-list"></div><p id="catacomb-empty" class="catacomb-empty" hidden>\uB4F1\uB85D\uB41C \uCE74\uD0C0\uCF64 \uC774\uC57C\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>`;
    document.querySelector("#catacomb-form").addEventListener("submit", createCatacombPost);
    document.querySelector("#catacomb-tags").addEventListener("input", renderCatacombTagPreview);
    void loadCatacombPosts();
  }
  function renderCatacombTagPreview() {
    const input = document.querySelector("#catacomb-tags"), preview = document.querySelector("#catacomb-tag-preview");
    if (!input || !preview) return;
    const tags = [...new Set(input.value.split(/[,\s]+/).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean))];
    preview.innerHTML = tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("");
    preview.hidden = tags.length === 0;
  }
  new MutationObserver(mountCatacomb).observe(document.body, { childList: true, subtree: true });
  var missionCommunityCache = /* @__PURE__ */ new Map();
  async function catacombApi(url, options2) {
    let body = options2?.body;
    if (options2?.method === "POST" && /\/missions\/\d+\/questions$/.test(url) && typeof body === "string") {
      const payload = JSON.parse(body), missionId = Number(url.match(/\d+/)?.[0]);
      payload.anonymous = document.querySelector(`.mission-community[data-mission-id="${missionId}"] .mission-question-anonymous input`)?.checked ?? false;
      body = JSON.stringify(payload);
    }
    const response = await fetch(url, { ...options2, body, headers: { "Content-Type": "application/json", ...options2?.headers ?? {} } }), result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    const match = url.match(/^\/api\/parishioner\/missions\/(\d+)\/community$/);
    if (match) missionCommunityCache.set(Number(match[1]), result);
    return result;
  }
  async function createCatacombPost(event) {
    event.preventDefault();
    const title = document.querySelector("#catacomb-title"), content = document.querySelector("#catacomb-content"), tags = document.querySelector("#catacomb-tags"), anonymous = document.querySelector("#catacomb-anonymous"), error = document.querySelector("#catacomb-form-error");
    error.textContent = "";
    try {
      await catacombApi("/api/parishioner/catacomb/posts", { method: "POST", body: JSON.stringify({ title: title.value, content: content.value, tags: tags.value, anonymous: anonymous.checked }) });
      title.value = "";
      content.value = "";
      tags.value = "";
      anonymous.checked = false;
      renderCatacombTagPreview();
      await loadCatacombPosts();
    } catch (reason) {
      error.textContent = reason.message;
    }
  }
  async function loadCatacombPosts() {
    try {
      const posts = await catacombApi("/api/parishioner/catacomb/posts"), list = document.querySelector("#catacomb-post-list");
      list.innerHTML = posts.map((post) => `<article class="catacomb-post"><header><div><strong>${escapeHtml(post.authorName)}</strong><time>${new Date(post.createdAt).toLocaleString("ko-KR")}</time></div><h3>${escapeHtml(post.title)}</h3></header><p class="catacomb-content">${escapeHtml(post.content)}</p>${post.tags.length ? `<div class="catacomb-tags">${post.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}<div class="catacomb-reactions">${Object.keys(catacombReactionLabels).map((key) => `<button class="${post.myReaction === key ? "selected" : ""}" data-catacomb-reaction="${key}" data-post="${post.id}" type="button"><span>${catacombReactionLabels[key]}</span><b>${post.reactions[key]}</b></button>`).join("")}</div><section class="catacomb-comments"><h4>\uB313\uAE00 ${post.comments.length}\uAC1C</h4><div>${post.comments.map((comment) => `<article class="catacomb-comment"><div><strong>${escapeHtml(comment.authorName)}</strong><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time></div><p>${escapeHtml(comment.content)}</p><button class="${comment.liked ? "liked" : ""}" data-comment-like="${comment.id}" type="button">\u2661 \uC88B\uC544\uC694 <b>${comment.likeCount}</b></button></article>`).join("")}</div><form data-comment-form="${post.id}"><input maxlength="2000" required placeholder="\uB313\uAE00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"><button class="green-outline" type="submit">\uB313\uAE00 \uB4F1\uB85D</button></form></section></article>`).join("");
      document.querySelector("#catacomb-count").textContent = `\uCD1D ${posts.length}\uAC1C`;
      document.querySelector("#catacomb-empty").hidden = posts.length > 0;
      list.querySelectorAll("[data-catacomb-reaction]").forEach((button) => button.onclick = () => selectCatacombReaction(Number(button.dataset.post), button.dataset.catacombReaction));
      list.querySelectorAll("[data-comment-like]").forEach((button) => button.onclick = () => toggleCatacombCommentLike(Number(button.dataset.commentLike)));
      list.querySelectorAll("[data-comment-form]").forEach((form) => form.onsubmit = (event) => createCatacombComment(event, Number(form.dataset.commentForm)));
    } catch (error) {
      console.error(error);
    }
  }
  async function selectCatacombReaction(postId, reaction) {
    try {
      await catacombApi(`/api/parishioner/catacomb/posts/${postId}/reaction`, { method: "PUT", body: JSON.stringify({ reaction }) });
      await loadCatacombPosts();
    } catch (error) {
      modal("\uCE74\uD0C0\uCF64", `<p>${escapeHtml(error.message)}</p>`);
    }
  }
  async function createCatacombComment(event, postId) {
    event.preventDefault();
    const input = event.currentTarget.querySelector("input");
    try {
      await catacombApi(`/api/parishioner/catacomb/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ content: input.value }) });
      await loadCatacombPosts();
    } catch (error) {
      modal("\uB313\uAE00", `<p>${escapeHtml(error.message)}</p>`);
    }
  }
  async function toggleCatacombCommentLike(commentId) {
    try {
      await catacombApi(`/api/parishioner/catacomb/comments/${commentId}/like`, { method: "POST" });
      await loadCatacombPosts();
    } catch (error) {
      modal("\uB313\uAE00 \uC88B\uC544\uC694", `<p>${escapeHtml(error.message)}</p>`);
    }
  }
  var popupRegistrationForms = /* @__PURE__ */ new WeakSet();
  var popupFormSettings = { "catacomb-form": { title: "\uCE74\uD0C0\uCF64 \uB4F1\uB85D", button: "+ \uCE74\uD0C0\uCF64 \uB4F1\uB85D" }, "member-mission-form": { title: "\uBBF8\uC158 \uB4F1\uB85D", button: "+ \uBBF8\uC158 \uB4F1\uB85D" }, "prayer-dream-form": { title: "\uAE30\uB3C4\uBB38 \uC791\uC131", button: "+ \uAE30\uB3C4\uBB38 \uC791\uC131" } };
  function convertRegistrationFormsToModals() {
    Object.entries(popupFormSettings).forEach(([id, setting]) => {
      const form = document.querySelector(`#${id}`);
      if (!form || popupRegistrationForms.has(form)) return;
      popupRegistrationForms.add(form);
      const launcher = document.createElement("div"), button = document.createElement("button"), parent = form.parentElement, sharingNav = parent.closest(".member-sharing")?.querySelector(".member-sharing-tabs");
      launcher.className = "registration-form-launcher";
      button.className = "green-button registration-form-open";
      button.type = "button";
      button.textContent = setting.button;
      launcher.append(button);
      if (sharingNav) {
        launcher.classList.add("sharing-registration-launcher");
        sharingNav.append(launcher);
        const sync = () => launcher.hidden = parent.hidden;
        new MutationObserver(sync).observe(parent, { attributes: true, attributeFilter: ["hidden"] });
        sync();
      } else parent.insertBefore(launcher, form);
      form.remove();
      button.onclick = () => {
        document.querySelector(".registration-form-modal")?.remove();
        const layer = document.createElement("div");
        layer.className = "member-modal registration-form-modal";
        layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(setting.title)}</h3><div class="registration-form-modal-body"></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
        layer.querySelector(".registration-form-modal-body").append(form);
        document.body.append(layer);
        const close = () => {
          form.remove();
          layer.remove();
        };
        layer.querySelector(":scope>.member-modal-box>footer button").onclick = close;
      };
    });
  }
  new MutationObserver(() => queueMicrotask(convertRegistrationFormsToModals)).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(convertRegistrationFormsToModals);
  var memberShrineReviews = [];
  var visibleMemberReviewCount = 2;
  var visibleMemberShrineCount = 2;
  function reviewCard(item) {
    return `<article class="member-pilgrimage-review"><img src="${item.imageUrl}" alt="${escapeHtml(item.title)}"><div><b>${escapeHtml(item.diocese)} \xB7 ${escapeHtml(item.shrineName)}</b><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.reviewText ?? "")}</p><small>${escapeHtml(item.authorName)}${item.baptismalName ? ` (${escapeHtml(item.baptismalName)})` : ""}</small><footer>${item.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}<time>${escapeHtml(item.visitedDate)} \uC21C\uB840</time></footer><button class="green-outline member-review-detail-button" data-member-review-detail="${item.id}" type="button">\uC0C1\uC138\uBCF4\uAE30</button></div></article>`;
  }
  function openMemberReviewDetail(item) {
    document.querySelector(".member-review-detail-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal member-review-detail-modal";
    layer.innerHTML = `<section class="member-modal-box"><header class="member-review-detail-head"><h3>${escapeHtml(item.shrineName)} \uC21C\uB840\uD6C4\uAE30</h3><button class="member-review-detail-close" type="button" aria-label="\uB2EB\uAE30">\xD7</button></header><div class="member-modal-body"><div class="member-review-carousel"><section class="member-review-detail-gallery">${item.imageUrls.map((url, index) => `<figure><img src="${url}" alt="${escapeHtml(item.title)} \uC0AC\uC9C4 ${index + 1}"><figcaption>${index + 1} / ${item.imageUrls.length}</figcaption></figure>`).join("")}</section>${item.imageUrls.length > 1 ? '<button class="member-review-carousel-prev" type="button" aria-label="\uC774\uC804 \uC0AC\uC9C4">\u2039</button><button class="member-review-carousel-next" type="button" aria-label="\uB2E4\uC74C \uC0AC\uC9C4">\u203A</button>' : ""}</div><section class="member-review-title-card"><span>\uD6C4\uAE30 \uC81C\uBAA9</span><h4>${escapeHtml(item.title)}</h4></section><section class="member-review-info-grid"><article><span>\uC21C\uB840\uC9C0</span><strong>${escapeHtml(item.shrineName)}</strong><small>${escapeHtml(item.diocese)}</small></article><article><span>\uC791\uC131\uC790</span><strong>${escapeHtml(item.authorName)}</strong><small>${item.baptismalName ? escapeHtml(item.baptismalName) : "\uC138\uB840\uBA85 \uC5C6\uC74C"}</small></article><article><span>\uC21C\uB840\uC77C</span><strong>${escapeHtml(item.visitedDate)}</strong></article><article class="member-review-info-tags"><span>\uD0DC\uADF8</span><div>${item.tags.map((tag) => `<b>#${escapeHtml(tag)}</b>`).join("") || "-"}</div></article></section><section class="member-review-detail-content"><h4>\uC21C\uB840\uD6C4\uAE30</h4><article class="member-review-detail-copy">${escapeHtml(item.reviewText ?? "\uD6C4\uAE30 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.")}</article></section></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    const close = () => layer.remove(), gallery = layer.querySelector(".member-review-detail-gallery");
    layer.querySelector(".member-review-detail-close").onclick = close;
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = close;
    layer.querySelector(".member-review-carousel-prev")?.addEventListener("click", () => gallery.scrollBy({ left: -gallery.clientWidth, behavior: "smooth" }));
    layer.querySelector(".member-review-carousel-next")?.addEventListener("click", () => gallery.scrollBy({ left: gallery.clientWidth, behavior: "smooth" }));
  }
  function enhanceShrinePilgrimageMenus() {
    const section = document.querySelector(".member-shrines");
    if (!section) return;
    if (section.dataset.menuReady) {
      applyMemberShrineVisibility();
      return;
    }
    section.dataset.menuReady = "true";
    section.classList.add("pilgrimage-summary");
    section.querySelector(":scope>header").insertAdjacentHTML("afterend", '<nav class="member-pilgrimage-tabs"><button class="active" data-pilgrimage-tab="reviews" type="button">\uD6C4\uAE30</button><button data-pilgrimage-tab="shrines" type="button">\uC21C\uB840\uC9C0</button></nav><section class="member-pilgrimage-reviews"><div class="member-pilgrimage-review-list"><p class="member-shrine-empty">\uD6C4\uAE30\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p></div><button class="green-outline member-pilgrimage-more" data-pilgrimage-more="reviews" type="button" hidden>more</button></section>');
    section.querySelector("#member-shrine-list").insertAdjacentHTML("afterend", '<button class="green-outline member-pilgrimage-more" data-pilgrimage-more="shrines" type="button">more</button>');
    const switchTab = (name) => {
      section.querySelectorAll("[data-pilgrimage-tab]").forEach((button) => button.classList.toggle("active", button.dataset.pilgrimageTab === name));
      section.querySelector(".member-pilgrimage-reviews").hidden = name !== "reviews";
      section.querySelector(".member-shrine-toolbar").hidden = name !== "shrines";
      section.querySelector("#member-shrine-list").hidden = name !== "shrines";
      const more = section.querySelector('[data-pilgrimage-more="shrines"]');
      more.dataset.tabHidden = String(name !== "shrines");
      applyMemberShrineVisibility();
    };
    section.querySelectorAll("[data-pilgrimage-tab]").forEach((button) => button.onclick = () => switchTab(button.dataset.pilgrimageTab));
    section.querySelector('[data-pilgrimage-more="reviews"]').onclick = showMoreMemberReviews;
    section.querySelector('[data-pilgrimage-more="shrines"]').onclick = showMoreMemberShrines;
    switchTab("reviews");
    void loadMemberShrineReviews();
  }
  function applyMemberShrineVisibility() {
    const section = document.querySelector(".member-shrines");
    if (!section?.dataset.menuReady) return;
    const cards = [...section.querySelectorAll("#member-shrine-list>.member-shrine-card")], more = section.querySelector('[data-pilgrimage-more="shrines"]');
    cards.forEach((card, index) => card.hidden = index >= visibleMemberShrineCount);
    more.hidden = more.dataset.tabHidden === "true" || visibleMemberShrineCount >= cards.length;
  }
  function showMoreMemberShrines() {
    visibleMemberShrineCount += 2;
    applyMemberShrineVisibility();
  }
  function enhanceShrineVisitForms() {
    document.querySelectorAll("[data-shrine-visit]").forEach((form) => {
      if (form.dataset.visitUxReady) return;
      form.dataset.visitUxReady = "true";
      const checkbox = form.querySelector('input[type="checkbox"]'), date = form.querySelector('[name="visitedDate"]'), submit2 = form.querySelector('button[type="submit"]');
      if (checkbox.checked) return;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked && !date.value) {
          date.value = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
          date.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      date.addEventListener("input", () => {
        if (date.value && !checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      submit2.title = "\uBC29\uBB38\uD568\uC744 \uC120\uD0DD\uD558\uACE0 \uBC29\uBB38 \uB0A0\uC9DC\uB97C \uC785\uB825\uD558\uBA74 \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
    });
  }
  function fixMemberGroupModalScroll() {
    const box = document.querySelector(".member-group-modal .member-modal-box"), form = box?.querySelector(":scope>form");
    if (!box || !form || box.dataset.scrollFixed) return;
    const actions = form.querySelector(":scope>div:last-child");
    if (!actions) return;
    box.dataset.scrollFixed = "true";
    form.id ||= "member-group-create-form";
    actions.classList.add("member-group-fixed-actions");
    actions.querySelectorAll('button[type="submit"]').forEach((button) => button.setAttribute("form", form.id));
    box.append(actions);
  }
  async function loadMemberShrineReviews() {
    const section = document.querySelector(".member-pilgrimage-reviews");
    if (!section) return;
    try {
      memberShrineReviews = await catacombApi("/api/parishioner/shrine-reviews");
      visibleMemberReviewCount = 2;
      renderVisibleMemberReviews();
    } catch (error) {
      section.querySelector(".member-pilgrimage-review-list").innerHTML = `<p class="member-shrine-empty">${escapeHtml(error.message)}</p>`;
    }
  }
  function renderVisibleMemberReviews() {
    const section = document.querySelector(".member-pilgrimage-reviews");
    if (!section) return;
    section.querySelector(".member-pilgrimage-review-list").innerHTML = memberShrineReviews.length ? memberShrineReviews.slice(0, visibleMemberReviewCount).map(reviewCard).join("") : '<p class="member-shrine-empty">\uB4F1\uB85D\uD55C \uC21C\uB840\uD6C4\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    section.querySelector('[data-pilgrimage-more="reviews"]').hidden = visibleMemberReviewCount >= memberShrineReviews.length;
  }
  function showMoreMemberReviews() {
    visibleMemberReviewCount = Math.min(visibleMemberReviewCount + 2, memberShrineReviews.length);
    renderVisibleMemberReviews();
  }
  var parishVideos = [];
  var visibleParishVideoCount = 2;
  function videoCard(video) {
    return `<article class="member-video-card"><a href="${escapeHtml(video.youtubeUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(video.thumbnailUrl)}" alt="${escapeHtml(video.title)}"><span aria-hidden="true">\u25B6</span></a><div><h3>${escapeHtml(video.title)}</h3><p>${escapeHtml(video.authorName || "\uCC44\uB110 \uC815\uBCF4 \uC5C6\uC74C")}</p>${video.tags.length ? `<div class="member-video-tags">${video.tags.map((tag) => `<b>#${escapeHtml(tag)}</b>`).join("")}</div>` : ""}<time>${new Date(video.createdAt).toLocaleDateString("ko-KR")} \uB4F1\uB85D</time></div></article>`;
  }
  function mountParishVideos() {
    const home = document.querySelector(".member-home"), notices = home?.querySelector(".member-notices");
    if (!home || !notices || home.querySelector(".member-videos")) return;
    notices.insertAdjacentHTML("beforebegin", '<section class="member-videos"><header><div><h2>\uB3D9\uC601\uC0C1</h2><p>\uC6B0\uB9AC \uC131\uB2F9\uC5D0\uC11C \uB4F1\uB85D\uD55C \uB3D9\uC601\uC0C1\uC744 \uD655\uC778\uD574 \uBCF4\uC138\uC694.</p></div><button class="member-video-more green-outline" type="button" hidden>more</button></header><div class="member-video-list"><p class="member-video-empty">\uB3D9\uC601\uC0C1\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p></div></section>');
    void loadParishVideos();
  }
  function renderVisibleParishVideos() {
    const section = document.querySelector(".member-videos"), list = section?.querySelector(".member-video-list"), more = section?.querySelector(".member-video-more");
    if (!section || !list || !more) return;
    list.innerHTML = parishVideos.length ? parishVideos.slice(0, visibleParishVideoCount).map(videoCard).join("") : '<p class="member-video-empty">\uB4F1\uB85D\uB41C \uB3D9\uC601\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    more.hidden = visibleParishVideoCount >= parishVideos.length;
  }
  async function loadParishVideos() {
    const section = document.querySelector(".member-videos");
    if (!section) return;
    try {
      parishVideos = await catacombApi("/api/parishioner/videos");
      visibleParishVideoCount = 2;
      const list = section.querySelector(".member-video-list"), more = section.querySelector(".member-video-more");
      if (more.previousElementSibling !== list) list.insertAdjacentElement("afterend", more);
      more.onclick = () => {
        visibleParishVideoCount += 2;
        renderVisibleParishVideos();
      };
      renderVisibleParishVideos();
    } catch (error) {
      section.querySelector(".member-video-list").innerHTML = `<p class="member-video-empty">${escapeHtml(error.message)}</p>`;
    }
  }
  function mountMemberShrines() {
    const home = document.querySelector(".member-home"), sharing = document.querySelector(".member-sharing"), notices = document.querySelector(".member-notices");
    if (!home || document.querySelector(".member-shrines")) return;
    const anchor = sharing ?? notices;
    if (!anchor) return;
    anchor.insertAdjacentHTML("beforebegin", `<section class="member-shrines"><header><div><h2>\uC131\uC9C0\uC21C\uB840</h2><p>\uC21C\uB840\uD55C \uC131\uC9C0\uB97C \uC120\uD0DD\uD558\uACE0 \uBC29\uBB38 \uAE30\uB85D\uACFC \uC0AC\uC9C4\uC744 \uB0A8\uACA8\uBCF4\uC138\uC694.</p></div><span id="member-shrine-count"></span></header><div class="member-shrine-toolbar"><input id="member-shrine-search" type="search" placeholder="\uC131\uC9C0\uBA85, \uAD50\uAD6C, \uC8FC\uC18C \uAC80\uC0C9"><button class="green-outline" id="member-shrine-search-button" type="button">\uC870\uD68C</button></div><div id="member-shrine-list" class="member-shrine-list"><p class="member-shrine-empty">\uC131\uC9C0 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p></div></section>`);
    document.querySelector("#member-shrine-search-button").addEventListener("click", renderMemberShrines);
    document.querySelector("#member-shrine-search").addEventListener("input", renderMemberShrines);
    void loadMemberShrines();
  }
  var memberShrines = [];
  async function loadMemberShrines() {
    const list = document.querySelector("#member-shrine-list");
    if (!list) return;
    try {
      memberShrines = await catacombApi("/api/parishioner/shrines");
      renderMemberShrines();
    } catch (error) {
      list.innerHTML = `<p class="member-shrine-empty">${escapeHtml(error.message)}</p>`;
    }
  }
  function renderMemberShrines() {
    const list = document.querySelector("#member-shrine-list"), count = document.querySelector("#member-shrine-count"), search2 = document.querySelector("#member-shrine-search");
    if (!list || !count) return;
    const q = (search2?.value ?? "").trim().toLowerCase(), items = memberShrines.filter((item) => !q || [item.name, item.diocese, item.address ?? ""].some((value) => value.toLowerCase().includes(q)));
    count.textContent = `\uBC29\uBB38 ${memberShrines.filter((item) => item.visited).length}\uACF3 / \uC804\uCCB4 ${memberShrines.length}\uACF3`;
    list.innerHTML = items.length ? items.map((item) => `<article class="member-shrine-card ${item.visited ? "visited" : ""}"><header><div><b>${escapeHtml(item.diocese)}</b><h3>${escapeHtml(item.name)}</h3></div>${item.visited ? "<em>\uBC29\uBB38 \uC644\uB8CC</em>" : ""}</header><p>${escapeHtml(item.address ?? "\uC8FC\uC18C \uC815\uBCF4 \uC5C6\uC74C")}</p>${item.websiteUrl ? `<a href="${escapeHtml(item.websiteUrl)}" target="_blank" rel="noopener">\uC131\uC9C0 \uD648\uD398\uC774\uC9C0</a>` : ""}<form data-shrine-visit="${item.id}"><label class="member-shrine-check"><input type="checkbox" ${item.visited ? "checked" : ""}> \uBC29\uBB38\uD568</label><label>\uBC29\uBB38\uD55C \uB0A0\uC9DC<input type="date" name="visitedDate" max="${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}" value="${item.visitedDate ?? ""}" ${item.visited ? "" : "disabled"} required></label><button class="green-outline" type="submit" ${item.visited || !item.visitedDate ? "disabled" : ""}>${item.visited ? "\uBC29\uBB38\uC77C \uC800\uC7A5" : "\uBC29\uBB38 \uB4F1\uB85D"}</button></form>${item.visited ? `<button class="member-shrine-photo-open" data-shrine-photo="${item.id}" data-shrine-name="${escapeHtml(item.name)}" type="button">\uC0AC\uC9C4 \uB4F1\uB85D\xB7\uBCF4\uAE30 <b>${item.reviewCount}</b></button>` : ""}</article>`).join("") : '<p class="member-shrine-empty">\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    list.querySelectorAll("[data-shrine-visit]").forEach((form) => {
      const checkbox = form.querySelector('input[type="checkbox"]'), date = form.querySelector('[name="visitedDate"]'), submit2 = form.querySelector('button[type="submit"]');
      const sync = () => {
        date.disabled = !checkbox.checked;
        submit2.disabled = !checkbox.checked || !date.value;
      };
      checkbox.onchange = sync;
      date.oninput = sync;
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (submit2.disabled) return;
        submit2.disabled = true;
        try {
          await catacombApi(`/api/parishioner/shrines/${form.dataset.shrineVisit}/visit`, { method: "PUT", body: JSON.stringify({ visitedDate: date.value }) });
          await loadMemberShrines();
          modal("\uC131\uC9C0\uC21C\uB840", "<p>\uBC29\uBB38 \uAE30\uB85D\uC744 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.</p>");
        } catch (error) {
          modal("\uC131\uC9C0\uC21C\uB840", `<p>${escapeHtml(error.message)}</p>`);
          sync();
        }
      };
    });
    list.querySelectorAll("[data-shrine-photo]").forEach((button) => button.onclick = () => openShrinePhotos(Number(button.dataset.shrinePhoto), button.dataset.shrineName ?? "\uC131\uC9C0"));
  }
  async function openShrinePhotos(shrineId, shrineName) {
    document.querySelector(".shrine-photo-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal shrine-photo-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(shrineName)} \uBC29\uBB38 \uC0AC\uC9C4</h3><div class="shrine-photo-modal-body"><form><label>\uC0AC\uC9C4 \uC81C\uBAA9<input name="title" maxlength="200" required placeholder="\uC0AC\uC9C4 \uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></label><label>\uD0DC\uADF8<input name="tags" maxlength="1000" placeholder="\uC27C\uD45C(,) \uB610\uB294 \uB744\uC5B4\uC4F0\uAE30\uB85C \uAD6C\uBD84"></label><div class="shrine-photo-tag-preview" hidden></div><label>\uC0AC\uC9C4 \uC120\uD0DD<input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required></label><p></p><button class="green-button" type="submit" disabled>\uC0AC\uC9C4 \uB4F1\uB85D</button></form><section><header><h4>\uB4F1\uB85D\uD55C \uC0AC\uC9C4</h4><span></span></header><div class="shrine-photo-list">\uBD88\uB7EC\uC624\uB294 \uC911...</div></section></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    const form = layer.querySelector("form"), title = form.querySelector('[name="title"]'), tags = form.querySelector('[name="tags"]'), file = form.querySelector('[name="photo"]'), submit2 = form.querySelector('button[type="submit"]'), preview = form.querySelector(".shrine-photo-tag-preview"), sync = () => {
      const parsed = [...new Set(tags.value.split(/[,\s]+/).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean))];
      preview.innerHTML = parsed.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("");
      preview.hidden = !parsed.length;
      submit2.disabled = !title.value.trim() || !file.files?.[0];
    };
    form.oninput = sync;
    form.onsubmit = async (event) => {
      event.preventDefault();
      const selected = file.files?.[0];
      if (!selected || submit2.disabled) return;
      if (selected.size > 5 * 1024 * 1024) {
        form.querySelector("p").textContent = "\uC0AC\uC9C4\uC740 5MB \uC774\uD558\uB85C \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.";
        return;
      }
      submit2.disabled = true;
      try {
        const imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("\uC0AC\uC9C4\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
          reader.readAsDataURL(selected);
        });
        await catacombApi(`/api/parishioner/shrines/${shrineId}/photos`, { method: "POST", body: JSON.stringify({ title: title.value, tags: tags.value, imageType: selected.type, imageData }) });
        layer.remove();
        await loadMemberShrines();
        await openShrinePhotos(shrineId, shrineName);
      } catch (error) {
        form.querySelector("p").textContent = error.message;
        sync();
      }
    };
    try {
      const photos = await catacombApi(`/api/parishioner/shrines/${shrineId}/photos`), list = layer.querySelector(".shrine-photo-list");
      layer.querySelector(".shrine-photo-modal-body>section header span").textContent = `\uCD1D ${photos.length}\uC7A5`;
      list.innerHTML = photos.length ? photos.map((photo) => `<article><img src="${photo.imageUrl}" alt="${escapeHtml(photo.title)}"><div><h5>${escapeHtml(photo.title)}</h5>${photo.tags.length ? `<div>${photo.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}<time>${new Date(photo.createdAt).toLocaleString("ko-KR")}</time></div></article>`).join("") : '<p class="member-shrine-empty">\uB4F1\uB85D\uD55C \uBC29\uBB38 \uC0AC\uC9C4\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
    } catch (error) {
      layer.querySelector(".shrine-photo-list").textContent = error.message;
    }
  }
  function enhanceShrineReviews() {
    document.querySelectorAll("[data-shrine-photo]").forEach((button) => {
      button.childNodes[0].textContent = "\uC21C\uB840\uD6C4\uAE30 \uB4F1\uB85D ";
    });
    const layer = document.querySelector(".shrine-photo-modal");
    if (!layer || layer.dataset.reviewReady) return;
    layer.dataset.reviewReady = "true";
    const form = layer.querySelector("form"), title = form.querySelector('[name="title"]'), tags = form.querySelector('[name="tags"]'), file = form.querySelector('[name="photo"]'), submit2 = form.querySelector('button[type="submit"]'), error = form.querySelector("p");
    title.closest("label").childNodes[0].textContent = "\uD6C4\uAE30 \uC81C\uBAA9";
    title.placeholder = "\uC21C\uB840\uD6C4\uAE30 \uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694";
    title.closest("label").insertAdjacentHTML("afterend", '<label class="shrine-review-text">\uC21C\uB840 \uD6C4\uAE30<textarea name="reviewText" maxlength="10000" rows="6" required placeholder="\uC131\uC9C0\uB97C \uC21C\uB840\uD558\uBA70 \uB290\uB080 \uC810\uACFC \uC774\uC57C\uAE30\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label>');
    const originalFileLabel = file.closest("label");
    originalFileLabel.className = "shrine-review-photos";
    originalFileLabel.innerHTML = '<span>\uC0AC\uC9C4</span><div class="shrine-photo-dropzone" tabindex="0" role="button" aria-label="\uC0AC\uC9C4\uC744 \uC120\uD0DD\uD558\uAC70\uB098 \uC774\uACF3\uC5D0 \uB04C\uC5B4\uB2E4 \uB193\uC73C\uC138\uC694"><strong>\uC0AC\uC9C4\uC744 \uB04C\uC5B4\uB2E4 \uB193\uC73C\uC138\uC694</strong><small>\uB610\uB294 \uC544\uB798 \uCD94\uAC00 \uBC84\uD2BC\uC73C\uB85C \uC120\uD0DD \xB7 JPG, PNG, WEBP, GIF (\uC7A5\uB2F9 5MB)</small></div><div class="shrine-photo-queue"></div><button class="green-outline shrine-photo-add" type="button">+ \uCD94\uAC00</button><input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>';
    const picker = originalFileLabel.querySelector('[name="photo"]'), dropzone = originalFileLabel.querySelector(".shrine-photo-dropzone"), queue = originalFileLabel.querySelector(".shrine-photo-queue"), add = originalFileLabel.querySelector(".shrine-photo-add"), review = form.querySelector('[name="reviewText"]'), files = [];
    layer.querySelector("h3").textContent = layer.querySelector("h3").textContent.replace("\uBC29\uBB38 \uC0AC\uC9C4", "\uC21C\uB840\uD6C4\uAE30");
    layer.querySelector("h4").textContent = "\uB4F1\uB85D\uD55C \uC21C\uB840\uD6C4\uAE30";
    submit2.textContent = "\uC21C\uB840\uD6C4\uAE30 \uB4F1\uB85D";
    const sync = () => submit2.disabled = !title.value.trim() || !review.value.trim() || !files.length;
    const renderFiles = () => {
      queue.innerHTML = files.map((item, index) => `<article><img src="${URL.createObjectURL(item)}" alt=""><span><b>${escapeHtml(item.name)}</b><small>${(item.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" data-remove-photo="${index}" aria-label="${escapeHtml(item.name)} \uC0AD\uC81C">\xD7</button></article>`).join("");
      sync();
    };
    const addFiles = (incoming) => {
      error.textContent = "";
      for (const item of Array.from(incoming)) {
        if (!/^image\/(jpeg|png|webp|gif)$/i.test(item.type)) {
          error.textContent = "JPG, PNG, WEBP \uB610\uB294 GIF \uC0AC\uC9C4\uB9CC \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
          continue;
        }
        if (item.size > 5 * 1024 * 1024) {
          error.textContent = `${item.name}: \uC0AC\uC9C4\uC740 \uC7A5\uB2F9 5MB \uC774\uD558\uB85C \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.`;
          continue;
        }
        files.push(item);
      }
      picker.value = "";
      renderFiles();
    };
    add.onclick = () => picker.click();
    dropzone.onclick = () => picker.click();
    dropzone.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        picker.click();
      }
    };
    picker.onchange = () => {
      if (picker.files) addFiles(picker.files);
    };
    ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    }));
    dropzone.addEventListener("drop", (event) => {
      if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
    });
    queue.onclick = (event) => {
      const button = event.target.closest("[data-remove-photo]");
      if (!button) return;
      files.splice(Number(button.dataset.removePhoto), 1);
      renderFiles();
    };
    form.addEventListener("input", sync);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (submit2.disabled) return;
      submit2.disabled = true;
      error.textContent = `\uC0AC\uC9C4 ${files.length}\uC7A5\uC744 \uB4F1\uB85D\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.`;
      try {
        const shrineId = Number(document.querySelector("[data-shrine-photo]._review-active")?.dataset.shrinePhoto ?? layer.dataset.shrineId);
        for (let index = 0; index < files.length; index++) {
          const selected = files[index], imageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("\uC0AC\uC9C4\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
            reader.readAsDataURL(selected);
          });
          error.textContent = `\uC0AC\uC9C4 ${index + 1}/${files.length}\uC7A5\uC744 \uB4F1\uB85D\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.`;
          await catacombApi(`/api/parishioner/shrines/${shrineId}/photos`, { method: "POST", body: JSON.stringify({ title: title.value, reviewText: review.value, tags: tags.value, imageType: selected.type, imageData }) });
        }
        layer.remove();
        await loadMemberShrines();
        modal("\uC21C\uB840\uD6C4\uAE30", `<p>\uC21C\uB840\uD6C4\uAE30\uC640 \uC0AC\uC9C4 ${files.length}\uC7A5\uC744 \uB4F1\uB85D\uD588\uC2B5\uB2C8\uB2E4.</p>`);
      } catch (reason) {
        error.textContent = reason.message;
        sync();
      }
    }, true);
    const heading = layer.querySelector("h3").textContent ?? "", shrine = memberShrines.find((item) => heading.startsWith(item.name));
    if (shrine) {
      layer.dataset.shrineId = String(shrine.id);
      void catacombApi(`/api/parishioner/shrines/${shrine.id}/photos`).then((photos) => {
        const list = layer.querySelector(".shrine-photo-list"), decorate = () => {
          [...list.querySelectorAll(":scope>article")].forEach((article, index) => {
            if (article.querySelector(".shrine-review-copy")) return;
            const text = photos[index]?.reviewText;
            if (text) article.querySelector(":scope>div")?.insertAdjacentHTML("beforeend", `<p class="shrine-review-copy">${escapeHtml(text)}</p>`);
          });
        };
        new MutationObserver(decorate).observe(list, { childList: true });
        decorate();
      });
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shrine-photo]");
    document.querySelectorAll("[data-shrine-photo]").forEach((item) => item.classList.remove("_review-active"));
    button?.classList.add("_review-active");
  }, true);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-member-review-detail]");
    if (!button) return;
    const item = memberShrineReviews.find((review) => review.id === Number(button.dataset.memberReviewDetail));
    if (item) openMemberReviewDetail(item);
  });
  document.head.insertAdjacentHTML("beforeend", "<style>.member-pilgrimage-review>:scope>div{display:flex;min-width:0;height:100%;flex-direction:column}.member-pilgrimage-review>:scope>div>b{display:block;overflow:hidden;min-height:15px;line-height:15px;text-overflow:ellipsis;white-space:nowrap}.member-pilgrimage-review>:scope>div>p{height:31px;min-height:31px;max-height:31px}.member-pilgrimage-review .member-review-social-summary{flex:0 0 34px;height:34px;min-height:34px;margin-top:9px;margin-bottom:0;overflow:hidden;flex-wrap:nowrap}.member-pilgrimage-review>:scope>div>footer{flex:0 0 24px;min-height:24px;margin-top:auto;overflow:hidden;flex-wrap:nowrap;white-space:nowrap}.member-pilgrimage-review>:scope>div>footer span{flex:0 0 auto}.member-pilgrimage-review>:scope>div>footer time{flex:0 0 auto}@media(max-width:700px){.member-pilgrimage-review>:scope>div>p{height:31px;min-height:31px}.member-pilgrimage-review .member-review-social-summary{flex-basis:32px;height:32px;min-height:32px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-pilgrimage-review>div{display:flex;min-width:0;height:100%;flex-direction:column}.member-pilgrimage-review>div>b{display:block;overflow:hidden;min-height:15px;line-height:15px;text-overflow:ellipsis;white-space:nowrap}.member-pilgrimage-review>div>p{height:31px;min-height:31px;max-height:31px}.member-pilgrimage-review>div>footer{flex:0 0 24px;min-height:24px;margin-top:auto;overflow:hidden;flex-wrap:nowrap;white-space:nowrap}.member-pilgrimage-review>div>footer span{flex:0 0 auto}.member-pilgrimage-review>div>footer time{flex:0 0 auto}</style>");
  var shrineReviewReactionLabels = { like: "\u{1F44D} \uC88B\uC544\uC694", best: "\u{1F31F} \uCD5C\uACE0\uC608\uC694", cheer: "\u{1F4AA} \uC751\uC6D0\uD574\uC694", empathy: "\u{1F917} \uACF5\uAC10\uD574\uC694", thanks: "\u{1F64F} \uAC10\uC0AC\uD574\uC694" };
  var shrineReviewSummaryLoading = false;
  async function decorateShrineReviewCommunitySummaries(force = false) {
    const cards = [...document.querySelectorAll(".member-pilgrimage-review")];
    if (!cards.length || shrineReviewSummaryLoading || !force && cards.every((card) => card.dataset.communitySummaryReady)) return;
    shrineReviewSummaryLoading = true;
    try {
      const summaries = await catacombApi("/api/parishioner/shrine-reviews/community-summary"), byId = new Map(summaries.map((item) => [item.reviewId, item]));
      cards.forEach((card) => {
        const id = Number(card.querySelector("[data-member-review-detail]")?.dataset.memberReviewDetail), summary = byId.get(id), content = card.querySelector(":scope>div"), copy = content?.querySelector(":scope>p");
        if (!content || !copy) return;
        card.dataset.communitySummaryReady = "true";
        let row = content.querySelector(".member-review-social-summary");
        if (!row) {
          row = document.createElement("div");
          row.className = "member-review-social-summary";
          copy.insertAdjacentElement("afterend", row);
        }
        const reactions = summary?.reactions ?? {}, total = Object.values(reactions).reduce((sum, count) => sum + count, 0);
        row.innerHTML = `<span>\u{1F44D} \uC88B\uC544\uC694 <b>${reactions.like ?? 0}</b></span><span>\u{1F60A} \uD45C\uD604 <b>${total}</b></span><span>\u{1F4AC} \uB313\uAE00 <b>${summary?.commentCount ?? 0}</b></span>`;
      });
    } finally {
      shrineReviewSummaryLoading = false;
    }
  }
  var shrineReviewSummaryFrame = 0;
  function scheduleShrineReviewCommunitySummaries() {
    if (shrineReviewSummaryFrame) return;
    shrineReviewSummaryFrame = requestAnimationFrame(() => {
      shrineReviewSummaryFrame = 0;
      void decorateShrineReviewCommunitySummaries();
    });
  }
  new MutationObserver(scheduleShrineReviewCommunitySummaries).observe(document.body, { childList: true, subtree: true });
  new MutationObserver((records) => {
    if (records.some((record) => record.target.closest?.(".member-review-community"))) void decorateShrineReviewCommunitySummaries(true);
  }).observe(document.body, { childList: true, subtree: true });
  document.head.insertAdjacentHTML("beforeend", "<style>.member-review-social-summary{display:flex;flex-wrap:wrap;align-items:center;gap:7px 14px;margin:9px 0 2px;padding:8px 10px;border-radius:8px;background:#f3f8f6;color:#61716b;font-size:9px}.member-review-social-summary span{white-space:nowrap}.member-review-social-summary b{margin-left:2px;color:var(--green);font-size:10px}@media(max-width:600px){.member-review-social-summary{gap:5px 9px;padding:7px 8px;font-size:8px}}</style>");
  async function mountShrineReviewCommunity(layer, reviewId) {
    const body = layer.querySelector(".member-modal-body");
    let section = body.querySelector(".member-review-community");
    if (!section) {
      section = document.createElement("section");
      section.className = "member-review-community";
      body.append(section);
    }
    section.innerHTML = '<p class="member-review-community-loading">\uB313\uAE00\uACFC \uD45C\uD604\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...</p>';
    try {
      const data = await catacombApi(`/api/parishioner/shrine-reviews/${reviewId}/community`), counts = new Map(data.reactions.map((item) => [item.reaction, item]));
      section.innerHTML = `<div class="member-review-reactions">${Object.entries(shrineReviewReactionLabels).map(([key, label]) => {
        const state = counts.get(key);
        return `<button class="${state?.selected ? "selected" : ""}" data-review-reaction="${key}" type="button">${label} <b>${state?.count ?? 0}</b></button>`;
      }).join("")}</div><div class="member-review-comments"><h4>\uB313\uAE00 <span>${data.comments.length}</span></h4><div class="member-review-comment-list">${data.comments.length ? data.comments.map((comment) => `<article><header><strong>${escapeHtml(comment.authorName)}${comment.baptismalName ? ` (${escapeHtml(comment.baptismalName)})` : ""}</strong><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time></header><p>${escapeHtml(comment.content)}</p></article>`).join("") : '<p class="member-review-comment-empty">\uCCAB \uB313\uAE00\uC744 \uB0A8\uACA8\uBCF4\uC138\uC694.</p>'}</div><form><textarea maxlength="2000" rows="3" required placeholder="\uB313\uAE00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea><div><small>0 / 2,000</small><button class="green-button" type="submit" disabled>\uB313\uAE00 \uB4F1\uB85D</button></div><p class="member-review-comment-error"></p></form></div>`;
      section.querySelectorAll("[data-review-reaction]").forEach((button) => button.onclick = async () => {
        button.disabled = true;
        try {
          await catacombApi(`/api/parishioner/shrine-reviews/${reviewId}/reaction`, { method: "PUT", body: JSON.stringify({ reaction: button.dataset.reviewReaction }) });
          await mountShrineReviewCommunity(layer, reviewId);
        } catch (error2) {
          button.disabled = false;
        }
      });
      const form = section.querySelector("form"), textarea = form.querySelector("textarea"), submit2 = form.querySelector('button[type="submit"]'), count = form.querySelector("small"), error = form.querySelector(".member-review-comment-error");
      textarea.oninput = () => {
        count.textContent = `${textarea.value.length.toLocaleString()} / 2,000`;
        submit2.disabled = !textarea.value.trim();
      };
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (submit2.disabled) return;
        submit2.disabled = true;
        error.textContent = "";
        try {
          await catacombApi(`/api/parishioner/shrine-reviews/${reviewId}/comments`, { method: "POST", body: JSON.stringify({ content: textarea.value }) });
          await mountShrineReviewCommunity(layer, reviewId);
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      };
    } catch (error) {
      section.innerHTML = `<p class="member-review-comment-error">${escapeHtml(error.message)}</p>`;
    }
  }
  var baseOpenMemberReviewDetail = openMemberReviewDetail;
  openMemberReviewDetail = (item) => {
    baseOpenMemberReviewDetail(item);
    const layer = document.querySelector(".member-review-detail-modal"), shrine = memberShrines.find((candidate) => candidate.name === item.shrineName && candidate.diocese === item.diocese);
    layer.dataset.visitorNames = JSON.stringify(shrine?.visitorNames ?? []);
    void mountShrineReviewCommunity(layer, item.id);
  };
  document.head.insertAdjacentHTML("beforeend", "<style>.member-review-community{margin-top:16px;padding:17px;border:1px solid var(--line);border-radius:11px;background:#fff}.member-review-community-loading,.member-review-comment-empty{padding:18px;color:var(--muted);text-align:center}.member-review-reactions{display:flex;flex-wrap:wrap;gap:7px;padding-bottom:15px;border-bottom:1px solid var(--line)}.member-review-reactions button{padding:7px 11px;border:1px solid var(--line);border-radius:18px;background:#fff;color:#53635d;font-size:10px;cursor:pointer}.member-review-reactions button.selected{border-color:var(--green);background:var(--soft);color:var(--green);font-weight:800}.member-review-reactions button:disabled{opacity:.5}.member-review-comments h4{margin:16px 0 10px}.member-review-comments h4 span{color:var(--green)}.member-review-comment-list{display:grid;gap:7px}.member-review-comment-list article{padding:11px;border-radius:8px;background:#f7faf9}.member-review-comment-list header{display:flex;justify-content:space-between;gap:10px}.member-review-comment-list strong{font-size:10px}.member-review-comment-list time{color:var(--muted);font-size:8px}.member-review-comment-list article p{margin:7px 0 0!important;color:#485952!important;font-size:10px!important;line-height:1.6!important;white-space:pre-wrap}.member-review-comments form{margin-top:12px}.member-review-comments textarea{width:100%;padding:11px;border:1px solid var(--line);border-radius:8px;resize:vertical}.member-review-comments form>div{display:flex;align-items:center;justify-content:space-between;margin-top:6px}.member-review-comments form small{color:var(--muted);font-size:8px}.member-review-comments form button{height:36px;padding:0 13px}.member-review-comments form button:disabled{opacity:.45;cursor:not-allowed}.member-review-comment-error{min-height:13px;margin:5px 0 0!important;color:#d94350!important;font-size:9px!important}</style>");
  function decorateReviewModalVisitors() {
    const layer = document.querySelector(".member-review-detail-modal"), reactions = layer?.querySelector(".member-review-reactions");
    if (!layer || !reactions || reactions.querySelector(".member-review-modal-visitors")) return;
    let names = [];
    try {
      names = JSON.parse(layer.dataset.visitorNames ?? "[]");
    } catch {
    }
    const box = document.createElement("div");
    box.className = "member-review-modal-visitors";
    const label = document.createElement("span");
    label.textContent = "\uC21C\uB840 \uBC29\uBB38\uC790";
    const summary = document.createElement("b");
    summary.tabIndex = 0;
    summary.textContent = names.length ? `${names[0]}${names.length > 1 ? ` \uC678 ${names.length - 1}\uC778` : ""}` : "\uBC29\uBB38\uC790 \uC5C6\uC74C";
    if (names.length) {
      summary.dataset.visitorTooltip = names.join("\n");
      summary.setAttribute("aria-label", `\uC804\uCCB4 \uC21C\uB840 \uBC29\uBB38\uC790: ${names.join(", ")}`);
    }
    box.append(label, summary);
    reactions.append(box);
  }
  new MutationObserver(decorateReviewModalVisitors).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(decorateReviewModalVisitors);
  document.head.insertAdjacentHTML("beforeend", "<style>.member-review-modal-visitors{display:flex;align-items:center;gap:7px;margin-left:auto;padding:5px 8px;color:#64736d;font-size:9px;white-space:nowrap}.member-review-modal-visitors>b{position:relative;color:var(--green);font-size:9px;cursor:help}.member-review-modal-visitors>b[data-visitor-tooltip]::after{position:absolute;z-index:40;right:0;bottom:calc(100% + 8px);width:max-content;max-width:260px;padding:9px 11px;border-radius:8px;background:#173d32;color:#fff;box-shadow:0 7px 20px rgba(10,42,33,.22);content:attr(data-visitor-tooltip);font-size:9px;font-weight:500;line-height:1.65;opacity:0;pointer-events:none;transform:translateY(4px);transition:.15s;white-space:pre-line}.member-review-modal-visitors>b[data-visitor-tooltip]:hover::after,.member-review-modal-visitors>b[data-visitor-tooltip]:focus::after{opacity:1;transform:translateY(0)}@media(max-width:700px){.member-review-modal-visitors{width:100%;margin-left:0;padding-left:0}}</style>");
  async function openGroupApplications(group) {
    document.querySelector(".group-applications-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal group-withdrawals-modal group-applications-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(group.nameKo)} \uAC00\uC785 \uC2E0\uCCAD</h3><div class="member-modal-body">\uBD88\uB7EC\uC624\uB294 \uC911...</div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    try {
      const result = await catacombApi(`/api/parishioner/groups/${group.id}/applications`), body = layer.querySelector(".member-modal-body");
      body.innerHTML = result.items.length ? `<div class="group-withdrawals-grid"><table><thead><tr><th>\uC2E0\uCCAD\uC790</th><th>\uC5F0\uB77D\uCC98</th><th>\uC2E0\uCCAD \uBA54\uC2DC\uC9C0</th><th>\uC2E0\uCCAD\uC77C</th><th>\uACB0\uC815</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escapeHtml(item.name)}${item.baptismalName ? ` (${escapeHtml(item.baptismalName)})` : ""}</strong></td><td>${escapeHtml(item.email)}<br>${escapeHtml(item.mobile ?? "-")}</td><td>${escapeHtml(item.applicationMessage ?? "-")}</td><td>${new Date(item.requestedAt).toLocaleString("ko-KR")}</td><td><div><button data-group-application="${item.id}" data-decision="rejected" type="button">\uBC18\uB824</button><button data-group-application="${item.id}" data-decision="approved" type="button">\uC2B9\uC778</button></div></td></tr>`).join("")}</tbody></table></div>` : '<p class="member-notification-empty">\uB300\uAE30 \uC911\uC778 \uAC00\uC785 \uC2E0\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      body.querySelectorAll("[data-group-application]").forEach((button) => button.onclick = async () => {
        const decision = button.dataset.decision, reason = decision === "rejected" ? await requestWithdrawalRejection() : "";
        if (decision === "rejected" && reason === null) return;
        await catacombApi(`/api/parishioner/groups/${group.id}/applications/${button.dataset.groupApplication}`, { method: "PATCH", body: JSON.stringify({ decision, reason }) });
        layer.remove();
        await loadMemberGroups();
        modal("\uBAA8\uC784 \uAC00\uC785 \uCC98\uB9AC", `<p>${decision === "approved" ? "\uAC00\uC785\uC744 \uC2B9\uC778\uD588\uC2B5\uB2C8\uB2E4." : "\uAC00\uC785 \uC2E0\uCCAD\uC744 \uBC18\uB824\uD588\uC2B5\uB2C8\uB2E4."}</p>`);
      });
    } catch (error) {
      layer.querySelector(".member-modal-body").textContent = error.message;
    }
  }
  var decoratingGroupApplications = false;
  async function decorateGroupApplications() {
    const list = document.querySelector("#member-group-list");
    if (!list || decoratingGroupApplications) return;
    const cards = [...list.querySelectorAll(".member-group-card:not([data-applications-ready])")];
    if (!cards.length) return;
    decoratingGroupApplications = true;
    try {
      const response = await fetch("/api/parishioner/groups"), groups = await response.json();
      [...list.querySelectorAll(".member-group-card")].forEach((card, index) => {
        const group = groups[index];
        if (!group) return;
        card.dataset.applicationsReady = "true";
        const meeting = card.querySelector("em");
        if (meeting && !meeting.textContent?.trim().startsWith("\uC815\uAE30\uBBF8\uD305")) meeting.textContent = `\uC815\uAE30\uBBF8\uD305 ${meeting.textContent}`;
        if (group.isOperator && !card.querySelector(".member-group-applications")) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "member-group-withdrawals member-group-applications";
          button.textContent = `\uAC00\uC785\uC2E0\uCCAD ${group.applicationCount}\uBA85`;
          button.onclick = () => openGroupApplications(group);
          card.querySelector(".member-group-actions")?.prepend(button);
        }
      });
    } finally {
      decoratingGroupApplications = false;
    }
  }
  new MutationObserver(() => void decorateGroupApplications()).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => void decorateGroupApplications());
  new MutationObserver(() => {
    document.querySelectorAll(".member-group-card:has(.group-owner-state):has(.member-group-actions):not(:has(.member-group-applications))").forEach((card) => delete card.dataset.applicationsReady);
    void decorateGroupApplications();
  }).observe(document.body, { childList: true, subtree: true });
  var decoratingJoinedGroupMemberTooltips = false;
  async function decorateJoinedGroupMemberTooltips() {
    const list = document.querySelector("#member-group-list");
    if (!list || decoratingJoinedGroupMemberTooltips) return;
    const cards = [...list.querySelectorAll(".member-group-card:not([data-member-tooltip-ready])")];
    if (!cards.length) return;
    decoratingJoinedGroupMemberTooltips = true;
    try {
      const response = await fetch("/api/parishioner/groups"), groups = await response.json();
      [...list.querySelectorAll(".member-group-card")].forEach((card, index) => {
        const group = groups[index], badge = card.querySelector(".group-member-count-state");
        if (!group || !badge) return;
        card.dataset.memberTooltipReady = "true";
        if (group.isOperator || group.membershipStatus !== "approved") return;
        badge.classList.add("joined-group-member-count");
        badge.tabIndex = 0;
        const load2 = async () => {
          if (badge.dataset.memberTooltip || badge.dataset.tooltipLoading) return;
          badge.dataset.tooltipLoading = "true";
          try {
            const data = await catacombApi(`/api/parishioner/groups/${group.id}/members`), names = data.items.map((item) => `${item.name}${item.baptismalName ? ` (${item.baptismalName})` : ""}`);
            badge.dataset.memberTooltip = names.join("\n") || "\uD68C\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
            badge.setAttribute("aria-label", `\uC804\uCCB4 \uD68C\uC6D0: ${names.join(", ")}`);
          } catch {
            badge.dataset.memberTooltip = "\uD68C\uC6D0 \uBA85\uB2E8\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
          } finally {
            delete badge.dataset.tooltipLoading;
          }
        };
        badge.addEventListener("mouseenter", () => void load2(), { once: true });
        badge.addEventListener("focus", () => void load2(), { once: true });
      });
    } finally {
      decoratingJoinedGroupMemberTooltips = false;
    }
  }
  new MutationObserver(() => void decorateJoinedGroupMemberTooltips()).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => void decorateJoinedGroupMemberTooltips());
  document.head.insertAdjacentHTML("beforeend", "<style>.joined-group-member-count{position:relative;cursor:help}.joined-group-member-count[data-member-tooltip]::after{position:absolute;z-index:35;left:50%;bottom:calc(100% + 8px);width:max-content;max-width:250px;padding:9px 11px;border-radius:8px;background:#173d32;color:#fff;box-shadow:0 7px 20px rgba(10,42,33,.22);content:attr(data-member-tooltip);font-size:9px;font-weight:500;line-height:1.65;opacity:0;pointer-events:none;transform:translate(-50%,4px);transition:.15s;white-space:pre-line}.joined-group-member-count[data-member-tooltip]:hover::after,.joined-group-member-count[data-member-tooltip]:focus::after{opacity:1;transform:translate(-50%,0)}</style>");
  function openGroupMemberManagement(group) {
    document.querySelector(".group-member-management-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal group-member-management-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(group.nameKo)} \uD68C\uC6D0\uAD00\uB9AC</h3><div class="member-modal-body"><button data-member-management="applications" type="button"><span>\uAC00\uC785 \uC2E0\uCCAD</span><strong>${group.applicationCount}\uBA85</strong><small>\uAC00\uC785 \uC2E0\uCCAD\uC790\uB97C \uD655\uC778\uD558\uACE0 \uC2B9\uC778 \uB610\uB294 \uBC18\uB824\uD569\uB2C8\uB2E4.</small></button><button data-member-management="withdrawals" type="button"><span>\uD0C8\uD1F4 \uC694\uCCAD</span><strong>${group.withdrawalCount}\uBA85</strong><small>\uD0C8\uD1F4 \uC694\uCCAD\uC744 \uD655\uC778\uD558\uACE0 \uC2B9\uC778 \uB610\uB294 \uBC18\uB824\uD569\uB2C8\uB2E4.</small></button></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    layer.querySelector('[data-member-management="applications"]').onclick = () => {
      layer.remove();
      void openGroupApplications(group);
    };
    layer.querySelector('[data-member-management="withdrawals"]').onclick = () => {
      layer.remove();
      void openGroupWithdrawals(group);
    };
  }
  var decoratingGroupMemberManagement = false;
  async function decorateGroupMemberManagement() {
    const list = document.querySelector("#member-group-list");
    if (!list || decoratingGroupMemberManagement) return;
    const cards = [...list.querySelectorAll(".member-group-card:has(.group-owner-state):has(.member-group-actions):not(:has(.member-group-management))")];
    if (!cards.length) return;
    decoratingGroupMemberManagement = true;
    try {
      const response = await fetch("/api/parishioner/groups"), groups = await response.json();
      [...list.querySelectorAll(".member-group-card")].forEach((card, index) => {
        const group = groups[index], actions = card.querySelector(".member-group-actions");
        if (!group?.isOperator || !actions || actions.querySelector(".member-group-management")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "member-group-withdrawals member-group-management";
        button.textContent = "\uD68C\uC6D0\uAD00\uB9AC";
        button.onclick = () => openGroupMemberManagement(group);
        actions.append(button);
      });
    } finally {
      decoratingGroupMemberManagement = false;
    }
  }
  new MutationObserver(() => void decorateGroupMemberManagement()).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => void decorateGroupMemberManagement());
  document.head.insertAdjacentHTML("beforeend", "<style>.member-group-actions>.member-group-applications,.member-group-actions>.member-group-withdrawals:not(.member-group-management){display:none!important}.member-group-management{display:inline-flex!important;align-items:center;justify-content:center}.group-member-management-modal .member-modal-box{width:min(92vw,540px);text-align:left}.group-member-management-modal h3{text-align:center}.group-member-management-modal .member-modal-body{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:22px}.group-member-management-modal .member-modal-body>button{display:grid;grid-template-columns:1fr auto;gap:6px 10px;padding:18px;border:1px solid var(--line);border-radius:11px;background:#fff;color:#3e5149;text-align:left;cursor:pointer}.group-member-management-modal .member-modal-body>button:hover{border-color:var(--green);background:var(--soft)}.group-member-management-modal .member-modal-body span{font-size:12px;font-weight:800}.group-member-management-modal .member-modal-body strong{color:var(--green);font-size:12px}.group-member-management-modal .member-modal-body small{grid-column:1/-1;color:var(--muted);font-size:9px;line-height:1.5}.group-member-management-modal footer{display:flex;justify-content:center;padding:0 22px 20px}.group-member-management-modal footer button{width:100px}@media(max-width:600px){.group-member-management-modal .member-modal-body{grid-template-columns:1fr;padding:16px}}</style>");
  function confirmGroupContentRegistration(type) {
    return new Promise((resolve) => {
      document.querySelector(".group-notice-submit-confirm")?.remove();
      const label = type === "notice" ? "\uACF5\uC9C0\uC0AC\uD56D" : "\uAC8C\uC2DC\uAE00", layer = document.createElement("div");
      layer.className = "member-modal group-notice-submit-confirm";
      layer.innerHTML = `<section class="member-modal-box confirm-box"><h3>${label} \uB4F1\uB85D \uD655\uC778</h3><div class="member-modal-body"><p>\uC791\uC131\uD55C ${label}\uC744 \uB4F1\uB85D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><div class="modal-actions"><button class="green-outline" type="button" data-group-notice-confirm="false">\uCDE8\uC18C</button><button class="green-button" type="button" data-group-notice-confirm="true">\uB4F1\uB85D</button></div></section>`;
      document.body.append(layer);
      const done = (confirmed) => {
        layer.remove();
        resolve(confirmed);
      };
      layer.querySelectorAll("[data-group-notice-confirm]").forEach((button) => button.onclick = () => done(button.dataset.groupNoticeConfirm === "true"));
      layer.addEventListener("click", (event) => {
        if (event.target === layer) done(false);
      });
    });
  }
  document.addEventListener("submit", (event) => {
    const form = event.target, type = activeGroupContentContext?.type;
    if (!form.matches(".group-content-form") || type !== "notice" && type !== "board" || form.dataset.noticeSubmitConfirmed === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void confirmGroupContentRegistration(type).then((confirmed) => {
      if (!confirmed) return;
      form.dataset.noticeSubmitConfirmed = "true";
      form.requestSubmit();
      queueMicrotask(() => delete form.dataset.noticeSubmitConfirmed);
    });
  }, true);
  document.head.insertAdjacentHTML("beforeend", "<style>.group-notice-submit-confirm{z-index:1200}.group-notice-submit-confirm .confirm-box{width:min(90vw,430px);text-align:center}.group-notice-submit-confirm .member-modal-body{padding:28px 24px}.group-notice-submit-confirm .member-modal-body p{margin:0!important;color:#40534b!important;font-size:12px!important}.group-notice-submit-confirm .modal-actions{display:flex;justify-content:center;gap:9px;padding:0 20px 20px}.group-notice-submit-confirm .modal-actions button{width:105px;height:40px}</style>");
  var groupBoardReactionLabels = { like: "\u{1F44D} \uC88B\uC544\uC694", cheer: "\u{1F389} \uC751\uC6D0\uD574\uC694", empathy: "\u{1F91D} \uACF5\uAC10\uD574\uC694" };
  async function renderGroupBoardCommunity(section, groupId, contentId) {
    section.innerHTML = '<p class="group-board-community-loading">\uD3C9\uAC00\uC640 \uB313\uAE00\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...</p>';
    try {
      const data = await catacombApi(`/api/parishioner/groups/${groupId}/contents/${contentId}/community`), counts = new Map(data.reactions.map((item) => [item.reaction, item]));
      section.innerHTML = `<div class="group-board-reactions">${Object.entries(groupBoardReactionLabels).map(([key, label]) => {
        const item = counts.get(key);
        return `<button class="${item?.selected ? "selected" : ""}" data-group-board-reaction="${key}" type="button">${label} <b>${item?.count ?? 0}</b></button>`;
      }).join("")}</div><div class="group-board-comments"><h5>\uB313\uAE00 <span>${data.comments.length}</span></h5><div>${data.comments.length ? data.comments.map((comment) => `<article><header><strong>${escapeHtml(comment.authorName)}${comment.baptismalName ? ` (${escapeHtml(comment.baptismalName)})` : ""}</strong><time>${new Date(comment.createdAt).toLocaleString("ko-KR")}</time></header><p>${escapeHtml(comment.content)}</p></article>`).join("") : '<p class="group-board-comment-empty">\uCCAB \uB313\uAE00\uC744 \uB0A8\uACA8\uBCF4\uC138\uC694.</p>'}</div><form><textarea maxlength="2000" rows="2" required placeholder="\uB313\uAE00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea><footer><small>0 / 2,000</small><button class="green-button" type="submit" disabled>\uB313\uAE00 \uB4F1\uB85D</button></footer><p class="group-board-comment-error"></p></form></div>`;
      section.querySelectorAll("[data-group-board-reaction]").forEach((button) => button.onclick = async () => {
        button.disabled = true;
        try {
          await catacombApi(`/api/parishioner/groups/${groupId}/contents/${contentId}/reaction`, { method: "PUT", body: JSON.stringify({ reaction: button.dataset.groupBoardReaction }) });
          await renderGroupBoardCommunity(section, groupId, contentId);
        } catch {
          button.disabled = false;
        }
      });
      const form = section.querySelector("form"), textarea = form.querySelector("textarea"), submit2 = form.querySelector('button[type="submit"]'), counter = form.querySelector("small"), error = form.querySelector(".group-board-comment-error");
      textarea.oninput = () => {
        counter.textContent = `${textarea.value.length.toLocaleString()} / 2,000`;
        submit2.disabled = !textarea.value.trim();
      };
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (submit2.disabled) return;
        submit2.disabled = true;
        error.textContent = "";
        try {
          await catacombApi(`/api/parishioner/groups/${groupId}/contents/${contentId}/comments`, { method: "POST", body: JSON.stringify({ content: textarea.value }) });
          await renderGroupBoardCommunity(section, groupId, contentId);
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      };
    } catch (error) {
      section.innerHTML = `<p class="group-board-comment-error">${escapeHtml(error.message)}</p>`;
    }
  }
  var decoratingGroupBoardCommunity = false;
  async function decorateGroupBoardCommunities() {
    const modal2 = document.querySelector(".group-content-modal"), context = activeGroupContentContext, list = modal2?.querySelector(".group-content-list");
    if (!modal2 || !context || context.type !== "board" || !list || modal2.dataset.boardCommunityReady || decoratingGroupBoardCommunity) return;
    decoratingGroupBoardCommunity = true;
    try {
      const data = await catacombApi(`/api/parishioner/groups/${context.group.id}/contents?type=board`);
      modal2.dataset.boardCommunityReady = "true";
      [...list.querySelectorAll(":scope>article")].forEach((article, index) => {
        const item = data.items[index];
        if (!item) return;
        const section = document.createElement("section");
        section.className = "group-board-community";
        article.append(section);
        void renderGroupBoardCommunity(section, context.group.id, item.id);
      });
    } finally {
      decoratingGroupBoardCommunity = false;
    }
  }
  new MutationObserver(() => void decorateGroupBoardCommunities()).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => void decorateGroupBoardCommunities());
  document.head.insertAdjacentHTML("beforeend", "<style>.group-board-community{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.group-board-community-loading,.group-board-comment-empty{color:var(--muted);font-size:9px;text-align:center}.group-board-reactions{display:flex;flex-wrap:wrap;gap:6px}.group-board-reactions button{padding:6px 9px;border:1px solid var(--line);border-radius:15px;background:#fff;color:#53635d;font-size:9px;cursor:pointer}.group-board-reactions button.selected{border-color:var(--green);background:var(--soft);color:var(--green);font-weight:800}.group-board-comments h5{margin:13px 0 7px;font-size:10px}.group-board-comments h5 span{color:var(--green)}.group-board-comments>div{display:grid;gap:6px}.group-board-comments>div>article{padding:9px!important;border:0!important;background:#f7faf9!important}.group-board-comments article header{display:flex!important;justify-content:space-between}.group-board-comments article strong{font-size:9px}.group-board-comments article time{font-size:8px}.group-board-comments article p{margin-top:6px!important;font-size:9px!important}.group-board-comments form{margin-top:9px}.group-board-comments textarea{width:100%;padding:9px;border:1px solid var(--line);border-radius:7px;resize:vertical}.group-board-comments form footer{display:flex;align-items:center;justify-content:space-between;margin-top:5px}.group-board-comments form small{font-size:8px}.group-board-comments form button{height:32px;padding:0 11px}.group-board-comments form button:disabled{opacity:.45}.group-board-comment-error{min-height:12px;margin:4px 0 0!important;color:#d94350!important;font-size:8px!important}</style>");
  function alignMyMissionStatusWithTitle() {
    document.querySelectorAll(".member-mission-card:not([data-title-status-aligned])").forEach((card) => {
      const header = card.querySelector(":scope>header"), state = header?.querySelector(".mission-state"), time = header?.querySelector("time"), title = card.querySelector(":scope>h3");
      if (!header || !state || !title) return;
      card.dataset.titleStatusAligned = "true";
      const row = document.createElement("div");
      row.className = "member-mission-title-row";
      title.insertAdjacentElement("beforebegin", row);
      row.append(title, state);
      if (time) row.append(time);
      header.remove();
    });
  }
  new MutationObserver(alignMyMissionStatusWithTitle).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(alignMyMissionStatusWithTitle);
  document.head.insertAdjacentHTML("beforeend", "<style>.member-mission-title-row{display:flex;min-width:0;align-items:center;gap:7px;margin-bottom:7px}.member-mission-title-row h3{min-width:0;margin:0!important}.member-mission-title-row .mission-state{flex:0 0 auto}.member-mission-title-row time{flex:0 0 auto;margin-left:auto;color:#8c9995;font-size:9px}@media(max-width:600px){.member-mission-title-row{align-items:flex-start;flex-wrap:wrap}.member-mission-title-row h3{max-width:calc(100% - 75px)}.member-mission-title-row time{width:100%;margin-left:0}}</style>");
  function enhanceMissionIcons() {
    const form = document.querySelector("#member-mission-form");
    if (form && !form.querySelector("#member-mission-icon")) {
      const title = form.querySelector("#member-mission-title")?.closest("label");
      title?.insertAdjacentHTML("beforebegin", '<label class="member-mission-icon-field">\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0 <small>\uC120\uD0DD \xB7 \uC774\uBBF8\uC9C0 \uD30C\uC77C, \uCD5C\uB300 2MB</small><input id="member-mission-icon" type="file" accept="image/*"></label>');
    }
    document.querySelectorAll(".member-mission-card:not([data-mission-icon-ready]),.talent-mission-card:not([data-mission-icon-ready])").forEach((card) => {
      const missionId = Number(card.querySelector("[data-owner-applicants]")?.dataset.ownerApplicants ?? card.querySelector("[data-talent-applicants]")?.dataset.talentApplicants ?? card.querySelector("[data-mission-apply]")?.dataset.missionApply);
      if (!missionId) return;
      card.dataset.missionIconReady = "true";
      const image = document.createElement("img");
      image.className = "mission-card-icon";
      image.src = `/api/parishioner/missions/${missionId}/icon`;
      image.alt = "";
      image.onerror = () => {
        const fallback = document.createElement("span");
        fallback.className = "mission-card-icon mission-card-icon-default";
        fallback.textContent = "\u2713";
        image.replaceWith(fallback);
      };
      card.append(image);
    });
  }
  new MutationObserver(enhanceMissionIcons).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(enhanceMissionIcons);
  document.head.insertAdjacentHTML("beforeend", "<style>.member-mission-icon-field small{margin-left:5px;color:var(--muted);font-size:8px;font-weight:400}.member-mission-icon-field input{display:block;width:100%;height:auto!important;margin-top:5px;padding:8px!important;background:#fff}.member-mission-card,.talent-mission-card{position:relative}.mission-card-icon{position:absolute;z-index:2;top:16px;right:16px;width:52px;height:52px;border-radius:12px;background:var(--soft);object-fit:cover}.mission-card-icon-default{display:grid;place-items:center;color:var(--green);font-size:18px;font-weight:800}.member-mission-title-row,.talent-mission-card>header{padding-right:64px}.member-mission-card>p,.talent-mission-card>p{padding-right:64px}@media(max-width:600px){.mission-card-icon{top:14px;right:14px;width:46px;height:46px}.member-mission-title-row,.talent-mission-card>header,.member-mission-card>p,.talent-mission-card>p{padding-right:56px}}</style>");
  function openMissionEditRequest(item) {
    document.querySelector(".mission-edit-request-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal mission-edit-request-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>\uBBF8\uC158 \uC218\uC815</h3><form><label>\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0 <small>\uBCC0\uACBD\uD560 \uACBD\uC6B0\uC5D0\uB9CC \uC120\uD0DD</small><input name="icon" type="file" accept="image/*"></label><label>\uC81C\uBAA9<input name="title" maxlength="200" required value="${escapeHtml(item.title)}"></label><label>\uB0B4\uC6A9<textarea name="content" maxlength="20000" rows="6" required>${escapeHtml(item.content)}</textarea></label><div><label>\uBAA8\uC9D1 \uC2DC\uC791\uC77C<input name="from" type="date" required value="${item.applicationFrom ?? ""}"></label><label>\uBAA8\uC9D1 \uC885\uB8CC\uC77C<input name="to" type="date" required value="${item.applicationTo ?? ""}"></label></div><label>\uD0DC\uADF8<input name="tags" maxlength="1000" value="${escapeHtml(item.tags.join(", "))}"></label><p></p><footer><button class="green-outline" type="button">\uCDE8\uC18C</button><button class="green-button" type="submit">\uC218\uC815 \uC2B9\uC778 \uC694\uCCAD</button></footer></form></section>`;
    document.body.append(layer);
    layer.querySelector('button[type="button"]').onclick = () => layer.remove();
    layer.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget, error = form.querySelector("p"), file = form.elements.namedItem("icon").files?.[0];
      try {
        if (file && file.size > 2 * 1024 * 1024) throw new Error("\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0\uB294 2MB \uC774\uD558\uB85C \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.");
        const icon = file ? await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ iconType: file.type, iconData: String(reader.result).split(",")[1] ?? "" });
          reader.onerror = () => reject(new Error("\uC774\uBBF8\uC9C0\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
          reader.readAsDataURL(file);
        }) : { iconType: "", iconData: "" };
        await catacombApi(`/api/parishioner/missions/${item.id}/edit-request`, { method: "POST", body: JSON.stringify({ title: form.elements.namedItem("title").value, content: form.elements.namedItem("content").value, applicationFrom: form.elements.namedItem("from").value, applicationTo: form.elements.namedItem("to").value, tags: form.elements.namedItem("tags").value, ...icon }) });
        layer.remove();
        modal("\uBBF8\uC158 \uC218\uC815", "<p>\uC218\uC815 \uB0B4\uC6A9\uC744 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uC2B9\uC778 \uC694\uCCAD\uD588\uC2B5\uB2C8\uB2E4. \uC2B9\uC778 \uC804\uAE4C\uC9C0 \uAE30\uC874 \uB0B4\uC6A9\uC774 \uC720\uC9C0\uB429\uB2C8\uB2E4.</p>");
      } catch (reason) {
        error.textContent = reason.message;
      }
    };
  }
  var decoratingMissionEditButtons = false;
  async function decorateMissionEditButtons() {
    const list = document.querySelector("#member-mission-list");
    if (!list || decoratingMissionEditButtons || !list.querySelector(".member-mission-card:not([data-edit-ready])")) return;
    decoratingMissionEditButtons = true;
    try {
      const items = await catacombApi("/api/parishioner/missions/mine");
      [...list.querySelectorAll(".member-mission-card")].forEach((card, index) => {
        const item = items[index];
        if (!item || card.dataset.editReady) return;
        card.dataset.editReady = "true";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "member-mission-edit";
        button.textContent = "\uBBF8\uC158 \uC218\uC815";
        button.onclick = () => openMissionEditRequest(item);
        card.append(button);
      });
    } finally {
      decoratingMissionEditButtons = false;
    }
  }
  new MutationObserver(() => void decorateMissionEditButtons()).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => void decorateMissionEditButtons());
  document.head.insertAdjacentHTML("beforeend", "<style>.member-mission-edit{margin:12px 0 0 6px;padding:6px 11px;border:1px solid #8fcfba;border-radius:12px;background:#fff;color:var(--green);font-size:9px;font-weight:700;cursor:pointer}.mission-edit-request-modal .member-modal-box{width:min(94vw,720px);text-align:left}.mission-edit-request-modal h3{text-align:center}.mission-edit-request-modal form{display:grid;gap:11px;padding:20px}.mission-edit-request-modal label{font-size:10px;font-weight:700}.mission-edit-request-modal input,.mission-edit-request-modal textarea{width:100%;margin-top:5px;padding:9px;border:1px solid var(--line);border-radius:7px}.mission-edit-request-modal form>div{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mission-edit-request-modal form>p{min-height:12px;margin:0;color:#d94350;font-size:9px}.mission-edit-request-modal footer{display:flex;justify-content:center;gap:8px}.mission-edit-request-modal footer button{height:40px;padding:0 15px}@media(max-width:600px){.mission-edit-request-modal form>div{grid-template-columns:1fr}}</style>");
  async function loadCommunityMissions() {
    const ownList = document.querySelector("#member-mission-list");
    if (!ownList) return;
    let section = document.querySelector(".member-community-missions");
    if (!section) {
      section = document.createElement("section");
      section.className = "member-community-missions";
      section.innerHTML = '<div class="catacomb-feed-head"><h3>\uB2E4\uB978 \uC2E0\uB3C4\uC758 \uBBF8\uC158</h3><span></span></div><div class="member-community-mission-list"><p class="catacomb-empty">\uBBF8\uC158\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p></div>';
      ownList.insertAdjacentElement("afterend", section);
    }
    try {
      const items = (await catacombApi("/api/parishioner/talent/missions")).filter((item) => !item.isOwner), list = section.querySelector(".member-community-mission-list");
      section.querySelector(".catacomb-feed-head span").textContent = `\uC2B9\uC778 \uBBF8\uC158 ${items.length}\uAC1C`;
      list.innerHTML = items.length ? items.map((item) => `<article class="talent-mission-card community-mission-card"><header><div><strong>${escapeHtml(item.authorName ?? "\uC775\uBA85")}</strong><time>${new Date(item.createdAt).toLocaleDateString("ko-KR")}</time></div><b>${item.applicationOpen ? "\uBAA8\uC9D1\uC911" : "\uBAA8\uC9D1\uC885\uB8CC"}</b></header><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><small class="mission-period-label">\uBAA8\uC9D1\uAE30\uAC04 ${item.applicationFrom ?? "-"} ~ ${item.applicationTo ?? "-"}</small>${item.tags.length ? `<div class="catacomb-tags">${item.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}${item.applicationStatus === "requested" ? `<button class="mission-application-cancel" data-mission-cancel="${item.id}" data-mission-apply="${item.id}" type="button">\uC9C0\uC6D0 \uCDE8\uC18C</button>` : `<button class="${item.applicationStatus && item.applicationStatus !== "rejected" ? "applied" : ""}" data-mission-apply="${item.id}" type="button" ${item.applicationStatus && item.applicationStatus !== "rejected" || !item.applicationOpen ? "disabled" : ""}>${item.applicationStatus === "approved" ? "\uC9C0\uC6D0 \uC2B9\uB099" : item.applicationStatus === "rejected" && item.applicationOpen ? "\uC7AC\uC9C0\uC6D0" : item.applicationOpen ? "\uBBF8\uC158 \uC9C0\uC6D0" : "\uBAA8\uC9D1 \uC885\uB8CC"}</button>`}</article>`).join("") : '<p class="catacomb-empty">\uB2E4\uB978 \uC2E0\uB3C4\uAC00 \uB4F1\uB85D\uD55C \uC2B9\uC778 \uBBF8\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      list.querySelectorAll("[data-mission-apply]:not(:disabled):not([data-mission-cancel])").forEach((button) => button.onclick = () => applyMission(Number(button.dataset.missionApply)));
      list.querySelectorAll("[data-mission-cancel]").forEach((button) => button.onclick = () => cancelMissionApplication(Number(button.dataset.missionCancel)));
      enhanceMissionIcons();
    } catch (error) {
      section.querySelector(".member-community-mission-list").textContent = error.message;
    }
  }
  function mountCommunityMissions() {
    if (!document.querySelector("#member-mission-list")) return;
    void loadCommunityMissions();
  }
  new MutationObserver(() => {
    if (!document.querySelector(".member-community-missions")) mountCommunityMissions();
  }).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(mountCommunityMissions);
  document.head.insertAdjacentHTML("beforeend", "<style>.member-community-missions{margin-top:22px;padding-top:4px;border-top:1px solid var(--line)}.member-community-mission-list{display:grid;gap:11px}.community-mission-card>header>b{color:var(--green);font-size:9px}.community-mission-card>button{height:35px;margin-top:13px;padding:0 14px;border:1px solid var(--green);border-radius:8px;background:var(--green);color:#fff;font-size:10px;font-weight:700;cursor:pointer}.community-mission-card>button:disabled{border-color:var(--line);background:#eef3f1;color:#7c8984;cursor:default}</style>");
  function enforceMissionPeriod() {
    const from = document.querySelector("#member-mission-from"), to = document.querySelector("#member-mission-to");
    if (from && to) {
      from.required = true;
      to.required = true;
      from.min = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      to.min = from.value || from.min;
      const labels2 = from.closest(".mission-period")?.querySelectorAll("label"), fromText = labels2?.[0]?.childNodes[labels2[0].childNodes.length - 2], toText = labels2?.[1]?.childNodes[labels2[1].childNodes.length - 2];
      if (fromText && fromText.textContent !== " \uBBF8\uC158 \uC2DC\uC791\uC77C") fromText.textContent = " \uBBF8\uC158 \uC2DC\uC791\uC77C";
      if (toText && toText.textContent !== " \uBBF8\uC158 \uC885\uB8CC\uC77C") toText.textContent = " \uBBF8\uC158 \uC885\uB8CC\uC77C";
    }
    document.querySelectorAll(".mission-period-label").forEach((label) => {
      const current = label.textContent ?? "", next = current.replace("\uBAA8\uC9D1\uAE30\uAC04", "\uBBF8\uC158 \uAE30\uAC04");
      if (next !== current) label.textContent = next;
    });
    document.querySelectorAll(".talent-mission-card.is-closed header>b,.community-mission-card header>b").forEach((state) => {
      const current = state.textContent ?? "", next = current.replace("\uBAA8\uC9D1\uC885\uB8CC", "\uC790\uB3D9\uC885\uB8CC");
      if (next !== current) state.textContent = next;
    });
  }
  new MutationObserver(enforceMissionPeriod).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("change", (event) => {
    if (event.target.id === "member-mission-from") enforceMissionPeriod();
  });
  queueMicrotask(enforceMissionPeriod);
  var memberEnhancementFrame = 0;
  function scheduleMemberEnhancements() {
    if (memberEnhancementFrame) return;
    memberEnhancementFrame = requestAnimationFrame(() => {
      memberEnhancementFrame = 0;
      mountParishVideos();
      mountMemberShrines();
      enhanceShrinePilgrimageMenus();
      enhanceShrineVisitForms();
      fixMemberGroupModalScroll();
      enhanceShrineReviews();
    });
  }
  new MutationObserver(scheduleMemberEnhancements).observe(document.body, { childList: true, subtree: true });
  scheduleMemberEnhancements();
  queueMicrotask(mountMemberShrines);
  async function restoreSession() {
    const response = await fetch("/api/parishioner-auth/me");
    if (response.ok) renderMember(await response.json());
  }
  search.addEventListener("input", () => {
    parishId.value = "";
    clearTimeout(timer2);
    if (search.value.trim().length < 2) {
      results.hidden = true;
      return;
    }
    timer2 = window.setTimeout(async () => {
      const data = await fetch(`/api/parishes?q=${encodeURIComponent(search.value.trim())}`).then((r) => r.json());
      results.replaceChildren(...data.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${item.name} \xB7 ${item.diocese ?? "\uAD50\uAD6C \uBBF8\uB4F1\uB85D"}`;
        button.onclick = () => {
          search.value = item.name;
          parishId.value = String(item.id);
          results.hidden = true;
        };
        return button;
      }));
      results.hidden = false;
    }, 250);
  });
  document.querySelector("#member-send-code").addEventListener("click", async (event) => {
    if (!parishId.value) return setMessage("\uAC80\uC0C9 \uACB0\uACFC\uC5D0\uC11C \uC131\uB2F9\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.", true);
    const button = event.currentTarget, controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 2e4);
    button.disabled = true;
    button.textContent = "\uC778\uC99D\uCF54\uB4DC \uBC1C\uC1A1 \uC911...";
    setMessage("\uBA54\uC77C \uC11C\uBC84\uC5D0 \uC778\uC99D\uCF54\uB4DC\uB97C \uC694\uCCAD\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.");
    try {
      const response = await fetch("/api/parishioner-auth/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), email: email.value }), signal: controller.signal }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      codePanel.hidden = false;
      setMessage(data.devCode ? `${data.message} \uAC00\uC0C1 \uC778\uC99D\uBC88\uD638: ${data.devCode}` : data.message);
      code.focus();
    } catch (error) {
      setMessage(error.name === "AbortError" ? "\uC778\uC99D\uCF54\uB4DC \uC694\uCCAD \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." : error.message, true);
    } finally {
      window.clearTimeout(timeout);
      button.disabled = false;
      button.textContent = "\uC774\uBA54\uC77C\uB85C \uC778\uC99D\uCF54\uB4DC \uBC1B\uAE30";
    }
  });
  var memberLoginForm = document.querySelector("#member-login-form");
  var memberLoginSubmit = document.querySelector("#member-login-submit");
  async function submitMemberLogin(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!parishId.value) return setMessage("\uAC80\uC0C9 \uACB0\uACFC\uC5D0\uC11C \uC131\uB2F9\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.", true);
    if (!/^\d{6}$/.test(code.value.trim())) return setMessage("6\uC790\uB9AC \uC778\uC99D\uCF54\uB4DC\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.", true);
    memberLoginSubmit.disabled = true;
    memberLoginSubmit.textContent = "\uB85C\uADF8\uC778 \uC911...";
    setMessage("\uB85C\uADF8\uC778\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.");
    const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 15e3);
    try {
      const response = await fetch("/api/parishioner-auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), email: email.value, code: code.value.trim() }), signal: controller.signal }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      renderMember(data.user);
      const previous = data.previous;
      if (previous) {
        const reason = previous.logout_reason === "timeout" ? "\uC138\uC158 \uB9CC\uB8CC" : "\uB85C\uADF8\uC544\uC6C3";
        modal("\uC774\uC804 \uC811\uC18D \uC815\uBCF4", `<dl><dt>\uC885\uB8CC \uAD6C\uBD84</dt><dd>${reason}</dd><dt>\uC885\uB8CC \uC2DC\uAC01</dt><dd>${previous.logged_out_at}</dd><dt>\uC811\uC18D IP</dt><dd>${previous.ip_address}</dd></dl>`);
      } else modal("\uC811\uC18D \uC815\uBCF4", "<p>\uC774\uC804 \uB85C\uADF8\uC778 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>");
    } catch (error) {
      setMessage(error.name === "AbortError" ? "\uB85C\uADF8\uC778 \uC694\uCCAD \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." : error.message, true);
      memberLoginSubmit.disabled = false;
      memberLoginSubmit.textContent = "\uC778\uC99D \uD655\uC778 \uD6C4 \uB85C\uADF8\uC778";
    } finally {
      window.clearTimeout(timeout);
    }
  }
  memberLoginForm.onsubmit = submitMemberLogin;
  void restoreSession();
  document.head.insertAdjacentHTML("beforeend", "<style>.member-review-detail-head{position:relative}.member-review-detail-close{position:absolute;right:18px;top:50%;width:34px;height:34px;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:21px;line-height:1;cursor:pointer;transform:translateY(-50%)}.member-review-carousel{position:relative}.member-review-detail-gallery{display:flex!important;grid-template-columns:none!important;gap:0!important;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.member-review-detail-gallery::-webkit-scrollbar{display:none}.member-review-detail-gallery figure,.member-review-detail-gallery figure:only-child{flex:0 0 100%;width:100%;grid-column:auto;scroll-snap-align:start}.member-review-carousel-prev,.member-review-carousel-next{position:absolute;z-index:2;top:50%;display:grid;width:42px;height:42px;place-items:center;border:0;border-radius:50%;background:rgba(13,50,40,.72);color:#fff;font-size:28px;cursor:pointer;transform:translateY(-50%);box-shadow:0 5px 16px rgba(0,0,0,.18)}.member-review-carousel-prev{left:12px}.member-review-carousel-next{right:12px}@media(max-width:700px){.member-review-carousel-prev,.member-review-carousel-next{width:36px;height:36px}.member-review-detail-close{right:12px}}</style>");
  document.head.insertAdjacentHTML("beforeend", '<link rel="icon" type="image/svg+xml" href="/assets/favicon-parishioner.svg"><style>.member-pilgrimage-more[hidden],.member-shrine-toolbar[hidden],#member-shrine-list[hidden],.member-pilgrimage-reviews[hidden]{display:none!important}.member-shrine-card{display:flex;flex-direction:column}.member-shrine-card>form{margin-top:auto}.member-shrine-card>.member-shrine-photo-open{flex:0 0 auto}.member-review-detail-button{width:100%;height:32px;margin-top:9px}.member-review-detail-modal .member-modal-box{width:min(94vw,920px);max-height:92vh;overflow:hidden;text-align:left}.member-review-detail-head{padding:22px 28px;background:linear-gradient(135deg,var(--dark),var(--green));color:#fff;text-align:center}.member-review-detail-head small{font-size:8px;font-weight:800;letter-spacing:1.8px;opacity:.75}.member-review-detail-head h3{margin:6px 0 0;font-size:20px}.member-review-detail-modal .member-modal-body{max-height:calc(92vh - 150px);padding:22px 26px;overflow-y:auto;background:#f7faf9}.member-review-detail-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.member-review-detail-gallery figure{position:relative;display:flex;min-height:240px;max-height:390px;align-items:center;justify-content:center;margin:0;overflow:hidden;border-radius:12px;background:#e9efec}.member-review-detail-gallery figure:only-child{grid-column:1/-1}.member-review-detail-gallery img{display:block;width:100%;height:100%;max-height:390px;object-fit:contain}.member-review-detail-gallery figcaption{position:absolute;right:10px;bottom:10px;padding:4px 8px;border-radius:10px;background:rgba(13,50,40,.72);color:#fff;font-size:8px}.member-review-detail-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;margin:16px 0;padding:16px;border:1px solid var(--line);border-radius:11px;background:#fff}.member-review-detail-meta div{display:grid;grid-template-columns:64px minmax(0,1fr);align-items:start;gap:9px}.member-review-detail-meta dt{color:var(--muted);font-size:9px;font-weight:800;white-space:nowrap}.member-review-detail-meta dd{min-width:0;margin:0;color:#354940;font-size:10px;line-height:1.55;word-break:keep-all}.member-review-detail-meta dd span{display:inline-block;margin:0 3px 3px 0;padding:3px 7px;border-radius:9px;background:var(--soft);color:var(--green);font-size:8px}.member-review-detail-content{padding:17px;border-radius:11px;background:#fff}.member-review-detail-content h4{margin:0 0 10px;color:var(--green);font-size:11px}.member-review-detail-copy{margin:0;color:#42534d;font-size:12px;line-height:1.85;white-space:pre-wrap}.member-review-detail-modal>.member-modal-box>footer{display:flex;justify-content:center;padding:14px;border-top:1px solid var(--line);background:#fff}.member-review-detail-modal>.member-modal-box>footer button{width:110px;height:42px}@media(max-width:700px){.member-review-detail-modal .member-modal-body{padding:14px}.member-review-detail-gallery,.member-review-detail-meta{grid-template-columns:1fr}.member-review-detail-gallery figure{min-height:180px}.member-review-detail-meta div{grid-template-columns:58px minmax(0,1fr)}}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.member-review-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0}.member-review-info-grid>article{display:flex;min-width:0;min-height:78px;flex-direction:column;align-items:flex-start;justify-content:center;padding:13px 15px;border:1px solid var(--line);border-radius:10px;background:#fff}.member-review-info-grid span{margin-bottom:6px;color:var(--green);font-size:9px;font-weight:800}.member-review-info-grid strong{max-width:100%;color:#263d34;font-size:12px;line-height:1.5;word-break:keep-all}.member-review-info-grid small{margin-top:3px;color:var(--muted);font-size:9px}.member-review-info-tags>div{display:flex;flex-wrap:wrap;gap:5px}.member-review-info-tags b{padding:4px 8px;border-radius:10px;background:var(--soft);color:var(--green);font-size:8px}@media(max-width:600px){.member-review-info-grid{grid-template-columns:1fr}.member-review-info-grid>article{min-height:68px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.pilgrimage-summary #member-shrine-list>.member-shrine-card:nth-of-type(n+3){display:flex}.pilgrimage-summary #member-shrine-list>.member-shrine-card[hidden]{display:none!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-review-detail-head{display:flex;min-height:68px;align-items:center;justify-content:center;padding:16px 64px!important;background:var(--green)!important}.member-review-detail-head h3{margin:0!important;color:#fff;font-size:18px;line-height:1.4;text-align:center}.member-review-title-card{margin:15px 0 0;padding:14px 16px;border:1px solid var(--line);border-radius:10px;background:#fff}.member-review-title-card span{display:block;margin-bottom:5px;color:var(--green);font-size:9px;font-weight:800}.member-review-title-card h4{margin:0;color:#263d34;font-size:14px;line-height:1.5}@media(max-width:600px){.member-review-detail-head{padding:14px 52px!important}.member-review-detail-head h3{font-size:15px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-group-modal .member-modal-box{display:flex;width:min(94vw,580px);max-height:88vh;flex-direction:column;overflow:hidden!important;text-align:left}.member-group-modal .member-modal-box>h3{position:static;z-index:auto;flex:0 0 auto;text-align:center}.member-group-modal .member-modal-box>form{min-height:0;overflow-y:auto;overscroll-behavior:contain}.member-group-modal .member-modal-box>form>div:last-child{position:sticky;z-index:5;bottom:-22px;display:flex;justify-content:center!important;gap:9px;margin:8px -22px -22px;padding:16px 22px;border-top:1px solid var(--line);background:#fff;box-shadow:0 -8px 18px rgba(19,63,49,.06)}.member-group-modal form>div:last-child button{min-width:110px}@media(max-width:620px){.member-group-modal .member-modal-box{max-height:92vh}.member-group-modal .member-modal-box>form>div:last-child{bottom:-22px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-group-modal .member-modal-box>form>div:last-child{bottom:0!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-group-modal .member-modal-box>form>div:last-child{margin:4px -22px -22px!important;padding:8px 22px!important}.member-group-modal form>div:last-child button{height:36px!important;min-width:100px!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-group-modal .member-modal-box>form{min-height:0;overflow-x:hidden!important;overflow-y:auto!important;scrollbar-width:thin;scrollbar-color:#9bcbbd transparent}.member-group-modal .member-modal-box>form::-webkit-scrollbar{width:6px}.member-group-modal .member-modal-box>form::-webkit-scrollbar-track{background:transparent}.member-group-modal .member-modal-box>form::-webkit-scrollbar-thumb{border-radius:6px;background:#9bcbbd}.member-group-modal .member-modal-box>form>div:last-child{position:sticky;bottom:0!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-group-modal .member-modal-box>form{flex:1 1 auto!important;overflow-y:auto!important}.member-group-modal .member-group-fixed-actions{position:static!important;z-index:auto;display:flex;flex:0 0 auto;justify-content:center!important;gap:9px;margin:0!important;padding:8px 22px!important;border-top:1px solid var(--line);background:#fff;box-shadow:0 -5px 14px rgba(19,63,49,.05)}.member-group-modal .member-group-fixed-actions button{height:36px!important;min-width:100px!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-notices>header{gap:10px}.member-notices>header #member-notice-count{margin-left:auto}.member-notice-more{width:auto;height:34px;padding:0 13px}.member-notice-more[hidden]{display:none!important}.member-notice>p{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.member-notice-detail{display:block;width:auto;height:34px;margin:12px 0 0 auto;padding:0 13px}.member-notice-detail-modal .member-modal-box{display:flex;width:min(92vw,680px);max-height:86vh;flex-direction:column;overflow:hidden;text-align:left}.member-notice-detail-modal .member-modal-box>h3{flex:0 0 auto;text-align:center}.member-notice-detail-modal .member-modal-body{overflow-y:auto}.member-notice-detail-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.member-notice-detail-meta b{padding:3px 8px;border-radius:10px;background:#fff1cf;color:#9a6b00;font-size:9px}.member-notice-detail-meta time{margin-left:auto;color:#929eaa;font-size:10px}.member-notice-detail-modal .member-modal-body>p{margin:0;color:#5f6d7f;line-height:1.8;white-space:pre-wrap}.member-notice-detail-modal>.member-modal-box>footer{display:flex;flex:0 0 auto;justify-content:center;padding:12px;border-top:1px solid var(--line)}.member-notice-detail-modal>.member-modal-box>footer button{width:110px;height:40px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-notice .member-notice-detail{width:auto!important;height:28px!important;margin:10px 0 0 auto!important;padding:0 11px!important;border-radius:8px!important;font-size:9px!important;line-height:1;white-space:nowrap}@media(max-width:600px){.member-notice .member-notice-detail{height:26px!important;padding:0 9px!important}}</style>");
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/parishioner-sw.js", { scope: "/parishioner/" }).catch(() => void 0));
  function applyMeetingTerminology(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.matches("script,style")) continue;
      if (node.textContent?.includes("\uB2E8\uCCB4")) node.textContent = node.textContent.replaceAll("\uB2E8\uCCB4", "\uBAA8\uC784");
    }
  }
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => applyMeetingTerminology(node)))).observe(document.body, { childList: true, subtree: true });
  applyMeetingTerminology();
  function applyMoreLabels(root = document) {
    root.querySelectorAll("button").forEach((button) => {
      if (button.textContent?.trim().toLowerCase() === "more") button.textContent = "\uB354\uBCF4\uAE30";
    });
  }
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node instanceof Element) applyMoreLabels(node);
  }))).observe(document.body, { childList: true, subtree: true });
  applyMoreLabels();
  async function openGroupContentModal(group, type) {
    document.querySelector(".group-content-modal")?.remove();
    const label = type === "notice" ? "\uACF5\uC9C0\uC0AC\uD56D" : "\uAC8C\uC2DC\uD310", layer = document.createElement("div");
    layer.className = "member-modal group-content-modal";
    layer.innerHTML = `<section class="member-modal-box"><h3>${escapeHtml(group.nameKo)} \xB7 ${label}</h3><div class="member-modal-body"><div class="group-content-loading">\uBD88\uB7EC\uC624\uB294 \uC911...</div></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    try {
      const response = await fetch(`/api/parishioner/groups/${group.id}/contents?type=${type}`), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      const canWrite = type === "board" || data.isOwner, body = layer.querySelector(".member-modal-body");
      body.innerHTML = `${canWrite ? `<form class="group-content-form"><h4>${type === "notice" ? "\uACF5\uC9C0\uC0AC\uD56D \uC791\uC131" : "\uAC8C\uC2DC\uAE00 \uC791\uC131"}</h4><input name="title" maxlength="200" required placeholder="\uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"><textarea name="content" maxlength="20000" rows="5" required placeholder="\uB0B4\uC6A9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></textarea><p></p><button class="green-button" type="submit">\uB4F1\uB85D</button></form>` : ""}<div class="group-content-list">${data.items.length ? data.items.map((item) => `<article><header><h4>${escapeHtml(item.title)}</h4><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></header><small>${escapeHtml(item.authorName)}${item.baptismalName ? ` (${escapeHtml(item.baptismalName)})` : ""}</small><p>${escapeHtml(item.content)}</p></article>`).join("") : `<p class="group-content-empty">\uB4F1\uB85D\uB41C ${label}\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>`}</div>`;
      const form = body.querySelector("form");
      if (form) form.onsubmit = async (event) => {
        event.preventDefault();
        const submit2 = form.querySelector('button[type="submit"]'), error = form.querySelector("p");
        submit2.disabled = true;
        error.textContent = "";
        try {
          const save = await fetch(`/api/parishioner/groups/${group.id}/contents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, title: form.elements.namedItem("title").value, content: form.elements.namedItem("content").value }) }), result = await save.json();
          if (!save.ok) throw new Error(result.message);
          layer.remove();
          await openGroupContentModal(group, type);
        } catch (reason) {
          error.textContent = reason.message;
          submit2.disabled = false;
        }
      };
    } catch (error) {
      layer.querySelector(".member-modal-body").textContent = error.message;
    }
  }
  var decoratingGroupContentButtons = false;
  async function decorateGroupContentButtons() {
    const list = document.querySelector("#member-group-list");
    if (!list || decoratingGroupContentButtons) return;
    const cards = [...list.querySelectorAll(".member-group-card:not([data-content-ready])")];
    if (!cards.length) return;
    decoratingGroupContentButtons = true;
    try {
      const response = await fetch("/api/parishioner/groups"), groups = await response.json();
      cards.forEach((card) => {
        const index = [...list.querySelectorAll(".member-group-card")].indexOf(card), group = groups[index];
        if (!group) return;
        card.dataset.contentReady = "true";
        const state = card.querySelector(".group-state");
        if (group.isOperator) {
          state.insertAdjacentHTML("afterend", '<b class="group-state approved group-owner-state">\uB0B4\uAC00 \uB9CC\uB4E0 \uBAA8\uC784</b>');
          card.querySelector(".member-group-join")?.remove();
        }
        if (group.status === "approved" && (group.isOperator || group.membershipStatus === "approved")) {
          const actions = card.querySelector(".member-group-actions");
          const notice = document.createElement("button"), board = document.createElement("button");
          notice.className = "member-group-content-button";
          board.className = "member-group-content-button";
          notice.type = board.type = "button";
          notice.textContent = "\uACF5\uC9C0\uC0AC\uD56D";
          board.textContent = "\uAC8C\uC2DC\uD310";
          notice.onclick = () => openGroupContentModal(group, "notice");
          board.onclick = () => openGroupContentModal(group, "board");
          actions.prepend(notice, board);
        }
      });
    } finally {
      decoratingGroupContentButtons = false;
    }
  }
  new MutationObserver(() => {
    document.querySelectorAll(".member-group-card[data-content-ready]:has(.member-group-actions):not(:has(.member-group-content-button))").forEach((card) => delete card.dataset.contentReady);
    void decorateGroupContentButtons();
  }).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => void decorateGroupContentButtons());
  var decoratingGroupMemberCounts = false;
  async function decorateGroupMemberCounts() {
    const list = document.querySelector("#member-group-list");
    if (!list || decoratingGroupMemberCounts || !list.querySelector(".member-group-card:not(:has(.group-member-count-state))")) return;
    decoratingGroupMemberCounts = true;
    try {
      const response = await fetch("/api/parishioner/groups"), groups = await response.json();
      [...list.querySelectorAll(".member-group-card")].forEach((card, index) => {
        if (card.querySelector(".group-member-count-state") || !groups[index]) return;
        const badge = document.createElement("b");
        badge.className = "group-state group-member-count-state";
        badge.textContent = `\uD68C\uC6D0 ${groups[index].memberCount}\uBA85`;
        card.querySelector(".group-state:last-of-type")?.insertAdjacentElement("afterend", badge);
      });
    } finally {
      decoratingGroupMemberCounts = false;
    }
  }
  new MutationObserver(() => void decorateGroupMemberCounts()).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => void decorateGroupMemberCounts());
  function moveShrineCountToHeading() {
    const section = document.querySelector(".member-shrines"), heading = section?.querySelector("h2"), count = section?.querySelector("#member-shrine-count");
    if (!heading || !count || heading.nextElementSibling === count) return;
    heading.insertAdjacentElement("afterend", count);
  }
  new MutationObserver(moveShrineCountToHeading).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(moveShrineCountToHeading);
  function alignShrineReviewHeaders() {
    document.querySelectorAll(".member-pilgrimage-review:not([data-header-aligned])").forEach((card) => {
      const content = card.querySelector(":scope>div"), title = content?.querySelector("h3"), author = content?.querySelector(":scope>small"), detail = content?.querySelector(".member-review-detail-button");
      if (!content || !title || !detail) return;
      card.dataset.headerAligned = "true";
      const row = document.createElement("div");
      row.className = "member-review-title-row";
      title.insertAdjacentElement("beforebegin", row);
      row.append(title);
      if (author) {
        author.classList.add("member-review-title-author");
        author.textContent = author.textContent?.replace(" (", "(") ?? "";
        row.append(author);
      }
      row.append(detail);
    });
  }
  new MutationObserver(alignShrineReviewHeaders).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(alignShrineReviewHeaders);
  document.head.insertAdjacentHTML("beforeend", '<style>.member-review-title-row{display:flex;min-width:0;align-items:flex-start;justify-content:space-between;gap:8px;margin:6px 0}.member-review-title-author{flex:0 0 auto;padding-top:4px;color:var(--green)!important;font-size:9px!important;font-weight:700;white-space:nowrap}.member-review-title-author::before{content:"by "}.member-review-title-row h3{min-width:0;flex:1;margin:0!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.member-review-title-row .member-review-detail-button{flex:0 0 auto;width:auto!important;height:28px;margin:0!important;padding:0 11px;font-size:9px;white-space:nowrap}@media(max-width:700px){.member-review-title-row{gap:5px}.member-review-title-author{max-width:86px;overflow:hidden;text-overflow:ellipsis}.member-review-title-row .member-review-detail-button{height:26px;padding:0 8px}}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.member-review-title-row{justify-content:flex-start}.member-review-title-row h3{flex:0 1 auto}.member-review-title-row .member-review-detail-button{margin-left:auto!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>@media(max-width:700px){.member-pilgrimage-review{position:relative;min-height:166px;padding-bottom:28px}.member-pilgrimage-review .member-review-detail-button{position:absolute;top:106px;left:11px;width:95px!important;height:27px;margin:0!important;padding:0 5px!important}.member-pilgrimage-review .member-review-title-author{position:absolute;bottom:10px;left:11px;width:95px;max-width:95px;padding:0;text-align:left}.member-review-title-row{min-width:0}.member-review-title-row h3{flex:1 1 auto}}</style>");
  function updateMyMissionSummary() {
    const list = document.querySelector("#member-mission-list"), count = document.querySelector("#member-mission-count");
    if (!list || !count) return;
    const cards = [...list.querySelectorAll(".member-mission-card")], approved = list.querySelectorAll(".mission-state.approved").length, pending = list.querySelectorAll(".mission-state.requested").length, rejected = list.querySelectorAll(".mission-state.rejected").length, text = `\uCD1D ${cards.length}\uAC1C ( \uC2B9\uC778: ${approved} / \uB300\uAE30: ${pending} / \uBC18\uB824: ${rejected} )`;
    if (count.textContent !== text) count.textContent = text;
  }
  new MutationObserver(updateMyMissionSummary).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(updateMyMissionSummary);
  document.head.insertAdjacentHTML("beforeend", "<style>.mission-member-panel>.catacomb-feed-head{justify-content:flex-start;gap:12px}.mission-member-panel #member-mission-count{white-space:nowrap}@media(max-width:700px){.mission-member-panel>.catacomb-feed-head{gap:7px}.mission-member-panel #member-mission-count{font-size:9px;letter-spacing:-.25px}}</style>");
  function simplifyCatacombRegistrationModal() {
    const modal2 = document.querySelector(".registration-form-modal"), form = modal2?.querySelector("#catacomb-form");
    if (!modal2 || !form || modal2.dataset.catacombSimplified) return;
    const footer = modal2.querySelector(":scope>.member-modal-box>footer"), close = footer?.querySelector('button[type="button"]'), title = form.querySelector("#catacomb-title"), content = form.querySelector("#catacomb-content");
    if (!footer || !close || !title || !content) return;
    let submit2 = form.querySelector('header button[type="submit"]') ?? footer.querySelector(".catacomb-modal-submit");
    if (!submit2) {
      submit2 = document.createElement("button");
      submit2.type = "submit";
      submit2.className = "green-button";
    }
    modal2.dataset.catacombSimplified = "true";
    form.querySelector(":scope>header")?.remove();
    submit2.classList.add("catacomb-modal-submit");
    submit2.textContent = "\uB4F1\uB85D";
    submit2.setAttribute("form", form.id);
    footer.insertBefore(submit2, close);
    const sync = () => submit2.disabled = !title.value.trim() || !content.value.trim();
    form.addEventListener("input", sync);
    sync();
  }
  new MutationObserver(simplifyCatacombRegistrationModal).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(simplifyCatacombRegistrationModal);
  document.head.insertAdjacentHTML("beforeend", "<style>.registration-form-modal:has(#catacomb-form)>.member-modal-box>footer{gap:10px}.catacomb-modal-submit{width:110px;height:42px}.catacomb-modal-submit:disabled{opacity:.45;cursor:not-allowed}@media(max-width:600px){.catacomb-modal-submit{width:100px;height:40px}}</style>");
  function confirmCatacombRegistration() {
    return new Promise((resolve) => {
      document.querySelector(".catacomb-submit-confirm")?.remove();
      const layer = document.createElement("div");
      layer.className = "member-modal catacomb-submit-confirm";
      layer.innerHTML = '<section class="member-modal-box confirm-box"><h3>\uCE74\uD0C0\uCF64 \uB4F1\uB85D \uD655\uC778</h3><div class="member-modal-body"><p>\uC791\uC131\uD55C \uCE74\uD0C0\uCF64 \uC774\uC57C\uAE30\uB97C \uB4F1\uB85D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><div class="modal-actions"><button class="green-outline" type="button" data-catacomb-confirm="false">\uCDE8\uC18C</button><button class="green-button" type="button" data-catacomb-confirm="true">\uB4F1\uB85D</button></div></section>';
      document.body.append(layer);
      layer.querySelectorAll("[data-catacomb-confirm]").forEach((button) => button.onclick = () => {
        layer.remove();
        resolve(button.dataset.catacombConfirm === "true");
      });
    });
  }
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id !== "catacomb-form" || form.dataset.submitConfirmed === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void confirmCatacombRegistration().then((confirmed) => {
      if (!confirmed) return;
      form.dataset.submitConfirmed = "true";
      form.requestSubmit();
      queueMicrotask(() => delete form.dataset.submitConfirmed);
    });
  }, true);
  var activeGroupContentContext = null;
  var baseOpenGroupContentModal = openGroupContentModal;
  openGroupContentModal = async (group, type) => {
    activeGroupContentContext = { group, type };
    await baseOpenGroupContentModal(group, type);
  };
  function initializeGroupContentForms() {
    document.querySelectorAll(".group-content-form:not([data-validation-ready])").forEach((form) => {
      form.dataset.validationReady = "true";
      const title = form.querySelector('[name="title"]'), content = form.querySelector('[name="content"]'), submit2 = form.querySelector('button[type="submit"]');
      content.insertAdjacentHTML("afterend", '<label class="group-content-file"><span>\uCCA8\uBD80\uD30C\uC77C <small>1\uAC1C \xB7 \uCD5C\uB300 10MB</small></span><div class="group-content-dropzone" tabindex="0" role="button"><b>\uD30C\uC77C\uC744 \uB04C\uC5B4\uB2E4 \uB193\uAC70\uB098 \uD074\uB9AD\uD574 \uC120\uD0DD\uD558\uC138\uC694</b><small>\uBAA8\uBC14\uC77C\uC5D0\uC11C\uB294 \uD30C\uC77C \uC120\uD0DD \uCC3D\uC774 \uC5F4\uB9BD\uB2C8\uB2E4.</small></div><input type="file" hidden><div class="group-content-file-name" hidden></div></label>');
      const file = form.querySelector(".group-content-file input"), dropzone = form.querySelector(".group-content-dropzone"), fileName = form.querySelector(".group-content-file-name"), sync = () => submit2.disabled = !title.value.trim() || !content.value.trim(), select = (selected) => {
        if (selected && selected.size > 10 * 1024 * 1024) {
          file.value = "";
          fileName.hidden = false;
          fileName.textContent = "\uCCA8\uBD80\uD30C\uC77C\uC740 10MB \uC774\uD558\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
          return;
        }
        fileName.hidden = !selected;
        fileName.textContent = selected ? `\u{1F4CE} ${selected.name} \xB7 ${(selected.size / 1024 / 1024).toFixed(2)}MB` : "";
      };
      form.addEventListener("input", sync);
      dropzone.onclick = () => file.click();
      dropzone.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          file.click();
        }
      };
      file.onchange = () => select(file.files?.[0] ?? null);
      ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
        event.preventDefault();
        dropzone.classList.add("dragging");
      }));
      ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
        event.preventDefault();
        dropzone.classList.remove("dragging");
      }));
      dropzone.addEventListener("drop", (event) => {
        const selected = event.dataTransfer?.files[0];
        if (!selected) return;
        const transfer = new DataTransfer();
        transfer.items.add(selected);
        file.files = transfer.files;
        select(selected);
      });
      form.onsubmit = async (event) => {
        event.preventDefault();
        const context = activeGroupContentContext, selected = file.files?.[0];
        if (!context || submit2.disabled) return;
        submit2.disabled = true;
        const error = form.querySelector("p");
        error.textContent = "";
        try {
          const attachmentData = selected ? await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = () => reject(new Error("\uCCA8\uBD80\uD30C\uC77C\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
            reader.readAsDataURL(selected);
          }) : "", save = await fetch(`/api/parishioner/groups/${context.group.id}/contents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: context.type, title: title.value, content: content.value, attachmentName: selected?.name ?? "", attachmentType: selected?.type || "application/octet-stream", attachmentData }) }), result = await save.json();
          if (!save.ok) throw new Error(result.message);
          document.querySelector(".group-content-modal")?.remove();
          await openGroupContentModal(context.group, context.type);
        } catch (reason) {
          error.textContent = reason.message;
          sync();
        }
      };
      sync();
    });
  }
  new MutationObserver(initializeGroupContentForms).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(initializeGroupContentForms);
  var decoratingGroupAttachments = false;
  async function decorateGroupAttachments() {
    const modal2 = document.querySelector(".group-content-modal"), list = modal2?.querySelector(".group-content-list"), context = activeGroupContentContext;
    if (!modal2 || !list || modal2.dataset.attachmentsReady || decoratingGroupAttachments || !context) return;
    decoratingGroupAttachments = true;
    try {
      const response = await fetch(`/api/parishioner/groups/${context.group.id}/contents?type=${context.type}`), data = await response.json();
      if (!response.ok) return;
      modal2.dataset.attachmentsReady = "true";
      [...list.querySelectorAll(":scope>article")].forEach((article, index) => {
        const item = data.items[index];
        if (!item?.attachmentName) return;
        article.insertAdjacentHTML("beforeend", `<a class="group-content-attachment" href="/api/parishioner/groups/${context.group.id}/contents/${item.id}/attachment">\u{1F4CE} ${escapeHtml(item.attachmentName)}</a>`);
      });
    } finally {
      decoratingGroupAttachments = false;
    }
  }
  new MutationObserver(() => void decorateGroupAttachments()).observe(document.body, { childList: true, subtree: true });
  function orderMemberSharingTabs() {
    const tabs = document.querySelector(".member-sharing-tabs");
    if (!tabs) return;
    const order = ["catacomb", "prayer-dream", "mission", "talent", "suggestion", "memorial"], known = new Set(order), buttons = order.map((name) => tabs.querySelector(`[data-member-sharing="${name}"]`)).filter((button) => Boolean(button)), unknown = [...tabs.querySelectorAll(":scope > button[data-member-sharing]")].filter((button) => !known.has(button.dataset.memberSharing ?? "")), expected = [...buttons, ...unknown], current = [...tabs.querySelectorAll(":scope > button[data-member-sharing]")];
    if (current.length === expected.length && current.every((button, index) => button === expected[index])) return;
    expected.forEach((button) => tabs.append(button));
  }
  new MutationObserver(orderMemberSharingTabs).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(orderMemberSharingTabs);
  function applyMemberShrineVisitFilter() {
    const toolbar = document.querySelector(".member-shrine-toolbar"), list = document.querySelector("#member-shrine-list");
    if (!toolbar || !list) return;
    let filter = toolbar.querySelector("#member-shrine-visit-filter");
    if (!filter) {
      filter = document.createElement("select");
      filter.id = "member-shrine-visit-filter";
      filter.setAttribute("aria-label", "\uC21C\uB840\uC9C0 \uBC29\uBB38 \uC5EC\uBD80");
      filter.innerHTML = '<option value="all">\uC804\uCCB4 \uC21C\uB840\uC9C0</option><option value="visited">\uB0B4\uAC00 \uBC29\uBB38\uD55C \uC21C\uB840\uC9C0</option>';
      toolbar.prepend(filter);
      filter.onchange = applyMemberShrineVisitFilter;
    }
    const q = (document.querySelector("#member-shrine-search")?.value ?? "").trim().toLowerCase(), items = memberShrines.filter((item) => !q || [item.name, item.diocese, item.address ?? ""].some((value) => value.toLowerCase().includes(q)));
    [...list.querySelectorAll(":scope > .member-shrine-card")].forEach((card, index) => card.hidden = filter.value === "visited" && !items[index]?.visited);
  }
  new MutationObserver(applyMemberShrineVisitFilter).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("input", (event) => {
    if (event.target.id === "member-shrine-search") queueMicrotask(applyMemberShrineVisitFilter);
  });
  document.addEventListener("click", (event) => {
    if (event.target.id === "member-shrine-search-button") queueMicrotask(applyMemberShrineVisitFilter);
  });
  queueMicrotask(applyMemberShrineVisitFilter);
  document.head.insertAdjacentHTML("beforeend", "<style>.member-shrine-toolbar{display:flex!important;flex-wrap:nowrap;align-items:center}.member-shrine-toolbar select{flex:0 0 180px;width:180px;height:39px;padding:0 30px 0 11px;border:1px solid var(--line);border-radius:8px;background:#fff;color:#465750;font-size:10px}.member-shrine-card[hidden]{display:none!important}@media(max-width:700px){.member-shrine-toolbar{gap:5px}.member-shrine-toolbar select{flex-basis:112px;width:112px;padding-left:7px;font-size:9px}.member-shrine-toolbar input{padding:0 8px;font-size:9px}.member-shrine-toolbar button{flex:0 0 auto;padding:0 12px}}</style>");
  function decorateShrineVisitors() {
    const q = (document.querySelector("#member-shrine-search")?.value ?? "").trim().toLowerCase(), items = memberShrines.filter((item) => !q || [item.name, item.diocese, item.address ?? ""].some((value) => value.toLowerCase().includes(q)));
    document.querySelectorAll("#member-shrine-list > .member-shrine-card:not([data-visitors-ready])").forEach((card, index) => {
      const names = items[index]?.visitorNames ?? [];
      card.dataset.visitorsReady = "true";
      const row = document.createElement("div");
      row.className = "member-shrine-visitors";
      const label = document.createElement("span");
      label.textContent = "\uC21C\uB840 \uBC29\uBB38\uC790";
      const summary = document.createElement("b");
      summary.tabIndex = 0;
      summary.textContent = names.length ? `${names[0]}${names.length > 1 ? ` \uC678 ${names.length - 1}\uC778` : ""}` : "\uBC29\uBB38\uC790 \uC5C6\uC74C";
      if (names.length) {
        summary.dataset.visitorTooltip = names.join("\n");
        summary.setAttribute("aria-label", `\uC804\uCCB4 \uC21C\uB840 \uBC29\uBB38\uC790: ${names.join(", ")}`);
      }
      row.append(label, summary);
      card.querySelector(":scope > p")?.insertAdjacentElement("afterend", row);
    });
  }
  new MutationObserver(decorateShrineVisitors).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(decorateShrineVisitors);
  document.head.insertAdjacentHTML("beforeend", "<style>.member-shrine-visitors{display:flex;align-items:center;gap:8px;margin-top:9px;color:#64736d;font-size:9px}.member-shrine-visitors>span{flex:0 0 auto}.member-shrine-visitors>b{position:relative;min-width:0;overflow:visible;color:var(--green);font-size:9px;cursor:help}.member-shrine-visitors>b[data-visitor-tooltip]::after{position:absolute;z-index:30;left:0;bottom:calc(100% + 8px);width:max-content;max-width:260px;padding:9px 11px;border-radius:8px;background:#173d32;color:#fff;box-shadow:0 7px 20px rgba(10,42,33,.22);content:attr(data-visitor-tooltip);font-size:9px;font-weight:500;line-height:1.65;opacity:0;pointer-events:none;transform:translateY(4px);transition:.15s;white-space:pre-line}.member-shrine-visitors>b[data-visitor-tooltip]:hover::after,.member-shrine-visitors>b[data-visitor-tooltip]:focus::after{opacity:1;transform:translateY(0)}</style>");
  var memberFontScaleKey = "paxlink.parishioner.font-scale";
  function readMemberFontScale() {
    const value = Number(localStorage.getItem(memberFontScaleKey) ?? 100);
    return Number.isFinite(value) ? Math.min(140, Math.max(80, Math.round(value / 10) * 10)) : 100;
  }
  var memberFontScale = readMemberFontScale();
  function applyMemberFontScale(value = memberFontScale) {
    memberFontScale = Math.min(140, Math.max(80, value));
    document.body.style.zoom = String(memberFontScale / 100);
    localStorage.setItem(memberFontScaleKey, String(memberFontScale));
    document.querySelectorAll("[data-member-font-value]").forEach((element) => element.textContent = `${memberFontScale}%`);
    document.querySelectorAll("[data-member-font-action]").forEach((button) => {
      button.disabled = button.dataset.memberFontAction === "decrease" ? memberFontScale <= 80 : button.dataset.memberFontAction === "increase" ? memberFontScale >= 140 : false;
    });
  }
  function openMemberPreferences() {
    document.querySelector(".member-preferences-modal")?.remove();
    const layer = document.createElement("div");
    layer.className = "member-modal member-preferences-modal";
    layer.innerHTML = '<section class="member-modal-box"><h3>\uD658\uACBD\uC124\uC815</h3><div class="member-modal-body"><section class="member-font-setting"><div><strong>\uAE00\uC790 \uD06C\uAE30</strong><p>\uD654\uBA74\uC758 \uAE00\uC790\uC640 \uCF58\uD150\uCE20 \uD06C\uAE30\uB97C \uC870\uC808\uD569\uB2C8\uB2E4.</p></div><div class="member-font-controls"><button class="green-outline" data-member-font-action="decrease" type="button" aria-label="\uAE00\uC790 \uD06C\uAE30 \uCD95\uC18C">A\u2212</button><b data-member-font-value></b><button class="green-outline" data-member-font-action="increase" type="button" aria-label="\uAE00\uC790 \uD06C\uAE30 \uD655\uB300">A\uFF0B</button></div><div class="member-font-sample"><small>\uBBF8\uB9AC\uBCF4\uAE30</small><p>\uC131\uB2F9 \uACF5\uB3D9\uCCB4\uC758 \uC18C\uC2DD\uC744 \uD3B8\uC548\uD55C \uD06C\uAE30\uB85C \uD655\uC778\uD558\uC138\uC694.</p></div><button class="member-font-reset green-outline" data-member-font-action="reset" type="button">\uAE30\uBCF8 \uD06C\uAE30\uB85C \uBCF5\uC6D0</button></section></div><footer><button class="green-button" type="button">\uD655\uC778</button></footer></section>';
    document.body.append(layer);
    layer.querySelector('[data-member-font-action="decrease"]').onclick = () => applyMemberFontScale(memberFontScale - 10);
    layer.querySelector('[data-member-font-action="increase"]').onclick = () => applyMemberFontScale(memberFontScale + 10);
    layer.querySelector('[data-member-font-action="reset"]').onclick = () => applyMemberFontScale(100);
    layer.querySelector(":scope>.member-modal-box>footer button").onclick = () => layer.remove();
    applyMemberFontScale();
  }
  function mountMemberPreferences() {
    const footer = document.querySelector("#member-mobile-menu>footer"), privacy = footer?.querySelector("#member-privacy");
    if (!footer || !privacy || footer.querySelector("#member-preferences")) return;
    const button = document.createElement("button");
    button.id = "member-preferences";
    button.type = "button";
    button.textContent = "\uD658\uACBD\uC124\uC815";
    button.onclick = () => {
      document.body.classList.remove("member-menu-open");
      document.querySelector("#member-mobile-menu")?.classList.remove("open");
      document.querySelector("#member-menu-backdrop").hidden = true;
      openMemberPreferences();
    };
    privacy.insertAdjacentElement("afterend", button);
  }
  var memberParishInformation = null;
  async function openMemberParishInformation(kind) {
    document.querySelector(".member-parish-information-modal")?.remove();
    const labels2 = { basic: "\uAE30\uBCF8\uC815\uBCF4", history: "\uC5F0\uD601", contact: "\uC131\uB2F9\uC5F0\uB77D\uCC98", priests: "\uC2E0\uBD80" }, layer = document.createElement("div");
    layer.className = `member-modal member-parish-information-modal${kind === "priests" ? " member-parish-priest-modal" : ""}`;
    layer.innerHTML = `<section class="member-modal-box"><h3>\uC131\uB2F9\uC815\uBCF4 \xB7 ${labels2[kind]}</h3><div class="member-modal-body"><p class="member-parish-information-loading">\uC131\uB2F9 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p></div><footer><button class="green-outline" type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelector("footer button").onclick = () => layer.remove();
    try {
      if (!memberParishInformation) {
        const response = await fetch("/api/parishioner/parish-information"), data2 = await response.json();
        if (!response.ok) throw new Error(data2.message ?? "\uC131\uB2F9 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
        memberParishInformation = data2;
      }
      const data = memberParishInformation, b = data.basic, empty = '<p class="member-parish-information-empty">\uB4F1\uB85D\uB41C \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
      let html = "";
      if (kind === "basic") html = `<dl><dt>\uC131\uB2F9\uBA85</dt><dd>${escapeHtml(b.name)}</dd><dt>\uAD50\uAD6C</dt><dd>${escapeHtml(b.diocese ?? "-")}</dd><dt>\uC9C0\uAD6C</dt><dd>${escapeHtml(b.district ?? "-")}</dd><dt>\uAD00\uD560</dt><dd>${escapeHtml(b.jurisdiction ?? "-")}</dd><dt>\uC8FC\uC18C</dt><dd>${escapeHtml([b.postalCode, b.address, b.addressDetail].filter(Boolean).join(" ") || "-")}</dd>${b.homepage ? `<dt>\uD648\uD398\uC774\uC9C0</dt><dd><a href="${escapeHtml(b.homepage)}" target="_blank" rel="noopener">${escapeHtml(b.homepage)}</a></dd>` : ""}</dl>`;
      else if (kind === "contact") html = `<dl><dt>\uB300\uD45C\uC804\uD654</dt><dd>${escapeHtml(b.phone ?? "-")}</dd><dt>\uC0AC\uBB34\uC2E4</dt><dd>${escapeHtml(b.officePhone ?? "-")}</dd><dt>\uD329\uC2A4</dt><dd>${escapeHtml(b.fax ?? "-")}</dd><dt>\uC8FC\uC18C</dt><dd>${escapeHtml([b.postalCode, b.address, b.addressDetail].filter(Boolean).join(" ") || "-")}</dd></dl>`;
      else if (kind === "history") html = data.history.length ? `<ol class="member-parish-history">${data.history.map((item) => `<li><time>${item.year}.${String(item.month).padStart(2, "0")}</time><div><strong>${escapeHtml(item.title)}</strong>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></li>`).join("")}</ol>` : empty;
      else html = data.priests.length ? `<div class="member-parish-priests">${data.priests.map((item) => `<article><h4>${escapeHtml(item.name)}${item.baptismalName ? ` (${escapeHtml(item.baptismalName)})` : ""}</h4><b>${escapeHtml(item.role ?? "\uC2E0\uBD80")}</b>${item.affiliation ? `<p>${escapeHtml(item.affiliation)}</p>` : ""}</article>`).join("")}</div>` : empty;
      layer.querySelector(".member-modal-body").innerHTML = html;
    } catch (error) {
      layer.querySelector(".member-modal-body").innerHTML = `<p class="member-parish-information-empty">${escapeHtml(error.message)}</p>`;
    }
  }
  function mountMemberParishInformationMenu() {
    const nav = document.querySelector("#member-mobile-menu>nav"), notice = nav?.querySelector('[data-member-target=".member-notices"]');
    if (!nav || !notice || nav.querySelector(".member-parish-information-menu")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "member-parish-information-menu";
    wrapper.innerHTML = '<button class="member-parish-information-toggle" type="button" aria-expanded="false">\uC131\uB2F9\uC815\uBCF4 <span>\u2304</span></button><div class="member-parish-information-submenu" hidden><button type="button" data-parish-information="basic">\uAE30\uBCF8\uC815\uBCF4</button><button type="button" data-parish-information="history">\uC5F0\uD601</button><button type="button" data-parish-information="contact">\uC131\uB2F9\uC5F0\uB77D\uCC98</button><button type="button" data-parish-information="priests">\uC2E0\uBD80</button></div>';
    notice.insertAdjacentElement("afterend", wrapper);
    const toggle = wrapper.querySelector(".member-parish-information-toggle"), submenu = wrapper.querySelector(".member-parish-information-submenu");
    toggle.onclick = () => {
      const open = submenu.hidden;
      submenu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    };
    wrapper.querySelectorAll("[data-parish-information]").forEach((button) => button.onclick = () => {
      document.body.classList.remove("member-menu-open");
      document.querySelector("#member-mobile-menu")?.classList.remove("open");
      document.querySelector("#member-menu-backdrop").hidden = true;
      void openMemberParishInformation(button.dataset.parishInformation);
    });
  }
  document.head.insertAdjacentHTML("beforeend", '<style>.member-parish-information-menu{border-top:1px solid rgba(255,255,255,.12)}.member-parish-information-menu>button{display:flex!important;align-items:center;justify-content:space-between}.member-parish-information-menu>button span{transition:transform .2s}.member-parish-information-menu>button[aria-expanded="true"] span{transform:rotate(180deg)}.member-parish-information-submenu{padding:4px 12px 10px 24px;background:rgba(0,0,0,.08)}.member-parish-information-submenu[hidden]{display:none}.member-parish-information-submenu button{width:100%;padding:10px 12px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.member-parish-information-modal .member-modal-box{display:flex;width:min(92vw,720px);max-height:86vh;flex-direction:column;overflow:hidden}.member-parish-information-modal .member-modal-body{overflow-y:auto;text-align:left}.member-parish-information-modal dl{display:grid;grid-template-columns:110px 1fr;margin:0}.member-parish-information-modal dt,.member-parish-information-modal dd{margin:0;padding:12px;border-bottom:1px solid var(--line)}.member-parish-information-modal dt{font-weight:700;color:var(--green)}.member-parish-history{margin:0;padding:0;list-style:none}.member-parish-history li{display:grid;grid-template-columns:80px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid var(--line)}.member-parish-history time{color:var(--green);font-weight:700}.member-parish-history p{margin:6px 0 0;white-space:pre-wrap}.member-parish-priests{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.member-parish-priests article{position:relative;padding:16px;border:1px solid var(--line);border-radius:12px}.member-parish-priests h4{margin:0 0 10px}.member-parish-priests article>b{position:absolute;top:14px;right:14px;color:var(--green)}.member-parish-priests article>a{display:block;margin-top:5px;color:var(--green)}.member-parish-information-empty{text-align:center;color:#7b8798}@media(max-width:600px){.member-parish-information-modal dl{grid-template-columns:90px 1fr}.member-parish-priests{grid-template-columns:1fr}}</style>');
  new MutationObserver(mountMemberParishInformationMenu).observe(document.documentElement, { childList: true, subtree: true });
  mountMemberParishInformationMenu();
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".member-parish-information-menu")) return;
    queueMicrotask(() => {
      const menuButton = document.querySelector("#member-menu-button");
      menuButton?.setAttribute("aria-expanded", "false");
      menuButton?.setAttribute("aria-label", "\uBA54\uB274 \uC5F4\uAE30");
    });
  }, true);
  document.head.insertAdjacentHTML("beforeend", '<style>.member-mobile-menu .member-parish-information-menu{margin:6px 4px;border:1px solid transparent;border-radius:14px;overflow:hidden;transition:background .2s,border-color .2s}.member-mobile-menu .member-parish-information-menu:has(.member-parish-information-toggle[aria-expanded="true"]){border-color:#b9e0d3;background:#f0faf6}.member-mobile-menu .member-parish-information-toggle{position:relative;height:50px!important;padding:0 16px!important;color:var(--ink)!important}.member-mobile-menu .member-parish-information-toggle:before{display:grid;width:25px;height:25px;margin-right:10px;place-items:center;border-radius:8px;background:#dff4ec;color:var(--green);content:"i";font-family:Georgia,serif;font-size:14px;font-style:italic;font-weight:700}.member-mobile-menu .member-parish-information-toggle>span{margin-left:auto;color:var(--green);font-size:17px}.member-mobile-menu .member-parish-information-submenu{display:grid;gap:7px;margin:0;padding:5px 10px 11px;background:transparent}.member-mobile-menu .member-parish-information-submenu[hidden]{display:none}.member-mobile-menu .member-parish-information-submenu button{position:relative;height:43px;padding:0 38px 0 42px!important;border:1px solid #dcebe6!important;border-radius:10px!important;background:#fff!important;color:#34473f!important;font-size:12px!important;box-shadow:0 2px 7px rgba(20,76,58,.04);transition:border-color .15s,transform .15s,box-shadow .15s}.member-mobile-menu .member-parish-information-submenu button:before{position:absolute;left:14px;display:grid;width:19px;height:19px;place-items:center;border-radius:50%;background:#e8f7f2;color:var(--green);font-size:9px;font-weight:800}.member-mobile-menu .member-parish-information-submenu button:after{position:absolute;right:15px;color:#8bb6a8;content:"\u203A";font-size:19px;font-weight:400}.member-mobile-menu .member-parish-information-submenu button:nth-child(1):before{content:"01"}.member-mobile-menu .member-parish-information-submenu button:nth-child(2):before{content:"02"}.member-mobile-menu .member-parish-information-submenu button:nth-child(3):before{content:"03"}.member-mobile-menu .member-parish-information-submenu button:nth-child(4):before{content:"04"}.member-mobile-menu .member-parish-information-submenu button:hover,.member-mobile-menu .member-parish-information-submenu button:focus-visible{border-color:#73c5aa!important;color:var(--green)!important;box-shadow:0 5px 13px rgba(21,149,111,.1);transform:translateX(2px)}</style>');
  document.head.insertAdjacentHTML("beforeend", '<style>.member-mobile-menu>nav>button[data-member-target]{display:flex;align-items:center}.member-mobile-menu>nav>button[data-member-target]:before{display:grid;width:25px;height:25px;flex:0 0 25px;margin-right:10px;place-items:center;border-radius:8px;background:#eef7f4;color:var(--green);font-size:13px;font-weight:700}.member-mobile-menu>nav>button[data-member-target=".member-schedule-section"]:before{content:"\u25A3"}.member-mobile-menu>nav>button[data-member-target=".member-groups"]:before{content:"\u2659"}.member-mobile-menu>nav>button[data-member-target=".member-shrines"]:before{content:"\u2726"}.member-mobile-menu>nav>button[data-member-target=".member-sharing"]:before{content:"\u2661"}.member-mobile-menu>nav>button[data-member-target=".member-videos"]:before{content:"\u25B6";font-size:10px}.member-mobile-menu>nav>button[data-member-target=".member-notices"]:before{content:"!";font-family:Georgia,serif;font-style:italic}</style>');
  document.head.insertAdjacentHTML("beforeend", '<style>.member-mobile-menu .member-parish-information-toggle>span{position:relative;display:grid;width:26px;height:26px;flex:0 0 26px;place-items:center;border-radius:50%;background:#e1f3ed;font-size:0!important;transform:none!important;transition:background .2s}.member-mobile-menu .member-parish-information-toggle>span:before{width:7px;height:7px;border-right:2px solid var(--green);border-bottom:2px solid var(--green);content:"";transform:translateY(-2px) rotate(45deg);transition:transform .2s}.member-mobile-menu .member-parish-information-toggle[aria-expanded="true"]>span{background:#ccecdf}.member-mobile-menu .member-parish-information-toggle[aria-expanded="true"]>span:before{transform:translateY(2px) rotate(225deg)}</style>');
  document.head.insertAdjacentHTML("beforeend", '<style>.member-mobile-menu .member-parish-information-toggle>span{width:25px;height:25px;flex-basis:25px;border:1px solid #9ed2c1;border-radius:7px;background:#fff!important;box-shadow:0 1px 3px rgba(20,76,58,.06)}.member-mobile-menu .member-parish-information-toggle>span:before,.member-mobile-menu .member-parish-information-toggle>span:after{position:absolute;width:10px;height:2px;border:0;border-radius:2px;background:var(--green);content:"";transform:none!important;transition:opacity .18s,transform .18s}.member-mobile-menu .member-parish-information-toggle>span:after{transform:rotate(90deg)!important}.member-mobile-menu .member-parish-information-toggle[aria-expanded="true"]>span{border-color:var(--green);background:#e7f6f1!important}.member-mobile-menu .member-parish-information-toggle[aria-expanded="true"]>span:before{transform:rotate(180deg)!important}.member-mobile-menu .member-parish-information-toggle[aria-expanded="true"]>span:after{opacity:0;transform:rotate(90deg) scale(.25)!important}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.member-mobile-menu .member-parish-information-toggle>span{margin-left:16px!important}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>@media(max-width:600px){.member-mobile-menu>header{height:50px;min-height:50px;padding:0 16px}.member-mobile-menu>header strong{font-size:14px}.member-mobile-menu>header button{width:32px;height:32px;font-size:24px}.member-mobile-menu .member-menu-user{gap:2px;padding:10px 16px}.member-mobile-menu .member-menu-user b{font-size:12px}.member-mobile-menu .member-menu-user small{font-size:8px}.member-mobile-menu>nav{display:flex;min-height:0;flex:1 1 auto;flex-direction:column;padding:7px 10px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.member-mobile-menu>nav>button[data-member-target]{height:38px;min-height:38px;padding:0 10px;font-size:11px}.member-mobile-menu>nav>button[data-member-target]:before{width:21px;height:21px;flex-basis:21px;margin-right:8px;border-radius:7px;font-size:10px}.member-mobile-menu .member-parish-information-menu{flex:0 0 auto;margin:3px 0;border-radius:11px}.member-mobile-menu .member-parish-information-toggle{height:40px!important;min-height:40px;padding:0 10px!important;font-size:11px!important}.member-mobile-menu .member-parish-information-toggle:before{width:21px;height:21px;margin-right:8px;border-radius:7px;font-size:11px}.member-mobile-menu .member-parish-information-toggle>span{width:22px;height:22px;flex-basis:22px;margin-left:12px!important}.member-mobile-menu .member-parish-information-submenu{gap:4px;padding:3px 7px 7px}.member-mobile-menu .member-parish-information-submenu button{height:34px;padding:0 30px 0 35px!important;border-radius:8px!important;font-size:10px!important}.member-mobile-menu .member-parish-information-submenu button:before{left:10px;width:17px;height:17px;font-size:7px}.member-mobile-menu .member-parish-information-submenu button:after{right:11px;font-size:16px}.member-mobile-menu>footer{gap:5px;padding:7px 10px}.member-mobile-menu>footer button{height:36px;font-size:10px}}</style>");
  document.head.insertAdjacentHTML("beforeend", '<style>@media(max-width:600px){.member-mobile-menu>nav>button,.member-mobile-menu>nav>.member-parish-information-menu>.member-parish-information-toggle{font-family:"Noto Sans KR",sans-serif!important;font-size:11px!important;font-weight:700!important;line-height:1!important}.member-mobile-menu>nav>button>span:last-child{font:inherit!important}.member-mobile-menu>nav>button{height:38px!important;min-height:38px!important;padding:0 10px!important}}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.member-parish-information-modal .member-modal-box>footer{display:flex;flex:0 0 auto;justify-content:center;padding:18px 20px 24px;border-top:1px solid var(--line)}.member-parish-information-modal .member-modal-box>footer button{min-width:90px}</style>");
  function enhancePublicPriestInformation() {
    const modal2 = document.querySelector(".member-parish-information-modal"), title = modal2?.querySelector("h3");
    if (!modal2 || !title?.textContent?.includes("\xB7 \uC2E0\uBD80") || !memberParishInformation) return;
    modal2.querySelectorAll(".member-parish-priests article:not([data-public-fields])").forEach((article, index) => {
      const priest = memberParishInformation.priests[index];
      if (!priest) return;
      article.dataset.publicFields = "true";
      article.querySelector(":scope>p")?.remove();
      article.insertAdjacentHTML("beforeend", `<dl class="member-priest-public-fields"><dt>\uC774\uB984</dt><dd>${escapeHtml(priest.name)}</dd><dt>\uC138\uB840\uBA85</dt><dd>${escapeHtml(priest.baptismalName ?? "-")}</dd><dt>\uC5ED\uD560</dt><dd>${escapeHtml(priest.role ?? "-")}</dd><dt>\uBD80\uC784\uC77C</dt><dd>${escapeHtml(priest.appointmentDate ?? "-")}</dd><dt>\uC18C\uC18D</dt><dd>${escapeHtml(priest.affiliation ?? "-")}</dd><dt>\uC138\uB300</dt><dd>${priest.generation == null ? "-" : `${priest.generation}\uC138\uB300`}</dd></dl>`);
    });
  }
  new MutationObserver(enhancePublicPriestInformation).observe(document.documentElement, { childList: true, subtree: true });
  document.head.insertAdjacentHTML("beforeend", "<style>.member-parish-priests article>h4,.member-parish-priests article>b{display:none}.member-parish-information-modal .member-priest-public-fields{display:grid;grid-template-columns:72px 1fr;margin:0}.member-parish-information-modal .member-priest-public-fields dt,.member-parish-information-modal .member-priest-public-fields dd{padding:8px 10px}.member-priest-public-fields dt{color:var(--green);font-weight:700}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-parish-information-modal .member-parish-priests{width:min(100%,620px);margin-right:auto;margin-left:auto;justify-content:center}.member-parish-information-modal .member-parish-priests article:only-child{width:min(100%,420px);justify-self:center}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.member-parish-priest-modal .member-modal-box{width:min(92vw,520px)}.member-parish-priest-modal .member-parish-priests{grid-template-columns:1fr;width:100%}.member-parish-priest-modal .member-parish-priests article{width:100%;box-sizing:border-box}</style>");
  new MutationObserver(mountMemberPreferences).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#member-preferences")) return;
    queueMicrotask(() => {
      const menu2 = document.querySelector("#member-mobile-menu"), backdrop = document.querySelector("#member-menu-backdrop"), menuButton = document.querySelector("#member-menu-button");
      document.body.classList.remove("member-menu-open");
      menu2?.classList.remove("open");
      menu2?.setAttribute("aria-hidden", "true");
      if (backdrop) backdrop.hidden = true;
      menuButton?.setAttribute("aria-expanded", "false");
      menuButton?.setAttribute("aria-label", "\uBA54\uB274 \uC5F4\uAE30");
    });
  }, true);
  applyMemberFontScale();
  mountMemberPreferences();
  document.head.insertAdjacentHTML("beforeend", "<style>.member-preferences-modal .member-modal-box{width:min(92vw,520px);text-align:left}.member-preferences-modal .member-modal-box>h3{text-align:center}.member-preferences-modal .member-modal-body{padding:22px}.member-preferences-modal .member-modal-box>footer{display:flex;justify-content:center;padding:14px;border-top:1px solid var(--line)}.member-preferences-modal .member-modal-box>footer button{width:110px}.member-font-setting{padding:18px;border:1px solid var(--line);border-radius:12px;background:#fbfdfc}.member-font-setting>div:first-child strong{font-size:13px}.member-font-setting>div:first-child p{margin:5px 0 16px;color:var(--muted);font-size:10px}.member-font-controls{display:grid;grid-template-columns:70px 1fr 70px;align-items:center;gap:10px}.member-font-controls button{height:42px;font-size:14px;font-weight:800}.member-font-controls>b{text-align:center;color:var(--green);font-size:16px}.member-font-sample{margin-top:16px;padding:14px;border-radius:9px;background:#eef7f3;text-align:center}.member-font-sample small{color:var(--muted);font-size:8px}.member-font-sample p{margin:6px 0 0;font-size:11px}.member-font-reset{display:block;width:auto;height:34px;margin:13px auto 0;padding:0 13px;font-size:9px}.member-font-controls button:disabled{opacity:.4;cursor:not-allowed}</style>");
  mountRequiredMarkers();
})();
