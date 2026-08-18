"use strict";
(() => {
  // src/client/parish-schedule.ts
  var categoryLabels = { mass: "\uBBF8\uC0AC", sacrament: "\uC131\uC0AC", devotion: "\uC2E0\uC2EC", liturgical: "\uC804\uB840\uB825", other: "\uAE30\uD0C0" };
  var scheduleTypes = { mass: ["\uC8FC\uC77C", "\uD2B9\uC804", "\uD3C9\uC77C", "\uB300\uCD95\uC77C", "\uC7A5\uB840", "\uC704\uB839", "\uAE30\uC6D0", "\uD63C\uC778", "\uC2E0\uC2EC", "\uD2B9\uC218", "\uC131\uAC00", "\uB3C5\uC11C"], sacrament: ["\uC138\uB840", "\uACAC\uC9C4", "\uC131\uCCB4", "\uACE0\uD574", "\uBCD1\uC790", "\uC131\uD488", "\uD63C\uC778"], devotion: ["\uC0AC\uC801", "\uACF5\uC801", "\uC131\uCCB4", "\uC608\uC218 \uC131\uC2EC", "\uC131\uBAA8", "\uC120\uC778"], liturgical: [], other: [] };
  var escapeSchedule = (value2) => String(value2 ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  async function scheduleApi(url, init) {
    let body = init?.body;
    if (/^\/api\/parish\/schedules(?:\/\d+)?$/.test(url) && (init?.method === "POST" || init?.method === "PATCH") && typeof body === "string") {
      const payload = JSON.parse(body), form3 = document.querySelector(".schedule-editor-modal form");
      payload.scheduleType = form3?.querySelector('[name="scheduleType"]')?.value ?? payload.scheduleType ?? "";
      payload.location = form3?.querySelector('[name="location"]')?.value ?? payload.location ?? "";
      const file = form3?.querySelector('[name="attachment"]')?.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("\uCCA8\uBD80\uD30C\uC77C\uC740 5MB \uC774\uD558\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
        const data2 = await new Promise((resolve, reject2) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject2(new Error("\uCCA8\uBD80\uD30C\uC77C\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
          reader.readAsDataURL(file);
        });
        payload.attachment = { name: file.name, type: file.type || "application/octet-stream", data: data2 };
      }
      body = JSON.stringify(payload);
    }
    const response = await fetch(url, { ...init, body, headers: { "Content-Type": "application/json", ...init?.headers ?? {} } }), data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  var calendarMonth = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1);
  var calendarItems = [];
  var dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  function monthKey() {
    return dateKey(calendarMonth).slice(0, 7);
  }
  function mountSchedule() {
    const section = document.querySelector("#schedule-management");
    if (!section || section.dataset.calendarReady) return;
    section.dataset.calendarReady = "true";
    section.innerHTML = '<header class="calendar-header"><div><h2>\uC77C\uC815 \uAD00\uB9AC</h2><p>\uB0A0\uC9DC\uB97C \uC120\uD0DD\uD558\uC5EC \uBBF8\uC0AC, \uC131\uC0AC, \uBBF8\uD305 \uB4F1 \uC131\uB2F9 \uC77C\uC815\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.</p></div><button class="primary" id="schedule-today" type="button">\uC624\uB298</button></header><div class="calendar-toolbar"><button id="calendar-prev" type="button" aria-label="\uC774\uC804 \uB2EC">\u2039</button><h3 id="calendar-title"></h3><button id="calendar-next" type="button" aria-label="\uB2E4\uC74C \uB2EC">\u203A</button></div><div class="parish-calendar"><div class="calendar-week"><b>\uC77C</b><b>\uC6D4</b><b>\uD654</b><b>\uC218</b><b>\uBAA9</b><b>\uAE08</b><b>\uD1A0</b></div><div id="calendar-days" class="calendar-days"></div></div>';
    section.querySelector("#calendar-prev").onclick = () => changeMonth(-1);
    section.querySelector("#calendar-next").onclick = () => changeMonth(1);
    section.querySelector("#schedule-today").onclick = () => {
      const now = /* @__PURE__ */ new Date();
      calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      void loadSchedule();
    };
    void loadSchedule();
  }
  async function changeMonth(amount) {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + amount, 1);
    await loadSchedule();
  }
  async function loadSchedule() {
    const section = document.querySelector("#schedule-management");
    if (!section) return;
    try {
      calendarItems = await scheduleApi(`/api/parish/schedules?month=${monthKey()}`);
      renderCalendar();
    } catch (error) {
      section.querySelector("#calendar-days").textContent = error.message;
    }
  }
  function renderCalendar() {
    document.querySelector("#calendar-title").textContent = `${calendarMonth.getFullYear()}\uB144 ${calendarMonth.getMonth() + 1}\uC6D4`;
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1), start = new Date(firstDay);
    start.setDate(1 - firstDay.getDay());
    const today = dateKey(/* @__PURE__ */ new Date()), days = document.querySelector("#calendar-days");
    days.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = dateKey(day), outside = day.getMonth() !== calendarMonth.getMonth(), items4 = calendarItems.filter((item) => item.scheduleDate === key);
      return `<button class="calendar-day ${outside ? "outside" : ""} ${key === today ? "today" : ""}" data-calendar-date="${key}" type="button"><span>${day.getDate()}</span><div>${items4.slice(0, 3).map((item) => `<em class="${item.category}" title="${escapeSchedule(item.title)}"><i>${categoryLabels[item.category]}</i>${item.startTime ? `${item.startTime} ` : ""}${escapeSchedule(item.title)}</em>`).join("")}${items4.length > 3 ? `<small>+${items4.length - 3}\uAC1C \uB354\uBCF4\uAE30</small>` : ""}</div></button>`;
    }).join("");
    days.querySelectorAll("[data-calendar-date]").forEach((button) => button.onclick = () => openScheduleEditor(button.dataset.calendarDate));
  }
  function openScheduleEditor(date) {
    document.querySelector(".schedule-editor-modal")?.remove();
    const existing = calendarItems.filter((item) => item.scheduleDate === date), layer = document.createElement("div");
    layer.className = "priest-modal schedule-editor-modal";
    layer.innerHTML = `<div class="priest-modal-backdrop" data-schedule-close></div><section class="priest-modal-box"><header><div><p>PARISH SCHEDULE</p><h2>${date} \uC77C\uC815</h2></div><button data-schedule-close type="button">\xD7</button></header><div class="schedule-editor-body"><section class="selected-date-schedules"><h3>\uB4F1\uB85D\uB41C \uC77C\uC815 <span>${existing.length}\uAC1C</span></h3>${existing.length ? existing.map((item) => `<article class="${item.category}"><b>${categoryLabels[item.category]} \xB7 ${item.startTime ?? "\uC2DC\uAC04 \uBBF8\uC815"}${item.endTime ? ` ~ ${item.endTime}` : ""}</b><strong>${escapeSchedule(item.title)}</strong>${item.content ? `<p>${escapeSchedule(item.content)}</p>` : ""}</article>`).join("") : "<p>\uB4F1\uB85D\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>"}</section><form><input name="scheduleDate" type="hidden" value="${date}"><label>\uC77C\uC815 \uAD6C\uBD84<select name="category"><option value="mass">\uBBF8\uC0AC</option><option value="sacrament">\uC131\uC0AC</option><option value="meeting">\uBBF8\uD305</option><option value="other">\uAE30\uD0C0</option></select></label><label>\uC77C\uC815 \uC81C\uBAA9 <i>*</i><input name="title" maxlength="200" required placeholder="\uC77C\uC815 \uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></label><div class="schedule-time"><label>\uC2DC\uC791 \uC2DC\uAC04<input name="startTime" type="time"></label><span>~</span><label>\uC885\uB8CC \uC2DC\uAC04<input name="endTime" type="time"></label></div><label>\uC0C1\uC138 \uB0B4\uC6A9<textarea name="content" rows="5" maxlength="5000" placeholder="\uC7A5\uC18C, \uB300\uC0C1\uC790, \uC900\uBE44\uC0AC\uD56D \uB4F1\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea></label><p class="schedule-form-error"></p><button class="primary" type="submit">\uC77C\uC815 \uB4F1\uB85D</button></form></div><footer><button class="secondary" data-schedule-close type="button">\uB2EB\uAE30</button></footer></section>`;
    document.body.append(layer);
    layer.querySelectorAll("[data-schedule-close]").forEach((element) => element.addEventListener("click", () => layer.remove()));
    layer.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      const form3 = event.currentTarget, error = form3.querySelector(".schedule-form-error"), submit = form3.querySelector('button[type="submit"]');
      error.textContent = "";
      submit.disabled = true;
      try {
        await scheduleApi("/api/parish/schedules", { method: "POST", body: JSON.stringify({ scheduleDate: form3.scheduleDate.value, category: form3.category.value, title: form3.title.value, startTime: form3.startTime.value, endTime: form3.endTime.value, content: form3.content.value }) });
        layer.remove();
        await loadSchedule();
      } catch (reason) {
        error.textContent = reason.message;
        submit.disabled = false;
      }
    };
  }
  function enhanceScheduleTypes() {
    const modal3 = document.querySelector(".schedule-editor-modal"), form3 = modal3?.querySelector("form"), category = form3?.querySelector('[name="category"]');
    modal3?.querySelector(":scope>.priest-modal-box>header p")?.remove();
    if (!modal3 || !form3 || !category || form3.dataset.typeReady) return;
    form3.dataset.typeReady = "true";
    const date = form3.querySelector('[name="scheduleDate"]').value, today = dateKey(/* @__PURE__ */ new Date()), items4 = calendarItems.filter((item) => item.scheduleDate === date);
    if (date < today) {
      const notice4 = document.createElement("section");
      notice4.className = "past-schedule-notice";
      notice4.innerHTML = "<span>\u2713</span><strong>\uC9C0\uB09C \uC77C\uC815\uC785\uB2C8\uB2E4.</strong><p>\uC9C0\uB09C \uB0A0\uC9DC\uC5D0\uB294 \uC0C8 \uC77C\uC815\uC744 \uB4F1\uB85D\uD560 \uC218 \uC5C6\uC73C\uBA70, \uB4F1\uB85D\uB41C \uC77C\uC815\uB9CC \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p>";
      form3.replaceWith(notice4);
    } else {
      category.replaceChildren(new Option("\uBBF8\uC0AC", "mass"), new Option("\uC131\uC0AC", "sacrament"), new Option("\uC2E0\uC2EC", "devotion"), new Option("\uC804\uB840\uB825", "liturgical"), new Option("\uAE30\uD0C0", "other"));
      const label = document.createElement("label"), select = document.createElement("select");
      label.className = "schedule-type-field";
      label.textContent = "\uC138\uBD80 \uC885\uB958";
      select.name = "scheduleType";
      label.append(select);
      category.closest("label").insertAdjacentElement("afterend", label);
      const sync = () => {
        const values = scheduleTypes[category.value] ?? [];
        select.replaceChildren(...values.map((value2) => new Option(value2, value2)));
        label.hidden = !values.length;
        select.required = values.length > 0;
      };
      category.onchange = sync;
      sync();
    }
    modal3.querySelectorAll(".selected-date-schedules article>b").forEach((element, index) => {
      const item = items4[index];
      if (item?.scheduleType) element.textContent = `${categoryLabels[item.category]} \xB7 ${item.scheduleType} \xB7 ${item.startTime ?? "\uC2DC\uAC04 \uBBF8\uC815"}${item.endTime ? ` ~ ${item.endTime}` : ""}`;
    });
  }
  function decorateCalendarTypes() {
    document.querySelectorAll("[data-calendar-date]").forEach((button) => {
      const items4 = calendarItems.filter((item) => item.scheduleDate === button.dataset.calendarDate);
      button.querySelectorAll("em i").forEach((label, index) => {
        const item = items4[index], text = item?.scheduleType ? `${categoryLabels[item.category]}\xB7${item.scheduleType}` : "";
        if (text && label.textContent !== text) label.textContent = text;
      });
    });
  }
  function enhanceScheduleLocation() {
    const modal3 = document.querySelector(".schedule-editor-modal"), form3 = modal3?.querySelector("form");
    if (!modal3 || modal3.dataset.locationReady) return;
    modal3.dataset.locationReady = "true";
    if (form3) {
      const title = form3.querySelector('[name="title"]');
      if (title) {
        const label = document.createElement("label");
        label.textContent = "\uC7A5\uC18C";
        label.innerHTML += ' <input name="location" maxlength="300" placeholder="\uC131\uB2F9, \uD68C\uC758\uC2E4 \uB4F1 \uC7A5\uC18C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.">';
        title.closest("label").insertAdjacentElement("afterend", label);
      }
    }
    const date = form3?.querySelector('[name="scheduleDate"]')?.value ?? modal3.querySelector("h2")?.textContent?.slice(0, 10), items4 = calendarItems.filter((item) => item.scheduleDate === date);
    modal3.querySelectorAll(".selected-date-schedules article").forEach((article, index) => {
      const item = items4[index];
      if (item?.location && !article.querySelector(".schedule-location")) {
        const place = document.createElement("small");
        place.className = "schedule-location";
        place.textContent = `\uC7A5\uC18C \xB7 ${item.location}`;
        article.querySelector("strong").insertAdjacentElement("afterend", place);
      }
    });
  }
  function enhanceScheduleEdits() {
    const modal3 = document.querySelector(".schedule-editor-modal"), form3 = modal3?.querySelector("form");
    if (!modal3 || !form3 || modal3.dataset.editReady) return;
    modal3.dataset.editReady = "true";
    const date = form3.querySelector('[name="scheduleDate"]').value, items4 = calendarItems.filter((item) => item.scheduleDate === date);
    modal3.querySelectorAll(".selected-date-schedules article").forEach((article, index) => {
      const item = items4[index], deadline = (/* @__PURE__ */ new Date(`${item.scheduleDate}T${item.startTime || "23:59"}:00+09:00`)).getTime();
      if (!item || deadline <= Date.now()) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "schedule-edit-button";
      button.textContent = "\uC218\uC815";
      button.onclick = () => {
        const category = form3.querySelector('[name="category"]'), type = form3.querySelector('[name="scheduleType"]');
        category.value = item.category;
        category.dispatchEvent(new Event("change"));
        type.value = item.scheduleType ?? "";
        form3.querySelector('[name="title"]').value = item.title;
        form3.querySelector('[name="location"]').value = item.location ?? "";
        form3.querySelector('[name="startTime"]').value = item.startTime ?? "";
        form3.querySelector('[name="endTime"]').value = item.endTime ?? "";
        form3.querySelector('[name="content"]').value = item.content ?? "";
        form3.querySelector('button[type="submit"]').textContent = "\uC77C\uC815 \uC218\uC815";
        form3.onsubmit = async (event) => {
          event.preventDefault();
          const error = form3.querySelector(".schedule-form-error"), submit = form3.querySelector('button[type="submit"]');
          submit.disabled = true;
          try {
            await scheduleApi(`/api/parish/schedules/${item.id}`, { method: "PATCH", body: JSON.stringify({ scheduleDate: date, category: category.value, scheduleType: type.value, title: form3.querySelector('[name="title"]').value, location: form3.querySelector('[name="location"]').value, startTime: form3.querySelector('[name="startTime"]').value, endTime: form3.querySelector('[name="endTime"]').value, content: form3.querySelector('[name="content"]').value }) });
            modal3.remove();
            await loadSchedule();
          } catch (reason) {
            error.textContent = reason.message;
            submit.disabled = false;
          }
        };
      };
      article.append(button);
    });
  }
  function enhanceLiturgicalImport() {
    const section = document.querySelector("#schedule-management"), header = section?.querySelector(".calendar-header");
    if (!section || !header || header.querySelector(".liturgical-import-button")) return;
    const existing = header.querySelector(".calendar-header-actions"), actions = existing ?? document.createElement("div");
    if (!existing) {
      const today = header.querySelector("#schedule-today");
      actions.className = "calendar-header-actions";
      today.replaceWith(actions);
      actions.append(today);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary liturgical-import-button";
    button.textContent = "2026 \uC804\uB840\uB825 \uAC00\uC838\uC624\uAE30";
    button.onclick = async () => {
      button.disabled = true;
      button.textContent = "\uAC00\uC838\uC624\uB294 \uC911...";
      try {
        const result = await scheduleApi("/api/parish/schedules/import-liturgical-2026", { method: "POST" });
        button.textContent = "\uAC00\uC838\uC624\uAE30 \uC644\uB8CC";
        await loadSchedule();
        window.dispatchEvent(new CustomEvent("parish:notice", { detail: result.message }));
      } catch (error) {
        button.disabled = false;
        button.textContent = "2026 \uC804\uB840\uB825 \uAC00\uC838\uC624\uAE30";
        window.dispatchEvent(new CustomEvent("parish:notice", { detail: error.message }));
      }
    };
    actions.prepend(button);
  }
  function enhanceScheduleAttachments() {
    const modal3 = document.querySelector(".schedule-editor-modal"), form3 = modal3?.querySelector("form");
    if (!modal3 || modal3.dataset.attachmentReady) return;
    modal3.dataset.attachmentReady = "true";
    if (form3) {
      const label = document.createElement("label");
      label.className = "schedule-attachment-field";
      label.innerHTML = '\uCCA8\uBD80\uD30C\uC77C <input name="attachment" type="file"><small>\uCD5C\uB300 5MB, \uD30C\uC77C 1\uAC1C</small>';
      form3.querySelector(".schedule-form-error")?.insertAdjacentElement("beforebegin", label);
    }
    const date = form3?.querySelector('[name="scheduleDate"]')?.value ?? modal3.querySelector("h2")?.textContent?.slice(0, 10), items4 = calendarItems.filter((item) => item.scheduleDate === date);
    modal3.querySelectorAll(".selected-date-schedules article").forEach((article, index) => {
      const item = items4[index];
      if (item?.attachmentName) {
        const link = document.createElement("a");
        link.className = "schedule-attachment-link";
        link.href = `/api/parish/schedules/${item.id}/attachment`;
        link.textContent = `\u{1F4CE} ${item.attachmentName}`;
        article.append(link);
      }
    });
  }
  var draggedSchedule = null;
  var scheduleClipboard = null;
  var selectedCalendarSchedule = null;
  var activeCalendarDate = "";
  function schedulePayload(item, scheduleDate) {
    return { scheduleDate, startTime: item.startTime ?? "", endTime: item.endTime ?? "", category: item.category, scheduleType: item.scheduleType ?? "", title: item.title, location: item.location ?? "", content: item.content ?? "" };
  }
  function calendarNotice(message) {
    window.dispatchEvent(new CustomEvent("parish:notice", { detail: message }));
  }
  async function moveCalendarSchedule(item, targetDate) {
    if (item.scheduleDate === targetDate) return;
    if (targetDate < dateKey(/* @__PURE__ */ new Date())) return calendarNotice("\uC9C0\uB09C \uB0A0\uC9DC\uB85C \uC77C\uC815\uC744 \uC774\uB3D9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    try {
      await scheduleApi(`/api/parish/schedules/${item.id}`, { method: "PATCH", body: JSON.stringify(schedulePayload(item, targetDate)) });
      calendarNotice(`'${item.title}' \uC77C\uC815\uC744 ${targetDate}\uB85C \uC774\uB3D9\uD588\uC2B5\uB2C8\uB2E4.`);
      await loadSchedule();
    } catch (error) {
      calendarNotice(error.message);
      renderCalendar();
    }
  }
  async function pasteCalendarSchedule(targetDate) {
    if (!scheduleClipboard) return;
    try {
      await scheduleApi("/api/parish/schedules", { method: "POST", body: JSON.stringify(schedulePayload(scheduleClipboard, targetDate)) });
      calendarNotice(`'${scheduleClipboard.title}' \uC77C\uC815\uC744 ${targetDate}\uC5D0 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.`);
      await loadSchedule();
    } catch (error) {
      calendarNotice(error.message);
    }
  }
  function enableScheduleCalendarInteractions() {
    const calendar = document.querySelector(".parish-calendar");
    if (!calendar) return;
    calendar.querySelectorAll("[data-calendar-date]").forEach((day) => {
      const date = day.dataset.calendarDate, items4 = calendarItems.filter((item) => item.scheduleDate === date);
      day.onfocus = () => activeCalendarDate = date;
      day.onmouseenter = () => activeCalendarDate = date;
      day.ondragover = (event) => {
        if (!draggedSchedule) return;
        event.preventDefault();
        day.classList.add("schedule-drop-target");
      };
      day.ondragleave = () => day.classList.remove("schedule-drop-target");
      day.ondrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        day.classList.remove("schedule-drop-target");
        const item = draggedSchedule;
        draggedSchedule = null;
        if (item) void moveCalendarSchedule(item, date);
      };
      day.querySelectorAll("em").forEach((event, index) => {
        const item = items4[index];
        if (!item) return;
        event.draggable = true;
        event.tabIndex = 0;
        event.dataset.scheduleId = String(item.id);
        event.title = `${item.title} \xB7 \uB4DC\uB798\uADF8\uD558\uC5EC \uC774\uB3D9 \xB7 \uC120\uD0DD \uD6C4 Ctrl+C\uB85C \uBCF5\uC0AC`;
        event.onclick = (click) => {
          click.preventDefault();
          click.stopPropagation();
          selectedCalendarSchedule = item;
          activeCalendarDate = date;
          calendar.querySelectorAll("em.schedule-selected").forEach((element) => element.classList.remove("schedule-selected"));
          event.classList.add("schedule-selected");
        };
        event.onfocus = () => {
          selectedCalendarSchedule = item;
          activeCalendarDate = date;
        };
        event.ondragstart = (drag) => {
          draggedSchedule = item;
          selectedCalendarSchedule = item;
          drag.dataTransfer?.setData("text/plain", String(item.id));
          if (drag.dataTransfer) drag.dataTransfer.effectAllowed = "move";
          event.classList.add("schedule-dragging");
        };
        event.ondragend = () => {
          draggedSchedule = null;
          event.classList.remove("schedule-dragging");
          calendar.querySelectorAll(".schedule-drop-target").forEach((element) => element.classList.remove("schedule-drop-target"));
        };
      });
    });
  }
  document.addEventListener("keydown", (event) => {
    const section = document.querySelector("#schedule-management");
    if (!section || section.hidden || document.querySelector(".schedule-editor-modal") || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selectedCalendarSchedule) {
      event.preventDefault();
      scheduleClipboard = { ...selectedCalendarSchedule };
      calendarNotice(`'${scheduleClipboard.title}' \uC77C\uC815\uC744 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4. \uBD99\uC5EC\uB123\uC744 \uB0A0\uC9DC\uB97C \uC120\uD0DD\uD558\uACE0 Ctrl+V\uB97C \uB204\uB974\uC138\uC694.`);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && scheduleClipboard && activeCalendarDate) {
      event.preventDefault();
      void pasteCalendarSchedule(activeCalendarDate);
    }
  });
  function addScheduleInteractionHelp() {
    const toolbar = document.querySelector("#schedule-management .calendar-toolbar");
    if (!toolbar || toolbar.nextElementSibling?.classList.contains("schedule-interaction-help")) return;
    toolbar.insertAdjacentHTML("afterend", '<p class="schedule-interaction-help">\uC77C\uC815\uC744 \uC6D0\uD558\uB294 \uB0A0\uC9DC\uB85C \uB04C\uC5B4 \uC774\uB3D9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC77C\uC815 \uC120\uD0DD \u2192 Ctrl+C \u2192 \uB300\uC0C1 \uB0A0\uC9DC \uC704\uC5D0 \uB9C8\uC6B0\uC2A4 \u2192 Ctrl+V\uB85C \uBCF5\uC0AC\uD569\uB2C8\uB2E4.</p>');
  }
  new MutationObserver(() => {
    mountSchedule();
    enhanceLiturgicalImport();
    enhanceScheduleTypes();
    enhanceScheduleLocation();
    enhanceScheduleEdits();
    enhanceScheduleAttachments();
    decorateCalendarTypes();
    enableScheduleCalendarInteractions();
    addScheduleInteractionHelp();
  }).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(mountSchedule);
  document.head.insertAdjacentHTML("beforeend", "<style>.calendar-header{display:flex;align-items:center;justify-content:space-between}.calendar-toolbar{display:flex;align-items:center;justify-content:center;gap:20px;padding:18px}.calendar-toolbar h3{min-width:150px;margin:0;text-align:center}.calendar-toolbar button{width:38px;height:38px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--blue);font-size:25px;cursor:pointer}.parish-calendar{overflow:hidden;border:1px solid var(--line);border-radius:12px}.calendar-week,.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.calendar-week{background:#f5f8fb}.calendar-week b{padding:11px;text-align:center}.calendar-week b:first-child{color:#d54a55}.calendar-week b:last-child{color:#4072c9}.calendar-day{min-height:118px;padding:8px;border:0;border-top:1px solid var(--line);border-right:1px solid var(--line);background:#fff;text-align:left;cursor:pointer}.calendar-day:nth-child(7n){border-right:0}.calendar-day:hover{background:#f5fbf8}.calendar-day.outside{background:#fafbfc;color:#aab2bf}.calendar-day.today>span{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:var(--blue);color:#fff}.calendar-day>div{display:grid;gap:3px;margin-top:6px}.calendar-day em{display:block;overflow:hidden;padding:4px 5px;border-radius:5px;background:#eaf4ff;color:#315b91;font-size:8px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.calendar-day em i{margin-right:4px;font-style:normal;font-weight:800}.calendar-day em.mass{background:#e8f7f1;color:#16775b}.calendar-day em.sacrament{background:#fff3df;color:#9c6a13}.calendar-day em.meeting{background:#f0edff;color:#654ea3}.calendar-day small{color:var(--muted);font-size:8px}.schedule-editor-modal .priest-modal-box{display:flex;width:min(94vw,820px);max-height:90vh;flex-direction:column;overflow:hidden}.schedule-editor-body{display:grid;min-height:0;grid-template-columns:1fr 1fr;gap:18px;padding:22px;overflow-y:auto}.selected-date-schedules h3{margin-top:0}.selected-date-schedules h3 span{color:var(--green);font-size:10px}.selected-date-schedules article{margin-top:8px;padding:11px;border-left:3px solid var(--green);border-radius:7px;background:#f7faf9}.selected-date-schedules article>b,.selected-date-schedules article>strong{display:block}.selected-date-schedules article>strong{margin-top:5px}.selected-date-schedules article p{white-space:pre-wrap}.schedule-editor-body form{display:grid;gap:10px;padding:15px;border-radius:10px;background:#f6f9f8}.schedule-editor-body form label{font-size:11px;font-weight:700}.schedule-editor-body input,.schedule-editor-body select,.schedule-editor-body textarea{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff}.schedule-time{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:7px}.schedule-time span{padding-bottom:11px}.schedule-form-error{margin:0;color:#d94350}.schedule-editor-body form>button{justify-self:center}@media(max-width:760px){.calendar-day{min-height:88px;padding:5px}.calendar-day em i{display:none}.schedule-editor-body{grid-template-columns:1fr}.calendar-week b{padding:8px}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-editor-body>form{grid-column:1;grid-row:1}.schedule-editor-body>.selected-date-schedules{grid-column:2;grid-row:1}@media(max-width:760px){.schedule-editor-body>form,.schedule-editor-body>.selected-date-schedules{grid-column:1;grid-row:auto}.schedule-editor-body>form{order:1}.schedule-editor-body>.selected-date-schedules{order:2}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.calendar-day em.devotion{background:#fff0f5;color:#a74668}.calendar-day em.liturgical{background:#f3edff;color:#684ca0}.schedule-type-field[hidden]{display:none}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-editor-modal .priest-modal-box{display:flex!important;max-height:90vh!important;flex-direction:column!important;overflow:hidden!important}.schedule-editor-modal .priest-modal-box>header{position:static!important;flex:0 0 auto}.schedule-editor-modal .schedule-editor-body{min-height:0!important;flex:1 1 auto!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#9dbbb2 transparent}.schedule-editor-modal .schedule-editor-body::-webkit-scrollbar{width:6px}.schedule-editor-modal .schedule-editor-body::-webkit-scrollbar-thumb{border-radius:6px;background:#9dbbb2}.schedule-editor-modal .priest-modal-box>footer{position:static!important;z-index:2;display:flex;flex:0 0 auto;justify-content:center;padding:12px 20px;border-top:1px solid var(--line);background:#fff;box-shadow:0 -5px 14px rgba(19,63,49,.05)}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-editor-modal .priest-modal-box{height:min(90vh,760px)!important}.schedule-editor-modal .schedule-editor-body{height:0!important;align-content:start}.schedule-editor-modal .schedule-editor-body>form,.schedule-editor-modal .selected-date-schedules{align-self:start}.past-schedule-notice{grid-column:1;grid-row:1;display:flex;min-height:220px;flex-direction:column;align-items:center;justify-content:center;padding:24px;border:1px dashed var(--line);border-radius:10px;background:#f7faf9;color:var(--muted);text-align:center}.past-schedule-notice span{font-size:28px;color:var(--green)}.past-schedule-notice strong{margin-top:10px;color:#344d43}.past-schedule-notice p{max-width:250px;line-height:1.7}@media(max-width:760px){.schedule-editor-modal .priest-modal-box{height:92vh!important}.past-schedule-notice{grid-column:1;grid-row:auto}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-editor-modal .priest-modal-box{height:auto!important;max-height:90vh!important}.schedule-editor-modal .priest-modal-box>header{padding-top:14px!important;padding-bottom:14px!important}.schedule-editor-modal .schedule-editor-body{height:auto!important;max-height:calc(90vh - 120px);gap:12px!important;padding:14px 18px!important}.schedule-editor-modal .schedule-editor-body form{gap:7px!important;padding:11px!important}.schedule-editor-modal .schedule-editor-body input,.schedule-editor-modal .schedule-editor-body select,.schedule-editor-modal .schedule-editor-body textarea{margin-top:3px!important;padding:7px 9px!important}.schedule-editor-modal .schedule-editor-body textarea{max-height:82px;resize:vertical}.schedule-editor-modal .selected-date-schedules h3{margin:0 0 7px}.schedule-editor-modal .selected-date-schedules article{margin-top:5px;padding:8px 10px}.schedule-editor-modal .selected-date-schedules article p{margin:5px 0;line-height:1.5}.schedule-editor-modal .priest-modal-box>footer{padding:8px 18px!important}.schedule-editor-modal .schedule-time span{padding-bottom:8px}.past-schedule-notice{min-height:180px;padding:18px}@media(max-width:760px){.schedule-editor-modal .priest-modal-box{height:auto!important;max-height:92vh!important}.schedule-editor-modal .schedule-editor-body{max-height:calc(92vh - 116px)}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-location{display:block;margin-top:5px;color:var(--green);font-size:9px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-edit-button{display:block;margin:8px 0 0 auto;padding:5px 10px;border:1px solid var(--blue);border-radius:6px;background:#fff;color:var(--blue);font-size:9px;font-weight:700;cursor:pointer}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.calendar-header-actions{display:flex;align-items:center;gap:7px}.liturgical-import-button{height:40px;padding:0 13px;white-space:nowrap}@media(max-width:650px){.calendar-header{align-items:flex-start!important}.calendar-header-actions{flex-direction:column;align-items:stretch}}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.selected-date-schedules article.mass{border-left-color:#16775b;background:#e8f7f1}.selected-date-schedules article.mass>b{color:#16775b}.selected-date-schedules article.sacrament{border-left-color:#c58a22;background:#fff3df}.selected-date-schedules article.sacrament>b{color:#9c6a13}.selected-date-schedules article.liturgical{border-left-color:#8062b5;background:#f3edff}.selected-date-schedules article.liturgical>b{color:#684ca0}.selected-date-schedules article.other{border-left-color:#627ba4;background:#edf2fa}.selected-date-schedules article.other>b{color:#486489}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-attachment-field small{display:block;margin-top:4px;color:var(--muted);font-size:9px}.schedule-attachment-link{display:block;margin-top:7px;color:var(--blue);font-size:10px;font-weight:700;text-decoration:none}.schedule-attachment-link:hover{text-decoration:underline}</style>");
  document.head.insertAdjacentHTML("beforeend", '<style>.calendar-day em[draggable="true"]{cursor:grab;user-select:none}.calendar-day em[draggable="true"]:active{cursor:grabbing}.calendar-day em.schedule-selected{outline:2px solid var(--blue);outline-offset:1px}.calendar-day em.schedule-dragging{opacity:.45}.calendar-day.schedule-drop-target{position:relative;background:#e8f4ff!important;box-shadow:inset 0 0 0 2px var(--blue)}.calendar-day.schedule-drop-target:after{position:absolute;inset:auto 5px 5px;padding:3px;border-radius:5px;background:var(--blue);color:#fff;content:"\uC774 \uB0A0\uC9DC\uB85C \uC774\uB3D9";font-size:8px;font-weight:800;text-align:center;pointer-events:none}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-interaction-help{margin:-5px 18px 12px;padding:8px 11px;border-radius:7px;background:#f1f6fd;color:#5d6f87;font-size:9px;line-height:1.5;text-align:center}</style>");

  // src/client/parish-notices.ts
  var panel = document.querySelector("#notice-management");
  var modal = document.querySelector("#notice-editor-modal");
  var form = document.querySelector("#notice-form");
  var items = [];
  var retained = [];
  var $ = (selector) => document.querySelector(selector);
  function escapeHtml(value2) {
    const div = document.createElement("div");
    div.textContent = value2;
    return div.innerHTML;
  }
  async function api(url, options) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers ?? {} } }), data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."), { errors: data.errors });
    return data;
  }
  function notice(message) {
    window.dispatchEvent(new CustomEvent("parish:notice", { detail: message }));
  }
  document.querySelectorAll("[data-parish-view]").forEach((button) => button.addEventListener("click", async () => {
    if (button.dataset.parishView === "notices") await load();
  }));
  async function load() {
    try {
      items = await api("/api/parish/notices");
      render();
    } catch (error) {
      notice(error.message);
    }
  }
  function render() {
    const list = $("#notice-list");
    list.innerHTML = items.map((item) => `<article class="notice-row"><div class="notice-flags">${item.pinned ? '<span class="is-pinned">\uC0C1\uB2E8 \uACE0\uC815</span>' : ""}${item.popupEnabled ? '<span class="is-popup">\uD31D\uC5C5</span>' : ""}</div><div class="notice-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><small>${new Date(item.updatedAt).toLocaleString("ko-KR")} \xB7 \uCCA8\uBD80 ${item.attachments.length}\uAC1C${item.popupEnabled ? ` \xB7 ${item.popupFrom} ~ ${item.popupTo}` : ""}</small></div><div class="notice-actions"><button data-edit="${item.id}" type="button">\uC218\uC815</button><button data-delete="${item.id}" type="button">\uC0AD\uC81C</button></div></article>`).join("");
    list.querySelectorAll("[data-edit]").forEach((button) => button.onclick = () => open(items.find((item) => item.id === Number(button.dataset.edit))));
    list.querySelectorAll("[data-delete]").forEach((button) => button.onclick = () => remove(Number(button.dataset.delete)));
    $("#notice-count").textContent = `\uCD1D ${items.length}\uAC1C`;
    $("#notice-empty").hidden = items.length > 0;
  }
  function renderRetained() {
    $("#notice-files-current").innerHTML = retained.map((file) => `<span>${escapeHtml(file.name)} <button type="button" data-remove-file="${file.slot}">\xD7</button></span>`).join("");
    document.querySelectorAll("[data-remove-file]").forEach((button) => button.onclick = () => {
      retained = retained.filter((file) => file.slot !== Number(button.dataset.removeFile));
      renderRetained();
    });
  }
  function open(item) {
    form.reset();
    $("#notice-id").setAttribute("value", item ? String(item.id) : "");
    $("#notice-title").value = item?.title ?? "";
    $("#notice-content").value = item?.content ?? "";
    $("#notice-pinned").checked = item?.pinned ?? false;
    $("#notice-popup").checked = item?.popupEnabled ?? false;
    $("#notice-popup-from").value = item?.popupFrom?.slice(0, 10) ?? "";
    $("#notice-popup-to").value = item?.popupTo?.slice(0, 10) ?? "";
    retained = [...item?.attachments ?? []];
    renderRetained();
    togglePeriod();
    $("#notice-editor-title").textContent = item ? "\uACF5\uC9C0\uC0AC\uD56D \uC218\uC815" : "\uACF5\uC9C0\uC0AC\uD56D \uB4F1\uB85D";
    $("#notice-form-error").textContent = "";
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }
  function togglePeriod() {
    const enabled = $("#notice-popup").checked;
    $("#notice-popup-period").hidden = !enabled;
    $("#notice-popup-from").required = enabled;
    $("#notice-popup-to").required = enabled;
  }
  async function fileUpload(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: \uD30C\uC77C\uB2F9 \uCD5C\uB300 \uC6A9\uB7C9\uC740 5MB\uC785\uB2C8\uB2E4.`);
    const data = await new Promise((resolve, reject2) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject2(reader.error);
      reader.readAsDataURL(file);
    });
    return { name: file.name, type: file.type || "application/octet-stream", data };
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = [...$("#notice-files").files ?? []];
    if (retained.length + selected.length > 2) {
      $("#notice-form-error").textContent = "\uCCA8\uBD80\uD30C\uC77C\uC740 \uCD5C\uB300 2\uAC1C\uAE4C\uC9C0 \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
      return;
    }
    try {
      const uploads = [...retained.map((file) => ({ name: file.name, type: file.type, existingSlot: file.slot })), ...await Promise.all(selected.map(fileUpload))];
      const id = $("#notice-id").value, payload = { title: $("#notice-title").value, content: $("#notice-content").value, pinned: $("#notice-pinned").checked, popupEnabled: $("#notice-popup").checked, popupFrom: $("#notice-popup-from").value, popupTo: $("#notice-popup-to").value, attachments: uploads };
      const result = await api(id ? `/api/parish/notices/${id}` : "/api/parish/notices", { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      close();
      await load();
      notice(result.message);
    } catch (error) {
      const failure = error;
      $("#notice-form-error").textContent = failure.errors ? Object.values(failure.errors)[0] ?? failure.message : failure.message;
    }
  });
  async function remove(id) {
    if (!confirm("\uC774 \uACF5\uC9C0\uC0AC\uD56D\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    try {
      const result = await api(`/api/parish/notices/${id}`, { method: "DELETE" });
      await load();
      notice(result.message);
    } catch (error) {
      notice(error.message);
    }
  }
  $("#notice-create").addEventListener("click", () => open(null));
  $("#notice-popup").addEventListener("change", togglePeriod);
  document.querySelectorAll("[data-notice-close]").forEach((element) => element.addEventListener("click", close));

  // src/client/parish-parishioners.ts
  var defaults = [{ key: "name", label: "\uC774\uB984", visible: true, align: "left", frozen: false }, { key: "baptismalName", label: "\uC138\uB840\uBA85", visible: true, align: "left", frozen: false }, { key: "birthDate", label: "\uC0DD\uB144\uC6D4\uC77C", visible: true, align: "center", frozen: false }, { key: "phone", label: "\uC804\uD654\uBC88\uD638", visible: true, align: "center", frozen: false }, { key: "mobile", label: "\uD734\uB300\uC804\uD654", visible: true, align: "center", frozen: false }, { key: "email", label: "\uC774\uBA54\uC77C", visible: true, align: "left", frozen: false }, { key: "fullAddress", label: "\uC8FC\uC18C", visible: true, align: "left", frozen: false }, { key: "groupCount", label: "\uB2E8\uCCB4(\uC218)", visible: true, align: "center", frozen: false }, { key: "missionCount", label: "\uBBF8\uC158", visible: true, align: "center", frozen: false }, { key: "joinedAt", label: "\uAC00\uC785\uC77C", visible: true, align: "center", frozen: false }];
  var storageKey = "paxlink.parishioner-grid.columns";
  var items2 = [];
  var columns = loadColumns();
  var sort = null;
  var panel2 = document.querySelector("#parishioner-management");
  var memberSubnav = document.querySelector("#member-subnav");
  var subnav = document.querySelector(".parish-subnav");
  var information = document.querySelector("#information-management");
  var sharing = document.querySelector("#sharing-management");
  var hideSelectors = ["#parish-profile-form", "#priest-management", "#history-management", "#patron-saint-management", "#administrative-guide-management", "#video-management", "#notice-management"];
  function escapeHtml2(value2) {
    const div = document.createElement("div");
    div.textContent = value2;
    return div.innerHTML;
  }
  function notice2(message) {
    window.dispatchEvent(new CustomEvent("parish:notice", { detail: message }));
  }
  function loadColumns() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      return saved.length === defaults.length ? saved.map((item) => ({ ...item, frozen: Boolean(item.frozen) })) : defaults.map((item) => ({ ...item }));
    } catch {
      return defaults.map((item) => ({ ...item }));
    }
  }
  function value(item, key) {
    if (key === "fullAddress") return `${item.address} ${item.addressDetail ?? ""}`.trim();
    return item[key] ?? "";
  }
  function display(item, key) {
    const raw = value(item, key);
    return key === "birthDate" || key === "joinedAt" ? new Date(String(raw)).toLocaleDateString("ko-KR") : String(raw || "-");
  }
  document.querySelectorAll("[data-main-view]").forEach((button) => button.addEventListener("click", async () => {
    const active = button.dataset.mainView === "parishioners";
    panel2.hidden = !active;
    memberSubnav.hidden = !active;
    if (!active) return;
    document.querySelectorAll("[data-main-view]").forEach((tab) => tab.classList.toggle("active", tab === button));
    hideSelectors.forEach((selector) => document.querySelector(selector).hidden = true);
    information.hidden = true;
    sharing.hidden = true;
    subnav.hidden = true;
    document.querySelector("#profile-approval-status").hidden = true;
    await load2();
  }));
  document.querySelectorAll("[data-member-view]").forEach((button) => button.addEventListener("click", async () => {
    document.querySelectorAll("[data-member-view]").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    const people = button.dataset.memberView === "people";
    document.querySelector("#member-people-view").hidden = !people;
    document.querySelector("#member-groups-view").hidden = people;
    if (people) await load2();
    else await loadGroups();
  }));
  async function load2() {
    const query = document.querySelector("#parishioner-query").value.trim();
    try {
      const response = await fetch(`/api/parish/parishioners?q=${encodeURIComponent(query)}`), data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "\uC2E0\uB3C4 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      items2 = data;
      render2();
    } catch (error) {
      notice2(error.message);
    }
  }
  function render2() {
    const visible = columns.filter((column) => column.visible), ordered = [...items2];
    if (sort) ordered.sort((a, b) => {
      const result = String(value(a, sort.key)).localeCompare(String(value(b, sort.key)), "ko", { numeric: true });
      return sort.direction === "asc" ? result : -result;
    });
    const grid = document.querySelector("#parishioner-grid");
    grid.innerHTML = ordered.length ? `<div class="parishioner-grid-wrap"><table class="parishioner-grid"><thead><tr>${visible.map((column) => `<th data-sort="${column.key}" class="align-${column.align}${column.frozen ? " is-frozen" : ""}${sort?.key === column.key ? ` sort-${sort.direction}` : ""}">${column.label}</th>`).join("")}</tr></thead><tbody>${ordered.map((item) => `<tr>${visible.map((column) => `<td class="align-${column.align}${column.frozen ? " is-frozen" : ""}" title="${escapeHtml2(display(item, column.key))}">${column.key === "name" ? `<strong>${escapeHtml2(display(item, column.key))}</strong>` : escapeHtml2(display(item, column.key))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
    grid.querySelectorAll("[data-sort]").forEach((header) => header.onclick = () => {
      const key = header.dataset.sort;
      sort = { key, direction: sort?.key === key && sort.direction === "asc" ? "desc" : "asc" };
      render2();
    });
    applyFrozenOffsets();
    document.querySelector("#parishioner-count").textContent = `\uCD1D ${items2.length.toLocaleString("ko-KR")}\uBA85`;
    document.querySelector("#parishioner-empty").hidden = items2.length > 0;
  }
  function applyFrozenOffsets() {
    const table = document.querySelector(".parishioner-grid");
    if (!table) return;
    let left = 0;
    [...table.tHead.rows[0].cells].forEach((header, index) => {
      if (!header.classList.contains("is-frozen")) return;
      header.style.left = `${left}px`;
      table.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach((cell) => cell.style.left = `${left}px`);
      left += header.getBoundingClientRect().width;
    });
  }
  function openColumns() {
    let modal3 = document.querySelector("#parishioner-columns-modal");
    if (!modal3) {
      document.body.insertAdjacentHTML("beforeend", `<div id="parishioner-columns-modal" class="priest-modal"><div class="priest-modal-backdrop" data-member-columns-close></div><section class="priest-modal-box member-columns-box" role="dialog" aria-modal="true"><header><div><p>GRID COLUMNS</p><h2>\uC2E0\uB3C4 Grid \uCEEC\uB7FC\uC870\uC815</h2></div><button type="button" data-member-columns-close>\xD7</button></header><div id="member-columns-list" class="member-columns-list"></div><footer><button id="member-columns-reset" class="secondary" type="button">\uCD08\uAE30\uD654</button><button class="secondary" data-member-columns-close type="button">\uCDE8\uC18C</button><button id="member-columns-save" class="primary" type="button">\uC800\uC7A5</button></footer></section></div>`);
      modal3 = document.querySelector("#parishioner-columns-modal");
      modal3.querySelectorAll("[data-member-columns-close]").forEach((element) => element.addEventListener("click", () => {
        modal3.hidden = true;
        document.body.classList.remove("modal-open");
      }));
      document.querySelector("#member-columns-save").addEventListener("click", saveColumns);
      document.querySelector("#member-columns-reset").addEventListener("click", () => {
        columns = defaults.map((item) => ({ ...item }));
        renderColumnRows();
      });
    }
    modal3.hidden = false;
    document.body.classList.add("modal-open");
    renderColumnRows();
  }
  function renderColumnRows() {
    const list = document.querySelector("#member-columns-list");
    list.innerHTML = columns.map((column, index) => `<div class="member-column-row" data-index="${index}"><label class="column-visible"><input type="checkbox" ${column.visible ? "checked" : ""}> ${column.label}</label><div class="column-align" role="radiogroup" aria-label="${column.label} \uC815\uB82C">${["left", "center", "right"].map((align) => `<label title="${align === "left" ? "\uC67C\uCABD" : align === "center" ? "\uAC00\uC6B4\uB370" : "\uC624\uB978\uCABD"}"><input type="radio" name="member-align-${index}" value="${align}" ${column.align === align ? "checked" : ""}><span>${align === "left" ? "\u2261" : align === "center" ? "\u2261" : "\u2261"}</span></label>`).join("")}</div><label class="column-freeze"><input type="checkbox" ${column.frozen ? "checked" : ""}> \uD2C0 \uACE0\uC815</label><button type="button" data-move="up" ${index === 0 ? "disabled" : ""}>\u2191</button><button type="button" data-move="down" ${index === columns.length - 1 ? "disabled" : ""}>\u2193</button></div>`).join("");
    list.querySelectorAll("[data-move]").forEach((button) => button.onclick = () => {
      readColumnRows();
      const index = Number(button.closest("[data-index]").dataset.index), target = button.dataset.move === "up" ? index - 1 : index + 1;
      [columns[index], columns[target]] = [columns[target], columns[index]];
      renderColumnRows();
    });
  }
  function readColumnRows() {
    document.querySelectorAll(".member-column-row").forEach((row) => {
      const column = columns[Number(row.dataset.index)], checks = row.querySelectorAll('input[type="checkbox"]');
      column.visible = checks[0].checked;
      column.frozen = checks[1].checked;
      column.align = row.querySelector('input[type="radio"]:checked').value;
    });
  }
  function saveColumns() {
    readColumnRows();
    if (!columns.some((column) => column.visible)) return notice2("\uD45C\uC2DC\uD560 \uCEEC\uB7FC\uC744 \uD55C \uAC1C \uC774\uC0C1 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
    localStorage.setItem(storageKey, JSON.stringify(columns));
    document.querySelector("#parishioner-columns-modal").hidden = true;
    document.body.classList.remove("modal-open");
    render2();
    notice2("\uC2E0\uB3C4 Grid \uCEEC\uB7FC \uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
  }
  document.querySelector("#parishioner-columns-button").addEventListener("click", openColumns);
  document.querySelector("#parishioner-search-button").addEventListener("click", load2);
  document.querySelector("#parishioner-query").addEventListener("keydown", (event) => {
    if (event.key === "Enter") load2();
  });
  document.querySelector("#parishioner-reset").addEventListener("click", () => {
    document.querySelector("#parishioner-query").value = "";
    sort = null;
    load2();
  });
  new MutationObserver(() => {
    const table = document.querySelector("#parishioner-grid .parishioner-grid"), visible = columns.filter((column) => column.visible), index = visible.findIndex((column) => column.key === "groupCount");
    if (!table || index < 0 || table.dataset.groupsDecorated) return;
    table.dataset.groupsDecorated = "true";
    const ordered = [...items2];
    if (sort) ordered.sort((a, b) => {
      const result = String(value(a, sort.key)).localeCompare(String(value(b, sort.key)), "ko", { numeric: true });
      return sort.direction === "asc" ? result : -result;
    });
    [...table.tBodies[0].rows].forEach((row, rowIndex) => {
      const person = ordered[rowIndex], cell = row.cells[index];
      cell.innerHTML = `<button class="person-group-count" type="button">${person.groupCount.toLocaleString("ko-KR")}\uAC1C</button>`;
      cell.querySelector("button").addEventListener("click", () => openPersonGroups(person));
    });
  }).observe(document.querySelector("#parishioner-grid"), { childList: true, subtree: true });
  new MutationObserver(() => {
    const table = document.querySelector("#parishioner-grid .parishioner-grid"), visible = columns.filter((column) => column.visible), index = visible.findIndex((column) => column.key === "missionCount");
    if (!table || index < 0 || table.dataset.missionsDecorated) return;
    table.dataset.missionsDecorated = "true";
    const ordered = [...items2];
    if (sort) ordered.sort((a, b) => {
      const result = String(value(a, sort.key)).localeCompare(String(value(b, sort.key)), "ko", { numeric: true });
      return sort.direction === "asc" ? result : -result;
    });
    [...table.tBodies[0].rows].forEach((row, rowIndex) => {
      const person = ordered[rowIndex], cell = row.cells[index];
      cell.innerHTML = `<button class="person-mission-count" type="button">${person.missionCount.toLocaleString("ko-KR")}\uAC1C</button>`;
      cell.querySelector("button").addEventListener("click", () => openPersonMissions(person));
    });
  }).observe(document.querySelector("#parishioner-grid"), { childList: true, subtree: true });
  async function openPersonGroups(person) {
    let modal3 = document.querySelector("#person-groups-modal");
    if (!modal3) {
      document.body.insertAdjacentHTML("beforeend", `<div id="person-groups-modal" class="priest-modal"><div class="priest-modal-backdrop" data-person-groups-close></div><section class="priest-modal-box group-members-box"><header><div><p>PARISHIONER GROUPS</p><h2 id="person-groups-title"></h2><small id="person-groups-count"></small></div><button type="button" data-person-groups-close>\xD7</button></header><div id="person-groups-content" class="group-members-content"></div><footer><button class="secondary" data-person-groups-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
      modal3 = document.querySelector("#person-groups-modal");
      modal3.querySelectorAll("[data-person-groups-close]").forEach((el) => el.addEventListener("click", () => {
        modal3.hidden = true;
        document.body.classList.remove("modal-open");
      }));
    }
    modal3.hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#person-groups-title").textContent = `${person.name} \uC18C\uC18D \uB2E8\uCCB4`;
    document.querySelector("#person-groups-content").innerHTML = '<div class="group-members-empty">\uBD88\uB7EC\uC624\uB294 \uC911...</div>';
    try {
      const response = await fetch(`/api/parish/parishioners/${person.id}/groups`), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      document.querySelector("#person-groups-count").textContent = `\uAC00\uC785 \uB2E8\uCCB4 ${result.items.length}\uAC1C`;
      document.querySelector("#person-groups-content").innerHTML = result.items.length ? `<div class="group-members-table-wrap"><table><thead><tr><th>\uC544\uC774\uCF58</th><th>\uB2E8\uCCB4\uBA85(\uAD6D\uBB38)</th><th>\uB2E8\uCCB4\uBA85(\uC601\uBB38)</th><th>\uC815\uAE30\uBBF8\uD305</th><th>\uAC00\uC785\uC77C</th></tr></thead><tbody>${result.items.map((group) => `<tr><td>${group.hasIcon ? `<img class="group-icon" src="/api/parish/groups/${group.id}/icon" alt="">` : "-"}</td><td><strong>${escapeHtml2(group.nameKo)}</strong></td><td>${escapeHtml2(group.nameEn ?? "-")}</td><td>${escapeHtml2(group.regularMeeting || "-")}</td><td>${new Date(group.joinedAt).toLocaleDateString("ko-KR")}</td></tr>`).join("")}</tbody></table></div>` : '<div class="group-members-empty">\uAC00\uC785\uB41C \uB2E8\uCCB4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
    } catch (error) {
      document.querySelector("#person-groups-content").innerHTML = `<div class="group-members-empty">${escapeHtml2(error.message)}</div>`;
    }
  }
  async function openPersonMissions(person) {
    let modal3 = document.querySelector("#person-missions-modal");
    if (!modal3) {
      document.body.insertAdjacentHTML("beforeend", `<div id="person-missions-modal" class="priest-modal"><div class="priest-modal-backdrop" data-person-missions-close></div><section class="priest-modal-box group-members-box"><header><div><p>PARISHIONER MISSIONS</p><h2 id="person-missions-title"></h2><small id="person-missions-count"></small></div><button type="button" data-person-missions-close>\xD7</button></header><div id="person-missions-content" class="group-members-content"></div><footer><button class="secondary" data-person-missions-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
      modal3 = document.querySelector("#person-missions-modal");
      modal3.querySelectorAll("[data-person-missions-close]").forEach((button) => button.addEventListener("click", () => {
        modal3.hidden = true;
        document.body.classList.remove("modal-open");
      }));
    }
    modal3.hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#person-missions-title").textContent = `${person.name} \uCC38\uC5EC \uBBF8\uC158`;
    const content = document.querySelector("#person-missions-content");
    content.innerHTML = '<div class="group-members-empty">\uBD88\uB7EC\uC624\uB294 \uC911...</div>';
    try {
      const response = await fetch(`/api/parish/parishioners/${person.id}/missions`), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      document.querySelector("#person-missions-count").textContent = `\uCC38\uC5EC\uC911 ${result.items.length}\uAC1C`;
      content.innerHTML = result.items.length ? `<div class="group-members-table-wrap"><table><thead><tr><th>\uBBF8\uC158\uBA85</th><th>\uB4F1\uB85D\uC790</th><th>\uBAA8\uC9D1 \uC2DC\uC791\uC77C</th><th>\uBAA8\uC9D1 \uC885\uB8CC\uC77C</th><th>\uCC38\uC5EC \uC2B9\uC778\uC77C</th></tr></thead><tbody>${result.items.map((mission) => `<tr><td><strong>${escapeHtml2(mission.title)}</strong></td><td>${escapeHtml2(mission.authorName ?? "-")}</td><td>${escapeHtml2(mission.applicationFrom ?? "-")}</td><td>${escapeHtml2(mission.applicationTo ?? "-")}</td><td>${escapeHtml2(mission.approvedAt ?? "-")}</td></tr>`).join("")}</tbody></table></div>` : '<div class="group-members-empty">\uCC38\uC5EC \uC911\uC778 \uBBF8\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
    } catch (error) {
      content.innerHTML = `<div class="group-members-empty">${escapeHtml2(error.message)}</div>`;
    }
  }
  var groupStatus = { requested: "\uC2B9\uC778\uC2E0\uCCAD", approved: "\uC2B9\uC778", rejected: "\uBC18\uB824", suspended: "\uC911\uC9C0" };
  var meetingDays = [{ key: "mon", label: "\uC6D4" }, { key: "tue", label: "\uD654" }, { key: "wed", label: "\uC218" }, { key: "thu", label: "\uBAA9" }, { key: "fri", label: "\uAE08" }, { key: "sat", label: "\uD1A0" }, { key: "sun", label: "\uC77C" }];
  function meetingFields() {
    return `<div class="meeting-schedule">${meetingDays.map((day) => `<div data-meeting-day="${day.key}"><label><input type="checkbox"> ${day.label}\uC694\uC77C</label><input class="meeting-from" type="time" disabled><span>~</span><input class="meeting-to" type="time" disabled></div>`).join("")}</div>`;
  }
  function bindMeetingFields(root) {
    root.querySelectorAll("[data-meeting-day]").forEach((row) => {
      const check = row.querySelector('input[type="checkbox"]');
      check.onchange = () => row.querySelectorAll('input[type="time"]').forEach((input) => {
        input.disabled = !check.checked;
        if (!check.checked) input.value = "";
      });
    });
  }
  function readMeetingFields(root) {
    return JSON.stringify([...root.querySelectorAll("[data-meeting-day]")].filter((row) => row.querySelector('input[type="checkbox"]').checked).map((row) => ({ day: row.dataset.meetingDay, from: row.querySelector(".meeting-from").value, to: row.querySelector(".meeting-to").value })));
  }
  function formatMeeting(raw) {
    if (!raw) return "-";
    try {
      return JSON.parse(raw).map((item) => `${meetingDays.find((day) => day.key === item.day)?.label ?? item.day} ${item.from}~${item.to}`).join(", ") || "-";
    } catch {
      return raw;
    }
  }
  async function loadGroups() {
    try {
      const response = await fetch("/api/parish/groups"), groups = await response.json();
      if (!response.ok) throw new Error(groups.message);
      const grid = document.querySelector("#parish-group-grid");
      grid.innerHTML = groups.length ? `<div class="parishioner-grid-wrap"><table class="parishioner-grid group-grid"><thead><tr><th>\uC544\uC774\uCF58</th><th>\uB2E8\uCCB4\uBA85(\uAD6D\uBB38)</th><th>\uB2E8\uCCB4\uBA85(\uC601\uBB38)</th><th>\uBAA8\uC784\uC124\uBA85</th><th>\uC815\uAE30\uBBF8\uD305</th><th>\uC0DD\uC131\uC77C</th><th>\uC2B9\uC778\uC77C</th><th>\uC0C1\uD0DC</th><th>\uC6B4\uC601\uC790</th></tr></thead><tbody>${groups.map((group) => `<tr><td>${group.hasIcon ? `<img class="group-icon" src="/api/parish/groups/${group.id}/icon" alt="">` : "-"}</td><td><strong>${escapeHtml2(group.nameKo)}</strong></td><td>${escapeHtml2(group.nameEn ?? "-")}</td><td title="${escapeHtml2(group.description ?? "")}">${escapeHtml2(group.description ?? "-")}</td><td>${escapeHtml2(group.regularMeeting ?? "-")}</td><td>${new Date(group.createdAt).toLocaleDateString("ko-KR")}</td><td>${group.approvedAt ? new Date(group.approvedAt).toLocaleDateString("ko-KR") : "-"}</td><td><select class="group-status" data-group="${group.id}">${Object.entries(groupStatus).map(([key, label]) => `<option value="${key}" ${group.status === key ? "selected" : ""}>${label}</option>`).join("")}</select></td><td>${escapeHtml2(group.operatorName)}</td></tr>`).join("")}</tbody></table></div>` : "";
      grid.querySelectorAll(".group-status").forEach((select) => select.onchange = () => saveGroupStatus(Number(select.dataset.group), select.value));
      document.querySelector("#parish-group-count").textContent = `\uCD1D ${groups.length}\uAC1C`;
      document.querySelector("#parish-group-empty").hidden = groups.length > 0;
    } catch (error) {
      notice2(error.message);
    }
  }
  async function saveGroupStatus(id, status) {
    try {
      const response = await fetch(`/api/parish/groups/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      notice2(result.message);
      await loadGroups();
    } catch (error) {
      notice2(error.message);
      await loadGroups();
    }
  }
  function openGroupForm() {
    let modal3 = document.querySelector("#parish-group-modal");
    if (!modal3) {
      document.body.insertAdjacentHTML("beforeend", `<div id="parish-group-modal" class="priest-modal"><div class="priest-modal-backdrop" data-group-close></div><section class="priest-modal-box group-form-box"><header><div><p>GROUP</p><h2>\uB2E8\uCCB4 \uC0DD\uC131</h2></div><button type="button" data-group-close>\xD7</button></header><form id="parish-group-form"><div class="group-form"><label>\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0<input id="group-icon" type="file" accept="image/*"></label><label>\uB2E8\uCCB4\uBA85(\uAD6D\uBB38) <i>*</i><input id="group-name-ko" maxlength="200" required></label><label>\uB2E8\uCCB4\uBA85(\uC601\uBB38)<input id="group-name-en" maxlength="300"></label><label>\uC815\uAE30\uBBF8\uD305<input id="group-meeting" maxlength="500" placeholder="\uC608: \uB9E4\uC8FC \uC77C\uC694\uC77C \uC624\uD6C4 2\uC2DC"></label><label class="full">\uBAA8\uC784\uC124\uBA85<textarea id="group-description" rows="6"></textarea></label><p id="group-error" class="full"></p></div><footer><button class="secondary" data-group-close type="button">\uCDE8\uC18C</button><button class="primary" type="submit">\uC0DD\uC131 \uBC0F \uC2B9\uC778</button></footer></form></section></div>`);
      modal3 = document.querySelector("#parish-group-modal");
      modal3.querySelectorAll("[data-group-close]").forEach((el) => el.addEventListener("click", () => {
        modal3.hidden = true;
        document.body.classList.remove("modal-open");
      }));
      document.querySelector("#parish-group-form").addEventListener("submit", saveGroup);
    }
    modal3.hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#parish-group-form").reset();
  }
  async function imageData(file) {
    if (!file) return { iconType: "", iconData: "" };
    if (file.size > 2 * 1024 * 1024) throw new Error("\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0\uB294 2MB\uAE4C\uC9C0 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
    return await new Promise((resolve, reject2) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ iconType: file.type, iconData: String(reader.result).split(",")[1] ?? "" });
      reader.onerror = () => reject2(reader.error);
      reader.readAsDataURL(file);
    });
  }
  async function saveGroup(event) {
    event.preventDefault();
    try {
      const icon = await imageData(document.querySelector("#group-icon").files?.[0] ?? null), payload = { ...icon, nameKo: document.querySelector("#group-name-ko").value, nameEn: document.querySelector("#group-name-en").value, regularMeeting: document.querySelector("#group-meeting").value, description: document.querySelector("#group-description").value }, response = await fetch("/api/parish/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), result = await response.json();
      if (!response.ok) throw new Error(result.errors ? Object.values(result.errors)[0] : result.message);
      document.querySelector("#parish-group-modal").hidden = true;
      document.body.classList.remove("modal-open");
      notice2(result.message);
      await loadGroups();
    } catch (error) {
      document.querySelector("#group-error").textContent = error.message;
    }
  }
  new MutationObserver(() => {
    const input = document.querySelector("#group-meeting");
    if (!input || input.dataset.scheduleReady) return;
    input.dataset.scheduleReady = "true";
    input.hidden = true;
    input.closest("label").classList.add("full");
    input.insertAdjacentHTML("afterend", meetingFields());
    bindMeetingFields(input.closest("label"));
    document.querySelector("#parish-group-form").addEventListener("submit", () => {
      input.value = readMeetingFields(input.closest("label"));
    }, { capture: true });
  }).observe(document.body, { childList: true, subtree: true });
  document.querySelector("#parish-group-create").addEventListener("click", openGroupForm);
  var decoratingGroupGrid = false;
  new MutationObserver(async () => {
    const table = document.querySelector("#parish-group-grid .group-grid");
    if (!table || table.dataset.membersAdded || decoratingGroupGrid) return;
    decoratingGroupGrid = true;
    try {
      const response = await fetch("/api/parish/groups"), groups = await response.json();
      table.dataset.membersAdded = "true";
      const memberHead = document.createElement("th");
      memberHead.textContent = "\uD68C\uC6D0(\uC218)";
      table.tHead.rows[0].insertBefore(memberHead, table.tHead.rows[0].cells[7]);
      const applicationHead = document.createElement("th");
      applicationHead.textContent = "\uAC00\uC785\uC2E0\uCCAD";
      table.tHead.rows[0].insertBefore(applicationHead, table.tHead.rows[0].cells[8]);
      const withdrawalHead = document.createElement("th");
      withdrawalHead.textContent = "\uD0C8\uD1F4\uC694\uCCAD";
      table.tHead.rows[0].insertBefore(withdrawalHead, table.tHead.rows[0].cells[9]);
      [...table.tBodies[0].rows].forEach((row, index) => {
        const group = groups[index], memberCell = row.insertCell(7);
        memberCell.innerHTML = `<button class="group-member-count" type="button">${group.memberCount.toLocaleString("ko-KR")}\uBA85</button>`;
        memberCell.querySelector("button").addEventListener("click", () => openGroupMembers(group));
        const applicationCell = row.insertCell(8);
        applicationCell.innerHTML = `<button class="group-application-count${group.applicationCount ? " has-applications" : ""}" type="button">${group.applicationCount.toLocaleString("ko-KR")}\uBA85</button>`;
        applicationCell.querySelector("button").addEventListener("click", () => openGroupApplications(group));
        const withdrawalCell = row.insertCell(9);
        withdrawalCell.innerHTML = `<button class="group-withdrawal-count${group.withdrawalCount ? " has-withdrawals" : ""}" type="button">${group.withdrawalCount.toLocaleString("ko-KR")}\uBA85</button>`;
        withdrawalCell.querySelector("button").addEventListener("click", () => openParishGroupWithdrawals(group));
      });
    } finally {
      decoratingGroupGrid = false;
    }
  }).observe(document.querySelector("#parish-group-grid"), { childList: true, subtree: true });
  async function openGroupMembers(group) {
    let modal3 = document.querySelector("#group-members-modal");
    if (!modal3) {
      document.body.insertAdjacentHTML("beforeend", `<div id="group-members-modal" class="priest-modal"><div class="priest-modal-backdrop" data-group-members-close></div><section class="priest-modal-box group-members-box"><header><div><p>GROUP MEMBERS</p><h2 id="group-members-title"></h2><small id="group-members-count"></small></div><button type="button" data-group-members-close>\xD7</button></header><div id="group-members-content" class="group-members-content"></div><footer><button class="secondary" data-group-members-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
      modal3 = document.querySelector("#group-members-modal");
      modal3.querySelectorAll("[data-group-members-close]").forEach((el) => el.addEventListener("click", () => {
        modal3.hidden = true;
        document.body.classList.remove("modal-open");
      }));
    }
    modal3.hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#group-members-title").textContent = group.nameKo;
    document.querySelector("#group-members-content").innerHTML = '<div class="group-members-empty">\uBD88\uB7EC\uC624\uB294 \uC911...</div>';
    try {
      const response = await fetch(`/api/parish/groups/${group.id}/members`), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      document.querySelector("#group-members-count").textContent = `\uC18C\uC18D \uD68C\uC6D0 ${result.items.length}\uBA85`;
      document.querySelector("#group-members-content").innerHTML = result.items.length ? `<div class="group-members-table-wrap"><table><thead><tr><th>\uC2E0\uB3C4\uBA85</th><th>\uC138\uB840\uBA85</th><th>\uD734\uB300\uC804\uD654</th><th>\uC774\uBA54\uC77C</th><th>\uAC00\uC785\uC77C</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escapeHtml2(item.name)}</strong></td><td>${escapeHtml2(item.baptismalName ?? "-")}</td><td>${escapeHtml2(item.mobile)}</td><td>${escapeHtml2(item.email)}</td><td>${new Date(item.joinedAt).toLocaleDateString("ko-KR")}</td></tr>`).join("")}</tbody></table></div>` : '<div class="group-members-empty">\uC18C\uC18D\uB41C \uD68C\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
    } catch (error) {
      document.querySelector("#group-members-content").innerHTML = `<div class="group-members-empty">${escapeHtml2(error.message)}</div>`;
    }
  }
  async function openGroupApplications(group) {
    let modal3 = document.querySelector("#group-applications-modal");
    if (!modal3) {
      document.body.insertAdjacentHTML("beforeend", `<div id="group-applications-modal" class="priest-modal"><div class="priest-modal-backdrop" data-group-applications-close></div><section class="priest-modal-box group-members-box"><header><div><p>JOIN APPLICATIONS</p><h2 id="group-applications-title"></h2><small id="group-applications-count"></small></div><button type="button" data-group-applications-close>\xD7</button></header><div id="group-applications-content" class="group-members-content"></div><footer><button class="secondary" data-group-applications-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
      modal3 = document.querySelector("#group-applications-modal");
      modal3.querySelectorAll("[data-group-applications-close]").forEach((el) => el.addEventListener("click", () => {
        modal3.hidden = true;
        document.body.classList.remove("modal-open");
      }));
    }
    modal3.hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#group-applications-title").textContent = `${group.nameKo} \uAC00\uC785 \uC2E0\uCCAD`;
    await renderGroupApplications(group);
  }
  async function openParishGroupWithdrawals(group) {
    let modal3 = document.querySelector("#parish-group-withdrawals-modal");
    if (!modal3) {
      document.body.insertAdjacentHTML("beforeend", `<div id="parish-group-withdrawals-modal" class="priest-modal"><div class="priest-modal-backdrop" data-parish-withdrawals-close></div><section class="priest-modal-box group-members-box"><header><div><p>WITHDRAWAL REQUESTS</p><h2 id="parish-group-withdrawals-title"></h2><small id="parish-group-withdrawals-count"></small></div><button type="button" data-parish-withdrawals-close>\xD7</button></header><div id="parish-group-withdrawals-content" class="group-members-content"></div><footer><button class="secondary" data-parish-withdrawals-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
      modal3 = document.querySelector("#parish-group-withdrawals-modal");
      modal3.querySelectorAll("[data-parish-withdrawals-close]").forEach((button) => button.addEventListener("click", () => {
        modal3.hidden = true;
        document.body.classList.remove("modal-open");
      }));
    }
    modal3.hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#parish-group-withdrawals-title").textContent = `${group.nameKo} \uD0C8\uD1F4 \uC694\uCCAD`;
    const content = document.querySelector("#parish-group-withdrawals-content");
    content.innerHTML = '<div class="group-members-empty">\uBD88\uB7EC\uC624\uB294 \uC911...</div>';
    try {
      const response = await fetch(`/api/parish/groups/${group.id}/withdrawals`), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      document.querySelector("#parish-group-withdrawals-count").textContent = `\uD0C8\uD1F4 \uC2B9\uC778 \uB300\uAE30 ${result.items.length}\uBA85`;
      content.innerHTML = result.items.length ? `<div class="group-members-table-wrap"><table><thead><tr><th>\uD68C\uC6D0\uBA85</th><th>\uC138\uB840\uBA85</th><th>\uD734\uB300\uC804\uD654</th><th>\uC774\uBA54\uC77C</th><th>\uD0C8\uD1F4 \uC0AC\uC720</th><th>\uD0C8\uD1F4 \uC694\uCCAD\uC77C</th><th>\uACB0\uC815</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escapeHtml2(item.name)}</strong></td><td>${escapeHtml2(item.baptismalName ?? "-")}</td><td>${escapeHtml2(item.mobile ?? "-")}</td><td>${escapeHtml2(item.email)}</td><td class="withdrawal-request-reason">${escapeHtml2(item.requestReason ?? "-")}</td><td>${new Date(item.requestedAt).toLocaleString("ko-KR")}</td><td><div class="application-actions"><button data-withdrawal-decision="rejected" data-withdrawal-id="${item.id}" type="button">\uBC18\uB824</button><button data-withdrawal-decision="approved" data-withdrawal-id="${item.id}" type="button">\uC2B9\uC778</button></div></td></tr>`).join("")}</tbody></table></div>` : '<div class="group-members-empty">\uB300\uAE30 \uC911\uC778 \uD0C8\uD1F4 \uC694\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
      content.querySelectorAll("[data-withdrawal-decision]").forEach((button) => button.onclick = () => decideParishGroupWithdrawal(group, Number(button.dataset.withdrawalId), button.dataset.withdrawalDecision));
    } catch (error) {
      content.innerHTML = `<div class="group-members-empty">${escapeHtml2(error.message)}</div>`;
    }
  }
  function requestParishWithdrawalDecision(decision) {
    return new Promise((resolve) => {
      const rejecting = decision === "rejected", layer = document.createElement("div");
      layer.className = "priest-modal withdrawal-decision-modal";
      layer.innerHTML = `<div class="priest-modal-backdrop" data-withdrawal-cancel></div><section class="priest-modal-box withdrawal-decision-box"><header><div><p>WITHDRAWAL DECISION</p><h2>\uD0C8\uD1F4 \uC694\uCCAD ${rejecting ? "\uBC18\uB824" : "\uC2B9\uC778"}</h2></div><button data-withdrawal-cancel type="button">\xD7</button></header><div class="withdrawal-decision-body">${rejecting ? '<label>\uBC18\uB824 \uC0AC\uC720 <i>*</i><textarea maxlength="1000" rows="6" placeholder="\uD68C\uC6D0\uC5D0\uAC8C \uC804\uB2EC\uD560 \uBC18\uB824 \uC0AC\uC720\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label>' : "<strong>\uD68C\uC6D0\uC758 \uB2E8\uCCB4 \uD0C8\uD1F4 \uC694\uCCAD\uC744 \uC2B9\uC778\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</strong><p>\uC2B9\uC778 \uC989\uC2DC \uD574\uB2F9 \uD68C\uC6D0\uC758 \uB2E8\uCCB4 \uC18C\uC18D\uC774 \uD574\uC81C\uB429\uB2C8\uB2E4.</p>"}</div><footer><button class="secondary" data-withdrawal-cancel type="button">\uCDE8\uC18C</button><button class="${rejecting ? "danger-button" : "primary"}" data-withdrawal-confirm type="button" ${rejecting ? "disabled" : ""}>${rejecting ? "\uBC18\uB824 \uD655\uC815" : "\uD0C8\uD1F4 \uC2B9\uC778"}</button></footer></section>`;
      document.body.append(layer);
      const finish = (value2) => {
        layer.remove();
        resolve(value2);
      };
      layer.querySelectorAll("[data-withdrawal-cancel]").forEach((button) => button.addEventListener("click", () => finish(null)));
      const confirm2 = layer.querySelector("[data-withdrawal-confirm]"), textarea = layer.querySelector("textarea");
      if (textarea) textarea.oninput = () => confirm2.disabled = !textarea.value.trim();
      confirm2.onclick = () => {
        const value2 = textarea?.value.trim() ?? "approved";
        if (!value2) return;
        finish(value2);
      };
    });
  }
  async function decideParishGroupWithdrawal(group, id, decision) {
    const result = await requestParishWithdrawalDecision(decision);
    if (result === null) return;
    try {
      const response = await fetch(`/api/parish/groups/${group.id}/withdrawals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reason: decision === "rejected" ? result : "" }) }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      notice2(data.message);
      await openParishGroupWithdrawals(group);
      await loadGroups();
    } catch (error) {
      notice2(error.message);
    }
  }
  async function renderGroupApplications(group) {
    const content = document.querySelector("#group-applications-content");
    content.innerHTML = '<div class="group-members-empty">\uBD88\uB7EC\uC624\uB294 \uC911...</div>';
    try {
      const response = await fetch(`/api/parish/groups/${group.id}/applications`), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      document.querySelector("#group-applications-count").textContent = `\uC2B9\uC778 \uB300\uAE30 ${result.items.length}\uBA85`;
      content.innerHTML = result.items.length ? `<div class="group-members-table-wrap"><table><thead><tr><th>\uC2E0\uB3C4\uBA85</th><th>\uC138\uB840\uBA85</th><th>\uC0DD\uB144\uC6D4\uC77C</th><th>\uD734\uB300\uC804\uD654</th><th>\uC774\uBA54\uC77C</th><th>\uAC00\uC785 \uBA54\uC2DC\uC9C0</th><th>\uC2E0\uCCAD\uC77C</th><th>\uACB0\uC815</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escapeHtml2(item.name)}</strong></td><td>${escapeHtml2(item.baptismalName ?? "-")}</td><td>${new Date(item.birthDate).toLocaleDateString("ko-KR")}</td><td>${escapeHtml2(item.mobile)}</td><td>${escapeHtml2(item.email)}</td><td class="group-application-message">${escapeHtml2(item.applicationMessage ?? "-")}</td><td>${new Date(item.requestedAt).toLocaleString("ko-KR")}</td><td><div class="application-actions"><button data-decision="approved" data-application="${item.applicationId}" type="button">\uC2B9\uC778</button><button data-decision="rejected" data-application="${item.applicationId}" type="button">\uBC18\uB824</button></div></td></tr>`).join("")}</tbody></table></div>` : '<div class="group-members-empty">\uB300\uAE30 \uC911\uC778 \uAC00\uC785 \uC2E0\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
      content.querySelectorAll("[data-decision]").forEach((button) => button.onclick = () => decideGroupApplication(group, Number(button.dataset.application), button.dataset.decision));
    } catch (error) {
      content.innerHTML = `<div class="group-members-empty">${escapeHtml2(error.message)}</div>`;
    }
  }
  function requestRejectionReason() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "priest-modal rejection-reason-modal";
      layer.innerHTML = `<div class="priest-modal-backdrop"></div><section class="priest-modal-box rejection-reason-box" role="dialog" aria-modal="true" aria-labelledby="rejection-reason-title"><header><div><p>REJECT APPLICATION</p><h2 id="rejection-reason-title">\uAC00\uC785 \uC2E0\uCCAD \uBC18\uB824</h2></div><button type="button" data-rejection-cancel aria-label="\uB2EB\uAE30">\xD7</button></header><div class="rejection-reason-body"><div class="rejection-guide"><strong>\uBC18\uB824 \uC0AC\uC720\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694.</strong><p>\uC791\uC131\uD55C \uB0B4\uC6A9\uC740 \uAC00\uC785 \uC2E0\uCCAD\uC790\uC5D0\uAC8C \uADF8\uB300\uB85C \uC804\uB2EC\uB429\uB2C8\uB2E4.</p></div><label for="rejection-reason-text">\uBC18\uB824 \uC0AC\uC720 <i>*</i></label><textarea id="rejection-reason-text" maxlength="1000" rows="7" placeholder="\uC2E0\uCCAD\uC744 \uBC18\uB824\uD558\uB294 \uC0AC\uC720\uB97C \uAD6C\uCCB4\uC801\uC73C\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea><div><p id="rejection-reason-error"></p><span id="rejection-reason-count">0 / 1,000</span></div></div><footer><button class="secondary" data-rejection-cancel type="button">\uCDE8\uC18C</button><button id="rejection-reason-submit" class="danger-button" type="button" disabled>\uBC18\uB824 \uD655\uC815</button></footer></section>`;
      document.body.append(layer);
      const textarea = layer.querySelector("textarea"), submit = layer.querySelector("#rejection-reason-submit"), error = layer.querySelector("#rejection-reason-error"), finish = (value2) => {
        layer.remove();
        resolve(value2);
      };
      layer.querySelectorAll("[data-rejection-cancel]").forEach((button) => button.addEventListener("click", () => finish(null)));
      textarea.addEventListener("input", () => {
        layer.querySelector("#rejection-reason-count").textContent = `${textarea.value.length.toLocaleString()} / 1,000`;
        submit.disabled = !textarea.value.trim();
        error.textContent = "";
      });
      submit.addEventListener("click", () => {
        const value2 = textarea.value.trim();
        if (!value2) return;
        finish(value2);
      });
      setTimeout(() => textarea.focus());
    });
  }
  function requestGroupApproval() {
    return new Promise((resolve) => {
      const layer = document.createElement("div");
      layer.className = "priest-modal group-approval-modal";
      layer.innerHTML = `<div class="priest-modal-backdrop" data-approval-cancel></div><section class="priest-modal-box group-approval-box" role="dialog" aria-modal="true" aria-labelledby="group-approval-title"><header><div><p>APPROVE APPLICATION</p><h2 id="group-approval-title">\uB2E8\uCCB4 \uAC00\uC785 \uC2B9\uC778</h2></div><button type="button" data-approval-cancel aria-label="\uB2EB\uAE30">\xD7</button></header><div class="group-approval-body"><span>\u2713</span><strong>\uB2E8\uCCB4 \uAC00\uC785\uC744 \uC2B9\uC778\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</strong><p>\uC2B9\uC778\uD558\uBA74 \uC2E0\uCCAD\uC790\uB294 \uD574\uB2F9 \uB2E8\uCCB4\uC758 \uD68C\uC6D0\uC73C\uB85C \uB4F1\uB85D\uB429\uB2C8\uB2E4.</p></div><footer><button class="secondary" data-approval-cancel type="button">\uCDE8\uC18C</button><button class="primary" data-approval-confirm type="button">\uAC00\uC785 \uC2B9\uC778</button></footer></section>`;
      document.body.append(layer);
      const finish = (approved) => {
        layer.remove();
        resolve(approved);
      };
      layer.querySelectorAll("[data-approval-cancel]").forEach((button) => button.addEventListener("click", () => finish(false)));
      layer.querySelector("[data-approval-confirm]").addEventListener("click", () => finish(true));
    });
  }
  async function decideGroupApplication(group, applicationId, decision) {
    let reason = "";
    if (decision === "rejected") {
      const input = await requestRejectionReason();
      if (input === null) return;
      reason = input;
    } else if (!await requestGroupApproval()) return;
    try {
      const response = await fetch(`/api/parish/groups/${group.id}/applications/${applicationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reason }) }), result = await response.json();
      if (!response.ok) throw new Error(result.message);
      notice2(result.message);
      await renderGroupApplications(group);
      await loadGroups();
    } catch (error) {
      notice2(error.message);
    }
  }
  function openGroupManagement(group) {
    document.querySelector("#parish-group-management-modal")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div id="parish-group-management-modal" class="priest-modal"><div class="priest-modal-backdrop" data-group-manage-close></div><section class="priest-modal-box group-management-box"><header><div><p>GROUP MANAGEMENT</p><h2>\uBAA8\uC784 \uAD00\uB9AC</h2><small>${escapeHtml2(group.operatorName)} \uC6B4\uC601</small></div><button type="button" data-group-manage-close>\xD7</button></header><form id="parish-group-management-form"><div class="group-management-body"><label>\uC544\uC774\uCF58 \uC774\uBBF8\uC9C0<input name="icon" type="file" accept="image/*"></label><label>* \uBAA8\uC784\uBA85(\uAD6D\uBB38)<input name="nameKo" maxlength="200" required value="${escapeHtml2(group.nameKo)}"></label><label>\uBAA8\uC784\uBA85(\uC601\uBB38)<input name="nameEn" maxlength="300" value="${escapeHtml2(group.nameEn ?? "")}"></label><label>\uC6B4\uC601\uC790<input value="${escapeHtml2(group.operatorName)}" readonly></label><label>\uC0C1\uD0DC<select name="status">${Object.entries(groupStatus).map(([key, label]) => `<option value="${key}" ${group.status === key ? "selected" : ""}>${label}</option>`).join("")}</select></label><div class="full group-management-meeting"><strong>\uC815\uAE30\uBBF8\uD305</strong>${meetingFields()}</div><label class="full">\uBAA8\uC784\uC124\uBA85<textarea name="description" rows="5">${escapeHtml2(group.description ?? "")}</textarea></label><p class="full"></p><div class="full group-management-links"><button type="button" data-group-manage-members>\uD68C\uC6D0 ${group.memberCount}\uBA85</button><button type="button" data-group-manage-applications>\uAC00\uC785\uC2E0\uCCAD ${group.applicationCount}\uBA85</button><button type="button" data-group-manage-withdrawals>\uD0C8\uD1F4\uC694\uCCAD ${group.withdrawalCount}\uBA85</button></div></div><footer><button class="secondary" data-group-manage-close type="button">\uCDE8\uC18C</button><button class="primary" type="submit">\uC800\uC7A5</button></footer></form></section></div>`);
    document.body.classList.add("modal-open");
    const modal3 = document.querySelector("#parish-group-management-modal"), form3 = modal3.querySelector("form"), close2 = () => {
      modal3.remove();
      document.body.classList.remove("modal-open");
    };
    modal3.querySelectorAll("[data-group-manage-close]").forEach((button) => button.addEventListener("click", close2));
    bindMeetingFields(modal3);
    try {
      const values = JSON.parse(group.regularMeeting ?? "[]");
      values.forEach((value2) => {
        const row = modal3.querySelector(`[data-meeting-day="${value2.day}"]`);
        if (!row) return;
        const check = row.querySelector('input[type="checkbox"]');
        check.checked = true;
        row.querySelectorAll('input[type="time"]').forEach((input, index) => {
          input.disabled = false;
          input.value = index === 0 ? value2.from : value2.to;
        });
      });
    } catch {
    }
    modal3.querySelector("[data-group-manage-members]").onclick = () => {
      close2();
      void openGroupMembers(group);
    };
    modal3.querySelector("[data-group-manage-applications]").onclick = () => {
      close2();
      void openGroupApplications(group);
    };
    modal3.querySelector("[data-group-manage-withdrawals]").onclick = () => {
      close2();
      void openParishGroupWithdrawals(group);
    };
    form3.onsubmit = async (event) => {
      event.preventDefault();
      const submit = form3.querySelector('button[type="submit"]'), error = form3.querySelector(".group-management-body>p"), file = form3.elements.namedItem("icon").files?.[0];
      submit.disabled = true;
      error.textContent = "";
      try {
        const icon = await imageData(file ?? null), response = await fetch(`/api/parish/groups/${group.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...icon, nameKo: form3.elements.namedItem("nameKo").value, nameEn: form3.elements.namedItem("nameEn").value, status: form3.elements.namedItem("status").value, description: form3.elements.namedItem("description").value, regularMeeting: readMeetingFields(form3) }) }), result = await response.json();
        if (!response.ok) throw new Error(result.errors ? Object.values(result.errors)[0] : result.message);
        close2();
        notice2(result.message);
        await loadGroups();
      } catch (reason) {
        error.textContent = reason.message;
        submit.disabled = false;
      }
    };
  }
  var decoratingGroupManagementRows = false;
  async function decorateGroupManagementRows() {
    const table = document.querySelector("#parish-group-grid .group-grid");
    if (!table || decoratingGroupManagementRows || table.dataset.managementReady) return;
    decoratingGroupManagementRows = true;
    try {
      const response = await fetch("/api/parish/groups"), groups = await response.json();
      if (!response.ok) return;
      table.dataset.managementReady = "true";
      [...table.tBodies[0].rows].forEach((row, index) => {
        const group = groups[index];
        if (!group) return;
        row.classList.add("group-management-row");
        row.tabIndex = 0;
        const open2 = (event) => {
          if (event.target.closest("button,select,a,input")) return;
          openGroupManagement(group);
        };
        row.onclick = open2;
        row.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open2(event);
          }
        };
      });
    } finally {
      decoratingGroupManagementRows = false;
    }
  }
  new MutationObserver(() => void decorateGroupManagementRows()).observe(document.querySelector("#parish-group-grid"), { childList: true, subtree: true });
  async function openAdminGroupContents(group, type) {
    document.querySelector("#admin-group-content-modal")?.remove();
    const label = type === "notice" ? "\uACF5\uC9C0\uC0AC\uD56D" : "\uAC8C\uC2DC\uD310";
    document.body.insertAdjacentHTML("beforeend", `<div id="admin-group-content-modal" class="priest-modal"><div class="priest-modal-backdrop" data-admin-content-close></div><section class="priest-modal-box admin-group-content-box"><header><div><p>GROUP CONTENT</p><h2>${escapeHtml2(group.nameKo)} \xB7 ${label} \uAD00\uB9AC</h2></div><button type="button" data-admin-content-close>\xD7</button></header><div class="admin-group-content-body"><form><input name="contentId" type="hidden"><label>* \uC81C\uBAA9<input name="title" maxlength="200" required placeholder="\uC81C\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></label><label>* \uB0B4\uC6A9<textarea name="content" maxlength="20000" rows="5" required placeholder="\uB0B4\uC6A9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694"></textarea></label><p></p><div><button class="secondary" data-admin-content-reset type="button">\uC0C8 \uAE00</button><button class="primary" type="submit">\uB4F1\uB85D</button></div></form><section><h3>\uB4F1\uB85D \uBAA9\uB85D</h3><div class="admin-group-content-list">\uBD88\uB7EC\uC624\uB294 \uC911...</div></section></div><footer><button class="secondary" data-admin-content-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
    document.body.classList.add("modal-open");
    const modal3 = document.querySelector("#admin-group-content-modal"), form3 = modal3.querySelector("form"), list = modal3.querySelector(".admin-group-content-list"), close2 = () => {
      modal3.remove();
      document.body.classList.remove("modal-open");
    }, reset = () => {
      form3.reset();
      form3.elements.namedItem("contentId").value = "";
      form3.querySelector('button[type="submit"]').textContent = "\uB4F1\uB85D";
      form3.querySelector("p").textContent = "";
    };
    modal3.querySelectorAll("[data-admin-content-close]").forEach((button) => button.addEventListener("click", close2));
    modal3.querySelector("[data-admin-content-reset]").onclick = reset;
    const load5 = async () => {
      const response = await fetch(`/api/parish/groups/${group.id}/contents?type=${type}`), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      list.innerHTML = data.items.length ? data.items.map((item) => `<article><header><div><strong>${escapeHtml2(item.title)}</strong><small>${escapeHtml2(item.authorName)} \xB7 ${new Date(item.createdAt).toLocaleString("ko-KR")}</small></div><div><button data-content-edit="${item.id}" type="button">\uC218\uC815</button><button data-content-delete="${item.id}" type="button">\uC0AD\uC81C</button></div></header><p>${escapeHtml2(item.content)}</p></article>`).join("") : `<div class="group-members-empty">\uB4F1\uB85D\uB41C ${label}\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`;
      list.querySelectorAll("[data-content-edit]").forEach((button) => button.onclick = () => {
        const item = data.items.find((value2) => value2.id === Number(button.dataset.contentEdit));
        if (!item) return;
        form3.elements.namedItem("contentId").value = String(item.id);
        form3.elements.namedItem("title").value = item.title;
        form3.elements.namedItem("content").value = item.content;
        form3.querySelector('button[type="submit"]').textContent = "\uC218\uC815 \uC800\uC7A5";
        form3.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      list.querySelectorAll("[data-content-delete]").forEach((button) => button.onclick = async () => {
        if (!window.confirm("\uC774 \uAC8C\uC2DC\uBB3C\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
        const response2 = await fetch(`/api/parish/groups/${group.id}/contents/${button.dataset.contentDelete}`, { method: "DELETE" }), result = await response2.json();
        if (!response2.ok) throw new Error(result.message);
        reset();
        await load5();
      });
    };
    form3.onsubmit = async (event) => {
      event.preventDefault();
      const id = form3.elements.namedItem("contentId").value, title = form3.elements.namedItem("title").value, content = form3.elements.namedItem("content").value, submit = form3.querySelector('button[type="submit"]'), error = form3.querySelector("p");
      submit.disabled = true;
      error.textContent = "";
      try {
        const response = await fetch(id ? `/api/parish/groups/${group.id}/contents/${id}` : `/api/parish/groups/${group.id}/contents`, { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, title, content }) }), result = await response.json();
        if (!response.ok) throw new Error(result.message);
        reset();
        await load5();
      } catch (reason) {
        error.textContent = reason.message;
      } finally {
        submit.disabled = false;
      }
    };
    void load5().catch((error) => list.textContent = error.message);
  }
  var decoratingGroupContentColumns = false;
  async function decorateGroupContentColumns() {
    const table = document.querySelector("#parish-group-grid .group-grid");
    if (!table || table.dataset.contentColumnsReady || decoratingGroupContentColumns) return;
    decoratingGroupContentColumns = true;
    try {
      const response = await fetch("/api/parish/groups"), groups = await response.json();
      if (!response.ok) return;
      table.dataset.contentColumnsReady = "true";
      ["\uACF5\uC9C0\uC0AC\uD56D", "\uAC8C\uC2DC\uD310"].forEach((label) => {
        const th = document.createElement("th");
        th.textContent = label;
        table.tHead.rows[0].append(th);
      });
      [...table.tBodies[0].rows].forEach((row, index) => {
        const group = groups[index];
        if (!group) return;
        ["notice", "board"].forEach((type) => {
          const cell = row.insertCell(), button = document.createElement("button");
          button.type = "button";
          button.className = "group-content-manage-button";
          button.textContent = "\uAD00\uB9AC";
          button.onclick = (event) => {
            event.stopPropagation();
            void openAdminGroupContents(group, type);
          };
          cell.append(button);
        });
      });
    } finally {
      decoratingGroupContentColumns = false;
    }
  }
  new MutationObserver(() => void decorateGroupContentColumns()).observe(document.querySelector("#parish-group-grid"), { childList: true, subtree: true });
  function applyGroupSearch() {
    const view = document.querySelector("#member-groups-view"), operatorQuery = view?.querySelector("#parish-group-operator-query")?.value.trim().toLocaleLowerCase("ko-KR") ?? "", nameQuery = view?.querySelector("#parish-group-name-query")?.value.trim().toLocaleLowerCase("ko-KR") ?? "", table = view?.querySelector("#parish-group-grid .group-grid"), operatorIndex = table ? [...table.tHead.rows[0].cells].findIndex((cell) => cell.textContent?.trim() === "\uC6B4\uC601\uC790") : -1, rows = [...table?.tBodies[0]?.rows ?? []];
    rows.forEach((row) => {
      const name = [row.cells[1]?.textContent, row.cells[2]?.textContent].join(" ").toLocaleLowerCase("ko-KR"), operator = operatorIndex >= 0 ? row.cells[operatorIndex]?.textContent?.toLocaleLowerCase("ko-KR") ?? "" : "", hidden = Boolean(operatorQuery) && !operator.includes(operatorQuery) || Boolean(nameQuery) && !name.includes(nameQuery);
      if (row.hidden !== hidden) row.hidden = hidden;
    });
    const visible = rows.filter((row) => !row.hidden).length, count = document.querySelector("#parish-group-count"), text = `\uCD1D ${visible}\uAC1C`;
    if (rows.length && count?.textContent !== text) count.textContent = text;
  }
  function formatGroupMeetingCells() {
    document.querySelectorAll("#parish-group-grid .group-grid tbody tr td:nth-child(5):not([data-meeting-formatted])").forEach((cell) => {
      cell.dataset.meetingFormatted = "true";
      cell.textContent = formatMeeting(cell.textContent);
    });
  }
  new MutationObserver(formatGroupMeetingCells).observe(document.querySelector("#parish-group-grid"), { childList: true, subtree: true });
  function mountGroupSearch() {
    const view = document.querySelector("#member-groups-view"), header = view?.querySelector(":scope>header");
    if (!view || !header) return;
    view.querySelectorAll(".grid-reload-toolbar,.grid-reload-button").forEach((element) => element.remove());
    header.classList.add("group-management-header");
    if (view.querySelector("#parish-group-search")) return;
    header.insertAdjacentHTML("afterend", '<div id="parish-group-search" class="parish-group-search"><input id="parish-group-operator-query" type="search" placeholder="\uC6B4\uC601\uC790" aria-label="\uC6B4\uC601\uC790 \uC870\uD68C"><input id="parish-group-name-query" type="search" placeholder="\uBAA8\uC784\uBA85" aria-label="\uBAA8\uC784\uBA85 \uC870\uD68C"><button id="parish-group-query" type="button">\uC870\uD68C</button><button id="parish-group-reset" type="button">\uCD08\uAE30\uD654</button></div>');
    const query = () => applyGroupSearch();
    view.querySelector("#parish-group-query").onclick = query;
    view.querySelectorAll("#parish-group-operator-query,#parish-group-name-query").forEach((input) => input.onkeydown = (event) => {
      if (event.key === "Enter") query();
    });
    view.querySelector("#parish-group-reset").onclick = () => {
      view.querySelectorAll("#parish-group-operator-query,#parish-group-name-query").forEach((input) => input.value = "");
      applyGroupSearch();
    };
  }
  var groupViewObserver = new MutationObserver(() => {
    mountGroupSearch();
    applyGroupSearch();
  });
  groupViewObserver.observe(document.querySelector("#member-groups-view"), { childList: true, subtree: true });
  mountGroupSearch();
  function applyParishGroupTerminology(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.matches("script,style")) continue;
      const current = node.textContent ?? "";
      if (current.includes("\uB2E8\uCCB4")) node.textContent = current.replaceAll("\uB2E8\uCCB4", "\uBAA8\uC784");
    }
  }
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => applyParishGroupTerminology(node)))).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(() => applyParishGroupTerminology());

  // src/client/parish-missions.ts
  function confirmAdminMissionAnswer() {
    return new Promise((resolve) => {
      document.querySelector("#mission-answer-confirm-modal")?.remove();
      document.body.insertAdjacentHTML("beforeend", '<div id="mission-answer-confirm-modal" class="priest-modal"><div class="priest-modal-backdrop" data-admin-answer-confirm="false"></div><section class="priest-modal-box mission-answer-confirm-box"><header><div><p>MISSION Q&amp;A</p><h2>\uB2F5\uBCC0 \uB4F1\uB85D</h2></div></header><div class="mission-answer-confirm-body">\uB2F5\uC7A5\uC744 \uBCF4\uB0B4\uC2DC\uACA0\uC2B5\uB2C8\uAE4C</div><footer><button class="secondary" type="button" data-admin-answer-confirm="false">\uCDE8\uC18C</button><button class="primary" type="button" data-admin-answer-confirm="true">\uD655\uC778</button></footer></section></div>');
      document.querySelectorAll("[data-admin-answer-confirm]").forEach((button) => button.onclick = () => {
        document.querySelector("#mission-answer-confirm-modal")?.remove();
        resolve(button.dataset.adminAnswerConfirm === "true");
      });
    });
  }
  function promptAdminApplicationRejection() {
    return new Promise((resolve) => {
      document.querySelector("#application-reject-modal")?.remove();
      document.body.insertAdjacentHTML("beforeend", '<div id="application-reject-modal" class="priest-modal"><div class="priest-modal-backdrop" data-application-reject-cancel></div><section class="priest-modal-box application-reject-box"><header><div><p>MISSION APPLICATION</p><h2>\uBBF8\uC158 \uC9C0\uC6D0 \uBC18\uB824</h2></div></header><div class="application-reject-body"><label>\uBC18\uB824 \uC0AC\uC720<textarea maxlength="1000" rows="6" placeholder="\uC9C0\uC6D0\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 \uBC18\uB824 \uC0AC\uC720\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694."></textarea></label><p></p></div><footer><button class="secondary" type="button" data-application-reject-cancel>\uCDE8\uC18C</button><button class="primary" type="button" data-application-reject-submit disabled>\uBC18\uB824</button></footer></section></div>');
      const modal3 = document.querySelector("#application-reject-modal"), textarea = modal3.querySelector("textarea"), submit = modal3.querySelector("[data-application-reject-submit]");
      textarea.oninput = () => submit.disabled = !textarea.value.trim();
      modal3.querySelectorAll("[data-application-reject-cancel]").forEach((element) => element.onclick = () => {
        modal3.remove();
        resolve(null);
      });
      submit.onclick = () => {
        const reason = textarea.value.trim();
        if (!reason) return;
        modal3.remove();
        resolve(reason);
      };
    });
  }
  function confirmAdminApplicationApproval() {
    return new Promise((resolve) => {
      document.querySelector("#application-approval-confirm-modal")?.remove();
      document.body.insertAdjacentHTML("beforeend", '<div id="application-approval-confirm-modal" class="priest-modal"><div class="priest-modal-backdrop" data-application-approval-confirm="false"></div><section class="priest-modal-box application-approval-confirm-box"><header><div><p>MISSION APPLICATION</p><h2>\uBBF8\uC158 \uC9C0\uC6D0 \uC2B9\uB77D</h2></div></header><div class="application-approval-confirm-body">\uC2B9\uB77D\uD588\uB2E4\uB294 \uC54C\uB9BC\uC744 \uC804\uC1A1\uD569\uB2C8\uB2E4</div><footer><button class="secondary" type="button" data-application-approval-confirm="false">\uCDE8\uC18C</button><button class="primary" type="button" data-application-approval-confirm="true">\uD655\uC778</button></footer></section></div>');
      const modal3 = document.querySelector("#application-approval-confirm-modal");
      modal3.querySelectorAll("[data-application-approval-confirm]").forEach((button) => button.onclick = () => {
        modal3.remove();
        resolve(button.dataset.applicationApprovalConfirm === "true");
      });
    });
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest('[data-admin-application][data-status="approved"]');
    if (!button || button.dataset.approvalConfirmed === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void confirmAdminApplicationApproval().then((confirmed) => {
      if (!confirmed) return;
      button.dataset.approvalConfirmed = "true";
      button.click();
      queueMicrotask(() => delete button.dataset.approvalConfirmed);
    });
  }, true);
  function prepareAdminAnswerForms() {
    document.querySelectorAll("[data-admin-answer]").forEach((form3) => {
      if (form3.dataset.answerReady) return;
      form3.dataset.answerReady = "true";
      const textarea = form3.querySelector("textarea"), submit = form3.querySelector('button[type="submit"]');
      if (!textarea || !submit) return;
      const sync = () => submit.disabled = !textarea.value.trim();
      textarea.addEventListener("input", sync);
      sync();
    });
  }
  new MutationObserver(prepareAdminAnswerForms).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("submit", (event) => {
    const form3 = event.target;
    if (!form3.matches("[data-admin-answer]") || form3.dataset.answerConfirmed === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const textarea = form3.querySelector("textarea");
    if (!textarea?.value.trim()) return;
    void confirmAdminMissionAnswer().then((confirmed) => {
      if (!confirmed) return;
      form3.dataset.answerConfirmed = "true";
      form3.requestSubmit();
      queueMicrotask(() => delete form3.dataset.answerConfirmed);
    });
  }, true);
  var labels = { requested: "\uC2B9\uC778\uC2E0\uCCAD", approved: "\uC2B9\uC778", rejected: "\uBC18\uB824" };
  labels.ended = "\uC885\uB8CC";
  function esc(value2) {
    const div = document.createElement("div");
    div.textContent = value2;
    return div.innerHTML;
  }
  async function api2(url, options) {
    let body = options?.body;
    if (url === "/api/parish/missions" && options?.method === "POST" && typeof body === "string") {
      const payload = JSON.parse(body);
      payload.applicationFrom = document.querySelector("#mission-create-from")?.value ?? "";
      payload.applicationTo = document.querySelector("#mission-create-to")?.value ?? "";
      body = JSON.stringify(payload);
    }
    const response = await fetch(url, { ...options, body, headers: { "Content-Type": "application/json", ...options?.headers ?? {} } }), data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  document.querySelector('[data-sharing-view="mission"]')?.addEventListener("click", () => void load3());
  var missionHeader = document.querySelector(".mission-admin>header");
  if (missionHeader && !document.querySelector("#mission-admin-reload")) {
    const actions = document.createElement("div");
    actions.className = "mission-admin-head-actions";
    const count = document.querySelector("#mission-admin-count");
    missionHeader.append(actions);
    actions.append(count);
    actions.insertAdjacentHTML("beforeend", '<div class="mission-admin-search"><input id="mission-admin-author-filter" type="search" placeholder="\uC791\uC131\uC790" aria-label="\uC791\uC131\uC790 \uC870\uD68C"><input id="mission-admin-title-filter" type="search" placeholder="\uC81C\uBAA9" aria-label="\uC81C\uBAA9 \uC870\uD68C"><select id="mission-admin-status-filter" aria-label="\uBBF8\uC158 \uC0C1\uD0DC \uC870\uD68C"><option value="all">\uC804\uCCB4 \uC0C1\uD0DC</option><option value="approved">\uC2B9\uC778</option><option value="rejected">\uBC18\uB824</option><option value="ended">\uC885\uB8CC</option><option value="requested">\uC2B9\uC778\uB300\uAE30</option></select><button id="mission-admin-query" class="primary" type="button">\uC870\uD68C</button><button id="mission-admin-reset" class="secondary" type="button">\uCD08\uAE30\uD654</button></div><button id="mission-admin-reload" class="grid-reload-button" type="button"><span aria-hidden="true">\u21BB</span> Reload</button>');
    const query = () => applyMissionStatusFilter();
    document.querySelector("#mission-admin-query").onclick = query;
    document.querySelectorAll("#mission-admin-author-filter,#mission-admin-title-filter").forEach((input) => input.onkeydown = (event) => {
      if (event.key === "Enter") query();
    });
    document.querySelector("#mission-admin-reset").onclick = () => {
      document.querySelectorAll("#mission-admin-author-filter,#mission-admin-title-filter").forEach((input) => input.value = "");
      document.querySelector("#mission-admin-status-filter").value = "all";
      applyMissionStatusFilter();
    };
    document.querySelector("#mission-admin-reload").onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.classList.add("loading");
      try {
        await load3();
      } finally {
        window.setTimeout(() => {
          button.disabled = false;
          button.classList.remove("loading");
        }, 350);
      }
    };
  }
  function applyMissionStatusFilter() {
    const value2 = document.querySelector("#mission-admin-status-filter")?.value ?? "all", authorQuery = document.querySelector("#mission-admin-author-filter")?.value.trim().toLocaleLowerCase("ko-KR") ?? "", titleQuery = document.querySelector("#mission-admin-title-filter")?.value.trim().toLocaleLowerCase("ko-KR") ?? "", cards = [...document.querySelectorAll("#mission-admin-list .mission-admin-card")];
    cards.forEach((card) => {
      const badge = card.querySelector(".mission-status"), status = badge?.classList.contains("requested") ? "requested" : badge?.classList.contains("approved") ? "approved" : badge?.classList.contains("rejected") ? "rejected" : badge?.classList.contains("ended") ? "ended" : "", title = card.querySelector("header strong")?.textContent?.toLocaleLowerCase("ko-KR") ?? "", author = card.querySelector("dl dd")?.textContent?.toLocaleLowerCase("ko-KR") ?? "", hidden = value2 !== "all" && status !== value2 || Boolean(authorQuery) && !author.includes(authorQuery) || Boolean(titleQuery) && !title.includes(titleQuery);
      if (card.hidden !== hidden) card.hidden = hidden;
    });
    const visibleCards = cards.filter((card) => !card.hidden), visible = visibleCards.length, empty = document.querySelector("#mission-admin-empty");
    document.querySelector("#mission-admin-count").textContent = `\uC870\uD68C ${visible}\uAC1C \xB7 \uC2B9\uC778\uB300\uAE30 ${visibleCards.filter((card) => card.querySelector(".mission-status.requested")).length}\uAC1C`;
    if (empty.hidden !== visible > 0) empty.hidden = visible > 0;
  }
  new MutationObserver(() => {
    document.querySelectorAll(".mission-applicant-count").forEach((applicants) => {
      const card = applicants.closest(".mission-admin-card");
      if (!card || card.querySelector("[data-admin-questions]")) return;
      const button = document.createElement("button"), missionId = Number(applicants.dataset.applicants), title = card.querySelector("header strong")?.textContent ?? "\uBBF8\uC158";
      button.type = "button";
      button.className = "mission-question-count";
      button.dataset.adminQuestions = String(missionId);
      button.textContent = "\uB2F5\uBCC0/\uC9C8\uBB38 : 0 / 0";
      button.onclick = () => openAdminQuestions(missionId, title);
      applicants.insertAdjacentElement("afterend", button);
      void api2(`/api/parish/missions/${missionId}/questions`).then((data) => button.textContent = `\uB2F5\uBCC0/\uC9C8\uBB38 : ${data.items.filter((item) => Boolean(item.answer)).length} / ${data.items.length}`).catch(() => {
        button.textContent = "\uB2F5\uBCC0/\uC9C8\uBB38 \uD655\uC778";
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
  async function load3() {
    try {
      const items4 = await api2("/api/parish/missions"), list = document.querySelector("#mission-admin-list");
      list.innerHTML = items4.map((item) => `<article class="mission-admin-card"><header><div><b class="mission-status ${item.status}">${labels[item.status]}</b><strong>${esc(item.title)}</strong></div><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></header><dl><dt>\uC791\uC131\uC790</dt><dd>${esc(item.authorName)}${item.baptismalName ? ` (${esc(item.baptismalName)})` : ""}${item.anonymous ? " <small>\uACF5\uAC1C \uC2DC \uC775\uBA85</small>" : ""}</dd><dt>\uB0B4\uC6A9</dt><dd>${esc(item.content)}</dd><dt>\uBAA8\uC9D1\uAE30\uAC04</dt><dd>${item.applicationFrom ?? "-"} ~ ${item.applicationTo ?? "-"} <b class="mission-open-state ${item.applicationOpen ? "open" : "closed"}">${item.applicationOpen ? "\uBAA8\uC9D1\uC911" : "\uBE44\uD65C\uC131"}</b></dd><dt>\uD0DC\uADF8</dt><dd class="mission-tags">${item.tags.length ? item.tags.map((tag) => `<span>#${esc(tag)}</span>`).join("") : "-"}</dd><dt>\uC9C0\uC6D0\uC790</dt><dd><button class="mission-applicant-count" data-applicants="${item.id}" data-title="${esc(item.title)}" type="button">\uC2B9\uC778/\uBC18\uB824/\uC9C0\uC6D0 : ${item.approvedApplicationCount} / ${item.rejectedApplicationCount} / ${item.applicationCount}</button></dd>${item.rejectionReason ? `<dt>\uBC18\uB824 \uC0AC\uC720</dt><dd class="mission-reason">${esc(item.rejectionReason)}</dd>` : ""}</dl>${item.status === "requested" ? `<footer><button class="secondary" data-reject="${item.id}" type="button">\uBC18\uB824</button><button class="primary" data-approve="${item.id}" type="button">\uC2B9\uC778</button></footer>` : ""}</article>`).join("");
      document.querySelector("#mission-admin-count").textContent = `\uCD1D ${items4.length}\uAC1C \xB7 \uC2B9\uC778\uB300\uAE30 ${items4.filter((item) => item.status === "requested").length}\uAC1C`;
      document.querySelector("#mission-admin-empty").hidden = items4.length > 0;
      list.querySelectorAll("[data-approve]").forEach((button) => button.onclick = () => decide(Number(button.dataset.approve), "approved"));
      list.querySelectorAll("[data-reject]").forEach((button) => button.onclick = () => openReject(Number(button.dataset.reject)));
      list.querySelectorAll("[data-applicants]").forEach((button) => button.onclick = () => openApplicants(Number(button.dataset.applicants), button.dataset.title ?? "\uBBF8\uC158"));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("parish:notice", { detail: error.message }));
    }
  }
  async function decide(id, status, rejectionReason = "") {
    try {
      const result = await api2(`/api/parish/missions/${id}/decision`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) });
      document.querySelector("#mission-reject-modal")?.remove();
      document.body.classList.remove("modal-open");
      await load3();
      window.dispatchEvent(new CustomEvent("parish:notice", { detail: result.message }));
    } catch (error) {
      const target = document.querySelector("#mission-reject-error");
      if (target) target.textContent = error.message;
      else window.dispatchEvent(new CustomEvent("parish:notice", { detail: error.message }));
    }
  }
  function openReject(id) {
    document.querySelector("#mission-reject-modal")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div id="mission-reject-modal" class="priest-modal"><div class="priest-modal-backdrop" data-mission-reject-close></div><section class="priest-modal-box mission-reject-box" role="dialog" aria-modal="true"><header><div><p>MISSION REVIEW</p><h2>\uBBF8\uC158 \uBC18\uB824</h2></div><button type="button" data-mission-reject-close>\xD7</button></header><div class="mission-reject-body"><label>\uBC18\uB824 \uC0AC\uC720 <i>*</i><textarea id="mission-reject-reason" maxlength="1000" rows="6" placeholder="\uC791\uC131\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 \uBC18\uB824 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea></label><p id="mission-reject-error"></p></div><footer><button class="secondary" data-mission-reject-close type="button">\uCDE8\uC18C</button><button id="mission-reject-submit" class="primary" type="button" disabled>\uBC18\uB824 \uD655\uC815</button></footer></section></div>`);
    document.body.classList.add("modal-open");
    const close2 = () => {
      document.querySelector("#mission-reject-modal")?.remove();
      document.body.classList.remove("modal-open");
    };
    document.querySelectorAll("[data-mission-reject-close]").forEach((el) => el.addEventListener("click", close2));
    const reason = document.querySelector("#mission-reject-reason"), submit = document.querySelector("#mission-reject-submit");
    reason.addEventListener("input", () => submit.disabled = !reason.value.trim());
    submit.onclick = () => {
      const value2 = reason.value.trim();
      if (!value2) return;
      submit.disabled = true;
      void decide(id, "rejected", value2);
    };
  }
  new MutationObserver(() => {
    const tags = document.querySelector("#mission-create-tags");
    if (!tags || document.querySelector("#mission-create-from")) return;
    tags.closest("label").insertAdjacentHTML("beforebegin", '<div class="mission-create-period"><label>\uB2EC\uB780\uD2B8 \uBAA8\uC9D1 \uC2DC\uC791\uC77C <i>*</i><input id="mission-create-from" type="date" required></label><span>~</span><label>\uB2EC\uB780\uD2B8 \uBAA8\uC9D1 \uC885\uB8CC\uC77C <i>*</i><input id="mission-create-to" type="date" required></label></div>');
    const form3 = document.querySelector("#mission-create-form"), title = document.querySelector("#mission-create-title"), content = document.querySelector("#mission-create-content"), from = document.querySelector("#mission-create-from"), to = document.querySelector("#mission-create-to"), submit = form3.querySelector('button[type="submit"]');
    const sync = () => {
      to.min = from.value;
      submit.disabled = !title.value.trim() || !content.value.trim() || !from.value || !to.value || to.value < from.value || !form3.checkValidity();
    };
    form3.addEventListener("input", sync);
    form3.addEventListener("change", sync);
    sync();
  }).observe(document.body, { childList: true, subtree: true });
  async function openApplicants(id, title) {
    document.querySelector("#mission-applicants-modal")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div id="mission-applicants-modal" class="priest-modal"><div class="priest-modal-backdrop" data-applicants-close></div><section class="priest-modal-box mission-applicants-box"><header><div><p>MISSION APPLICANTS</p><h2>${esc(title)} \uC9C0\uC6D0\uC790 \uD604\uD669</h2><small id="mission-applicants-summary">\uBD88\uB7EC\uC624\uB294 \uC911...</small></div><button type="button" data-applicants-close>\xD7</button></header><div id="mission-applicants-content" class="mission-applicants-content"></div><footer><button class="secondary" data-applicants-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
    document.body.classList.add("modal-open");
    const close2 = () => {
      document.querySelector("#mission-applicants-modal")?.remove();
      document.body.classList.remove("modal-open");
    };
    document.querySelectorAll("[data-applicants-close]").forEach((el) => el.addEventListener("click", close2));
    try {
      const result = await api2(`/api/parish/missions/${id}/applicants`);
      document.querySelector("#mission-applicants-summary").textContent = `\uC9C0\uC6D0\uC790 ${result.items.length}\uBA85`;
      document.querySelector("#mission-applicants-content").innerHTML = result.items.length ? `<div class="mission-applicants-grid"><table><thead><tr><th>\uC774\uB984</th><th>\uC138\uB840\uBA85</th><th>\uC5F0\uB77D\uCC98</th><th>\uC9C0\uC6D0\uC77C</th><th>\uC2B9\uC778\uC77C</th><th>\uC9C0\uC6D0 \uBA54\uC2DC\uC9C0</th><th>\uC0C1\uD0DC</th><th>\uACB0\uC815</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(item.baptismalName ?? "-")}</td><td>${esc(item.mobile ?? "-")}<br>${esc(item.email)}</td><td class="applicant-date">${esc(item.appliedAt)}</td><td class="applicant-date">${esc(item.approvedAt ?? "-")}</td><td class="applicant-message">${esc(item.message || "-")}${item.rejectionReason ? `<div class="admin-application-reason"><strong>\uBC18\uB824 \uC0AC\uC720</strong><p>${esc(item.rejectionReason)}</p></div>` : ""}</td><td>${item.status === "requested" ? "\uACB0\uC815 \uB300\uAE30" : item.status === "approved" ? "\uC2B9\uB099" : "\uBC18\uB824"}</td><td>${result.mission.authorType === "parish" && item.status === "requested" ? `<div class="applicant-decisions"><button data-admin-application="${item.id}" data-status="rejected" type="button">\uBC18\uB824</button><button data-admin-application="${item.id}" data-status="approved" type="button">\uC2B9\uB099</button></div>` : "-"}</td></tr>`).join("")}</tbody></table></div>` : '<div class="sharing-empty">\uC9C0\uC6D0\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
      document.querySelectorAll("[data-admin-application]").forEach((button) => button.onclick = async () => {
        const status = button.dataset.status, rejectionReason = status === "rejected" ? await promptAdminApplicationRejection() : "";
        if (status === "rejected" && rejectionReason === null) return;
        await api2(`/api/parish/mission-applications/${button.dataset.adminApplication}/decision`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) });
        close2();
        await load3();
      });
    } catch (error) {
      document.querySelector("#mission-applicants-content").textContent = error.message;
    }
  }
  async function openAdminQuestions(id, title) {
    document.querySelector("#mission-questions-modal")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div id="mission-questions-modal" class="priest-modal"><div class="priest-modal-backdrop" data-admin-questions-close></div><section class="priest-modal-box mission-questions-box"><header><div><p>MISSION Q&amp;A</p><h2>${esc(title)} \uC9C8\uBB38\xB7\uB2F5\uBCC0</h2></div><button type="button" data-admin-questions-close>\xD7</button></header><div id="mission-admin-questions" class="mission-admin-questions">\uBD88\uB7EC\uC624\uB294 \uC911...</div><footer><button class="secondary" data-admin-questions-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
    document.body.classList.add("modal-open");
    const close2 = () => {
      document.querySelector("#mission-questions-modal")?.remove();
      document.body.classList.remove("modal-open");
    };
    document.querySelectorAll("[data-admin-questions-close]").forEach((el) => el.addEventListener("click", close2));
    try {
      const result = await api2(`/api/parish/missions/${id}/questions`), root = document.querySelector("#mission-admin-questions");
      root.innerHTML = result.items.length ? result.items.map((item) => `<article><header><strong>${esc(item.askerName)}${item.baptismalName ? ` (${esc(item.baptismalName)})` : ""}</strong><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></header><p>${esc(item.question)}</p>${item.answer ? `<div class="admin-answer"><b>\uC131\uB2F9 \uB2F5\uBCC0</b><p>${esc(item.answer)}</p></div>` : result.mission.author_type === "parish" ? `<form data-admin-answer="${item.id}"><textarea maxlength="5000" required placeholder="\uB2F5\uBCC0\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."></textarea><button class="primary" type="submit">\uB2F5\uBCC0 \uB4F1\uB85D</button></form>` : "<small>\uC2E0\uB3C4 \uB4F1\uB85D\uC790\uC758 \uB2F5\uBCC0\uC744 \uAE30\uB2E4\uB9AC\uACE0 \uC788\uC2B5\uB2C8\uB2E4.</small>"}</article>`).join("") : '<div class="sharing-empty">\uB4F1\uB85D\uB41C \uC9C8\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
      root.querySelectorAll("[data-admin-answer]").forEach((form3) => form3.onsubmit = async (event) => {
        event.preventDefault();
        await api2(`/api/parish/mission-questions/${form3.dataset.adminAnswer}/answer`, { method: "PATCH", body: JSON.stringify({ answer: form3.querySelector("textarea").value }) });
        await openAdminQuestions(id, title);
      });
    } catch (error) {
      document.querySelector("#mission-admin-questions").textContent = error.message;
    }
  }
  var loadingMissionEditRequests = false;
  async function decorateMissionEditRequests() {
    const list = document.querySelector("#mission-admin-list");
    if (!list || loadingMissionEditRequests || list.querySelector(".mission-edit-request-card")) return;
    loadingMissionEditRequests = true;
    try {
      const items4 = await api2("/api/parish/mission-edit-requests");
      items4.reverse().forEach((item) => list.insertAdjacentHTML("afterbegin", `<article class="mission-admin-card mission-edit-request-card"><header><div><b class="mission-status requested">\uC218\uC815 \uC2B9\uC778 \uB300\uAE30</b><strong>${esc(item.title)}</strong></div><time>${new Date(item.requestedAt).toLocaleString("ko-KR")}</time></header><dl><dt>\uC791\uC131\uC790</dt><dd>${esc(item.authorName)}${item.baptismalName ? ` (${esc(item.baptismalName)})` : ""}</dd><dt>\uC218\uC815 \uB0B4\uC6A9</dt><dd>${esc(item.content)}</dd><dt>\uBAA8\uC9D1\uAE30\uAC04</dt><dd>${item.applicationFrom} ~ ${item.applicationTo}</dd><dt>\uD0DC\uADF8</dt><dd class="mission-tags">${item.tags.map((tag) => `<span>#${esc(tag)}</span>`).join("") || "-"}</dd></dl><footer><button class="secondary" data-edit-reject="${item.id}" type="button">\uBC18\uB824</button><button class="primary" data-edit-approve="${item.id}" type="button">\uC2B9\uC778 \uBC0F \uBC18\uC601</button></footer></article>`));
      list.querySelectorAll("[data-edit-approve]").forEach((button) => button.onclick = () => decideMissionEdit(Number(button.dataset.editApprove), "approved"));
      list.querySelectorAll("[data-edit-reject]").forEach((button) => button.onclick = async () => {
        const reason = await promptAdminApplicationRejection();
        if (reason !== null) await decideMissionEdit(Number(button.dataset.editReject), "rejected", reason);
      });
    } finally {
      loadingMissionEditRequests = false;
    }
  }
  async function decideMissionEdit(id, status, rejectionReason = "") {
    const result = await api2(`/api/parish/mission-edit-requests/${id}/decision`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) });
    await load3();
    window.dispatchEvent(new CustomEvent("parish:notice", { detail: result.message }));
  }
  var missionListForFilter = document.querySelector("#mission-admin-list");
  var missionListRefreshQueued = false;
  new MutationObserver(() => {
    if (missionListRefreshQueued) return;
    missionListRefreshQueued = true;
    queueMicrotask(() => {
      missionListRefreshQueued = false;
      void decorateMissionEditRequests();
      applyMissionStatusFilter();
    });
  }).observe(missionListForFilter, { childList: true });
  queueMicrotask(() => void decorateMissionEditRequests());

  // src/client/parish-catacomb-admin.ts
  var esc2 = (value2) => String(value2 ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  var posts = [];
  var filter = "requested";
  async function api3(url, options) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers ?? {} } }), data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  function mount() {
    const panel3 = document.querySelector('[data-sharing-panel="catacomb"]');
    if (!panel3 || panel3.dataset.adminReady) return;
    panel3.dataset.adminReady = "true";
    panel3.innerHTML = '<header><div><h2>\uCE74\uD0C0\uCF64 \uAD00\uB9AC</h2><p>\uC2E0\uB3C4\uAC00 \uC694\uCCAD\uD55C \uCE74\uD0C0\uCF64\uC744 \uAC80\uD1A0\uD558\uACE0 \uB4F1\uB85D\uB41C \uCE74\uD0C0\uCF64\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.</p></div><span id="catacomb-admin-count"></span></header><nav class="catacomb-admin-tabs"><button class="active" data-catacomb-status="requested" type="button">\uB4F1\uB85D \uC694\uCCAD</button><button data-catacomb-status="approved" type="button">\uB4F1\uB85D \uC644\uB8CC</button></nav><div id="catacomb-admin-list"></div><div id="catacomb-admin-empty" class="sharing-empty" hidden><strong>\uD45C\uC2DC\uD560 \uCE74\uD0C0\uCF64\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</strong></div>';
    panel3.querySelectorAll("[data-catacomb-status]").forEach((button) => button.onclick = () => {
      filter = button.dataset.catacombStatus;
      panel3.querySelectorAll("[data-catacomb-status]").forEach((tab) => tab.classList.toggle("active", tab === button));
      render3();
    });
  }
  function render3() {
    const list = document.querySelector("#catacomb-admin-list"), empty = document.querySelector("#catacomb-admin-empty"), count = document.querySelector("#catacomb-admin-count");
    if (!list || !empty || !count) return;
    const items4 = posts.filter((item) => item.status === filter);
    count.textContent = `\uB4F1\uB85D \uC694\uCCAD ${posts.filter((item) => item.status === "requested").length}\uAC1C \xB7 \uB4F1\uB85D \uC644\uB8CC ${posts.filter((item) => item.status === "approved").length}\uAC1C`;
    list.innerHTML = items4.map((item) => `<article class="catacomb-admin-card"><header><div><b class="${item.status}">${item.status === "requested" ? "\uB4F1\uB85D \uC694\uCCAD" : "\uB4F1\uB85D \uC644\uB8CC"}</b><h3>${esc2(item.title)}</h3></div><time>${new Date(item.createdAt).toLocaleString("ko-KR")}</time></header><dl><dt>\uC791\uC131\uC790</dt><dd>${item.anonymous ? "\uC775\uBA85" : `${esc2(item.authorName)}${item.baptismalName ? ` (${esc2(item.baptismalName)})` : ""}`}</dd><dt>\uB0B4\uC6A9</dt><dd>${esc2(item.content)}</dd><dt>\uD0DC\uADF8</dt><dd>${item.tags.length ? item.tags.map((tag) => `<span>#${esc2(tag)}</span>`).join("") : "-"}</dd></dl>${item.status === "requested" ? `<footer><button class="secondary" data-catacomb-reject="${item.id}" type="button">\uBC18\uB824</button><button class="primary" data-catacomb-approve="${item.id}" type="button">\uC2B9\uC778</button></footer>` : ""}</article>`).join("");
    empty.hidden = items4.length > 0;
    list.querySelectorAll("[data-catacomb-approve]").forEach((button) => button.onclick = () => decide2(Number(button.dataset.catacombApprove), "approved"));
    list.querySelectorAll("[data-catacomb-reject]").forEach((button) => button.onclick = () => reject(Number(button.dataset.catacombReject)));
  }
  async function load4() {
    try {
      posts = await api3("/api/parish/catacomb/posts");
      render3();
    } catch (error) {
      window.dispatchEvent(new CustomEvent("parish:notice", { detail: error.message }));
    }
  }
  async function decide2(id, status, rejectionReason = "") {
    try {
      const result = await api3(`/api/parish/catacomb/posts/${id}/decision`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) });
      await load4();
      window.dispatchEvent(new CustomEvent("parish:notice", { detail: result.message }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("parish:notice", { detail: error.message }));
    }
  }
  function reject(id) {
    const reason = window.prompt("\uBC18\uB824 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.")?.trim();
    if (reason) void decide2(id, "rejected", reason);
  }
  document.querySelector('[data-sharing-view="catacomb"]')?.addEventListener("click", () => {
    mount();
    void load4();
  });
  mount();
  document.head.insertAdjacentHTML("beforeend", "<style>.catacomb-admin-tabs{display:flex;gap:7px;margin:16px 0}.catacomb-admin-tabs button{height:36px;padding:0 18px;border:1px solid var(--line);border-radius:18px;background:#fff;font-weight:700}.catacomb-admin-tabs button.active{border-color:var(--green);background:#eaf8f2;color:var(--green)}#catacomb-admin-list{display:grid;gap:12px}.catacomb-admin-card{padding:18px;border:1px solid var(--line);border-radius:12px;background:#fff}.catacomb-admin-card>header{display:flex;justify-content:space-between}.catacomb-admin-card header div{display:flex;align-items:center;gap:9px}.catacomb-admin-card header b{padding:4px 8px;border-radius:10px;font-size:9px}.catacomb-admin-card header b.requested{background:#fff4d8;color:#9b7000}.catacomb-admin-card header b.approved{background:#eaf8f2;color:#16845f}.catacomb-admin-card h3{margin:0}.catacomb-admin-card time{color:var(--muted);font-size:9px}.catacomb-admin-card dl{display:grid;grid-template-columns:70px 1fr;gap:10px;margin:16px 0 0}.catacomb-admin-card dt{color:var(--muted);font-size:10px}.catacomb-admin-card dd{margin:0;line-height:1.65;white-space:pre-wrap}.catacomb-admin-card dd span{display:inline-block;margin-right:5px;padding:3px 7px;border-radius:10px;background:#eef8f4;color:var(--green)}.catacomb-admin-card footer{display:flex;justify-content:flex-end;gap:8px;margin-top:15px;padding-top:13px;border-top:1px solid var(--line)}.catacomb-admin-card footer button{height:36px;padding:0 18px}@media(max-width:700px){.catacomb-admin-card>header{display:block}.catacomb-admin-card time{display:block;margin-top:7px}.catacomb-admin-card dl{grid-template-columns:55px 1fr}}</style>");

  // src/client/parish-shrines.ts
  var sharingMainTab = document.querySelector('[data-main-view="sharing"]');
  document.head.insertAdjacentHTML("beforeend", '<style>.parish-settings-tab{margin-left:auto!important;border-left:1px solid var(--line)!important}.parish-settings-tab:before{content:"";position:absolute;left:-13px;top:10px;bottom:10px;width:1px;background:#e6ebf2}.settings-management{min-height:420px}.settings-management>.sharing-view{padding:24px;border:1px solid var(--line);border-radius:12px;background:#fff}@media(max-width:720px){.parish-tabs{overflow-x:auto}.parish-settings-tab{margin-left:24px!important}.parish-settings-tab:before{left:-13px}}</style>');
  document.head.insertAdjacentHTML("beforeend", "<style>.schedule-management{min-height:430px;padding:24px;border:1px solid var(--line);border-radius:12px;background:#fff}.schedule-management>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:1px solid var(--line)}.schedule-management h2{margin:0 0 6px}.schedule-management header p{margin:0;color:#748096}.schedule-empty{display:flex;min-height:290px;flex-direction:column;align-items:center;justify-content:center;color:#7b889d;text-align:center}.schedule-empty span{font-size:34px}.schedule-empty strong{margin-top:12px;color:#40506a;font-size:15px}.schedule-empty p{margin:7px 0 0}</style>");
  if (!document.querySelector('[data-main-view="prayer"]')) sharingMainTab.insertAdjacentHTML("afterend", '<button class="parish-tab" data-main-view="prayer" type="button"><span>\u2020</span>\uAE30\uB3C4</button>');
  var informationMainTab = document.querySelector('[data-main-view="information"]');
  if (!document.querySelector('[data-main-view="settings"]')) informationMainTab.insertAdjacentHTML("afterend", '<button class="parish-tab parish-settings-tab" data-main-view="settings" type="button"><span>\u2699</span>\uC124\uC815</button>');
  if (!document.querySelector("#prayer-management")) {
    const section = document.createElement("section");
    section.id = "prayer-management";
    section.className = "sharing-management prayer-management";
    section.hidden = true;
    section.innerHTML = '<section class="sharing-view"><header><div><h2>\uAE30\uB3C4</h2><p>\uBCF8\uB2F9 \uACF5\uB3D9\uCCB4\uC758 \uAE30\uB3C4 \uD65C\uB3D9\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4.</p></div></header><div class="sharing-empty"><span>\u2020</span><strong>\uAE30\uB3C4 \uAD00\uB9AC \uC601\uC5ED</strong><p>\uAE30\uB3C4 \uAD00\uB828 \uAE30\uB2A5\uC744 \uC774\uACF3\uC5D0\uC11C \uAD00\uB9AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div></section>';
    document.querySelector(".parish-subnav").insertAdjacentElement("beforebegin", section);
  }
  if (!document.querySelector("#settings-management")) {
    const section = document.createElement("section");
    section.id = "settings-management";
    section.className = "sharing-management settings-management";
    section.hidden = true;
    section.innerHTML = '<section class="sharing-view"><header><div><h2>\uC124\uC815</h2><p>\uC131\uB2F9 \uAD00\uB9AC\uC790 \uD658\uACBD\uACFC \uC11C\uBE44\uC2A4 \uC124\uC815\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4.</p></div></header><div class="sharing-empty"><span>\u2699</span><strong>\uC124\uC815 \uAD00\uB9AC</strong><p>\uC131\uB2F9 \uC6B4\uC601\uC5D0 \uD544\uC694\uD55C \uC124\uC815 \uAE30\uB2A5\uC744 \uC774\uACF3\uC5D0\uC11C \uAD00\uB9AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div></section>';
    document.querySelector(".parish-subnav").insertAdjacentElement("beforebegin", section);
  }
  var information2 = document.querySelector("#information-management");
  var sharing2 = document.querySelector("#sharing-management");
  var prayer = document.querySelector("#prayer-management");
  var settings = document.querySelector("#settings-management");
  var sharingSubnav = document.querySelector("#sharing-subnav");
  var modal2 = document.querySelector("#shrine-editor-modal");
  var form2 = document.querySelector("#shrine-form");
  var informationSubnav = information2.querySelector(".information-subnav");
  var shrineCard = information2.querySelector(".shrine-card");
  informationSubnav.firstElementChild.setAttribute("data-information-view", "shrines");
  informationSubnav.insertAdjacentHTML("beforeend", '<button class="parish-tag" data-information-view="reviews" type="button">\uC21C\uB840\uD6C4\uAE30</button>');
  shrineCard.insertAdjacentHTML("afterend", '<section id="shrine-review-management" class="shrine-card shrine-review-management" hidden><header class="shrine-header"><div><h2>\uC21C\uB840\uD6C4\uAE30 \uAD00\uB9AC</h2><p>\uBCF8\uB2F9 \uC2E0\uB3C4\uAC00 \uB4F1\uB85D\uD55C \uC131\uC9C0\uC21C\uB840 \uD6C4\uAE30\uC640 \uC0AC\uC9C4\uC744 \uD655\uC778\uD558\uACE0 \uAD00\uB9AC\uD569\uB2C8\uB2E4.</p></div></header><div class="shrine-filters"><input id="shrine-review-query" type="search" placeholder="\uD6C4\uAE30 \uC81C\uBAA9, \uB0B4\uC6A9, \uC131\uC9C0\uBA85, \uC791\uC131\uC790 \uAC80\uC0C9"><button id="shrine-review-search" class="secondary" type="button">\uC870\uD68C</button><button id="shrine-review-reset" class="text-button" type="button">\uCD08\uAE30\uD654</button></div><div class="shrine-summary"><span id="shrine-review-count"></span></div><div id="shrine-review-list" class="shrine-review-list"></div><div id="shrine-review-empty" class="history-empty" hidden>\uB4F1\uB85D\uB41C \uC21C\uB840\uD6C4\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div></section>');
  var items3 = [];
  var sortState = null;
  async function api4(url, options) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers ?? {} } });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."), { errors: data.errors });
    return data;
  }
  function notice3(message) {
    window.dispatchEvent(new CustomEvent("parish:notice", { detail: message }));
  }
  function escapeHtml3(value2) {
    const div = document.createElement("div");
    div.textContent = value2;
    return div.innerHTML;
  }
  var parishSections = ["#parish-profile-form", "#priest-management", "#history-management", "#patron-saint-management", "#administrative-guide-management", "#video-management", "#notice-management"];
  var parishSubnavList = document.querySelector(".parish-subnav .parish-tag-list");
  if (!parishSubnavList.querySelector('[data-parish-view="schedule"]')) parishSubnavList.insertAdjacentHTML("beforeend", '<button class="parish-tag" data-parish-view="schedule" type="button" role="tab" aria-selected="false">\uC77C\uC815</button>');
  if (!document.querySelector("#schedule-management")) {
    const section = document.createElement("section");
    section.id = "schedule-management";
    section.className = "schedule-management";
    section.hidden = true;
    section.innerHTML = '<header><div><h2>\uC77C\uC815 \uAD00\uB9AC</h2><p>\uC131\uB2F9\uC758 \uBBF8\uC0AC, \uD589\uC0AC \uBC0F \uC8FC\uC694 \uC77C\uC815\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4.</p></div><button class="primary" type="button">+ \uC77C\uC815 \uB4F1\uB85D</button></header><div class="schedule-empty"><span>\u25A6</span><strong>\uB4F1\uB85D\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</strong><p>\uC77C\uC815 \uB4F1\uB85D \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC131\uB2F9 \uC77C\uC815\uC744 \uCD94\uAC00\uD574 \uC8FC\uC138\uC694.</p></div>';
    document.querySelector("#parish-profile-form").insertAdjacentElement("beforebegin", section);
  }
  var scheduleManagement = document.querySelector("#schedule-management");
  parishSections.push("#schedule-management");
  parishSubnavList.querySelector('[data-parish-view="schedule"]').addEventListener("click", (event) => {
    document.querySelectorAll("[data-parish-view]").forEach((tab) => {
      const active = tab === event.currentTarget;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    parishSections.forEach((selector) => document.querySelector(selector).hidden = selector !== "#schedule-management");
    document.querySelector("#profile-approval-status").hidden = true;
  });
  var noticePanel = document.querySelector("#notice-management");
  document.querySelectorAll("[data-parish-view]").forEach((button) => button.addEventListener("click", () => {
    const active = button.dataset.parishView === "notices";
    noticePanel.hidden = !active;
    if (active) {
      parishSections.filter((selector) => selector !== "#notice-management").forEach((selector) => document.querySelector(selector).hidden = true);
      document.querySelector("#profile-approval-status").hidden = true;
    }
  }));
  document.querySelectorAll("[data-sharing-view]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-sharing-view]").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-sharing-panel]").forEach((panel3) => panel3.hidden = panel3.dataset.sharingPanel !== button.dataset.sharingView);
  }));
  document.querySelectorAll("[data-information-view]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-information-view]").forEach((tab) => tab.classList.toggle("active", tab === button));
    const reviews = button.dataset.informationView === "reviews";
    shrineCard.hidden = reviews;
    document.querySelector("#shrine-review-management").hidden = !reviews;
    if (reviews) void loadShrineReviews();
    else void loadShrines();
  }));
  document.querySelectorAll("[data-main-view]").forEach((button) => button.addEventListener("click", async () => {
    document.querySelectorAll("[data-main-view]").forEach((tab) => tab.classList.toggle("active", tab === button));
    const info = button.dataset.mainView === "information", members = button.dataset.mainView === "parishioners", share = button.dataset.mainView === "sharing", pray = button.dataset.mainView === "prayer", setting = button.dataset.mainView === "settings";
    information2.hidden = !info;
    sharing2.hidden = !share;
    prayer.hidden = !pray;
    settings.hidden = !setting;
    sharingSubnav.hidden = !share;
    document.querySelector(".parish-subnav").hidden = info || members || share || pray || setting;
    if (info || share || pray || setting) {
      parishSections.forEach((selector) => document.querySelector(selector).hidden = true);
      document.querySelector("#profile-approval-status").hidden = true;
      if (info) document.querySelector('[data-information-view="shrines"]')?.click();
      if (share) document.querySelector('[data-sharing-view="catacomb"]')?.click();
    } else if (!members) document.querySelector('[data-parish-view="basic"]')?.click();
  }));
  async function loadShrines() {
    const diocese = document.querySelector("#shrine-diocese").value, q = document.querySelector("#shrine-query").value;
    try {
      const result = await api4(`/api/parish/shrines?diocese=${encodeURIComponent(diocese)}&q=${encodeURIComponent(q)}`);
      items3 = result.items;
      const select = document.querySelector("#shrine-diocese"), current = select.value;
      select.replaceChildren(new Option("\uC804\uCCB4 \uAD50\uAD6C", ""), ...result.dioceses.map((item) => new Option(`${item.name} (${item.count})`, item.name)));
      select.value = current;
      render4();
    } catch (error) {
      notice3(error.message);
    }
  }
  function render4() {
    const list = document.querySelector("#shrine-list");
    list.innerHTML = `<div class="shrine-grid-wrap"><table class="shrine-grid"><thead><tr><th>\uAD50\uAD6C</th><th>\uC131\uC9C0\uBA85</th><th>\uC8FC\uC18C</th><th>\uC804\uD654\uBC88\uD638</th><th>\uD648\uD398\uC774\uC9C0</th><th>\uC21C\uB840\uC790(\uC218)</th><th>\uC0AC\uC6A9</th><th>\uAD00\uB9AC</th></tr></thead><tbody>${items3.map((item) => {
      const shortName = Array.from(item.name).slice(0, 20).join("") + (Array.from(item.name).length > 20 ? "\u2026" : "");
      const website = item.websiteUrl && /^https?:\/\//i.test(item.websiteUrl) ? `<a href="${escapeHtml3(item.websiteUrl)}" target="_blank" rel="noopener noreferrer">\uBC14\uB85C\uAC00\uAE30 \u2197</a>` : "-";
      return `<tr class="${item.enabled ? "" : "is-disabled"}" data-shrine="${item.id}"><td><span class="shrine-diocese-badge">${escapeHtml3(item.diocese)}</span></td><td class="shrine-name" title="${escapeHtml3(item.name)}">${escapeHtml3(shortName)}</td><td title="${escapeHtml3(item.address ?? "")}">${escapeHtml3(item.address ?? "-")}</td><td>${item.phoneNumbers.length ? item.phoneNumbers.map(escapeHtml3).join("<br>") : "-"}</td><td>${website}</td><td><button class="pilgrim-count" data-action="pilgrims" type="button">${item.pilgrimCount.toLocaleString("ko-KR")}\uBA85</button></td><td><label class="shrine-grid-enable"><input type="checkbox" ${item.enabled ? "checked" : ""}><span>${item.enabled ? "\uC0AC\uC6A9" : "\uBBF8\uC0AC\uC6A9"}</span></label></td><td><div class="shrine-grid-actions"><button data-action="edit" type="button">\uC218\uC815</button><button data-action="delete" type="button">\uC0AD\uC81C</button></div></td></tr>`;
    }).join("")}</tbody></table></div>`;
    list.querySelectorAll("[data-shrine]").forEach((row) => {
      const item = items3.find((value2) => value2.id === Number(row.dataset.shrine));
      row.querySelector('input[type="checkbox"]').addEventListener("change", (event) => saveShrine(item, { enabled: event.currentTarget.checked }));
      row.querySelector('[data-action="pilgrims"]').addEventListener("click", () => openPilgrims(item));
      row.querySelector('[data-action="edit"]').addEventListener("click", () => openEditor(item));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => removeShrine(item));
    });
    document.querySelector("#shrine-count").textContent = `\uAC80\uC0C9 \uACB0\uACFC ${items3.length}\uAC1C`;
    document.querySelector("#shrine-empty").hidden = items3.length > 0;
  }
  var shrineSortKeys = ["diocese", "name", "address", "phone", "website", "pilgrimCount", "enabled"];
  document.querySelector("#shrine-list").addEventListener("click", (event) => {
    const header = event.target.closest(".shrine-grid th");
    if (!header) return;
    const index = [...header.parentElement.children].indexOf(header);
    const key = shrineSortKeys[index];
    if (!key) return;
    sortState = { key, direction: sortState?.key === key && sortState.direction === "asc" ? "desc" : "asc" };
    const value2 = (item) => key === "phone" ? item.phoneNumbers.join(" ") : key === "website" ? item.websiteUrl ?? "" : key === "enabled" ? Number(item.enabled) : item[key] ?? "";
    items3.sort((a, b) => {
      const left = value2(a), right = value2(b), result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "ko", { numeric: true });
      return sortState.direction === "asc" ? result : -result;
    });
    render4();
    const active = document.querySelectorAll(".shrine-grid th")[index];
    active?.classList.add(sortState.direction === "asc" ? "sort-asc" : "sort-desc");
  });
  document.querySelector("#shrine-search").addEventListener("click", loadShrines);
  document.querySelector("#shrine-query").addEventListener("keydown", (event) => {
    if (event.key === "Enter") loadShrines();
  });
  document.querySelector("#shrine-reset").addEventListener("click", () => {
    document.querySelector("#shrine-diocese").value = "";
    document.querySelector("#shrine-query").value = "";
    sortState = null;
    loadShrines();
  });
  document.querySelector("#shrine-diocese").addEventListener("change", () => {
    sortState = null;
    loadShrines();
  });
  document.querySelector("#shrine-create").addEventListener("click", () => openEditor(null));
  document.querySelectorAll("[data-shrine-close]").forEach((element) => element.addEventListener("click", closeEditor));
  var pilgrimsModal = document.querySelector("#shrine-pilgrims-modal");
  document.querySelectorAll("[data-pilgrims-close]").forEach((element) => element.addEventListener("click", closePilgrims));
  async function openPilgrims(shrine) {
    pilgrimsModal.hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#shrine-pilgrims-title").textContent = shrine.name;
    document.querySelector("#shrine-pilgrims-summary").textContent = "\uC21C\uB840\uC790 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.";
    document.querySelector("#shrine-pilgrims-content").innerHTML = '<div class="pilgrims-empty">\uBD88\uB7EC\uC624\uB294 \uC911...</div>';
    try {
      const result = await api4(`/api/parish/shrines/${shrine.id}/pilgrims`);
      document.querySelector("#shrine-pilgrims-summary").textContent = `\uBC29\uBB38 \uC2E0\uB3C4 ${result.items.length.toLocaleString("ko-KR")}\uBA85`;
      document.querySelector("#shrine-pilgrims-content").innerHTML = result.items.length ? `<div class="pilgrims-table-wrap"><table class="pilgrims-table"><thead><tr><th>\uC2E0\uB3C4\uBA85</th><th>\uC138\uB840\uBA85</th><th>\uC5F0\uB77D\uCC98</th><th>\uC774\uBA54\uC77C</th><th>\uBC29\uBB38\uC77C\uC2DC</th></tr></thead><tbody>${result.items.map((item) => `<tr><td><strong>${escapeHtml3(item.name)}</strong></td><td>${escapeHtml3(item.baptismalName ?? "-")}</td><td>${escapeHtml3(item.mobile ?? "-")}</td><td>${escapeHtml3(item.email)}</td><td>${new Date(item.visitedAt).toLocaleString("ko-KR")}</td></tr>`).join("")}</tbody></table></div>` : '<div class="pilgrims-empty">\uC774 \uC131\uC9C0\uB97C \uBC29\uBB38\uD55C \uC2E0\uB3C4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
    } catch (error) {
      document.querySelector("#shrine-pilgrims-summary").textContent = "";
      document.querySelector("#shrine-pilgrims-content").innerHTML = `<div class="pilgrims-empty error">${escapeHtml3(error.message)}</div>`;
    }
  }
  function closePilgrims() {
    pilgrimsModal.hidden = true;
    document.body.classList.remove("modal-open");
  }
  function field(id) {
    return document.querySelector(id);
  }
  function openEditor(item) {
    field("#shrine-id").value = item ? String(item.id) : "";
    field("#shrine-form-diocese").value = item?.diocese ?? "";
    field("#shrine-form-name").value = item?.name ?? "";
    field("#shrine-form-address").value = item?.address ?? "";
    field("#shrine-form-phones").value = item?.phoneNumbers.join("\n") ?? "";
    field("#shrine-form-website").value = item?.websiteUrl ?? "";
    field("#shrine-form-notes").value = item?.notes.join("\n") ?? "";
    field("#shrine-form-enabled").checked = item?.enabled ?? true;
    document.querySelector("#shrine-editor-title").textContent = item ? "\uC131\uC9C0 \uC815\uBCF4 \uC218\uC815" : "\uC131\uC9C0 \uC2E0\uADDC \uB4F1\uB85D";
    document.querySelector("#shrine-form-error").textContent = "";
    modal2.hidden = false;
    document.body.classList.add("modal-open");
  }
  function closeEditor() {
    modal2.hidden = true;
    document.body.classList.remove("modal-open");
  }
  function formPayload() {
    return { diocese: field("#shrine-form-diocese").value, name: field("#shrine-form-name").value, address: field("#shrine-form-address").value, phoneNumbers: field("#shrine-form-phones").value, websiteUrl: field("#shrine-form-website").value, notes: field("#shrine-form-notes").value, enabled: field("#shrine-form-enabled").checked };
  }
  form2.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = field("#shrine-id").value;
    try {
      const result = await api4(id ? `/api/parish/shrines/${id}` : "/api/parish/shrines", { method: id ? "PATCH" : "POST", body: JSON.stringify(formPayload()) });
      closeEditor();
      await loadShrines();
      notice3(result.message);
    } catch (error) {
      const failure = error;
      document.querySelector("#shrine-form-error").textContent = failure.errors ? Object.values(failure.errors)[0] ?? failure.message : failure.message;
    }
  });
  async function saveShrine(item, change) {
    try {
      const result = await api4(`/api/parish/shrines/${item.id}`, { method: "PATCH", body: JSON.stringify({ ...item, ...change }) });
      await loadShrines();
      notice3(result.message);
    } catch (error) {
      notice3(error.message);
      await loadShrines();
    }
  }
  async function removeShrine(item) {
    if (!window.confirm(`'${item.name}' \uC815\uBCF4\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`)) return;
    try {
      const result = await api4(`/api/parish/shrines/${item.id}`, { method: "DELETE" });
      await loadShrines();
      notice3(result.message);
    } catch (error) {
      notice3(error.message);
    }
  }
  var shrineReviews = [];
  async function loadShrineReviews() {
    const query = document.querySelector("#shrine-review-query").value.trim();
    try {
      shrineReviews = await api4(`/api/parish/shrine-reviews?q=${encodeURIComponent(query)}`);
      renderShrineReviews();
    } catch (error) {
      notice3(error.message);
    }
  }
  function renderShrineReviews() {
    const list = document.querySelector("#shrine-review-list");
    list.innerHTML = shrineReviews.length ? `<div class="shrine-review-grid-wrap"><table class="shrine-review-grid"><thead><tr><th>\uC21C\uB840\uC9C0</th><th>\uD6C4\uAE30 \uC81C\uBAA9</th><th>\uC791\uC131\uC790</th><th>\uC21C\uB840\uC77C</th><th>\uB4F1\uB85D\uC77C</th><th>\uD0DC\uADF8</th><th>\uC0AC\uC9C4</th><th>\uB178\uCD9C</th></tr></thead><tbody>${shrineReviews.map((item) => `<tr class="${item.enabled ? "" : "is-disabled"}"><td><span class="shrine-diocese-badge">${escapeHtml3(item.diocese)}</span><button class="shrine-review-shrine" data-review-shrine="${item.id}" type="button">${escapeHtml3(item.shrineName)}</button></td><td><button data-review-view="${item.id}" type="button">${escapeHtml3(item.title)}</button></td><td>${escapeHtml3(item.authorName)}${item.baptismalName ? ` (${escapeHtml3(item.baptismalName)})` : ""}</td><td>${escapeHtml3(item.visitedDate)}</td><td>${new Date(item.createdAt).toLocaleString("ko-KR")}</td><td>${item.tags.map((tag) => `<span class="shrine-review-tag">#${escapeHtml3(tag)}</span>`).join(" ") || "-"}</td><td><button class="shrine-review-photo" data-review-photo="${item.id}" type="button">\uBCF4\uAE30 (${item.imageUrls.length})</button></td><td><label class="shrine-review-enable"><input data-review-enable="${item.id}" type="checkbox" ${item.enabled ? "checked" : ""}><span>${item.enabled ? "Enable" : "Disable"}</span></label></td></tr>`).join("")}</tbody></table></div>` : "";
    document.querySelector("#shrine-review-count").textContent = `\uCD1D ${shrineReviews.length.toLocaleString("ko-KR")}\uAC74`;
    document.querySelector("#shrine-review-empty").hidden = shrineReviews.length > 0;
    list.querySelectorAll("[data-review-view]").forEach((button) => button.onclick = () => openShrineReview(findReview(button, "reviewView")));
    list.querySelectorAll("[data-review-shrine]").forEach((button) => button.onclick = () => openReviewShrine(findReview(button, "reviewShrine")));
    list.querySelectorAll("[data-review-photo]").forEach((button) => button.onclick = () => openReviewPhoto(findReview(button, "reviewPhoto")));
    list.querySelectorAll("[data-review-enable]").forEach((input) => input.onchange = () => setReviewEnabled(findReview(input, "reviewEnable"), input.checked));
  }
  function findReview(element, key) {
    return shrineReviews.find((item) => item.id === Number(element.dataset[key]));
  }
  function closeReviewModal(layer, selector) {
    layer.querySelectorAll(selector).forEach((element) => element.addEventListener("click", () => {
      layer.remove();
      document.body.classList.remove("modal-open");
    }));
  }
  function openShrineReview(item) {
    document.querySelector("#shrine-review-detail-modal")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div id="shrine-review-detail-modal" class="priest-modal"><div class="priest-modal-backdrop" data-review-close></div><section class="priest-modal-box shrine-review-detail-box" role="dialog" aria-modal="true"><header><div><p>PILGRIMAGE REVIEW</p><h2>${escapeHtml3(item.title)}</h2></div><button data-review-close type="button" aria-label="\uB2EB\uAE30">\xD7</button></header><div class="shrine-review-detail"><dl><div><dt>\uC21C\uB840\uC9C0</dt><dd>${escapeHtml3(item.diocese)} \xB7 ${escapeHtml3(item.shrineName)}</dd></div><div><dt>\uC791\uC131\uC790</dt><dd>${escapeHtml3(item.authorName)}${item.baptismalName ? ` (${escapeHtml3(item.baptismalName)})` : ""}</dd></div><div><dt>\uBC29\uBB38\uC77C</dt><dd>${escapeHtml3(item.visitedDate)}</dd></div><div><dt>\uB178\uCD9C \uC0C1\uD0DC</dt><dd>${item.enabled ? "Enable" : "Disable"}</dd></div><div><dt>\uD0DC\uADF8</dt><dd>${item.tags.map((tag) => `<span>#${escapeHtml3(tag)}</span>`).join(" ") || "-"}</dd></div></dl><article>${escapeHtml3(item.reviewText ?? "\uD6C4\uAE30 \uB0B4\uC6A9\uC774 \uC5C6\uB294 \uC774\uC804 \uB4F1\uB85D \uC790\uB8CC\uC785\uB2C8\uB2E4.")}</article></div><footer><button class="secondary" data-review-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
    document.body.classList.add("modal-open");
    closeReviewModal(document.querySelector("#shrine-review-detail-modal"), "[data-review-close]");
  }
  function openReviewShrine(item) {
    document.querySelector("#shrine-review-shrine-modal")?.remove();
    const website = item.websiteUrl && /^https?:\/\//i.test(item.websiteUrl) ? `<a href="${escapeHtml3(item.websiteUrl)}" target="_blank" rel="noopener noreferrer">\uD648\uD398\uC774\uC9C0 \uBC14\uB85C\uAC00\uAE30 \u2197</a>` : "-";
    document.body.insertAdjacentHTML("beforeend", `<div id="shrine-review-shrine-modal" class="priest-modal"><div class="priest-modal-backdrop" data-shrine-info-close></div><section class="priest-modal-box shrine-review-detail-box"><header><div><p>PILGRIMAGE PLACE</p><h2>${escapeHtml3(item.shrineName)}</h2></div><button data-shrine-info-close type="button">\xD7</button></header><div class="shrine-review-shrine-info"><dl><div><dt>\uAD50\uAD6C</dt><dd>${escapeHtml3(item.diocese)}</dd></div><div><dt>\uC8FC\uC18C</dt><dd>${escapeHtml3(item.address ?? "-")}</dd></div><div><dt>\uC804\uD654\uBC88\uD638</dt><dd>${item.phoneNumbers.length ? item.phoneNumbers.map(escapeHtml3).join("<br>") : "-"}</dd></div><div><dt>\uD648\uD398\uC774\uC9C0</dt><dd>${website}</dd></div></dl>${item.notes.length ? `<article>${item.notes.map(escapeHtml3).join("<br>")}</article>` : ""}</div><footer><button class="secondary" data-shrine-info-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
    document.body.classList.add("modal-open");
    closeReviewModal(document.querySelector("#shrine-review-shrine-modal"), "[data-shrine-info-close]");
  }
  function openReviewPhoto(item) {
    document.querySelector("#shrine-review-photo-modal")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div id="shrine-review-photo-modal" class="priest-modal"><div class="priest-modal-backdrop" data-photo-close></div><section class="priest-modal-box shrine-review-photo-box"><header><div><p>UPLOADED PHOTOS \xB7 ${item.imageUrls.length}</p><h2>${escapeHtml3(item.title)}</h2></div><button data-photo-close type="button">\xD7</button></header><div class="shrine-review-photo-gallery">${item.imageUrls.map((url, index) => `<figure><img src="${url}" alt="${escapeHtml3(item.title)} \uC0AC\uC9C4 ${index + 1}"><figcaption>${index + 1} / ${item.imageUrls.length}</figcaption></figure>`).join("")}</div><footer><button class="secondary" data-photo-close type="button">\uB2EB\uAE30</button></footer></section></div>`);
    document.body.classList.add("modal-open");
    closeReviewModal(document.querySelector("#shrine-review-photo-modal"), "[data-photo-close]");
  }
  async function setReviewEnabled(item, enabled) {
    try {
      const result = await api4(`/api/parish/shrine-reviews/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ enabled }) });
      item.enabled = enabled;
      renderShrineReviews();
      notice3(result.message);
    } catch (error) {
      notice3(error.message);
      await loadShrineReviews();
    }
  }
  document.querySelector("#shrine-review-search").addEventListener("click", loadShrineReviews);
  document.querySelector("#shrine-review-query").addEventListener("keydown", (event) => {
    if (event.key === "Enter") void loadShrineReviews();
  });
  document.querySelector("#shrine-review-reset").addEventListener("click", () => {
    document.querySelector("#shrine-review-query").value = "";
    void loadShrineReviews();
  });
})();
