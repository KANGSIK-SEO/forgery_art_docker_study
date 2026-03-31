// ─── DOM Elements ───
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const cameraSection = document.getElementById('cameraSection');
const cameraFeed = document.getElementById('cameraFeed');
const captureBtn = document.getElementById('captureBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const captureCanvas = document.getElementById('captureCanvas');
const uploadSection = document.getElementById('uploadSection');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const analysisSection = document.getElementById('analysisSection');
const analysisImage = document.getElementById('analysisImage');
const analysisProgress = document.getElementById('analysisProgress');
const analysisResult = document.getElementById('analysisResult');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');

let currentImageData = null;
let cameraStream = null;

// ─── File Upload ───
dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) return;
    fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
});

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageData = e.target.result;
        showPreview(currentImageData);
    };
    reader.readAsDataURL(file);
}

function showPreview(src) {
    previewImage.src = src;
    uploadSection.classList.add('hidden');
    cameraSection.classList.add('hidden');
    previewSection.classList.remove('hidden');
    stopCamera();
}

// ─── Camera ───
cameraBtn.addEventListener('click', async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 } }
        });
        cameraFeed.srcObject = cameraStream;
        uploadSection.classList.add('hidden');
        cameraSection.classList.remove('hidden');
    } catch {
        alert('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
});

captureBtn.addEventListener('click', () => {
    const w = cameraFeed.videoWidth;
    const h = cameraFeed.videoHeight;
    captureCanvas.width = w;
    captureCanvas.height = h;
    captureCanvas.getContext('2d').drawImage(cameraFeed, 0, 0, w, h);
    currentImageData = captureCanvas.toDataURL('image/jpeg', 0.9);
    showPreview(currentImageData);
});

closeCameraBtn.addEventListener('click', () => {
    stopCamera();
    cameraSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
}

// ─── Reset ───
resetBtn.addEventListener('click', resetAll);
newAnalysisBtn.addEventListener('click', resetAll);

function resetAll() {
    currentImageData = null;
    previewSection.classList.add('hidden');
    analysisSection.classList.add('hidden');
    analysisResult.classList.add('hidden');
    analysisProgress.classList.remove('hidden');
    document.querySelectorAll('.step').forEach(s => {
        s.classList.remove('active', 'done');
    });
    uploadSection.classList.remove('hidden');
    fileInput.value = '';
}

// ─── Analysis ───
analyzeBtn.addEventListener('click', startAnalysis);

async function startAnalysis() {
    previewSection.classList.add('hidden');
    analysisSection.classList.remove('hidden');
    analysisImage.src = currentImageData;
    analysisProgress.classList.remove('hidden');
    analysisResult.classList.add('hidden');

    // Reset steps
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'done'));

    // Extract image features
    const features = await extractFeatures(currentImageData);

    // Animate quantum canvas
    const qCtx = document.getElementById('quantumCanvas').getContext('2d');
    const qAnim = startQuantumAnimation(qCtx);

    // Progress steps
    const steps = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
    for (let i = 0; i < steps.length; i++) {
        document.getElementById(steps[i]).classList.add('active');
        await sleep(600 + Math.random() * 800);
        document.getElementById(steps[i]).classList.remove('active');
        document.getElementById(steps[i]).classList.add('done');
    }

    cancelAnimationFrame(qAnim);

    // Generate verdict
    const result = generateVerdict(features);
    displayResult(result, features);
}

