# 09 — Real data, a no-key HYSPLIT demo, and remaining work

Date: September 27, 2026

## Delivered in this branch

The map now queries observations by region, uses indexed latest-measurement lookups, omits old artificial plume blobs, caches responses, and compresses larger payloads. Wind and satellite components are loaded on demand; alert cards are mounted only when opened and paginated. The forecast slider selects UTC data timestamps instead of moving geometry by an arbitrary offset.

The public GFS/CAMS forecast path and dated NASA GIBS imagery were verified against live services. The evidence panel displays provenance and available measurements; missing evidence is explicitly unavailable. Known mock sensor fallbacks are removed. Existing SQLite seed records are retained separately from runtime data and are not silently asserted to be verified.

The supplied team environment values were saved only in the ignored local backend environment file. A local PostgreSQL 16.15 instance was initialized and the application connected using that database URL. Python's PostgreSQL driver is declared in the requirements. Database connection attempts are bounded, with IPv4 selected for local connections while preserving the configured URL. PostgreSQL is run as a persistent VS Code task, followed by the backend and frontend tasks.

Live verification with the supplied credentials:

- NASA FIRMS succeeded and ingested 340 verified India fire detections.
- OpenAQ returned HTTP 401, `Invalid credentials`. The supplied key was preserved exactly. A valid replacement is needed for fresh ground-station readings; no fake measurements were substituted.
- Open-Meteo supplied 49 hourly forecast timestamps in the initial integration check.
- NASA GIBS returned a real event-date image.

## Hackathon HYSPLIT demonstration

The application includes **24 genuine three-hour HYSPLIT model-output intervals** from NOAA's published scientific sample, bundled as compressed GeoJSON. Open **Explore HYSPLIT demonstration** on the map, or open a live event's evidence panel and choose the historical demonstration. The model output loads without contacting NOAA and has play/pause and a time slider. The base map is optional online context.

The demonstration is deliberately labelled **HYSPLIT simulation — demonstration mode**. It retains the original 2019 source location, dates, meteorology, and pollutant code. The source sample uses **I131**, not smoke or PM2.5. Opening it from a live event does not relocate the model output or turn it into a prediction for that event. Contours are derived from numerical model grids, with one fixed normalization peak across time; they are not hand-drawn shapes.

Provenance, SHA-256, processing details, and rebuild instructions are recorded in [the model-data README](../../backend/data/hysplit_demo/README.md) and [metadata](../../backend/data/hysplit_demo/metadata.json). The builder uses NOAA's pinned concentration reader and contourpy. These are build dependencies only, so the app does not need a model installation to replay the result.

The READY submission/poll/download integration remains optional and is tested with an isolated provider transport. No live READY run has been claimed. NOAA registration/API submission is still pending the applicant's full name, college name, and college email. It is not a hackathon blocker. See [NOAA's current registration instructions](https://www.ready.noaa.gov/HYSPLIT_register.php); API approval is discretionary and public trajectory access must not be confused with forecast-dispersion API access.

## Features that are not complete

| Priority | Area | Current state and remaining work |
| --- | --- | --- |
| Before demonstrating that feature | Citizen photo reporting | The older ingestion route still fabricates an 85% CV result and uses obsolete `location`/`centroid` constructor fields. Repair the latitude/longitude persistence, return unverified reports honestly, and add input validation before presenting it as working AI detection. |
| Before demonstrating that feature | Citizen portal AQI/GPS | The portal still contains hardcoded AQI/weather values and a fallback location when GPS fails. Replace these with labelled observations/forecasts and explicit location permission/error handling. |
| Before demonstrating that feature | Inspector dispatch | The old dispatch route returns a random unit and changes event status without contacting a real service. Disable or label it as simulation until an actual dispatch provider returns a receipt. |
| Immediate configuration | Ground observations | Replace the rejected OpenAQ key. Verify location/sensor mapping, units, timestamps, station coverage, and successful ingestion before claiming live ground truth. |
| Next scientific milestone | Event-specific smoke predictions | The bundled replay is a historical tracer sample, not a new run for a user event. Add a local archived-meteorology HYSPLIT runner or approved READY access, real meteorological inputs, job storage, reproducible configuration, and event-specific output. |
| Next scientific milestone | PM2.5 mass concentrations | Build and validate emissions estimates, release heights/durations, pollutant physics, and unit conversions. A fire coordinate or FRP alone is not a calibrated PM2.5 emission estimate. Do not relabel relative tracer output as µg/m³. |
| Next scientific milestone | Accuracy and uncertainty | Compare retrospective model runs with held-out station readings and satellite observations. Report forecast error, uncertainty, cloud/no-data coverage, and sensitivity to assumed release heights/emissions. |
| Before shared deployment | Authentication/authorization | User identity and role controls in the UI are not enforced application authentication. Protect ingestion, report moderation, model submissions, and dispatch routes; add request quotas and audit trails. GitHub sign-in is unrelated to application authentication. |
| Before shared deployment | Database deployment | The local instance is PostgreSQL, but PostGIS spatial processing/migrations are not implemented in these paths. Align Docker Compose's old credentials with deployment secrets, add migrations/backups, and move database storage out of a OneDrive-synced directory. Never commit credentials or database files. |
| Scale-up | Background jobs and caching | Current model polling/cache ownership assumes one API process. Use a durable shared queue, distributed locking, retries/backoff, and transactional quota accounting before multiple workers. |
| Product completeness | History/search/notifications | Several navigation/actions are placeholders, including alert history, location search, and notification/account controls. Add working queries, pagination, persistent subscriptions, and explicit action outcomes. |
| Product completeness | Evidence fusion | Existing heuristic confidence is not a calibrated multimodal model. Establish documented evidence rules and avoid claiming alert dispatch or AI calibration without recorded results. |
| Later | Other satellite layers | Actual Sentinel/TROPOMI NO2/SO2 processing, quality filtering and column-to-surface interpretation are not implemented. The old synthetic overlay was removed upstream; it was not replaced by measurements. |
| Later | Transboundary operations | Real jurisdiction intersection, border-crossing alerts, routing to authorities and multilingual operational workflows remain to be implemented and tested. |

## Useful additions

1. **A visible data-health panel:** latest successful ingestion, provider error category (including invalid credentials), age, coverage and next retry. Show unavailable sensors distinctly from clean air.
2. **A reproducible scenario export:** event inputs, source observations, meteorological revision, model settings, output checksums and timestamps in a downloadable bundle for judges/reviewers.
3. **Side-by-side observed/forecast comparison:** plot station time series alongside predictions and display measured error instead of only a plume visual.
4. **Report review workflow:** deduplicate photos, record actual GPS consent, queue uncertain reports for human review, and retain an audit trail.
5. **Offline capture and upload retry:** store reports locally during connectivity loss, with explicit pending/sent states and no invented coordinates.
6. **Exposure-aware views:** population, schools and hospitals intersecting a model layer, with uncertainty visible and no unsupported health guarantees.
7. **Automated integration checks:** CI for isolated backend tests, frontend timestamp/wind tests, build/lint, and browser smoke tests with unavailable-provider cases.

## Validation boundaries

The current backend suite includes 16 tests covering data queries, provenance, dates, missing values, HYSPLIT lifecycle mechanics, and all 24 bundled replay frames. Three frontend tests cover forecast selection and wind vectors. Production builds and browser interactions are checked separately. Live FIRMS ingestion and PostgreSQL were verified; the OpenAQ credential failure is recorded rather than hidden.

Passing software tests does not establish scientific forecast accuracy. The demo should be presented as a working data and visualization pipeline with transparent boundaries, while the unfinished features above remain on the roadmap.
