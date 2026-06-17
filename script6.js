// ============================================================
// script6.js - ป้องกันการเปิด Developer Tools
// (ทำงานอิสระ ไม่พึ่งพา script หลัก)
// ============================================================

(function() {
    'use strict';

    // 1. ป้องกันคลิกขวา (Context Menu)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // 2. ป้องกันคีย์ลัดทั่วไป
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I (Inspect)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
            e.preventDefault();
            return false;
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+C (Inspect Element)
        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+E (DevTools ในบางเบราว์เซอร์)
        if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e' || e.keyCode === 69)) {
            e.preventDefault();
            return false;
        }

        // ป้องกัน Ctrl+S (บันทึกหน้า) – กันการบันทึกหน้าเว็บ
        if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
            e.preventDefault();
            return false;
        }
    });

    // 3. ตรวจสอบการเปิด DevTools โดยใช้ debugger (แบบเบา)
    // วิธีนี้จะทำให้เกิดการหยุดทำงานถ้าเปิด DevTools แล้วไปที่ Console
    // แต่ไม่รบกวนผู้ใช้ทั่วไป
    (function detectDevTools() {
        const devtools = /./;
        devtools.toString = function() {
            // ถ้าถูกเรียกขณะเปิด DevTools ให้แจ้งเตือน
            // แต่ไม่ต้องทำอะไรรุนแรง
            console.warn('⚠️ ตรวจพบการเปิด Developer Tools');
            // อาจจะ redirect หรือล้างข้อมูลก็ได้
            // แต่เราเลือกแค่แจ้งเตือนใน console (ซึ่งผู้ใช้ DevTools ก็เห็น)
            // เพื่อไม่ให้เดือดร้อนผู้ใช้ทั่วไป
        };
        console.log('%c', devtools);
    })();

    // 4. ตรวจสอบขนาดหน้าต่าง (ตรวจจับการเปิด DevTools แบบ docked)
    // (อาจจะมี false positive แต่ก็พอใช้ได้)
    let devtoolsOpen = false;
    const threshold = 160; // ความกว้างต่ำสุดของ DevTools ที่น่าจะตรวจจับได้

    function checkDevTools() {
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > threshold || heightDiff > threshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                console.warn('⚠️ DevTools ถูกตรวจจับ (วัดขนาดหน้าต่าง)');
                // ทำอะไรก็ได้ เช่น แจ้งเตือนผู้ใช้
                // alert('ปิด DevTools เพื่อใช้งานต่อ');
                // หรือ redirect ไปหน้าอื่น
                // window.location.href = 'about:blank';
            }
        } else {
            devtoolsOpen = false;
        }
    }

    // ตรวจสอบทุก 2 วินาที (อาจเพิ่มโหลดเล็กน้อย)
    // setInterval(checkDevTools, 2000);

    // แต่ถ้าไม่ต้องการให้รบกวนการใช้งานปกติ ให้ comment บรรทัดบนออก

    console.log('✅ มาตรการป้องกัน Developer Tools เปิดใช้งานแล้ว (script6.js)');
})();