
/* GEM ATLAS V2 — DATA ARCHITECTURE */
"use strict";

const GEM_CONFIG = {
  version: 2,

  classifications: [
    "Precious","Semi-Precious","Organic","Mineral",
    "Mineraloid","Natural Gem","Synthetic","Imitation"
  ],

  rarityLevels: ["Common","Uncommon","Rare","Exotic"],
  colorRarities: [
    "Common","Uncommon","Rare","Exotic","Special"
  ],
  originTypes: ["Natural","Synthetic","Imitation","Unknown"],

  weights: {
    science: 40,
    geography: 15,
    culture: 10,
    tradition: 10,
    manual: 25
  },

  relationshipTypes: [
    "Related material",
    "Variety / Parent",
    "Similar appearance",
    "Geological association",
    "Historical association",
    "Traditional association",
    "Substitute",
    "Custom"
  ],

  /*
    Each statistical dimension returns one or more
    categories for a single gemstone.
    The engine deduplicates each gem within a category.
  */
  dimensions: [
    {id:"rarity",label:"Rarity"},
    {id:"classifications",label:"Classification"},
    {id:"originType",label:"Natural / Synthetic / Imitation"},
    {id:"family.group",label:"Mineral Group"},
    {id:"family.species",label:"Mineral Species"},
    {id:"physical.crystalSystem",label:"Crystal System"},
    {id:"optical.luster",label:"Luster"},
    {id:"optical.transparency",label:"Transparency"},
    {id:"colors",label:"Color Variations"},
    {id:"colorRarity",label:"Color Rarity"},
    {id:"geography.countries",label:"Countries Found"},
    {id:"history.cultures",label:"Historical Cultures"},
    {id:"chemical.traceElements",label:"Trace Elements"},
    {id:"associations.zodiac",label:"Zodiac"},
    {id:"associations.planetary",label:"Planetary Stones"},
    {id:"associations.birthstone",label:"Birthstone Months"},
    {id:"associations.anniversary",label:"Anniversaries"},
    {id:"symbolism.chakras",label:"Chakras"},
    {id:"symbolism.meanings",label:"Symbolic Meanings"},
    {id:"physical.mohsMax",label:"Mohs Hardness"},
    {id:"physical.densityMax",label:"Density"},
    {id:"market.minPrice",label:"Minimum Price / Carat"}
  ],

  numericDimensions: [
    "physical.mohsMax",
    "physical.densityMax",
    "market.minPrice"
  ]
};

/*
  Compact field-definition helpers.
  They expand to the same editable V1 field paths.
*/

const F = (path,label,type="text",extra={}) =>
  ({path,label,type,...extra});

const T = (path,label,extra={}) =>
  F(path,label,"textarea",{wide:true,...extra});

const A = (path,label,extra={}) =>
  F(path,label,"tags",{wide:true,...extra});

const N = (path,label,extra={}) =>
  F(path,label,"number",{step:0.01,...extra});

const S = (path,label,options) =>
  F(path,label,"select",{options:["",...options]});

const G = (title,fields,description="") =>
  ({title,description,fields});

const SPECIAL = (title,special,description="") =>
  ({title,special,description});

