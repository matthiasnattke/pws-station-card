/* Weather Station Card – instruments and history charts for a personal weather station (Ecowitt, Netatmo, …)
   Variants: header, range, dial, thermo, rain, compass, rose, chart
   Also defines zambretti-forecast-card: a short-term forecast from local pressure and its 3-hour trend.
   MIT License – see LICENSE */
const WSC_VERSION = '1.1.1';
const pol = (cx, cy, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
const f = (n) => Number(n).toFixed(2);
const arc = (cx, cy, r, a0, a1) => { const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1); return `M${f(x0)},${f(y0)}A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)},${f(y1)}`; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Everything that comes from the card config or from entity attributes is escaped or validated before it reaches markup.
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const num = (v, d) => { const n = Number(v); return v == null || v === '' || !isFinite(n) ? d : n; };
const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%+-]+\)|var\(--[\w-]+\)|[a-z]{3,20})$/i;
const col = (v, d) => (typeof v === 'string' && COLOR_RE.test(v.trim()) ? v.trim() : d);
const safePath = (p) => (typeof p === 'string' && /^\/(?!\/)/.test(p) ? p : '');
const WSC_LANG = (h) => { const l = ((h && ((h.locale && h.locale.language) || h.language)) || 'en').slice(0, 2); return l === 'de' ? 'de' : 'en'; };
const WSC_I18N = {
  en: {
    dirs: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
    comp: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    range: { day: 'Day', week: 'Week', month: 'Month', year: 'Year' },
    clock: '', now: 'Live · just updated', secs: (s) => `Live · updated ${s} s ago`, mins: (live, m) => `${live ? 'Live' : 'No new data'} · updated ${m} min ago`,
    feels: (v) => `feels like ${v}°`, hum: (v) => `${v} % humidity`, wind: (v, d) => `💨 ${v} km/h${d ? ' from ' + d : ''}`, rain: (v) => `☔ ${v} mm today`, press: (v) => `⏲ ${v} hPa`,
    pond: { full: '🐟 Pond filled', drain: '🎣 Pond is being drained', fill: (p) => `💧 Pond is filling · ${p} %`, empty: (m) => `🌾 Pond drained · filling from ${m}` },
    stat: { max: 'Max', min: 'Min', mean: 'Mean', sum: 'Total', dmax: 'Max / day' }, rows: ['Today', 'Month', 'Year'], peak: 'Highest today', calmp: (p) => `${p} % calm`,
    loading: 'Loading …', nodata: 'No data in this period', calm: 'Calm', calmAll: 'Calm during the whole period',
    strongest: (d, v, u) => `Strongest wind from ${d} (Ø ${v} ${u})`, main: (d, p) => `Main direction ${d} (${p} %)`,
    hours: ['24 h', '3 days', '7 days'], notenough: 'Not enough data for a chart',
    sum: 'Total', avg: 'Average', min: 'Min', max: 'Max',
  },
  de: {
    dirs: ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
    comp: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'],
    range: { day: 'Tag', week: 'Woche', month: 'Monat', year: 'Jahr' },
    clock: ' Uhr', now: 'Live · gerade aktualisiert', secs: (s) => `Live · aktualisiert vor ${s} s`, mins: (live, m) => `${live ? 'Live' : 'Keine neuen Daten'} · aktualisiert vor ${m} min`,
    feels: (v) => `gefühlt ${v}°`, hum: (v) => `${v} % Feuchte`, wind: (v, d) => `💨 ${v} km/h${d ? ' aus ' + d : ''}`, rain: (v) => `☔ ${v} mm heute`, press: (v) => `⏲ ${v} hPa`,
    pond: { full: '🐟 Teich gefüllt', drain: '🎣 Abfischen · Teich wird abgelassen', fill: (p) => `💧 Teich wird gefüllt · ${p} %`, empty: (m) => `🌾 Teich abgelassen · Füllung ab ${m}` },
    stat: { max: 'Max', min: 'Min', mean: 'Mittel', sum: 'Summe', dmax: 'Max / Tag' }, rows: ['Heute', 'Monat', 'Jahr'], peak: 'Höchster Wert heute', calmp: (p) => `${p} % windstill`,
    loading: 'Lade …', nodata: 'Keine Daten im Zeitraum', calm: 'Windstill', calmAll: 'Windstill im gesamten Zeitraum',
    strongest: (d, v, u) => `Stärkster Wind aus ${d} (Ø ${v} ${u})`, main: (d, p) => `Hauptrichtung ${d} (${p} %)`,
    hours: ['24 h', '3 Tage', '7 Tage'], notenough: 'Nicht genügend Daten für die Grafik',
    sum: 'Summe', avg: 'Durchschn.', min: 'Min', max: 'Max',
  },
};
const VARIANTS = ['header', 'range', 'dial', 'thermo', 'rain', 'compass', 'rose', 'chart'];
const NOENTITY = ['header', 'range'];
const BLUES = ['#9bd8ff', '#4aa3e8', '#1f5fa8'];
const rid = () => Math.random().toString(36).slice(2, 9);
const RANGES = { day: { h: 24, p: '5minute', bar: 'hour' }, week: { h: 168, p: 'hour', bar: 'day' }, month: { h: 720, p: 'day', bar: 'day' }, year: { h: 8760, p: 'day', bar: 'month' } };
const getRange = () => { try { const r = localStorage.getItem('weather-station-card-range'); return RANGES[r] ? r : 'day'; } catch (e) { return 'day'; } };
// Colours follow the Home Assistant theme; `theme: dark|light` forces a fixed palette.
const VARS = 'ha-card{--wb:var(--ha-card-background,var(--card-background-color,#fff));--wt:var(--primary-text-color,#212121);--w2:var(--secondary-text-color,#727272);--wg:var(--divider-color,rgba(0,0,0,.12));--wh:var(--secondary-background-color,#eceff1);--wa:var(--primary-color,#03a9f4)}'
  + 'ha-card.dk{--wb:#1b1f24;--wt:#eef1f4;--w2:#9aa3ab;--wg:#343a41;--wh:#2a3037;background:#1b1f24}ha-card.lt{--wb:#fff;--wt:#22272c;--w2:#6b737b;--wg:#e3e6e9;--wh:#eef0f2;background:#fff}';
