// osuGL.js — the "osuGL" JS module imported by web/osuTK.WebGL/WebGL/WebGLImports.cs.
//
// WebGL2 has no integer object handles like desktop GL, so this file maintains an integer handle
// registry (int id <-> JS WebGL object) mirroring GL semantics: id 0 == "none"/null, and uniform
// location 0 is a sentinel meaning "not found" (GL's -1 equivalent) which the glUniform* wrappers
// silently ignore — matching desktop GL's treatment of location -1.
//
// Heap accessors (localHeapViewU8 etc.) come from dotnet.create() and are invoked per call: the
// wasm memory can grow, which detaches any cached typed-array views.
//
// Special cases worth knowing:
//  * glGetString(GL_VERSION) is guaranteed to contain "OpenGL ES" so GLRenderer.IsEmbedded stays
//    true — that flag selects CrossCompileTarget.ESSL, which is what web/tools/ShaderGen emits.
//  * WebGL requires matrix `transpose` to be false; glUniformMatrix* transpose manually instead.
//  * glGetStringi(GL_EXTENSIONS, i) is served from getSupportedExtensions() (WebGL has no indexed
//    string query).

let gl = null;
let heaps = null;

const GL_VERSION = 0x1f02;
const GL_EXTENSIONS = 0x1f03;

export function init(canvas, heapAccessors) {
    heaps = heapAccessors;
    gl = canvas.getContext('webgl2', {
        alpha: false,
        // No multisample backbuffer. osu! draws hit objects from an alpha-blended sprite atlas, so
        // MSAA only ever smooths the quad edges that are already in the texture — while costing a
        // resolve of the whole backbuffer every frame, scaled by resolution. It is a pure loss here.
        antialias: false,
        depth: true,
        stencil: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
    });

    if (gl === null) return false;

    // Defensive: framework paths may touch these (anisotropy, float render targets).
    for (const ext of [
        'EXT_color_buffer_float',
        'EXT_color_buffer_half_float',
        'EXT_float_blend',
        'OES_texture_float_linear',
        'EXT_texture_filter_anisotropic',
    ]) gl.getExtension(ext);

    return true;
}

export function hasContext() {
    return gl !== null;
}

// ---- handle registry ------------------------------------------------------

let nextId = 1;
const objects = new Map(); // int id -> WebGL object
const ids = new WeakMap(); // WebGL object -> int id

function reg(o) {
    if (!o) return 0;
    const id = nextId++;
    objects.set(id, o);
    ids.set(o, id);
    return id;
}

function obj(id) {
    const o = objects.get(id);
    if (o === undefined) throw new Error(`osuGL: invalid GL handle ${id}`);
    return o;
}

/** 0 -> null (unbind / no object); nonzero -> registry lookup. */
function opt(id) {
    if (id === 0) return null;
    const o = objects.get(id);
    if (o === undefined) throw new Error(`osuGL: invalid GL handle ${id}`);
    return o;
}

function drop(id) {
    const o = objects.get(id);
    if (o === undefined) return null;
    objects.delete(id);
    ids.delete(o);
    return o;
}

/** Marshalled pointers arrive as numbers (wasm32 nint); normalize defensively. */
function num(v) {
    return typeof v === 'bigint' ? Number(v) : v;
}

function heapView(kind) {
    if (heaps === null) throw new Error('osuGL: heap accessors not initialised');
    const fn = heaps[kind];
    if (typeof fn !== 'function') throw new Error(`osuGL: heap accessor missing: ${kind}`);
    return fn();
}

const u8 = () => heapView('u8');
const u16 = () => heapView('u16');
const u32 = () => heapView('u32');
const f32 = () => heapView('f32');