GEM_CONFIG.editorTabs = [
  {
    id:"identity",label:"Identity",
    groups:[
      G("Gemstone Identity",[
        F("name","Primary Name","text",{required:true}),
        A("names","Alternative Names"),
        F("nickname","Nickname / Title"),
        T("description","General Description"),
        S("rarity","Overall Rarity",GEM_CONFIG.rarityLevels),
        T("rarityReason","Rarity Explanation"),
        S("originType","Material Origin",
          GEM_CONFIG.originTypes)
      ]),
      SPECIAL("Classification","classifications",
        "Multiple classifications can apply."),
      G("Mineral Family & Hierarchy",[
        F("family.group","Mineral Group"),
        F("family.species","Mineral Species"),
        F("family.varietyOf","Variety Of"),
        T("family.varietyDifference",
          "What Makes This Variety Different?"),
        A("family.related","Related Gemstones"),
        T("family.notes","Family Notes")
      ]),
      SPECIAL("Images","images",
        "Library cover, profile banner and accent color.")
    ]
  },
  {
    id:"science",label:"Science",
    groups:[
      G("Chemical Identity",[
        F("chemical.formula","Chemical Formula"),
        T("chemical.composition","Composition"),
        A("chemical.traceElements","Trace Elements"),
        T("chemical.colorCauses","What Causes Its Colors?"),
        T("chemical.notes","Chemical Notes")
      ]),
      G("Physical Properties",[
        N("physical.mohsMin","Mohs Minimum",
          {min:0,max:10,step:0.1}),
        N("physical.mohsMax","Mohs Maximum",
          {min:0,max:10,step:0.1}),
        S("physical.crystalSystem","Crystal System",[
          "Cubic","Tetragonal","Orthorhombic",
          "Hexagonal","Trigonal","Monoclinic",
          "Triclinic","Amorphous","Not applicable","Unknown"
        ]),
        N("physical.densityMin","Density Minimum (g/cm³)",
          {step:0.001}),
        N("physical.densityMax","Density Maximum (g/cm³)",
          {step:0.001}),
        F("physical.cleavage","Cleavage"),
        F("physical.fracture","Fracture"),
        F("physical.streak","Streak"),
        F("physical.tenacity","Tenacity")
      ]),
      G("Optical Properties",[
        F("optical.luster","Luster"),
        F("optical.transparency","Transparency"),
        F("optical.refractiveIndex","Refractive Index"),
        F("optical.birefringence","Birefringence"),
        T("optical.luminescence","Luminescence"),
        T("optical.pleochroism","Pleochroism"),
        F("optical.dispersion","Dispersion"),
        T("optical.other","Other Optical Phenomena")
      ]),
      SPECIAL("Color Variations","colors",
        "Each color receives its own rarity classification.")
    ]
  },
  {
    id:"origins",label:"Origins",
    groups:[
      G("Geographic Distribution",[
        A("geography.countries","Countries Where Found"),
        A("geography.localities","Mining Areas / Deposits"),
        T("geography.geology","Geological Formation"),
        T("geography.miningNotes","Mining & Availability")
      ]),
      G("Discovery",[
        F("discovery.year","Discovery Year / Era"),
        F("discovery.origin","Discovery Location"),
        F("discovery.person","Discoverer / Researcher"),
        F("discovery.country","Discovery Country"),
        T("discovery.namesake","Namesake / Etymology"),
        T("discovery.oldestSpecimen","Oldest Specimen"),
        T("discovery.further","Later Scientific Discoveries")
      ]),
      G("Historical Record",[
        A("history.cultures","Prominent Cultures"),
        T("history.facts","Historical Facts"),
        T("history.timeline","Important Dates / Timeline")
      ])
    ]
  },
  {
    id:"traditions",label:"Traditions",
    groups:[
      G("Astrological & Calendar Associations",[
        A("associations.zodiac","Zodiac Stones"),
        A("associations.planetary","Planetary / Star Stones"),
        A("associations.birthstone","Birthstone Months"),
        A("associations.anniversary","Anniversary Years"),
        T("associations.substitutes","Substitute Roles"),
        T("associations.systemNotes","Traditional Systems")
      ]),
      G("Symbolism",[
        A("symbolism.meanings","Represents / Means"),
        A("symbolism.chakras","Chakras"),
        T("symbolism.properties","Traditional Properties"),
        T("symbolism.notes","Additional Symbolism")
      ]),
      G("Traditional Healing Beliefs",[
        T("healing.physical","Physical"),
        T("healing.emotional","Emotional"),
        T("healing.spiritual","Spiritual"),
        F("healing.tradition","Traditional System")
      ],"Cultural beliefs, not verified medical effects.")
    ]
  },
  {
    id:"value",label:"Value & Notes",
    groups:[
      G("Price & Market",[
        F("market.currency","Currency"),
        N("market.minPrice","Minimum Price / Carat"),
        N("market.maxPrice","Maximum Price / Carat"),
        T("market.quality","Quality & Price Conditions"),
        T("market.treatments","Treatments"),
        T("market.notes","Market Notes"),
        F("market.priceDate","Price Reference Date")
      ]),
      G("Scientific References",[
        T("sources.references","Reference URLs / Citations"),
        S("sources.confidence","Confidence",[
          "Verified","Well documented","Uncertain",
          "Traditional attribution","Personal note"
        ]),
        T("sources.notes","Reference Notes")
      ]),
      G("Personal Archive",[
        T("personal.opinion","Personal Opinion"),
        T("personal.notes","Additional Notes"),
        A("personal.keywords","Custom Keywords")
      ])
    ]
  },
  {
    id:"relations",label:"Relations",
    groups:[
      SPECIAL("Manual Gemstone Relationships","manual",
        "Connect entries directly. Each relationship can have a type and explanation. Connections are identified by stable gemstone IDs."),
      G("Relationship Notes",[
        T("relationshipNotes",
          "Additional Relationship / Research Notes")
      ])
    ]
  }
];

