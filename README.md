# UH-60 3D Paint Studio (static site)

Open `index.html` from any static web server (e.g. `python3 -m http.server`). Nothing is fetched from the internet; three.js r186 is vendored in `lib/three/`.

## Credits and licenses
- 3D model: "Sikorsky UH-60 Black Hawk" by helijah, https://sketchfab.com/3d-models/sikorsky-uh-60-black-hawk-ee81eb66006b4d8980d0cf9ff6304b69, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes: repainted with a procedural zone mask, added mission-equipment kits, hoist, searchlight, and decals.
- three.js: MIT license (lib/three/LICENSE).
- Kit shapes were checked against Wikimedia Commons / DVIDS photos (list in the project notes). No photos are shipped with this site.

## URL parameters
`?preset=N&nose=mh60t|hh60g|hh60w|mh60m|uh60l&cam=az,el,dist[,tx,ty,tz,fov]&zones=1&shot=1`
