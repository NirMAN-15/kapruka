# Kapruka Agent Challenge - Detailed Functional Requirements

This document translates the Kapruka Agent Challenge brief and scoring rubrics into concrete, actionable engineering requirements.

---

## 💎 Core Interface Requirements

### 1. Full-Screen Chat UI (Rubric: Experience & Polish - 30 Pts)
*   **Design Layout:** 
    *   Full-viewport layout (not a pop-up widget or side-drawer).
    *   Sleek sidebars for shopping context (cart status, order tracker summary, quick search chips).
    *   Clean, premium dark mode or curated HSL-tailored color palette following modern typography (e.g., Inter, Outfit) to look premium.
*   **Micro-Animations:**
    *   Smooth entry for messages.
    *   Loading state indicators (skeletons for product cards, custom typing animations for the agent).
    *   Interactive hover effects on buttons, products, and categories.
*   **Conversational Surface:**
    *   Clean, chat bubble styling.
    *   Rich text rendering (supporting Markdown, emojis, and bold tags).

### 2. Product Visualization (Rubric: Visual Richness - 20 Pts)
*   **Visual Elements:**
    *   Avoid generic text descriptions. Every product search response must render a rich card/carousel.
    *   Cards must display: high-resolution image, price (with currency), title, stock status badge, and clear action button ("View Details" or "Add to Cart").
*   **Detailed View Modal/Side-panel:**
    *   Provide an expanding visual panel or beautiful overlay showing the product description, full-size images, variants, and delivery instructions.
*   **Empty and Loading States:**
    *   Empty search queries must render elegant fallback messages or show default categories/popular items.

### 3. Shopping Assistance (Rubric: Personality & Usefulness - 30 Pts Total)
*   **Agent Persona:**
    *   Helpful, warm, and engaging.
    *   Avoid robotic responses. Tone should be expert but approachable (e.g., "The perfect choice for a birthday would be...").
*   **Product Recommendations:**
    *   The agent must parse user requests for intent (e.g., "I'm looking for a gift for my mother's birthday under 5000 LKR") and structure queries to the MCP using appropriate filters (`category`, `max_price`).
    *   If query results are too broad, the agent must ask clarifying questions to narrow down the choices.

### 4. End-to-End Checkout Flow (Rubric: Completeness - 15 Pts)
*   **Cart Management:**
    *   Visual representation of the user's cart (quantities, item subtotals, and total).
    *   Option to edit quantities or remove items within the UI.
*   **City & Date Validation:**
    *   Prompt the user for a delivery city. Search the canonical network using `kapruka_list_delivery_cities`.
    *   Check delivery feasibility and rates using `kapruka_check_delivery` for the target date.
*   **Order Form Collection:**
    *   Collect recipient info (First Name, Last Name, Phone, Email).
    *   Collect sender info (First Name, Last Name, Phone, Email).
*   **Checkout & Pay Link:**
    *   Generate order payload and execute `kapruka_create_order`.
    *   Display a beautiful payment checkout card with the order summary and a prominent button redirecting to the secure Kapruka Pay Link.

---

## ⭐ Bonus Feature Requirements

To maximize scoring and stand out, the following features are defined as critical requirements:

### 1. Bilingual Support (Sinhala & Tanglish)
*   **Sinhala Language Detection:** 
    *   Detect if the user initiates the chat in Sinhala.
    *   Respond in correct, grammatically natural Sinhala.
*   **Tanglish Processing:**
    *   Handle Sinhala words spelled with English letters (e.g., "Subha upandinayak wewa", "Mata chocolate cake ekak ona").
    *   Synthesize queries into English keywords before invoking the Kapruka product search APIs.

### 2. Multi-Item Shopping Cart
*   **Cart State Management:**
    *   Keep a persistent local/global state for the shopping cart.
    *   Verify product stock when adding.
    *   Format cart into the `cart` parameter array (with elements: `{ product_id, quantity }`) when calling `kapruka_create_order`.

### 3. Delivery Date & Perishable Checkers
*   **Date Picker UI:** 
    *   Include a custom calendar or list of date options inside the checkout flow.
    *   Enforce date constraints (e.g., cannot select past dates, handles minimum notice periods for custom cakes).
*   **Perishable Alerting:**
    *   If a item is marked as perishable (e.g., fresh flowers or cakes), notify the user clearly in the UI to ensure someone is available at the destination.

### 4. Custom Gift Messaging
*   **Greeting Card Input:**
    *   Provide a dedicated text field for a custom greeting card message (e.g., "Happy Birthday, Mom!").
    *   Ensure this message is saved to the order details using the `gift_message` field in `kapruka_create_order`.
