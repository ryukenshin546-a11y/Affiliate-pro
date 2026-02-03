# Side Panel (ภาษาไทย)

เป้าหมาย: ทำให้ Flow Affiliate Pro แสดง UI แบบ **Side Panel** (แถบด้านข้าง) แทน popup เล็ก ๆ เพื่อรองรับงานที่ UI ซับซ้อน เช่น Queue, Bulk, Templates, Analytics

## ทำได้แค่ไหนกับ “กว้าง 30% ของหน้าจอ”

ข้อจำกัดสำคัญของ Chrome Side Panel:

- **ส่วนขยายไม่สามารถบังคับให้ Side Panel กว้าง 30% ได้แบบ fix** (Chrome ให้ผู้ใช้เป็นคนลากปรับความกว้างเอง)
- สิ่งที่เราทำได้คือ
  - ทำ UI ให้ **Responsive** และใช้งานได้ดีที่ความกว้างประมาณ 20–40% (รวมถึง 30%)
  - เปิด Side Panel ให้ผู้ใช้ได้ทันทีเมื่อกดไอคอน extension

ถ้าต้อง “ล็อก” ให้กว้าง 30% จริง ๆ ต้องใช้ทางเลือกอื่น เช่นเปิดเป็น **หน้าต่าง (popup window) ด้วย `chrome.windows.create`** ซึ่งกำหนด `width/height` ได้ แต่จะไม่ใช่ Side Panel ของ Chrome

## ไฟล์/จุดที่เกี่ยวข้องในโปรเจกต์นี้

- `src/manifest.ts`
  - เพิ่ม `side_panel.default_path` → `src/sidepanel/index.html`
  - เพิ่ม permission `sidePanel`
  - เอา `action.default_popup` ออก เพื่อให้กดไอคอนแล้วเปิด Side Panel (แทน popup)

- `src/sidepanel/`
  - `index.html` + `main.tsx` เป็น entrypoint ของ Side Panel
  - ใช้ React UI เดียวกับ popup (`@/popup/App`) เพื่อ reuse หน้า/คอมโพเนนต์เดิม

- `src/background/service-worker.ts`
  - ตั้งค่า `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
  - fallback: `chrome.action.onClicked` → `chrome.sidePanel.open({ tabId })`

- `vite.config.ts`
  - เพิ่ม build input สำหรับ `src/sidepanel/index.html`

## วิธีทดสอบ

1. รัน `npm run dev`
2. เปิด `chrome://extensions` แล้ว Reload extension
3. กดไอคอน extension → ควรเปิด Side Panel
4. ลองลากขยายให้ประมาณ 30% แล้วดูว่า UI ใช้งานได้ครบ

หมายเหตุ (Dev Mode / CORS)

- ใน Dev Mode (CRXJS) service worker loader จะโหลดสคริปต์จาก `http://localhost:5173/...`
- ดังนั้นควรให้ dev server รันที่ `localhost:5173` และส่ง CORS headers (ตั้งไว้ใน `vite.config.ts` แล้ว)

หมายเหตุ (Popup vs Dev Tab)

- `src/popup/index.html` เวลาเปิดผ่าน dev server ในแท็บปกติ จะไม่ถูกล็อกขนาด 400x600
- แต่เวลาเป็นหน้า extension จริง (`chrome-extension://...`) จะใส่ class `popup` อัตโนมัติ เพื่อคง sizing ของ popup

## หมายเหตุ UX

- ถ้าต้องการให้ UI ดูดีที่ ~30% จริง ๆ แนะนำให้ปรับ layout บางหน้าให้เป็น 1-column เมื่อหน้าจอแคบ
- ตรวจ CSS ว่าไม่มีการล็อก width แบบ popup (โปรเจกต์นี้ใช้ override สำหรับ side panel แล้ว)
