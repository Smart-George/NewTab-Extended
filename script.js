(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toastEl = $("toast");

  const STORAGE = {
    name: "dash_name_v4",
    events: "dash_events_v4",
    last: "dash_lastcheck_v4",
    streak: "dash_streak_v4",
shortcuts: "dash_shortcuts_v1",
    theme: "dash_theme_v4",
    cursor: "dash_cursor_v4",
  };

  // ---------- Toast ----------
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(()=>toastEl.classList.remove("show"), 1700);
  }

  // ---------- Ripple (delegated, works on dynamic buttons too) ----------
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("button");
    if(!btn || btn.disabled) return;

    const rect = btn.getBoundingClientRect();
    const r = document.createElement("span");
    r.className = "ripple";
    r.style.left = (e.clientX - rect.left) + "px";
    r.style.top  = (e.clientY - rect.top) + "px";
    btn.appendChild(r);
    setTimeout(()=>r.remove(), 700);
  }, {passive:true});

  // ---------- Theme ----------
  function setTheme(t){
    document.body.setAttribute("data-theme", t);
    localStorage.setItem(STORAGE.theme, t);

    const isDark = (t === "dark");
    $("themeIco").src = isDark ? "./icons/half-moon.svg" : "./icons/sun-light.svg";
    $("themeLabel").textContent = isDark ? "Dark" : "Light";
  }
  function toggleTheme(){
    const cur = document.body.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  }

  // ---------- Cursor theme ----------
  function setCursorTheme(v){
    document.body.setAttribute("data-cursor", v);
    localStorage.setItem(STORAGE.cursor, v);

    $("curDefault").classList.toggle("active", v==="default");
    $("curLight").classList.toggle("active", v==="modern-light");
    $("curDark").classList.toggle("active", v==="modern-dark");
  }

  // ---------- Customize mode ----------
  function isCustom(){ return document.body.getAttribute("data-custom")==="1"; }
  function setCustom(on, silent=false){
    if(on) document.body.setAttribute("data-custom","1");
    else document.body.removeAttribute("data-custom");
    $("name").disabled = !on;
    if(!silent) toast(on ? "Customization enabled." : "Customization disabled.");
  }
  function toggleCustom(){ setCustom(!isCustom()); }

  document.addEventListener("keydown", (e)=>{
    if(e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")){
      e.preventDefault();
      toggleCustom();
    }
  });

  // ---------- Date helpers ----------
  const pad2 = (x)=>String(x).padStart(2,"0");
  const todayISO = (d=new Date()) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const startOfDay = (d=new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysBetween = (a,b)=>{
    const ms = 24*60*60*1000;
    return Math.round((startOfDay(b)-startOfDay(a))/ms);
  };
  const weekNumber = (d=new Date())=>{
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
  };
  const dayOfYear = (d=new Date())=>{
    const start = new Date(d.getFullYear(),0,0);
    return Math.floor((d - start) / 86400000);
  };

  // ---------- Seeded RNG ----------
  function hashStr(s){
    let h = 2166136261 >>> 0;
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rng, arr)=>arr[Math.floor(rng()*arr.length)];
  function pickMany(rng, arr, k){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rng()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a.slice(0,k);
  }

  // ---------- Event IDs (fix delete bug) ----------
  function uid(){
    const b = new Uint8Array(8);
    crypto.getRandomValues(b);
    return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");
  }

  function normalizeEvents(arr){
    const out = [];
    for(const x of (Array.isArray(arr) ? arr : [])){
      if(!x || typeof x.name !== "string" || typeof x.date !== "string") continue;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(x.date)) continue;
      const name = x.name.replace(/\s+/g," ").trim().slice(0,60);
      if(!name) continue;
      out.push({ id: (typeof x.id === "string" && x.id) ? x.id : uid(), name, date: x.date });
    }
    return out;
  }

  // ---------- Events storage ----------
  function loadEvents(){
    try{
      const raw = localStorage.getItem(STORAGE.events);
      if(!raw){
        const defaults = normalizeEvents([]);
        localStorage.setItem(STORAGE.events, JSON.stringify(defaults));
        return defaults;
      }
      const arr = normalizeEvents(JSON.parse(raw));
      // upgrade older saved formats
      localStorage.setItem(STORAGE.events, JSON.stringify(arr));
      return arr;
    }catch{
      return [];
    }
  }
  const saveEvents = (ev)=>localStorage.setItem(STORAGE.events, JSON.stringify(normalizeEvents(ev)));

  // ---------- Safe DOM helpers ----------
  function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }
  function make(tag, cls, text){
    const el = document.createElement(tag);
    if(cls) el.className = cls;
    if(text != null) el.textContent = text;
    return el;
  }

  // ---------- Fortune content ----------
  const VIBES = [
    {name:"Lucky",        sub:"Momentum is high. Keep choices simple and execute."},
    {name:"Small Lucky",  sub:"A solid day for progress. Avoid unnecessary complexity."},
    {name:"Creative",     sub:"Good for experiments. Validate quickly and iterate."},
    {name:"Defensive",    sub:"Reduce risk. Focus on fundamentals and maintenance."},
  {name:"Unlucky",        sub:"Risk is high. Never give up."}
];
  const DO_THINGS = [
    "Finish one important task before starting anything new",
    "Write a short plan and keep it visible",
    "Do a small cleanup that removes friction",
    "Work in a tight time box and stop on time",
    "Back up anything you cannot easily recreate",
    "Ship a small improvement instead of chasing perfection",
    "Ask one clarifying question early",
    "Make the next step smaller than it needs to be",
    "Take a short walk to reset attention",
    "Hydrate before you decide anything",
"Follow your dreams, you are never wrong"
  ];
  const AVOID_THINGS = [
    "Starting multiple tasks without finishing one",
    "Refactoring while the goal is still unclear",
    "Decisions made under time pressure",
    "Unnecessary arguments or debates",
    "Big purchases without a second look",
    "Skipping rest to squeeze one more hour",
    "Launching without checking basic assumptions",
    "Overcommitting to new obligations",
    "Ignoring small problems that will compound",
    "Treating a minor setback as a trend",
"Don't eat well because of work"
  ];
  const COLORS = ["Nebula Purple","Cyber Cyan","Mint Green","Sunset Orange","Soft Pink","Electric Blue","Lime","Silver", "Gold"];
  const WORDS  = ["Clarity","Momentum","Patience","Courage","Focus","Precision","Calm","Discipline","Balance","Play", "Care"];

  // ---------- Render: Date ----------
  function renderDate(){
    const d = new Date();
    $("timeNow").textContent = d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", second:"2-digit"});
    $("tz").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";

    $("dayNum").textContent = String(d.getDate());
    $("weekday").textContent = d.toLocaleDateString([], {weekday:"long"});
    $("monthLine").textContent = d.toLocaleDateString([], {month:"long"}) + " • " + d.getFullYear();
    $("dateISO").textContent = todayISO(d);
    $("weekNum").textContent = "W" + weekNumber(d);
    $("doy").textContent = String(dayOfYear(d));

    const hints = ["Steady pace", "Short iterations", "Low friction", "One thing at a time", "High signal", "Keep it simple"];
    $("moodHint").textContent = hints[d.getDay() % hints.length];
  }

  // ---------- Render: Events ----------
  function renderEvents(){
    const today = new Date();
    const ev = loadEvents().slice().sort((a,b)=>a.date.localeCompare(b.date));
    $("eventCount").textContent = String(ev.length);

    const root = $("events");
    clear(root);

    if(ev.length === 0){
      const card = make("div","ev",null);
      const l = make("div","l",null);
      l.appendChild(make("div","name","No events"));
      l.appendChild(make("div","when","Enable customization (Ctrl+Shift+C) to add events."));
      const r = make("div","r",null);
      r.appendChild(make("div","days","—"));
      r.appendChild(make("div","label","days"));
      card.appendChild(l); card.appendChild(r);
      root.appendChild(card);
      requestAnimationFrame(()=>card.classList.add("show"));
      return;
    }

    ev.forEach((e, idx) => {
      const target = new Date(e.date + "T00:00:00");
      const diff = daysBetween(today, target);
      const past = diff < 0;

      const item = make("div","ev",null);
      const l = make("div","l",null);
      l.appendChild(make("div","name", e.name));
      l.appendChild(make("div","when", e.date));

      const r = make("div","r",null);
      r.appendChild(make("div","days", String(past ? Math.abs(diff) : diff)));
      r.appendChild(make("div","label", past ? "days ago" : "days left"));

      item.appendChild(l); item.appendChild(r);
      root.appendChild(item);

      setTimeout(()=>item.classList.add("show"), 60 + idx*70);
    });
  }

  // ---------- Check-in ----------
  const getLast = ()=>localStorage.getItem(STORAGE.last) || "";
  const getStreak = ()=>Number(localStorage.getItem(STORAGE.streak) || "0");
  const setStreak = (x)=>localStorage.setItem(STORAGE.streak, String(x));

  function renderCheck(){
    const t = todayISO();
    const last = getLast();
    const streak = getStreak();

    $("streak").textContent = String(streak);
    $("lastCheck").textContent = last || "—";

    const done = (last === t);
    $("checkStatus").textContent = done ? "Checked in" : "Not checked in";

    $("checkBtn").classList.toggle("done", done);
    $("checkBtnLabel").textContent = done ? "Checked in today" : "Check in";
  }

  function checkIn(){
    const t = todayISO();
    const last = getLast();
    if(last === t){
      toast("Already checked in today.");
      return;
    }

    let s = getStreak();
    if(last){
      const diff = daysBetween(new Date(last+"T00:00:00"), new Date(t+"T00:00:00"));
      s = (diff === 1) ? (s + 1) : 1;
    } else s = 1;

    localStorage.setItem(STORAGE.last, t);
    setStreak(s);

    toast("Check-in complete.");
    renderCheck();
  }

  // ---------- Fortune ----------
  function renderFortune(){
    const name = ($("name").value.trim() || "user");
    const key = `${todayISO()}|${name.toLowerCase()}`;
    $("fortuneKey").textContent = "seed " + hashStr(key).toString(16);

    const rng = mulberry32(hashStr(key));
    const roll = rng();

    let vibe;
if (roll < 0.18) vibe = VIBES[0];      // Lucky
else if (roll < 0.48) vibe = VIBES[1]; // Small Lucky
else if (roll < 0.78) vibe = VIBES[2]; // Creative
else if (roll < 0.92) vibe = VIBES[3]; // Defensive
else vibe = VIBES[4];                  // Unlucky


    $("vibeBig").textContent = vibe.name;
    $("vibeSub").textContent = vibe.sub;

    const doItems = pickMany(rng, DO_THINGS, 3);
    const avoidItems = pickMany(rng, AVOID_THINGS, 3);

    const doUl = $("doList");
    const avUl = $("avoidList");
    clear(doUl); clear(avUl);
    doItems.forEach(t => doUl.appendChild(make("li","",t)));
    avoidItems.forEach(t => avUl.appendChild(make("li","",t)));

    $("luckyColor").textContent = pick(rng, COLORS);
    $("luckyNum").textContent = String(1 + Math.floor(rng()*99));
    $("powerWord").textContent = pick(rng, WORDS);

    $("nameText").textContent = name;
    localStorage.setItem(STORAGE.name, name);
  }

  // ---------- Modal ----------
  function openModal(){ $("modalBack").classList.add("open"); renderModalList(); }
  function closeModal(){ $("modalBack").classList.remove("open"); }

  function renderModalList(){
    const ev = loadEvents().slice().sort((a,b)=>a.date.localeCompare(b.date));
    const root = $("evList");
    clear(root);

    if(ev.length === 0){
      root.appendChild(make("div","sub","No events."));
      return;
    }

    ev.forEach((e) => {
      const box = make("div","ev show",null);

      const l = make("div","l",null);
      l.appendChild(make("div","name", e.name));
      l.appendChild(make("div","when", e.date));

      const r = make("div","r",null);
      const del = make("button","danger","Delete");
      del.type = "button";
      del.prepend(Object.assign(document.createElement("img"), {
        className: "ico",
        src: "./icons/trash.svg",
        alt: ""
      }));

      del.addEventListener("click", () => {
        const cur = loadEvents().filter(x => x.id !== e.id);
        saveEvents(cur);
        renderModalList();
        renderEvents();
        toast("Event deleted.");
      });

      r.appendChild(del);
      box.appendChild(l);
      box.appendChild(r);
      root.appendChild(box);
    });
  }

  function addEvent(){
    const name = $("evName").value.trim();
    const date = $("evDate").value.trim();

    if(!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)){
      toast("Enter a name and a date in YYYY-MM-DD format.");
      return;
    }

    const cleanName = name.replace(/\s+/g, " ").trim().slice(0, 60);
    const cur = loadEvents();
    cur.push({ id: uid(), name: cleanName, date });
    saveEvents(cur);

    $("evName").value = "";
    $("evDate").value = "";

    renderModalList();
    renderEvents();
    toast("Event added.");
  }

  function resetAll(){
    if(!confirm("Reset all local data (name, events, streak)?")) return;

    localStorage.removeItem(STORAGE.name);
    localStorage.removeItem(STORAGE.events);
    localStorage.removeItem(STORAGE.last);
    localStorage.removeItem(STORAGE.streak);

    $("name").value = "user";
    $("nameText").textContent = "user";

    toast("Local data reset.");
    tick();
  }

  // ---------- Reveal main cards ----------
  function reveal(){
    const cards = [ $("cardLeft"), $("cardRight") ];
    cards.forEach((c,i)=> setTimeout(()=>c.classList.add("reveal"), 120 + i*140));
  }
  // ---------- Search + Shortcuts ----------
  const searchBack = $("searchBack");
  const searchPanel = $("searchPanel");
  const searchInput = $("searchInput");
  const scGrid = $("scGrid");
  const scEditor = $("scEditor");
  const scEditorTitle = $("scEditorTitle");
  const scName = $("scName");
  const scUrl = $("scUrl");
  const manageScLabel = $("manageScLabel");

  let scManage = false;
  let scEditingId = null;

  function normalizeShortcuts(arr){
    const out = [];
    for(const x of (Array.isArray(arr) ? arr : [])){
      if(!x || typeof x.name !== "string" || typeof x.url !== "string") continue;
      const name = x.name.replace(/\s+/g," ").trim().slice(0, 28);
      const url = x.url.trim().slice(0, 300);
      if(!name || !url) continue;
      out.push({ id: (typeof x.id==="string" && x.id) ? x.id : uid(), name, url });
    }
    return out;
  }

  function loadShortcuts(){
    try{
      const raw = localStorage.getItem(STORAGE.shortcuts);
      if(!raw){
        const defs = normalizeShortcuts([
          { id: uid(), name: "google", url: "https://www.google.com" }
        ]);
        localStorage.setItem(STORAGE.shortcuts, JSON.stringify(defs));
        return defs;
      }
      const arr = normalizeShortcuts(JSON.parse(raw));
      localStorage.setItem(STORAGE.shortcuts, JSON.stringify(arr));
      return arr;
    }catch{
      return [];
    }
  }

  function saveShortcuts(arr){
    localStorage.setItem(STORAGE.shortcuts, JSON.stringify(normalizeShortcuts(arr)));
  }

  function looksLikeUrl(s){
    if(!s) return false;
    if(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) return true; // has scheme
    if(s.includes(" ")) return false;
    return s.includes("."); // domain-ish
  }

  function toUrl(s){
    s = s.trim();
    if(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) return s;
    if(s.startsWith("www.")) return "https://" + s;
    return "https://" + s;
  }

  function runSearchOrOpen(q){
    q = (q || "").trim();
    if(!q) return;

    const url = looksLikeUrl(q)
      ? toUrl(q)
      : ("https://www.google.com/search?q=" + encodeURIComponent(q));

    window.open(url, "_blank", "noopener");
  }

  function openSearch(){
    // close events modal if it’s open (optional but neat)
    if($("modalBack")?.classList.contains("open")) closeModal();

    searchBack.classList.add("open");
    requestAnimationFrame(() => searchBack.classList.add("show"));

    renderShortcuts();
    hideShortcutEditor(true);

    setTimeout(() => {
      searchInput.focus();
      searchInput.select();
    }, 90);
  }

  function closeSearch(){
    searchBack.classList.remove("show");
    setTimeout(() => searchBack.classList.remove("open"), 220);
    hideShortcutEditor(true);
    scManage = false;
    syncManageUI();
  }

  function syncManageUI(){
    searchPanel.setAttribute("data-manage", scManage ? "1" : "0");
    manageScLabel.textContent = scManage ? "Done" : "Manage";
  }

  function showShortcutEditor(mode, item){
    scEditor.classList.add("open");
    scEditor.setAttribute("aria-hidden", "false");

    if(mode === "edit"){
      scEditorTitle.textContent = "Edit shortcut";
      scEditingId = item.id;
      scName.value = item.name;
      scUrl.value = item.url;
    }else{
      scEditorTitle.textContent = "Add shortcut";
      scEditingId = null;
      scName.value = "";
      scUrl.value = "";
    }

    setTimeout(() => scName.focus(), 30);
  }

  function hideShortcutEditor(silent=false){
    scEditor.classList.remove("open");
    scEditor.setAttribute("aria-hidden", "true");
    scEditingId = null;
    if(!silent){
      scName.value = "";
      scUrl.value = "";
    }
  }

  function renderShortcuts(){
    const items = loadShortcuts();
    clear(scGrid);

    items.forEach((it) => {
      const tile = document.createElement("div");
      tile.className = "scTile";
      tile.dataset.id = it.id;

      const icon = document.createElement("div");
      icon.className = "scIcon";
      icon.textContent = (it.name.trim()[0] || "?").toUpperCase();

      const name = document.createElement("div");
      name.className = "scName";
      name.textContent = it.name;

      const actions = document.createElement("div");
      actions.className = "scActions";

      const editBtn = document.createElement("button");
      editBtn.className = "scAct";
      editBtn.type = "button";
      editBtn.title = "Edit";
      editBtn.appendChild(Object.assign(document.createElement("img"), {
        className: "ico",
        src: "./icons/edit-pencil.svg",
        alt: ""
      }));

      const delBtn = document.createElement("button");
      delBtn.className = "scAct";
      delBtn.type = "button";
      delBtn.title = "Delete";
      delBtn.appendChild(Object.assign(document.createElement("img"), {
        className: "ico",
        src: "./icons/trash.svg",
        alt: ""
      }));

      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showShortcutEditor("edit", it);
      });

      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const left = loadShortcuts().filter(x => x.id !== it.id);
        saveShortcuts(left);
        renderShortcuts();
        toast("Shortcut deleted.");
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      tile.appendChild(icon);
      tile.appendChild(name);
      tile.appendChild(actions);

      tile.addEventListener("click", () => {
        if(scManage){
          showShortcutEditor("edit", it);
          return;
        }
        closeSearch();
        runSearchOrOpen(it.url);
      });

      scGrid.appendChild(tile);
    });

    // add tile
    const add = document.createElement("div");
    add.className = "scTile add";
    add.innerHTML = `
      <div class="scIcon"><img class="ico" src="./icons/plus.svg" alt=""></div>
      <div class="scName">Add</div>
    `;
    add.addEventListener("click", () => showShortcutEditor("add", null));
    scGrid.appendChild(add);

    syncManageUI();
  }

  function saveShortcutFromEditor(){
    const name = scName.value.trim();
    const urlRaw = scUrl.value.trim();

    if(!name || !urlRaw){
      toast("Name + URL required.");
      return;
    }

    // for shortcuts, force URL-ish input (no spaces + has dot or scheme)
    if(!looksLikeUrl(urlRaw)){
      toast("That URL looks invalid.");
      return;
    }

    const url = toUrl(urlRaw);
    const list = loadShortcuts();

    if(scEditingId){
      const idx = list.findIndex(x => x.id === scEditingId);
      if(idx >= 0){
        list[idx] = { ...list[idx], name, url };
      }
      saveShortcuts(list);
      toast("Shortcut updated.");
    }else{
      list.push({ id: uid(), name, url });
      saveShortcuts(list);
      toast("Shortcut added.");
    }

    hideShortcutEditor();
    renderShortcuts();
  }

  // ---------- Wire up ----------
  $("checkBtn").addEventListener("click", checkIn);
  $("themeBtn").addEventListener("click", toggleTheme);
  $("searchBtn").addEventListener("click", openSearch);
  $("searchGoBtn").addEventListener("click", () => {
    const q = searchInput.value.trim();
    if(!q) return;
    closeSearch();
    runSearchOrOpen(q);
  });

  $("manageScBtn").addEventListener("click", () => {
    scManage = !scManage;
    syncManageUI();
    hideShortcutEditor(true);
  });

  $("scSaveBtn").addEventListener("click", saveShortcutFromEditor);
  $("scCancelBtn").addEventListener("click", () => hideShortcutEditor());

  searchInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      const q = searchInput.value.trim();
      if(!q) return;
      closeSearch();
      runSearchOrOpen(q);
    }
    if(e.key === "Escape"){
      e.preventDefault();
      closeSearch();
    }
  });

  searchBack.addEventListener("click", (e) => {
    if(e.target === searchBack) closeSearch(); // click outside panel
  });

  document.addEventListener("keydown", (e) => {
    // avoid stealing keys while typing in inputs
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    const typing = (tag === "INPUT" || tag === "TEXTAREA");

    if(e.key === "Escape" && searchBack.classList.contains("open")){
      e.preventDefault();
      closeSearch();
      return;
    }

    // "/" opens search (like browser UIs), but not while typing
    if(!typing && e.key === "/"){
      e.preventDefault();
      openSearch();
      return;
    }

    // Ctrl/Cmd + K opens search
    if((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")){
      e.preventDefault();
      openSearch();
      return;
    }
  });

  $("editEventsBtn")?.addEventListener("click", openModal);
  $("closeModalBtn")?.addEventListener("click", closeModal);
  $("modalBack").addEventListener("click", (e)=>{ if(e.target === $("modalBack")) closeModal(); });
  $("addEvBtn").addEventListener("click", addEvent);
  $("resetBtn").addEventListener("click", resetAll);

  $("name").addEventListener("input", renderFortune);

  $("curDefault").addEventListener("click", ()=> setCursorTheme("default"));
  $("curLight").addEventListener("click", ()=> setCursorTheme("modern-light"));
  $("curDark").addEventListener("click", ()=> setCursorTheme("modern-dark"));

  // ---------- Init from storage ----------
  const savedTheme = localStorage.getItem(STORAGE.theme) || "dark";
  setTheme(savedTheme);

  const savedCursor = localStorage.getItem(STORAGE.cursor) || "default";
  setCursorTheme(savedCursor);

  const savedName = localStorage.getItem(STORAGE.name) || "user";
  $("name").value = savedName;
  $("nameText").textContent = savedName;

  setCustom(false, true); // silent on load

  function tick(){
    renderDate();
    renderEvents();
    renderCheck();
    renderFortune();
  }

  tick();
  reveal();

  setInterval(() => {
    renderDate();
    renderCheck();
  }, 1000);
})();