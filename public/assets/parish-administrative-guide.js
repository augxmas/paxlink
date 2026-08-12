"use strict";
(() => {
  // src/client/parish-administrative-guide.ts
  var panel = document.querySelector("#administrative-guide-management");
  var editor = document.querySelector("#administrative-editor");
  var preview = document.querySelector("#administrative-preview");
  var allowedTags = /* @__PURE__ */ new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE", "A"]);
  async function api(url, options) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers ?? {} } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    return data;
  }
  function notice(message) {
    window.dispatchEvent(new CustomEvent("parish:notice", { detail: message }));
  }
  function safeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const clean = (root) => {
      [...root.children].forEach((element) => {
        clean(element);
        if (!allowedTags.has(element.tagName)) {
          element.replaceWith(...element.childNodes);
          return;
        }
        const href = element.getAttribute("href") ?? "";
        for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
        if (element.tagName === "A") {
          if (/^https?:\/\//i.test(href)) {
            element.setAttribute("href", href);
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer");
          } else element.replaceWith(...element.childNodes);
        }
      });
    };
    clean(template.content);
    return template.innerHTML;
  }
  document.querySelectorAll("[data-parish-view]").forEach((button) => button.addEventListener("click", async () => {
    const active = button.dataset.parishView === "administrative-guide";
    panel.hidden = !active;
    if (active) {
      document.querySelector("#parish-profile-form").hidden = true;
      document.querySelector("#priest-management").hidden = true;
      document.querySelector("#history-management").hidden = true;
      document.querySelector("#patron-saint-management").hidden = true;
      document.querySelector("#profile-approval-status").hidden = true;
      await loadContent();
    }
  }));
  async function loadContent() {
    try {
      const data = await api("/api/parish/administrative-guide");
      editor.innerHTML = safeHtml(data.contentHtml);
      document.querySelector("#administrative-updated-at").textContent = data.updatedAt ? `\uB9C8\uC9C0\uB9C9 \uC800\uC7A5: ${new Date(data.updatedAt).toLocaleString("ko-KR")}` : "\uC544\uC9C1 \uC800\uC7A5\uB41C \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
    } catch (error) {
      notice(error.message);
    }
  }
  document.querySelectorAll("[data-administrative-command]").forEach((button) => button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    editor.focus();
    document.execCommand(button.dataset.administrativeCommand, false);
  }));
  document.querySelector("#administrative-format").addEventListener("change", (event) => {
    editor.focus();
    document.execCommand("formatBlock", false, event.currentTarget.value);
  });
  document.querySelector("#administrative-add-link").addEventListener("mousedown", (event) => {
    event.preventDefault();
    const url = window.prompt("\uC5F0\uACB0\uD560 \uC8FC\uC18C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.", "https://");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      notice("http:// \uB610\uB294 https://\uB85C \uC2DC\uC791\uD558\uB294 \uC8FC\uC18C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    editor.focus();
    document.execCommand("createLink", false, url);
  });
  document.querySelector("#administrative-save").addEventListener("click", async () => {
    try {
      const contentHtml = safeHtml(editor.innerHTML);
      editor.innerHTML = contentHtml;
      const result = await api("/api/parish/administrative-guide", { method: "PUT", body: JSON.stringify({ contentHtml }) });
      notice(result.message);
      await loadContent();
    } catch (error) {
      notice(error.message);
    }
  });
  document.querySelector("#administrative-preview-button").addEventListener("click", () => {
    document.querySelector("#administrative-preview-content").innerHTML = safeHtml(editor.innerHTML);
    preview.hidden = false;
    document.body.classList.add("modal-open");
  });
  document.querySelectorAll("[data-administrative-preview-close]").forEach((element) => element.addEventListener("click", () => {
    preview.hidden = true;
    document.body.classList.remove("modal-open");
  }));
})();
