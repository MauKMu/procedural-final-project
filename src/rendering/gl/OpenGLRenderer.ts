import {mat4, vec2, vec4, vec3} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram, {Shader} from './ShaderProgram';
import PostProcess from './PostProcess'
import Square from '../../geometry/Square';
import ShaderFlags from './ShaderFlags';

class OpenGLRenderer {
    gBuffer: WebGLFramebuffer; // framebuffer for deferred rendering

    gbTargets: WebGLTexture[]; // references to different 4-channel outputs of the gbuffer
    // Note that the constructor of OpenGLRenderer initializes
    // gbTargets[0] to store 32-bit values, while the rest
    // of the array stores 8-bit values. You can modify
    // this if you want more 32-bit storage.

    depthTexture: WebGLTexture; // You don't need to interact with this, it's just
    // so the OpenGL pipeline can do depth sorting

    // post-processing buffers pre-tonemapping (32-bit color)
    post32Buffers: WebGLFramebuffer[];
    post32Targets: WebGLTexture[];

    // pre-processing buffers pre-tonemapping (32-bit color)
    pre32Buffers: WebGLFramebuffer[];
    pre32Targets: WebGLTexture[];

    // post-processing buffers post-tonemapping (8-bit color)
    post8Buffers: WebGLFramebuffer[];
    post8Targets: WebGLTexture[];

    // post processing shader lists, try to limit the number for performance reasons
    post8Passes: PostProcess[];
    post32Passes: PostProcess[];
    pre32Passes: PostProcess[];

    currentTime: number; // timer number to apply to all drawing shaders

    shaderFlags: ShaderFlags; // flags saying which shaders are enabled
    static compiledShaders = new Map<number, Array<PostProcess>>([
        [ShaderFlags.DOF, undefined],
        [ShaderFlags.BLOOM, undefined],
        [ShaderFlags.POINTILISM, undefined],
        [ShaderFlags.PAINT, undefined],
        [ShaderFlags.VAPORWAVE, undefined],
    ]);

    // the shader that renders from the gbuffers into the postbuffers
    deferredShader: PostProcess = new PostProcess(
        new Shader(gl.FRAGMENT_SHADER, require('../../shaders/deferred-render.glsl'))
    );

    // shader that maps 32-bit color to 8-bit color
    tonemapPass: PostProcess = new PostProcess(
        new Shader(gl.FRAGMENT_SHADER, require('../../shaders/tonemap-frag.glsl'))
    );


    add8BitPass(pass: PostProcess) {
        this.post8Passes.push(pass);
    }


    add32BitPass(pass: PostProcess) {
        this.post32Passes.push(pass);
    }

    add32BitPrePass(pass: PostProcess) {
        this.pre32Passes.push(pass);
    }

    clearPasses() {
        this.post8Passes = [];
        this.post32Passes = [];
        this.pre32Passes = [];
    }

    updateShaderFlags(newFlags: ShaderFlags) {
        if (newFlags == this.shaderFlags) {
            return;
        }
        this.shaderFlags = newFlags;
        // update passes accordingly
        this.clearPasses();
        if (this.shaderFlags == ShaderFlags.NONE) {
            return;
        }
        if (this.shaderFlags & ShaderFlags.DOF) {
            // TODOX: make 8 bit?
            let shaders = OpenGLRenderer.compiledShaders.get(ShaderFlags.DOF);
            this.add32BitPass(shaders[0]);
            this.add32BitPass(shaders[1]);
        }
        if (this.shaderFlags & ShaderFlags.BLOOM) {
            let shaders = OpenGLRenderer.compiledShaders.get(ShaderFlags.BLOOM);
            this.add32BitPrePass(shaders[0]);
            for (let i = 0; i < 2; i++) {
                this.add32BitPrePass(shaders[1]);
                this.add32BitPrePass(shaders[2]);
            }
            this.add32BitPass(shaders[3]);
        }
        if (this.shaderFlags & ShaderFlags.POINTILISM) {
            let shaders = OpenGLRenderer.compiledShaders.get(ShaderFlags.POINTILISM);
            this.add8BitPass(shaders[0]);
        }
        if (this.shaderFlags & ShaderFlags.VAPORWAVE) {
            let shaders = OpenGLRenderer.compiledShaders.get(ShaderFlags.VAPORWAVE);
            this.add8BitPass(shaders[0]);
            this.add8BitPass(shaders[1]);
        }
    }

