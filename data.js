
"use strict";

/* ==========================================
   GEM LIBRARY V3 — DATA
   Compatible with existing V2 storage
========================================== */

const GEM_CONFIG = {

  storageKey: "gemLibraryV2.records",
  draftKey: "gemLibraryV2.draft",

  version: 3,

  classifications: [
    "Semi Precious",
    "Precious",
    "Organic",
    "Minerals",
    "Mineraloids",
    "Natural Gem",
    "Synthetic"
  ],

  rarities: [
    "Common",
    "Uncommon",
    "Rare",
    "Very Rare"
  ],

  mohsOptions: Array.from(
    { length: 21 },
    (_, i) => i / 2
  ).map(String),

  crystalSystems: [
    "Cubic",
    "Tetragonal",
    "Hexagonal",
    "Trigonal",
    "Orthorhombic",
    "Monoclinic",
    "Triclinic"
  ],

  cleavages: [
    "Perfect",
    "Excellent",
    "Good",
    "Imperfect",
    "Poor",
    "Indistinct",
    "None"
  ],

  fractures: [
    "Even",
    "Uneven",
    "Hackly",
    "Splintery",
    "Fibrous",
    "Conchoidal"
  ],

  tenacities: [
    "Brittle",
    "Malleable",
    "Ductile",
    "Sectile",
    "Flexible",
    "Elastic",
    "Tough"
  ],

  lusters: [
    "Adamantine",
    "Vitreous",
    "Resinous",
    "Pearly",
    "Silky",
    "Greasy",
    "Waxy",
    "Dull"
  ],

  transparencies: [
    "Transparent",
    "Translucent",
    "Opaque"
  ],

  sections: [

    {
      id: "identity",
      title: "Identity",
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
          type: "choice",
          options: "classifications"
        },
        {
          key: "rarity",
          label: "Rarity",
          type: "select",
          options: "rarities"
        },
        {
          key: "mineralFamily",
          label: "Mineral Family",
          type: "text",
          wide: true
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
          options: "mohsOptions"
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
        }
      ]
    },

    {
      id: "appearance",
      title: "Appearance & Origins",
      fields: [
        {
          key: "otherEffects",
          label: "Other Effects",
          type: "tags",
          wide: true
        },
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
          type: "number",
          wide: false
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
      id: "cultural",
      title: "Cultural Associations",
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
        },
        {
          key: "meaning",
          label: "Meaning",
          type: "tags",
          wide: true,
          hint: "Traditional and modern crystal beliefs"
        },
        {
          key: "connectedWith",
          label: "Connected With",
          type: "tags",
          wide: true,
          hint: "Gods and deities from any culture"
        }
      ]
    },

    {
      id: "value",
      title: "Value & Usage",
      fields: [
        {
          key: "priceRange",
          label: "Price Range",
          type: "text"
        },
        {
          key: "collectorValue",
          label: "Collector Value",
          type: "text"
        },
        {
          key: "jewelry",
          label: "Jewelry",
          type: "textarea",
          wide: true
        },
        {
          key: "safety",
          label: "Safety",
          type: "textarea",
          wide: true
        }
      ]
    },

    {
      id: "composition",
      title: "Composition",
      fields: [
        {
          key: "primaryMinerals",
          label: "Primary Minerals",
          type: "tags",
          wide: true,
          hint: "Main minerals making up the gem"
        },
        {
          key: "secondaryMinerals",
          label: "Secondary Minerals",
          type: "tags",
          wide: true,
          hint: "Other common mineral constituents"
        },
        {
          key: "accessoryMinerals",
          label: "Accessory Minerals",
          type: "tags",
          wide: true,
          hint: "Uncommon but notable mineral constituents"
        },
        {
          key: "inclusions",
          label: "Inclusions",
          type: "tags",
          wide: true,
          hint: "Minerals trapped inside the gem"
        }
      ]
    },

    {
      id: "mineral",
      title: "Mineral Relationships",
      fields: [
        {
          key: "mineralSpecies",
          label: "Species",
          type: "text",
          hint: "Example: Corundum"
        },
        {
          key: "mineralGroup",
          label: "Mineral Group",
          type: "text",
          hint: "Example: Garnet group"
        },
        {
          key: "varieties",
          label: "Varieties",
          type: "tags",
          wide: true,
          hint: "Varieties connected with this species"
        },
        {
          key: "relatesTo",
          label: "Manual Gemstone Links",
          type: "links",
          wide: true,
          compare: false,
          hint: "Choose other saved gemstone profiles"
        }
      ]
    },

    {
      id: "geology",
      title: "Geological Relationships",
      fields: [
        {
          key: "associatedMinerals",
          label: "Associated Minerals",
          type: "tags",
          wide: true,
          hint: "Minerals naturally found together"
        },
        {
          key: "geologicalOrigin",
          label: "Same Geological Origin",
          type: "tags",
          wide: true,
          hint: "Shared formation conditions or environments"
        },
        {
          key: "hostRocks",
          label: "Host Rocks",
          type: "tags",
          wide: true,
          hint: "Rocks in which gemstones form"
        }
      ]
    }

  ],

  chartColors: [
    "#536451",
    "#82977d",
    "#a6b6a0",
    "#c8d5c1",
    "#83928e",
    "#b3bcb9",
    "#778884",
    "#9caeac",
    "#b9c5b6",
    "#d8ded3",
    "#697a70",
    "#9baba1"
  ]
};

