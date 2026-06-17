# Kapruka MCP Server - Technical Documentation

This document compiles the API specifications, tools, parameters, and limits for the **Kapruka Model Context Protocol (MCP) Server**.

---

## 📡 Connection & Endpoint
The Kapruka MCP Server uses **Streamable HTTP** transport and requires **no authentication/API keys** to access.

*   **Public URL:** `https://mcp.kapruka.com/mcp`
*   **Protocol:** Model Context Protocol (MCP) over SSE (Server-Sent Events)

---

## 🛠️ Available Tools

The server exposes **7 core tools** for product catalog discovery, delivery quoting, checkout order creation, and order tracking.

---

### 1. `kapruka_list_categories`
Retrieve the hierarchical list of categories from Kapruka's catalog. Useful for guiding product search and discovery.
*   **Parameters:**
    *   `depth` (integer, optional): The depth of category hierarchy to retrieve.
*   **Usage:** Call this tool first to understand what categories exist (e.g., "Cakes", "Flowers", "Toys", "Electronics") so the LLM can use correct category filters in searches.

---

### 2. `kapruka_search_products`
Search the product catalog with keyword search and fine-grained filters.
*   **Parameters:**
    *   `q` (string, optional): Search query/keyword (e.g., "chocolate cake").
    *   `category` (string, optional): Specific category name to restrict the search.
    *   `min_price` (number, optional): Minimum price threshold.
    *   `max_price` (number, optional): Maximum price threshold.
    *   `in_stock_only` (boolean, optional): Filter out out-of-stock items if set to `true`.
    *   `sort` (string, optional): Sorting option (e.g., price low-to-high, high-to-low).
    *   `limit` (integer, optional): Number of results (pagination limit).
    *   `cursor` (string, optional): Cursor for next pages. Capped at 3 pages maximum.
    *   `currency` (string, optional): Currency for return prices (e.g., "LKR", "USD").
*   **Output:** Returns a list of matching products with ID, name, price, stock status, and image URLs.

---

### 3. `kapruka_get_product`
Retrieve detailed information about a specific product.
*   **Parameters:**
    *   `product_id` (string, required): Unique ID of the product.
    *   `currency` (string, optional): Price currency (e.g., "LKR", "USD").
*   **Output:** Comprehensive details including name, price, stock availability, images, delivery guidelines, variants, and product page URLs.

---

### 4. `kapruka_list_delivery_cities`
Search for a canonical Sri Lankan delivery city/suburb.
*   **Parameters:**
    *   `query` (string, required): Search query (supports English, Sinhala transliterations, and vernacular aliases, e.g., "Colombo", "Kandy", "Nugegoda").
    *   `limit` (integer, optional): Capped at 50 results.
*   **Output:** Returns a list of canonical names that are compatible with the delivery checking and ordering tools.

---

### 5. `kapruka_check_delivery`
Verify delivery availability, rates, and date constraints.
*   **Parameters:**
    *   `city` (string, required): Canonical city name (retrieved from `kapruka_list_delivery_cities`).
    *   `delivery_date` (string, required): Target delivery date in `YYYY-MM-DD` format.
    *   `product_id` (string, optional): Product ID to check specific restrictions (e.g., cakes or flowers might have date constraints or special handling).
*   **Output:**
    *   Delivery availability flag.
    *   Flat delivery fee in LKR.
    *   Perishable warnings (for items like flowers, cakes, or combos that need immediate delivery).

---

### 6. `kapruka_create_order`
Create a guest checkout order on Kapruka.com and generate a pay link.
*   **Parameters:**
    *   `cart` (array of objects, required): The shopping cart items.
        *   `product_id` (string, required): Product identifier.
        *   `quantity` (integer, required): Item quantity.
        *   `variant_id` (string, optional): Variant ID (if applicable).
    *   `recipient` (object, required): Receiver's contact details.
        *   `first_name` (string, required)
        *   `last_name` (string, required)
        *   `phone` (string, required)
        *   `email` (string, optional)
    *   `delivery` (object, required): Destination details.
        *   `street_address` (string, required)
        *   `city` (string, required): Canonical city name.
        *   `delivery_date` (string, required): Date in `YYYY-MM-DD` format.
    *   `sender` (object, required): Customer billing/contact details.
        *   `first_name` (string, required)
        *   `last_name` (string, required)
        *   `phone` (string, required)
        *   `email` (string, required)
    *   `gift_message` (string, optional): Personalized text for a card.
    *   `currency` (string, optional): Currency code (e.g., "LKR", "USD").
*   **Output:** Returns the order details and a **one-click pay link (click-to-pay)**. This pay link locks the price for 60 minutes.

---

### 7. `kapruka_track_order`
Retrieve live status and tracking events for a placed order.
*   **Parameters:**
    *   `order_number` (string, required): The Kapruka order number (obtained from order creation or email confirmation).
*   **Output:** Structured progress log containing order state, dispatch date, and real-time delivery status tracking events.

---

## 🚦 Rate Limits & Policies
To ensure service stability, the following limits are enforced per client IP:
*   **Global Limit:** 60 requests per minute across all tools. Response headers include standard `RateLimit-*` markers.
*   **Write Limit:** 30 successful `kapruka_create_order` calls per hour.
*   **Caching:** Product and category reads are cached on the server for up to 30 minutes. Order creation and tracking tools are never cached.
*   **Secure Payment:** Payment is completed securely on the browser using the returned pay link. The agent doesn't collect credit cards.
