# UH-60 3D Paint Studio (static site)

Open `index.html` from any static web server (e.g. `python3 -m http.server`). Nothing is fetched from the internet; three.js r186 is vendored in `lib/three/`.

## Credits and licenses
- 3D model: "Sikorsky UH-60 Black Hawk" by helijah, https://sketchfab.com/3d-models/sikorsky-uh-60-black-hawk-ee81eb66006b4d8980d0cf9ff6304b69, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes: repainted with a procedural zone mask, added mission-equipment kits, hoist, searchlight, and decals.
- Bell 206B JetRanger 3D model (bell.html, model/bell206.glb): "Bell-206-JetRanger" by MOJO (3D) and Emmanuel BARANGER (3D/FDM) from the FlightGear FGAddon repository, https://sourceforge.net/p/flightgear/fgaddon/HEAD/tree/trunk/Aircraft/Bell-206-JetRanger/ (svn: https://svn.code.sf.net/p/flightgear/fgaddon/trunk/Aircraft/Bell-206-JetRanger), licensed GNU GPL v2 or later (model/BELL206-LICENSE.txt). Changes: AC3D parts converted to glTF in this site's frame (tools/ac.py, tools/build206.py), livery colours removed from the texture to make a neutral detail map, rotors assembled from the external rotor models, effects/animations dropped. The converted model and its textures remain under the GPL; corresponding source is the upstream repository plus the tools/ scripts.
- Bell 505 Jet Ranger X: not available yet; no freely redistributable (CC0/CC-BY/GPL) model was found.
- three.js: MIT license (lib/three/LICENSE). GLTFLoader and its utils are from three.js r186 (MIT).
- Kit shapes were checked against Wikimedia Commons / DVIDS photos (list in the project notes). No photos are shipped with this site.

## URL parameters
`?preset=N&nose=mh60t|hh60g|hh60w|mh60m|uh60l&cam=az,el,dist[,tx,ty,tz,fov]&zones=1&shot=1`