/** Typed-array view over wasm memory for a GL pixel/data type. */
function dataView(type, addr, bytes) {
    switch (type) {
        case 0x1406: // GL_FLOAT
            return f32().subarray(addr >> 2, (addr >>> 2) + (bytes >> 2));
        case 0x1403: // GL_UNSIGNED_SHORT
        case 0x140b: // GL_HALF_FLOAT
            return u16().subarray(addr >> 1, (addr >>> 1) + (bytes >> 1));
        case 0x1405: // GL_UNSIGNED_INT
            return u32().subarray(addr >> 2, (addr >>> 2) + (bytes >> 2));
        default:
            return u8().subarray(addr, addr + bytes);
    }
}

function transposeCopy(src, n) {
    const out = new Float32Array(n * n);
    for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
            out[c * n + r] = src[r * n + c];
    return out;
}

// ---- capabilities / strings ----------------------------------------------

export function glGetString(name) {
    const v = gl.getParameter(name);
    let s = v == null ? '' : String(v);

    if (name === GL_VERSION && !s.includes('OpenGL ES'))
        s = `${s} (OpenGL ES 3.0)`.trim();

    return s;
}

export function glGetStringi(name, index) {
    if (name === GL_EXTENSIONS) {
        const list = gl.getSupportedExtensions() ?? [];
        return index >= 0 && index < list.length ? list[index] : null;
    }
    const v = gl.getParameter(name);
    return v == null ? null : String(v);
}

export function glGetInteger(pname) {
    // GL_NUM_EXTENSIONS (0x821D): WebGL exposes no getParameter for it — the extension list comes
    // from getSupportedExtensions(), which glGetStringi already serves (kept in sync by call order
    // in GLRenderer.GetExtensions).
    if (pname === 0x821d) {
        const list = gl.getSupportedExtensions();
        return list ? list.length : 0;
    }

    const v = gl.getParameter(pname);
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    throw new Error(`osuGL: glGetInteger returned non-scalar for pname 0x${(pname >>> 0).toString(16)}`);
}

// ---- shaders / programs ---------------------------------------------------

export function glCreateShader(type) {
    return reg(gl.createShader(type));
}

export function glShaderSource(shader, source) {
    gl.shaderSource(obj(shader), source);
}

export function glCompileShader(shader) {
    gl.compileShader(obj(shader));
}

export function glGetShaderCompileStatus(shader) {
    return gl.getShaderParameter(obj(shader), gl.COMPILE_STATUS) ? 1 : 0;
}

export function glGetShaderInfoLog(shader) {
    return gl.getShaderInfoLog(obj(shader)) || '';
}

export function glDeleteShader(shader) {
    const o = drop(shader);
    if (o) gl.deleteShader(o);
}

export function glCreateProgram() {
    return reg(gl.createProgram());
}

export function glAttachShader(program, shader) {
    gl.attachShader(obj(program), obj(shader));
}

export function glDetachShader(program, shader) {
    gl.detachShader(obj(program), obj(shader));
}

export function glLinkProgram(program) {
    gl.linkProgram(obj(program));
}

export function glGetProgramLinkStatus(program) {
    return gl.getProgramParameter(obj(program), gl.LINK_STATUS) ? 1 : 0;
}

export function glGetProgramInfoLog(program) {
    return gl.getProgramInfoLog(obj(program)) || '';
}

export function glGetProgramInteger(program, pname) {
    const v = gl.getProgramParameter(obj(program), pname);
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    throw new Error(`osuGL: glGetProgramInteger returned non-scalar for pname 0x${(pname >>> 0).toString(16)}`);
}

export function glDeleteProgram(program) {
    const o = drop(program);
    if (o) gl.deleteProgram(o);
}

export function glUseProgram(program) {
    gl.useProgram(opt(program));
}

export function glGetUniformLocation(program, name) {
    return reg(gl.getUniformLocation(obj(program), name));
}

export function glGetUniformBlockIndex(program, name) {
    const v = gl.getUniformBlockIndex(obj(program), name);
    return v === 0xffffffff ? -1 : v;
}

export function glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding) {
    if (uniformBlockIndex < 0) return;
    gl.uniformBlockBinding(obj(program), uniformBlockIndex, uniformBlockBinding);
}

