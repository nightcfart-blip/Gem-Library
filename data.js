
"use strict";

/* GEM LIBRARY V2 — FINAL DATA SCHEMA */

const GEM_CONFIG = {
  storageKey: "gemLibraryV2.records",
  draftKey: "gemLibraryV2.draft",

  classifications: [
    "Semi Precious", "Precious", "Organic",
    "Minerals", "Mineraloids", "Natural Gem",
    "Synthetic"
  ],

  rarities: [
    "Common", "Uncommon", "Rare", "Very Rare"
  ],

  mohsOptions: Array.from(
    { length: 21 },
    (_, index) => String(index / 2)
  ),

  crystalSystems: [
    "Cubic", "Tetragonal", "Hexagonal",
    "Trigonal", "Orthorhombic",
    "Monoclinic", "Triclinic"
  ],

  cleavages: [
    "Perfect", "Excellent", "Good",
    "Imperfect", "Poor", "Indistinct", "None"
  ],

  fractures: [
    "Even", "Uneven", "Hackly",
    "Splintery", "Fibrous", "Conchoidal"
  ],

  tenacities: [
    "Brittle", "Malleable", "Ductile",
    "Sectile", "Flexible", "Elastic", "Tough"
  ],

  lusters: [
    "Adamantine", "Vitreous", "Resinous",
    "Pearly", "Silky", "Greasy",
    "Waxy", "Dull"
  ],

  transparencies: [
    "Transparent", "Translucent", "Opaque"
  ],

  collectorValues: [
    "Low", "Mediocre", "Decent",
    "High", "Very High"
  ],

  toxicities: [
    "Very", "Moderate", "Safe", "No"
  ],

  sections: [
    {
      id: "identity",
      title: "Identity & Rarity",
      fields: [
        {
          key: "name",
          label: "Name",
          type: "text",
          required: true,
          compare: false
        },
        {
          key: "title",
          label: "Title",
          type: "text",
          compare: false
        },
        {
          key: "classifications",
          label: "Classifications",
          type: "multi",
          options: "classifications",
          wide: true
        },
        {
          key: "mineralRarity",
          label: "Mineral Rarity",
          type: "choice",
          options: "rarities"
        },
        {
          key: "gemRarity",
          label: "Gem Rarity",
          type: "choice",
          options: "rarities"
        }
      ]
    },
    {
      id: "physical",
      title: "Physical Properties",
      fields: [
        {
          key: "mohs",
          label: "Mohs",
          type: "choice",
          options: "mohsOptions",
          numeric: true,
          min: 0,
          max: 10,
          scale: 10
        },
        {
          key: "crystalSystem",
          label: "Crystal System",
          type: "choice",
          options: "crystalSystems"
        },
        {
          key: "cleavage",
          label: "Cleavage",
          type: "choice",
          options: "cleavages"
        },
        {
          key: "fracture",
          label: "Fracture",
          type: "choice",
          options: "fractures"
        },
        {
          key: "streak",
          label: "Streak",
          type: "text"
        },
        {
          key: "tenacity",
          label: "Tenacity",
          type: "choice",
          options: "tenacities"
        },
        {
          key: "luster",
          label: "Luster",
          type: "choice",
          options: "lusters"
        },
        {
          key: "transparency",
          label: "Transparency",
          type: "choice",
          options: "transparencies"
        },
        {
          key: "otherEffects",
          label: "Other Effects",
          type: "tags",
          wide: true
        }
      ]
    },
    {
      id: "origins",
      title: "Appearance & Discovery",
      fields: [
        {
          key: "colors",
          label: "Colors",
          type: "tags",
          wide: true
        },
        {
          key: "countries",
          label: "Found in Which Countries",
          type: "tags",
          wide: true
        },
        {
          key: "discoveryYear",
          label: "Discovery Year",
          type: "text"
        },
        {
          key: "discoveryLocation",
          label: "Discovery Location",
          type: "text"
        },
        {
          key: "discoverer",
          label: "Discoverer",
          type: "text"
        },
        {
          key: "etymology",
          label: "Etymology",
          type: "textarea",
          wide: true
        }
      ]
    },
    {
      id: "associations",
      title: "Stone Associations",
      fields: [
        {
          key: "zodiacStone",
          label: "Zodiac Stone",
          type: "tags"
        },
        {
          key: "planetaryStone",
          label: "Planetary Stone",
          type: "tags"
        },
        {
          key: "birthStone",
          label: "Birth Stone",
          type: "tags"
        },
        {
          key: "anniversaryStone",
          label: "Anniversary Stone",
          type: "tags"
        }
      ]
    },
    {
      id: "symbolism",
      title: "Symbolism & Mythology",
      fields: [
        {
          key: "meaning",
          label: "Meaning",
          type: "tags",
          hint: "Traditional and modern crystal beliefs",
          wide: true
        },
        {
          key: "connectedWith",
          label: "Connected With",
          type: "tags",
          hint: "Gods and deities from any culture",
          wide: true
        }
      ]
    },
    {
      id: "value",
      title: "Value & Safety",
      fields: [
        {
          key: "priceRange",
          label: "Price Range",
          type: "text",
          wide: true
        },
        {
          key: "collectorValue",
          label: "Collector Value",
          type: "choice",
          options: "collectorValues"
        },
        {
          key: "toxic",
          label: "Toxic?",
          type: "choice",
          options: "toxicities"
        }
      ]
    }
  ],

  statisticsDimensions: [],
  numericDimensions: [
    {
      key: "mohs",
      label: "Mohs",
      bins: null
    }
  ],

  chartColors: [
    "#8da78b", "#b9a18b", "#8a9fae",
    "#b5a4b9", "#c2bd91", "#839e99",
    "#a88f8d", "#a8b6a0", "#7b8f83",
    "#b9b0a4", "#8b9cba", "#a3a187"
  ]
};

