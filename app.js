
/* GEM ATLAS V2 — APPLICATION + INTELLIGENCE */
"use strict";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const APP = {
  db:null,gems:[],persistenceAvailable:true,
  view:"library",quickFilter:"all",
  currentGemId:null,editingGem:null,activeTab:"identity",
  deleteId:null,toastTimer:null,
  compareIds:[],
  weights:{...GEM_CONFIG.weights},
  inspector:null,
  network:{nodes:[],edges:[],scale:1,x:0,y:0},
  drag:null
};

const DB_NAME="GemAtlasDatabase";
const DB_VERSION=1;
const GEM_STORE="gems";
const META_STORE="metadata";

/* =========================================
   BASIC UTILITIES
========================================= */

function esc(x){
  return String(x??"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=x=>String(x??"").trim().toLocaleLowerCase();
const unique=x=>[...new Set(x)];
const filled=x=>x!==null&&x!==undefined&&x!==""
  &&(!Array.isArray(x)||x.length>0);
const list=x=>Array.isArray(x)?x.filter(filled):
  filled(x)?[x]:[];
const textArray=x=>String(x??"").split(",")
  .map(v=>v.trim()).filter(Boolean);
const arrayText=x=>Array.isArray(x)?x.join(", "):String(x??"");
const num=x=>x===null||x===undefined||x===""
  ?null:Number.isFinite(Number(x))?Number(x):null;
const nameSort=(a,b)=>a.name.localeCompare(b.name);

function get(obj,path){
  return path.split(".").reduce((v,k)=>v?.[k],obj);
}
function put(obj,path,value){
  const p=path.split(".");
  let target=obj;
  for(let i=0;i<p.length-1;i++){
    target[p[i]]??={};
    target=target[p[i]];
  }
  target[p[p.length-1]]=value;
}
function uid(){
  return globalThis.crypto?.randomUUID?.()||
    "gem-"+Date.now().toString(36)+"-"+
    Math.random().toString(36).slice(2);
}
function color(g){
  const x=g?.appearance?.color||g?.colors?.[0]?.hex;
  return /^#[\da-f]{6}$/i.test(x||"")?x:"#b8a3e8";
}
function rgba(hex,a=.3){
  const x=color({appearance:{color:hex}}).slice(1);
  const v=[0,2,4].map(i=>parseInt(x.slice(i,i+2),16));
  return `rgba(${v.join(",")},${a})`;
}
function style(g){
  return `--gem-color:${color(g)};--gem-glow:${rgba(color(g),.33)}`;
}
function range(a,b,suffix=""){
  if(num(a)===null&&num(b)===null)return "";
  if(num(a)===null)return `${b}${suffix}`;
  if(num(b)===null||Number(a)===Number(b))return `${a}${suffix}`;
  return `${a}–${b}${suffix}`;
}
function findGem(id){return APP.gems.find(g=>g.id===id)}
function toast(message){
  const el=$("#toast");
  el.textContent=message;el.classList.add("show");
  clearTimeout(APP.toastTimer);
  APP.toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
}
function openLayer(id){
  $(id).classList.add("is-open");
  $(id).setAttribute("aria-hidden","false");
  lockBody();
}
function closeLayer(id){
  $(id).classList.remove("is-open");
  $(id).setAttribute("aria-hidden","true");
  lockBody();
}
function lockBody(){
  document.body.classList.toggle("modal-open",
    $$(".modal-backdrop").some(e=>e.classList.contains("is-open")));
}

/* =========================================
   INDEXEDDB — ORIGINAL DATABASE PRESERVED
========================================= */

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(GEM_STORE))
        db.createObjectStore(GEM_STORE,{keyPath:"id"});
      if(!db.objectStoreNames.contains(META_STORE))
        db.createObjectStore(META_STORE,{keyPath:"key"});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(Error("Database blocked"));
  });
}
function transaction(store,mode,operation){
  return new Promise((resolve,reject)=>{
    const tx=APP.db.transaction(store,mode);
    const s=tx.objectStore(store);
    let result;
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||Error("Aborted"));
    try{operation(s,v=>result=v)}
    catch(e){try{tx.abort()}catch(_){}reject(e)}
  });
}
const getAll=()=>transaction(GEM_STORE,"readonly",(s,done)=>{
  const req=s.getAll();req.onsuccess=()=>done(req.result);
});
const getMeta=key=>transaction(META_STORE,"readonly",(s,done)=>{
  const req=s.get(key);req.onsuccess=()=>done(req.result);
});
const saveGem=g=>transaction(GEM_STORE,"readwrite",
  s=>s.put(clone(g)));
const deleteGem=id=>transaction(GEM_STORE,"readwrite",
  s=>s.delete(id));

