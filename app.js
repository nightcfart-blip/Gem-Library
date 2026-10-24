
/* =========================================
   GEM ATLAS — APP.JS
   V1.0 LIBRARY ENGINE
========================================= */

"use strict";

/* =========================================
   STATE
========================================= */

const APP = {

  db: null,
  gems: [],

  currentGemId: null,
  editingGem: null,

  activeTab: "identity",
  quickFilter: "all",

  deleteId: null,

  toastTimer: null,

  persistenceAvailable: true

};

const DB_NAME = "GemAtlasDatabase";
const DB_VERSION = 1;
const GEM_STORE = "gems";
const META_STORE = "metadata";


/* =========================================
   HELPERS
========================================= */

const $ = selector => document.querySelector(selector);

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

}

function valueAt(obj, path) {

  return path
    .split(".")
    .reduce(
      (value, key) => value?.[key],
      obj
    );

}

function setAt(obj, path, value) {

  const parts = path.split(".");
  let target = obj;

  for (let i = 0; i < parts.length - 1; i++) {

    const key = parts[i];

    if (!target[key] || typeof target[key] !== "object") {
      target[key] = {};
    }

    target = target[key];

  }

  target[parts[parts.length - 1]] = value;

}

function uid() {

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    "gem-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 12)
  );

}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function arrayText(value) {

  if (!Array.isArray(value)) {
    return String(value ?? "");
  }

  return value.join(", ");

}

function textArray(value) {

  return String(value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

}

function isFilled(value) {

  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;

}

function validColor(color) {

  return /^#[0-9a-f]{6}$/i.test(color || "")
    ? color
    : "#b8a3e8";

}

function hexToRGBA(hex, alpha = 0.3) {

  const clean = validColor(hex).slice(1);

  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;

}

function gemColor(gem) {

  return validColor(
    gem.appearance?.color ||
    gem.colors?.[0]?.hex
  );

}

function gemStyle(gem) {

  const color = gemColor(gem);

  return [
    `--gem-color:${color}`,
    `--gem-glow:${hexToRGBA(color, 0.34)}`
  ].join(";");

}

function formatRange(min, max, suffix = "") {

  const a = isFilled(min);
  const b = isFilled(max);

  if (!a && !b) return "";

  if (a && b) {

    if (Number(min) === Number(max)) {
      return `${min}${suffix}`;
    }

    return `${min}–${max}${suffix}`;

  }

  return `${a ? min : max}${suffix}`;

}

function firstLine(value) {

  return String(value || "")
    .split("\n")
    .map(x => x.trim())
    .find(Boolean) || "";

}

function showToast(message) {

  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(APP.toastTimer);

  APP.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);

}

function setBodyLock() {

  const anyOpen = [
    "#profileBackdrop",
    "#editorBackdrop",
    "#confirmBackdrop",
    "#aboutBackdrop"
  ].some(selector => $(selector).classList.contains("is-open"));

  document.body.classList.toggle(
    "modal-open",
    anyOpen
  );

}

function openLayer(selector) {

  const element = $(selector);

  element.classList.add("is-open");
  element.setAttribute("aria-hidden", "false");

  setBodyLock();

}

function closeLayer(selector) {

  const element = $(selector);

  element.classList.remove("is-open");
  element.setAttribute("aria-hidden", "true");

  setBodyLock();

}

function findGem(id) {
  return APP.gems.find(gem => gem.id === id);
}


/* =========================================
   INDEXEDDB DATABASE
========================================= */

