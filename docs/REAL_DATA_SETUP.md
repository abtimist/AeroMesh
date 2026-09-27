# Real data, forecasts, and dispersion

## Hackathon path: no NOAA approval required

Open `/map` and choose **Explore HYSPLIT demonstration**. The bundled replay includes 24 intervals of genuine NOAA-published HYSPLIT output with play/pause and timestamp selection. It is labelled demonstration mode, retains its original 2019 location and I131 tracer code, and is never presented as live smoke or calibrated PM2.5. It can also be opened from an event's evidence panel. See [data provenance](../backend/data/hysplit_demo/README.md) and the [remaining-work journal](./journal/09-REAL-DATA-DEMO-AND-REMAINING-WORK.md).

The live READY integration below is optional. Neither this replay nor the public wind/air-quality/satellite layers depends on receiving NOAA API approval.

On the configured Windows workspace, start the **AeroMesh: PostgreSQL** task before **AeroMesh: Backend**, then **AeroMesh: Frontend**. PostgreSQL binaries/data are local runtime files and are not committed. On another machine, provision PostgreSQL matching the local environment URL; do not assume the old Docker Compose credentials match it. The supplied FIRMS credential worked during verification; the supplied OpenAQ key was rejected with HTTP 401 and needs replacement.

## What the application now does

- Observation endpoints query only the selected region and omit legacy plume blobs. Indexed latest-reading lookups preserve missing values as `null`; serialized responses are cached for 30 seconds and compressed.
- Runtime data lives in `backend/runtime/aeromesh.db`, copied once from the bundled seed using SQLite's backup API. Git pulls no longer overwrite an open runtime database. Existing records are preserved. Explicit `DATABASE_URL` settings override this default.
- Wind, PM2.5, US AQI, and AOD forecasts are retrieved independently of map observations, persisted, and selected by UTC valid time. Open-Meteo GFS and CAMS requests run concurrently; concurrent viewers share a refresh. A provider failure produces an unavailable layer, with no invented fallback.
- The regional display samples a 5×5 grid. Wind is interpolated between those samples for visualization. CAMS Global's native resolution is approximately 45 km and native time step is 3 hours (served as an interpolated hourly series). These are regional forecasts, not measurements at individual streets or factories. AOD is column aerosol, not surface PM2.5.
- Sensors and detected fires keep their observation timestamps when the forecast time changes. OpenAQ and FIRMS ingestion now records provenance. Legacy records without that evidence are labelled unverified; known mock stations are excluded. The old mock sensor fallback and generated plume output are not served.
- Event evidence requests the actual event date from NASA GIBS Terra MODIS true-colour WMTS tiles. It preserves missing areas and shows an unavailable state for a failed/empty image. The cross marks the event location. Exact overpass time is not provided by this daily browse layer; cloud cover can obscure the scene. This is observation context, not automatic confirmation of smoke.
- Nearby PM2.5 readings are taken within 50 km and within six hours **before** the event. There is no fabricated anomaly percentage, CV score, or dispatch receipt in the evidence panel.
- READY jobs are persisted, submitted in the background, polled at a bounded rate, and converted from the provider's timestamped KML polygons to GeoJSON. ZIP/KMZ handling is size-limited and never extracts archive paths. Missing/unsupported output is an explicit failure, not a substitute ellipse.

## Credentials and setup

Copy [the environment example](../backend/.env.example) to `backend/.env` and set secrets locally. Never commit that file.

| Service | Required configuration |
| --- | --- |
| NASA GIBS | No API key |
| Open-Meteo public forecast APIs | No key for permitted non-commercial use; commercial use requires a suitable plan/customer endpoints |
| NASA FIRMS | `NASA_FIRMS_API_KEY` (FIRMS map key) |
| OpenAQ v3 | `OPENAQ_API_KEY` |
| NOAA READY/HYSPLIT | Approved registration/API credentials **and authentication instructions** |
| AeroMesh model submissions | A separate `MODEL_OPERATOR_TOKEN` secret chosen by the operator |

NOAA sends its authentication instructions to approved users. Set the exact HTTP authentication headers from those instructions in `HYSPLIT_AUTH_HEADERS` as a JSON object. The application deliberately does not assume Bearer or X-API-Key authentication. If NOAA requires a signing flow rather than a static HTTP header, that flow needs an adapter before live use. Keep the credentials server-side; the UI only accepts the separate operator token.