/* FULL RECORD SCHEMA */

function createEmptyGem(){
  return {
    id:"",name:"",names:[],nickname:"",description:"",
    favorite:false,createdAt:"",updatedAt:"",
    rarity:"",rarityReason:"",originType:"Natural",
    classifications:[],
    images:{cover:"",banner:""},
    appearance:{color:"#b8a3e8"},
    family:{
      group:"",species:"",varietyOf:"",
      varietyDifference:"",related:[],notes:""
    },
    chemical:{
      formula:"",composition:"",traceElements:[],
      colorCauses:"",notes:""
    },
    physical:{
      mohsMin:null,mohsMax:null,crystalSystem:"",
      densityMin:null,densityMax:null,
      cleavage:"",fracture:"",streak:"",tenacity:""
    },
    optical:{
      luster:"",transparency:"",refractiveIndex:"",
      birefringence:"",luminescence:"",
      pleochroism:"",dispersion:"",other:""
    },
    colors:[],
    geography:{
      countries:[],localities:[],geology:"",miningNotes:""
    },
    discovery:{
      year:"",origin:"",person:"",country:"",
      namesake:"",oldestSpecimen:"",further:""
    },
    history:{cultures:[],facts:"",timeline:""},
    associations:{
      zodiac:[],planetary:[],birthstone:[],
      anniversary:[],substitutes:"",systemNotes:""
    },
    symbolism:{
      meanings:[],chakras:[],properties:"",notes:""
    },
    healing:{
      physical:"",emotional:"",spiritual:"",tradition:""
    },
    market:{
      currency:"USD",minPrice:null,maxPrice:null,
      quality:"",treatments:"",notes:"",priceDate:""
    },
    sources:{references:"",confidence:"",notes:""},
    personal:{opinion:"",notes:"",keywords:[]},

    /* V2 RELATIONSHIP DATA */
    manualRelations:[],
    relationshipNotes:""
  };
}

function mergeGemData(base,update){
  const result={...base};
  if(!update || typeof update!=="object")return result;
  for(const [key,value] of Object.entries(update)){
    if(value && typeof value==="object" &&
       !Array.isArray(value) &&
       base[key] && typeof base[key]==="object" &&
       !Array.isArray(base[key])){
      result[key]=mergeGemData(base[key],value);
    }else{
      result[key]=value;
    }
  }
  return result;
}

function normalizeGem(record){
  const gem=mergeGemData(createEmptyGem(),record||{});
  const arrayPaths=[
    "names","classifications","colors","family.related",
    "chemical.traceElements","geography.countries",
    "geography.localities","history.cultures",
    "associations.zodiac","associations.planetary",
    "associations.birthstone","associations.anniversary",
    "symbolism.meanings","symbolism.chakras",
    "personal.keywords","manualRelations"
  ];
  for(const path of arrayPaths){
    const parts=path.split(".");
    let target=gem;
    for(let i=0;i<parts.length-1;i++){
      target=target[parts[i]];
    }
    const key=parts[parts.length-1];
    if(!Array.isArray(target[key]))target[key]=[];
  }
  return gem;
}

