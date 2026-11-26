# PWS Station Card

<p align="center">
  <a href="https://my.home-assistant.io/redirect/marketplace_repository/?owner=matthiasnattke&repository=pws-station-card&category=plugin"><img src="https://img.shields.io/badge/Home%20Assistant-Marketplace-41BDF5?style=for-the-badge&logo=homeassistant&logoColor=white" alt="Home Assistant Marketplace"></a>
  <a href="https://github.com/matthiasnattke/pws-station-card/releases/latest"><img src="https://img.shields.io/github/v/release/matthiasnattke/pws-station-card?style=for-the-badge&label=Release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/matthiasnattke/pws-station-card?style=for-the-badge" alt="License"></a>
  <a href="https://buymeacoffee.com/couch"><img src="https://img.shields.io/badge/Buy%20me%20a-coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy me a coffee"></a>
</p>

Instruments and history charts for a personal weather station in Home Assistant – Ecowitt, Netatmo, Davis, or any sensors you have.
Two cards in one file:

- **`pws-station-card`** – one card, eight variants: an animated `header`, a round `dial`, a `thermo`meter, a `rain` gauge, a wind `compass`, a wind `rose`, a history `chart` and a shared time `range` switch.
- **`zambretti-forecast-card`** – a short-term forecast computed from your own air pressure and its 3-hour trend (Zambretti rule), plus hints such as frost, fog or a fast pressure drop, and optionally the multi-day forecast of a `weather` entity.

![Preview](images/preview.png)

Dials and gauges show **daily, monthly and yearly** max / min / mean from Home Assistant's long-term statistics. The header follows the sun (day, dusk, night), rain, frost and the seasons. UI texts are available in **English and German** and follow the user's language.

> [!NOTE]
> Up to version 1.1.1 this card was called **Weather Station Card** (`custom:weather-station-card`). It was renamed so it can be used next to the card of the same name in the default catalog. If you used it before, change `type: custom:weather-station-card` to `type: custom:pws-station-card` in your dashboards.

## Installation

### 1. Home Assistant Marketplace (recommended)

1. Click the button below, or open **Settings > Marketplace** and search for **PWS Station Card**.
2. Click **Download** and confirm.
3. Reload the browser (in the app: pull down to refresh).
4. Edit a dashboard → **Add card** → search for **PWS Station Card**. It starts with an example config.

<a href="https://my.home-assistant.io/redirect/marketplace_repository/?owner=matthiasnattke&repository=pws-station-card&category=plugin"><img src="https://my.home-assistant.io/badges/marketplace_repository.svg" alt="Open your Home Assistant instance and open this repository in the Marketplace."></a>

> [!TIP]
> Updates then appear under **Settings > Updates**, next to the Home Assistant updates.

### 2. Manual installation