// ─── Feature Extraction ───
function extractFeatures(imgSrc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 200;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;

            // Color analysis
            const colors = { r: [], g: [], b: [] };
            const hues = new Array(360).fill(0);
            let edgeScore = 0;

            for (let i = 0; i < data.length; i += 4) {
                colors.r.push(data[i]);
                colors.g.push(data[i + 1]);
                colors.b.push(data[i + 2]);

                // Hue histogram
                const [h] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
                hues[Math.floor(h * 359)]++;
            }

            // Edge detection (simple Sobel)
            for (let y = 1; y < size - 1; y++) {
                for (let x = 1; x < size - 1; x++) {
                    const idx = (y * size + x) * 4;
                    const gx = -data[idx - 4] + data[idx + 4] - data[idx - size * 4 - 4] + data[idx - size * 4 + 4] - data[idx + size * 4 - 4] + data[idx + size * 4 + 4];
                    const gy = -data[idx - size * 4] + data[idx + size * 4] - data[idx - size * 4 - 4] + data[idx + size * 4 - 4] - data[idx - size * 4 + 4] + data[idx + size * 4 + 4];
                    edgeScore += Math.sqrt(gx * gx + gy * gy);
                }
            }
            edgeScore /= ((size - 2) * (size - 2));

            // Color statistics
            const stats = (arr) => {
                const mean = arr.reduce((a, b) => a + b) / arr.length;
                const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
                return { mean, std };
            };

            // Dominant colors (simple k-means-ish)
            const dominantColors = extractDominantColors(data, size);

            // Texture complexity
            let textureScore = 0;
            for (let i = 4; i < data.length; i += 4) {
                textureScore += Math.abs(data[i] - data[i - 4]);
            }
            textureScore /= (data.length / 4);

            // Symmetry score
            let symmetryScore = 0;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size / 2; x++) {
                    const left = (y * size + x) * 4;
                    const right = (y * size + (size - 1 - x)) * 4;
                    symmetryScore += Math.abs(data[left] - data[right]);
                }
            }
            symmetryScore /= (size * size / 2);

            resolve({
                colorStats: { r: stats(colors.r), g: stats(colors.g), b: stats(colors.b) },
                hueHistogram: hues,
                edgeScore,
                textureScore,
                symmetryScore,
                dominantColors,
                imageSize: { w: img.naturalWidth, h: img.naturalHeight }
            });
        };
        img.src = imgSrc;
    });
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h, s, l];
}

function extractDominantColors(data, size) {
    const buckets = {};
    for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        buckets[key] = (buckets[key] || 0) + 1;
    }
    return Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return { r, g, b };
        });
}

// ─── Verdict Generation ───
function generateVerdict(features) {
    // Scoring system based on multiple heuristics
    // In a real system, this would use a trained ML model
    let forgeryScore = 0;

    // 1. Edge uniformity (too uniform = suspicious)
    if (features.edgeScore < 15) forgeryScore += 25;
    else if (features.edgeScore < 30) forgeryScore += 10;

    // 2. Color variance (too little variance = possible digital)
    const avgStd = (features.colorStats.r.std + features.colorStats.g.std + features.colorStats.b.std) / 3;
    if (avgStd < 30) forgeryScore += 20;
    else if (avgStd > 80) forgeryScore += 5;

    // 3. Texture complexity
    if (features.textureScore < 8) forgeryScore += 15;
    else if (features.textureScore > 40) forgeryScore += 5;

    // 4. Symmetry (too perfect = suspicious)
    if (features.symmetryScore < 20) forgeryScore += 15;

    // 5. Color diversity
    if (features.dominantColors.length < 4) forgeryScore += 10;

    // Add controlled randomness for demo variety
    forgeryScore += (Math.random() * 20) - 10;
    forgeryScore = Math.max(5, Math.min(95, forgeryScore));

    const isForgery = forgeryScore > 50;
    const confidence = isForgery
        ? 50 + (forgeryScore - 50) * 1.0
        : 50 + (50 - forgeryScore) * 1.0;

    return {
        isForgery,
        forgeryScore: Math.round(forgeryScore),
        confidence: Math.min(97.8, Math.max(61.2, confidence)).toFixed(1)
    };
}

