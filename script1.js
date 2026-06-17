/**
 * script1.js - Advanced Voice AI Enhancement 
 * ฟีเจอร์: พูดต่อเนื่อง (continuous), แสดงข้อความสด (interim results), 
 *          ตอบโต้แบบสุภาพ "ครับเจ้านาย", และปุ่มเปิด/ปิดระบบ AI
 */

(function() {
    let attempts = 0;
    const MAX_ATTEMPTS = 100;
    const waitForEditor = setInterval(() => {
        attempts++;
        if (window.editor && window.editor.recognition) {
            clearInterval(waitForEditor);
            enhanceVoiceAI();
        } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(waitForEditor);
            console.warn('⚠️ Advanced Voice AI: editor หรือ recognition ไม่พร้อมใช้งาน');
        }
    }, 100);

    function enhanceVoiceAI() {
        const editor = window.editor;
        if (!editor) return;

        // ---------- ตัวแปรสถานะระบบ AI (ใช้ร่วมกันทั้งฟังก์ชัน) ----------
        let aiActive = true;   // เริ่มต้นระบบเปิดทำงาน

        // ---------- สร้าง UI แสดง transcript แบบ real-time ----------
        if (!document.getElementById('voiceRealtimeText')) {
            const transcriptDiv = document.createElement('div');
            transcriptDiv.id = 'voiceRealtimeText';
            transcriptDiv.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                background: rgba(0,0,0,0.75);
                color: #0f0;
                font-family: 'Courier New', monospace;
                font-size: 1.2rem;
                padding: 12px;
                border-radius: 12px;
                z-index: 9999;
                backdrop-filter: blur(6px);
                white-space: pre-wrap;
                word-break: break-word;
                pointer-events: none;
                box-shadow: 0 0 10px rgba(0,255,0,0.3);
                border-left: 4px solid #0f0;
            `;
            document.body.appendChild(transcriptDiv);
        }
        const realtimeDisplay = document.getElementById('voiceRealtimeText');

        // ---------- ชุดคำลงท้ายสุภาพ (ครับเจ้านาย) ----------
        const responseSuffixes = [
            "ครับเจ้านาย", "รับทราบครับเจ้านาย", "พร้อมแล้วครับเจ้านาย",
            "ได้เลยครับเจ้านาย", "ครับท่าน", "ครับคุณชาย", "ครับผม", "ครับ", "รับใช้เสมอครับเจ้านาย"
        ];

        function addPoliteSuffix(text) {
            if (/(ครับ|คะ|จ้า|ฮะ|เจ้านาย|ท่าน|คุณชาย|รับใช้)/.test(text)) return text;
            const suffix = responseSuffixes[Math.floor(Math.random() * responseSuffixes.length)];
            text = text.replace(/[.!?]+$/, '');
            return `${text} ${suffix}`;
        }

        // ---------- ชุดข้อความตอบกลับแบบสุภาพ ----------
        const aiResponses = {
            greeting: ["สวัสดีครับเจ้านาย พร้อมช่วยเหลือ", "หวัดดีครับ มีอะไรให้รับใช้เจ้านาย", "ยินดีรับใช้ครับเจ้านาย พูดมาได้เลย", "ว่าไงครับเจ้านาย"],
            farewell: ["ลาก่อนครับเจ้านาย", "ไว้พบกันใหม่ครับเจ้านาย", "ขอลาผู้ดีครับเจ้านาย", "บาย ๆ นะเจ้านาย"],
            confirm: ["เรียบร้อยครับเจ้านาย", "ดำเนินการให้แล้วครับเจ้านาย", "เสร็จสิ้นครับเจ้านาย", "ตามนั้นเลยครับเจ้านาย", "ปรับให้แล้วครับเจ้านาย", "รับทราบครับเจ้านาย"],
            askRepeat: ["ขอโทษครับเจ้านาย พูดอีกครั้งได้ไหมครับ", "ไม่ค่อยชัดครับ กรุณาพูดอีกทีเจ้านาย", "ได้ยินไม่ถนัดครับเจ้านาย ขอโทษนะครับ"],
            unknown: ["ยังไม่เข้าใจคำสั่งครับเจ้านาย พูด 'ช่วยเหลือ' ดูนะครับ", "ไม่ทราบคำสั่งครับเจ้านาย ลอง 'ช่วยเหลือ' ครับ", "ขออภัย ยังไม่รู้จักคำสั่งนี้ครับเจ้านาย"],
            help: ["คำสั่งที่ใช้ได้ครับเจ้านาย: ปรับความคมชัด, เพิ่มความสว่าง, ลบพื้นหลัง, บันทึกภาพ, ย้อนกลับ, ทำซ้ำ, รีเซ็ต, ตั้งค่าความคมชัด 80, ตั้งค่ารัศมี 1.5, ปรับความอิ่มตัว 120, ปรับคอนทราสต์ 20, ซูม ครับเจ้านาย"],
            thank: ["ยินดีครับเจ้านาย", "ด้วยความยินดีครับเจ้านาย", "ไม่เป็นไรครับเจ้านาย", "ขอบคุณที่ใช้บริการครับเจ้านาย"],
            needConfirmation: ["เจ้านายต้องการให้ปรับ {value} หรือไม่ครับ? ตอบว่า 'ใช่' หรือ 'ไม่'", "ยืนยันการปรับ {action} ไหมครับ? พูด 'ใช่' หรือ 'ไม่' นะเจ้านาย"],
            cantAdjustRelative: ["ไม่รู้ค่าปัจจุบันครับเจ้านาย กรุณาระบุตัวเลขเต็ม เช่น 'เพิ่มความคมชัดเป็น 70'", "บอกมาเป็นตัวเลขจะดีกว่าครับเจ้านาย"],
            learnSynonym: ["บันทึกคำ '{word}' เป็นความหมายเดียวกับ '{action}' แล้วครับเจ้านาย", "เข้าใจแล้วครับว่า '{word}' หมายถึง {action} เจ้านาย"],
            askWhichAction: ["เจ้านายต้องการปรับอะไรครับ? (ความคมชัด, ความสว่าง, คอนทราสต์, ความอิ่มตัว)", "ปรับค่าไหนดีครับเจ้านาย? พูด 'ความคมชัด' หรือ 'ความสว่าง'"],
            roundingNotify: ["ปัดค่าตามขั้นตอนละ {step} นะครับเจ้านาย", "ปรับเป็นครั้งละ {step} หน่วยครับเจ้านาย"]
        };

        function randomResponse(category, placeholders = {}) {
            let arr = aiResponses[category] || aiResponses.unknown;
            let text = arr[Math.floor(Math.random() * arr.length)];
            for (let [key, val] of Object.entries(placeholders)) text = text.replace(`{${key}}`, val);
            return addPoliteSuffix(text);
        }

        // ---------- ฐานความรู้ (synonyms, adjustables) ----------
        const aiKnowledge = {
            greetings: ["สวัสดี", "หวัดดี", "hello", "ฮัลโหล", "hey", "ไง"],
            farewells: ["ลาก่อน", "บาย", "bye", "แล้วเจอกัน", "ไปละ"],
            thanks: ["ขอบคุณ", "thank", "thanks", "ขอบใจ", "แค่นี้ก่อน"],
            synonyms: {
                "sharpen": ["เพิ่มความคมชัด", "ชาร์ป", "ทำให้คม", "ชัดขึ้น", "ชาร์ปขึ้น", "เพิ่มชาร์ป", "ปรับความคม"],
                "blur": ["เบลอ", "ทำให้เบลอ", "ละลาย", "ฟุ้ง", "ลดความคม"],
                "brightness": ["ความสว่าง", "สว่าง", "เพิ่มความสว่าง", "ลดความสว่าง", "brightness", "สว่างขึ้น", "มืดลง"],
                "contrast": ["คอนทราสต์", "ความต่าง", "contrast", "เพิ่มคอนทราสต์", "ลดคอนทราสต์"],
                "saturation": ["ความอิ่มตัว", "สีจัด", "saturation", "อิ่มตัว", "เพิ่มความอิ่ม", "สีสด"],
                "undo": ["ย้อนกลับ", "เลิกทำ", "undo", "กลับคืน", "ย้อน", "เลิก"],
                "redo": ["ทำซ้ำ", "redo", "ทำอีก", "ซ้ำ"],
                "reset": ["รีเซ็ต", "คืนค่า", "reset", "เริ่มใหม่", "ล้าง"],
                "removeBg": ["ลบพื้นหลัง", "ตัดพื้นหลัง", "remove background", "เปลี่ยนพื้นหลัง", "ถอดพื้น"],
                "save": ["บันทึก", "เซฟ", "save", "เก็บภาพ", "เซฟไฟล์"],
                "autoEnhance": ["ปรับอัตโนมัติ", "ออโต้", "auto", "ปรับภาพอัตโนมัติ", "enhance"],
                "zoom": ["ซูม", "ขยาย", "zoom in", "zoom out", "缩小", "放大"],
                "upload": ["อัปโหลด", "เพิ่มภาพ", "เลือกภาพ", "upload image", "อัปภาพ"],
                "help": ["ช่วยเหลือ", "help", "แนะนำ", "คำสั่ง", "ทำอะไรได้บ้าง"],
                "radius": ["รัศมี", "รัศมีชาร์ป", "radius", "รัศมีการชาร์ป"],
                "threshold": ["เกณฑ์", "threshold", "ค่าเกณฑ์"]
            },
            adjustables: {
                "amount": { min: 0, max: 200, step: 5, default: 50, sliderId: "amountSlider" },
                "radius": { min: 0.5, max: 5, step: 0.1, default: 1, sliderId: "radiusSlider" },
                "threshold": { min: 0, max: 50, step: 1, default: 10, sliderId: "thresholdSlider" },
                "saturation": { min: 0, max: 200, step: 5, default: 100, sliderId: "saturationSlider" },
                "brightness": { min: -100, max: 100, step: 5, default: 0, sliderId: "brightnessSlider" },
                "contrast": { min: -50, max: 50, step: 2, default: 0, sliderId: "contrastSlider" }
            }
        };

        // localStorage สำหรับ synonyms
        const SYNONYMS_VERSION = 1;
        let userSynonyms = {};
        try {
            const stored = localStorage.getItem('voice_synonyms');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.version === SYNONYMS_VERSION && parsed.data) userSynonyms = parsed.data;
                else localStorage.removeItem('voice_synonyms');
            }
        } catch(e) {}

        function saveSynonyms() { localStorage.setItem('voice_synonyms', JSON.stringify({ version: SYNONYMS_VERSION, data: userSynonyms })); }
        function getAllSynonyms() {
            const merged = { ...aiKnowledge.synonyms };
            for (let [key, values] of Object.entries(userSynonyms)) {
                if (!merged[key]) merged[key] = [];
                merged[key].push(...values);
            }
            return merged;
        }

        // ---------- ฟังก์ชันจัดการ Slider ----------
        let isApplying = false;
        function updateSliderValue(sliderId, value, skipWorker = false) {
            const slider = document.getElementById(sliderId);
            if (!slider || isApplying) return false;
            isApplying = true;
            try {
                slider.value = value;
                if (slider.oninput && !skipWorker) slider.oninput();
                if (editor.updateSliderDisplays) editor.updateSliderDisplays();
                return true;
            } finally { isApplying = false; }
        }
        function getCurrentSliderValue(sliderId) {
            const slider = document.getElementById(sliderId);
            return slider ? parseFloat(slider.value) : null;
        }
        function parseRelativeAdjust(text, paramName) { /* เหมือนเดิม */ 
            const lower = text.toLowerCase();
            const cfg = aiKnowledge.adjustables[paramName];
            if (!cfg) return null;
            let amount = null, isIncrease = null;
            if (/(เพิ่ม|มากขึ้น|มากขึ้นอีก|เพิ่มขึ้น|ขึ้น|\+)/.test(lower)) isIncrease = true;
            else if (/(ลด|ลดลง|น้อยลง|ลบ|\-)/.test(lower)) isIncrease = false;
            else return null;
            let match = lower.match(/(\d+(?:\.\d+)?)/);
            if (match) {
                amount = parseFloat(match[1]);
                let roundedAmount = Math.round(amount / cfg.step) * cfg.step;
                if (Math.abs(roundedAmount - amount) > 0.001) editor.speakThai(randomResponse('roundingNotify', { step: cfg.step }));
                amount = roundedAmount;
            } else amount = cfg.step;
            if (isIncrease === false) amount = -amount;
            return amount;
        }
        async function applyRelativeAdjust(paramName, delta) {
            const cfg = aiKnowledge.adjustables[paramName];
            if (!cfg) return false;
            const current = getCurrentSliderValue(cfg.sliderId);
            if (current === null) { editor.speakThai(randomResponse('cantAdjustRelative')); return false; }
            let newVal = Math.min(cfg.max, Math.max(cfg.min, current + delta));
            newVal = Math.round(newVal / cfg.step) * cfg.step;
            updateSliderValue(cfg.sliderId, newVal);
            triggerEffectForParam(paramName);
            editor.speakThai(randomResponse('confirm') + ` ปรับ${paramName} เป็น ${newVal}`);
            return true;
        }
        function triggerEffectForParam(paramName) {
            if (['amount','radius','threshold'].includes(paramName) && editor.applySharpenWorker) editor.applySharpenWorker();
            else if (['saturation','brightness','contrast'].includes(paramName) && editor.applyColorBoost) editor.applyColorBoost();
        }

        // ---------- Pending Confirmation Queue ----------
        let confirmationQueue = [], isConfirming = false;
        function setPendingConfirmation(intent, entities) { confirmationQueue.push({ intent, entities, timestamp: Date.now() }); if (!isConfirming) processConfirmationQueue(); }
        async function processConfirmationQueue() {
            if (confirmationQueue.length === 0) { isConfirming = false; return; }
            isConfirming = true;
            editor.speakThai(randomResponse('askWhichAction'));
        }
        function getCurrentPending() { return confirmationQueue.length ? confirmationQueue[0] : null; }
        function resolvePending(confirmed) {
            if (!confirmationQueue.length) return null;
            const pending = confirmationQueue.shift();
            if (confirmed) return pending;
            editor.speakThai("ยกเลิกคำสั่งแล้วครับเจ้านาย");
            processConfirmationQueue();
            return null;
        }

        // ---------- Intent Parser ----------
        function parseIntent(command) {
            const lower = command.toLowerCase();
            let intent = null, entities = {};
            const synonyms = getAllSynonyms();
            const pending = getCurrentPending();
            if (pending) {
                if (/(ใช่|ok|yes|รับ|ตกลง|ยืนยัน|แน่นอน)/.test(lower)) return { intent: 'confirm_yes', entities };
                if (/(ไม่|no|cancel|ยกเลิก|ไม่เอา|ไม่ใช่)/.test(lower)) return { intent: 'confirm_no', entities };
            }
            if (aiKnowledge.greetings.some(w => lower.includes(w))) return { intent: 'greeting', entities };
            if (aiKnowledge.farewells.some(w => lower.includes(w))) return { intent: 'farewell', entities };
            if (aiKnowledge.thanks.some(w => lower.includes(w))) return { intent: 'thank', entities };
            
            const learnMatch = lower.match(/จำไว้ว่า\s+([^\s]+)\s+แปลว่า\s+(.+)/);
            if (learnMatch) {
                let newWord = learnMatch[1].trim(), targetAction = learnMatch[2].trim(), foundKey = null;
                for (let [key, vals] of Object.entries(synonyms)) if (vals.some(v => targetAction.includes(v) || targetAction === key)) { foundKey = key; break; }
                if (foundKey) {
                    if (!userSynonyms[foundKey]) userSynonyms[foundKey] = [];
                    if (!userSynonyms[foundKey].includes(newWord)) { userSynonyms[foundKey].push(newWord); saveSynonyms(); editor.speakThai(randomResponse('learnSynonym', { word: newWord, action: foundKey })); }
                }
                return { intent: 'noop', entities };
            }
            for (let [action, keywords] of Object.entries(synonyms)) if (keywords.some(kw => lower.includes(kw))) { intent = action; break; }
            if (!intent) {
                if (/(รีเซ็ต|คืนค่า|reset)/.test(lower)) intent = 'reset';
                else if (/(undo|เลิกทำ|ย้อนกลับ)/.test(lower)) intent = 'undo';
                else if (/(redo|ทำซ้ำ)/.test(lower)) intent = 'redo';
                else if (/(help|ช่วยเหลือ)/.test(lower)) intent = 'help';
                else intent = 'unknown';
            }
            const numberMatch = lower.match(/(\d+(?:\.\d+)?)/);
            if (numberMatch) entities.value = parseFloat(numberMatch[1]);
            const adjustableParams = Object.keys(aiKnowledge.adjustables);
            if (adjustableParams.includes(intent)) {
                let paramName = (intent === 'sharpen') ? 'amount' : intent;
                if (/(เพิ่ม|มากขึ้น|ลด|ลดลง)/.test(lower)) {
                    let delta = parseRelativeAdjust(command, paramName);
                    if (delta !== null) { entities.relativeDelta = delta; entities.paramName = paramName; }
                }
                if (entities.value !== undefined && !entities.relativeDelta) entities.absolute = entities.value;
            }
            if (intent === 'reset') {
                if (lower.includes('สี') || lower.includes('แสง')) intent = 'resetColor';
                else if (lower.includes('คม') || lower.includes('ชาร์ป')) intent = 'resetSharpen';
                else intent = 'resetImage';
            }
            return { intent, entities };
        }

        async function executeIntent(intent, entities) {
            if (intent === 'confirm_yes') { const pending = resolvePending(true); if (pending) return await executeIntent(pending.intent, pending.entities); return true; }
            if (intent === 'confirm_no') { resolvePending(false); return true; }
            switch(intent) {
                case 'greeting': editor.speakThai(randomResponse('greeting')); return true;
                case 'farewell': editor.speakThai(randomResponse('farewell')); return true;
                case 'thank': editor.speakThai(randomResponse('thank')); return true;
                case 'help': editor.speakThai(randomResponse('help')); return true;
                case 'undo': if (editor.undo) editor.undo(); else editor.speakThai("ไม่สามารถเลิกทำได้ครับเจ้านาย"); editor.speakThai(randomResponse('confirm') + " เลิกทำเรียบร้อย"); return true;
                case 'redo': if (editor.redo) editor.redo(); else editor.speakThai("ไม่สามารถทำซ้ำได้ครับเจ้านาย"); editor.speakThai(randomResponse('confirm') + " ทำซ้ำเรียบร้อย"); return true;
                case 'resetImage': if (editor.resetImage) editor.resetImage(); else editor.speakThai("ไม่สามารถรีเซ็ตภาพได้ครับเจ้านาย"); editor.speakThai(randomResponse('confirm') + " รีเซ็ตเป็นภาพต้นฉบับ"); return true;
                case 'resetSharpen': if (editor.resetSharpenEngine) editor.resetSharpenEngine(); else editor.speakThai("ไม่พบฟังก์ชันรีเซ็ตความคมชัดครับเจ้านาย"); return true;
                case 'resetColor': if (editor.resetColor) editor.resetColor(); else editor.speakThai("รีเซ็ตสีเรียบร้อยครับเจ้านาย"); return true;
                case 'removeBg': if (editor.performAIRemove) await editor.performAIRemove(); else editor.speakThai("ไม่สามารถลบพื้นหลังได้ครับเจ้านาย"); return true;
                case 'save': if (editor.saveImage) editor.saveImage(); else editor.speakThai("ไม่สามารถบันทึกภาพได้ครับเจ้านาย"); return true;
                case 'autoEnhance': if (typeof window.autoEnhanceFn === 'function') window.autoEnhanceFn(); else editor.speakThai("โปรดเพิ่มปุ่ม Auto Enhance ก่อนใช้งานครับเจ้านาย"); return true;
                case 'sharpen': case 'brightness': case 'contrast': case 'saturation': case 'radius': case 'threshold':
                    let paramName = (intent === 'sharpen') ? 'amount' : intent;
                    if (entities.relativeDelta !== undefined && entities.paramName) return await applyRelativeAdjust(entities.paramName, entities.relativeDelta);
                    if (entities.absolute !== undefined) {
                        const cfg = aiKnowledge.adjustables[paramName];
                        if (cfg) {
                            let val = Math.min(cfg.max, Math.max(cfg.min, entities.absolute));
                            val = Math.round(val / cfg.step) * cfg.step;
                            updateSliderValue(cfg.sliderId, val);
                            triggerEffectForParam(paramName);
                            editor.speakThai(randomResponse('confirm') + ` ตั้ง${paramName} = ${val}`);
                            return true;
                        }
                    }
                    setPendingConfirmation(intent, entities);
                    return true;
                case 'toggleZoom': if (editor.toggleZoom) editor.toggleZoom(); else editor.speakThai("ไม่สามารถซูมได้ครับเจ้านาย"); return true;
                case 'upload': if (editor.uploadBtn) editor.uploadBtn.click(); else editor.speakThai("ไม่สามารถอัปโหลดได้ครับเจ้านาย"); return true;
                case 'noop': return true;
                default: return false;
            }
        }

        const originalProcess = editor.processVoiceCommand?.bind(editor);
        editor.processVoiceCommand = async function(cmd) {
            const { intent, entities } = parseIntent(cmd);
            const executed = await executeIntent(intent, entities);
            if (!executed && originalProcess) originalProcess(cmd);
            else if (!executed) editor.speakThai(randomResponse('unknown'));
        };

        // ---------- ตั้งค่า Speech Recognition (ต่อเนื่อง + interim) และเชื่อมกับปุ่มเปิด/ปิด ----------
        if (editor.recognition) {
            const recog = editor.recognition;
            recog.continuous = true;
            recog.interimResults = true;
            recog.lang = 'th-TH';
            
            let lastFinalText = '';
            const originalOnResult = recog.onresult;
            const originalOnEnd = recog.onend;
            const originalOnError = recog.onerror;
            
            recog.onresult = function(event) {
                let interim = '', final = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) final += transcript;
                    else interim += transcript;
                }
                if (realtimeDisplay) {
                    let html = '<span style="color:#aaa;">🎤 กำลังฟัง...</span><br>';
                    if (interim) html += `<span style="color:#ffa; font-style:italic;">${escapeHtml(interim)}</span>`;
                    if (final) {
                        html += `<br><span style="color:#0f0;">✔ ${escapeHtml(final)}</span>`;
                        if (final !== lastFinalText) {
                            lastFinalText = final;
                            editor.processVoiceCommand(final.trim());
                        }
                    }
                    realtimeDisplay.innerHTML = html;
                    clearTimeout(window.realtimeTimeout);
                    window.realtimeTimeout = setTimeout(() => {
                        if (realtimeDisplay && !interim && !final) realtimeDisplay.innerHTML = '<span style="color:#aaa;">🎙️ พร้อมรับคำสั่ง...</span>';
                    }, 3000);
                }
                if (originalOnResult) originalOnResult.call(recog, event);
            };
            
            // กำหนด onend ใหม่ โดยตรวจสอบ aiActive
            recog.onend = function(event) {
                console.log('Recognition ended, aiActive =', aiActive);
                if (aiActive) {
                    // ถ้าระบบยัง active ให้ restart ต่อเนื่อง
                    try { recog.start(); } catch(e) { console.warn('Restart failed', e); }
                } else {
                    if (realtimeDisplay) realtimeDisplay.innerHTML = '⏸️ ระบบ AI ถูกปิดใช้งาน (ไม่ฟังเสียง)';
                }
                if (originalOnEnd) originalOnEnd.call(recog, event);
            };
            
            recog.onerror = function(event) {
                console.error('Recognition error:', event.error);
                if (event.error === 'not-allowed') editor.speakThai("กรุณาอนุญาตไมโครโฟน และคลิกที่หน้าเว็บอีกครั้งครับเจ้านาย");
                else if (event.error === 'network') editor.speakThai("เครือข่ายไม่เสถียร กำลังลองใหม่ครับเจ้านาย");
                if (originalOnError) originalOnError.call(recog, event);
            };
            
            // เริ่มการฟังอัตโนมัติ (โดยคำนึงถึง aiActive = true)
            function startListening() {
                if (!aiActive) return;
                try { recog.start(); console.log('✅ Continuous voice recognition started'); } 
                catch(e) {
                    console.warn('Auto start failed, waiting for user click', e);
                    if (realtimeDisplay) realtimeDisplay.innerHTML = '🖱️ คลิกที่หน้าเว็บเพื่อเริ่มระบบเสียง';
                    const startOnClick = function() {
                        if (aiActive) try { recog.start(); } catch(err) {}
                        document.removeEventListener('click', startOnClick);
                        document.removeEventListener('touchstart', startOnClick);
                    };
                    document.addEventListener('click', startOnClick);
                    document.addEventListener('touchstart', startOnClick);
                }
            }
            startListening();
        }

        function escapeHtml(str) { return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }

        // ---------- สร้างปุ่มเปิด/ปิดระบบ AI (ที่มุมขวาล่าง) ----------
        if (!document.getElementById('voiceAiToggleBtn')) {
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000;';
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'voiceAiToggleBtn';
            toggleBtn.textContent = '🔊 ปิดระบบ AI';
            toggleBtn.style.cssText = 'padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: 0.2s;';
            btnContainer.appendChild(toggleBtn);
            document.body.appendChild(btnContainer);
            
            function updateButtonUI() {
                if (aiActive) {
                    toggleBtn.textContent = '🔊 ปิดระบบ AI';
                    toggleBtn.style.backgroundColor = '#4caf50';
                    if (realtimeDisplay) realtimeDisplay.style.opacity = '1';
                } else {
                    toggleBtn.textContent = '🔇 เปิดระบบ AI';
                    toggleBtn.style.backgroundColor = '#f44336';
                    if (realtimeDisplay) realtimeDisplay.style.opacity = '0.5';
                }
            }
            
            function disableAI() {
                if (!aiActive) return;
                aiActive = false;
                if (editor.recognition) {
                    try { editor.recognition.stop(); } catch(e) {}
                }
                updateButtonUI();
                editor.speakThai("ปิดระบบเสียง AI แล้วครับเจ้านาย");
            }
            
            function enableAI() {
                if (aiActive) return;
                aiActive = true;
                if (editor.recognition) {
                    try { editor.recognition.start(); } catch(e) { console.warn("Start failed", e); }
                }
                updateButtonUI();
                editor.speakThai("เปิดระบบเสียง AI แล้วครับเจ้านาย");
            }
            
            toggleBtn.onclick = () => { aiActive ? disableAI() : enableAI(); };
            updateButtonUI();
        }
        
        // override startVoiceCommand/stopVoiceCommand ให้สอดคล้องกับ aiActive
        const originalStartCmd = editor.startVoiceCommand;
        editor.startVoiceCommand = function() {
            if (editor.recognition) {
                try { editor.recognition.start(); aiActive = true; updateButtonUI?.(); editor.speakThai("เริ่มฟังเสียงแบบต่อเนื่องแล้วครับเจ้านาย"); } 
                catch(e) { if(e.name !== 'InvalidStateError') editor.speakThai("เริ่มไม่สำเร็จครับเจ้านาย"); }
            } else editor.speakThai("ไม่รองรับการจดจำเสียงครับเจ้านาย");
        };
        const originalStopCmd = editor.stopVoiceCommand;
        editor.stopVoiceCommand = function() {
            if (editor.recognition) {
                try { editor.recognition.stop(); aiActive = false; updateButtonUI?.(); editor.speakThai("หยุดฟังแล้วครับเจ้านาย"); } 
                catch(e) {}
            }
        };
        
        const voiceStatusSpan = document.getElementById('voiceStatusMsg');
        if (voiceStatusSpan) { voiceStatusSpan.title = "โหมดต่อเนื่อง + ปุ่มเปิดปิด"; voiceStatusSpan.style.cursor = "help"; }
        
        console.log('✅ Advanced Voice AI with ON/OFF button and polite responses enabled');
        editor.speakThai("ระบบเสียงอัจฉริยะพร้อมใช้งาน มีปุ่มเปิดปิดที่มุมล่างขวานะครับเจ้านาย");
    }
})();