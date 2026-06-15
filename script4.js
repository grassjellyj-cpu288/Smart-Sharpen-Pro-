// ==================== script4.js ====================
// คลังฉากหลังอัจฉริยะ สำหรับ Smart Sharpen Pro
// ฟังก์ชัน: เปลี่ยนพื้นหลัง, เมนูเลือก, บันทึกอัตโนมัติ

(function() {
    // --------------------------------------------------------------
    // 1. คลังฉากหลัง (Background Library)
    // --------------------------------------------------------------
    const backgroundLibrary = [
        {
            id: "bg_smartsharpen",
            name: "SmartSharpen HD",
            image: "https://od.lk/s/N18yODU5NjQyMTNf/SmartSharpen_HD%20%282%29.png",
            type: "image",
            credit: "ลิงก์จากผู้ใช้"
        },
        {
            id: "bg_forest",
            name: "🌲เรือนไทยโบราณ",
            image: "https://od.lk/s/N18yODU5NjQyMTNf/SmartSharpen_HD%20%282%29.png",
            type: "image"
        },
        {
            id: "bg_ocean",
            name: "ห้องสมุดพระเครื่อง",
            image: "https://od.lk/s/N18yODQ0OTcxOTdf/789.jpg",
            type: "image"
        },
        {
            id: "bg_mountain",
            name: "⛰️ อยุธยา",
            image: "https://od.lk/s/N18yODU5NjQyMTlf/SMART_SHARPEN_PRO.png",
            type: "image"
        },
        {
            id: "bg_city",
            name: "🌃 เมืองกลางคืน",
            image: "https://od.lk/s/N18yODU4NTIyNDdf/Untitled-3.jpg",
            type: "image"
        },
        {
            id: "bg_default",
            name: "🎨 ลายตาราง (เริ่มต้น)",
            image: "https://www.transparenttextures.com/patterns/cubes.png",
            type: "pattern"
        }
    ];

    // --------------------------------------------------------------
    // 2. ฟังก์ชันช่วยเหลือ
    // --------------------------------------------------------------
    function getBackgroundById(id) {
        return backgroundLibrary.find(bg => bg.id === id);
    }

    function saveCurrentBackground(id) {
        if (getBackgroundById(id)) {
            localStorage.setItem("smartSharpen_lastBgId", id);
            console.log(`💾 บันทึกฉากหลังล่าสุด: ${id}`);
        }
    }

    function loadLastBackground() {
        const lastId = localStorage.getItem("smartSharpen_lastBgId");
        if (lastId && getBackgroundById(lastId)) {
            setBackgroundById(lastId, false);
            console.log(`↩️ โหลดฉากหลังล่าสุด: ${lastId}`);
        } else {
            // ใช้ค่าเริ่มต้นเป็น bg_default
            setBackgroundById("bg_default", false);
        }
    }

    // --------------------------------------------------------------
    // 3. ฟังก์ชันเปลี่ยนพื้นหลัง (หลัก)
    // --------------------------------------------------------------
    function setBackgroundById(id, shouldSave = true) {
        const bg = getBackgroundById(id);
        if (!bg) {
            console.error(`❌ ไม่พบฉากหลัง id = ${id}`);
            return false;
        }

        const bgElement = document.getElementById("gameBackground");
        if (!bgElement) {
            console.error("❌ ไม่พบ element #gameBackground ในหน้าเว็บ");
            return false;
        }

        // ตั้งค่ารูปพื้นหลัง
        bgElement.style.backgroundImage = `url('${bg.image}')`;
        bgElement.style.backgroundSize = "cover";
        bgElement.style.backgroundPosition = "center center";
        bgElement.style.backgroundRepeat = bg.type === "pattern" ? "repeat" : "no-repeat";
        bgElement.style.position = "fixed";
        bgElement.style.top = "0";
        bgElement.style.left = "0";
        bgElement.style.width = "100%";
        bgElement.style.height = "100%";
        bgElement.style.zIndex = "-1";  // อยู่ข้างหลังเนื้อหาทั้งหมด
        bgElement.style.transition = "background-image 0.25s ease";

        console.log(`🎨 เปลี่ยนฉากหลังเป็น: ${bg.name}`);
        
        if (shouldSave) {
            saveCurrentBackground(id);
        }
        return true;
    }

    // --------------------------------------------------------------
    // 4. สร้างเมนูปุ่มเลือกฉากหลัง ใน #bgMenu
    // --------------------------------------------------------------
    function renderBackgroundMenu(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ ไม่พบ element id='${containerId}'`);
            return;
        }

        // จัดสไตล์ให้เมนูสวยงาม ไม่ไปรบกวนการทำงานหลัก
        container.style.display = "flex";
        container.style.flexWrap = "wrap";
        container.style.gap = "10px";
        container.style.padding = "12px";
        container.style.background = "rgba(0,0,0,0.65)";
        container.style.backdropFilter = "blur(8px)";
        container.style.borderRadius = "20px";
        container.style.margin = "16px auto";
        container.style.maxWidth = "90%";
        container.style.justifyContent = "center";
        container.style.position = "relative";
        container.style.zIndex = "10";
        
        // เคลียร์ของเก่า
        container.innerHTML = "";
        
        // สร้างปุ่มสำหรับแต่ละฉากหลัง
        backgroundLibrary.forEach(bg => {
            const btn = document.createElement("button");
            btn.textContent = bg.name;
            btn.style.background = "#1e293b";
            btn.style.border = "1px solid #334155";
            btn.style.color = "#f1f5f9";
            btn.style.padding = "8px 18px";
            btn.style.borderRadius = "40px";
            btn.style.cursor = "pointer";
            btn.style.fontSize = "13px";
            btn.style.fontWeight = "500";
            btn.style.transition = "all 0.2s";
            btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
            
            btn.onmouseenter = () => {
                btn.style.background = "#3b82f6";
                btn.style.transform = "scale(1.02)";
                btn.style.borderColor = "#60a5fa";
            };
            btn.onmouseleave = () => {
                btn.style.background = "#1e293b";
                btn.style.transform = "scale(1)";
                btn.style.borderColor = "#334155";
            };
            
            btn.onclick = () => {
                setBackgroundById(bg.id);
                // แสดงข้อความแจ้งเตือนสั้น ๆ (ไม่รบกวน)
                const statusDiv = document.getElementById("imageStatus");
                if (statusDiv) {
                    const originalHtml = statusDiv.innerHTML;
                    statusDiv.innerHTML = `<i class="fas fa-palette"></i> เปลี่ยนฉากหลังเป็น: ${bg.name}`;
                    setTimeout(() => {
                        if (statusDiv) statusDiv.innerHTML = originalHtml;
                    }, 2000);
                }
            };
            container.appendChild(btn);
        });
        
        // ปุ่มเสริม: รีเซ็ตพื้นหลังเป็นค่าเริ่มต้น
        const resetBgBtn = document.createElement("button");
        resetBgBtn.textContent = "🔄 เริ่มต้น";
        resetBgBtn.style.background = "#475569";
        resetBgBtn.style.border = "1px solid #64748b";
        resetBgBtn.style.color = "white";
        resetBgBtn.style.padding = "8px 18px";
        resetBgBtn.style.borderRadius = "40px";
        resetBgBtn.style.cursor = "pointer";
        resetBgBtn.onclick = () => {
            setBackgroundById("bg_default");
        };
        container.appendChild(resetBgBtn);
        
        // ปุ่มซ่อน/แสดงเมนู (optional)
        const toggleBtn = document.createElement("button");
        toggleBtn.innerHTML = "👁️ ซ่อนเมนู";
        toggleBtn.style.background = "#0f172a";
        toggleBtn.style.border = "1px solid #334155";
        toggleBtn.style.color = "#cbd5e1";
        toggleBtn.style.padding = "8px 18px";
        toggleBtn.style.borderRadius = "40px";
        toggleBtn.style.cursor = "pointer";
        let menuVisible = true;
        toggleBtn.onclick = () => {
            menuVisible = !menuVisible;
            container.style.display = menuVisible ? "flex" : "none";
            toggleBtn.innerHTML = menuVisible ? "👁️ ซ่อนเมนู" : "👁️ แสดงเมนู";
        };
        container.appendChild(toggleBtn);
    }

    // --------------------------------------------------------------
    // 5. เริ่มต้นระบบเมื่อ DOM พร้อม
    // --------------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        console.log("🚀 script4.js: คลังฉากหลังพร้อมทำงาน");
        
        // ตรวจสอบและสร้าง element ถ้ายังไม่มี (เผื่อกรณี)
        if (!document.getElementById("gameBackground")) {
            const newBgDiv = document.createElement("div");
            newBgDiv.id = "gameBackground";
            document.body.insertBefore(newBgDiv, document.body.firstChild);
        }
        if (!document.getElementById("bgMenu")) {
            const newMenuDiv = document.createElement("div");
            newMenuDiv.id = "bgMenu";
            document.body.appendChild(newMenuDiv);
        }
        
        // สร้างเมนู
        renderBackgroundMenu("bgMenu");
        
        // โหลดฉากหลังล่าสุด (หรือค่าเริ่มต้น)
        loadLastBackground();
        
        // เพิ่มข้อมูลใน console แสดงรายการทั้งหมด
        console.group("📦 คลังฉากหลังที่โหลด:");
        backgroundLibrary.forEach(bg => console.log(` - ${bg.name} (${bg.id})`));
        console.groupEnd();
    });
})();