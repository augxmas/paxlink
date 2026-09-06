"use strict";
(() => {
  // src/client/intro-information.ts
  var photo = document.querySelector(".parish-photo");
  if (photo && location.hostname === "hopyeongdong.paxlink.kr") {
    let markup = function(html) {
      const t = document.createElement("template");
      t.innerHTML = html;
      t.content.querySelectorAll("script,style,iframe,object,embed,svg,math,template").forEach((e) => e.remove());
      const allowed = /* @__PURE__ */ new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "A", "IMG", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "DIV", "SPAN"]);
      const clean = (root) => {
        [...root.children].forEach((e) => {
          clean(e);
          if (!allowed.has(e.tagName)) {
            e.replaceWith(...e.childNodes);
            return;
          }
          const url = e.getAttribute(e.tagName === "IMG" ? "src" : "href");
          [...e.attributes].forEach((a) => e.removeAttribute(a.name));
          if (url && ["A", "IMG"].includes(e.tagName)) {
            try {
              const parsed = new URL(url, location.origin);
              if (["http:", "https:"].includes(parsed.protocol)) {
                e.setAttribute(e.tagName === "IMG" ? "src" : "href", parsed.href);
                if (e.tagName === "A") {
                  e.setAttribute("target", "_blank");
                  e.setAttribute("rel", "noopener noreferrer");
                } else e.setAttribute("alt", "\uC131\uB2F9 \uC548\uB0B4 \uC774\uBBF8\uC9C0");
              }
            } catch {
            }
          }
        });
      };
      clean(t.content);
      if (!t.content.textContent?.trim() && !t.content.querySelector("img[src]")) empty();
      else body.append(t.content);
    }, render = function(kind, data) {
      const b = data.basic;
      if (kind === "patron" || kind === "guide") {
        markup(kind === "patron" ? data.patronHtml : data.guideHtml);
        return;
      }
      if (kind === "basic" || kind === "contact" || kind === "territory") {
        const fields = kind === "basic" ? [["name", "\uC131\uB2F9\uBA85"], ["diocese", "\uAD50\uAD6C"], ["district", "\uC9C0\uAD6C"], ["address", "\uC8FC\uC18C"], ["addressDetail", "\uC0C1\uC138\uC8FC\uC18C"]] : kind === "territory" ? [["diocese", "\uAD50\uAD6C"], ["district", "\uC9C0\uAD6C"], ["jurisdiction", "\uAD00\uD560 \uAD6C\uC5ED"]] : [["phone", "\uB300\uD45C\uC804\uD654"], ["officePhone", "\uC0AC\uBB34\uC2E4"], ["fax", "\uD329\uC2A4"], ["address", "\uC8FC\uC18C"]];
        fields.forEach(([key, label]) => body.append(el("h3", label), el("p", b[key] || "\uB4F1\uB85D\uB41C \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.")));
        return;
      }
      if (kind === "priests") {
        if (!data.priests.length) empty();
        data.priests.forEach((p) => {
          const a = el("article", "");
          a.append(el("h3", `${p.name}${p.baptismalName ? " (" + p.baptismalName + ")" : ""}`), el("p", [p.role, p.affiliation].filter(Boolean).join(" \xB7 ")));
          body.append(a);
        });
        return;
      }
      if (kind === "history") {
        if (!data.history.length) empty();
        data.history.forEach((h) => {
          const a = el("article", "");
          a.append(el("h3", `${h.year}.${String(h.month).padStart(2, "0")} \xB7 ${h.title}`), el("p", h.description || ""));
          body.append(a);
        });
        return;
      }
      if (kind === "location") {
        if (b.address) {
          body.append(el("p", [b.address, b.addressDetail].filter(Boolean).join(" ")));
          const map = document.createElement("iframe");
          map.title = "\uC131\uB2F9 \uC704\uCE58 \uC9C0\uB3C4";
          map.src = `https://maps.google.com/maps?q=${encodeURIComponent(b.address)}&hl=ko&z=16&output=embed`;
          body.append(map);
        } else empty();
        body.append(el("h3", "\uAD50\uD1B5\uD3B8 \uC548\uB0B4"));
        if (!data.transportGuides.length) empty();
        data.transportGuides.forEach((g) => {
          const a = el("article", "");
          a.append(el("h3", [g.mode, g.route].filter(Boolean).join(" \xB7 ")), el("p", g.details));
          body.append(a);
        });
        return;
      }
      if (kind === "pastoral") {
        if (!data.plans.length) {
          empty();
          return;
        }
        const label = el("label", "\uC5F0\uB3C4 "), select = document.createElement("select"), content = el("div", "");
        select.setAttribute("aria-label", "\uC0AC\uBAA9 \uBAA9\uD45C \uC5F0\uB3C4");
        data.plans.forEach((p) => select.add(new Option(`${p.year}\uB144`, String(p.year))));
        select.value = String(data.plans.find((p) => p.year === (/* @__PURE__ */ new Date()).getFullYear())?.year ?? data.plans[0].year);
        const show = () => {
          const p = data.plans.find((p2) => p2.year === Number(select.value)).content;
          content.replaceChildren(el("h3", p.theme));
          if (p.scripture) content.append(el("blockquote", p.scripture));
          if (p.direction) content.append(el("p", p.direction));
          p.goals.forEach((g) => {
            const a = el("article", "");
            a.append(el("h3", [g.area, g.title].filter(Boolean).join(" \xB7 ")), el("p", g.plan));
            content.append(a);
          });
        };
        select.onchange = show;
        label.append(select);
        body.append(label, content);
        show();
      }
    };
    markup2 = markup, render2 = render;
    const cards = [["priests", "\u{1F468}\u200D\u2695\uFE0F", "\uC2E0\uBD80\uB2D8 \uC18C\uAC1C"], ["location", "\u{1F4CD}", "\uC704\uCE58 \uC548\uB0B4"], ["history", "\u{1F4DC}", "\uBCF8\uB2F9 \uC5F0\uD601"], ["patron", "\u2B50", "\uC8FC\uBCF4 \uC131\uC778"], ["guide", "\u{1F4CB}", "\uD589\uC815 \uC548\uB0B4"], ["territory", "\u{1F5FA}\uFE0F", "\uAD00\uD560 \uAD6C\uC5ED"], ["pastoral", "\u{1F3AF}", "\uC0AC\uBAA9 \uBAA9\uD45C"], ["basic", "\u{1F3EB}", "\uC131\uB2F9 \uC18C\uAC1C"], ["contact", "\u260E\uFE0F", "\uC131\uB2F9\uC5F0\uB77D\uCC98"]];
    photo.removeAttribute("aria-hidden");
    photo.setAttribute("role", "button");
    photo.tabIndex = 0;
    photo.setAttribute("aria-label", "\uC131\uB2F9 \uC548\uB0B4 \uC5F4\uAE30");
    photo.setAttribute("aria-haspopup", "dialog");
    const dialog = document.createElement("dialog");
    dialog.id = "intro-information";
    dialog.setAttribute("aria-labelledby", "intro-info-title");
    dialog.innerHTML = '<header class="intro-info-header"><button type="button" aria-label="\uC774\uC804 \uD654\uBA74">\u2039</button><div><h2 id="intro-info-title">\uD638\uD3C9\uB3D9 \uC131\uB2F9 \uC548\uB0B4</h2><p>\uD655\uC778\uD560 \uC131\uB2F9 \uC815\uBCF4\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694</p></div></header><div class="intro-info-grid"></div><div class="intro-info-content" aria-live="polite" hidden></div>';
    document.body.append(dialog);
    const grid = dialog.querySelector(".intro-info-grid"), body = dialog.querySelector(".intro-info-content"), title = dialog.querySelector("h2"), hint = dialog.querySelector("header p"), back = dialog.querySelector("header button");
    let active = "", version = 0, opener = null;
    const el = (tag, text) => {
      const e = document.createElement(tag);
      e.textContent = text;
      return e;
    };
    const empty = () => body.append(el("p", "\uC544\uC9C1 \uB4F1\uB85D\uB41C \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."));
    async function open(kind, label) {
      const request = ++version;
      active = kind;
      grid.hidden = true;
      body.hidden = false;
      title.textContent = label;
      hint.hidden = true;
      back.focus();
      dialog.scrollTop = 0;
      body.replaceChildren(el("p", "\uC131\uB2F9 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."));
      try {
        const response = await fetch("/api/public/parish-information", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "\uC131\uB2F9 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
        if (request !== version || !dialog.open) return;
        body.replaceChildren();
        render(kind, data);
      } catch (e) {
        if (request !== version || !dialog.open) return;
        body.replaceChildren(el("p", e.message));
        const retry = el("button", "\uB2E4\uC2DC \uBD88\uB7EC\uC624\uAE30");
        retry.onclick = () => void open(kind, label);
        body.append(retry);
      }
    }
    cards.forEach(([kind, icon, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.kind = kind;
      const emoji = el("span", icon);
      emoji.setAttribute("aria-hidden", "true");
      button.append(emoji, el("strong", label));
      button.onclick = () => {
        opener = button;
        void open(kind, label);
      };
      grid.append(button);
    });
    const reset = () => {
      ++version;
      active = "";
      grid.hidden = false;
      body.hidden = true;
      title.textContent = "\uD638\uD3C9\uB3D9 \uC131\uB2F9 \uC548\uB0B4";
      hint.hidden = false;
      dialog.scrollTop = 0;
    };
    back.onclick = () => {
      if (active) {
        reset();
        opener?.focus();
      } else dialog.close();
    };
    dialog.addEventListener("cancel", (e) => {
      if (active) {
        e.preventDefault();
        reset();
        opener?.focus();
      }
    });
    dialog.addEventListener("close", () => {
      ++version;
      photo.focus();
    });
    photo.onclick = () => {
      reset();
      dialog.showModal();
      back.focus();
    };
    photo.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        photo.click();
      }
    };
  }
  var markup2;
  var render2;
})();
