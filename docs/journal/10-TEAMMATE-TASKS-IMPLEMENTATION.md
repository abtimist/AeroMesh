# Teammate tasks 1–3: implementation and verification

Started: 29 September 2026. This is a new journal file; earlier journal entries are retained.
Each task is published as a separate commit after its checks. Local credentials, uploaded
images, downloaded model weights, and running databases are never committed.

## Task 1 — registration-free live transport and OpenAQ

### Research and decision

The READY API was intended to run event-specific atmospheric dispersion with meteorology,
release heights, release timing and resulting time-stamped contours. It was not needed to
obtain satellite images, air-quality observations or ordinary weather forecasts.

| Option | Finding | Decision for this Windows development app |
| --- | --- | --- |
| Registered NOAA READY | Remote HYSPLIT dispersion needs approved authentication. | Keep optional integration; do not invent credentials or bypass registration. |
| Unregistered HYSPLIT | NOAA permits forecast trajectories but restricts forecast plume concentrations in the unregistered version. | Not a no-registration substitute for full forecast dispersion. |
| FLEXPART | Genuine open-source 3-D transport, deposition and chemistry; requires its executable and prepared meteorological fields. | Strong future scientific-model choice, but not a drop-in free hosted API for this installation. |
| OpenDrift | Useful framework; its ChemicalDrift model primarily models aquatic contaminants. | Do not relabel an ocean model as validated smoke dispersion. |
| GFS + local passive-tracer calculation + CAMS | Public GFS forecast winds and existing regional CAMS forecasts work without NOAA registration. | Implement a bounded, transparent 2-D transport solver now. It is not HYSPLIT-equivalent or an objectively universal “optimal” model. |

