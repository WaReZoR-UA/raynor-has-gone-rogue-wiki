/* ============================================
   RHRG Wiki — SPA Core
   Router, i18n, template engine, shared logic
   ============================================ */

const App = {
    lang: localStorage.getItem('rhrg-lang') || 'ru',
    i18n: {},
    classData: {},
    sharedData: {},

    // ---- INIT ----
    async init() {
        await this.loadI18n();
        this.setupLangSwitch();
        this.setupMobileNav();
        window.addEventListener('hashchange', () => this.route());
        if (!location.hash) location.hash = '#/';
        this.route();
    },

    // ---- I18N ----
    async loadI18n() {
        const [ru, en] = await Promise.all([
            fetch('i18n/ru.json').then(r => r.json()),
            fetch('i18n/en.json').then(r => r.json())
        ]);
        this.i18n = { ru, en };
        this.updateUI();
    },

    t(key) {
        return this.i18n[this.lang]?.[key] || this.i18n['en']?.[key] || key;
    },

    l(obj) {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        return obj[this.lang] || obj['en'] || '';
    },

    setLang(lang) {
        this.lang = lang;
        localStorage.setItem('rhrg-lang', lang);
        document.documentElement.lang = lang;
        this.updateUI();
        this.route();
    },

    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = this.t(el.dataset.i18n);
        });
        const langBtn = document.getElementById('lang-btn');
        if (langBtn) langBtn.textContent = this.t('lang_switch');
    },

    // ---- ROUTER ----
    async route() {
        const hash = location.hash.slice(1) || '/';
        const parts = hash.split('/').filter(Boolean);
        const app = document.getElementById('app');

        document.querySelectorAll('.main-nav a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === '#/') a.classList.toggle('active', hash === '/');
            else a.classList.toggle('active', hash.startsWith(href?.slice(1) || '---'));
        });

        try {
            if (parts.length === 0 || hash === '/') {
                await this.renderHome(app);
            } else if (parts[0] === 'class' && parts[1]) {
                await this.renderClass(app, parts[1], parts[2] || 'overview');
            } else if (parts[0] === 'missions') {
                await this.renderMissions(app);
            } else if (parts[0] === 'calculator') {
                await this.renderCalculator(app);
            } else if (parts[0] === 'units') {
                await this.renderUnits(app);
            } else if (parts[0] === 'generic-talents') {
                await this.renderGenericTalents(app);
            } else {
                app.innerHTML = '<div class="container" style="padding:60px 20px;text-align:center"><h2>404</h2><p>Page not found</p></div>';
            }
        } catch (e) {
            console.error('Route error:', e);
            app.innerHTML = `<div class="container" style="padding:60px 20px"><h2>Error</h2><p>${e.message}</p></div>`;
        }
        window.scrollTo(0, 0);
    },

    // ---- DATA LOADING ----
    async loadClassData(id) {
        if (this.classData[id]) return this.classData[id];
        const r = await fetch(`data/classes/${id}.json`);
        if (!r.ok) throw new Error(`Class "${id}" not found`);
        this.classData[id] = await r.json();
        return this.classData[id];
    },

    async loadShared(name) {
        if (this.sharedData[name]) return this.sharedData[name];
        const r = await fetch(`data/shared/${name}.json`);
        if (!r.ok) throw new Error(`Data "${name}" not found`);
        this.sharedData[name] = await r.json();
        return this.sharedData[name];
    },

    // ---- RENDER: HOME ----
    async renderHome(app) {
        const classes = await this.loadShared('class-index');
        app.innerHTML = `
        <div class="page-hero">
            <div class="hero-badge">Raynor Has Gone Rogue (Like)</div>
            <h1>${this.t('home_title')}</h1>
            <p class="subtitle">${this.t('home_subtitle')}</p>
            <p style="margin-top:10px;font-size:0.85rem;color:var(--text-dim)">${this.t('home_credit')}</p>
        </div>
        <div class="container">
            <div class="section">
                <h2 class="section-title"><span class="icon">&#9876;</span> ${this.t('home_pick_class')}</h2>
                <div class="class-grid">
                    ${classes.map(c => `
                    <a href="#/class/${c.id}" class="class-card" style="--class-color:${c.color}">
                        <div class="class-card-icon">${c.icon}</div>
                        <div class="class-card-body">
                            <h3>${c.name}</h3>
                            <p class="class-card-unlock">${this.t('unlock')}: ${this.l(c.unlock) || this.t('unlock_none')}</p>
                            <p class="class-card-desc">${this.l(c.summary)}</p>
                        </div>
                    </a>`).join('')}
                </div>
            </div>
        </div>`;
    },

    // ---- RENDER: CLASS ----
    async renderClass(app, classId, subpage) {
        const data = await this.loadClassData(classId);
        const subNav = `
        <div class="class-subnav" style="--class-color:${data.color}">
            <div class="container">
                <div class="class-subnav-inner">
                    <div class="class-subnav-title"><span class="class-icon-sm">${data.icon}</span> ${data.name}</div>
                    <nav class="class-subnav-links">
                        <a href="#/class/${classId}" class="${subpage==='overview'?'active':''}">${this.t('class_overview')}</a>
                        <a href="#/class/${classId}/talents" class="${subpage==='talents'?'active':''}">${this.t('class_talents')}</a>
                        <a href="#/class/${classId}/builds" class="${subpage==='builds'?'active':''}">${this.t('class_builds')}</a>
                        <a href="#/class/${classId}/multiclass" class="${subpage==='multiclass'?'active':''}">${this.t('class_multiclass')}</a>
                    </nav>
                </div>
            </div>
        </div>`;

        let content = '';
        switch (subpage) {
            case 'talents': content = this.renderClassTalents(data); break;
            case 'builds': content = this.renderClassBuilds(data); break;
            case 'multiclass': content = this.renderClassMulticlass(data); break;
            default: content = this.renderClassOverview(data);
        }

        app.innerHTML = subNav + '<div class="container">' + content + '</div>';

        if (subpage === 'talents') {
            this.initFilters('.filter-bar', '.talent-card', 'data-rarity');
            this.initSearch('#talent-search', '.talent-card', '.talent-name');
        }
    },

    renderClassOverview(data) {
        const stats = (data.stats||[]).map(s => `<div class="stat-box"><div class="stat-value">${s.value}</div><div class="stat-label">${this.l(s.label)}</div></div>`).join('');
        const strengths = (data.strengths||[]).map(s => `<li>${this.l(s)}</li>`).join('');
        const weaknesses = (data.weaknesses||[]).map(w => `<li>${this.l(w)}</li>`).join('');
        const core = data.talents?.find(t => t.rarity === 'core');

        return `
        <div class="page-hero" style="padding-top:30px">
            <h1 style="background:linear-gradient(135deg,${data.color},var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${data.name}</h1>
            <p class="subtitle">${this.l(data.subtitle)}</p>
        </div>
        ${stats ? `<div class="stat-grid">${stats}</div>` : ''}
        <div class="card"><h3>${this.t('class_overview')}</h3><p>${this.l(data.summary)}</p></div>
        ${core ? `
        <div class="section"><h3 class="section-title"><span class="icon">&#11088;</span> ${this.t('core_talent')}</h3>
            <div class="talent-card rarity-core">
                <div class="talent-header"><span class="talent-name">${core.name}</span><span class="badge badge-core">CORE</span></div>
                <div class="talent-desc">${this.l(core.desc)}</div>
                ${core.analysis ? `<div class="talent-analysis"><strong>${this.t('talent_analysis')}:</strong> ${this.l(core.analysis)}</div>` : ''}
            </div>
        </div>` : ''}
        <div class="grid-2">
            <div class="card"><h3>${this.t('strengths')}</h3><ul class="pros-list">${strengths}</ul></div>
            <div class="card"><h3>${this.t('weaknesses')}</h3><ul class="cons-list">${weaknesses}</ul></div>
        </div>`;
    },

    renderClassTalents(data) {
        const order = ['core','common','common-infinite','uncommon','rare','epic','curse','plague'];
        const sorted = (data.talents||[]).sort((a,b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
        const filters = ['all','core','common','uncommon','rare','epic','curse','plague']
            .map(f => `<button class="filter-btn ${f==='all'?'active':''}" data-filter="${f}">${f==='all'? this.t('talent_filter_all') : this.t('talent_'+f)||f}</button>`).join('');

        return `
        <div class="section">
            <h2 class="section-title"><span class="icon">&#11088;</span> ${this.t('class_talents')}</h2>
            <div class="search-wrap"><input type="text" class="search-input" id="talent-search" placeholder="${this.t('talent_search_placeholder')}"></div>
            <div class="filter-bar">${filters}</div>
            <div class="talent-list">${sorted.map(t => this.renderTalentCard(t)).join('')}</div>
        </div>`;
    },

    renderTalentCard(t) {
        const rc = t.rarity === 'common-infinite' ? 'rarity-infinite' : `rarity-${t.rarity}`;
        const dr = t.rarity === 'common-infinite' ? 'common' : t.rarity;
        const bc = t.rarity === 'common-infinite' ? 'badge-common' : `badge-${t.rarity}`;
        const rl = t.rarity === 'common-infinite' ? this.t('talent_common')+' ('+this.t('talent_infinite')+')' : (this.t('talent_'+t.rarity)||t.rarity);

        let badges = `<span class="badge ${bc}">${rl}</span>`;
        if (t.stackable) badges += `<span class="badge badge-stackable">${this.t('talent_stackable')}${t.maxStacks?' (max '+t.maxStacks+')':''}</span>`;
        if (t.tier) badges += `<span class="badge badge-tier-${t.tier.toLowerCase()}">${t.tier}</span>`;

        return `
        <div class="talent-card ${rc}" data-rarity="${dr}">
            <div class="talent-header"><span class="talent-name">${t.name}</span><div class="talent-badges">${badges}</div></div>
            <div class="talent-desc">${this.l(t.desc)}</div>
            ${t.analysis ? `<div class="talent-analysis"><strong>${this.t('talent_analysis')}:</strong> ${this.l(t.analysis)}</div>` : ''}
        </div>`;
    },

    renderClassBuilds(data) {
        const builds = data.builds || [];
        if (!builds.length) return `<div class="section"><div class="card"><p>${this.lang==='ru'?'Гайды по билдам скоро появятся.':'Build guides coming soon.'}</p></div></div>`;

        return `<div class="section">
            <h2 class="section-title"><span class="icon">&#128736;</span> ${this.t('builds_title')}</h2>
            <p class="section-desc">${this.t('builds_subtitle')}</p>
            ${builds.map((b,i) => {
                const tags = (b.tags||[]).map(t => `<span class="tag tag-${t.type||'generic'}">${t.name}</span>`).join('');
                const phases = (b.phases||[]).map(p => `
                    <div class="timeline-item"><div class="timeline-line"><div class="timeline-dot"></div><div class="timeline-connector"></div></div>
                    <div class="timeline-content"><div class="timeline-title">${this.l(p.title)}</div><div class="timeline-text">${this.l(p.text)}</div></div></div>`).join('');
                return `
                <div class="strategy-card"><div class="strat-badge">BUILD ${i+1}</div>
                    <h3>${this.l(b.name)}</h3><div class="strat-subtitle">${this.l(b.subtitle)}</div>
                    <p>${this.l(b.desc)}</p>
                    ${tags ? `<div class="strat-tags">${tags}</div>` : ''}
                    ${phases ? `<div class="build-timeline">${phases}</div>` : ''}
                    ${b.tips ? `<div class="tips-box"><h4>${this.t('build_when_to_use')}</h4><ul>${b.tips.map(t=>`<li>${this.l(t)}</li>`).join('')}</ul></div>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    },

    renderClassMulticlass(data) {
        const epics = data.multiclass_epics || [];
        return `<div class="section">
            <h2 class="section-title"><span class="icon">&#128279;</span> ${this.t('multiclass_title')}</h2>
            <p class="section-desc">${this.t('multiclass_subtitle')}</p>
            ${data.multiclass_intro ? `<div class="card"><h3>${this.t('multiclass_how')}</h3><p>${this.l(data.multiclass_intro)}</p></div>` : ''}
            ${epics.length ? `<h3 style="margin:24px 0 12px;color:var(--text-bright)">${this.t('multiclass_epic_talents')}</h3>
            ${epics.map(e => `
                <div class="talent-card rarity-multiclass">
                    <div class="talent-header"><span class="talent-name">${e.name}</span>
                    <div class="talent-badges"><span class="badge badge-multiclass">${e.classes.join(' + ')}</span>${e.tier?`<span class="badge badge-tier-${e.tier.toLowerCase()}">${e.tier}</span>`:''}</div></div>
                    <div class="talent-desc">${this.l(e.desc)}</div>
                    ${e.analysis ? `<div class="talent-analysis"><strong>${this.t('talent_analysis')}:</strong> ${this.l(e.analysis)}</div>` : ''}
                </div>`).join('')}` : ''}
        </div>`;
    },

    // ---- RENDER: MISSIONS ----
    async renderMissions(app) {
        const missions = await this.loadShared('missions');
        const chains = [...new Set(missions.map(m => m.chain))];
        const filters = ['all',...chains].map(c => `<button class="filter-btn ${c==='all'?'active':''}" data-filter="${c}">${c==='all'?this.t('missions_filter_all'):c}</button>`).join('');

        app.innerHTML = `
        <div class="page-hero"><h1>${this.t('missions_title')}</h1><p class="subtitle">${this.t('missions_subtitle')}</p></div>
        <div class="container">
            <div class="filter-bar">${filters}</div>
            ${missions.map(m => {
                const vc = {take:'challenge-take',skip:'challenge-skip',special:'challenge-take',depends:'challenge-depends'}[m.verdict]||'challenge-depends';
                return `<div class="mission-card" data-chain="${m.chain}">
                    <span class="challenge-tag ${vc}">${this.t('missions_verdict_'+m.verdict)}</span>
                    <div class="mission-name">${m.name}</div><div class="mission-location">${m.location}</div>
                    <p><strong>${m.challenge}</strong> — ${this.l(m.challengeDesc)}</p>
                </div>`;
            }).join('')}
        </div>`;
        this.initFilters('.filter-bar', '.mission-card', 'data-chain');
    },

    // ---- RENDER: CALCULATOR ----
    async renderCalculator(app) {
        app.innerHTML = `
        <div class="page-hero"><h1>${this.t('calculator_title')}</h1><p class="subtitle">${this.t('calculator_subtitle')}</p></div>
        <div class="container">
            <div class="section">
                <h2 class="section-title"><span class="icon">&#128202;</span> Deadman's Hardware Scaling</h2>
                <div class="grid-2"><div>
                    <div class="calc-group"><label>Deadman's Hardware</label><div class="calc-value" id="dh-val">20</div><input type="range" id="dh-stacks" min="0" max="100" value="20"></div>
                    <div class="calc-group"><label>Use More Gun</label><div class="calc-value" id="umg-val">10</div><input type="range" id="umg-stacks" min="0" max="100" value="10"></div>
                    <div class="calc-group"><label>Medical Breakthrough</label><div class="calc-value" id="mb-val">10</div><input type="range" id="mb-stacks" min="0" max="100" value="10"></div>
                    <div class="calc-group"><label>Super Heroic (Royal Mercs)</label><div class="calc-value" id="sh-val">0</div><input type="range" id="sh-stacks" min="0" max="100" value="0"></div>
                </div><div>
                    <div class="calc-result"><div class="big-number" id="merc-dmg">—</div><div class="result-label">${this.t('calc_damage_mult')} (Merc)</div></div>
                    <div class="calc-result"><div class="big-number" id="merc-hp">—</div><div class="result-label">${this.t('calc_hp_mult')} (Merc)</div></div>
                    <div class="calc-result"><div class="big-number" id="reg-dmg">—</div><div class="result-label">${this.t('calc_damage_mult')} (Regular)</div></div>
                    <p id="dh-milestone" style="text-align:center;color:var(--accent);margin-top:12px"></p>
                </div></div>
            </div>
            <div class="section">
                <h2 class="section-title"><span class="icon">&#9201;</span> ${this.t('calc_cooldown')}</h2>
                <div class="grid-2"><div>
                    <div class="calc-group"><label>Base Cooldown</label><div class="calc-value" id="cd-base-val">120s</div><input type="range" id="cd-base" min="30" max="300" value="120" step="10"></div>
                    <div class="calc-group"><label>Loyalty Bonus</label><div class="calc-value" id="lb-val">0</div><input type="range" id="lb-stacks" min="0" max="3" value="0"></div>
                </div><div>
                    <div class="calc-result"><div class="big-number" id="cd-effective">—</div><div class="result-label">${this.t('calc_cooldown')}</div></div>
                    <div class="calc-result"><div class="big-number" id="cd-reduction">—</div><div class="result-label">${this.t('calc_reduction')}</div></div>
                    <div class="calc-result"><div class="big-number" id="cd-per10">—</div><div class="result-label">${this.t('calc_per_10min')}</div></div>
                </div></div>
            </div>
        </div>`;
        // Init calculators
        const bind = (id, cb) => { const el = document.getElementById(id); el?.addEventListener('input', cb); };
        const updateDH = () => {
            const d=+document.getElementById('dh-stacks').value, u=+document.getElementById('umg-stacks').value, m=+document.getElementById('mb-stacks').value, s=+document.getElementById('sh-stacks').value;
            document.getElementById('dh-val').textContent=d; document.getElementById('umg-val').textContent=u;
            document.getElementById('mb-val').textContent=m; document.getElementById('sh-val').textContent=s;
            const md=(1+.3+d*.15)*(1+u*.06)*(1+s*.15), mh=(1+.3+d*.15)*(1+m*.08)*(1+s*.35), rd=(1+u*.06)*1.4;
            document.getElementById('merc-dmg').textContent='x'+md.toFixed(2);
            document.getElementById('merc-hp').textContent='x'+mh.toFixed(2);
            document.getElementById('reg-dmg').textContent='x'+rd.toFixed(2);
            document.getElementById('dh-milestone').textContent=md>15?'GODLIKE':md>8?'Devastating':md>4?'Very Strong':md>2?'Good':'Early game';
        };
        ['dh-stacks','umg-stacks','mb-stacks','sh-stacks'].forEach(id=>bind(id,updateDH)); updateDH();
        const updateCD = () => {
            const b=+document.getElementById('cd-base').value, lb=+document.getElementById('lb-stacks').value;
            document.getElementById('cd-base-val').textContent=b+'s'; document.getElementById('lb-val').textContent=lb;
            let e=b*.5; for(let i=0;i<lb;i++)e*=.7;
            document.getElementById('cd-effective').textContent=e.toFixed(1)+'s';
            document.getElementById('cd-reduction').textContent=((1-e/b)*100).toFixed(1)+'%';
            document.getElementById('cd-per10').textContent=Math.floor(600/e);
        };
        ['cd-base','lb-stacks'].forEach(id=>bind(id,updateCD)); updateCD();
    },

    // ---- RENDER: UNITS ----
    async renderUnits(app) {
        const units = await this.loadShared('units');
        app.innerHTML = `
        <div class="page-hero"><h1>${this.t('units_title')}</h1><p class="subtitle">${this.t('units_subtitle')}</p></div>
        <div class="container"><div style="overflow-x:auto">
            <table class="data-table"><thead><tr><th>Unit</th><th>${this.t('units_merc_name')}</th><th>${this.t('units_type')}</th><th>Merc?</th></tr></thead>
            <tbody>${units.map(u=>`<tr><td><strong>${u.name}</strong></td><td>${u.merc||'—'}</td><td>${this.l(u.type)}</td>
            <td>${u.merc?'<span style="color:var(--uncommon)">&#10003;</span>':'<span style="color:var(--text-dim)">&#10007;</span>'}</td></tr>`).join('')}</tbody></table>
        </div></div>`;
    },

    // ---- RENDER: GENERIC TALENTS ----
    async renderGenericTalents(app) {
        const talents = await this.loadShared('generic-talents');
        app.innerHTML = `
        <div class="page-hero"><h1>${this.t('nav_talents')}</h1></div>
        <div class="container"><div class="talent-list">${talents.map(t=>this.renderTalentCard(t)).join('')}</div></div>`;
    },

    // ---- HELPERS ----
    setupLangSwitch() {
        document.getElementById('lang-btn')?.addEventListener('click', () => this.setLang(this.lang==='ru'?'en':'ru'));
    },

    setupMobileNav() {
        const toggle = document.querySelector('.nav-toggle');
        const nav = document.querySelector('.main-nav');
        if (toggle && nav) {
            toggle.addEventListener('click', () => nav.classList.toggle('open'));
            nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
        }
    },

    initFilters(cSel, iSel, attr) {
        const c = document.querySelector(cSel); if (!c) return;
        const btns = c.querySelectorAll('.filter-btn'), items = document.querySelectorAll(iSel);
        btns.forEach(btn => btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
            const v = btn.dataset.filter;
            items.forEach(i => i.style.display = (v==='all'||i.getAttribute(attr)===v)?'':'none');
        }));
    },

    initSearch(inputSel, itemSel, textSel) {
        const input = document.querySelector(inputSel); if (!input) return;
        const items = document.querySelectorAll(itemSel);
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            items.forEach(i => { i.style.display = (i.querySelector(textSel)?.textContent||i.textContent).toLowerCase().includes(q)?'':'none'; });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