// ---- uniforms -------------------------------------------------------------

export function glUniform1i(location, v) {
    if (location === 0) return;
    gl.uniform1i(obj(location), v);
}

export function glUniform1f(location, v) {
    if (location === 0) return;
    gl.uniform1f(obj(location), v);
}

export function glUniform2fv(location, ptr) {
    if (location === 0) return;
    const p = num(ptr) >> 2;
    gl.uniform2fv(obj(location), f32().subarray(p, p + 2));
}

export function glUniform3fv(location, ptr) {
    if (location === 0) return;
    const p = num(ptr) >> 2;
    gl.uniform3fv(obj(location), f32().subarray(p, p + 3));
}

export function glUniform4fv(location, ptr) {
    if (location === 0) return;
    const p = num(ptr) >> 2;
    gl.uniform4fv(obj(location), f32().subarray(p, p + 4));
}

export function glUniformMatrix2fv(location, transpose, ptr) {
    if (location === 0) return;
    const p = num(ptr) >> 2;
    let m = f32().subarray(p, p + 4);
    if (transpose) m = transposeCopy(m, 2);
    gl.uniformMatrix2fv(obj(location), false, m);
}

export function glUniformMatrix3fv(location, transpose, ptr) {
    if (location === 0) return;
    const p = num(ptr) >> 2;
    let m = f32().subarray(p, p + 9);
    if (transpose) m = transposeCopy(m, 3);
    gl.uniformMatrix3fv(obj(location), false, m);
}

export function glUniformMatrix4fv(location, transpose, ptr) {
    if (location === 0) return;
    const p = num(ptr) >> 2;
    let m = f32().subarray(p, p + 16);
    if (transpose) m = transposeCopy(m, 4);
    gl.uniformMatrix4fv(obj(location), false, m);
}

// ---- buffers / VAOs / attribs ---------------------------------------------

export function glGenBuffer() {
    return reg(gl.createBuffer());
}

export function glDeleteBuffer(buffer) {
    const o = drop(buffer);
    if (o) gl.deleteBuffer(o);
}

export function glBindBuffer(target, buffer) {
    gl.bindBuffer(target, opt(buffer));
}

export function glBindBufferBase(target, index, buffer) {
    gl.bindBufferBase(target, index, opt(buffer));
}

export function glBufferData(target, size, data, usage) {
    const n = num(size);
    const d = num(data);
    if (d === 0)
        gl.bufferData(target, n, usage);
    else
        gl.bufferData(target, u8().subarray(d, d + n), usage);
}

export function glBufferSubData(target, offset, size, data) {
    const d = num(data);
    const n = num(size);
    gl.bufferSubData(target, num(offset), u8().subarray(d, d + n));
}

export function glGenVertexArray() {
    return reg(gl.createVertexArray());
}

export function glDeleteVertexArray(array) {
    const o = drop(array);
    if (o) gl.deleteVertexArray(o);
}

export function glBindVertexArray(array) {
    gl.bindVertexArray(opt(array));
}

export function glEnableVertexAttribArray(index) {
    gl.enableVertexAttribArray(index);
}

export function glVertexAttribPointer(index, size, type, normalized, stride, offset) {
    gl.vertexAttribPointer(index, size, type, normalized, stride, num(offset));
}

export function glVertexAttribIPointer(index, size, type, stride, offset) {
    gl.vertexAttribIPointer(index, size, type, stride, num(offset));
}

export function glDrawElements(mode, count, type, offset) {
    gl.drawElements(mode, count, type, num(offset));
}

// ---- framebuffers / renderbuffers -----------------------------------------

export function glGenFramebuffer() {
    return reg(gl.createFramebuffer());
}

export function glDeleteFramebuffer(framebuffer) {
    const o = drop(framebuffer);
    if (o) gl.deleteFramebuffer(o);
}

export function glBindFramebuffer(target, framebuffer) {
    gl.bindFramebuffer(target, opt(framebuffer));
}

