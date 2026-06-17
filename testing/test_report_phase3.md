# Kapruka AI Shopping Agent - Phase 3 Test Report

**Date of Testing:** 2026-06-15  
**Tester Role:** Kapruka Tester Agent (Integration & Route Validation)  
**Target Milestone:** Phase 3: Checkout Loop & Tracking  
**Overall Status:** ✅ **PASSED**

---

## 🧪 1. API Route Testing Results

We executed integration tests on the backend Express routes connecting to the remote Kapruka MCP Server:

| Route / Action | Payload / Query | Status Code | Output Verification | Status |
| :--- | :--- | :---: | :--- | :---: |
| `GET /api/status` | N/A | `200 OK` | `{"connected":true,...}` | ✅ PASS |
| `GET /api/delivery` | `city=Colombo+03&delivery_date=2026-06-25` | `200 OK` | Retrieved flat delivery rate of LKR 350 | ✅ PASS |
| `GET /api/track` | `order_number=VIMP34456CB2` | `200 OK` | Successfully retrieved full tracking timeline (Delivered) and recipient info | ✅ PASS |
| `POST /api/chat` (Search) | `{"messages":[{"role":"user","content":"Mata cake ekak ona"}]}` | `200 OK` | Returned localized text + 1 visual product object | ✅ PASS |
| `POST /api/chat` (Tracking) | `{"messages":[{"role":"user","content":"track order VIMP34456CB2"}]}` | `200 OK` | Returned status summary + timeline block, correctly extracting `vimp34456cb2` and retrieving live status | ✅ PASS |

---

## 🔍 2. Resolution of the Tracking Mismatch Bug

In Iteration 4, a regex mismatch was identified where the Mock Agent chopped alphanumeric tracking numbers (e.g. `VIMP34456CB2` became `34456`), causing `order_not_found` from the remote server.

### 🛠️ Resolved Fix:
In `/mnt/d/Data/projects/kapruka/server/index.js` (lines 557 and 566), the regex patterns were updated to support alphanumeric tracking numbers with a digit check constraint to avoid false matches on generic words:
```javascript
  const orderMatch = query.match(/(vimp-?[a-z0-9-]*\d[a-z0-9-]*|ord-?[a-z0-9-]*\d[a-z0-9-]*)/i) || query.match(/(?:track|status|order|order_number|ඇණවුම|#)\s*#?([a-z0-9-]*\d[a-z0-9-]*)/i) || query.match(/#?(\d+)/);
  const isTracking = query.includes('track') || 
                     query.includes('status') || 
                     query.includes('order number') || 
                     query.includes('order status') || 
                     query.includes('mago') || 
                     query.includes('koheda') || 
                     query.includes('kohe') || 
                     query.includes('ඇණවුම') ||
                     /(vimp-?[a-z0-9-]*\d[a-z0-9-]*|ord-?[a-z0-9-]*\d[a-z0-9-]*)/i.test(query);
```

### 📈 Verification Logs:
A POST request to `/api/chat` with `{"messages":[{"role":"user","content":"track order VIMP34456CB2"}]}` returned a successful timeline tracking sequence matching the live database record for `VIMP34456CB2`:
*   Extracted Order Reference: `vimp34456cb2`
*   Current Status: `Delivered`
*   Timeline checkpoints correctly formatted with checkboxes.
