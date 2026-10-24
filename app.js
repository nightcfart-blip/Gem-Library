
/* =========================================
   GEM ATLAS — APP.JS
   VERSION 2.0
   LIBRARY / ATLAS / STATISTICS /
   COMPARISON / RELATIONSHIP INTELLIGENCE
========================================= */

"use strict";

/* =========================================
   APPLICATION STATE
========================================= */

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const APP = {
  db: null,
  gems: [],
  persistenceAvailable: true,

  view: "library",
  quickFilter: "all",

  currentGemId: null,
  editingGem: null,
  activeTab: "identity",
  deleteId: null,
  toastTimer: null,

  compareIds: [],
  weights: { ...GEM_CONFIG.weights },

  inspector: null,
  network: {
    nodes: [],
    edges: [],
    scale: 1,
    x: 0,
    y: 0
  },

  pointer: null,
  suppressGraphClick: false,

  statisticsRows: [],
  statisticsCSV: "",
  statPopulation: []
};

const DB_NAME = "GemAtlasDatabase";
const DB_VERSION = 1;
const GEM_STORE = "gems";
const META_STORE = "metadata";

const PALETTE = [
  "#b3a5e9", "#81a9d9", "#d8b0c8",
  "#8abfb4", "#d3bb83", "#9788c8",
  "#c58ba1", "#82a1b0", "#d6a68b",
  "#9bbd91", "#8f89ad", "#d2c6e1"
];

/* =========================================
   UTILITIES
========================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valueAt(object, path) {
  return String(path).split(".").reduce(
    (value, key) => value?.[key], object
  );
}

function setAt(object, path, value) {
  const parts = path.split(".");
  let target = object;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]] ||
        typeof target[parts[i]] !== "object") {
      target[parts[i]] = {};
    }
    target = target[parts[i]];
  }

  target[parts[parts.length - 1]] = value;
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "gem-" + Date.now().toString(36) + "-" +
    Math.random().toString(36).slice(2);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function norm(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return !!value.trim();
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(isFilled);
  return isFilled(value) ? [value] : [];
}

function uniqueValues(values) {
  const seen = new Set();

  return values.filter(value => {
    const key = norm(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function textArray(value) {
  return String(value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function arrayText(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "");
}

function numeric(value) {
  if (value === "" || value === null ||
      value === undefined) return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(digits)).toLocaleString("en-US");
}

function formatRange(min, max, unit = "") {
  const a = numeric(min);
  const b = numeric(max);

  if (a === null && b === null) return "";

  const suffix = unit ? " " + unit : "";

  if (a === null) return formatNumber(b, 3) + suffix;
  if (b === null) return formatNumber(a, 3) + suffix;

  if (a === b) return formatNumber(a, 3) + suffix;

  return formatNumber(a, 3) + "–" +
    formatNumber(b, 3) + suffix;
}

function validColor(hex) {
  return /^#[0-9a-f]{6}$/i.test(hex || "")
    ? hex : "#b8a3e8";
}

function rgba(hex, alpha) {
  const h = validColor(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function gemColor(gem) {
  return validColor(gem?.appearance?.color);
}

function gemStyle(gem) {
  const hex = gemColor(gem);
  return `--gem-color:${hex};--gem-glow:${rgba(hex, .34)}`;
}

function findGem(id) {
  return APP.gems.find(gem => gem.id === id);
}

function sortGems(gems) {
  return [...gems].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function showToast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");

  clearTimeout(APP.toastTimer);
  APP.toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2900);
}

function setBodyLock() {
  document.body.classList.toggle(
    "modal-open",
    $$(".modal-backdrop").some(el =>
      el.classList.contains("is-open")
    )
  );
}

function openLayer(selector) {
  const el = $(selector);
  el.classList.add("is-open");
  el.setAttribute("aria-hidden", "false");
  setBodyLock();
}

function closeLayer(selector) {
  const el = $(selector);
  el.classList.remove("is-open");
  el.setAttribute("aria-hidden", "true");
  setBodyLock();
}

function downloadable(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function csvCell(value) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

function csvText(rows) {
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

/* =========================================
   INDEXEDDB
   KEEP V1 DATABASE NAME AND VERSION
========================================= */

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(GEM_STORE)) {
        db.createObjectStore(GEM_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Database blocked"));
  });
}

function dbTransaction(storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = APP.db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let result;

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    try {
      operation(store, value => { result = value; });
    } catch (error) {
      try { tx.abort(); } catch (_) {}
      reject(error);
    }
  });
}

function dbGetAll() {
  return dbTransaction(GEM_STORE, "readonly", (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done(request.result);
  });
}

function dbGetMeta(key) {
  return dbTransaction(META_STORE, "readonly", (store, done) => {
    const request = store.get(key);
    request.onsuccess = () => done(request.result);
  });
}

function dbSaveGem(gem) {
  return dbTransaction(GEM_STORE, "readwrite", store => {
    store.put(clone(gem));
  });
}

function dbDeleteGem(id) {
  return dbTransaction(GEM_STORE, "readwrite", store => {
    store.delete(id);
  });
}

