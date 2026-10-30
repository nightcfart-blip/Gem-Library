
"use strict";

/* ==========================================
   GEM LIBRARY V3 — APPLICATION
   Existing HTML / CSS compatible
========================================== */

const CFG = window.GEM_CONFIG;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const main = $("#main-content");

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
  relationMode: "family",
  relationSort: "similarity",
  relationTarget: "",
  relationFilter: "",

  statSearch: "",
  statRarity: "",
  statDimension: "mineralSpecies",
  statCrossA: "mineralSpecies",
  statCrossB: "rarity",
  statChart: "bar",
  statMetric: "records",
  statDetail: null,

  pendingConfirmation: null
};

let toastTimer = null;
let draftTimer = null;
let statTimer = null;

/* ==========================================
   GENERAL HELPERS
========================================== */

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const escapeHTML = esc;
const escapeAttr = esc;

function compact(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function canonical(value) {
  return compact(value).toLocaleLowerCase();
}

function arrayOf(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined ||
      value === "") return [];
  return [value];
}

function hasValue(value) {
  return arrayOf(value).some(item =>
    item !== null &&
    item !== undefined &&
    String(item).trim() !== ""
  );
}

function distinct(values) {
  const seen = new Set();

  return values.filter(item => {
    const key = canonical(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function valuesOf(gem,key) {
  return distinct(arrayOf(gem?.[key])
    .filter(item => item !== null)
    .map(String));
}

function joinValue(value, separator = ", ") {
  return arrayOf(value)
    .filter(item => item !== null && String(item).trim())
    .join(separator);
}

function formatNumber(value,digits=2) {
  if (value === null || value === undefined ||
      value === "") return "—";

  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString(undefined,{
    maximumFractionDigits:digits
  });
}

function round(value,digits=1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON)*factor)/factor;
}

function uid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "gem-" + Date.now().toString(36) +
    "-" + Math.random().toString(36).slice(2);
}

function getGem(id) {
  return state.gems.find(gem => gem.id === id) || null;
}

function sortGems(gems) {
  return [...gems].sort((a,b) =>
    a.name.localeCompare(b.name,undefined,{
      sensitivity:"base",
      numeric:true
    })
  );
}

function options(items,selected="",empty="Select...") {
  return `<option value="">${esc(empty)}</option>` +
    items.map(item => {
      const value = typeof item === "string" ?
        item : item.value;
      const label = typeof item === "string" ?
        item : item.label;

      return `<option value="${esc(value)}"
        ${String(value) === String(selected) ?
        "selected" : ""}>${esc(label)}</option>`;
    }).join("");
}

function gemOptions(selected="",empty="Choose gemstone") {
  return options(sortGems(state.gems).map(gem=>({
    value:gem.id,
    label:gem.name
  })),selected,empty);
}

function tag(value,dark=false) {
  return `<span class="tag ${dark?"tag-dark":""}">
    ${esc(value)}</span>`;
}

function tags(values,dark=false) {
  return arrayOf(values).map(v=>tag(v,dark)).join("");
}

function empty(message) {
  return `<div class="empty-state">
    <div class="empty-symbol">◇</div>
    <p>${esc(message)}</p>
  </div>`;
}

function toast(message) {
  const element = $("#toast");
  if (!element) return;

  clearTimeout(toastTimer);
  element.textContent = message;
  element.classList.add("visible");

  toastTimer = setTimeout(()=>{
    element.classList.remove("visible");
  },3000);
}

function fieldLabel(key) {
  return CFG.fieldMap[key]?.label || key;
}

function gemButton(gem) {
  return `<button type="button" class="tag"
    data-action="view-gem" data-id="${esc(gem.id)}">
    ${esc(gem.name)}</button>`;
}

function fieldContains(gem,key,value) {
  return valuesOf(gem,key).some(v =>
    canonical(v) === canonical(value)
  );
}

/* ==========================================
   STORAGE AND BACKUPS
========================================== */

function loadLibrary() {
  try {
    const raw = localStorage.getItem(CFG.storageKey);

    if (!raw) {
      state.gems = [];
      return;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw Error("Unexpected library format");
    }

    const ids = new Set();

    state.gems = parsed
      .map(normalizeGem)
      .filter(gem => typeof gem.name === "string" &&
        gem.name.trim())
      .map(gem => {
        if (!gem.id || ids.has(gem.id)) {
          gem.id = uid();
        }
        ids.add(gem.id);
        return gem;
      });

  } catch(error) {
    console.error("Library load:",error);
    state.gems = [];
    toast("Could not read library. Stored data was not overwritten.");
  }
}

function persist() {
  try {
    localStorage.setItem(
      CFG.storageKey,
      JSON.stringify(state.gems)
    );
    return true;
  } catch(error) {
    console.error("Library save:",error);
    toast("Save failed. Check browser storage.");
    return false;
  }
}

function storeDraft() {
  if (!state.editorOpen || !state.draft) return;

  try {
    localStorage.setItem(CFG.draftKey,JSON.stringify({
      editingId:state.editingId,
      gem:state.draft
    }));

    const status = $("#editor-status");
    if (status) status.textContent = "Draft preserved";
  } catch(error) {
    console.error(error);
    toast("Unable to preserve draft.");
  }
}

function queueDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(storeDraft,300);
}

function readDraft() {
  try {
    const raw = localStorage.getItem(CFG.draftKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.gem) return null;

    return {
      editingId:parsed.editingId || null,
      gem:normalizeGem(parsed.gem)
    };
  } catch {
    return null;
  }
}

function clearDraft() {
  clearTimeout(draftTimer);
  try {
    localStorage.removeItem(CFG.draftKey);
  } catch(error) {
    console.error(error);
  }
}

function exportLibrary() {
  const backup = {
    format:"gem-library-v3",
    version:3,
    exportedAt:new Date().toISOString(),
    gemstones:state.gems
  };

  const blob = new Blob(
    [JSON.stringify(backup,null,2)],
    {type:"application/json"}
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "gem-library-v3-" +
    new Date().toISOString().slice(0,10) + ".json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast("Library backup exported.");
}

async function importLibrary(file) {
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const records = Array.isArray(parsed) ?
      parsed : parsed?.gemstones;

    if (!Array.isArray(records)) {
      throw Error("Not a gemstone library.");
    }

    for (const item of records) {
      if (!item || typeof item.name !== "string" ||
          !item.name.trim()) {
        throw Error("Invalid gemstone record.");
      }
    }

    const incoming = records.map(normalizeGem);

    confirmAction(
      "Import Gemstones",
      `Merge ${incoming.length} records into your current library?`,
      ()=>{
        const previous = state.gems;
        const collection = new Map(
          state.gems.map(gem=>[gem.id,gem])
        );

        const reserved = new Set(collection.keys());

        for (const gem of incoming) {
          if (!gem.id) {
            do {
              gem.id = uid();
            } while (reserved.has(gem.id));
          }
          reserved.add(gem.id);
          collection.set(gem.id,gem);
        }

        state.gems = [...collection.values()];

        const names = new Set();

        state.gems.forEach(gem=>{
          const base = gem.name.trim();
          let candidate = base;
          let counter = 2;

          while (names.has(canonical(candidate))) {
            candidate = `${base} (${counter++})`;
          }

          gem.name = candidate;
          names.add(canonical(candidate));
        });

        if (!persist()) {
          state.gems = previous;
          return;
        }

        navigate("library");
        toast("Import completed.");
      }
    );

  } catch(error) {
    toast("Import failed: "+error.message);
  }
}

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
  const callback = state.pendingConfirmation;
  closeConfirmation();
  if (typeof callback === "function") callback();
}

