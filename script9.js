// script9.js – ฟีเจอร์เสริม (แยกโค้ดเป็นส่วนย่อย)
(function() {
  'use strict';

  // ──────────────────────────────────────────────
  // ส่วนที่ 1: ตัวแปรร่วมและตัวเริ่มต้น
  // ──────────────────────────────────────────────
  let editor = null;

  function init() {
    if (typeof SmartSharpenPro === 'undefined' || !window.editor) {
      setTimeout(init, 500);
      return;
    }
    editor = window.editor;

    // ขยาย Prototype ด้วยฟังก์ชันใหม่
    extendPrototype();

    // ขยายระบบ Voice Command
    extendVoiceCommands();

    // สร้าง UI และผูก Events
    buildUI();

    console.log('✅ script9.js (แยกโค้ด) โหลดสำเร็จ');
  }

  // ──────────────────────────────────────────────
  // ส่วนที่ 2: ขยาย Prototype ของ SmartSharpenPro
  // ──────────────────────────────────────────────
  function extendPrototype() {
    const Proto = SmartSharpenPro.prototype;

    // 2.1 RGB Sharpen (แยกช่อง)
    Proto.applyRGBSharpen = function(channel, amount, radius, threshold) {
      if (!this.originalImageData) return this.speakThai('ไม่มีภาพ');
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const src = ctx.getImageData(0, 0, w, h).data;

      // ฟังก์ชันช่วย: Box Blur
      function boxBlur(data, w, h, radius) {
        const half = Math.ceil(radius * 2) >> 1;
        const tmp = new Uint8ClampedArray(data.length);
        // แนวนอน
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let R = 0, G = 0, B = 0, A = 0, count = 0;
            for (let dx = -half; dx <= half; dx++) {
              const idx = ((y * w + Math.min(w - 1, Math.max(0, x + dx))) << 2);
              R += data[idx];
              G += data[idx + 1];
              B += data[idx + 2];
              A += data[idx + 3];
              count++;
            }
            const idx = ((y * w + x) << 2);
            tmp[idx] = R / count;
            tmp[idx + 1] = G / count;
            tmp[idx + 2] = B / count;
            tmp[idx + 3] = A / count;
          }
        }
        // แนวตั้ง
        const out = new Uint8ClampedArray(data.length);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let R = 0, G = 0, B = 0, A = 0, count = 0;
            for (let dy = -half; dy <= half; dy++) {
              const idx = ((Math.min(h - 1, Math.max(0, y + dy)) * w + x) << 2);
              R += tmp[idx];
              G += tmp[idx + 1];
              B += tmp[idx + 2];
              A += tmp[idx + 3];
              count++;
            }
            const idx = ((y * w + x) << 2);
            out[idx] = R / count;
            out[idx + 1] = G / count;
            out[idx + 2] = B / count;
            out[idx + 3] = A / count;
          }
        }
        return out;
      }

      // Unsharp Mask
      function unsharpMask(data, w, h, radius, amount, threshold, channel) {
        const blurred = boxBlur(data, w, h, radius);
        const out = new Uint8ClampedArray(data.length);
        const strength = amount / 100;
        const chMap = { r: 0, g: 1, b: 2, all: -1 };
        const chIdx = chMap[channel] !== undefined ? chMap[channel] : -1;
        for (let i = 0; i < data.length; i += 4) {
          const R = data[i], G = data[i + 1], B = data[i + 2];
          const bR = blurred[i], bG = blurred[i + 1], bB = blurred[i + 2];
          let dR = R - bR, dG = G - bG, dB = B - bB;
          const edge = Math.abs(dR) + Math.abs(dG) + Math.abs(dB);
          if (edge > threshold) {
            let factor = strength;
            if (edge > 120) factor *= (1 - Math.min((edge - threshold) / 200, 0.7));
            out[i]     = (chIdx === -1 || chIdx === 0) ? Math.min(255, Math.max(0, R + dR * factor)) : R;
            out[i + 1] = (chIdx === -1 || chIdx === 1) ? Math.min(255, Math.max(0, G + dG * factor)) : G;
            out[i + 2] = (chIdx === -1 || chIdx === 2) ? Math.min(255, Math.max(0, B + dB * factor)) : B;
          } else {
            out[i] = R;
            out[i + 1] = G;
            out[i + 2] = B;
          }
          out[i + 3] = data[i + 3];
        }
        return out;
      }

      const amt = amount ?? +this.amountSlider.value;
      const rad = radius ?? +this.radiusSlider.value;
      const th  = threshold ?? +this.thresholdSlider.value;

      const newData = unsharpMask(src, w, h, rad, amt, th, channel);
      const imgData = new ImageData(newData, w, h);
      ctx.putImageData(imgData, 0, 0);
      this.currentImageData = ctx.getImageData(0, 0, w, h);
      this.pushToUndo(this.currentImageData, true);
      this.speakThai(`Sharpen ช่อง ${channel.toUpperCase()} เสร็จ`);
    };

    // 2.2 Multi‑channel Sharpen
    Proto.applyMultiChannelSharpen = function(channels) {
      if (!this.originalImageData) return this.speakThai('ไม่มีภาพ');
      const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const original = new Uint8ClampedArray(cur.data);
      // ใช้ sharpen ทั้งหมดก่อน
      this.applyRGBSharpen('all',
        +this.amountSlider.value,
        +this.radiusSlider.value,
        +this.thresholdSlider.value
      );
      const after = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const set = new Set(channels);
      for (let i = 0; i < after.data.length; i += 4) {
        if (!set.has('r')) after.data[i] = original[i];
        if (!set.has('g')) after.data[i + 1] = original[i + 1];
        if (!set.has('b')) after.data[i + 2] = original[i + 2];
      }
      this.ctx.putImageData(after, 0, 0);
      this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.pushToUndo(this.currentImageData, true);
      this.speakThai(`Sharpen ช่อง ${channels.join(', ')}`);
    };

    // 2.3 Color Preset
    Proto.applyColorPreset = function(preset) {
      if (!this.originalImageData) return this.speakThai('ไม่มีภาพ');
      const map = { warm: [120, 10], cool: [110, 5], vivid: [150, 15], muted: [70, -10] };
      const [sat, bri] = map[preset] || [100, 0];
      if (this.saturationSlider) this.saturationSlider.value = sat;
      if (this.brightnessSlider) this.brightnessSlider.value = bri;
      if (typeof this.updateSliderDisplays === 'function') this.updateSliderDisplays();
      if (typeof this.applyColorBoost === 'function') this.applyColorBoost();
      this.speakThai(`ปรับสี ${preset}`);
    };
  }

  // ──────────────────────────────────────────────
  // ส่วนที่ 3: ขยายระบบ Voice Command
  // ──────────────────────────────────────────────
  function extendVoiceCommands() {
    if (!editor.recognition) return;
    const originalOnResult = editor.recognition.onresult;
    editor.recognition.onresult = function(event) {
      if (originalOnResult) originalOnResult.call(this, event);
      const transcript = event.results[0][0].transcript.trim().toLowerCase();

      if (transcript.includes('ลบพื้นหลัง') || transcript.includes('ลบพื้น')) {
        editor.performAIRemove?.();
      } else if (transcript.includes('sharp rgb')) {
        let ch = 'all';
        if (transcript.includes('แดง')) ch = 'r';
        else if (transcript.includes('เขียว')) ch = 'g';
        else if (transcript.includes('น้ำเงิน') || transcript.includes('ฟ้า')) ch = 'b';
        editor.applyRGBSharpen?.(ch);
      } else if (transcript.includes('สีอุ่น')) {
        editor.applyColorPreset?.('warm');
      } else if (transcript.includes('สีเย็น')) {
        editor.applyColorPreset?.('cool');
      } else if (transcript.includes('จัดไฟล์')) {
        document.getElementById('fileManagerPanel')?.classList.toggle('hidden');
      }
    };
  }

  // ──────────────────────────────────────────────
  // ส่วนที่ 4: การสร้าง UI และผูก Events
  // ──────────────────────────────────────────────
  function buildUI() {
    const container = findContainer();
    if (document.getElementById('feature-grid')) return;

    const grid = createGrid();
    container.appendChild(grid);
    injectStyles();

    // ผูก Events สำหรับปุ่มต่าง ๆ
    bindAIButton();
    bindFileToggle();
    bindRGBSharpen();
    bindPresetButtons();
    bindVoiceButton();
    bindToolButtons();

    // ตั้งค่าระบบ File Manager
    setupFileManager();
    // สถานะซิงค์
    syncStatus('aiStatus', 'ai-status-9');
    syncStatus('voiceStatusMsg', 'voice-status-9');
  }

  // 4.1 หา container
  function findContainer() {
    const sel = '#controls, .toolbar, #main-controls, .controls-container';
    let container = document.querySelector(sel);
    if (!container) {
      container = document.createElement('div');
      container.id = 'feature-container';
      container.style.cssText = 'margin:10px 0;padding:10px;background:#f8fafc;border-radius:12px;';
      document.body.prepend(container);
    }
    return container;
  }

  // 4.2 สร้าง Grid
  function createGrid() {
    const grid = document.createElement('div');
    grid.id = 'feature-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:8px 0;';

    const features = [
      {
        id: 'ai-remove',
        icon: '🤖',
        title: 'AI ลบพื้นหลัง',
        desc: 'ลบพื้นหลังด้วย AI',
        content: `<button id="btn-ai-remove" class="fb primary">ลบพื้นหลัง</button>
                  <span id="ai-status-9" style="font-size:12px;color:#64748b;">พร้อม</span>`
      },
      {
        id: 'file-manager',
        icon: '📄',
        title: 'File Manager',
        desc: 'จัดการไฟล์ที่อัปโหลด',
        content: `<button id="btn-toggle-files" class="fb secondary">แสดงไฟล์</button>
                  <div id="file-list" style="font-size:12px;max-height:60px;overflow-y:auto;margin-top:4px;"></div>`
      },
      {
        id: 'rgb-sharpen',
        icon: '👁️',
        title: 'RGB Sharpen',
        desc: 'Sharpen แยกช่องสี',
        content: `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
                    <label><input type="checkbox" class="rgb-ch" value="r" checked> R</label>
                    <label><input type="checkbox" class="rgb-ch" value="g" checked> G</label>
                    <label><input type="checkbox" class="rgb-ch" value="b" checked> B</label>
                  </div>
                  <button id="btn-rgb-sharpen" class="fb primary">Sharpen</button>`
      },
      {
        id: 'color-lighting',
        icon: '🎨',
        title: 'Color & Lighting',
        desc: 'Preset สีและแสง',
        content: `<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">
                    <button class="pb" data-preset="warm">🌞 Warm</button>
                    <button class="pb" data-preset="cool">❄️ Cool</button>
                    <button class="pb" data-preset="vivid">🌈 Vivid</button>
                    <button class="pb" data-preset="muted">🌫️ Muted</button>
                  </div>`
      },
      {
        id: 'voice-tools',
        icon: '🎙️',
        title: 'Voice & Tools',
        desc: 'คำสั่งเสียงและเครื่องมือ',
        content: `<button id="btn-voice-9" class="fb secondary">🎤 ฟัง</button>
                  <span id="voice-status-9" style="font-size:12px;color:#64748b;">พร้อม</span>
                  <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">
                    <button class="tb" data-action="grayscale">⚪ BW</button>
                    <button class="tb" data-action="sepia">🟫 Sepia</button>
                    <button class="tb" data-action="autolevels">⚡ Auto</button>
                  </div>`
      }
    ];

    features.forEach(f => {
      const card = document.createElement('div');
      card.className = 'fc';
      card.style.cssText =
        'background:white;border-radius:12px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #e2e8f0;text-align:center;display:flex;flex-direction:column;align-items:center;';
      card.innerHTML = `
        <div style="font-size:24px;margin-bottom:2px;">${f.icon}</div>
        <div style="font-weight:600;font-size:14px;color:#0f172a;">${f.title}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${f.desc}</div>
        <div style="width:100%;">${f.content}</div>
      `;
      grid.appendChild(card);
    });

    return grid;
  }

  // 4.3 CSS
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .fb{padding:5px 14px;border:none;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;margin:2px;}
      .fb.primary{background:#3b82f6;color:#fff;}.fb.primary:hover{background:#2563eb;transform:scale(1.02);}
      .fb.secondary{background:#e2e8f0;color:#1e293b;}.fb.secondary:hover{background:#cbd5e1;}
      .pb{padding:3px 10px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;font-size:12px;cursor:pointer;transition:all .1s;}
      .pb:hover{background:#e2e8f0;border-color:#94a3b8;}
      .tb{padding:2px 10px;border:1px solid #d1d5db;border-radius:12px;background:#fff;font-size:11px;cursor:pointer;transition:all .1s;}
      .tb:hover{background:#f3f4f6;}
      .rgb-ch{margin-right:2px;}
      #file-list{font-size:11px;text-align:left;max-height:50px;overflow-y:auto;background:#f1f5f9;padding:4px 6px;border-radius:6px;margin-top:4px;}
      .fi{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #e2e8f0;}
      .fi button{background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;}
      @media(max-width:640px){#feature-grid{grid-template-columns:repeat(2,1fr);}}
      @media(max-width:480px){#feature-grid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  // ─── Event Binding ─────────────────────────────

  function bindAIButton() {
    document.getElementById('btn-ai-remove')?.addEventListener('click', () => {
      editor?.performAIRemove?.();
    });
  }

  function bindFileToggle() {
    document.getElementById('btn-toggle-files')?.addEventListener('click', () => {
      const list = document.getElementById('file-list');
      if (!list) return;
      if (list.innerHTML.trim() === '') renderFileList();
      const isHidden = list.style.display === 'none';
      list.style.display = isHidden ? 'block' : 'none';
    });
  }

  function bindRGBSharpen() {
    document.getElementById('btn-rgb-sharpen')?.addEventListener('click', () => {
      const checked = [...document.querySelectorAll('.rgb-ch:checked')].map(cb => cb.value);
      if (checked.length === 0) return alert('กรุณาเลือกอย่างน้อย 1 ช่องสี');
      if (checked.length === 3) {
        editor?.applySharpenWorker?.();
      } else {
        editor?.applyMultiChannelSharpen?.(checked);
      }
    });
  }

  function bindPresetButtons() {
    document.querySelectorAll('.pb').forEach(btn => {
      btn.addEventListener('click', function() {
        const preset = this.dataset.preset;
        if (editor?.applyColorPreset) {
          editor.applyColorPreset(preset);
        } else {
          applyColorPresetFallback(preset);
        }
      });
    });
  }

  function bindVoiceButton() {
    document.getElementById('btn-voice-9')?.addEventListener('click', () => {
      if (editor?.startVoiceCommand) {
        editor.startVoiceCommand();
      } else {
        alert('ระบบเสียงยังไม่พร้อม');
      }
    });
  }

  function bindToolButtons() {
    document.querySelectorAll('.tb').forEach(btn => {
      btn.addEventListener('click', function() {
        const action = this.dataset.action;
        if (!editor) return;
        if (action === 'grayscale') editor.applyGrayscale?.();
        else if (action === 'sepia') editor.applySepia?.();
        else if (action === 'autolevels') editor.applyAutoLevels?.();
      });
    });
  }

  // ─── File Manager ──────────────────────────────

  function setupFileManager() {
    // ผูก event กับ uploadInput
    if (editor?.uploadInput) {
      editor.uploadInput.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) addFileToHistory(file);
      });
    }
    // render ครั้งแรก
    renderFileList();
    // ซ่อน list ตอนเริ่ม
    document.getElementById('file-list')?.style.setProperty('display', 'none');
  }

  function addFileToHistory(file) {
    if (!editor) return;
    if (!editor.fileHistory) editor.fileHistory = [];
    const reader = new FileReader();
    reader.onload = function(ev) {
      editor.fileHistory.push({
        name: file.name,
        size: file.size,
        dataUrl: ev.target.result,
        timestamp: Date.now()
      });
      if (editor.fileHistory.length > 20) editor.fileHistory.shift();
      renderFileList();
    };
    reader.readAsDataURL(file);
  }

  function renderFileList() {
    const list = document.getElementById('file-list');
    if (!list) return;
    const files = editor?.fileHistory || [];
    if (files.length === 0) {
      list.innerHTML = '<div style="color:#94a3b8;">ยังไม่มีไฟล์</div>';
      return;
    }
    let html = '';
    files.forEach((f, i) => {
      html += `<div class="fi">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">${f.name}</span>
                <button data-idx="${i}" class="fr">✕</button>
              </div>`;
    });
    list.innerHTML = html;
    list.querySelectorAll('.fr').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = +this.dataset.idx;
        if (editor?.fileHistory) {
          editor.fileHistory.splice(idx, 1);
          renderFileList();
        }
      });
    });
  }

  // ─── ตัวช่วย ──────────────────────────────────

  function syncStatus(srcId, dstId) {
    const src = document.getElementById(srcId);
    const dst = document.getElementById(dstId);
    if (src && dst) {
      new MutationObserver(() => {
        dst.innerHTML = src.innerHTML;
      }).observe(src, { childList: true, subtree: true, characterData: true });
    }
  }

  function applyColorPresetFallback(preset) {
    if (!editor) return;
    const map = { warm: [120, 10], cool: [110, 5], vivid: [150, 15], muted: [70, -10] };
    const [sat, bri] = map[preset] || [100, 0];
    if (editor.saturationSlider) editor.saturationSlider.value = sat;
    if (editor.brightnessSlider) editor.brightnessSlider.value = bri;
    if (typeof editor.updateSliderDisplays === 'function') editor.updateSliderDisplays();
    if (typeof editor.applyColorBoost === 'function') editor.applyColorBoost();
    if (typeof editor.speakThai === 'function') editor.speakThai(`ปรับสี ${preset}`);
  }

  // ──────────────────────────────────────────────
  // เริ่มต้น
  // ──────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();