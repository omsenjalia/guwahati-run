import { TRAIN_MODEL_JS } from "./train-model-js";

/** One station for the live map: code, name, position, stop or not, arrival/departure (epoch ms), passed. */
export type MapStation = { c: string; n: string; lat: number; lon: number; s: 0 | 1; a?: number; d?: number; p: 0 | 1 };

/**
 * A self-contained MapLibre page: tilted 3D view with terrain relief
 * (Carto basemap, AWS elevation tiles, no API keys), the route, a flag with
 * the code at every stop, a red pin at every station the train runs
 * through, and the train moving in real time. Flags, pins and the train are
 * map layers (drawn by the map itself), so they stay fixed on their
 * coordinates while the map is dragged, tilted or turned. The page works out the train's own
 * position every frame from the stations' times, so no messages from the
 * app are needed). offset = the app clock minus the real clock (for ?at=).
 */
export function trainMapHtml(opts: { stations: MapStation[]; from: number; to: number; offset: number; dark: boolean; caption: string; moving: boolean }) {
  const { dark } = opts;
  const style = `https://basemaps.cartocdn.com/gl/${dark ? "dark-matter" : "positron"}-gl-style/style.json`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/three@0.149.0/build/three.min.js"></script>
<style>
html,body,#m{margin:0;height:100%;background:${dark ? "#0A0F1C" : "#EDE9E0"};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
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
var start=pos(now()),DPR=2;
${TRAIN_MODEL_JS}
// Flag picture for a stop: pole, base dot and a coloured flag with the code (drawn once per code and colour).
function flagImg(code,color){var c=document.createElement('canvas'),x=c.getContext('2d');x.font='800 '+(10*DPR)+'px system-ui,sans-serif';
  var w=Math.ceil(x.measureText(code).width)+14*DPR,h=34*DPR;c.width=w;c.height=h;x=c.getContext('2d');
  x.fillStyle='${dark ? "#cfd6e4" : "#3b4252"}';x.fillRect(3*DPR,2*DPR,2*DPR,h-6*DPR);x.beginPath();x.arc(4*DPR,h-4*DPR,3.5*DPR,0,7);x.fill();
  x.fillStyle=color;x.fillRect(5*DPR,2*DPR,w-7*DPR,15*DPR);
  x.font='800 '+(10*DPR)+'px system-ui,sans-serif';x.fillStyle='#fff';x.textBaseline='middle';x.fillText(code,8*DPR,10*DPR);return x.getImageData(0,0,w,h)}
function flagId(s,i){var col=(i===FROM||i===TO)?'#E07B1F':s.p?'#7a8496':'#2446C7',id='f-'+s.c+'-'+col;if(!map.hasImage(id))map.addImage(id,flagImg(s.c,col),{pixelRatio:DPR});return id}
function stopsData(){return {type:'FeatureCollection',features:S.map(function(s,i){return s.s?{type:'Feature',properties:{i:i,img:flagId(s,i)},geometry:{type:'Point',coordinates:[s.lon,s.lat]}}:null}).filter(Boolean)}}
function trainImg(){var w=30*DPR,h=44*DPR,c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');
  function rr(X,Y,W,H,R,f){X*=DPR;Y*=DPR;W*=DPR;H*=DPR;R*=DPR;x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath();x.fillStyle=f;x.fill()}
  rr(2,3,26,40,10,'#fff');rr(4,5,22,36,8,'#E07B1F');rr(8,9,14,9,3,'#0E1A3A');rr(8,22,14,3,1.5,'rgba(255,255,255,.85)');rr(8,29,14,3,1.5,'rgba(255,255,255,.85)');
  x.fillStyle='#FFE08A';[10,20].forEach(function(cx){x.beginPath();x.arc(cx*DPR,38*DPR,2*DPR,0,7);x.fill()});return x.getImageData(0,0,w,h)}
function trainData(p){return {type:'Feature',properties:{b:p.b},geometry:{type:'Point',coordinates:[p.lon,p.lat]}}}
// New times and statuses from the app (same route, same order): no reload, the train just carries on.
window.update=function(u){S=u.stations;MOVING=u.moving;document.getElementById('chip').textContent=u.caption;if(map.getSource('stops'))map.getSource('stops').setData(stopsData())};
window.addEventListener('message',function(e){if(e.data&&e.data.stations)window.update(e.data)});
var map=new maplibregl.Map({container:'m',style:'${style}',center:[78.5,23.5],zoom:3.6,pitch:0,bearing:0,attributionControl:{compact:true},maxPitch:75});
var follow=MOVING;
map.on('dragstart',function(){setFollow(false)});
function setFollow(v){follow=v;document.getElementById('follow').className=v?'on':''}
document.getElementById('follow').onclick=function(){setFollow(!follow);if(follow)chase(1200)};
document.getElementById('all').onclick=function(){setFollow(false);var b=new maplibregl.LngLatBounds();coords.forEach(function(c){b.extend(c)});map.fitBounds(b,{padding:60,pitch:30,bearing:0,duration:1500})};
// Camera a little to the side of the train (three-quarter view): from straight behind it's only a thin bar.
function chase(ms){var p=pos(now());map.easeTo({center:[p.lon,p.lat],zoom:Math.max(map.getZoom(),12),pitch:60,bearing:p.b-60,duration:ms})}
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
  // Stops: flags standing up, pinned by their base to the station.
  map.addSource('stops',{type:'geojson',data:stopsData()});
  map.addLayer({id:'stops',type:'symbol',source:'stops',layout:{'icon-image':['get','img'],'icon-anchor':'bottom-left','icon-offset':[-4,4],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport','symbol-z-order':'source'}});
  map.on('click','stops',function(e){var s=S[e.features[0].properties.i];new maplibregl.Popup({closeButton:false}).setLngLat([s.lon,s.lat]).setHTML('<b>'+s.c+'</b> '+s.n).addTo(map)});
  // The train lies on the map, turned along the track, with a pulse under it.
  map.addImage('train',trainImg(),{pixelRatio:DPR});
  map.addSource('train',{type:'geojson',data:trainData(start)});
  map.addLayer({id:'pulse',type:'circle',source:'train',paint:{'circle-radius':14,'circle-color':'#F3A04B','circle-opacity':.35,'circle-pitch-alignment':'map'}});
  map.addLayer({id:'train',type:'symbol',source:'train',layout:{'icon-image':'train','icon-rotate':['get','b'],'icon-rotation-alignment':'map','icon-pitch-alignment':'map','icon-allow-overlap':true,'icon-ignore-placement':true}});
  // The 3D Vande Bharat replaces the flat icon and pulse (kept if three.js didn't load).
  var has3d=false;
  if(window.THREE){try{map.addLayer(trainLayer());map.setLayoutProperty('train','visibility','none');map.setLayoutProperty('pulse','visibility','none');has3d=true}catch(e){}}
  // India overview first, then glide down to the train (or, before it leaves, to our part of the route).
  setTimeout(function(){if(MOVING)return chase(3500);var b=new maplibregl.LngLatBounds();coords.slice(FROM,TO+1).forEach(function(c){b.extend(c)});map.fitBounds(b,{padding:70,pitch:45,duration:3000})},600);
  // Movement: the train's position is worked out from the clock each time the map draws (steady between
  // two stations by their times, waiting at a stop until it leaves). Redraw 20 times a second while it runs;
  // the covered line and the flat fallback icon only need a refresh once a second.
  setInterval(function(){if(!MOVING)return;if(has3d)map.triggerRepaint();else map.getSource('train').setData(trainData(pos(now())))},has3d?50:100);
  function slow(){var p=pos(now());
    map.getSource('done').setData({type:'Feature',geometry:{type:'LineString',coordinates:coords.slice(0,p.i+1).concat([[p.lon,p.lat]])}})}
  slow();setInterval(slow,1000);
  setInterval(function(){if(follow&&!map.isMoving())chase(1500)},4000);
});
</script></body></html>`;
}
