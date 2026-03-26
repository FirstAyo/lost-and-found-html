const titleField = document.getElementById('title');
const campusSelects = document.querySelectorAll('.campus-select');
const contactMethodField = document.getElementById('contactMethod');

function toggleOtherField(selectElement) {
  const targetName = selectElement.dataset.otherTarget;
  const wrapper = document.querySelector(`[data-other-wrapper="${targetName}"]`);
  const input = document.getElementById(targetName);

  if (!wrapper || !input) {
    return;
  }

  const shouldShow = selectElement.value === 'other';
  wrapper.classList.toggle('d-none', !shouldShow);
  input.required = shouldShow;

  if (!shouldShow) {
    input.value = '';
  }
}

function toggleContactFields() {
  if (!contactMethodField) {
    return;
  }

  const method = contactMethodField.value;
  const emailWrapper = document.querySelector('[data-contact-field="email"]');
  const phoneWrapper = document.querySelector('[data-contact-field="phone"]');
  const emailInput = document.getElementById('contactEmail');
  const phoneInput = document.getElementById('contactPhone');

  const showEmail = method === 'email' || method === 'both';
  const showPhone = method === 'phone' || method === 'both';

  if (emailWrapper && emailInput) {
    emailWrapper.classList.toggle('d-none', !showEmail);
    emailInput.required = showEmail;
  }

  if (phoneWrapper && phoneInput) {
    phoneWrapper.classList.toggle('d-none', !showPhone);
    phoneInput.required = showPhone;
  }
}

if (titleField) {
  titleField.focus();
}

campusSelects.forEach((selectElement) => {
  toggleOtherField(selectElement);
  selectElement.addEventListener('change', () => toggleOtherField(selectElement));
});

if (contactMethodField) {
  toggleContactFields();
  contactMethodField.addEventListener('change', toggleContactFields);
}
