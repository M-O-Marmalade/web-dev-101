const mobileBrowser = window.mobileCheck;

const waterCanvas = document.createElement("canvas");
waterCanvas.style.position = "fixed";
waterCanvas.style.top = 0;
waterCanvas.style.margin = 0;
waterCanvas.style.width = "100%";
waterCanvas.style.height = "100%";
waterCanvas.style.overflow = "hidden";
waterCanvas.style.zIndex = -10;
document.body.appendChild(waterCanvas);

const fps = 60;
const msPerFrame = 1000/fps;
let readyToRender = true;
const damping = 0.984;
const pointerStrength = 0.127;
const pointerSize = 2;

const totalSegments = 48000;
let wX = window.innerWidth;
let wY = window.innerHeight;
let wAspectFloat = wX / wY;
let wXYgcd = gcd(wX, wY);
let aspectScale = aspectScaleSolve(wX/wXYgcd , wY/wXYgcd , totalSegments);
console.log(aspectScale);
const xSeg = Math.floor(wX/wXYgcd * aspectScale);
const ySeg = Math.floor(wY/wXYgcd * aspectScale);
const yPoi = ySeg + 1;
const xPoi = xSeg + 1;            

const prev = new Array(xPoi * yPoi).fill(0);
const curr = new Array(xPoi * yPoi).fill(0);

//Three.js settings
THREE.Cache.enabled = true;

//scene & camera
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x0044ff );
// const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 1000);
const camera = new THREE.PerspectiveCamera(26.5, wAspectFloat, 0.5, 1000);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 2.1;
camera.lookAt(0,0,0);

//renderer
const renderer = new THREE.WebGLRenderer({
    canvas: waterCanvas
});
// renderer.alpha = true;
// renderer.setClearColor(0x000000, 0);
if (!mobileBrowser) {   //full rendering resolution for desktops
    renderer.setPixelRatio( window.devicePixelRatio );
}            
renderer.setSize( wX, wY );

// light
const light = new THREE.DirectionalLight(0xf8f0f8, .05);
light.position.set(-1,2,10);
scene.add( light );

// materials
const refractiveMat = new THREE.MeshPhysicalMaterial({
    side: THREE.BackSide,
    transmission: 1.0,
    roughness: 0,
    ior: 1.333,
    thickness: 10,
    specularIntensity: 1,
    // reflectivity: 1,
});

const normalMat = new THREE.MeshNormalMaterial({
    side: THREE.FrontSide,
    //flatShading: true
});

const vertMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.FrontSide
});

const phongMat = new THREE.MeshPhongMaterial({
    color: 0x000000,
    specular: 0x0000ff,
    //vertexColors: true,
    side: THREE.BackSide
});

// water geometry
const waterGeometry = new THREE.BufferGeometry();

//water attributes
const waterIndices = [];
const waterPositions = [];
const waterNormals = [];

let counter = 0;

// generate water positions, normals and color data for a simple grid geometry
for ( let i = 0; i < yPoi; i++ ) {

    const y = (i / ySeg) - 0.5;    //set y position from 0 - 1

    for ( let j = 0; j < xPoi; j++ ) {

        const x = ((j / xSeg) - 0.5) * wAspectFloat;    //set x position from 0 - 1

        waterPositions.push( x, y, 0 );
        waterNormals.push( 0, 0, -1 );

        counter++;
    }
}

// generate water indices (data for element array buffer)
for ( let i = 0; i < ySeg; i++ ) {

    for ( let j = 0; j < xSeg; j++ ) {

        const a = i * ( xSeg + 1 ) + ( j + 1 );
        const b = i * ( xSeg + 1 ) + j;
        const c = ( i + 1 ) * ( xSeg + 1 ) + j;
        const d = ( i + 1 ) * ( xSeg + 1 ) + ( j + 1 );

        // generate two faces (triangles) per iteration
        waterIndices.push( a, b, d ); // face one
        waterIndices.push( b, c, d ); // face two
    }
}

//set water mesh data and add to scene
waterGeometry.setIndex( waterIndices );            
const positionsA = new THREE.Float32BufferAttribute(waterPositions,3);
const normalsA = new THREE.Float32BufferAttribute(waterNormals,3);
waterGeometry.setAttribute( 'position', positionsA );
waterGeometry.setAttribute( 'normal', normalsA );
const waterMesh = new THREE.Mesh( waterGeometry, refractiveMat );
scene.add( waterMesh );

//add torus to scene
// const torusGeometry = new THREE.TorusKnotGeometry(10, 2.3, 256, 64);
// const torusMesh = new THREE.Mesh( torusGeometry, normalMat);
// torusMesh.position.z = -0.5;
// torusMesh.scale.x = 0.06;
// torusMesh.scale.y = 0.032;
// torusMesh.scale.z = 0.04;
// scene.add(torusMesh);

//add bg plane to scene
const bgPlaneGeometry = new THREE.BufferGeometry();
const bgPlaneIndices = [
    1, 0, 3,
    0, 2, 3
];
const bgPlanePositions = [
    -0.64 * wAspectFloat, 0.64, -1.5,
    0.64 * wAspectFloat, 0.64, -1.5,
    -0.64 * wAspectFloat, -0.64, -1.5,
    0.64 * wAspectFloat, -0.64, -1.5,

];
const bgPlaneNormals = [
    0,0,1,
    0,0,1,
    0,0,1,
    0,0,1
];
const bgPlaneUVs = [
    0,1,
    1,1,
    0,0,
    1,0
];
const bgPlaneColors = [
    0, 0.576, 1,
    0, 0.882, 1,
    0, 0.267, 1,
    0, 0.576, 1,
];