const STAT_COL = { max: '#e5533d', min: '#4a90e2', mean: '#f2b632', sum: '#3bb4d6', dmax: '#1f7fa6' };
const CSS = `
:host{display:block;height:100%}
ha-card{display:block;color:var(--wt);padding:16px;box-sizing:border-box;height:100%;cursor:pointer;overflow:hidden}
ha-card.header{cursor:default;padding:0;position:relative;min-height:176px;color:#fff;background:#14181c;font-family:inherit}
.sky{position:absolute;top:0;left:0;width:100%;height:100%;max-width:none}
.hx{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 20px 0;text-shadow:0 1px 5px rgba(0,0,0,.5)}
.hr{text-align:right}.ht{font-size:56px;font-weight:200;line-height:1;white-space:nowrap}.hf{font-size:13px;margin-top:4px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#43d17a;animation:lv 1.8s infinite}.dot.off{background:#9aa3ab;animation:none}
@keyframes lv{0%{box-shadow:0 0 0 0 rgba(67,209,122,.75)}100%{box-shadow:0 0 0 9px rgba(67,209,122,0)}}
.ch{position:relative;display:flex;flex-wrap:wrap;gap:6px;padding:26px 20px 14px}
.ch span{font-size:12.5px;background:rgba(0,0,0,.36);border-radius:99px;padding:4px 10px;white-space:nowrap}
.cl{animation:cl 90s linear infinite}@keyframes cl{from{transform:translateX(-170px)}to{transform:translateX(640px)}}
.tw{animation:tw 3s ease-in-out infinite}@keyframes tw{50%{opacity:.3}}
.rn{animation:rn .8s linear infinite}@keyframes rn{from{transform:translate(0,-20px)}to{transform:translate(-40px,150px)}}
.wv{animation:wv 6s ease-in-out infinite alternate}@keyframes wv{from{transform:translateX(-10px)}to{transform:translateX(10px)}}
.rd{animation:rd 5s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}@keyframes rd{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}
.fj{animation:fj 17s ease-in-out infinite;transform-box:fill-box;transform-origin:center;opacity:0}@keyframes fj{0%,86%{opacity:0;transform:translate(0,22px) rotate(-50deg)}88%{opacity:1}93%{transform:translate(18px,-18px) rotate(0deg);opacity:1}98%{opacity:1}100%{transform:translate(36px,22px) rotate(55deg);opacity:0}}
.rw{animation:rw 3.5s linear infinite}@keyframes rw{from{transform:translateX(0)}to{transform:translateX(-50px)}}
ha-card.range{cursor:default;padding:8px;display:flex;justify-content:center;align-items:center}
.hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px}
.t{font-size:16px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.u{font-size:12px;color:var(--w2);white-space:nowrap}
.g{display:flex;justify-content:center;align-items:center;min-height:200px;flex:1}
ha-card.dial,ha-card.thermo,ha-card.rain,ha-card.compass,ha-card.rose{display:flex;flex-direction:column;min-height:372px}
svg{width:100%;max-width:240px;height:auto;display:block;overflow:visible}
svg.c{max-width:none}
.st{display:grid;grid-template-columns:auto repeat(3,1fr);gap:5px 10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--wg);font-size:13px;font-variant-numeric:tabular-nums}
.st .h{font-size:11px;color:var(--w2);text-transform:uppercase;letter-spacing:.06em;text-align:right}
.st .l{color:var(--w2);display:flex;align-items:center;gap:7px;white-space:nowrap}
.st .l i,.k i{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}
.st .v{text-align:right;font-weight:500;white-space:nowrap}
.s{text-align:center;font-size:13px;color:var(--w2);margin-top:8px}
.bw{display:flex;justify-content:center;margin-top:12px}
.b{display:inline-flex;flex-wrap:wrap;gap:2px;padding:3px;border-radius:10px;background:var(--wh)}
button,a.l{font:inherit;font-size:13px;border:none;border-radius:8px;padding:5px 12px;background:transparent;color:var(--w2);cursor:pointer;text-decoration:none;white-space:nowrap}
button:hover,a.l:hover{color:var(--wt)}
button.on,a.l.on{background:var(--wb);color:var(--wt);box-shadow:0 1px 3px rgba(0,0,0,.2);font-weight:500}
.hn{font-size:30px;font-weight:300;line-height:1.15}
.hl{font-size:15px;margin-top:3px}
.hu{font-size:12px;margin-top:8px;display:flex;align-items:center;gap:7px}
.nav{position:relative;display:inline-flex;flex-wrap:wrap;gap:2px;margin:0 20px 12px;padding:3px;border-radius:10px;background:rgba(0,0,0,.32);backdrop-filter:blur(4px)}
.nav a.l{color:rgba(255,255,255,.85)}.nav a.l:hover{color:#fff}.nav a.l.on{background:rgba(255,255,255,.92);color:#14181c;text-shadow:none}
.k{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;color:var(--w2);margin:0 0 6px;min-height:18px}
.k span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.k b{color:var(--wt);font-weight:500}
`;

class WeatherStationCard extends HTMLElement {
  static getStubConfig() { return { variant: 'dial', entity: '' }; }
  setConfig(c) {
    if (!c || !VARIANTS.includes(c.variant)) throw new Error('variant must be one of ' + VARIANTS.join(', '));
    if (!NOENTITY.includes(c.variant) && !c.entity) throw new Error('entity is required');
    if (c.variant === 'rain' && !c.stat_entity) throw new Error('stat_entity is required for the rain variant');
    this._c = c; this._stats = null; this._bins = null; this._chart = null; this._sig = null; this._last = 0; this._roseH = c.hours || 24;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
  }
  get _t() { return WSC_I18N[WSC_LANG(this._hass)]; }
  get _loc() { return (this._hass && this._hass.locale && this._hass.locale.language) || (this._hass && this._hass.language) || 'en'; }

  set hass(h) {
    this._hass = h;
    if (!this._c) return;
    const v = this._c.variant, now = Date.now();
    if (!['header', 'range', 'compass'].includes(v) && now - this._last > 300000) { this._last = now; this._load(); }
    const st = this._c.entity && h.states[this._c.entity];
    const sig = v === 'chart' || v === 'range' ? v + WSC_LANG(h) : v === 'header' ? (() => { const P = this._pond(); return [this._phase(), this._raining(), this._frost(), P.st, Math.round(P.L * 25), new Date().getMonth(), WSC_LANG(h)].join('|'); })() : st ? st.state + WSC_LANG(h) : 'x';
    if (sig !== this._sig) { this._sig = sig; this._render(); }
    if (v === 'header') this._hdrUpd();
  }

  connectedCallback() {
    if (!this._c) return;
    if (this._c.variant === 'header') this._tm = setInterval(() => this._hdrUpd(), 5000);
    if (this._c.variant === 'chart' || this._c.variant === 'range') {
      this._onRange = () => { if (this._c.variant === 'chart') { this._chart = null; this._last = Date.now(); this._load(); } this._render(); };
      window.addEventListener('weather-station-card-range', this._onRange);
    }
  }
  disconnectedCallback() { clearInterval(this._tm); if (this._onRange) window.removeEventListener('weather-station-card-range', this._onRange); }
  getCardSize() { return NOENTITY.includes(this._c.variant) ? 2 : 6; }
  getGridOptions() {
    const v = this._c.variant;
    if (NOENTITY.includes(v)) return { columns: 'full', rows: 'auto' };
    if (v === 'chart') return { columns: 18, rows: 'auto', min_columns: 12 };
    return { columns: 12, rows: 'auto', min_columns: 6 };
  }

  async _load() {
    const c = this._c, h = this._hass;
    try {
      if (c.variant === 'rose') await this._loadRose();
      else if (c.variant === 'chart') await this._loadChart();
      else if (c.variant === 'rain') {
        const id = c.stat_entity, now = new Date();
        const tot = await Promise.all(['month', 'year'].map((p) => h.callWS({ type: 'recorder/statistic_during_period', statistic_id: id, calendar: { period: p }, types: ['change'] })));
        const y0 = new Date(now.getFullYear(), 0, 1), m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const d = await h.callWS({ type: 'recorder/statistics_during_period', start_time: y0.toISOString(), statistic_ids: [id], period: 'day', types: ['change'] });
        const rows = (d && d[id]) || [];
        const mx = (a) => (a.length ? Math.max(...a.map((x) => x.change || 0)) : 0);
        this._stats = { month: tot[0].change, year: tot[1].change, maxMonth: mx(rows.filter((x) => x.start >= m0)), maxYear: mx(rows) };
      } else {
        const id = c.stat_entity || c.entity;
        this._stats = await Promise.all(['day', 'month', 'year'].map((p) => h.callWS({ type: 'recorder/statistic_during_period', statistic_id: id, calendar: { period: p }, types: ['max', 'min', 'mean'] })));
      }
    } catch (e) { console.warn('weather-station-card', c.entity, e); }
    this._render();
  }

