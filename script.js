class SmartSharpenPro {
    constructor(options = {}) {
        // ตัวแปรหลัก
        this.ids = {
            canvas: 'canvas', upload: 'upload', uploadBtn: 'uploadBtn', undoBtn: 'undoBtn',
            redoBtn: 'redoBtn', resetBtn: 'resetBtn', aiRemoveBgBtn: 'aiRemoveBgBtn',
            aiStatus: 'aiStatus', sharpenBtn: 'sharpenBtn', cancelSharpenBtn: 'cancelSharpenBtn',
            colorBoostBtn: 'colorBoostBtn', resetColorBtn: 'resetColorBtn', saveBtn: 'saveBtn',
            toggleZoomBtn: 'toggleZoomBtn', zoomCanvas: 'zoomCanvas', floatingZoom: 'floatingZoom',
            progressContainer: 'progressContainer', progressFill: 'progressFill',
            imageStatus: 'imageStatus', amount: 'amount', radius: 'radius', threshold: 'threshold',
            preblur: 'preblur', amountVal: 'amountVal', radiusVal: 'radiusVal',
            thresholdVal: 'thresholdVal', preblurVal: 'preblurVal', saturation: 'saturation',
            brightness: 'brightness', satVal: 'satVal', brightVal: 'brightVal', mode: 'mode',
            voiceBtn: 'voiceBtn', voiceStatusMsg: 'voiceStatusMsg', resetSharpenBtn: 'resetSharpenBtn'
        };

        // สถานะต่างๆ
        this.originalImageData = null;
        this.currentImageData = null;
        this.isProcessing = false;
        this.activeWorker = null;
        this.abortController = null;
        this.undoStack = [];
        this.redoStack = [];
        this.MAX_STACK = 30;
        this.recognition = null;
        this.removeBackgroundFn = null;
        this._saveTimer = null; // สำหรับ throttle การบันทึก

        // เริ่มต้นระบบ
        this.init();
    }

    // ============================================================
    //  1. ฟังก์ชันเริ่มต้น (init)
    // ============================================================
    init() {
        this.canvas = document.getElementById(this.ids.canvas);
        if (!this.canvas) throw Error('Canvas not found');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        this.zoomCanvas = document.getElementById(this.ids.zoomCanvas);
        if (this.zoomCanvas) this.zoomCtx = this.zoomCanvas.getContext('2d');
        this.floatingZoom = document.getElementById(this.ids.floatingZoom);

        // ดึง Elements ทั้งหมด
        this.uploadInput = document.getElementById(this.ids.upload);
        this.uploadBtn = document.getElementById(this.ids.uploadBtn);
        this.undoBtn = document.getElementById(this.ids.undoBtn);
        this.redoBtn = document.getElementById(this.ids.redoBtn);
        this.resetBtn = document.getElementById(this.ids.resetBtn);
        this.aiRemoveBtn = document.getElementById(this.ids.aiRemoveBgBtn);
        this.aiStatusSpan = document.getElementById(this.ids.aiStatus);
        this.sharpenBtn = document.getElementById(this.ids.sharpenBtn);
        this.cancelSharpenBtn = document.getElementById(this.ids.cancelSharpenBtn);
        this.colorBoostBtn = document.getElementById(this.ids.colorBoostBtn);
        this.resetColorBtn = document.getElementById(this.ids.resetColorBtn);
        this.saveBtn = document.getElementById(this.ids.saveBtn);
        this.toggleZoomBtn = document.getElementById(this.ids.toggleZoomBtn);
        this.progressContainer = document.getElementById(this.ids.progressContainer);
        this.progressFill = document.getElementById(this.ids.progressFill);
        this.imageStatusDiv = document.getElementById(this.ids.imageStatus);

        // Sliders
        this.amountSlider = document.getElementById(this.ids.amount);
        this.radiusSlider = document.getElementById(this.ids.radius);
        this.thresholdSlider = document.getElementById(this.ids.threshold);
        this.preblurSlider = document.getElementById(this.ids.preblur);
        this.amountValSpan = document.getElementById(this.ids.amountVal);
        this.radiusValSpan = document.getElementById(this.ids.radiusVal);
        this.thresholdValSpan = document.getElementById(this.ids.thresholdVal);
        this.preblurValSpan = document.getElementById(this.ids.preblurVal);
        this.saturationSlider = document.getElementById(this.ids.saturation);
        this.brightnessSlider = document.getElementById(this.ids.brightness);
        this.satValSpan = document.getElementById(this.ids.satVal);
        this.brightValSpan = document.getElementById(this.ids.brightVal);
        this.modeSelect = document.getElementById(this.ids.mode);
        this.voiceBtn = document.getElementById(this.ids.voiceBtn);
        this.voiceStatusSpan = document.getElementById(this.ids.voiceStatusMsg);
        this.resetSharpenBtn = document.getElementById(this.ids.resetSharpenBtn);

        // ผูก Events
        this.bindEvents();
        this.updateSliderDisplays();

        // ✅ เรียกใช้ Restore AutoSave (เวอร์ชันใหม่)
        this.restoreAutoSave();

        // ระบบเสียงและ AI
        this.initVoiceRecognition();
        this.speakThai("ยินดีต้อนรับสู่ Smart Sharpen Pro ครับ");
        this.preloadModelWithRetry();
    }

    // ============================================================
    //  2. ระบบ AutoSave + Restore (ปรับปรุงใหม่)
    // ============================================================

    // 2.1 บันทึกอัตโนมัติ (ใช้ IndexedDB + Fallback)
    async autoSaveToLocal() {
        if (!this.canvas || !this.canvas.width || !this.canvas.height) return;

        // จำกัดขนาดภาพก่อนบันทึก (เพื่อประหยัดพื้นที่)
        const MAX_AUTO_SAVE_SIZE = 800;
        let sourceCanvas = this.canvas;
        let tempCanvas = null;

        if (this.canvas.width > MAX_AUTO_SAVE_SIZE || this.canvas.height > MAX_AUTO_SAVE_SIZE) {
            const ratio = Math.min(MAX_AUTO_SAVE_SIZE / this.canvas.width, MAX_AUTO_SAVE_SIZE / this.canvas.height);
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.floor(this.canvas.width * ratio);
            tempCanvas.height = Math.floor(this.canvas.height * ratio);
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            sourceCanvas = tempCanvas;
        }

        // แปลงเป็น Blob (ประหยัดกว่า base64)
        let blob;
        try {
            blob = await new Promise((resolve, reject) => {
                sourceCanvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('toBlob failed'));
                }, 'image/jpeg', 0.7);
            });
        } catch (err) {
            console.warn('⚠️ สร้าง Blob ไม่สำเร็จ:', err);
            return;
        }

        // บันทึกลง IndexedDB
        try {
            const db = await this._openAutoSaveDB();
            const tx = db.transaction('autosave', 'readwrite');
            const store = tx.objectStore('autosave');
            await store.put(blob, 'current');
            await tx.done;
            console.log('✅ บันทึก autosave สำเร็จ (ขนาด:', (blob.size / 1024).toFixed(1), 'KB)');
        } catch (err) {
            console.warn('⚠️ IndexedDB ล้มเหลว, ใช้ localStorage fallback', err);
            // Fallback ไป localStorage
            try {
                const dataUrl = sourceCanvas.toDataURL('image/jpeg', 0.5);
                localStorage.setItem('autosave_pro_fallback', dataUrl);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('⚠️ localStorage ก็เต็มแล้ว ล้างข้อมูลเก่า');
                    localStorage.removeItem('autosave_pro_fallback');
                }
            }
        }
    }

    // 2.2 เปิดฐานข้อมูล IndexedDB
    _openAutoSaveDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SmartSharpenDB', 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('autosave')) {
                    db.createObjectStore('autosave');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 2.3 กู้คืนภาพอัตโนมัติ
    async restoreAutoSave() {
        // 1. ลองจาก IndexedDB
        try {
            const db = await this._openAutoSaveDB();
            const tx = db.transaction('autosave', 'readonly');
            const store = tx.objectStore('autosave');
            const blob = await store.get('current');
            await tx.done;

            if (blob instanceof Blob) {
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    this.loadImageToCanvas(img);
                    URL.revokeObjectURL(url);
                    console.log('✅ กู้คืน autosave จาก IndexedDB สำเร็จ');
                    this._clearAutoSave(); // ลบข้อมูลหลังกู้คืน
                };
                img.onerror = () => {
                    console.warn('⚠️ โหลดภาพจาก IndexedDB ไม่สำเร็จ');
                    this._restoreFromLocalStorageFallback();
                };
                img.src = url;
                return;
            }
        } catch (err) {
            console.warn('⚠️ IndexedDB ไม่มีข้อมูล หรืออ่านไม่สำเร็จ', err);
        }

        // 2. Fallback: localStorage
        this._restoreFromLocalStorageFallback();
    }

    // 2.4 กู้คืนจาก LocalStorage (สำรอง)
    _restoreFromLocalStorageFallback() {
        const saved = localStorage.getItem('autosave_pro_fallback');
        if (!saved) return;
        const img = new Image();
        img.onload = () => {
            this.loadImageToCanvas(img);
            localStorage.removeItem('autosave_pro_fallback');
            console.log('✅ กู้คืน autosave จาก localStorage สำเร็จ');
        };
        img.onerror = () => {
            console.warn('⚠️ ข้อมูล autosave ใน localStorage เสียหาย');
            localStorage.removeItem('autosave_pro_fallback');
        };
        img.src = saved;
    }

    // 2.5 ล้างข้อมูล AutoSave
    async _clearAutoSave() {
        try {
            const db = await this._openAutoSaveDB();
            const tx = db.transaction('autosave', 'readwrite');
            const store = tx.objectStore('autosave');
            await store.delete('current');
            await tx.done;
            console.log('🧹 ล้าง autosave เรียบร้อย');
        } catch (err) {
            console.warn('⚠️ ล้าง autosave ไม่สำเร็จ', err);
        }
        localStorage.removeItem('autosave_pro_fallback');
    }

    // ============================================================
    //  3. pushToUndo (ปรับปรุงให้บันทึกแบบ Throttle)
    // ============================================================
    pushToUndo(stateImgData, clearRedo = true) {
        if (!stateImgData) return;
        const cloned = new ImageData(
            new Uint8ClampedArray(stateImgData.data),
            stateImgData.width,
            stateImgData.height
        );
        this.undoStack.push(cloned);
        if (this.undoStack.length > this.MAX_STACK) this.undoStack.shift();
        if (clearRedo) this.redoStack = [];
        this.updateUndoButtons();

        // ✅ บันทึก autosave แบบ Throttle (ไม่รอ)
        if (!this._saveTimer) {
            this._saveTimer = setTimeout(() => {
                this.autoSaveToLocal();
                this._saveTimer = null;
            }, 800);
        }
    }

    // ============================================================
    //  4. ฟังก์ชันอื่นๆ (คงเดิม แต่ปรับให้ใช้ async/await)
    // ============================================================

    // 4.1 โหลด AI พร้อม Retry
    async preloadModelWithRetry(maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> กำลังโหลด AI โมเดล (ครั้งที่ ' + (i + 1) + ')...';
                await this.getAIRemover(true);
                if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-check-circle"></i> AI พร้อมใช้งาน (โหลดล่วงหน้า)';
                return;
            } catch (e) {
                console.warn(`Preload attempt ${i + 1} failed:`, e);
                if (i === maxRetries - 1) {
                    if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-exclamation-triangle"></i> โหลด AI ไม่สำเร็จ กรุณารีเฟรชหรือตรวจสอบเน็ต';
                } else {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
    }

    async getAIRemover(forceReload = false) {
        if (this.removeBackgroundFn && !forceReload) return this.removeBackgroundFn;
        if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> กำลังโหลด AI...';
        try {
            const module = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm");
            this.removeBackgroundFn = module.removeBackground;
            if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-check-circle"></i> AI พร้อมใช้งาน';
            return this.removeBackgroundFn;
        } catch (err) {
            console.error("Load AI failed", err);
            if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-exclamation-triangle"></i> โหลด AI ล้มเหลว';
            throw err;
        }
    }

    blobToImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    // 4.2 ลบพื้นหลังด้วย AI (เร็วขึ้น)
    async performAIRemove() {
        if (!this.originalImageData) { this.speakThai("กรุณาอัปโหลดรูปภาพก่อน"); return false; }
        if (this.isProcessing) { this.speakThai("กำลังประมวลผล โปรดรอ"); return false; }
        this.isProcessing = true;
        if (this.aiRemoveBtn) { this.aiRemoveBtn.disabled = true; this.aiRemoveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> กำลังลบพื้นหลัง...'; }
        this.setProgress(10, true);
        try {
            let remover = await this.getAIRemover();
            this.setProgress(30);
            const originalWidth = this.canvas.width, originalHeight = this.canvas.height;
            const MAX_SIZE = 640;
            let blob;
            if (originalWidth > MAX_SIZE || originalHeight > MAX_SIZE) {
                const ratio = Math.min(MAX_SIZE / originalWidth, MAX_SIZE / originalHeight);
                const smallCanvas = document.createElement('canvas');
                smallCanvas.width = Math.floor(originalWidth * ratio);
                smallCanvas.height = Math.floor(originalHeight * ratio);
                const smallCtx = smallCanvas.getContext('2d');
                smallCtx.drawImage(this.canvas, 0, 0, smallCanvas.width, smallCanvas.height);
                blob = await new Promise(res => smallCanvas.toBlob(res, 'image/png'));
            } else {
                blob = await new Promise(res => this.canvas.toBlob(res, 'image/png'));
            }
            this.setProgress(40);
            let resultBlob;
            try {
                resultBlob = await remover(blob, {
                    cache: true,
                    model: 'small',
                    device: 'gpu',
                    progress: (p) => {
                        const percent = 40 + Math.floor(p * 50);
                        if (percent % 10 === 0 || percent === 100) this.setProgress(percent);
                    }
                });
            } catch (cacheErr) {
                console.warn("Cache error, retrying without cache", cacheErr);
                this.speakThai("โหลดโมเดล cache ไม่สำเร็จ ลองใหม่โดยไม่ใช้ cache");
                this.removeBackgroundFn = null;
                remover = await this.getAIRemover(true);
                resultBlob = await remover(blob, {
                    cache: false,
                    model: 'small',
                    device: 'gpu',
                    progress: (p) => {
                        const percent = 40 + Math.floor(p * 50);
                        if (percent % 10 === 0 || percent === 100) this.setProgress(percent);
                    }
                });
            }
            this.setProgress(90);
            const img = await this.blobToImage(resultBlob);
            this.ctx.clearRect(0, 0, originalWidth, originalHeight);
            this.ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
            URL.revokeObjectURL(img.src);
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pushToUndo(this.currentImageData, true);
            this.setProgress(100);
            if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-check-circle"></i> ลบพื้นหลังสำเร็จ';
            if (this.aiRemoveBtn) { this.aiRemoveBtn.innerHTML = '<i class="fas fa-cut"></i> ลบพื้นหลังอัจฉริยะ'; this.aiRemoveBtn.disabled = false; }
            this.isProcessing = false;
            this.speakThai("ลบพื้นหลังเรียบร้อยแล้ว");
            return true;
        } catch (err) {
            console.error("AI remove error", err);
            if (this.aiStatusSpan) this.aiStatusSpan.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ล้มเหลว: ' + (err.message || "unknown");
            if (this.aiRemoveBtn) { this.aiRemoveBtn.innerHTML = '<i class="fas fa-cut"></i> ลบพื้นหลังอัจฉริยะ'; this.aiRemoveBtn.disabled = false; }
            this.isProcessing = false;
            this.setProgress(0);
            this.speakThai("การลบพื้นหลังล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต");
            return false;
        }
    }

    // 4.3 ฟังก์ชันจัดการ Events
    bindEvents() {
        if (this.uploadBtn) this.uploadBtn.onclick = () => this.uploadInput?.click();
        if (this.uploadInput) this.uploadInput.onchange = (e) => { if (e.target.files[0]) this.handleFile(e.target.files[0]); };
        if (this.resetBtn) this.resetBtn.onclick = () => this.resetImage();
        if (this.undoBtn) this.undoBtn.onclick = () => this.undo();
        if (this.redoBtn) this.redoBtn.onclick = () => this.redo();
        if (this.aiRemoveBtn) this.aiRemoveBtn.onclick = () => this.performAIRemove();
        if (this.sharpenBtn) this.sharpenBtn.onclick = () => this.applySharpenWorker();
        if (this.cancelSharpenBtn) this.cancelSharpenBtn.onclick = () => this.cancelSharpenTask();
        if (this.colorBoostBtn) this.colorBoostBtn.onclick = () => this.applyColorBoost();
        if (this.resetColorBtn) this.resetColorBtn.onclick = () => this.resetColor();
        if (this.saveBtn) this.saveBtn.onclick = () => this.saveImage();
        if (this.toggleZoomBtn) this.toggleZoomBtn.onclick = () => this.toggleZoom();
        if (this.voiceBtn) this.voiceBtn.onclick = () => this.startVoiceCommand();
        if (this.resetSharpenBtn) this.resetSharpenBtn.onclick = () => this.resetSharpenEngine();

        const sliders = [this.amountSlider, this.radiusSlider, this.thresholdSlider, this.preblurSlider, this.saturationSlider, this.brightnessSlider];
        sliders.forEach(slider => { if (slider) slider.oninput = () => this.updateSliderDisplays(); });

        const wrapper = this.canvas.parentElement;
        if (wrapper) {
            wrapper.addEventListener('dragover', (e) => { e.preventDefault(); wrapper.classList.add('drag-over'); });
            wrapper.addEventListener('dragleave', () => wrapper.classList.remove('drag-over'));
            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                wrapper.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) this.handleFile(file);
            });
        }

        document.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => { this.loadImageToCanvas(img);
                        URL.revokeObjectURL(url); };
                    img.src = url;
                    break;
                }
            }
        });

        let zoomTimer = null;
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.floatingZoom || this.floatingZoom.classList.contains('hidden')) return;
            if (zoomTimer) return;
            zoomTimer = setTimeout(() => {
                const rect = this.canvas.getBoundingClientRect();
                if (rect.width === 0) return;
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                let x = (e.clientX - rect.left) * scaleX;
                let y = (e.clientY - rect.top) * scaleY;
                x = Math.min(this.canvas.width - 30, Math.max(30, x));
                y = Math.min(this.canvas.height - 30, Math.max(30, y));
                if (this.zoomCtx && this.zoomCanvas) {
                    this.zoomCtx.clearRect(0, 0, 180, 180);
                    this.zoomCtx.drawImage(this.canvas, x - 30, y - 30, 60, 60, 0, 0, 180, 180);
                    this.zoomCtx.strokeStyle = '#3B82F6';
                    this.zoomCtx.lineWidth = 2;
                    this.zoomCtx.beginPath();
                    this.zoomCtx.moveTo(90, 0);
                    this.zoomCtx.lineTo(90, 180);
                    this.zoomCtx.stroke();
                    this.zoomCtx.beginPath();
                    this.zoomCtx.moveTo(0, 90);
                    this.zoomCtx.lineTo(180, 90);
                    this.zoomCtx.stroke();
                }
                zoomTimer = null;
            }, 12);
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault();
                this.undo(); } else if (e.ctrlKey && e.key === 'y') { e.preventDefault();
                this.redo(); } else if (e.ctrlKey && e.key === 'Enter') { e.preventDefault();
                this.applySharpenWorker(); } else if (e.ctrlKey && e.key === 's') { e.preventDefault();
                this.saveImage(); }
        });
    }

    updateSliderDisplays() {
        if (this.amountSlider && this.amountValSpan) this.amountValSpan.innerText = this.amountSlider.value + '%';
        if (this.radiusSlider && this.radiusValSpan) this.radiusValSpan.innerText = this.radiusSlider.value;
        if (this.thresholdSlider && this.thresholdValSpan) this.thresholdValSpan.innerText = this.thresholdSlider.value;
        if (this.preblurSlider && this.preblurValSpan) this.preblurValSpan.innerText = this.preblurSlider.value;
        if (this.saturationSlider && this.satValSpan) this.satValSpan.innerText = this.saturationSlider.value + '%';
        if (this.brightnessSlider && this.brightValSpan) this.brightValSpan.innerText = this.brightnessSlider.value;
    }

    speakThai(message) {
        if (!window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'th-TH';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    setProgress(percent, show = true) {
        if (!this.progressContainer || !this.progressFill) return;
        if (show) this.progressContainer.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        if (percent >= 100) setTimeout(() => { if (this.progressContainer) this.progressContainer.style.display = 'none'; }, 500);
    }

    updateUndoButtons() {
        if (this.undoBtn) this.undoBtn.disabled = this.undoStack.length === 0 || this.isProcessing;
        if (this.redoBtn) this.redoBtn.disabled = this.redoStack.length === 0 || this.isProcessing;
    }

    undo() {
        if (this.undoStack.length === 0 || this.isProcessing) return;
        const prev = this.undoStack.pop();
        const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.redoStack.push(current);
        if (this.redoStack.length > this.MAX_STACK) this.redoStack.shift();
        this.ctx.putImageData(prev, 0, 0);
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.updateUndoButtons();
        this.autoSaveToLocal();
        this.speakThai("เลิกทำสำเร็จ");
    }

    redo() {
        if (this.redoStack.length === 0 || this.isProcessing) return;
        const next = this.redoStack.pop();
        const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push(current);
        if (this.undoStack.length > this.MAX_STACK) this.undoStack.shift();
        this.ctx.putImageData(next, 0, 0);
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.updateUndoButtons();
        this.autoSaveToLocal();
        this.speakThai("ทำซ้ำเรียบร้อย");
    }

    loadImageToCanvas(imgElement) {
        let w = imgElement.width,
            h = imgElement.height;
        const MAX_AREA = 3840 * 2160;
        if (w * h > MAX_AREA) {
            const ratio = Math.sqrt(MAX_AREA / (w * h));
            w = Math.floor(w * ratio);
            h = Math.floor(h * ratio);
            if (this.imageStatusDiv) this.imageStatusDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ปรับขนาดภาพ ${w}x${h}`;
        } else {
            if (this.imageStatusDiv) this.imageStatusDiv.innerHTML = `<i class="fas fa-check-circle"></i> โหลด ${w}x${h}`;
        }
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.drawImage(imgElement, 0, 0, w, h);
        const imgData = this.ctx.getImageData(0, 0, w, h);
        this.originalImageData = new ImageData(new Uint8ClampedArray(imgData.data), w, h);
        this.currentImageData = new ImageData(new Uint8ClampedArray(imgData.data), w, h);
        this.undoStack = [];
        this.redoStack = [];
        this.pushToUndo(this.currentImageData, false);
        this.updateUndoButtons();
    }

    handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => this.loadImageToCanvas(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    resetImage() {
        if (!this.originalImageData) return;
        this.ctx.putImageData(this.originalImageData, 0, 0);
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.pushToUndo(this.currentImageData, true);
        this.speakThai("รีเซ็ตเป็นภาพต้นฉบับ");
    }

    // 4.4 ระบบ Sharpen (Worker)
    createWorkerBlob() {
        const code = `
        self.onmessage = function(e) {
            const { imageData, width, height, amount, radius, threshold, preblur, mode } = e.data;
            function fastBlur(data, w, h, rad) {
                if (rad < 0.5) return data;
                const src = new Uint8ClampedArray(data);
                const temp = new Uint8ClampedArray(data.length);
                const size = Math.ceil(rad * 3);
                const kernel = [];
                let sum = 0;
                for (let i = -size; i <= size; i++) {
                    const val = Math.exp(-(i * i) / (2 * rad * rad));
                    kernel.push(val);
                    sum += val;
                }
                for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let rr = 0,
                            gg = 0,
                            bb = 0,
                            aa = 0;
                        for (let k = 0; k < kernel.length; k++) {
                            const kx = Math.min(w - 1, Math.max(0, x + (k - size)));
                            const idx = (y * w + kx) * 4;
                            const wt = kernel[k];
                            rr += src[idx] * wt;
                            gg += src[idx + 1] * wt;
                            bb += src[idx + 2] * wt;
                            aa += src[idx + 3] * wt;
                        }
                        const idx = (y * w + x) * 4;
                        temp[idx] = rr;
                        temp[idx + 1] = gg;
                        temp[idx + 2] = bb;
                        temp[idx + 3] = aa;
                    }
                }
                const out = new Uint8ClampedArray(data.length);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let rr = 0,
                            gg = 0,
                            bb = 0,
                            aa = 0;
                        for (let k = 0; k < kernel.length; k++) {
                            const ky = Math.min(h - 1, Math.max(0, y + (k - size)));
                            const idx = (ky * w + x) * 4;
                            const wt = kernel[k];
                            rr += temp[idx] * wt;
                            gg += temp[idx + 1] * wt;
                            bb += temp[idx + 2] * wt;
                            aa += temp[idx + 3] * wt;
                        }
                        const idx = (y * w + x) * 4;
                        out[idx] = rr;
                        out[idx + 1] = gg;
                        out[idx + 2] = bb;
                        out[idx + 3] = aa;
                    }
                }
                return out;
            }
            let srcData = new Uint8ClampedArray(imageData);
            if (preblur > 0) srcData = fastBlur(srcData, width, height, preblur);
            let blurData = fastBlur(srcData, width, height, radius);
            const out = new Uint8ClampedArray(srcData.length);
            const strength = (amount / 100) * (mode === 'detail' ? 1.4 : (mode === 'soft' ? 0.7 : 1));
            const threshVal = threshold;
            for (let i = 0; i < srcData.length; i += 4) {
                const r = srcData[i],
                    g = srcData[i + 1],
                    b = srcData[i + 2];
                const br = blurData[i],
                    bg = blurData[i + 1],
                    bb = blurData[i + 2];
                let dr = r - br,
                    dg = g - bg,
                    db = b - bb;
                const edge = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
                if (edge > threshVal) {
                    let finalStr = strength;
                    if (edge > 120) finalStr *= (1 - Math.min((edge - threshVal) / 200, 0.7));
                    out[i] = Math.min(255, Math.max(0, r + dr * finalStr));
                    out[i + 1] = Math.min(255, Math.max(0, g + dg * finalStr));
                    out[i + 2] = Math.min(255, Math.max(0, b + db * finalStr));
                } else {
                    out[i] = r;
                    out[i + 1] = g;
                    out[i + 2] = b;
                }
                out[i + 3] = srcData[i + 3];
            }
            self.postMessage({ type: 'result', data: out.buffer }, [out.buffer]);
        };`;
        return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    }

    async applySharpenWorker() {
        if (!this.originalImageData) { this.speakThai("ไม่มีภาพ กรุณาอัปโหลดก่อน"); return; }
        if (this.isProcessing) { this.speakThai("ระบบกำลังทำงานอยู่"); return; }
        if (this.activeWorker) this.activeWorker.terminate();
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        this.isProcessing = true;
        if (this.cancelSharpenBtn) this.cancelSharpenBtn.disabled = false;
        if (this.sharpenBtn) this.sharpenBtn.disabled = true;
        this.setProgress(0, true);
        const currentImg = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const params = {
            imageData: currentImg.data.buffer,
            width: currentImg.width,
            height: currentImg.height,
            amount: parseFloat(this.amountSlider.value),
            radius: parseFloat(this.radiusSlider.value),
            threshold: parseFloat(this.thresholdSlider.value),
            preblur: parseFloat(this.preblurSlider.value),
            mode: this.modeSelect.value
        };
        const workerUrl = this.createWorkerBlob();
        const worker = new Worker(workerUrl);
        this.activeWorker = worker;
        worker.postMessage(params, [params.imageData]);
        worker.onmessage = (e) => {
            if (e.data.type === 'result') {
                const resultData = new Uint8ClampedArray(e.data.data);
                const newImgData = new ImageData(resultData, currentImg.width, currentImg.height);
                this.ctx.putImageData(newImgData, 0, 0);
                this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.pushToUndo(this.currentImageData, true);
                worker.terminate();
                this.activeWorker = null;
                this.isProcessing = false;
                if (this.cancelSharpenBtn) this.cancelSharpenBtn.disabled = true;
                if (this.sharpenBtn) this.sharpenBtn.disabled = false;
                this.setProgress(100);
                URL.revokeObjectURL(workerUrl);
                this.speakThai("เพิ่มความคมชัดเสร็จสมบูรณ์");
            }
        };
        worker.onerror = () => {
            this.speakThai("เกิดข้อผิดพลาดในการเพิ่มความคมชัด");
            this.isProcessing = false;
            if (this.cancelSharpenBtn) this.cancelSharpenBtn.disabled = true;
            if (this.sharpenBtn) this.sharpenBtn.disabled = false;
            worker.terminate();
            this.activeWorker = null;
            this.setProgress(0);
            URL.revokeObjectURL(workerUrl);
        };
        this.abortController.signal.addEventListener('abort', () => {
            if (worker) worker.terminate();
            this.isProcessing = false;
            if (this.cancelSharpenBtn) this.cancelSharpenBtn.disabled = true;
            if (this.sharpenBtn) this.sharpenBtn.disabled = false;
            this.setProgress(0);
            URL.revokeObjectURL(workerUrl);
        });
    }

    cancelSharpenTask() {
        if (this.abortController) this.abortController.abort();
        this.speakThai("ยกเลิกการปรับความคมชัด");
    }

    // 4.5 ระบบสี
    adjustColor(imgData, satPercent, brightDelta) {
        const data = imgData.data;
        const out = new ImageData(imgData.width, imgData.height);
        const outData = out.data;
        const sat = satPercent / 100;
        const bright = brightDelta / 100;
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i] / 255,
                g = data[i + 1] / 255,
                b = data[i + 2] / 255;
            let max = Math.max(r, g, b),
                min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) h = s = 0;
            else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
                else if (max === g) h = (b - r) / d + 2;
                else h = (r - g) / d + 4;
                h /= 6;
            }
            s = Math.min(1, Math.max(0, s * sat));
            l = Math.min(1, Math.max(0, l + bright));
            let rgb;
            if (s === 0) rgb = [l, l, l];
            else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                rgb = [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
            }
            outData[i] = rgb[0] * 255;
            outData[i + 1] = rgb[1] * 255;
            outData[i + 2] = rgb[2] * 255;
            outData[i + 3] = data[i + 3];
        }
        return out;
    }

    applyColorBoost() {
        if (!this.originalImageData) { this.speakThai("ไม่มีภาพ"); return; }
        const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const satValNum = parseFloat(this.saturationSlider.value),
            brightValNum = parseFloat(this.brightnessSlider.value);
        const adjusted = this.adjustColor(cur, satValNum, brightValNum);
        this.ctx.putImageData(adjusted, 0, 0);
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.pushToUndo(this.currentImageData, true);
        this.speakThai("ปรับสีและแสงเรียบร้อย");
    }

    resetColor() {
        if (this.saturationSlider) this.saturationSlider.value = 100;
        if (this.brightnessSlider) this.brightnessSlider.value = 0;
        this.updateSliderDisplays();
        this.applyColorBoost();
        this.speakThai("รีเซ็ตค่าสีและความสว่าง");
    }

    // 4.6 บันทึกภาพ
    async saveImage() {
        if (!this.originalImageData) { this.speakThai("ไม่มีภาพที่จะบันทึก"); return; }
        let name = prompt("ชื่อไฟล์:", "smart_edit");
        if (!name) return;
        if (!name.endsWith(".png")) name += ".png";
        let sizeOption = prompt("ปรับขนาดก่อนบันทึก (กด Enter ใช้ขนาดเดิม):\nตัวอย่าง:\n800      → กว้าง 800px (คงสัดส่วน)\nx600     → สูง 600px (คงสัดส่วน)\n800x600  → กำหนดตรง ๆ\n50%      → ลดลงครึ่งหนึ่ง", "");
        let finalCanvas = this.canvas;
        let needsResize = false;
        let targetWidth = this.canvas.width,
            targetHeight = this.canvas.height;
        if (sizeOption && sizeOption.trim() !== "") {
            sizeOption = sizeOption.trim().toLowerCase();
            let matchPercent = sizeOption.match(/^(\d+(?:\.\d+)?)%$/);
            if (matchPercent) {
                let percent = parseFloat(matchPercent[1]) / 100;
                targetWidth = Math.floor(this.canvas.width * percent);
                targetHeight = Math.floor(this.canvas.height * percent);
                needsResize = true;
                this.speakThai(`ปรับขนาด ${percent * 100} เปอร์เซ็นต์`);
            } else if (sizeOption.match(/^\d+$/)) {
                let newWidth = parseInt(sizeOption, 10);
                if (newWidth > 0) {
                    let ratio = this.canvas.height / this.canvas.width;
                    targetWidth = newWidth;
                    targetHeight = Math.floor(newWidth * ratio);
                    needsResize = true;
                    this.speakThai(`ปรับความกว้าง ${newWidth} พิกเซล`);
                }
            } else if (sizeOption.match(/^x\d+$/)) {
                let newHeight = parseInt(sizeOption.substring(1), 10);
                if (newHeight > 0) {
                    let ratio = this.canvas.width / this.canvas.height;
                    targetHeight = newHeight;
                    targetWidth = Math.floor(newHeight * ratio);
                    needsResize = true;
                    this.speakThai(`ปรับความสูง ${newHeight} พิกเซล`);
                }
            } else if (sizeOption.match(/^\d+x\d+$/)) {
                let parts = sizeOption.split('x');
                let w = parseInt(parts[0], 10),
                    h = parseInt(parts[1], 10);
                if (w > 0 && h > 0) {
                    targetWidth = w;
                    targetHeight = h;
                    needsResize = true;
                    this.speakThai(`ปรับขนาดเป็น ${w}x${h} พิกเซล`);
                }
            } else {
                this.speakThai("รูปแบบไม่ถูกต้อง ใช้ขนาดเดิม");
            }
        }
        if (needsResize && targetWidth > 0 && targetHeight > 0) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = targetWidth;
            tempCanvas.height = targetHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.canvas, 0, 0, targetWidth, targetHeight);
            finalCanvas = tempCanvas;
        }
        this.speakThai("กำลังบันทึกภาพ...");
        finalCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
            this.speakThai("บันทึกภาพเรียบร้อย");
        });
    }

    // 4.7 ซูม
    toggleZoom() {
        if (this.floatingZoom) this.floatingZoom.classList.toggle('hidden');
    }

    // 4.8 ระบบเสียง
    initVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            if (this.voiceStatusSpan) this.voiceStatusSpan.innerHTML = '<i class="fas fa-microphone-alt"></i> ไม่รองรับเสียง';
            if (this.voiceBtn) this.voiceBtn.disabled = true;
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'th-TH';
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim().toLowerCase();
            if (this.voiceStatusSpan) this.voiceStatusSpan.innerHTML = `<i class="fas fa-microphone-alt"></i> รับคำสั่ง: "${transcript}"`;
            this.processVoiceCommand(transcript);
            if (this.voiceBtn) this.voiceBtn.classList.remove('listening');
        };
        this.recognition.onerror = (err) => {
            console.warn(err);
            if (this.voiceStatusSpan) this.voiceStatusSpan.innerHTML = `<i class="fas fa-microphone-alt"></i> ไม่เข้าใจเสียง ลองใหม่`;
            this.speakThai("ไม่ได้รับคำสั่ง กรุณาลองอีกครั้ง");
            if (this.voiceBtn) this.voiceBtn.classList.remove('listening');
        };
        this.recognition.onend = () => {
            if (this.voiceBtn) this.voiceBtn.classList.remove('listening');
            if (this.voiceStatusSpan) this.voiceStatusSpan.innerHTML = `<i class="fas fa-microphone-alt"></i> พร้อมใช้งาน พูดคำสั่ง`;
        };
    }

    startVoiceCommand() {
        if (!this.recognition) { this.speakThai("เบราว์เซอร์ไม่รองรับการสั่งงานด้วยเสียง"); return; }
        if (this.isProcessing) { this.speakThai("กำลังประมวลผลภาพ กรุณารอ"); return; }
        this.recognition.start();
        if (this.voiceStatusSpan) this.voiceStatusSpan.innerHTML = `<i class="fas fa-microphone-alt"></i> กำลังฟัง... พูดคำสั่ง`;
        if (this.voiceBtn) this.voiceBtn.classList.add('listening');
    }

    processVoiceCommand(cmd) {
        if (!this.originalImageData && !cmd.includes('อัปโหลด') && !cmd.includes('เพิ่มภาพ')) {
            this.speakThai("กรุณาอัปโหลดรูปภาพก่อนครับ");
            return;
        }
        let numberMatch = cmd.match(/(\d+)/);
        if (cmd.includes('ตั้งค่าความคมชัด')) {
            let val = numberMatch ? parseInt(numberMatch[0]) : 80;
            val = Math.min(200, Math.max(0, val));
            if (this.amountSlider) this.amountSlider.value = val;
            this.updateSliderDisplays();
            this.speakThai(`ตั้งค่าความแรงความคมชัดที่ ${val} เปอร์เซ็นต์`);
            return;
        }
        if (cmd.includes('ตั้งค่ารัศมี')) {
            let val = numberMatch ? parseFloat(numberMatch[0]) : 1.5;
            val = Math.min(5, Math.max(0.5, val));
            if (this.radiusSlider) this.radiusSlider.value = val;
            this.updateSliderDisplays();
            this.speakThai(`ตั้งค่ารัศมีที่ ${val}`);
            return;
        }
        if (cmd.includes('ตั้งค่าเกณฑ์ขอบ')) {
            let val = numberMatch ? parseInt(numberMatch[0]) : 10;
            val = Math.min(50, Math.max(0, val));
            if (this.thresholdSlider) this.thresholdSlider.value = val;
            this.updateSliderDisplays();
            this.speakThai(`ตั้งค่าเกณฑ์ขอบที่ ${val}`);
            return;
        }
        if (cmd.includes('ความอิ่มตัว')) {
            let val = numberMatch ? parseInt(numberMatch[0]) : 120;
            val = Math.min(200, Math.max(0, val));
            if (this.saturationSlider) this.saturationSlider.value = val;
            this.updateSliderDisplays();
            this.speakThai(`ปรับความอิ่มตัวเป็น ${val} เปอร์เซ็นต์`);
            return;
        }
        if (cmd.includes('ความสว่าง')) {
            let val = numberMatch ? parseInt(numberMatch[0]) : 30;
            val = Math.min(100, Math.max(-100, val));
            if (this.brightnessSlider) this.brightnessSlider.value = val;
            this.updateSliderDisplays();
            this.speakThai(`ปรับความสว่างเป็น ${val}`);
            return;
        }
        if (cmd.includes('เพิ่มความคมชัด') || cmd.includes('ชาร์ป')) this.applySharpenWorker();
        else if (cmd.includes('ย้อนกลับ') || cmd.includes('เลิกทำ')) this.undo();
        else if (cmd.includes('ทำซ้ำ') || cmd.includes('redo')) this.redo();
        else if (cmd.includes('รีเซ็ต') || cmd.includes('คืนค่าต้นฉบับ')) this.resetImage();
        else if (cmd.includes('ลบพื้นหลัง')) this.performAIRemove();
        else if (cmd.includes('ปรับสี') || cmd.includes('ปรับแต่งสี')) this.applyColorBoost();
        else if (cmd.includes('คืนค่าสี')) this.resetColor();
        else if (cmd.includes('บันทึก') || cmd.includes('เซฟ')) this.saveImage();
        else if (cmd.includes('เปิดซูม')) {
            if (this.floatingZoom && this.floatingZoom.classList.contains('hidden')) this.floatingZoom.classList.remove('hidden');
            this.speakThai("เปิดโหมดซูม");
        } else if (cmd.includes('ปิดซูม')) {
            if (this.floatingZoom && !this.floatingZoom.classList.contains('hidden')) this.floatingZoom.classList.add('hidden');
            this.speakThai("ปิดโหมดซูม");
        } else if (cmd.includes('สลับซูม')) this.toggleZoom();
        else if (cmd.includes('อัปโหลด') || cmd.includes('เพิ่มภาพ')) if (this.uploadBtn) this.uploadBtn.click();
        else this.speakThai("ไม่รู้จักคำสั่ง ลองพูด 'เพิ่มความคมชัด' หรือ 'ย้อนกลับ'");
    }

    // 4.9 รีเซ็ตค่า Sharpen
    resetSharpenEngine() {
        if (this.amountSlider) this.amountSlider.value = '50';
        if (this.radiusSlider) this.radiusSlider.value = '1.5';
        if (this.thresholdSlider) this.thresholdSlider.value = '10';
        if (this.preblurSlider) this.preblurSlider.value = '0';
        if (this.modeSelect) this.modeSelect.value = 'standard';
        this.updateSliderDisplays();
        this.speakThai("รีเซ็ตค่าความคมชัดเรียบร้อย");
    }
}

// ============================================================
//  เริ่มต้นเมื่อ DOM โหลดเสร็จ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!window.editor) window.editor = new SmartSharpenPro();
});