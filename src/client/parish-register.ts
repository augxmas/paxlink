declare global {
  interface Window { daum: { Postcode: new (options: { oncomplete: (data: KakaoAddress) => void }) => { open: () => void } } }
}
type KakaoAddress = { zonecode: string; roadAddress: string; jibunAddress: string };
type FieldName = "name" | "parishCode" | "phone" | "postalCode" | "address" | "addressDetail" | "diocese" | "district" | "jurisdiction" | "officePhone" | "fax" | "homepage";

const email = document.querySelector<HTMLInputElement>("#reg-email")!;
const managerName = document.querySelector<HTMLInputElement>("#reg-manager-name")!;
const code = document.querySelector<HTMLInputElement>("#reg-code")!;
const codeRow = document.querySelector<HTMLElement>("#verification-code-row")!;
const sendCode = document.querySelector<HTMLButtonElement>("#send-registration-code")!;
const verifyCode = document.querySelector<HTMLButtonElement>("#verify-registration-code")!;
const message = document.querySelector<HTMLParagraphElement>("#registration-message")!;
const details = document.querySelector<HTMLElement>("#details-section")!;
const fieldset = details.querySelector<HTMLFieldSetElement>("fieldset")!;
const form = document.querySelector<HTMLFormElement>("#registration-form")!;
let verificationToken = "";
const customAlert = document.querySelector<HTMLElement>("#custom-alert")!;
const customAlertMessage = document.querySelector<HTMLParagraphElement>("#custom-alert-message")!;
const customAlertConfirm = document.querySelector<HTMLButtonElement>("#custom-alert-confirm")!;

function showCustomAlert(text: string) {
  return new Promise<void>((resolve) => {
    const close = () => {
      customAlert.hidden = true;
      document.body.classList.remove("modal-open");
      customAlertConfirm.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeydown);
      resolve();
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") close();
    };
    customAlertMessage.textContent = text;
    customAlert.hidden = false;
    document.body.classList.add("modal-open");
    customAlertConfirm.addEventListener("click", close);
    document.addEventListener("keydown", onKeydown);
    window.setTimeout(() => customAlertConfirm.focus(), 0);
  });
}

const fields = Object.fromEntries([...form.querySelectorAll<HTMLInputElement>("input[name]")].map((input) => [input.name, input])) as Record<FieldName, HTMLInputElement>;
const phonePattern = /^(?:02-\d{4}-\d{4}|\d{3}-\d{3,4}-\d{4})$/;

function setMessage(text: string, isError = false) { message.textContent = text; message.classList.toggle("error", isError); }
function showError(id: string, text: string) {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  const target = document.querySelector<HTMLElement>(`[data-error-for="${id}"]`);
  input?.classList.toggle("invalid", Boolean(text));
  if (target) target.textContent = text;
}
function validateEmail() {
  const error = /^\S+@\S+\.\S+$/.test(email.value.trim()) ? "" : "올바른 이메일 주소를 입력해 주세요.";
  showError("reg-email", error); return !error;
}
function validateManagerName() {
  const valid = managerName.value.trim().length >= 2 && managerName.value.trim().length <= 100;
  showError("reg-manager-name", valid ? "" : "담당자 이름을 2~100자로 입력해 주세요.");
  return valid;
}
function validateField(name: FieldName) {
  const value = fields[name].value.trim();
  let error = "";
  if (name === "name" && (value.length < 2 || value.length > 120)) error = "성당 이름은 2~120자로 입력해 주세요.";
  if (name === "parishCode" && !/^[A-Za-z0-9_-]{2,40}$/.test(value)) error = "영문, 숫자, _, -만 사용해 2~40자로 입력해 주세요.";
  if ((name === "phone" || name === "officePhone") && !phonePattern.test(value)) error = "02-0000-0000, 000-000-0000 또는 000-0000-0000 형식으로 입력해 주세요.";
  if (name === "fax" && value && !phonePattern.test(value)) error = "02-0000-0000, 000-000-0000 또는 000-0000-0000 형식으로 입력해 주세요.";
  if (name === "postalCode" && !/^\d{5}$/.test(value)) error = "카카오 주소 검색으로 우편번호를 선택해 주세요.";
  if (["address", "addressDetail", "diocese", "district", "jurisdiction"].includes(name) && !value) error = "필수 입력 항목입니다.";
  if (name === "homepage" && value) { try { const url = new URL(value); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { error = "http:// 또는 https://로 시작하는 URL을 입력해 주세요."; } }
  showError(name, error); return !error;
}

for (const [name, input] of Object.entries(fields) as [FieldName, HTMLInputElement][]) {
  if (["phone", "officePhone", "fax"].includes(name)) {
    input.addEventListener("input", () => {
      const isSeoul = input.value.replace(/\D/g, "").startsWith("02");
      const digits = input.value.replace(/\D/g, "").slice(0, isSeoul ? 10 : 11);
      input.value = isSeoul
        ? [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)].filter(Boolean).join("-")
        : digits.length <= 10
          ? [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join("-")
          : [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)].filter(Boolean).join("-");
      validateField(name);
    });
  } else input.addEventListener("input", () => validateField(name));
  input.addEventListener("blur", () => validateField(name));
}
email.addEventListener("input", validateEmail);
managerName.addEventListener("input", validateManagerName);

