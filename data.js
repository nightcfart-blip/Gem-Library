
/* =========================================
   GEM LIBRARY V2 — DATA CONFIGURATION
========================================= */

"use strict";

const GEM_CONFIG = {

  storageKey: "gemLibraryV2.records",
  draftKey: "gemLibraryV2.draft",

  classifications: [
    "Semi Precious",
    "Precious",
    "Organic",
    "Minerals",
    "Mineraloids",
    "Natural Gem",
    "Synthetic",
    "Imitation"
  ],

  rarities: [
    "Common",
    "Uncommon",
    "Rare",
    "Very Rare"
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
          type: "multi",
          options: "classifications"
        },
        {
          key: "rarity",
          label: "Rarity",
          type: "select",
          options: "rarities"
        }
      ]
    },

    {
      id: "family",
      title: "Mineral Family",
      fields: [
        {
          key: "mineralGroup",
          label: "Group",
          type: "text"
        },
        {
          key: "mineralSpecies",
          label: "Species",
          type: "text"
        },
        {
          key: "relatesTo",
          label: "Relates To",
          type: "links",
          compare: false,
          wide: true
        }
      ]
    },

    {
      id: "science",
      title: "Science",
      fields: [
        {
          key: "mohs",
          label: "Mohs",
          type: "number",
          min: 0,
          max: 10,
          step: "any",
          scale: 10
        },
        {
          key: "density",
          label: "Density",
          type: "number",
          min: 0,
          step: "any"
        },
        {
          key: "crystalSystem",
          label: "Crystal System",
          type: "text"
        },
        {
          key: "cleavage",
          label: "Cleavage",
          type: "text"
        },
        {
          key: "fracture",
          label: "Fracture",
          type: "text"
        },
        {
          key: "streak",
          label: "Streak",
          type: "text"
        },
        {
          key: "tenacity",
          label: "Tenacity",
          type: "text"
        },
        {
          key: "luster",
          label: "Luster",
          type: "text"
        },
        {
          key: "transparency",
          label: "Transparency",
          type: "multi",
          options: "transparencies"
        },
        {
          key: "refractiveIndex",
          label: "Refractive Index",
          type: "number",
          min: 0,
          step: "any"
        },
        {
          key: "birefringence",
          label: "Birefringence",
          type: "number",
          min: 0,
          step: "any"
        },
        {
          key: "pleochroism",
          label: "Pleochroism",
          type: "text"
        },
        {
          key: "dispersion",
          label: "Dispersion",
          type: "number",
          min: 0,
          step: "any"
        },
        {
          key: "otherEffects",
          label: "Other Effects",
          type: "bullets",
          wide: true
        }
      ]
    },

    {
      id: "origins",
      title: "Appearance & Origins",
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
          type: "number",
          step: "1"
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
      title: "Associations",
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
          wide: true
        },
        {
          key: "connectedWith",
          label: "Connected With",
          type: "tags",
          wide: true
        }
      ]
    },

    {
      id: "notes",
      title: "Other Facts",
      fields: [
        {
          key: "otherFacts",
          label: "Other Facts",
          type: "bullets",
          wide: true,
          compare: false
        }
      ]
    }

  ],

  statisticsDimensions: [

    {
      key: "classifications",
      label: "Classification"
    },
    {
      key: "rarity",
      label: "Rarity"
    },
    {
      key: "mineralGroup",
      label: "Mineral Group"
    },
    {
      key: "mineralSpecies",
      label: "Mineral Species"
    },
    {
      key: "colors",
      label: "Colors"
    },
    {
      key: "countries",
      label: "Countries"
    },
    {
      key: "crystalSystem",
      label: "Crystal System"
    },
    {
      key: "cleavage",
      label: "Cleavage"
    },
    {
      key: "fracture",
      label: "Fracture"
    },
    {
      key: "streak",
      label: "Streak"
    },
    {
      key: "tenacity",
      label: "Tenacity"
    },
    {
      key: "luster",
      label: "Luster"
    },
    {
      key: "transparency",
      label: "Transparency"
    },
    {
      key: "pleochroism",
      label: "Pleochroism"
    },
    {
      key: "otherEffects",
      label: "Other Effects"
    },
    {
      key: "discoveryLocation",
      label: "Discovery Location"
    },
    {
      key: "discoverer",
      label: "Discoverer"
    },
    {
      key: "zodiacStone",
      label: "Zodiac Stone"
    },
    {
      key: "planetaryStone",
      label: "Planetary Stone"
    },
    {
      key: "birthStone",
      label: "Birth Stone"
    },
    {
      key: "anniversaryStone",
      label: "Anniversary Stone"
    },
    {
      key: "meaning",
      label: "Meaning"
    },
    {
      key: "connectedWith",
      label: "Connected With"
    }
  ],

  numericDimensions: [
    {
      key: "mohs",
      label: "Mohs Hardness",
      bins: [0,2,4,6,8,10]
    },
    {
      key: "density",
      label: "Density",
      bins: null
    },
    {
      key: "refractiveIndex",
      label: "Refractive Index",
      bins: null
    },
    {
      key: "birefringence",
      label: "Birefringence",
      bins: null
    },
    {
      key: "dispersion",
      label: "Dispersion",
      bins: null
    },
    {
      key: "discoveryYear",
      label: "Discovery Year",
      bins: null
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


/* =========================================
   FIELD LOOKUP
========================================= */

GEM_CONFIG.fields =
  GEM_CONFIG.sections.flatMap(
    section => section.fields
  );

GEM_CONFIG.fieldMap =
  Object.fromEntries(
    GEM_CONFIG.fields.map(
      field => [field.key, field]
    )
  );

GEM_CONFIG.comparableFields =
  GEM_CONFIG.fields.filter(
    field => field.compare !== false
  );


/* =========================================
   EMPTY GEMSTONE
========================================= */

function createEmptyGem() {

  const gem = {
    id: "",
    createdAt: "",
    updatedAt: ""
  };

  for (const field of GEM_CONFIG.fields) {

    if (
      field.type === "tags" ||
      field.type === "multi" ||
      field.type === "bullets" ||
      field.type === "links"
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


/* =========================================
   RECORD NORMALIZATION
========================================= */


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
    id: typeof input.id === "string" ? input.id : "",
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt : "",
    updatedAt:
      typeof input.updatedAt === "string"
        ? input.updatedAt : ""
  };

  const listTypes = [
    "tags",
    "multi",
    "bullets",
    "links"
  ];

  for (const field of GEM_CONFIG.fields) {

    const value = input[field.key];

    // Fields that are always lists.
    if (listTypes.includes(field.type)) {

      gem[field.key] = Array.isArray(value)
        ? [...new Set(
            value
              .filter(item => typeof item === "string")
              .map(item => item.trim())
              .filter(Boolean)
          )]
        : [];

      continue;
    }

    // Optional multi-answer numerical fields.
    if (field.type === "number") {

      const convert = item => {

        if (
          item === null ||
          item === undefined ||
          String(item).trim() === ""
        ) {
          return null;
        }

        const number = Number(item);

        return Number.isFinite(number)
          ? number
          : null;
      };

      if (Array.isArray(value)) {

        gem[field.key] = [
          ...new Set(
            value.map(convert)
              .filter(item => item !== null)
          )
        ];

      } else {
        gem[field.key] = convert(value);
      }

      continue;
    }

    // Optional multi-answer text fields.
    if (Array.isArray(value)) {

      const seen = new Set();

      gem[field.key] = value
        .filter(item => typeof item === "string")
        .map(item => item.trim())
        .filter(item => {

          if (!item) return false;

          const key = item.toLocaleLowerCase();

          if (seen.has(key)) return false;

          seen.add(key);
          return true;

        });

    } else {

      gem[field.key] =
        typeof value === "string"
          ? value
          : "";

    }

  }

  return gem;
}

/* =========================================
   GLOBAL EXPORT
========================================= */

window.GEM_CONFIG = GEM_CONFIG;
window.createEmptyGem = createEmptyGem;
window.normalizeGem = normalizeGem;