    updateCoherence(coherence: number) {
        if (this.shaderFlags & ShaderFlags.PAINT) {
            OpenGLRenderer.compiledShaders.get(ShaderFlags.PAINT)[0].setCoherence(coherence);
        }
    }

    updateBrushSize(brushSize: number) {
        if (this.shaderFlags & ShaderFlags.PAINT) {
            OpenGLRenderer.compiledShaders.get(ShaderFlags.PAINT)[1].setBrushSize(brushSize);
        }
    }

    updateBrushNoise(brushNoise: number) {
        if (this.shaderFlags & ShaderFlags.PAINT) {
            OpenGLRenderer.compiledShaders.get(ShaderFlags.PAINT)[1].setBrushNoise(brushNoise);
        }
    }

    constructor(public canvas: HTMLCanvasElement) {
        this.currentTime = 0.0;
        this.gbTargets = [undefined, undefined, undefined];
        this.post8Buffers = [undefined, undefined];
        this.post8Targets = [undefined, undefined];
        this.post8Passes = [];

        this.post32Buffers = [undefined, undefined];
        this.post32Targets = [undefined, undefined];
        this.post32Passes = [];

        this.pre32Buffers = [undefined, undefined];
        this.pre32Targets = [undefined, undefined];
        this.pre32Passes = [];

        this.shaderFlags = ShaderFlags.NONE;

        // compile shaders if they haven't been compiled yet
        if (OpenGLRenderer.compiledShaders.get(ShaderFlags.DOF) == undefined) {
            let arr = [
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/dofBlurX-frag.glsl'))),
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/dofBlurY-frag.glsl'))),
            ];
            OpenGLRenderer.compiledShaders.set(ShaderFlags.DOF, arr);
        }
        if (OpenGLRenderer.compiledShaders.get(ShaderFlags.BLOOM) == undefined) {
            let arr = [
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/bloomHigh-frag.glsl'))),
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/blurX-frag.glsl'))),
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/blurY-frag.glsl'))),
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/bloomAdd-frag.glsl'))),
            ];
            OpenGLRenderer.compiledShaders.set(ShaderFlags.BLOOM, arr);
        }
        if (OpenGLRenderer.compiledShaders.get(ShaderFlags.POINTILISM) == undefined) {
            let arr = [
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/pointilism-frag.glsl'))),
            ];
            OpenGLRenderer.compiledShaders.set(ShaderFlags.POINTILISM, arr);
        }
        if (OpenGLRenderer.compiledShaders.get(ShaderFlags.PAINT) == undefined) {
            let arr = [
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/curl-frag.glsl'))),
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/paint-frag.glsl'))),
            ];
            OpenGLRenderer.compiledShaders.set(ShaderFlags.PAINT, arr);
        }
        if (OpenGLRenderer.compiledShaders.get(ShaderFlags.VAPORWAVE) == undefined) {
            let arr = [
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/vaporwave-frag.glsl'))),
                new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/vaporwaveGlitches-frag.glsl'))),
            ];
            OpenGLRenderer.compiledShaders.set(ShaderFlags.VAPORWAVE, arr);
        }
        // TODO: these are placeholder post shaders, replace them with something good
        //this.add8BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/examplePost-frag.glsl'))));
        //this.add8BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/examplePost2-frag.glsl'))));

        //this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/examplePost3-frag.glsl'))));
        /*
        this.add32BitPrePass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/bloomHigh-frag.glsl'))));
        for (let i = 0; i < 2; i++) {
            this.add32BitPrePass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/blurX-frag.glsl'))));
            this.add32BitPrePass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/blurY-frag.glsl'))));
        }

        this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/bloomAdd-frag.glsl'))));
        this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/dofBlurX-frag.glsl'))));
        this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/dofBlurY-frag.glsl'))));
        this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/pointilism-frag.glsl'))));
        */
        //this.add32BitPrePass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/curl-frag.glsl'))));
        //this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/paint-frag.glsl'))));
        //this.add8BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/vaporwave-frag.glsl'))));

        if (!gl.getExtension("OES_texture_float_linear")) {
            console.error("OES_texture_float_linear not available");
        }

        if (!gl.getExtension("EXT_color_buffer_float")) {
            console.error("FLOAT color buffer not available");
        }

        var gb0loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb0");
        var gb1loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb1");
        var gb2loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb2");

        this.deferredShader.use();
        gl.uniform1i(gb0loc, 0);
        gl.uniform1i(gb1loc, 1);
        gl.uniform1i(gb2loc, 2);
    }


