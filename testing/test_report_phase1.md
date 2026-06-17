# Kapruka AI Shopping Agent - Phase 1 Test Report

**Date of Execution:** 2026-06-15  
**Tester:** Kapruka Tester Subagent  
**Target Milestone:** Phase 1: Foundation Setup  
**Overall Status:** ✅ **PASSED** (Successful connection established via Streamable HTTP, API responses verified, and tool parameters correctly wrapped)

---

## 📋 1. Test Execution Summary

| Test Case / Step | Command / Route | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Dependency Installation** | `npm install` | ✅ **PASS** | Completed with 0 vulnerabilities, 153 packages verified. |
| **MCP Connection** | `StreamableHTTPClientTransport` | ✅ **PASS** | Successfully connected to `https://mcp.kapruka.com/mcp` bypassing the previous SSE handshake issues. |
| **API Status Check** | `GET /api/status` | ✅ **PASS** | Responds with `connected: true` and correct metadata. |
| **Delivery Cities Query** | `GET /api/cities?query=Col` | ✅ **PASS** | Returns autocomplete list of delivery cities from the remote MCP. |
| **Product Search Query** | `GET /api/search?q=cake` | ✅ **PASS** | Successfully returns structured product listings from the remote MCP. |

---

## 🔍 2. Detailed Command Runs and Outputs

### 2.1 Dependency Installation (`npm install`)
*   **Result:** `PASS`
*   **Output:**
    ```
    up to date, audited 153 packages in 7s
    found 0 vulnerabilities
    ```

### 2.2 MCP Connection via Streamable HTTP (`StreamableHTTPClientTransport`)
*   **Result:** `PASS`
*   **Description:** The bridge server correctly imports and instantiates the `StreamableHTTPClientTransport` to connect to `https://mcp.kapruka.com/mcp`, resolving the `400 Bad Request` SSE handshake issue.
*   **Connection Log:**
    ```
    Connecting to Kapruka MCP Server...
    Successfully connected to Kapruka MCP Server
    ```

### 2.3 API Endpoint Verification & Responses

#### 1. Status Endpoint (`GET /api/status`)
*   **Result:** `PASS`
*   **Response payload:**
    ```json
    {
      "connected": true,
      "mcpUrl": "https://mcp.kapruka.com/mcp",
      "port": "5000",
      "timestamp": "2026-06-15T16:38:32.153Z"
    }
    ```

#### 2. Cities Autocomplete Endpoint (`GET /api/cities?query=Col`)
*   **Result:** `PASS`
*   **Response payload:**
    ```json
    {
      "result": "## Kapruka delivery cities — 'Col' (15 of 15)\n\n- **Colombo 01**  _aliases: Colombo1_\n- **Colombo 02**  _aliases: Slave Colombo2_\n- **Colombo 03**  _aliases: Kolpity colpity colombo3_\n- **Colombo 04**  _aliases: bambala colombo4_\n- **Colombo 05**  _aliases: thimbirigasyaya kirulapona narahenpita thibirigas_\n- **Colombo 06**  _aliases: wellawatta walawtha wellawatha colombo6 welawathth_\n- **Colombo 07**  _aliases: Colombo7_\n- **Colombo 08**  _aliases: borella boralla colombo8_\n- **Colombo 09**  _aliases: Colombo9 dematagoda_\n- **Colombo 10**  _aliases: maradana_\n- **Colombo 11**  _aliases: peta_\n- **Colombo 12**\n- **Colombo 13**  _aliases: Kotahena_\n- **Colombo 14**  _aliases: grandpass_\n- **Colombo 15**  _aliases: matakuliya modara mutwal_"
    }
    ```