  async _loadRose() {
    const c = this._c, hrs = this._roseH, ids = [c.entity].concat(c.speed_entity ? [c.speed_entity] : []);
    const d = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: new Date(Date.now() - hrs * 3600e3).toISOString(), statistic_ids: ids, period: '5minute', types: ['mean'] });
    const dir = (d && d[c.entity]) || [], sp = new Map(((d && d[c.speed_entity]) || []).map((x) => [x.start, x.mean]));
    const n = new Array(16).fill(0), sum = new Array(16).fill(0); let calm = 0, tot = 0;
    dir.forEach((x) => {
      if (x.mean == null) return;
      const s = sp.get(x.start); tot++;
      if (c.speed_entity && (s == null || s < (c.calm != null ? c.calm : 0.5))) { calm++; return; }
      const i = Math.round(x.mean / 22.5) % 16; n[i]++; sum[i] += s || 0;
    });
    if (hrs === this._roseH) this._bins = { tot, calm: tot ? calm / tot : 0, share: n.map((x) => (tot ? x / tot : 0)), speed: n.map((x, i) => (x ? sum[i] / x : 0)) };
  }

  _series() {
    const c = this._c, T = this._t, DEF = ['#4a90e2', '#f2b632', '#e5533d', '#3bb4d6'];
    if (Array.isArray(c.series)) return c.series.map((x, i) => ({ stat: ['min', 'mean', 'max', 'change'].includes(x && x.stat) ? x.stat : 'mean', entity: x && typeof x.entity === 'string' ? x.entity : undefined, label: String((x && x.label) || ''), color: col(x && x.color, DEF[i % DEF.length]) }));
    if (c.mode === 'bar') return [{ stat: 'change', label: T.sum, color: '#3bb4d6' }];
    if (c.mode === 'dots') return [{ stat: 'mean', label: T.avg, color: '#4a90e2' }];
    const cc = Array.isArray(c.colors) ? c.colors : [], co = (i, d) => col(cc[i], d);
    return [{ stat: 'min', label: T.min, color: co(0, '#4a90e2') }, { stat: 'mean', label: T.avg, color: co(1, '#f2b632') }, { stat: 'max', label: T.max, color: co(2, '#e5533d') }];
  }

  async _loadChart() {
    const c = this._c, rk = getRange(), R = RANGES[rk], series = this._series();
    const ids = [...new Set(series.map((s) => s.entity || c.entity))], t0 = Date.now() - R.h * 3600e3;
    const d = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: new Date(t0).toISOString(), statistic_ids: ids, period: c.mode === 'bar' ? R.bar : R.p, types: c.mode === 'bar' ? ['change'] : ['min', 'mean', 'max'] });
    if (rk === getRange()) this._chart = { rk, d: d || {}, t0, t1: Date.now() };
  }

  _render() {
    if (!this._hass || !this._c || !this.shadowRoot) return;
    const c = this._c, st = c.entity ? this._hass.states[c.entity] : null, T = this._t;
    const unit = esc(c.unit != null ? c.unit : (st && st.attributes.unit_of_measurement) || ''); // escaped once, used as-is below
    const name = c.name || (st && st.attributes.friendly_name) || '';
    let body;
    if (c.variant === 'header') body = this._header();
    else if (c.variant === 'range') { const rk = getRange(); body = `<div class="b">${Object.keys(RANGES).map((k) => `<button data-r="${k}" class="${k === rk ? 'on' : ''}">${T.range[k]}</button>`).join('')}</div>`; }
    else if (c.variant === 'chart') body = `<div class="hd"><span class="t">${esc(name)}</span><span class="u">${unit}</span></div>${this._chartBody(unit)}`;
    else {
      const v = st ? parseFloat(st.state) : NaN, dec = clamp(Math.round(num(c.decimals, 1)), 0, 6), val = isNaN(v) ? '–' : v.toLocaleString(this._loc, { minimumFractionDigits: dec, maximumFractionDigits: dec });
      const showU = unit && !['compass', 'rose'].includes(c.variant);
      body = `<div class="hd"><span class="t">${esc(name)}</span>${showU ? `<span class="u">${unit}</span>` : ''}</div><div class="g">${this['_' + c.variant](v, val, unit)}</div>${this._table(v, unit, dec)}`;
    }
    const th = c.variant === 'header' ? '' : c.theme === 'dark' ? ' dk' : c.theme === 'light' ? ' lt' : '';
    this.shadowRoot.innerHTML = `<style>${VARS}${CSS}</style><ha-card class="${c.variant}${th}">${body}</ha-card>`;
    if (c.variant === 'header') this._hdrUpd();
    const card = this.shadowRoot.querySelector('ha-card');
    if (!NOENTITY.includes(c.variant)) card.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: c.entity }, bubbles: true, composed: true })));
    this.shadowRoot.querySelectorAll('button[data-h]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); this._roseH = Number(b.dataset.h); this._bins = null; this._render();
      this._loadRose().then(() => this._render()).catch((e) => console.warn('weather-station-card', e));
    }));
    this.shadowRoot.querySelectorAll('button[data-r]').forEach((b) => b.addEventListener('click', () => {
      try { localStorage.setItem('weather-station-card-range', b.dataset.r); } catch (e) { /* no storage: selection is not kept */ }
      window.dispatchEvent(new Event('weather-station-card-range'));
    }));
    this.shadowRoot.querySelectorAll('a[data-p]').forEach((a) => a.addEventListener('click', (ev) => {
      ev.preventDefault(); history.pushState(null, '', a.dataset.p);
      window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
    }));
  }

  _phase() {
    const s = this._hass.states['sun.sun']; if (!s) return 'day';
    const el = Number(s.attributes && s.attributes.elevation);
    return !isNaN(el) ? (el < -6 ? 'night' : el < 6 ? 'dusk' : 'day') : s.state === 'below_horizon' ? 'night' : 'day';
  }
  _raining() { const s = this._c.rain_rate && this._hass.states[this._c.rain_rate]; return !!s && Number(s.state) > 0; }
  _frost() { const s = this._c.entity && this._hass.states[this._c.entity]; const v = s ? Number(s.state) : NaN; return !isNaN(v) && v <= 0; }
  // Optional seasonal pond (e.g. fish ponds that are drained every autumn). Without `pond:` the water is always full.
  _pond() {
    const cfg = this._c.pond; if (!cfg) return { st: 'none', L: 1, label: '' };
    const c = typeof cfg === 'object' ? cfg : {}, P = this._t.pond, now = new Date(), y = now.getFullYear();
    const D = (s, d) => { const m = String(s || d).split('-').map(Number); return new Date(y, m[0] - 1, m[1]).getTime(); };
    const fs = D(c.fill_start, '03-01'), fl = D(c.full, '04-15'), dr = D(c.drain, '10-25'), em = D(c.empty, '11-01'), t = now.getTime();
    if (t >= fl && t < dr) return { st: 'full', L: 1, label: P.full };
    if (t >= dr && t < em) { const q = (t - dr) / (em - dr); return { st: 'drain', L: 0.35 * (1 - q) + 0.04, label: P.drain }; }
    if (t >= fs && t < fl) { const L = 0.08 + 0.92 * (t - fs) / (fl - fs); return { st: 'fill', L, label: P.fill(Math.round(L * 100)) }; }
    return { st: 'empty', L: 0, label: P.empty(new Date(fs).toLocaleDateString(this._loc, { month: 'long' })) };
  }
  _hdrUpd() {
    const r = this.shadowRoot, h = this._hass, c = this._c, T = this._t, loc = this._loc; if (!r || !h) return;
    const set = (id, t) => { const e = r.getElementById(id); if (e && e.textContent !== t) e.textContent = t; };
    set('h-time', new Date().toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) + T.clock);
    if (!this._ids) { const pre = c.prefix || (c.entity.split('_')[0] + '_'); this._ids = Object.keys(h.states).filter((k) => k.startsWith(pre)); }
    let nw = 0; this._ids.forEach((k) => { const s = h.states[k]; if (s) { const t = new Date(s.last_reported || s.last_updated).getTime(); if (t > nw) nw = t; } });
    const sec = Math.max(0, Math.round((Date.now() - nw) / 1000)), live = nw > 0 && sec < 300;
    set('h-upd', !nw ? '' : sec < 10 ? T.now : sec < 90 ? T.secs(sec) : T.mins(live, Math.round(sec / 60)));
    const dot = r.getElementById('h-dot'); if (dot) dot.className = 'dot' + (live ? '' : ' off');
    const n = (e, d) => { const s = e && h.states[e]; const v = s ? Number(s.state) : NaN; return isNaN(v) ? null : v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d }); };
    const t = n(c.entity, 1); set('h-t', t == null ? '–' : t + '°');
    const parts = [], fe = n(c.feels, 1), hu = n(c.humidity, 0);
    if (fe != null) parts.push(T.feels(fe)); if (hu != null) parts.push(T.hum(hu)); set('h-f', parts.join(' · '));
    const ch = [], w = n(c.wind, 1), rt = n(c.rain_today, 1), p = n(c.pressure, 0);
    if (w != null) { const wd = c.wind_dir && h.states[c.wind_dir] ? Number(h.states[c.wind_dir].state) : NaN; ch.push(T.wind(w, isNaN(wd) ? '' : T.dirs[Math.round(wd / 22.5) % 16])); }
    if (rt != null) ch.push(T.rain(rt)); if (p != null) ch.push(T.press(p));
    const pl = this._pond().label; if (pl) ch.push(pl);
    const cc = r.getElementById('h-ch'); if (cc) { const html = ch.map((x) => `<span>${x}</span>`).join(''); if (cc.innerHTML !== html) cc.innerHTML = html; }
  }

  _header() {
    const c = this._c, ph = this._phase(), rain = this._raining();
    const sky = rain && ph === 'day' ? ['#56677a', '#a9b6c3'] : ph === 'day' ? ['#2f7fd6', '#bfe1fb'] : ph === 'dusk' ? ['#27345f', '#f2a65a'] : ['#060a1c', '#1d2c52'];
    const wat = ph === 'night' ? ['#1a2c56', '#080f22'] : ph === 'dusk' ? ['#c98a5e', '#343a66'] : rain ? ['#8496a6', '#4f5f70'] : ['#86c5f0', '#2a6fb0'];
    const shore = ph === 'night' ? '#0a142b' : ph === 'dusk' ? '#232c4d' : rain ? '#3f5a4a' : '#3f7d4e';
    let s = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient><linearGradient id="wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wat[0]}"/><stop offset="1" stop-color="${wat[1]}"/></linearGradient><radialGradient id="sg"><stop offset="0" stop-color="rgba(255,230,140,.75)"/><stop offset="1" stop-color="rgba(255,230,140,0)"/></radialGradient></defs><rect width="600" height="200" fill="url(#sk)"/>`;
    if (ph === 'night') { for (let k = 0; k < 46; k++) s += `<circle cx="${(k * 137 + 31) % 600}" cy="${(k * 53 + 7) % 118}" r="${(0.5 + (k % 4) * 0.28).toFixed(2)}" fill="#fff" class="tw" style="animation-delay:${((k * 0.37) % 3).toFixed(2)}s"/>`; s += `<circle cx="325" cy="80" r="46" fill="url(#sg)" opacity=".35"/><circle cx="325" cy="80" r="19" fill="#f4f1de"/><circle cx="334" cy="74" r="17" fill="${sky[0]}"/>`; }
    else if (ph === 'dusk') s += `<circle cx="325" cy="132" r="70" fill="url(#sg)"/><circle cx="325" cy="132" r="26" fill="#ffd9a0"/>`;
    else if (!rain) s += `<circle cx="325" cy="80" r="58" fill="url(#sg)" class="tw"/><circle cx="325" cy="80" r="24" fill="#ffe27a"/>`;
    const cf = ph === 'night' ? 'rgba(200,210,235,.16)' : ph === 'dusk' ? 'rgba(255,214,190,.55)' : rain ? 'rgba(225,231,236,.92)' : 'rgba(255,255,255,.9)';
    [[30, 62, 1, 95, 0], [70, 96, 0.7, 130, -50], [18, 40, 0.55, 160, -105], [48, 78, 0.85, 110, -70]].slice(0, rain ? 4 : 3).forEach((q) => { s += `<g class="cl" style="animation-duration:${q[3]}s;animation-delay:${q[4]}s"><g transform="translate(0,${q[0]}) scale(${q[2]})" fill="${cf}"><ellipse cx="60" cy="20" rx="46" ry="15"/><ellipse cx="42" cy="12" rx="22" ry="14"/><ellipse cx="74" cy="8" rx="26" ry="17"/><ellipse cx="100" cy="18" rx="24" ry="12"/></g></g>`; });
    const P = this._pond(), fr = this._frost(), mo = new Date().getMonth() + 1, sea = mo === 12 || mo <= 2 ? 'wi' : mo <= 5 ? 'sp' : mo <= 8 ? 'su' : 'au';
    const SH = { sp: ['#5f9a4e', '#86b85c'], su: ['#3f7d4e', '#356b42'], au: ['#7a7436', '#b0642b'], wi: ['#5e6552', '#787866'] }[sea];
    const sh2 = ph !== 'day' ? [shore, shore] : fr ? ['#9aa39a', '#c9d0d2'] : rain ? [SH[0], SH[0]] : SH;
    for (let k = 0; k < 13; k++) s += `<ellipse cx="${k * 50 + (k % 3) * 9}" cy="${141 - (k % 4)}" rx="${34 + (k % 3) * 8}" ry="${9 + (k % 5) * 2.2}" fill="${sh2[k % 3 === 1 ? 1 : 0]}"/>`;
    const wy = 200 - 60 * P.L, wet = P.L > 0.02;
    if (P.L < 1) {
      const md = ph === 'night' ? ['#1d1812', '#0d0b09'] : ph === 'dusk' ? ['#5a4038', '#2e2430'] : fr ? ['#b4ada2', '#8b8377'] : rain ? ['#6e5640', '#463527'] : ['#8d6c49', '#5a4330'];
      s += `<linearGradient id="md" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${md[0]}"/><stop offset="1" stop-color="${md[1]}"/></linearGradient><rect y="140" width="600" height="60" fill="url(#md)"/>`;
      for (let k = 0; k < 9; k++) s += `<path d="M${(k * 71 + 20) % 600},${146 + (k * 13) % 50}q22,-2 44,1t40,-1" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="1.2" stroke-linecap="round"/>`;
      if (!wet) [[120, 178, 40, 5], [265, 189, 56, 6], [420, 175, 46, 5], [540, 191, 32, 4]].forEach((q) => { s += `<ellipse cx="${q[0]}" cy="${q[1]}" rx="${q[2]}" ry="${q[3]}" fill="${fr ? '#e4eef3' : 'url(#wa)'}" opacity=".9"/>`; });
    }
    if (wet) {
      const hh = 200 - wy, sc = hh / 60, cy = f(wy + hh * 0.37);
      s += `<rect y="${f(wy)}" width="600" height="${f(hh)}" fill="url(#wa)"/>`;
      if (ph === 'night') s += `<ellipse cx="325" cy="${cy}" rx="5" ry="${f(15 * sc)}" fill="#f4f1de" opacity=".28" class="wv"/>`; else if (ph === 'dusk') s += `<ellipse cx="325" cy="${cy}" rx="22" ry="${f(20 * sc)}" fill="#ffd9a0" opacity=".4" class="wv"/>`; else if (!rain) s += `<ellipse cx="325" cy="${cy}" rx="9" ry="${f(17 * sc)}" fill="#fff3b8" opacity=".4" class="wv"/>`;
      if (hh > 16) for (let k = 0; k < 7; k++) s += `<path d="M${40 + k * 84 + (k % 2) * 30},${f(wy + 10 + (k * 17) % Math.max(4, Math.round(hh - 18)))}q14,-3 28,0t28,0" fill="none" stroke="rgba(255,255,255,${ph === 'night' ? 0.14 : 0.34})" stroke-width="1.3" stroke-linecap="round" class="wv" style="animation-delay:${-k * 0.9}s"/>`;
      if (P.st === 'drain') s += `<path d="M330,${f(wy - 1)}h64l-9,7h-46z" fill="#5b3a22"/><line x1="346" y1="${f(wy - 1)}" x2="354" y2="${f(wy - 17)}" stroke="#3a2a1c" stroke-width="1.5" stroke-linecap="round"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${250 + i * 13}" cy="${f(wy + 2)}" r="1.8" fill="#e8722c"/>`).join('')}`;
    }
    if (P.L >= 0.9 && sea !== 'wi' && !fr) s += `<g class="fj"><ellipse cx="440" cy="150" rx="9" ry="4" fill="#d98b3a"/><path d="M431,150l-7,-4v8z" fill="#c2732a"/><circle cx="445" cy="149" r=".9" fill="#2b2620"/></g>`;
    if (P.L < 0.4 && ph !== 'night' && !rain) s += `<path d="M468,185l2,-18M474,185l-1,-18" fill="none" stroke="#5f666d" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="473" cy="162" rx="11" ry="5.5" fill="#9aa3ab" transform="rotate(-18 473 162)"/><path d="M464,160q-6,-9 -1,-17" fill="none" stroke="#9aa3ab" stroke-width="3" stroke-linecap="round"/><circle cx="463" cy="142" r="3" fill="#c9cfd4"/><path d="M461,142l-9,1.5" stroke="#d9a441" stroke-width="1.6" stroke-linecap="round"/><path d="M465,140.5l6,-2" stroke="#2b2f33" stroke-width="1" stroke-linecap="round"/>`;
    const RC = ph === 'night' ? ['#16301f', '#16301f', '#2a1c12'] : fr ? ['#a9a397', '#bdb7aa', '#6e5a44'] : { sp: ['#6aa24a', '#80bd58', '#6b4226'], su: ['#4f7a3a', '#5d8f45', '#6b4226'], au: ['#9c8446', '#b09a58', '#5e3b22'], wi: ['#8a7853', '#9b8862', '#7a5d3e'] }[sea];
    const reed = (x, hh, k) => `<g class="rd" style="animation-delay:${-k * 0.7}s"><path d="M${x},200Q${x + 2},${200 - hh / 2} ${x},${200 - hh}" fill="none" stroke="${RC[0]}" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="${x}" cy="${200 - hh + 3}" rx="2.8" ry="9" fill="${RC[2]}"/><path d="M${x},200q${k % 2 ? 12 : -12},-${hh * 0.45} ${k % 2 ? 20 : -20},-${hh * 0.62}" fill="none" stroke="${RC[1]}" stroke-width="1.8" stroke-linecap="round"/></g>`;
    [[14, 70], [27, 92], [41, 62], [55, 80], [548, 66], [562, 90], [575, 72], [589, 84]].forEach((q, k) => { s += reed(q[0], q[1], k); });
    if (rain) for (let k = 0; k < 44; k++) s += `<line x1="${(k * 67) % 620}" y1="0" x2="${(k * 67) % 620 - 3}" y2="11" stroke="rgba(235,243,250,.75)" stroke-width="1.2" stroke-linecap="round" class="rn" style="animation-delay:${(-(k * 0.13) % 0.8).toFixed(2)}s;animation-duration:${(0.7 + (k % 5) * 0.08).toFixed(2)}s"/>`;
    const here = (typeof location !== 'undefined' && location.pathname) || '', ls = (Array.isArray(c.links) ? c.links : []).filter((l) => l && safePath(l.path)), known = ls.some((l) => l.path === here);
    const links = ls.map((l, i) => `<a class="l${here === l.path || (!known && i === 0) ? ' on' : ''}" href="${esc(l.path)}" data-p="${esc(l.path)}">${esc(l.label)}</a>`).join('');
    return `<svg class="sky" viewBox="0 0 600 200" preserveAspectRatio="xMidYMax slice">${s}</svg><div class="hx"><div><div class="hn">${esc(c.title || '')}</div><div class="hl">${c.location ? esc(c.location) + ' · ' : ''}<span id="h-time"></span></div><div class="hu"><i id="h-dot" class="dot"></i><span id="h-upd"></span></div></div><div class="hr"><div class="ht" id="h-t"></div><div class="hf" id="h-f"></div></div></div><div class="ch" id="h-ch"></div>${links ? `<div class="nav">${links}</div>` : ''}`;
  }

  _table(v, unit, dec) {
    const c = this._c, T = this._t, loc = this._loc;
    if (c.variant === 'compass' || c.variant === 'rose') return '';
    const rain = c.variant === 'rain', cols = rain ? ['dmax', 'sum'] : (Array.isArray(c.stats) ? c.stats.filter((k) => ['max', 'min', 'mean'].includes(k)) : ['max', 'min']);
    const n = (x) => (x == null || x === '' || isNaN(x) ? '–' : Number(x).toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }));
    let rows;
    if (rain) {
      const s = this._stats, t = isNaN(v) ? 0 : v;
      rows = s ? [['', n(v)], [n(Math.max(s.maxMonth, t)), n(s.month)], [n(Math.max(s.maxYear, t)), n(s.year)]] : [['', n(v)], ['–', '–'], ['–', '–']];
    } else {
      const s = this._stats || [];
      rows = [0, 1, 2].map((i) => cols.map((k) => {
        let x = s[i] ? s[i][k] : null;
        if (!isNaN(v) && x != null) { if (k === 'max') x = Math.max(x, v); if (k === 'min') x = Math.min(x, v); }
        return n(x);
      }));
    }
    let h = `<div class="st"><span></span>${T.rows.map((r) => `<span class="h">${r}</span>`).join('')}`;
    cols.forEach((k, j) => { h += `<span class="l"><i style="background:${STAT_COL[k] || '#888'}"></i>${T.stat[k]}</span>${[0, 1, 2].map((i) => `<span class="v">${rows[i][j] || '–'}</span>`).join('')}`; });
    return h + '</div>';
  }

  // Speed / pressure / any value: open 240° arc with a gradient fill, today's peak as a short mark.
  _dial(v, val, unit) {
    const c = this._c, T = this._t, min = num(c.min, 0), max = num(c.max, 100) === min ? min + 1 : num(c.max, 100), cols = (Array.isArray(c.colors) && c.colors.length ? c.colors : BLUES).map((x, i) => col(x, BLUES[i % BLUES.length])), id = 'g' + rid();
    const A = (t) => 150 + 240 * t, P = (x) => clamp((x - min) / (max - min), 0, 1), t = isNaN(v) ? 0 : P(v);
    let s = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="22" y1="0" x2="178" y2="0">${cols.map((col, i) => `<stop offset="${cols.length > 1 ? (i / (cols.length - 1)).toFixed(3) : 0}" stop-color="${col}"/>`).join('')}</linearGradient></defs>`;
    s += `<path d="${arc(100, 100, 78, A(0), A(1))}" fill="none" stroke="var(--wh)" stroke-width="12" stroke-linecap="round"/>`;
    if (t > 0.004) s += `<path d="${arc(100, 100, 78, A(0), A(t))}" fill="none" stroke="url(#${id})" stroke-width="12" stroke-linecap="round"/>`;
    (Array.isArray(c.ticks) ? c.ticks : []).forEach((tk) => {
      const tv = num(tk && typeof tk === 'object' ? tk.v : tk, NaN), tl = esc(tk && typeof tk === 'object' ? (tk.l != null ? tk.l : tk.v) : tk); if (isNaN(tv)) return; const a = A(P(tv));
      const [x0, y0] = pol(100, 100, 88, a), [x1, y1] = pol(100, 100, 92, a), [x, y] = pol(100, 100, 100, a);
      s += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="var(--w2)" stroke-width="1.2"/><text x="${f(x)}" y="${f(y + 3)}" text-anchor="middle" font-size="10" fill="var(--w2)">${tl}</text>`;
    });
    const dm = this._stats && this._stats[0] && this._stats[0].max;
    if (dm != null) {
      const a = A(P(isNaN(v) ? dm : Math.max(dm, v))), [x0, y0] = pol(100, 100, 69, a), [x1, y1] = pol(100, 100, 88, a);
      s += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="var(--wt)" stroke-width="2.5" stroke-linecap="round"><title>${T.peak}</title></line>`;
    }
    if (!isNaN(v)) { const [kx, ky] = pol(100, 100, 78, A(t)); s += `<circle cx="${f(kx)}" cy="${f(ky)}" r="8.5" fill="var(--wb)" stroke="var(--wt)" stroke-width="2.5"/>`; }
    const [ax, ay] = pol(100, 100, 78, A(0)), [bx] = pol(100, 100, 78, A(1));
    if (!(Array.isArray(c.ticks) ? c.ticks : []).length) s += `<text x="${f(ax)}" y="${f(ay + 24)}" text-anchor="middle" font-size="10" fill="var(--w2)">${min}</text><text x="${f(bx)}" y="${f(ay + 24)}" text-anchor="middle" font-size="10" fill="var(--w2)">${max}</text>`;
    s += `<text x="100" y="110" text-anchor="middle" font-size="38" font-weight="500" fill="var(--wt)">${val}</text><text x="100" y="132" text-anchor="middle" font-size="12" fill="var(--w2)">${unit}</text>`;
    return `<svg viewBox="-14 -14 228 184">${s}</svg>`;
  }

  // Temperature: big value over a colour band; today's range is lit, the dot is now.
  _thermo(v, val, unit) {
    const c = this._c, min = num(c.min, -20), max = num(c.max, 40) === min ? min + 1 : num(c.max, 40), id = 'g' + rid();
    const X = (x) => 20 + 200 * clamp((x - min) / (max - min), 0, 1);
    const TS = [[-20, '#4f6ff0'], [-5, '#5fb6f2'], [5, '#5fd0c4'], [14, '#9bd46a'], [21, '#f2c94c'], [28, '#f2994a'], [36, '#e5533d'], [45, '#b8304a']];
    const x0 = 20 - 200 * (min - TS[0][0]) / (max - min), x1 = 20 + 200 * (TS[TS.length - 1][0] - min) / (max - min);
    let s = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x0)}" y1="0" x2="${f(x1)}" y2="0">${TS.map((q) => `<stop offset="${((q[0] - TS[0][0]) / (TS[TS.length - 1][0] - TS[0][0])).toFixed(3)}" stop-color="${q[1]}"/>`).join('')}</linearGradient></defs>`;
    s += `<text x="120" y="54" text-anchor="middle" font-size="44" font-weight="500" fill="var(--wt)">${val}<tspan font-size="18" fill="var(--w2)" dx="3">${unit}</tspan></text>`;
    s += `<rect x="14" y="80" width="212" height="12" rx="6" fill="url(#${id})" opacity=".32"/>`;
    const d = this._stats && this._stats[0];
    if (d && d.min != null && d.max != null) {
      const lo = X(Math.min(d.min, isNaN(v) ? d.min : v)), hi = X(Math.max(d.max, isNaN(v) ? d.max : v));
      s += `<rect x="${f(lo - 6)}" y="80" width="${f(Math.max(12, hi - lo + 12))}" height="12" rx="6" fill="url(#${id})"/>`;
    }
    if (!isNaN(v)) s += `<circle cx="${f(X(v))}" cy="86" r="9" fill="var(--wb)" stroke="var(--wt)" stroke-width="3"/>`;
    for (let i = 0; i <= 4; i++) { const x = min + (max - min) * i / 4; s += `<text x="${f(X(x))}" y="114" text-anchor="middle" font-size="10" fill="var(--w2)">${Math.round(x * 10) / 10}°</text>`; }
    return `<svg viewBox="0 0 240 122" style="max-width:280px">${s}</svg>`;
  }

  // Rain: a drop that fills up to `max` (default 50 mm), with a slow wave on top.
  _rain(v, val, unit) {
    const c = this._c, max = num(c.max, 50) || 50, id = 'c' + rid();
    const D = 'M100,8C100,8 48,74 48,106A52,52 0 0 0 152,106C152,74 100,8 100,8Z';
    let s = `<clipPath id="${id}"><path d="${D}"/></clipPath><path d="${D}" fill="var(--wh)"/>`;
    if (!isNaN(v) && v > 0) {
      const y = 158 - clamp(v / max, 0.04, 1) * 150;
      let w = `M0,${f(y)}`; for (let k = 0; k < 6; k++) w += 'q12.5,-4 25,0t25,0';
      s += `<g clip-path="url(#${id})"><path class="rw" d="${w}V170H0Z" fill="#3bb4d6"/><path class="rw" d="${w}V170H0Z" fill="#1f7fa6" opacity=".35" transform="translate(0,6)"/></g>`;
    }
    s += `<text x="100" y="124" text-anchor="middle" font-size="30" font-weight="500" fill="var(--wt)">${val}</text><text x="100" y="142" text-anchor="middle" font-size="11" fill="var(--w2)">${unit}</text>`;
    return `<svg viewBox="0 0 200 162" style="max-width:190px">${s}</svg>`;
  }

  // Wind direction: tick ring with the letters outside; the arrow shows where the wind blows to.
  _compass(v) {
    const T = this._t;
    let s = '';
    if (!isNaN(v)) s += `<path d="${arc(100, 100, 79, v - 90 - 12, v - 90 + 12)}" fill="none" stroke="var(--wa)" stroke-width="14" opacity=".28"/>`;
    for (let i = 0; i < 72; i++) {
      const a = i * 5 - 90, big = i % 18 === 0, mid = i % 9 === 0, [x0, y0] = pol(100, 100, big ? 71 : mid ? 74 : 78, a), [x1, y1] = pol(100, 100, 85, a);
      s += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${big || mid ? 'var(--wt)' : 'var(--w2)'}" stroke-width="${big ? 2 : 1}" opacity="${big || mid ? 0.9 : 0.45}"/>`;
    }
    for (let i = 0; i < 8; i++) {
      const [x, y] = pol(100, 100, i % 2 ? 97 : 99, i * 45 - 90);
      s += `<text x="${f(x)}" y="${f(y + (i % 2 ? 3 : 4.5))}" text-anchor="middle" font-size="${i % 2 ? 9 : 13}" font-weight="${i % 2 ? 400 : 600}" fill="${i === 0 ? 'var(--wa)' : i % 2 ? 'var(--w2)' : 'var(--wt)'}">${T.comp[i]}</text>`;
    }
    if (!isNaN(v)) s += `<g transform="rotate(${f(v)} 100 100)"><line x1="100" y1="40" x2="100" y2="148" stroke="var(--wt)" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="38" r="5" fill="var(--wb)" stroke="var(--wt)" stroke-width="2.5"/><path d="M100,164L90,144Q100,149 110,144Z" fill="var(--wt)"/></g>`;
    s += `<circle cx="100" cy="100" r="27" fill="var(--wb)" stroke="var(--wg)" stroke-width="1.5"/><text x="100" y="${isNaN(v) ? 106 : 103}" text-anchor="middle" font-size="17" font-weight="600" fill="var(--wt)">${isNaN(v) ? '–' : Math.round(v) + '°'}</text>`;
    if (!isNaN(v)) s += `<text x="100" y="116" text-anchor="middle" font-size="10" fill="var(--w2)">${T.dirs[Math.round(v / 22.5) % 16]}</text>`;
    return `<svg viewBox="-14 -14 228 228">${s}</svg>`;
  }

  _rose(v, val, unit) {
    const c = this._c, T = this._t, b = this._bins, h = this._roseH, speed = c.mode === 'speed', R0 = 17, R1 = 82;
    let s = '';
    [33, 49, 66, 82].forEach((r) => { s += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="var(--wg)" stroke-width="1"/>`; });
    for (let i = 0; i < 8; i++) { const [x0, y0] = pol(100, 100, R0, i * 45 - 90), [x1, y1] = pol(100, 100, R1, i * 45 - 90); s += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="var(--wg)" stroke-width="1"/>`; }
    let info = b ? T.nodata : T.loading;
    if (b && b.tot) {
      const data = speed ? b.speed : b.share, mx = Math.max(...data), top = data.indexOf(mx);
      if (mx > 0) {
        data.forEach((p, i) => {
          if (p <= 0) return;
          const r = R0 + 3 + (R1 - R0 - 3) * p / mx, a0 = i * 22.5 - 90 - 9.5, a1 = i * 22.5 - 90 + 9.5;
          const [x0, y0] = pol(100, 100, R0 + 2, a0), [x1, y1] = pol(100, 100, r, a0), [x2, y2] = pol(100, 100, r, a1), [x3, y3] = pol(100, 100, R0 + 2, a1);
          s += `<path d="M${f(x0)},${f(y0)}L${f(x1)},${f(y1)}A${f(r)},${f(r)} 0 0 1 ${f(x2)},${f(y2)}L${f(x3)},${f(y3)}Z" fill="var(--wa)" fill-opacity="${(0.3 + 0.7 * p / mx).toFixed(2)}" stroke="var(--wa)" stroke-width="1.5" stroke-linejoin="round"/>`;
        });
        info = speed ? T.strongest(T.dirs[top], mx.toFixed(1), unit) : T.main(T.dirs[top], Math.round(mx * 100));
        if (!speed && c.speed_entity) info += ' · ' + T.calmp(Math.round(b.calm * 100));
      } else info = T.calmAll;
    }
    s += `<circle cx="100" cy="100" r="${R0}" fill="var(--wb)" stroke="var(--wg)" stroke-width="1"/>`;
    [0, 2, 4, 6].forEach((i) => { const [x, y] = pol(100, 100, 94, i * 45 - 90); s += `<text x="${f(x)}" y="${f(y + 4)}" text-anchor="middle" font-size="12" font-weight="600" fill="${i ? 'var(--w2)' : 'var(--wa)'}">${T.comp[i]}</text>`; });
    const btn = (hh, l) => `<button data-h="${hh}" class="${h === hh ? 'on' : ''}">${l}</button>`;
    return `<div><svg viewBox="-8 -8 216 216" style="max-width:212px;margin:0 auto">${s}</svg><div class="s">${info}</div><div class="bw"><div class="b">${btn(24, T.hours[0])}${btn(72, T.hours[1])}${btn(168, T.hours[2])}</div></div></div>`;
  }


  _chartBody(unit) {
    const c = this._c, T = this._t, loc = this._loc, ch = this._chart, series = this._series(), bar = c.mode === 'bar', dots = c.mode === 'dots';
    const W = 600, H = 240, X0 = 44, X1 = 596, Y0 = 8, Y1 = 212, dec = clamp(Math.round(num(c.decimals, 1)), 0, 6);
    const msg = (m) => `<div class="k"></div><svg class="c" viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="13" fill="var(--w2)">${m}</text></svg>`;
    if (!ch) return msg(T.loading);
    const rows = series.map((s) => (ch.d[s.entity || c.entity] || []).filter((r) => r[s.stat] != null));
    const all = rows.flatMap((r, i) => r.map((x) => x[series[i].stat]));
    if (!all.length) return msg(T.notenough);
    let lo = Math.min(...all), hi = Math.max(...all);
    if (bar) lo = 0;
    lo = num(c.ymin, lo);
    hi = num(c.ymax, hi);
    if (hi - lo < 1e-9) hi = lo + 1;
    const raw = (hi - lo) / 6, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = dots ? 90 : [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw - 1e-12);
    lo = Math.floor(lo / step + 1e-9) * step; hi = Math.ceil(hi / step - 1e-9) * step;
    const sd = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9) + (step / mag === 2.5 ? 1 : 0));
    const X = (t) => X0 + (X1 - X0) * (t - ch.t0) / (ch.t1 - ch.t0), Y = (v) => Y1 - (Y1 - Y0) * (v - lo) / (hi - lo);
    let s = '';
    for (let v = lo; v <= hi + step / 2; v += step) s += `<line x1="${X0}" y1="${f(Y(v))}" x2="${X1}" y2="${f(Y(v))}" stroke="var(--wg)" stroke-width="1"/><text x="${X0 - 8}" y="${f(Y(v) + 3.5)}" text-anchor="end" font-size="10.5" fill="var(--w2)">${v.toFixed(sd)}</text>`;
    s += `<line x1="${X0}" y1="${Y1}" x2="${X1}" y2="${Y1}" stroke="var(--w2)" stroke-width="1" opacity=".6"/>`;
    const fmt = { day: (d) => String(d.getHours()).padStart(2, '0'), week: (d) => d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric' }), month: (d) => d.toLocaleDateString(loc, { day: 'numeric', month: 'numeric' }), year: (d) => d.toLocaleDateString(loc, { month: 'short' }) }[ch.rk];
    const ticks = [], d = new Date(ch.t0);
    if (ch.rk === 'day') { d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); for (; d.getTime() <= ch.t1; d.setHours(d.getHours() + 2)) ticks.push(new Date(d)); }
    else if (ch.rk === 'year') { d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1); for (; d.getTime() <= ch.t1; d.setMonth(d.getMonth() + 1)) ticks.push(new Date(d)); }
    else { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); for (; d.getTime() <= ch.t1; d.setDate(d.getDate() + (ch.rk === 'week' ? 1 : 3))) ticks.push(new Date(d)); }
    ticks.forEach((t) => { const x = X(t.getTime()); s += `<line x1="${f(x)}" y1="${Y1}" x2="${f(x)}" y2="${Y1 + 4}" stroke="var(--w2)" stroke-width="1" opacity=".6"/><text x="${f(x)}" y="${Y1 + 17}" text-anchor="middle" font-size="10.5" fill="var(--w2)">${fmt(t)}</text>`; });
    rows.forEach((r, i) => {
      const st = series[i].stat, col = series[i].color;
      if (bar) r.forEach((x) => { const a = Math.max(X0, X(x.start)), b = Math.min(X1, X(x.end)), y = Y(clamp(x[st], lo, hi)); if (b - a > 0.5 && x[st] > 0) s += `<rect x="${f(a + 0.5)}" y="${f(y)}" width="${f(Math.max(1, b - a - 1))}" height="${f(Y1 - y)}" rx="${b - a > 6 ? 2 : 0}" fill="${col}"/>`; });
      else if (dots) r.forEach((x) => { s += `<circle cx="${f(X((x.start + x.end) / 2))}" cy="${f(Y(x[st]))}" r="1.8" fill="${col}"/>`; });
      else s += `<path d="${r.map((x, j) => `${j ? 'L' : 'M'}${f(clamp(X((x.start + x.end) / 2), X0, X1))},${f(Y(clamp(x[st], lo, hi)))}`).join('')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    });
    const agg = (r, st) => { const a = r.map((x) => x[st]), sum = a.reduce((p, q) => p + q, 0); return st === 'min' ? Math.min(...a) : st === 'max' ? Math.max(...a) : st === 'change' ? sum : sum / a.length; };
    const pills = rows.map((r, i) => `<span><i style="background:${series[i].color}"></i>${esc(series[i].label)}${dots || !r.length ? '' : ` <b>${agg(r, series[i].stat).toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${unit}</b>`}</span>`).join('');
    return `<div class="k">${pills}</div><svg class="c" viewBox="0 0 ${W} ${H}">${s}</svg>`;
  }
}

/* ---------- Zambretti forecast card ---------- */
const ZF_I18N = {
  en: {
    txt: { A: 'Settled fine', B: 'Fine weather', C: 'Becoming fine', D: 'Fine, becoming less settled', E: 'Fine, possible showers', F: 'Fairly fine, improving', G: 'Fairly fine, possible showers early', H: 'Fairly fine, showery later', I: 'Showery early, improving', J: 'Changeable, mending', K: 'Fairly fine, showers likely', L: 'Rather unsettled, clearing later', M: 'Unsettled, probably improving', N: 'Showery, bright intervals', O: 'Showery, becoming less settled', P: 'Changeable, some rain', Q: 'Unsettled, short fine intervals', R: 'Unsettled, rain later', S: 'Unsettled, rain at times', T: 'Very unsettled, finer at times', U: 'Rain at times, worse later', V: 'Rain at times, becoming very unsettled', W: 'Rain at frequent intervals', X: 'Very unsettled, rain', Y: 'Stormy, possibly improving', Z: 'Stormy, much rain' },
    nopress: 'No pressure data', pressure: 'Pressure', calc: 'Trend is being calculated', up: '↗ rising', down: '↘ falling', flat: '→ steady', in3: 'in 3 h',
    raining: (v) => `It is raining (${v} mm/h)`, fastfall: 'Pressure is falling very fast: storm possible', gusts: (v) => `Stormy gusts up to ${v} km/h`,
    frost: 'Frost possible tonight', groundfrost: 'Ground frost possible tonight', fog: 'Fog or dew likely',
    yday: (v, w) => `${v} °C ${w ? 'warmer' : 'colder'} than yesterday at this time`, t3: (w, v) => `Temperature ${w ? 'rising' : 'falling'} (${v} °C in 3 h)`, today: (v) => `${v} mm of rain so far today`,
    title: 'Local forecast from the station · next 12 hours', multi: 'Multi-day forecast from the weather service',
    note: 'The local forecast follows the Zambretti rule: station pressure and its change over three hours. It is a rough tendency for the next half day, not a multi-day forecast.',
  },
  de: {
    txt: { A: 'Beständig schön', B: 'Schönes Wetter', C: 'Es wird schön', D: 'Schön, wird wechselhafter', E: 'Schön, Schauer möglich', F: 'Recht schön, Besserung', G: 'Recht schön, anfangs Schauer möglich', H: 'Recht schön, später Schauer', I: 'Anfangs Schauer, dann besser', J: 'Wechselhaft, Besserung', K: 'Recht schön, Schauer wahrscheinlich', L: 'Eher unbeständig, später Aufklaren', M: 'Unbeständig, wahrscheinlich Besserung', N: 'Schauer mit hellen Abschnitten', O: 'Schauer, wird unbeständiger', P: 'Wechselhaft, etwas Regen', Q: 'Unbeständig, kurze schöne Abschnitte', R: 'Unbeständig, später Regen', S: 'Unbeständig, zeitweise Regen', T: 'Sehr unbeständig, zeitweise freundlicher', U: 'Zeitweise Regen, später schlechter', V: 'Zeitweise Regen, wird sehr unbeständig', W: 'Häufig Regen', X: 'Sehr unbeständig, Regen', Y: 'Stürmisch, vielleicht Besserung', Z: 'Stürmisch, viel Regen' },
    nopress: 'Keine Druckdaten', pressure: 'Luftdruck', calc: 'Tendenz wird noch berechnet', up: '↗ steigt', down: '↘ fällt', flat: '→ gleichbleibend', in3: 'in 3 h',
    raining: (v) => `Es regnet gerade (${v} mm/h)`, fastfall: 'Der Luftdruck fällt sehr schnell: Sturm möglich', gusts: (v) => `Stürmische Böen bis ${v} km/h`,
    frost: 'Frost in der Nacht möglich', groundfrost: 'Bodenfrost in der Nacht möglich', fog: 'Nebel oder Tau wahrscheinlich',
    yday: (v, w) => `${v} °C ${w ? 'wärmer' : 'kälter'} als gestern um diese Zeit`, t3: (w, v) => `Temperatur ${w ? 'steigt' : 'fällt'} (${v} °C in 3 h)`, today: (v) => `Heute bisher ${v} mm Regen`,
    title: 'Eigene Prognose aus der Station · nächste 12 Stunden', multi: 'Mehrtagesvorhersage vom Wetterdienst',
    note: 'Die eigene Prognose folgt der Zambretti-Regel: Luftdruck an der Station und seine Änderung in drei Stunden. Sie ist eine grobe Tendenz für den halben Tag, keine Mehrtagesvorhersage.',
  },
};
class ZambrettiForecastCard extends HTMLElement {
  static getStubConfig() { return { pressure: '' }; }
  setConfig(c) {
    if (!c || !c.pressure) throw new Error('pressure is required');
    this._c = c; this._sig = null;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
  }
  getCardSize() { return this._c.compact ? 2 : 6; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }
  disconnectedCallback() { if (this._unsub) { this._unsub(); this._unsub = null; } this._subbed = false; }

  set hass(h) {
    this._hass = h;
    const c = this._c;
    if (c.weather && !c.compact && !this._subbed && h.connection && h.connection.subscribeMessage) {
      this._subbed = true;
      h.connection.subscribeMessage((m) => { this._fc = m.forecast || []; this._render(); }, { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: c.weather }).then((u) => { this._unsub = u; }).catch(() => {});
    }
    const sig = ['pressure', 'temp', 'dewpoint', 'wind', 'gust', 'rain_rate', 'rain_today', 'wind_dir'].map((k) => (c[k] && h.states[c[k]] ? h.states[c[k]].state : '-')).join('|') + WSC_LANG(h);
    if (sig !== this._sig) { this._sig = sig; this._render(); }
    this._load();
  }

  async _load() {
    if (this._busy || Date.now() - (this._t || 0) < 600000 || !this._hass.callWS) return;
    this._busy = true;
    try {
      const end = new Date(), start = new Date(end.getTime() - 26 * 3600e3), c = this._c;
      this._st = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), end_time: end.toISOString(), statistic_ids: [c.pressure, c.temp].filter(Boolean), period: '5minute', types: ['mean'] });
      this._t = Date.now();
    } catch (e) { this._t = Date.now() - 540000; }
    this._busy = false; this._render();
  }

  _render() {
    const h = this._hass, c = this._c; if (!h) return;
    const T = ZF_I18N[WSC_LANG(h)], loc = (h.locale && h.locale.language) || h.language || 'en';
    const num = (k) => { const s = c[k] && h.states[c[k]]; const v = s ? Number(s.state) : NaN; return isNaN(v) ? null : v; };
    const nf = (v, d) => (v == null ? '–' : v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const ago = (id, hrs) => { const rows = this._st && this._st[id]; if (!rows || !rows.length) return null; const t = Date.now() - hrs * 3600e3; let best = null, bd = 1e15; rows.forEach((r) => { const s = typeof r.start === 'number' ? r.start : new Date(r.start).getTime(), d = Math.abs(s - t); if (d < bd && r.mean != null) { bd = d; best = r.mean; } }); return bd < 45 * 60e3 ? best : null; };
    const p = num('pressure'), t = num('temp'), dew = num('dewpoint'), wind = num('wind'), gust = num('gust'), rr = num('rain_rate'), rd = num('rain_today');
    const p3 = ago(c.pressure, 3), t24 = c.temp ? ago(c.temp, 24) : null, t3 = c.temp ? ago(c.temp, 3) : null;
    const dp = p != null && p3 != null ? p - p3 : null;
    const trend = dp == null ? 0 : dp > 1.6 ? 1 : dp < -1.6 ? -1 : 0;
    const SEQ = { '-1': 'ABDHORUVX', 0: 'ABEKNPSWXZ', 1: 'ABCFGIJLMQTYZ' };
    let letter = null;
    if (p != null) { const z = trend < 0 ? 127 - 0.12 * p : trend > 0 ? 185 - 0.16 * p : 144 - 0.13 * p, base = trend < 0 ? 1 : trend > 0 ? 20 : 10, seq = SEQ[trend]; letter = seq[Math.max(0, Math.min(seq.length - 1, Math.round(z) - base))]; }
    const night = h.states['sun.sun'] && h.states['sun.sun'].state === 'below_horizon';
    const cls = !letter ? 'na' : 'ABC'.includes(letter) ? 'sun' : 'DEFG'.includes(letter) ? 'part' : 'HIJKNO'.includes(letter) ? 'shower' : 'LMPQ'.includes(letter) ? 'cloud' : 'XYZ'.includes(letter) ? 'storm' : 'rain';
    const ICON = { sun: night ? '🌙' : '☀️', part: night ? '☁️' : '🌤️', shower: '🌦️', cloud: '☁️', rain: '🌧️', storm: '⛈️', na: '❔' };
    const icon = rr != null && rr > 0 ? '🌧️' : ICON[cls];
    const tend = dp == null ? T.calc : `${trend > 0 ? T.up : trend < 0 ? T.down : T.flat} (${dp > 0 ? '+' : ''}${nf(dp, 1)} hPa ${T.in3})`;
    const hints = [];
    if (rr != null && rr > 0) hints.push(['🌧️', T.raining(nf(rr, 1))]);
    if (dp != null && dp <= -6) hints.push(['⚠️', T.fastfall]);
    if (gust != null && gust >= 50) hints.push(['💨', T.gusts(nf(gust, 0))]);
    if (t != null && dew != null) {
      if (dew <= 0 && t <= 4) hints.push(['❄️', T.frost]);
      else if (dew <= 2 && t <= 6) hints.push(['❄️', T.groundfrost]);
      if (t - dew < 1.5 && (wind == null || wind < 6)) hints.push(['🌫️', T.fog]);
    }
    if (t != null && t24 != null && Math.abs(t - t24) >= 1) hints.push([t > t24 ? '🔺' : '🔻', T.yday(nf(Math.abs(t - t24), 1), t > t24)]);
    if (t != null && t3 != null && Math.abs(t - t3) >= 2) hints.push(['🌡️', T.t3(t > t3, (t > t3 ? '+' : '') + nf(t - t3, 1))]);
    if (rd != null && rd > 0) hints.push(['☔', T.today(nf(rd, 1))]);
    const css = `ha-card{display:block;padding:14px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px}
.ic{font-size:44px;line-height:1}
.tx{font-size:19px;font-weight:600;line-height:1.25}
.sb{font-size:12.5px;color:var(--secondary-text-color,#666);margin-top:3px}
.tp{margin-left:auto;font-size:28px;font-weight:300;white-space:nowrap}
.hs{display:flex;flex-direction:column;gap:5px;margin-top:12px}
.h{display:flex;gap:8px;font-size:14px;align-items:baseline}
.cp{font-size:12px;color:var(--secondary-text-color,#666);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px}
.fc{display:grid;grid-template-columns:repeat(auto-fit,minmax(52px,1fr));gap:6px}
.d{text-align:center;border:1px solid var(--divider-color,#ddd);border-radius:10px;padding:7px 2px}
.d b{display:block;font-size:12px;font-weight:600}.d i{display:block;font-style:normal;font-size:22px;line-height:1.3}
.d u{display:block;text-decoration:none;font-size:13px}.d s{text-decoration:none;color:var(--secondary-text-color,#666)}.d em{display:block;font-style:normal;font-size:11px;color:#3d8bd9;min-height:14px}
.nt{font-size:11.5px;color:var(--secondary-text-color,#666);margin-top:10px}
.cl{cursor:pointer}`;
    const head = `<div class="row"><div class="ic">${icon}</div><div><div class="tx">${esc(letter ? T.txt[letter] : T.nopress)}</div><div class="sb">${c.compact ? '' : T.pressure + ' ' + nf(p, 1) + ' hPa · '}${esc(tend)}</div></div>${t != null ? `<div class="tp">${nf(t, 1)} °C</div>` : ''}</div>`;
    if (c.compact) {
      const one = hints.slice(0, 2).map((x) => `${x[0]} ${esc(x[1])}`).join(' · ');
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card class="${c.navigation_path ? 'cl' : ''}">${head}${one ? `<div class="sb" style="margin-top:8px">${one}</div>` : ''}</ha-card>`;
      if (c.navigation_path) this.shadowRoot.querySelector('ha-card').addEventListener('click', () => { history.pushState(null, '', c.navigation_path); window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true })); });
      return;
    }
    const CI = { 'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️', lightning: '🌩️', 'lightning-rainy': '⛈️', partlycloudy: '⛅', pouring: '🌧️', rainy: '🌦️', snowy: '❄️', 'snowy-rainy': '🌨️', sunny: '☀️', windy: '💨', 'windy-variant': '💨', exceptional: '⚠️' };
    const days = (this._fc || []).slice(0, 6).map((d) => `<div class="d"><b>${new Date(d.datetime).toLocaleDateString(loc, { weekday: 'short' })}</b><i>${CI[d.condition] || '❔'}</i><u>${d.temperature != null ? Math.round(d.temperature) + '°' : '–'} <s>${d.templow != null ? Math.round(d.templow) + '°' : ''}</s></u><em>${d.precipitation ? nf(d.precipitation, 1) + ' mm' : ''}</em></div>`).join('');
    this.shadowRoot.innerHTML = `<style>${css}</style><ha-card><div class="cp" style="margin-top:0">${esc(c.title || T.title)}</div>${head}<div class="hs">${hints.map((x) => `<div class="h"><span>${x[0]}</span><span>${esc(x[1])}</span></div>`).join('')}</div>${days ? `<div class="cp">${T.multi}</div><div class="fc">${days}</div>` : ''}${c.show_note === false ? '' : `<div class="nt">${T.note}</div>`}</ha-card>`;
  }
}

if (!customElements.get('weather-station-card')) customElements.define('weather-station-card', WeatherStationCard);
if (!customElements.get('zambretti-forecast-card')) customElements.define('zambretti-forecast-card', ZambrettiForecastCard);
window.customCards = window.customCards || [];
[['weather-station-card', 'Weather Station Card', 'Instruments and history charts for a personal weather station: dial, thermometer, rain gauge, compass, wind rose, chart and an animated header'],
  ['zambretti-forecast-card', 'Zambretti Forecast Card', 'Short-term forecast from local air pressure and its 3-hour trend']]
  .forEach(([type, name, description]) => { if (!window.customCards.some((c) => c.type === type)) window.customCards.push({ type, name, description}); });
console.info(`%c WEATHER-STATION-CARD %c ${WSC_VERSION} `, 'color:#fff;background:#3d8bd0;font-weight:700', 'color:#3d8bd0;background:#fff');
