
/* =========================================
   GEM LIBRARY V2 — COMPLETE APPLICATION
========================================= */

"use strict";

/* =========================================
   INITIAL STATE
========================================= */

const CFG = window.GEM_CONFIG;

const state = {
  gems: [],

  page: "library",
  selectedGem: null,

  editingId: null,
  draft: null,
  editorOpen: false,

  librarySearch: "",
  libraryRarity: "",
  librarySort: "name",

  compareA: "",
  compareB: "",
  multiIds: [],

  relationId: "",
  relationSort: "similarity",

  statDimension: "mineralSpecies",
  statSecondary: "rarity",
  statChart: "bar",
  statRarity: "",
  statSearch: "",
  statMetric: "records",
  statDetail: null,

  pendingConfirmation: null
};

let toastTimeout = null;
let draftTimeout = null;


/* =========================================
   DOM HELPERS
========================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];

const main = $("#main-content");

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

}

function escapeAttr(value) {
  return escapeHTML(value);
}

function formatNumber(value, digits = 2) {

  if (!Number.isFinite(Number(value))) return "—";

  return Number(value).toLocaleString(
    undefined,
    { maximumFractionDigits: digits }
  );

}

function compact(value) {

  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

}

function canonical(value) {
  return compact(value).toLocaleLowerCase();
}

function round(value, digits = 1) {

  const multiplier = 10 ** digits;

  return Math.round(
    (value + Number.EPSILON) * multiplier
  ) / multiplier;

}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function uniqueId() {

  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    "gem-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );

}

function getGem(id) {
  return state.gems.find(gem => gem.id === id) || null;
}

function getGemName(id) {
  return getGem(id)?.name || "Unknown Gemstone";
}

function alphabetically(a, b) {
  return a.localeCompare(b, undefined, {
    sensitivity: "base",
    numeric: true
  });
}

function sortGems(gems) {

  return [...gems].sort(
    (a, b) => alphabetically(a.name, b.name)
  );

}

function hasValue(value) {

  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(
      item => String(item).trim() !== ""
    );
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return String(value).trim() !== "";
}

function makeOptions(
  items,
  selected,
  emptyLabel = "Select..."
) {

  let html = `<option value="">${escapeHTML(emptyLabel)}</option>`;

  for (const item of items) {

    const value =
      typeof item === "string"
        ? item
        : item.value;

    const label =
      typeof item === "string"
        ? item
        : item.label;

    html += `
      <option
        value="${escapeAttr(value)}"
        ${String(value) === String(selected) ? "selected" : ""}>
        ${escapeHTML(label)}
      </option>
    `;

  }

  return html;
}

function gemOptions(selected, emptyLabel = "Choose gemstone") {

  return makeOptions(
    sortGems(state.gems).map(gem => ({
      value: gem.id,
      label: gem.name
    })),
    selected,
    emptyLabel
  );

}

function fieldLabel(key) {
  return CFG.fieldMap[key]?.label || key;
}

function panelEmpty(message) {

  return `
    <div class="empty-state">
      <div class="empty-symbol">◇</div>
      <p>${escapeHTML(message)}</p>
    </div>
  `;

}

function tagHTML(value, dark = false) {

  return `
    <span class="tag ${dark ? "tag-dark" : ""}">
      ${escapeHTML(value)}
    </span>
  `;

}

function tagsHTML(values, dark = false) {

  return (values || [])
    .map(value => tagHTML(value, dark))
    .join("");

}

function toast(message) {

  const element = $("#toast");

  clearTimeout(toastTimeout);

  element.textContent = message;
  element.classList.add("visible");

  toastTimeout = setTimeout(() => {
    element.classList.remove("visible");
  }, 2900);

}


/* =========================================
   LOCAL STORAGE
========================================= */

function loadLibrary() {

  try {

    const stored = localStorage.getItem(CFG.storageKey);

    if (!stored) {
      state.gems = [];
      return;
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid library format");
    }

    const ids = new Set();

    state.gems = parsed
      .map(normalizeGem)
      .filter(gem => {

        if (!gem.name.trim()) return false;

        if (!gem.id || ids.has(gem.id)) {
          gem.id = uniqueId();
        }

        ids.add(gem.id);

        return true;

      });

  }

  catch (error) {

    console.error("Library loading failed:", error);

    state.gems = [];

    toast(
      "Library could not be loaded. Existing stored data was not overwritten."
    );

  }

}

function persistLibrary() {

  try {

    localStorage.setItem(
      CFG.storageKey,
      JSON.stringify(state.gems)
    );

    return true;

  }

  catch (error) {

    console.error("Saving failed:", error);

    toast(
      "Save failed. Browser storage may be full or disabled."
    );

    return false;

  }

}

function saveDraft() {

  if (!state.editorOpen || !state.draft) return;

  try {

    localStorage.setItem(
      CFG.draftKey,
      JSON.stringify({
        editingId: state.editingId,
        gem: state.draft
      })
    );

    $("#editor-status").textContent =
      "Draft preserved locally";

  }

  catch (error) {

    console.error("Draft saving failed:", error);

    $("#editor-status").textContent =
      "Draft could not be saved";

  }

}

function queueDraftSave() {

  clearTimeout(draftTimeout);

  draftTimeout = setTimeout(
    saveDraft,
    300
  );

}

function clearDraft() {

  clearTimeout(draftTimeout);

  try {
    localStorage.removeItem(CFG.draftKey);
  }
  catch (error) {
    console.error(error);
  }

}

function readDraft() {

  try {

    const stored = localStorage.getItem(CFG.draftKey);

    if (!stored) return null;

    const parsed = JSON.parse(stored);

    if (!parsed || !parsed.gem) return null;

    return {
      editingId:
        typeof parsed.editingId === "string"
          ? parsed.editingId
          : null,

      gem: normalizeGem(parsed.gem)
    };

  }

  catch {
    return null;
  }

}


/* =========================================
   LIBRARY OPERATIONS
========================================= */

function saveGem(gemInput) {

  const gem = normalizeGem(gemInput);

  gem.name = compact(gem.name);

  if (!gem.name) {
    toast("A gemstone needs a name.");
    return false;
  }

  if (
    state.gems.some(other =>
      other.id !== gem.id &&
      canonical(other.name) === canonical(gem.name)
    )
  ) {

    toast("A gemstone with that name already exists.");

    return false;

  }

  if (
    gem.mohs !== null &&
    (gem.mohs < 0 || gem.mohs > 10)
  ) {

    toast("Mohs hardness must be between 0 and 10.");
    return false;

  }

  const oldGem = getGem(gem.id);

  const now = new Date().toISOString();

  if (!gem.id) {
    gem.id = uniqueId();
  }

  gem.createdAt =
    oldGem?.createdAt ||
    gem.createdAt ||
    now;

  gem.updatedAt = now;

  gem.relatesTo = gem.relatesTo.filter(
    id =>
      id !== gem.id &&
      !!getGem(id)
  );

  const previous = [...state.gems];

  if (oldGem) {

    state.gems = state.gems.map(
      item => item.id === gem.id ? gem : item
    );

  }

  else {
    state.gems.push(gem);
  }

  if (!persistLibrary()) {
    state.gems = previous;
    return false;
  }

  clearDraft();

  state.selectedGem = gem.id;

  toast("Gemstone saved.");

  return true;

}

function deleteGem(id) {

  const gem = getGem(id);

  if (!gem) return;

  confirmAction(
    "Delete Gemstone",
    `Delete "${gem.name}" permanently from this browser?`,
    () => {

      const previous = [...state.gems];

      state.gems = state.gems
        .filter(item => item.id !== id)
        .map(item => ({
          ...item,
          relatesTo:
            (item.relatesTo || [])
              .filter(link => link !== id)
        }));

      if (!persistLibrary()) {
        state.gems = previous;
        return;
      }

      if (state.selectedGem === id) {
        state.selectedGem = null;
      }

      refreshSelections();
      state.page = "library";

      render();

      toast("Gemstone deleted.");

    }
  );

}

function duplicateGem(id) {

  const original = getGem(id);

  if (!original) return;

  const copy = normalizeGem(original);

  copy.id = "";
  copy.name = original.name + " (Copy)";
  copy.createdAt = "";
  copy.updatedAt = "";

  let number = 2;

  while (
    state.gems.some(gem =>
      canonical(gem.name) === canonical(copy.name)
    )
  ) {

    copy.name =
      original.name + ` (Copy ${number})`;

    number++;

  }

  openEditor(null, copy);

}


/* =========================================
   EDITOR
========================================= */

function openEditor(id = null, initial = null) {

  if (state.editorOpen) {
    saveDraft();
  }

  const gem = initial
    ? normalizeGem(initial)
    : id
      ? getGem(id)
      : createEmptyGem();

  if (!gem) {
    toast("Gemstone not found.");
    return;
  }

  state.editingId = id || null;
  state.draft = normalizeGem(gem);
  state.editorOpen = true;

  $("#editor-heading").textContent =
    id ? "Edit Gemstone" : "New Gemstone";

  $("#editor-fields").innerHTML =
    renderEditorFields();

  $("#editor-status").textContent =
    "Changes saved as draft";

  $("#editor-overlay").classList.remove("hidden");

  document.body.style.overflow = "hidden";

  saveDraft();

  const nameField =
    document.querySelector('[name="name"]');

  if (nameField && !id) {
    nameField.focus();
  }

}

function closeEditor() {

  state.editorOpen = false;

  $("#editor-overlay").classList.add("hidden");

  document.body.style.overflow = "";

  state.draft = null;
  state.editingId = null;

}

function discardAndCloseEditor() {

  confirmAction(
    "Close Editor",
    "Close this editor? Your current edits will remain available as a recoverable draft.",
    () => {
      saveDraft();
      closeEditor();
    }
  );

}

function renderEditorFields() {

  return CFG.sections.map((section, index) => `

    <details
      class="editor-section"
      ${index === 0 ? "open" : ""}>

      <summary>
        ${escapeHTML(section.title)}
      </summary>

      <div class="editor-section-content">

        <div class="form-grid">

          ${section.fields.map(
            field => renderInputField(field)
          ).join("")}

        </div>

      </div>

    </details>

  `).join("");

}


/* =========================================
   OPTIONAL MULTIPLE-ANSWER FIELDS
========================================= */

function isFlexibleField(field) {
  return ["text", "number", "textarea"]
    .includes(field.type);
}

function flexibleValues(key) {

  const value = state.draft?.[key];

  if (Array.isArray(value)) return value;

  if (!hasValue(value)) return [];

  return [value];
}

function validFlexibleNumber(field, raw) {

  const text = String(raw).trim();

  if (!text) return null;

  const number = Number(text);

  if (!Number.isFinite(number)) return null;

  if (
    field.min !== undefined &&
    number < field.min
  ) return null;

  if (
    field.max !== undefined &&
    number > field.max
  ) return null;

  if (
    field.step === "1" &&
    !Number.isInteger(number)
  ) return null;

  return number;
}

