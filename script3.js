/**
 * script3.js
 * ล้างขยะทั้งหมดของ SmartSharpenPro ทุกครั้งที่ปิดหน้า (หรือรีเฟรช)
 * โดยไม่ยุ่งกับไฟล์ C หรือโปรแกรมภายนอก
 * ใช้ event beforeunload เพื่อให้ล้างก่อนออกจากหน้า
 */

(function () {
    "use strict";

    /**
     * ฟังก์ชันหลักสำหรับล้างขยะทั้งหมด (ซิงโครนัสมากที่สุด)
     */
    function cleanupGarbage() {
        console.log("[Cleanup] กำลังล้างขยะก่อนปิดหน้า...");

        // 1. ยกเลิก Web Worker
        if (window.editor && window.editor.activeWorker) {
            try {
                window.editor.activeWorker.terminate();
                window.editor.activeWorker = null;
            } catch (e) {}
        }

        // 2. ยกเลิก AbortController
        if (window.editor && window.editor.abortController) {
            try {
                window.editor.abortController.abort();
                window.editor.abortController = null;
            } catch (e) {}
        }

        // 3. Revoke blob URLs ทั้งหมด (ป้องกันหน่วยความจำรั่ว)
        const allElements = document.querySelectorAll('[src], [href]');
        for (let el of allElements) {
            const url = el.src || el.href;
            if (url && url.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {}
            }
        }

        // 4. ล้าง localStorage keys ของโปรแกรม
        const keys = ['autosave_pro', 'ssp_image_bg_color', 'editorState', 'smartSharpenSettings'];
        keys.forEach(key => {
            if (localStorage.getItem(key) !== null) {
                localStorage.removeItem(key);
            }
        });

        // 5. ล้าง sessionStorage (ข้อมูลชั่วคราวทั้งหมด)
        if (sessionStorage.length > 0) {
            try {
                sessionStorage.clear();
            } catch (e) {}
        }

        // 6. ล้าง IndexedDB ที่เกี่ยวข้องกับ AI (แบบไม่ต้องรอ async)
        if ('indexedDB' in window) {
            const dbs = ['background-removal-cache', 'imgly-cache', 'sharp-cache', 'ModelCache'];
            dbs.forEach(dbName => {
                try {
                    indexedDB.deleteDatabase(dbName);
                } catch (e) {}
            });
        }

        // 7. ล้าง Cache Storage (เฉพาะของไลบรารี) – ทำ async แต่ไม่ต้องรอ
        if ('caches' in window) {
            caches.keys().then(keys => {
                keys.forEach(key => {
                    if (key.includes('background-removal') || key.includes('imgly') || 
                        key.includes('sharp') || key.includes('cache')) {
                        caches.delete(key).catch(()=>{});
                    }
                });
            }).catch(()=>{});
        }

        // 8. หยุด SpeechRecognition
        if (window.editor && window.editor.recognition) {
            try {
                window.editor.recognition.abort();
            } catch (e) {}
        }

        // 9. เคลียร์ ImageData และ Undo/Redo stacks
        if (window.editor) {
            try {
                window.editor.originalImageData = null;
                window.editor.currentImageData = null;
                window.editor.undoStack = [];
                window.editor.redoStack = [];
            } catch (e) {}
        }

        console.log("[Cleanup] ล้างขยะเสร็จ (ก่อนปิดหน้า)");
    }

    // 🔥 ทำงานทุกครั้งที่ปิดหน้า หรือรีเฟรช
    window.addEventListener('beforeunload', cleanupGarbage);

    // (Optional) เปิดเผยฟังก์ชันสำหรับเรียกเองผ่านคอนโซล
    window.cleanupAppGarbage = cleanupGarbage;
})();