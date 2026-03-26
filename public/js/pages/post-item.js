const titleField = document.getElementById("title");
const campusSelects = document.querySelectorAll(".campus-select");
const contactMethodField = document.getElementById("contactMethod");

function toggleOtherField(selectElement) {
  const targetName = selectElement.dataset.otherTarget;
  const wrapper = document.querySelector(
    `[data-other-wrapper="${targetName}"]`,
  );
  const input = document.getElementById(targetName);

  if (!wrapper || !input) {
    return;
  }

  const shouldShow = selectElement.value === "other";
  wrapper.classList.toggle("d-none", !shouldShow);
  input.required = shouldShow;

  if (!shouldShow) {
    input.value = "";
  }
}

function toggleContactFields() {
  if (!contactMethodField) {
    return;
  }

  const method = contactMethodField.value;
  const emailWrapper = document.querySelector('[data-contact-field="email"]');
  const phoneWrapper = document.querySelector('[data-contact-field="phone"]');
  const emailInput = document.getElementById("contactEmail");
  const phoneInput = document.getElementById("contactPhone");

  const showEmail = method === "email" || method === "both";
  const showPhone = method === "phone" || method === "both";

  if (emailWrapper && emailInput) {
    emailWrapper.classList.toggle("d-none", !showEmail);
    emailInput.required = showEmail;
  }

  if (phoneWrapper && phoneInput) {
    phoneWrapper.classList.toggle("d-none", !showPhone);
    phoneInput.required = showPhone;
  }
}

async function updateCampusPreview(previewType) {
  const selectElement = document.querySelector(
    `[data-preview-type="${previewType}"]`,
  );
  const previewWrapper = document.getElementById(
    `${previewType}LocationPreview`,
  );
  const statusElement = document.querySelector(
    `[data-preview-status="${previewType}"]`,
  );
  const labelElement = document.querySelector(
    `[data-preview-label="${previewType}"]`,
  );
  const coordsElement = document.querySelector(
    `[data-preview-coords="${previewType}"]`,
  );
  const linkElement = document.querySelector(
    `[data-preview-link="${previewType}"]`,
  );

  if (
    !selectElement ||
    !previewWrapper ||
    !statusElement ||
    !labelElement ||
    !coordsElement ||
    !linkElement
  ) {
    return;
  }

  const locationValue = selectElement.value;
  const otherTarget = selectElement.dataset.otherTarget;
  const otherInput = otherTarget ? document.getElementById(otherTarget) : null;
  const otherText = otherInput ? otherInput.value.trim() : "";

  if (!locationValue) {
    previewWrapper.classList.add("d-none");
    statusElement.textContent = "";
    labelElement.textContent = "";
    coordsElement.textContent = "";
    linkElement.classList.add("d-none");
    linkElement.href = "#";
    return;
  }

  if (locationValue === "other" && otherText.length < 2) {
    previewWrapper.classList.remove("d-none");
    statusElement.textContent =
      "Add a custom location description to preview it on the map.";
    labelElement.textContent = "";
    coordsElement.textContent = "";
    linkElement.classList.add("d-none");
    linkElement.href = "#";
    return;
  }

  previewWrapper.classList.remove("d-none");
  statusElement.textContent = "Looking up campus location via Map API...";
  labelElement.textContent = "";
  coordsElement.textContent = "";
  linkElement.classList.add("d-none");
  linkElement.href = "#";

  try {
    const params = new URLSearchParams({
      locationValue,
      otherText,
    });

    const response = await fetch(`/api/location-preview?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data) {
      statusElement.textContent = "Could not verify this location right now.";
      return;
    }

    statusElement.textContent = data.success
      ? "Location verified successfully through the external map service."
      : "Using campus label only. Exact map coordinates were not found.";

    labelElement.textContent = data.label || "Campus location selected";

    if (data.lat && data.lon) {
      coordsElement.textContent = `Latitude: ${data.lat} | Longitude: ${data.lon}`;
    } else {
      coordsElement.textContent =
        "Exact coordinates unavailable for this selection.";
    }

    if (data.mapLink) {
      linkElement.href = data.mapLink;
      linkElement.classList.remove("d-none");
    } else {
      linkElement.classList.add("d-none");
    }
  } catch {
    statusElement.textContent =
      "Map API lookup failed. You can still submit the item.";
    labelElement.textContent = "";
    coordsElement.textContent = "";
    linkElement.classList.add("d-none");
    linkElement.href = "#";
  }
}

if (titleField) {
  titleField.focus();
}

campusSelects.forEach((selectElement) => {
  toggleOtherField(selectElement);

  const previewType = selectElement.dataset.previewType;
  if (previewType) {
    updateCampusPreview(previewType);
  }

  selectElement.addEventListener("change", () => {
    toggleOtherField(selectElement);

    if (previewType) {
      updateCampusPreview(previewType);
    }
  });

  const otherTarget = selectElement.dataset.otherTarget;
  const otherInput = otherTarget ? document.getElementById(otherTarget) : null;

  if (otherInput && previewType) {
    otherInput.addEventListener("input", () => {
      if (selectElement.value === "other") {
        updateCampusPreview(previewType);
      }
    });
  }
});

if (contactMethodField) {
  toggleContactFields();
  contactMethodField.addEventListener("change", toggleContactFields);
}