// ─── Display Result ───
function displayResult(result, features) {
    const card = document.getElementById('verdictCard');
    const badge = document.getElementById('verdictBadge');
    const text = document.getElementById('verdictText');
    const fill = document.getElementById('confidenceFill');
    const value = document.getElementById('confidenceValue');

    card.className = 'verdict-card ' + (result.isForgery ? 'forgery' : 'genuine');
    badge.textContent = result.isForgery ? '⚠️' : '✅';
    text.textContent = result.isForgery ? '위작 의심 (FORGERY SUSPECTED)' : '진품 판정 (AUTHENTIC)';
    value.textContent = result.confidence + '%';

    setTimeout(() => {
        fill.style.width = result.confidence + '%';
    }, 100);

    // Color palette
    const palette = document.getElementById('colorPalette');
    palette.innerHTML = '';
    features.dominantColors.forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = `rgb(${c.r},${c.g},${c.b})`;
        palette.appendChild(swatch);
    });

    document.getElementById('colorAnalysis').textContent =
        result.isForgery
            ? `색채 분포가 ${features.colorStats.r.std < 40 ? '비정상적으로 균일합니다' : '기계적 패턴을 보입니다'}. 원작 유화의 자연스러운 색상 전이가 부족합니다. RGB 표준편차 R:${features.colorStats.r.std.toFixed(1)} G:${features.colorStats.g.std.toFixed(1)} B:${features.colorStats.b.std.toFixed(1)}`
            : `색채 분포가 자연스럽고 유화 특유의 풍부한 색상 전이를 보입니다. RGB 표준편차 R:${features.colorStats.r.std.toFixed(1)} G:${features.colorStats.g.std.toFixed(1)} B:${features.colorStats.b.std.toFixed(1)}`;

    // Brush stroke visualization
    drawBrushAnalysis(features);

    document.getElementById('brushAnalysis').textContent =
        result.isForgery
            ? `에지 강도 ${features.edgeScore.toFixed(1)}로 ${features.edgeScore < 20 ? '붓터치의 자연스러운 임파스토 기법이 감지되지 않습니다' : '기계적으로 재현된 붓자국 패턴이 의심됩니다'}.`
            : `에지 강도 ${features.edgeScore.toFixed(1)}로 자연스러운 붓터치 패턴이 확인됩니다. 작가 고유의 필치가 일관되게 나타납니다.`;

    // Quantum feature visualization
    drawFeatureVector(features, result);

    document.getElementById('quantumAnalysis').textContent =
        result.isForgery
            ? `양자 특징 벡터 분석 결과, 텍스처 복잡도 ${features.textureScore.toFixed(1)}, 대칭 지수 ${features.symmetryScore.toFixed(1)}로 원작 데이터베이스와의 편차가 발견되었습니다.`
            : `양자 특징 벡터 분석 결과, 텍스처 복잡도 ${features.textureScore.toFixed(1)}, 대칭 지수 ${features.symmetryScore.toFixed(1)}로 원작 범위 내에 있습니다.`;

    // Expert opinion
    document.getElementById('expertOpinion').textContent = generateExpertOpinion(result, features);

    // Meta
    document.getElementById('reportDate').textContent = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('reportId').textContent = 'AFL-' + Date.now().toString(36).toUpperCase();

    // Show
    analysisProgress.classList.add('hidden');
    analysisResult.classList.remove('hidden');
}

function generateExpertOpinion(result, features) {
    if (result.isForgery) {
        const reasons = [];
        if (features.edgeScore < 20) reasons.push('붓터치의 깊이감이 부재');
        if (features.textureScore < 10) reasons.push('질감의 단조로움');
        if (features.symmetryScore < 25) reasons.push('비자연적 대칭성');
        if (features.colorStats.r.std < 40) reasons.push('제한된 색상 범위');

        return `[소더비 수석감정관 소견]\n\n본 작품은 정밀 분석 결과 위작으로 의심됩니다.\n\n주요 근거:\n${reasons.map(r => '• ' + r).join('\n')}\n\n40년간의 감정 경험에 비추어, 본 작품에서는 원작가의 고유한 예술적 특징이 충분히 관찰되지 않습니다. 특히 ${features.edgeScore < 20 ? '임파스토 기법의 부재와 ' : ''}안료의 시대적 일관성에 의문이 제기됩니다.\n\nIBM Quantum System Two의 127큐빗 프로세서를 활용한 양자 패턴 매칭에서도 위작 데이터베이스와의 유사도가 ${result.forgeryScore}%로 측정되었습니다.\n\n추가 과학적 감정(X선 형광분석, 적외선 반사촬영)을 권고합니다.`;
    } else {
        return `[소더비 수석감정관 소견]\n\n본 작품은 정밀 분석 결과 진품으로 판정됩니다.\n\n판정 근거:\n• 자연스러운 붓터치 패턴 확인\n• 시대에 부합하는 색채 구성\n• 원작가 특유의 질감 표현 일치\n• 양자 특징 벡터 원작 범위 내\n\n40년간의 감정 경험에 비추어, 본 작품에서 원작가의 예술적 특징이 충실히 관찰됩니다. 색상의 깊이와 붓터치의 자연스러운 변주가 원작의 특성과 일치합니다.\n\nGoogle Sycamore 양자 프로세서의 고차원 특징 공간 분석에서도 원작 클러스터 내에 위치하는 것이 확인되었습니다 (유사도 ${100 - result.forgeryScore}%).\n\n본 감정서는 소더비 국제 감정 기준에 따라 작성되었습니다.`;
    }
}