    setClearColor(r: number, g: number, b: number, a: number) {
        gl.clearColor(r, g, b, a);
    }


    setSize(width: number, height: number) {
        console.log(width, height);
        this.canvas.width = width;
        this.canvas.height = height;

        // --- GBUFFER CREATION START ---
        // refresh the gbuffers
        this.gBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

        for (let i = 0; i < this.gbTargets.length; i++) {
            this.gbTargets[i] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[i]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            if (i == 0) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
            }
            else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            }

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.gbTargets[i], 0);
        }
        // depth attachment
        this.depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);

        var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
            console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use FBO[0]\n");
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // create the framebuffers for post processing
        for (let i = 0; i < this.post8Buffers.length; i++) {

            // 8 bit buffers have unsigned byte textures of type gl.RGBA8
            this.post8Buffers[i] = gl.createFramebuffer()
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[i]);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

            this.post8Targets[i] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.post8Targets[i]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.post8Targets[i], 0);

            FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
                console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
            }

            // 32 bit buffers have float textures of type gl.RGBA32F
            this.post32Buffers[i] = gl.createFramebuffer()
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[i]);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

            this.post32Targets[i] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[i]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.post32Targets[i], 0);

            FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
                console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
            }

            // 32 bit buffers have float textures of type gl.RGBA32F
            this.pre32Buffers[i] = gl.createFramebuffer()
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pre32Buffers[i]);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

            this.pre32Targets[i] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.pre32Targets[i]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pre32Targets[i], 0);

            FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
                console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
            }
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        // update u_Dims
        let dims = vec2.fromValues(width, height);
        for (let entry of OpenGLRenderer.compiledShaders.entries()) {
            // can't filter by which is active, since filter may be re-enabled without
            // a resize event
            //if (!(this.shaderFlags & entry[0])) {
                //continue;
            //}
            for (let shader of entry[1]) {
                shader.setDims(dims);
            }
        }
        /*
        for (let pass of this.pre32Passes) {
            pass.setDims(dims);
        }
        for (let pass of this.post32Passes) {
            pass.setDims(dims);
        }
        for (let pass of this.post8Passes) {
            pass.setDims(dims);
        }
        */

    }


    updateTime(deltaTime: number, currentTime: number) {
        this.deferredShader.setTime(currentTime);
        for (let entry of OpenGLRenderer.compiledShaders.entries()) {
            if (!(this.shaderFlags & entry[0])) {
                continue;
            }
            for (let shader of entry[1]) {
                shader.setTime(currentTime);
            }
        }
        /*
        for (let pass of this.post8Passes) pass.setTime(currentTime);
        for (let pass of this.post32Passes) pass.setTime(currentTime);
        for (let pass of this.pre32Passes) pass.setTime(currentTime);
        */
        this.currentTime = currentTime;
    }


    clear() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }


    clearGB() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    renderToGBuffer(camera: Camera, gbProg: ShaderProgram, drawables: Array<Drawable>) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.enable(gl.DEPTH_TEST);

        //let model = mat4.create();
        let viewProj = mat4.create();
        let view = camera.viewMatrix;
        let proj = camera.projectionMatrix;
        let color = vec4.fromValues(0.5, 0.5, 0.5, 1);

        //mat4.identity(model);
        mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
        //gbProg.setModelMatrix(model);
        gbProg.setViewProjMatrix(viewProj);
        gbProg.setGeometryColor(color);
        gbProg.setViewMatrix(view);
        gbProg.setProjMatrix(proj);

        gbProg.setTime(this.currentTime);

        for (let drawable of drawables) {
            gbProg.setModelMatrix(drawable.modelMatrix);
            gbProg.draw(drawable);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    }

    renderFromGBuffer(camera: Camera) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[0]);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let view = camera.viewMatrix;
        let proj = camera.projectionMatrix;
        this.deferredShader.setViewMatrix(view);
        this.deferredShader.setProjMatrix(proj);
        this.deferredShader.setAspectRatio(camera.aspectRatio);

        for (let i = 0; i < this.gbTargets.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[i]);
        }

        this.deferredShader.draw();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    // TODO: pass any info you need as args
    renderPostProcessHDR() {
        // TODO: replace this with your post 32-bit pipeline
        // the loop shows how to swap between frame buffers and textures given a list of processes,
        // but specific shaders (e.g. bloom) need specific info as textures

        // "pre-passes" for post-processing
        let j = 0;
        // put original framebuffer in texture 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]);
        // put GBuffer0 in texture 2
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[0]);
        for (j = 0; j < this.pre32Passes.length; j++) {
            // Pingpong framebuffers for each pass.
            // In other words, repeatedly flip between storing the output of the
            // current pre-process pass in pre32Buffers[1] and pre32Buffers[0].

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pre32Buffers[(j + 1) % 2]);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.pre32Targets[(j) % 2]);

            this.pre32Passes[j].draw();

            // bind default frame buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        // now pre32Targets (0th or 1th, depending on j) has result of pre-pass
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.pre32Targets[(j) % 2]);

        // actual post-processing
        let i = 0;
        for (i = 0; i < this.post32Passes.length; i++) {
            // Pingpong framebuffers for each pass.
            // In other words, repeatedly flip between storing the output of the
            // current post-process pass in post32Buffers[1] and post32Buffers[0].
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[(i + 1) % 2]);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Recall that each frame buffer is associated with a texture that stores
            // the output of a render pass. post32Targets is the array that stores
            // these textures, so we alternate reading from the 0th and 1th textures
            // each frame (the texture we wrote to in our previous render pass).
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[(i) % 2]);

            this.post32Passes[i].draw();

            // bind default frame buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        // do paint manually to avoid conflicts with bloom
        if (this.shaderFlags & ShaderFlags.PAINT) {
            // TODOX: why bloom doesn't work with paint???
            let shaders = OpenGLRenderer.compiledShaders.get(ShaderFlags.PAINT);
            // pre-pass =======================================================
            // put original framebuffer in texture 0
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[i % 2]);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pre32Buffers[(j + 1) % 2]);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            //gl.activeTexture(gl.TEXTURE1);
            //gl.bindTexture(gl.TEXTURE_2D, this.pre32Targets[(j) % 2]);

            shaders[0].draw();

            // bind default frame buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            j++;

            // set right texture
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.pre32Targets[(j) % 2]);
            
            // post-pass ======================================================
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[(i + 1) % 2]);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Recall that each frame buffer is associated with a texture that stores
            // the output of a render pass. post32Targets is the array that stores
            // these textures, so we alternate reading from the 0th and 1th textures
            // each frame (the texture we wrote to in our previous render pass).
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[(i) % 2]);

            shaders[1].draw();

            // bind default frame buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            i++;
        }

        // apply tonemapping
        // TODO: if you significantly change your framework, ensure this doesn't cause bugs!
        // render to the first 8 bit buffer if there is more post, else default buffer
        if (this.post8Passes.length > 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[0]);
        }
        else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.activeTexture(gl.TEXTURE0);
        // bound texture is the last one processed before

        // render pre or post
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[Math.max(0, i) % 2]);
        //gl.bindTexture(gl.TEXTURE_2D, this.pre32Targets[Math.max(0, j) % 2]);

        this.tonemapPass.draw();

    }


    // TODO: pass any info you need as args
    renderPostProcessLDR() {
        // TODO: replace this with your post 8-bit pipeline
        // the loop shows how to swap between frame buffers and textures given a list of processes,
        // but specific shaders (e.g. motion blur) need specific info as textures
        for (let i = 0; i < this.post8Passes.length; i++) {
            // pingpong framebuffers for each pass
            // if this is the last pass, default is bound
            if (i < this.post8Passes.length - 1) gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[(i + 1) % 2]);
            else gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.post8Targets[(i) % 2]);

            this.post8Passes[i].draw();

            // bind default
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

};

export default OpenGLRenderer;
