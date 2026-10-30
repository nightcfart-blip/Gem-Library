
"use strict";

/* ==========================================
   GEM LIBRARY V2 — FINAL APPLICATION
   Compatible with existing index.html/CSS
========================================== */

const CFG = window.GEM_CONFIG;

const state = {
  gems: [],
  page: "library",
  selectedGem: "",
  draft: null,
  editingId: null,
  editorOpen: false,

  librarySearch: "",
  libraryRarityType: "gemRarity",
  libraryRarity: "",
  librarySort: "name",

  compareA: "",
  compareB: "",
  multiIds: [],

  relationId: "",
  relationSort: "similarity",
  pathTarget: "",

  statSearch: "",
  statRarityType: "gemRarity",
  statRarity: "",
  statDimension: "classifications",
  statChart: "bar",
  statMetric: "records",
  statCrossA: "colors",
  statCrossB: "countries",
  statDetail: null,
  crossDetail: null,

  confirmCallback: null
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [
  ...document.querySelectorAll(selector)
];

const main = $("#main-content");

let draftTimer = null;
let toastTimer = null;
let searchTimer = null;

function html(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const attr = html;

function canonical(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function valuesOf(value) {
  const values = Array.isArray(value)
    ? value
    : [value];

  return values.filter(item =>
    item !== null &&
    item !== undefined &&
    String(item).trim() !== ""
  );
}

function hasValue(value) {
  return valuesOf(value).length > 0;
}

function unique(values) {
  const used = new Set();

  return valuesOf(values).filter(item => {
    const key = canonical(item);
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });
}

function rounded(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function fmt(value, digits = 2) {
  if (value === null ||
      !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString(
    undefined,
    { maximumFractionDigits: digits }
  );
}

function uid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "gem-" + Date.now().toString(36) +
    "-" + Math.random().toString(36).slice(2);
}

function getGem(id) {
  return state.gems.find(gem => gem.id === id)
    || null;
}

function sortGems(items) {
  return [...items].sort((a, b) =>
    a.name.localeCompare(
      b.name, undefined,
      { numeric: true, sensitivity: "base" }
    )
  );
}

function label(key) {
  return CFG.fieldMap[key]?.label || key;
}

function optionsHTML(items, selected, empty = "Select...") {
  const options = [
    `<option value="">${html(empty)}</option>`
  ];

  for (const item of items) {
    const value = typeof item === "string"
      ? item : item.value;

    const text = typeof item === "string"
      ? item : item.label;

    options.push(`
      <option value="${attr(value)}"
        ${String(value) === String(selected)
          ? "selected" : ""}>
        ${html(text)}
      </option>
    `);
  }

  return options.join("");
}

function gemOptions(selected, exclude = "") {
  return optionsHTML(
    sortGems(state.gems)
      .filter(g => g.id !== exclude)
      .map(g => ({
        value: g.id,
        label: g.name
      })),
    selected,
    "Choose gemstone"
  );
}

function tag(value, strong = false) {
  return `<span class="tag ${strong ? "tag-dark" : ""}">
    ${html(value)}
  </span>`;
}

function tags(values, strong = false) {
  return valuesOf(values)
    .map(value => tag(value, strong))
    .join("");
}

function empty(message, title = "") {
  return `
    <div class="empty-state">
      <div class="empty-symbol">◇</div>
      ${title ? `<h2>${html(title)}</h2>` : ""}
      <p>${html(message)}</p>
    </div>
  `;
}

function toast(message) {
  const target = $("#toast");
  if (!target) return;

  clearTimeout(toastTimer);
  target.textContent = message;
  target.classList.add("visible");

  toastTimer = setTimeout(
    () => target.classList.remove("visible"),
    3200
  );
}

/* ==========================================
   STORAGE — PRESERVE EXISTING RECORDS
========================================== */

function loadLibrary() {
  try {
    const raw = localStorage.getItem(CFG.storageKey);

    if (!raw) {
      state.gems = [];
      return;
    }

    const records = JSON.parse(raw);

    if (!Array.isArray(records)) {
      throw new Error("Invalid stored library");
    }

    const ids = new Set();

    state.gems = records
      .map(normalizeGem)
      .filter(gem => {
        if (!gem.name.trim()) return false;

        if (!gem.id || ids.has(gem.id)) {
          gem.id = uid();
        }

        ids.add(gem.id);
        return true;
      });
  } catch (error) {
    console.error("Library load error", error);
    state.gems = [];
    toast("Saved library could not be read.");
  }
}

function persistLibrary() {
  try {
    localStorage.setItem(
      CFG.storageKey,
      JSON.stringify(state.gems)
    );
    return true;
  } catch (error) {
    console.error("Save error", error);
    toast("Save failed. Browser storage may be full.");
    return false;
  }
}

function readDraft() {
  try {
    const raw = localStorage.getItem(CFG.draftKey);
    if (!raw) return null;

    const saved = JSON.parse(raw);
    if (!saved?.gem) return null;

    return {
      editingId: saved.editingId || null,
      gem: normalizeGem(saved.gem)
    };
  } catch {
    return null;
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

    const status = $("#editor-status");
    if (status) {
      status.textContent = "Draft saved locally";
    }
  } catch (error) {
    console.error("Draft error", error);
  }
}

function queueDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 300);

  const status = $("#editor-status");
  if (status) status.textContent = "Unsaved changes";
}

function clearDraft() {
  clearTimeout(draftTimer);

  try {
    localStorage.removeItem(CFG.draftKey);
  } catch (error) {
    console.error(error);
  }
}

/* ==========================================
   RECORD OPERATIONS
========================================== */

function saveGem(input) {
  const gem = normalizeGem(input);
  gem.name = gem.name.trim();

  if (!gem.name) {
    toast("Name is required.");
    return false;
  }

  if (state.gems.some(other =>
    other.id !== gem.id &&
    canonical(other.name) === canonical(gem.name)
  )) {
    toast("A gemstone with this name already exists.");
    return false;
  }

  const mohs = valuesOf(gem.mohs);

  if (mohs.some(value =>
    !CFG.mohsOptions.includes(String(value))
  )) {
    toast("Choose a valid Mohs half-step.");
    return false;
  }

  const previous = [...state.gems];
  const existing = getGem(gem.id);
  const now = new Date().toISOString();

  if (!gem.id) gem.id = uid();

  gem.createdAt = existing?.createdAt ||
    gem.createdAt || now;
  gem.updatedAt = now;

  if (existing) {
    state.gems = state.gems.map(item =>
      item.id === gem.id ? gem : item
    );
  } else {
    state.gems = [...state.gems, gem];
  }

  if (!persistLibrary()) {
    state.gems = previous;
    return false;
  }

  state.selectedGem = gem.id;
  clearDraft();
  toast("Gemstone saved.");
  return true;
}

function duplicateGem(id) {
  const original = getGem(id);
  if (!original) return;

  const copy = normalizeGem(original);

  copy.id = "";
  copy.createdAt = "";
  copy.updatedAt = "";

  let counter = 1;
  let candidate = `${copy.name} (Copy)`;

  while (state.gems.some(g =>
    canonical(g.name) === canonical(candidate)
  )) {
    counter++;
    candidate = `${copy.name} (Copy ${counter})`;
  }

  copy.name = candidate;
  openEditor(null, copy);
}

function deleteGem(id) {
  const gem = getGem(id);
  if (!gem) return;

  confirmAction(
    "Delete Gemstone",
    `Permanently delete "${gem.name}"?`,
    () => {
      const old = state.gems;
      state.gems = old.filter(item => item.id !== id);

      if (!persistLibrary()) {
        state.gems = old;
        return;
      }

      state.selectedGem = "";
      state.page = "library";
      render();
      toast("Gemstone deleted.");
    }
  );
}

/* ==========================================
   EDITOR
========================================== */

function openEditor(id = null, initial = null) {
  const source = initial ||
    (id ? getGem(id) : createEmptyGem());

  if (!source) {
    toast("Gemstone not found.");
    return;
  }

  state.editingId = id;
  state.draft = normalizeGem(source);
  state.editorOpen = true;

  $("#editor-heading").textContent =
    id ? "Edit Gemstone" : "New Gemstone";

  $("#editor-fields").innerHTML =
    CFG.sections.map((section, index) => `
      <details class="editor-section"
        ${index === 0 ? "open" : ""}>
        <summary>${html(section.title)}</summary>
        <div class="editor-section-content">
          <div class="form-grid">
            ${section.fields.map(renderEditorField).join("")}
          </div>
        </div>
      </details>
    `).join("");

  $("#editor-overlay").classList.remove("hidden");

  document.body.style.overflow = "hidden";
  saveDraft();

  if (!id) {
    $('#gem-form [name="name"]')?.focus();
  }
}

function closeEditor() {
  state.editorOpen = false;
  state.editingId = null;
  state.draft = null;

  $("#editor-overlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function closeEditorWithDraft() {
  confirmAction(
    "Close Editor",
    "Close the editor? Your current changes will remain as a recoverable draft.",
    () => {
      saveDraft();
      closeEditor();
      if (state.page === "library") render();
    }
  );
}

function fieldValues(key) {
  return valuesOf(state.draft?.[key]);
}

function isMultiple(key) {
  return Array.isArray(state.draft?.[key]);
}

function fieldWrapper(field, body, multiple = false) {
  const key = field.key;

  return `
    <div class="field flexible-field
      ${field.wide ? "form-wide" : ""}"
      data-flex-field="${attr(key)}">

      <div class="flexible-heading">
        <label>
          ${html(field.label)}
          ${field.required ? "*" : ""}
        </label>

        ${field.key !== "name" &&
          field.type !== "tags" &&
          field.type !== "multi"
          ? `
          <label class="flexible-toggle">
            <input type="checkbox"
              data-multiple-toggle="${attr(key)}"
              ${multiple ? "checked" : ""}>
            <span>Multiple</span>
          </label>
          ` : ""}
      </div>

      ${body}

      ${field.hint
        ? `<div class="field-hint">
          ${html(field.hint)}
        </div>`
        : ""}
    </div>
  `;
}

function renderEditorField(field) {
  const key = field.key;
  const value = state.draft[key];
  const multiple = isMultiple(key);

  if (field.type === "multi") {
    const selected = fieldValues(key).map(canonical);

    return fieldWrapper(field, `
      <div class="check-options">
        ${CFG[field.options].map(option => `
          <label class="check-option">
            <input type="checkbox"
              name="${attr(key)}"
              value="${attr(option)}"
              ${selected.includes(canonical(option))
                ? "checked" : ""}>
            <span>${html(option)}</span>
          </label>
        `).join("")}
      </div>
    `);
  }

  if (field.type === "tags" ||
      multiple) {

    const current = fieldValues(key);

    const items = current.map((item, index) => `
      <span class="flexible-chip">
        <span>${html(item)}</span>
        <button type="button"
          data-action="remove-answer"
          data-field="${attr(key)}"
          data-index="${index}"
          aria-label="Remove answer">×</button>
      </span>
    `).join("");

    const entry = field.type === "choice"
      ? `
        <select class="select"
          data-answer-input="${attr(key)}">
          ${optionsHTML(
            CFG[field.options],
            "",
            "Choose another..."
          )}
        </select>
      ` : `
        <input class="input" type="text"
          inputmode="text"
          data-answer-input="${attr(key)}"
          autocomplete="off"
          placeholder="Add another answer...">
      `;

    return fieldWrapper(field, `
      <div class="flexible-values">
        ${items}
      </div>
      <div class="flexible-entry">
        ${entry}
        <button type="button"
          class="button button-secondary button-small"
          data-action="add-answer"
          data-field="${attr(key)}">Add</button>
      </div>
    `, multiple);
  }

  if (field.type === "choice") {
    return fieldWrapper(field, `
      <select class="select"
        name="${attr(key)}">
        ${optionsHTML(
          CFG[field.options],
          value,
          "Not specified"
        )}
      </select>
    `, false);
  }

  if (field.type === "textarea") {
    return fieldWrapper(field, `
      <textarea class="textarea"
        name="${attr(key)}"
        placeholder="Write here...">${html(value)}</textarea>
    `, false);
  }

  return fieldWrapper(field, `
    <input class="input"
      type="text"
      inputmode="text"
      name="${attr(key)}"
      value="${attr(value)}"
      autocomplete="off"
      ${field.required ? "required" : ""}
      placeholder="—">
  `, false);
}

function refreshEditorField(key) {
  const field = CFG.fieldMap[key];
  const current = $(
    `[data-flex-field="${key}"]`
  );

  if (!field || !current) return;

  current.outerHTML = renderEditorField(field);
  queueDraft();
}

function toggleMultiple(key, enabled) {
  if (!state.draft || key === "name") return;

  const old = state.draft[key];

  if (enabled) {
    state.draft[key] = unique(valuesOf(old));
  } else {
    const current = valuesOf(old);

    state.draft[key] = current[0] ?? "";

    if (current.length > 1) {
      toast("Single mode keeps the first answer.");
    }
  }

  refreshEditorField(key);
}

function addAnswer(key) {
  if (!state.draft) return true;

  const field = CFG.fieldMap[key];
  const input = $(
    `[data-answer-input="${key}"]`
  );

  if (!field || !input) return true;

  const raw = String(input.value).trim();
  if (!raw) return true;

  if (
    field.type === "choice" &&
    !CFG[field.options].includes(raw)
  ) {
    toast(`Choose a valid ${field.label} option.`);
    return false;
  }

  state.draft[key] = unique([
    ...fieldValues(key), raw
  ]);

  refreshEditorField(key);
  return true;
}

function removeAnswer(key, index) {
  if (!state.draft) return;

  const list = [...fieldValues(key)];
  list.splice(index, 1);

  state.draft[key] = list;
  refreshEditorField(key);
}

function updateEditorInput(input) {
  if (!state.draft || !input.name) return;

  const field = CFG.fieldMap[input.name];
  if (!field) return;

  if (field.type === "multi") {
    state.draft[field.key] = [
      ...$("#gem-form").querySelectorAll(
        `input[name="${field.key}"]:checked`
      )
    ].map(item => item.value);
  } else {
    state.draft[field.key] = input.value;
  }

  queueDraft();
}

function validateDraft() {
  if (!state.draft.name.trim()) {
    toast("Please enter a gemstone name.");
    $(".editor-section").open = true;
    $('#gem-form [name="name"]')?.focus();
    return false;
  }

  for (const field of CFG.fields) {
    const selected = valuesOf(
      state.draft[field.key]
    );

    if (field.type === "choice") {
      const allowed = CFG[field.options];

      if (selected.some(item =>
        !allowed.includes(String(item))
      )) {
        toast(`Invalid selection for ${field.label}.`);
        return false;
      }
    }

    if (field.required && !selected.length) {
      toast(`${field.label} is required.`);
      return false;
    }
  }

  return true;
}

function submitEditor(event) {
  event.preventDefault();

  if (!state.draft) return;

  // Capture unfinished tag/multi-answer inputs.
  for (const input of $$("[data-answer-input]")) {
    if (!String(input.value).trim()) continue;

    if (addAnswer(input.dataset.answerInput) === false) {
      return;
    }
  }

  if (!validateDraft()) return;
  if (!saveGem(state.draft)) return;

  closeEditor();
  state.page = "profile";
  render();
}

function recoverDraft() {
  const saved = readDraft();
  if (!saved) {
    toast("No draft was found.");
    return;
  }

  const id = getGem(saved.editingId)
    ? saved.editingId : null;

  openEditor(id, saved.gem);
}

/* ==========================================
   NAVIGATION
========================================== */

function syncSelections() {
  const ids = new Set(state.gems.map(g => g.id));

  if (!ids.has(state.compareA)) {
    state.compareA = state.gems[0]?.id || "";
  }

  if (!ids.has(state.compareB) ||
      state.compareB === state.compareA) {
    state.compareB =
      state.gems.find(g =>
        g.id !== state.compareA
      )?.id || "";
  }

  if (!ids.has(state.relationId)) {
    state.relationId = state.gems[0]?.id || "";
  }

  state.multiIds = state.multiIds.filter(
    id => ids.has(id)
  );

  if (!ids.has(state.selectedGem)) {
    state.selectedGem = "";
  }
}

function navigate(page) {
  if (![
    "library", "profile", "compare",
    "relations", "statistics"
  ].includes(page)) return;

  state.page = page;
  render();

  window.scrollTo?.(0, 0);
}

function openProfile(id) {
  if (!getGem(id)) return;
  state.selectedGem = id;
  navigate("profile");
}

function render() {
  syncSelections();

  const titles = {
    library: "Library",
    profile: "Gemstone Profile",
    compare: "Comparison",
    relations: "Relationships",
    statistics: "Statistics"
  };

  const title = $("#current-page-label");
  if (title) title.textContent = titles[state.page];

  const count = $("#sidebar-count");
  if (count) count.textContent = state.gems.length;

  const navPage =
    state.page === "profile"
      ? "library" : state.page;

  $$("[data-page]").forEach(button =>
    button.classList.toggle(
      "active",
      button.dataset.page === navPage
    )
  );

  const pages = {
    library: renderLibrary,
    profile: renderProfile,
    compare: renderComparison,
    relations: renderRelationships,
    statistics: renderStatistics
  };

  main.innerHTML =
    (pages[state.page] || renderLibrary)();

  if (state.page === "library") {
    renderLibraryResults();
  }
}

/* ==========================================
   LIBRARY
========================================== */

function searchText(gem) {
  return CFG.fields.map(field =>
    valuesOf(gem[field.key]).join(" ")
  ).join(" ").toLocaleLowerCase();
}

function filteredLibrary() {
  let gems = state.gems.filter(gem => {
    const rarityMatches =
      !state.libraryRarity ||
      valuesOf(
        gem[state.libraryRarityType]
      ).includes(state.libraryRarity);

    const searchMatches =
      !state.librarySearch ||
      searchText(gem).includes(
        canonical(state.librarySearch)
      );

    return rarityMatches && searchMatches;
  });

  if (state.librarySort === "recent") {
    gems = [...gems].sort((a, b) =>
      String(b.updatedAt).localeCompare(
        String(a.updatedAt)
      )
    );
  } else if (
    state.librarySort === "mineralRarity" ||
    state.librarySort === "gemRarity"
  ) {
    gems = [...gems].sort((a, b) => {
      const rank = gem => Math.max(
        ...valuesOf(gem[state.librarySort])
          .map(v => CFG.rarities.indexOf(v)),
        -1
      );

      return rank(b) - rank(a);
    });
  } else {
    gems = sortGems(gems);
  }

  return gems;
}

function displayPlain(value) {
  return valuesOf(value).length
    ? valuesOf(value).join(", ")
    : "—";
}

function renderLibrary() {
  const draft = readDraft();

  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">COLLECTION</div>
        <h1>Gemstone Library</h1>
        <p>${state.gems.length} saved gemstones.</p>
      </div>
      <div class="page-actions">
        <button class="button button-secondary"
          data-action="export">Export</button>
        <button class="button button-secondary"
          data-action="import">Import</button>
      </div>
    </div>

    ${draft ? `
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-title">
          <h3>Unfinished Draft</h3>
        </div>
        <p class="muted">An unfinished profile was preserved.</p>
        <div class="page-actions">
          <button class="button button-secondary"
            data-action="recover-draft">Resume Draft</button>
          <button class="button button-ghost"
            data-action="discard-draft">Discard Draft</button>
        </div>
      </div>
    ` : ""}

    <div class="library-toolbar">
      <input class="input" type="search"
        id="library-search"
        placeholder="Search all gemstone properties..."
        value="${attr(state.librarySearch)}">

      <select class="select" id="library-rarity-type">
        ${optionsHTML([
          {value:"gemRarity",label:"Gem Rarity"},
          {value:"mineralRarity",label:"Mineral Rarity"}
        ], state.libraryRarityType)}
      </select>

      <select class="select" id="library-rarity">
        ${optionsHTML(
          CFG.rarities,
          state.libraryRarity,
          "All rarities"
        )}
      </select>

      <select class="select" id="library-sort">
        ${optionsHTML([
          {value:"name",label:"Name A–Z"},
          {value:"recent",label:"Recently Updated"},
          {value:"gemRarity",label:"Gem Rarity"},
          {value:"mineralRarity",label:"Mineral Rarity"}
        ], state.librarySort)}
      </select>
    </div>

    <div class="result-count"
      id="library-result-count"></div>
    <div id="library-results"></div>
  `;
}

function renderLibraryResults() {
  const container = $("#library-results");
  if (!container) return;

  const gems = filteredLibrary();

  const counter = $("#library-result-count");
  if (counter) {
    counter.textContent =
      `${gems.length} of ${state.gems.length} gemstones`;
  }

  if (!gems.length) {
    container.innerHTML = `
      ${empty(
        state.gems.length
          ? "Try different filters."
          : "Create your first gemstone.",
        state.gems.length
          ? "No matching gemstones"
          : "Your library is empty"
      )}
      <div class="page-actions"
        style="justify-content:center">
        <button class="button button-primary"
          data-action="new-gem">+ New Gemstone</button>
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
              <h3>${html(gem.name)}</h3>
              <div class="gem-card-subtitle">
                ${html(gem.title || "Gemstone")}
              </div>
            </div>
            <div class="gem-card-symbol">◇</div>
          </div>

          <div class="gem-card-details">
            ${[
              ["Gem Rarity", gem.gemRarity],
              ["Mineral Rarity", gem.mineralRarity],
              ["Mohs", gem.mohs]
            ].map(([name, value]) => `
              <div class="gem-card-detail">
                <span>${html(name)}</span>
                <span>${html(displayPlain(value))}</span>
              </div>
            `).join("")}
          </div>

          <div class="tags gem-card-tags">
            ${tags(gem.classifications)}
          </div>

          <div class="gem-card-actions">
            <button
              class="button button-primary button-small"
              data-action="view-gem"
              data-id="${attr(gem.id)}">Open</button>

            <button
              class="button button-secondary button-small"
              data-action="edit-gem"
              data-id="${attr(gem.id)}">Edit</button>

            <button
              class="button button-ghost button-small"
              data-action="compare-gem"
              data-id="${attr(gem.id)}">Compare</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

/* ==========================================
   COMPACT GEMSTONE PROFILE
========================================== */

function displayField(value) {
  if (!hasValue(value)) {
    return `<span class="empty-note">—</span>`;
  }

  if (Array.isArray(value)) {
    return `<div class="tags flexible-profile-tags">
      ${tags(value)}
    </div>`;
  }

  return `<span style="white-space:pre-wrap">${
    html(value)
  }</span>`;
}

function profileSection(section, gem) {
  const fields = section.fields.filter(field =>
    field.key !== "name" &&
    field.key !== "title" &&
    field.key !== "classifications" &&
    hasValue(gem[field.key])
  );

  if (!fields.length) return "";

  return `
    <section class="sheet-section">
      <div class="sheet-section-heading">
        ${html(section.title)}
      </div>

      <div class="sheet-rows">
        ${fields.map(field => `
          <div class="sheet-row">
            <div class="sheet-label">
              ${html(field.label)}
            </div>
            <div class="sheet-value">
              ${displayField(gem[field.key])}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderProfile() {
  const gem = getGem(state.selectedGem);

  if (!gem) {
    return empty("Gemstone not found.");
  }

  const sections = CFG.sections;
  const left = sections.slice(0, 2);
  const right = sections.slice(2);

  return `
    <div class="sheet-toolbar">
      <button class="button button-ghost"
        data-action="go-library">← Library</button>

      <div class="page-actions">
        <button
          class="button button-secondary button-small"
          data-action="compare-gem"
          data-id="${attr(gem.id)}">Compare</button>
        <button
          class="button button-secondary button-small"
          data-action="relations-gem"
          data-id="${attr(gem.id)}">Relations</button>
        <button
          class="button button-primary button-small"
          data-action="edit-gem"
          data-id="${attr(gem.id)}">Edit</button>
      </div>
    </div>

    <article class="gem-sheet">
      <header class="sheet-header">
        <div class="eyebrow">GEMSTONE RECORD</div>
        <h1>${html(gem.name)}</h1>
        ${gem.title ? `
          <div class="sheet-subtitle">
            ${html(gem.title)}
          </div>
        ` : ""}
        <div class="sheet-header-tags">
          ${tags(gem.classifications, true)}
        </div>
      </header>

      <div class="sheet-grid">
        <div class="sheet-column">
          ${left.map(section =>
            profileSection(section, gem)
          ).join("")}
        </div>
        <div class="sheet-column">
          ${right.map(section =>
            profileSection(section, gem)
          ).join("")}
        </div>
      </div>

      <footer class="sheet-footer">
        <span>
          Updated:
          ${gem.updatedAt
            ? html(new Date(
                gem.updatedAt
              ).toLocaleDateString())
            : "—"}
        </span>

        <div class="page-actions">
          <button
            class="button button-ghost button-small"
            data-action="duplicate-gem"
            data-id="${attr(gem.id)}">Duplicate</button>

          <button
            class="button button-ghost button-small"
            data-action="delete-gem"
            data-id="${attr(gem.id)}">Delete</button>
        </div>
      </footer>
    </article>
  `;
}

/* ==========================================
   EQUAL-WEIGHT COMPARISON ENGINE
========================================== */

function comparisonForField(field, a, b) {
  if (!hasValue(a) || !hasValue(b)) {
    return {
      comparable: false,
      score: null,
      status: "unknown"
    };
  }

  const left = unique(valuesOf(a).map(canonical));
  const right = unique(valuesOf(b).map(canonical));

  const union = new Set([...left, ...right]);
  const rightSet = new Set(right);

  const intersection = left.filter(
    value => rightSet.has(value)
  ).length;

  const score = union.size
    ? intersection / union.size
    : 0;

  return {
    comparable: true,
    score,
    status: score === 1
      ? "match"
      : score === 0
        ? "different" : "partial"
  };
}

function compareGems(a, b) {
  if (!a || !b) return null;

  const results = CFG.comparableFields.map(field => ({
    field,
    ...comparisonForField(
      field,
      a[field.key],
      b[field.key]
    )
  }));

  const included = results.filter(
    result => result.comparable
  );

  const score = included.length
    ? rounded(
        included.reduce((sum, result) =>
          sum + result.score, 0
        ) / included.length * 100
      )
    : null;

  return {
    score,
    compared: included.length,
    matches: included.filter(
      result => result.status === "match"
    ).length,
    partials: included.filter(
      result => result.status === "partial"
    ).length,
    differences: included.filter(
      result => result.status === "different"
    ).length,
    results
  };
}

function similarityText(result) {
  return result?.score === null ||
    result?.score === undefined
      ? "Not enough data"
      : `${fmt(result.score, 1)}%`;
}

function statusHTML(result) {
  const names = {
    match: "Match",
    partial: "Partial",
    different: "Different",
    unknown: "No data"
  };

  return `
    <span class="compare-status status-${result.status}">
      ${names[result.status]}
    </span>
  `;
}

function renderComparison() {
  const a = getGem(state.compareA);
  const b = getGem(state.compareB);

  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">ANALYSIS</div>
        <h1>Gemstone Comparison</h1>
        <p>Every populated comparable field has equal weight.</p>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Direct Comparison</h2>
      </div>

      <div class="compare-selectors">
        <div class="field">
          <label>Gemstone A</label>
          <select class="select" id="compare-a">
            ${gemOptions(state.compareA)}
          </select>
        </div>
        <div class="field">
          <label>Gemstone B</label>
          <select class="select" id="compare-b">
            ${gemOptions(state.compareB)}
          </select>
        </div>
      </div>

      <div class="divider"></div>

      ${a && b
        ? renderDirectComparison(a, b)
        : empty(
            "Create at least two gemstones to compare."
          )
      }
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Multiple Gemstone Comparison</h2>
      </div>
      <div id="multi-comparison">
        ${renderMultiComparison()}
      </div>
    </div>
  `;
}

function renderDirectComparison(a, b) {
  const comparison = compareGems(a, b);

  const rows = CFG.sections.map(section => {
    const comparable = section.fields.filter(
      field => field.compare !== false
    );

    if (!comparable.length) return "";

    return `
      <tr class="comparison-group-title">
        <td colspan="4">${html(section.title)}</td>
      </tr>

      ${comparable.map(field => {
        const result = comparison.results.find(
          item => item.field.key === field.key
        );

        return `
          <tr>
            <td>${html(field.label)}</td>
            <td>${displayField(a[field.key])}</td>
            <td>${displayField(b[field.key])}</td>
            <td>${statusHTML(result)}</td>
          </tr>
        `;
      }).join("")}
    `;
  }).join("");

  return `
    <div class="compare-summary">
      <div class="compare-score">
        ${comparison.score ?? "—"}
        <small>${comparison.score === null
          ? "" : "%"}</small>
      </div>

      <div style="flex:1;min-width:0">
        <strong>
          ${html(a.name)} &amp; ${html(b.name)}
        </strong>

        <div class="compare-meter">
          <div class="compare-meter-fill"
            style="width:${comparison.score ?? 0}%">
          </div>
        </div>

        <div class="muted" style="font-size:11px">
          ${comparison.compared} compared fields ·
          ${comparison.matches} matches ·
          ${comparison.partials} partial ·
          ${comparison.differences} differences
        </div>
      </div>
    </div>

    <p class="chart-note">
      Multi-answer fields are compared by exact answer
      overlap. For example, a shared Mohs value of 2
      counts as a match within that field. Missing
      information is excluded from the overall score.
    </p>

    <div class="comparison-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>${html(a.name)}</th>
            <th>${html(b.name)}</th>
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
    return empty("No gemstones available.");
  }

  const selected = state.multiIds
    .map(getGem)
    .filter(Boolean);

  return `
    <div class="multi-gem-grid">
      ${sortGems(state.gems).map(gem => `
        <label class="multi-option">
          <input type="checkbox"
            data-multi-id="${attr(gem.id)}"
            ${state.multiIds.includes(gem.id)
              ? "checked" : ""}>
          <span>${html(gem.name)}</span>
        </label>
      `).join("")}
    </div>

    <div class="divider"></div>

    ${selected.length < 2
      ? `<p class="muted">
          Select at least two gemstones.
        </p>`
      : renderMultiTable(selected)}
  `;
}

function renderMultiTable(gems) {
  return `
    <div class="comparison-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Property</th>
            ${gems.map(g =>
              `<th>${html(g.name)}</th>`
            ).join("")}
          </tr>
        </thead>

        <tbody>
          ${CFG.comparableFields.map(field => `
            <tr>
              <td><strong>${html(field.label)}</strong></td>
              ${gems.map(g => `
                <td>${displayField(g[field.key])}</td>
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
          ${gems.flatMap((a, i) =>
            gems.slice(i + 1).map(b => {
              const result = compareGems(a, b);
              return `
                <tr>
                  <td>
                    ${html(a.name)} /
                    ${html(b.name)}
                  </td>
                  <td>
                    <strong>${similarityText(result)}</strong>
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

/* ==========================================
   RELATIONSHIPS — AUTOMATIC SIMILARITIES
========================================== */

function relationshipResults(gem) {
  if (!gem) return [];

  const results = state.gems
    .filter(other => other.id !== gem.id)
    .map(other => {
      const comparison = compareGems(gem, other);

      const shared = comparison.results
        .filter(result =>
          result.comparable &&
          result.score > 0
        )
        .map(result => ({
          label: result.field.label,
          score: result.score
        }));

      return { gem: other, comparison, shared };
    });

  results.sort((a, b) => {
    if (state.relationSort === "name") {
      return a.gem.name.localeCompare(
        b.gem.name
      );
    }

    if (state.relationSort === "shared") {
      return b.shared.length - a.shared.length;
    }

    return (
      (b.comparison.score ?? -1) -
      (a.comparison.score ?? -1)
    ) || (
      b.comparison.compared -
      a.comparison.compared
    );
  });

  return results;
}

function automaticNeighbors(id) {
  const gem = getGem(id);
  if (!gem) return [];

  return state.gems
    .filter(other => other.id !== id)
    .filter(other => {
      const result = compareGems(gem, other);
      return result.results.some(
        item => item.comparable && item.score > 0
      );
    })
    .map(other => other.id);
}

function shortestPath(start, end) {
  if (!getGem(start) || !getGem(end)) return null;
  if (start === end) return [start];

  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length) {
    const path = queue.shift();
    const current = path[path.length - 1];

    for (const id of automaticNeighbors(current)) {
      if (visited.has(id)) continue;

      const next = [...path, id];
      if (id === end) return next;

      visited.add(id);
      queue.push(next);
    }
  }

  return null;
}

function renderRelationshipGraph(gem, results) {
  const shown = results.filter(item =>
    item.shared.length
  ).slice(0, 8);

  if (!shown.length) {
    return empty("No shared properties recorded yet.");
  }

  const centerX = 250;
  const centerY = 175;
  const rx = 185;
  const ry = 120;

  let lines = "";
  let nodes = "";

  shown.forEach((item, index) => {
    const angle =
      index / shown.length * Math.PI * 2 -
      Math.PI / 2;

    const x = centerX + Math.cos(angle) * rx;
    const y = centerY + Math.sin(angle) * ry;
    const score = item.comparison.score ?? 0;

    lines += `
      <line x1="${centerX}" y1="${centerY}"
        x2="${x}" y2="${y}"
        stroke="#91aa90"
        stroke-opacity="${0.2 + score / 140}"
        stroke-width="2"/>
    `;

    nodes += `
      <g>
        <circle cx="${x}" cy="${y}" r="24"
          fill="#354438" stroke="#8ca18a"
          stroke-width="1.5"/>
        <text x="${x}" y="${y + 5}"
          text-anchor="middle"
          font-size="18" fill="#c8d9c3">◇</text>

        <text x="${x}" y="${y + 39}"
          text-anchor="middle"
          font-size="10" fill="#dce5db">
          ${html(item.gem.name.slice(0, 18))}
        </text>

        <text x="${x}" y="${y + 51}"
          text-anchor="middle"
          font-size="9" fill="#b1c2ad">
          ${score}%
        </text>
      </g>
    `;
  });

  return `
    <div class="relationship-graph">
      <svg viewBox="0 0 500 370"
        role="img"
        aria-label="Gemstone similarity map">
        ${lines}
        ${nodes}

        <circle cx="${centerX}" cy="${centerY}"
          r="34" fill="#708b70"/>

        <text x="${centerX}" y="${centerY + 7}"
          font-size="24" text-anchor="middle"
          fill="#ffffff">◇</text>

        <text x="${centerX}" y="${centerY + 52}"
          text-anchor="middle"
          font-size="12" fill="#dce5db">
          ${html(gem.name.slice(0, 22))}
        </text>
      </svg>
    </div>

    <p class="chart-note">
      Lines connect gemstones sharing at least
      one documented property. This is an
      automatic similarity map, not a scientific
      mineral family tree.
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
        <p>Automatic connections through shared properties.</p>
      </div>
    </div>

    <div class="panel">
      <div class="control-row">
        <div class="field">
          <label>Selected Gemstone</label>
          <select class="select" id="relation-gem">
            ${gemOptions(state.relationId)}
          </select>
        </div>
        <div class="field">
          <label>Order By</label>
          <select class="select" id="relation-sort">
            ${optionsHTML([
              {value:"similarity",label:"Similarity"},
              {value:"shared",label:"Shared Fields"},
              {value:"name",label:"Name"}
            ], state.relationSort)}
          </select>
        </div>
      </div>

      ${!gem
        ? empty("Add gemstones to explore relationships.")
        : `
          <div class="panel-grid">
            <div>
              <h3>Relationship Map</h3>
              ${renderRelationshipGraph(gem, results)}
            </div>

            <div>
              <h3>Closest Gemstones</h3>
              <div class="relationship-list">
                ${results.length
                  ? results.map(item => `
                    <div class="relationship-entry">
                      <div class="relationship-entry-header">
                        <button class="link-button relationship-name"
                          data-action="view-gem"
                          data-id="${attr(item.gem.id)}">
                          ${html(item.gem.name)}
                        </button>

                        <span class="relationship-score">
                          ${similarityText(item.comparison)}
                        </span>
                      </div>

                      <div class="compare-meter">
                        <div class="compare-meter-fill"
                          style="width:${
                            item.comparison.score ?? 0
                          }%"></div>
                      </div>

                      <div class="relationship-meta">
                        ${item.comparison.compared}
                        compared fields
                      </div>

                      <div class="tags" style="margin-top:9px">
                        ${item.shared.slice(0, 6)
                          .map(shared => tag(shared.label))
                          .join("")}
                      </div>

                      <div class="page-actions"
                        style="margin-top:10px">
                        <button
                          class="button button-ghost button-small"
                          data-action="compare-pair"
                          data-a="${attr(gem.id)}"
                          data-b="${attr(item.gem.id)}">
                          Compare
                        </button>
                      </div>
                    </div>
                  `).join("")
                  : `<p class="muted">
                      No other gemstones yet.
                    </p>`}
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <h3>Indirect Connection Path</h3>

          <div class="field">
            <label>Find a path to</label>
            <select class="select" id="path-target">
              ${gemOptions(state.pathTarget, gem.id)}
            </select>
          </div>

          <div id="relationship-path"
            style="margin-top:13px">
            ${renderPath()}
          </div>
        `}
    </div>
  `;
}

function renderPath() {
  if (!state.pathTarget || !state.relationId) {
    return "";
  }

  const path = shortestPath(
    state.relationId,
    state.pathTarget
  );

  if (!path) {
    return `<p class="muted">
      No path through shared properties was found.
    </p>`;
  }

  return `
    <div class="path-list">
      ${path.map((id, index) => `
        ${index
          ? `<span class="path-arrow">→</span>`
          : ""}
        ${tag(getGem(id)?.name || "Unknown", true)}
      `).join("")}
    </div>

    <p class="chart-note">
      ${path.length - 1} connection(s).
      Each step shares at least one recorded property.
    </p>
  `;
}

/* ==========================================
   STATISTICS — COUNTS AND CROSS-ANALYSIS
========================================== */

function statisticsPopulation() {
  const search = canonical(state.statSearch);

  return state.gems.filter(gem => {
    const rarityMatches =
      !state.statRarity ||
      valuesOf(
        gem[state.statRarityType]
      ).includes(state.statRarity);

    const searchMatches =
      !search || searchText(gem).includes(search);

    return rarityMatches && searchMatches;
  });
}

function dimensionValues(gem, key) {
  return unique(valuesOf(gem[key])).map(String);
}

function distribution(gems, key) {
  const map = new Map();

  for (const gem of gems) {
    for (const value of dimensionValues(gem, key)) {
      const normalized = canonical(value);

      if (!map.has(normalized)) {
        map.set(normalized, {
          label: value,
          value: 0,
          gemIds: []
        });
      }

      const item = map.get(normalized);
      item.value++;
      item.gemIds.push(gem.id);
    }
  }

  return [...map.values()].sort((a, b) =>
    b.value - a.value ||
    a.label.localeCompare(b.label)
  );
}

function crossMatrix(gems, keyA, keyB) {
  const rows = distribution(gems, keyA).slice(0, 12);
  const columns = distribution(gems, keyB).slice(0, 12);

  const cells = rows.map(row =>
    columns.map(column => {
      const gemIds = gems
        .filter(gem =>
          dimensionValues(gem, keyA).some(
            value =>
              canonical(value) === canonical(row.label)
          ) &&
          dimensionValues(gem, keyB).some(
            value =>
              canonical(value) === canonical(column.label)
          )
        )
        .map(gem => gem.id);

      return {
        value: gemIds.length,
        gemIds
      };
    })
  );

  return { rows, columns, cells };
}

function mohsNumbers(gem) {
  return valuesOf(gem.mohs)
    .map(Number)
    .filter(Number.isFinite);
}

function mohsSummary(gems) {
  const values = gems
    .flatMap(mohsNumbers)
    .sort((a, b) => a - b);

  if (!values.length) return null;

  const average = values.reduce(
    (sum, value) => sum + value, 0
  ) / values.length;

  const middle = Math.floor(values.length / 2);

  const median = values.length % 2
    ? values[middle]
    : (values[middle - 1] + values[middle]) / 2;

  return {
    count: values.length,
    average,
    median,
    min: values[0],
    max: values[values.length - 1]
  };
}

function statTile(title, number, detail) {
  return `
    <div class="stat-tile">
      <div class="stat-tile-label">
        ${html(title)}
      </div>
      <div class="stat-tile-value">
        ${fmt(number)}
      </div>
      <div class="stat-tile-detail">
        ${html(detail)}
      </div>
    </div>
  `;
}

function currentDistribution() {
  return distribution(
    statisticsPopulation(),
    state.statDimension
  );
}

function statDetailHTML() {
  const detail = state.statDetail;

  if (!detail) return `<div id="stat-detail"></div>`;

  const item = currentDistribution()[detail.index];

  if (!item) return `<div id="stat-detail"></div>`;

  return `
    <div class="stat-detail" id="stat-detail">
      <strong>${html(item.label)}</strong>
      <p class="muted">
        ${item.value} matching gemstones
      </p>

      <div class="stat-detail-list">
        ${item.gemIds.map(id => `
          <button class="tag"
            data-action="view-gem"
            data-id="${attr(id)}">
            ${html(getGem(id)?.name || "Unknown")}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function metricValue(value, count) {
  if (state.statMetric === "percent") {
    return count
      ? `${rounded(value / count * 100)}%`
      : "0%";
  }

  return String(value);
}

function chartHTML(data, count) {
  if (!data.length) {
    return empty("No values recorded for this property.");
  }

  const total = data.reduce(
    (sum, item) => sum + item.value, 0
  );

  if (state.statChart === "table") {
    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Answer</th>
              <th>Gemstones</th>
              <th>Percentage</th>
              <th>Inspect</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${html(item.label)}</td>
                <td>${item.value}</td>
                <td>${metricValue(item.value, count)}</td>
                <td>
                  <button class="link-button"
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

  if (state.statChart === "donut") {
    let position = 0;

    const stops = data.map((item, index) => {
      const start = position;
      position += item.value / total * 100;

      return `${CFG.chartColors[
        index % CFG.chartColors.length
      ]} ${start}% ${position}%`;
    }).join(", ");

    return `
      <div class="donut-layout">
        <div class="donut-chart"
          style="background:conic-gradient(${stops})">
          <div class="donut-hole">
            <strong>${total}</strong>
            <small>Occurrences</small>
          </div>
        </div>

        <div class="donut-legend">
          ${data.map((item, index) => `
            <div class="legend-row">
              <span class="legend-dot"
                style="background:${
                  CFG.chartColors[
                    index % CFG.chartColors.length
                  ]
                }"></span>
              <span class="legend-label">
                ${html(item.label)}
              </span>
              <span class="legend-value">
                ${metricValue(item.value, count)}
              </span>
            </div>
          `).join("")}
        </div>
      </div>

      <p class="chart-note">
        Switch to Bar or Table to inspect individual
        category memberships.
      </p>
    `;
  }

  if (state.statChart === "treemap") {
    return `
      <div class="treemap">
        ${data.map((item, index) => `
          <button class="treemap-item"
            data-action="stat-detail"
            data-index="${index}"
            style="
              flex-grow:${item.value};
              flex-basis:${
                Math.max(
                  90,
                  item.value / total * 450
                )
              }px;
              background:${
                CFG.chartColors[
                  index % CFG.chartColors.length
                ]
              }">
            <span>${html(item.label)}</span>
            <strong>
              ${metricValue(item.value, count)}
            </strong>
          </button>
        `).join("")}
      </div>
    `;
  }

  const max = Math.max(
    1, ...data.map(item => item.value)
  );

  return `
    <div class="bar-chart">
      ${data.map((item, index) => `
        <button class="bar-row"
          data-action="stat-detail"
          data-index="${index}">
          <span class="bar-label">
            ${html(item.label)}
          </span>

          <span class="bar-track">
            <span class="bar-fill"
              style="width:${
                item.value / max * 100
              }%"></span>
          </span>

          <span class="bar-value">
            ${metricValue(item.value, count)}
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderCrossAnalysis() {
  const matrix = crossMatrix(
    statisticsPopulation(),
    state.statCrossA,
    state.statCrossB
  );

  if (!matrix.rows.length ||
      !matrix.columns.length) {
    return empty(
      "Not enough information for cross-analysis."
    );
  }

  const max = Math.max(
    1,
    ...matrix.cells.flat().map(cell => cell.value)
  );

  return `
    <div class="table-scroll">
      <table class="data-table cross-table">
        <thead>
          <tr>
            <th>${html(label(state.statCrossA))}</th>
            ${matrix.columns.map(column => `
              <th>${html(column.label)}</th>
            `).join("")}
          </tr>
        </thead>

        <tbody>
          ${matrix.rows.map((row, i) => `
            <tr>
              <th>${html(row.label)}</th>

              ${matrix.cells[i].map((cell, j) => `
                <td class="cross-cell"
                  style="background:rgba(
                    141,167,139,${
                      rounded(
                        0.05 + cell.value / max * 0.4,
                        3
                      )
                    })">
                  <button
                    data-action="cross-detail"
                    data-row="${i}"
                    data-column="${j}">
                    ${cell.value || "·"}
                  </button>
                </td>
              `).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function crossDetailHTML() {
  if (!state.crossDetail) return "";

  const matrix = crossMatrix(
    statisticsPopulation(),
    state.statCrossA,
    state.statCrossB
  );

  const row = matrix.rows[state.crossDetail.row];
  const col = matrix.columns[state.crossDetail.column];

  const cell = matrix.cells[
    state.crossDetail.row
  ]?.[state.crossDetail.column];

  if (!row || !col || !cell) return "";

  return `
    <div class="stat-detail">
      <strong>
        ${html(row.label)} + ${html(col.label)}
      </strong>
      <p class="muted">
        ${cell.value} matching gemstones
      </p>
      <div class="stat-detail-list">
        ${cell.gemIds.map(id => `
          <button class="tag"
            data-action="view-gem"
            data-id="${attr(id)}">
            ${html(getGem(id)?.name || "Unknown")}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function topCharacteristics(gems) {
  const keys = [
    "classifications",
    "mineralRarity",
    "gemRarity",
    "colors",
    "countries",
    "crystalSystem",
    "meaning",
    "connectedWith"
  ];

  return `
    <div class="panel-grid">
      ${keys.map(key => {
        const data = distribution(gems, key)
          .slice(0, 5);

        const max = Math.max(
          1, ...data.map(item => item.value)
        );

        return `
          <div>
            <h3>${html(label(key))}</h3>

            ${data.length
              ? `<div class="bar-chart">
                  ${data.map(item => `
                    <div class="bar-row"
                      style="cursor:default">
                      <span class="bar-label">
                        ${html(item.label)}
                      </span>
                      <span class="bar-track">
                        <span class="bar-fill"
                          style="width:${
                            item.value / max * 100
                          }%"></span>
                      </span>
                      <span class="bar-value">
                        ${item.value}
                      </span>
                    </div>
                  `).join("")}
                </div>`
              : `<p class="muted">
                  No recorded information
                </p>`}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderStatistics() {
  const gems = statisticsPopulation();
  const data = currentDistribution();
  const summary = mohsSummary(gems);

  const documented = gems.filter(gem =>
    CFG.comparableFields.some(field =>
      hasValue(gem[field.key])
    )
  ).length;

  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">LIBRARY ANALYTICS</div>
        <h1>Statistics</h1>
        <p>Analyze and compare your gemstone records.</p>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Data Filters</h2>
      </div>

      <div class="control-row">
        <div class="field search-field">
          <label>Search Within Statistics</label>
          <input id="stat-search"
            class="input" type="search"
            placeholder="Search gemstone properties..."
            value="${attr(state.statSearch)}">
        </div>

        <div class="field">
          <label>Rarity Type</label>
          <select id="stat-rarity-type"
            class="select">
            ${optionsHTML([
              {value:"gemRarity",label:"Gem Rarity"},
              {value:"mineralRarity",label:"Mineral Rarity"}
            ], state.statRarityType)}
          </select>
        </div>

        <div class="field">
          <label>Rarity</label>
          <select id="stat-rarity"
            class="select">
            ${optionsHTML(
              CFG.rarities,
              state.statRarity,
              "All rarities"
            )}
          </select>
        </div>
      </div>
    </div>

    <div class="stat-overview">
      ${statTile(
        "Gemstones",
        gems.length,
        `${state.gems.length} total`
      )}
      ${statTile(
        "Countries",
        distribution(gems, "countries").length,
        "Unique countries"
      )}
      ${statTile(
        "Colors",
        distribution(gems, "colors").length,
        "Recorded colors"
      )}
      ${statTile(
        "Documented Gems",
        documented,
        "With comparable data"
      )}
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Category Analysis</h2>
        <span class="panel-subtitle">
          ${gems.length} gemstones
        </span>
      </div>

      <div class="control-row">
        <div class="field">
          <label>Property</label>
          <select id="stat-dimension"
            class="select">
            ${optionsHTML(
              CFG.statisticsDimensions.map(item => ({
                value: item.key,
                label: item.label
              })),
              state.statDimension
            )}
          </select>
        </div>

        <div class="field">
          <label>Chart Type</label>
          <select id="stat-chart" class="select">
            ${optionsHTML([
              {value:"bar",label:"Ranked Bar Chart"},
              {value:"donut",label:"Donut Chart"},
              {value:"treemap",label:"Treemap"},
              {value:"table",label:"Data Table"}
            ], state.statChart)}
          </select>
        </div>

        <div class="field">
          <label>Measurement</label>
          <select id="stat-metric"
            class="select">
            ${optionsHTML([
              {value:"records",label:"Number of Gemstones"},
              {value:"percent",label:"Percentage of Gemstones"}
            ], state.statMetric)}
          </select>
        </div>
      </div>

      <div class="chart-container">
        ${chartHTML(data, gems.length)}
      </div>

      <p class="chart-note">
        ${data.length} distinct answers ·
        ${data.reduce(
          (sum, item) => sum + item.value, 0
        )} occurrences.
        Multiple answers can make percentages total
        more than 100%.
      </p>

      ${statDetailHTML()}
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Cross-Analysis</h2>
      </div>

      <p class="section-description">
        See which two characteristics occur together.
      </p>

      <div class="control-row">
        <div class="field">
          <label>Rows</label>
          <select id="cross-a"
            class="select">
            ${optionsHTML(
              CFG.statisticsDimensions.map(item => ({
                value: item.key,
                label: item.label
              })),
              state.statCrossA
            )}
          </select>
        </div>

        <div class="field">
          <label>Columns</label>
          <select id="cross-b"
            class="select">
            ${optionsHTML(
              CFG.statisticsDimensions.map(item => ({
                value: item.key,
                label: item.label
              })),
              state.statCrossB
            )}
          </select>
        </div>
      </div>

      <div id="cross-analysis">
        ${renderCrossAnalysis()}
      </div>

      <div id="cross-detail">
        ${crossDetailHTML()}
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Mohs Summary</h2>
      </div>

      ${summary ? `
        <div class="stat-overview">
          ${statTile(
            "Average", rounded(summary.average, 2),
            "Mean of recorded values"
          )}
          ${statTile(
            "Median", summary.median,
            "Middle recorded value"
          )}
          ${statTile(
            "Minimum", summary.min,
            "Lowest hardness"
          )}
          ${statTile(
            "Maximum", summary.max,
            "Highest hardness"
          )}
        </div>

        <p class="chart-note">
          ${summary.count} Mohs answers recorded.
          A gemstone with multiple selected values
          contributes each of those values to this
          numerical summary.
        </p>
      ` : empty("No Mohs values recorded.")}
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Most Common Characteristics</h2>
      </div>
      ${topCharacteristics(gems)}
    </div>
  `;
}

/* ==========================================
   JSON BACKUP / IMPORT
========================================== */

function exportLibrary() {
  const payload = {
    format: "gem-library-v2",
    version: 3,
    exportedAt: new Date().toISOString(),
    gemstones: state.gems
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    "gem-library-backup-" +
    new Date().toISOString().slice(0, 10) +
    ".json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() =>
    URL.revokeObjectURL(url), 1000
  );

  toast("Backup exported.");
}

async function importLibrary(file) {
  if (!file) return;

  try {
    const parsed = JSON.parse(
      await file.text()
    );

    const records = Array.isArray(parsed)
      ? parsed
      : parsed?.gemstones;

    if (!Array.isArray(records)) {
      throw new Error("Invalid JSON library.");
    }

    const incoming = records.map(record => {
      if (
        !record ||
        typeof record.name !== "string" ||
        !record.name.trim()
      ) {
        throw new Error("Invalid gemstone record.");
      }

      return normalizeGem(record);
    });

    confirmAction(
      "Import Gemstones",
      `Import ${incoming.length} records? Existing records will be preserved unless their IDs match.`,
      () => {
        const old = state.gems;
        const map = new Map(
          old.map(gem => [gem.id, gem])
        );

        for (const gem of incoming) {
          if (!gem.id) gem.id = uid();
          map.set(gem.id, gem);
        }

        const names = new Set();
        const merged = [...map.values()];

        for (const gem of merged) {
          const original = gem.name.trim();
          let candidate = original;
          let n = 2;

          while (names.has(canonical(candidate))) {
            candidate = `${original} (${n++})`;
          }

          gem.name = candidate;
          names.add(canonical(candidate));
        }

        state.gems = merged;

        if (!persistLibrary()) {
          state.gems = old;
          return;
        }

        navigate("library");
        toast(`${incoming.length} records imported.`);
      }
    );
  } catch (error) {
    console.error(error);
    toast(`Import failed: ${error.message}`);
  }
}

function clearLibrary() {
  confirmAction(
    "Clear Entire Library",
    "Permanently erase every gemstone from this browser? Export a backup first.",
    () => {
      const old = state.gems;
      state.gems = [];

      if (!persistLibrary()) {
        state.gems = old;
        return;
      }

      state.selectedGem = "";
      state.multiIds = [];
      navigate("library");
      toast("Library cleared.");
    }
  );
}

/* ==========================================
   CONFIRMATION WINDOW
========================================== */

function confirmAction(title, message, callback) {
  state.confirmCallback = callback;
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-overlay").classList.remove("hidden");
}

function closeConfirmation() {
  $("#confirm-overlay").classList.add("hidden");
  state.confirmCallback = null;
}

function acceptConfirmation() {
  const callback = state.confirmCallback;
  closeConfirmation();

  if (typeof callback === "function") {
    callback();
  }
}

/* ==========================================
   BUTTON ACTIONS
========================================== */

function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;

  switch (action) {
    case "new-gem":
      openEditor();
      break;

    case "view-gem":
      openProfile(id);
      break;

    case "go-library":
      navigate("library");
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

    case "compare-gem":
      state.compareA = id;
      state.compareB =
        state.gems.find(g => g.id !== id)?.id || "";
      navigate("compare");
      break;

    case "compare-pair":
      state.compareA = button.dataset.a;
      state.compareB = button.dataset.b;
      navigate("compare");
      break;

    case "relations-gem":
      state.relationId = id;
      state.pathTarget = "";
      navigate("relations");
      break;

    case "add-answer":
      addAnswer(button.dataset.field);
      break;

    case "remove-answer":
      removeAnswer(
        button.dataset.field,
        Number(button.dataset.index)
      );
      break;

    case "recover-draft":
      recoverDraft();
      break;

    case "discard-draft":
      confirmAction(
        "Discard Draft",
        "Remove the locally preserved draft?",
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

    case "stat-detail":
      state.statDetail = {
        index: Number(button.dataset.index)
      };

      const detail = $("#stat-detail");
      if (detail) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = statDetailHTML();
        detail.replaceWith(wrapper.firstElementChild);
      }
      break;

    case "cross-detail":
      state.crossDetail = {
        row: Number(button.dataset.row),
        column: Number(button.dataset.column)
      };

      const cross = $("#cross-detail");
      if (cross) cross.innerHTML = crossDetailHTML();
      break;
  }
}

/* ==========================================
   EVENT DELEGATION
========================================== */

function initializeEvents() {
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

  $("#new-gem-button")?.addEventListener(
    "click", () => openEditor()
  );

  $("#export-button")?.addEventListener(
    "click", exportLibrary
  );

  $("#import-button")?.addEventListener(
    "click", () => $("#import-file").click()
  );

  $("#reset-button")?.addEventListener(
    "click", clearLibrary
  );

  $("#close-editor-button")?.addEventListener(
    "click", closeEditorWithDraft
  );

  $("#cancel-editor-button")?.addEventListener(
    "click", closeEditorWithDraft
  );

  $("#gem-form").addEventListener(
    "submit", submitEditor
  );

  $("#gem-form").addEventListener(
    "input", event => {
      const input = event.target;

      if (
        input.name &&
        input.type !== "checkbox"
      ) {
        updateEditorInput(input);
      }
    }
  );

  $("#gem-form").addEventListener(
    "change", event => {
      const input = event.target;

      if (input.dataset.multipleToggle) {
        toggleMultiple(
          input.dataset.multipleToggle,
          input.checked
        );
        return;
      }

      if (input.name) {
        updateEditorInput(input);
      }
    }
  );

  $("#gem-form").addEventListener(
    "keydown", event => {
      if (event.key !== "Enter") return;

      const input = event.target.closest(
        "[data-answer-input]"
      );

      if (input) {
        event.preventDefault();
        addAnswer(input.dataset.answerInput);
      }
    }
  );

  main.addEventListener("change", event => {
    const input = event.target;

    switch (input.id) {
      case "library-rarity-type":
        state.libraryRarityType = input.value;
        renderLibraryResults();
        break;

      case "library-rarity":
        state.libraryRarity = input.value;
        renderLibraryResults();
        break;

      case "library-sort":
        state.librarySort = input.value;
        renderLibraryResults();
        break;

      case "compare-a":
        state.compareA = input.value;
        render();
        break;

      case "compare-b":
        state.compareB = input.value;
        render();
        break;

      case "relation-gem":
        state.relationId = input.value;
        state.pathTarget = "";
        render();
        break;

      case "relation-sort":
        state.relationSort = input.value;
        render();
        break;

      case "path-target":
        state.pathTarget = input.value;
        $("#relationship-path").innerHTML =
          renderPath();
        break;

      case "stat-rarity-type":
        state.statRarityType = input.value;
        state.statDetail = null;
        state.crossDetail = null;
        render();
        break;

      case "stat-rarity":
        state.statRarity = input.value;
        state.statDetail = null;
        state.crossDetail = null;
        render();
        break;

      case "stat-dimension":
        state.statDimension = input.value;
        state.statDetail = null;
        render();
        break;

      case "stat-chart":
        state.statChart = input.value;
        render();
        break;

      case "stat-metric":
        state.statMetric = input.value;
        render();
        break;

      case "cross-a":
        state.statCrossA = input.value;
        state.crossDetail = null;
        $("#cross-analysis").innerHTML =
          renderCrossAnalysis();
        $("#cross-detail").innerHTML = "";
        break;

      case "cross-b":
        state.statCrossB = input.value;
        state.crossDetail = null;
        $("#cross-analysis").innerHTML =
          renderCrossAnalysis();
        $("#cross-detail").innerHTML = "";
        break;
    }

    if (input.dataset.multiId) {
      const id = input.dataset.multiId;

      if (input.checked) {
        if (!state.multiIds.includes(id)) {
          state.multiIds.push(id);
        }
      } else {
        state.multiIds = state.multiIds.filter(
          item => item !== id
        );
      }

      const target = $("#multi-comparison");

      if (target) {
        target.innerHTML = renderMultiComparison();
      }
    }
  });

  main.addEventListener("input", event => {
    if (event.target.id === "library-search") {
      state.librarySearch = event.target.value;
      renderLibraryResults();
    }

    if (event.target.id === "stat-search") {
      state.statSearch = event.target.value;
      state.statDetail = null;
      state.crossDetail = null;

      clearTimeout(searchTimer);

      searchTimer = setTimeout(() => {
        const cursor =
          $("#stat-search")?.selectionStart ?? null;

        render();

        const restored = $("#stat-search");

        restored?.focus();

        if (cursor !== null && restored) {
          restored.setSelectionRange(
            cursor, cursor
          );
        }
      }, 280);
    }
  });

  $("#import-file")?.addEventListener(
    "change", async event => {
      const file = event.target.files?.[0];
      await importLibrary(file);
      event.target.value = "";
    }
  );

  $("#confirm-cancel")?.addEventListener(
    "click", closeConfirmation
  );

  $("#confirm-accept")?.addEventListener(
    "click", acceptConfirmation
  );

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    if (
      !$("#confirm-overlay").classList.contains("hidden")
    ) {
      closeConfirmation();
      return;
    }

    if (state.editorOpen) {
      closeEditorWithDraft();
    }
  });
}

/* ==========================================
   STARTUP
========================================== */

function initializeApp() {
  if (!CFG || !main) {
    console.error(
      "Gem Library could not initialize."
    );
    return;
  }

  loadLibrary();
  syncSelections();
  initializeEvents();
  render();

  console.info(
    "Gem Library V2 ready:",
    state.gems.length,
    "gemstones"
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );
} else {
  initializeApp();
}
