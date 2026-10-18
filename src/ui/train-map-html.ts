/** One station for the live map: code, name, position, stop or not, arrival/departure (epoch ms), passed. */
export type MapStation = { c: string; n: string; lat: number; lon: number; s: 0 | 1; a?: number; d?: number; p: 0 | 1 };

/**
 * A self-contained MapLibre page: tilted 3D view with terrain relief
 * (Carto basemap, AWS elevation tiles, no API keys), the route, a flag with
 * the code at every stop, a red pin at every station the train runs
 * through, and the train moving in real time (it works out its own
 * position every frame from the stations' times, so no messages from the
 * app are needed). offset = the app clock minus the real clock (for ?at=).
 */
export function trainMapHtml(opts: { stations: MapStation[]; from: number; to: number; offset: number; dark: boolean; caption: string; moving: boolean }) {
  const { dark } = opts;
  const style = `https://basemaps.cartocdn.com/gl/${dark ? "dark-matter" : "positron"}-gl-style/style.json`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
html,body,#m{margin:0;height:100%;background:${dark ? "#0A0F1C" : "#EDE9E0"};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.flag{position:relative;width:2px;height:30px;background:${dark ? "#cfd6e4" : "#3b4252"};transform-origin:bottom}
.flag span{position:absolute;left:2px;top:0;padding:2px 5px 2px 4px;font:800 10px/1.2 system-ui,sans-serif;color:#fff;background:#2446C7;border-radius:0 4px 4px 0;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)}
.flag.done span{background:#7a8496}.flag.ours span{background:#E07B1F}
.flag:after{content:"";position:absolute;bottom:-3px;left:-3px;width:8px;height:8px;border-radius:50%;background:inherit}
.train{width:46px;height:46px;display:flex;align-items:center;justify-content:center}
.train svg{filter:drop-shadow(0 6px 6px rgba(0,0,0,.45))}
.pulse{position:absolute;width:46px;height:46px;border-radius:50%;background:rgba(243,160,75,.35);animation:p 1.8s ease-out infinite}
@keyframes p{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.6);opacity:0}}
.chip{position:absolute;left:10px;right:10px;top:10px;padding:8px 12px;border-radius:14px;background:${dark ? "rgba(18,26,43,.88)" : "rgba(255,255,255,.92)"};color:${dark ? "#EEF1F7" : "#0E1726"};font:700 13px/1.3 system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.2)}
.btns{position:absolute;right:10px;bottom:24px;display:flex;flex-direction:column;gap:8px}
.btns button{border:0;border-radius:12px;padding:9px 12px;font:700 12px system-ui,sans-serif;background:${dark ? "#1A2438" : "#fff"};color:${dark ? "#EEF1F7" : "#0E1726"};box-shadow:0 2px 8px rgba(0,0,0,.25)}
.btns button.on{background:#2446C7;color:#fff}
.maplibregl-ctrl-attrib{font-size:9px}
</style></head><body><div id="m"></div><div class="chip" id="chip"></div>
<div class="btns"><button id="follow" class="${opts.moving ? "on" : ""}">Follow</button><button id="all">Whole route</button></div>
<script>
var S=${JSON.stringify(opts.stations)},FROM=${opts.from},TO=${opts.to},OFFSET=${opts.offset},MOVING=${opts.moving};
document.getElementById('chip').textContent=${JSON.stringify(opts.caption)};
var coords=S.map(function(s){return [s.lon,s.lat]});
function now(){return Date.now()+OFFSET}
function brg(a,b){var r=Math.PI/180,y=Math.sin((b.lon-a.lon)*r)*Math.cos(b.lat*r),x=Math.cos(a.lat*r)*Math.sin(b.lat*r)-Math.sin(a.lat*r)*Math.cos(b.lat*r)*Math.cos((b.lon-a.lon)*r);return (Math.atan2(y,x)/r+360)%360}
// Same rule as the app: halted at a station between arrival and departure, else part way between two by time.
function pos(t){
  if(!MOVING){var k=Math.max(0,S.map(function(s){return s.p}).lastIndexOf(1));if(t<(S[0].d||0))k=0;return {lat:S[k].lat,lon:S[k].lon,b:brg(S[k],S[Math.min(k+1,S.length-1)]),i:k}}
  if(t<(S[0].d||0))return {lat:S[0].lat,lon:S[0].lon,b:brg(S[0],S[1]),i:0};
  for(var i=0;i<S.length-1;i++){var a=S[i],b=S[i+1],t0=a.d!=null?a.d:a.a,t1=b.a!=null?b.a:b.d;
    if(a.a!=null&&a.a<=t&&t<t0)return {lat:a.lat,lon:a.lon,b:brg(a,b),i:i};
    if(t0!=null&&t1!=null&&t0<=t&&t<t1){var f=(t-t0)/Math.max(1,t1-t0);return {lat:a.lat+(b.lat-a.lat)*f,lon:a.lon+(b.lon-a.lon)*f,b:brg(a,b),i:i,f:f}}}
  var l=S[S.length-1];return {lat:l.lat,lon:l.lon,b:brg(S[S.length-2]||l,l),i:S.length-1};
}
var start=pos(now()),flags={};
// New times and statuses from the app (same route, same order): no reload, the train just carries on.
window.update=function(u){S=u.stations;MOVING=u.moving;document.getElementById('chip').textContent=u.caption;
  Object.keys(flags).forEach(function(i){flags[i].className='flag'+(S[i].p?' done':'')+(+i===FROM||+i===TO?' ours':'')})};
window.addEventListener('message',function(e){if(e.data&&e.data.stations)window.update(e.data)});
var map=new maplibregl.Map({container:'m',style:'${style}',center:[78.5,23.5],zoom:3.6,pitch:0,bearing:0,attributionControl:{compact:true},maxPitch:75});
var follow=MOVING;
map.on('dragstart',function(){setFollow(false)});
function setFollow(v){follow=v;document.getElementById('follow').className=v?'on':''}
document.getElementById('follow').onclick=function(){setFollow(!follow);if(follow)chase(1200)};
document.getElementById('all').onclick=function(){setFollow(false);var b=new maplibregl.LngLatBounds();coords.forEach(function(c){b.extend(c)});map.fitBounds(b,{padding:60,pitch:30,bearing:0,duration:1500})};
var trainEl=document.createElement('div');trainEl.className='train';
trainEl.innerHTML='<div class="pulse"></div><svg width="30" height="44" viewBox="0 0 30 44"><rect x="3" y="4" width="24" height="38" rx="9" fill="#E07B1F" stroke="#fff" stroke-width="2"/><rect x="7" y="8" width="16" height="9" rx="3" fill="#0E1A3A"/><rect x="7" y="21" width="16" height="3" rx="1.5" fill="#fff" opacity=".85"/><rect x="7" y="28" width="16" height="3" rx="1.5" fill="#fff" opacity=".85"/><circle cx="10" cy="38" r="2" fill="#FFE08A"/><circle cx="20" cy="38" r="2" fill="#FFE08A"/></svg>';
var train=new maplibregl.Marker({element:trainEl,rotationAlignment:'map',pitchAlignment:'map'}).setLngLat([start.lon,start.lat]).setRotation(start.b);
function chase(ms){var p=pos(now());map.easeTo({center:[p.lon,p.lat],zoom:Math.max(map.getZoom(),10.5),pitch:60,bearing:p.b,duration:ms})}
map.on('load',function(){
  try{map.addSource('dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:12,attribution:'Terrain: Mapzen, AWS'});
    map.addLayer({id:'hills',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':0.35,'hillshade-shadow-color':'${dark ? "#000000" : "#6b6253"}'}});
    map.setTerrain({source:'dem',exaggeration:1.4});}catch(e){}
  map.addSource('route',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:coords}}});
  map.addSource('ours',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:coords.slice(FROM,TO+1)}}});
  map.addSource('done',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:coords.slice(0,1)}}});
  map.addLayer({id:'route',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'${dark ? "#4a5670" : "#9aa3b2"}','line-width':4}});
  map.addLayer({id:'ours',type:'line',source:'ours',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#2446C7','line-width':6,'line-opacity':.85}});
  map.addLayer({id:'done',type:'line',source:'done',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#E07B1F','line-width':6}});
  map.addSource('pass',{type:'geojson',data:{type:'FeatureCollection',features:S.filter(function(s){return !s.s}).map(function(s){return {type:'Feature',properties:{c:s.c},geometry:{type:'Point',coordinates:[s.lon,s.lat]}}})}});
  map.addLayer({id:'pass',type:'circle',source:'pass',paint:{'circle-radius':['interpolate',['linear'],['zoom'],5,2,10,5],'circle-color':'#E53935','circle-stroke-color':'#fff','circle-stroke-width':1.2}});
  map.on('click','pass',function(e){var c=e.features[0].properties.c,s=S.find(function(x){return x.c===c});new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML('<b>'+s.c+'</b> '+s.n+'<br>No stop'+(s.d?' · passes ~'+new Date(s.d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Kolkata'}):'')).addTo(map)});
  // The flag sits inside the marker element: its own position:relative would override MapLibre's absolute positioning.
  S.forEach(function(s,i){if(!s.s)return;var el=document.createElement('div');el.title=s.n;el.innerHTML='<div class="flag'+(s.p?' done':'')+(i===FROM||i===TO?' ours':'')+'"><span>'+s.c+'</span></div>';flags[i]=el.firstChild;
    new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([s.lon,s.lat]).setPopup(new maplibregl.Popup({offset:28,closeButton:false}).setHTML('<b>'+s.c+'</b> '+s.n)).addTo(map)});
  train.addTo(map);
  // India overview first, then glide down to the train (or, before it leaves, to our part of the route).
  setTimeout(function(){if(MOVING)return chase(3500);var b=new maplibregl.LngLatBounds();coords.slice(FROM,TO+1).forEach(function(c){b.extend(c)});map.fitBounds(b,{padding:70,pitch:45,duration:3000})},600);
  var lastDone=-1;
  (function tick(){var p=pos(now());train.setLngLat([p.lon,p.lat]).setRotation(p.b);
    var k=p.i;if(k!==lastDone||p.f){lastDone=k;map.getSource('done').setData({type:'Feature',geometry:{type:'LineString',coordinates:coords.slice(0,k+1).concat([[p.lon,p.lat]])}})}
    requestAnimationFrame(tick)})();
  setInterval(function(){if(follow&&!map.isMoving())chase(1500)},4000);
});
</script></body></html>`;
}
