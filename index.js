// client-canvas-fingerprint.js
export function getFingerprint() {
    console.log("🎯 Generating tamper-proof canvas fingerprint...");

    // === 🔒 1️⃣ Detect tampering BEFORE fingerprinting ===
    const tamperCheck = detectCanvasTampering();
    if (tamperCheck.tampered) {
        throw new Error(`⚠️ Canvas API tampering detected in: ${tamperCheck.details}`);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // === 2️⃣ Fingerprint rendering ===
    canvas.width = 240;
    canvas.height = 120;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Hardware ID: @#$%', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Hardware ID: @#$%', 4, 17);

    ctx.strokeStyle = 'rgb(200, 0, 0)';
    ctx.beginPath();
    ctx.moveTo(10, 40);
    ctx.lineTo(140, 40);
    ctx.lineTo(10, 80);
    ctx.lineTo(140, 80);
    ctx.lineTo(10, 120);
    ctx.lineTo(140, 120);
    ctx.stroke();

    const gradient = ctx.createLinearGradient(150, 40, 230, 100);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(1, '#0000ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(150, 40, 80, 60);

    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.arc(50, 100, 30, 0, Math.PI * 2, true);
    ctx.stroke();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelData = imageData.data;

    // === 3️⃣ Compute fingerprint ===
    const fingerprint = {
        imageHash: calculateImageHash(pixelData),
        colorDistribution: calculateColorDistribution(pixelData),
        gradientPatterns: analyzeGradientPatterns(pixelData, canvas.width),
        edgeDetection: detectEdgePatterns(pixelData, canvas.width),
        noisePattern: analyzeNoisePattern(pixelData),
        entropy: calculateEntropy(pixelData),
        contrast: calculateContrast(pixelData),
        meanBrightness: calculateMeanBrightness(pixelData),
        renderingArtifacts: detectRenderingArtifacts(pixelData)
    };

    console.log("✅ Fingerprint generated:", {
        brightness: fingerprint.meanBrightness,
        contrast: fingerprint.contrast,
        colors: fingerprint.colorDistribution
    });

    return fingerprint;
}

// === 🔒 Anti-Tampering Core ===
function detectCanvasTampering() {
    const suspects = [];
    const nativePattern = /\{\s*\[native code\]\s*\}/;

    const targets = [
        HTMLCanvasElement.prototype.toDataURL,
        HTMLCanvasElement.prototype.toBlob,
        CanvasRenderingContext2D.prototype.getImageData,
        CanvasRenderingContext2D.prototype.getLineDash,
        CanvasRenderingContext2D.prototype.fillText,
        CanvasRenderingContext2D.prototype.stroke,
        CanvasRenderingContext2D.prototype.createLinearGradient
    ];

    for (const fn of targets) {
        try {
            const str = Function.prototype.toString.call(fn);
            if (!nativePattern.test(str)) {
                suspects.push(fn.name || "anonymous");
            }
        } catch {
            suspects.push(fn.name || "anonymous");
        }
    }

    // Check .toString tampering itself
    const fnToString = Function.prototype.toString.toString();
    if (!/\[native code\]/.test(fnToString)) {
        suspects.push("Function.prototype.toString");
    }

    return {
        tampered: suspects.length > 0,
        details: suspects.join(", ") || "none"
    };
}

// === 🧮 Fingerprint feature functions ===
function calculateImageHash(pixelData) {
    let hash = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
        hash = ((hash << 5) - hash) + pixelData[i];
        hash |= 0;
    }
    return hash;
}

function calculateColorDistribution(pixelData) {
    const distribution = { r: 0, g: 0, b: 0 };
    for (let i = 0; i < pixelData.length; i += 4) {
        distribution.r += pixelData[i];
        distribution.g += pixelData[i + 1];
        distribution.b += pixelData[i + 2];
    }
    const total = pixelData.length / 4;
    return {
        r: distribution.r / total,
        g: distribution.g / total,
        b: distribution.b / total
    };
}

function analyzeGradientPatterns(pixelData, width) {
    const patterns = [];
    for (let y = 0; y < 120; y += 10) {
        let rowPattern = 0;
        for (let x = 0; x < 240; x += 10) {
            const idx = (y * width + x) * 4;
            const brightness = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
            rowPattern = (rowPattern << 2) | (brightness > 128 ? 1 : 0);
        }
        patterns.push(rowPattern);
    }
    return patterns;
}

function detectEdgePatterns(pixelData, width) {
    const edges = [];
    for (let y = 1; y < 119; y++) {
        for (let x = 1; x < 239; x++) {
            const idx = (y * width + x) * 4;
            const current = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
            const right = (pixelData[idx + 4] + pixelData[idx + 5] + pixelData[idx + 6]) / 3;
            const bottom = (pixelData[idx + width * 4] + pixelData[idx + width * 4 + 1] + pixelData[idx + width * 4 + 2]) / 3;
            const edgeStrength = Math.abs(current - right) + Math.abs(current - bottom);
            if (edgeStrength > 50) edges.push({ x, y });
        }
    }
    return edges.length;
}

function analyzeNoisePattern(pixelData) {
    let noise = 0;
    for (let i = 4; i < pixelData.length; i += 4) {
        const prev = (pixelData[i - 4] + pixelData[i - 3] + pixelData[i - 2]) / 3;
        const curr = (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
        noise += Math.abs(curr - prev);
    }
    return noise / (pixelData.length / 4);
}

function detectRenderingArtifacts(pixelData) {
    let artifacts = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
        const r = pixelData[i], g = pixelData[i + 1], b = pixelData[i + 2];
        if (Math.abs(r - g) > 100 || Math.abs(g - b) > 100 || Math.abs(b - r) > 100) {
            artifacts++;
        }
    }
    return artifacts / (pixelData.length / 4);
}

function calculateMeanBrightness(pixelData) {
    let total = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
        total += (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
    }
    return total / (pixelData.length / 4);
}

function calculateContrast(pixelData) {
    let min = 255, max = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
        const brightness = (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
        if (brightness < min) min = brightness;
        if (brightness > max) max = brightness;
    }
    return max - min;
}

function calculateEntropy(pixelData) {
    const brightnessCounts = Array(256).fill(0);
    for (let i = 0; i < pixelData.length; i += 4) {
        const brightness = Math.floor((pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3);
        brightnessCounts[brightness]++;
    }
    let entropy = 0;
    const total = pixelData.length / 4;
    for (const count of brightnessCounts) {
        if (count > 0) {
            const p = count / total;
            entropy -= p * Math.log2(p);
        }
    }
    return entropy;
}