//bgPlane material
const bgPlaneTex = new THREE.TextureLoader().load('graphics/textures/texture3.png');
const bgPlaneMat = new THREE.MeshBasicMaterial({
    map: bgPlaneTex
    // vertexColors: true
});

// //set bg mesh data and add to scene
// bgPlaneGeometry.setIndex( bgPlaneIndices );
// bgPlaneGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute(bgPlanePositions,3) );
// bgPlaneGeometry.setAttribute( 'normal', new THREE.Float32BufferAttribute(bgPlaneNormals,3) );
// bgPlaneGeometry.setAttribute( 'uv', new THREE.Float32BufferAttribute(bgPlaneUVs,2) );
// bgPlaneGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute(bgPlaneColors,3) );
// const bgPlaneMesh = new THREE.Mesh( bgPlaneGeometry, bgPlaneMat );
// scene.add( bgPlaneMesh );


//Create text geometry
const loader = new THREE.FontLoader();
let font;
loader.load('fonts/helvetiker_regular.typeface.json', function ( response ) {
    font = response;
} );

const textGeo = new THREE.TextGeometry( 'Hello three.js!', {
    font: font,
    size: 1,
    height: 1,
    curveSegments: 3,
    bevelThickness: 3,
    bevelSize: 3,
    bevelEnabled: true
} );

textGeo.computeBoundingBox();

scene.add(new THREE.Mesh(textGeo, normalMat));


//add document event handlers
document.body.addEventListener( 'mousemove', onMouseMove );
document.body.addEventListener( 'touchmove', onTouchMove );
window.addEventListener("resize", resizedWindow);


setInterval(queueRender, msPerFrame);
animate(scene, camera);

function queueRender() {
    readyToRender = true;
}            

function pointerMove(x, y) {
    const indX = Math.floor((x / wX) * xPoi);
    const indY = Math.floor((1 - y / wY) * yPoi);
    
    for (let i = -(pointerSize-1); i < pointerSize; i++) {
        const xtemp = i + indX;
        for (let j = -(pointerSize-1); j < pointerSize; j++) {
            const ytemp = j + indY;
            if (0 < xtemp && xtemp < xSeg && 0 < ytemp && ytemp < ySeg) {
                const indtemp = xtemp + (ytemp * xPoi);
                prev[indtemp] += pointerStrength * (pointerSize - (Math.abs(i) + Math.abs(j))) / pointerSize;
            }
        }
    }
}

function onTouchMove(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
    for(let i = 0; i < e.touches.length; i++) {
        pointerMove(e.touches[i].clientX, e.touches[i].clientY);
    }
}

function onMouseMove(e) {
    pointerMove(e.clientX, e.clientY)
}

function rippleAnimate() {
    for (let x = 1; x < xPoi; x++) {
        for (let y = 1; y < yPoi; y++) {
            curr[x + (y * xPoi)] = (prev[(x-1) + y * xPoi] + 
                                        prev[(x+1) + y * xPoi] + 
                                        prev[x + (y+1) * xPoi] + 
                                        prev[x + (y-1) * xPoi]) / 2 - curr[x + (y * xPoi)];
            curr[x + (y * xPoi)] = curr[x + (y * xPoi)] * damping;
            curr[x + (y * xPoi)] = isNaN(curr[x + (y * xPoi)]) ? 0 : curr[x + (y * xPoi)];
        }
    }

    for (let i = 0; i < xPoi*yPoi; i++) {
        normalsA.setY(i,curr[i]);
        normalsA.setX(i,-curr[i]);
    }

    for (let i = 0; i < xPoi*yPoi; i++) {
        const temp = prev[i];
        prev[i] = curr[i];
        curr[i] = temp;
    }

    normalsA.needsUpdate = true;
}

//frame update
function animate() {
    requestAnimationFrame( animate );

    // torusMesh.rotation.x += 0.01;
    // torusMesh.rotation.y += 0.01;
    
    if (readyToRender) {
        rippleAnimate()
        renderer.render( scene, camera );
        readyToRender = false;
    }
    
    // wXP.innerHTML = "wX: " + wX;
    // wYP.innerHTML = "wY: " + wY;
    // ySegP.innerHTML = "ySeg: " + ySeg;
    // xSegP.innerHTML = "xSeg: " + xSeg;
    // yPoiP.innerHTML = "yPoi: " + yPoi;
    // xPoiP.innerHTML = "xPoi: " + xPoi;
    // totalVerticesP.innerHTML = "totalVertices: " + counter;
    // wXYgcdP.innerHTML = "wXYgcd: " + wXYgcd;
    // AspectP.innerHTML = "Aspect: " + wX/wXYgcd + ":" + wY/wXYgcd;
}

function resizedWindow() {
    wX = window.innerWidth;
    wY = window.innerHeight;
    wXYgcd = gcd(wX, wY);
    renderer.setSize(wX, wY);
}

function gcd (a, b) {
    return (b == 0) ? a : gcd (b, a%b);
}

function aspectScaleSolve(a,b,c) {
    const tempA = a;
    a = tempA * b * 2;
    b = tempA + b;
    c = -c;
    return (-1 * b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
}

window.mobileCheck = function() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};


// <!-- <canvas id="waterCanvas" style="position: fixed; top: 0;"></canvas> -->
//         <!-- <div style="display: flex; flex-direction: column; position: fixed; top: 0; color: white;">
//             <p id="wXP"></p>
//             <p id="wYP"></p>
//             <p id="xSegP"></p>
//             <p id="ySegP"></p>
//             <p id="xPoiP"></p>
//             <p id="yPoiP"></p>
//             <p id="totalVerticesP"></p>
//             <p id="wXYgcdP"></p>
//             <p id="AspectP"></p>
//         </div> -->