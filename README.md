# Wind Atlas UK

A static React + Vite site for **GitHub Pages**. No application server, Cloudflare Worker or API secret is required. All existing map interactions, dynamic grouping, thresholds and wind-driven animation run in the browser.

Interactive voxel atlas using all 834 operational wind records with valid UK coordinates and positive capacity in the July 2026 REPD snapshot (31,519.35 MW).

## Grouping and threshold

The capacity threshold defaults to 20 MW. Each onshore farm at or above the threshold gets its own marker. Smaller onshore farms are pooled by the source Country + County fields (Region/Country fallback). A county pool is displayed only when its combined capacity meets the same threshold. Offshore farms always remain individual, and are hidden below the threshold.

Membership is recomputed whenever the threshold changes. For example, a 20 MW farm and a pool of three 10 MW sites produce separate 20 MW and 30 MW markers at the default threshold. At 25 MW they become one 50 MW county pool. All source records appear exactly once in either a standalone marker or a county pool, including excluded markers. Shown capacity plus excluded capacity always equals the loaded dataset total. Thus excluded capacity need not increase monotonically as the threshold rises: regrouping can bring capacity into a qualifying pool.

At 20 MW, Scotland has 144 individual onshore farms. The former arbitrary cap of 20 farms per Scotland / four per other nation was removed. Highland's remainder is 188.2 MW across 23 small sites, rather than the former 1,676.9 MW pool containing much larger farms.

The slider covers 0–200 MW by default, with numeric entry for larger thresholds and quick presets. Map grouping is debounced by 200 ms; display geometry is rebuilt with camera position preserved. The selected marker falls back to a visible marker if its former individual/pool is no longer included.

## Sources and limits

- DESNZ Renewable Energy Planning Database, July 2026 (Q2): https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract (Open Government Licence).
- Coordinates: source OSGB36 eastings/northings converted to WGS84 with proj4, including Northern Ireland. County labels are taken from REPD and mix historical/current administrative areas; they are not a normalized current-boundary dataset. Some projects have separate planning-phase or cross-boundary records; source records are retained rather than silently deduplicated.
- County coordinates are capacity-weighted centroids of their current members. They represent a collection of sites, not the location of one farm or an administrative headquarters.
- Geography: Natural Earth 1:10m Admin 0 Countries, UK and Ireland: https://github.com/nvkelso/natural-earth-vector (public domain). Rasterised at 0.22° longitude / 0.13° latitude. Ireland is context only; decorative heights are not actual terrain elevation.
- Open-Meteo current modelled wind at 10 m: https://open-meteo.com/en/docs (CC BY 4.0). The free endpoint has non-commercial use and rate limits; sustained/commercial operation needs a suitable service plan.

## Positioning and visual encoding

Inland symbols snap only to the nearest UK land voxel. They are never moved away from one another for spacing. This fixes the former placement of Greater Manchester in Wales: its source centroid is near Rochdale (53.6696 N, 2.1136 W), and its nearest displayed voxel is 53.69 N, 2.20 W. Inland symbols can overlap at national scale; zoom and the farm chooser provide access.

Offshore source-to-coast distances expand 1.75×, followed by collision-aware placement. Leader lines connect displaced offshore symbols to geographic anchors. Offshore display distances are schematic; weather always uses source coordinates.

Turbine dimensions scale as `0.82 * sqrt(MW / 500)`. Gold bases mean offshore; black bases mean county pools. The ocean is a stepped cube field. The land shelf has a baseline height of 2.25 world units, half its earlier height. Symbols and minimum-size click targets are not physical scale models.

## Weather and animation

The browser computes grouping and fetches Open-Meteo directly (the provider supports CORS) at visible-marker source coordinates in batches of up to 35, with at most two upstream requests in flight. Per-coordinate readings are cached for 15 minutes and concurrent requests share pending lookups, so slider changes reuse unchanged site weather. Partial failures retry after a minute. Pool weather is a representative reading at its current capacity-weighted centroid, not an average of site weather. Threshold changes clear obsolete readings and fetch readings for the new membership/centroids. The normal refresh interval is 15 minutes, upstream timeout is 20 seconds, and readings older than two hours are rejected. Partial failures are surfaced and missing readings never produce invented motion.

Rotor motion is a generic proxy: stopped below 3 m/s and at/above 25 m/s; otherwise `min(18, 4 + 1.1*(speed-3))` RPM. It is not actual turbine RPM or generation telemetry. Reduced-motion preference sets the initial paused state; the visible Enable motion button overrides it.

## Development and validation

Use pnpm with Node 22.13+.

- `node scripts/prepare-farms.mjs`: rebuild all site records from the checked-in REPD snapshot.
- `node --experimental-strip-types scripts/check-grouping.mjs`: check dynamic membership, conservation, the 20/30/25 MW example, Scotland's counts, and the Manchester placement regression.
- `node --experimental-strip-types scripts/check-atlas.mjs`: check scale, elevation, rendering layout, capacity accounting and animation rules.
- `pnpm exec tsc --noEmit`
- `pnpm dev`
- `pnpm build`

Local development uses Vite. The original Sites/Cloudflare implementation is not required.

## Run locally

Install Node.js 24 and pnpm 11.19.0, then run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite. `pnpm build` produces the complete static site in `dist/`; `pnpm preview` serves that production build locally.

## GitHub Pages

The `.github/workflows/pages.yml` workflow tests, builds and deploys on pushes to `main`. Set repository **Settings → Pages → Source** to **GitHub Actions**. The workflow obtains the repository base path from GitHub, so asset URLs work under `/wind-atlas-uk/` and custom-domain deployments. No repository secrets are needed beyond GitHub's automatic workflow token.

To reproduce a project-path build locally:

```sh
BASE_PATH=/wind-atlas-uk/ pnpm build
pnpm preview
```

### Static-hosting trade-offs

- Live weather is fetched directly from Open-Meteo; it still needs network access, browser CORS support and available provider quota. No generated weather replaces unavailable data.
- The weather cache and request deduplication are per browser tab, not shared across visitors. This may increase total provider traffic. The free service is for non-commercial use; a paid credential must not be embedded in public JavaScript. A commercial deployment requiring secret credentials needs a separate backend/proxy.
- GitHub Pages serves the site publicly; the original Sites owner-only access gate is not reproduced.
- The farm inventory is the checked-in July 2026 snapshot. Updating it requires refreshing source data and rebuilding; current weather continues to update in the browser.
- There are no server API routes or runtime secrets in this repository. No map functionality depends on them.
