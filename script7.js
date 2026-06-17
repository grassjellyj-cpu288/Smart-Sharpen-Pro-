// script7.js – 🃏 Drag & Drop เปลี่ยนลำดับการ์ด (ลาก-วางได้อย่างอิสระ)
(function() {
  'use strict';

  /**
   * ทำให้รายการการ์ดภายใน container สามารถลากเปลี่ยนลำดับได้
   * @param {string} containerSelector – CSS selector ของ container ที่มีการ์ด
   * @param {Object} options
   * @param {string} [options.itemSelector='.card'] – ตัวเลือกของการ์ดแต่ละใบ
   * @param {string} [options.dragHandleSelector=null] – ถ้าระบุ จะให้ลากเฉพาะที่ handle นี้
   * @param {string} [options.axis='y'] – แกนที่ใช้ตัดสินใจแทรก ('x', 'y', 'free')
   * @param {string} [options.placeholderClass='drag-placeholder'] – คลาสของ placeholder
   * @param {string} [options.ghostClass='dragging-ghost'] – คลาสของ ghost (สำเนาขณะลาก)
   * @param {Function} [options.onReorder=null] – callback เมื่อเรียงลำดับเสร็จ (ได้ array ของ element)
   * @returns {Object} { destroy, container }
   */
  function enableDragReorder(containerSelector, options = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`[DragReorder] Container "${containerSelector}" not found.`);
      return null;
    }

    const {
      itemSelector = '.card',
      dragHandleSelector = null,
      axis = 'y',
      placeholderClass = 'drag-placeholder',
      ghostClass = 'dragging-ghost',
      onReorder = null
    } = options;

    let dragData = null; // เก็บสถานะการลาก

    // ดึงรายการการ์ดปัจจุบัน (เฉพาะลูกที่ตรง itemSelector)
    function getItems() {
      return Array.from(container.querySelectorAll(itemSelector));
    }

    // สร้าง element placeholder
    function createPlaceholder() {
      const ph = document.createElement('div');
      ph.className = placeholderClass;
      ph.style.cssText = `
        background: rgba(0,0,0,0.05);
        border: 2px dashed #aaa;
        border-radius: 8px;
        transition: all 0.2s;
        box-sizing: border-box;
      `;
      return ph;
    }

    // คำนวณตำแหน่งที่ควรแทรก (ดัชนี) จากพิกัดเมาส์
    function getDropIndex(clientX, clientY) {
      const items = getItems();
      if (items.length === 0) return -1;

      let minDist = Infinity;
      let targetIndex = -1;

      items.forEach((item, idx) => {
        const rect = item.getBoundingClientRect();
        let cx, cy;
        if (axis === 'x') {
          cx = rect.left + rect.width / 2;
          cy = 0;
        } else if (axis === 'y') {
          cx = 0;
          cy = rect.top + rect.height / 2;
        } else { // 'free' ใช้ระยะทางแบบยุคลิด
          cx = rect.left + rect.width / 2;
          cy = rect.top + rect.height / 2;
        }
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          targetIndex = idx;
        }
      });

      if (targetIndex === -1) return -1;

      const target = items[targetIndex];
      const rect = target.getBoundingClientRect();
      let before = false;

      // ตัดสินใจแทรกก่อนหรือหลัง target ตามแกน
      if (axis === 'x') {
        before = clientX < (rect.left + rect.width / 2);
      } else if (axis === 'y') {
        before = clientY < (rect.top + rect.height / 2);
      } else { // free: ใช้แกนหลักตามความต่างของตำแหน่ง
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height / 2);
        // ถ้า dy มีค่ามากกว่า dx ให้ใช้แนวตั้งเป็นหลัก
        if (Math.abs(dy) > Math.abs(dx)) {
          before = clientY < (rect.top + rect.height / 2);
        } else {
          before = clientX < (rect.left + rect.width / 2);
        }
      }
      return before ? targetIndex : targetIndex + 1;
    }

    // ── Event handlers ──
    function startDrag(e) {
      const target = e.target.closest(itemSelector);
      if (!target) return;

      // ถ้ามี dragHandle ให้เช็คว่าคลิกที่ handle หรือไม่
      if (dragHandleSelector) {
        const handle = target.querySelector(dragHandleSelector);
        if (!handle || !handle.contains(e.target)) return;
      }

      e.preventDefault();

      const items = getItems();
      const index = items.indexOf(target);
      if (index === -1) return;

      // เก็บข้อมูลการลาก
      dragData = {
        element: target,
        index: index,
        offsetX: e.clientX - target.getBoundingClientRect().left,
        offsetY: e.clientY - target.getBoundingClientRect().top,
        ghost: null,
        placeholder: null
      };

      // สร้าง ghost (สำเนาที่ลอยตามเมาส์)
      const ghost = target.cloneNode(true);
      ghost.className += ' ' + ghostClass;
      const rect = target.getBoundingClientRect();
      ghost.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        opacity: 0.85;
        transform: scale(1.03);
        width: ${rect.width}px;
        height: ${rect.height}px;
        left: ${e.clientX - dragData.offsetX}px;
        top: ${e.clientY - dragData.offsetY}px;
        transition: none;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        border-radius: 8px;
      `;
      document.body.appendChild(ghost);
      dragData.ghost = ghost;

      // ทำให้การ์ดต้นฉบับจางลง
      target.style.opacity = '0.3';
      target.style.pointerEvents = 'none';

      // สร้าง placeholder
      const placeholder = createPlaceholder();
      placeholder.style.width = rect.width + 'px';
      placeholder.style.height = rect.height + 'px';
      // คัดลอก margin
      const style = window.getComputedStyle(target);
      placeholder.style.margin = style.margin;
      placeholder.style.display = style.display === 'inline-block' ? 'inline-block' : 'block';
      // ใส่ placeholder แทนที่ target (วางไว้ตำแหน่งเดิม)
      target.parentNode.insertBefore(placeholder, target);
      dragData.placeholder = placeholder;

      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    }

    function onDragMove(e) {
      if (!dragData) return;
      e.preventDefault();

      // ย้าย ghost
      const ghost = dragData.ghost;
      ghost.style.left = (e.clientX - dragData.offsetX) + 'px';
      ghost.style.top = (e.clientY - dragData.offsetY) + 'px';

      // หาตำแหน่งที่ควรวาง
      const dropIndex = getDropIndex(e.clientX, e.clientY);
      if (dropIndex === -1) return;

      const items = getItems();
      const currentIdx = items.indexOf(dragData.placeholder);
      if (dropIndex === currentIdx) return;

      // ย้าย placeholder ไปยังตำแหน่งใหม่
      const parent = container;
      const refNode = items[dropIndex] || null;
      if (refNode && refNode !== dragData.placeholder) {
        parent.insertBefore(dragData.placeholder, refNode);
      } else if (dropIndex === items.length) {
        parent.appendChild(dragData.placeholder);
      }
    }

    function onDragEnd(e) {
      if (!dragData) return;
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);

      const { element: target, placeholder, ghost } = dragData;

      // ลบ ghost
      if (ghost) ghost.remove();

      // ถ้ามี placeholder ให้แทรก target ใหม่ที่ตำแหน่งของ placeholder
      if (placeholder && target) {
        const parent = container;
        // ใส่ target แทน placeholder
        parent.insertBefore(target, placeholder);
        placeholder.remove();
        // คืนค่าสภาพการ์ด
        target.style.opacity = '';
        target.style.pointerEvents = '';

        // เรียก callback พร้อมรายการการ์ดใหม่
        if (typeof onReorder === 'function') {
          const newItems = getItems();
          onReorder(newItems);
        }
      } else {
        // กรณีผิดพลาด คืนค่าสภาพ
        if (target) {
          target.style.opacity = '';
          target.style.pointerEvents = '';
        }
        if (placeholder) placeholder.remove();
      }

      dragData = null;
    }

    // ── ผูก event ──
    container.addEventListener('mousedown', startDrag);

    // ── API ──
    function destroy() {
      container.removeEventListener('mousedown', startDrag);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      if (dragData) {
        if (dragData.ghost) dragData.ghost.remove();
        if (dragData.placeholder) dragData.placeholder.remove();
        dragData = null;
      }
    }

    return { destroy, container };
  }

  // ── ทำให้สามารถเรียกใช้จากภายนอก ──
  window.enableDragReorder = enableDragReorder;

  // ── เปิดใช้งานอัตโนมัติสำหรับ feature-grid (ถ้ามี) ──
  function autoInit() {
    const grid = document.getElementById('feature-grid');
    if (grid) {
      enableDragReorder('#feature-grid', {
        itemSelector: '.fc',
        axis: 'free',
        placeholderClass: 'drag-placeholder',
        ghostClass: 'dragging-ghost',
        onReorder: (items) => {
          console.log('✅ ลำดับการ์ดเปลี่ยน:', items.map(el => el.id || el.className));
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();