async function seedDatabase() {
  const existing = await dbGetAll();
  const marker = await dbGetMeta("seeded");

  if (existing.length || marker?.value) return;

  await new Promise((resolve, reject) => {
    const tx = APP.db.transaction(
      [GEM_STORE, META_STORE], "readwrite"
    );

    const gemStore = tx.objectStore(GEM_STORE);
    const now = new Date().toISOString();

    for (const record of GEM_SEED_DATA) {
      const gem = normalizeGem(record);
      gem.createdAt = now;
      gem.updatedAt = now;
      gemStore.put(gem);
    }

    tx.objectStore(META_STORE).put({
      key: "seeded",
      value: true
    });

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function loadCollection() {
  if (APP.persistenceAvailable) {
    APP.gems = (await dbGetAll()).map(normalizeGem);
  } else {
    APP.gems = GEM_SEED_DATA.map(normalizeGem);
  }

  renderAll();
}

/* =========================================
   COLLECTION SUMMARY
========================================= */

function renderSummary() {
  const species = new Set(
    APP.gems.map(g => norm(g.family.species))
      .filter(Boolean)
  );

  $("#statTotal").textContent = APP.gems.length;
  $("#statFamilies").textContent = species.size;

  $("#statRare").textContent = APP.gems.filter(g =>
    g.rarity === "Rare" || g.rarity === "Exotic"
  ).length;

  $("#statLinks").textContent =
    allRelationshipPairs().length;
}

/* =========================================
   LIBRARY SEARCH
========================================= */

function searchableText(gem) {
  return [
    gem.name, gem.nickname, ...gem.names,
    gem.description, gem.rarity, gem.originType,
    ...gem.classifications,
    gem.family.group, gem.family.species,
    gem.family.varietyOf,
    gem.chemical.formula,
    ...gem.chemical.traceElements,
    ...gem.colors.map(c => c.name),
    ...gem.geography.countries,
    ...gem.geography.localities,
    ...gem.history.cultures,
    ...gem.associations.zodiac,
    ...gem.associations.birthstone,
    ...gem.symbolism.meanings,
    ...gem.symbolism.chakras,
    ...gem.personal.keywords
  ].join(" ").toLocaleLowerCase();
}

function filteredGems() {
  const query = norm($("#searchInput").value);
  const rarity = $("#rarityFilter").value;
  const classification = $("#classFilter").value;
  const sort = $("#sortFilter").value;

  const rank = {
    Common: 0, Uncommon: 1, Rare: 2, Exotic: 3
  };

  const result = APP.gems.filter(g => {
    if (query && !searchableText(g).includes(query)) return false;
    if (rarity && g.rarity !== rarity) return false;

    if (classification &&
        !g.classifications.includes(classification)) {
      return false;
    }

    if (APP.quickFilter === "favorites" && !g.favorite)
      return false;

    if (APP.quickFilter === "natural" &&
        g.originType !== "Natural") return false;

    if (APP.quickFilter === "synthetic" &&
        g.originType !== "Synthetic") return false;

    if (APP.quickFilter === "organic" &&
        !g.classifications.includes("Organic")) return false;

    return true;
  });

  result.sort((a, b) => {
    if (sort === "name-desc")
      return b.name.localeCompare(a.name);

    if (sort === "rarity")
      return (rank[b.rarity] ?? -1) -
             (rank[a.rarity] ?? -1);

    if (sort === "hardness")
      return (numeric(b.physical.mohsMax) ?? -1) -
             (numeric(a.physical.mohsMax) ?? -1);

    if (sort === "newest")
      return String(b.createdAt).localeCompare(
        String(a.createdAt)
      );

    if (sort === "oldest")
      return String(a.createdAt).localeCompare(
        String(b.createdAt)
      );

    return a.name.localeCompare(b.name);
  });

  return result;
}

function cardImage(gem) {
  if (gem.images.cover) {
    return `<img src="${escapeHTML(gem.images.cover)}"
      alt="${escapeHTML(gem.name)}" loading="lazy">`;
  }

  return `<div class="gem-placeholder"><span>◇</span></div>`;
}

function renderCard(gem) {
  const family = gem.family.varietyOf ||
    gem.family.species ||
    gem.family.group ||
    "Unclassified material";

  return `
    <article class="gem-card"
      data-gem-id="${escapeHTML(gem.id)}"
      style="${gemStyle(gem)}"
      role="button" tabindex="0">

      <div class="gem-card-image">
        ${cardImage(gem)}

        <button type="button"
          class="favorite-button ${gem.favorite ? "is-favorite" : ""}"
          data-favorite="${escapeHTML(gem.id)}"
          aria-label="Toggle favorite">
          ${gem.favorite ? "♥" : "♡"}
        </button>

        ${gem.rarity ? `<span class="card-rarity">
          ${escapeHTML(gem.rarity)}</span>` : ""}
      </div>

      <div class="gem-card-body">
        <h3 class="gem-card-title">${escapeHTML(gem.name)}</h3>
        <p class="gem-card-family">${escapeHTML(family)}</p>

        <div class="gem-card-details">
          <div class="card-detail">
            <span class="card-detail-label">MOHS</span>
            <span class="card-detail-value">
              ${escapeHTML(formatRange(
                gem.physical.mohsMin,
                gem.physical.mohsMax
              ) || "—")}
            </span>
          </div>

          <div class="card-detail">
            <span class="card-detail-label">COLORS</span>
            <span class="card-detail-value">
              ${gem.colors.length}
            </span>
          </div>

          <div class="card-detail">
            <span class="card-detail-label">ORIGIN</span>
            <span class="card-detail-value">
              ${escapeHTML(gem.originType || "—")}
            </span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderLibrary() {
  const visible = filteredGems();

  $("#gemGrid").innerHTML = visible.map(renderCard).join("");
  $("#libraryCount").textContent =
    `${visible.length} ${visible.length === 1 ? "ENTRY" : "ENTRIES"}`;

  $("#emptyState").hidden = visible.length !== 0;
}

function resetFilters() {
  $("#searchInput").value = "";
  $("#rarityFilter").value = "";
  $("#classFilter").value = "";
  $("#sortFilter").value = "name";

  APP.quickFilter = "all";

  $$(".filter-chip").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === "all"
    );
  });

  renderLibrary();
}

/* =========================================
   PROFILE PROPERTY DISPLAY
========================================= */

function property(label, value, full = false) {
  if (!isFilled(value)) return "";

  return `<div class="property-item ${full ? "full" : ""}">
    <span class="property-label">${escapeHTML(label)}</span>
    <div class="property-value">${escapeHTML(arrayText(value))}</div>
  </div>`;
}

function profileSection(title, content, note = "") {
  if (!content.trim()) return "";

  return `<section class="profile-section">
    <div class="profile-section-title">
      ${escapeHTML(title)}
    </div>
    <div class="property-grid">${content}</div>
    ${note ? `<div class="profile-note">
      ${escapeHTML(note)}</div>` : ""}
  </section>`;
}

function profileProperties(gem) {
  const groups = [
    ["Identity & Classification", [
      ["Alternative Names", gem.names],
      ["Material Origin", gem.originType],
      ["Classifications", gem.classifications, true],
      ["Rarity", gem.rarity],
      ["Rarity Explanation", gem.rarityReason, true]
    ]],

    ["Mineral Family", [
      ["Mineral Group", gem.family.group],
      ["Mineral Species", gem.family.species],
      ["Parent Mineral", gem.family.varietyOf],
      ["Related Gems", gem.family.related, true],
      ["Variety Difference", gem.family.varietyDifference, true],
      ["Family Notes", gem.family.notes, true]
    ]],

    ["Chemical Composition", [
      ["Formula", gem.chemical.formula],
      ["Trace Elements", gem.chemical.traceElements],
      ["Composition", gem.chemical.composition, true],
      ["Color Causes", gem.chemical.colorCauses, true],
      ["Additional Information", gem.chemical.notes, true]
    ]],

    ["Physical Properties", [
      ["Mohs Hardness", formatRange(
        gem.physical.mohsMin, gem.physical.mohsMax
      )],
      ["Density", formatRange(
        gem.physical.densityMin,
        gem.physical.densityMax, "g/cm³"
      )],
      ["Crystal System", gem.physical.crystalSystem],
      ["Cleavage", gem.physical.cleavage],
      ["Fracture", gem.physical.fracture],
      ["Streak", gem.physical.streak],
      ["Tenacity", gem.physical.tenacity]
    ]],

    ["Optical Properties", [
      ["Luster", gem.optical.luster],
      ["Transparency", gem.optical.transparency],
      ["Refractive Index", gem.optical.refractiveIndex],
      ["Birefringence", gem.optical.birefringence],
      ["Luminescence", gem.optical.luminescence, true],
      ["Pleochroism", gem.optical.pleochroism, true],
      ["Dispersion", gem.optical.dispersion],
      ["Other Effects", gem.optical.other, true]
    ]],

    ["Geographic Distribution", [
      ["Countries", gem.geography.countries, true],
      ["Localities", gem.geography.localities, true],
      ["Formation", gem.geography.geology, true],
      ["Mining Notes", gem.geography.miningNotes, true]
    ]],

    ["Discovery & History", [
      ["Discovery Year", gem.discovery.year],
      ["Discovery Location", gem.discovery.origin],
      ["Discoverer", gem.discovery.person],
      ["Discovery Country", gem.discovery.country],
      ["Namesake", gem.discovery.namesake, true],
      ["Oldest Specimen", gem.discovery.oldestSpecimen, true],
      ["Further Discoveries", gem.discovery.further, true],
      ["Historical Cultures", gem.history.cultures, true],
      ["Historical Facts", gem.history.facts, true],
      ["Timeline", gem.history.timeline, true]
    ]],

    ["Astrological & Traditional Associations", [
      ["Zodiac", gem.associations.zodiac],
      ["Planetary", gem.associations.planetary],
      ["Birthstone", gem.associations.birthstone],
      ["Anniversary", gem.associations.anniversary],
      ["Substitute Roles", gem.associations.substitutes, true],
      ["Systems", gem.associations.systemNotes, true]
    ]],

    ["Symbolism & Meaning", [
      ["Meanings", gem.symbolism.meanings, true],
      ["Chakras", gem.symbolism.chakras],
      ["Traditional Properties", gem.symbolism.properties, true],
      ["Notes", gem.symbolism.notes, true]
    ]],

    ["Traditional Healing Beliefs", [
      ["Physical", gem.healing.physical, true],
      ["Emotional", gem.healing.emotional, true],
      ["Spiritual", gem.healing.spiritual, true],
      ["Tradition", gem.healing.tradition, true]
    ]],

    ["Market Value", [
      ["Price per Carat", formatRange(
        gem.market.minPrice, gem.market.maxPrice,
        gem.market.currency || ""
      )],
      ["Quality Basis", gem.market.quality, true],
      ["Treatments", gem.market.treatments, true],
      ["Market Notes", gem.market.notes, true],
      ["Price Date", gem.market.priceDate]
    ]],

    ["References & Personal Archive", [
      ["Sources", gem.sources.references, true],
      ["Confidence", gem.sources.confidence],
      ["Source Notes", gem.sources.notes, true],
      ["Personal Opinion", gem.personal.opinion, true],
      ["Personal Notes", gem.personal.notes, true],
      ["Keywords", gem.personal.keywords, true],
      ["Relationship Notes", gem.relationshipNotes, true]
    ]]
  ];

  let output = "";

  for (const [title, rows] of groups) {
    const content = rows.map(row => property(...row)).join("");

    const note = title === "Traditional Healing Beliefs"
      ? "These entries document cultural beliefs, not verified medical effects."
      : "";

    output += profileSection(title, content, note);

    if (title === "Optical Properties" && gem.colors.length) {
      output += `<section class="profile-section">
        <div class="profile-section-title">Color Variations</div>
        <div class="color-display-list">
          ${gem.colors.map(c => `
            <div class="color-display">
              <span class="color-dot"></span>
              <div>
                <div class="color-name">${escapeHTML(c.name)}</div>
                <div class="color-frequency">
                  ${escapeHTML(c.rarity || "Unspecified")}
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>`;
    }
  }

  const connected = allRelationshipPairs()
    .filter(pair =>
      pair.a.id === gem.id || pair.b.id === gem.id
    )
    .slice(0, 10);

  if (connected.length) {
    output += profileSection(
      "Related Gemstones",
      connected.map(pair => {
        const other = pair.a.id === gem.id ? pair.b : pair.a;
        return `<div class="property-item">
          <button class="inspector-button"
            type="button"
            data-open-gem="${escapeHTML(other.id)}">
            ${escapeHTML(other.name)} · ${pair.score}%
          </button>
        </div>`;
      }).join(""),
      "Scores compare recorded properties; they are not mineralogical certainty."
    );
  }

  return output;
}

function openProfile(id) {
  const gem = findGem(id);
  if (!gem) return;

  APP.currentGemId = id;
  const banner = gem.images.banner || gem.images.cover;

  $("#profileContent").innerHTML = `
    <div style="${gemStyle(gem)}">

      <div class="profile-hero">
        <div class="profile-banner">
          ${banner ? `<img src="${escapeHTML(banner)}" alt="">` : ""}
        </div>

        <div class="profile-top-actions">
          <button class="icon-button"
            data-profile-action="edit"
            type="button" title="Edit">✎</button>

          <button class="icon-button"
            data-profile-action="close"
            type="button" title="Close">×</button>
        </div>

        <div class="profile-hero-content">
          <div class="profile-overline">
            ${escapeHTML(
              gem.family.species ||
              gem.family.group ||
              "Gemstone Archive"
            )}
          </div>

          <h2 class="profile-name">
            ${escapeHTML(gem.name)}
          </h2>

          ${gem.nickname ? `
            <div class="profile-nicknames">
              ${escapeHTML(gem.nickname)}
            </div>` : ""}

          <div class="profile-tags">
            ${[gem.rarity, ...gem.classifications]
              .filter(Boolean)
              .map((tag, i) => `<span class="tag ${i === 0 ? "gold" : ""}">
                ${escapeHTML(tag)}</span>`)
              .join("")}
          </div>
        </div>
      </div>

      <div class="profile-content">
        ${gem.description ? `<p class="profile-description">
          ${escapeHTML(gem.description)}</p>` : ""}

        ${profileProperties(gem)}

        <div class="profile-bottom-actions">
          <button class="primary-button"
            data-profile-action="edit" type="button">
            ✎ Edit Gemstone
          </button>

          <button class="secondary-button"
            data-profile-action="compare" type="button">
            ⚖ Compare
          </button>

          <button class="secondary-button"
            data-profile-action="atlas" type="button">
            ◎ Atlas
          </button>

          <button class="secondary-button"
            data-profile-action="duplicate" type="button">
            Duplicate
          </button>

          <button class="danger-button"
            data-profile-action="delete" type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;

  $("#profileModal").scrollTop = 0;
  openLayer("#profileBackdrop");
}

function closeProfile() {
  closeLayer("#profileBackdrop");
  APP.currentGemId = null;
}

/* =========================================
   GEMSTONE EDITOR
========================================= */

function renderField(field, gem) {
  const value = valueAt(gem, field.path);
  const path = escapeHTML(field.path);
  const placeholder = escapeHTML(field.placeholder || "");

  let input = "";

  if (field.type === "textarea") {
    input = `<textarea data-path="${path}"
      placeholder="${placeholder}">${escapeHTML(value)}</textarea>`;
  } else if (field.type === "tags") {
    input = `<input type="text"
      data-path="${path}" data-value-type="tags"
      value="${escapeHTML(arrayText(value))}"
      placeholder="Separate entries with commas">`;
  } else if (field.type === "number") {
    input = `<input type="number"
      data-path="${path}" data-value-type="number"
      step="${field.step ?? "any"}"
      ${field.min !== undefined ? `min="${field.min}"` : ""}
      ${field.max !== undefined ? `max="${field.max}"` : ""}
      value="${value === null || value === undefined
        ? "" : escapeHTML(value)}">`;
  } else if (field.type === "select") {
    input = `<select data-path="${path}">
      ${field.options.map(option => `
        <option value="${escapeHTML(option)}"
          ${option === value ? "selected" : ""}>
          ${escapeHTML(option || "Not specified")}
        </option>`).join("")}
    </select>`;
  } else {
    input = `<input type="text"
      data-path="${path}"
      value="${escapeHTML(value)}"
      placeholder="${placeholder}"
      ${field.required ? "required" : ""}>`;
  }

  return `<div class="editor-field ${field.wide ? "wide" : ""}">
    <label>${escapeHTML(field.label)}${field.required ? " *" : ""}</label>
    ${input}
    ${field.hint ? `<span class="field-hint">
      ${escapeHTML(field.hint)}</span>` : ""}
  </div>`;
}

function renderClassifications(gem) {
  return `<div class="checkbox-collection">
    ${GEM_CONFIG.classifications.map(name => `
      <label class="classification-option">
        <input type="checkbox"
          data-classification="${escapeHTML(name)}"
          ${gem.classifications.includes(name) ? "checked" : ""}>
        <span>${escapeHTML(name)}</span>
      </label>
    `).join("")}
  </div>`;
}

function renderImageEditor(gem) {
  const imageField = (type, title) => `
    <div class="editor-field wide">
      <div class="field-label">${title}</div>

      <div class="editor-image-preview">
        ${gem.images[type]
          ? `<img src="${escapeHTML(gem.images[type])}" alt="">`
          : "No image selected"}
      </div>

      <div class="image-actions">
        <label class="image-upload-label">
          ＋ Choose from Gallery
          <input type="file"
            class="upload-input"
            accept="image/*"
            data-image-type="${type}">
        </label>

        <button class="image-remove"
          type="button"
          data-remove-image="${type}">
          Remove Image
        </button>
      </div>
    </div>`;

  return `<div class="editor-field-grid">
    ${imageField("cover", "Library Cover Image")}
    ${imageField("banner", "Profile Banner Image")}
    <div class="editor-field wide">
      <p class="field-hint">
        Gemstone colors are entered under Science → Gemstone Colors.
        No color picker is required.
      </p>
    </div>
  </div>`;
}

function renderColorEditor(gem) {
  return `
    <div class="color-editor-list">
      ${gem.colors.map((color, index) => `
        <div class="color-editor-row" data-color-index="${index}">
          <input type="text"
            data-color-field="name"
            value="${escapeHTML(color.name)}"
            placeholder="e.g. Deep Violet"
            aria-label="Gemstone color">

          <select data-color-field="rarity"
            aria-label="Color rarity">
            ${GEM_CONFIG.colorRarities.map(level => `
              <option value="${escapeHTML(level)}"
                ${level === color.rarity ? "selected" : ""}>
                ${escapeHTML(level)}
              </option>
            `).join("")}
          </select>

          <button type="button"
            class="remove-color"
            data-remove-color="${index}"
            aria-label="Remove color">×</button>
        </div>
      `).join("")}
    </div>

    <button type="button"
      class="add-row-button"
      id="addColorRow">
      ＋ Add Color Variation
    </button>

    <p class="color-editor-hint">
      Enter color names exactly as you want them recorded.
      Overall gemstone rarity and individual color rarity are separate.
    </p>
  `;
}

function renderManualEditor(gem) {
  const candidates = sortGems(APP.gems)
    .filter(g => g.id !== gem.id);

  return `
    <div class="manual-editor-list">
      ${gem.manualRelations.map((relation, index) => `
        <div class="manual-row" data-manual-index="${index}">

          <select data-manual-field="targetId"
            aria-label="Connected gemstone">
            <option value="">Choose gemstone</option>
            ${candidates.map(g => `
              <option value="${escapeHTML(g.id)}"
                ${relation.targetId === g.id ? "selected" : ""}>
                ${escapeHTML(g.name)}
              </option>
            `).join("")}
          </select>

          <select data-manual-field="type"
            aria-label="Relationship type">
            ${GEM_CONFIG.relationshipTypes.map(type => `
              <option value="${escapeHTML(type)}"
                ${relation.type === type ? "selected" : ""}>
                ${escapeHTML(type)}
              </option>
            `).join("")}
          </select>

          <button type="button"
            class="remove-manual"
            data-remove-manual="${index}">×</button>

          <textarea data-manual-field="note"
            placeholder="Explain the relationship">${escapeHTML(
              relation.note
            )}</textarea>

        </div>
      `).join("")}
    </div>

    <button type="button"
      class="add-row-button"
      id="addManualRow">
      ＋ Add Manual Relationship
    </button>

    <p class="field-hint" style="margin-top:13px">
      Manual links refer to gemstone IDs, so changing a gemstone's
      name will not break its connections.
      A user-entered relationship is not automatically verified.
    </p>
  `;
}

function renderEditorTabs() {
  $("#editorTabs").innerHTML = GEM_CONFIG.editorTabs.map(tab => `
    <button type="button"
      class="editor-tab ${tab.id === APP.activeTab ? "active" : ""}"
      data-editor-tab="${tab.id}">
      ${escapeHTML(tab.label)}
    </button>
  `).join("");
}

function renderEditorFields() {
  if (!APP.editingGem) return;

  const tab = GEM_CONFIG.editorTabs.find(t =>
    t.id === APP.activeTab
  );

  if (!tab) return;

  $("#editorFields").innerHTML = tab.groups.map(group => {
    let body;

    switch (group.special) {
      case "classifications":
        body = renderClassifications(APP.editingGem);
        break;
      case "images":
        body = renderImageEditor(APP.editingGem);
        break;
      case "colors":
        body = renderColorEditor(APP.editingGem);
        break;
      case "manual":
        body = renderManualEditor(APP.editingGem);
        break;
      default:
        body = `<div class="editor-field-grid">
          ${group.fields.map(field =>
            renderField(field, APP.editingGem)
          ).join("")}
        </div>`;
    }

    return `<section class="editor-group">
      <div class="editor-group-heading">
        ${escapeHTML(group.title)}
      </div>
      <p class="editor-group-description">
        ${escapeHTML(group.description || "")}
      </p>
      ${body}
    </section>`;
  }).join("");

  $("#editorFields").scrollTop = 0;
}

function setEditorTab(id) {
  APP.activeTab = id;
  renderEditorTabs();
  renderEditorFields();
}

function openEditor(id = null) {
  const existing = id ? findGem(id) : null;

  APP.editingGem = existing
    ? clone(existing)
    : createEmptyGem();

  if (!existing) APP.editingGem.id = uid();

  APP.activeTab = "identity";
  $("#editorTitle").textContent = existing
    ? "Edit " + existing.name
    : "New Gemstone";

  renderEditorTabs();
  renderEditorFields();
  openLayer("#editorBackdrop");
}

function closeEditor() {
  closeLayer("#editorBackdrop");
  APP.editingGem = null;
}

function updateEditorValue(target) {
  if (!APP.editingGem || !target.dataset.path) return;

  let value = target.value;

  if (target.dataset.valueType === "tags")
    value = textArray(value);

  if (target.dataset.valueType === "number")
    value = numeric(value);

  setAt(APP.editingGem, target.dataset.path, value);
}

function updateColorValue(target) {
  const row = target.closest("[data-color-index]");
  if (!row || !APP.editingGem) return;

  const color = APP.editingGem.colors[
    Number(row.dataset.colorIndex)
  ];

  if (color) color[target.dataset.colorField] = target.value;
}

function updateManualValue(target) {
  const row = target.closest("[data-manual-index]");
  if (!row || !APP.editingGem) return;

  const relation = APP.editingGem.manualRelations[
    Number(row.dataset.manualIndex)
  ];

  if (relation) {
    relation[target.dataset.manualField] = target.value;
  }
}

function imageToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type.startsWith("image/")) {
      reject(new Error("Please select an image"));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(
      new Error("Image could not be read")
    );

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(
        new Error("Image could not be opened")
      );

      image.onload = () => {
        const scale = Math.min(
          1, 1600 / Math.max(
            image.naturalWidth, image.naturalHeight
          )
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1,
          Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1,
          Math.round(image.naturalHeight * scale));

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        try {
          resolve(canvas.toDataURL("image/jpeg", .82));
        } catch (error) {
          reject(error);
        }
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

async function handleImageUpload(input) {
  const draft = APP.editingGem;
  const file = input.files?.[0];
  const type = input.dataset.imageType;

  if (!draft || !file) return;

  try {
    const result = await imageToDataURL(file);

    if (APP.editingGem !== draft) return;

    draft.images[type] = result;
    renderEditorFields();
    showToast("Image added to draft");
  } catch (error) {
    console.error(error);
    showToast("Image could not be processed");
  }
}

async function saveEditingGem() {
  if (!APP.editingGem) return;

  const gem = normalizeGem(clone(APP.editingGem));
  gem.name = gem.name.trim();

  if (!gem.name) {
    setEditorTab("identity");
    showToast("Please enter a gemstone name");
    return;
  }

  const p = gem.physical;

  const invalidMohs = [p.mohsMin, p.mohsMax].some(
    value => numeric(value) !== null &&
      (Number(value) < 0 || Number(value) > 10)
  );

  if (invalidMohs ||
    (numeric(p.mohsMin) !== null &&
     numeric(p.mohsMax) !== null &&
     p.mohsMin > p.mohsMax)) {
    setEditorTab("science");
    showToast("Please check the Mohs hardness range");
    return;
  }

  if (numeric(p.densityMin) !== null &&
      numeric(p.densityMax) !== null &&
      p.densityMin > p.densityMax) {
    setEditorTab("science");
    showToast("Density minimum exceeds maximum");
    return;
  }

  gem.colors = gem.colors.filter(c => norm(c.name));

  gem.manualRelations = gem.manualRelations.filter(
    relation => relation.targetId &&
      relation.targetId !== gem.id &&
      !!findGem(relation.targetId)
  );

  const now = new Date().toISOString();
  gem.createdAt = findGem(gem.id)?.createdAt || now;
  gem.updatedAt = now;

  if (APP.persistenceAvailable) {
    try {
      await dbSaveGem(gem);
    } catch (error) {
      console.error(error);
      showToast("Save failed — check browser storage");
      return;
    }
  }

  const index = APP.gems.findIndex(g => g.id === gem.id);

  if (index < 0) APP.gems.push(gem);
  else APP.gems[index] = gem;

  closeEditor();
  renderAll();
  openProfile(gem.id);

  showToast(APP.persistenceAvailable
    ? "Gemstone saved"
    : "Saved for this session only");
}

async function toggleFavorite(id) {
  const gem = findGem(id);
  if (!gem) return;

  const updated = clone(gem);
  updated.favorite = !updated.favorite;
  updated.updatedAt = new Date().toISOString();

  try {
    if (APP.persistenceAvailable) await dbSaveGem(updated);
    Object.assign(gem, updated);
    renderAll();
  } catch (error) {
    console.error(error);
    showToast("Favorite could not be saved");
  }
}

async function duplicateGem(id) {
  const original = findGem(id);
  if (!original) return;

  const copy = clone(original);

  copy.id = uid();
  copy.name += " (Copy)";
  copy.favorite = false;
  copy.manualRelations = [];

  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;

  try {
    if (APP.persistenceAvailable) await dbSaveGem(copy);
    APP.gems.push(copy);

    closeProfile();
    renderAll();
    openProfile(copy.id);
    showToast("Gemstone duplicated");
  } catch (error) {
    console.error(error);
    showToast("Duplicate failed");
  }
}

function requestDelete(id) {
  const gem = findGem(id);
  if (!gem) return;

  APP.deleteId = id;

  $("#confirmTitle").textContent = "Delete gemstone?";
  $("#confirmMessage").textContent =
    `"${gem.name}" will be removed from your collection.`;

  openLayer("#confirmBackdrop");
}

async function executeDelete() {
  const id = APP.deleteId;
  if (!id) return;

  try {
    const affected = APP.gems
      .filter(g => g.id !== id &&
        g.manualRelations.some(r => r.targetId === id))
      .map(g => {
        const copy = clone(g);
        copy.manualRelations = copy.manualRelations.filter(
          r => r.targetId !== id
        );
        return copy;
      });

    if (APP.persistenceAvailable) {
      // One transaction ensures deletion and link cleanup
      // either complete together or fail together.
      await new Promise((resolve, reject) => {
        const tx = APP.db.transaction(GEM_STORE, "readwrite");
        const store = tx.objectStore(GEM_STORE);

        store.delete(id);
        affected.forEach(g => store.put(g));

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }

    APP.gems = APP.gems.filter(g => g.id !== id);

    for (const updated of affected) {
      const original = findGem(updated.id);
      if (original) Object.assign(original, updated);
    }

    APP.compareIds = APP.compareIds.filter(x => x !== id);
    APP.deleteId = null;

    closeLayer("#confirmBackdrop");
    closeProfile();
    renderAll();

    showToast("Gemstone deleted");
  } catch (error) {
    console.error(error);
    showToast("Deletion failed");
  }
}

/* =========================================
   RELATIONSHIP INTELLIGENCE
========================================= */

/*
  Scores are collection-specific similarity
  indices, not scientific probabilities.

  Rules:
  - Blank fields never match.
  - Scientific identity is kept separate
    from location/history/tradition.
  - Weak evidence cannot replace identity.
  - Manual relationships are explicitly labeled.
  - Numerical properties use real distances.
*/

function overlapValues(a, b) {
  const left = uniqueValues(asArray(a));
  const right = new Set(asArray(b).map(norm));

  return left.filter(value => right.has(norm(value)));
}

function sameValue(a, b) {
  return isFilled(a) && isFilled(b) &&
    norm(a) === norm(b);
}

function midpoint(min, max) {
  const a = numeric(min), b = numeric(max);

  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;

  return (a + b) / 2;
}

function evidenceBetween(a, b) {
  const evidence = [];

  const add = (group, label, details, strength) => {
    evidence.push({
      group, label, details: String(details),
      strength: Math.min(1, Math.max(0, strength))
    });
  };

  // SCIENTIFIC IDENTITY
  if (sameValue(a.family.species, b.family.species)) {
    add("science", "Same mineral species",
      a.family.species, 1);
  } else if (sameValue(a.family.group, b.family.group)) {
    add("science", "Same mineral group",
      a.family.group, .35);
  }

  if (sameValue(a.family.varietyOf, b.family.varietyOf)) {
    add("science", "Shared parent mineral",
      a.family.varietyOf, .8);
  }

  if (sameValue(a.chemical.formula, b.chemical.formula)) {
    add("science", "Matching recorded formula",
      a.chemical.formula, .75);
  }

  const elements = overlapValues(
    a.chemical.traceElements,
    b.chemical.traceElements
  );

  if (elements.length) {
    add("science", "Shared trace elements",
      elements.join(", "), Math.min(.55, .2 + elements.length * .1));
  }

  if (sameValue(
    a.physical.crystalSystem,
    b.physical.crystalSystem
  ) && !["unknown", "not applicable"].includes(
    norm(a.physical.crystalSystem)
  )) {
    add("science", "Shared crystal system",
      a.physical.crystalSystem, .25);
  }

  const ha = midpoint(
    a.physical.mohsMin, a.physical.mohsMax
  );

  const hb = midpoint(
    b.physical.mohsMin, b.physical.mohsMax
  );

  if (ha !== null && hb !== null) {
    const delta = Math.abs(ha - hb);

    if (delta <= .5) {
      add("science", "Similar hardness",
        `${formatNumber(ha)} and ${formatNumber(hb)}`,
        .12 + .12 * (1 - delta / .5));
    }
  }

  const da = midpoint(
    a.physical.densityMin, a.physical.densityMax
  );

  const db = midpoint(
    b.physical.densityMin, b.physical.densityMax
  );

  if (da !== null && db !== null) {
    const delta = Math.abs(da - db);

    if (delta <= .2) {
      add("science", "Similar density",
        `${formatNumber(da)} and ${formatNumber(db)} g/cm³`,
        .12);
    }
  }

  if (sameValue(a.optical.luster, b.optical.luster)) {
    add("science", "Shared luster", a.optical.luster, .12);
  }

  const sharedColors = overlapValues(
    a.colors.map(c => c.name),
    b.colors.map(c => c.name)
  );

  if (sharedColors.length) {
    add("science", "Shared recorded colors",
      sharedColors.join(", "), .12);
  }

  // GEOGRAPHIC ASSOCIATIONS
  const countries = overlapValues(
    a.geography.countries,
    b.geography.countries
  );

  if (countries.length) {
    add("geography", "Countries in common",
      countries.join(", "),
      Math.min(.8, .3 + .12 * countries.length));
  }

  const localities = overlapValues(
    a.geography.localities,
    b.geography.localities
  );

  if (localities.length) {
    add("geography", "Shared localities",
      localities.join(", "), .85);
  }

  // HISTORICAL ASSOCIATIONS
  const cultures = overlapValues(
    a.history.cultures,
    b.history.cultures
  );

  if (cultures.length) {
    add("history", "Shared historical cultures",
      cultures.join(", "), .7);
  }

  // TRADITIONAL / SYMBOLIC
  const traditions = [
    ["associations.zodiac", "Zodiac"],
    ["associations.planetary", "Planetary"],
    ["associations.birthstone", "Birthstone months"],
    ["associations.anniversary", "Anniversaries"],
    ["symbolism.meanings", "Traditional meanings"],
    ["symbolism.chakras", "Chakras"]
  ];

  for (const [path, label] of traditions) {
    const values = overlapValues(
      valueAt(a, path),
      valueAt(b, path)
    );

    if (values.length) {
      add("tradition", label,
        values.join(", "), .3);
    }
  }

  // MANUAL CONNECTIONS
  const manual = [
    ...a.manualRelations.filter(r => r.targetId === b.id),
    ...b.manualRelations.filter(r => r.targetId === a.id)
  ];

  const manualSeen = new Set();

  for (const relation of manual) {
    const key = norm(relation.type) + "|" + norm(relation.note);

    if (manualSeen.has(key)) continue;
    manualSeen.add(key);

    add("manual",
      relation.type || "Manual relationship",
      relation.note || "Explicitly linked by the user",
      1);
  }

  // LEGACY NAME LINKS
  const related = [
    ...a.family.related.map(norm),
    ...b.family.related.map(norm)
  ];

  if (related.includes(norm(a.name)) ||
      related.includes(norm(b.name))) {
    add("science", "Named related gemstone",
      "Legacy related-gems field", .18);
  }

  return evidence;
}

function scoreEvidence(items, category = "all") {
  const groups = Object.keys(APP.weights);
  let weighted = 0;
  let totalWeight = 0;

  for (const group of groups) {
    if (category !== "all" && category !== group) continue;

    const weight = APP.weights[group];

    if (weight <= 0) continue;

    totalWeight += weight;

    const groupEvidence = items.filter(
      e => e.group === group
    );

    // Saturated contribution prevents numerous weak
    // attributes from infinitely inflating a category.
    const strength = Math.min(1,
      groupEvidence.reduce((sum, e) => sum + e.strength, 0)
    );

    weighted += strength * weight;
  }

  return totalWeight
    ? Math.round(weighted / totalWeight * 100)
    : 0;
}

function relationshipPair(a, b, category = "all") {
  const evidence = evidenceBetween(a, b).filter(e =>
    category === "all" || e.group === category
  );

  return {
    a, b, evidence,
    score: scoreEvidence(evidence, category)
  };
}

function allRelationshipPairs(category = "all", minimum = 0) {
  const pairs = [];

  for (let i = 0; i < APP.gems.length; i++) {
    for (let j = i + 1; j < APP.gems.length; j++) {
      const pair = relationshipPair(
        APP.gems[i], APP.gems[j], category
      );

      if (pair.evidence.length && pair.score >= minimum) {
        pairs.push(pair);
      }
    }
  }

  return pairs.sort((a, b) =>
    b.score - a.score ||
    a.a.name.localeCompare(b.a.name)
  );
}

function evidenceGroupLabel(group) {
  return GEM_CONFIG.relationshipGroups
    .find(g => g.id === group)?.label || group;
}

/* =========================================
   FAMILY TREE
========================================= */

function renderFamilyTree() {
  const groups = new Map();

  for (const gem of sortGems(APP.gems)) {
    const group = gem.family.group ||
      "Unclassified Materials";

    const species = gem.family.species ||
      (gem.classifications.includes("Organic")
        ? "Organic Material"
        : "Species Not Recorded");

    if (!groups.has(group)) groups.set(group, new Map());

    const speciesMap = groups.get(group);

    if (!speciesMap.has(species)) {
      speciesMap.set(species, []);
    }

    speciesMap.get(species).push(gem);
  }

  $("#treeStage").innerHTML = [...groups]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, speciesMap]) => `
      <div class="tree-group">
        <h3 class="tree-heading">${escapeHTML(group)}</h3>

        ${[...speciesMap]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([species, gems]) => `
            <div class="tree-species">
              <div class="tree-species-title">
                ${escapeHTML(species)}
              </div>

              <div class="tree-gems">
                ${gems.map(g => `
                  <button class="tree-gem"
                    type="button"
                    data-tree-gem="${escapeHTML(g.id)}">
                    ◇ ${escapeHTML(g.name)}
                  </button>
                `).join("")}
              </div>
            </div>
          `).join("")}
      </div>
    `).join("") ||
    `<p class="section-description">No gemstone records.</p>`;
}

/* =========================================
   SVG NETWORK GENERATION
========================================= */

function svgElement(tag, attributes = {}, parent = null) {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg", tag
  );

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }

  if (parent) parent.appendChild(element);

  return element;
}

