export default function ForecastSlider({ forecast, times = [], selectedAt, onChange, loading, error, dispersionStatus, plumeCount }) {
  const index = Math.max(0, times.indexOf(selectedAt));
  return (
    <section aria-label="Forecast timeline" className="absolute bottom-6 left-20 right-4 sm:right-auto sm:w-[460px] z-[500] rounded-2xl bg-gray-950/95 text-gray-200 border border-gray-700 p-4 shadow-xl">
      <div className="flex justify-between gap-3 text-sm font-semibold">
        <span>Forecast timeline</span>
        <time className="text-cyan-300 text-xs">{selectedAt ? new Date(selectedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'Unavailable'}</time>
      </div>
      <input aria-label="Forecast valid time" type="range" className="w-full my-3 accent-cyan-400" min="0" max={Math.max(0, times.length - 1)} step="1" value={index} disabled={times.length < 2} onChange={e => onChange(times[Number(e.target.value)])} />
      <div className="text-xs space-y-1 text-gray-400">
        {loading || forecast?.status === 'loading' ? <p>Loading forecasts independently of observations…</p> : null}
        {error || forecast?.status === 'unavailable' ? <p className="text-amber-300">Forecast unavailable{error ? `: ${error}` : '. Provider did not return data.'}</p> : null}
        {forecast?.stale && <p className="text-amber-300">Cached forecast is stale{forecast.refreshing ? '; refreshing' : ''}.</p>}
        {forecast?.status === 'available' && <>
          <p>Wind: {forecast.wind.status} · GFS / Open-Meteo · m/s</p>
          <p>PM2.5 &amp; US AQI: {forecast.air_quality.status} · CAMS Global (~45 km)</p>
          <p>25 regional sample points. AOD is column aerosol, not surface PM2.5.</p>
          <p>Retrieved {new Date(forecast.fetched_at).toLocaleString()} · model issue time not supplied.</p>
        </>}
        <p>{plumeCount ? `${plumeCount} HYSPLIT contours · relative dispersion` : 'No HYSPLIT contours for this time.'}</p>
        {dispersionStatus?.status === 'unavailable' && <p className="text-amber-300">Live dispersion is not configured. The historical HYSPLIT demo is available separately.</p>}
        <p>Sensors and fires remain dated observations; they do not predict future detections.</p>
      </div>
    </section>
  );
}
