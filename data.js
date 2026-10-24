
/* =========================================
   GEM ATLAS — DATA.JS
   VERSION 2.0
   SCIENTIFIC / STATISTICAL DATA MODEL
========================================= */

"use strict";

/* =========================================
   GENERAL CONFIGURATION
========================================= */

const GEM_CONFIG = {

  version: 2,

  classifications: [
    "Precious",
    "Semi-Precious",
    "Organic",
    "Mineral",
    "Mineraloid",
    "Natural Gem",
    "Synthetic",
    "Imitation"
  ],

  rarityLevels: [
    "Common",
    "Uncommon",
    "Rare",
    "Exotic"
  ],

  colorRarities: [
    "Common",
    "Uncommon",
    "Rare",
    "Exotic",
    "Special"
  ],

  originTypes: [
    "Natural",
    "Synthetic",
    "Imitation",
    "Unknown"
  ],

  crystalSystems: [
    "Cubic",
    "Tetragonal",
    "Orthorhombic",
    "Hexagonal",
    "Trigonal",
    "Monoclinic",
    "Triclinic",
    "Amorphous",
    "Not applicable",
    "Unknown"
  ],

  confidenceLevels: [
    "Verified",
    "Well documented",
    "Uncertain",
    "Traditional attribution",
    "Personal note"
  ],

  /* Manual relationship categories */

  relationshipTypes: [
    "Same Mineral Family",
    "Variety / Parent",
    "Related Material",
    "Similar Appearance",
    "Geological Association",
    "Historical Association",
    "Traditional Association",
    "Substitute Stone",
    "Custom Relationship"
  ],

  /*
    Weights used by the similarity engine.

    These are relative weights, not probabilities.
    Changing them does not change mineralogical
    classifications or establish new facts.
  */

  weights: {
    science: 45,
    geography: 15,
    history: 10,
    tradition: 10,
    manual: 20
  },

  /*
    Values that can appear in the relationship
    category filter.
  */

  relationshipGroups: [
    { id: "science", label: "Scientific" },
    { id: "geography", label: "Geographic" },
    { id: "history", label: "Historical / Cultural" },
    { id: "tradition", label: "Traditional / Symbolic" },
    { id: "manual", label: "Manual" }
  ]

};


/* =========================================
   STATISTICS DIMENSIONS
========================================= */

/*
  Types:

  single:
    One categorical value per gemstone.

  multi:
    Multiple category values per gemstone.

  colors:
    Multiple color-name records per gemstone.

  colorRarity:
    Rarity is attached to individual colors.

  range:
    Numerical minimum and maximum.

  number:
    Single numeric measurement.

  Key rule:
    Statistical distributions count RECORDS,
    not quantities of physical gemstone specimens.

  Distinct gemstone counts deduplicate gemstone
  IDs within each category.

  Multi-value distributions may total more than
  the collection size.
*/

