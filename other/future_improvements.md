# Future Improvements & Extensions

This document lists future feature concepts, UX improvements, and optimizations to take the AI Shopping Agent beyond the challenge submission.

---

## 🎨 Advanced UI/UX Extensions

### 1. Interactive 3D Product Previews
*   For high-ticket items (e.g. jewelry, electronics), integrate three.js or canvas-based 3D views.
*   Implement dynamic card animations showing interactive 360-degree rotation when hovered.

### 2. Multi-Recipient Shipping
*   Currently, guest checkout allows shipping to a single address per order.
*   Future revisions could split carts and execute multiple parallel `kapruka_create_order` calls for users sending different gifts to different friends/families.

### 3. Delivery Route Visualization
*   Integrate a small Google Map / Leaflet card on the checkout screen showing the delivery distance between Kapruka's fulfillment hubs and the target city.

---

## 🤖 AI & NLP Enhancements

### 1. Voice Shopping (Sinhala Speech-to-Text)
*   Integrate Whisper API (or local speech-to-text models) with custom fine-tuning for Sinhala speech.
*   Allow customers to speak Sinhala naturally (e.g. "Matath cake ekak yawanna ona") and receive voice synthesized replies.

### 2. Generative Greeting Card Recommendations
*   When a customer clicks "Add Greeting Card", the agent can analyze the occasion (e.g. birthday, wedding anniversary, apology) and suggest 3 beautifully written card messages matching the tone.

### 3. Personalized Gift Recommendation Engine
*   Maintain a local index of popular search pairs (e.g., flowers + cakes, chocolates + teddy bears) to make context-based suggestions (e.g., "Would you like to pair this chocolate cake with red roses?").

---

## ⚙️ Technical Optimizations

### 1. Client-Side Indexing
*   Store recently searched categories and products in local IndexedDB or Redis cache to reduce queries to the Kapruka server.
*   Enforces extreme speed (sub-100ms card rendering) for returning visitors.

### 2. Analytics & Conversion Tracking
*   Log search queries, cart additions, drop-offs, and completed payments to an analytics dashboard.
*   Helps shop owners identify which product groups or query terms fail to return results (zero search result telemetry).
