export type MapPoint = { lat: number; lon: number; label: string; color: string };

/** A self-contained Leaflet page (OpenStreetMap tiles: no API key needed). */
export function mapHtml(points: MapPoint[], dark: boolean) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%;background:${dark ? "#0A0F1C" : "#F4F1EA"}}
.pin{width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);color:#fff;font:800 11px system-ui,sans-serif;display:flex;align-items:center;justify-content:center}
.leaflet-control-attribution{font-size:9px}
${dark ? ".leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9)}" : ""}</style></head>
<body><div id="m"></div><script>
var pts=${JSON.stringify(points)};
var map=L.map('m',{zoomControl:false,attributionControl:true});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var b=[];
pts.forEach(function(p,i){
  var ll=[p.lat+i*0.00012,p.lon+i*0.00012]; b.push(ll);
  L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="pin" style="background:'+p.color+'">'+p.label+'</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
});
if(b.length){map.fitBounds(b,{padding:[50,50],maxZoom:15});}else{map.setView([24.5,82],4);}
</script></body></html>`;
}