function clearLibrary() {
  confirmAction(
    "Clear Library",
    "Permanently erase every gemstone in this browser? Export a backup first.",
    ()=>{
      const old = state.gems;
      state.gems = [];

      if (!persist()) {
        state.gems = old;
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

/* ==========================================
   GEMSTONE OPERATIONS
========================================== */

function saveGem(input) {
  const gem = normalizeGem(input);
  gem.name = compact(gem.name);

  if (!gem.name) {
    toast("Please enter a gemstone name.");
    return false;
  }

  if (state.gems.some(item=>
    item.id !== gem.id &&
    canonical(item.name) === canonical(gem.name)
  )) {
    toast("This gemstone name already exists.");
    return false;
  }

  const now = new Date().toISOString();
  const old = getGem(gem.id);

  if (!gem.id) gem.id = uid();

  gem.createdAt = old?.createdAt ||
    gem.createdAt || now;
  gem.updatedAt = now;

  gem.relatesTo = distinct(gem.relatesTo)
    .filter(id=>id !== gem.id && !!getGem(id));

  const previous = state.gems;

  state.gems = old ?
    state.gems.map(item=>
      item.id === gem.id ? gem : item
    ) :
    [...state.gems,gem];

  if (!persist()) {
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
    `Delete "${gem.name}" permanently?`,
    ()=>{
      const old = state.gems;

      state.gems = state.gems
        .filter(item=>item.id !== id)
        .map(item=>({
          ...item,
          relatesTo:valuesOf(item,"relatesTo")
            .filter(link=>link !== id)
        }));

      if (!persist()) {
        state.gems = old;
        return;
      }

      state.selectedGem = null;
      navigate("library");
      toast("Gemstone deleted.");
    }
  );
}

function duplicateGem(id) {
  const original = getGem(id);
  if (!original) return;

  const gem = normalizeGem(original);
  gem.id = "";
  gem.createdAt = "";
  gem.updatedAt = "";
  gem.relatesTo = [...original.relatesTo];

  let number = 1;

  do {
    gem.name = original.name +
      (number === 1 ? " (Copy)" : ` (Copy ${number})`);
    number++;
  } while (state.gems.some(item=>
    canonical(item.name) === canonical(gem.name)
  ));

  openEditor(null,gem);
}

/* ==========================================
   EDITOR
========================================== */

function openEditor(id=null,initial=null) {
  const source = initial || (id ?
    getGem(id) : createEmptyGem());

  if (!source) {
    toast("Gemstone not found.");
    return;
  }

  state.editingId = id;
  state.draft = normalizeGem(source);
  state.editorOpen = true;

  $("#editor-heading").textContent =
    id ? "Edit Gemstone" : "New Gemstone";

  $("#editor-fields").innerHTML = CFG.sections
    .map((section,index)=>`
      <details class="editor-section"
        ${index === 0 ? "open" : ""}>
        <summary>${esc(section.title)}</summary>
        <div class="editor-section-content">
          <div class="form-grid">
            ${section.fields.map(renderEditorField).join("")}
          </div>
        </div>
      </details>
    `).join("");

  $("#editor-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";

  storeDraft();

  if (!id) $('[name="name"]')?.focus();
}

function closeEditor() {
  state.editorOpen = false;
  state.editingId = null;
  state.draft = null;
  $("#editor-overlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function requestCloseEditor() {
  storeDraft();
  closeEditor();
  toast("Editor closed. Draft preserved.");
}

function fieldWrap(field,content) {
  return `<div class="field ${field.wide ?
    "form-wide":""}" data-field="${field.key}">
    <label>${esc(field.label)}
      ${field.required ? "*" : ""}
    </label>
    ${content}
    ${field.hint ? `<div class="field-hint">
      ${esc(field.hint)}</div>` : ""}
  </div>`;
}

function renderEditorField(field) {
  const key = field.key;
  const value = state.draft[key];

  if (field.type === "choice") {
    const selected = valuesOf(state.draft,key);

    return fieldWrap(field,`
      <div class="check-options">
        ${CFG[field.options].map(option=>`
          <label class="check-option">
            <input type="checkbox"
              name="${key}"
              value="${esc(option)}"
              ${selected.some(v=>canonical(v)===
                canonical(option))?"checked":""}>
            ${esc(option)}
          </label>
        `).join("")}
      </div>
    `);
  }

  if (field.type === "select") {
    return fieldWrap(field,`
      <select class="select" name="${key}">
        ${options(CFG[field.options],value,
          "Not specified")}
      </select>
    `);
  }

  if (field.type === "tags") {
    return fieldWrap(field,`
      <div class="tag-editor" data-tags="${key}">
        <div class="tags">
          ${editorChips(key)}
        </div>
        <div class="tag-editor-input">
          <input type="text" class="input"
            data-add-input="${key}"
            inputmode="text"
            placeholder="Add an answer...">
          <button type="button"
            class="button button-secondary"
            data-action="add-value"
            data-field="${key}">Add</button>
        </div>
      </div>
    `);
  }

  if (field.type === "links") {
    return fieldWrap(field,`
      <div class="tag-editor" data-tags="${key}">
        <div class="tags">${editorChips(key)}</div>
        <div class="tag-editor-input">
          <select class="select"
            data-link-select="${key}">
            ${options(
              sortGems(state.gems)
                .filter(g=>g.id!==state.editingId)
                .map(g=>({value:g.id,label:g.name})),
              "",
              "Choose a saved gemstone"
            )}
          </select>
          <button type="button"
            class="button button-secondary"
            data-action="add-link"
            data-field="${key}">Add</button>
        </div>
      </div>
    `);
  }

  if (field.type === "text" ||
      field.type === "number" ||
      field.type === "textarea") {
    return renderFlexibleField(field);
  }

  return "";
}

function renderFlexibleField(field) {
  const key = field.key;
  const value = state.draft[key];
  const multiple = Array.isArray(value) &&
    key !== "name";

  let content = "";

  if (multiple) {
    content = `
      <div class="flexible-values">
        ${editorChips(key)}
      </div>
      <div class="flexible-entry">
        <input class="input" type="text"
          inputmode="text" autocomplete="off"
          data-add-input="${key}"
          placeholder="Add another answer...">
        <button type="button"
          class="button button-secondary button-small"
          data-action="add-value"
          data-field="${key}">Add</button>
      </div>
    `;
  } else if (field.type === "textarea") {
    content = `<textarea class="textarea"
      name="${key}"
      placeholder="Write here...">${esc(value ?? "")}</textarea>`;
  } else {
    content = `<input class="input" type="text"
      inputmode="text" autocomplete="off"
      name="${key}"
      value="${esc(value ?? "")}"
      ${field.required?"required":""}>`;
  }

  return `<div class="field flexible-field
    ${field.wide?"form-wide":""}"
    data-field="${key}">
    <div class="flexible-heading">
      <label>${esc(field.label)}
        ${field.required?"*":""}</label>
      ${key !== "name" ? `
        <label class="flexible-toggle">
          <input type="checkbox"
            data-flex-toggle="${key}"
            ${multiple?"checked":""}>
          <span>Multiple</span>
        </label>
      `:""}
    </div>
    ${content}
    ${field.hint ? `<div class="field-hint">
      ${esc(field.hint)}</div>`:""}
  </div>`;
}

function editorChips(key) {
  return arrayOf(state.draft?.[key])
    .map((value,index)=>{
      const label = key === "relatesTo" ?
        (getGem(value)?.name || "Unknown Gem") :
        value;

      return `<span class="flexible-chip">
        <span>${esc(label)}</span>
        <button type="button" class="tag-button"
          data-action="remove-value"
          data-field="${key}"
          data-index="${index}">×</button>
      </span>`;
    }).join("");
}

function refreshField(key) {
  const field = CFG.fieldMap[key];
  const element = document.querySelector(
    `[data-field="${key}"]`
  );

  if (!field || !element) return;

  element.outerHTML = renderEditorField(field);
  queueDraft();
}

function addValue(key) {
  if (!state.draft) return false;

  const field = CFG.fieldMap[key];
  const input = document.querySelector(
    `[data-add-input="${key}"]`
  );

  if (!field || !input) return false;

  const raw = input.value.trim();
  if (!raw) return true;

  let value = raw;

  if (field.type === "number") {
    const number = Number(raw);

    if (!Number.isFinite(number)) {
      toast(`${field.label} needs a valid number.`);
      input.focus();
      return false;
    }
    value = number;
  }

  const current = arrayOf(state.draft[key]);

  if (!current.some(v=>canonical(v)===
    canonical(value))) {
    state.draft[key] = [...current,value];
  }

  refreshField(key);
  document.querySelector(
    `[data-add-input="${key}"]`
  )?.focus();

  return true;
}

function addLink(key) {
  if (!state.draft) return;

  const input = document.querySelector(
    `[data-link-select="${key}"]`
  );

  if (!input?.value) return;

  if (input.value === state.editingId) return;
  if (!getGem(input.value)) return;

  const current = arrayOf(state.draft[key]);

  if (!current.includes(input.value)) {
    state.draft[key] = [...current,input.value];
  }

  refreshField(key);
}

function removeValue(key,index) {
  if (!state.draft) return;

  const current = [...arrayOf(state.draft[key])];
  current.splice(index,1);

  state.draft[key] = current;
  refreshField(key);
}

function toggleMultiple(key,enabled) {
  if (!state.draft || key === "name") return;

  const field = CFG.fieldMap[key];
  if (!field) return;

  const current = state.draft[key];

  if (enabled) {
    state.draft[key] = arrayOf(current).filter(
      item => item !== null && String(item).trim()
    );
  } else {
    const values = arrayOf(current);
    state.draft[key] = values[0] ??
      (field.type==="number"?null:"");

    if (values.length>1) {
      toast("Single mode keeps the first answer.");
    }
  }

  refreshField(key);
}

function updateDraftInput(input) {
  if (!state.draft || !input.name) return;

  const field = CFG.fieldMap[input.name];
  if (!field) return;

  if (field.type === "choice") {
    state.draft[field.key] = [
      ...$("#gem-form").querySelectorAll(
        `input[name="${field.key}"]:checked`
      )
    ].map(item=>item.value);
  } else {
    state.draft[field.key] = input.value;
  }

  $("#editor-status").textContent =
    "Unsaved changes";

  queueDraft();
}

function validateDraft() {
  const draft = state.draft;

  if (!draft?.name?.trim()) {
    $(".editor-section").open = true;
    $('[name="name"]')?.focus();
    toast("Gemstone name is required.");
    return false;
  }

  for (const field of CFG.fields) {
    if (field.type !== "number") continue;

    const original = draft[field.key];
    const multiple = Array.isArray(original);
    const converted = [];

    for (const item of arrayOf(original)) {
      if (String(item).trim() === "") continue;

      const number = Number(item);

      if (!Number.isFinite(number)) {
        toast(`Invalid number: ${field.label}`);
        return false;
      }

      converted.push(number);
    }

    draft[field.key] = multiple ?
      [...new Set(converted)] :
      (converted[0] ?? null);
  }

  return true;
}

function submitEditor(event) {
  event.preventDefault();
  if (!state.draft) return;

  // Flush every typed but uncommitted answer.
  for (const input of [
    ...document.querySelectorAll("[data-add-input]")
  ]) {
    if (!input.value.trim()) continue;
    if (!addValue(input.dataset.addInput)) return;
  }

  if (!validateDraft()) return;
  if (!saveGem(state.draft)) return;

  closeEditor();
  navigate("profile");
}

function recoverDraft() {
  const saved = readDraft();

  if (!saved) {
    toast("No draft found.");
    return;
  }

  openEditor(
    saved.editingId && getGem(saved.editingId) ?
      saved.editingId : null,
    saved.gem
  );
}

/* ==========================================
   NAVIGATION
========================================== */

function refreshSelections() {
  const ids = new Set(state.gems.map(g=>g.id));

  if (!ids.has(state.compareA)) {
    state.compareA = state.gems[0]?.id || "";
  }

  if (!ids.has(state.compareB) ||
      state.compareB === state.compareA) {
    state.compareB = state.gems.find(
      g=>g.id !== state.compareA
    )?.id || "";
  }

  if (!ids.has(state.relationId)) {
    state.relationId = state.gems[0]?.id || "";
  }

  if (!ids.has(state.selectedGem)) {
    state.selectedGem = null;
  }

  state.multiIds = state.multiIds.filter(
    id=>ids.has(id)
  );
}

function navigate(page) {
  if (![
    "library","profile","compare",
    "relations","statistics"
  ].includes(page)) return;

  state.page = page;
  render();
  window.scrollTo(0,0);
}

function openProfile(id) {
  if (!getGem(id)) return;
  state.selectedGem = id;
  navigate("profile");
}

function render() {
  refreshSelections();

  const labels = {
    library:"Library",
    profile:"Gemstone Profile",
    compare:"Comparison",
    relations:"Relationships",
    statistics:"Statistics"
  };

  $("#current-page-label").textContent =
    labels[state.page];

  $("#sidebar-count").textContent =
    state.gems.length;

  $$("[data-page]").forEach(button=>{
    button.classList.toggle("active",
      button.dataset.page === (
        state.page === "profile" ?
          "library" : state.page
      )
    );
  });

  const pages = {
    library:renderLibrary,
    profile:renderProfile,
    compare:renderComparison,
    relations:renderRelationships,
    statistics:renderStatistics
  };

  main.innerHTML = (pages[state.page] ||
    pages.library)();

  if (state.page === "library") {
    renderLibraryResults();
  }
}

/* ==========================================
   LIBRARY PAGE
========================================== */

function filteredLibrary() {
  const search = canonical(state.librarySearch);

  let gems = state.gems.filter(gem=>{
    if (state.libraryRarity &&
        gem.rarity !== state.libraryRarity) {
      return false;
    }

    if (!search) return true;

    return CFG.fields.some(field=>
      canonical(joinValue(gem[field.key]," "))
        .includes(search)
    );
  });

  if (state.librarySort === "recent") {
    gems.sort((a,b)=>
      String(b.updatedAt).localeCompare(
        String(a.updatedAt)
      )
    );
  } else if (state.librarySort === "rarity") {
    gems.sort((a,b)=>
      CFG.rarities.indexOf(b.rarity) -
      CFG.rarities.indexOf(a.rarity)
    );
  } else {
    gems = sortGems(gems);
  }

  return gems;
}

function renderLibrary() {
  const draft = readDraft();

  return `<div class="page-heading">
    <div>
      <div class="eyebrow">COLLECTION</div>
      <h1>Gemstone Library</h1>
      <p>${state.gems.length} saved profiles</p>
    </div>
    <div class="page-actions">
      <button class="button button-secondary"
        data-action="export">Export</button>
      <button class="button button-secondary"
        data-action="import">Import</button>
    </div>
  </div>

  ${draft ? `<div class="panel"
    style="margin-bottom:18px">
    <div class="panel-title">
      <h3>Unfinished Draft</h3>
    </div>
    <p class="section-description">
      A gemstone draft was preserved locally.
    </p>
    <div class="page-actions">
      <button class="button button-secondary"
        data-action="recover-draft">
        Resume Draft
      </button>
      <button class="button button-ghost"
        data-action="discard-draft">
        Discard
      </button>
    </div>
  </div>` : ""}

  <div class="library-toolbar">
    <input id="library-search"
      class="input" type="search"
      placeholder="Search gemstones, minerals, origins..."
      value="${esc(state.librarySearch)}">

    <select id="library-rarity" class="select">
      ${options(CFG.rarities,
        state.libraryRarity,"All rarities")}
    </select>

    <select id="library-sort" class="select">
      ${options([
        {value:"name",label:"Name A–Z"},
        {value:"recent",label:"Recently Updated"},
        {value:"rarity",label:"Rarity"}
      ],state.librarySort)}
    </select>
  </div>

  <div class="result-count"
    id="library-result-count"></div>
  <div id="library-results"></div>`;
}

function renderLibraryResults() {
  const container = $("#library-results");
  if (!container) return;

  const gems = filteredLibrary();

  $("#library-result-count").textContent =
    `${gems.length} of ${state.gems.length} gemstones`;

  if (!gems.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-symbol">◇</div>
      <h2>${state.gems.length ?
        "No matching gemstones" :
        "Your library is empty"}</h2>
      <p>Start creating gemstone profiles.</p>
      <button class="button button-primary"
        data-action="new-gem">
        + New Gemstone
      </button>
    </div>`;
    return;
  }

  container.innerHTML = `<div class="library-grid">
    ${gems.map(gem=>`
      <article class="gem-card">
        <div class="gem-card-top">
          <div>
            <h3>${esc(gem.name)}</h3>
            <div class="gem-card-subtitle">
              ${esc(joinValue(gem.title)||"Gemstone")}
            </div>
          </div>
          <div class="gem-card-symbol">◇</div>
        </div>

        <div class="gem-card-details">
          ${[
            ["Rarity",gem.rarity],
            ["Species",gem.mineralSpecies],
            ["Mohs",gem.mohs]
          ].map(([label,value])=>`
            <div class="gem-card-detail">
              <span>${label}</span>
              <span>${esc(joinValue(value)||"—")}</span>
            </div>`).join("")}
        </div>

        <div class="tags gem-card-tags">
          ${tags(gem.classifications.slice(0,3))}
        </div>

        <div class="gem-card-actions">
          <button class="button button-primary button-small"
            data-action="view-gem"
            data-id="${esc(gem.id)}">Open</button>

          <button class="button button-secondary button-small"
            data-action="edit-gem"
            data-id="${esc(gem.id)}">Edit</button>

          <button class="button button-ghost button-small"
            data-action="compare-gem"
            data-id="${esc(gem.id)}">Compare</button>
        </div>
      </article>
    `).join("")}
  </div>`;
}

/* ==========================================
   COMPACT PROFILE
========================================== */

function formatFieldValue(gem,field) {
  const value = gem[field.key];
  if (!hasValue(value)) {
    return `<span class="empty-note">
      Not specified</span>`;
  }

  if (field.type === "links") {
    return `<div class="tags">
      ${arrayOf(value).map(id=>{
        const linked = getGem(id);
        return linked ? gemButton(linked) : "";
      }).join("")}
    </div>`;
  }

  if (Array.isArray(value)) {
    return `<div class="tags">
      ${tags(value)}
    </div>`;
  }

  if (field.type === "number") {
    return esc(formatNumber(value,4));
  }

  return esc(value);
}

function profileSection(gem,title,keys) {
  const visible = keys.filter(key=>
    CFG.fieldMap[key] && hasValue(gem[key])
  );

  if (!visible.length) return "";

  return `<section class="sheet-section">
    <div class="sheet-section-heading">
      ${esc(title)}
    </div>
    <div class="sheet-rows">
      ${visible.map(key=>`
        <div class="sheet-row">
          <div class="sheet-label">
            ${esc(fieldLabel(key))}
          </div>
          <div class="sheet-value">
            ${formatFieldValue(gem,CFG.fieldMap[key])}
          </div>
        </div>
      `).join("")}
    </div>
  </section>`;
}

function renderProfile() {
  const gem = getGem(state.selectedGem);

  if (!gem) return empty("Gemstone not found.");

  const col1 = [
    ["Mineral Family",["mineralFamily"]],
    ["Physical Properties",[
      "mohs","crystalSystem","cleavage",
      "fracture","streak","tenacity",
      "luster","transparency"
    ]],
    ["Composition",[
      "primaryMinerals","secondaryMinerals",
      "accessoryMinerals","inclusions"
    ]],
    ["Mineral Relationships",[
      "mineralSpecies","mineralGroup",
      "varieties","relatesTo"
    ]]
  ];

  const col2 = [
    ["Appearance & Origins",[
      "otherEffects","colors","countries",
      "discoveryYear","discoveryLocation",
      "discoverer","etymology"
    ]],
    ["Cultural Associations",[
      "zodiacStone","planetaryStone",
      "birthStone","anniversaryStone",
      "meaning","connectedWith"
    ]],
    ["Value & Usage",[
      "priceRange","collectorValue",
      "jewelry","safety"
    ]],
    ["Geological Relationships",[
      "associatedMinerals","geologicalOrigin",
      "hostRocks"
    ]]
  ];

  return `<div class="sheet-toolbar">
    <button class="button button-ghost"
      data-action="go-library">← Library</button>
    <div class="page-actions">
      <button class="button button-secondary button-small"
        data-action="compare-gem"
        data-id="${esc(gem.id)}">Compare</button>
      <button class="button button-secondary button-small"
        data-action="relations-gem"
        data-id="${esc(gem.id)}">Relations</button>
      <button class="button button-primary button-small"
        data-action="edit-gem"
        data-id="${esc(gem.id)}">Edit</button>
    </div>
  </div>

  <article class="gem-sheet">
    <header class="sheet-header">
      <div class="eyebrow">GEMSTONE RECORD</div>
      <h1>${esc(gem.name)}</h1>
      ${hasValue(gem.title) ?
        `<div class="sheet-subtitle">
          ${esc(joinValue(gem.title))}
        </div>` : ""}
      <div class="sheet-header-tags">
        ${tags(gem.classifications,true)}
        ${gem.rarity ? tag(gem.rarity) : ""}
      </div>
    </header>

    <div class="sheet-grid">
      <div class="sheet-column">
        ${col1.map(([title,keys])=>
          profileSection(gem,title,keys)
        ).join("")}
      </div>
      <div class="sheet-column">
        ${col2.map(([title,keys])=>
          profileSection(gem,title,keys)
        ).join("")}
      </div>
    </div>

    <footer class="sheet-footer">
      <span>Updated:
        ${gem.updatedAt ?
          esc(new Date(gem.updatedAt)
            .toLocaleDateString()) : "—"}
      </span>
      <div class="page-actions">
        <button class="button button-ghost button-small"
          data-action="duplicate-gem"
          data-id="${esc(gem.id)}">Duplicate</button>
        <button class="button button-ghost button-small"
          data-action="delete-gem"
          data-id="${esc(gem.id)}">Delete</button>
      </div>
    </footer>
  </article>`;
}

/* ==========================================
   EQUAL-CONTRIBUTION COMPARISON
========================================== */

function compareField(field,a,b) {
  if (!hasValue(a) || !hasValue(b)) {
    return {
      comparable:false,
      score:null,
      status:"unknown"
    };
  }

  const setA = new Set(arrayOf(a).map(canonical));
  const setB = new Set(arrayOf(b).map(canonical));
  const union = new Set([...setA,...setB]);

  let shared = 0;

  for (const item of setA) {
    if (setB.has(item)) shared++;
  }

  const score = union.size ?
    shared/union.size : 0;

  return {
    comparable:true,
    score,
    status:score === 1 ?
      "match" :
      score === 0 ?
        "different" : "partial"
  };
}

function compareGems(a,b) {
  if (!a || !b) return null;

  const results = CFG.comparableFields.map(field=>({
    field,
    a:a[field.key],
    b:b[field.key],
    ...compareField(field,a[field.key],b[field.key])
  }));

  const measured = results.filter(r=>r.comparable);
  const score = measured.length ?
    round(measured.reduce((sum,r)=>sum+r.score,0) /
      measured.length * 100,1) : null;

  return {
    score,
    compared:measured.length,
    matches:measured.filter(r=>r.status==="match").length,
    partials:measured.filter(r=>r.status==="partial").length,
    differences:measured.filter(r=>r.status==="different").length,
    results
  };
}

function similarityText(result) {
  return result?.score === null ||
    result?.score === undefined ?
    "Not enough data" : `${result.score}%`;
}

function comparisonStatus(result) {
  const labels = {
    match:"Match",
    partial:"Partial",
    different:"Different",
    unknown:"No data"
  };

  return `<span class="compare-status
    status-${result.status}">
    ${labels[result.status]}</span>`;
}

function renderComparison() {
  const a = getGem(state.compareA);
  const b = getGem(state.compareB);

  return `<div class="page-heading">
    <div>
      <div class="eyebrow">ANALYSIS</div>
      <h1>Gemstone Comparison</h1>
      <p>Every comparable property contributes equally.</p>
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
    ${a && b ? renderDirectComparison(a,b) :
      empty("Create at least two gemstones to compare.")}
  </div>

  <div class="panel">
    <div class="panel-title">
      <h2>Multiple Gemstone Comparison</h2>
    </div>
    <p class="section-description">
      Select gemstones to view their properties side by side.
    </p>
    <div id="multi-comparison">
      ${renderMultiComparison()}
    </div>
  </div>`;
}

function renderDirectComparison(a,b) {
  const result = compareGems(a,b);

  return `<div class="compare-summary">
    <div class="compare-score">
      ${result.score ?? "—"}<small>
        ${result.score === null ? "" : "%"}</small>
    </div>
    <div style="flex:1;min-width:0">
      <strong>${esc(a.name)} &amp; ${esc(b.name)}</strong>
      <div class="compare-meter">
        <div class="compare-meter-fill"
          style="width:${result.score ?? 0}%"></div>
      </div>
      <div class="muted" style="font-size:11px">
        ${result.compared} compared fields ·
        ${result.matches} matches ·
        ${result.partials} partial ·
        ${result.differences} different
      </div>
    </div>
  </div>

  <p class="chart-note">
    Missing fields are excluded. Each shared field
    contributes one equal share to the final score.
    Manual connections do not add similarity points.
  </p>

  <div class="comparison-table-wrap">
    <table class="data-table">
      <thead><tr>
        <th>Property</th>
        <th>${esc(a.name)}</th>
        <th>${esc(b.name)}</th>
        <th>Result</th>
      </tr></thead>
      <tbody>
        ${CFG.sections.map(section=>{
          const fields = section.fields.filter(
            f=>f.compare !== false
          );

          if (!fields.length) return "";

          return `<tr class="comparison-group-title">
            <td colspan="4">${esc(section.title)}</td>
          </tr>` + fields.map(field=>{
            const r = result.results.find(
              item=>item.field.key === field.key
            );

            return `<tr>
              <td>${esc(field.label)}</td>
              <td>${formatFieldValue(a,field)}</td>
              <td>${formatFieldValue(b,field)}</td>
              <td>${comparisonStatus(r)}</td>
            </tr>`;
          }).join("");
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderMultiComparison() {
  if (!state.gems.length) {
    return empty("No gemstones available.");
  }

  const selected = state.multiIds
    .map(getGem).filter(Boolean);

  return `<div class="multi-gem-grid">
    ${sortGems(state.gems).map(gem=>`
      <label class="multi-option">
        <input type="checkbox"
          data-multi-id="${esc(gem.id)}"
          ${state.multiIds.includes(gem.id) ?
            "checked" : ""}>
        ${esc(gem.name)}
      </label>
    `).join("")}
  </div>

  <div class="divider"></div>

  ${selected.length < 2 ?
    `<p class="muted">Select two or more gemstones.</p>` :
    `<div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Property</th>
          ${selected.map(g=>`<th>${esc(g.name)}</th>`)
            .join("")}
        </tr></thead>
        <tbody>
          ${CFG.comparableFields.map(field=>`
            <tr>
              <td>${esc(field.label)}</td>
              ${selected.map(g=>`
                <td>${formatFieldValue(g,field)}</td>
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
        <thead><tr>
          <th>Gemstones</th><th>Similarity</th>
          <th>Compared Fields</th>
        </tr></thead>
        <tbody>
          ${selected.flatMap((a,i)=>
            selected.slice(i+1).map(b=>{
              const r=compareGems(a,b);
              return `<tr>
                <td>${esc(a.name)} / ${esc(b.name)}</td>
                <td>${similarityText(r)}</td>
                <td>${r.compared}</td>
              </tr>`;
            })
          ).join("")}
        </tbody>
      </table>
    </div>`
  }`;
}

/* ==========================================
   RELATIONSHIP INTELLIGENCE
========================================== */

const RELATION_FIELDS = [
  {key:"mineralGroup",label:"Same Mineral Group",
    mode:"family"},
  {key:"mineralSpecies",label:"Same Species",
    mode:"family"},
  {key:"varieties",label:"Shared Varieties",
    mode:"family"},
  {key:"primaryMinerals",label:"Shared Primary Minerals",
    mode:"composition"},
  {key:"secondaryMinerals",label:"Shared Secondary Minerals",
    mode:"composition"},
  {key:"accessoryMinerals",label:"Shared Accessory Minerals",
    mode:"composition"},
  {key:"inclusions",label:"Shared Inclusions",
    mode:"composition"},
  {key:"associatedMinerals",label:"Associated Minerals",
    mode:"geology"},
  {key:"geologicalOrigin",label:"Geological Origin",
    mode:"geology"},
  {key:"hostRocks",label:"Host Rocks",
    mode:"geology"}
];

function manualNeighbors(id) {
  const found = new Set();

  const gem = getGem(id);
  if (!gem) return [];

  for (const link of gem.relatesTo) {
    if (getGem(link) && link !== id) found.add(link);
  }

  for (const other of state.gems) {
    if (other.id !== id &&
        other.relatesTo.includes(id)) {
      found.add(other.id);
    }
  }

  return [...found];
}

function sharedRelations(a,b) {
  if (!a || !b) return [];

  const results = [];

  for (const field of RELATION_FIELDS) {
    const first = valuesOf(a,field.key);
    const second = new Set(
      valuesOf(b,field.key).map(canonical)
    );

    const common = first.filter(
      item=>second.has(canonical(item))
    );

    if (common.length) {
      results.push({
        key:field.key,
        label:field.label,
        mode:field.mode,
        values:common
      });
    }
  }

  return results;
}

function relationshipResults(gem) {
  if (!gem) return [];

  return state.gems
    .filter(other=>other.id !== gem.id)
    .map(other=>{
      const comparison=compareGems(gem,other);
      const manual=manualNeighbors(gem.id)
        .includes(other.id);
      const shared=sharedRelations(gem,other);

      return {gem:other,comparison,manual,shared};
    })
    .sort((a,b)=>{
      if (state.relationSort==="name") {
        return a.gem.name.localeCompare(b.gem.name);
      }

      if (state.relationSort==="manual" &&
          a.manual !== b.manual) {
        return a.manual ? -1 : 1;
      }

      return (b.comparison.score??-1) -
        (a.comparison.score??-1) ||
        b.comparison.compared-a.comparison.compared;
    });
}

function relationNeighbors(id,mode="all") {
  const base = getGem(id);
  if (!base) return [];

  return state.gems
    .filter(g=>g.id!==id)
    .filter(g=>{
      const manual = manualNeighbors(id).includes(g.id);
      const shared = sharedRelations(base,g);

      if (mode==="manual") return manual;
      if (mode==="all") return manual || shared.length>0;

      return shared.some(r=>r.mode===mode);
    })
    .map(g=>g.id);
}

function shortestPath(start,end,mode="all") {
  if (!getGem(start)||!getGem(end)) return null;
  if (start===end) return [start];

  const queue=[[start]];
  const visited=new Set([start]);

  while (queue.length) {
    const path=queue.shift();
    const id=path[path.length-1];

    for (const next of relationNeighbors(id,mode)) {
      if (visited.has(next)) continue;

      const candidate=[...path,next];
      if (next===end) return candidate;

      visited.add(next);
      queue.push(candidate);
    }
  }

  return null;
}

/* ==========================================
   FAMILY HIERARCHY
========================================== */

function buildFamilyTree(gems) {
  const groups=new Map();

  for (const gem of gems) {
    const groupNames=valuesOf(gem,"mineralGroup");
    const speciesNames=valuesOf(gem,"mineralSpecies");

    const group=groupNames[0] ||
      valuesOf(gem,"mineralFamily")[0] ||
      "Unclassified Group";

    const species=speciesNames[0] ||
      "Unclassified Species";

    const groupKey=canonical(group);
    const speciesKey=canonical(species);

    if (!groups.has(groupKey)) {
      groups.set(groupKey,{
        name:group,
        species:new Map()
      });
    }

    const parent=groups.get(groupKey);

    if (!parent.species.has(speciesKey)) {
      parent.species.set(speciesKey,{
        name:species,
        gems:[]
      });
    }

    parent.species.get(speciesKey).gems.push(gem);
  }

  return [...groups.values()].sort((a,b)=>
    a.name.localeCompare(b.name)
  );
}

function renderFamilyTree() {
  const search=canonical(state.relationFilter);

  const matching=state.gems.filter(gem=>
    !search ||
    [
      gem.name,
      joinValue(gem.mineralGroup),
      joinValue(gem.mineralSpecies),
      joinValue(gem.mineralFamily),
      joinValue(gem.varieties)
    ].some(value=>canonical(value).includes(search))
  );

  const groups=buildFamilyTree(matching);

  if (!groups.length) {
    return empty("No matching mineral families.");
  }

  return `<div class="stack">
    ${groups.map(group=>`
      <div class="panel">
        <div class="panel-title">
          <h3>◇ ${esc(group.name)}</h3>
          <span class="panel-subtitle">
            Mineral group
          </span>
        </div>

        <div class="stack">
          ${[...group.species.values()]
            .sort((a,b)=>a.name.localeCompare(b.name))
            .map(species=>`
              <div class="relationship-entry">
                <div class="relationship-entry-header">
                  <strong>${esc(species.name)}</strong>
                  <span class="muted" style="font-size:11px">
                    Species
                  </span>
                </div>

                <div class="tags" style="margin-top:12px">
                  ${sortGems(species.gems)
                    .map(gem=>gemButton(gem)).join("")}
                </div>

                ${species.gems.some(g=>g.varieties.length) ?
                  `<p class="chart-note">
                    Recorded varieties:
                    ${esc(distinct(species.gems.flatMap(
                      g=>valuesOf(g,"varieties")
                    )).join(", "))}
                  </p>` : ""}
              </div>
            `).join("")}
        </div>
      </div>
    `).join("")}
  </div>`;
}

function renderRelationList(mode) {
  const gem=getGem(state.relationId);
  if (!gem) return empty("Create a gemstone first.");

  const results=relationshipResults(gem).filter(item=>
    mode==="all" ||
    (mode==="manual" ? item.manual :
      item.shared.some(r=>r.mode===mode))
  );

  if (!results.length) {
    return empty("No relationships recorded in this category.");
  }

  return `<div class="relationship-list">
    ${results.map(item=>{
      const shared=mode==="all"?
        item.shared :
        item.shared.filter(r=>r.mode===mode);

      return `<div class="relationship-entry">
        <div class="relationship-entry-header">
          <button class="link-button relationship-name"
            data-action="view-gem"
            data-id="${esc(item.gem.id)}">
            ${esc(item.gem.name)}
          </button>
          <span class="relationship-score">
            ${similarityText(item.comparison)}
          </span>
        </div>

        <div class="compare-meter">
          <div class="compare-meter-fill"
            style="width:${item.comparison.score??0}%">
          </div>
        </div>

        <div class="relationship-meta">
          ${item.comparison.compared} comparable fields
          ${item.manual?" · Manual connection":""}
        </div>

        ${shared.map(connection=>`
          <div style="margin-top:11px">
            <div class="eyebrow">
              ${esc(connection.label)}
            </div>
            <div class="tags">
              ${tags(connection.values)}
            </div>
          </div>
        `).join("")}

        <div class="page-actions" style="margin-top:12px">
          <button class="button button-ghost button-small"
            data-action="compare-pair"
            data-a="${esc(gem.id)}"
            data-b="${esc(item.gem.id)}">
            Compare
          </button>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function renderRelationshipMap(gem,mode) {
  const results=relationshipResults(gem)
    .filter(item=>
      mode==="all" ?
        (item.shared.length || item.manual) :
      mode==="manual" ? item.manual :
        item.shared.some(r=>r.mode===mode)
    ).slice(0,10);

  if (!results.length) return "";

  const cx=250,cy=170,rx=185,ry=113;

  const edges=results.map((item,i)=>{
    const angle=2*Math.PI*i/results.length-Math.PI/2;
    const x=cx+Math.cos(angle)*rx;
    const y=cy+Math.sin(angle)*ry;

    return `<line x1="${cx}" y1="${cy}"
      x2="${x}" y2="${y}"
      stroke="#a6bba1"
      stroke-opacity="${item.manual?.75:.35}"
      stroke-width="${item.manual?2.8:1.4}"
      ${item.manual?"":'stroke-dasharray="4 4"'} />`;
  }).join("");

  const nodes=results.map((item,i)=>{
    const angle=2*Math.PI*i/results.length-Math.PI/2;
    const x=cx+Math.cos(angle)*rx;
    const y=cy+Math.sin(angle)*ry;

    const label=item.gem.name.length>18 ?
      item.gem.name.slice(0,17)+"…" : item.gem.name;

    return `<g>
      <circle cx="${x}" cy="${y}" r="25"
        fill="#344037" stroke="#829781"/>
      <text x="${x}" y="${y+4}"
        text-anchor="middle" font-size="17"
        fill="#e9ede8">◇</text>
      <text x="${x}" y="${y+41}"
        text-anchor="middle" font-size="10"
        fill="#e9ede8">${esc(label)}</text>
      <text x="${x}" y="${y+54}"
        text-anchor="middle" font-size="9"
        fill="#a6bba1">
        ${item.comparison.score===null?
          "No data":item.comparison.score+"%"}
      </text>
    </g>`;
  }).join("");

  return `<div class="relationship-graph">
    <svg viewBox="0 0 500 355"
      role="img"
      aria-label="Relationship map for ${esc(gem.name)}">
      ${edges}${nodes}
      <circle cx="${cx}" cy="${cy}" r="35"
        fill="#60795d" stroke="#a6bba1"/>
      <text x="${cx}" y="${cy+6}"
        text-anchor="middle" font-size="23"
        fill="white">◇</text>
      <text x="${cx}" y="${cy+54}"
        text-anchor="middle" font-size="13"
        fill="#e9ede8">${esc(gem.name.slice(0,26))}</text>
    </svg>
  </div>

  <p class="chart-note">
    Solid = manually linked. Dashed = automatically
    discovered. Use the entries below the map to
    open profiles or inspect exact connections.
  </p>`;
}

function renderRelationships() {
  const gem=getGem(state.relationId);

  const modes=[
    ["family","Family"],
    ["composition","Composition"],
    ["geology","Geology"],
    ["all","All Relations"],
    ["manual","Manual"]
  ];

  const mode=state.relationMode;

  return `<div class="page-heading">
    <div>
      <div class="eyebrow">MINERAL CONNECTIONS</div>
      <h1>Family Explorer</h1>
      <p>Classification trees, composition,
        geological links and gemstone relationships.</p>
    </div>
  </div>

  <div class="panel">
    <div class="panel-title">
      <h2>Relationship Views</h2>
    </div>

    <div class="segmented">
      ${modes.map(([id,label])=>`
        <button class="${mode===id?"active":""}"
          data-action="relation-mode"
          data-mode="${id}">
          ${label}
        </button>
      `).join("")}
    </div>
  </div>

  ${mode==="family" ? `
    <div class="panel">
      <div class="panel-title">
        <h2>Mineral Classification Tree</h2>
      </div>
      <div class="field">
        <label>Search families and gemstones</label>
        <input type="search" class="input"
          id="family-filter"
          value="${esc(state.relationFilter)}"
          placeholder="Group, species, gemstone...">
      </div>
    </div>
    <div id="family-tree">
      ${renderFamilyTree()}
    </div>
  `:""}

  <div class="panel" style="margin-top:17px">
    <div class="panel-title">
      <h2>${mode==="family"?
        "Gemstone Family Relationships":
        mode==="composition"?
        "Composition Network":
        mode==="geology"?
        "Geological Network":
        mode==="manual"?
        "Manual Connections":
        "Combined Relationship Network"}</h2>
    </div>

    <div class="control-row">
      <div class="field">
        <label>Selected Gemstone</label>
        <select id="relation-gem" class="select">
          ${gemOptions(state.relationId)}
        </select>
      </div>
      <div class="field">
        <label>Order By</label>
        <select id="relation-sort" class="select">
          ${options([
            {value:"similarity",label:"Closest Similarity"},
            {value:"manual",label:"Manual First"},
            {value:"name",label:"Name A–Z"}
          ],state.relationSort)}
        </select>
      </div>
    </div>

    ${gem ? `
      ${renderRelationshipMap(gem,mode)}
      <div class="panel-title">
        <h3>Connected Gemstones</h3>
      </div>
      ${renderRelationList(mode)}
    `:empty("No gemstones saved yet.")}
  </div>

  <div class="panel">
    <div class="panel-title">
      <h2>Connection Path</h2>
    </div>
    <p class="section-description">
      Find the shortest path through recorded
      gemstone connections.
    </p>

    <div class="control-row">
      <div class="field">
        <label>From</label>
        <select id="path-source" class="select">
          ${gemOptions(state.relationId)}
        </select>
      </div>
      <div class="field">
        <label>To</label>
        <select id="path-target" class="select">
          ${gemOptions(state.relationTarget)}
        </select>
      </div>
    </div>

    <div id="relationship-path">
      ${renderPath()}
    </div>
  </div>`;
}

function renderPath() {
  const start=state.relationId;
  const end=state.relationTarget;

  if (!start || !end) {
    return `<p class="muted">Choose two gemstones.</p>`;
  }

  const path=shortestPath(start,end,
    state.relationMode==="family"?
      "family":state.relationMode);

  if (!path) {
    return `<p class="muted">
      No connection path found for this relationship type.
    </p>`;
  }

  return `<div class="path-list">
    ${path.map((id,i)=>`
      ${i?'<span class="path-arrow">→</span>':""}
      ${tag(getGem(id)?.name||"Unknown",true)}
    `).join("")}
  </div>
  <p class="chart-note">
    ${path.length-1} connection(s).
  </p>`;
}

/* ==========================================
   STATISTICS
========================================== */

function statisticsPopulation() {
  const search=canonical(state.statSearch);

  return state.gems.filter(gem=>{
    if (state.statRarity &&
        gem.rarity!==state.statRarity) {
      return false;
    }

    if (!search) return true;

    return CFG.fields.some(field=>
      canonical(joinValue(gem[field.key]," "))
        .includes(search)
    );
  });
}

function distribution(gems,key) {
  const map=new Map();

  for (const gem of gems) {
    for (const value of valuesOf(gem,key)) {
      const normalized=canonical(value);

      if (!map.has(normalized)) {
        map.set(normalized,{
          label:value,
          value:0,
          gemIds:[]
        });
      }

      const entry=map.get(normalized);
      entry.value++;
      entry.gemIds.push(gem.id);
    }
  }

  return [...map.values()].sort((a,b)=>
    b.value-a.value ||
    a.label.localeCompare(b.label)
  );
}

function numericValues(gem,key) {
  if (key==="mohs") {
    return valuesOf(gem,key)
      .map(Number)
      .filter(Number.isFinite);
  }

  return arrayOf(gem[key])
    .filter(v=>v!==null && String(v).trim())
    .map(Number)
    .filter(Number.isFinite);
}

function numericSummary(gems,key) {
  const numbers=gems
    .flatMap(g=>numericValues(g,key))
    .sort((a,b)=>a-b);

  if (!numbers.length) return null;

  const sum=numbers.reduce((a,b)=>a+b,0);
  const middle=Math.floor(numbers.length/2);

  return {
    count:numbers.length,
    average:sum/numbers.length,
    median:numbers.length%2?
      numbers[middle]:
      (numbers[middle-1]+numbers[middle])/2,
    min:numbers[0],
    max:numbers[numbers.length-1]
  };
}

function numericDistribution(gems,key) {
  const numbers=gems.flatMap(
    g=>numericValues(g,key)
  );

  if (!numbers.length) return [];

  let bins;

  if (key==="mohs") {
    bins=[0,2,4,6,8,10];
  } else {
    const min=Math.min(...numbers);
    const max=Math.max(...numbers);

    if (min===max) {
      const members=gems.filter(g=>
        numericValues(g,key).includes(min)
      );

      return [{
        label:String(min),
        value:members.length,
        gemIds:members.map(g=>g.id)
      }];
    }

    bins=Array.from({length:7},(_,i)=>
      min+(max-min)*i/6
    );
  }

  return bins.slice(0,-1).map((low,i)=>{
    const high=bins[i+1];
    const last=i===bins.length-2;

    const members=gems.filter(g=>
      numericValues(g,key).some(n=>
        n>=low && (n<high ||
          (last && n<=high))
      )
    );

    return {
      label:`${formatNumber(low,2)}–${formatNumber(high,2)}`,
      value:members.length,
      gemIds:members.map(g=>g.id)
    };
  });
}

function currentDistribution(gems) {
  if (state.statDimension==="discoveryYear" ||
      state.statDimension==="mohs") {
    return numericDistribution(
      gems,state.statDimension);
  }

  return distribution(gems,state.statDimension);
}

function metric(count,total) {
  return state.statMetric==="percent" ?
    (total ? round(count/total*100,1):0)+"%" :
    String(count);
}

function statBarChart(data,total) {
  const max=Math.max(1,...data.map(d=>d.value));

  return `<div class="bar-chart">
    ${data.map((item,i)=>`
      <button class="bar-row"
        data-action="stat-detail"
        data-index="${i}">
        <span class="bar-label">
          ${esc(item.label)}
        </span>
        <span class="bar-track">
          <span class="bar-fill"
            style="width:${item.value/max*100}%"></span>
        </span>
        <span class="bar-value">
          ${metric(item.value,total)}
        </span>
      </button>
    `).join("")}
  </div>`;
}

function statDonut(data) {
  const total=data.reduce((n,d)=>n+d.value,0);
  if (!total) return empty("No chart data.");

  let position=0;

  const stops=data.map((item,i)=>{
    const start=position;
    position+=item.value/total*100;

    return `${CFG.chartColors[
      i%CFG.chartColors.length
    ]} ${start}% ${position}%`;
  }).join(",");

  return `<div class="donut-layout">
    <div class="donut-chart"
      style="background:conic-gradient(${stops})">
      <div class="donut-hole">
        <strong>${total}</strong>
        <small>Occurrences</small>
      </div>
    </div>
    <div class="donut-legend">
      ${data.map((d,i)=>`
        <div class="legend-row">
          <span class="legend-dot" style="background:
            ${CFG.chartColors[i%CFG.chartColors.length]}">
          </span>
          <span class="legend-label">${esc(d.label)}</span>
          <span class="legend-value">${d.value}</span>
        </div>
      `).join("")}
    </div>
  </div>`;
}

function statTreemap(data) {
  const total=data.reduce((n,d)=>n+d.value,0)||1;

  return `<div class="treemap">
    ${data.map((d,i)=>`
      <button class="treemap-item"
        data-action="stat-detail" data-index="${i}"
        style="flex-grow:${d.value};
          flex-basis:${Math.max(90,d.value/total*450)}px;
          background:${CFG.chartColors[
            i%CFG.chartColors.length
          ]}">
        <span>${esc(d.label)}</span>
        <strong>${d.value}</strong>
      </button>
    `).join("")}
  </div>
  <p class="chart-note">
    Treemap tile sizes are approximate.
  </p>`;
}

function statTable(data,total) {
  return `<div class="table-scroll">
    <table class="data-table">
      <thead><tr>
        <th>Category</th><th>Count</th>
        <th>% of Gems</th><th>Inspect</th>
      </tr></thead>
      <tbody>${data.map((d,i)=>`
        <tr>
          <td>${esc(d.label)}</td>
          <td>${d.value}</td>
          <td>${total ?
            round(d.value/total*100,1):0}%</td>
          <td><button class="link-button"
            data-action="stat-detail"
            data-index="${i}">View</button></td>
        </tr>
      `).join("")}</tbody>
    </table>
  </div>`;
}

function renderStatChart(data,total) {
  if (!data.length) {
    return empty("No values recorded for this property.");
  }

  switch (state.statChart) {
    case "donut":return statDonut(data);
    case "treemap":return statTreemap(data);
    case "table":return statTable(data,total);
    default:return statBarChart(data,total);
  }
}

function statDetails() {
  if (state.statDetail===null) {
    return `<div id="stat-detail"></div>`;
  }

  const data=currentDistribution(
    statisticsPopulation()
  );
  const item=data[state.statDetail];

  if (!item) return `<div id="stat-detail"></div>`;

  return `<div class="stat-detail" id="stat-detail">
    <strong>${esc(item.label)}</strong>
    <p class="chart-note">
      ${item.gemIds.length} matching gemstones
    </p>
    <div class="stat-detail-list">
      ${item.gemIds.map(id=>{
        const gem=getGem(id);
        return gem?gemButton(gem):"";
      }).join("")}
    </div>
  </div>`;
}

function buildCross(gems,a,b) {
  const rows=distribution(gems,a).slice(0,12);
  const columns=distribution(gems,b).slice(0,12);

  const cells=rows.map(row=>
    columns.map(col=>{
      const matches=gems.filter(g=>
        fieldContains(g,a,row.label) &&
        fieldContains(g,b,col.label)
      );

      return {
        count:matches.length,
        ids:matches.map(g=>g.id)
      };
    })
  );

  return {rows,columns,cells};
}

function renderCross() {
  const matrix=buildCross(
    statisticsPopulation(),
    state.statCrossA,
    state.statCrossB
  );

  if (!matrix.rows.length ||
      !matrix.columns.length) {
    return empty("Not enough data for cross-analysis.");
  }

  const max=Math.max(1,
    ...matrix.cells.flat().map(c=>c.count)
  );

  return `<div class="table-scroll">
    <table class="data-table cross-table">
      <thead><tr>
        <th>${esc(fieldLabel(state.statCrossA))}</th>
        ${matrix.columns.map(c=>`
          <th>${esc(c.label)}</th>
        `).join("")}
      </tr></thead>
      <tbody>
        ${matrix.rows.map((row,i)=>`
          <tr>
            <th>${esc(row.label)}</th>
            ${matrix.cells[i].map((cell,j)=>`
              <td class="cross-cell"
                style="background:rgba(83,100,81,
                ${round(.06+cell.count/max*.45,3)})">
                <button data-action="cross-detail"
                  data-row="${i}"
                  data-column="${j}">
                  ${cell.count||"·"}
                </button>
              </td>
            `).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>`;
}

function showCrossDetail(i,j) {
  const matrix=buildCross(
    statisticsPopulation(),
    state.statCrossA,
    state.statCrossB
  );

  const cell=matrix.cells[i]?.[j];
  const row=matrix.rows[i];
  const col=matrix.columns[j];

  if (!cell||!row||!col) return;

  $("#cross-detail").innerHTML=`
    <div class="stat-detail">
      <strong>${esc(row.label)} +
        ${esc(col.label)}</strong>
      <p class="chart-note">
        ${cell.count} matching gemstones
      </p>
      <div class="stat-detail-list">
        ${cell.ids.map(id=>{
          const gem=getGem(id);
          return gem?gemButton(gem):"";
        }).join("")}
      </div>
    </div>`;
}

function renderNumericOverview(gems) {
  const properties=[
    {key:"mohs",label:"Mohs Hardness"},
    {key:"discoveryYear",label:"Discovery Year"}
  ];

  return `<div class="table-scroll">
    <table class="data-table">
      <thead><tr>
        <th>Property</th><th>Recorded</th>
        <th>Average</th><th>Median</th>
        <th>Minimum</th><th>Maximum</th>
      </tr></thead>
      <tbody>
        ${properties.map(p=>{
          const s=numericSummary(gems,p.key);
          return `<tr>
            <td>${p.label}</td>
            <td>${s?.count??0}</td>
            <td>${s?formatNumber(s.average,2):"—"}</td>
            <td>${s?formatNumber(s.median,2):"—"}</td>
            <td>${s?formatNumber(s.min,2):"—"}</td>
            <td>${s?formatNumber(s.max,2):"—"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderStatistics() {
  const population=statisticsPopulation();
  const data=currentDistribution(population);
  const dimensions=[
    ...CFG.statisticsDimensions.filter(d=>d.key!=="mohs"),
    {key:"discoveryYear",label:"Discovery Year"},
    {key:"mohs",label:"Mohs Hardness"}
  ];

  const counted=data.reduce((n,d)=>n+d.value,0);

  return `<div class="page-heading">
    <div>
      <div class="eyebrow">LIBRARY ANALYTICS</div>
      <h1>Statistics</h1>
      <p>Compare categories, materials and
        geological characteristics.</p>
    </div>
  </div>

  <div class="panel" style="margin-bottom:18px">
    <div class="panel-title"><h2>Filters</h2></div>
    <div class="control-row">
      <div class="field search-field">
        <label>Search Within Statistics</label>
        <input id="stat-search" class="input"
          type="search" value="${esc(state.statSearch)}"
          placeholder="Search the collection...">
      </div>
      <div class="field">
        <label>Rarity</label>
        <select id="stat-rarity" class="select">
          ${options(CFG.rarities,
            state.statRarity,"All rarities")}
        </select>
      </div>
    </div>
  </div>

  <div class="stat-overview">
    ${[
      ["Gemstones",population.length],
      ["Mineral Species",
        distribution(population,"mineralSpecies").length],
      ["Countries",
        distribution(population,"countries").length],
      ["Mineral Groups",
        distribution(population,"mineralGroup").length]
    ].map(([label,value])=>`
      <div class="stat-tile">
        <div class="stat-tile-label">${label}</div>
        <div class="stat-tile-value">${value}</div>
      </div>
    `).join("")}
  </div>

  <div class="panel">
    <div class="panel-title">
      <h2>Category Analysis</h2>
    </div>
    <div class="control-row">
      <div class="field">
        <label>Property</label>
        <select id="stat-dimension" class="select">
          ${options(dimensions.map(d=>({
            value:d.key,label:d.label
          })),state.statDimension)}
        </select>
      </div>
      <div class="field">
        <label>Chart Type</label>
        <select id="stat-chart" class="select">
          ${options([
            {value:"bar",label:"Ranked Bar Chart"},
            {value:"donut",label:"Donut Chart"},
            {value:"treemap",label:"Treemap"},
            {value:"table",label:"Data Table"}
          ],state.statChart)}
        </select>
      </div>
      <div class="field">
        <label>Measurement</label>
        <select id="stat-metric" class="select">
          ${options([
            {value:"records",label:"Gemstone Count"},
            {value:"percent",label:"Percentage"}
          ],state.statMetric)}
        </select>
      </div>
    </div>

    ${renderStatChart(data,population.length)}

    <p class="chart-note">
      ${data.length} categories ·
      ${counted} recorded occurrences.
      One gemstone may appear in multiple categories.
    </p>

    ${statDetails()}
  </div>

  <div class="panel">
    <div class="panel-title">
      <h2>Cross-Analysis</h2>
    </div>
    <p class="section-description">
      Compare two properties across all filtered gemstones.
    </p>

    <div class="control-row">
      <div class="field">
        <label>Rows</label>
        <select id="cross-a" class="select">
          ${options(CFG.statisticsDimensions.map(d=>({
            value:d.key,label:d.label
          })),state.statCrossA)}
        </select>
      </div>
      <div class="field">
        <label>Columns</label>
        <select id="cross-b" class="select">
          ${options(CFG.statisticsDimensions.map(d=>({
            value:d.key,label:d.label
          })),state.statCrossB)}
        </select>
      </div>
    </div>

    <div id="cross-analysis">
      ${renderCross()}
    </div>

    <p class="chart-note">
      Up to twelve categories per axis.
      Select a cell to inspect its gemstones.
    </p>
    <div id="cross-detail"></div>
  </div>

  <div class="panel">
    <div class="panel-title">
      <h2>Numerical Properties</h2>
    </div>
    ${renderNumericOverview(population)}
  </div>

  <div class="panel">
    <div class="panel-title">
      <h2>Most Common Characteristics</h2>
    </div>
    <div class="panel-grid">
      ${[
        "classifications","mineralSpecies",
        "primaryMinerals","inclusions",
        "associatedMinerals","geologicalOrigin",
        "hostRocks","colors"
      ].map(key=>{
        const values=distribution(population,key)
          .slice(0,5);
        return `<div>
          <h3>${esc(fieldLabel(key))}</h3>
          ${values.length ?
            statBarChart(values,population.length) :
            `<p class="muted">No recorded values.</p>`}
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

/* ==========================================
   CENTRAL ACTION HANDLER
========================================== */

function handleAction(button) {
  const action=button.dataset.action;
  const id=button.dataset.id;

  switch(action) {
    case "new-gem":
      openEditor();
      break;

    case "go-library":
      navigate("library");
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

    case "compare-gem":
      state.compareA=id;
      state.compareB=state.gems.find(
        g=>g.id!==id
      )?.id||"";
      navigate("compare");
      break;

    case "compare-pair":
      state.compareA=button.dataset.a;
      state.compareB=button.dataset.b;
      navigate("compare");
      break;

    case "relations-gem":
      state.relationId=id;
      navigate("relations");
      break;

    case "relation-mode":
      state.relationMode=button.dataset.mode;
      render();
      break;

    case "add-value":
      addValue(button.dataset.field);
      break;

    case "remove-value":
      removeValue(
        button.dataset.field,
        Number(button.dataset.index)
      );
      break;

    case "add-link":
      addLink(button.dataset.field);
      break;

    case "recover-draft":
      recoverDraft();
      break;

    case "discard-draft":
      confirmAction(
        "Discard Draft",
        "Delete the locally saved draft?",
        ()=>{
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
      state.statDetail=Number(button.dataset.index);
      {
        const target=$("#stat-detail");
        if (target) target.outerHTML=statDetails();
      }
      break;

    case "cross-detail":
      showCrossDetail(
        Number(button.dataset.row),
        Number(button.dataset.column)
      );
      break;
  }
}

/* ==========================================
   EVENTS
========================================== */

function initializeEvents() {

  document.addEventListener("click",event=>{
    const nav=event.target.closest(
      "button[data-page]"
    );

    if (nav) {
      navigate(nav.dataset.page);
      return;
    }

    const action=event.target.closest(
      "button[data-action]"
    );

    if (action) {
      event.preventDefault();
      handleAction(action);
    }
  });

  $("#new-gem-button").addEventListener(
    "click",()=>openEditor()
  );

  $("#export-button").addEventListener(
    "click",exportLibrary
  );

  $("#import-button").addEventListener(
    "click",()=>$("#import-file").click()
  );

  $("#reset-button").addEventListener(
    "click",clearLibrary
  );

  $("#close-editor-button").addEventListener(
    "click",requestCloseEditor
  );

  $("#cancel-editor-button").addEventListener(
    "click",requestCloseEditor
  );

  $("#gem-form").addEventListener(
    "submit",submitEditor
  );

  $("#gem-form").addEventListener(
    "input",event=>{
      const input=event.target;

      if (input.name &&
          input.type!=="checkbox") {
        updateDraftInput(input);
      }
    }
  );

  $("#gem-form").addEventListener(
    "change",event=>{
      const input=event.target;

      if (input.dataset.flexToggle) {
        toggleMultiple(
          input.dataset.flexToggle,
          input.checked
        );
        return;
      }

      if (input.name) {
        updateDraftInput(input);
      }
    }
  );

  $("#gem-form").addEventListener(
    "keydown",event=>{
      if (event.key!=="Enter") return;

      const input=event.target.closest(
        "[data-add-input]"
      );

      if (input) {
        event.preventDefault();
        addValue(input.dataset.addInput);
      }
    }
  );

  main.addEventListener("change",event=>{
    const input=event.target;

    switch(input.id) {
      case "library-rarity":
        state.libraryRarity=input.value;
        renderLibraryResults();
        break;

      case "library-sort":
        state.librarySort=input.value;
        renderLibraryResults();
        break;

      case "compare-a":
        state.compareA=input.value;
        render();
        break;

      case "compare-b":
        state.compareB=input.value;
        render();
        break;

      case "relation-gem":
        state.relationId=input.value;
        render();
        break;

      case "relation-sort":
        state.relationSort=input.value;
        render();
        break;

      case "path-source":
        state.relationId=input.value;
        render();
        break;

      case "path-target":
        state.relationTarget=input.value;
        $("#relationship-path").innerHTML=
          renderPath();
        break;

      case "stat-rarity":
        state.statRarity=input.value;
        state.statDetail=null;
        render();
        break;

      case "stat-dimension":
        state.statDimension=input.value;
        state.statDetail=null;
        render();
        break;

      case "stat-chart":
        state.statChart=input.value;
        render();
        break;

      case "stat-metric":
        state.statMetric=input.value;
        render();
        break;

      case "cross-a":
        state.statCrossA=input.value;
        $("#cross-analysis").innerHTML=
          renderCross();
        $("#cross-detail").innerHTML="";
        break;

      case "cross-b":
        state.statCrossB=input.value;
        $("#cross-analysis").innerHTML=
          renderCross();
        $("#cross-detail").innerHTML="";
        break;
    }

    if (input.dataset.multiId) {
      const id=input.dataset.multiId;

      if (input.checked) {
        if (!state.multiIds.includes(id)) {
          state.multiIds.push(id);
        }
      } else {
        state.multiIds=state.multiIds.filter(
          value=>value!==id
        );
      }

      $("#multi-comparison").innerHTML=
        renderMultiComparison();
    }
  });

  main.addEventListener("input",event=>{
    const input=event.target;

    if (input.id==="library-search") {
      state.librarySearch=input.value;
      renderLibraryResults();
    }

    if (input.id==="family-filter") {
      state.relationFilter=input.value;
      const target=$("#family-tree");
      if (target) target.innerHTML=renderFamilyTree();
    }

    if (input.id==="stat-search") {
      state.statSearch=input.value;
      state.statDetail=null;

      clearTimeout(statTimer);

      statTimer=setTimeout(()=>{
        const caret=input.selectionStart;
        render();

        const restored=$("#stat-search");
        restored?.focus();

        try {
          restored?.setSelectionRange(caret,caret);
        } catch {}
      },300);
    }
  });

  $("#import-file").addEventListener(
    "change",async event=>{
      const file=event.target.files?.[0];
      await importLibrary(file);
      event.target.value="";
    }
  );

  $("#confirm-cancel").addEventListener(
    "click",closeConfirmation
  );

  $("#confirm-accept").addEventListener(
    "click",acceptConfirmation
  );

  document.addEventListener("keydown",event=>{
    if (event.key!=="Escape") return;

    if (!$("#confirm-overlay").classList.contains(
      "hidden"
    )) {
      closeConfirmation();
      return;
    }

    if (state.editorOpen) {
      requestCloseEditor();
    }
  });
}

/* ==========================================
   START
========================================== */

function initializeApp() {
  if (!CFG) {
    console.error("data.js failed to load.");
    return;
  }

  loadLibrary();
  refreshSelections();
  initializeEvents();
  render();

  console.info(
    "Gem Library V3 ready.",
    state.gems.length,
    "records loaded."
  );
}

if (document.readyState==="loading") {
  document.addEventListener(
    "DOMContentLoaded",initializeApp
  );
} else {
  initializeApp();
}