GEM_CONFIG.dimensions = [

  {
    id: "rarity",
    label: "Overall Rarity",
    type: "single",
    path: "rarity",
    domain: "identity"
  },

  {
    id: "originType",
    label: "Material Origin",
    type: "single",
    path: "originType",
    domain: "identity"
  },

  {
    id: "classifications",
    label: "Gem Classifications",
    type: "multi",
    path: "classifications",
    domain: "identity"
  },

  {
    id: "family.group",
    label: "Mineral Group",
    type: "single",
    path: "family.group",
    domain: "science"
  },

  {
    id: "family.species",
    label: "Mineral Species",
    type: "single",
    path: "family.species",
    domain: "science"
  },

  {
    id: "family.varietyOf",
    label: "Parent Mineral / Variety Of",
    type: "single",
    path: "family.varietyOf",
    domain: "science"
  },

  {
    id: "chemical.formula",
    label: "Chemical Formula",
    type: "single",
    path: "chemical.formula",
    domain: "science"
  },

  {
    id: "chemical.traceElements",
    label: "Trace Elements",
    type: "multi",
    path: "chemical.traceElements",
    domain: "science"
  },

  {
    id: "physical.crystalSystem",
    label: "Crystal System",
    type: "single",
    path: "physical.crystalSystem",
    domain: "science"
  },

  {
    id: "optical.luster",
    label: "Luster",
    type: "single",
    path: "optical.luster",
    domain: "science"
  },

  {
    id: "optical.transparency",
    label: "Transparency",
    type: "single",
    path: "optical.transparency",
    domain: "science"
  },

  {
    id: "colors",
    label: "Gemstone Colors",
    type: "colors",
    path: "colors",
    domain: "appearance"
  },

  {
    id: "colorRarity",
    label: "Color Frequency / Rarity",
    type: "colorRarity",
    path: "colors",
    domain: "appearance"
  },

  {
    id: "geography.countries",
    label: "Countries Found",
    type: "multi",
    path: "geography.countries",
    domain: "geography"
  },

  {
    id: "geography.localities",
    label: "Mining Localities",
    type: "multi",
    path: "geography.localities",
    domain: "geography"
  },

  {
    id: "history.cultures",
    label: "Historical Cultures",
    type: "multi",
    path: "history.cultures",
    domain: "history"
  },

  {
    id: "associations.zodiac",
    label: "Zodiac Associations",
    type: "multi",
    path: "associations.zodiac",
    domain: "tradition"
  },

  {
    id: "associations.planetary",
    label: "Planetary / Star Associations",
    type: "multi",
    path: "associations.planetary",
    domain: "tradition"
  },

  {
    id: "associations.birthstone",
    label: "Birthstone Months",
    type: "multi",
    path: "associations.birthstone",
    domain: "tradition"
  },

  {
    id: "associations.anniversary",
    label: "Anniversary Stones",
    type: "multi",
    path: "associations.anniversary",
    domain: "tradition"
  },

  {
    id: "symbolism.meanings",
    label: "Traditional Meanings",
    type: "multi",
    path: "symbolism.meanings",
    domain: "tradition"
  },

  {
    id: "symbolism.chakras",
    label: "Chakras",
    type: "multi",
    path: "symbolism.chakras",
    domain: "tradition"
  },

  {
    id: "physical.mohs",
    label: "Mohs Hardness",
    type: "range",
    minPath: "physical.mohsMin",
    maxPath: "physical.mohsMax",
    unit: "Mohs",
    domain: "science"
  },

  {
    id: "physical.density",
    label: "Density",
    type: "range",
    minPath: "physical.densityMin",
    maxPath: "physical.densityMax",
    unit: "g/cm³",
    domain: "science"
  },

  {
    id: "market.price",
    label: "Value per Carat",
    type: "range",
    minPath: "market.minPrice",
    maxPath: "market.maxPrice",
    unit: "currency / carat",
    domain: "value",
    requiresComparableCurrency: true
  }

];


/* =========================================
   COMPARISON FIELD DEFINITIONS
========================================= */

/*
  Comparison rows are grouped by topic.

  Data categories distinguish:
    single
    multi
    range
    text
    colors

  Purely narrative text is displayed but should
  not automatically be scored as equivalent.

  Matching two long descriptions does not prove
  scientific similarity.
*/

GEM_CONFIG.comparisonFields = [

  {
    group: "identity",
    label: "Identity & Mineral Family",
    rows: [
      ["Other Names", "names", "multi"],
      ["Nickname", "nickname", "text"],
      ["Classification", "classifications", "multi"],
      ["Rarity", "rarity", "single"],
      ["Material Origin", "originType", "single"],
      ["Mineral Group", "family.group", "single"],
      ["Mineral Species", "family.species", "single"],
      ["Parent Mineral", "family.varietyOf", "single"],
      ["Variety Difference", "family.varietyDifference", "text"]
    ]
  },

  {
    group: "science",
    label: "Scientific & Physical",
    rows: [
      ["Chemical Formula", "chemical.formula", "single"],
      ["Composition", "chemical.composition", "text"],
      ["Trace Elements", "chemical.traceElements", "multi"],
      ["Mohs Hardness", "physical.mohs", "range"],
      ["Density", "physical.density", "range"],
      ["Crystal System", "physical.crystalSystem", "single"],
      ["Cleavage", "physical.cleavage", "single"],
      ["Fracture", "physical.fracture", "single"],
      ["Streak", "physical.streak", "single"],
      ["Luster", "optical.luster", "single"],
      ["Transparency", "optical.transparency", "single"],
      ["Refractive Index", "optical.refractiveIndex", "text"],
      ["Birefringence", "optical.birefringence", "text"],
      ["Luminescence", "optical.luminescence", "text"],
      ["Pleochroism", "optical.pleochroism", "text"],
      ["Dispersion", "optical.dispersion", "text"],
      ["Colors", "colors", "colors"]
    ]
  },

  {
    group: "geography",
    label: "Geographic Distribution",
    rows: [
      ["Countries", "geography.countries", "multi"],
      ["Mining Localities", "geography.localities", "multi"],
      ["Geological Formation", "geography.geology", "text"]
    ]
  },

  {
    group: "history",
    label: "Historical & Discovery",
    rows: [
      ["Discovery Year", "discovery.year", "text"],
      ["Discovery Origin", "discovery.origin", "text"],
      ["Discoverer", "discovery.person", "text"],
      ["Discovery Country", "discovery.country", "single"],
      ["Namesake", "discovery.namesake", "text"],
      ["Oldest Specimen", "discovery.oldestSpecimen", "text"],
      ["Historical Cultures", "history.cultures", "multi"]
    ]
  },

  {
    group: "tradition",
    label: "Traditional Associations",
    rows: [
      ["Zodiac", "associations.zodiac", "multi"],
      ["Planetary Stones", "associations.planetary", "multi"],
      ["Birthstone Months", "associations.birthstone", "multi"],
      ["Anniversaries", "associations.anniversary", "multi"],
      ["Substitute Roles", "associations.substitutes", "text"],
      ["Meanings", "symbolism.meanings", "multi"],
      ["Chakras", "symbolism.chakras", "multi"],
      ["Traditional Properties", "symbolism.properties", "text"],
      ["Physical Healing Beliefs", "healing.physical", "text"],
      ["Emotional Healing Beliefs", "healing.emotional", "text"],
      ["Spiritual Healing Beliefs", "healing.spiritual", "text"]
    ]
  },

  {
    group: "value",
    label: "Market Value",
    rows: [
      ["Currency", "market.currency", "single"],
      ["Price per Carat", "market.price", "range"],
      ["Quality Basis", "market.quality", "text"],
      ["Treatments", "market.treatments", "text"],
      ["Market Notes", "market.notes", "text"],
      ["Price Date", "market.priceDate", "text"]
    ]
  }

];