function buildNetwork() {
  const gems = sortGems(APP.gems);

  const nodes = gems.map((gem, index) => {
    const angle = index * 2.39996323;
    const radius = Math.min(270, 38 + Math.sqrt(index) * 30);

    return {
      id: gem.id,
      gem,
      x: 500 + Math.cos(angle) * radius,
      y: 325 + Math.sin(angle) * radius
    };
  });

  const category = $("#atlasCategory").value;
  const threshold = Number($("#atlasThreshold").value);

  const edges = allRelationshipPairs(category, threshold)
    .map(pair => ({
      from: pair.a.id,
      to: pair.b.id,
      pair
    }));

  // Small, deterministic force layout.
  // More iterations are intentionally avoided
  // to keep larger collections responsive on phones.
  if (nodes.length <= 160) {
    const byId = new Map(nodes.map(n => [n.id, n]));

    for (let iteration = 0; iteration < 75; iteration++) {
      const forces = new Map(nodes.map(n => [
        n.id, { x: 0, y: 0 }
      ]));

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = Math.max(12, Math.hypot(dx, dy));
          const force = Math.min(6, 4200 / (distance * distance));

          forces.get(a.id).x -= dx / distance * force;
          forces.get(a.id).y -= dy / distance * force;
          forces.get(b.id).x += dx / distance * force;
          forces.get(b.id).y += dy / distance * force;
        }
      }

      for (const edge of edges) {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        const dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const desired = 95 + (100 - edge.pair.score) * 1.6;
        const attraction = (distance - desired) * .006;

        forces.get(a.id).x += dx / distance * attraction;
        forces.get(a.id).y += dy / distance * attraction;
        forces.get(b.id).x -= dx / distance * attraction;
        forces.get(b.id).y -= dy / distance * attraction;
      }

      for (const node of nodes) {
        const f = forces.get(node.id);

        node.x += Math.max(-7, Math.min(7,
          f.x + (500 - node.x) * .002));

        node.y += Math.max(-7, Math.min(7,
          f.y + (325 - node.y) * .002));
      }
    }
  }

  APP.network.nodes = nodes;
  APP.network.edges = edges;
}