function renderFlexibleField(field) {

  const key = field.key;
  const value = state.draft[key];
  const multiple = Array.isArray(value);

  const values = flexibleValues(key);

  let control = "";

  if (multiple) {

    control = `

      <div class="flexible-values">

        ${values.map((item,index) => `

          <span class="flexible-chip">

            <span>${escapeHTML(item)}</span>

            <button
              type="button"
              data-action="remove-flex"
              data-field="${key}"
              data-index="${index}"
              aria-label="Remove answer">
              ×
            </button>

          </span>

        `).join("")}

      </div>

      <div class="flexible-entry">

        <input
          class="input"
          type="text"
          inputmode="text"
          autocomplete="off"
          spellcheck="false"
          data-flex-input="${key}"
          placeholder="Add another answer...">

        <button
          type="button"
          class="button button-secondary button-small"
          data-action="add-flex"
          data-field="${key}">
          Add
        </button>

      </div>

    `;

  } else {

    if (field.type === "textarea") {

      control = `

        <textarea
          class="textarea"
          name="${key}"
          data-flex-single="${key}"
          placeholder="Write here...">${escapeHTML(value ?? "")}</textarea>

      `;

    } else {

      control = `

        <input
          class="input"
          type="text"
          name="${key}"
          data-flex-single="${key}"
          inputmode="text"
          autocomplete="off"
          value="${escapeAttr(value ?? "")}"
          ${field.required ? "required" : ""}
          placeholder="—">

      `;

    }

  }

  return `

    <div
      class="field flexible-field ${
        field.wide ? "form-wide" : ""
      }"
      data-flex-field="${key}">

      <div class="flexible-heading">

        <label>
          ${escapeHTML(field.label)}
          ${field.required ? "*" : ""}
        </label>

        <label class="flexible-toggle">

          <input
            type="checkbox"
            data-flex-toggle="${key}"
            ${multiple ? "checked" : ""}>

          <span>Multiple</span>

        </label>

      </div>

      ${control}

    </div>

  `;

}

function refreshFlexibleField(key) {

  const field = CFG.fieldMap[key];

  if (!field) return;

  const current = document.querySelector(
    `[data-flex-field="${key}"]`
  );

  if (!current) return;

  current.outerHTML = renderFlexibleField(field);

  queueDraftSave();
}

function toggleFlexibleField(key, enabled) {

  const field = CFG.fieldMap[key];

  if (!field || !isFlexibleField(field)) return;

  const current = state.draft[key];

  if (enabled) {

    state.draft[key] =
      Array.isArray(current)
        ? [...current]
        : hasValue(current)
          ? [current]
          : [];

  } else {

    const values = flexibleValues(key);

    state.draft[key] =
      values.length
        ? values[0]
        : field.type === "number"
          ? null
          : "";

    if (values.length > 1) {

      toast(
        "Single-answer mode keeps the first value."
      );

    }

  }

  refreshFlexibleField(key);
}

function addFlexibleValue(key) {

  const field = CFG.fieldMap[key];

  if (!field || !isFlexibleField(field)) return;

  const input = document.querySelector(
    `[data-flex-input="${key}"]`
  );

  if (!input) return;

  const raw = input.value.trim();

  if (!raw) return;

  let value = raw;

  if (field.type === "number") {

    value = validFlexibleNumber(field, raw);

    if (value === null) {

      toast(
        `Enter a valid number for ${field.label}.`
      );

      input.focus();
      return false;
    }

  }

  const values = flexibleValues(key);

  const exists = values.some(item =>
    String(item).toLocaleLowerCase() ===
    String(value).toLocaleLowerCase()
  );

  if (!exists) {

    state.draft[key] = [...values, value];

  }

  input.value = "";

  refreshFlexibleField(key);

  document.querySelector(
    `[data-flex-input="${key}"]`
  )?.focus();

  return true;
}

function removeFlexibleValue(key,index) {

  const current = flexibleValues(key);

  current.splice(index,1);

  state.draft[key] = current;

  refreshFlexibleField(key);
}

function updateFlexibleSingle(input) {

  const key = input.dataset.flexSingle;

  const field = CFG.fieldMap[key];

  if (!field || !state.draft) return;

  // Keep raw text while editing.
  // Convert and validate when saving.
  state.draft[key] = input.value;

  const status = document.querySelector(
    "#editor-status"
  );

  if (status) {
    status.textContent = "Unsaved changes";
  }

  queueDraftSave();
}

function validateFlexibleFields() {

  for (const field of CFG.fields) {

    if (!isFlexibleField(field)) continue;

    const value = state.draft[field.key];

    if (
      field.required &&
      !hasValue(value)
    ) {

      toast(`${field.label} is required.`);

      return false;
    }

    if (field.type !== "number") continue;

    // Multiple numerical answers.
    if (Array.isArray(value)) {

      const numbers = [];

      for (const item of value) {

        const number = validFlexibleNumber(
          field,
          item
        );

        if (number === null) {

          toast(
            `Invalid number in ${field.label}.`
          );

          return false;
        }

        numbers.push(number);
      }

      state.draft[field.key] = [
        ...new Set(numbers)
      ];

      continue;
    }

    // Single numerical answer.
    if (!hasValue(value)) {

      state.draft[field.key] = null;
      continue;
    }

    const number = validFlexibleNumber(
      field,
      value
    );

    if (number === null) {

      const input = document.querySelector(
        `[data-flex-single="${field.key}"]`
      );

      if (input) {

        const section = input.closest("details");

        if (section) section.open = true;

        input.focus();

      }

      toast(
        `Invalid number in ${field.label}.`
      );

      return false;
    }

    state.draft[field.key] = number;

  }

  return true;
}

function renderInputField(field) {

  const value = state.draft[field.key];
   
if (isFlexibleField(field)) {
  return renderFlexibleField(field);
}
   
  let input = "";

  if (field.type === "text") {

    input = `
      <input
        class="input"
        type="text"
        name="${field.key}"
        value="${escapeAttr(value)}"
        ${field.required ? "required" : ""}
        autocomplete="off">
    `;

  }

  
else if (field.type === "number") {

  input = `
    <input
      class="input"
      type="text"
      name="${field.key}"
      value="${
        value === null
          ? ""
          : escapeAttr(value)
      }"
      inputmode="text"
      autocomplete="off"
      spellcheck="false"
      placeholder="—">
  `;
   
  }

  else if (field.type === "textarea") {

    input = `
      <textarea
        class="textarea"
        name="${field.key}">${escapeHTML(value)}</textarea>
    `;

  }

  else if (field.type === "select") {

    input = `
      <select
        class="select"
        name="${field.key}">

        ${makeOptions(
          CFG[field.options],
          value,
          "Not specified"
        )}

      </select>
    `;

  }

  else if (field.type === "multi") {

    input = `
      <div class="check-options">

        ${CFG[field.options].map(option => `

          <label class="check-option">

            <input
              type="checkbox"
              name="${field.key}"
              value="${escapeAttr(option)}"
              ${(value || []).includes(option) ? "checked" : ""}>

            <span>${escapeHTML(option)}</span>

          </label>

        `).join("")}

      </div>
    `;

  }

  else if (
    field.type === "tags" ||
    field.type === "bullets"
  ) {

    input = `
      <div
        class="tag-editor"
        data-tag-field="${field.key}">

        <div class="tags">
          ${renderEditableTags(field.key)}
        </div>

        <div class="tag-editor-input">

          <input
            class="input"
            type="text"
            data-tag-input="${field.key}"
            placeholder="${
              field.type === "bullets"
                ? "Write a point..."
                : "Type a value..."
            }"
            autocomplete="off">

          <button
            type="button"
            class="button button-secondary"
            data-action="add-tag"
            data-field="${field.key}">
            Add
          </button>

        </div>

        <div class="field-hint">
          Press Enter or Add to include each item.
        </div>

      </div>
    `;

  }

  else if (field.type === "links") {

    const available = sortGems(state.gems)
      .filter(gem => gem.id !== state.editingId);

    input = `
      <div
        class="tag-editor"
        data-link-field="${field.key}">

        <div class="tags">
          ${renderEditableTags(field.key)}
        </div>

        <div class="tag-editor-input">

          <select
            class="select"
            data-link-select="${field.key}">

            ${makeOptions(
              available.map(gem => ({
                value: gem.id,
                label: gem.name
              })),
              "",
              "Choose a saved gemstone"
            )}

          </select>

          <button
            type="button"
            class="button button-secondary"
            data-action="add-link"
            data-field="${field.key}">
            Add
          </button>

        </div>

      </div>
    `;

  }

  return `
    <div class="field ${field.wide ? "form-wide" : ""}">

      <label>
        ${escapeHTML(field.label)}
        ${field.required ? "*" : ""}
      </label>

      ${input}

    </div>
  `;

}

function renderEditableTags(key) {

  const values = state.draft?.[key] || [];

  return values.map((item, index) => {

    const label =
      key === "relatesTo"
        ? getGemName(item)
        : item;

    return `
      <span class="tag">

        ${escapeHTML(label)}

        <button
          type="button"
          class="tag-button"
          aria-label="Remove ${escapeAttr(label)}"
          data-action="remove-tag"
          data-field="${key}"
          data-index="${index}">
          ×
        </button>

      </span>
    `;

  }).join("");

}

function refreshEditorTags(key) {

  const selector =
    key === "relatesTo"
      ? `[data-link-field="${key}"] .tags`
      : `[data-tag-field="${key}"] .tags`;

  const container = $(selector);

  if (container) {
    container.innerHTML = renderEditableTags(key);
  }

  queueDraftSave();

}

function addTag(key) {

  if (!state.draft) return;

  const input = $(`[data-tag-input="${key}"]`);

  if (!input) return;

  const value = compact(input.value);

  if (!value) return;

  const current = state.draft[key] || [];

  if (!current.some(
    item => canonical(item) === canonical(value)
  )) {

    state.draft[key] = [...current, value];

  }

  input.value = "";

  refreshEditorTags(key);

  input.focus();

}

function addLink(key) {

  if (!state.draft) return;

  const input = $(`[data-link-select="${key}"]`);

  if (!input || !input.value) return;

  const id = input.value;

  if (
    id !== state.editingId &&
    getGem(id) &&
    !state.draft[key].includes(id)
  ) {

    state.draft[key].push(id);

  }

  input.value = "";

  refreshEditorTags(key);

}

function removeTag(key, index) {

  if (!state.draft || !Array.isArray(state.draft[key])) {
    return;
  }

  state.draft[key].splice(index, 1);

  refreshEditorTags(key);

}

function updateDraftField(input) {

  if (!state.draft || !input.name) return;

  const field = CFG.fieldMap[input.name];

  if (!field) return;

  if (field.type === "multi") {

    state.draft[field.key] = [
      ...$("#gem-form").querySelectorAll(
        `input[name="${field.key}"]:checked`
      )
    ].map(item => item.value);

  }

  else if (field.type === "number") {

    state.draft[field.key] =
      input.value.trim() === ""
        ? null
        : Number(input.value);

  }

  else {

    state.draft[field.key] = input.value;

  }

  $("#editor-status").textContent =
    "Unsaved changes";

  queueDraftSave();

}