GEM_CONFIG.fields =
  GEM_CONFIG.sections.flatMap(
    section => section.fields
  );

GEM_CONFIG.fieldMap =
  Object.fromEntries(
    GEM_CONFIG.fields.map(field => [
      field.key, field
    ])
  );

GEM_CONFIG.comparableFields =
  GEM_CONFIG.fields.filter(
    field => field.compare !== false
  );

GEM_CONFIG.statisticsDimensions =
  GEM_CONFIG.fields
    .filter(field => field.key !== "name")
    .map(field => ({
      key: field.key,
      label: field.label
    }));

function createEmptyGem() {
  const gem = {
    id: "",
    createdAt: "",
    updatedAt: ""
  };

  for (const field of GEM_CONFIG.fields) {
    gem[field.key] =
      ["tags", "multi"].includes(field.type)
        ? []
        : "";
  }

  return gem;
}

function normalizeGem(input) {
  const empty = createEmptyGem();

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return empty;
  }

  // Preserve unknown historical properties so that
  // editing a new profile doesn't erase old records.
  const gem = {
    ...empty,
    ...input
  };

  gem.id =
    typeof input.id === "string" ? input.id : "";

  gem.createdAt =
    typeof input.createdAt === "string"
      ? input.createdAt : "";

  gem.updatedAt =
    typeof input.updatedAt === "string"
      ? input.updatedAt : "";

  // Historical rarity refers to gemstones, not
  // necessarily the underlying mineral.
  if (
    !Object.prototype.hasOwnProperty.call(
      input, "gemRarity"
    ) &&
    typeof input.rarity === "string"
  ) {
    gem.gemRarity = input.rarity;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      input, "mineralRarity"
    )
  ) {
    gem.mineralRarity = "";
  }

  for (const field of GEM_CONFIG.fields) {
    let value = gem[field.key];

    if (field.type === "tags" ||
        field.type === "multi") {

      if (!Array.isArray(value)) {
        value =
          value === null ||
          value === undefined ||
          value === ""
            ? []
            : [value];
      }

      gem[field.key] = uniqueEntries(value);
      continue;
    }

    if (Array.isArray(value)) {
      gem[field.key] = uniqueEntries(value);
    } else if (
      value === null ||
      value === undefined
    ) {
      gem[field.key] = "";
    } else {
      gem[field.key] = String(value);
    }
  }

  return gem;
}

function uniqueEntries(values) {
  const seen = new Set();

  return values
    .filter(item =>
      item !== null && item !== undefined
    )
    .map(item => String(item).trim())
    .filter(item => {
      if (!item) return false;

      const key = item.toLocaleLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

window.GEM_CONFIG = GEM_CONFIG;
window.createEmptyGem = createEmptyGem;
window.normalizeGem = normalizeGem;
