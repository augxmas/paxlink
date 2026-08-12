type Parish = { id: number; name: string; diocese: string | null };

const form = document.querySelector<HTMLFormElement>("#login-form")!;
const parishInput = document.querySelector<HTMLInputElement>("#parish-search")!;
const parishId = document.querySelector<HTMLInputElement>("#parish-id")!;
const email = document.querySelector<HTMLInputElement>("#email")!;
const results = document.querySelector<HTMLDivElement>("#parish-results")!;
const codePanel = document.querySelector<HTMLElement>("#code-panel")!;
const codeInput = document.querySelector<HTMLInputElement>("#code")!;
const sendButton = document.querySelector<HTMLButtonElement>("#send-code")!;
const message = document.querySelector<HTMLParagraphElement>("#message")!;
const rememberParish = document.querySelector<HTMLInputElement>("#remember-parish")!;
const rememberEmail = document.querySelector<HTMLInputElement>("#remember-email")!;
let timer: number | undefined;
type PreviousSession = { logged_out_at: string; ip_address: string; logout_reason: "manual" | "timeout" } | null;
const loginAlert = document.querySelector<HTMLElement>("#parish-login-alert")!;
const loginAlertMessage = document.querySelector<HTMLElement>("#parish-alert-message")!;
const loginAlertConfirm = document.querySelector<HTMLButtonElement>("#parish-alert-confirm")!;

function showLoginAlert(previous: PreviousSession) {
  const loggedOut = previous ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(previous.logged_out_at)) : "";
  loginAlertMessage.textContent = previous
    ? `최근 로그아웃: ${loggedOut}\n접속 IP: ${previous.ip_address}\n종료 방식: ${previous.logout_reason === "timeout" ? "세션 만료" : "직접 로그아웃"}`
    : "이전 로그아웃 기록이 없습니다.";
  loginAlert.hidden = false;
  document.body.classList.add("modal-open");
  loginAlertConfirm.focus();
  loginAlertConfirm.addEventListener("click", () => {
    loginAlert.hidden = true;
    document.body.classList.remove("modal-open");
  }, { once: true });
}

const savedParish = localStorage.getItem("paxlink.parish");
if (savedParish) {
  const item = JSON.parse(savedParish) as Parish;
  parishId.value = String(item.id);
  parishInput.value = item.name;
}
email.value = localStorage.getItem("paxlink.email") ?? "";

function setMessage(text: string, error = false) {
  message.textContent = text;
  message.classList.toggle("error", error);
}

parishInput.addEventListener("input", () => {
  parishId.value = "";
  clearTimeout(timer);
  const query = parishInput.value.trim();
  if (query.length < 2) {
    results.replaceChildren();
    results.hidden = true;
    return;
  }
  timer = window.setTimeout(async () => {
    const response = await fetch(`/api/parishes?q=${encodeURIComponent(query)}`);
    const parishes = await response.json() as Parish[];
    results.replaceChildren();
    for (const parish of parishes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-item";
      button.innerHTML = `<strong></strong><span></span>`;
      button.querySelector("strong")!.textContent = parish.name;
      button.querySelector("span")!.textContent = parish.diocese ?? "교구 정보 없음";
      button.addEventListener("click", () => {
        parishInput.value = parish.name;
        parishId.value = String(parish.id);
        parishInput.dataset.diocese = parish.diocese ?? "";
        results.hidden = true;
      });
      results.append(button);
    }
    if (!parishes.length) results.textContent = "검색된 성당이 없습니다.";
    results.hidden = false;
  }, 250);
});

sendButton.addEventListener("click", async () => {
  if (!parishId.value) return setMessage("검색 결과에서 성당을 선택해 주세요.", true);
  if (!email.validity.valid || !email.value) return setMessage("올바른 이메일을 입력해 주세요.", true);
  sendButton.disabled = true;
  setMessage("인증코드를 보내고 있습니다.");
  try {
    const response = await fetch("/api/parish-auth/code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parishId: Number(parishId.value), email: email.value }),
    });
    const data = await response.json() as { message: string; devCode?: string };
    if (!response.ok) throw new Error(data.message);
    codePanel.hidden = false;
    codeInput.focus();
    setMessage(data.devCode ? `${data.message} 가상 인증번호: ${data.devCode}` : data.message);
  } catch (error) { setMessage((error as Error).message, true); }
  finally { sendButton.disabled = false; }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!/^\d{6}$/.test(codeInput.value)) return setMessage("6자리 인증코드를 입력해 주세요.", true);
  try {
    const response = await fetch("/api/parish-auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parishId: Number(parishId.value), email: email.value, code: codeInput.value }),
    });
    const data = await response.json() as { message: string; previousSession: PreviousSession };
    if (!response.ok) throw new Error(data.message);
    rememberParish.checked
      ? localStorage.setItem("paxlink.parish", JSON.stringify({ id: Number(parishId.value), name: parishInput.value, diocese: parishInput.dataset.diocese ?? null }))
      : localStorage.removeItem("paxlink.parish");
    rememberEmail.checked ? localStorage.setItem("paxlink.email", email.value) : localStorage.removeItem("paxlink.email");
    setMessage(data.message);
    showLoginAlert(data.previousSession);
    window.dispatchEvent(new CustomEvent("parish:authenticated", { detail: { email: email.value } }));
  } catch (error) { setMessage((error as Error).message, true); }
});
document.head.insertAdjacentHTML("beforeend",'<link rel="icon" type="image/svg+xml" href="/assets/favicon-parish.svg">');