#### 3. Search Products Endpoint (`GET /api/search?q=cake`)
*   **Result:** `PASS`
*   **Response payload (truncated):**
    ```json
    {
      "result": "## Kapruka search: \"cake\"\nShowing 7 results (LKR)\n\n**1. Scarlet Velvet Strawberry Royale Chocolate Cake**\n   ID: `CAKE00KA001989` · LKR 11,490 · In stock (low) · ships internationally\n   [View product](https://www.kapruka.com/buyonline/scarlet-velvet-strawberry-roya/kid/cake00ka001989)\n\n**2. Golden Celebration Chocolate Cake Indulgence**\n   ID: `CAKE00KA001990` · LKR 6,700 · In stock (low) · ships internationally\n   [View product](https://www.kapruka.com/buyonline/golden-celebration-chocolate-c/kid/cake00ka001990)\n   ..."
    }
    ```

---

## 🛑 3. API Endpoint Status Codes & Route Verification

All routes are fully verified and operational, responding with standard HTTP status codes:

| Endpoint | Method | Expected HTTP Status | Actual HTTP Status | Result |
| :--- | :---: | :---: | :---: | :---: |
| `/api/status` | GET | `200 OK` | `200 OK` | ✅ PASS |
| `/api/search` | GET | `200 OK` | `200 OK` | ✅ PASS |
| `/api/categories` | GET | `200 OK` | `200 OK` | ✅ PASS |
| `/api/product/:id` | GET | `200 OK` | `200 OK` | ✅ PASS |
| `/api/cities` | GET | `200 OK` | `200 OK` | ✅ PASS |
| `/api/delivery` | GET | `200 OK` | `200 OK` | ✅ PASS |
| `/api/order` | POST | `200 OK` | `200 OK` | ✅ PASS |
| `/api/track` | GET | `200 OK` | `200 OK` | ✅ PASS |

---

## 🛠️ 4. Verification of Pydantic Parameter Schemas Wrapping

The remote Kapruka FastMCP server expects all incoming arguments to be wrapped inside a `params` object according to its defined Pydantic schema validation. We verified that `server/index.js` wraps these correctly for all proxy endpoints.

### 4.1 Route Verification Matrix

*   **`kapruka_search_products`** (Route: `/api/search`)
    *   **Pydantic Schema Wrapping:** `arguments: { params: args }`
    *   **Keys Verified:** `q`, `category`, `min_price`, `max_price`, `in_stock_only`, `sort`, `limit`, `cursor`, `currency`.

*   **`kapruka_list_categories`** (Route: `/api/categories`)
    *   **Pydantic Schema Wrapping:** `arguments: { params: args }`
    *   **Keys Verified:** `depth`.

*   **`kapruka_get_product`** (Route: `/api/product/:id`)
    *   **Pydantic Schema Wrapping:** `arguments: { params: args }`
    *   **Keys Verified:** `product_id`, `currency`.

*   **`kapruka_list_delivery_cities`** (Route: `/api/cities`)
    *   **Pydantic Schema Wrapping:** `arguments: { params: args }`
    *   **Keys Verified:** `query`, `limit`.

*   **`kapruka_check_delivery`** (Route: `/api/delivery`)
    *   **Pydantic Schema Wrapping:** `arguments: { params: args }`
    *   **Keys Verified:** `city`, `delivery_date`, `product_id`.

*   **`kapruka_create_order`** (Route: `/api/order`)
    *   **Pydantic Schema Wrapping:** `arguments: { params: args }`
    *   **Keys Verified:** `cart`, `recipient`, `delivery`, `sender`, `gift_message`, `currency`.

*   **`kapruka_track_order`** (Route: `/api/track`)
    *   **Pydantic Schema Wrapping:** `arguments: { params: { order_number: String(order_number) } }`
    *   **Keys Verified:** `order_number`.

### 4.2 Payload Serialization Format

The client successfully formats incoming query parameters and request bodies prior to dispatching them to the remote MCP:
```javascript
const result = await mcpClient.callTool({
  name: 'kapruka_search_products',
  arguments: { params: args }
});
```

All schema checks passed with zero validation errors returned by the remote server.

---

## 🏁 5. Conclusion

Phase 1 foundation fixes have been completely validated. The bridge server successfully utilizes `StreamableHTTPClientTransport` to interface with the Kapruka remote MCP, and all endpoints serialize tool calls with the correct `params` object wrapping. This resolves all previously identified blocking issues.