/* =========================================
   EDITOR FIELD HELPERS
========================================= */

const FIELD = (
  path,
  label,
  type = "text",
  extra = {}
) => ({
  path,
  label,
  type,
  ...extra
});

const TEXT = (path, label, extra = {}) =>
  FIELD(path, label, "textarea", {
    wide: true,
    ...extra
  });

const TAGS = (path, label, extra = {}) =>
  FIELD(path, label, "tags", {
    wide: true,
    ...extra
  });

const NUMBER = (path, label, extra = {}) =>
  FIELD(path, label, "number", {
    step: 0.01,
    ...extra
  });

const CHOICE = (path, label, options) =>
  FIELD(path, label, "select", {
    options: ["", ...options]
  });

const GROUP = (
  title,
  fields,
  description = ""
) => ({
  title,
  description,
  fields
});

const SPECIAL_GROUP = (
  title,
  special,
  description = ""
) => ({
  title,
  description,
  special
});


/* =========================================
   GEMSTONE EDITOR TABS
========================================= */

GEM_CONFIG.editorTabs = [

  {
    id: "identity",
    label: "Identity",

    groups: [

      GROUP(
        "Gemstone Identity",
        [
          FIELD("name", "Primary Name", "text", {
            required: true,
            placeholder: "e.g. Amethyst"
          }),

          TAGS("names", "Alternative Names"),

          FIELD("nickname", "Nickname / Title"),

          TEXT("description", "General Description"),

          CHOICE(
            "rarity",
            "Overall Rarity",
            GEM_CONFIG.rarityLevels
          ),

          TEXT(
            "rarityReason",
            "Rarity Explanation"
          ),

          CHOICE(
            "originType",
            "Material Origin",
            GEM_CONFIG.originTypes
          )
        ]
      ),

      SPECIAL_GROUP(
        "Gemstone Classification",
        "classifications",
        "Select all applicable classifications."
      ),

      GROUP(
        "Mineral Family & Hierarchy",
        [
          FIELD("family.group", "Mineral Group"),

          FIELD(
            "family.species",
            "Mineral Species"
          ),

          FIELD(
            "family.varietyOf",
            "Variety Of / Parent Mineral"
          ),

          TEXT(
            "family.varietyDifference",
            "Distinguishing Characteristics"
          ),

          TAGS(
            "family.related",
            "Other Related Gems",
            {
              hint:
                "Legacy name-based related gems. Manual links use IDs."
            }
          ),

          TEXT("family.notes", "Family Notes")
        ],
        "Scientific hierarchy and other family information."
      ),

      SPECIAL_GROUP(
        "Images & Appearance",
        "images",
        "Upload gallery images. The previous color-picker is removed; gemstone colors are now entered as text."
      )

    ]
  },

  {
    id: "science",
    label: "Science",

    groups: [

      GROUP(
        "Chemical Identity",
        [
          FIELD(
            "chemical.formula",
            "Chemical Formula"
          ),

          TEXT(
            "chemical.composition",
            "Composition"
          ),

          TAGS(
            "chemical.traceElements",
            "Trace Elements"
          ),

          TEXT(
            "chemical.colorCauses",
            "Cause of Colors"
          ),

          TEXT(
            "chemical.notes",
            "Further Chemical Information"
          )
        ]
      ),

      GROUP(
        "Physical Properties",
        [
          NUMBER(
            "physical.mohsMin",
            "Mohs Minimum",
            { min: 0, max: 10, step: 0.1 }
          ),

          NUMBER(
            "physical.mohsMax",
            "Mohs Maximum",
            { min: 0, max: 10, step: 0.1 }
          ),

          CHOICE(
            "physical.crystalSystem",
            "Crystal System",
            GEM_CONFIG.crystalSystems
          ),

          NUMBER(
            "physical.densityMin",
            "Density Minimum (g/cm³)",
            { step: 0.001 }
          ),

          NUMBER(
            "physical.densityMax",
            "Density Maximum (g/cm³)",
            { step: 0.001 }
          ),

          FIELD(
            "physical.cleavage",
            "Cleavage"
          ),

          FIELD(
            "physical.fracture",
            "Fracture"
          ),

          FIELD(
            "physical.streak",
            "Streak"
          ),

          FIELD(
            "physical.tenacity",
            "Tenacity"
          )
        ]
      ),

      GROUP(
        "Optical Properties",
        [
          FIELD(
            "optical.luster",
            "Luster"
          ),

          FIELD(
            "optical.transparency",
            "Transparency"
          ),

          FIELD(
            "optical.refractiveIndex",
            "Refractive Index"
          ),

          FIELD(
            "optical.birefringence",
            "Birefringence"
          ),

          TEXT(
            "optical.luminescence",
            "Luminescence"
          ),

          TEXT(
            "optical.pleochroism",
            "Pleochroism"
          ),

          FIELD(
            "optical.dispersion",
            "Dispersion"
          ),

          TEXT(
            "optical.other",
            "Other Optical Phenomena"
          )
        ]
      ),

      SPECIAL_GROUP(
        "Gemstone Colors",
        "colors",
        "Type each color by name, then select its frequency. No color wheel or hexadecimal code is required."
      )

    ]
  },

  {
    id: "origins",
    label: "Origins",

    groups: [

      GROUP(
        "Geographic Distribution",
        [
          TAGS(
            "geography.countries",
            "Countries Found"
          ),

          TAGS(
            "geography.localities",
            "Specific Localities / Deposits"
          ),

          TEXT(
            "geography.geology",
            "Geological Formation"
          ),

          TEXT(
            "geography.miningNotes",
            "Mining & Availability Notes"
          )
        ]
      ),

      GROUP(
        "Discovery",
        [
          FIELD(
            "discovery.year",
            "Discovery Year / Era"
          ),

          FIELD(
            "discovery.origin",
            "Discovery Location"
          ),

          FIELD(
            "discovery.person",
            "Discoverer / Researcher"
          ),

          FIELD(
            "discovery.country",
            "Discovery Country"
          ),

          TEXT(
            "discovery.namesake",
            "Namesake / Etymology"
          ),

          TEXT(
            "discovery.oldestSpecimen",
            "Oldest Known Specimen"
          ),

          TEXT(
            "discovery.further",
            "Later Scientific Discoveries"
          )
        ]
      ),

      GROUP(
        "Historical Record",
        [
          TAGS(
            "history.cultures",
            "Prominent Cultures"
          ),

          TEXT(
            "history.facts",
            "Historical Facts"
          ),

          TEXT(
            "history.timeline",
            "Important Dates / Timeline"
          )
        ]
      )

    ]
  },

  {
    id: "traditions",
    label: "Traditions",

    groups: [

      GROUP(
        "Astrological & Calendar Associations",
        [
          TAGS(
            "associations.zodiac",
            "Zodiac Stones"
          ),

          TAGS(
            "associations.planetary",
            "Planetary / Star Stones"
          ),

          TAGS(
            "associations.birthstone",
            "Birthstone Months"
          ),

          TAGS(
            "associations.anniversary",
            "Anniversary Stones"
          ),

          TEXT(
            "associations.substitutes",
            "Substitute Roles"
          ),

          TEXT(
            "associations.systemNotes",
            "Systems / Reference Traditions"
          )
        ],
        "Record the particular tradition or system where possible."
      ),

      GROUP(
        "Symbolism & Meaning",
        [
          TAGS(
            "symbolism.meanings",
            "Meanings / Represents"
          ),

          TAGS(
            "symbolism.chakras",
            "Chakras"
          ),

          TEXT(
            "symbolism.properties",
            "Traditional Properties"
          ),

          TEXT(
            "symbolism.notes",
            "Further Symbolism"
          )
        ]
      ),

      GROUP(
        "Traditional Healing Beliefs",
        [
          TEXT(
            "healing.physical",
            "Physical Healing Claims"
          ),

          TEXT(
            "healing.emotional",
            "Emotional Healing Claims"
          ),

          TEXT(
            "healing.spiritual",
            "Spiritual Healing Claims"
          ),

          FIELD(
            "healing.tradition",
            "Associated Tradition"
          )
        ],
        "Cultural and historical beliefs, not verified medical effects."
      )

    ]
  },

  {
    id: "value",
    label: "Value & Notes",

    groups: [

      GROUP(
        "Market Value",
        [
          FIELD(
            "market.currency",
            "Currency",
            "text",
            { placeholder: "USD" }
          ),

          NUMBER(
            "market.minPrice",
            "Minimum Price / Carat"
          ),

          NUMBER(
            "market.maxPrice",
            "Maximum Price / Carat"
          ),

          TEXT(
            "market.quality",
            "Quality / Pricing Conditions"
          ),

          TEXT(
            "market.treatments",
            "Treatments / Enhancements"
          ),

          TEXT(
            "market.notes",
            "Further Market Information"
          ),

          FIELD(
            "market.priceDate",
            "Price Reference Date",
            "text",
            { placeholder: "YYYY-MM-DD" }
          )
        ]
      ),

      GROUP(
        "Scientific References",
        [
          TEXT(
            "sources.references",
            "References / URLs"
          ),

          CHOICE(
            "sources.confidence",
            "General Confidence",
            GEM_CONFIG.confidenceLevels
          ),

          TEXT(
            "sources.notes",
            "Uncertainties / Source Notes"
          )
        ]
      ),

      GROUP(
        "Personal Archive",
        [
          TEXT(
            "personal.opinion",
            "Personal Opinion"
          ),

          TEXT(
            "personal.notes",
            "Additional Notes"
          ),

          TAGS(
            "personal.keywords",
            "Custom Keywords"
          )
        ]
      )

    ]
  },

  {
    id: "relations",
    label: "Relations",

    groups: [

      SPECIAL_GROUP(
        "Manual Gemstone Relationships",
        "manual",
        "Create explicit connections to existing gemstones. Each relationship has a type and written explanation."
      ),

      GROUP(
        "Relationship Research Notes",
        [
          TEXT(
            "relationshipNotes",
            "Further Relationship Notes"
          )
        ]
      )

    ]
  }

];


