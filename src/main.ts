import {vec3, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Mesh from './geometry/Mesh';
import TerrainPlane from './geometry/TerrainPlane';
import Terrain from './game/Terrain';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import {Level} from './game/Terrain';
import Camera from './Camera';
import Player from './game/Player';
import {setGL} from './globals';
import {readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Texture from './rendering/gl/Texture';
import ShaderFlags from './rendering/gl/ShaderFlags';
import * as Howler from 'howler';

enum Model {
    WAHOO = 1,
    STARYU,
    LAPRAS,
    CHIKORITA,
}

// Define an object with application parameters and button callbacks
interface IControls {
    [key: string]: any;
}
// TODOX: 
// sky color
// brushiness (magnitude of randomness in paint-frag
let controls: IControls = {};
const ENABLE_DOF = "Enable fake DOF";
const ENABLE_BLOOM = "Enable bloom";
const ENABLE_POINTILISM = "Enable pointilism";
const ENABLE_PAINT = "Enable paintbrush";
const ENABLE_VAPORWAVE = "Enable vaporwave";
const PAINT_COHERENCE = "Coherence (of paintbrush directions)";
const PAINT_BRUSH_SIZE = "Brush size";
const PAINT_BRUSH_NOISE = "Brush noisiness";
const LOADED_MODEL = "Model";
controls[ENABLE_DOF] = false;
controls[ENABLE_BLOOM] = false;
controls[ENABLE_POINTILISM] = false;
controls[ENABLE_PAINT] = false;
controls[ENABLE_VAPORWAVE] = false;
controls[PAINT_COHERENCE] = 0.8;
controls[PAINT_BRUSH_SIZE] = 0.5;
controls[PAINT_BRUSH_NOISE] = 0.5;
controls[LOADED_MODEL] = Model.WAHOO;

let shaderFlags = ShaderFlags.NONE;

const sound = new Howler.Howl({
    src: ["resources/audio/vaporwave.mp3"],
    volume: 0.5,
    loop: true,
    preload: false,
    onload: function () {
        console.log("Loaded vaporwave!");
    }
});

function updateShaderFlags() {
    shaderFlags = ShaderFlags.NONE;
    shaderFlags |= controls[ENABLE_DOF] ? ShaderFlags.DOF : ShaderFlags.NONE;
    shaderFlags |= controls[ENABLE_BLOOM] ? ShaderFlags.BLOOM : ShaderFlags.NONE;
    shaderFlags |= controls[ENABLE_POINTILISM] ? ShaderFlags.POINTILISM : ShaderFlags.NONE;
    shaderFlags |= controls[ENABLE_PAINT] ? ShaderFlags.PAINT : ShaderFlags.NONE;
    shaderFlags |= controls[ENABLE_VAPORWAVE] ? ShaderFlags.VAPORWAVE : ShaderFlags.NONE;
    if (shaderFlags & ShaderFlags.VAPORWAVE) {
        if (!sound.playing()) {
            sound.play();
        }
    }
    else {
        sound.stop();
    }
}

let square: Square;

// TODO: replace with your scene's stuff

let obj0: string;
let mesh0: Mesh;
let mesh1: Mesh;
let tps: Array<TerrainPlane>;

let tex0: Texture;


var timer = {
    deltaTime: 0.0,
    startTime: 0.0,
    currentTime: 0.0,
    updateTime: function () {
        var t = Date.now();
        t = (t - timer.startTime) * 0.001;
        timer.deltaTime = t - timer.currentTime;
        timer.currentTime = t;
    },
}


function loadOBJText(path: string) {
    obj0 = readTextFile(path)
}


function loadScene() {
    square && square.destroy();
    mesh0 && mesh0.destroy();
    mesh1 && mesh1.destroy();
    tps = [];

    square = new Square(vec3.fromValues(0, 0, 0));
    square.create();

    //mesh0 = new Mesh(obj0, vec3.fromValues(0, 0, 0));
    //mat4.identity(mesh0.modelMatrix);
    //mat4.translate(mesh0.modelMatrix, mesh0.modelMatrix, vec3.fromValues(5, 3, 5));
    //mat4.scale(mesh0.modelMatrix, mesh0.modelMatrix, vec3.fromValues(3, 3, 3));
    //mesh0.create();

    //mesh1 = new Mesh(obj0, vec3.fromValues(0, 0, 0));
    //mat4.fromTranslation(mesh1.modelMatrix, vec3.fromValues(0, 0, translate));
    //mat4.rotate(mesh1.modelMatrix, mesh1.modelMatrix, 0.75, vec3.fromValues(0, 1, 0));
    //mat4.scale(mesh1.modelMatrix, mesh1.modelMatrix, vec3.fromValues(scale, scale, scale));
    //mesh1.create();

    //tex0 = new Texture('../resources/textures/lapras.png');
}

let scale = 1.0;
let translate = -10.0;

function loadModel(model: Model) {
    if (model == Model.WAHOO) {
        loadOBJText('res/models/polysphere.obj');
        scale = 1.0;
        translate = -10.0;
    }
    else if (model == Model.STARYU) {
        loadOBJText('resources/obj/staryu.obj');
        tex0 = new Texture('resources/textures/staryu.png');
        scale = 0.7;
        translate = -8.0;
    }
    else if (model == Model.LAPRAS) {
        loadOBJText('resources/obj/lapras.obj');
        tex0 = new Texture('resources/textures/lapras.png');
        scale = 1.2;
        translate = -30.0;
    }
    else if (model == Model.CHIKORITA) {
        loadOBJText('resources/obj/chikorita.obj');
        tex0 = new Texture('resources/textures/chikorita.png');
        scale = 0.6;
        translate = -7.0;
    }
    loadScene();
}

function main() {
    // Initial display for framerate
    const stats = Stats();
    stats.setMode(0);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    // load audio
    console.log("Loading vaporwave...");
    sound.load();
    updateShaderFlags();

    // Add controls to the gui
    //const gui = new DAT.GUI();
    //gui.add(controls, ENABLE_DOF).onChange(updateShaderFlags);
    //gui.add(controls, ENABLE_BLOOM).onChange(updateShaderFlags);
    //gui.add(controls, ENABLE_POINTILISM).onChange(updateShaderFlags);
    //gui.add(controls, ENABLE_PAINT).onChange(updateShaderFlags);
    //gui.add(controls, ENABLE_VAPORWAVE).onChange(updateShaderFlags);
    //gui.add(controls, PAINT_COHERENCE, 0.0, 1.0);
    //gui.add(controls, PAINT_BRUSH_SIZE, 0.0, 1.0);
    //gui.add(controls, PAINT_BRUSH_NOISE, 0.0, 1.0);
    //gui.add(controls, LOADED_MODEL, { "Wahoo": Model.WAHOO, "Staryu": Model.STARYU, "Lapras": Model.LAPRAS, "Chikorita": Model.CHIKORITA }).onChange(loadModel);

    // get canvas and webgl context
    const canvas = <HTMLCanvasElement>document.getElementById('canvas');
    const gl = <WebGL2RenderingContext>canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2 not supported!');
    }
    //let debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    //let r = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    //console.log(r);
    // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
    // Later, we can import `gl` from `globals.ts` to access it
    setGL(gl);
    gl.frontFace(gl.CCW);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Initial call to load scene
    loadScene();
    //loadModel(Model.WAHOO);

    const camera = new Camera(vec3.fromValues(1, 2, 5), vec3.fromValues(1, 0, 0));

    const player = new Player(camera, camera.position, camera.direction);

    const desertTerrain = new Terrain(vec3.fromValues(0, 0, 0), 4, 25, 4, 3, Level.DESERT);
    const snowTerrain = new Terrain(vec3.fromValues(0, 0, 0), 4, 25, 4, 3, Level.SNOW);
    const spookyTerrain = new Terrain(vec3.fromValues(0, 0, 0), 4, 25, 4, 3, Level.SPOOKY);
    const niceTerrain = new Terrain(vec3.fromValues(0, 0, 0), 4, 25, 4, 3, Level.NICE);

    //terrain.drawables.push(mesh0);

    const renderer = new OpenGLRenderer(canvas);
    renderer.updateShaderFlags(shaderFlags);
    renderer.setClearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    player.terrain = niceTerrain;
    player.forceCorrectHeight();
    renderer.setDeferredShader(Level.NICE);
    renderer.updateFadeInTime(0.0);
    renderer.updateFadeOutTime(0.0);

    const standardDeferred = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/standard-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/standard-frag.glsl')),
    ]);

    standardDeferred.setupTexUnits(["tex_Color"]);

    let exiting = false;
    let exitTime = 0.0;

    let entering = true;
    let enterTime = 0.0;

    console.time("render");
    function tick() {
        //console.timeEnd("render");
        //console.time("update");
        //player.move(timer.deltaTime);
        //vec3.copy(player.position, terrain.collide(player.position));
        //terrain.updatePlanes(player.position);
        player.update(timer.deltaTime);
        // update entering/exiting state
        if (player.terrain.shouldExit && !exiting && !entering) {
            exiting = true;
            exitTime = 0.0;
            // TODO: disable player controls?
            player.terrain.shouldExit = false;
        }
        if (exiting) {
            exitTime += timer.deltaTime * 0.8;
            if (exitTime > 1.0) {
                // update state
                exitTime = 1.0;
                enterTime = 0.0;
                entering = true;
                exiting = false;
                // actually exit level
                switch (player.terrain.level) {
                    case Level.DESERT:
                        player.terrain = snowTerrain;
                        renderer.setDeferredShader(Level.SNOW);
                        break;
                    case Level.SNOW:
                        player.terrain = spookyTerrain;
                        renderer.setDeferredShader(Level.SPOOKY);
                        break;
                    case Level.SPOOKY:
                        if (!player.terrain.badEnd) {
                            player.terrain = niceTerrain;
                            renderer.setDeferredShader(Level.NICE);
                            break;
                        }
                        // else, fall to case below
                    case Level.NICE:
                        player.terrain = desertTerrain;
                        renderer.setDeferredShader(Level.DESERT);
                        break;
                }
                player.forceCorrectHeight();
                player.terrain.resetGhosts();
                player.terrain.shouldExit = false;
                // update new shader
                renderer.updateFadeInTime(0.0);
                renderer.updateFadeOutTime(0.0);
            }
            else {
                renderer.updateFadeOutTime(exitTime);
            }
        }
        else if (entering) {
            enterTime += timer.deltaTime * 0.4;
            if (enterTime > 1.0) {
                enterTime = 1.0;
                entering = false;
            }
            renderer.updateFadeInTime(enterTime);
        }
        //camera.update();
        stats.begin();
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        timer.updateTime();
        renderer.updateShaderFlags(shaderFlags);
        //renderer.updateCoherence(controls[PAINT_COHERENCE]);
        //renderer.updateBrushSize(controls[PAINT_BRUSH_SIZE]);
        //renderer.updateBrushNoise(controls[PAINT_BRUSH_NOISE]);
        renderer.updateTime(timer.deltaTime, timer.currentTime);

        //standardDeferred.bindTexToUnit("tex_Color", tex0, 0);

        renderer.clear();
        renderer.clearGB();

        // TODO: pass any arguments you may need for shader passes
        // forward render mesh info into gbuffers
        renderer.renderToGBuffer(camera, standardDeferred, player.terrain.drawables);
        //renderer.renderToGBuffer(camera, standardDeferred, [mesh0, mesh1, tp]);
        // render from gbuffers into 32-bit color buffer
        renderer.renderFromGBuffer(camera);
        // apply 32-bit post and tonemap from 32-bit color to 8-bit color
        renderer.renderPostProcessHDR();
        // apply 8-bit post and draw
        renderer.renderPostProcessLDR();

        stats.end();
        //console.timeEnd("update");
        requestAnimationFrame(tick);
        //console.time("render");
    }

    // pointer lock things
    // https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
    // don't need to handle prefixes anymore?
    canvas.onclick = function () {
        canvas.requestPointerLock();
    }

    // need this so "this" is set properly in player's handler
    function handleMouseMovement(event: MouseEvent) {
        player.handleMouseMovement(event);
    }

    function handleMouseClick(event: MouseEvent) {
        player.handleMouseClick(event);
    }

    function lockChangeAlert() {
        if (document.pointerLockElement === canvas) {
            console.log('The pointer lock status is now locked');
            document.addEventListener("mousemove", handleMouseMovement, false);
            document.addEventListener("click", handleMouseClick, false);
        } else {
            console.log('The pointer lock status is now unlocked');
            document.removeEventListener("mousemove", handleMouseMovement, false);
            document.removeEventListener("click", handleMouseClick, false);
        }
    }

    // Event listeners

    // Hook pointer lock state change events for different browsers
    document.addEventListener('pointerlockchange', lockChangeAlert, false);

    window.addEventListener('resize', function () {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.setAspectRatio(window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
    }, false);

    window.addEventListener('keydown', function (event) {
        // need to do this, otherwise "this" points to Window?
        player.handleKeyDownEvent(event);
    }, false);

    window.addEventListener('keyup', function (event) {
        player.handleKeyUpEvent(event);
    }, false);

    window.addEventListener('blur', function () {
        player.handleLostFocus();
    }, false);

    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();

    // Start the render loop
    tick();
}


function setup() {
    timer.startTime = Date.now();
    //loadOBJText();
    main();
}

setup();