function submitEditor(event) {

  event.preventDefault();

  if (!state.draft) return;

  // Include a typed tag even if Add wasn't pressed.
  for (const input of $$("[data-tag-input]")) {

    const value = compact(input.value);

    if (!value) continue;

    const key = input.dataset.tagInput;

    if (!state.draft[key].some(
      item => canonical(item) === canonical(value)
    )) {
      state.draft[key].push(value);
    }

    input.value = "";

  }

  if (
    !state.draft.name ||
    !state.draft.name.trim()
  ) {

    toast("Please enter a gemstone name.");

    const identity =
      $(".editor-section");

    if (identity) identity.open = true;

    $('[name="name"]')?.focus();

    return;

  }


/* Include any answer not yet added */

for (const input of document.querySelectorAll(
  "[data-flex-input]"
)) {

  if (!input.value.trim()) continue;

  const added = addFlexibleValue(
    input.dataset.flexInput
  );

  if (added === false) return;
}

/* Validate flexible fields */

if (!validateFlexibleFields()) {
  return;
}
   
  const saved = saveGem(state.draft);

  if (!saved) return;

  closeEditor();

  state.page = "profile";

  render();

}

function recoverDraft() {

  const saved = readDraft();

  if (!saved) {
    toast("No saved draft found.");
    return;
  }

  openEditor(
    saved.editingId && getGem(saved.editingId)
      ? saved.editingId
      : null,
    saved.gem
  );

}


/* =========================================
   MAIN NAVIGATION
========================================= */

function navigate(page) {

  const allowed = [
    "library",
    "profile",
    "compare",
    "relations",
    "statistics"
  ];

  if (!allowed.includes(page)) return;

  state.page = page;

  render();

  window.scrollTo(0, 0);

}

function openProfile(id) {

  if (!getGem(id)) return;

  state.selectedGem = id;

  navigate("profile");

}

function refreshSelections() {

  const ids = new Set(
    state.gems.map(gem => gem.id)
  );

  if (!ids.has(state.compareA)) {
    state.compareA = state.gems[0]?.id || "";
  }

  if (!ids.has(state.compareB)) {
    state.compareB =
      state.gems.find(gem =>
        gem.id !== state.compareA
      )?.id || "";
  }

  if (!ids.has(state.relationId)) {
    state.relationId = state.gems[0]?.id || "";
  }

  state.multiIds = state.multiIds.filter(
    id => ids.has(id)
  );

  if (
    state.selectedGem &&
    !ids.has(state.selectedGem)
  ) {
    state.selectedGem = null;
  }

}

function render() {

  refreshSelections();

  const pageLabels = {
    library: "Library",
    profile: "Gemstone Profile",
    compare: "Comparison",
    relations: "Relationships",
    statistics: "Statistics"
  };

  $("#current-page-label").textContent =
    pageLabels[state.page];

  const navPage =
    state.page === "profile"
      ? "library"
      : state.page;

  $$("[data-page]").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.page === navPage
    );

  });

  $("#sidebar-count").textContent =
    state.gems.length;

  switch (state.page) {

    case "library":
      main.innerHTML = renderLibrary();
      break;

    case "profile":
      main.innerHTML = renderProfile();
      break;

    case "compare":
      main.innerHTML = renderComparison();
      break;

    case "relations":
      main.innerHTML = renderRelationships();
      break;

    case "statistics":
      main.innerHTML = renderStatistics();
      break;

    default:
      main.innerHTML = renderLibrary();

  }

}


/* =========================================
   LIBRARY PAGE
========================================= */

function filteredLibrary() {

  const search = canonical(state.librarySearch);

  let gems = state.gems.filter(gem => {

    const matchesRarity =
      !state.libraryRarity ||
      gem.rarity === state.libraryRarity;

    if (!matchesRarity) return false;

    if (!search) return true;

    const searchable = CFG.fields
      .filter(field => field.type !== "links")
      .map(field => {

        const value = gem[field.key];

        return Array.isArray(value)
          ? value.join(" ")
          : String(value ?? "");

      })
      .join(" ");

    return canonical(searchable).includes(search);

  });

  if (state.librarySort === "recent") {

    gems.sort((a, b) =>
      String(b.updatedAt).localeCompare(
        String(a.updatedAt)
      )
    );

  }

  else if (state.librarySort === "rarity") {

    const rank = rarity =>
      CFG.rarities.indexOf(rarity);

    gems.sort((a, b) =>
      rank(b.rarity) - rank(a.rarity)
    );

  }

  else {
    gems = sortGems(gems);
  }

  return gems;

}

function renderLibrary() {

  const draft = readDraft();

  return `

    <div class="page-heading">

      <div>
        <div class="eyebrow">COLLECTION</div>
        <h1>Gemstone Library</h1>
        <p>
          ${state.gems.length} saved gemstone profiles.
        </p>
      </div>

      <div class="page-actions">

        <button
          class="button button-secondary"
          data-action="export">
          Export
        </button>

        <button
          class="button button-secondary"
          data-action="import">
          Import
        </button>

      </div>

    </div>

    ${draft ? `

      <div class="panel" style="margin-bottom:18px;">

        <div class="panel-title">
          <h3>Unfinished Draft</h3>
        </div>

        <p class="muted" style="font-size:12px;">
          An unfinished profile was preserved in this browser.
        </p>

        <div class="page-actions">

          <button
            class="button button-secondary"
            data-action="recover-draft">
            Resume Draft
          </button>

          <button
            class="button button-ghost"
            data-action="discard-draft">
            Discard Draft
          </button>

        </div>

      </div>

    ` : ""}

    <div class="library-toolbar">

      <input
        id="library-search"
        class="input"
        type="search"
        placeholder="Search gemstones and their properties..."
        value="${escapeAttr(state.librarySearch)}">

      <select
        id="library-rarity"
        class="select">

        ${makeOptions(
          CFG.rarities,
          state.libraryRarity,
          "All rarities"
        )}

      </select>

      <select
        id="library-sort"
        class="select">

        ${makeOptions([
          {value:"name",label:"Name A–Z"},
          {value:"recent",label:"Recently Updated"},
          {value:"rarity",label:"Rarity"}
        ],state.librarySort,"Sort")}

      </select>

    </div>

    <div class="result-count" id="library-result-count"></div>

    <div id="library-results"></div>

  `;

}

