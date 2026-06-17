# System Test Cases

This document lists specific, step-by-step test cases to validate the functional, bilingual, and edge-case behaviors of the Kapruka AI Shopping Agent.

---

## 🛒 1. Functional Test Cases

### Test Case TC-001: Product Discovery & Search
*   **Description:** Verify that users can search and view products.
*   **Steps:**
    1.  Type "chocolate cake" in the chat.
    2.  Wait for the agent's response.
*   **Expected Results:** 
    *   The agent calls `kapruka_search_products(q: "chocolate cake")`.
    *   A list of visual cards displays containing: cake image, name, price, stock status, and "Add to Cart" button.
    *   The text response recommends specific cakes.

### Test Case TC-002: Add to Cart and Multi-Item Cart
*   **Description:** Verify adding multiple products to the cart and updating quantities.
*   **Steps:**
    1.  Search "chocolate cake" and click "Add to Cart".
    2.  Search "red roses" and click "Add to Cart".
    3.  Open the cart panel and increase "chocolate cake" quantity to 2.
*   **Expected Results:**
    *   Cart Drawer/Panel shows both items.
    *   Unit price, quantities, subtotal, and total calculate and display correctly.

### Test Case TC-003: Address Autocomplete and Verification
*   **Description:** Verify the shipping city validation and rate calculation.
*   **Steps:**
    1.  Initiate checkout.
    2.  Type "Col" in the city address input.
    3.  Select "Colombo 03" from the autocomplete suggestions.
*   **Expected Results:**
    *   Autocomplete triggers `kapruka_list_delivery_cities(query: "Col")` and lists matching suburbs.
    *   Selecting "Colombo 03" queries `kapruka_check_delivery` and displays the flat shipping fee (e.g. 350 LKR).

### Test Case TC-004: End-to-End Guest Checkout
*   **Description:** Verify that order submission locks the price and generates a secure pay link.
*   **Steps:**
    1.  Add a product to the cart.
    2.  Enter valid sender & recipient details.
    3.  Select a valid delivery date (e.g. tomorrow).
    4.  Click "Confirm Order & Pay".
*   **Expected Results:**
    *   System executes `kapruka_create_order` successfully.
    *   UI displays: "Order created successfully! Please complete payment within 60 minutes".
    *   Renders a payment link button redirecting to `https://www.kapruka.com/payment/...`.

---

## 🇱🇰 2. Bilingual & NLP Test Cases

### Test Case TC-005: Sinhala-Language Query
*   **Description:** Verify product search when inputting Sinhala text.
*   **Steps:**
    1.  Type "මට චොකලට් කේක් එකක් ඕනෑ" (I want a chocolate cake) in the chat.
*   **Expected Results:**
    *   The agent detects Sinhala language.
    *   Queries `kapruka_search_products(q: "chocolate cake")` (translating search term internally).
    *   Replies back to the user in fluent, natural Sinhala.

### Test Case TC-006: Tanglish Query
*   **Description:** Verify product search when inputting Tanglish.
*   **Steps:**
    1.  Type "Mata birthday card ekakui red roses mal pokurakui ona" in the chat.
*   **Expected Results:**
    *   The agent parses the intent: birthday card AND red roses.
    *   Queries the product search tool for keywords "birthday card" and "red roses".
    *   Maintains the friendly, localized Tanglish tone in responses.

---

## ⚠️ 3. Edge & Error Test Cases

### Test Case TC-007: Out of Stock Handling
*   **Description:** Verify that out-of-stock items block checkout.
*   **Steps:**
    1.  Search for a product known to be out of stock (or set stock status to false).
*   **Expected Results:**
    *   Product card displays "Out of Stock" badge.
    *   "Add to Cart" button is disabled.
    *   Agent warns the user that the item is currently unavailable and suggests alternatives.

### Test Case TC-008: Past Delivery Date Validation
*   **Description:** Verify past dates are rejected.
*   **Steps:**
    1.  Go to checkout.
    2.  Select yesterday's date as the delivery date.
*   **Expected Results:**
    *   The calendar input blocks selection, or `kapruka_check_delivery` returns an availability failure.
    *   UI displays: "Delivery date cannot be in the past. Please select a future date".
