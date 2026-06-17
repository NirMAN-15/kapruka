# System Architecture & Data Flow

This document details the high-level system architecture, component structures, and data flows of the Kapruka AI Shopping Agent.

---

## 🏗️ System Overview

The system consists of three main components:
1.  **Frontend Client:** A React-based Single Page Application (SPA) that renders the full-screen chat UI, manages the shopping cart state, displays product cards, and handles payment links.
2.  **API Gateway/Bridge Server:** An intermediate Node/Express backend that orchestrates the connection to the remote Kapruka MCP server and proxies calls. It keeps API logic secure and handles rate limits.
3.  **Kapruka MCP Server:** The live, remote Model Context Protocol endpoint hosting the product catalog, shipping network, and order processing capabilities.

```mermaid
graph TD
    User([Customer / User])
    Client[React Frontend Client]
    Server[API Bridge Backend]
    LLM[LLM API - Claude 3.5/3.7 Sonnet]
    MCP[Kapruka MCP Server]

    User <-->|Interacts with Chat UI / Cart| Client
    Client <-->|Sends user prompts & gets chat stream| Server
    Server <-->|Invokes LLM & tools| LLM
    Server <-->|Executes MCP tools| MCP
    MCP <-->|Live Data| CatalogDb[(Kapruka Database)]
```

---

## 🔄 Sequence of Key Workflows

### 🔍 1. Product Search & Discovery
```mermaid
sequenceDiagram
    autonumber
    User->>Client: "Mata chocolate cake ekak hoyala denna" (Find me a chocolate cake)
    Client->>Server: User Prompt
    Server->>LLM: Prompt + System Instructions
    Note over LLM: LLM translates query internally<br/>and determines tool usage.
    LLM-->>Server: Tool Call: kapruka_search_products(q: "chocolate cake")
    Server->>MCP: Call: kapruka_search_products(q: "chocolate cake")
    MCP-->>Server: Return: List of matching products (JSON)
    Server->>LLM: Tool Response Data
    LLM-->>Server: Stream response including product items markup/JSON
    Server-->>Client: Streaming chat + structured product data payload
    Note over Client: Client parses structured payload<br/>and renders visual product card list.
    Client-->>User: Beautiful visual product list with image & price
```

### 🛒 2. Checkout & Order Placement
```mermaid
sequenceDiagram
    autonumber
    User->>Client: Clicks "Add to Cart" & "Checkout"
    Client->>User: Renders address / sender forms
    User->>Client: Fills details (e.g. City: Colombo, Date: 2026-06-25)
    Client->>Server: Validate City & Date
    Server->>MCP: Call: kapruka_list_delivery_cities(query: "Colombo")
    MCP-->>Server: Return canonical city list
    Server->>MCP: Call: kapruka_check_delivery(city: "Colombo 03", date: "2026-06-25")
    MCP-->>Server: Return delivery cost & perishable flags
    Server-->>Client: Return status (Valid delivery)
    Client->>User: Displays delivery fee. Prompt: "Ready to order?"
    User->>Client: Clicks "Confirm Order & Pay"
    Client->>Server: Create Order request (Cart items, addresses, sender, recipient)
    Server->>MCP: Call: kapruka_create_order(cart, sender, recipient, delivery)
    MCP-->>Server: Return order number & pay_link URL
    Server-->>Client: Render payment button containing pay_link
    Client->>User: Click to open Kapruka Payment Gateway page
```

---

## 🎨 Frontend Component Architecture
The client application is split into specialized, modular components:
1.  **`ChatPanel`:** Handles message history rendering, streaming status indicator, voice/text input box, and prompt suggestion chips.
2.  **`CartDrawer`:** Side panel displaying current cart items, quantities, and pricing calculations.
3.  **`ProductCard` / `ProductCarousel`:** Highly visual containers rendering item images, price tags, and add-to-cart actions.
4.  **`CheckoutForm`:** Wizard forms prompting the user step-by-step for delivery details without cluttering the chat view.
5.  **`OrderTracker`:** Dynamic search widget to let customers search and check shipping progress using `kapruka_track_order`.
