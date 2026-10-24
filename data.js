
/* =========================================
   GEM ATLAS — DATA.JS
   DATA ARCHITECTURE + SEED COLLECTION
========================================= */

"use strict";

/*
  IMPORTANT ARCHITECTURE NOTES

  id:
    Unique internal identifier.

  names:
    Multiple names are supported.

  family:
    Mineralogical identity and relationships.

  classifications:
    Multiple simultaneous descriptors.

  originType:
    Natural, synthetic or imitation.

  physical / optical:
    Independent measurable properties.

  associations:
    Zodiac, planetary, birthstone and
    anniversary systems are separate.

  sources:
    Reference notes and confidence context.

  Relationships will later be generated from
  structured properties, not just name matching.
*/

const GEM_CONFIG = {

  version: 1,

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

  originTypes: [
    "Natural",
    "Synthetic",
    "Imitation",
    "Unknown"
  ],

  confidenceLevels: [
    "Verified",
    "Well documented",
    "Uncertain",
    "Traditional attribution",
    "Personal note"
  ],

  /*
    Grouped editor fields.

    type:
      text, textarea, number, select, tags

    tags:
      Arrays entered as comma-separated values.

    Fields are identified using dot paths.
  */

  editorTabs: [

    {
      id: "identity",
      label: "Identity",
      groups: [

        {
          title: "Gemstone Identity",
          description:
            "Basic identity, names and classification.",
          fields: [
            {
              path: "name",
              label: "Primary Name",
              type: "text",
              required: true,
              placeholder: "e.g. Amethyst"
            },
            {
              path: "names",
              label: "Alternative Names",
              type: "tags",
              placeholder: "Separated by commas"
            },
            {
              path: "nickname",
              label: "Nickname / Title",
              type: "text",
              placeholder: "e.g. Stone of ..."
            },
            {
              path: "description",
              label: "General Description",
              type: "textarea",
              wide: true
            },
            {
              path: "rarity",
              label: "Overall Rarity",
              type: "select",
              options: [
                "",
                "Common",
                "Uncommon",
                "Rare",
                "Exotic"
              ]
            },
            {
              path: "rarityReason",
              label: "Rarity Explanation",
              type: "textarea",
              wide: true,
              hint:
                "Why does this gemstone fit its rarity category?"
            },
            {
              path: "originType",
              label: "Material Origin",
              type: "select",
              options: [
                "Natural",
                "Synthetic",
                "Imitation",
                "Unknown"
              ]
            }
          ]
        },

        {
          title: "Gemstone Classification",
          description:
            "A gemstone may belong to several categories at once.",
          special: "classifications"
        },

        {
          title: "Mineral Family & Hierarchy",
          description:
            "These fields will power the mineral family tree.",
          fields: [
            {
              path: "family.group",
              label: "Mineral Group",
              type: "text",
              placeholder: "e.g. Silicates"
            },
            {
              path: "family.species",
              label: "Mineral Species",
              type: "text",
              placeholder: "e.g. Quartz"
            },
            {
              path: "family.varietyOf",
              label: "Variety Of",
              type: "text",
              placeholder: "Parent mineral name"
            },
            {
              path: "family.varietyDifference",
              label: "What Makes This Variety Different?",
              type: "textarea",
              wide: true
            },
            {
              path: "family.related",
              label: "Related Gemstones",
              type: "tags",
              wide: true,
              hint:
                "Names of known related gems. Later we can connect them using internal IDs."
            },
            {
              path: "family.notes",
              label: "Family Notes",
              type: "textarea",
              wide: true
            }
          ]
        },

        {
          title: "Images",
          description:
            "Upload pictures from your phone gallery. The banner fades naturally into the gemstone profile.",
          special: "images"
        }

      ]
    },

    {
      id: "science",
      label: "Science",
      groups: [

        {
          title: "Chemical Identity",
          description:
            "Composition and the elements responsible for notable characteristics.",
          fields: [
            {
              path: "chemical.formula",
              label: "Chemical Formula",
              type: "text",
              placeholder: "e.g. SiO₂"
            },
            {
              path: "chemical.composition",
              label: "Composition",
              type: "textarea",
              wide: true
            },
            {
              path: "chemical.traceElements",
              label: "Trace Elements",
              type: "tags"
            },
            {
              path: "chemical.colorCauses",
              label: "What Causes Its Colors?",
              type: "textarea",
              wide: true
            },
            {
              path: "chemical.notes",
              label: "Further Chemical Information",
              type: "textarea",
              wide: true
            }
          ]
        },

        {
          title: "Physical Properties",
          description:
            "Fundamental measurable gemological characteristics.",
          fields: [
            {
              path: "physical.mohsMin",
              label: "Mohs Hardness — Minimum",
              type: "number",
              min: 0,
              max: 10,
              step: 0.1
            },
            {
              path: "physical.mohsMax",
              label: "Mohs Hardness — Maximum",
              type: "number",
              min: 0,
              max: 10,
              step: 0.1
            },
            {
              path: "physical.crystalSystem",
              label: "Crystal Structure / System",
              type: "select",
              options: [
                "",
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
              ]
            },
            {
              path: "physical.densityMin",
              label: "Density Minimum (g/cm³)",
              type: "number",
              step: 0.001
            },
            {
              path: "physical.densityMax",
              label: "Density Maximum (g/cm³)",
              type: "number",
              step: 0.001
            },
            {
              path: "physical.cleavage",
              label: "Cleavage",
              type: "text"
            },
            {
              path: "physical.fracture",
              label: "Fracture",
              type: "text"
            },
            {
              path: "physical.streak",
              label: "Streak",
              type: "text"
            },
            {
              path: "physical.tenacity",
              label: "Tenacity",
              type: "text"
            }
          ]
        },

        {
          title: "Optical Properties",
          description:
            "Color, light transmission and optical behavior.",
          fields: [
            {
              path: "optical.luster",
              label: "Luster",
              type: "text"
            },
            {
              path: "optical.transparency",
              label: "Transparency",
              type: "text"
            },
            {
              path: "optical.refractiveIndex",
              label: "Refractive Index",
              type: "text",
              placeholder: "e.g. 1.760–1.770"
            },
            {
              path: "optical.birefringence",
              label: "Birefringence",
              type: "text"
            },
            {
              path: "optical.luminescence",
              label: "Luminescence",
              type: "textarea"
            },
            {
              path: "optical.pleochroism",
              label: "Pleochroism",
              type: "textarea"
            },
            {
              path: "optical.dispersion",
              label: "Dispersion",
              type: "text"
            },
            {
              path: "optical.other",
              label: "Other Optical Phenomena",
              type: "textarea",
              wide: true
            }
          ]
        },

        {
          title: "Gemstone Colors",
          description:
            "Each color has an individual rarity designation, including Special.",
          special: "colors"
        }

      ]
    },

    {
      id: "origins",
      label: "Origins",
      groups: [

        {
          title: "Geographic Distribution",
          description:
            "Mining locations and geological occurrence.",
          fields: [
            {
              path: "geography.countries",
              label: "Countries Where Found",
              type: "tags",
              wide: true
            },
            {
              path: "geography.localities",
              label: "Specific Mining Areas / Deposits",
              type: "tags",
              wide: true
            },
            {
              path: "geography.geology",
              label: "Geological Formation",
              type: "textarea",
              wide: true
            },
            {
              path: "geography.miningNotes",
              label: "Mining & Availability Notes",
              type: "textarea",
              wide: true
            }
          ]
        },

        {
          title: "Discovery",
          description:
            "First documentation, discoverers and naming history.",
          fields: [
            {
              path: "discovery.year",
              label: "Discovery Year / Era",
              type: "text"
            },
            {
              path: "discovery.origin",
              label: "Where Was It Discovered?",
              type: "text"
            },
            {
              path: "discovery.person",
              label: "Discoverer / Researcher",
              type: "text"
            },
            {
              path: "discovery.country",
              label: "Discovery Country",
              type: "text"
            },
            {
              path: "discovery.namesake",
              label: "Namesake / Etymology",
              type: "textarea",
              wide: true
            },
            {
              path: "discovery.oldestSpecimen",
              label: "Oldest Known Specimen",
              type: "textarea",
              wide: true
            },
            {
              path: "discovery.further",
              label: "Later Scientific Discoveries",
              type: "textarea",
              wide: true
            }
          ]
        },

        {
          title: "Historical Record",
          description:
            "Cultural prominence and historical information.",
          fields: [
            {
              path: "history.cultures",
              label: "Prominent Cultures",
              type: "tags",
              wide: true
            },
            {
              path: "history.facts",
              label: "Historical Facts",
              type: "textarea",
              wide: true
            },
            {
              path: "history.timeline",
              label: "Important Dates / Timeline",
              type: "textarea",
              wide: true,
              hint:
                "One dated event per line, if applicable."
            }
          ]
        }

      ]
    },

    {
      id: "traditions",
      label: "Traditions",
      groups: [

        {
          title: "Astrological & Calendar Associations",
          description:
            "Traditions differ across cultures and systems. Enter all applicable values separated by commas.",
          fields: [
            {
              path: "associations.zodiac",
              label: "Zodiac Stones",
              type: "tags",
              wide: true
            },
            {
              path: "associations.planetary",
              label: "Planetary / Star Stones",
              type: "tags",
              wide: true
            },
            {
              path: "associations.birthstone",
              label: "Birthstones — Months",
              type: "tags",
              wide: true
            },
            {
              path: "associations.anniversary",
              label: "Anniversary Stones — Years",
              type: "tags",
              wide: true,
              placeholder:
                "e.g. 15th anniversary, 40th anniversary"
            },
            {
              path: "associations.substitutes",
              label: "Substitute Stones / Substitution Roles",
              type: "textarea",
              wide: true,
              hint:
                "One per line. Example: Birthstone | April | Diamond substitute"
            },
            {
              path: "associations.systemNotes",
              label: "Association Systems / Sources",
              type: "textarea",
              wide: true,
              hint:
                "Specify the culture, tradition or published system."
            }
          ]
        },

        {
          title: "Symbolism",
          description:
            "Meanings, representations and spiritual traditions.",
          fields: [
            {
              path: "symbolism.meanings",
              label: "Meanings / Represents",
              type: "tags",
              wide: true
            },
            {
              path: "symbolism.chakras",
              label: "Chakras",
              type: "tags",
              wide: true
            },
            {
              path: "symbolism.properties",
              label: "Traditional Properties",
              type: "textarea",
              wide: true
            },
            {
              path: "symbolism.notes",
              label: "Additional Symbolism",
              type: "textarea",
              wide: true
            }
          ]
        },

        {
          title: "Traditional Healing Associations",
          description:
            "Record historical or contemporary beliefs. These are not verified medical effects.",
          fields: [
            {
              path: "healing.physical",
              label: "Physical Healing Beliefs",
              type: "textarea",
              wide: true
            },
            {
              path: "healing.emotional",
              label: "Emotional Healing Beliefs",
              type: "textarea",
              wide: true
            },
            {
              path: "healing.spiritual",
              label: "Spiritual Healing Beliefs",
              type: "textarea",
              wide: true
            },
            {
              path: "healing.tradition",
              label: "Traditional System / Culture",
              type: "text",
              wide: true
            }
          ]
        }

      ]
    },

    {
      id: "value",
      label: "Value & Notes",
      groups: [

        {
          title: "Market Value",
          description:
            "Values depend on quality, treatment, provenance, size and market conditions.",
          fields: [
            {
              path: "market.currency",
              label: "Currency",
              type: "text",
              placeholder: "USD"
            },
            {
              path: "market.minPrice",
              label: "Price Minimum — per Carat",
              type: "number",
              step: 0.01
            },
            {
              path: "market.maxPrice",
              label: "Price Maximum — per Carat",
              type: "number",
              step: 0.01
            },
            {
              path: "market.quality",
              label: "Quality / Price Conditions",
              type: "textarea",
              wide: true
            },
            {
              path: "market.treatments",
              label: "Treatments & Enhancements",
              type: "textarea",
              wide: true
            },
            {
              path: "market.notes",
              label: "Further Price / Value Information",
              type: "textarea",
              wide: true
            },
            {
              path: "market.priceDate",
              label: "Price Reference Date",
              type: "text",
              placeholder: "YYYY-MM or YYYY-MM-DD"
            }
          ]
        },

        {
          title: "Scientific References",
          description:
            "Record reference information so future comparisons can separate supported facts from uncertain claims.",
          fields: [
            {
              path: "sources.references",
              label: "References / URLs",
              type: "textarea",
              wide: true,
              hint: "One reference per line."
            },
            {
              path: "sources.confidence",
              label: "General Confidence",
              type: "select",
              options: [
                "",
                "Verified",
                "Well documented",
                "Uncertain",
                "Traditional attribution",
                "Personal note"
              ]
            },
            {
              path: "sources.notes",
              label: "Source Notes / Disagreements",
              type: "textarea",
              wide: true
            }
          ]
        },

        {
          title: "Personal Archive",
          description:
            "Your own observations and any information that doesn't fit elsewhere.",
          fields: [
            {
              path: "personal.opinion",
              label: "Personal Opinion",
              type: "textarea",
              wide: true
            },
            {
              path: "personal.notes",
              label: "Additional Notes",
              type: "textarea",
              wide: true
            },
            {
              path: "personal.keywords",
              label: "Custom Keywords",
              type: "tags",
              wide: true
            }
          ]
        }

      ]
    }

  ]

};