/* =========================================
   EMPTY GEMSTONE RECORD
========================================= */

function createEmptyGem() {

  return {

    id: "",

    name: "",
    names: [],
    nickname: "",
    description: "",

    favorite: false,

    createdAt: "",
    updatedAt: "",

    rarity: "",
    rarityReason: "",

    originType: "Natural",

    classifications: [],

    images: {
      cover: "",
      banner: ""
    },

    /*
      Kept for backwards compatibility with
      V1's decorative accent.

      The V2 editor will not require editing
      this value manually.
    */

    appearance: {
      color: "#b8a3e8"
    },

    family: {
      group: "",
      species: "",
      varietyOf: "",
      varietyDifference: "",
      related: [],
      notes: ""
    },

    chemical: {
      formula: "",
      composition: "",
      traceElements: [],
      colorCauses: "",
      notes: ""
    },

    physical: {
      mohsMin: null,
      mohsMax: null,
      crystalSystem: "",
      densityMin: null,
      densityMax: null,
      cleavage: "",
      fracture: "",
      streak: "",
      tenacity: ""
    },

    optical: {
      luster: "",
      transparency: "",
      refractiveIndex: "",
      birefringence: "",
      luminescence: "",
      pleochroism: "",
      dispersion: "",
      other: ""
    },

    /*
      Each color is represented as:

      {
        name: "Violet",
        rarity: "Common",
        hex: "#..."     // optional old V1 value
      }

      V2 displays and analyzes only the textual
      color name and frequency.
      The old hex property is retained if present.
    */

    colors: [],

    geography: {
      countries: [],
      localities: [],
      geology: "",
      miningNotes: ""
    },

    discovery: {
      year: "",
      origin: "",
      person: "",
      country: "",
      namesake: "",
      oldestSpecimen: "",
      further: ""
    },

    history: {
      cultures: [],
      facts: "",
      timeline: ""
    },

    associations: {
      zodiac: [],
      planetary: [],
      birthstone: [],
      anniversary: [],
      substitutes: "",
      systemNotes: ""
    },

    symbolism: {
      meanings: [],
      chakras: [],
      properties: "",
      notes: ""
    },

    healing: {
      physical: "",
      emotional: "",
      spiritual: "",
      tradition: ""
    },

    market: {
      currency: "USD",
      minPrice: null,
      maxPrice: null,
      quality: "",
      treatments: "",
      notes: "",
      priceDate: ""
    },

    sources: {
      references: "",
      confidence: "",
      notes: ""
    },

    personal: {
      opinion: "",
      notes: "",
      keywords: []
    },

    /*
      New V2 manual connections.

      targetId:
        Stable ID of the other gemstone.

      type:
        Relationship description/category.

      note:
        User-entered evidence or explanation.

      Treat relationship direction according
      to the type and future graph logic.
    */

    manualRelations: [],

    relationshipNotes: ""

  };

}


