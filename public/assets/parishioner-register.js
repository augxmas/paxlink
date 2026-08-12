"use strict";
(() => {
  // src/client/parishioner-register.ts
  var search = document.querySelector("#join-parish-search");
  var parishId = document.querySelector("#join-parish-id");
  var results = document.querySelector("#join-parish-results");
  var nameInput = document.querySelector("#join-name");
  var email = document.querySelector("#join-email");
  var message = document.querySelector("#join-message");
  var terms = document.querySelector("#agree-terms");
  var privacy = document.querySelector("#agree-privacy");
  var token = "";
  var timer;
  function msg(text, error = false) {
    message.textContent = text;
    message.style.color = error ? "#d94350" : "";
  }
  function picker() {
    search.addEventListener("input", () => {
      parishId.value = "";
      clearTimeout(timer);
      if (search.value.trim().length < 2) {
        results.hidden = true;
        return;
      }
      timer = window.setTimeout(async () => {
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
  }
  picker();
  var agreeAll = document.querySelector("#agree-all");
  var codeInput = document.querySelector("#join-code");
  agreeAll.onchange = (event) => {
    terms.checked = privacy.checked = event.currentTarget.checked;
  };
  var syncAgreement = () => {
    agreeAll.checked = terms.checked && privacy.checked;
  };
  terms.addEventListener("change", syncAgreement);
  privacy.addEventListener("change", syncAgreement);
  var registrationButton = document.querySelector("#join-send-code");
  registrationButton.textContent = "\uAC00\uC785 \uC778\uC99D \uC9C4\uD589";
  document.querySelector("#join-details .locked-notice").textContent = "\uAC00\uC785 \uC778\uC99D \uD6C4 \uC785\uB825\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
  registrationButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!validEmail()) return;
    if (!terms.checked || !privacy.checked) return msg("\uD544\uC218 \uC57D\uAD00\uC5D0 \uBAA8\uB450 \uB3D9\uC758\uD574 \uC8FC\uC138\uC694.", true);
    if (!parishId.value || nameInput.value.trim().length < 2) return msg("\uC131\uB2F9, \uC774\uB984, \uC774\uBA54\uC77C\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.", true);
    try {
      const response = await fetch("/api/parishioner-registration/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), name: nameInput.value, email: email.value, termsAgreed: true, privacyAgreed: true }) }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      token = data.token;
      [search, nameInput, email].forEach((input) => input.readOnly = true);
      const details = document.querySelector("#join-details");
      details.classList.remove("locked");
      details.querySelector("fieldset").disabled = false;
      document.querySelector("#join-code-row").hidden = true;
      document.querySelector("#join-verify-action").hidden = true;
      msg(data.message);
    } catch (error) {
      msg(error.message, true);
    }
  });
  function validEmail(show = true) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    email.classList.toggle("invalid", !valid && Boolean(email.value));
    if (show && !valid) msg("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.", true);
    return valid;
  }
  email.addEventListener("blur", () => validEmail());
  email.addEventListener("input", () => {
    if (email.value && validEmail(false)) msg("");
  });
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
    if (codeInput.value.length === 6) msg("");
  });
  codeInput.addEventListener("blur", () => {
    if (codeInput.value.length !== 6) msg("\uC778\uC99D\uCF54\uB4DC\uB294 6\uC790\uB9AC \uC22B\uC790\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.", true);
  });
  document.querySelector("#join-send-code").addEventListener("click", (event) => {
    if (!validEmail()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
  document.querySelector("#join-verify-code").addEventListener("click", (event) => {
    if (!/^\d{6}$/.test(codeInput.value)) {
      msg("\uC778\uC99D\uCF54\uB4DC\uB294 6\uC790\uB9AC \uC22B\uC790\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.", true);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
  document.querySelector("#join-send-code").addEventListener("click", async () => {
    if (!terms.checked || !privacy.checked) return msg("\uD544\uC218 \uC57D\uAD00\uC5D0 \uBAA8\uB450 \uB3D9\uC758\uD574 \uC8FC\uC138\uC694.", true);
    if (!parishId.value || nameInput.value.trim().length < 2 || !email.validity.valid) return msg("\uC131\uB2F9, \uC774\uB984, \uC774\uBA54\uC77C\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.", true);
    try {
      const response = await fetch("/api/parishioner-registration/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), name: nameInput.value, email: email.value, termsAgreed: true, privacyAgreed: true }) }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      document.querySelector("#join-code-row").hidden = false;
      document.querySelector("#join-verify-action").hidden = false;
      msg(data.devCode ? `${data.message} \uAC00\uC0C1 \uC778\uC99D\uBC88\uD638: ${data.devCode}` : data.message);
    } catch (error) {
      msg(error.message, true);
    }
  });
  document.querySelector("#join-verify-code").addEventListener("click", async () => {
    try {
      const response = await fetch("/api/parishioner-registration/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), email: email.value, code: document.querySelector("#join-code").value }) }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      token = data.token;
      [search, nameInput, email].forEach((input) => input.readOnly = true);
      const details = document.querySelector("#join-details");
      details.classList.remove("locked");
      details.querySelector("fieldset").disabled = false;
      msg(data.message);
    } catch (error) {
      msg(error.message, true);
    }
  });
  var form = document.querySelector("#join-form");
  var fields = Object.fromEntries([...form.querySelectorAll("[name]")].map((input) => [input.name, input]));
  function formatPhone(input, mobile = false) {
    input.addEventListener("input", () => {
      const d = input.value.replace(/\D/g, "").slice(0, 11);
      input.value = d.length <= 10 ? [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join("-") : [d.slice(0, 3), d.slice(3, 7), d.slice(7)].filter(Boolean).join("-");
    });
    input.addEventListener("blur", () => {
      if (mobile && input.value && !/^010-\d{4}-\d{4}$/.test(input.value)) msg("\uBAA8\uBC14\uC77C\uD3F0\uBC88\uD638\uB294 010\uC73C\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4.", true);
    });
  }
  formatPhone(fields.phone);
  formatPhone(fields.mobile, true);
  document.querySelector("#join-find-address").addEventListener("click", () => new window.daum.Postcode({ oncomplete(data) {
    fields.postalCode.value = data.zonecode;
    fields.address.value = data.roadAddress || data.jibunAddress;
    fields.addressDetail.focus();
  } }).open());
  var saveConfirmed = false;
  form.addEventListener("submit", (event) => {
    if (saveConfirmed) {
      saveConfirmed = false;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const layer = document.createElement("div");
    layer.className = "member-modal";
    layer.innerHTML = `<div class="member-modal-box confirm-box"><h3>\uD68C\uC6D0\uAC00\uC785</h3><div class="member-modal-body"><p>\uC800\uC7A5\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</p></div><div class="modal-actions"><button class="green-outline modal-cancel" type="button">\uCDE8\uC18C</button><button class="green-button modal-save" type="button">\uC800\uC7A5</button></div></div>`;
    document.body.append(layer);
    layer.querySelector(".modal-cancel").addEventListener("click", () => layer.remove());
    layer.querySelector(".modal-save").addEventListener("click", () => {
      layer.remove();
      saveConfirmed = true;
      form.requestSubmit();
    });
  }, true);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
      const response = await fetch("/api/parishioners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, parishId: Number(parishId.value), name: nameInput.value, email: email.value, token, termsAgreed: terms.checked, privacyAgreed: privacy.checked }) }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      alert(data.message);
      location.href = "/parishioner";
    } catch (error) {
      msg(error.message, true);
    }
  });
  document.head.insertAdjacentHTML("beforeend", '<link rel="icon" type="image/svg+xml" href="/assets/favicon-parishioner.svg">');
})();
