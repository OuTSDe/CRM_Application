// Location for punch-in (1 Nov): "Office" and "Site" count only at Sky City; anywhere else the punch is logged as Remote.
// The browser asks once for permission. The server (Code.gs geoCheck_) makes the final call from the same numbers.
export function getLocation(timeout = 12000) {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null)
    navigator.geolocation.getCurrentPosition((p) => ok({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) }),
      () => ok(null), { enableHighAccuracy: true, timeout, maximumAge: 60000 })
  })
}
export function haversine(a1, o1, a2, o2) {
  const R = 6371000, t = Math.PI / 180, da = (a2 - a1) * t, dO = (o2 - o1) * t
  const h = Math.sin(da / 2) ** 2 + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dO / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const km = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m')
export function geoCheck(settings, loc, wanted) {
  const lat = Number(settings.officeLat), lng = Number(settings.officeLng), r = Number(settings.officeRadius || 300)
  if (!['office', 'site'].includes(wanted)) return { mode: wanted, where: wanted === 'remote' ? 'Remote (chosen)' : '', dist: null }
  if (!lat || !lng || settings.geofence === 'Off') return { mode: wanted, where: loc ? 'Recorded (Sky City point not set)' : 'Not checked', dist: null }
  if (!loc) return { mode: 'remote', where: 'Location not shared → logged as remote', dist: null }
  const dist = Math.round(haversine(lat, lng, loc.lat, loc.lng)), slack = Math.min(loc.acc || 0, 150)
  return dist <= r + slack ? { mode: wanted, where: `At Sky City (${dist} m)`, dist } : { mode: 'remote', where: `Away from Sky City (${km(dist)}) → logged as remote`, dist }
}
