type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: "accepted" | "dismissed"}>;
};

type NavigatorWithPwa = Navigator & {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<Array<unknown>>;
};

const DISMISSED_DATE_KEY = "paxlink-pwa-install-dismissed-date";
const mobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia("(pointer: coarse)").matches;
const iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
let deferredInstallPrompt: InstallPromptEvent | null = null;
let modalShown = false;

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isStandalone() {
  const pwaNavigator = navigator as NavigatorWithPwa;
  return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || pwaNavigator.standalone === true;
}

function dismissedToday() {
  try { return localStorage.getItem(DISMISSED_DATE_KEY) === localDateKey(); } catch { return false; }
}

function rememberToday() {
  try { localStorage.setItem(DISMISSED_DATE_KEY, localDateKey()); } catch {}
}

async function isAlreadyInstalled() {
  if (isStandalone()) return true;
  const pwaNavigator = navigator as NavigatorWithPwa;
  if (!pwaNavigator.getInstalledRelatedApps) return false;
  try { return (await pwaNavigator.getInstalledRelatedApps()).length > 0; } catch { return false; }
}

function closeInstallModal(modal: HTMLElement) {
  modal.remove();
  deferredInstallPrompt = null;
}

async function showInstallModal() {
  if (modalShown || !mobileDevice || dismissedToday() || await isAlreadyInstalled()) return;
  if (!iosDevice && !deferredInstallPrompt) return;
  modalShown = true;

  const modal = document.createElement("div");
  modal.className = "member-modal pwa-install-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "pwa-install-title");
  modal.innerHTML = `
    <section class="member-modal-box">
      <div class="pwa-install-icon"><img src="/pwa-icon" alt=""></div>
      <h3 id="pwa-install-title">Paxlink를 설치해 보세요</h3>
      <div class="member-modal-body">
        <p>홈 화면에서 바로 열면 본당 소식과 신앙 공동체를 더 편리하게 만날 수 있습니다.</p>
        ${iosDevice ? '<p class="pwa-install-guide"><b>공유</b> 버튼을 누른 뒤 <b>홈 화면에 추가</b>를 선택해 주세요.</p>' : ""}
        <label class="pwa-install-today"><input type="checkbox"> 오늘 하루 안 보기</label>
      </div>
      <footer class="pwa-install-actions">
        <button type="button" class="green-outline" data-pwa-close>다음에</button>
        <button type="button" class="green-button" data-pwa-install>${iosDevice ? "확인" : "설치하기"}</button>
      </footer>
    </section>`;
  document.body.append(modal);

  const today = modal.querySelector<HTMLInputElement>(".pwa-install-today input")!;
  const close = () => { if (today.checked) rememberToday(); closeInstallModal(modal); };
  modal.querySelector<HTMLButtonElement>("[data-pwa-close]")!.addEventListener("click", close);
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  modal.querySelector<HTMLButtonElement>("[data-pwa-install]")!.addEventListener("click", async () => {
    if (today.checked) rememberToday();
    if (iosDevice || !deferredInstallPrompt) { closeInstallModal(modal); return; }
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") closeInstallModal(modal);
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event as InstallPromptEvent;
  void showInstallModal();
});
window.addEventListener("appinstalled", () => {
  document.querySelector(".pwa-install-modal")?.remove();
  deferredInstallPrompt = null;
});
window.addEventListener("load", () => { if (iosDevice) void showInstallModal(); });