export function glFramebufferTexture2D(target, attachment, textarget, texture, level) {
    gl.framebufferTexture2D(target, attachment, textarget, opt(texture), level);
}

export function glGenRenderbuffer() {
    return reg(gl.createRenderbuffer());
}

export function glDeleteRenderbuffer(renderbuffer) {
    const o = drop(renderbuffer);
    if (o) gl.deleteRenderbuffer(o);
}

export function glBindRenderbuffer(target, renderbuffer) {
    gl.bindRenderbuffer(target, opt(renderbuffer));
}

export function glRenderbufferStorage(target, internalformat, width, height) {
    gl.renderbufferStorage(target, internalformat, width, height);
}

export function glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
    gl.framebufferRenderbuffer(target, attachment, renderbuffertarget, opt(renderbuffer));
}

export function glInvalidateFramebuffer(target, attachments) {
    const list = attachments && typeof attachments.length === 'number' ? attachments : [];
    gl.invalidateFramebuffer(target, list);
}

export function glReadPixels(x, y, width, height, format, type, pixels, sizeInBytes) {
    const addr = num(pixels);
    gl.readPixels(x, y, width, height, format, type, dataView(type, addr, num(sizeInBytes)));
}

// ---- textures -------------------------------------------------------------

export function glGenTexture() {
    return reg(gl.createTexture());
}

export function glDeleteTexture(texture) {
    const o = drop(texture);
    if (o) gl.deleteTexture(o);
}

export function glBindTexture(target, texture) {
    gl.bindTexture(target, opt(texture));
}

export function glActiveTexture(texture) {
    gl.activeTexture(texture);
}

export function glTexImage2D(target, level, internalformat, width, height, border, format, type, pixels, sizeInBytes) {
    const addr = num(pixels);
    if (addr === 0)
        gl.texImage2D(target, level, internalformat, width, height, border, format, type, null);
    else
        gl.texImage2D(target, level, internalformat, width, height, border, format, type,
            dataView(type, addr, num(sizeInBytes)));
}

export function glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels, sizeInBytes) {
    const addr = num(pixels);
    if (addr === 0)
        gl.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, null);
    else
        gl.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type,
            dataView(type, addr, num(sizeInBytes)));
}

export function glTexParameteri(target, pname, param) {
    gl.texParameteri(target, pname, param);
}

export function glGenerateMipmap(target) {
    gl.generateMipmap(target);
}

export function glPixelStorei(pname, param) {
    gl.pixelStorei(pname, param);
}

// ---- state ----------------------------------------------------------------

export function glClear(mask) {
    gl.clear(mask);
}

export function glClearColor(r, g, b, a) {
    gl.clearColor(r, g, b, a);
}

export function glClearDepthf(depth) {
    gl.clearDepth(depth);
}

export function glClearStencil(s) {
    gl.clearStencil(s);
}

export function glColorMask(red, green, blue, alpha) {
    gl.colorMask(red, green, blue, alpha);
}

export function glBlendEquationSeparate(modeRGB, modeAlpha) {
    gl.blendEquationSeparate(modeRGB, modeAlpha);
}

export function glBlendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha) {
    gl.blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha);
}

export function glDepthFunc(func) {
    gl.depthFunc(func);
}

export function glDepthMask(flag) {
    gl.depthMask(flag);
}

export function glStencilFunc(func, ref, mask) {
    gl.stencilFunc(func, ref, mask);
}

export function glStencilOp(fail, zfail, zpass) {
    gl.stencilOp(fail, zfail, zpass);
}

export function glEnable(cap) {
    gl.enable(cap);
}

export function glDisable(cap) {
    gl.disable(cap);
}

export function glViewport(x, y, width, height) {
    gl.viewport(x, y, width, height);
}

export function glScissor(x, y, width, height) {
    gl.scissor(x, y, width, height);
}

export function glHint(target, mode) {
    gl.hint(target, mode);
}

export function glFinish() {
    gl.finish();
}