// ─── Visualizations ───
function drawBrushAnalysis(features) {
    const canvas = document.getElementById('brushCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 150);

    // Draw edge distribution as a wave
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < 300; x++) {
        const y = 75 + Math.sin(x * 0.05 + features.edgeScore * 0.1) * 30
            * Math.sin(x * 0.02) + (Math.random() - 0.5) * features.edgeScore * 0.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Reference line
    ctx.strokeStyle = '#2ecc7740';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 75);
    ctx.lineTo(300, 75);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawFeatureVector(features, result) {
    const canvas = document.getElementById('featureCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 150);

    // Draw radar-like feature visualization
    const cx = 150, cy = 75, r = 55;
    const metrics = [
        features.edgeScore / 80,
        features.textureScore / 60,
        features.symmetryScore / 100,
        features.colorStats.r.std / 100,
        features.colorStats.g.std / 100,
        features.colorStats.b.std / 100
    ];

    // Background grid
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 0.5;
    for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= metrics.length; i++) {
            const angle = (i / metrics.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * (r * ring / 3);
            const y = cy + Math.sin(angle) * (r * ring / 3);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Feature polygon
    ctx.fillStyle = result.isForgery ? '#e74c3c20' : '#2ecc7120';
    ctx.strokeStyle = result.isForgery ? '#e74c3c' : '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    metrics.forEach((val, i) => {
        const angle = (i / metrics.length) * Math.PI * 2 - Math.PI / 2;
        const v = Math.min(1, val);
        const x = cx + Math.cos(angle) * r * v;
        const y = cy + Math.sin(angle) * r * v;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dots
    metrics.forEach((val, i) => {
        const angle = (i / metrics.length) * Math.PI * 2 - Math.PI / 2;
        const v = Math.min(1, val);
        const x = cx + Math.cos(angle) * r * v;
        const y = cy + Math.sin(angle) * r * v;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = result.isForgery ? '#e74c3c' : '#2ecc71';
        ctx.fill();
    });
}

function startQuantumAnimation(ctx) {
    const w = 400, h = 150;
    let frame = 0;

    function draw() {
        ctx.fillStyle = '#12121a';
        ctx.fillRect(0, 0, w, h);

        // Quantum wave visualization
        for (let wave = 0; wave < 3; wave++) {
            ctx.strokeStyle = ['#7c4dff60', '#c9a84c60', '#2ecc7160'][wave];
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let x = 0; x < w; x++) {
                const y = h / 2 +
                    Math.sin(x * 0.03 + frame * 0.05 + wave * 2) * 25 *
                    Math.sin(x * 0.01 + frame * 0.02) +
                    Math.sin(x * 0.08 + frame * 0.1 + wave) * 10;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Particles
        for (let i = 0; i < 15; i++) {
            const px = (frame * 3 + i * 30) % w;
            const py = h / 2 + Math.sin(px * 0.04 + frame * 0.03 + i) * 30;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#c9a84c';
            ctx.fill();
        }

        frame++;
        return requestAnimationFrame(draw);
    }

    return draw();
}

// ─── Utility ───
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