function openDatabase() {

  return new Promise((resolve, reject) => {

    if (!window.indexedDB) {
      reject(new Error("IndexedDB unavailable."));
      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = event => {

      const database = event.target.result;

      if (!database.objectStoreNames.contains(GEM_STORE)) {

        database.createObjectStore(
          GEM_STORE,
          { keyPath: "id" }
        );

      }

      if (!database.objectStoreNames.contains(META_STORE)) {

        database.createObjectStore(
          META_STORE,
          { keyPath: "key" }
        );

      }

    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onblocked = () => {
      reject(new Error("Database opening was blocked."));
    };

  });

}

function dbTransaction(store, mode, executor) {

  return new Promise((resolve, reject) => {

    if (!APP.db) {
      reject(new Error("Database unavailable."));
      return;
    }

    const transaction = APP.db.transaction(
      store,
      mode
    );

    const objectStore = transaction.objectStore(store);

    let result;

    transaction.oncomplete = () => {
      resolve(result);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
        new Error("Transaction aborted.")
      );
    };

    try {

      executor(
        objectStore,
        value => { result = value; }
      );

    } catch (error) {

      transaction.abort();
      reject(error);

    }

  });

}

async function dbGetAll() {

  return dbTransaction(
    GEM_STORE,
    "readonly",
    (store, output) => {

      const request = store.getAll();

      request.onsuccess = () => {
        output(request.result);
      };

    }
  );

}

async function dbGetMeta(key) {

  return dbTransaction(
    META_STORE,
    "readonly",
    (store, output) => {

      const request = store.get(key);

      request.onsuccess = () => {
        output(request.result);
      };

    }
  );

}

async function dbSaveGem(gem) {

  await dbTransaction(
    GEM_STORE,
    "readwrite",
    store => {
      store.put(clone(gem));
    }
  );

}

async function dbDeleteGem(id) {

  await dbTransaction(
    GEM_STORE,
    "readwrite",
    store => {
      store.delete(id);
    }
  );

}

async function seedDatabase() {

  const marker = await dbGetMeta("seeded");

  if (marker?.value) return;

  const transaction = APP.db.transaction(
    [GEM_STORE, META_STORE],
    "readwrite"
  );

  const gemStore = transaction.objectStore(GEM_STORE);
  const metaStore = transaction.objectStore(META_STORE);

  /*
    The marker prevents sample records from
    coming back after being deleted.
  */

  GEM_SEED_DATA.forEach(record => {

    const gem = normalizeGem(record);

    gem.createdAt = new Date().toISOString();
    gem.updatedAt = gem.createdAt;

    gemStore.put(gem);

  });

  metaStore.put({
    key: "seeded",
    value: true
  });

  await new Promise((resolve, reject) => {

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

  });

}

async function loadCollection() {

  if (APP.persistenceAvailable) {

    const records = await dbGetAll();

    APP.gems = records.map(normalizeGem);

  } else {

    APP.gems = GEM_SEED_DATA.map(normalizeGem);

  }

  renderAll();

}


/* =========================================
   COLLECTION STATISTICS
========================================= */

function calculateSummary() {

  const families = new Set();

  let rare = 0;

  const speciesCounts = new Map();

  for (const gem of APP.gems) {

    const species = (
      gem.family?.species ||
      gem.family?.varietyOf ||
      ""
    ).trim().toLowerCase();

    if (species) {

      families.add(species);

      speciesCounts.set(
        species,
        (speciesCounts.get(species) || 0) + 1
      );

    }

    if (
      gem.rarity === "Rare" ||
      gem.rarity === "Exotic"
    ) {
      rare++;
    }

  }

  /*
    Number of unique pairs with the
    same mineral species.
    n(n-1)/2 within each species.
  */

  let links = 0;

  for (const count of speciesCounts.values()) {
    links += (count * (count - 1)) / 2;
  }

  return {
    total: APP.gems.length,
    families: families.size,
    rare,
    links
  };

}

function renderSummary() {

  const summary = calculateSummary();

  $("#statTotal").textContent = summary.total;
  $("#statFamilies").textContent = summary.families;
  $("#statRare").textContent = summary.rare;
  $("#statLinks").textContent = summary.links;

}


/* =========================================
   SEARCH INDEX
========================================= */

function searchTextForGem(gem) {

  const parts = [

    gem.name,
    gem.nickname,

    ...gem.names,

    gem.description,

    gem.rarity,
    gem.originType,

    ...gem.classifications,

    gem.family.group,
    gem.family.species,
    gem.family.varietyOf,

    gem.chemical.formula,

    ...gem.chemical.traceElements,

    ...gem.colors.map(color => color.name),

    ...gem.geography.countries,
    ...gem.geography.localities,

    ...gem.history.cultures,

    ...gem.associations.zodiac,
    ...gem.associations.planetary,
    ...gem.associations.birthstone,
    ...gem.associations.anniversary,

    ...gem.symbolism.meanings,
    ...gem.symbolism.chakras,

    ...gem.personal.keywords

  ];

  return parts
    .filter(isFilled)
    .join(" ")
    .toLocaleLowerCase();

}

function filteredGems() {

  const query = $("#searchInput").value
    .trim()
    .toLocaleLowerCase();

  const rarity = $("#rarityFilter").value;
  const classification = $("#classFilter").value;
  const sort = $("#sortFilter").value;

  let list = APP.gems.filter(gem => {

    if (
      query &&
      !searchTextForGem(gem).includes(query)
    ) {
      return false;
    }

    if (rarity && gem.rarity !== rarity) {
      return false;
    }

    if (
      classification &&
      !gem.classifications.includes(classification)
    ) {
      return false;
    }

    if (
      APP.quickFilter === "favorites" &&
      !gem.favorite
    ) {
      return false;
    }

    if (
      APP.quickFilter === "natural" &&
      gem.originType !== "Natural"
    ) {
      return false;
    }

    if (
      APP.quickFilter === "synthetic" &&
      gem.originType !== "Synthetic"
    ) {
      return false;
    }

    if (
      APP.quickFilter === "organic" &&
      !gem.classifications.includes("Organic")
    ) {
      return false;
    }

    return true;

  });

  const rarityOrder = {
    "Common": 0,
    "Uncommon": 1,
    "Rare": 2,
    "Exotic": 3
  };

  list.sort((a, b) => {

    switch (sort) {

      case "name-desc":
        return b.name.localeCompare(a.name);

      case "rarity":
        return (
          (rarityOrder[b.rarity] ?? -1) -
          (rarityOrder[a.rarity] ?? -1)
        );

      case "hardness":
        return (
          (Number(b.physical.mohsMax) || 0) -
          (Number(a.physical.mohsMax) || 0)
        );

      case "newest":
        return String(b.createdAt)
          .localeCompare(String(a.createdAt));

      case "oldest":
        return String(a.createdAt)
          .localeCompare(String(b.createdAt));

      default:
        return a.name.localeCompare(b.name);

    }

  });

  return list;

}


/* =========================================
   LIBRARY CARDS
========================================= */

function cardImage(gem) {

  if (gem.images?.cover) {

    return `
      <img
        src="${escapeHTML(gem.images.cover)}"
        alt="${escapeHTML(gem.name)}"
        loading="lazy"
      >
    `;

  }

  return `
    <div class="gem-placeholder">
      <span>◇</span>
    </div>
  `;

}

function renderCard(gem) {

  const family = (
    gem.family.varietyOf ||
    gem.family.species ||
    gem.family.group ||
    "Unclassified material"
  );

  const hardness = formatRange(
    gem.physical.mohsMin,
    gem.physical.mohsMax
  ) || "—";

  const color = gem.colors?.[0]?.name || "—";

  return `
    <article
      class="gem-card"
      data-gem-id="${escapeHTML(gem.id)}"
      tabindex="0"
      role="button"
      aria-label="Open ${escapeHTML(gem.name)}"
      style="${gemStyle(gem)}"
    >

      <div class="gem-card-image">

        ${cardImage(gem)}

        <button
          class="favorite-button ${gem.favorite ? "is-favorite" : ""}"
          data-action="favorite"
          data-id="${escapeHTML(gem.id)}"
          type="button"
          aria-label="Toggle favorite"
          aria-pressed="${gem.favorite}"
        >${gem.favorite ? "♥" : "♡"}</button>

        ${gem.rarity
          ? `<span class="card-rarity">${escapeHTML(gem.rarity)}</span>`
          : ""
        }

      </div>

      <div class="gem-card-body">

        <h3 class="gem-card-title">
          ${escapeHTML(gem.name)}
        </h3>

        <p class="gem-card-family">
          ${escapeHTML(family)}
        </p>

        <div class="gem-card-details">

          <div class="card-detail">
            <span class="card-detail-label">MOHS</span>
            <span class="card-detail-value">
              ${escapeHTML(hardness)}
            </span>
          </div>

          <div class="card-detail">
            <span class="card-detail-label">COLOR</span>
            <span class="card-detail-value">
              ${escapeHTML(color)}
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

  $("#gemGrid").innerHTML = visible
    .map(renderCard)
    .join("");

  $("#libraryCount").textContent =
    `${visible.length} ${visible.length === 1 ? "ENTRY" : "ENTRIES"}`;

  $("#emptyState").hidden = visible.length !== 0;

}


/* =========================================
   CLASSIFICATION FILTER
========================================= */

function renderClassificationFilter() {

  const select = $("#classFilter");

  const current = select.value;

  select.innerHTML = `
    <option value="">All classifications</option>
    ${GEM_CONFIG.classifications.map(item => `
      <option value="${escapeHTML(item)}">
        ${escapeHTML(item)}
      </option>
    `).join("")}
  `;

  select.value = current;

}


/* =========================================
   PROFILE DISPLAY HELPERS
========================================= */

function property(label, value, full = false) {

  if (!isFilled(value)) return "";

  return `
    <div class="property-item ${full ? "full" : ""}">
      <span class="property-label">
        ${escapeHTML(label)}
      </span>

      <div class="property-value">
        ${escapeHTML(arrayText(value))}
      </div>
    </div>
  `;

}

function profileSection(title, content, note = "") {

  if (!content.trim()) {
    return "";
  }

  return `
    <section class="profile-section">

      <div class="profile-section-title">
        ${escapeHTML(title)}
      </div>

      <div class="property-grid">
        ${content}
      </div>

      ${note
        ? `<div class="profile-note">${escapeHTML(note)}</div>`
        : ""
      }

    </section>
  `;

}

function renderProfileProperties(gem) {

  const sections = [];

  /* IDENTITY */

  sections.push(
    profileSection(
      "Identity & Classification",

      property("Alternative Names", gem.names) +
      property("Material Origin", gem.originType) +
      property("Classification", gem.classifications, true) +
      property("Rarity", gem.rarity) +
      property("Rarity Explanation", gem.rarityReason, true)

    )
  );

  /* MINERAL FAMILY */

  sections.push(
    profileSection(
      "Mineral Family",

      property("Mineral Group", gem.family.group) +
      property("Mineral Species", gem.family.species) +
      property("Variety Of", gem.family.varietyOf) +
      property("Related Gems", gem.family.related) +
      property(
        "Distinguishing Features",
        gem.family.varietyDifference,
        true
      ) +
      property("Family Notes", gem.family.notes, true)

    )
  );

  /* CHEMISTRY */

  sections.push(
    profileSection(
      "Chemical Composition",

      property("Chemical Formula", gem.chemical.formula) +
      property("Trace Elements", gem.chemical.traceElements) +
      property("Composition", gem.chemical.composition, true) +
      property("Color Causes", gem.chemical.colorCauses, true) +
      property("Further Notes", gem.chemical.notes, true)

    )
  );

  /* PHYSICAL PROPERTIES */

  sections.push(
    profileSection(
      "Physical Properties",

      property(
        "Mohs Hardness",
        formatRange(
          gem.physical.mohsMin,
          gem.physical.mohsMax
        )
      ) +

      property(
        "Density",
        formatRange(
          gem.physical.densityMin,
          gem.physical.densityMax,
          " g/cm³"
        )
      ) +

      property(
        "Crystal System",
        gem.physical.crystalSystem
      ) +

      property("Cleavage", gem.physical.cleavage) +
      property("Fracture", gem.physical.fracture) +
      property("Streak", gem.physical.streak) +
      property("Tenacity", gem.physical.tenacity)

    )
  );

  /* OPTICAL PROPERTIES */

  sections.push(
    profileSection(
      "Optical Properties",

      property("Luster", gem.optical.luster) +
      property("Transparency", gem.optical.transparency) +
      property(
        "Refractive Index",
        gem.optical.refractiveIndex
      ) +
      property(
        "Birefringence",
        gem.optical.birefringence
      ) +
      property(
        "Luminescence",
        gem.optical.luminescence,
        true
      ) +
      property(
        "Pleochroism",
        gem.optical.pleochroism,
        true
      ) +
      property("Dispersion", gem.optical.dispersion) +
      property(
        "Other Optical Effects",
        gem.optical.other,
        true
      )

    )
  );

  /* COLORS */

  if (gem.colors.length) {

    const colors = gem.colors.map(color => {

      return `
        <div class="color-display">

          <span
            class="color-dot"
            style="background:${validColor(color.hex)}"
          ></span>

          <div>
            <div class="color-name">
              ${escapeHTML(color.name)}
            </div>

            <div class="color-frequency">
              ${escapeHTML(color.rarity || "Unspecified")}
            </div>
          </div>

        </div>
      `;

    }).join("");

    sections.push(`
      <section class="profile-section">
        <div class="profile-section-title">
          Color Variations
        </div>

        <div class="color-display-list">
          ${colors}
        </div>
      </section>
    `);

  }

  /* GEOGRAPHY */

  sections.push(
    profileSection(
      "Geographic Distribution",

      property(
        "Countries Where Found",
        gem.geography.countries,
        true
      ) +

      property(
        "Mining Locations",
        gem.geography.localities,
        true
      ) +

      property(
        "Geological Formation",
        gem.geography.geology,
        true
      ) +

      property(
        "Mining & Availability",
        gem.geography.miningNotes,
        true
      )

    )
  );

  /* DISCOVERY */

  sections.push(
    profileSection(
      "Discovery & Scientific History",

      property("Discovery Year", gem.discovery.year) +
      property("Discovery Location", gem.discovery.origin) +
      property("Discoverer", gem.discovery.person) +
      property("Discovery Country", gem.discovery.country) +
      property("Namesake", gem.discovery.namesake, true) +
      property(
        "Oldest Specimen",
        gem.discovery.oldestSpecimen,
        true
      ) +
      property(
        "Later Scientific Discoveries",
        gem.discovery.further,
        true
      )

    )
  );

  /* HISTORICAL RECORD */

  sections.push(
    profileSection(
      "History & Cultures",

      property(
        "Prominent Cultures",
        gem.history.cultures,
        true
      ) +
      property("Historical Facts", gem.history.facts, true) +
      property("Timeline", gem.history.timeline, true)

    )
  );

  /* ASSOCIATIONS */

  sections.push(
    profileSection(
      "Astrological & Calendar Associations",

      property("Zodiac", gem.associations.zodiac) +
      property("Planetary / Star", gem.associations.planetary) +
      property("Birthstone", gem.associations.birthstone) +
      property("Anniversary", gem.associations.anniversary) +
      property(
        "Substitute Roles",
        gem.associations.substitutes,
        true
      ) +
      property(
        "Traditional Systems / Notes",
        gem.associations.systemNotes,
        true
      ),

      "Associations may differ by culture, region and historical tradition."

    )
  );

  /* SYMBOLISM */

  sections.push(
    profileSection(
      "Symbolism & Meaning",

      property("Represents", gem.symbolism.meanings, true) +
      property("Chakras", gem.symbolism.chakras) +
      property(
        "Traditional Properties",
        gem.symbolism.properties,
        true
      ) +
      property(
        "Additional Symbolism",
        gem.symbolism.notes,
        true
      )

    )
  );

  /* HEALING TRADITIONS */

  sections.push(
    profileSection(
      "Traditional Healing Beliefs",

      property("Physical", gem.healing.physical, true) +
      property("Emotional", gem.healing.emotional, true) +
      property("Spiritual", gem.healing.spiritual, true) +
      property("Traditional System", gem.healing.tradition, true),

      "These entries document traditional beliefs, not scientifically established medical treatments."

    )
  );

  /* MARKET VALUE */

  const currency = gem.market.currency || "USD";

  let price = "";

  if (
    isFilled(gem.market.minPrice) ||
    isFilled(gem.market.maxPrice)
  ) {

    price = formatRange(
      gem.market.minPrice,
      gem.market.maxPrice
    ) + " " + currency + " / carat";

  }

  sections.push(
    profileSection(
      "Price & Market Value",

      property("Price Range", price, true) +
      property("Quality Conditions", gem.market.quality, true) +
      property("Treatments", gem.market.treatments, true) +
      property("Market Notes", gem.market.notes, true) +
      property("Price Reference Date", gem.market.priceDate)

    )
  );

  /* REFERENCES */

  sections.push(
    profileSection(
      "Sources & References",

      property(
        "Reference Material",
        gem.sources.references,
        true
      ) +
      property("Confidence", gem.sources.confidence) +
      property("Source Notes", gem.sources.notes, true)

    )
  );

  /* PERSONAL */

  sections.push(
    profileSection(
      "Personal Archive",

      property(
        "Personal Opinion",
        gem.personal.opinion,
        true
      ) +
      property(
        "Additional Notes",
        gem.personal.notes,
        true
      ) +
      property("Keywords", gem.personal.keywords, true)

    )
  );

  return sections.filter(Boolean).join("");

}


/* =========================================
   GEMSTONE PROFILE
========================================= */

function openProfile(id) {

  const gem = findGem(id);

  if (!gem) return;

  APP.currentGemId = id;

  const banner =
    gem.images.banner ||
    gem.images.cover;

  const tags = [
    gem.rarity,
    ...gem.classifications
  ].filter(Boolean);

  const html = `

    <div style="${gemStyle(gem)}">

      <div class="profile-hero">

        <div class="profile-banner">

          ${banner
            ? `<img
                src="${escapeHTML(banner)}"
                alt=""
              >`
            : ""
          }

        </div>

        <div class="profile-top-actions">

          <button
            class="icon-button"
            data-profile-action="edit"
            title="Edit gemstone"
            type="button"
          >✎</button>

          <button
            class="icon-button"
            data-profile-action="close"
            title="Close"
            type="button"
          >×</button>

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

          ${gem.nickname
            ? `<div class="profile-nicknames">
                ${escapeHTML(gem.nickname)}
              </div>`
            : ""
          }

          <div class="profile-tags">
            ${tags.map((tag, index) => `
              <span class="tag ${index === 0 ? "gold" : ""}">
                ${escapeHTML(tag)}
              </span>
            `).join("")}
          </div>

        </div>

      </div>

      <div class="profile-content">

        ${gem.description
          ? `<div class="profile-description">
              ${escapeHTML(gem.description)}
            </div>`
          : ""
        }

        ${renderProfileProperties(gem)}

        <div class="profile-bottom-actions">

          <button
            class="primary-button"
            data-profile-action="edit"
            type="button"
          >✎ Edit Gemstone</button>

          <button
            class="secondary-button"
            data-profile-action="duplicate"
            type="button"
          >Duplicate</button>

          <button
            class="danger-button"
            data-profile-action="delete"
            type="button"
          >Delete</button>

        </div>

      </div>

    </div>

  `;

  $("#profileContent").innerHTML = html;

  $("#profileModal").scrollTop = 0;

  openLayer("#profileBackdrop");

}

function closeProfile() {

  closeLayer("#profileBackdrop");
  APP.currentGemId = null;

}


/* =========================================
   EDITOR COMPONENTS
========================================= */

function renderField(field, gem) {

  const value = valueAt(gem, field.path);

  const wide = field.wide ? "wide" : "";

  const label = escapeHTML(field.label);

  const path = escapeHTML(field.path);

  const hint = field.hint
    ? `<div class="field-hint">${escapeHTML(field.hint)}</div>`
    : "";

  const placeholder = escapeHTML(
    field.placeholder || ""
  );

  let control = "";

  if (field.type === "textarea") {

    control = `
      <textarea
        data-path="${path}"
        placeholder="${placeholder}"
      >${escapeHTML(value || "")}</textarea>
    `;

  } else if (field.type === "tags") {

    control = `
      <input
        type="text"
        data-path="${path}"
        data-value-type="tags"
        value="${escapeHTML(arrayText(value))}"
        placeholder="${placeholder || "Separate with commas"}"
      >
    `;

  } else if (field.type === "select") {

    control = `
      <select data-path="${path}">

        ${field.options.map(option => `
          <option
            value="${escapeHTML(option)}"
            ${value === option ? "selected" : ""}
          >
            ${escapeHTML(option || "Not specified")}
          </option>
        `).join("")}

      </select>
    `;

  } else if (field.type === "number") {

    control = `
      <input
        type="number"
        data-path="${path}"
        data-value-type="number"
        value="${value === null || value === undefined ? "" : escapeHTML(value)}"
        step="${field.step || "any"}"
        ${field.min !== undefined ? `min="${field.min}"` : ""}
        ${field.max !== undefined ? `max="${field.max}"` : ""}
        placeholder="${placeholder}"
      >
    `;

  } else {

    control = `
      <input
        type="text"
        data-path="${path}"
        value="${escapeHTML(value || "")}"
        placeholder="${placeholder}"
        ${field.required ? "required" : ""}
      >
    `;

  }

  return `
    <div class="editor-field ${wide}">

      <label>
        ${label}${field.required ? " *" : ""}
      </label>

      ${control}
      ${hint}

    </div>
  `;

}


/* =========================================
   CLASSIFICATION EDITOR
========================================= */

function renderClassifications(gem) {

  return `
    <div class="checkbox-collection">

      ${GEM_CONFIG.classifications.map(item => {

        const checked =
          gem.classifications.includes(item);

        return `
          <label class="classification-option">

            <input
              type="checkbox"
              data-classification="${escapeHTML(item)}"
              ${checked ? "checked" : ""}
            >

            <span>${escapeHTML(item)}</span>

          </label>
        `;

      }).join("")}

    </div>
  `;

}


/* =========================================
   IMAGE EDITOR
========================================= */

function renderImageEditor(gem) {

  function imageControl(type, title) {

    const image = gem.images[type];

    return `
      <div class="editor-field wide">

        <div class="field-label">
          ${title}
        </div>

        <div
          class="editor-image-preview"
          id="preview-${type}"
        >

          ${image
            ? `<img src="${escapeHTML(image)}" alt="">`
            : "No image selected"
          }

        </div>

        <div class="image-actions">

          <label class="image-upload-label">

            ＋ Choose from Gallery

            <input
              class="upload-input"
              type="file"
              accept="image/*"
              data-image-type="${type}"
            >

          </label>

          <button
            class="image-remove"
            type="button"
            data-remove-image="${type}"
          >Remove Image</button>

        </div>

      </div>
    `;

  }

  return `
    <div class="editor-field-grid">

      ${imageControl(
        "cover",
        "Library Cover Image"
      )}

      ${imageControl(
        "banner",
        "Profile Banner Image"
      )}

      <div class="editor-field wide">

        <div class="field-label">
          Accent Color
        </div>

        <input
          type="color"
          data-path="appearance.color"
          value="${validColor(gem.appearance.color)}"
        >

        <div class="field-hint">
          Used for placeholder gems, decorative highlights
          and the default banner glow.
        </div>

      </div>

    </div>
  `;

}


/* =========================================
   COLOR EDITOR
========================================= */

function renderColorEditor(gem) {

  return `

    <div class="color-editor-list">

      ${gem.colors.map((color, index) => `

        <div
          class="color-editor-row"
          data-color-index="${index}"
        >

          <input
            type="text"
            data-color-field="name"
            value="${escapeHTML(color.name || "")}"
            placeholder="Color name"
            aria-label="Color name"
          >

          <select
            data-color-field="rarity"
            aria-label="Color rarity"
          >

            ${GEM_CONFIG.colorRarities.map(level => `
              <option
                value="${escapeHTML(level)}"
                ${color.rarity === level ? "selected" : ""}
              >${escapeHTML(level)}</option>
            `).join("")}

          </select>

          <input
            type="color"
            data-color-field="hex"
            value="${validColor(color.hex)}"
            aria-label="Color swatch"
          >

          <button
            type="button"
            class="remove-color"
            data-remove-color="${index}"
            aria-label="Remove color"
          >×</button>

        </div>

      `).join("")}

    </div>

    <button
      type="button"
      class="add-row-button"
      id="addColorRow"
    >
      ＋ Add Color Variation
    </button>

    <div class="field-hint" style="margin-top:12px">
      Color rarity applies to the color within this
      gemstone, not necessarily to the gemstone overall.
      These are independent assessments.
    </div>
  `;

}


/* =========================================
   EDITOR TAB SYSTEM
========================================= */

function renderEditorTabs() {

  $("#editorTabs").innerHTML = GEM_CONFIG.editorTabs
    .map(tab => `

      <button
        type="button"
        class="editor-tab ${tab.id === APP.activeTab ? "active" : ""}"
        data-editor-tab="${tab.id}"
      >
        ${escapeHTML(tab.label)}
      </button>

    `).join("");

}

function renderEditorFields() {

  const tab = GEM_CONFIG.editorTabs.find(
    item => item.id === APP.activeTab
  );

  if (!tab || !APP.editingGem) return;

  $("#editorFields").innerHTML = tab.groups
    .map(group => {

      let body = "";

      if (group.special === "classifications") {

        body = renderClassifications(APP.editingGem);

      } else if (group.special === "images") {

        body = renderImageEditor(APP.editingGem);

      } else if (group.special === "colors") {

        body = renderColorEditor(APP.editingGem);

      } else {

        body = `
          <div class="editor-field-grid">

            ${group.fields.map(field =>
              renderField(field, APP.editingGem)
            ).join("")}

          </div>
        `;

      }

      return `
        <section class="editor-group">

          <div class="editor-group-heading">
            ${escapeHTML(group.title)}
          </div>

          <p class="editor-group-description">
            ${escapeHTML(group.description || "")}
          </p>

          ${body}

        </section>
      `;

    }).join("");

  $("#editorFields").scrollTop = 0;

}

function setEditorTab(id) {

  APP.activeTab = id;

  renderEditorTabs();
  renderEditorFields();

}


/* =========================================
   OPEN / CLOSE EDITOR
========================================= */

function openEditor(id = null) {

  const existing = id ? findGem(id) : null;

  APP.editingGem = existing
    ? clone(existing)
    : createEmptyGem();

  if (!existing) {

    APP.editingGem.id = uid();

  }

  APP.activeTab = "identity";

  $("#editorTitle").textContent = existing
    ? `Edit ${existing.name}`
    : "New Gemstone";

  renderEditorTabs();
  renderEditorFields();

  openLayer("#editorBackdrop");

}

function closeEditor() {

  closeLayer("#editorBackdrop");

  APP.editingGem = null;

}


/* =========================================
   EDITOR VALUE UPDATES
========================================= */

function updateEditorField(element) {

  if (!APP.editingGem) return;

  const path = element.dataset.path;

  if (!path) return;

  const type = element.dataset.valueType;

  let value = element.value;

  if (type === "tags") {

    value = textArray(value);

  } else if (type === "number") {

    value = value.trim() === ""
      ? null
      : Number(value);

  }

  setAt(
    APP.editingGem,
    path,
    value
  );

}

function updateClassification(element) {

  if (!APP.editingGem) return;

  const name = element.dataset.classification;

  const current = new Set(
    APP.editingGem.classifications
  );

  if (element.checked) {
    current.add(name);
  } else {
    current.delete(name);
  }

  APP.editingGem.classifications = [...current];

}

function updateColorField(element) {

  if (!APP.editingGem) return;

  const row = element.closest("[data-color-index]");

  if (!row) return;

  const index = Number(row.dataset.colorIndex);

  const field = element.dataset.colorField;

  if (!APP.editingGem.colors[index]) return;

  APP.editingGem.colors[index][field] = element.value;

}

function addColor() {

  APP.editingGem.colors.push({
    name: "",
    rarity: "Common",
    hex: "#a78bd7"
  });

  renderEditorFields();

}

function removeColor(index) {

  APP.editingGem.colors.splice(index, 1);

  renderEditorFields();

}


/* =========================================
   IMAGE PROCESSING
   COMPRESS IMAGES FOR LOCAL STORAGE
========================================= */

function imageToDataURL(file, maxSide = 1600) {

  return new Promise((resolve, reject) => {

    if (!file || !file.type.startsWith("image/")) {

      reject(new Error("Please choose an image file."));
      return;

    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read the image."));
    };

    reader.onload = () => {

      const image = new Image();

      image.onerror = () => {
        reject(new Error("Could not process the image."));
      };

      image.onload = () => {

        const scale = Math.min(
          1,
          maxSide / Math.max(
            image.naturalWidth,
            image.naturalHeight
          )
        );

        const width = Math.max(
          1,
          Math.round(image.naturalWidth * scale)
        );

        const height = Math.max(
          1,
          Math.round(image.naturalHeight * scale)
        );

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {

          reject(new Error("Canvas unavailable."));
          return;

        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        try {

          resolve(
            canvas.toDataURL("image/jpeg", 0.82)
          );

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

  if (!APP.editingGem) return;

  const type = input.dataset.imageType;
  const file = input.files?.[0];

  if (!file) return;

  try {

    const dataURL = await imageToDataURL(file);

    if (!APP.editingGem) return;

    APP.editingGem.images[type] = dataURL;

    renderEditorFields();

    showToast("Image added to draft");

  } catch (error) {

    console.error(error);
    showToast("Image could not be processed");

  }

}


/* =========================================
   SAVE RECORD
========================================= */

async function saveEditingGem() {

  if (!APP.editingGem) return;

  const gem = normalizeGem(
    clone(APP.editingGem)
  );

  gem.name = gem.name.trim();

  if (!gem.name) {

    setEditorTab("identity");

    showToast("Please enter a gemstone name");

    return;

  }

  if (
    !Array.isArray(gem.classifications)
  ) {
    gem.classifications = [];
  }

  if (
    gem.physical.mohsMin !== null &&
    gem.physical.mohsMax !== null &&
    gem.physical.mohsMin > gem.physical.mohsMax
  ) {

    setEditorTab("science");

    showToast("Mohs minimum cannot exceed maximum");

    return;

  }

  if (
    gem.physical.mohsMin !== null &&
    (gem.physical.mohsMin < 0 ||
     gem.physical.mohsMin > 10)
  ) {

    setEditorTab("science");
    showToast("Mohs hardness must be between 0 and 10");
    return;

  }

  if (
    gem.physical.mohsMax !== null &&
    (gem.physical.mohsMax < 0 ||
     gem.physical.mohsMax > 10)
  ) {

    setEditorTab("science");
    showToast("Mohs hardness must be between 0 and 10");
    return;

  }

  const existing = findGem(gem.id);

  const now = new Date().toISOString();

  gem.createdAt = existing?.createdAt || now;
  gem.updatedAt = now;

  gem.colors = gem.colors.filter(
    color => color.name?.trim()
  );

  /*
    Persist before changing the visible
    collection so failures don't silently
    pretend to have saved.
  */

  if (APP.persistenceAvailable) {

    try {

      await dbSaveGem(gem);

    } catch (error) {

      console.error(error);

      showToast(
        "Could not save gemstone. Check browser storage."
      );

      return;

    }

  }

  const index = APP.gems.findIndex(
    item => item.id === gem.id
  );

  if (index >= 0) {
    APP.gems[index] = gem;
  } else {
    APP.gems.push(gem);
  }

  closeEditor();

  renderAll();

  /*
    If the profile remains open behind
    the editor, refresh it.
  */

  if (
    APP.currentGemId === gem.id &&
    $("#profileBackdrop").classList.contains("is-open")
  ) {

    openProfile(gem.id);

  } else {

    openProfile(gem.id);

  }

  showToast(
    APP.persistenceAvailable
      ? "Gemstone saved successfully"
      : "Gemstone added for this session only"
  );

}


/* =========================================
   FAVORITES
========================================= */

async function toggleFavorite(id) {

  const gem = findGem(id);

  if (!gem) return;

  const updated = clone(gem);

  updated.favorite = !updated.favorite;
  updated.updatedAt = new Date().toISOString();

  if (APP.persistenceAvailable) {

    try {

      await dbSaveGem(updated);

    } catch (error) {

      console.error(error);
      showToast("Could not save favorite");
      return;

    }

  }

  Object.assign(gem, updated);

  renderAll();

}


/* =========================================
   DUPLICATE
========================================= */

async function duplicateGem(id) {

  const original = findGem(id);

  if (!original) return;

  const copy = clone(original);

  copy.id = uid();
  copy.name = `${copy.name} (Copy)`;

  copy.favorite = false;

  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;

  if (APP.persistenceAvailable) {

    try {

      await dbSaveGem(copy);

    } catch (error) {

      console.error(error);
      showToast("Could not duplicate gemstone");
      return;

    }

  }

  APP.gems.push(copy);

  closeProfile();

  renderAll();

  openProfile(copy.id);

  showToast("Gemstone duplicated");

}


/* =========================================
   DELETE CONFIRMATION
========================================= */

function requestDelete(id) {

  const gem = findGem(id);

  if (!gem) return;

  APP.deleteId = id;

  $("#confirmMessage").textContent =
    `"${gem.name}" will be permanently removed from your collection.`;

  openLayer("#confirmBackdrop");

}

function cancelDelete() {

  APP.deleteId = null;

  closeLayer("#confirmBackdrop");

}

async function executeDelete() {

  const id = APP.deleteId;

  if (!id) return;

  if (APP.persistenceAvailable) {

    try {

      await dbDeleteGem(id);

    } catch (error) {

      console.error(error);
      showToast("Could not delete gemstone");
      return;

    }

  }

  APP.gems = APP.gems.filter(
    gem => gem.id !== id
  );

  cancelDelete();
  closeProfile();

  renderAll();

  showToast("Gemstone deleted");

}


/* =========================================
   RENDER EVERYTHING
========================================= */

function renderAll() {

  renderSummary();
  renderClassificationFilter();
  renderLibrary();

}


/* =========================================
   RESET FILTERS
========================================= */

function resetFilters() {

  $("#searchInput").value = "";
  $("#rarityFilter").value = "";
  $("#classFilter").value = "";
  $("#sortFilter").value = "name";

  APP.quickFilter = "all";

  document
    .querySelectorAll(".filter-chip")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.filter === "all"
      );

    });

  renderLibrary();

}


/* =========================================
   EVENT LISTENERS
========================================= */

function attachEvents() {

  /* ADD GEMSTONE */

  $("#headerAdd").addEventListener("click", () => {
    openEditor();
  });

  $("#emptyAdd").addEventListener("click", () => {
    openEditor();
  });

  /* BRAND HOME */

  function goHome() {

    closeProfile();
    closeEditor();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }

  $("#brandHome").addEventListener(
    "click",
    goHome
  );

  $("#brandHome").addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();
        goHome();

      }

    }
  );

  /* SEARCH & FILTERS */

  $("#searchInput").addEventListener(
    "input",
    renderLibrary
  );

  $("#rarityFilter").addEventListener(
    "change",
    renderLibrary
  );

  $("#classFilter").addEventListener(
    "change",
    renderLibrary
  );

  $("#sortFilter").addEventListener(
    "change",
    renderLibrary
  );

  $("#clearFilters").addEventListener(
    "click",
    resetFilters
  );

  $("#quickFilters").addEventListener(
    "click",
    event => {

      const button = event.target.closest(
        "[data-filter]"
      );

      if (!button) return;

      APP.quickFilter = button.dataset.filter;

      document
        .querySelectorAll(".filter-chip")
        .forEach(item => {

          item.classList.toggle(
            "active",
            item === button
          );

        });

      renderLibrary();

    }
  );

  /* GEMSTONE CARDS */

  $("#gemGrid").addEventListener(
    "click",
    async event => {

      const favorite = event.target.closest(
        '[data-action="favorite"]'
      );

      if (favorite) {

        event.stopPropagation();

        await toggleFavorite(
          favorite.dataset.id
        );

        return;

      }

      const card = event.target.closest(
        "[data-gem-id]"
      );

      if (card) {

        openProfile(
          card.dataset.gemId
        );

      }

    }
  );

  $("#gemGrid").addEventListener(
    "keydown",
    event => {

      if (
        event.target.matches(".gem-card") &&
        (
          event.key === "Enter" ||
          event.key === " "
        )
      ) {

        event.preventDefault();

        openProfile(
          event.target.dataset.gemId
        );

      }

    }
  );

  /* PROFILE ACTIONS */

  $("#profileContent").addEventListener(
    "click",
    async event => {

      const button = event.target.closest(
        "[data-profile-action]"
      );

      if (!button) return;

      const action = button.dataset.profileAction;
      const id = APP.currentGemId;

      switch (action) {

        case "close":
          closeProfile();
          break;

        case "edit":
          openEditor(id);
          break;

        case "duplicate":
          await duplicateGem(id);
          break;

        case "delete":
          requestDelete(id);
          break;

      }

    }
  );

  /* PROFILE BACKDROP */

  $("#profileBackdrop").addEventListener(
    "click",
    event => {

      if (
        event.target === $("#profileBackdrop")
      ) {

        closeProfile();

      }

    }
  );

  /* EDITOR TABS */

  $("#editorTabs").addEventListener(
    "click",
    event => {

      const button = event.target.closest(
        "[data-editor-tab]"
      );

      if (!button) return;

      setEditorTab(
        button.dataset.editorTab
      );

    }
  );

  /* EDITOR LIVE INPUT */

  $("#editorFields").addEventListener(
    "input",
    event => {

      const target = event.target;

      if (target.dataset.path) {

        updateEditorField(target);

      }

      if (target.dataset.colorField) {

        updateColorField(target);

      }

    }
  );

  $("#editorFields").addEventListener(
    "change",
    async event => {

      const target = event.target;

      if (target.dataset.path) {

        updateEditorField(target);

      }

      if (target.dataset.classification) {

        updateClassification(target);

      }

      if (target.dataset.colorField) {

        updateColorField(target);

      }

      if (target.dataset.imageType) {

        await handleImageUpload(target);

      }

    }
  );

  /* ADD / REMOVE COLORS & IMAGES */

  $("#editorFields").addEventListener(
    "click",
    event => {

      if (event.target.closest("#addColorRow")) {

        addColor();
        return;

      }

      const removeColorButton = event.target.closest(
        "[data-remove-color]"
      );

      if (removeColorButton) {

        removeColor(
          Number(removeColorButton.dataset.removeColor)
        );

        return;

      }

      const removeImageButton = event.target.closest(
        "[data-remove-image]"
      );

      if (removeImageButton) {

        const type =
          removeImageButton.dataset.removeImage;

        APP.editingGem.images[type] = "";

        renderEditorFields();

        showToast("Image removed from draft");

      }

    }
  );

  /* FORM SUBMISSION */

  $("#gemForm").addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      await saveEditingGem();

    }
  );

  /* CLOSE EDITOR */

  $("#closeEditor").addEventListener(
    "click",
    closeEditor
  );

  $("#cancelEditor").addEventListener(
    "click",
    closeEditor
  );

  $("#editorBackdrop").addEventListener(
    "click",
    event => {

      if (
        event.target === $("#editorBackdrop")
      ) {

        closeEditor();

      }

    }
  );

  /* DELETE DIALOG */

  $("#cancelDelete").addEventListener(
    "click",
    cancelDelete
  );

  $("#confirmDelete").addEventListener(
    "click",
    executeDelete
  );

  $("#confirmBackdrop").addEventListener(
    "click",
    event => {

      if (
        event.target === $("#confirmBackdrop")
      ) {

        cancelDelete();

      }

    }
  );

  /* ABOUT DIALOG */

  $("#openAbout").addEventListener(
    "click",
    () => openLayer("#aboutBackdrop")
  );

  $("#closeAbout").addEventListener(
    "click",
    () => closeLayer("#aboutBackdrop")
  );

  $("#aboutBackdrop").addEventListener(
    "click",
    event => {

      if (event.target === $("#aboutBackdrop")) {

        closeLayer("#aboutBackdrop");

      }

    }
  );

  /* ESCAPE KEY */

  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Escape") return;

      if (
        $("#confirmBackdrop").classList.contains("is-open")
      ) {

        cancelDelete();
        return;

      }

      if (
        $("#aboutBackdrop").classList.contains("is-open")
      ) {

        closeLayer("#aboutBackdrop");
        return;

      }

      if (
        $("#editorBackdrop").classList.contains("is-open")
      ) {

        closeEditor();
        return;

      }

      if (
        $("#profileBackdrop").classList.contains("is-open")
      ) {

        closeProfile();

      }

    }
  );

}


/* =========================================
   INITIALIZATION
========================================= */

async function initializeApp() {

  attachEvents();

  renderClassificationFilter();

  try {

    APP.db = await openDatabase();

    await seedDatabase();

    APP.persistenceAvailable = true;

    await loadCollection();

  } catch (error) {

    console.error(
      "Gem Atlas database error:",
      error
    );

    APP.persistenceAvailable = false;

    APP.gems = GEM_SEED_DATA.map(normalizeGem);

    renderAll();

    showToast(
      "Local storage unavailable. Changes will not persist."
    );

  }

  console.info(
    "Gem Atlas initialized:",
    APP.gems.length,
    "gemstones"
  );

}

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