The default READY base is `https://apps.arl.noaa.gov/ready2`. The integration uses the documented `/api/v1/disp`, `/api/v1/disp/status/{UUID}`, and `/api/v1/disp/download/{UUID}` endpoints. It does not send notification email. Reference: [NOAA READY API access](https://www.ready.noaa.gov/READYmetapi.php) and [published dispersion API specification](https://www.ready.noaa.gov/webapi/READY_Web_API_User_Guide_v0.3.0.pdf).

After configuration, restart the backend. Run from the backend directory with `python -m uvicorn main:app --host 127.0.0.1 --port 8000`; run the frontend with `npm --prefix frontend run dev`. The frontend proxies `/api` to the backend. Production deployments must provide a reverse proxy or `VITE_API_BASE_URL`.

Open `/map`, enable Wind or AQ forecast, and move the UTC timeline. Open Alerts → View evidence to inspect an event. When NOAA is configured, the evidence panel exposes the relative-dispersion form. Specify the UTC release start, top/bottom heights, release duration, simulation duration, averaging height, and assumptions. Enter the separate operator token to submit.

FIRMS and OpenAQ refresh through the existing scheduled ingestion jobs. With their keys configured, the existing `POST /api/ingestion/firms` and `POST /api/ingestion/openaq` endpoints can request an immediate refresh. They do not manufacture data on failure.

## Scientific limits

READY's generic dispersion endpoint has no documented arbitrary PM2.5 emission-rate field. Therefore this integration requests **unit-release relative dispersion**, retaining the operator's release assumptions. A FIRMS hotspot/FRP alone is not converted into a made-up emission rate. The source location is an observed event, but continued emissions at a later start time are explicitly a scenario assumption.

Actual PM2.5 concentration forecasts require a defensible emissions inventory/estimate, pollutant-specific physics, and a calibrated model run that supports those inputs. That is not represented as complete here. Likewise, no future fire ignition, sensor observation, or satellite image is fabricated. The API's layer-averaged dispersion is not an exact surface exposure estimate.

The model worker uses GFS0p25 meteorology supplied by READY, not the coarse frontend wind samples. It permits 1–24 hour simulations and hourly average contours. At timeline time T, the map selects the interval ending at T. If there is no matching interval, it shows no plume. Full original archives are retained under `backend/runtime/hysplit` for inspection.

Run one API worker with the current SQLite/local job configuration. The in-process submit/poll budget and cache are designed for this deployment. Before deploying multiple processes, move job ownership and the quota ledger into a transactional shared queue. The local rolling-24-hour budget defaults to 200 calls; status/download calls also count. Polling defaults to five minutes. Uncertain submissions after a timeout/restart are not automatically resubmitted.

NOAA describes READY as non-operational with no guaranteed 24/7 availability. Model output still needs scientific evaluation against observed events before being used for operational warnings.

## Validation and maintenance

Measured locally with the bundled dataset (timings vary with hardware/cache):

| Request | Before | After |
| --- | --- | --- |
| All events (5,309 records), initial uncached response | 1.66–1.96 seconds; 18.57 MB | 135 ms; 1.28 MB |
| All events, cached response | No response cache | ~24 ms |
| India event response (277 records) | Frontend downloaded all events | ~66 KB; 3–5 ms cached |

Payload sizes above are decoded JSON sizes; gzip also reduces transferred bytes. These measure HTTP responses, not end-to-end map painting. Map rendering additionally uses canvas markers, loads wind/evidence code on demand, and mounts/paginates alert cards only when opened.

From `backend`:

```sh
python -m unittest discover -s tests -v
python benchmark_api.py --regional
python check_integrations.py
```

From the repository root:

```sh
node --test frontend/src/forecast.test.js
npm --prefix frontend run build
npm --prefix frontend run lint
```

The test suite uses isolated SQLite databases and labelled synthetic provider fixtures. It covers query count, timestamp ties, missing and zero values, regional selection, provenance, duplicate detection, forecast refresh sharing, authorization, and the READY submit → poll → archive → dated-contour lifecycle. Fixtures are only for tests; production never falls back to them. The live check script is read-only and never submits a NOAA job.

Public-source validation completed with 49 hourly GFS/CAMS frames and a real GIBS event-date PNG. A live NOAA run remains unverified until approved credentials and authentication instructions are configured. The test transport validates integration mechanics, not scientific model accuracy.

References: [Open-Meteo weather API](https://open-meteo.com/en/docs), [CAMS air-quality API](https://open-meteo.com/en/docs/air-quality-api), [NASA GIBS access](https://nasa-gibs.github.io/gibs-api-docs/access-basics/), [OpenAQ authentication](https://docs.openaq.org/using-the-api/api-key).
