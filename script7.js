// script7.js - Drag and Drop เพื่อเปลี่ยนลำดับการ์ดแบบอิสระ (เริ่มต้นให้การ์ด AI อยู่บนสุด)
(function() {
    'use strict';

    // ฟังก์ชันยกเลิก CSS order ที่อาจมีอยู่ใน style.css (เพื่อไม่ให้ขัดแย้ง)
    function resetCardOrderStyles() {
        const cards = document.querySelectorAll('.controls-panel .card');
        cards.forEach(card => {
            card.style.order = '';
        });
        // ลบ inline style order ที่อาจถูกกำหนดไว้
        const styleSheets = document.styleSheets;
        for (let sheet of styleSheets) {
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                    for (let rule of rules) {
                        if (rule.selectorText && (rule.selectorText.includes('.controls-panel .card') || rule.selectorText.includes('.card'))) {
                            if (rule.style.order !== undefined) {
                                rule.style.order = '';
                            }
                        }
                    }
                }
            } catch(e) { /* cross-origin stylesheet อาจไม่สามารถแก้ไขได้ */ }
        }
    }

    // จัดลำดับเริ่มต้น: ให้การ์ด AI (การ์ดใบที่ 2) ขึ้นมาอยู่บนสุด
    function setInitialOrder() {
        const panel = document.querySelector('.controls-panel');
        if (!panel) return;
        const cards = Array.from(panel.querySelectorAll('.card'));
        if (cards.length < 2) return;

        // เช็ค localStorage ว่ามีการบันทึกลำดับไว้หรือยัง
        const saved = localStorage.getItem('controlsPanelCardOrder');
        if (!saved) {
            // ยังไม่เคยบันทึก: เลื่อนการ์ดใบที่ 2 (AI) ขึ้นไปบนสุด
            const aiCard = cards[1]; // การ์ดลำดับที่ 2 (index 1)
            if (aiCard && panel.firstChild !== aiCard) {
                panel.insertBefore(aiCard, panel.firstChild);
            }
            // บันทึกลำดับปัจจุบันหลังปรับ
            saveOrder();
        } else {
            // มีลำดับบันทึกไว้แล้ว ใช้ลำดับนั้น
            loadOrder(panel);
        }
    }

    // บันทึกลำดับการ์ดลง localStorage (อิงจากข้อความใน .card-title)
    function saveOrder() {
        const cards = document.querySelectorAll('.controls-panel .card');
        const order = Array.from(cards).map(card => {
            const titleElem = card.querySelector('.card-title');
            return titleElem ? titleElem.innerText.trim() : '';
        });
        localStorage.setItem('controlsPanelCardOrder', JSON.stringify(order));
    }

    // โหลดลำดับที่บันทึกไว้ แล้วจัดเรียง DOM ใหม่
    function loadOrder(panel) {
        const saved = localStorage.getItem('controlsPanelCardOrder');
        if (!saved) return;
        const order = JSON.parse(saved);
        const cards = Array.from(panel.querySelectorAll('.card'));
        order.forEach(title => {
            const targetCard = cards.find(card => {
                const t = card.querySelector('.card-title');
                return t && t.innerText.trim() === title;
            });
            if (targetCard && panel.lastChild !== targetCard) {
                panel.appendChild(targetCard); // ย้ายไปท้ายสุดตามลำดับที่บันทึก
            }
        });
    }

    // เริ่มต้นระบบ Drag & Drop โดยใช้ SortableJS
    function initDragDrop() {
        const panel = document.querySelector('.controls-panel');
        if (!panel) return;

        // โหลด SortableJS ถ้ายังไม่มีในหน้า
        if (typeof Sortable === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
            script.onload = () => enableSortable(panel);
            document.head.appendChild(script);
        } else {
            enableSortable(panel);
        }
    }

    function enableSortable(panel) {
        // เพิ่ม CSS สำหรับ visual feedback ขณะลาก
        if (!document.getElementById('sortable-dnd-styles')) {
            const style = document.createElement('style');
            style.id = 'sortable-dnd-styles';
            style.textContent = `
                .sortable-ghost {
                    opacity: 0.4;
                    background: #334155;
                    border: 2px dashed var(--theme-primary, #3B82F6);
                }
                .sortable-drag {
                    opacity: 0.8;
                    cursor: grabbing;
                }
                .controls-panel .card {
                    cursor: grab;
                    user-select: none;
                }
                .controls-panel .card:active {
                    cursor: grabbing;
                }
            `;
            document.head.appendChild(style);
        }

        // สร้าง Sortable instance
        new Sortable(panel, {
            animation: 250,
            draggable: '.card',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.card',  // ลากได้ทั้งใบ
            onEnd: () => saveOrder()
        });
    }

    // ฟังก์ชันหลักเริ่มต้นระบบ
    function init() {
        resetCardOrderStyles();
        setInitialOrder();   // จัดลำดับเริ่มต้น (AI ขึ้นบนสุด) หากยังไม่มี localStorage
        initDragDrop();      // เปิดให้ลากเปลี่ยนลำดับได้
    }

    // รันเมื่อ DOM พร้อม
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();