/* =========================================
   DEEP MERGE
   PRESERVE EXISTING V1 RECORDS
========================================= */

function mergeGemData(base, update) {

  if (
    !update ||
    typeof update !== "object" ||
    Array.isArray(update)
  ) {
    return base;
  }

  const result = {
    ...base
  };

  for (const key of Object.keys(update)) {

    const value = update[key];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {

      result[key] = mergeGemData(
        result[key],
        value
      );

    } else {

      result[key] = value;

    }

  }

  return result;

}


/* =========================================
   NORMALIZE RECORD
========================================= */

function normalizeGem(record) {

  const gem = mergeGemData(
    createEmptyGem(),
    record || {}
  );

  const arrayPaths = [

    "names",
    "classifications",
    "colors",

    "family.related",

    "chemical.traceElements",

    "geography.countries",
    "geography.localities",

    "history.cultures",

    "associations.zodiac",
    "associations.planetary",
    "associations.birthstone",
    "associations.anniversary",

    "symbolism.meanings",
    "symbolism.chakras",

    "personal.keywords",

    "manualRelations"

  ];

  for (const path of arrayPaths) {

    const parts = path.split(".");
    let target = gem;

    for (let i = 0; i < parts.length - 1; i++) {

      target = target[parts[i]];

    }

    const key = parts[parts.length - 1];

    if (!Array.isArray(target[key])) {
      target[key] = [];
    }

  }

  /*
    Ensure color entries are objects.

    Old V1 color objects, including any hex
    values, are retained.
  */

  gem.colors = gem.colors
    .filter(item => item && typeof item === "object")
    .map(item => ({
      ...item,
      name: String(item.name || ""),
      rarity: String(item.rarity || "")
    }));

  gem.manualRelations = gem.manualRelations
    .filter(item => item && typeof item === "object")
    .map(item => ({
      targetId: String(item.targetId || ""),
      type: String(item.type || "Custom Relationship"),
      note: String(item.note || "")
    }));

  return gem;

}


