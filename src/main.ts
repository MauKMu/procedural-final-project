import {vec3, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Mesh from './geometry/Mesh';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
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
controls[ENABLE_PAINT] = true;
controls[ENABLE_VAPORWAVE] = false;
controls[PAINT_COHERENCE] = 0.8;
controls[PAINT_BRUSH_SIZE] = 0.5;
controls[PAINT_BRUSH_NOISE] = 0.5;
controls[LOADED_MODEL] = Model.WAHOO;

let shaderFlags = ShaderFlags.PAINT;

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

    square = new Square(vec3.fromValues(0, 0, 0));
    square.create();

    mesh0 = new Mesh(obj0, vec3.fromValues(0, 0, 0));
    mat4.identity(mesh0.modelMatrix);
    mat4.scale(mesh0.modelMatrix, mesh0.modelMatrix, vec3.fromValues(scale, scale, scale));
    mesh0.create();

    mesh1 = new Mesh(obj0, vec3.fromValues(0, 0, 0));
    mat4.fromTranslation(mesh1.modelMatrix, vec3.fromValues(0, 0, translate));
    mat4.rotate(mesh1.modelMatrix, mesh1.modelMatrix, 0.75, vec3.fromValues(0, 1, 0));
    mat4.scale(mesh1.modelMatrix, mesh1.modelMatrix, vec3.fromValues(scale, scale, scale));
    mesh1.create();

    //tex0 = new Texture('../resources/textures/lapras.png');
}

let scale = 1.0;
let translate = -10.0;

function loadModel(model: Model) {
    if (model == Model.WAHOO) {
        loadOBJText('resources/obj/wahoo.obj');
        tex0 = new Texture('resources/textures/wahoo.bmp');
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
    const gui = new DAT.GUI();
    gui.add(controls, ENABLE_DOF).onChange(updateShaderFlags);
    gui.add(controls, ENABLE_BLOOM).onChange(updateShaderFlags);
    gui.add(controls, ENABLE_POINTILISM).onChange(updateShaderFlags);
    gui.add(controls, ENABLE_PAINT).onChange(updateShaderFlags);
    gui.add(controls, ENABLE_VAPORWAVE).onChange(updateShaderFlags);
    gui.add(controls, PAINT_COHERENCE, 0.0, 1.0);
    gui.add(controls, PAINT_BRUSH_SIZE, 0.0, 1.0);
    gui.add(controls, PAINT_BRUSH_NOISE, 0.0, 1.0);
    gui.add(controls, LOADED_MODEL, { "Wahoo": Model.WAHOO, "Staryu": Model.STARYU, "Lapras": Model.LAPRAS, "Chikorita": Model.CHIKORITA }).onChange(loadModel);

    // get canvas and webgl context
    const canvas = <HTMLCanvasElement>document.getElementById('canvas');
    const gl = <WebGL2RenderingContext>canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2 not supported!');
    }
    // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
    // Later, we can import `gl` from `globals.ts` to access it
    setGL(gl);

    // Initial call to load scene
    //loadScene();
    loadModel(controls[LOADED_MODEL]);

    const camera = new Camera(vec3.fromValues(0, 9, 25), vec3.fromValues(0, 9, 0));

    const renderer = new OpenGLRenderer(canvas);
    renderer.updateShaderFlags(shaderFlags);
    renderer.setClearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    const standardDeferred = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/standard-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/standard-frag.glsl')),
    ]);

    standardDeferred.setupTexUnits(["tex_Color"]);

    function tick() {
        camera.update();
        stats.begin();
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        timer.updateTime();
        renderer.updateShaderFlags(shaderFlags);
        renderer.updateCoherence(controls[PAINT_COHERENCE]);
        renderer.updateBrushSize(controls[PAINT_BRUSH_SIZE]);
        renderer.updateBrushNoise(controls[PAINT_BRUSH_NOISE]);
        renderer.updateTime(timer.deltaTime, timer.currentTime);

        standardDeferred.bindTexToUnit("tex_Color", tex0, 0);

        renderer.clear();
        renderer.clearGB();

        // TODO: pass any arguments you may need for shader passes
        // forward render mesh info into gbuffers
        renderer.renderToGBuffer(camera, standardDeferred, [mesh0, mesh1]);
        // render from gbuffers into 32-bit color buffer
        renderer.renderFromGBuffer(camera);
        // apply 32-bit post and tonemap from 32-bit color to 8-bit color
        renderer.renderPostProcessHDR();
        // apply 8-bit post and draw
        renderer.renderPostProcessLDR();

        stats.end();
        requestAnimationFrame(tick);
    }

    window.addEventListener('resize', function () {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.setAspectRatio(window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
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
