# Kapruka Agent Challenge - Test Plan

This document establishes the testing strategy and validation protocols for the AI Shopping Agent.

---

## 🎯 Test Objectives
1.  **Functional Integrity:** Ensure the full checkout loop (product search to pay link generation) completes with zero errors.
2.  **UI/UX Quality:** Guarantee responsive, visually stunning rendering (images, carousels) and smooth micro-animations.
3.  **Bilingual Robustness:** Validate that the agent correctly parses Sinhala and Tanglish queries and translates them to English keywords before querying the MCP server.
4.  **Error Resilience:** Handle rate limits (60 req/min, 30 orders/hr), out-of-stock items, and invalid delivery inputs gracefully.

---

## 🧪 Testing Types

### 1. Functional Testing
*   **Discovery Flow:** Test product searching, price filtering, and pagination.
*   **Cart Actions:** Verify adding/updating/removing items in the shopping cart and ensure totals update correctly.
*   **Delivery Checks:** Verify that valid city autocomplete outputs the correct LKR flat rate. Ensure date constraints (e.g. past dates) block checkout.
*   **Checkout Completion:** Confirm that checkout outputs a working pay link and locks prices.
*   **Order Tracking:** Verify that active order tracking retrieves a complete list of delivery steps.

### 2. UI/UX & Responsive Testing
*   **Responsive Layouts:** Test layout rendering across Mobile (iPhone/Android screens), Tablet, and Desktop.
*   **Visual Assets:** Confirm that all product cards retrieve correct, non-broken images.
*   **Animations:** Validate entry animations, skeleton states, and typing indicators.

### 3. Bilingual & NLP Testing
*   **Vernacular queries:** Test Sinhala phrases (e.g., "Mata rosa mal malawala ona").
*   **Tanglish queries:** Test transliterations (e.g., "Kaveesh ta birthday gift ekak balanna").
*   **Response language:** Verify the agent replies back in the same language style the user initiated (Sinhala vs. English vs. Tanglish).

### 4. Integration & Rate Limit Testing
*   **API Proxies:** Ensure backend proxy routes do not drop requests or leak environment variables.
*   **Rate Limits:** Simulating heavy workloads to test fallback banners when hitting the 60 requests/min limit.

---

## 🛠️ Testing Tools & Frameworks
*   **Unit & Integration Testing:** Jest / React Testing Library (for cart utilities and component behavior).
*   **End-to-End Testing:** Playwright (to automate browser-based test scenarios, checkout flows, and responsiveness checks).
*   **Bilingual Assertions:** Manual QA scripts to check LLM outputs for language correctness.
