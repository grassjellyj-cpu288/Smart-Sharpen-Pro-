/**
 * script8.js – ส่วนเสริมฟีเจอร์สำหรับ SmartSharpenPro (ปรับแต่ง UI ชิดซ้าย)
 * 
 * เพิ่มฟังก์ชัน: ปรับคอนทราสต์, ฟิลเตอร์ขาวดำ/ซีเปีย, Auto Levels, Vignette
 * จัด UI ให้อยู่ทางซ้ายสุด และปรับสไตล์ปุ่มให้สวยงาม
 */

(function() {
    'use strict';

    // ─── รอให้ SmartSharpenPro และ DOM พร้อม ───
    function init() {
        if (typeof SmartSharpenPro === 'undefined') {
            console.warn('⚠️ SmartSharpenPro not found. Retrying in 500ms...');
            setTimeout(init, 500);
            return;
        }

        if (!window.editor) {
            console.warn('⚠️ window.editor not ready. Retrying...');
            setTimeout(init, 300);
            return;
        }

        // ─── เพิ่มเมธอดใหม่ผ่าน Prototype ──────────────────────────────

        SmartSharpenPro.prototype.applyContrast = function(percent) {
            if (!this.originalImageData) {
                this.speakThai('ไม่มีภาพ กรุณาอัปโหลดก่อน');
                return;
            }
            const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = cur.data;
            const factor = (259 * (percent + 255)) / (255 * (259 - percent));
            for (let i = 0; i < data.length; i += 4) {
                data[i]     = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
            }
            this.ctx.putImageData(cur, 0, 0);
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pushToUndo(this.currentImageData, true);
            this.speakThai(`ปรับคอนทราสต์ ${percent}%`);
        };

        SmartSharpenPro.prototype.applyGrayscale = function() {
            if (!this.originalImageData) {
                this.speakThai('ไม่มีภาพ');
                return;
            }
            const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = cur.data;
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                data[i] = data[i + 1] = data[i + 2] = gray;
            }
            this.ctx.putImageData(cur, 0, 0);
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pushToUndo(this.currentImageData, true);
            this.speakThai('เปลี่ยนเป็นขาวดำ');
        };

        SmartSharpenPro.prototype.applySepia = function() {
            if (!this.originalImageData) {
                this.speakThai('ไม่มีภาพ');
                return;
            }
            const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = cur.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                data[i]     = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
                data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
                data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
            }
            this.ctx.putImageData(cur, 0, 0);
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pushToUndo(this.currentImageData, true);
            this.speakThai('เพิ่มฟิลเตอร์ซีเปีย');
        };

        SmartSharpenPro.prototype.applyAutoLevels = function() {
            if (!this.originalImageData) {
                this.speakThai('ไม่มีภาพ');
                return;
            }
            const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = cur.data;
            let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] < minR) minR = data[i];
                if (data[i] > maxR) maxR = data[i];
                if (data[i + 1] < minG) minG = data[i + 1];
                if (data[i + 1] > maxG) maxG = data[i + 1];
                if (data[i + 2] < minB) minB = data[i + 2];
                if (data[i + 2] > maxB) maxB = data[i + 2];
            }
            const rangeR = maxR - minR || 1;
            const rangeG = maxG - minG || 1;
            const rangeB = maxB - minB || 1;
            for (let i = 0; i < data.length; i += 4) {
                data[i]     = ((data[i] - minR) / rangeR) * 255;
                data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255;
                data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255;
            }
            this.ctx.putImageData(cur, 0, 0);
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pushToUndo(this.currentImageData, true);
            this.speakThai('ปรับระดับสีอัตโนมัติเรียบร้อย');
        };

        SmartSharpenPro.prototype.applyVignette = function(intensity = 50) {
            if (!this.originalImageData) {
                this.speakThai('ไม่มีภาพ');
                return;
            }
            const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = cur.data;
            const w = this.canvas.width, h = this.canvas.height;
            const cx = w / 2, cy = h / 2;
            const maxDist = Math.sqrt(cx * cx + cy * cy);
            const factor = intensity / 100;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const dx = x - cx, dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const vignette = 1 - factor * (dist / maxDist);
                    const idx = (y * w + x) * 4;
                    data[idx]     = Math.min(255, Math.max(0, data[idx] * vignette));
                    data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] * vignette));
                    data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] * vignette));
                }
            }
            this.ctx.putImageData(cur, 0, 0);
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pushToUndo(this.currentImageData, true);
            this.speakThai(`เพิ่มเอฟเฟกต์ขอบมืด (${intensity}%)`);
        };

        // ─── สร้าง UI เพิ่มเติม ──────────────────────────────────────────

        createExtraUI();

        console.log('✅ script8.js โหลดสำเร็จ (UI ชิดซ้าย)');
    }

    // ─── ฟังก์ชันสร้าง UI ──────────────────────────────────────────────

    function createExtraUI() {
        // หา container ที่เหมาะสม
        let container = document.querySelector('#controls') ||
                        document.querySelector('.toolbar') ||
                        document.querySelector('#main-controls') ||
                        document.querySelector('.controls-container');

        // ถ้าไม่มี container ให้สร้างใหม่
        if (!container) {
            container = document.createElement('div');
            container.id = 'extra-controls';
            container.style.cssText = 'margin: 10px 0; padding: 8px 12px; background: #f9fafb; border-radius: 8px;';
            // หา element แรกใน body เพื่อแทรกไว้ข้างบน
            const firstChild = document.body.firstChild;
            document.body.insertBefore(container, firstChild);
        }

        // ตรวจสอบว่าสร้างไปแล้วหรือยัง
        if (document.getElementById('extra-ui-wrapper')) {
            return;
        }

        // ── Wrapper หลัก (ชิดซ้าย) ──
        const wrapper = document.createElement('div');
        wrapper.id = 'extra-ui-wrapper';
        wrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; justify-content: flex-start; width: 100%;';

        // ── 1. กลุ่มคอนทราสต์ ──
        const contrastGroup = createSliderGroup(
            '🌓 คอนทราสต์',
            'contrastSlider8',
            'contrastVal8',
            0, 200, 100,
            'ปรับ',
            function() {
                const val = parseInt(document.getElementById('contrastSlider8').value);
                if (window.editor && typeof window.editor.applyContrast === 'function') {
                    window.editor.applyContrast(val);
                } else {
                    alert('Editor ยังไม่พร้อม');
                }
            }
        );
        wrapper.appendChild(contrastGroup);

        // ── 2. กลุ่ม Vignette ──
        const vignetteGroup = createSliderGroup(
            '🌑 Vignette',
            'vignetteSlider8',
            'vignetteVal8',
            0, 100, 50,
            'ปรับ',
            function() {
                const val = parseInt(document.getElementById('vignetteSlider8').value);
                if (window.editor && typeof window.editor.applyVignette === 'function') {
                    window.editor.applyVignette(val);
                } else {
                    alert('Editor ยังไม่พร้อม');
                }
            }
        );
        wrapper.appendChild(vignetteGroup);

        // ── 3. กลุ่มปุ่มฟิลเตอร์ ──
        const filterGroup = document.createElement('div');
        filterGroup.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
        filterGroup.innerHTML = `
            <button class="btn-filter-extra" data-action="grayscale">⚪ ขาวดำ</button>
            <button class="btn-filter-extra" data-action="sepia">🟫 ซีเปีย</button>
            <button class="btn-filter-extra" data-action="autolevels">⚡ Auto Levels</button>
        `;
        filterGroup.querySelectorAll('.btn-filter-extra').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.dataset.action;
                if (!window.editor) return;
                switch (action) {
                    case 'grayscale':
                        if (typeof window.editor.applyGrayscale === 'function') window.editor.applyGrayscale();
                        break;
                    case 'sepia':
                        if (typeof window.editor.applySepia === 'function') window.editor.applySepia();
                        break;
                    case 'autolevels':
                        if (typeof window.editor.applyAutoLevels === 'function') window.editor.applyAutoLevels();
                        break;
                    default:
                        alert('ไม่รู้จักคำสั่ง');
                }
            });
        });
        wrapper.appendChild(filterGroup);

        container.appendChild(wrapper);

        // ── ปรับแต่งสไตล์ด้วย CSS ──
        const style = document.createElement('style');
        style.textContent = `
            /* กลุ่มสไลด์ */
            .slider-group-extra {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #ffffff;
                padding: 4px 10px 4px 8px;
                border-radius: 20px;
                border: 1px solid #e5e7eb;
                box-shadow: 0 1px 2px rgba(255, 255, 255, 0.1);
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .slider-group-extra:hover {
                border-color: #94a3b8;
                box-shadow: 0 2px 6px rgba(255, 255, 255, 0.1);
            }
            .slider-group-extra label {
                font-size: 13px;
                font-weight: 500;
                color: #1e293b;
                margin-right: 2px;
                white-space: nowrap;
            }
            .slider-group-extra input[type="range"] {
                width: 100px;
                height: 4px;
                -webkit-appearance: none;
                background: #cbd5e1;
                border-radius: 2px;
                outline: none;
                transition: background 0.2s;
            }
            .slider-group-extra input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                background: #3b82f6;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid #fff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                transition: transform 0.15s;
            }
            .slider-group-extra input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.15);
            }
            .slider-group-extra input[type="range"]::-moz-range-thumb {
                width: 14px;
                height: 14px;
                background: #3b82f6;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid #fff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
            .slider-group-extra span {
                min-width: 28px;
                text-align: center;
                font-weight: 600;
                font-size: 13px;
                color: #0f172a;
            }
            .slider-group-extra .btn-apply-extra {
                padding: 4px 12px;
                background: #3b82f6;
                color: #fff;
                border: none;
                border-radius: 14px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s, transform 0.1s;
                line-height: 1.4;
            }
            .slider-group-extra .btn-apply-extra:hover {
                background: #2563eb;
                transform: scale(1.02);
            }
            .slider-group-extra .btn-apply-extra:active {
                transform: scale(0.96);
            }

            /* ปุ่มฟิลเตอร์ */
            .btn-filter-extra {
                padding: 6px 16px;
                background: #f1f5f9;
                color: #1e293b;
                border: 1px solid #e2e8f0;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 1px 2px rgba(255, 255, 255, 0.1);
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .btn-filter-extra:hover {
                background: #e2e8f0;
                border-color: #94a3b8;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(255, 255, 255, 0.1);
            }
            .btn-filter-extra:active {
                transform: translateY(0);
                box-shadow: none;
            }
            .btn-filter-extra[data-action="grayscale"]:hover {
                background: #dbeafe;
                border-color: #60a5fa;
                color: #1e3a8a;
            }
            .btn-filter-extra[data-action="sepia"]:hover {
                background: #fef3c7;
                border-color: #f59e0b;
                color: #78350f;
            }
            .btn-filter-extra[data-action="autolevels"]:hover {
                background: #d1fae5;
                border-color: #34d399;
                color: #065f46;
            }

            /* Responsive */
            @media (max-width: 640px) {
                #extra-ui-wrapper {
                    gap: 8px;
                }
                .slider-group-extra input[type="range"] {
                    width: 70px;
                }
                .slider-group-extra {
                    padding: 4px 8px;
                }
                .btn-filter-extra {
                    font-size: 12px;
                    padding: 4px 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ─── ฟังก์ชันช่วยสร้าง Slider + ปุ่ม ──────────────────────────────

    function createSliderGroup(labelText, sliderId, valueId, min, max, defaultValue, buttonText, onClick) {
        const group = document.createElement('div');
        group.className = 'slider-group-extra';
        group.innerHTML = `
            <label for="${sliderId}">${labelText}</label>
            <input type="range" id="${sliderId}" min="${min}" max="${max}" value="${defaultValue}" step="1">
            <span id="${valueId}">${defaultValue}</span>
            <button class="btn-apply-extra" id="btn-${sliderId}">${buttonText}</button>
        `;

        const slider = group.querySelector(`#${sliderId}`);
        const valSpan = group.querySelector(`#${valueId}`);
        const btn = group.querySelector(`#btn-${sliderId}`);

        slider.addEventListener('input', function() {
            valSpan.textContent = this.value;
        });

        btn.addEventListener('click', onClick);

        return group;
    }

    // ─── เริ่มต้น ──────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();