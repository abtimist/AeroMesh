import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, Clock, ArrowLeft, Upload, Check, AlertCircle, ImageIcon, X } from 'lucide-react';
import { API_BASE, fetchJSON, useResource } from '../api';
import { validatePhoto, reportLocation, loadReportIds, addReportId, nearbyRecords, REPORT_IDS_KEY } from '../citizenReports';

const CITY_PRESETS = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Punjab / Ludhiana', lat: 30.9010, lon: 75.8573 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
];

function ReportResult({ id, onRemove }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stopped = false, timer;
    async function refresh() {
      try {
        const row = await fetchJSON(`/api/citizen/reports/${id}`);
        if (stopped) return;
        setReport(row);
        setError('');
        if (!['completed', 'failed'].includes(row.status)) {
          timer = setTimeout(refresh, 3000);
        }
      } catch (err) {
        if (!stopped) {
          setError(err.message || 'Report not found');
          // Only retry if it was a network glitch, not if the record was not found
          if (!err.message?.toLowerCase().includes('not found')) {
            timer = setTimeout(refresh, 10000);
          }
        }
      }
    }
    refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id]);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-cyan-300 break-all text-sm">Report ID: {id}</h3>
        <div className="flex items-center gap-2">
          {report && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {report.status}
            </span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-0.5 rounded-lg hover:bg-white/5"
              title="Remove from history"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 space-y-2">
          <p>{error}</p>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[11px] underline text-slate-400 hover:text-white"
            >
              Remove this missing ID from device history
            </button>
          )}
        </div>
      ) : !report ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent" />
          Loading report analysis…
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            Submitted {new Date(report.created_at).toLocaleString()}
          </p>
          <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
            <p>
              Coordinates: <strong className="text-white">{report.lat.toFixed(4)}°, {report.lon.toFixed(4)}°</strong>
              {' '}({report.location_source})
              {report.accuracy_m != null ? ` ±${Math.round(report.accuracy_m)} m` : ''}
            </p>
          </div>

          {report.error && <p role="alert" className="text-amber-300 text-sm">{report.error}</p>}

          {report.result && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span>Model AI Classification:</span>
                <strong className={`uppercase font-bold tracking-wide ${
                  report.result.label === 'fire' ? 'text-orange-400' :
                  report.result.label === 'smoke' ? 'text-amber-300' : 'text-emerald-400'
                }`}>
                  {report.result.label} ({(report.result.score * 100).toFixed(1)}%)
                </strong>
              </div>

              {report.result.scores && (
                <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1">
                  {Object.entries(report.result.scores).map(([label, score]) => (
                    <div key={label} className="bg-slate-900/80 p-1.5 rounded-lg border border-white/5">
                      <div className="text-slate-400 capitalize">{label}</div>
                      <div className="font-semibold text-slate-200">{(score * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-300 bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/20">
                {report.result.interpretation}
              </p>
              <p className="text-[10px] text-slate-500">
                {report.result.model} · {report.result.inference_ms} ms inference
              </p>
            </div>
          )}

          {report.event_id && (
            <div className="space-y-2 mt-3 p-3.5 bg-blue-900/30 rounded-xl border border-blue-500/40">
              <p className="text-xs text-blue-200">
                Linked event <strong>#{report.event_id}</strong> is active on the operational map.
              </p>
              <Link
                to={`/map?event=${report.event_id}`}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-lg"
              >
                View on Map
              </Link>
            </div>
          )}

          {report.image_url && (
            <a
              href={API_BASE + report.image_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1 mt-1"
            >
              <ImageIcon size={14} /> View submitted photo
            </a>
          )}
        </>
      )}
    </article>
  );
}

export default function CitizenPortalPage() {
  const [tab, setTab] = useState('report');
  const [location, setLocation] = useState({ source: 'manual', lat: 28.6139, lon: 77.2090 });
  const [latInput, setLatInput] = useState('28.6139');
  const [lonInput, setLonInput] = useState('77.2090');
  const [locationError, setLocationError] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ids, setIds] = useState(() => loadReportIds(localStorage));

  const model = useResource('/api/citizen/model', 60000);
  const conditions = useResource(
    location ? `/api/citizen/conditions?lat=${location.lat}&lon=${location.lon}` : null,
    600000
  );
  const events = useResource(tab === 'nearby' ? '/api/data/events?node=all' : null, 60000);
  const nearby = nearbyRecords(events.data || [], location);

  // Handle GPS location request
  function gps() {
    setGpsBusy(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('GPS hardware is unavailable. Select a city preset below or enter coordinates.');
      setGpsBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      p => {
        const newLoc = {
          source: 'gps',
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy_m: p.coords.accuracy,
        };
        setLocation(newLoc);
        setLatInput(p.coords.latitude.toFixed(4));
        setLonInput(p.coords.longitude.toFixed(4));
        setLocationError('');
        setGpsBusy(false);
      },
      _e => {
        setLocationError(
          'Browser permissions policy restricts direct GPS in preview frames. Use the quick presets below or enter coordinates directly.'
        );
        setGpsBusy(false);
      },
      { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
    );
  }

  // Handle setting a city preset
  function selectPreset(preset) {
    const newLoc = { source: 'preset', lat: preset.lat, lon: preset.lon };
    setLocation(newLoc);
    setLatInput(String(preset.lat));
    setLonInput(String(preset.lon));
    setLocationError('');
  }

  // Handle manual coordinate changes
  function handleManualApply() {
    try {
      const parsed = reportLocation({ source: 'manual', lat: latInput, lon: lonInput });
      setLocation(parsed);
      setLocationError('');
    } catch (err) {
      setLocationError(err.message);
    }
  }

  function removeId(idToRemove) {
    const next = ids.filter(id => id !== idToRemove);
    setIds(next);
    try {
      localStorage.setItem(REPORT_IDS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  // File selection handler
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validatePhoto(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function handleRemovePhoto() {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Form submission
  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!selectedFile) {
      setError('Please upload a photo of the smoke or fire observation.');
      return;
    }

    if (!location) {
      setError('Please confirm your location coordinates.');
      return;
    }

    const photoError = validatePhoto(selectedFile);
    if (photoError) {
      setError(photoError);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.set('photo', selectedFile);
      formData.set('lat', String(location.lat));
      formData.set('lon', String(location.lon));
      formData.set('location_source', location.source || 'manual');
      if (location.accuracy_m != null) {
        formData.set('accuracy_m', String(location.accuracy_m));
      }
      formData.set('description', description);

      const result = await fetchJSON('/api/citizen/reports', {
        method: 'POST',
        body: formData,
      });

      const next = addReportId(ids, result.id);
      setIds(next);
      try {
        localStorage.setItem(REPORT_IDS_KEY, JSON.stringify(next));
      } catch {
        setNotice('Browser storage is unavailable; save your report ID before leaving.');
      }

      // Reset file and switch to history to view analysis
      handleRemovePhoto();
      setDescription('');
      setTab('history');
    } catch (err) {
      setError(err.message || 'Report submission failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const weather = conditions.data?.weather;
  const air = conditions.data?.air_quality;

  return (
    <main className="min-h-screen overflow-y-auto bg-slate-950 text-slate-100 px-4 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm">
          <ArrowLeft size={18} /> AeroMesh home
        </Link>

        <header>
          <h1 className="text-3xl font-bold tracking-tight">Citizen Observation Portal</h1>
          <p className="text-slate-400 mt-1.5 text-sm">
            Report visible smoke plumes or agricultural burn fires for immediate automated AI analysis and field dispatch.
          </p>
        </header>

        {/* Location Section */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/70 to-slate-900 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-base text-white">
              <MapPin size={20} className="text-cyan-400" /> Observation Location
            </h2>
            <button
              onClick={gps}
              disabled={gpsBusy}
              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-xl transition-colors shadow-md flex items-center gap-1.5"
            >
              {gpsBusy ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  Locating…
                </>
              ) : (
                'Use GPS'
              )}
            </button>
          </div>

          {/* Location Presets for fast 1-click selection */}
          <div className="space-y-1.5">
            <div className="text-xs text-slate-400">Quick presets:</div>
            <div className="flex flex-wrap gap-2">
              {CITY_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                    location?.lat === preset.lat && location?.lon === preset.lon
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5'
                  }`}
                >
                  📍 {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Coordinate Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Latitude (-90 to 90)</label>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={latInput}
                onChange={e => {
                  setLatInput(e.target.value);
                  const latNum = parseFloat(e.target.value);
                  const lonNum = parseFloat(lonInput);
                  if (!isNaN(latNum) && !isNaN(lonNum) && Math.abs(latNum) <= 90 && Math.abs(lonNum) <= 180) {
                    setLocation({ source: 'manual', lat: latNum, lon: lonNum });
                    setLocationError('');
                  }
                }}
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                placeholder="e.g. 28.6139"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Longitude (-180 to 180)</label>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={lonInput}
                onChange={e => {
                  setLonInput(e.target.value);
                  const latNum = parseFloat(latInput);
                  const lonNum = parseFloat(e.target.value);
                  if (!isNaN(latNum) && !isNaN(lonNum) && Math.abs(latNum) <= 90 && Math.abs(lonNum) <= 180) {
                    setLocation({ source: 'manual', lat: latNum, lon: lonNum });
                    setLocationError('');
                  }
                }}
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                placeholder="e.g. 77.2090"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-end">
              <button
                type="button"
                onClick={handleManualApply}
                className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-xl py-2 text-xs font-semibold transition-colors"
              >
                Set
              </button>
            </div>
          </div>

          {location && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl">
              <Check size={14} className="shrink-0" />
              <span>
                Confirmed: <strong>{location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E</strong> ({location.source})
                {location.accuracy_m != null ? ` ±${Math.round(location.accuracy_m)} m` : ''}
              </span>
            </div>
          )}

          {locationError && (
            <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl" role="alert">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{locationError}</span>
            </div>
          )}
        </section>

        {/* Local Meteorological Forecast */}
        {location && (
          <section aria-label="Local forecast" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs space-y-2">
            <h2 className="font-semibold text-slate-200">Local Meteorological Forecast</h2>
            {conditions.loading && <p className="text-slate-400 animate-pulse">Fetching localized meteorological conditions…</p>}
            {conditions.error && <p role="alert" className="text-amber-300">{conditions.error}</p>}
            {weather && (
              <p className="text-slate-300">
                Weather: {weather.status === 'available' ? `${weather.current.temperature_2m ?? 'Unavailable'} °C · wind ${weather.current.wind_speed_10m ?? 'Unavailable'} m/s · ${weather.current.wind_direction_10m ?? 'Unavailable'}°` : 'Operational'} · {weather.source || 'Open-Meteo'}
              </p>
            )}
            {air && (
              <p className="text-slate-300">
                Air: {air.status === 'available' ? `PM2.5 ${air.current.pm2_5 ?? 'Unavailable'} µg/m³ · US AQI ${air.current.us_aqi ?? 'Unavailable'}` : 'Operational'}
              </p>
            )}
          </section>
        )}

        {/* Navigation Tabs */}
        <nav className="flex gap-2" aria-label="Citizen portal tabs">
          {[
            ['report', Camera, 'New report'],
            ['history', Clock, `My reports (${ids.length})`],
            ['nearby', MapPin, 'Nearby events'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`flex flex-1 justify-center items-center gap-2 p-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                tab === key ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {notice && (
          <div className="text-xs text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-500/30" role="status">
            {notice}
          </div>
        )}

        {/* Tab 1: New Report Form */}
        {tab === 'report' && (
          <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5 shadow-2xl">
            <h2 className="text-xl font-bold">Submit a Photo for Analysis</h2>
            <p className="text-xs text-slate-400">
              Photos are processed locally using the Siglip-2 Multimodal vision model to classify smoke, flame, or normal conditions.
            </p>

            {/* Custom Photo Upload Card - Completely eliminates native "Choose File" / "No file chosen" */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Observation Photo <span className="text-red-400">*</span>
              </label>

              {/* Hidden native input */}
              <input
                ref={fileInputRef}
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                /* Empty Upload Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group cursor-pointer rounded-2xl border-2 border-dashed border-white/20 hover:border-cyan-400/80 bg-slate-900/60 hover:bg-slate-900/90 p-8 text-center transition-all duration-200"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      Click to upload photo or drag & drop
                    </p>
                    <p className="text-xs text-slate-400">
                      Supports JPEG, PNG, or WebP (max 10 MB)
                    </p>
                  </div>
                </div>
              ) : (
                /* Selected File Card with Thumbnail Preview */
                <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-4 flex items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Upload preview"
                        className="w-16 h-16 object-cover rounded-xl border border-white/10 shrink-0 shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <Check size={14} /> Ready for analysis
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 transition-colors"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                What did you observe? <span className="text-slate-500">(Optional)</span>
              </label>
              <textarea
                name="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="e.g. Stubble fire plume blowing northeast toward the highway..."
                className="w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {model.data?.status !== 'ready' && (
              <p className="text-amber-300 text-xs">
                {model.error || 'Initializing model vision pipeline…'}
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-500/40" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !location || !selectedFile}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-2xl p-3.5 text-sm transition-all shadow-xl hover:shadow-blue-500/25 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Uploading & analyzing observation…
                </>
              ) : (
                'Submit Report for AI Classification'
              )}
            </button>
          </form>
        )}

        {/* Tab 2: My Reports History */}
        {tab === 'history' && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Saved Reports on this Device</h2>
            <p className="text-xs text-slate-400">
              Report IDs act as secure private viewing tokens. Keep them stored safely.
            </p>
            {!ids.length && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
                No reports submitted yet on this device. Click &quot;New report&quot; to submit one.
              </div>
            )}
            {ids.map(id => (
              <ReportResult key={id} id={id} onRemove={() => removeId(id)} />
            ))}
          </section>
        )}

        {/* Tab 3: Nearby Events */}
        {tab === 'nearby' && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Recorded Events Within 50 km</h2>
            {!location ? (
              <p className="text-sm text-slate-400">Set your report location first to view nearby events.</p>
            ) : events.error ? (
              <p role="alert" className="text-amber-300 text-sm">{events.error}</p>
            ) : events.loading ? (
              <p className="text-sm text-slate-400 animate-pulse">Loading satellite detections…</p>
            ) : nearby.length ? (
              <div className="space-y-2">
                {nearby.slice(0, 50).map(e => (
                  <article key={e.id} className="rounded-2xl bg-white/5 border border-white/5 p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        #{e.id} · {e.event_type?.replaceAll('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {e.detected_at ? new Date(e.detected_at).toLocaleString() : 'Time unavailable'} · {e.source}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950/50 px-2.5 py-1 rounded-full border border-cyan-500/20">
                      {e.distance_km.toFixed(1)} km
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No recorded thermal events within 50 km.</p>
            )}
            <Link className="block text-cyan-400 hover:text-cyan-300 underline text-xs" to="/map">
              Open interactive dashboard map →
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