1. Download [`pws-station-card.js`](https://github.com/matthiasnattke/pws-station-card/raw/main/pws-station-card.js).
2. Copy it to `<config>/www/`.
3. **Settings > Dashboards** → ⋮ → **Resources** → add `/local/pws-station-card.js` as *JavaScript module*.
4. Reload the browser.

The sensors need a `state_class` (e.g. `measurement`) so that long-term statistics exist.

## pws-station-card

| Option | Variants | Description |
|---|---|---|
| `variant` | all | `header`, `range`, `dial`, `thermo`, `rain`, `compass`, `rose`, `chart` (required) |
| `entity` | all but `range` | Sensor to show. For `header`: the outdoor temperature |
| `name` | instruments | Title (default: friendly name) |
| `unit`, `decimals` | instruments | Override unit / decimal places |
| `min`, `max` | `dial`, `thermo`, `rain` | Scale (thermo default −20 … 40, rain default 0 … 50) |
| `ticks`, `colors` | `dial` | Scale marks (numbers or `{v: 3, l: '3'}`) and the colours of the arc, from low to high |
| `stats` | `dial`, `thermo` | Rows of the statistics below the instrument: any of `max`, `min`, `mean` (default `[max, min]`) |
| `stat_entity` | `rain` | Total-rain sensor (`total_increasing`) for monthly / yearly sums (required for `rain`) |
| `speed_entity`, `mode: speed`, `calm` | `rose` | Wind speed for the rose; `mode: speed` shows average speed per direction |
| `mode` | `chart` | `line` (default, min/mean/max), `bar` (sums), `dots` (e.g. wind direction) |
| `series` | `chart` | Custom series: `[{stat: max, label: Gusts, color: '#1f6fb8', entity: sensor.gust}]` |
| `ymin`, `ymax` | `chart` | Fixed y axis |
| `theme` | instruments | Colours follow your Home Assistant theme; `dark` or `light` forces a fixed palette |
| `title`, `location` | `header` | Big title and small subtitle |
| `feels`, `humidity`, `wind`, `wind_dir`, `rain_today`, `rain_rate`, `pressure` | `header` | Optional sensors for the header line and chips |
| `prefix` | `header` | Entity-ID prefix of the station, used for the *live / last update* indicator |
| `links` | `header` | Tabs in the header: `[{label: Now, path: /weather/now}]` |
| `pond` | `header` | Optional seasonal pond (see below) |

The `range` card switches all `chart` cards on the page between day, week, month and year.

### Seasonal pond (optional)

In some regions fish ponds are filled in spring and drained in autumn. With `pond: true` the header shows the water level over the year, a fishing boat while draining, and a heron on the empty pond bed. Dates can be changed:

```yaml
pond:
  fill_start: '03-01'   # filling starts
  full: '04-15'         # pond is full
  drain: '10-25'        # draining starts
  empty: '11-01'        # pond is empty
```

### Example

```yaml
type: custom:pws-station-card
variant: header
title: My station
location: Garden
entity: sensor.station_outdoor_temperature
feels: sensor.station_feels_like_temperature
humidity: sensor.station_humidity
wind: sensor.station_wind_speed
wind_dir: sensor.station_wind_direction
rain_today: sensor.station_daily_rain
rain_rate: sensor.station_rain_rate
pressure: sensor.station_relative_pressure
```

```yaml
type: custom:pws-station-card
variant: dial
entity: sensor.station_uv_index
name: UV index
max: 12
decimals: 0
unit: ''
ticks: [{v: 0, l: '0'}, {v: 3, l: '3'}, {v: 6, l: '6'}, {v: 8, l: '8'}, {v: 11, l: '11+'}]
colors: ['#7ac70c', '#a8d51a', '#f5e663', '#f5b942', '#f08a24', '#e0362c', '#b02a7c', '#7c3aed']
stats: [max]
```

```yaml
type: custom:pws-station-card
variant: rain
entity: sensor.station_daily_rain
stat_entity: sensor.station_total_rain
max: 50
```

```yaml
type: custom:pws-station-card
variant: chart
entity: sensor.station_wind_speed
name: Wind
series:
  - {stat: mean, label: Average, color: '#7cc4fa'}
  - {entity: sensor.station_wind_gust, stat: max, label: Gusts, color: '#1f6fb8'}
```

## zambretti-forecast-card

| Option | Description |
|---|---|
| `pressure` | Relative (sea-level) pressure in hPa (required) |
| `temp`, `dewpoint`, `wind`, `gust`, `rain_rate`, `rain_today` | Optional sensors for the hints |
| `weather` | Optional `weather` entity for a multi-day forecast row |
| `compact` | Small version: forecast line and two hints |
| `navigation_path` | In compact mode, tap opens this path |
| `title`, `show_note` | Custom title; `show_note: false` hides the explanation |

The trend needs about three hours of pressure statistics after the first install.

## Deutsch

Wetterstations-Instrumente und Verlaufsgrafiken für Home Assistant: Kopfbereich mit Tageszeit, Wetter und Jahreszeit, Rundinstrumente mit Tages-, Monats- und Jahreswerten, Thermometer, Regenmesser, Windkompass, Windrose, Diagramme und eine eigene Kurzfrist-Prognose nach der Zambretti-Regel. Die Texte erscheinen automatisch auf Deutsch, wenn Home Assistant auf Deutsch eingestellt ist. Installation über HACS: nach *PWS Station Card* suchen und installieren (falls noch nicht gelistet: als *benutzerdefiniertes Repository*, Typ *Dashboard*).

## ☕ Support this project

I build these cards in my free time. If one of them makes your dashboard nicer, you are welcome to buy me a coffee – completely voluntary, and thank you!

<a href="https://buymeacoffee.com/couch"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy me a coffee"></a>

## License

MIT – see [LICENSE](LICENSE).
