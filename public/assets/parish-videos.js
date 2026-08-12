"use strict";
(() => {
  // src/client/parish-videos.ts
  var panel = document.querySelector("#video-management");
  var form = document.querySelector("#video-lookup-form");
  var urlInput = document.querySelector("#video-url");
  var preview = document.querySelector("#video-metadata-preview");
  var errorBox = document.querySelector("#video-error");
  var pending = null;
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
      const result = await api("/api/parish/videos", { method: "POST", body: JSON.stringify({ url: pending.youtubeUrl }) });
      urlInput.value = "";
      pending = null;
      preview.hidden = true;
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
      list.innerHTML = videos.map((video) => `<article class="video-card" data-video="${video.id}"><a href="${video.youtubeUrl}" target="_blank" rel="noopener noreferrer"><img src="${video.thumbnailUrl}" alt=""></a><div><h4>${escapeHtml(video.title)}</h4><p>${escapeHtml(video.authorName || "\uCC44\uB110 \uC815\uBCF4 \uC5C6\uC74C")}</p><small>${new Date(video.createdAt).toLocaleDateString("ko-KR")} \uB4F1\uB85D</small></div><button type="button" aria-label="\uC0AD\uC81C">\uC0AD\uC81C</button></article>`).join("");
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