/* =========================================
   DEFAULT EMPTY GEM RECORD
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
    }

  };

}


/* =========================================
   SAMPLE COLLECTION
   STARTER RECORDS, NOT A VERIFIED DATABASE
========================================= */

const GEM_SEED_DATA = [

  /* RUBY */
  {
    id: "seed-ruby",
    name: "Ruby",

    names: [],
    nickname: "The King of Precious Stones",

    description:
      "Ruby is the red gem variety of corundum. " +
      "Its celebrated color, historical prominence " +
      "and remarkable hardness have made it one " +
      "of the best-known precious gemstones.",

    rarity: "Rare",
    rarityReason:
      "Ruby is commercially available, but " +
      "fine-quality examples with desirable " +
      "color and clarity can be difficult to source.",

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
        "Ruby is the red variety of corundum, " +
        "with chromium commonly responsible for " +
        "its characteristic red coloration.",
      related: ["Sapphire"]
    },

    chemical: {
      formula: "Al₂O₃",
      traceElements: ["Chromium"],
      colorCauses:
        "Chromium substitution in the corundum structure " +
        "is a major cause of ruby's red color."
    },

    physical: {
      mohsMin: 9,
      mohsMax: 9,
      crystalSystem: "Trigonal",
      densityMin: 3.97,
      densityMax: 4.05,
      cleavage: "No true cleavage"
    },

    optical: {
      luster: "Vitreous",
      transparency: "Transparent to opaque",
      refractiveIndex: "Approximately 1.762–1.770",
      pleochroism: "Usually dichroic"
    },

    colors: [
      {
        name: "Red",
        rarity: "Common",
        hex: "#d2334a"
      },
      {
        name: "Purplish Red",
        rarity: "Uncommon",
        hex: "#a93164"
      },
      {
        name: "Vivid Red",
        rarity: "Rare",
        hex: "#ed1837"
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
        "Southeast Asia",
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

  /* SAPPHIRE */
  {
    id: "seed-sapphire",
    name: "Sapphire",

    nickname: "The Celestial Stone",

    description:
      "Sapphire comprises the gem varieties of " +
      "corundum other than ruby. Although famous " +
      "for its blue color, sapphire occurs in " +
      "many other colors.",

    rarity: "Uncommon",
    rarityReason:
      "Sapphire is broadly traded, although " +
      "exceptional untreated stones and unusual " +
      "colors can be extremely scarce.",

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
        "Sapphire includes non-red gem corundum. " +
        "Its colors vary with trace elements and " +
        "other crystal-chemical factors.",
      related: ["Ruby"]
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
      densityMax: 4.03,
      cleavage: "No true cleavage"
    },

    optical: {
      luster: "Vitreous",
      transparency: "Transparent to opaque",
      refractiveIndex: "Approximately 1.762–1.770"
    },

    colors: [
      {
        name: "Blue",
        rarity: "Common",
        hex: "#365ccc"
      },
      {
        name: "Yellow",
        rarity: "Uncommon",
        hex: "#edcd55"
      },
      {
        name: "Pink",
        rarity: "Uncommon",
        hex: "#ec91c2"
      },
      {
        name: "Padparadscha",
        rarity: "Special",
        hex: "#f39479"
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

  /* EMERALD */
  {
    id: "seed-emerald",
    name: "Emerald",

    nickname: "The Green Jewel",

    description:
      "Emerald is the green gem variety of beryl. " +
      "Its color commonly results from chromium " +
      "and/or vanadium, and its distinctive " +
      "inclusions are an important part of " +
      "gemological evaluation.",

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
        "Emerald is the green beryl variety, " +
        "with its color commonly associated " +
        "with chromium and/or vanadium.",
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
      densityMax: 2.78,
      cleavage: "Imperfect basal cleavage"
    },

    optical: {
      luster: "Vitreous",
      transparency: "Transparent to translucent",
      refractiveIndex: "Approximately 1.565–1.602"
    },

    colors: [
      {
        name: "Green",
        rarity: "Common",
        hex: "#159b5e"
      },
      {
        name: "Bluish Green",
        rarity: "Uncommon",
        hex: "#0c987e"
      },
      {
        name: "Vivid Green",
        rarity: "Rare",
        hex: "#00ae56"
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

  /* AMETHYST */
  {
    id: "seed-amethyst",
    name: "Amethyst",

    nickname: "The Violet Quartz",

    description:
      "Amethyst is the violet to purple " +
      "variety of quartz. It forms in a variety " +
      "of geological environments and is among " +
      "the most recognizable colored gemstones.",

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
        "Amethyst is distinguished by its " +
        "purple coloration, associated with " +
        "iron-related color centers.",
      related: [
        "Citrine",
        "Rose Quartz",
        "Smoky Quartz"
      ]
    },

    chemical: {
      formula: "SiO₂",
      traceElements: ["Iron"]
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
      transparency: "Transparent to translucent",
      refractiveIndex: "Approximately 1.544–1.553"
    },

    colors: [
      {
        name: "Light Violet",
        rarity: "Common",
        hex: "#bea2e7"
      },
      {
        name: "Purple",
        rarity: "Common",
        hex: "#874db7"
      },
      {
        name: "Deep Violet",
        rarity: "Uncommon",
        hex: "#52287f"
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

  /* AMBER */
  {
    id: "seed-amber",
    name: "Amber",

    nickname: "Fossilized Sunlight",

    description:
      "Amber is fossilized tree resin rather " +
      "than a crystalline mineral. It can " +
      "preserve ancient biological inclusions " +
      "and is widely valued for its warm " +
      "colors and historical significance.",

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
      varietyDifference: "",
      related: ["Copal"]
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
      transparency: "Transparent to opaque"
    },

    colors: [
      {
        name: "Golden Yellow",
        rarity: "Common",
        hex: "#e2a535"
      },
      {
        name: "Orange",
        rarity: "Common",
        hex: "#dc762b"
      },
      {
        name: "Blue Appearance",
        rarity: "Special",
        hex: "#4c9bce"
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

    discovery: {
      oldestSpecimen:
        "Amber occurs in deposits of very " +
        "different geological ages. Specify " +
        "a deposit and dating method for " +
        "individual fossil specimens."
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
   DEEP MERGE UTILITY
   PRESERVES EMPTY SCHEMA FIELDS
========================================= */

function mergeGemData(base, update) {

  if (
    update === null ||
    typeof update !== "object" ||
    Array.isArray(update)
  ) {
    return update;
  }

  const result = {
    ...(base || {})
  };

  for (const key of Object.keys(update)) {

    const value = update[key];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {

      result[key] = mergeGemData(
        result[key] || {},
        value
      );

    } else {

      result[key] = value;

    }

  }

  return result;

}


/* =========================================
   NORMALIZE A GEM RECORD
========================================= */

function normalizeGem(record) {

  const normalized = mergeGemData(
    createEmptyGem(),
    record || {}
  );

  normalized.names =
    Array.isArray(normalized.names)
      ? normalized.names
      : [];

  normalized.classifications =
    Array.isArray(normalized.classifications)
      ? normalized.classifications
      : [];

  normalized.colors =
    Array.isArray(normalized.colors)
      ? normalized.colors
      : [];

  return normalized;

}