function drawNetwork() {
  const svg = $("#networkSvg");
  svg.replaceChildren();

  const n = APP.network;

  const root = svgElement("g", {
    transform: `translate(${n.x} ${n.y}) scale(${n.scale})`
  }, svg);

  const positions = new Map(
    n.nodes.map(node => [node.id, node])
  );

  for (const edge of n.edges) {
    const a = positions.get(edge.from);
    const b = positions.get(edge.to);

    if (!a || !b) continue;

    svgElement("line", {
      x1: a.x, y1: a.y,
      x2: b.x, y2: b.y,
      stroke: "#b3a5e9",
      "stroke-opacity": .2 + edge.pair.score / 180,
      "stroke-width": 1 + edge.pair.score / 30,
      class: "graph-edge"
    }, root);

    const hit = svgElement("line", {
      x1: a.x, y1: a.y,
      x2: b.x, y2: b.y,
      stroke: "transparent",
      "stroke-width": 18,
      class: "graph-edge"
    }, root);

    hit.dataset.edgeFrom = edge.from;
    hit.dataset.edgeTo = edge.to;
  }

  for (const node of n.nodes) {
    const g = svgElement("g", {
      class: "graph-node" + (
        APP.inspector?.type === "gem" &&
        APP.inspector.id === node.id
          ? " selected" : ""
      ),
      transform: `translate(${node.x} ${node.y})`
    }, root);

    g.dataset.nodeId = node.id;

    svgElement("circle", {
      r: 16,
      fill: gemColor(node.gem)
    }, g);

    svgElement("circle", {
      r: 5,
      fill: "#fff",
      opacity: .35
    }, g);

    if ($("#atlasLabels").checked) {
      const label = svgElement("text", {
        x: 0, y: 37,
        class: "graph-label"
      }, g);

      label.textContent = node.gem.name;
    }
  }
}

function renderAtlas(reset = false) {
  const tree = $("#atlasMode").value === "tree";

  $("#networkSvg").hidden = tree;
  $("#treeStage").hidden = !tree;

  $("#atlasCategory").disabled = tree;
  $("#atlasThreshold").disabled = tree;
  $("#atlasLabels").disabled = tree;

  $("#mapStatus").textContent = tree
    ? "MINERAL FAMILY HIERARCHY"
    : "RELATIONSHIP CONSTELLATION";

  if (tree) {
    renderFamilyTree();
    $("#atlasCount").textContent =
      APP.gems.length + " ENTRIES";
  } else {
    if (reset) {
      APP.network.scale = 1;
      APP.network.x = 0;
      APP.network.y = 0;
    }

    buildNetwork();
    drawNetwork();

    $("#atlasCount").textContent =
      APP.network.edges.length + " CONNECTIONS";
  }

  renderInspector();
}

function zoomNetwork(factor, anchorX = 500, anchorY = 325) {
  const n = APP.network;

  const newScale = Math.min(5,
    Math.max(.3, n.scale * factor));

  n.x = anchorX - (anchorX - n.x) *
    newScale / n.scale;

  n.y = anchorY - (anchorY - n.y) *
    newScale / n.scale;

  n.scale = newScale;
  drawNetwork();
}

function pointerPosition(event) {
  const rect = $("#networkSvg").getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) / rect.width * 1000,
    y: (event.clientY - rect.top) / rect.height * 650
  };
}

function renderInspector() {
  const selection = APP.inspector;

  if (!selection) {
    $("#inspectorTitle").textContent =
      "Explore the connections";
    $("#inspectorContent").textContent =
      "Select a gemstone or line to investigate its relationships.";
    return;
  }

  if (selection.type === "gem") {
    const gem = findGem(selection.id);

    if (!gem) {
      APP.inspector = null;
      renderInspector();
      return;
    }

    const matches = allRelationshipPairs()
      .filter(p =>
        p.a.id === gem.id || p.b.id === gem.id
      )
      .slice(0, 20);

    $("#inspectorTitle").textContent = gem.name;

    $("#inspectorContent").innerHTML = `
      <p>${escapeHTML(
        gem.family.species ||
        gem.family.group ||
        "Unclassified"
      )}</p>

      <p>${matches.length} listed connections.</p>

      <div class="inspector-list">
        ${matches.map(pair => {
          const other = pair.a.id === gem.id
            ? pair.b : pair.a;

          return `<button class="inspector-button"
            data-inspect-edge="${escapeHTML(gem.id)}|${escapeHTML(other.id)}"
            type="button">
            ${escapeHTML(other.name)} · ${pair.score}%
          </button>`;
        }).join("")}
      </div>

      <button class="primary-button"
        data-inspect-open="${escapeHTML(gem.id)}"
        type="button"
        style="margin-top:17px">
        Open Profile
      </button>
    `;

  } else if (selection.type === "edge") {
    const a = findGem(selection.a);
    const b = findGem(selection.b);

    if (!a || !b) {
      APP.inspector = null;
      renderInspector();
      return;
    }

    const info = relationshipPair(
      a, b, $("#atlasCategory").value
    );

    $("#inspectorTitle").textContent =
      `${a.name} ↔ ${b.name}`;

    $("#inspectorContent").innerHTML = `
      <div class="evidence-score">${info.score}%</div>
      <p>Weighted catalog similarity.</p>

      ${info.evidence.map(e => `
        <div class="inspector-item">
          <span class="evidence-label">
            ${escapeHTML(evidenceGroupLabel(e.group))}
          </span>

          <div class="evidence-value">
            <strong>${escapeHTML(e.label)}</strong>
            <div>${escapeHTML(e.details)}</div>
          </div>
        </div>
      `).join("")}

      <p class="field-hint">
        A connection indicates recorded evidence.
        Only mineralogical evidence describes
        scientific family relationships.
      </p>
    `;
  }
}