/*
  STARTER RECORDS
  Illustrative catalog records, not a fully
  verified scientific reference collection.
  Existing IndexedDB records take priority.
*/

const GEM_SEED_DATA=[
  {
    id:"seed-ruby",name:"Ruby",
    nickname:"The King of Precious Stones",
    description:"Ruby is the red gemstone variety of corundum.",
    rarity:"Rare",originType:"Natural",
    classifications:["Precious","Mineral","Natural Gem"],
    appearance:{color:"#d84b6b"},
    family:{
      group:"Oxides",species:"Corundum",varietyOf:"Corundum",
      varietyDifference:"Red corundum; chromium is a major colorant.",
      related:["Sapphire"]
    },
    chemical:{
      formula:"Al₂O₃",traceElements:["Chromium"],
      colorCauses:"Chromium-related red coloration."
    },
    physical:{
      mohsMin:9,mohsMax:9,crystalSystem:"Trigonal",
      densityMin:3.97,densityMax:4.05,
      cleavage:"No true cleavage"
    },
    optical:{
      luster:"Vitreous",
      refractiveIndex:"Approximately 1.762–1.770"
    },
    colors:[
      {name:"Red",rarity:"Common",hex:"#d2334a"},
      {name:"Purplish Red",rarity:"Uncommon",hex:"#a93164"},
      {name:"Vivid Red",rarity:"Rare",hex:"#ed1837"}
    ],
    geography:{
      countries:["Myanmar","Mozambique","Sri Lanka",
        "Thailand","Madagascar"]
    },
    history:{cultures:["South Asia","Ancient Rome"]},
    associations:{
      birthstone:["July"],anniversary:["15th","40th"]
    },
    symbolism:{
      meanings:["Passion","Vitality","Courage","Protection"]
    }
  },
  {
    id:"seed-sapphire",name:"Sapphire",
    nickname:"The Celestial Stone",
    description:"Sapphire comprises gem corundum varieties other than ruby.",
    rarity:"Uncommon",originType:"Natural",
    classifications:["Precious","Mineral","Natural Gem"],
    appearance:{color:"#5574df"},
    family:{
      group:"Oxides",species:"Corundum",varietyOf:"Corundum",
      varietyDifference:"Non-red gem corundum.",
      related:["Ruby"]
    },
    chemical:{
      formula:"Al₂O₃",
      traceElements:["Iron","Titanium","Chromium"]
    },
    physical:{
      mohsMin:9,mohsMax:9,crystalSystem:"Trigonal",
      densityMin:3.95,densityMax:4.03,
      cleavage:"No true cleavage"
    },
    optical:{
      luster:"Vitreous",
      refractiveIndex:"Approximately 1.762–1.770"
    },
    colors:[
      {name:"Blue",rarity:"Common",hex:"#365ccc"},
      {name:"Yellow",rarity:"Uncommon",hex:"#edcd55"},
      {name:"Pink",rarity:"Uncommon",hex:"#ec91c2"},
      {name:"Padparadscha",rarity:"Special",hex:"#f39479"}
    ],
    geography:{
      countries:["Sri Lanka","Madagascar","Myanmar",
        "Australia","Thailand"]
    },
    associations:{
      birthstone:["September"],anniversary:["5th","45th"]
    },
    symbolism:{meanings:["Wisdom","Loyalty","Truth"]}
  },
  {
    id:"seed-emerald",name:"Emerald",
    nickname:"The Green Jewel",
    description:"Emerald is the green gem variety of beryl.",
    rarity:"Rare",originType:"Natural",
    classifications:["Precious","Mineral","Natural Gem"],
    appearance:{color:"#27ba82"},
    family:{
      group:"Silicates",species:"Beryl",varietyOf:"Beryl",
      varietyDifference:"Green beryl, commonly colored by chromium and/or vanadium.",
      related:["Aquamarine","Morganite","Heliodor"]
    },
    chemical:{
      formula:"Be₃Al₂Si₆O₁₈",
      traceElements:["Chromium","Vanadium","Iron"]
    },
    physical:{
      mohsMin:7.5,mohsMax:8,
      crystalSystem:"Hexagonal",
      densityMin:2.67,densityMax:2.78,
      cleavage:"Imperfect basal cleavage"
    },
    optical:{
      luster:"Vitreous",
      refractiveIndex:"Approximately 1.565–1.602"
    },
    colors:[
      {name:"Green",rarity:"Common",hex:"#159b5e"},
      {name:"Bluish Green",rarity:"Uncommon",hex:"#0c987e"},
      {name:"Vivid Green",rarity:"Rare",hex:"#00ae56"}
    ],
    geography:{
      countries:["Colombia","Zambia","Brazil","Ethiopia"]
    },
    history:{
      cultures:["Ancient Egypt","Mesoamerica","South Asia"]
    },
    associations:{
      birthstone:["May"],anniversary:["20th","35th"]
    },
    symbolism:{meanings:["Renewal","Hope","Growth"]}
  },
  {
    id:"seed-amethyst",name:"Amethyst",
    nickname:"The Violet Quartz",
    description:"Amethyst is the violet to purple variety of quartz.",
    rarity:"Common",originType:"Natural",
    classifications:["Semi-Precious","Mineral","Natural Gem"],
    appearance:{color:"#a17de0"},
    family:{
      group:"Silicates",species:"Quartz",varietyOf:"Quartz",
      varietyDifference:"Purple coloration related to iron-associated color centers.",
      related:["Citrine","Rose Quartz","Smoky Quartz"]
    },
    chemical:{
      formula:"SiO₂",traceElements:["Iron"]
    },
    physical:{
      mohsMin:7,mohsMax:7,
      crystalSystem:"Trigonal",
      densityMin:2.65,densityMax:2.65,
      cleavage:"None",fracture:"Conchoidal"
    },
    optical:{
      luster:"Vitreous",
      refractiveIndex:"Approximately 1.544–1.553"
    },
    colors:[
      {name:"Light Violet",rarity:"Common",hex:"#bea2e7"},
      {name:"Purple",rarity:"Common",hex:"#874db7"},
      {name:"Deep Violet",rarity:"Uncommon",hex:"#52287f"}
    ],
    geography:{
      countries:["Brazil","Uruguay","Zambia","Madagascar"]
    },
    history:{
      cultures:["Ancient Greece","Ancient Rome"]
    },
    associations:{birthstone:["February"]},
    symbolism:{meanings:["Clarity","Calm","Temperance"]}
  },
  {
    id:"seed-amber",name:"Amber",
    nickname:"Fossilized Sunlight",
    description:"Amber is fossilized organic tree resin, not a crystalline mineral.",
    rarity:"Uncommon",originType:"Natural",
    classifications:["Organic","Natural Gem"],
    appearance:{color:"#dda349"},
    family:{
      group:"Organic Gem Materials",species:"",
      related:["Copal"]
    },
    chemical:{
      formula:"Variable organic composition",
      composition:"Complex fossilized organic resin."
    },
    physical:{
      mohsMin:2,mohsMax:2.5,
      crystalSystem:"Amorphous",
      densityMin:1.05,densityMax:1.1
    },
    optical:{luster:"Resinous"},
    colors:[
      {name:"Golden Yellow",rarity:"Common",hex:"#e2a535"},
      {name:"Orange",rarity:"Common",hex:"#dc762b"},
      {name:"Blue Appearance",rarity:"Special",hex:"#4c9bce"}
    ],
    geography:{
      countries:["Poland","Lithuania",
        "Dominican Republic","Myanmar"]
    },
    history:{
      cultures:["Baltic Cultures","Ancient Rome","Ancient Greece"]
    },
    symbolism:{
      meanings:["Warmth","Protection","Preservation"]
    }
  }
];