/* =========================================
   EXAMPLE GEMSTONES
   INITIAL DATA ONLY
========================================= */

/*
  These are illustrative starting records.

  They are not a verified reference dataset,
  and their rarity/color-frequency assignments
  are examples rather than universal facts.

  Previously saved IndexedDB records take
  priority over these initial entries.
*/

const GEM_SEED_DATA = [

  {
    id: "seed-ruby",

    name: "Ruby",
    nickname: "The King of Precious Stones",

    description:
      "Ruby is the red gemstone variety of corundum, " +
      "valued for its coloration and high hardness.",

    rarity: "Rare",
    rarityReason:
      "Fine-quality ruby with desirable color and clarity " +
      "can be difficult to source.",

    originType: "Natural",

    classifications: [
      "Precious",
      "Mineral",
      "Natural Gem"
    ],

    appearance: {
      color: "#d84b6b"
    },

    family: {
      group: "Oxides",
      species: "Corundum",
      varietyOf: "Corundum",

      varietyDifference:
        "Red corundum, commonly colored by chromium.",

      related: [
        "Sapphire"
      ]
    },

    chemical: {
      formula: "Al₂O₃",

      traceElements: [
        "Chromium"
      ]
    },

    physical: {
      mohsMin: 9,
      mohsMax: 9,

      crystalSystem: "Trigonal",

      densityMin: 3.97,
      densityMax: 4.05
    },

    optical: {
      luster: "Vitreous",

      transparency:
        "Transparent to opaque",

      refractiveIndex:
        "Approximately 1.762–1.770"
    },

    colors: [
      {
        name: "Red",
        rarity: "Common"
      },
      {
        name: "Purplish Red",
        rarity: "Uncommon"
      },
      {
        name: "Vivid Red",
        rarity: "Rare"
      }
    ],

    geography: {
      countries: [
        "Myanmar",
        "Mozambique",
        "Sri Lanka",
        "Thailand",
        "Madagascar"
      ]
    },

    history: {
      cultures: [
        "South Asia",
        "Ancient Rome"
      ]
    },

    associations: {
      birthstone: ["July"],
      anniversary: ["15th", "40th"]
    },

    symbolism: {
      meanings: [
        "Passion",
        "Vitality",
        "Courage",
        "Protection"
      ]
    }

  },

  {
    id: "seed-sapphire",

    name: "Sapphire",
    nickname: "The Celestial Stone",

    description:
      "Sapphire describes gem corundum other than ruby. " +
      "Blue is its most familiar color, but many varieties exist.",

    rarity: "Uncommon",

    originType: "Natural",

    classifications: [
      "Precious",
      "Mineral",
      "Natural Gem"
    ],

    appearance: {
      color: "#5574df"
    },

    family: {
      group: "Oxides",
      species: "Corundum",
      varietyOf: "Corundum",

      varietyDifference:
        "Non-red gem corundum.",

      related: [
        "Ruby"
      ]
    },

    chemical: {
      formula: "Al₂O₃",

      traceElements: [
        "Iron",
        "Titanium",
        "Chromium"
      ]
    },

    physical: {
      mohsMin: 9,
      mohsMax: 9,

      crystalSystem: "Trigonal",

      densityMin: 3.95,
      densityMax: 4.03
    },

    optical: {
      luster: "Vitreous",

      transparency:
        "Transparent to opaque",

      refractiveIndex:
        "Approximately 1.762–1.770"
    },

    colors: [
      {
        name: "Blue",
        rarity: "Common"
      },
      {
        name: "Yellow",
        rarity: "Uncommon"
      },
      {
        name: "Pink",
        rarity: "Uncommon"
      },
      {
        name: "Padparadscha",
        rarity: "Special"
      }
    ],

    geography: {
      countries: [
        "Sri Lanka",
        "Madagascar",
        "Myanmar",
        "Australia",
        "Thailand"
      ]
    },

    associations: {
      birthstone: ["September"],
      anniversary: ["5th", "45th"]
    },

    symbolism: {
      meanings: [
        "Wisdom",
        "Loyalty",
        "Truth"
      ]
    }

  },

  {
    id: "seed-emerald",

    name: "Emerald",
    nickname: "The Green Jewel",

    description:
      "Emerald is the green gemstone variety of beryl. " +
      "Its color is commonly associated with chromium " +
      "and/or vanadium.",

    rarity: "Rare",

    originType: "Natural",

    classifications: [
      "Precious",
      "Mineral",
      "Natural Gem"
    ],

    appearance: {
      color: "#27ba82"
    },

    family: {
      group: "Silicates",
      species: "Beryl",
      varietyOf: "Beryl",

      varietyDifference:
        "Green beryl, generally associated with " +
        "chromium and/or vanadium.",

      related: [
        "Aquamarine",
        "Morganite",
        "Heliodor"
      ]
    },

    chemical: {
      formula: "Be₃Al₂Si₆O₁₈",

      traceElements: [
        "Chromium",
        "Vanadium",
        "Iron"
      ]
    },

    physical: {
      mohsMin: 7.5,
      mohsMax: 8,

      crystalSystem: "Hexagonal",

      densityMin: 2.67,
      densityMax: 2.78
    },

    optical: {
      luster: "Vitreous",

      transparency:
        "Transparent to translucent",

      refractiveIndex:
        "Approximately 1.565–1.602"
    },

    colors: [
      {
        name: "Green",
        rarity: "Common"
      },
      {
        name: "Bluish Green",
        rarity: "Uncommon"
      },
      {
        name: "Vivid Green",
        rarity: "Rare"
      }
    ],

    geography: {
      countries: [
        "Colombia",
        "Zambia",
        "Brazil",
        "Ethiopia"
      ]
    },

    history: {
      cultures: [
        "Ancient Egypt",
        "Mesoamerica",
        "South Asia"
      ]
    },

    associations: {
      birthstone: ["May"],
      anniversary: ["20th", "35th"]
    },

    symbolism: {
      meanings: [
        "Renewal",
        "Hope",
        "Growth"
      ]
    }

  },

  {
    id: "seed-amethyst",

    name: "Amethyst",
    nickname: "The Violet Quartz",

    description:
      "Amethyst is the purple to violet variety of quartz, " +
      "known for its distinctive coloration.",

    rarity: "Common",

    originType: "Natural",

    classifications: [
      "Semi-Precious",
      "Mineral",
      "Natural Gem"
    ],

    appearance: {
      color: "#a17de0"
    },

    family: {
      group: "Silicates",
      species: "Quartz",
      varietyOf: "Quartz",

      varietyDifference:
        "Purple quartz, associated with iron-related " +
        "color centers.",

      related: [
        "Citrine",
        "Rose Quartz",
        "Smoky Quartz"
      ]
    },

    chemical: {
      formula: "SiO₂",

      traceElements: [
        "Iron"
      ]
    },

    physical: {
      mohsMin: 7,
      mohsMax: 7,

      crystalSystem: "Trigonal",

      densityMin: 2.65,
      densityMax: 2.65,

      cleavage: "None",
      fracture: "Conchoidal"
    },

    optical: {
      luster: "Vitreous",

      transparency:
        "Transparent to translucent",

      refractiveIndex:
        "Approximately 1.544–1.553"
    },

    colors: [
      {
        name: "Light Violet",
        rarity: "Common"
      },
      {
        name: "Purple",
        rarity: "Common"
      },
      {
        name: "Deep Violet",
        rarity: "Uncommon"
      }
    ],

    geography: {
      countries: [
        "Brazil",
        "Uruguay",
        "Zambia",
        "Madagascar"
      ]
    },

    history: {
      cultures: [
        "Ancient Greece",
        "Ancient Rome"
      ]
    },

    associations: {
      birthstone: ["February"]
    },

    symbolism: {
      meanings: [
        "Clarity",
        "Calm",
        "Temperance"
      ]
    }

  },

  {
    id: "seed-amber",

    name: "Amber",
    nickname: "Fossilized Sunlight",

    description:
      "Amber is fossilized tree resin rather than a crystalline " +
      "mineral. It may preserve ancient biological inclusions.",

    rarity: "Uncommon",

    originType: "Natural",

    classifications: [
      "Organic",
      "Natural Gem"
    ],

    appearance: {
      color: "#dda349"
    },

    family: {
      group: "Organic Gem Materials",
      species: "",
      varietyOf: "",

      related: [
        "Copal"
      ]
    },

    chemical: {
      formula: "Variable organic composition",

      composition:
        "Complex fossilized organic resin."
    },

    physical: {
      mohsMin: 2,
      mohsMax: 2.5,

      crystalSystem: "Amorphous",

      densityMin: 1.05,
      densityMax: 1.1
    },

    optical: {
      luster: "Resinous",

      transparency:
        "Transparent to opaque"
    },

    colors: [
      {
        name: "Golden Yellow",
        rarity: "Common"
      },
      {
        name: "Orange",
        rarity: "Common"
      },
      {
        name: "Blue Appearance",
        rarity: "Special"
      }
    ],

    geography: {
      countries: [
        "Poland",
        "Lithuania",
        "Dominican Republic",
        "Myanmar"
      ]
    },

    history: {
      cultures: [
        "Baltic Cultures",
        "Ancient Rome",
        "Ancient Greece"
      ]
    },

    symbolism: {
      meanings: [
        "Warmth",
        "Protection",
        "Preservation"
      ]
    }

  }

];


/* =========================================
   RECORD SAFETY NOTES
========================================= */

/*
  1. Do not use an empty string as evidence
     that a property does not exist.

  2. Do not infer geological relationships
     from matching cultural associations.

  3. Matching chemical formulas alone does
     not establish identical mineral species.

  4. Historical and traditional associations
     are user-entered and system-dependent.

  5. Color rarity is separate from overall
     gemstone rarity.

  6. The "Special" color category is a
     catalog-specific designation, not a
     standardized mineralogical rarity class.

  7. Prices in different currencies or
     inconsistent quality conditions must
     not be directly ranked without warning.

  8. A single mineral species can have
     multiple gem varieties.

  9. Organic gemstones may not have a
     mineral species or crystal system.

 10. Manual relationships are explicit
     user records. They do not independently
     prove the asserted relationship.

 11. Imported V1 records preserve their
     original IDs, pictures and descriptions.

 12. The graph and similarity engine will
     work only with the properties recorded
     in the collection.
*/