async function seedDatabase(){
  const marker=await getMeta("seeded");
  const existing=await getAll();
  if(marker?.value||existing.length)return;
  await new Promise((resolve,reject)=>{
    const tx=APP.db.transaction([GEM_STORE,META_STORE],"readwrite");
    const s=tx.objectStore(GEM_STORE);
    for(const record of GEM_SEED_DATA){
      const gem=normalizeGem(record);
      gem.createdAt=new Date().toISOString();
      gem.updatedAt=gem.createdAt;
      s.put(gem);
    }
    tx.objectStore(META_STORE).put({key:"seeded",value:true});
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}
async function loadCollection(){
  APP.gems=APP.persistenceAvailable
    ?(await getAll()).map(normalizeGem)
    :GEM_SEED_DATA.map(normalizeGem);
  renderAll();
}

/* =========================================
   RELATIONSHIP EVIDENCE ENGINE
========================================= */

/*
  Evidence groups:
  science      mineralogical / physical / chemical
  geography    locations
  culture      recorded historical associations
  tradition    symbolic and calendar associations
  manual       user-created explicit links

  Each pair is evaluated once. Missing values do
  not count as matches. A score is an explanatory
  catalog similarity index, not a probability.
*/

function overlap(a,b){
  const left=new Map(list(a).map(x=>[clean(x),String(x)]));
  const right=new Set(list(b).map(clean));
  return [...left].filter(([k])=>k&&right.has(k))
    .map(([,v])=>v);
}
function shared(a,b){
  return filled(a)&&filled(b)&&clean(a)===clean(b);
}
function mid(g,a,b){
  const x=num(get(g,a)),y=num(get(g,b));
  if(x===null&&y===null)return null;
  if(x===null)return y;
  if(y===null)return x;
  return (x+y)/2;
}
function evidence(a,b){
  const result=[];
  function add(group,label,value,strength=1){
    result.push({group,label,value:String(value),strength});
  }

  const af=a.family,bf=b.family;
  if(shared(af.species,bf.species))
    add("science","Same mineral species",af.species,1);
  else if(shared(af.group,bf.group))
    add("science","Same mineral group",af.group,.42);

  if(shared(af.varietyOf,bf.varietyOf)&&
      clean(af.varietyOf)!=="")
    add("science","Shared parent mineral",af.varietyOf,.8);

  if(shared(a.chemical.formula,b.chemical.formula))
    add("science","Identical recorded formula",
      a.chemical.formula,.9);

  const trace=overlap(a.chemical.traceElements,
    b.chemical.traceElements);
  if(trace.length)add("science","Shared trace elements",
    trace.join(", "),.45);

  if(shared(a.physical.crystalSystem,
      b.physical.crystalSystem)&&
      !["unknown","not applicable"].includes(
        clean(a.physical.crystalSystem)))
    add("science","Shared crystal system",
      a.physical.crystalSystem,.4);

  const hardA=mid(a,"physical.mohsMin","physical.mohsMax");
  const hardB=mid(b,"physical.mohsMin","physical.mohsMax");
  if(hardA!==null&&hardB!==null&&Math.abs(hardA-hardB)<=.5)
    add("science","Similar Mohs hardness",
      `${hardA} / ${hardB}`,.25);

  const denA=mid(a,"physical.densityMin","physical.densityMax");
  const denB=mid(b,"physical.densityMin","physical.densityMax");
  if(denA!==null&&denB!==null&&
    Math.abs(denA-denB)<=.15)
    add("science","Similar density",
      `${denA.toFixed(2)} / ${denB.toFixed(2)}`,.25);

  if(shared(a.optical.luster,b.optical.luster))
    add("science","Shared luster",a.optical.luster,.15);

  const countries=overlap(a.geography.countries,
    b.geography.countries);
  if(countries.length)add("geography","Shared countries",
    countries.join(", "),Math.min(1,.4+countries.length*.12));

  const places=overlap(a.geography.localities,
    b.geography.localities);
  if(places.length)add("geography","Shared deposits",
    places.join(", "),.9);

  const cultures=overlap(a.history.cultures,
    b.history.cultures);
  if(cultures.length)add("culture","Shared cultures",
    cultures.join(", "),.8);

  const associations=[
    ["associations.zodiac","Zodiac"],
    ["associations.planetary","Planetary associations"],
    ["associations.birthstone","Birthstone months"],
    ["associations.anniversary","Anniversaries"],
    ["symbolism.chakras","Chakras"],
    ["symbolism.meanings","Symbolic meanings"]
  ];
  for(const [path,label] of associations){
    const values=overlap(get(a,path),get(b,path));
    if(values.length)add("tradition",label,
      values.join(", "),.45);
  }

  /* Explicit manual relationships by stable ID */
  const relations=[
    ...list(a.manualRelations)
      .filter(r=>r.targetId===b.id),
    ...list(b.manualRelations)
      .filter(r=>r.targetId===a.id)
  ];
  const seen=new Set();
  for(const r of relations){
    const key=clean(r.type)+"|"+clean(r.note);
    if(seen.has(key))continue;
    seen.add(key);
    add("manual",r.type||"Manual relationship",
      r.note||"Explicitly linked by the collection owner",1);
  }

  /* V1 name-based suggestions: lower authority than manual links */
  const relatedNames=[
    ...list(af.related).map(clean),
    ...list(bf.related).map(clean)
  ];
  if(relatedNames.includes(clean(b.name))||
     relatedNames.includes(clean(a.name)))
    add("science","Named as related in a record",
      "Catalog family.related field",.25);

  return result;
}

function scoreEvidence(items,category="all"){
  const byGroup={};
  const weights=APP.weights;
  for(const group of Object.keys(weights)){
    if(category!=="all"&&category!==group)continue;
    const groupItems=items.filter(e=>e.group===group);
    if(!groupItems.length)continue;
    /*
      Strength within a group saturates at 1.
      Several weak matches cannot inflate
      one category indefinitely.
    */
    const contribution=Math.min(1,groupItems
      .reduce((s,e)=>s+e.strength,0));
    byGroup[group]=contribution;
  }
  const active=Object.keys(byGroup);
  if(!active.length)return 0;
  /*
    Denominator includes every enabled weight,
    including groups without a match. This
    avoids treating one weak match as 100%.
  */
  const denominator=Object.entries(weights)
    .filter(([k,v])=>(category==="all"||category===k)&&v>0)
    .reduce((s,[,v])=>s+v,0);
  if(!denominator)return 0;
  const sum=active.reduce((s,k)=>
    s+byGroup[k]*weights[k],0);
  return Math.round(100*sum/denominator);
}

function pairInfo(a,b,category="all"){
  const items=evidence(a,b).filter(e=>
    category==="all"||e.group===category);
  return {a,b,items,score:scoreEvidence(items,category)};
}
function allPairs(category="all",threshold=0){
  const pairs=[];
  for(let i=0;i<APP.gems.length;i++){
    for(let j=i+1;j<APP.gems.length;j++){
      const p=pairInfo(APP.gems[i],APP.gems[j],category);
      if(p.items.length&&p.score>=threshold)pairs.push(p);
    }
  }
  return pairs.sort((a,b)=>b.score-a.score);
}
function descriptionOfEvidence(item){
  const titles={
    science:"Scientific",
    geography:"Geographic",
    culture:"Historical",
    tradition:"Traditional",
    manual:"Manual"
  };
  return titles[item.group]||item.group;
}

/* =========================================
   LIBRARY + SUMMARY
========================================= */

function renderSummary(){
  const species=unique(APP.gems.map(g=>clean(g.family.species))
    .filter(Boolean));
  $("#statTotal").textContent=APP.gems.length;
  $("#statFamilies").textContent=species.length;
  $("#statRare").textContent=APP.gems.filter(g=>
    ["Rare","Exotic"].includes(g.rarity)).length;
  $("#statLinks").textContent=allPairs().length;
}
function searchable(g){
  return [
    g.name,g.nickname,...g.names,g.description,g.rarity,
    g.originType,...g.classifications,
    g.family.group,g.family.species,g.family.varietyOf,
    g.chemical.formula,...g.chemical.traceElements,
    ...g.colors.map(c=>c.name),
    ...g.geography.countries,...g.geography.localities,
    ...g.history.cultures,...g.associations.birthstone,
    ...g.symbolism.meanings,...g.personal.keywords
  ].join(" ").toLocaleLowerCase();
}
function filteredGems(){
  const query=clean($("#searchInput").value);
  const rarity=$("#rarityFilter").value;
  const classification=$("#classFilter").value;
  const sort=$("#sortFilter").value;
  const rank={Common:0,Uncommon:1,Rare:2,Exotic:3};
  const found=APP.gems.filter(g=>{
    if(query&&!searchable(g).includes(query))return false;
    if(rarity&&g.rarity!==rarity)return false;
    if(classification&&!g.classifications.includes(
      classification))return false;
    if(APP.quickFilter==="favorites"&&!g.favorite)return false;
    if(APP.quickFilter==="natural"&&g.originType!=="Natural")
      return false;
    if(APP.quickFilter==="synthetic"&&g.originType!=="Synthetic")
      return false;
    if(APP.quickFilter==="organic"&&
       !g.classifications.includes("Organic"))return false;
    return true;
  });
  found.sort((a,b)=>{
    if(sort==="name-desc")return b.name.localeCompare(a.name);
    if(sort==="rarity")return (rank[b.rarity]??-1)-
      (rank[a.rarity]??-1);
    if(sort==="hardness")return
      (num(b.physical.mohsMax)??-1)-
      (num(a.physical.mohsMax)??-1);
    if(sort==="newest")return String(b.createdAt)
      .localeCompare(String(a.createdAt));
    return nameSort(a,b);
  });
  return found;
}
function cover(g){
  return g.images.cover
    ?`<img src="${esc(g.images.cover)}"
        alt="${esc(g.name)}" loading="lazy">`
    :`<div class="gem-placeholder"><span>◇</span></div>`;
}
function gemCard(g){
  return `<article class="gem-card" data-gem-id="${esc(g.id)}"
    tabindex="0" role="button" style="${style(g)}">
    <div class="gem-card-image">
      ${cover(g)}
      <button class="favorite-button ${g.favorite?"is-favorite":""}"
        type="button" data-favorite="${esc(g.id)}">
        ${g.favorite?"♥":"♡"}</button>
      ${g.rarity?`<span class="card-rarity">${esc(g.rarity)}</span>`:""}
    </div>
    <div class="gem-card-body">
      <h3 class="gem-card-title">${esc(g.name)}</h3>
      <p class="gem-card-family">${esc(g.family.varietyOf||
        g.family.species||g.family.group||"Unclassified material")}</p>
      <div class="gem-card-details">
        <div class="card-detail"><span class="card-detail-label">MOHS</span>
          <span class="card-detail-value">${esc(range(
            g.physical.mohsMin,g.physical.mohsMax)||"—")}</span></div>
        <div class="card-detail"><span class="card-detail-label">COLOR</span>
          <span class="card-detail-value">${esc(
            g.colors[0]?.name||"—")}</span></div>
        <div class="card-detail"><span class="card-detail-label">ORIGIN</span>
          <span class="card-detail-value">${esc(g.originType)}</span></div>
      </div>
    </div>
  </article>`;
}
function renderLibrary(){
  const gems=filteredGems();
  $("#gemGrid").innerHTML=gems.map(gemCard).join("");
  $("#libraryCount").textContent=`${gems.length} ENTRIES`;
  $("#emptyState").hidden=gems.length>0;
}
function resetFilters(){
  $("#searchInput").value="";
  $("#rarityFilter").value="";
  $("#classFilter").value="";
  $("#sortFilter").value="name";
  APP.quickFilter="all";
  $$(".filter-chip").forEach(b=>b.classList.toggle(
    "active",b.dataset.filter==="all"));
  renderLibrary();
}

/* =========================================
   PROFILE DISPLAY
========================================= */

function property(label,value,full=false){
  if(!filled(value))return "";
  return `<div class="property-item ${full?"full":""}">
    <span class="property-label">${esc(label)}</span>
    <div class="property-value">${esc(arrayText(value))}</div>
  </div>`;
}
function section(title,content,note=""){
  if(!content.trim())return "";
  return `<section class="profile-section">
    <div class="profile-section-title">${esc(title)}</div>
    <div class="property-grid">${content}</div>
    ${note?`<div class="profile-note">${esc(note)}</div>`:""}
  </section>`;
}
function profileSections(g){
  const result=[];
  const sections=[
    ["Identity & Classification",[
      ["Alternative Names",g.names],
      ["Origin Type",g.originType],
      ["Classification",g.classifications,true],
      ["Rarity",g.rarity],
      ["Rarity Explanation",g.rarityReason,true]
    ]],
    ["Mineral Family",[
      ["Mineral Group",g.family.group],
      ["Mineral Species",g.family.species],
      ["Variety Of",g.family.varietyOf],
      ["Related Gems",g.family.related,true],
      ["Distinguishing Features",g.family.varietyDifference,true],
      ["Family Notes",g.family.notes,true]
    ]],
    ["Chemical Properties",[
      ["Formula",g.chemical.formula],
      ["Trace Elements",g.chemical.traceElements],
      ["Composition",g.chemical.composition,true],
      ["Color Causes",g.chemical.colorCauses,true],
      ["Additional Notes",g.chemical.notes,true]
    ]],
    ["Physical Properties",[
      ["Mohs Hardness",range(g.physical.mohsMin,g.physical.mohsMax)],
      ["Density",range(g.physical.densityMin,
        g.physical.densityMax," g/cm³")],
      ["Crystal System",g.physical.crystalSystem],
      ["Cleavage",g.physical.cleavage],
      ["Fracture",g.physical.fracture],
      ["Streak",g.physical.streak],
      ["Tenacity",g.physical.tenacity]
    ]],
    ["Optical Properties",[
      ["Luster",g.optical.luster],
      ["Transparency",g.optical.transparency],
      ["Refractive Index",g.optical.refractiveIndex],
      ["Birefringence",g.optical.birefringence],
      ["Luminescence",g.optical.luminescence,true],
      ["Pleochroism",g.optical.pleochroism,true],
      ["Dispersion",g.optical.dispersion],
      ["Other Phenomena",g.optical.other,true]
    ]],
    ["Geographic Distribution",[
      ["Countries",g.geography.countries,true],
      ["Mining Locations",g.geography.localities,true],
      ["Geological Formation",g.geography.geology,true],
      ["Mining Notes",g.geography.miningNotes,true]
    ]],
    ["Discovery",[
      ["Year",g.discovery.year],
      ["Location",g.discovery.origin],
      ["Discoverer",g.discovery.person],
      ["Country",g.discovery.country],
      ["Namesake",g.discovery.namesake,true],
      ["Oldest Specimen",g.discovery.oldestSpecimen,true],
      ["Further Discoveries",g.discovery.further,true]
    ]],
    ["History & Culture",[
      ["Prominent Cultures",g.history.cultures,true],
      ["Historical Facts",g.history.facts,true],
      ["Timeline",g.history.timeline,true]
    ]],
    ["Astrological & Calendar Associations",[
      ["Zodiac",g.associations.zodiac],
      ["Planetary",g.associations.planetary],
      ["Birthstone",g.associations.birthstone],
      ["Anniversary",g.associations.anniversary],
      ["Substitutes",g.associations.substitutes,true],
      ["Systems",g.associations.systemNotes,true]
    ]],
    ["Symbolism",[
      ["Meanings",g.symbolism.meanings,true],
      ["Chakras",g.symbolism.chakras],
      ["Traditional Properties",g.symbolism.properties,true],
      ["Notes",g.symbolism.notes,true]
    ]],
    ["Traditional Healing Beliefs",[
      ["Physical",g.healing.physical,true],
      ["Emotional",g.healing.emotional,true],
      ["Spiritual",g.healing.spiritual,true],
      ["Tradition",g.healing.tradition,true]
    ]],
    ["Market Value",[
      ["Price / Carat",(
        range(g.market.minPrice,g.market.maxPrice)
          ?range(g.market.minPrice,g.market.maxPrice)+
            " "+g.market.currency:"")],
      ["Quality",g.market.quality,true],
      ["Treatments",g.market.treatments,true],
      ["Market Notes",g.market.notes,true],
      ["Price Date",g.market.priceDate]
    ]],
    ["References",[
      ["Sources",g.sources.references,true],
      ["Confidence",g.sources.confidence],
      ["Notes",g.sources.notes,true]
    ]],
    ["Personal Archive",[
      ["Opinion",g.personal.opinion,true],
      ["Notes",g.personal.notes,true],
      ["Keywords",g.personal.keywords,true]
    ]]
  ];
  for(const [title,fields] of sections){
    result.push(section(title,fields.map(f=>property(...f)).join(""),
      title==="Traditional Healing Beliefs"
      ?"These entries describe beliefs, not verified medical treatments.":""));
  }
  if(g.colors.length){
    result.splice(5,0,`<section class="profile-section">
      <div class="profile-section-title">Color Variations</div>
      <div class="color-display-list">${g.colors.map(c=>`
        <div class="color-display">
          <span class="color-dot"
            style="background:${color({appearance:{color:c.hex}})}"></span>
          <div><div class="color-name">${esc(c.name)}</div>
            <div class="color-frequency">${esc(c.rarity)}</div></div>
        </div>`).join("")}</div></section>`);
  }
  const relationCards=allPairs().filter(p=>
    p.a.id===g.id||p.b.id===g.id).slice(0,8);
  result.push(section("Connected Gemstones",
    relationCards.map(p=>{
      const other=p.a.id===g.id?p.b:p.a;
      return `<div class="property-item">
        <button class="inspector-button"
          data-open-gem="${esc(other.id)}">
          ${esc(other.name)} · ${p.score}% similarity
        </button></div>`;
    }).join(""),"Scores are based on recorded catalog evidence."));
  result.push(section("Relationship Notes",
    property("Manual / Research Notes",g.relationshipNotes,true)));
  return result.join("");
}
function openProfile(id){
  const g=findGem(id);if(!g)return;
  APP.currentGemId=id;
  const banner=g.images.banner||g.images.cover;
  $("#profileContent").innerHTML=`<div style="${style(g)}">
    <div class="profile-hero">
      <div class="profile-banner">
        ${banner?`<img src="${esc(banner)}" alt="">`:""}
      </div>
      <div class="profile-top-actions">
        <button class="icon-button" data-profile="edit"
          type="button">✎</button>
        <button class="icon-button" data-profile="close"
          type="button">×</button>
      </div>
      <div class="profile-hero-content">
        <div class="profile-overline">${esc(
          g.family.species||g.family.group||"Gemstone Archive")}</div>
        <h2 class="profile-name">${esc(g.name)}</h2>
        ${g.nickname?`<div class="profile-nicknames">
          ${esc(g.nickname)}</div>`:""}
        <div class="profile-tags">
          ${[g.rarity,...g.classifications].filter(Boolean)
            .map((tag,i)=>`<span class="tag ${i===0?"gold":""}">
              ${esc(tag)}</span>`).join("")}
        </div>
      </div>
    </div>
    <div class="profile-content">
      ${g.description?`<div class="profile-description">
        ${esc(g.description)}</div>`:""}
      ${profileSections(g)}
      <div class="profile-bottom-actions">
        <button class="primary-button" data-profile="edit"
          type="button">✎ Edit Gemstone</button>
        <button class="secondary-button" data-profile="compare"
          type="button">⚖ Compare</button>
        <button class="secondary-button" data-profile="atlas"
          type="button">◎ Atlas</button>
        <button class="secondary-button" data-profile="duplicate"
          type="button">Duplicate</button>
        <button class="danger-button" data-profile="delete"
          type="button">Delete</button>
      </div>
    </div>
  </div>`;
  $("#profileModal").scrollTop=0;
  openLayer("#profileBackdrop");
}
function closeProfile(){
  closeLayer("#profileBackdrop");
  APP.currentGemId=null;
}

/* =========================================
   EDITOR
========================================= */

function renderField(f,g){
  const value=get(g,f.path),path=esc(f.path);
  let control="";
  if(f.type==="textarea"){
    control=`<textarea data-path="${path}">${esc(value)}</textarea>`;
  }else if(f.type==="tags"){
    control=`<input data-path="${path}" data-kind="tags"
      type="text" value="${esc(arrayText(value))}"
      placeholder="Separate entries with commas">`;
  }else if(f.type==="number"){
    control=`<input data-path="${path}" data-kind="number"
      type="number" step="${f.step||"any"}"
      ${f.min!==undefined?`min="${f.min}"`:""}
      ${f.max!==undefined?`max="${f.max}"`:""}
      value="${value===null?"":esc(value)}">`;
  }else if(f.type==="select"){
    control=`<select data-path="${path}">
      ${f.options.map(v=>`<option value="${esc(v)}"
        ${v===value?"selected":""}>${esc(v||"Not specified")}
        </option>`).join("")}</select>`;
  }else{
    control=`<input type="text" data-path="${path}"
      value="${esc(value)}" ${f.required?"required":""}>`;
  }
  return `<div class="editor-field ${f.wide?"wide":""}">
    <label>${esc(f.label)}${f.required?" *":""}</label>
    ${control}${f.hint?`<span class="field-hint">
      ${esc(f.hint)}</span>`:""}</div>`;
}
function classificationEditor(g){
  return `<div class="checkbox-collection">
    ${GEM_CONFIG.classifications.map(c=>`
      <label class="classification-option">
        <input type="checkbox" data-classification="${esc(c)}"
          ${g.classifications.includes(c)?"checked":""}>
        <span>${esc(c)}</span>
      </label>`).join("")}</div>`;
}
function imageEditor(g){
  return `<div class="editor-field-grid">
    ${["cover","banner"].map(type=>`
      <div class="editor-field wide">
        <span class="field-label">${type==="cover"
          ?"Library Cover Image":"Profile Banner Image"}</span>
        <div class="editor-image-preview">
          ${g.images[type]?`<img src="${esc(g.images[type])}" alt="">`
            :"No image selected"}
        </div>
        <div class="image-actions">
          <label class="image-upload-label">＋ Choose from Gallery
            <input class="upload-input" type="file" accept="image/*"
              data-image-type="${type}"></label>
          <button class="image-remove" type="button"
            data-remove-image="${type}">Remove Image</button>
        </div>
      </div>`).join("")}
    <div class="editor-field wide">
      <label>Accent Color</label>
      <input type="color" data-path="appearance.color"
        value="${color(g)}">
    </div>
  </div>`;
}
function colorEditor(g){
  return `<div class="color-editor-list">
    ${g.colors.map((c,i)=>`
      <div class="color-editor-row" data-color-index="${i}">
        <input data-color-field="name" aria-label="Color name"
          value="${esc(c.name)}" placeholder="Color name">
        <select data-color-field="rarity" aria-label="Color rarity">
          ${GEM_CONFIG.colorRarities.map(r=>`<option
            ${r===c.rarity?"selected":""}>${esc(r)}</option>`).join("")}
        </select>
        <input type="color" data-color-field="hex"
          aria-label="Color swatch"
          value="${color({appearance:{color:c.hex}})}">
        <button class="remove-color" data-remove-color="${i}"
          type="button">×</button>
      </div>`).join("")}
  </div>
  <button class="add-row-button" id="addColorRow"
    type="button">＋ Add Color Variation</button>`;
}
function manualEditor(g){
  const candidates=APP.gems.filter(x=>x.id!==g.id);
  return `<div class="manual-editor-list">
    ${g.manualRelations.map((r,i)=>`
      <div class="manual-row" data-manual-index="${i}">
        <select data-manual-field="targetId"
          aria-label="Related gemstone">
          <option value="">Choose gemstone</option>
          ${candidates.map(x=>`<option value="${esc(x.id)}"
            ${r.targetId===x.id?"selected":""}>
            ${esc(x.name)}</option>`).join("")}
        </select>
        <select data-manual-field="type"
          aria-label="Relationship type">
          ${GEM_CONFIG.relationshipTypes.map(t=>`
            <option ${r.type===t?"selected":""}>
              ${esc(t)}</option>`).join("")}
        </select>
        <button class="remove-manual"
          data-remove-manual="${i}" type="button">×</button>
        <textarea data-manual-field="note"
          placeholder="Explain this relationship">${esc(r.note)}</textarea>
      </div>`).join("")}
  </div>
  <button class="add-row-button" id="addManualRow"
    type="button">＋ Add Manual Relationship</button>
  <p class="field-hint" style="margin-top:12px">
    Manual connections are treated as undirected for graph analysis.
    Their original record is preserved on the gemstone where you add them.
  </p>`;
}
function renderEditorTabs(){
  $("#editorTabs").innerHTML=GEM_CONFIG.editorTabs.map(tab=>`
    <button class="editor-tab ${APP.activeTab===tab.id?"active":""}"
      data-editor-tab="${tab.id}" type="button">
      ${esc(tab.label)}</button>`).join("");
}
function renderEditorFields(){
  if(!APP.editingGem)return;
  const tab=GEM_CONFIG.editorTabs.find(t=>t.id===APP.activeTab);
  $("#editorFields").innerHTML=tab.groups.map(group=>{
    let body="";
    switch(group.special){
      case "classifications":
        body=classificationEditor(APP.editingGem);break;
      case "images":body=imageEditor(APP.editingGem);break;
      case "colors":body=colorEditor(APP.editingGem);break;
      case "manual":body=manualEditor(APP.editingGem);break;
      default:
        body=`<div class="editor-field-grid">
          ${group.fields.map(f=>renderField(f,APP.editingGem)).join("")}
        </div>`;
    }
    return `<section class="editor-group">
      <div class="editor-group-heading">${esc(group.title)}</div>
      <p class="editor-group-description">${esc(group.description)}</p>
      ${body}</section>`;
  }).join("");
  $("#editorFields").scrollTop=0;
}
function setEditorTab(id){
  APP.activeTab=id;renderEditorTabs();renderEditorFields();
}
function openEditor(id=null){
  const existing=id?findGem(id):null;
  APP.editingGem=existing?clone(existing):createEmptyGem();
  if(!existing)APP.editingGem.id=uid();
  APP.activeTab="identity";
  $("#editorTitle").textContent=existing
    ?`Edit ${existing.name}`:"New Gemstone";
  renderEditorTabs();renderEditorFields();
  openLayer("#editorBackdrop");
}
function closeEditor(){
  closeLayer("#editorBackdrop");
  APP.editingGem=null;
}
function updateEditorField(el){
  if(!APP.editingGem)return;
  let value=el.value;
  if(el.dataset.kind==="tags")value=textArray(value);
  if(el.dataset.kind==="number")value=num(value);
  put(APP.editingGem,el.dataset.path,value);
}
function updateColor(el){
  const row=el.closest("[data-color-index]");
  if(!row)return;
  const c=APP.editingGem.colors[Number(row.dataset.colorIndex)];
  if(c)c[el.dataset.colorField]=el.value;
}
function updateManual(el){
  const row=el.closest("[data-manual-index]");
  if(!row)return;
  const r=APP.editingGem.manualRelations[
    Number(row.dataset.manualIndex)];
  if(r)r[el.dataset.manualField]=el.value;
}
function imageToDataURL(file){
  return new Promise((resolve,reject)=>{
    if(!file?.type.startsWith("image/")){
      reject(Error("Not an image"));return;
    }
    const reader=new FileReader();
    reader.onerror=()=>reject(Error("File reading failed"));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(Error("Invalid image"));
      img.onload=()=>{
        const scale=Math.min(1,1600/
          Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=canvas.getContext("2d");
        if(!ctx){reject(Error("Canvas unavailable"));return}
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",.82));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function uploadImage(el){
  const draft=APP.editingGem;
  const type=el.dataset.imageType;
  const file=el.files?.[0];
  if(!file||!draft)return;
  try{
    const result=await imageToDataURL(file);
    if(APP.editingGem!==draft)return;
    draft.images[type]=result;
    renderEditorFields();toast("Image added to draft");
  }catch(e){console.error(e);toast("Image processing failed")}
}
async function saveEditingGem(){
  if(!APP.editingGem)return;
  const gem=normalizeGem(clone(APP.editingGem));
  gem.name=gem.name.trim();
  if(!gem.name){setEditorTab("identity");toast("Name required");return}
  const p=gem.physical;
  if([p.mohsMin,p.mohsMax].some(v=>
    num(v)!==null&&(num(v)<0||num(v)>10))||
    (num(p.mohsMin)!==null&&num(p.mohsMax)!==null&&
      p.mohsMin>p.mohsMax)){
    setEditorTab("science");toast("Check Mohs hardness");return;
  }
  gem.colors=gem.colors.filter(c=>clean(c.name));
  gem.manualRelations=gem.manualRelations.filter(r=>
    r.targetId&&r.targetId!==gem.id&&findGem(r.targetId))
    .filter((r,i,a)=>a.findIndex(x=>
      x.targetId===r.targetId&&x.type===r.type)===i);

  const now=new Date().toISOString();
  gem.createdAt=findGem(gem.id)?.createdAt||now;
  gem.updatedAt=now;
  if(APP.persistenceAvailable){
    try{await saveGem(gem)}
    catch(e){console.error(e);toast("Save failed");return}
  }
  const index=APP.gems.findIndex(g=>g.id===gem.id);
  if(index<0)APP.gems.push(gem);
  else APP.gems[index]=gem;
  closeEditor();renderAll();openProfile(gem.id);
  toast(APP.persistenceAvailable?"Gemstone saved":"Session-only changes");
}
async function toggleFavorite(id){
  const g=findGem(id);if(!g)return;
  const updated=clone(g);
  updated.favorite=!updated.favorite;
  updated.updatedAt=new Date().toISOString();
  try{
    if(APP.persistenceAvailable)await saveGem(updated);
    Object.assign(g,updated);renderAll();
  }catch(e){console.error(e);toast("Favorite not saved")}
}
async function duplicateGem(id){
  const g=findGem(id);if(!g)return;
  const copy=clone(g);copy.id=uid();copy.name+=" (Copy)";
  copy.manualRelations=[];copy.favorite=false;
  copy.createdAt=new Date().toISOString();
  copy.updatedAt=copy.createdAt;
  try{
    if(APP.persistenceAvailable)await saveGem(copy);
    APP.gems.push(copy);
    closeProfile();renderAll();openProfile(copy.id);
    toast("Gemstone duplicated");
  }catch(e){console.error(e);toast("Duplicate failed")}
}
function requestDelete(id){
  const g=findGem(id);if(!g)return;
  APP.deleteId=id;
  $("#confirmTitle").textContent="Delete gemstone?";
  $("#confirmMessage").textContent=
    `"${g.name}" will be removed from the collection.`;
  openLayer("#confirmBackdrop");
}
async function executeDelete(){
  const id=APP.deleteId;
  if(!id)return;
  try{
    if(APP.persistenceAvailable)await deleteGem(id);
    APP.gems=APP.gems.filter(g=>g.id!==id);
    APP.compareIds=APP.compareIds.filter(x=>x!==id);
    /*
      Remove dangling manual relations from other records.
    */
    for(const g of APP.gems){
      if(!g.manualRelations.some(r=>r.targetId===id))continue;
      const updated=clone(g);
      updated.manualRelations=updated.manualRelations
        .filter(r=>r.targetId!==id);
      if(APP.persistenceAvailable)await saveGem(updated);
      Object.assign(g,updated);
    }
    APP.deleteId=null;closeLayer("#confirmBackdrop");
    closeProfile();renderAll();toast("Gemstone deleted");
  }catch(e){console.error(e);toast("Delete incomplete; review records")}
}

/* =========================================
   NAVIGATION & SELECT OPTIONS
========================================= */

function switchView(name){
  APP.view=name;
  $$(".view").forEach(v=>v.classList.toggle(
    "active",v.id===`view-${name}`));
  $$(".main-tab").forEach(b=>b.classList.toggle(
    "active",b.dataset.view===name));
  if(name==="atlas")renderAtlas();
  if(name==="statistics")renderStatistics();
  if(name==="compare")renderComparison();
  window.scrollTo({top:0,behavior:"smooth"});
}
function gemOptions(excluded=[]){
  return APP.gems.filter(g=>!excluded.includes(g.id))
    .sort(nameSort).map(g=>`<option value="${esc(g.id)}">
      ${esc(g.name)}</option>`).join("");
}
function updateSelectOptions(){
  const names=gemOptions();
  for(const id of ["pathFrom","pathTo"]){
    const s=$("#"+id),old=s.value;
    s.innerHTML=names;
    if(APP.gems.some(g=>g.id===old))s.value=old;
  }
  if(APP.gems.length>1&&
      $("#pathFrom").value===$("#pathTo").value)
    $("#pathTo").selectedIndex=1;
  $("#comparePick").innerHTML='<option value="">Select gemstone</option>'+
    gemOptions(APP.compareIds);
  const cl=$("#classFilter"),old=cl.value;
  cl.innerHTML='<option value="">All classifications</option>'+
    GEM_CONFIG.classifications.map(c=>`
      <option value="${esc(c)}">${esc(c)}</option>`).join("");
  cl.value=old;
}

/* =========================================
   FAMILY TREE
========================================= */

function renderTree(){
  const groups=new Map();
  for(const gem of [...APP.gems].sort(nameSort)){
    const group=gem.family.group||"Unclassified Materials";
    const species=gem.family.species||
      (gem.classifications.includes("Organic")
        ?"Organic Gem Material":"Unspecified Species");
    if(!groups.has(group))groups.set(group,new Map());
    const speciesMap=groups.get(group);
    if(!speciesMap.has(species))speciesMap.set(species,[]);
    speciesMap.get(species).push(gem);
  }
  $("#treeStage").innerHTML=[...groups]
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([group,speciesMap])=>`
      <div class="tree-group">
        <h3 class="tree-heading">${esc(group)}</h3>
        ${[...speciesMap].sort((a,b)=>a[0].localeCompare(b[0]))
          .map(([species,gems])=>`
          <div class="tree-species">
            <div class="tree-species-title">${esc(species)}</div>
            <div class="tree-gems">
              ${gems.map(g=>`<button class="tree-gem"
                data-tree-gem="${esc(g.id)}" type="button"
                style="${style(g)}">◇ ${esc(g.name)}</button>`).join("")}
            </div>
          </div>`).join("")}
      </div>`).join("")||
    '<p class="section-description">No gemstone records yet.</p>';
}

/* =========================================
   NETWORK SVG
========================================= */

function svgEl(tag,attrs={},parent){
  const el=document.createElementNS(
    "http://www.w3.org/2000/svg",tag);
  for(const [k,v] of Object.entries(attrs))
    el.setAttribute(k,String(v));
  if(parent)parent.appendChild(el);
  return el;
}
function buildNetwork(){
  const gems=[...APP.gems].sort(nameSort);
  const n=gems.length;
  const nodes=gems.map((g,i)=>{
    const angle=i*2.399963229728653;
    const radius=Math.min(255,45+26*Math.sqrt(i));
    return {
      id:g.id,gem:g,
      x:500+Math.cos(angle)*radius,
      y:325+Math.sin(angle)*radius
    };
  });
  const cat=$("#atlasCategory").value;
  const threshold=Number($("#atlasThreshold").value);
  const edges=allPairs(cat,threshold).map(p=>({
    from:p.a.id,to:p.b.id,info:p
  }));
  /*
    Deterministic force layout:
    cluster connected gems while repelling all nodes.
    Limited iterations keep mobile rendering responsive.
  */
  for(let iter=0;iter<Math.min(105,45+n);iter++){
    const delta=new Map(nodes.map(v=>[v.id,{x:0,y:0}]));
    for(let i=0;i<n;i++){
      for(let j=i+1;j<n;j++){
        const a=nodes[i],b=nodes[j];
        const dx=b.x-a.x,dy=b.y-a.y;
        const d=Math.max(10,Math.hypot(dx,dy));
        const force=Math.min(7,4200/(d*d));
        const fx=dx/d*force,fy=dy/d*force;
        delta.get(a.id).x-=fx;delta.get(a.id).y-=fy;
        delta.get(b.id).x+=fx;delta.get(b.id).y+=fy;
      }
    }
    for(const edge of edges){
      const a=nodes.find(v=>v.id===edge.from);
      const b=nodes.find(v=>v.id===edge.to);
      const dx=b.x-a.x,dy=b.y-a.y;
      const d=Math.max(1,Math.hypot(dx,dy));
      const desired=130+(100-edge.info.score)*1.15;
      const spring=(d-desired)*.006;
      delta.get(a.id).x+=dx/d*spring;
      delta.get(a.id).y+=dy/d*spring;
      delta.get(b.id).x-=dx/d*spring;
      delta.get(b.id).y-=dy/d*spring;
    }
    for(const v of nodes){
      const f=delta.get(v.id);
      v.x+=Math.max(-6,Math.min(6,f.x+(500-v.x)*.002));
      v.y+=Math.max(-6,Math.min(6,f.y+(325-v.y)*.002));
    }
  }
  APP.network.nodes=nodes;
  APP.network.edges=edges;
}
function drawNetwork(){
  const svg=$("#networkSvg");
  svg.replaceChildren();
  const state=APP.network;
  const root=svgEl("g",{
    transform:`translate(${state.x} ${state.y})
      scale(${state.scale})`
  },svg);
  const positions=new Map(state.nodes.map(n=>[n.id,n]));
  for(const edge of state.edges){
    const a=positions.get(edge.from),b=positions.get(edge.to);
    if(!a||!b)continue;
    const line=svgEl("line",{
      x1:a.x,y1:a.y,x2:b.x,y2:b.y,
      stroke:"#b9a8e9",
      "stroke-opacity":.16+edge.info.score/180,
      "stroke-width":1.2+edge.info.score/30,
      class:"graph-edge"
    },root);
    const hit=svgEl("line",{
      x1:a.x,y1:a.y,x2:b.x,y2:b.y,
      stroke:"transparent","stroke-width":18,
      class:"graph-edge"
    },root);
    hit.dataset.edgeFrom=edge.from;
    hit.dataset.edgeTo=edge.to;
    line.dataset.edgeFrom=edge.from;
    line.dataset.edgeTo=edge.to;
  }
  for(const node of state.nodes){
    const g=node.gem;
    const group=svgEl("g",{
      class:"graph-node"+(
        APP.inspector?.type==="gem"&&
        APP.inspector.id===g.id?" selected":""),
      transform:`translate(${node.x} ${node.y})`
    },root);
    group.dataset.nodeId=g.id;
    svgEl("circle",{
      r:17,fill:color(g),opacity:.92
    },group);
    svgEl("circle",{
      r:5,fill:"#ffffff",opacity:.38
    },group);
    if($("#atlasLabels").checked){
      const t=svgEl("text",{
        class:"graph-label",x:0,y:37
      },group);
      t.textContent=g.name;
    }
  }
}
function renderAtlas(reset=false){
  const tree=$("#atlasMode").value==="tree";
  $("#networkSvg").hidden=tree;
  $("#treeStage").hidden=!tree;
  $("#atlasCategory").disabled=tree;
  $("#atlasThreshold").disabled=tree;
  $("#atlasLabels").disabled=tree;
  $("#mapStatus").textContent=tree
    ?"MINERALOGICAL HIERARCHY":"RELATIONSHIP CONSTELLATION";
  if(tree)renderTree();
  else{
    if(reset)APP.network={...APP.network,scale:1,x:0,y:0};
    buildNetwork();drawNetwork();
  }
  $("#atlasCount").textContent=tree
    ?`${APP.gems.length} ENTRIES`
    :`${APP.network.edges.length} CONNECTIONS`;
  renderInspector();
}
function transformMap(scaleChange,anchorX=500,anchorY=325){
  const st=APP.network;
  const next=Math.max(.35,Math.min(4,st.scale*scaleChange));
  st.x=anchorX-(anchorX-st.x)*next/st.scale;
  st.y=anchorY-(anchorY-st.y)*next/st.scale;
  st.scale=next;drawNetwork();
}
function screenToSVG(event){
  const svg=$("#networkSvg");
  const rect=svg.getBoundingClientRect();
  return {
    x:(event.clientX-rect.left)/rect.width*1000,
    y:(event.clientY-rect.top)/rect.height*650
  };
}

/* =========================================
   CONNECTION INSPECTOR
========================================= */

function renderInspector(){
  const selection=APP.inspector;
  if(!selection){
    $("#inspectorTitle").textContent="Explore relationships";
    $("#inspectorContent").textContent=
      "Select a gemstone or a connection to inspect its evidence.";
    return;
  }
  if(selection.type==="gem"){
    const g=findGem(selection.id);
    if(!g){APP.inspector=null;renderInspector();return}
    $("#inspectorTitle").textContent=g.name;
    const matches=allPairs().filter(p=>
      p.a.id===g.id||p.b.id===g.id).slice(0,15);
    $("#inspectorContent").innerHTML=`
      <p>${esc(g.family.species||g.family.group||
        "Unclassified material")}</p>
      <p>${matches.length} displayed related entries
        (up to 15 strongest).</p>
      <div class="inspector-list">
        ${matches.map(p=>{
          const other=p.a.id===g.id?p.b:p.a;
          return `<button class="inspector-button"
            data-inspect-edge="${esc(g.id)}|${esc(other.id)}">
            ${esc(other.name)} · ${p.score}%
          </button>`;
        }).join("")}
      </div>
      <button class="primary-button" data-inspect-open="${esc(g.id)}"
        type="button" style="margin-top:18px">
        Open Gemstone
      </button>`;
  }else if(selection.type==="edge"){
    const a=findGem(selection.a),b=findGem(selection.b);
    if(!a||!b){APP.inspector=null;renderInspector();return}
    const cat=$("#atlasCategory").value;
    const info=pairInfo(a,b,cat);
    $("#inspectorTitle").textContent=`${a.name} ↔ ${b.name}`;
    $("#inspectorContent").innerHTML=`
      <div class="evidence-score">${info.score}%</div>
      <p>Weighted similarity for the selected categories.</p>
      ${info.items.map(e=>`
        <div class="inspector-item">
          <span class="evidence-label">
            ${esc(descriptionOfEvidence(e))}</span>
          <div class="evidence-value"><strong>${esc(e.label)}</strong>
            <div>${esc(e.value)}</div>
          </div>
        </div>`).join("")}
      <p class="field-hint">These observations come from
        recorded fields, not external scientific verification.</p>`;
  }
}

/* =========================================
   PATHFINDER — BREADTH FIRST SEARCH
========================================= */

function findConnectionPath(from,to){
  if(from===to)return [];
  const pairs=allPairs($("#atlasCategory").value,
    Number($("#atlasThreshold").value));
  const adjacency=new Map(APP.gems.map(g=>[g.id,[]]));
  for(const p of pairs){
    adjacency.get(p.a.id)?.push({id:p.b.id,info:p});
    adjacency.get(p.b.id)?.push({id:p.a.id,info:p});
  }
  const queue=[from],seen=new Set([from]),prev=new Map();
  for(let head=0;head<queue.length;head++){
    const current=queue[head];
    if(current===to)break;
    for(const edge of adjacency.get(current)||[]){
      if(seen.has(edge.id))continue;
      seen.add(edge.id);
      prev.set(edge.id,{from:current,info:edge.info});
      queue.push(edge.id);
    }
  }
  if(!seen.has(to))return null;
  const path=[];
  let cur=to;
  while(cur!==from){
    const step=prev.get(cur);
    path.unshift({
      from:step.from,to:cur,info:step.info
    });
    cur=step.from;
  }
  return path;
}
function renderPath(){
  const a=$("#pathFrom").value,b=$("#pathTo").value;
  if(!a||!b){
    $("#pathResult").textContent="Add at least two gemstones.";
    return;
  }
  if(a===b){
    $("#pathResult").textContent="Choose different gemstones.";
    return;
  }
  const path=findConnectionPath(a,b);
  if(path===null){
    $("#pathResult").textContent=
      "No route found under the current relationship filters.";
    return;
  }
  $("#pathResult").innerHTML=path.map((step,i)=>{
    const from=findGem(step.from),to=findGem(step.to);
    const examples=step.info.items.slice(0,3).map(e=>
      `${e.label}: ${e.value}`).join(" · ");
    return `<div class="path-step">
      <strong>${i+1}. ${esc(from.name)} → ${esc(to.name)}</strong>
      <small>${esc(examples)}</small>
    </div>`;
  }).join("");
}

/* =========================================
   STATISTICS ENGINE
========================================= */

function dimensionValues(g,id){
  if(id==="colors")return g.colors.map(c=>c.name);
  if(id==="colorRarity")return g.colors.map(c=>c.rarity);
  const value=get(g,id);
  return list(value).filter(x=>x!=="Unknown"&&x!=="Not applicable")
    .map(String);
}
function dimensionLabel(id){
  return GEM_CONFIG.dimensions.find(d=>d.id===id)?.label||id;
}
function countDimension(id,metric="gems"){
  const map=new Map();
  for(const gem of APP.gems){
    const values=dimensionValues(gem,id);
    const items=metric==="occurrences"?values:unique(values);
    for(const value of items){
      const key=clean(value);
      if(!key)continue;
      if(!map.has(key))map.set(key,{name:value,count:0});
      map.get(key).count++;
    }
  }
  return [...map.values()].sort((a,b)=>
    b.count-a.count||a.name.localeCompare(b.name));
}
function displayStatValue(row,metric){
  if(metric==="percent"){
    return APP.gems.length
      ?(row.count/APP.gems.length*100).toFixed(1)+"%":"0%";
  }
  return String(row.count);
}
function donutSVG(rows){
  const palette=[
    "#b4a2e9","#6d92c8","#d1a6bd","#8fc8be",
    "#c9bc85","#9381bc","#c77e9c","#809ba2"
  ];
  const total=rows.reduce((s,r)=>s+r.count,0)||1;
  let offset=0;
  const circles=rows.slice(0,8).map((r,i)=>{
    const len=r.count/total*100;
    const html=`<circle cx="110" cy="110" r="75"
      fill="none" stroke="${palette[i]}" stroke-width="30"
      stroke-dasharray="${len} ${100-len}"
      stroke-dashoffset="${-offset}"
      pathLength="100"
      transform="rotate(-90 110 110)"/>`;
    offset+=len;return html;
  }).join("");
  return `<div class="donut-wrap">
    <svg class="donut-chart" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="75"
        fill="none" stroke="#252a3e" stroke-width="30"/>
      ${circles}
      <text x="110" y="110" fill="#e9eaf1" text-anchor="middle"
        dominant-baseline="middle" font-size="22">${total}</text>
    </svg>
    <div class="donut-legend">
      ${rows.slice(0,8).map((r,i)=>`
        <div class="legend-line">
          <span class="legend-dot"
            style="background:${palette[i]}"></span>
          ${esc(r.name)} · ${r.count}
        </div>`).join("")}
    </div>
  </div>`;
}
function barChart(rows,metric){
  const max=Math.max(1,...rows.map(r=>r.count));
  return rows.slice(0,35).map(r=>`
    <div class="ranked-row">
      <div class="ranked-name">${esc(r.name)}</div>
      <div class="ranked-track">
        <div class="ranked-fill"
          style="width:${r.count/max*100}%"></div>
      </div>
      <span class="ranked-value">${displayStatValue(r,metric)}</span>
    </div>`).join("");
}
function overlapMatrix(aId,bId){
  const xs=countDimension(aId).slice(0,12);
  const ys=countDimension(bId).slice(0,12);
  const matrix=ys.map(y=>xs.map(x=>
    APP.gems.filter(g=>{
      const a=dimensionValues(g,aId).map(clean);
      const b=dimensionValues(g,bId).map(clean);
      return a.includes(clean(x.name))&&b.includes(clean(y.name));
    }).length));
  return {xs,ys,matrix};
}
function heatmapChart(data){
  const max=Math.max(1,...data.matrix.flat());
  return `<div class="heatmap-grid"><table class="heatmap-table">
    <thead><tr><th></th>${data.xs.map(x=>
      `<th>${esc(x.name)}</th>`).join("")}</tr></thead>
    <tbody>${data.ys.map((y,i)=>`
      <tr><th>${esc(y.name)}</th>
        ${data.matrix[i].map(n=>`<td
          style="background:rgba(173,151,231,${.06+n/max*.8})">
          ${n}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}
function scatterChart(xId,yId){
  const valid=APP.gems.map(g=>({
    gem:g,x:num(get(g,xId)),y:num(get(g,yId))
  })).filter(p=>p.x!==null&&p.y!==null);
  if(!valid.length)return {
    html:"<p class='section-description'>No complete numeric pairs.</p>",
    valid
  };
  const minX=Math.min(...valid.map(p=>p.x));
  const maxX=Math.max(...valid.map(p=>p.x));
  const minY=Math.min(...valid.map(p=>p.y));
  const maxY=Math.max(...valid.map(p=>p.y));
  const scale=(v,min,max,start,length)=>
    start+(max===min?.5:(v-min)/(max-min))*length;
  const points=valid.map(p=>{
    const x=scale(p.x,minX,maxX,65,500);
    const y=360-scale(p.y,minY,maxY,0,290);
    return `<circle cx="${x}" cy="${y}" r="7"
      fill="${color(p.gem)}" stroke="#eee" stroke-width="1">
      <title>${esc(p.gem.name)}: ${p.x}, ${p.y}</title></circle>`;
  }).join("");
  const html=`<svg class="chart-svg" viewBox="0 0 630 430">
    <line x1="65" y1="70" x2="65" y2="360"
      stroke="#62697f"/>
    <line x1="65" y1="360" x2="565" y2="360"
      stroke="#62697f"/>
    ${[0,.25,.5,.75,1].map(t=>`
      <line x1="65" y1="${360-t*290}"
        x2="565" y2="${360-t*290}"
        stroke="#ffffff" stroke-opacity=".07"/>
      <text x="55" y="${364-t*290}" text-anchor="end">
        ${(minY+(maxY-minY)*t).toFixed(2)}</text>
      <text x="${65+t*500}" y="382" text-anchor="middle">
        ${(minX+(maxX-minX)*t).toFixed(2)}</text>`).join("")}
    ${points}
    <text x="310" y="414" text-anchor="middle">
      ${esc(dimensionLabel(xId))}</text>
  </svg>`;
  return {html,valid};
}
function renderStatistics(){
  const id=$("#statDimension").value;
  const second=$("#statSecond").value;
  const chart=$("#statChart").value;
  const metric=$("#statMetric").value;
  const rows=countDimension(id,metric);
  $("#chartTitle").textContent=dimensionLabel(id);
  $("#chartTotal").textContent=`${APP.gems.length} gemstones`;
  let html="",insights=[],tableRows=rows;

  if(chart==="bar"){
    html=barChart(rows,metric);
  }else if(chart==="donut"){
    html=donutSVG(rows);
  }else if(chart==="heatmap"){
    const data=overlapMatrix(id,second);
    html=heatmapChart(data);
    const flat=data.matrix.flat();
    insights.push(`Largest cell: ${Math.max(0,...flat)} gemstones.`);
  }else{
    const data=scatterChart(id,second);
    html=data.html;
    tableRows=data.valid.map(p=>({
      name:p.gem.name,count:p.x,second:p.y
    }));
    insights.push(`${data.valid.length} gemstones have both numeric values.`);
  }
  $("#chartCanvas").innerHTML=html||
    "<p class='section-description'>No recorded values yet.</p>";
  if(rows.length){
    insights.unshift(`Most represented: ${rows[0].name} (${rows[0].count}).`);
    insights.push(`${rows.length} distinct recorded categories.`);
  }
  if(metric==="percent"&&chart!=="scatter"){
    insights.push("Percentages use all catalog gemstones as the denominator. Multi-valued categories can total more than 100%.");
  }
  if(metric==="occurrences"){
    insights.push("Occurrences count repeated recorded values, including repeated array entries.");
  }
  $("#statInsights").innerHTML=insights.map(x=>`
    <div class="insight-item">${esc(x)}</div>`).join("")||
    "<p class='section-description'>Add data to generate observations.</p>";

  $("#statTable").innerHTML=`<table class="data-table">
    <thead><tr><th>${chart==="scatter"?"Gemstone":"Category"}</th>
      <th>${chart==="scatter"?esc(dimensionLabel(id)):"Count"}</th>
      ${chart==="scatter"?`<th>${esc(dimensionLabel(second))}</th>`:""}
    </tr></thead>
    <tbody>${tableRows.slice(0,100).map(r=>`
      <tr><td>${esc(r.name)}</td>
      <td>${chart==="scatter"?esc(r.count):
        esc(displayStatValue(r,metric))}</td>
      ${chart==="scatter"?`<td>${esc(r.second)}</td>`:""}
      </tr>`).join("")}</tbody>
  </table>`;
}
function updateStatControls(){
  const a=$("#statDimension"),b=$("#statSecond");
  const oldA=a.value||"rarity";
  const oldB=b.value||"family.group";
  const chart=$("#statChart").value;
  const options=chart==="scatter"
    ?GEM_CONFIG.dimensions.filter(d=>
      GEM_CONFIG.numericDimensions.includes(d.id))
    :GEM_CONFIG.dimensions;
  a.innerHTML=options.map(d=>
    `<option value="${esc(d.id)}">${esc(d.label)}</option>`).join("");
  b.innerHTML=options.map(d=>
    `<option value="${esc(d.id)}">${esc(d.label)}</option>`).join("");
  a.value=options.some(d=>d.id===oldA)?oldA:options[0].id;
  b.value=options.some(d=>d.id===oldB)?oldB:
    (options[1]?.id||options[0].id);
  b.disabled=!["heatmap","scatter"].includes(chart);
  $("#statMetric").disabled=chart==="scatter";
  renderStatistics();
}

/* =========================================
   COMPARISON LAB
========================================= */

const compareFields=[
  ["Rarity","rarity"],
  ["Origin Type","originType"],
  ["Classification","classifications"],
  ["Mineral Group","family.group"],
  ["Mineral Species","family.species"],
  ["Parent Mineral","family.varietyOf"],
  ["Formula","chemical.formula"],
  ["Trace Elements","chemical.traceElements"],
  ["Mohs Minimum","physical.mohsMin"],
  ["Mohs Maximum","physical.mohsMax"],
  ["Crystal System","physical.crystalSystem"],
  ["Density Minimum","physical.densityMin"],
  ["Density Maximum","physical.densityMax"],
  ["Cleavage","physical.cleavage"],
  ["Fracture","physical.fracture"],
  ["Streak","physical.streak"],
  ["Luster","optical.luster"],
  ["Transparency","optical.transparency"],
  ["Refractive Index","optical.refractiveIndex"],
  ["Luminescence","optical.luminescence"],
  ["Pleochroism","optical.pleochroism"],
  ["Dispersion","optical.dispersion"],
  ["Colors","colors"],
  ["Countries","geography.countries"],
  ["Localities","geography.localities"],
  ["Historical Cultures","history.cultures"],
  ["Zodiac","associations.zodiac"],
  ["Planetary Stones","associations.planetary"],
  ["Birthstone","associations.birthstone"],
  ["Anniversaries","associations.anniversary"],
  ["Chakras","symbolism.chakras"],
  ["Meanings","symbolism.meanings"],
  ["Currency","market.currency"],
  ["Minimum Price","market.minPrice"],
  ["Maximum Price","market.maxPrice"]
];
function compareValue(g,path){
  if(path==="colors")return g.colors.map(c=>
    `${c.name} (${c.rarity||"Unspecified"})`).join(", ");
  return arrayText(get(g,path));
}
function selectedComparisonGems(){
  return APP.compareIds.map(findGem).filter(Boolean);
}
function renderWeights(){
  $("#weightControls").innerHTML=Object.entries(APP.weights)
    .map(([key,value])=>`
      <label class="weight-item">
        <span class="weight-header">
          ${esc(key[0].toUpperCase()+key.slice(1))}
          <b>${value}</b>
        </span>
        <input type="range" min="0" max="100" step="5"
          value="${value}" data-weight="${key}">
      </label>`).join("");
}
function renderComparison(){
  const gems=selectedComparisonGems();
  $("#comparePick").innerHTML=
    '<option value="">Select gemstone</option>'+
    gemOptions(APP.compareIds);
  $("#selectedGems").innerHTML=gems.map(g=>`
    <div class="selected-gem" style="${style(g)}">
      <button class="selected-gem-remove" type="button"
        data-remove-compare="${esc(g.id)}">×</button>
      <div class="selected-gem-image">
        ${g.images.cover?`<img src="${esc(g.images.cover)}" alt="">`:"◇"}
      </div>
      <div class="selected-gem-body">${esc(g.name)}</div>
    </div>`).join("");
  renderWeights();
  if(gems.length<2){
    $("#comparisonResults").innerHTML=`
      <div class="compare-empty">
        Select at least two gemstones to compare their attributes.
      </div>`;
    return;
  }
  const pairs=[];
  for(let i=0;i<gems.length;i++)
    for(let j=i+1;j<gems.length;j++)
      pairs.push(pairInfo(gems[i],gems[j]));
  const pairCards=`<div class="comparison-pairs">
    ${pairs.map(p=>`
      <div class="glass-panel pair-card">
        <div class="panel-eyebrow">SIMILARITY ANALYSIS</div>
        <h3>${esc(p.a.name)} ↔ ${esc(p.b.name)}</h3>
        <div class="pair-score">${p.score}%</div>
        <div class="mini-meter"><span style="width:${p.score}%"></span></div>
        <p class="pair-sub">${p.items.length} evidence points.
          ${p.items.filter(e=>e.group==="science").length}
          scientific observations.</p>
        ${p.items.slice(0,8).map(e=>`
          <div class="inspector-item">
            <span class="evidence-label">
              ${esc(descriptionOfEvidence(e))}</span>
            <div class="evidence-value">
              ${esc(e.label)}: ${esc(e.value)}</div>
          </div>`).join("")}
      </div>`).join("")}</div>`;
  const rows=compareFields.map(([label,path])=>{
    const values=gems.map(g=>compareValue(g,path));
    const nonempty=values.filter(filled);
    if(!nonempty.length)return "";
    const same=nonempty.length===gems.length&&
      unique(nonempty.map(clean)).length===1;
    return `<tr class="${same?"shared":""}">
      <td>${esc(label)}${same?" ✧":""}</td>
      ${values.map(v=>`<td>${esc(v||"—")}</td>`).join("")}
    </tr>`;
  }).join("");
  const table=`<div class="glass-panel compare-table-panel">
    <div class="panel-eyebrow">ATTRIBUTE MATRIX</div>
    <h3>Side-by-Side Comparison</h3>
    <div class="table-scroll">
      <table class="compare-table"><thead><tr>
        <th>Characteristic</th>
        ${gems.map(g=>`<th>${esc(g.name)}</th>`).join("")}
      </tr></thead><tbody>${rows}</tbody></table>
    </div>
  </div>`;
  $("#comparisonResults").innerHTML=pairCards+table;
}

/* =========================================
   BACKUP / IMPORT
========================================= */

function exportCollection(){
  const payload={
    format:"GemAtlasBackup",version:2,
    exportedAt:new Date().toISOString(),
    gems:APP.gems
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],
    {type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="gem-atlas-backup.json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Backup export requested");
}
async function importCollection(file){
  try{
    const data=JSON.parse(await file.text());
    if(data.format!=="GemAtlasBackup"||
       !Array.isArray(data.gems))
      throw Error("Invalid Gem Atlas backup");
    const records=data.gems.map(normalizeGem);
    if(records.some(g=>!g.id||!g.name))throw Error("Invalid record");
    /*
      Import merges by ID and overwrites matching records,
      without deleting existing unrelated records.
    */
    if(APP.persistenceAvailable){
      for(const gem of records)await saveGem(gem);
      await loadCollection();
    }else{
      const map=new Map(APP.gems.map(g=>[g.id,g]));
      records.forEach(g=>map.set(g.id,g));
      APP.gems=[...map.values()];
      renderAll();
    }
    toast(`${records.length} records imported`);
  }catch(e){console.error(e);toast("Import failed: "+e.message)}
}

/* =========================================
   RENDER ALL
========================================= */

function renderAll(){
  renderSummary();updateSelectOptions();renderLibrary();
  if(APP.view==="atlas")renderAtlas();
  if(APP.view==="statistics")renderStatistics();
  if(APP.view==="compare")renderComparison();
}

/* =========================================
   EVENT BINDINGS
========================================= */

function attachEvents(){
  $("#brandHome").onclick=()=>switchView("library");
  $("#headerAdd").onclick=()=>openEditor();
  $("#emptyAdd").onclick=()=>openEditor();
  $("#exportData").onclick=exportCollection;
  $("#importData").onclick=()=>$("#importFile").click();
  $("#importFile").onchange=async e=>{
    const file=e.target.files?.[0];
    if(file)await importCollection(file);
    e.target.value="";
  };

  $$(".main-tab").forEach(b=>b.onclick=()=>
    switchView(b.dataset.view));

  ["searchInput","rarityFilter","classFilter","sortFilter"]
    .forEach(id=>$("#"+id).addEventListener(
      id==="searchInput"?"input":"change",renderLibrary));

  $("#quickFilters").onclick=e=>{
    const b=e.target.closest("[data-filter]");
    if(!b)return;
    APP.quickFilter=b.dataset.filter;
    $$(".filter-chip").forEach(x=>x.classList.toggle(
      "active",x===b));
    renderLibrary();
  };
  $("#clearFilters").onclick=resetFilters;

  $("#gemGrid").onclick=async e=>{
    const fav=e.target.closest("[data-favorite]");
    if(fav){await toggleFavorite(fav.dataset.favorite);return}
    const card=e.target.closest("[data-gem-id]");
    if(card)openProfile(card.dataset.gemId);
  };
  $("#gemGrid").onkeydown=e=>{
    if(e.target.matches(".gem-card")&&
      ["Enter"," "].includes(e.key)){
      e.preventDefault();openProfile(e.target.dataset.gemId);
    }
  };

  $("#profileContent").onclick=async e=>{
    const open=e.target.closest("[data-open-gem]");
    if(open){openProfile(open.dataset.openGem);return}
    const button=e.target.closest("[data-profile]");
    if(!button)return;
    const id=APP.currentGemId;
    switch(button.dataset.profile){
      case "close":closeProfile();break;
      case "edit":openEditor(id);break;
      case "duplicate":await duplicateGem(id);break;
      case "delete":requestDelete(id);break;
      case "compare":
        if(!APP.compareIds.includes(id)&&APP.compareIds.length<4)
          APP.compareIds.push(id);
        closeProfile();switchView("compare");break;
      case "atlas":
        APP.inspector={type:"gem",id};
        closeProfile();switchView("atlas");break;
    }
  };

  $("#editorTabs").onclick=e=>{
    const b=e.target.closest("[data-editor-tab]");
    if(b)setEditorTab(b.dataset.editorTab);
  };
  $("#editorFields").addEventListener("input",e=>{
    const t=e.target;
    if(t.dataset.path)updateEditorField(t);
    if(t.dataset.colorField)updateColor(t);
    if(t.dataset.manualField)updateManual(t);
  });
  $("#editorFields").addEventListener("change",async e=>{
    const t=e.target;
    if(t.dataset.path)updateEditorField(t);
    if(t.dataset.colorField)updateColor(t);
    if(t.dataset.manualField)updateManual(t);
    if(t.dataset.classification){
      const s=new Set(APP.editingGem.classifications);
      if(t.checked)s.add(t.dataset.classification);
      else s.delete(t.dataset.classification);
      APP.editingGem.classifications=[...s];
    }
    if(t.dataset.imageType)await uploadImage(t);
  });
  $("#editorFields").onclick=e=>{
    if(e.target.closest("#addColorRow")){
      APP.editingGem.colors.push({
        name:"",rarity:"Common",hex:"#a78bd7"
      });renderEditorFields();
    }
    const c=e.target.closest("[data-remove-color]");
    if(c){
      APP.editingGem.colors.splice(Number(c.dataset.removeColor),1);
      renderEditorFields();
    }
    if(e.target.closest("#addManualRow")){
      APP.editingGem.manualRelations.push({
        targetId:"",type:"Related material",note:""
      });renderEditorFields();
    }
    const r=e.target.closest("[data-remove-manual]");
    if(r){
      APP.editingGem.manualRelations.splice(
        Number(r.dataset.removeManual),1);
      renderEditorFields();
    }
    const img=e.target.closest("[data-remove-image]");
    if(img){
      APP.editingGem.images[img.dataset.removeImage]="";
      renderEditorFields();
    }
  };
  $("#gemForm").onsubmit=async e=>{
    e.preventDefault();await saveEditingGem();
  };
  $("#closeEditor").onclick=closeEditor;
  $("#cancelEditor").onclick=closeEditor;
  $("#cancelDelete").onclick=()=>{
    APP.deleteId=null;closeLayer("#confirmBackdrop");
  };
  $("#confirmDelete").onclick=executeDelete;

  $("#atlasMode").onchange=()=>renderAtlas(true);
  $("#atlasCategory").onchange=()=>renderAtlas(true);
  $("#atlasThreshold").onchange=()=>renderAtlas(true);
  $("#atlasLabels").onchange=()=>drawNetwork();
  $("#zoomIn").onclick=()=>transformMap(1.25);
  $("#zoomOut").onclick=()=>transformMap(.8);
  $("#resetMap").onclick=()=>{
    APP.network.scale=1;
    APP.network.x=0;APP.network.y=0;
    drawNetwork();
  };
  $("#treeStage").onclick=e=>{
    const b=e.target.closest("[data-tree-gem]");
    if(b){
      APP.inspector={type:"gem",id:b.dataset.treeGem};
      renderInspector();
    }
  };
  $("#inspectorContent").onclick=e=>{
    const open=e.target.closest("[data-inspect-open]");
    if(open){openProfile(open.dataset.inspectOpen);return}
    const edge=e.target.closest("[data-inspect-edge]");
    if(edge){
      const [a,b]=edge.dataset.inspectEdge.split("|");
      APP.inspector={type:"edge",a,b};renderInspector();
    }
  };
  $("#findPath").onclick=renderPath;

  const svg=$("#networkSvg");
  svg.addEventListener("click",e=>{
    if(APP.drag?.moved)return;
    const node=e.target.closest("[data-node-id]");
    const edge=e.target.closest("[data-edge-from]");
    if(node){
      APP.inspector={type:"gem",id:node.dataset.nodeId};
    }else if(edge){
      APP.inspector={
        type:"edge",a:edge.dataset.edgeFrom,
        b:edge.dataset.edgeTo
      };
    }else{return}
    renderInspector();drawNetwork();
  });
  svg.addEventListener("pointerdown",e=>{
    const p=screenToSVG(e);
    APP.drag={
      x:p.x,y:p.y,oldX:APP.network.x,
      oldY:APP.network.y,moved:false
    };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove",e=>{
    if(!APP.drag)return;
    const p=screenToSVG(e);
    const dx=p.x-APP.drag.x,dy=p.y-APP.drag.y;
    if(Math.hypot(dx,dy)>5)APP.drag.moved=true;
    if(!APP.drag.moved)return;
    APP.network.x=APP.drag.oldX+dx;
    APP.network.y=APP.drag.oldY+dy;
    drawNetwork();
  });
  svg.addEventListener("pointerup",()=>{
    if(!APP.drag)return;
    const moved=APP.drag.moved;
    setTimeout(()=>{
      if(APP.drag?.moved===moved)APP.drag=null;
    },0);
  });
  svg.addEventListener("wheel",e=>{
    e.preventDefault();
    const p=screenToSVG(e);
    transformMap(e.deltaY<0?1.12:.89,p.x,p.y);
  },{passive:false});

  ["statDimension","statSecond","statMetric"]
    .forEach(id=>$("#"+id).onchange=renderStatistics);
  $("#statChart").onchange=updateStatControls;

  $("#addCompare").onclick=()=>{
    const id=$("#comparePick").value;
    if(!id)return;
    if(APP.compareIds.length>=4){
      toast("Maximum four gemstones");return;
    }
    if(!APP.compareIds.includes(id))APP.compareIds.push(id);
    renderComparison();
  };
  $("#clearCompare").onclick=()=>{
    APP.compareIds=[];renderComparison();
  };
  $("#selectedGems").onclick=e=>{
    const b=e.target.closest("[data-remove-compare]");
    if(b){
      APP.compareIds=APP.compareIds.filter(
        id=>id!==b.dataset.removeCompare);
      renderComparison();
    }
  };
  $("#weightControls").oninput=e=>{
    const t=e.target;
    if(!t.dataset.weight)return;
    APP.weights[t.dataset.weight]=Number(t.value);
    renderComparison();
  };
  $("#resetWeights").onclick=()=>{
    APP.weights={...GEM_CONFIG.weights};
    renderComparison();
  };

  for(const id of ["profileBackdrop","editorBackdrop",
                     "confirmBackdrop"]){
    $("#"+id).onclick=e=>{
      if(e.target!==$("#"+id))return;
      if(id==="profileBackdrop")closeProfile();
      else if(id==="editorBackdrop")closeEditor();
      else{
        APP.deleteId=null;
        closeLayer("#confirmBackdrop");
      }
    };
  }
  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape")return;
    if($("#confirmBackdrop").classList.contains("is-open")){
      APP.deleteId=null;closeLayer("#confirmBackdrop");
    }else if($("#editorBackdrop").classList.contains("is-open")){
      closeEditor();
    }else if($("#profileBackdrop").classList.contains("is-open")){
      closeProfile();
    }
  });
}

/* =========================================
   INITIALIZATION
========================================= */

async function initializeApp(){
  attachEvents();
  const options=GEM_CONFIG.dimensions.map(d=>
    `<option value="${esc(d.id)}">${esc(d.label)}</option>`).join("");
  $("#statDimension").innerHTML=options;
  $("#statSecond").innerHTML=options;
  $("#statDimension").value="rarity";
  $("#statSecond").value="family.group";
  updateStatControls();
  try{
    APP.db=await openDatabase();
    await seedDatabase();
    APP.persistenceAvailable=true;
    await loadCollection();
  }catch(e){
    console.error("Database initialization:",e);
    APP.persistenceAvailable=false;
    APP.gems=GEM_SEED_DATA.map(normalizeGem);
    renderAll();
    toast("Storage unavailable — changes are session-only");
  }
}
document.addEventListener("DOMContentLoaded",initializeApp);