/* =========================================
   PATHFINDING
   SHORTEST NUMBER OF RELATIONSHIP STEPS
========================================= */

function findConnectionPath(from, to) {
  if (from === to) return [];

  const pairs = allRelationshipPairs(
    $("#atlasCategory").value,
    Number($("#atlasThreshold").value)
  );

  const adjacency = new Map(
    APP.gems.map(g => [g.id, []])
  );

  for (const pair of pairs) {
    adjacency.get(pair.a.id)?.push({
      id: pair.b.id, pair
    });

    adjacency.get(pair.b.id)?.push({
      id: pair.a.id, pair
    });
  }

  const queue = [from];
  const seen = new Set([from]);
  const previous = new Map();

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];

    if (current === to) break;

    for (const edge of adjacency.get(current) || []) {
      if (seen.has(edge.id)) continue;

      seen.add(edge.id);
      previous.set(edge.id, {
        from: current,
        pair: edge.pair
      });

      queue.push(edge.id);
    }
  }

  if (!seen.has(to)) return null;

  const path = [];
  let current = to;

  while (current !== from) {
    const step = previous.get(current);

    path.unshift({
      from: step.from,
      to: current,
      pair: step.pair
    });

    current = step.from;
  }

  return path;
}

function renderPathResult() {
  const from = $("#pathFrom").value;
  const to = $("#pathTo").value;

  if (!from || !to) {
    $("#pathResult").textContent =
      "Choose two gemstones.";
    return;
  }

  if (from === to) {
    $("#pathResult").textContent =
      "Choose two different gemstones.";
    return;
  }

  const path = findConnectionPath(from, to);

  if (path === null) {
    $("#pathResult").textContent =
      "No evidenced path exists with these filters.";
    return;
  }

  $("#pathResult").innerHTML = path.map((step, index) => {
    const a = findGem(step.from);
    const b = findGem(step.to);

    return `<div class="path-step">
      <strong>${index + 1}.
        ${escapeHTML(a.name)} → ${escapeHTML(b.name)}
      </strong>

      <small>
        ${escapeHTML(
          step.pair.evidence.slice(0, 4).map(e =>
            e.label + ": " + e.details
          ).join(" · ")
        )}
      </small>
    </div>`;
  }).join("");
}

/* =========================================
   STATISTICS — DATA ACCESS
========================================= */

function getDimension(id) {
  return GEM_CONFIG.dimensions.find(d => d.id === id);
}

function dimensionLabel(id) {
  return getDimension(id)?.label || id;
}

function isNumericDimension(id) {
  const d = getDimension(id);
  return d && ["range", "number"].includes(d.type);
}

function numericDimensionValue(gem, id, mode = "midpoint") {
  const dimension = getDimension(id);
  if (!dimension) return null;

  if (dimension.type === "number") {
    return numeric(valueAt(gem, dimension.path));
  }

  if (dimension.type !== "range") return null;

  const a = numeric(valueAt(gem, dimension.minPath));
  const b = numeric(valueAt(gem, dimension.maxPath));

  if (mode === "minimum") return a ?? b;
  if (mode === "maximum") return b ?? a;

  return midpoint(a, b);
}

function rawDimensionValues(gem, id) {
  const dimension = getDimension(id);
  if (!dimension) return [];

  if (dimension.type === "colors") {
    return gem.colors.map(c => c.name).filter(isFilled);
  }

  if (dimension.type === "colorRarity") {
    return gem.colors.map(c => c.rarity).filter(isFilled);
  }

  if (["range", "number"].includes(dimension.type)) {
    const n = numericDimensionValue(
      gem, id, $("#statNumericMode").value
    );

    return n === null ? [] : [String(n)];
  }

  return asArray(valueAt(gem, dimension.path))
    .map(String)
    .filter(value => {
      const key = norm(value);
      return key && key !== "unknown" &&
        key !== "not applicable";
    });
}

function statisticsPopulation() {
  const scope = $("#statScope").value;
  const rarity = $("#statRarityFilter").value;

  return APP.gems.filter(g => {
    if (scope === "favorites" && !g.favorite) return false;
    if (scope === "natural" && g.originType !== "Natural")
      return false;
    if (scope === "synthetic" && g.originType !== "Synthetic")
      return false;
    if (rarity && g.rarity !== rarity) return false;

    return true;
  });
}

function aggregateDimension(population, id, measure) {
  const buckets = new Map();

  for (const gem of population) {
    const raw = rawDimensionValues(gem, id);
    const values = measure === "occurrences"
      ? raw
      : uniqueValues(raw);

    if (!values.length && $("#statMissing").value === "show") {
      values.push("Not Recorded");
    }

    for (const value of values) {
      const key = norm(value);

      if (!buckets.has(key)) {
        buckets.set(key, {
          name: value,
          count: 0,
          gemIds: new Set()
        });
      }

      const item = buckets.get(key);
      item.count++;
      item.gemIds.add(gem.id);
    }
  }

  const result = [...buckets.values()].map(row => ({
    name: row.name,
    count: row.count,
    uniqueCount: row.gemIds.size,
    gemIds: [...row.gemIds]
  }));

  const order = $("#statSort").value;

  result.sort((a, b) => {
    if (order === "ascending")
      return a.count - b.count ||
        a.name.localeCompare(b.name);

    if (order === "alphabetical")
      return a.name.localeCompare(b.name);

    return b.count - a.count ||
      a.name.localeCompare(b.name);
  });

  const limit = Number($("#statTopN").value);

  return limit ? result.slice(0, limit) : result;
}

function percent(value, populationSize) {
  return populationSize
    ? value / populationSize * 100
    : 0;
}

function statDisplay(row, measure, total) {
  if (measure === "percentage") {
    return formatNumber(percent(row.uniqueCount, total), 1) + "%";
  }

  return String(
    measure === "occurrences" ? row.count : row.uniqueCount
  );
}

/* =========================================
   STATISTICS CHARTS
========================================= */

function rankedBarChart(rows, measure, total) {
  const max = Math.max(1, ...rows.map(r =>
    measure === "occurrences" ? r.count : r.uniqueCount
  ));

  return rows.map(row => {
    const value = measure === "occurrences"
      ? row.count : row.uniqueCount;

    return `<div class="ranked-row">
      <span class="ranked-name">${escapeHTML(row.name)}</span>

      <div class="ranked-track">
        <div class="ranked-fill"
          style="width:${value / max * 100}%"></div>
      </div>

      <span class="ranked-value">
        ${statDisplay(row, measure, total)}
      </span>
    </div>`;
  }).join("");
}

function donutChart(rows, measure, totalGems) {
  const values = rows.map(r =>
    measure === "occurrences" ? r.count : r.uniqueCount
  );

  const sum = values.reduce((a, b) => a + b, 0);

  if (!sum) return "<p>No values recorded.</p>";

  let offset = 0;

  const circles = rows.map((row, index) => {
    const length = values[index] / sum * 100;

    const part = `<circle
      cx="110" cy="110" r="75"
      fill="none"
      stroke="${PALETTE[index % PALETTE.length]}"
      stroke-width="30"
      pathLength="100"
      stroke-dasharray="${length} ${100 - length}"
      stroke-dashoffset="${-offset}"
      transform="rotate(-90 110 110)">
    </circle>`;

    offset += length;
    return part;
  }).join("");

  return `<div class="donut-wrap">
    <svg class="donut-chart" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="75"
        fill="none" stroke="#252a3e" stroke-width="30"/>

      ${circles}

      <text x="110" y="108" text-anchor="middle"
        fill="#ebe9f5" font-size="22">
        ${sum}
      </text>

      <text x="110" y="127" text-anchor="middle"
        fill="#9199ac" font-size="10">
        assignments
      </text>
    </svg>

    <div class="donut-legend">
      ${rows.map((row, index) => `
        <div class="legend-line">
          <span class="legend-dot"
            style="background:${PALETTE[index % PALETTE.length]}">
          </span>

          ${escapeHTML(row.name)} ·
          ${statDisplay(row, measure, totalGems)}
        </div>
      `).join("")}
    </div>
  </div>`;
}

function treemapChart(rows, measure, total) {
  const values = rows.map(r =>
    measure === "occurrences" ? r.count : r.uniqueCount
  );

  const sum = values.reduce((s, v) => s + v, 0) || 1;

  return `<div class="treemap">
    ${rows.map((row, i) => {
      const value = values[i];
      const share = value / sum;

      return `<div class="treemap-tile"
        style="
          --tile-weight:${Math.max(1, value)};
          --tile-basis:${Math.max(15, share * 100)}%;
          background:${PALETTE[i % PALETTE.length]};
        ">
        <strong>${escapeHTML(row.name)}</strong>
        <small>${statDisplay(row, measure, total)}</small>
      </div>`;
    }).join("")}
  </div>`;
}

function matrixData(population, firstId, secondId) {
  const first = aggregateDimension(
    population, firstId, "gems"
  ).slice(0, 12);

  const second = aggregateDimension(
    population, secondId, "gems"
  ).slice(0, 12);

  const cells = second.map(y => first.map(x => {
    const a = new Set(x.gemIds);
    return y.gemIds.filter(id => a.has(id)).length;
  }));

  return { first, second, cells };
}

