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
  privacy.closest("label").insertAdjacentHTML("afterend", '<div class="optional-consents"><h3>\uC120\uD0DD \uC218\uC2E0 \uB3D9\uC758</h3><label class="agree"><input id="agree-push" type="checkbox"> \uC54C\uB9BC(Push) \uC218\uC2E0\uC5D0 \uB3D9\uC758\uD569\uB2C8\uB2E4. <i>(\uC120\uD0DD)</i></label><label class="agree"><input id="agree-email" type="checkbox"> \uC774\uBA54\uC77C \uC218\uC2E0\uC5D0 \uB3D9\uC758\uD569\uB2C8\uB2E4. <i>(\uC120\uD0DD)</i></label></div>');
  var pushConsent = document.querySelector("#agree-push");
  var emailConsent = document.querySelector("#agree-email");
  agreeAll.onchange = (event) => {
    const checked = event.currentTarget.checked;
    terms.checked = privacy.checked = pushConsent.checked = emailConsent.checked = checked;
  };
  var syncAllAgreements = () => {
    agreeAll.checked = terms.checked && privacy.checked && pushConsent.checked && emailConsent.checked;
  };
  [terms, privacy, pushConsent, emailConsent].forEach((input) => input.addEventListener("change", syncAllAgreements));
  var registrationButton = document.querySelector("#join-send-code");
  var verifyButton = document.querySelector("#join-verify-code");
  registrationButton.textContent = "\uC778\uC99D\uCF54\uB4DC \uBC1C\uC1A1";
  registrationButton.disabled = true;
  verifyButton.textContent = "\uC778\uC99D\uD655\uC778";
  verifyButton.disabled = true;
  document.querySelector("#join-details .locked-notice").textContent = "\uC774\uBA54\uC77C \uC778\uC99D \uD6C4 \uC785\uB825\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
  function validEmail(show = true) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    email.classList.toggle("invalid", !valid && Boolean(email.value));
    if (show && !valid) msg("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.", true);
    return valid;
  }
  var syncSendButton = () => registrationButton.disabled = !validEmail(false);
  var syncVerifyButton = () => verifyButton.disabled = !/^\d{6}$/.test(codeInput.value);
  email.addEventListener("blur", () => validEmail());
  email.addEventListener("input", () => {
    syncSendButton();
    if (email.value && validEmail(false)) msg("");
  });
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
    syncVerifyButton();
    if (codeInput.value.length === 6) msg("");
  });
  codeInput.addEventListener("blur", () => {
    if (codeInput.value.length !== 6) msg("\uC778\uC99D\uCF54\uB4DC\uB294 6\uC790\uB9AC \uC22B\uC790\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.", true);
  });
  syncSendButton();
  syncVerifyButton();
  registrationButton.addEventListener("click", async () => {
    if (registrationButton.disabled || !validEmail()) return;
    if (!terms.checked || !privacy.checked) return msg("\uD544\uC218 \uC57D\uAD00\uC5D0 \uBAA8\uB450 \uB3D9\uC758\uD574 \uC8FC\uC138\uC694.", true);
    if (!parishId.value || nameInput.value.trim().length < 2) return msg("\uC131\uB2F9, \uC774\uB984, \uC774\uBA54\uC77C\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.", true);
    registrationButton.disabled = true;
    try {
      const response = await fetch("/api/parishioner-registration/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), name: nameInput.value, email: email.value.trim(), termsAgreed: true, privacyAgreed: true }) }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      document.querySelector("#join-code-row").hidden = false;
      document.querySelector("#join-verify-action").hidden = false;
      codeInput.focus();
      msg(data.devCode ? `${data.message} \uAC00\uC0C1 \uC778\uC99D\uBC88\uD638: ${data.devCode}` : data.message);
    } catch (error) {
      msg(error.message, true);
    } finally {
      syncSendButton();
    }
  });
  verifyButton.addEventListener("click", async () => {
    if (verifyButton.disabled || !/^\d{6}$/.test(codeInput.value)) return;
    verifyButton.disabled = true;
    try {
      const response = await fetch("/api/parishioner-registration/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), email: email.value.trim(), code: codeInput.value }) }), data = await response.json();
      if (!response.ok) throw new Error(data.message);
      token = data.token;
      [search, nameInput, email].forEach((input) => input.readOnly = true);
      codeInput.readOnly = true;
      const details = document.querySelector("#join-details");
      details.classList.remove("locked");
      details.querySelector("fieldset").disabled = false;
      msg(data.message);
    } catch (error) {
      msg(error.message, true);
      syncVerifyButton();
    }
  });
  var memberGrid = document.querySelector("#join-form .join-grid");
  var baptismLabel = memberGrid.querySelector('[name="baptismalName"]').closest("label");
  var birthLabel = memberGrid.querySelector('[name="birthDate"]').closest("label");
  var phoneLabel = memberGrid.querySelector('[name="phone"]').closest("label");
  var mobileLabel = memberGrid.querySelector('[name="mobile"]').closest("label");
  var postalLabel = memberGrid.querySelector('[name="postalCode"]').closest("label");
  var addressLabel = memberGrid.querySelector('[name="address"]').closest("label");
  var detailLabel = memberGrid.querySelector('[name="addressDetail"]').closest("label");
  var addressAction = memberGrid.querySelector(".verify-action");
  var nameLabel = document.createElement("label");
  var emailLabel = document.createElement("label");
  var genderLabel = document.createElement("label");
  nameLabel.innerHTML = '<i>*</i> \uC774\uB984<input id="join-member-name" readonly>';
  emailLabel.className = "full";
  emailLabel.innerHTML = '<span>\uC774\uBA54\uC77C</span><input id="join-member-email" type="email" readonly><small>\uC774\uBA54\uC77C\uC740 \uB85C\uADF8\uC778 \uC2DD\uBCC4 \uC815\uBCF4\uC774\uBBC0\uB85C \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</small>';
  genderLabel.innerHTML = '<span>\uC131\uBCC4</span><select id="join-gender"><option value="">\uC120\uD0DD \uC548 \uD568</option><option value="male">\uB0A8\uC131</option><option value="female">\uC5EC\uC131</option><option value="other">\uAE30\uD0C0</option></select>';
  var registrationGender = genderLabel.querySelector("select");
  var memberName = nameLabel.querySelector("input");
  var memberEmail = emailLabel.querySelector("input");
  var syncVerifiedIdentity = () => {
    memberName.value = nameInput.value;
    memberEmail.value = email.value;
  };
  nameInput.addEventListener("input", syncVerifiedIdentity);
  email.addEventListener("input", syncVerifiedIdentity);
  syncVerifiedIdentity();
  addressLabel.classList.remove("full");
  detailLabel.classList.remove("full");
  addressAction.querySelector("button").textContent = "\uC8FC\uC18C \uAC80\uC0C9";
  memberGrid.replaceChildren(nameLabel, baptismLabel, emailLabel, birthLabel, genderLabel, phoneLabel, mobileLabel, addressLabel, addressAction, detailLabel, postalLabel);
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
      const preferences = await fetch("/api/parishioners/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parishId: Number(parishId.value), email: email.value, token, pushOptIn: pushConsent.checked, emailOptIn: emailConsent.checked, gender: registrationGender.value }) }), preferenceData = await preferences.json();
      if (!preferences.ok) throw new Error(preferenceData.message);
      alert(data.message);
      location.href = "/parishioner";
    } catch (error) {
      msg(error.message, true);
    }
  });
  document.head.insertAdjacentHTML("beforeend", '<link rel="icon" type="image/svg+xml" href="/assets/favicon-parishioner.svg">');
  document.head.insertAdjacentHTML("beforeend", "<style>#join-send-code:disabled,#join-verify-code:disabled{border-color:#d8e1de;background:#e4ebe8;color:#96a19d;cursor:not-allowed}</style>");
  document.querySelectorAll(".join-grid label").forEach((label) => {
    const required = label.querySelector(":scope>i");
    if (required) label.insertBefore(required, label.firstChild);
  });
  document.head.insertAdjacentHTML("beforeend", "<style>.join-grid label>i:first-child{display:inline-block;margin-right:2px}.join-grid>.verify-action{padding-bottom:7px}.join-grid>.verify-action button{height:49px}</style>");
  document.head.insertAdjacentHTML("beforeend", "<style>#join-details .join-grid select{width:100%;height:49px;padding:0 13px;border:1px solid var(--line);border-radius:9px;background:#fff}#join-details .join-grid input[readonly]{background:#f2f5f4;color:#7b8884}#join-details .join-grid label>small{display:block;margin-top:5px;color:var(--muted);font-size:9px;font-weight:400}#join-details .join-grid>.verify-action{padding-bottom:7px}</style>");
  var memberLockedNotice = document.querySelector("#join-details .locked-notice");
  var memberDetailsHeading = document.querySelector("#join-details>h2");
  memberDetailsHeading.append(memberLockedNotice);
  document.head.insertAdjacentHTML("beforeend", "<style>#join-details>h2 .locked-notice{position:static;inset:auto;margin-left:4px;color:var(--muted);font-size:11px;font-weight:500;text-align:left}@media(max-width:600px){#join-details>h2{flex-wrap:wrap}#join-details>h2 .locked-notice{flex:1 0 auto;margin-left:0}}</style>");
})();
