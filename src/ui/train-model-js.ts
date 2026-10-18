/**
 * Browser-side JS (as a string, for the map page) that builds a light 3D
 * Vande Bharat engine plus one coach in the saffron and black livery from
 * simple three.js shapes, and a MapLibre custom layer that draws it at the
 * train's position, turned along the track, sized to stay visible at any
 * zoom. Our own model (no downloaded file), a few hundred triangles.
 * Expects THREE, maplibregl, map, pos(t) and now() on the page.
 */
export const TRAIN_MODEL_JS = `
function vandeBharat(){
  var T=THREE,g=new T.Group();
  function mat(c,o){return new T.MeshStandardMaterial(Object.assign({color:c,roughness:.45,metalness:.25},o||{}))}
  var saffron=mat(0xF07F1A),black=mat(0x111317,{roughness:.25,metalness:.5}),dark=mat(0x2b2f36),white=mat(0xf4f4f4);
  function box(w,h,d,m,x,y,z){var b=new T.Mesh(new T.BoxGeometry(w,h,d),m);b.position.set(x,y,z||0);g.add(b);return b}
  // Engine: side profile with the long sloped nose, extruded across its width (metres, nose towards +x).
  var s=new T.Shape();s.moveTo(0,.5);s.lineTo(0,4);s.lineTo(13.5,4);s.quadraticCurveTo(18.5,3.9,20.6,2.1);s.quadraticCurveTo(22,1.2,22,.5);s.lineTo(0,.5);
  var body=new T.Mesh(new T.ExtrudeGeometry(s,{depth:3,bevelEnabled:true,bevelSize:.15,bevelThickness:.15,bevelSegments:2,curveSegments:12}),saffron);
  body.position.z=-1.5;g.add(body);
  // Black windshield wrapping the nose, and the window band along both sides.
  var w=new T.Shape();w.moveTo(14,4.08);w.quadraticCurveTo(18.6,3.98,20.4,2.5);w.lineTo(19.6,2.35);w.quadraticCurveTo(17.6,3.5,14,3.45);w.lineTo(14,4.08);
  var ws=new T.Mesh(new T.ExtrudeGeometry(w,{depth:3.36,bevelEnabled:false,curveSegments:10}),black);ws.position.z=-1.68;g.add(ws);
  box(13.4,.85,3.34,black,6.9,3.0);
  // Dark skirt, white pinstripe, roof equipment, bogies.
  box(21.4,.55,3.32,dark,10.8,.8);
  box(21.2,.12,3.34,white,10.7,1.18);
  box(6,.35,1.6,dark,6,4.25);
  box(3,.6,2.5,dark,4.5,.25);box(3,.6,2.5,dark,17,.25);
  // Headlights.
  [-1,1].forEach(function(z){var l=new T.Mesh(new T.SphereGeometry(.22,10,8),new T.MeshStandardMaterial({color:0xfff2c0,emissive:0xffe08a,emissiveIntensity:1.5}));l.position.set(21.75,1.45,z);g.add(l)});
  // One coach behind, same livery.
  var c=new T.Shape();c.moveTo(-24,.5);c.lineTo(-24,3.9);c.lineTo(-1,3.9);c.lineTo(-1,.5);c.lineTo(-24,.5);
  var coach=new T.Mesh(new T.ExtrudeGeometry(c,{depth:3,bevelEnabled:true,bevelSize:.15,bevelThickness:.15,bevelSegments:2}),saffron);coach.position.z=-1.5;g.add(coach);
  box(22,.85,3.34,black,-12.5,2.95);box(23,.55,3.32,dark,-12.5,.8);box(23,.12,3.34,white,-12.5,1.18);
  box(3,.6,2.5,dark,-20,.25);box(3,.6,2.5,dark,-5,.25);
  // The engine's middle sits on the train's position.
  g.children.forEach(function(m){m.position.x-=11});
  return g;
}
function trainLayer(){
  var model,camera,scene,renderer;
  return {id:'train3d',type:'custom',renderingMode:'3d',
    onAdd:function(map,gl){camera=new THREE.Camera();scene=new THREE.Scene();model=vandeBharat();scene.add(model);
      scene.add(new THREE.AmbientLight(0xffffff,.75));var sun=new THREE.DirectionalLight(0xffffff,.9);sun.position.set(-20,40,30);scene.add(sun);
      renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});renderer.autoClear=false},
    render:function(gl,matrix){var p=pos(now()),ll=[p.lon,p.lat];
      var elev=(map.queryTerrainElevation&&map.queryTerrainElevation(ll))||0;
      var mc=maplibregl.MercatorCoordinate.fromLngLat(ll,elev),u=mc.meterInMercatorCoordinateUnits();
      // About 200 px long whatever the zoom, up to half the map's width (a real 46 m train is a dot when zoomed out).
      var mpp=40075016.686*Math.cos(p.lat*Math.PI/180)/(512*Math.pow(2,map.getZoom())),px=Math.min(200,map.getCanvas().clientWidth*.5),k=px*mpp/46;
      var yaw=(90-p.b)*Math.PI/180;
      var l=new THREE.Matrix4().makeTranslation(mc.x,mc.y,mc.z).scale(new THREE.Vector3(u*k,-u*k,u*k))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI/2)).multiply(new THREE.Matrix4().makeRotationY(yaw));
      camera.projectionMatrix=new THREE.Matrix4().fromArray(matrix).multiply(l);
      renderer.resetState();renderer.render(scene,camera)}};
}
`;