sendCode.addEventListener("click", async () => {
  if (!validateManagerName() || !validateEmail()) return;
  sendCode.disabled = true; setMessage("인증코드를 발송하고 있습니다.");
  try {
    const response = await fetch("/api/parish-registration/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ managerName: managerName.value.trim(), email: email.value }) });
    const data = await response.json() as { message: string; devCode?: string };
    if (!response.ok) throw new Error(data.message);
    codeRow.hidden = false; code.focus();
    setMessage(data.devCode ? `${data.message} 가상 인증번호: ${data.devCode}` : data.message);
  } catch (error) { setMessage((error as Error).message, true); }
  finally { sendCode.disabled = false; }
});

verifyCode.addEventListener("click", async () => {
  const codeError = /^\d{6}$/.test(code.value) ? "" : "6자리 숫자 인증코드를 입력해 주세요.";
  showError("reg-code", codeError); if (codeError) return;
  verifyCode.disabled = true;
  try {
    const response = await fetch("/api/parish-registration/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.value, code: code.value }) });
    const data = await response.json() as { message: string; token?: string };
    if (!response.ok || !data.token) throw new Error(data.message);
    verificationToken = data.token; managerName.readOnly = true; email.readOnly = true; code.readOnly = true;
    details.classList.remove("locked"); details.setAttribute("aria-disabled", "false"); fieldset.disabled = false;
    setMessage(data.message); fields.name.focus();
  } catch (error) { setMessage((error as Error).message, true); }
  finally { verifyCode.disabled = false; }
});

document.querySelector("#find-address")!.addEventListener("click", () => {
  if (!window.daum?.Postcode) return setMessage("카카오 주소 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
  new window.daum.Postcode({ oncomplete(data) {
    fields.postalCode.value = data.zonecode;
    fields.address.value = data.roadAddress || data.jibunAddress;
    validateField("postalCode"); validateField("address"); fields.addressDetail.focus();
  } }).open();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const valid = (Object.keys(fields) as FieldName[]).map(validateField).every(Boolean);
  if (!valid) return document.querySelector<HTMLInputElement>("input.invalid")?.focus();
  const payload = Object.fromEntries((Object.entries(fields) as [FieldName, HTMLInputElement][]).map(([name, input]) => [name, input.value.trim()]));
  try {
    const response = await fetch("/api/parishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, email: email.value, token: verificationToken }) });
    const data = await response.json() as { message: string; errors?: Partial<Record<FieldName, string>> };
    if (data.errors) for (const [name, error] of Object.entries(data.errors)) showError(name, error!);
    if (!response.ok) throw new Error(data.message);
    await showCustomAlert(data.message);
    location.href = "/parish";
  } catch (error) { setMessage((error as Error).message, true); window.scrollTo({ top: 0, behavior: "smooth" }); }
});

export {};
document.head.insertAdjacentHTML("beforeend",'<link rel="icon" type="image/svg+xml" href="/assets/favicon-parish.svg">');