function heatmapChart(data) {
  const max = Math.max(1, ...data.cells.flat());

  return `<div class="heatmap-grid">
    <table class="heatmap-table">
      <thead>
        <tr>
          <th></th>
          ${data.first.map(row =>
            `<th>${escapeHTML(row.name)}</th>`
          ).join("")}
        </tr>
      </thead>

      <tbody>
        ${data.second.map((row, i) => `
          <tr>
            <th>${escapeHTML(row.name)}</th>

            ${data.cells[i].map(value => `
              <td style="background:rgba(179,165,233,${
                .055 + value / max * .75
              })">
                ${value}
              </td>
            `).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>`;
}

function scatterChart(population, xId, yId) {
  const mode = $("#statNumericMode").value;

  const points = population.map(g => ({
    gem: g,
    x: numericDimensionValue(g, xId, mode),
    y: numericDimensionValue(g, yId, mode)
  })).filter(p =>
    p.x !== null && p.y !== null
  );

  if (!points.length) {
    return {
      html: "<p class='section-description'>No complete numerical pairs.</p>",
      points
    };
  }

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));

  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const sx = value => 65 +
    (maxX === minX ? .5 :
      (value - minX) / (maxX - minX)) * 500;

  const sy = value => 355 -
    (maxY === minY ? .5 :
      (value - minY) / (maxY - minY)) * 285;

  const grid = [0, .25, .5, .75, 1].map(t => `
    <line class="chart-gridline"
      x1="65" x2="565"
      y1="${355 - t * 285}" y2="${355 - t * 285}"/>

    <text x="56" y="${359 - t * 285}"
      text-anchor="end">
      ${formatNumber(minY + (maxY - minY) * t)}
    </text>

    <text x="${65 + t * 500}" y="377"
      text-anchor="middle">
      ${formatNumber(minX + (maxX - minX) * t)}
    </text>
  `).join("");

  const html = `<svg class="chart-svg" viewBox="0 0 630 420">
    <line class="chart-axis"
      x1="65" x2="65" y1="70" y2="355"/>
    <line class="chart-axis"
      x1="65" x2="565" y1="355" y2="355"/>

    ${grid}

    ${points.map(p => `
      <circle class="chart-point"
        cx="${sx(p.x)}" cy="${sy(p.y)}"
        r="7" fill="${gemColor(p.gem)}">
        <title>${escapeHTML(
          `${p.gem.name}: ${p.x}, ${p.y}`
        )}</title>
      </circle>
    `).join("")}

    <text x="315" y="410" text-anchor="middle">
      ${escapeHTML(dimensionLabel(xId))}
    </text>
  </svg>`;

  return { html, points };
}

function histogramChart(population, dimensionId) {
  const mode = $("#statNumericMode").value;
  const requestedBins = Number($("#statBins").value);

  const values = population.map(g => ({
    gem: g,
    value: numericDimensionValue(g, dimensionId, mode)
  })).filter(p => p.value !== null);

  if (!values.length) {
    return {
      html: "<p class='section-description'>No numerical measurements recorded.</p>",
      bins: []
    };
  }

  const minimum = Math.min(...values.map(p => p.value));
  const maximum = Math.max(...values.map(p => p.value));

  const binCount = minimum === maximum ? 1 : requestedBins;
  const width = binCount === 1 ? 1 :
    (maximum - minimum) / binCount;

  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = minimum + index * width;
    const end = index === binCount - 1
      ? maximum : minimum + (index + 1) * width;

    return {
      name: binCount === 1
        ? formatNumber(minimum)
        : `${formatNumber(start)}–${formatNumber(end)}`,
      start, end, count: 0,
      gemIds: []
    };
  });

  for (const p of values) {
    const index = binCount === 1 ? 0 :
      Math.min(binCount - 1,
        Math.floor((p.value - minimum) / width));

    bins[index].count++;
    bins[index].gemIds.push(p.gem.id);
  }

  const maxCount = Math.max(1, ...bins.map(b => b.count));

  const html = `<svg class="chart-svg"
    viewBox="0 0 630 410">

    <line class="chart-axis"
      x1="45" y1="355" x2="605" y2="355"/>

    ${bins.map((bin, index) => {
      const barWidth = 540 / bins.length - 4;
      const x = 52 + index * (540 / bins.length);
      const h = bin.count / maxCount * 260;

      return `<rect
        x="${x}" y="${355 - h}"
        width="${Math.max(4, barWidth)}"
        height="${h}"
        rx="3"
        fill="${PALETTE[index % PALETTE.length]}">
        <title>${escapeHTML(bin.name)}:
          ${bin.count} gemstones</title>
      </rect>`;
    }).join("")}

    <text x="315" y="399" text-anchor="middle">
      ${escapeHTML(dimensionLabel(dimensionId))}
    </text>
  </svg>`;

  return { html, bins };
}

function stackedChart(population, firstId, secondId) {
  const data = matrixData(population, firstId, secondId);

  const rows = data.first.map((row, index) => ({
    row,
    segments: data.second.map((second, secondIndex) => ({
      name: second.name,
      count: data.cells[secondIndex][index]
    }))
  }));

  // Each stack shows a count of paired category
  // assignments. Multi-valued dimensions may
  // repeat a gemstone across separate segments.
  const maxTotal = Math.max(1, ...rows.map(r =>
    r.segments.reduce((s, v) => s + v.count, 0)
  ));

  return `<div class="stacked-chart">
    ${rows.map(item => {
      const total = item.segments.reduce(
        (s, v) => s + v.count, 0
      );

      return `<div class="stacked-row">
        <div class="stacked-row-title">
          <span>${escapeHTML(item.row.name)}</span>
          <span>${total} intersections</span>
        </div>

        <div class="stacked-track"
          style="width:${Math.max(5, total / maxTotal * 100)}%">

          ${item.segments.map((segment, i) => `
            <div class="stacked-segment"
              style="
                width:${total ? segment.count / total * 100 : 0}%;
                background:${PALETTE[i % PALETTE.length]};
              "
              title="${escapeHTML(segment.name)}:
                ${segment.count}">
            </div>
          `).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

/* =========================================
   STATISTICS CONFIGURATION
========================================= */

function optionHTML(dimensions) {
  return dimensions.map(d =>
    `<option value="${escapeHTML(d.id)}">
      ${escapeHTML(d.label)}
    </option>`
  ).join("");
}

function updateStatisticsControls() {
  const chart = $("#statChart").value;

  const primary = $("#statDimension");
  const secondary = $("#statSecond");

  const oldPrimary = primary.value || "rarity";
  const oldSecondary = secondary.value ||
    "family.group";

  const numericOnly = chart === "scatter" ||
    chart === "histogram";

  const choices = GEM_CONFIG.dimensions.filter(d =>
    !numericOnly || ["range", "number"].includes(d.type)
  );

  primary.innerHTML = optionHTML(choices);
  secondary.innerHTML = optionHTML(choices);

  primary.value = choices.some(d => d.id === oldPrimary)
    ? oldPrimary : choices[0]?.id || "";

  secondary.value = choices.some(d => d.id === oldSecondary)
    ? oldSecondary : choices[1]?.id || choices[0]?.id || "";

  secondary.disabled = ![
    "heatmap", "stacked", "scatter"
  ].includes(chart);

  $("#statBins").disabled = chart !== "histogram";
  $("#statMeasure").disabled = numericOnly;

  renderStatistics();
}

/* =========================================
   STATISTICS MAIN RENDER
========================================= */

function renderStatistics() {
  const population = statisticsPopulation();
  APP.statPopulation = population;

  const id = $("#statDimension").value;
  const secondary = $("#statSecond").value;
  const measure = $("#statMeasure").value;
  const chart = $("#statChart").value;

  $("#statPopulation").textContent =
    `${population.length} gemstones in analysis`;

  $("#chartTitle").textContent = dimensionLabel(id);
  $("#chartTotal").textContent =
    `${population.length} records`;

  const rows = aggregateDimension(
    population, id, measure
  );

  APP.statisticsRows = rows;

  let html = "";
  let tableRows = [];
  let insights = [];
  let footer = "";

  if (chart === "bar") {
    html = rankedBarChart(rows, measure, population.length);
  }

  if (chart === "donut") {
    html = donutChart(rows, measure, population.length);
    footer = "Donut slices represent recorded category assignments. With multi-valued properties, one gemstone can contribute to several slices.";
  }

  if (chart === "treemap") {
    html = treemapChart(rows, measure, population.length);
    footer = "Tile proportions are approximate in the responsive layout; the listed values are the precise counts.";
  }

  if (chart === "heatmap") {
    const data = matrixData(population, id, secondary);
    html = heatmapChart(data);
    footer = "Each cell counts distinct gemstones matching both categories.";
  }

  if (chart === "stacked") {
    html = stackedChart(population, id, secondary);
    footer = "Stacked segments count category intersections. A gemstone can contribute to multiple segments when the secondary variable has multiple values.";
  }

  if (chart === "scatter") {
    const result = scatterChart(
      population, id, secondary
    );

    html = result.html;

    tableRows = result.points.map(p => [
      p.gem.name, p.x, p.y
    ]);

    insights.push(
      `${result.points.length} gemstones contain both numerical measurements.`
    );

    footer = "Each point represents one gemstone. Missing measurements are excluded.";
  }

  if (chart === "histogram") {
    const result = histogramChart(population, id);
    html = result.html;

    tableRows = result.bins.map(b => [
      b.name, b.count
    ]);

    footer = "Ranges are grouped into equal-width numeric intervals. A value on the final boundary is included in the final bin.";
  }

  if (!html.trim()) {
    html = `<p class="section-description">
      No recorded values for this selection.
    </p>`;
  }

  $("#chartCanvas").innerHTML = html;

  const largest = [...rows].sort((a, b) =>
    b.count - a.count
  )[0];

  if (largest) {
    insights.unshift(
      `Largest category: ${largest.name} (${largest.count} assignments).`
    );

    insights.push(
      `${rows.length} displayed distinct categories.`
    );
  }

  const missing = population.filter(g =>
    rawDimensionValues(g, id).length === 0
  ).length;

  insights.push(
    `${missing} gemstones have no recorded value for the primary variable.`
  );

  if (measure === "percentage" &&
      !["scatter", "histogram"].includes(chart)) {
    footer += " Percentages use the filtered gemstone population as their denominator. Multi-valued categories can sum above 100%.";
  }

  if (measure === "occurrences") {
    footer += " Recorded occurrences count entries; distinct gemstone counts deduplicate each gemstone within a category.";
  }

  const d = getDimension(id);

  if (d?.requiresComparableCurrency) {
    const currencies = uniqueValues(population
      .filter(g => numericDimensionValue(g, id) !== null)
      .map(g => g.market.currency || "Unspecified"));

    if (currencies.length > 1) {
      footer += " WARNING: Multiple price currencies are present. These values are not directly comparable without conversion.";
    }
  }

  $("#chartFooter").textContent = footer;

  $("#statInsights").innerHTML = insights.map(text => `
    <div class="insight-item">
      ${escapeHTML(text)}
    </div>
  `).join("");

  if (!tableRows.length) {
    tableRows = rows.map(r => [
      r.name,
      r.count,
      r.uniqueCount,
      formatNumber(percent(
        r.uniqueCount, population.length
      ), 1) + "%"
    ]);
  }

  const headers = chart === "scatter"
    ? ["Gemstone", dimensionLabel(id), dimensionLabel(secondary)]
    : chart === "histogram"
      ? ["Interval", "Gemstones"]
      : ["Category", "Occurrences", "Gemstones", "% of Population"];

  APP.statisticsCSV = csvText([
    headers, ...tableRows
  ]);

  $("#statTable").innerHTML = `
    <table class="data-table">
      <thead>
        <tr>${headers.map(h =>
          `<th>${escapeHTML(h)}</th>`
        ).join("")}</tr>
      </thead>

      <tbody>
        ${tableRows.map(row => `
          <tr>${row.map(value =>
            `<td>${escapeHTML(value)}</td>`
          ).join("")}</tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const explanation = $("#statMeasureHelp");

  explanation.textContent = measure === "occurrences"
    ? "Counts individual recorded entries; one gemstone may contribute multiple occurrences."
    : measure === "percentage"
      ? "Counts unique gemstones per category divided by the filtered collection size. Totals may exceed 100%."
      : "Counts each gemstone at most once within a category, even when that category is recorded repeatedly.";

  renderCrossAnalysis();
}

/* =========================================
   CATEGORY CROSS-ANALYSIS
========================================= */

function crossOptions(id) {
  const population = statisticsPopulation();
  const values = new Map();

  for (const gem of population) {
    for (const value of rawDimensionValues(gem, id)) {
      const key = norm(value);
      if (!values.has(key)) values.set(key, value);
    }
  }

  return [...values.values()]
    .sort((a, b) => a.localeCompare(b));
}

function populateCrossValue(selectId, dimensionId) {
  const select = $("#" + selectId);
  const previous = select.value;

  const options = crossOptions(dimensionId);

  select.innerHTML = options.map(value => `
    <option value="${escapeHTML(value)}">
      ${escapeHTML(value)}
    </option>
  `).join("");

  if (options.includes(previous)) {
    select.value = previous;
  }
}

function renderCrossAnalysis() {
  const aId = $("#crossDimensionA").value;
  const bId = $("#crossDimensionB").value;

  if (!aId || !bId) return;

  const aValue = $("#crossValueA").value;
  const bValue = $("#crossValueB").value;

  const population = statisticsPopulation();

  const groupA = population.filter(g =>
    rawDimensionValues(g, aId).some(v =>
      norm(v) === norm(aValue)
    )
  );

  const groupB = population.filter(g =>
    rawDimensionValues(g, bId).some(v =>
      norm(v) === norm(bValue)
    )
  );

  const setB = new Set(groupB.map(g => g.id));
  const intersection = groupA.filter(g => setB.has(g.id));

  $("#crossResults").innerHTML = `
    <div class="cross-counts">
      <div class="cross-count-card">
        <span>${escapeHTML(aValue || "First condition")}</span>
        <strong>${groupA.length}</strong>
      </div>

      <div class="cross-count-card">
        <span>${escapeHTML(bValue || "Second condition")}</span>
        <strong>${groupB.length}</strong>
      </div>

      <div class="cross-count-card">
        <span>Both conditions</span>
        <strong>${intersection.length}</strong>
      </div>
    </div>

    <div class="cross-gem-list">
      ${intersection.map(g => `
        <button class="cross-gem"
          type="button"
          data-cross-gem="${escapeHTML(g.id)}">
          ◇ ${escapeHTML(g.name)}
        </button>
      `).join("")}
    </div>

    <p class="stats-explainer">
      ${intersection.length} of ${population.length}
      gemstones match both selected conditions.
    </p>
  `;
}

/* =========================================
   COMPARISON — FIELD ANALYSIS
========================================= */

function comparisonValue(gem, path, type) {
  if (type === "range") {
    const d = getDimension(path);
    if (!d) return "";

    return formatRange(
      valueAt(gem, d.minPath),
      valueAt(gem, d.maxPath),
      d.unit === "currency / carat"
        ? (gem.market.currency || "") + " / carat"
        : d.unit
    );
  }

  if (type === "colors") {
    return gem.colors.map(c =>
      c.name + (c.rarity ? ` (${c.rarity})` : "")
    ).join(", ");
  }

  return arrayText(valueAt(gem, path));
}

function comparisonStatus(gems, path, type) {
  const values = gems.map(g =>
    comparisonValue(g, path, type)
  );

  const present = values.filter(isFilled);

  if (!present.length) return "empty";
  if (present.length < gems.length) return "incomplete";

  if (type === "text") return "different";

  if (type === "range") {
    const d = getDimension(path);
    if (!d) return "different";

    if (d.requiresComparableCurrency &&
        new Set(gems.map(g => norm(g.market.currency))).size > 1) {
      return "different";
    }

    const ranges = gems.map(g => [
      numeric(valueAt(g, d.minPath)),
      numeric(valueAt(g, d.maxPath))
    ]);

    if (ranges.some(r => r[0] === null && r[1] === null))
      return "incomplete";

    const lower = Math.max(...ranges.map(r =>
      r[0] ?? r[1]
    ));

    const upper = Math.min(...ranges.map(r =>
      r[1] ?? r[0]
    ));

    return lower <= upper ? "shared" : "different";
  }

  if (type === "multi" || type === "colors") {
    const arrays = gems.map(g =>
      type === "colors"
        ? g.colors.map(c => c.name)
        : asArray(valueAt(g, path))
    );

    const common = arrays.reduce(
      (items, array) => overlapValues(items, array),
      arrays[0]
    );

    return common.length ? "shared" : "different";
  }

  return new Set(values.map(norm)).size === 1
    ? "shared" : "different";
}

/* =========================================
   COMPARISON — SELECTED GEMS
========================================= */

function comparisonGems() {
  return APP.compareIds.map(findGem).filter(Boolean);
}

function renderWeights() {
  $("#weightControls").innerHTML =
    Object.entries(APP.weights).map(([key, weight]) => `
      <label class="weight-item">

        <span class="weight-header">
          <span>${escapeHTML(evidenceGroupLabel(key))}</span>
          <strong data-weight-value="${key}">
            ${weight}
          </strong>
        </span>

        <input type="range"
          min="0" max="100" step="5"
          value="${weight}"
          data-weight="${key}">
      </label>
    `).join("");
}

function pairSimilarityCard(pair) {
  const groups = Object.keys(APP.weights);

  return `<div class="glass-panel pair-card">
    <div class="panel-eyebrow">
      WEIGHTED SIMILARITY
    </div>

    <h3>${escapeHTML(pair.a.name)}
      ↔ ${escapeHTML(pair.b.name)}</h3>

    <div class="pair-score">${pair.score}%</div>

    <div class="mini-meter">
      <span style="width:${pair.score}%"></span>
    </div>

    <p class="pair-sub">
      ${pair.evidence.length} recorded evidence points.
      The score does not represent a probability.
    </p>

    <div class="similarity-breakdown">
      ${groups.map(group => {
        const matching = pair.evidence.filter(e =>
          e.group === group
        );

        const strength = Math.min(1,
          matching.reduce((sum, e) =>
            sum + e.strength, 0
          )
        );

        return `<div class="similarity-line">
          <span>${escapeHTML(evidenceGroupLabel(group))}</span>
          <div class="similarity-track">
            <div class="similarity-fill"
              style="width:${strength * 100}%"></div>
          </div>
          <span>${Math.round(strength * 100)}%</span>
        </div>`;
      }).join("")}
    </div>

    ${pair.evidence.map(e => `
      <div class="inspector-item">
        <span class="evidence-label">
          ${escapeHTML(evidenceGroupLabel(e.group))}
        </span>

        <div class="evidence-value">
          <strong>${escapeHTML(e.label)}</strong>:
          ${escapeHTML(e.details)}
        </div>
      </div>
    `).join("")}

  </div>`;
}

function renderComparison() {
  const gems = comparisonGems();

  $("#comparePick").innerHTML =
    '<option value="">Choose gemstone</option>' +
    sortGems(APP.gems)
      .filter(g => !APP.compareIds.includes(g.id))
      .map(g => `<option value="${escapeHTML(g.id)}">
        ${escapeHTML(g.name)}</option>`)
      .join("");

  $("#selectedGems").innerHTML = gems.map(g => `
    <div class="selected-gem" style="${gemStyle(g)}">
      <button class="selected-gem-remove"
        type="button"
        data-remove-compare="${escapeHTML(g.id)}">
        ×
      </button>

      <div class="selected-gem-image">
        ${g.images.cover
          ? `<img src="${escapeHTML(g.images.cover)}" alt="">`
          : "◇"}
      </div>

      <div class="selected-gem-body">
        ${escapeHTML(g.name)}
      </div>
    </div>
  `).join("");

  renderWeights();

  if (gems.length < 2) {
    $("#comparisonResults").innerHTML = `
      <div class="compare-empty">
        <div class="empty-gem">◇</div>
        <h3>Your Comparison Laboratory</h3>
        <p>Select at least two gemstones to compare.</p>
      </div>`;
    return;
  }

  const pairs = [];

  for (let i = 0; i < gems.length; i++) {
    for (let j = i + 1; j < gems.length; j++) {
      pairs.push(relationshipPair(gems[i], gems[j]));
    }
  }

  const pairCards = `<div class="comparison-pairs">
    ${pairs.map(pairSimilarityCard).join("")}
  </div>`;

  const selectedSection = $("#compareSection").value;
  const rowMode = $("#compareRows").value;
  const includeUnknown = $("#compareUnknown").checked;

  const sections = GEM_CONFIG.comparisonFields.filter(section =>
    selectedSection === "all" ||
    section.group === selectedSection
  );

  let rows = "";

  for (const section of sections) {
    for (const [label, path, type] of section.rows) {
      const status = comparisonStatus(gems, path, type);

      if (status === "empty" && !includeUnknown) continue;

      if (rowMode === "shared" && status !== "shared")
        continue;

      if (rowMode === "different" && status !== "different")
        continue;

      if (rowMode === "complete" &&
          ["empty", "incomplete"].includes(status))
        continue;

      rows += `<tr class="${status}">
        <td>
          ${escapeHTML(label)}
          ${status === "shared" ? " ✧" : ""}
        </td>

        ${gems.map(g => {
          const value = comparisonValue(g, path, type);

          return `<td>${escapeHTML(
            value || "Not recorded"
          )}</td>`;
        }).join("")}
      </tr>`;
    }
  }

  const table = `<div class="glass-panel compare-table-panel">
    <div class="panel-eyebrow">
      COMPLETE ATTRIBUTE MATRIX
    </div>

    <h3>Side-by-Side Comparison</h3>

    <div class="table-scroll">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Characteristic</th>
            ${gems.map(g =>
              `<th>${escapeHTML(g.name)}</th>`
            ).join("")}
          </tr>
        </thead>

        <tbody>
          ${rows || `<tr><td colspan="${gems.length + 1}">
            No properties match these display settings.
          </td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;

  $("#comparisonResults").innerHTML = pairCards + table;
}

/* =========================================
   BACKUPS
========================================= */

function exportCollection() {
  const payload = {
    format: "GemAtlasBackup",
    version: 2,
    exportedAt: new Date().toISOString(),
    gems: APP.gems
  };

  downloadable(
    JSON.stringify(payload, null, 2),
    "gem-atlas-backup.json",
    "application/json"
  );

  showToast("Backup export requested");
}

async function importCollection(file) {
  try {
    const data = JSON.parse(await file.text());

    if (data.format !== "GemAtlasBackup" ||
        !Array.isArray(data.gems)) {
      throw new Error("Not a Gem Atlas backup");
    }

    const records = data.gems.map(normalizeGem);

    if (records.some(g => !g.id || !g.name)) {
      throw new Error("Backup contains invalid records");
    }

    // Merge by stable ID; do not erase unrelated records.
    if (APP.persistenceAvailable) {
      await new Promise((resolve, reject) => {
        const tx = APP.db.transaction(GEM_STORE, "readwrite");
        const store = tx.objectStore(GEM_STORE);

        records.forEach(g => store.put(g));

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });

      await loadCollection();
    } else {
      const map = new Map(
        APP.gems.map(g => [g.id, g])
      );

      records.forEach(g => map.set(g.id, g));
      APP.gems = [...map.values()];
      renderAll();
    }

    showToast(`${records.length} records imported`);
  } catch (error) {
    console.error(error);
    showToast("Import failed: " + error.message);
  }
}

/* =========================================
   NAVIGATION AND SELECTS
========================================= */

function switchView(view) {
  APP.view = view;

  $$(".view").forEach(section => {
    const active = section.id === "view-" + view;
    section.classList.toggle("active", active);
    section.hidden = !active;
  });

  $$(".main-tab").forEach(tab => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);

    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });

  if (view === "atlas") renderAtlas();
  if (view === "statistics") renderStatistics();
  if (view === "compare") renderComparison();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateSelects() {
  const classFilter = $("#classFilter");
  const oldClass = classFilter.value;

  classFilter.innerHTML =
    '<option value="">All classifications</option>' +
    GEM_CONFIG.classifications.map(c =>
      `<option value="${escapeHTML(c)}">
        ${escapeHTML(c)}</option>`
    ).join("");

  classFilter.value = oldClass;

  const options = sortGems(APP.gems).map(g =>
    `<option value="${escapeHTML(g.id)}">
      ${escapeHTML(g.name)}</option>`
  ).join("");

  for (const selector of ["#pathFrom", "#pathTo"]) {
    const el = $(selector);
    const old = el.value;

    el.innerHTML = options;

    if (APP.gems.some(g => g.id === old)) {
      el.value = old;
    }
  }

  if (APP.gems.length > 1 &&
      $("#pathFrom").value === $("#pathTo").value) {
    $("#pathTo").selectedIndex = 1;
  }
}

function renderAll() {
  renderSummary();
  updateSelects();
  renderLibrary();

  if (APP.view === "atlas") renderAtlas();
  if (APP.view === "statistics") renderStatistics();
  if (APP.view === "compare") renderComparison();
}

/* =========================================
   EVENT LISTENERS
========================================= */

function attachEvents() {

  $("#brandHome").onclick = () => switchView("library");

  $("#headerAdd").onclick = () => openEditor();
  $("#emptyAdd").onclick = () => openEditor();

  $("#exportData").onclick = exportCollection;

  $("#importData").onclick = () =>
    $("#importFile").click();

  $("#importFile").onchange = async event => {
    const file = event.target.files?.[0];

    if (file) await importCollection(file);

    event.target.value = "";
  };

  $("#openAbout").onclick = () =>
    openLayer("#aboutBackdrop");

  $("#closeAbout").onclick = () =>
    closeLayer("#aboutBackdrop");

  $$(".main-tab").forEach(tab => {
    tab.onclick = () => switchView(tab.dataset.view);
  });

  // LIBRARY
  $("#searchInput").oninput = renderLibrary;

  ["rarityFilter", "classFilter", "sortFilter"]
    .forEach(id => {
      $("#" + id).onchange = renderLibrary;
    });

  $("#clearFilters").onclick = resetFilters;

  $("#quickFilters").onclick = event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    APP.quickFilter = button.dataset.filter;

    $$(".filter-chip").forEach(b =>
      b.classList.toggle("active", b === button)
    );

    renderLibrary();
  };

  $("#gemGrid").onclick = async event => {
    const favorite = event.target.closest("[data-favorite]");

    if (favorite) {
      await toggleFavorite(favorite.dataset.favorite);
      return;
    }

    const card = event.target.closest("[data-gem-id]");
    if (card) openProfile(card.dataset.gemId);
  };

  $("#gemGrid").onkeydown = event => {
    if (event.target.matches(".gem-card") &&
        ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openProfile(event.target.dataset.gemId);
    }
  };

  // PROFILE
  $("#profileContent").onclick = async event => {
    const open = event.target.closest("[data-open-gem]");

    if (open) {
      openProfile(open.dataset.openGem);
      return;
    }

    const button = event.target.closest(
      "[data-profile-action]"
    );

    if (!button) return;

    const id = APP.currentGemId;

    switch (button.dataset.profileAction) {
      case "close":
        closeProfile();
        break;

      case "edit":
        openEditor(id);
        break;

      case "delete":
        requestDelete(id);
        break;

      case "duplicate":
        await duplicateGem(id);
        break;

      case "atlas":
        APP.inspector = { type: "gem", id };
        closeProfile();
        switchView("atlas");
        break;

      case "compare":
        if (!APP.compareIds.includes(id) &&
            APP.compareIds.length < 4) {
          APP.compareIds.push(id);
        }
        closeProfile();
        switchView("compare");
        break;
    }
  };

  // EDITOR TABS
  $("#editorTabs").onclick = event => {
    const button = event.target.closest(
      "[data-editor-tab]"
    );

    if (button) setEditorTab(button.dataset.editorTab);
  };

  $("#editorFields").addEventListener("input", event => {
    const target = event.target;

    if (target.dataset.path)
      updateEditorValue(target);

    if (target.dataset.colorField)
      updateColorValue(target);

    if (target.dataset.manualField)
      updateManualValue(target);
  });

  $("#editorFields").addEventListener(
    "change", async event => {
      const target = event.target;

      if (target.dataset.path)
        updateEditorValue(target);

      if (target.dataset.colorField)
        updateColorValue(target);

      if (target.dataset.manualField)
        updateManualValue(target);

      if (target.dataset.classification) {
        const current = new Set(
          APP.editingGem.classifications
        );

        if (target.checked)
          current.add(target.dataset.classification);
        else
          current.delete(target.dataset.classification);

        APP.editingGem.classifications = [...current];
      }

      if (target.dataset.imageType)
        await handleImageUpload(target);
    }
  );

  $("#editorFields").onclick = event => {
    if (event.target.closest("#addColorRow")) {
      APP.editingGem.colors.push({
        name: "",
        rarity: "Common"
      });
      renderEditorFields();
      return;
    }

    const removeColor = event.target.closest(
      "[data-remove-color]"
    );

    if (removeColor) {
      APP.editingGem.colors.splice(
        Number(removeColor.dataset.removeColor), 1
      );
      renderEditorFields();
      return;
    }

    if (event.target.closest("#addManualRow")) {
      APP.editingGem.manualRelations.push({
        targetId: "",
        type: "Custom Relationship",
        note: ""
      });
      renderEditorFields();
      return;
    }

    const removeManual = event.target.closest(
      "[data-remove-manual]"
    );

    if (removeManual) {
      APP.editingGem.manualRelations.splice(
        Number(removeManual.dataset.removeManual), 1
      );
      renderEditorFields();
      return;
    }

    const removeImage = event.target.closest(
      "[data-remove-image]"
    );

    if (removeImage) {
      APP.editingGem.images[
        removeImage.dataset.removeImage
      ] = "";

      renderEditorFields();
    }
  };

  $("#gemForm").onsubmit = async event => {
    event.preventDefault();
    await saveEditingGem();
  };

  $("#closeEditor").onclick = closeEditor;
  $("#cancelEditor").onclick = closeEditor;

  $("#cancelDelete").onclick = () => {
    APP.deleteId = null;
    closeLayer("#confirmBackdrop");
  };

  $("#confirmDelete").onclick = executeDelete;

  // ATLAS
  $("#atlasMode").onchange = () => renderAtlas(true);
  $("#atlasCategory").onchange = () => renderAtlas(true);
  $("#atlasThreshold").onchange = () => renderAtlas(true);
  $("#atlasLabels").onchange = drawNetwork;

  $("#zoomIn").onclick = () => zoomNetwork(1.25);
  $("#zoomOut").onclick = () => zoomNetwork(.8);

  $("#resetMap").onclick = () => {
    APP.network.scale = 1;
    APP.network.x = 0;
    APP.network.y = 0;
    drawNetwork();
  };

  $("#treeStage").onclick = event => {
    const gem = event.target.closest("[data-tree-gem]");
    if (!gem) return;

    APP.inspector = {
      type: "gem",
      id: gem.dataset.treeGem
    };

    renderInspector();
  };

  $("#inspectorContent").onclick = event => {
    const open = event.target.closest(
      "[data-inspect-open]"
    );

    if (open) {
      openProfile(open.dataset.inspectOpen);
      return;
    }

    const edge = event.target.closest(
      "[data-inspect-edge]"
    );

    if (edge) {
      const [a, b] = edge.dataset.inspectEdge.split("|");

      APP.inspector = { type: "edge", a, b };
      renderInspector();
    }
  };

  $("#findPath").onclick = renderPathResult;

  // GRAPH INTERACTION
  const svg = $("#networkSvg");

  svg.addEventListener("click", event => {
    if (APP.suppressGraphClick) return;

    const node = event.target.closest("[data-node-id]");
    const edge = event.target.closest("[data-edge-from]");

    if (node) {
      APP.inspector = {
        type: "gem",
        id: node.dataset.nodeId
      };
    } else if (edge) {
      APP.inspector = {
        type: "edge",
        a: edge.dataset.edgeFrom,
        b: edge.dataset.edgeTo
      };
    } else {
      return;
    }

    renderInspector();
    drawNetwork();
  });

  svg.addEventListener("pointerdown", event => {
    const position = pointerPosition(event);

    APP.pointer = {
      x: position.x,
      y: position.y,
      oldX: APP.network.x,
      oldY: APP.network.y,
      moved: false
    };

    svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener("pointermove", event => {
    if (!APP.pointer) return;

    const position = pointerPosition(event);
    const dx = position.x - APP.pointer.x;
    const dy = position.y - APP.pointer.y;

    if (Math.hypot(dx, dy) > 6)
      APP.pointer.moved = true;

    if (!APP.pointer.moved) return;

    APP.network.x = APP.pointer.oldX + dx;
    APP.network.y = APP.pointer.oldY + dy;

    drawNetwork();
  });

  svg.addEventListener("pointerup", () => {
    if (!APP.pointer) return;

    APP.suppressGraphClick = APP.pointer.moved;
    APP.pointer = null;

    setTimeout(() => {
      APP.suppressGraphClick = false;
    }, 100);
  });

  svg.addEventListener("pointercancel", () => {
    APP.pointer = null;
  });

  svg.addEventListener("wheel", event => {
    event.preventDefault();

    const point = pointerPosition(event);

    zoomNetwork(
      event.deltaY < 0 ? 1.13 : .89,
      point.x, point.y
    );
  }, { passive: false });

  // STATISTICS
  [
    "statScope",
    "statRarityFilter",
    "statMissing",
    "statMeasure",
    "statTopN",
    "statSort",
    "statNumericMode",
    "statBins"
  ].forEach(id => {
    $("#" + id).onchange = renderStatistics;
  });

  $("#statChart").onchange =
    updateStatisticsControls;

  $("#statDimension").onchange = renderStatistics;
  $("#statSecond").onchange = renderStatistics;

  $("#exportStatistics").onclick = () => {
    downloadable(
      APP.statisticsCSV,
      "gem-atlas-statistics.csv",
      "text/csv;charset=utf-8"
    );

    showToast("Statistics CSV export requested");
  };

  ["crossDimensionA", "crossDimensionB"].forEach(id => {
    $("#" + id).onchange = () => {
      const suffix = id.endsWith("A") ? "A" : "B";

      populateCrossValue(
        "crossValue" + suffix,
        $("#" + id).value
      );

      renderCrossAnalysis();
    };
  });

  $("#crossValueA").onchange = renderCrossAnalysis;
  $("#crossValueB").onchange = renderCrossAnalysis;

  $("#crossResults").onclick = event => {
    const button = event.target.closest(
      "[data-cross-gem]"
    );

    if (button)
      openProfile(button.dataset.crossGem);
  };

  // COMPARISON
  $("#addCompare").onclick = () => {
    const id = $("#comparePick").value;
    if (!id) return;

    if (APP.compareIds.length >= 4) {
      showToast("Maximum of four gemstones");
      return;
    }

    if (!APP.compareIds.includes(id)) {
      APP.compareIds.push(id);
    }

    renderComparison();
  };

  $("#clearCompare").onclick = () => {
    APP.compareIds = [];
    renderComparison();
  };

  $("#selectedGems").onclick = event => {
    const remove = event.target.closest(
      "[data-remove-compare]"
    );

    if (!remove) return;

    APP.compareIds = APP.compareIds.filter(id =>
      id !== remove.dataset.removeCompare
    );

    renderComparison();
  };

  ["compareSection", "compareRows", "compareUnknown"]
    .forEach(id => {
      $("#" + id).onchange = renderComparison;
    });

  $("#weightControls").oninput = event => {
    const target = event.target;
    const group = target.dataset.weight;

    if (!group) return;

    APP.weights[group] = Number(target.value);

    const label = $("#weightControls").querySelector(
      `[data-weight-value="${group}"]`
    );

    if (label) label.textContent = target.value;
  };

  // Calculate on release so sliders don't
  // destroy their own DOM elements mid-drag.
  $("#weightControls").onchange = renderComparison;

  $("#resetWeights").onclick = () => {
    APP.weights = { ...GEM_CONFIG.weights };
    renderComparison();
  };

  // BACKDROPS
  for (const id of [
    "profileBackdrop",
    "editorBackdrop",
    "confirmBackdrop",
    "aboutBackdrop"
  ]) {
    $("#" + id).onclick = event => {
      if (event.target !== $("#" + id)) return;

      if (id === "profileBackdrop") closeProfile();
      if (id === "editorBackdrop") closeEditor();

      if (id === "confirmBackdrop") {
        APP.deleteId = null;
        closeLayer("#confirmBackdrop");
      }

      if (id === "aboutBackdrop")
        closeLayer("#aboutBackdrop");
    };
  }

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    const stack = [
      "#confirmBackdrop",
      "#editorBackdrop",
      "#profileBackdrop",
      "#aboutBackdrop"
    ];

    const open = stack.find(selector =>
      $(selector).classList.contains("is-open")
    );

    if (open) {
      if (open === "#profileBackdrop") closeProfile();
      else {
        closeLayer(open);
        if (open === "#editorBackdrop")
          APP.editingGem = null;
        if (open === "#confirmBackdrop")
          APP.deleteId = null;
      }
    }
  });
}

/* =========================================
   INITIALIZATION
========================================= */

async function initializeApp() {
  attachEvents();

  const dimensions = GEM_CONFIG.dimensions;
  const categorical = dimensions.filter(d =>
    ["single", "multi", "colors", "colorRarity"]
      .includes(d.type)
  );

  $("#statDimension").innerHTML = optionHTML(dimensions);
  $("#statSecond").innerHTML = optionHTML(dimensions);

  $("#statDimension").value = "rarity";
  $("#statSecond").value = "family.group";

  $("#crossDimensionA").innerHTML =
    optionHTML(categorical);

  $("#crossDimensionB").innerHTML =
    optionHTML(categorical);

  $("#crossDimensionA").value = "rarity";
  $("#crossDimensionB").value = "family.group";

  updateStatisticsControls();

  try {
    APP.db = await openDatabase();
    await seedDatabase();

    APP.persistenceAvailable = true;
    await loadCollection();

  } catch (error) {
    console.error("Gem Atlas database error:", error);

    APP.persistenceAvailable = false;
    APP.gems = GEM_SEED_DATA.map(normalizeGem);
    renderAll();

    showToast(
      "Local storage unavailable — session-only collection"
    );
  }

  populateCrossValue(
    "crossValueA", $("#crossDimensionA").value
  );

  populateCrossValue(
    "crossValueB", $("#crossDimensionB").value
  );

  renderCrossAnalysis();

  console.info(
    "Gem Atlas V2 initialized:",
    APP.gems.length,
    "gemstones"
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
