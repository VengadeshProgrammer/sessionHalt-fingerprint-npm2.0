// COMPLETE WEBGL PROTECTION
(function() {
    'use strict';
    
    // Store original WebGL methods BEFORE anything else
    const webglProtection = {
        getContext: HTMLCanvasElement.prototype.getContext,
        readPixels: WebGLRenderingContext && WebGLRenderingContext.prototype ? WebGLRenderingContext.prototype.readPixels : null
    };
    
    // Lock down canvas getContext to prevent WebGL tampering
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: webglProtection.getContext,
        writable: false,
        configurable: false
    });
    
    // Lock down WebGL readPixels if available
    if (webglProtection.readPixels) {
        Object.defineProperty(WebGLRenderingContext.prototype, 'readPixels', {
            value: webglProtection.readPixels,
            writable: false,
            configurable: false
        });
    }
    
    // Monitor for any tampering attempts
    const originalDefineProperty = Object.defineProperty;
    
    Object.defineProperty = function(obj, prop, descriptor) {
        if ((obj === HTMLCanvasElement.prototype && prop === 'getContext') ||
            (obj === WebGLRenderingContext.prototype && prop === 'readPixels')) {
            console.warn('🚨 Blocked WebGL tampering attempt');
            return obj;
        }
        return originalDefineProperty.call(this, obj, prop, descriptor);
    };
})();

// DETECTION: Check if WebGL has been tampered
function detectWebGLTampering() {
    function checkGetContext() {
        const nativeGetContext = HTMLCanvasElement.prototype.getContext;
        const functionString = nativeGetContext.toString();
        const isNative = functionString.includes('[native code]');
        
        const hasWrapperPatterns = functionString.includes('.apply(') || 
                                 functionString.includes('.call(') ||
                                 functionString.includes('orig.apply') || 
                                 functionString.includes('original.apply');
        
        return {
            passed: isNative && !hasWrapperPatterns,
            details: {
                isNative: isNative,
                hasWrapperPatterns: hasWrapperPatterns,
                functionString: functionString
            }
        };
    }

    function checkWebGLAvailability() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return {
                passed: !!gl,
                details: {
                    webglSupported: !!gl,
                    contextType: gl ? 'webgl' : 'not supported'
                }
            };
        } catch (e) {
            return {
                passed: false,
                details: {
                    error: e.message
                }
            };
        }
    }

    const contextCheck = checkGetContext();
    const webglCheck = checkWebGLAvailability();
    
    return (contextCheck.passed && webglCheck.passed) ? "not tampered" : "tampered";
}

// WEBGL FINGERPRINT GENERATION
function getWebGLFingerprint() {
    if (detectWebGLTampering() === "tampered") {
        throw new Error('WebGL tampering detected');
    }
    
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        throw new Error('WebGL not supported');
    }
    
    canvas.width = 128;
    canvas.height = 128;
    
    // Vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vs);
    
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        throw new Error('Vertex shader error: ' + gl.getShaderInfoLog(vs));
    }

    // Fragment shader with GPU-stressing math
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, `
        precision highp float;
        uniform vec2 resolution;
        void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            
            // GPU-intensive calculations that vary by hardware
            float r = sin(uv.x * 25.0) * cos(uv.y * 18.0) * tan(uv.x * 8.0);
            float g = cos(uv.x * 15.0 + uv.y * 12.0) * sin(uv.y * 7.0);
            float b = sin((uv.x * 0.7 + uv.y * 1.3) * 30.0) * cos(uv.x * 6.0 + uv.y * 4.0);
            
            // Add noise patterns that stress floating-point precision
            float noise = sin(uv.x * 100.0) * cos(uv.y * 80.0) * 0.1;
            
            vec3 color = vec3(r + noise, g + noise * 0.7, b + noise * 0.3) * 0.5 + 0.5;
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    gl.compileShader(fs);
    
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        throw new Error('Fragment shader error: ' + gl.getShaderInfoLog(fs));
    }

    // Create and link program
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program linking error: ' + gl.getProgramInfoLog(program));
    }
    
    gl.useProgram(program);

    // Set up geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    // Set resolution uniform
    const resolution = gl.getUniformLocation(program, 'resolution');
    if (resolution) {
        gl.uniform2f(resolution, canvas.width, canvas.height);
    }

    // Render
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    return pixels;
}

// HIGH-QUALITY DOWNSAMPLING (preserves RGB channels)
function downsampleWebGLPixels(pixels) {
    const downsampled = [];
    // Sample every 8th pixel but preserve all RGB channels
    for (let i = 0; i < pixels.length; i += 32) {
        downsampled.push(pixels[i]);       // R
        downsampled.push(pixels[i + 1]);   // G  
        downsampled.push(pixels[i + 2]);   // B
    }
    return downsampled;
}

// MAIN EXPORT FUNCTION
async function getFingerprint() {
    try {
        const tamperStatus = detectWebGLTampering();
        
        if (tamperStatus === "tampered") {
            return "tampered";
        }

        const webglFP = getWebGLFingerprint();
        const downsampledWebGLFP = downsampleWebGLPixels(webglFP);
        
        return downsampledWebGLFP;
        
    } catch (error) {
        return {
            status: "error", 
            fingerprint: null,
            error: error.message
        };
    }
}

// Export for use in other modules
window.getFingerprint = getFingerprint;
window.detectWebGLTampering = detectWebGLTampering;