/* ==========================================
   FIELD REGISTRY
========================================== */

GEM_CONFIG.fields =
  GEM_CONFIG.sections.flatMap(
    section => section.fields
  );

GEM_CONFIG.fieldMap = Object.fromEntries(
  GEM_CONFIG.fields.map(field => [
    field.key,
    field
  ])
);

GEM_CONFIG.comparableFields =
  GEM_CONFIG.fields.filter(
    field => field.compare !== false
  );

GEM_CONFIG.statisticsDimensions =
  GEM_CONFIG.fields
    .filter(field =>
      field.compare !== false &&
      field.key !== "discoveryYear"
    )
    .map(field => ({
      key: field.key,
      label: field.label
    }));

GEM_CONFIG.numericDimensions = [
  {
    key: "discoveryYear",
    label: "Discovery Year"
  },
  {
    key: "mohs",
    label: "Mohs Hardness",
    bins: [0,2,4,6,8,10]
  }
];

/* ==========================================
   EMPTY RECORD
========================================== */

function createEmptyGem() {

  const gem = {
    id: "",
    createdAt: "",
    updatedAt: ""
  };

  for (const field of GEM_CONFIG.fields) {

    if (
      ["tags","choice","links"].includes(
        field.type
      )
    ) {
      gem[field.key] = [];
    }

    else if (field.type === "number") {
      gem[field.key] = null;
    }

    else {
      gem[field.key] = "";
    }
  }

  return gem;
}

/* ==========================================
   NORMALIZATION
   PRESERVES OLD DATA WHERE POSSIBLE
========================================== */

function cleanList(value) {

  const items = Array.isArray(value)
    ? value
    : value === null ||
      value === undefined ||
      value === ""
      ? []
      : [value];

  const seen = new Set();

  return items
    .filter(item =>
      typeof item === "string" ||
      typeof item === "number"
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

function normalizeGem(input) {

  const base = createEmptyGem();

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return base;
  }

  const gem = {
    ...base,
    id:
      typeof input.id === "string"
        ? input.id
        : "",
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt
        : "",
    updatedAt:
      typeof input.updatedAt === "string"
        ? input.updatedAt
        : ""
  };

  for (const field of GEM_CONFIG.fields) {

    let value = input[field.key];

    if (
      field.key === "mineralFamily" &&
      !value
    ) {
      value =
        input.mineralGroup ||
        input.mineralSpecies ||
        "";
    }

    if (
      field.key === "varieties" &&
      !value
    ) {
      value = [];
    }

    if (
      field.type === "tags" ||
      field.type === "choice" ||
      field.type === "links"
    ) {
      gem[field.key] = cleanList(value);
      continue;
    }

    if (field.type === "number") {

      const convert = item => {

        if (
          item === null ||
          item === undefined ||
          String(item).trim() === ""
        ) return null;

        const result = Number(item);

        return Number.isFinite(result)
          ? result
          : null;
      };

      if (Array.isArray(value)) {

        gem[field.key] = [
          ...new Set(
            value.map(convert).filter(
              item => item !== null
            )
          )
        ];

      } else {

        gem[field.key] = convert(value);
      }

      continue;
    }

    if (field.type === "select") {

      gem[field.key] =
        typeof value === "string"
          ? value
          : "";

      continue;
    }

    if (Array.isArray(value)) {

      gem[field.key] = cleanList(value);

    } else {

      gem[field.key] =
        typeof value === "string"
          ? value
          : typeof value === "number"
            ? String(value)
            : "";
    }

  }

  return gem;
}

/* ==========================================
   PUBLIC GLOBALS
========================================== */

window.GEM_CONFIG = GEM_CONFIG;
window.createEmptyGem = createEmptyGem;
window.normalizeGem = normalizeGem;