function renderLibraryResults() {

  const gems = filteredLibrary();

  const count = $("#library-result-count");
  const container = $("#library-results");

  if (!count || !container) return;

  count.textContent =
    `${gems.length} of ${state.gems.length} gemstones`;

  if (!gems.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-symbol">◇</div>
        <h2>${
          state.gems.length
            ? "No matching gemstones"
            : "Your library is empty"
        }</h2>

        <p>
          ${
            state.gems.length
              ? "Try another search or filter."
              : "Create your first gemstone profile to begin."
          }
        </p>

        <button
          class="button button-primary"
          data-action="new-gem">
          + New Gemstone
        </button>
      </div>
    `;

    return;

  }

  container.innerHTML = `

    <div class="library-grid">

      ${gems.map(gem => `

        <article class="gem-card">

          <div class="gem-card-top">

            <div>
              <h3>${escapeHTML(gem.name)}</h3>

              <div class="gem-card-subtitle">
                ${escapeHTML(gem.title || "Gemstone")}
              </div>
            </div>

            <div class="gem-card-symbol">◇</div>

          </div>

          <div class="gem-card-details">

            <div class="gem-card-detail">
              <span>Rarity</span>
              <span>${escapeHTML(gem.rarity || "—")}</span>
            </div>

            <div class="gem-card-detail">
              <span>Species</span>
              <span>${escapeHTML(gem.mineralSpecies || "—")}</span>
            </div>

            <div class="gem-card-detail">
              <span>Mohs</span>
              <span>${gem.mohs ?? "—"}</span>
            </div>

          </div>

          <div class="tags gem-card-tags">
            ${tagsHTML(gem.classifications.slice(0,3))}
          </div>

          <div class="gem-card-actions">

            <button
              class="button button-primary button-small"
              data-action="view-gem"
              data-id="${escapeAttr(gem.id)}">
              Open
            </button>

            <button
              class="button button-secondary button-small"
              data-action="edit-gem"
              data-id="${escapeAttr(gem.id)}">
              Edit
            </button>

            <button
              class="button button-ghost button-small"
              data-action="compare-gem"
              data-id="${escapeAttr(gem.id)}">
              Compare
            </button>

          </div>

        </article>

      `).join("")}

    </div>

  `;

}


/* =========================================
   PROFILE PAGE
========================================= */

function formatFieldValue(gem, field) {

  const value = gem[field.key];

  if (!hasValue(value)) {
    return `<span class="empty-note">Not specified</span>`;
  }

/* Display optional multiple answers */

if (
  isFlexibleField(field) &&
  Array.isArray(value)
) {

  return `
    <div class="tags flexible-profile-tags">

      ${value.map(item => `
        <span class="tag">
          ${escapeHTML(item)}
        </span>
      `).join("")}

    </div>
  `;
}
   
  if (field.type === "number") {
    return escapeHTML(formatNumber(value, 5));
  }

  if (field.type === "tags" ||
      field.type === "multi") {

    return `
      <div class="tags">
        ${tagsHTML(value)}
      </div>
    `;

  }

  if (field.type === "links") {

    return `
      <div class="tags">

        ${value.map(id => {

          const linked = getGem(id);

          if (!linked) return "";

          return `
            <button
              class="tag"
              data-action="view-gem"
              data-id="${escapeAttr(id)}">
              ${escapeHTML(linked.name)}
            </button>
          `;

        }).join("")}

      </div>
    `;

  }

  if (field.type === "bullets") {

    return `
      <ul class="profile-list">

        ${value.map(item => `
          <li>${escapeHTML(item)}</li>
        `).join("")}

      </ul>
    `;

  }

  return escapeHTML(value);

}


function renderProfile() {

  const gem = getGem(state.selectedGem);

  if (!gem) {
    return panelEmpty("Gemstone not found.");
  }

  const row = (key) => {

    const field = CFG.fieldMap[key];

    if (!field || !hasValue(gem[key])) return "";

    return `
      <div class="sheet-row">

        <div class="sheet-label">
          ${escapeHTML(field.label)}
        </div>

        <div class="sheet-value">
          ${formatFieldValue(gem, field)}
        </div>

      </div>
    `;
  };

  const section = (title, keys, extra = "") => {

    const visible = keys.filter(
      key => hasValue(gem[key])
    );

    if (!visible.length) return "";

    return `
      <section class="sheet-section ${extra}">

        <div class="sheet-section-heading">
          ${escapeHTML(title)}
        </div>

        <div class="sheet-rows">
          ${visible.map(row).join("")}
        </div>

      </section>
    `;
  };

  return `

    <div class="sheet-toolbar">

      <button
        class="button button-ghost"
        data-action="go-library">
        ← Library
      </button>

      <div class="page-actions">

        <button
          class="button button-secondary button-small"
          data-action="compare-gem"
          data-id="${escapeAttr(gem.id)}">
          Compare
        </button>

        <button
          class="button button-secondary button-small"
          data-action="relations-gem"
          data-id="${escapeAttr(gem.id)}">
          Relations
        </button>

        <button
          class="button button-primary button-small"
          data-action="edit-gem"
          data-id="${escapeAttr(gem.id)}">
          Edit
        </button>

      </div>

    </div>

    <article class="gem-sheet">

      <header class="sheet-header">

        <div class="eyebrow">GEMSTONE RECORD</div>

        <h1>${escapeHTML(gem.name)}</h1>

        ${gem.title ? `
          <div class="sheet-subtitle">
            ${escapeHTML(gem.title)}
          </div>
        ` : ""}

        <div class="sheet-header-tags">

          ${tagsHTML(gem.classifications, true)}

          ${gem.rarity
            ? tagHTML(gem.rarity)
            : ""
          }

        </div>

      </header>

      <div class="sheet-grid">

        <div class="sheet-column">

          ${section(
            "Mineral Family",
            [
              "mineralGroup",
              "mineralSpecies",
              "relatesTo"
            ]
          )}

          ${section(
            "Physical Properties",
            [
              "mohs",
              "density",
              "crystalSystem",
              "cleavage",
              "fracture",
              "streak",
              "tenacity",
              "luster",
              "transparency"
            ]
          )}

          ${section(
            "Optical Properties",
            [
              "refractiveIndex",
              "birefringence",
              "pleochroism",
              "dispersion",
              "otherEffects"
            ]
          )}

        </div>

        <div class="sheet-column">

          ${section(
            "Appearance",
            ["colors"]
          )}

          ${section(
            "Origin & Discovery",
            [
              "countries",
              "discoveryYear",
              "discoveryLocation",
              "discoverer",
              "etymology"
            ]
          )}

          ${section(
            "Associations",
            [
              "zodiacStone",
              "planetaryStone",
              "birthStone",
              "anniversaryStone",
              "meaning",
              "connectedWith"
            ]
          )}

        </div>

      </div>

      ${hasValue(gem.otherFacts) ? `

        <section class="sheet-notes">

          <div class="sheet-section-heading">
            Other Facts
          </div>

          ${formatFieldValue(
            gem,
            CFG.fieldMap.otherFacts
          )}

        </section>

      ` : ""}

      <footer class="sheet-footer">

        <span>
          Last updated:
          ${gem.updatedAt
            ? escapeHTML(
                new Date(gem.updatedAt)
                  .toLocaleDateString()
              )
            : "—"
          }
        </span>

        <div class="page-actions">

          <button
            class="button button-ghost button-small"
            data-action="duplicate-gem"
            data-id="${escapeAttr(gem.id)}">
            Duplicate
          </button>

          <button
            class="button button-ghost button-small"
            data-action="delete-gem"
            data-id="${escapeAttr(gem.id)}">
            Delete
          </button>

        </div>

      </footer>

    </article>

  `;

}

/* =========================================
   SIMILARITY ENGINE
   EVERY COMPARABLE FIELD HAS EQUAL WEIGHT
========================================= */

function normalizedSet(values) {

  const source =
    Array.isArray(values)
      ? values
      : [values];

  return new Set(
    source
      .filter(hasValue)
      .map(canonical)
      .filter(Boolean)
  );

}

function compareField(field, valueA, valueB) {

  if (!hasValue(valueA) || !hasValue(valueB)) {

    return {
      comparable: false,
      score: null,
      status: "unknown"
    };


/* Optional multiple answers */

if (
  isFlexibleField(field) &&
  (
    Array.isArray(valueA) ||
    Array.isArray(valueB)
  )
) {

  const a = normalizedSet(valueA);
  const b = normalizedSet(valueB);

  const union = new Set([...a,...b]);

  let matches = 0;

  for (const item of a) {
    if (b.has(item)) matches++;
  }

  const score = union.size
    ? matches / union.size
    : 0;

  return {
    comparable: true,
    score,
    status:
      score >= .999999
        ? "match"
        : score <= .000001
          ? "different"
          : "partial"
  };
     
  }

  let score = 0;

  if (field.type === "number") {

    const a = Number(valueA);
    const b = Number(valueB);

    if (
      !Number.isFinite(a) ||
      !Number.isFinite(b)
    ) {

      return {
        comparable: false,
        score: null,
        status: "unknown"
      };

    }

    // Fixed scale for Mohs; relative distance
    // for other numeric properties.

    const scale = field.scale ||
      Math.max(Math.abs(a),Math.abs(b),1);

    score = clamp(
      1 - Math.abs(a-b) / scale,
      0,
      1
    );

  }

  else if (
    field.type === "multi" ||
    field.type === "tags" ||
    field.type === "bullets"
  ) {

    const a = normalizedSet(valueA);
    const b = normalizedSet(valueB);

    const union = new Set([...a,...b]);

    let common = 0;

    for (const item of a) {
      if (b.has(item)) common++;
    }

    score = union.size
      ? common / union.size
      : 0;

  }

  else {

    score =
      canonical(valueA) === canonical(valueB)
        ? 1
        : 0;

  }

  return {
    comparable: true,
    score,

    status:
      score >= .999999
        ? "match"
        : score <= .000001
          ? "different"
          : "partial"
  };

}

function compareGems(gemA, gemB) {

  if (!gemA || !gemB) return null;

  const results = [];

  let total = 0;
  let compared = 0;

  let matches = 0;
  let partials = 0;
  let differences = 0;

  for (const field of CFG.comparableFields) {

    const result = compareField(
      field,
      gemA[field.key],
      gemB[field.key]
    );

    results.push({
      field,
      valueA: gemA[field.key],
      valueB: gemB[field.key],
      ...result
    });

    if (!result.comparable) continue;

    total += result.score;
    compared++;

    if (result.status === "match") matches++;
    if (result.status === "partial") partials++;
    if (result.status === "different") differences++;

  }

  return {
    score: compared
      ? round(total / compared * 100,1)
      : null,

    compared,
    matches,
    partials,
    differences,
    results
  };

}

function similarityText(result) {

  if (!result || result.score === null) {
    return "Not enough data";
  }

  return `${formatNumber(result.score,1)}%`;

}

function statusHTML(result) {

  const labels = {
    match: "Match",
    partial: "Partial",
    different: "Different",
    unknown: "No data"
  };

  return `
    <span class="compare-status status-${result.status}">
      ${labels[result.status]}
    </span>
  `;

}


/* =========================================
   COMPARISON PAGE
========================================= */

function renderComparison() {

  const gemA = getGem(state.compareA);
  const gemB = getGem(state.compareB);

  return `

    <div class="page-heading">

      <div>
        <div class="eyebrow">ANALYSIS</div>
        <h1>Gemstone Comparison</h1>
        <p>
          Every comparable field contributes equally.
          Missing information is excluded.
        </p>
      </div>

    </div>

    <div class="panel">

      <div class="panel-title">
        <h2>Direct Comparison</h2>
      </div>

      <div class="compare-selectors">

        <div class="field">
          <label>Gemstone A</label>

          <select
            id="compare-a"
            class="select">

            ${gemOptions(state.compareA)}

          </select>

        </div>

        <div class="field">
          <label>Gemstone B</label>

          <select
            id="compare-b"
            class="select">

            ${gemOptions(state.compareB)}

          </select>

        </div>

      </div>

      <div class="divider"></div>

      ${
        gemA && gemB
          ? renderDirectComparison(gemA,gemB)
          : panelEmpty(
              "Create at least two gemstones to begin comparing."
            )
      }

    </div>

    <div class="panel">

      <div class="panel-title">
        <h2>Multiple Gemstone Comparison</h2>
      </div>

      <p class="section-description">
        Select several gemstones to compare their properties
        side by side.
      </p>

      ${renderMultiComparison()}

    </div>

  `;

}

function renderDirectComparison(a,b) {

  const result = compareGems(a,b);

  let lastSection = "";

  const rows = result.results.map(item => {

    const section = CFG.sections.find(
      section => section.fields.some(
        field => field.key === item.field.key
      )
    );

    let heading = "";

    if (section && section.id !== lastSection) {

      lastSection = section.id;

      heading = `
        <tr class="comparison-group-title">
          <td colspan="4">
            ${escapeHTML(section.title)}
          </td>
        </tr>
      `;

    }

    return heading + `

      <tr>

        <td>${escapeHTML(item.field.label)}</td>

        <td>${formatFieldValue(a,item.field)}</td>

        <td>${formatFieldValue(b,item.field)}</td>

        <td>${statusHTML(item)}</td>

      </tr>

    `;

  }).join("");

  return `

    <div class="compare-summary">

      <div class="compare-score">
        ${result.score === null ? "—" : result.score}
        <small>${result.score === null ? "" : "%"}</small>
      </div>

      <div style="flex:1;min-width:0;">

        <strong>
          ${escapeHTML(a.name)}
          &amp;
          ${escapeHTML(b.name)}
        </strong>

        <div class="compare-meter">
          <div
            class="compare-meter-fill"
            style="width:${result.score ?? 0}%">
          </div>
        </div>

        <div class="muted" style="font-size:11px;">
          ${result.compared} compared fields ·
          ${result.matches} matches ·
          ${result.partials} partial ·
          ${result.differences} differences
        </div>

      </div>

    </div>

    <p class="chart-note">
      Similarity is calculated only from fields where
      both gemstones have information. Manual relationship
      links do not affect this score.
    </p>

    <div class="comparison-table-wrap">

      <table class="data-table">

        <thead>
          <tr>
            <th>Property</th>
            <th>${escapeHTML(a.name)}</th>
            <th>${escapeHTML(b.name)}</th>
            <th>Result</th>
          </tr>
        </thead>

        <tbody>${rows}</tbody>

      </table>

    </div>

  `;

}

function renderMultiComparison() {

  if (!state.gems.length) {
    return panelEmpty("No gemstones available.");
  }

  const selected = state.multiIds
    .map(getGem)
    .filter(Boolean);

  return `

    <div class="multi-gem-grid">

      ${sortGems(state.gems).map(gem => `

        <label class="multi-option">

          <input
            type="checkbox"
            data-multi-id="${escapeAttr(gem.id)}"
            ${
              state.multiIds.includes(gem.id)
                ? "checked"
                : ""
            }>

          <span>${escapeHTML(gem.name)}</span>

        </label>

      `).join("")}

    </div>

    <div class="divider"></div>

    ${
      selected.length >= 2
        ? renderMultiTable(selected)
        : `
          <p class="muted">
            Select at least two gemstones.
          </p>
        `
    }

  `;

}

function renderMultiTable(gems) {

  const fields = CFG.comparableFields;

  return `

    <div class="comparison-table-wrap">

      <table class="data-table">

        <thead>
          <tr>
            <th>Property</th>

            ${gems.map(gem => `
              <th>${escapeHTML(gem.name)}</th>
            `).join("")}

          </tr>
        </thead>

        <tbody>

          ${fields.map(field => `

            <tr>

              <td>
                <strong>${escapeHTML(field.label)}</strong>
              </td>

              ${gems.map(gem => `
                <td>${formatFieldValue(gem,field)}</td>
              `).join("")}

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>

    <div class="divider"></div>

    <h3>Pairwise Similarity</h3>

    <div class="table-scroll">

      <table class="data-table">

        <thead>
          <tr>
            <th>Gemstones</th>
            <th>Similarity</th>
            <th>Compared Fields</th>
          </tr>
        </thead>

        <tbody>

          ${gems.flatMap((a,index) =>
            gems.slice(index+1).map(b => {

              const result = compareGems(a,b);

              return `
                <tr>
                  <td>
                    ${escapeHTML(a.name)}
                    /
                    ${escapeHTML(b.name)}
                  </td>

                  <td>
                    <strong>
                      ${similarityText(result)}
                    </strong>
                  </td>

                  <td>${result.compared}</td>
                </tr>
              `;

            })
          ).join("")}

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================
   RELATIONSHIP ENGINE
========================================= */

function relationshipResults(gem) {

  if (!gem) return [];

  const results = state.gems
    .filter(other => other.id !== gem.id)
    .map(other => {

      const comparison = compareGems(gem,other);

      const directLink =
        gem.relatesTo.includes(other.id) ||
        other.relatesTo.includes(gem.id);

      const shared = comparison.results
        .filter(item =>
          item.comparable &&
          item.score > 0
        )
        .map(item => ({
          key: item.field.key,
          label: item.field.label,
          score: item.score
        }));

      return {
        gem: other,
        comparison,
        directLink,
        shared
      };

    });

  results.sort((a,b) => {

    if (state.relationSort === "manual") {

      if (a.directLink !== b.directLink) {
        return a.directLink ? -1 : 1;
      }

    }

    if (state.relationSort === "name") {
      return alphabetically(
        a.gem.name,
        b.gem.name
      );
    }

    const aScore = a.comparison.score ?? -1;
    const bScore = b.comparison.score ?? -1;

    return bScore - aScore ||
      b.comparison.compared - a.comparison.compared ||
      alphabetically(a.gem.name,b.gem.name);

  });

  return results;

}

function manualNeighbors(id) {

  const linked = new Set();

  const gem = getGem(id);

  if (!gem) return [];

  for (const otherId of gem.relatesTo) {

    if (getGem(otherId)) {
      linked.add(otherId);
    }

  }

  for (const other of state.gems) {

    if (other.relatesTo.includes(id)) {
      linked.add(other.id);
    }

  }

  linked.delete(id);

  return [...linked];

}

function shortestManualPath(start,end) {

  if (!getGem(start) || !getGem(end)) {
    return null;
  }

  if (start === end) return [start];

  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length) {

    const path = queue.shift();

    const current = path[path.length-1];

    for (const neighbor of manualNeighbors(current)) {

      if (visited.has(neighbor)) continue;

      const next = [...path,neighbor];

      if (neighbor === end) {
        return next;
      }

      visited.add(neighbor);
      queue.push(next);

    }

  }

  return null;

}

function renderRelationshipGraph(gem,results) {

  const visible = results
    .filter(item =>
      item.comparison.score !== null ||
      item.directLink
    )
    .slice(0,8);

  if (!visible.length) {

    return panelEmpty(
      "Add more gemstone information to discover relationships."
    );

  }

  const centerX = 250;
  const centerY = 185;
  const radiusX = 188;
  const radiusY = 138;

  let lines = "";
  let nodes = "";

  visible.forEach((item,index) => {

    const angle =
      (Math.PI * 2 * index / visible.length) -
      Math.PI / 2;

    const x = centerX + Math.cos(angle)*radiusX;
    const y = centerY + Math.sin(angle)*radiusY;

    const score = item.comparison.score;

    const strength =
      score === null
        ? .15
        : .15 + score / 100 * .65;

    lines += `
      <line
        x1="${centerX}"
        y1="${centerY}"
        x2="${x}"
        y2="${y}"
        stroke="#879a83"
        stroke-width="${item.directLink ? 2.8 : 1.5}"
        stroke-opacity="${strength}"
        ${item.directLink ? "" : 'stroke-dasharray="4 4"'}
      />
    `;

    const label =
      item.gem.name.length > 17
        ? item.gem.name.slice(0,16) + "…"
        : item.gem.name;

    nodes += `
      <g>

        <circle
          cx="${x}"
          cy="${y}"
          r="24"
          fill="#edf1eb"
          stroke="${item.directLink ? "#536451" : "#ccd4c8"}"
          stroke-width="${item.directLink ? 2.5 : 1}"
        />

        <text
          x="${x}"
          y="${y+4}"
          text-anchor="middle"
          font-size="16"
          fill="#536451">
          ◇
        </text>

        <text
          x="${x}"
          y="${y+39}"
          text-anchor="middle"
          font-size="10"
          fill="#414741">
          ${escapeHTML(label)}
        </text>

        <text
          x="${x}"
          y="${y+51}"
          text-anchor="middle"
          font-size="9"
          fill="#879087">
          ${score === null ? "No data" : score+"%"}
        </text>

      </g>
    `;

  });

  return `

    <div class="relationship-graph">

      <svg
        viewBox="0 0 500 390"
        role="img"
        aria-label="Relationship overview for ${escapeAttr(gem.name)}">

        ${lines}

        ${nodes}

        <circle
          cx="${centerX}"
          cy="${centerY}"
          r="34"
          fill="#536451"
        />

        <text
          x="${centerX}"
          y="${centerY+5}"
          font-size="23"
          text-anchor="middle"
          fill="white">
          ◇
        </text>

        <text
          x="${centerX}"
          y="${centerY+53}"
          font-size="13"
          font-weight="600"
          text-anchor="middle"
          fill="#303b2e">
          ${escapeHTML(
            gem.name.length > 23
              ? gem.name.slice(0,22)+"…"
              : gem.name
          )}
        </text>

      </svg>

    </div>

    <p class="chart-note">
      Solid lines indicate manual relationships.
      Dashed lines indicate calculated similarity.
      The map displays up to eight related gemstones.
    </p>

  `;

}

function renderRelationships() {

  const gem = getGem(state.relationId);

  const results = relationshipResults(gem);

  return `

    <div class="page-heading">

      <div>
        <div class="eyebrow">CONNECTIONS</div>
        <h1>Relationships</h1>
        <p>
          Explore similarities, manually linked gemstones,
          and shared characteristics.
        </p>
      </div>

    </div>

    <div class="panel">

      <div class="control-row">

        <div class="field">
          <label>Selected Gemstone</label>

          <select
            class="select"
            id="relation-gem">

            ${gemOptions(state.relationId)}

          </select>

        </div>

        <div class="field">
          <label>Order By</label>

          <select
            class="select"
            id="relation-sort">

            ${makeOptions([
              {value:"similarity",label:"Closest Similarity"},
              {value:"manual",label:"Manual Relationships"},
              {value:"name",label:"Name"}
            ],state.relationSort)}

          </select>

        </div>

      </div>

      ${
        gem
          ? renderRelationshipContents(gem,results)
          : panelEmpty(
              "Create gemstones to explore relationships."
            )
      }

    </div>

  `;

}

function renderRelationshipContents(gem,results) {

  return `

    <div class="panel-grid">

      <div>

        <h3>Relationship Map</h3>

        ${renderRelationshipGraph(gem,results)}

      </div>

      <div>

        <h3>Closest Gemstones</h3>

        <div class="relationship-list">

          ${
            results.length
              ? results.map(item => {

                const comparison = item.comparison;

                return `

                  <div class="relationship-entry">

                    <div class="relationship-entry-header">

                      <button
                        class="link-button relationship-name"
                        data-action="view-gem"
                        data-id="${escapeAttr(item.gem.id)}">
                        ${escapeHTML(item.gem.name)}
                      </button>

                      <span class="relationship-score">
                        ${similarityText(comparison)}
                      </span>

                    </div>

                    <div class="compare-meter">

                      <div
                        class="compare-meter-fill"
                        style="width:${comparison.score ?? 0}%">
                      </div>

                    </div>

                    <div class="relationship-meta">

                      ${comparison.compared} comparable fields

                      ${
                        item.directLink
                          ? " · Manual link"
                          : ""
                      }

                    </div>

                    <div
                      class="tags"
                      style="margin-top:9px;">

                      ${item.shared
                        .slice(0,5)
                        .map(property =>
                          tagHTML(property.label)
                        ).join("")}

                    </div>

                    <div class="page-actions" style="margin-top:10px;">

                      <button
                        class="button button-ghost button-small"
                        data-action="compare-pair"
                        data-a="${escapeAttr(gem.id)}"
                        data-b="${escapeAttr(item.gem.id)}">
                        Compare
                      </button>

                    </div>

                  </div>

                `;

              }).join("")
              : `<p class="muted">No other gemstones yet.</p>`
          }

        </div>

      </div>

    </div>

    <div class="divider"></div>

    <div class="panel-grid">

      <div>

        <h3>Manual Relationships</h3>

        ${
          manualNeighbors(gem.id).length
            ? `
              <div class="tags">

                ${manualNeighbors(gem.id)
                  .map(id => `
                    <button
                      class="tag"
                      data-action="view-gem"
                      data-id="${escapeAttr(id)}">
                      ${escapeHTML(getGemName(id))}
                    </button>
                  `).join("")}

              </div>
            `
            : `<p class="muted">No manual links recorded.</p>`
        }

        <p class="chart-note">
          Manual links can be added through the
          Mineral Family section of the profile editor.
        </p>

      </div>

      <div>

        <h3>Indirect Relationship Path</h3>

        <div class="field">
          <label>Find a path to</label>

          <select
            class="select"
            id="path-target">

            ${makeOptions(
              sortGems(state.gems)
                .filter(item => item.id !== gem.id)
                .map(item => ({
                  value:item.id,
                  label:item.name
                })),
              "",
              "Choose another gemstone"
            )}

          </select>

        </div>

        <div id="relationship-path" style="margin-top:13px;"></div>

        <p class="chart-note">
          This finds the shortest path through manually
          entered relationships. Similarity alone does not
          create a manual connection.
        </p>

      </div>

    </div>

  `;

}

function updateRelationshipPath() {

  const target = $("#path-target")?.value;
  const container = $("#relationship-path");

  if (!container) return;

  if (!target) {
    container.innerHTML = "";
    return;
  }

  const path = shortestManualPath(
    state.relationId,
    target
  );

  if (!path) {

    container.innerHTML = `
      <p class="muted">
        No manual connection path found.
      </p>
    `;

    return;

  }

  container.innerHTML = `

    <div class="path-list">

      ${path.map((id,index) => `

        ${index ? `<span class="path-arrow">→</span>` : ""}

        ${tagHTML(getGemName(id),true)}

      `).join("")}

    </div>

    <p class="chart-note">
      ${path.length-1} connection(s).
    </p>

  `;

}


/* =========================================
   STATISTICS ENGINE
========================================= */

function statisticsPopulation() {

  const search = canonical(state.statSearch);

  return state.gems.filter(gem => {

    if (
      state.statRarity &&
      gem.rarity !== state.statRarity
    ) {
      return false;
    }

    if (!search) return true;

    const searchable = CFG.fields
      .filter(field => field.type !== "links")
      .map(field => {

        const value = gem[field.key];

        return Array.isArray(value)
          ? value.join(" ")
          : String(value ?? "");

      })
      .join(" ");

    return canonical(searchable).includes(search);

  });

}

function dimensionValues(gem,key) {

  const value = gem[key];

  if (!hasValue(value)) return [];

  const values =
    Array.isArray(value)
      ? value
      : [value];

  const seen = new Set();
  const result = [];

  for (const raw of values) {

    const label = compact(raw);
    const normalized = canonical(label);

    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(label);

  }

  return result;

}

function buildDistribution(gems,key) {

  const counts = new Map();

  for (const gem of gems) {

    for (const value of dimensionValues(gem,key)) {

      const normalized = canonical(value);

      if (!counts.has(normalized)) {

        counts.set(normalized,{
          label:value,
          value:0,
          gemIds:new Set()
        });

      }

      const entry = counts.get(normalized);

      entry.value++;
      entry.gemIds.add(gem.id);

    }

  }

  return [...counts.values()]
    .map(item => ({
      label:item.label,
      value:item.value,
      gemIds:[...item.gemIds]
    }))
    .sort((a,b) =>
      b.value-a.value ||
      alphabetically(a.label,b.label)
    );

}


function numericValues(gem,key) {

  const raw = gem[key];

  const values =
    Array.isArray(raw)
      ? raw
      : [raw];

  return values
    .filter(item =>
      item !== null &&
      item !== undefined &&
      String(item).trim() !== ""
    )
    .map(Number)
    .filter(Number.isFinite);
}
   

function buildNumericDistribution(gems,key) {

  const allNumbers = gems.flatMap(
    gem => numericValues(gem,key)
  );

  if (!allNumbers.length) return [];

  const definition = CFG.numericDimensions.find(
    item => item.key === key
  );

  let bounds = definition?.bins;

  if (!bounds) {

    const minimum = Math.min(...allNumbers);
    const maximum = Math.max(...allNumbers);

    if (minimum === maximum) {

      const members = gems.filter(gem =>
        numericValues(gem,key).includes(minimum)
      );

      return [{
        label:formatNumber(minimum,4),
        value:members.length,
        gemIds:members.map(gem => gem.id)
      }];

    }

    const steps = 6;
    const width = (maximum-minimum)/steps;

    bounds = Array.from(
      {length:steps+1},
      (_,index) => minimum+width*index
    );

  }

  return bounds.slice(0,-1).map((lower,index) => {

    const upper = bounds[index+1];

    const isLast =
      index === bounds.length-2;

    const members = gems.filter(gem => {

      return numericValues(gem,key).some(number =>

        number >= lower &&
        (
          number < upper ||
          (isLast && number <= upper)
        )

      );

    });

    return {
      label:
        `${formatNumber(lower,4)}–${formatNumber(upper,4)}`,

      value:members.length,

      gemIds:members.map(gem => gem.id)
    };

  });

}

function numericSummary(gems,key) {

  const values = gems
    .flatMap(gem => numericValues(gem,key))
    .sort((a,b) => a-b);

  if (!values.length) return null;

  const sum = values.reduce(
    (total,value) => total+value,
    0
  );

  const midpoint = Math.floor(
    values.length/2
  );

  const median =
    values.length % 2
      ? values[midpoint]
      : (
          values[midpoint-1] +
          values[midpoint]
        )/2;

  return {
    count:values.length,
    average:sum/values.length,
    median,
    min:values[0],
    max:values[values.length-1]
  };
}

function buildCrossAnalysis(gems,keyA,keyB) {

  const rows = buildDistribution(gems,keyA).slice(0,12);
  const columns = buildDistribution(gems,keyB).slice(0,12);

  const cells = rows.map(row => {

    return columns.map(column => {

      const members = gems.filter(gem => {

        const a = dimensionValues(gem,keyA)
          .some(value =>
            canonical(value) === canonical(row.label)
          );

        const b = dimensionValues(gem,keyB)
          .some(value =>
            canonical(value) === canonical(column.label)
          );

        return a && b;

      });

      return {
        count:members.length,
        ids:members.map(gem => gem.id)
      };

    });

  });

  return {rows,columns,cells};

}


/* =========================================
   STATISTICS PAGE
========================================= */

function renderStatistics() {

  const population = statisticsPopulation();

  const numeric = CFG.numericDimensions.some(
    item => item.key === state.statDimension
  );

  const allDimensions = [
    ...CFG.statisticsDimensions,
    ...CFG.numericDimensions
  ];

  const distribution = numeric
    ? buildNumericDistribution(
        population,
        state.statDimension
      )
    : buildDistribution(
        population,
        state.statDimension
      );

  const totalEntries = distribution.reduce(
    (sum,item) => sum+item.value,
    0
  );

  const uniqueCountries = buildDistribution(
    population,
    "countries"
  ).length;

  const uniqueSpecies = buildDistribution(
    population,
    "mineralSpecies"
  ).length;

  const documented = population.filter(gem =>
    CFG.comparableFields.some(field =>
      hasValue(gem[field.key])
    )
  ).length;

  return `

    <div class="page-heading">

      <div>
        <div class="eyebrow">LIBRARY ANALYTICS</div>
        <h1>Statistics</h1>

        <p>
          Explore your complete gemstone collection
          through interactive distributions and comparisons.
        </p>
      </div>

    </div>

    <div class="panel" style="margin-bottom:18px;">

      <div class="panel-title">
        <h2>Data Filters</h2>
      </div>

      <div class="control-row">

        <div class="field search-field">

          <label>Search Within Statistics</label>

          <input
            id="stat-search"
            class="input"
            type="search"
            placeholder="Filter by name, property, country..."
            value="${escapeAttr(state.statSearch)}">

        </div>

        <div class="field">

          <label>Rarity</label>

          <select
            id="stat-rarity"
            class="select">

            ${makeOptions(
              CFG.rarities,
              state.statRarity,
              "All rarities"
            )}

          </select>

        </div>

      </div>

      <p class="chart-note">
        All charts and calculations below use the
        currently filtered collection.
      </p>

    </div>

    <div class="stat-overview">

      ${statTile(
        "Gemstones",
        population.length,
        `${state.gems.length} in complete library`
      )}

      ${statTile(
        "Mineral Species",
        uniqueSpecies,
        "Unique documented species"
      )}

      ${statTile(
        "Countries",
        uniqueCountries,
        "Unique documented countries"
      )}

      ${statTile(
        "Documented Gems",
        documented,
        "With comparison data"
      )}

    </div>

    <div class="panel">

      <div class="panel-title">
        <h2>Category Analysis</h2>
        <span class="panel-subtitle">
          ${population.length} gemstones
        </span>
      </div>

      <div class="control-row">

        <div class="field">

          <label>Property</label>

          <select
            id="stat-dimension"
            class="select">

            ${makeOptions(
              allDimensions.map(item => ({
                value:item.key,
                label:item.label
              })),
              state.statDimension
            )}

          </select>

        </div>

        <div class="field">

          <label>Chart Type</label>

          <select
            id="stat-chart"
            class="select">

            ${makeOptions([
              {value:"bar",label:"Ranked Bar Chart"},
              {value:"donut",label:"Donut Chart"},
              {value:"treemap",label:"Treemap"},
              {value:"table",label:"Data Table"}
            ],state.statChart)}

          </select>

        </div>

      </div>

      <div class="control-row">

        <div class="field">

          <label>Measurement</label>

          <select
            id="stat-metric"
            class="select">

            ${makeOptions([
              {value:"records",label:"Number of Gemstones"},
              {value:"percent",label:"Percentage of Gemstones"}
            ],state.statMetric)}

          </select>

        </div>

      </div>

      <div class="chart-container">

        ${renderChart(distribution,population.length)}

      </div>

      <p class="chart-note">

        ${distribution.length} categories ·
        ${totalEntries} recorded category occurrences.

        Gemstones may appear in multiple categories when
        a property accepts multiple values.

      </p>

      ${numeric
        ? renderNumericSummary(
            numericSummary(
              population,
              state.statDimension
            )
          )
        : ""
      }

      ${renderStatDetail(population)}

    </div>

    <div class="panel">

      <div class="panel-title">

        <h2>Cross-Analysis</h2>

        <span class="panel-subtitle">
          Compare two categories
        </span>

      </div>

      <p class="section-description">
        Discover which characteristics occur together.
        For example, compare mineral species with rarity,
        colors with countries, or crystal systems
        with classifications.
      </p>

      <div class="control-row">

        <div class="field">
          <label>Rows</label>

          <select
            id="cross-a"
            class="select">

            ${makeOptions(
              CFG.statisticsDimensions.map(item => ({
                value:item.key,
                label:item.label
              })),
              CFG.statisticsDimensions.some(item =>
                item.key === state.statDimension
              )
                ? state.statDimension
                : "mineralSpecies"
            )}

          </select>

        </div>

        <div class="field">
          <label>Columns</label>

          <select
            id="cross-b"
            class="select">

            ${makeOptions(
              CFG.statisticsDimensions.map(item => ({
                value:item.key,
                label:item.label
              })),
              state.statSecondary
            )}

          </select>
        </div>

      </div>

      <div id="cross-analysis">

        ${renderCrossAnalysis(population)}

      </div>

      <p class="chart-note">
        Displays up to twelve categories on each axis,
        ranked by frequency. Tap a number to see its gemstones.
      </p>

      <div id="cross-detail"></div>

    </div>

    <div class="panel">

      <div class="panel-title">
        <h2>Numerical Properties</h2>
      </div>

      <p class="section-description">
        Average, median, minimum and maximum values
        across recorded gemstones.
      </p>

      ${renderNumericOverview(population)}

    </div>

    <div class="panel">

      <div class="panel-title">
        <h2>Most Common Characteristics</h2>
      </div>

      ${renderTopCharacteristics(population)}

    </div>

  `;

}

function statTile(label,value,detail) {

  return `

    <div class="stat-tile">

      <div class="stat-tile-label">
        ${escapeHTML(label)}
      </div>

      <div class="stat-tile-value">
        ${formatNumber(value,1)}
      </div>

      <div class="stat-tile-detail">
        ${escapeHTML(detail)}
      </div>

    </div>

  `;

}

function renderChart(data,populationCount) {

  if (!data.length) {

    return panelEmpty(
      "No values recorded for this property."
    );

  }

  const total = data.reduce(
    (sum,item) => sum+item.value,
    0
  );

  if (state.statChart === "donut") {
    return renderDonutChart(data,total);
  }

  if (state.statChart === "treemap") {
    return renderTreemap(data,total);
  }

  if (state.statChart === "table") {
    return renderChartTable(data,populationCount);
  }

  return renderBarChart(data,populationCount);

}

function metricDisplay(count,populationCount) {

  if (state.statMetric === "percent") {

    return populationCount
      ? round(count/populationCount*100,1)+"%"
      : "0%";

  }

  return formatNumber(count);

}

function renderBarChart(data,populationCount) {

  const maximum = Math.max(
    ...data.map(item => item.value),
    1
  );

  return `

    <div class="bar-chart">

      ${data.map((item,index) => `

        <button
          class="bar-row"
          data-action="stat-detail"
          data-index="${index}"
          title="Show matching gemstones">

          <span class="bar-label">
            ${escapeHTML(item.label)}
          </span>

          <span class="bar-track">

            <span
              class="bar-fill"
              style="width:${
                item.value/maximum*100
              }%">
            </span>

          </span>

          <span class="bar-value">
            ${metricDisplay(
              item.value,
              populationCount
            )}
          </span>

        </button>

      `).join("")}

    </div>

  `;

}

function renderDonutChart(data,total) {

  if (!total) {
    return panelEmpty("No chart data.");
  }

  let position = 0;

  const segments = data.map((item,index) => {

    const start = position;
    const end = position + item.value/total*100;

    position = end;

    return `
      ${CFG.chartColors[index%CFG.chartColors.length]}
      ${start}%
      ${end}%
    `;

  }).join(",");

  return `

    <div class="donut-layout">

      <div
        class="donut-chart"
        style="background:conic-gradient(${segments});">

        <div class="donut-hole">

          <strong>${total}</strong>

          <small>Occurrences</small>

        </div>

      </div>

      <div class="donut-legend">

        ${data.map((item,index) => `

          <div class="legend-row">

            <span
              class="legend-dot"
              style="background:${
                CFG.chartColors[
                  index%CFG.chartColors.length
                ]
              }">
            </span>

            <span class="legend-label">
              ${escapeHTML(item.label)}
            </span>

            <span class="legend-value">
              ${item.value}
              (${round(item.value/total*100,1)}%)
            </span>

          </div>

        `).join("")}

      </div>

    </div>

  `;

}

function renderTreemap(data,total) {

  if (!total) {
    return panelEmpty("No chart data.");
  }

  return `

    <div class="treemap">

      ${data.map((item,index) => `

        <button
          class="treemap-item"
          data-action="stat-detail"
          data-index="${index}"
          style="
            flex-grow:${item.value};
            flex-basis:${
              Math.max(
                90,
                item.value/total*450
              )
            }px;
            background:${
              CFG.chartColors[
                index%CFG.chartColors.length
              ]
            };
          ">

          <span>${escapeHTML(item.label)}</span>

          <strong>${item.value}</strong>

        </button>

      `).join("")}

    </div>

    <p class="chart-note">
      Tile areas approximate category frequency.
      Use the bar chart for more precise visual comparison.
    </p>

  `;

}

function renderChartTable(data,populationCount) {

  return `

    <div class="table-scroll">

      <table class="data-table">

        <thead>

          <tr>
            <th>Category</th>
            <th>Count</th>
            <th>% of Gems</th>
            <th>Inspect</th>
          </tr>

        </thead>

        <tbody>

          ${data.map((item,index) => `

            <tr>

              <td>${escapeHTML(item.label)}</td>

              <td>${item.value}</td>

              <td>
                ${
                  populationCount
                    ? round(
                        item.value/populationCount*100,
                        1
                      )
                    : 0
                }%
              </td>

              <td>

                <button
                  class="link-button"
                  data-action="stat-detail"
                  data-index="${index}">
                  View
                </button>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>

  `;

}

function renderNumericSummary(summary) {

  if (!summary) return "";

  return `

    <div class="divider"></div>

    <div class="stat-overview">

      ${statTile(
        "Average",
        round(summary.average,4),
        "Arithmetic mean"
      )}

      ${statTile(
        "Median",
        round(summary.median,4),
        "Middle value"
      )}

      ${statTile(
        "Minimum",
        summary.min,
        "Lowest value"
      )}

      ${statTile(
        "Maximum",
        summary.max,
        "Highest value"
      )}

    </div>

    <p class="chart-note">
      ${summary.count} valid recorded values.
    </p>

  `;

}

function renderStatDetail(population) {

  if (!state.statDetail) {
    return `<div id="stat-detail"></div>`;
  }

  if (
    state.statDetail.dimension !==
    state.statDimension
  ) {

    return `<div id="stat-detail"></div>`;

  }

  const data = getCurrentDistribution(population);

  const item = data[state.statDetail.index];

  if (!item) {
    return `<div id="stat-detail"></div>`;
  }

  return `

    <div class="stat-detail" id="stat-detail">

      <strong>
        ${escapeHTML(item.label)}
      </strong>

      <p class="muted" style="font-size:11px;margin:5px 0;">
        ${item.gemIds.length} matching gemstones
      </p>

      <div class="stat-detail-list">

        ${item.gemIds.map(id => `

          <button
            class="tag"
            data-action="view-gem"
            data-id="${escapeAttr(id)}">

            ${escapeHTML(getGemName(id))}

          </button>

        `).join("")}

      </div>

    </div>

  `;

}

function getCurrentDistribution(population) {

  const numeric = CFG.numericDimensions.some(
    item => item.key === state.statDimension
  );

  return numeric
    ? buildNumericDistribution(
        population,
        state.statDimension
      )
    : buildDistribution(
        population,
        state.statDimension
      );

}

function renderCrossAnalysis(population) {

  const keyA =
    $("#cross-a")?.value ||
    (
      CFG.statisticsDimensions.some(item =>
        item.key === state.statDimension
      )
        ? state.statDimension
        : "mineralSpecies"
    );

  const keyB =
    $("#cross-b")?.value ||
    state.statSecondary;

  const matrix = buildCrossAnalysis(
    population,
    keyA,
    keyB
  );

  if (
    !matrix.rows.length ||
    !matrix.columns.length
  ) {

    return panelEmpty(
      "Not enough categorized information for cross-analysis."
    );

  }

  const max = Math.max(
    1,
    ...matrix.cells.flat().map(cell => cell.count)
  );

  return `

    <div class="table-scroll">

      <table class="data-table cross-table">

        <thead>

          <tr>

            <th>${escapeHTML(fieldLabel(keyA))}</th>

            ${matrix.columns.map(column => `

              <th>${escapeHTML(column.label)}</th>

            `).join("")}

          </tr>

        </thead>

        <tbody>

          ${matrix.rows.map((row,i) => `

            <tr>

              <th>${escapeHTML(row.label)}</th>

              ${matrix.cells[i].map((cell,j) => {

                const intensity =
                  cell.count/max;

                const opacity =
                  round(.06+intensity*.45,3);

                return `

                  <td
                    class="cross-cell"
                    style="
                      background:rgba(
                        83,100,81,${opacity}
                      );
                    ">

                    <button
                      data-action="cross-detail"
                      data-row="${i}"
                      data-column="${j}">
                      ${cell.count || "·"}
                    </button>

                  </td>

                `;

              }).join("")}

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>

  `;

}

function showCrossDetail(rowIndex,columnIndex) {

  const population = statisticsPopulation();

  const keyA = $("#cross-a")?.value;
  const keyB = $("#cross-b")?.value;

  if (!keyA || !keyB) return;

  const matrix = buildCrossAnalysis(
    population,keyA,keyB
  );

  const row = matrix.rows[rowIndex];
  const column = matrix.columns[columnIndex];

  const cell =
    matrix.cells[rowIndex]?.[columnIndex];

  if (!row || !column || !cell) return;

  $("#cross-detail").innerHTML = `

    <div class="stat-detail">

      <strong>
        ${escapeHTML(row.label)}
        +
        ${escapeHTML(column.label)}
      </strong>

      <p class="muted" style="font-size:11px;">
        ${cell.count} matching gemstones
      </p>

      <div class="stat-detail-list">

        ${cell.ids.map(id => `

          <button
            class="tag"
            data-action="view-gem"
            data-id="${escapeAttr(id)}">

            ${escapeHTML(getGemName(id))}

          </button>

        `).join("")}

      </div>

    </div>

  `;

}

function renderNumericOverview(population) {

  return `

    <div class="table-scroll">

      <table class="data-table">

        <thead>

          <tr>
            <th>Property</th>
            <th>Recorded</th>
            <th>Average</th>
            <th>Median</th>
            <th>Minimum</th>
            <th>Maximum</th>
          </tr>

        </thead>

        <tbody>

          ${CFG.numericDimensions.map(field => {

            const stats = numericSummary(
              population,
              field.key
            );

            return `

              <tr>

                <td>
                  <strong>
                    ${escapeHTML(field.label)}
                  </strong>
                </td>

                <td>${stats?.count ?? 0}</td>

                <td>${
                  stats
                    ? formatNumber(stats.average,4)
                    : "—"
                }</td>

                <td>${
                  stats
                    ? formatNumber(stats.median,4)
                    : "—"
                }</td>

                <td>${
                  stats
                    ? formatNumber(stats.min,4)
                    : "—"
                }</td>

                <td>${
                  stats
                    ? formatNumber(stats.max,4)
                    : "—"
                }</td>

              </tr>

            `;

          }).join("")}

        </tbody>

      </table>

    </div>

  `;

}

function renderTopCharacteristics(population) {

  const keys = [
    "classifications",
    "mineralSpecies",
    "colors",
    "countries",
    "crystalSystem",
    "meaning"
  ];

  return `

    <div class="panel-grid">

      ${keys.map(key => {

        const data = buildDistribution(
          population,key
        ).slice(0,5);

        return `

          <div>

            <h3>${escapeHTML(fieldLabel(key))}</h3>

            ${
              data.length
                ? `
                  <div class="bar-chart">

                    ${data.map(item => `

                      <div class="bar-row" style="cursor:default;">

                        <span class="bar-label">
                          ${escapeHTML(item.label)}
                        </span>

                        <span class="bar-track">

                          <span
                            class="bar-fill"
                            style="width:${
                              item.value /
                              Math.max(...data.map(x => x.value)) *
                              100
                            }%">
                          </span>

                        </span>

                        <span class="bar-value">
                          ${item.value}
                        </span>

                      </div>

                    `).join("")}

                  </div>
                `
                : `
                  <p class="muted" style="font-size:11px;">
                    No recorded information
                  </p>
                `
            }

          </div>

        `;

      }).join("")}

    </div>

  `;

}


/* =========================================
   IMPORT / EXPORT
========================================= */

function exportLibrary() {

  const payload = {
    format: "gem-library-v2",
    version: 2,
    exportedAt: new Date().toISOString(),
    gemstones: state.gems
  };

  const json = JSON.stringify(
    payload,
    null,
    2
  );

  const blob = new Blob(
    [json],
    {type:"application/json"}
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    "gem-library-backup-" +
    new Date().toISOString().slice(0,10) +
    ".json";

  document.body.appendChild(link);

  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  },1000);

  toast("Backup exported.");

}

async function importLibrary(file) {

  if (!file) return;

  try {

    const text = await file.text();
    const parsed = JSON.parse(text);

    const records = Array.isArray(parsed)
      ? parsed
      : parsed?.gemstones;

    if (!Array.isArray(records)) {
      throw new Error("Not a gemstone library file.");
    }

    // Validate before changing the existing collection.

    const incoming = records.map(record => {

      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record) ||
        typeof record.name !== "string" ||
        !record.name.trim()
      ) {

        throw new Error(
          "One or more gemstone records are invalid."
        );

      }

      return normalizeGem(record);

    });

    confirmAction(
      "Import Gemstones",
      `Import ${incoming.length} gemstones? Existing gemstones will be preserved; matching IDs will be updated.`,
      () => {

        const previous = [...state.gems];

        const collection = new Map(
          state.gems.map(gem => [gem.id,gem])
        );

        const usedIds = new Set(collection.keys());

        for (const gem of incoming) {

          if (!gem.id) {
            gem.id = uniqueId();
          }

          usedIds.add(gem.id);

          collection.set(gem.id,gem);

        }

        const imported = [...collection.values()];

        // Avoid accidental duplicate names after merging.

        const names = new Set();

        for (const gem of imported) {

          const base = compact(gem.name);

          let candidate = base;
          let index = 2;

          while (names.has(canonical(candidate))) {

            candidate =
              `${base} (${index})`;

            index++;

          }

          gem.name = candidate;

          names.add(canonical(candidate));

        }

        state.gems = imported;

        if (!persistLibrary()) {
          state.gems = previous;
          return;
        }

        refreshSelections();

        navigate("library");

        toast(
          `${incoming.length} gemstone records imported.`
        );

      }
    );

  }

  catch (error) {

    console.error(error);

    toast(
      "Import failed: " +
      (error.message || "Invalid file.")
    );

  }

}

function clearLibrary() {

  confirmAction(
    "Clear Entire Library",
    "This permanently removes every gemstone from this browser. Export a backup first.",
    () => {

      const previous = [...state.gems];

      state.gems = [];

      if (!persistLibrary()) {
        state.gems = previous;
        return;
      }

      state.selectedGem = null;
      state.compareA = "";
      state.compareB = "";
      state.multiIds = [];
      state.relationId = "";

      navigate("library");

      toast("Library cleared.");

    }
  );

}


/* =========================================
   CONFIRMATION WINDOW
========================================= */

function confirmAction(title,message,callback) {

  state.pendingConfirmation = callback;

  $("#confirm-title").textContent = title;

  $("#confirm-message").textContent = message;

  $("#confirm-overlay").classList.remove("hidden");

}

function closeConfirmation() {

  $("#confirm-overlay").classList.add("hidden");

  state.pendingConfirmation = null;

}

function acceptConfirmation() {

  const action = state.pendingConfirmation;

  closeConfirmation();

  if (typeof action === "function") {
    action();
  }

}


/* =========================================
   CENTRAL BUTTON ACTIONS
========================================= */

function handleAction(element) {

  const action = element.dataset.action;
  const id = element.dataset.id;

  switch (action) {

    case "new-gem":
      openEditor();
      break;

    case "view-gem":
      openProfile(id);
      break;

    case "edit-gem":
      openEditor(id);
      break;

    case "duplicate-gem":
      duplicateGem(id);
      break;

    case "delete-gem":
      deleteGem(id);
      break;

    case "go-library":
      navigate("library");
      break;

    case "compare-gem":

      state.compareA = id;

      state.compareB =
        state.gems.find(gem => gem.id !== id)?.id || "";

      navigate("compare");
      break;

    case "compare-pair":

      state.compareA = element.dataset.a;
      state.compareB = element.dataset.b;

      navigate("compare");
      break;

    case "relations-gem":

      state.relationId = id;

      navigate("relations");
      break;

    case "add-tag":
      addTag(element.dataset.field);
      break;

    case "add-link":
      addLink(element.dataset.field);
      break;

    case "remove-tag":

      removeTag(
        element.dataset.field,
        Number(element.dataset.index)
      );

      break;

    case "recover-draft":
      recoverDraft();
      break;

    case "discard-draft":

      confirmAction(
        "Discard Draft",
        "Delete the locally preserved draft?",
        () => {
          clearDraft();
          render();
          toast("Draft discarded.");
        }
      );

      break;

    case "export":
      exportLibrary();
      break;

    case "import":
      $("#import-file").click();
      break;

case "add-flex":
  addFlexibleValue(element.dataset.field);
  break;

case "remove-flex":
  removeFlexibleValue(
    element.dataset.field,
    Number(element.dataset.index)
  );
  break;

case "toggle-flex":
  toggleFlexibleField(
    element.dataset.field,
    element.dataset.enabled === "true"
  );
  break;

    case "stat-detail":

      state.statDetail = {
        dimension:state.statDimension,
        index:Number(element.dataset.index)
      };

      const population = statisticsPopulation();

      const target = $("#stat-detail");

      if (target) {

        const wrapper = document.createElement("div");

        wrapper.innerHTML = renderStatDetail(population);

        target.replaceWith(wrapper.firstElementChild);

      }

      break;

    case "cross-detail":

      showCrossDetail(
        Number(element.dataset.row),
        Number(element.dataset.column)
      );

      break;

  }

}


/* =========================================
   EVENT LISTENERS
========================================= */

function initializeEvents() {

  // Navigation

  document.addEventListener("click", event => {

    const nav = event.target.closest(
      "button[data-page]"
    );

    if (nav) {
      navigate(nav.dataset.page);
      return;
    }

    const action = event.target.closest(
      "button[data-action]"
    );

    if (action) {
      handleAction(action);
    }

  });


  // Global buttons

  $("#new-gem-button").addEventListener(
    "click",
    () => openEditor()
  );

  $("#export-button").addEventListener(
    "click",
    exportLibrary
  );

  $("#import-button").addEventListener(
    "click",
    () => $("#import-file").click()
  );

  $("#reset-button").addEventListener(
    "click",
    clearLibrary
  );


  // Editor

  $("#close-editor-button").addEventListener(
    "click",
    discardAndCloseEditor
  );

  $("#cancel-editor-button").addEventListener(
    "click",
    discardAndCloseEditor
  );

  $("#gem-form").addEventListener(
    "submit",
    submitEditor
  );


$("#gem-form").addEventListener(
  "input",
  event => {

    const input = event.target;

    if (input.dataset.flexSingle) {

      updateFlexibleSingle(input);
      return;
    }

    if (
      input.name &&
      !input.matches('[type="checkbox"]')
    ) {
      updateDraftField(input);
    }

  }
);


$("#gem-form").addEventListener(
  "change",
  event => {

    const input = event.target;

    if (input.dataset.flexToggle) {

      toggleFlexibleField(
        input.dataset.flexToggle,
        input.checked
      );

      return;
    }

    if (input.dataset.flexSingle) {

      updateFlexibleSingle(input);
      return;
    }

    if (input.name) {
      updateDraftField(input);
    }

  }
);


  
$("#gem-form").addEventListener(
  "keydown",
  event => {

    if (event.key !== "Enter") return;

    const tagInput = event.target.closest(
      "[data-tag-input]"
    );

    if (tagInput) {

      event.preventDefault();

      addTag(tagInput.dataset.tagInput);

      return;
    }

    const flexibleInput = event.target.closest(
      "[data-flex-input]"
    );

    if (flexibleInput) {

      event.preventDefault();

      addFlexibleValue(
        flexibleInput.dataset.flexInput
      );

    }

  }
);

  // Central changes

  main.addEventListener("change",event => {

    const input = event.target;

    if (input.id === "library-rarity") {

      state.libraryRarity = input.value;

      renderLibraryResults();
    }

    else if (input.id === "library-sort") {

      state.librarySort = input.value;

      renderLibraryResults();
    }

    else if (input.id === "compare-a") {

      state.compareA = input.value;

      render();
    }

    else if (input.id === "compare-b") {

      state.compareB = input.value;

      render();
    }

    else if (input.dataset.multiId) {

      const id = input.dataset.multiId;

      if (input.checked) {

        if (!state.multiIds.includes(id)) {
          state.multiIds.push(id);
        }

      }

      else {

        state.multiIds = state.multiIds.filter(
          item => item !== id
        );

      }

      // Update the table without losing checkboxes.

      const panel = input.closest(".panel");

      if (panel) {
        panel.innerHTML = `
          <div class="panel-title">
            <h2>Multiple Gemstone Comparison</h2>
          </div>
          <p class="section-description">
            Select several gemstones to compare their
            properties side by side.
          </p>
          ${renderMultiComparison()}
        `;
      }

    }

    else if (input.id === "relation-gem") {

      state.relationId = input.value;
      render();
    }

    else if (input.id === "relation-sort") {

      state.relationSort = input.value;
      render();
    }

    else if (input.id === "path-target") {

      updateRelationshipPath();
    }

    else if (input.id === "stat-rarity") {

      state.statRarity = input.value;
      state.statDetail = null;

      render();
    }

    else if (input.id === "stat-dimension") {

      state.statDimension = input.value;
      state.statDetail = null;

      render();
    }

    else if (input.id === "stat-chart") {

      state.statChart = input.value;

      render();
    }

    else if (input.id === "stat-metric") {

      state.statMetric = input.value;

      render();
    }

    else if (input.id === "cross-a" ||
             input.id === "cross-b") {

      const crossA = $("#cross-a");
      const crossB = $("#cross-b");

      const population = statisticsPopulation();

      state.statSecondary = crossB.value;

      $("#cross-analysis").innerHTML =
        renderCrossAnalysis(population);

      $("#cross-detail").innerHTML = "";

    }

  });


  // Search inputs

  main.addEventListener("input",event => {

    if (event.target.id === "library-search") {

      state.librarySearch = event.target.value;

      renderLibraryResults();

    }

    else if (event.target.id === "stat-search") {

      state.statSearch = event.target.value;
      state.statDetail = null;

      // Debounce expensive statistical rendering.
      clearTimeout(window.gemStatsTimer);

      window.gemStatsTimer = setTimeout(() => {

        const focusField = $("#stat-search");

        const caret =
          focusField?.selectionStart ?? null;

        render();

        const restored = $("#stat-search");

        restored?.focus();

        if (
          caret !== null &&
          restored &&
          typeof restored.setSelectionRange === "function"
        ) {
          restored.setSelectionRange(caret,caret);
        }

      },250);

    }

  });


  // Import file

  $("#import-file").addEventListener(
    "change",
    async event => {

      const file = event.target.files?.[0];

      await importLibrary(file);

      event.target.value = "";

    }
  );


  // Confirmation

  $("#confirm-cancel").addEventListener(
    "click",
    closeConfirmation
  );

  $("#confirm-accept").addEventListener(
    "click",
    acceptConfirmation
  );


  // Escape key

  document.addEventListener("keydown",event => {

    if (event.key !== "Escape") return;

    if (
      !$("#confirm-overlay").classList.contains("hidden")
    ) {
      closeConfirmation();
      return;
    }

    if (state.editorOpen) {
      discardAndCloseEditor();
    }

  });

}


/* =========================================
   APPLICATION STARTUP
========================================= */

function initializeApp() {

  loadLibrary();

  refreshSelections();

  initializeEvents();

  render();

  if (state.page === "library") {
    renderLibraryResults();
  }

  console.info(
    "Gem Library V2 initialized.",
    state.gems.length,
    "gemstones loaded."
  );

}

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
