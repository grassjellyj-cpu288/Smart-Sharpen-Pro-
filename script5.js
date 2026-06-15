/**
 * script5.js (Ultimate Version)
 * - แสดง checkerboard สำหรับส่วนโปร่งใส
 * - ปรับแต่ง performance (throttle, offscreen cache)
 * - Animation ตอน toggle checkerboard (fade + ripple)
 * - รองรับ drag and drop รูปภาพ (อัปเดต checkerboard อัตโนมัติ)
 * - มีปุ่ม Help แสดงคู่มือการใช้งาน
 */

(function () {
    "use strict";

    // ========== DOM elements ==========
    let canvas = null;
    let ctx = null;
    let wrapper = null;          // parent ของ canvas (สำหรับ drag & drop)
    let toggleBtn = null;
    let helpBtn = null;
    let helpModal = null;

    // ========== State ==========
    let showCheckerboard = true;
    let animationPending = false;
    let lastImageData = null;     // cache ImageData ล่าสุด (เพื่อลด getImageData)
    let canvasWidth = 0, canvasHeight = 0;
    let offscreenCanvas = null;
    let offscreenCtx = null;

    // Throttle flag สำหรับ resize / edit
    let refreshScheduled = false;

    // ========== Utility ==========
    function setStatusMessage(msg, isError = false) {
        const statusDiv = document.getElementById("imageStatus");
        if (!statusDiv) return;
        statusDiv.innerHTML = isError ? `⚠️ ${msg}` : `🎨 ${msg}`;
        if (!isError) {
            setTimeout(() => {
                if (statusDiv.innerHTML.includes(msg))
                    statusDiv.innerHTML = `<i class="fas fa-info-circle"></i> พร้อมทำงาน — ลากรูปหรืออัปโหลด`;
            }, 2000);
        }
    }

    // วาด checkerboard
    function drawCheckerboard(ctx, w, h, cellSize = 20) {
        for (let y = 0; y < h; y += cellSize) {
            for (let x = 0; x < w; x += cellSize) {
                const isEven = ((x / cellSize + y / cellSize) % 2 === 0);
                ctx.fillStyle = isEven ? "#ffffff" : "#e6e6e6";
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }

    // อัปเดต offscreen canvas ด้วย imageData ปัจจุบัน
    function updateOffscreenFromImageData(imageData) {
        if (!imageData) return false;
        if (!offscreenCanvas) {
            offscreenCanvas = document.createElement("canvas");
            offscreenCtx = offscreenCanvas.getContext("2d");
        }
        offscreenCanvas.width = imageData.width;
        offscreenCanvas.height = imageData.height;
        offscreenCtx.putImageData(imageData, 0, 0);
        return true;
    }

    // ฟังก์ชันหลัก render (ใช้ cached imageData ถ้าไม่มีการเปลี่ยนแปลง)
    function renderWithCheckerboard(forceSync = false) {
        if (!canvas || !ctx) return;
        const w = canvas.width, h = canvas.height;
        if (w === 0 || h === 0) return;

        // อ่าน imageData ปัจจุบันจาก canvas (ถ้าขนาดเปลี่ยน หรือ force)
        if (!lastImageData || forceSync || w !== canvasWidth || h !== canvasHeight) {
            try {
                lastImageData = ctx.getImageData(0, 0, w, h);
                canvasWidth = w;
                canvasHeight = h;
                updateOffscreenFromImageData(lastImageData);
            } catch (e) {
                console.warn("Failed to capture imageData", e);
                return;
            }
        }

        // ใช้ offscreenCanvas ที่มีข้อมูลล่าสุด
        if (!offscreenCanvas) return;

        // วาด checkerboard (ถ้าเปิด) แล้วจึง drawImage ภาพต้นฉบับทับ
        ctx.clearRect(0, 0, w, h);
        if (showCheckerboard) {
            drawCheckerboard(ctx, w, h, 20);
        }
        ctx.drawImage(offscreenCanvas, 0, 0);
    }

    // Throttled refresh (เรียกเมื่อมีการเปลี่ยนแปลงภายนอก เช่น sharpen, resize)
    let refreshTimeout = null;
    function scheduleRefresh(immediate = false) {
        if (refreshTimeout) clearTimeout(refreshTimeout);
        if (immediate) {
            renderWithCheckerboard(true);
        } else {
            refreshTimeout = setTimeout(() => {
                renderWithCheckerboard(true);
                refreshTimeout = null;
            }, 20);
        }
    }

    // ========== Animation toggle checkerboard (fade effect) ==========
    function toggleCheckerboardWithAnimation() {
        if (!canvas) return;
        if (animationPending) return;
        animationPending = true;

        // เปลี่ยนสถานะ
        showCheckerboard = !showCheckerboard;

        // 1. จับภาพปัจจุบันก่อน toggle (เพื่อใช้ fade)
        const beforeImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(beforeImage, 0, 0);

        // 2. Render ใหม่ด้วยสถานะใหม่ (checkerboard หรือ ไม่มี)
        renderWithCheckerboard(true);
        const afterImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 3. Fade animation: ใช้ globalAlpha ค่อยๆ เปลี่ยนจากภาพเก่าไปภาพใหม่
        let alpha = 1.0;
        const startTime = performance.now();
        const duration = 200; // ms

        function animateFade(now) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            // ease out cubic
            const ease = 1 - Math.pow(1 - t, 3);
            alpha = 1 - ease;
            // วาดภาพเก่าที่ alpha ลดลง แล้วทับภาพใหม่
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = alpha;
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.globalAlpha = 1 - alpha;
            ctx.putImageData(afterImage, 0, 0);
            ctx.globalAlpha = 1.0;

            if (t < 1) {
                requestAnimationFrame(animateFade);
            } else {
                // จบ animation: render สุดท้ายให้ตรงเป๊ะ
                renderWithCheckerboard(true);
                animationPending = false;
            }
        }

        requestAnimationFrame(animateFade);

        // Ripple effect ที่ปุ่ม
        if (toggleBtn) {
            toggleBtn.classList.add('ripple');
            setTimeout(() => toggleBtn.classList.remove('ripple'), 300);
        }
        setStatusMessage(showCheckerboard ? "เปิดลายตาราง (fade)" : "ปิดลายตาราง (fade)");
    }

    // ========== Drag & Drop รองรับ ==========
    function setupDragAndDrop() {
        if (!wrapper) wrapper = canvas?.parentElement;
        if (!wrapper) return;
        wrapper.setAttribute('draggable', 'false');
        wrapper.style.position = 'relative';

        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.classList.add('drag-over');
        });
        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('drag-over');
        });
        wrapper.addEventListener('drop', async (e) => {
            e.preventDefault();
            wrapper.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                // ใช้ FileReader โหลดรูป และส่งต่อไปยัง SmartSharpenPro (ถ้ามี)
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        // ถ้ามี SmartSharpenPro instance ให้เรียก loadImageToCanvas
                        if (window.editor && typeof window.editor.handleFile === 'function') {
                            // จำลอง event ให้ editor รับรู้
                            const fakeEvent = { target: { files: [file] } };
                            window.editor.handleFile(file);
                        } else {
                            // fallback: โหลดรูปใส่ canvas เอง
                            if (canvas) {
                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);
                                scheduleRefresh(true);
                                setStatusMessage("ลากวางรูปสำเร็จ (fallback)");
                            }
                        }
                        // อัปเดต checkerboard หลังจาก editor โหลดเสร็จ (editor จะ dispatch event เอง)
                        setTimeout(() => scheduleRefresh(true), 100);
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ========== สร้าง UI (Toggle, Help button, Modal) ==========
    function createHelpModal() {
        const modal = document.createElement('div');
        modal.id = 'checkerboard-help-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #1e293b; color: #f1f5f9; padding: 20px; border-radius: 16px;
            box-shadow: 0 20px 35px rgba(0,0,0,0.4); z-index: 100000;
            max-width: 320px; width: 90%; font-family: Inter, sans-serif;
            display: none; flex-direction: column; gap: 12px;
            border: 1px solid #475569;
        `;
        modal.innerHTML = `
            <h3 style="margin:0; display:flex; justify-content:space-between;">
                📘 คู่มือการใช้งานลายตาราง
                <button id="close-help-modal" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">&times;</button>
            </h3>
            <p>✅ <strong>เปิด/ปิดลายตาราง</strong> – กดปุ่ม <i class="fas fa-th"></i> เพื่อแสดงหรือซ่อนลายตาราง (พื้นหลังโปร่งใส)</p>
            <p>🖱️ <strong>ลากวางรูป</strong> – ลากไฟล์ภาพมาวางบนพื้นที่ Canvas ได้ทันที รองรับ PNG ที่มีพื้นหลังโปร่งใส</p>
            <p>⚡ <strong>ประสิทธิภาพ</strong> – ระบบจะปรับปรุงความเร็วอัตโนมัติ, ไม่ทำให้เครื่องช้า</p>
            <p>🎨 <strong>Animation</strong> – เวลาเปิด/ปิดลายตาราง จะมีเอฟเฟกต์ fade สวยงาม</p>
            <p>💡 <strong>เคล็ดลับ</strong> – ใช้ร่วมกับ AI ลบพื้นหลัง (SmartSharpenPro) จะเห็นผลทันที</p>
        `;
        document.body.appendChild(modal);
        const closeBtn = modal.querySelector('#close-help-modal');
        closeBtn.onclick = () => { modal.style.display = 'none'; };
        return modal;
    }

    function initUI() {
        if (!document.getElementById("canvas")) return;

        // ปุ่ม Toggle
        toggleBtn = document.createElement("button");
        toggleBtn.innerHTML = '<i class="fas fa-th"></i> เปิด/ปิดลายตาราง';
        Object.assign(toggleBtn.style, {
            position: "fixed", left: "24px", bottom: "24px",
            background: "linear-gradient(95deg, #6B7280, #4B5563)",
            border: "none", padding: "10px 16px", borderRadius: "40px",
            color: "white", fontWeight: "bold", cursor: "pointer",
            zIndex: "99999", display: "flex", alignItems: "center", gap: "6px",
            fontFamily: "Inter, sans-serif", fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            transition: "transform 0.1s ease"
        });
        // เพิ่ม ripple effect CSS
        const style = document.createElement('style');
        style.textContent = `
            .ripple { transform: scale(0.95); background: #4B5563 !important; transition: 0.1s; }
            .drag-over { outline: 3px dashed #3B82F6; background: rgba(59,130,246,0.1); transition: 0.1s; }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toggleBtn);
        toggleBtn.onclick = toggleCheckerboardWithAnimation;

        // ปุ่ม Help
        helpBtn = document.createElement("button");
        helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
        Object.assign(helpBtn.style, {
            position: "fixed", left: "24px", bottom: "90px",
            background: "#334155", border: "none", width: "40px", height: "40px",
            borderRadius: "50%", color: "white", cursor: "pointer", zIndex: "99999",
            fontSize: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        });
        document.body.appendChild(helpBtn);
        helpModal = createHelpModal();
        helpBtn.onclick = () => { helpModal.style.display = 'flex'; };
    }

    // ========== ตรวจจับการเปลี่ยนแปลงภายนอก ==========
    function observeCanvasChanges() {
        if (!canvas) return;
        const observer = new MutationObserver(() => scheduleRefresh(false));
        observer.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
        // ฟัง event ที่ SmartSharpenPro อาจ dispatch
        window.addEventListener('imageEdited', () => scheduleRefresh(true));
        window.addEventListener('imageLoaded', () => scheduleRefresh(true));
        // Override saveState/pushToHistory ถ้ามี
        const origSave = window.saveState;
        if (origSave) {
            window.saveState = function(...args) {
                origSave.apply(window, args);
                scheduleRefresh(false);
            };
        }
        const origPush = window.pushToHistory;
        if (origPush) {
            window.pushToHistory = function(...args) {
                origPush.apply(window, args);
                scheduleRefresh(false);
            };
        }
        // เช็คการเปลี่ยนแปลงการแก้ไขผ่าน editor instance (ถ้ามี)
        if (window.editor) {
            const origApplySharpen = window.editor.applySharpenWorker;
            if (origApplySharpen) {
                window.editor.applySharpenWorker = async function(...args) {
                    await origApplySharpen.apply(window.editor, args);
                    scheduleRefresh(true);
                };
            }
            // เพิ่ม method อื่นๆ ตามความเหมาะสม...
        }
    }

    // ========== INIT ==========
    function main() {
        canvas = document.getElementById("canvas");
        if (!canvas) return;
        ctx = canvas.getContext("2d");
        wrapper = canvas.parentElement;
        initUI();
        setupDragAndDrop();
        observeCanvasChanges();
        // ถ้า canvas มีรูปอยู่แล้วให้ render ทันที
        if (canvas.width > 0 && canvas.height > 0) {
            scheduleRefresh(true);
        }
        setStatusMessage("✅ ระบบ checkerboard พร้อมใช้งาน (มี animation และ drag & drop)");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", main);
    } else {
        main();
    }

    // Export functions
    window.toggleCheckerboard = toggleCheckerboardWithAnimation;
    window.refreshCheckerboard = () => scheduleRefresh(true);
})();