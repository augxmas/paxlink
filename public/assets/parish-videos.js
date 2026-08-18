"use strict";
(() => {
  // src/client/parish-videos.ts
  var panel = document.querySelector("#video-management");
  var form = document.querySelector("#video-lookup-form");
  var urlInput = document.querySelector("#video-url");
  var preview = document.querySelector("#video-metadata-preview");
  var errorBox = document.querySelector("#video-error");
  var pending = null;
  preview.querySelector(":scope>div").insertAdjacentHTML("beforeend", '<label id="video-tags-field" class="video-tags-field" hidden>\uD0DC\uADF8 \uC815\uBCF4<input id="video-tags" maxlength="1000" placeholder="\uC27C\uD45C(,) \uB610\uB294 \uB744\uC5B4\uC4F0\uAE30\uB85C \uAD6C\uBD84"><small>\uB3D9\uC601\uC0C1\uACFC \uAD00\uB828\uB41C \uD0DC\uADF8\uB97C \uCD5C\uB300 20\uAC1C\uAE4C\uC9C0 \uC785\uB825\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</small><span id="video-tag-preview"></span></label>');
  var tagsField = document.querySelector("#video-tags-field");
  var tagsInput = document.querySelector("#video-tags");
  tagsInput.addEventListener("input", () => {
    const tags = [...new Set(tagsInput.value.split(/[,\s]+/).map((value) => value.replace(/^#/, "").trim()).filter(Boolean))].slice(0, 20);
    document.querySelector("#video-tag-preview").innerHTML = tags.map((tag) => `<b>#${escapeHtml(tag)}</b>`).join("");
  });
  async function api(url, options) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers ?? {} } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
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
    const active = button.dataset.parishView === "videos";
    panel.hidden = !active;
    if (active) {
      ["#parish-profile-form", "#priest-management", "#history-management", "#patron-saint-management", "#administrative-guide-management"].forEach((selector) => document.querySelector(selector).hidden = true);
      document.querySelector("#profile-approval-status").hidden = true;
      await loadVideos();
    }
  }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";
    preview.hidden = true;
    tagsField.hidden = true;
    pending = null;
    const button = document.querySelector("#video-check");
    button.disabled = true;
    button.textContent = "\uD655\uC778 \uC911...";
    try {
      pending = await api("/api/parish/videos/metadata", { method: "POST", body: JSON.stringify({ url: urlInput.value }) });
      document.querySelector("#video-preview-thumbnail").src = pending.thumbnailUrl;
      document.querySelector("#video-preview-title").textContent = pending.title;
      document.querySelector("#video-preview-author").textContent = pending.authorName || "\uCC44\uB110 \uC815\uBCF4 \uC5C6\uC74C";
      const link = document.querySelector("#video-preview-link");
      link.href = pending.youtubeUrl;
      preview.hidden = false;
      tagsField.hidden = false;
      tagsInput.focus();
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "\uB3D9\uC601\uC0C1 \uD655\uC778";
    }
  });
  document.querySelector("#video-register").addEventListener("click", async () => {
    if (!pending) return;
    const button = document.querySelector("#video-register");
    button.disabled = true;
    try {
      const result = await api("/api/parish/videos", { method: "POST", body: JSON.stringify({ url: pending.youtubeUrl, tags: tagsInput.value }) });
      urlInput.value = "";
      tagsInput.value = "";
      document.querySelector("#video-tag-preview").innerHTML = "";
      pending = null;
      preview.hidden = true;
      tagsField.hidden = true;
      await loadVideos();
      notice(result.message);
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  async function loadVideos() {
    try {
      const videos = await api("/api/parish/videos");
      const list = document.querySelector("#video-list");
      list.innerHTML = videos.map((video) => `<article class="video-card" data-video="${video.id}"><a href="${video.youtubeUrl}" target="_blank" rel="noopener noreferrer"><img src="${video.thumbnailUrl}" alt=""></a><div><h4>${escapeHtml(video.title)}</h4><p>${escapeHtml(video.authorName || "\uCC44\uB110 \uC815\uBCF4 \uC5C6\uC74C")}</p>${video.tags.length ? `<div class="video-card-tags">${video.tags.map((tag) => `<b>#${escapeHtml(tag)}</b>`).join("")}</div>` : ""}<small>${new Date(video.createdAt).toLocaleDateString("ko-KR")} \uB4F1\uB85D</small></div><button type="button" aria-label="\uC0AD\uC81C">\uC0AD\uC81C</button></article>`).join("");
      list.querySelectorAll("[data-video] button").forEach((button) => button.addEventListener("click", () => removeVideo(Number(button.closest("[data-video]").dataset.video))));
      document.querySelector("#video-count").textContent = `\uCD1D ${videos.length}\uAC1C`;
      document.querySelector("#video-empty").hidden = videos.length > 0;
    } catch (error) {
      notice(error.message);
    }
  }
  async function removeVideo(id) {
    if (!window.confirm("\uC774 \uB3D9\uC601\uC0C1\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    try {
      const result = await api(`/api/parish/videos/${id}`, { method: "DELETE" });
      await loadVideos();
      notice(result.message);
    } catch (error) {
      notice(error.message);
    }
  }
})();
