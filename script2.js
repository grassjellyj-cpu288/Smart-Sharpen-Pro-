/**
 * script2.js (Auto-sync version)
 * แสดงลายตาราง checkerboard ในส่วนโปร่งใส โดยดึงข้อมูลจาก Canvas ปัจจุบันเสมอ
 * กดเปิด/ปิดลายตารางได้โดยไม่ทำให้รูปหาย
 */

(function () {
    "use strict";

    let canvas = null;
    let ctx = null;
    let showCheckerboard = true;
    let statusTimeout = null;

    // ฟังก์ชันวาดลายตาราง
    function drawCheckerboard(ctx, width, height, cellSize = 20) {
        for (let y = 0; y < height; y += cellSize) {
            for (let x = 0; x < width; x += cellSize) {
                const isEven = ((x / cellSize + y / cellSize) % 2 === 0);
                ctx.fillStyle = isEven ? "#ffffff" : "#e6e6e6";
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }

    // เรนเดอร์: วาด checkerboard (ถ้าเปิด) แล้วตามด้วยภาพปัจจุบันจาก Canvas
    function renderWithCheckerboard() {
        if (!canvas || !ctx) return;
        const w = canvas.width, h = canvas.height;
        if (w === 0 || h === 0) return;

        // อ่านภาพปัจจุบันจาก Canvas (รวมการปรับแต่งทั้งหมด)
        const currentImage = ctx.getImageData(0, 0, w, h);

        // ล้าง Canvas และวาด checkerboard (ถ้าเปิด)
        ctx.clearRect(0, 0, w, h);
        if (showCheckerboard) {
            drawCheckerboard(ctx, w, h, 20);
        }

        // นำภาพปัจจุบัน (มี alpha) กลับไปใส่โดยใช้ putImageData (เร็วกว่า)
        // แต่ putImageData จะไม่ blend alpha ให้อัตโนมัติ ต้องใช้ drawImage แทน
        // วิธีที่ดีที่สุด: สร้าง temp canvas แล้ว drawImage
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(currentImage, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    // สลับการแสดง checkerboard
    function toggleCheckerboard() {
        if (!canvas || canvas.width === 0) {
            setStatusMessage("ยังไม่มีรูปภาพ", true);
            return;
        }
        showCheckerboard = !showCheckerboard;
        renderWithCheckerboard();
        setStatusMessage(showCheckerboard ? "แสดงลายตารางพื้นหลัง" : "ปิดลายตาราง (พื้นหลังโปร่งใส)");
    }

    // ฟังก์ชันนี้เรียกเมื่อโหลดรูปใหม่ (จาก script.js หรือ event)
    function refreshCheckerboard() {
        if (canvas && canvas.width > 0) {
            renderWithCheckerboard();
            setStatusMessage("อัปเดตลายตารางเรียบร้อย");
        }
    }

    function setStatusMessage(message, isError = false) {
        const statusDiv = document.getElementById("imageStatus");
        if (!statusDiv) return;
        if (statusTimeout) clearTimeout(statusTimeout);
        statusDiv.innerHTML = isError ? `⚠️ ${message}` : `🎨 ${message}`;
        statusTimeout = setTimeout(() => {
            if (statusDiv.innerHTML.includes(message)) {
                statusDiv.innerHTML = `<i class="fas fa-info-circle"></i> พร้อมทำงาน — ลากรูปหรืออัปโหลด`;
            }
        }, 2000);
    }

    // สร้างปุ่ม Toggle
    function initUI() {
        if (!document.getElementById("canvas")) return;

        const toggleBtn = document.createElement("button");
        toggleBtn.innerHTML = '<i class="fas fa-th"></i> เปิด/ปิดลายตาราง';
        Object.assign(toggleBtn.style, {
            position: "fixed", left: "24px", bottom: "24px",
            background: "linear-gradient(95deg, #6B7280, #4B5563)",
            border: "none", padding: "10px 16px", borderRadius: "40px",
            color: "white", fontWeight: "bold", cursor: "pointer",
            zIndex: "99999", display: "flex", alignItems: "center", gap: "6px",
            fontFamily: "Inter, sans-serif", fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        });
        document.body.appendChild(toggleBtn);
        toggleBtn.onclick = toggleCheckerboard;
    }

    // ตรวจจับการเปลี่ยนแปลงบน Canvas (ผ่าน MutationObserver หรือ periodic check)
    // แต่เพื่อความเรียบง่าย ให้ observer การเปลี่ยนแปลงของ canvas (เช่น resize, หรือการ rewrite)
    // หรือฟัง event 'imageEdited' ที่ SmartSharpenPro จะส่ง
    function observeCanvasChanges() {
        // เรียก refresh ทุกครั้งที่มีการแก้ไขภาพ (debounce)
        let timeout;
        const debouncedRefresh = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (canvas && canvas.width > 0) renderWithCheckerboard();
            }, 50);
        };
        // ใช้ MutationObserver เฝ้าดูการเปลี่ยนแปลง attribute ของ canvas (เช่น width/height)
        if (canvas) {
            const observer = new MutationObserver(debouncedRefresh);
            observer.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
        }
        // ฟัง event การแก้ไขภาพ (ถ้ามีการ dispatch)
        window.addEventListener('imageEdited', debouncedRefresh);
        window.addEventListener('imageLoaded', debouncedRefresh);
        // Override ฟังก์ชัน saveState/pushToHistory ที่ใช้บ่อยใน SmartSharpenPro
        const origSaveState = window.saveState;
        if (origSaveState) {
            window.saveState = function(...args) {
                origSaveState.apply(window, args);
                debouncedRefresh();
            };
        }
        const origPushToHistory = window.pushToHistory;
        if (origPushToHistory) {
            window.pushToHistory = function(...args) {
                origPushToHistory.apply(window, args);
                debouncedRefresh();
            };
        }
    }

    function main() {
        canvas = document.getElementById("canvas");
        if (canvas) ctx = canvas.getContext("2d");
        initUI();
        if (canvas && canvas.width > 0) renderWithCheckerboard();
        observeCanvasChanges();
    }

    window.toggleCheckerboard = toggleCheckerboard;
    window.refreshCheckerboard = refreshCheckerboard;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", main);
    } else {
        main();
    }
})();