Sources (primary documentation): [NOAA HYSPLIT capabilities](https://www.arl.noaa.gov/hysplit/),
[READY API guide](https://www.ready.noaa.gov/webapi/READY_Web_API_User_Guide_v0.7.0.pdf),
[FLEXPART](https://www.flexpart.eu/), [FLEXPART input preparation](https://www.flexpart.eu/processing.html),
[OpenDrift ChemicalDrift source](https://github.com/OpenDrift/opendrift/blob/master/opendrift/models/chemicaldrift.py),
[Open-Meteo GFS variables and units](https://open-meteo.com/en/docs/gfs-api),
[EPA dispersion model descriptions](https://www.epa.gov/scram/air-quality-dispersion-modeling-alternative-models).

### Implemented changes

- [Transport solver](../../backend/app/services/transport.py): 2,048 particles, 300-second
  integration, midpoint advection, spatial bilinear and temporal linear interpolation of
  eastward/northward wind components. Meteorological “from” directions become transport
  vectors using `u=-speed*sin(direction)`, `v=-speed*cos(direction)`.
- Downloads a genuine 5×5 event-centred GFS grid (2-degree sampling, ±4 degrees), validates
  units, time coverage, finite winds and grid completeness. No disconnected-grid interpolation,
  fallback wind or shifted historical data. Unsupported polar/dateline domains and particles
  leaving the downloaded domain fail explicitly.
- Constant horizontal diffusivity is a user-supplied assumption, not an inferred measurement.
  The reproducible stochastic increment is `sqrt(2*K*dt) * normal(0,1)` with a recorded seed.
  A unit release is introduced uniformly over the declared duration. Density is calculated
  from particles on fixed 5-km cells, mass-preserving smoothing and numerical contour extraction.
  One normalization peak is shared across frames. Hourly displays are instantaneous endpoints,
  not fabricated hourly means. No emission estimate, plume rise, vertical mixing, deposition,
  chemistry or calibrated surface concentration is claimed.
- [Transport API](../../backend/app/api/endpoints/dispersion.py): persisted input/result/status,
  bounded duration/start time/domain, one active local calculation, 12 scenarios/hour budget,
  restart recovery and explicit failure states. Existing NOAA submission remains separate.
  Operator token is enforced when configured or outside development mode. This single-process
  admission policy is not a distributed queue; multi-worker hosting requires shared admission control.
- [Live form](../../frontend/src/components/LiveTransportForm.jsx) in event evidence: input
  assumptions, start time, release duration and diffusivity; status polling; provenance and
  downloadable result including consumed weather, checksum and assumptions. Map/timeline labels
  distinguish local transport from NOAA HYSPLIT. Existing historical replay remains honestly labelled.
- [OpenAQ ingestion](../../backend/app/services/openaq_client.py): paginated PM2.5 discovery,
  prioritization by upstream last-report time, reuse of included sensor metadata, correct location
  vs sensor IDs, Unicode unit normalization, invalid/negative/nonfinite/future value rejection,
  idempotent readings and evidence records, refreshed station metadata. Discovery examines up to
  4,000 locations per region and ingests at most 100 selected stations: this is bounded coverage,
  not a claim of all global stations. Timestamps are retained unchanged.
- A process-wide 1.2-second request gate leaves headroom under OpenAQ's 60/minute limit;
  401/403/429 halt the sync, rate-limit cooldown is respected, and error categories are persisted
  without keys. `/api/data/providers/openaq` exposes provider health. Readings older than six
  hours are marked stale by the sensor API.
- Runtime dependencies add NumPy and contourpy. No environment secrets changed.

OpenAQ references: [latest measurements](https://docs.openaq.org/resources/latest),
[locations and included sensors](https://docs.openaq.org/api/operations/locations_get_v3_locations_get),
[rate limits](https://docs.openaq.org/using-the-api/rate-limits).

### Validation and observed results

- `python -m unittest tests.test_transport tests.test_openaq tests.test_real_data tests.test_demo -v`:
  **26 tests passed**. Covers analytic constant-wind displacement, calm winds, mass conservation,
  deterministic diffusion, space/time interpolation, domain rejection, incomplete provider responses,
  from-direction conversion, Unicode units, zero readings, deduplication and rate-limit stopping,
  plus existing query/provenance/NOAA/replay regressions. Synthetic forcing is confined to tests.
- `npm --prefix frontend run build`: passed. `npm --prefix frontend run lint`: exited 0;
  existing warnings in unrelated UI code remained (not represented as a warning-free result).
- `python -m scripts.check_task1_live` at 2026-09-29 05:03 UTC: current GFS data produced
  **6 hourly endpoints / 22 contours**, with grid mass 0.9999999999999999. Input checksum
  `b2051ed97808400cebf4eba05f29a968ec2b375470ca51ff562b46707de00c8b`.
  This was an explicitly hypothetical Delhi release used to verify real forcing, not a claimed fire.
- HTTP lifecycle test for existing event 693: accepted as LOCAL_RUNNING, then persisted
  COMPLETED with **2 frames / 8 contours**, no error. This was explicitly labelled a current-time
  release scenario at the observed coordinate; continuing burning was not asserted as observation.
- Live OpenAQ now returns **401 / invalid_credentials**, saved and exposed accurately. An earlier
  28 September probe returned 200 with an empty latest series for an old station. The current
  failure cannot be repaired with client logic: the account owner must provide an accepted key.
  No successful live OpenAQ ingestion is claimed for the final verification.
- PostgreSQL and frontend/backend restarted; map loads with real GFS/CAMS forecast status.

### Scientific and operational boundary

The completed software provides a real calculation from real forecast inputs. It is not a
scientifically validated replacement for 3-D HYSPLIT/FLEXPART or proof of actual smoke/health
exposure. Diffusion, near-surface transport and release timing remain explicit scenario inputs.
Full 3-D dispersion and OpenAQ credential activation are external follow-up requirements, not
hidden fake outputs. Public Open-Meteo usage remains subject to its service terms and quotas.

## Task 2 — citizen analysis and dispatch

Implementation and verification in progress; results will be appended before its commit.

## Task 3 — wind performance and data accuracy

Implementation and verification in progress; results will be appended before its commit.
