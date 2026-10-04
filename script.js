/* global maplibregl */
const SETTINGS_KEY = "ultratracker-settings";
const state = { metric: false, dark: false, style: "streets", is2D: false, mapCamera: null, pendingPitch: null, route: [], profile: [], checkpoints: [], runner: [], selection: null, brushDomain: null, map: null, marker: null, stationLabels: [], terrainReady: false };
const MILES_PER_METER = 0.000621371;
const styles = {
  streets: { name: "OpenStreetMap", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], attribution: "© OpenStreetMap contributors", maxzoom: 19 },
  topo: { name: "OpenTopoMap", tiles: ["https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png"], attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors", maxzoom: 17 },
  imagery: { name: "Esri World Imagery", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Tiles © Esri", maxzoom: 18 }
};
// Official aid-station table supplied by the race. Values are shown verbatim
// in station popups; Summit 1 has a separate second-course-visit record.
const aidStationDetails = {
  1:{leg:"8.44 mi",elevation:"3,116+ / 144-",total:"8.44 mi",leadEta:"Fri 10:45 AM",leadTotal:"1:45",cutoff:"Fri 2:00 PM",cutoffPace:"35:32",crew:"No",pacer:"No",dropBags:"Yes",medical:"Yes",vehicles:"0 (can hike up to cheer)"},
  2:{leg:"8.77 mi",elevation:"1,141+ / 3,092-",total:"17.21 mi",leadEta:"Fri 12:00 PM",leadTotal:"3:00:00",cutoff:"No cutoff · ETA Fri 6:00 PM",cutoffPace:"—",crew:"Water only",pacer:"No",dropBags:"No",medical:"—",vehicles:"0"},
  3:{leg:"6.86 mi",elevation:"265+ / 1,493-",total:"24.07 mi",leadEta:"Fri 1:15 PM",leadTotal:"4:15:00",cutoff:"Fri 9:00 PM",cutoffPace:"26:52",crew:"Yes",pacer:"No",dropBags:"Yes",medical:"Yes",vehicles:"1"},
  4:{leg:"15.39 mi",elevation:"1,840+ / 2,141-",total:"39.46 mi",leadEta:"Fri 4:00 PM",leadTotal:"7:00:00",cutoff:"Sat 4:30 AM",cutoffPace:"29:14",crew:"Yes",pacer:"No",dropBags:"Yes",medical:"—",vehicles:"1"},
  5:{leg:"12.75 mi",elevation:"731+ / 1,384-",total:"52.21 mi",leadEta:"Fri 6:00 PM",leadTotal:"9:00:00",cutoff:"Sat 10:00 AM",cutoffPace:"25:53",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"Yes",vehicles:"2"},
  6:{leg:"5.47 mi",elevation:"915+ / 738-",total:"57.68 mi",leadEta:"Fri 7:00 PM",leadTotal:"10:00:00",cutoff:"No cutoff · ETA Sat 12:30 PM",cutoffPace:"—",crew:"Water only",pacer:"No",dropBags:"No",medical:"—",vehicles:"0"},
  7:{leg:"10.07 mi",elevation:"1,228+ / 773-",total:"67.75 mi",leadEta:"Fri 8:30 PM",leadTotal:"11:30:00",cutoff:"Sat 5:00 PM",cutoffPace:"27:01",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"—",vehicles:"1"},
  8:{leg:"14.46 mi",elevation:"3,519+ / 1,888-",total:"82.21 mi",leadEta:"Fri 11:00 PM",leadTotal:"14:00:00",cutoff:"Sun 12:30 AM",cutoffPace:"31:07",crew:"No",pacer:"No",dropBags:"Yes",medical:"Yes",vehicles:"0"},
  9:{leg:"13.85 mi",elevation:"1,836+ / 2,919-",total:"96.06 mi",leadEta:"Sat 2:00 AM",leadTotal:"17:00:00",cutoff:"Sun 6:45 AM",cutoffPace:"27:04",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"—",vehicles:"1"},
  10:{leg:"10.09 mi",elevation:"1,275+ / 534-",total:"106.15 mi",leadEta:"Sat 4:00 AM",leadTotal:"19:00:00",cutoff:"Sun 11:30 AM",cutoffPace:"28:14",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"Yes",vehicles:"1"},
  11:{leg:"8.69 mi",elevation:"462+ / 1,124-",total:"114.84 mi",leadEta:"Sat 5:15 AM",leadTotal:"20:15:00",cutoff:"No cutoff · ETA Sun 3:00 PM",cutoffPace:"—",crew:"Water only",pacer:"No",dropBags:"No",medical:"—",vehicles:"0"},
  12:{leg:"9.18 mi",elevation:"245+ / 1,374-",total:"124.02 mi",leadEta:"Sat 7:30 AM",leadTotal:"22:30:00",cutoff:"Sun 6:45 PM",cutoffPace:"24:20",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"—",vehicles:"1"},
  13:{leg:"14.89 mi",elevation:"1,772+ / 2,035-",total:"138.91 mi",leadEta:"Sat 10:30 AM",leadTotal:"25:30:18",cutoff:"Mon 1:45 AM",cutoffPace:"28:12",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"Yes",vehicles:"2"},
  14:{leg:"15.3 mi",elevation:"1,595+ / 1,205-",total:"154.21 mi",leadEta:"Sat 1:17 PM",leadTotal:"28:16:51",cutoff:"Mon 9:00 AM",cutoffPace:"28:25",crew:"No",pacer:"No",dropBags:"Yes",medical:"Yes",vehicles:"0"},
  15:{leg:"8.24 mi",elevation:"1,298+ / 1,309-",total:"162.45 mi",leadEta:"Sat 2:57 PM",leadTotal:"29:56:37",cutoff:"Mon 1:00 PM",cutoffPace:"29:07",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"—",vehicles:"1"},
  16:{leg:"8.35 mi",elevation:"2,230+ / 2,110-",total:"170.8 mi",leadEta:"Sat 4:55 PM",leadTotal:"31:55:27",cutoff:"No cutoff · ETA Mon 6:00 PM",cutoffPace:"—",crew:"Water only",pacer:"No",dropBags:"No",medical:"—",vehicles:"0"},
  17:{leg:"3.59 mi",elevation:"599+ / 297-",total:"174.39 mi",leadEta:"Sat 5:41 PM",leadTotal:"32:40:51",cutoff:"Mon 8:00 PM",cutoffPace:"35:10",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"Yes",vehicles:"2"},
  18:{leg:"9.91 mi",elevation:"1,951+ / 1,817-",total:"184.3 mi",leadEta:"Sat 7:50 PM",leadTotal:"34:49:53",cutoff:"Tue 1:45 AM",cutoffPace:"34:48",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"Yes",vehicles:"1"},
  19:{leg:"12.98 mi",elevation:"1,878+ / 1,790-",total:"197.28 mi",leadEta:"Sat 10:45 PM",leadTotal:"37:44:55",cutoff:"Tue 9:10 AM",cutoffPace:"34:17",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"—",vehicles:"1"},
  20:{leg:"9.61 mi",elevation:"1,382+ / 264-",total:"206.89 mi",leadEta:"Sun 12:47 AM",leadTotal:"39:47:12",cutoff:"Tue 2:00 PM",cutoffPace:"30:10",crew:"Yes",pacer:"Yes",dropBags:"Yes",medical:"Yes",vehicles:"1"},
  summit2:{leg:"4.22 mi",elevation:"2,136+ / 10-",total:"211.11 mi",leadEta:"Sun 2:24 AM",leadTotal:"41:24:07",cutoff:"Tue 5:30 PM",cutoffPace:"49:45",crew:"No",pacer:"No",dropBags:"Yes",medical:"Yes",vehicles:"0 (can hike up to cheer)"}
};
const $ = (selector) => document.querySelector(selector);
// Trackleaders reports this race's pings in Pacific time. Keep the display in
// that race-local zone rather than converting timestamps to the viewer's zone.
const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric", timeZone: "America/Los_Angeles", timeZoneName: "short" });

function captureMapCamera() { if (!state.map) return; const center = state.map.getCenter(); state.mapCamera = { center: [center.lng, center.lat], zoom: state.map.getZoom(), bearing: state.map.getBearing(), pitch: state.is2D ? 0 : (state.pendingPitch ?? Math.max(1, state.map.getPitch())) }; }
function settingsSnapshot() { captureMapCamera(); return { metric: state.metric, dark: state.dark, style: state.style, is2D: state.is2D, selection: state.selection, mapCamera: state.mapCamera }; }
function applySettings(saved) { if (!saved || typeof saved !== "object") return; state.metric = saved.metric === true; state.dark = saved.dark === true; state.style = styles[saved.style] ? saved.style : "streets"; state.is2D = saved.is2D === true; state.selection = Array.isArray(saved.selection) && saved.selection.length === 2 && saved.selection.every(Number.isFinite) ? saved.selection : null; const camera = saved.mapCamera; state.mapCamera = camera && Array.isArray(camera.center) && camera.center.length === 2 && camera.center.every(Number.isFinite) && Number.isFinite(camera.zoom) && Number.isFinite(camera.bearing) && Number.isFinite(camera.pitch) ? camera : null; }
function saveSettings() { const saved = settingsSnapshot(); try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved)); } catch {} }
function restoreSettings() { try { applySettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")); } catch {} }
function syncSettingsControls() { document.documentElement.classList.toggle("dark", state.dark); $("#units-toggle").textContent = state.metric ? "KM / M" : "MI / FT"; $("#view-mode").textContent = state.is2D ? "3D view" : "2D view"; document.querySelectorAll("[data-style]").forEach(button => button.classList.toggle("active", button.dataset.style === state.style)); }

function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 3400); }
function rounded(value, digits = 1) { return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }); }
function distanceText(miles) { return state.metric ? `${rounded(miles * 1.60934)} km` : `${rounded(miles)} mi`; }
function elevationText(feet) { return !Number.isFinite(feet) ? "—" : state.metric ? `${Math.round(feet * .3048).toLocaleString()} m` : `${Math.round(feet).toLocaleString()} ft`; }
function paceText(minutesPerMile) { if (!Number.isFinite(minutesPerMile) || minutesPerMile <= 0 || minutesPerMile > 240) return "—"; const seconds = Math.round(minutesPerMile * 60); const unit = state.metric ? "/km" : "/mi"; const adjusted = state.metric ? seconds / 1.60934 : seconds; return `${Math.floor(adjusted / 60)}:${String(Math.round(adjusted % 60)).padStart(2, "0")} ${unit}`; }
function elapsedText(ms) { if (!Number.isFinite(ms) || ms < 0) return "—"; const m = Math.round(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), min = m % 60; return `${d ? `${d}d ` : ""}${h}h ${String(min).padStart(2, "0")}m`; }
function ageText(ms) { const m = Math.round(ms / 60000); return m < 2 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`; }
function haversine(a, b) { const r = 6371008.8, rad = Math.PI / 180, dLat = (b.lat-a.lat)*rad, dLng = (b.lng-a.lng)*rad, x = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2; return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x)); }

function lineDistanceAndProfile(points) {
  let miles = 0; return points.map((p, i) => { if (i) miles += haversine(points[i - 1], p) * MILES_PER_METER; return { ...p, mile: miles }; });
}
function reduceForProfile(points, count = 750) {
  if (points.length <= count) return points.slice(); const every = Math.ceil(points.length / count), reduced = points.filter((_, i) => i % every === 0); if (reduced.at(-1) !== points.at(-1)) reduced.push(points.at(-1)); return reduced;
}
function mapStyle() {
  const base = styles[state.style];
  return { version: 8, sources: {
    base: { type: "raster", tiles: base.tiles, tileSize: 256, attribution: base.attribution, maxzoom: base.maxzoom },
    terrain: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], tileSize: 256, encoding: "terrarium", maxzoom: 15, attribution: "Elevation tiles: AWS Terrain Tiles" }
  }, layers: [{ id: "base", type: "raster", source: "base"}, { id: "hillshade", type: "hillshade", source: "terrain", paint: { "hillshade-exaggeration": .35 } }] };
}
function initMap() {
  const savedCamera = state.mapCamera || { center: [-118.86, 37.72], zoom: 9.3, pitch: 58, bearing: -12 }, camera = { ...savedCamera, pitch: state.is2D ? 0 : Math.max(1, savedCamera.pitch) };
  state.map = new maplibregl.Map({ container: "map", style: mapStyle(), ...camera, maxPitch: 82, antialias: true });
  state.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  state.map.on("load", installMapLayers);
  state.map.on("style.load", installMapLayers);
  state.map.on("idle", sampleTerrain);
  state.map.on("moveend", () => { state.pendingPitch = null; saveSettings(); });
}
function installMapLayers() {
  const map = state.map; if (!state.route.length || map.getSource("course")) return;
  map.setTerrain({ source: "terrain", exaggeration: 1.55 });
  map.addSource("course", { type: "geojson", data: routeGeoJson() });
  map.addSource("stations", { type: "geojson", data: { type: "FeatureCollection", features: state.checkpoints.map(stationFeature) } });
  map.addSource("track", { type: "geojson", data: trackGeoJson() });
  map.addSource("runner-pings", { type: "geojson", data: runnerPointsGeoJson() });
  map.addSource("active-track", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "course-casing", type: "line", source: "course", paint: { "line-color": "#fbfcf8", "line-width": 7, "line-opacity": .88 } });
  map.addLayer({ id: "course-line", type: "line", source: "course", paint: { "line-color": "#2c403c", "line-width": 3 } });
  map.addLayer({ id: "runner-track", type: "line", source: "track", paint: { "line-color": "#e65038", "line-width": 3.5, "line-opacity": .9 } });
  map.addLayer({ id: "selected-runner-track", type: "line", source: "active-track", paint: { "line-color": "#f3c74d", "line-width": 6, "line-opacity": .82 } });
  map.addLayer({ id: "runner-points", type: "circle", source: "runner-pings", paint: { "circle-radius": 4.5, "circle-color": "#e65038", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff" } });
  map.addLayer({ id: "station-circles", type: "circle", source: "stations", paint: { "circle-radius": 6, "circle-color": "#f3c74d", "circle-stroke-color": "#203b36", "circle-stroke-width": 2 } });
  map.off("click", "station-circles", onStationClick); map.off("mouseenter", "station-circles", pointerCursor); map.off("mouseleave", "station-circles", clearCursor); map.on("click", "station-circles", onStationClick); map.on("mouseenter", "station-circles", pointerCursor); map.on("mouseleave", "station-circles", clearCursor);
  map.off("click", "runner-points", onRunnerClick); map.off("mouseenter", "runner-points", pointerCursor); map.off("mouseleave", "runner-points", clearCursor);
  map.on("click", "runner-points", onRunnerClick); map.on("mouseenter", "runner-points", pointerCursor); map.on("mouseleave", "runner-points", clearCursor);
  installStationLabels(); updateMapData();
}
function routeGeoJson() { return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: state.route.map(p => [p.lng, p.lat]) } }; }
function trackGeoJson() { return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: state.runner.map(p => [p.lng, p.lat]) } }; }
function runnerPointsGeoJson() { return { type: "FeatureCollection", features: state.runner.map(p => ({ type: "Feature", properties: { number: p.number, mile: p.mile, mph: p.mph, feet: p.feet, timeMs: p.timeMs, lowConfidence: p.lowConfidence }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) }; }
function stationFeature(s, index) { return { type: "Feature", properties: { ...s, stationIndex: index, shortName: s.name.replace(/^\d+:\s*/, "") }, geometry: { type: "Point", coordinates: [s.lng, s.lat] } }; }
function installStationLabels() { state.stationLabels.forEach(marker => marker.remove()); state.stationLabels = state.checkpoints.map((station, stationIndex) => { const label = document.createElement("button"); label.className = "station-map-label"; label.type = "button"; label.textContent = station.name.replace(/^\d+:\s*/, ""); label.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); showStation({ properties: { ...station, stationIndex, mile: station.mile }, geometry: { coordinates: [station.lng, station.lat] } }); }); return new maplibregl.Marker({ element: label, anchor: "top", offset: [0, 10] }).setLngLat([station.lng, station.lat]).addTo(state.map); }); }
function stationStops() { return state.checkpoints.flatMap((station, stationIndex) => [{ station, stationIndex, mile: Number(station.mile) }, ...(station.visits || []).map(mile => ({ station, stationIndex, mile: Number(mile) }))]).sort((a, b) => a.mile - b.mile); }
function stationDetails(station, mile) { const stops = stationStops(), index = stops.findIndex(stop => stop.station === station && Math.abs(stop.mile - mile) < .001), previous = stops[index - 1], next = stops[index + 1], total = state.route.at(-1)?.mile || 0, profilePoint = closestProfile(mile); return { previous, next, total, elevation: profilePoint?.elevation }; }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
function terrainSummary(from, to) { const distance = Math.max(.1, to - from), change = elevationChange(from, to), upPerMile = change.gain / distance, downPerMile = change.loss / distance; let type = "rolling / runnable"; if (upPerMile >= 800) type = "sustained climbing"; else if (downPerMile >= 800) type = "sustained descent"; else if (upPerMile >= 450 && downPerMile >= 450) type = "mountainous rolling"; else if (upPerMile >= 350) type = "climbing"; else if (downPerMile >= 350) type = "descending"; return { distance, gain: change.gain, loss: change.loss, type, factor: 1 + Math.min(.35, upPerMile / 1000 * .16) + Math.min(.1, downPerMile / 1000 * .04) }; }
function stationForecast(station) { const last = state.runner.at(-1); if (!last) return ""; const visits = [Number(station.mile), ...(station.visits || []).map(Number)].sort((a, b) => a - b), destination = visits.find(mile => mile > last.mile + .03); if (!destination) return `<div class="station-forecast"><b>Forecast</b><span>This station has already been passed.</span></div>`; const recent = state.runner.slice(-12), observed = movingPace(recent), fallback = paceBetween(state.runner[0], last), recentPace = Number.isFinite(observed) ? observed : fallback; if (!Number.isFinite(recentPace)) return ""; const recentTerrain = recent.length > 1 ? terrainSummary(recent[0].mile, recent.at(-1).mile) : { factor: 1 }, terrain = terrainSummary(last.mile, destination), normal = recentPace / recentTerrain.factor * terrain.factor, estimates = [["Slow", normal * 1.18], ["Normal", normal], ["Fast", normal * .88]].map(([label, pace]) => `<li><b>${label}</b><span>${paceText(pace)} · ${fmt.format(last.timeMs + pace * terrain.distance * 60000)}</span></li>`).join(""); return `<div class="station-forecast"><b>Terrain forecast · mile ${rounded(destination)}</b><span>${terrain.type} · ${elevationText(terrain.gain)} up · ${elevationText(terrain.loss)} down</span><ul>${estimates}</ul></div>`; }
function officialStationCard(station, mile) { const number = Number(station.name.match(/^\d+/)?.[0]), details = number === 1 && mile > 150 ? aidStationDetails.summit2 : aidStationDetails[number]; if (!details) return ""; const facts = [["Leg", details.leg], ["Table elevation", details.elevation], ["Total distance", details.total], ["First runner ETA", details.leadEta], ["First runner total", details.leadTotal], ["Cutoff", details.cutoff], ["Pace between cutoffs", details.cutoffPace], ["Crew access", details.crew], ["Pacer pickup/drop-off", details.pacer], ["Drop bags", details.dropBags], ["Medical", details.medical], ["Crew vehicles", details.vehicles]].map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join(""); return `<div class="station-reference"><b>Official aid-station details</b><dl>${facts}</dl></div>`; }
function showStation(feature) { const s = feature.properties, station = state.checkpoints[Number(s.stationIndex)], mile = Number(s.mile), detail = stationDetails(station, mile), allVisits = [mile, ...(station.visits || []).map(Number)].sort((a, b) => a - b), nextText = detail.next ? `${distanceText(detail.next.mile - mile)} to ${escapeHtml(detail.next.station.name.replace(/^\d+:\s*/, ""))}` : `${distanceText(Math.max(0, detail.total - mile))} to finish`, previousText = detail.previous ? `${distanceText(mile - detail.previous.mile)} from ${escapeHtml(detail.previous.station.name.replace(/^\d+:\s*/, ""))}` : `${distanceText(mile)} from start`, elevation = Number.isFinite(detail.elevation) ? `<br>Elevation ${elevationText(detail.elevation * 3.28084)}` : "", visits = allVisits.length > 1 ? `<br>Course visits: ${allVisits.map(value => `mile ${rounded(value)}`).join(" · ")}` : ""; new maplibregl.Popup({ offset: 10, maxWidth: "350px" }).setLngLat(feature.geometry.coordinates).setHTML(`<div class="station-popup"><b>${escapeHtml(station.name)}</b><span>Route mile ${rounded(mile)}${elevation}<br>${previousText}<br>${nextText}<br>${distanceText(Math.max(0, detail.total - mile))} remaining${visits}</span>${officialStationCard(station, mile)}${stationForecast(station)}</div>`).addTo(state.map); }
function onStationClick(event) { showStation(event.features[0]); }
function pointerCursor() { state.map.getCanvas().style.cursor = "pointer"; }
function clearCursor() { state.map.getCanvas().style.cursor = ""; }
function onRunnerClick(event) { const feature = event.features[0], p = feature.properties, index = state.runner.findIndex(item => item.number === Number(p.number)), prior = state.runner[index - 1], intervalPace = prior ? paceBetween(prior, state.runner[index]) : NaN, confidence = p.lowConfidence === true || p.lowConfidence === "true" ? "Review: farther than 200 m from the course" : "Good route match"; new maplibregl.Popup({ offset: 12 }).setLngLat(feature.geometry.coordinates).setHTML(`<div class="station-popup"><b>Point #${p.number}</b><span>${fmt.format(Number(p.timeMs))}<br>Route mile ${rounded(Number(p.mile))} · ${rounded(Number(p.mph))} mph<br>${Number(p.feet).toLocaleString()} ft since prior ping · ${paceText(intervalPace)}<br>${confidence}</span></div>`).addTo(state.map); }
function updateMapData() {
  const map = state.map; if (!map || !map.getSource("course")) return;
  map.getSource("course").setData(routeGeoJson()); map.getSource("track").setData(trackGeoJson()); map.getSource("runner-pings").setData(runnerPointsGeoJson());
  const active = activeRunnerPoints(); map.getSource("active-track").setData({ type:"FeatureCollection", features: active.length ? [{ type:"Feature", geometry:{type:"LineString", coordinates:active.map(p=>[p.lng,p.lat])}, properties:{} }] : [] });
  const last = state.runner.at(-1); if (last) { if (!state.marker) { const el = document.createElement("div"); el.className = "runner-marker"; state.marker = new maplibregl.Marker({ element: el }).setLngLat([last.lng, last.lat]).addTo(map); } else state.marker.setLngLat([last.lng, last.lat]); }
}
function sampleTerrain() {
  if (!state.map || !state.profile.length || !state.map.getTerrain() || state.terrainReady) return;
  let changes = 0; state.profile.forEach(p => { if (Number.isFinite(p.elevation)) return; const z = state.map.queryTerrainElevation([p.lng, p.lat], { exaggerated: false }); if (Number.isFinite(z)) { p.elevation = z; changes++; } });
  state.terrainReady = state.profile.every(p => Number.isFinite(p.elevation));
  if (changes) { drawProfile(); renderStats(); }
}

function nearestMile(point) { let best = { meters: Infinity, mile: 0 }; for (const routePoint of state.route) { const meters = haversine(point, routePoint); if (meters < best.meters) best = { meters, mile: routePoint.mile }; } return best; }
function normalizeRunner(points) { const scale = state.route.at(-1).mile / 217.7; return points.map(p => { const matching = nearestMile(p); const reported = Number.isFinite(p.routeMile) ? p.routeMile * scale : matching.mile; return { ...p, timeMs: Date.parse(p.time), mile: reported, matchDistance: matching.meters, lowConfidence: matching.meters > 200 }; }).sort((a,b) => a.timeMs - b.timeMs); }
function selectedBounds() { return state.selection || [0, state.route.at(-1)?.mile || 0]; }
function activeRunnerPoints() { const [a,b] = selectedBounds(); return state.runner.filter(p => p.mile >= a && p.mile <= b); }
function closestProfile(mile) { return state.profile.reduce((best, p) => Math.abs(p.mile-mile)<Math.abs(best.mile-mile) ? p : best, state.profile[0]); }
function elevationChange(a, b) { const inside = state.profile.filter(p => p.mile >= a && p.mile <= b && Number.isFinite(p.elevation)); let gain=0, loss=0; for(let i=1;i<inside.length;i++){ const d=(inside[i].elevation-inside[i-1].elevation)*3.28084; if(d>0)gain+=d; else loss-=d; } return { gain, loss }; }
function stat(label, value) { return `<div class="metric"><strong>${value}</strong><small>${label}</small></div>`; }
function renderStats() {
  const last = state.runner.at(-1), total = state.route.at(-1)?.mile || 0; if (!last) return;
  const now = Date.now(), age = now-last.timeMs, [a,b] = selectedBounds(), pts = activeRunnerPoints(), e = elevationChange(a,b);
  $("#progress-title").textContent = `${distanceText(last.mile)} of ${distanceText(total)}`;
  $("#freshness").textContent = ageText(age); $("#updated").textContent = `Latest ping ${fmt.format(last.timeMs)} · ${ageText(age)}`;
  const five = state.runner.slice(-6), fivePace = paceBetween(five[0], five.at(-1));
  $("#hero-stats").innerHTML = stat("Current tracker speed", `${rounded(last.mph)} mph`) + stat("Last 5 points", paceText(fivePace)) + stat("Distance remaining", distanceText(Math.max(0,total-last.mile))) + stat("Last ping", fmt.format(last.timeMs));
  const segmentDistance = Math.max(0,b-a), segmentPace = pts.length > 1 ? paceBetween(pts[0],pts.at(-1)) : NaN, elapsed = pts.length>1 ? pts.at(-1).timeMs-pts[0].timeMs : NaN;
  const moving = movingPace(pts); const off = pts.filter(p => p.lowConfidence).length;
  $("#selection-label").textContent = state.selection ? "SELECTED SECTION" : "FULL COURSE";
  $("#selection-title").textContent = state.selection ? `${distanceText(a)} – ${distanceText(b)}` : "Course statistics";
  $("#clear-selection").hidden = !state.selection;
  $("#selection-stats").innerHTML = stat("Course distance", distanceText(segmentDistance)) + stat("Elapsed time", elapsedText(elapsed)) + stat("Elapsed pace", paceText(segmentPace)) + stat("Moving pace", paceText(moving)) + stat("Elevation gain", elevationText(e.gain)) + stat("Elevation loss", elevationText(e.loss)) + stat("Tracker points", pts.length) + stat("GPS confidence", off ? `${off} review` : "good");
  const next = nextStation(last.mile); $("#next-station").textContent = next ? next.name : "Finish"; $("#next-station-detail").textContent = next ? `${distanceText(next.mile-last.mile)} away · mile ${rounded(next.mile)}` : "Course complete";
}
function paceBetween(first, last) { const miles = last.mile-first.mile, ms=last.timeMs-first.timeMs; return miles > .01 && ms>0 ? ms/60000/miles : NaN; }
function movingPace(points) { let ms=0, miles=0; for(let i=1;i<points.length;i++){const d=points[i].mile-points[i-1].mile, t=points[i].timeMs-points[i-1].timeMs; if(d>.015 && t>0 && t<45*60000){ms+=t;miles+=d;}} return miles ? ms/60000/miles : NaN; }
function nextStation(mile) { return state.checkpoints.flatMap(s => [s, ...(s.visits||[]).map(v=>({...s,mile:v}))]).filter(s=>s.mile>mile+.03).sort((a,b)=>a.mile-b.mile)[0]; }

function drawProfile() {
  const svg = $("#profile"), box = svg.getBoundingClientRect(), w = Math.max(100,box.width), h = Math.max(100,box.height), pad={l:0,r:0,t:10,b:8}; svg.setAttribute("viewBox",`0 0 ${w} ${h}`);
  const fullDomain = [0,state.route.at(-1)?.mile||1], [from,to] = state.selection || fullDomain, domain = state.brushDomain || (state.selection ? [from,to] : fullDomain); const points=state.profile.filter(p=>p.mile>=domain[0]&&p.mile<=domain[1]); if(!points.length)return;
  const elevations=points.map(p=>p.elevation).filter(Number.isFinite), elevationValues=elevations.length?elevations:[0,1], rawMin=Math.min(...elevationValues), rawMax=Math.max(...elevationValues), elevationPad=Math.max(25,(rawMax-rawMin)*.07), min=rawMin-elevationPad, max=rawMax+elevationPad, span=Math.max(1,max-min); const x=m=>pad.l+(m-domain[0])/(domain[1]-domain[0])*(w-pad.l-pad.r), y=z=>h-pad.b-(z-min)/span*(h-pad.t-pad.b); const path=points.map((p,i)=>`${i?"L":"M"}${x(p.mile).toFixed(1)},${y(p.elevation||min).toFixed(1)}`).join(" ");
  const runner=state.runner.filter(p=>p.mile>=domain[0]&&p.mile<=domain[1]).map(p=>`${x(p.mile).toFixed(1)},${y(closestProfile(p.mile).elevation||min).toFixed(1)}`).join(" ");
  const grid=[.2,.5,.8].map(f=>`<line class="grid-line" x1="0" x2="${w}" y1="${(h*f).toFixed(1)}" y2="${(h*f).toFixed(1)}"/>`).join("");
  const selection = state.selection && state.selection[1] > domain[0] && state.selection[0] < domain[1]
    ? `<rect class="profile-selection" x="${x(Math.max(domain[0], state.selection[0])).toFixed(1)}" y="0" width="${Math.max(1, x(Math.min(domain[1], state.selection[1])) - x(Math.max(domain[0], state.selection[0]))).toFixed(1)}" height="${h}"/>`
    : "";
  const stations = stationStops().filter(stop => stop.mile >= domain[0] && stop.mile <= domain[1]).map(stop => { const profilePoint = closestProfile(stop.mile), label = escapeHtml(stop.station.name.replace(/^\d+:\s*/, "")), stationX = x(stop.mile).toFixed(1), stationY = y(profilePoint.elevation || min).toFixed(1), labelY = Math.max(12, Number(stationY) - 8).toFixed(1), data = `data-station-index="${stop.stationIndex}" data-mile="${stop.mile}"`; return `<text class="profile-station-label" ${data} x="${stationX}" y="${labelY}" text-anchor="middle">${label}</text><circle class="profile-station" ${data} cx="${stationX}" cy="${stationY}" r="4"><title>${label} · ${distanceText(stop.mile)}</title></circle>`; }).join("");
  svg.innerHTML=`${grid}${selection}<path class="profile-line" d="${path}"/><polyline class="runner-profile" points="${runner}"/>${stations}`;
  svg.onpointerdown = (event)=>{ if (!profileStationClick(event)) startBrush(event, svg, domain); }; svg.onpointermove=(event)=>profileHover(event, svg, domain); svg.onpointerleave=()=>$("#profile-tooltip").hidden=true;
  $("#profile-title").textContent = state.selection ? `${distanceText(from)} to ${distanceText(to)}` : "Full course"; $("#profile-end").textContent=distanceText(state.route.at(-1)?.mile||0);
}
function profileMile(event, svg, domain) { const rect=svg.getBoundingClientRect(); return Math.max(domain[0],Math.min(domain[1], domain[0]+(event.clientX-rect.left)/rect.width*(domain[1]-domain[0]))); }
function profileStationClick(event) { const marker = event.target.closest?.(".profile-station, .profile-station-label"); if (!marker) return false; const station = state.checkpoints[Number(marker.dataset.stationIndex)]; if (!station) return false; event.preventDefault(); event.stopPropagation(); showStation({ properties: { ...station, stationIndex: marker.dataset.stationIndex, mile: Number(marker.dataset.mile) }, geometry: { coordinates: [station.lng, station.lat] } }); return true; }
function startBrush(event, svg, domain) { event.preventDefault(); const start=profileMile(event,svg,domain), dragDomain=domain.slice(); state.brushDomain=dragDomain; svg.setPointerCapture(event.pointerId); const move=e=>{ const current=profileMile(e,svg,dragDomain); if(Math.abs(current-start)>.1) { state.selection=[Math.min(start,current),Math.max(start,current)]; drawProfile(); renderStats(); updateMapData(); zoomToSelection(); } }; const end=e=>{ state.brushDomain=null; saveSettings(); drawProfile(); if(svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId); svg.removeEventListener("pointermove",move); svg.removeEventListener("pointerup",end); svg.removeEventListener("pointercancel",end); }; svg.addEventListener("pointermove",move); svg.addEventListener("pointerup",end); svg.addEventListener("pointercancel",end); }
function profileHover(event,svg,domain){ const mile=profileMile(event,svg,domain), p=closestProfile(mile), el=$("#profile-tooltip"), rect=svg.getBoundingClientRect(); el.hidden=false; el.style.left=`${event.clientX-rect.left}px`; el.style.top=`${event.clientY-rect.top}px`; el.textContent=`${distanceText(p.mile)} · ${elevationText((p.elevation||0)*3.28084)}`; }
function zoomToSelection(){ if(!state.selection||!state.map)return; const [a,b]=state.selection, pts=state.route.filter(p=>p.mile>=a&&p.mile<=b); if(pts.length<2)return; const bounds=pts.reduce((bb,p)=>bb.extend([p.lng,p.lat]),new maplibregl.LngLatBounds([pts[0].lng,pts[0].lat],[pts[0].lng,pts[0].lat])); state.map.fitBounds(bounds,{padding:65,maxZoom:14,duration:650,pitch:60}); }

function saveSnapshots(){ localStorage.setItem("ultratracker-snapshots",JSON.stringify(state.runner.slice(-500))); }
function loadSnapshots(){ try { return JSON.parse(localStorage.getItem("ultratracker-snapshots")||"[]"); } catch { return []; } }
async function getJSON(path){ const response=await fetch(path,{cache:"no-store"}); const result=await response.json(); if(!response.ok)throw new Error(result.error||response.statusText); return result; }
async function loadCourse(){ const [route,checks]=await Promise.all([getJSON("/api/route"),getJSON("/api/checkpoints")]); state.route=lineDistanceAndProfile(route.points); state.profile=reduceForProfile(state.route); state.checkpoints=checks.checkpoints; const total = state.route.at(-1)?.mile || 0; if (!state.selection || state.selection[0] < 0 || state.selection[1] > total || state.selection[0] >= state.selection[1]) state.selection = null; }
async function refreshRunner(initial=false){ const button=$("#refresh"); button.disabled=true; button.innerHTML="<span>↻</span> Refreshing"; try { const runner=await getJSON("/api/runner"); state.runner=normalizeRunner(runner.points); saveSnapshots(); if(state.map){ updateMapData(); sampleTerrain(); } renderStats(); drawProfile(); $("#status").textContent=`Tracking ${runner.runner} · ${state.runner.length} received points`; if(!initial)toast("Runner track refreshed"); } catch(error) { const saved=loadSnapshots(); if(saved.length && initial){ state.runner=normalizeRunner(saved); toast("Live refresh unavailable — showing saved snapshot"); renderStats(); drawProfile(); } else { toast(error.message); $("#status").textContent="Unable to refresh runner data"; } } finally { button.disabled=false; button.innerHTML="<span>↻</span> Refresh"; } }
function courseBounds() { return state.route.reduce((bounds, point) => bounds.extend([point.lng, point.lat]), new maplibregl.LngLatBounds([state.route[0].lng, state.route[0].lat], [state.route[0].lng, state.route[0].lat])); }
function resetMapView() { if (!state.map || !state.route.length) return; state.is2D = false; state.pendingPitch = 58; syncSettingsControls(); state.mapCamera = { ...state.mapCamera, pitch: 58, bearing: 0 }; saveSettings(); state.map.fitBounds(courseBounds(), { padding: 60, maxZoom: 11, duration: 650, bearing: 0, pitch: 58 }); }
function alignNorth() { if (state.map) { state.mapCamera = { ...state.mapCamera, bearing: 0 }; saveSettings(); state.map.easeTo({ bearing: 0, duration: 350 }); } }
function toggleViewMode() { if (!state.map) return; state.is2D = !state.is2D; state.pendingPitch = state.is2D ? 0 : 58; syncSettingsControls(); state.mapCamera = { ...state.mapCamera, pitch: state.pendingPitch }; saveSettings(); state.map.easeTo({ pitch: state.pendingPitch, duration: 450 }); }
function bindControls(){ $("#refresh").addEventListener("click",()=>refreshRunner()); $("#units-toggle").addEventListener("click",()=>{state.metric=!state.metric; syncSettingsControls(); saveSettings(); drawProfile();renderStats();}); $("#theme-toggle").addEventListener("click",()=>{state.dark=!state.dark;syncSettingsControls();saveSettings();drawProfile();}); document.querySelectorAll("[data-style]").forEach(button=>button.addEventListener("click",()=>{state.style=button.dataset.style;syncSettingsControls();saveSettings();state.map.setStyle(mapStyle());})); $("#reset-view").addEventListener("click",resetMapView); $("#north-view").addEventListener("click",alignNorth); $("#view-mode").addEventListener("click",toggleViewMode); $("#clear-selection").addEventListener("click",()=>{state.selection=null;saveSettings();drawProfile();renderStats();updateMapData();resetMapView();}); window.addEventListener("resize",drawProfile); }
async function boot(){ restoreSettings(); syncSettingsControls(); bindControls(); window.addEventListener("pagehide", saveSettings); try { await loadCourse(); initMap(); await refreshRunner(true); $("#status").textContent="Course loaded · fetching live runner track"; } catch(error) { $("#status").textContent="Could not load course data"; toast(error.message); } }
boot();
