# Resource References & Client Setup Configs

This document contains quick connection snippets, official documentation links, and client settings for the Kapruka MCP Server.

---

## 🔗 Official Links
*   **Official MCP Landing Page:** [mcp.kapruka.com](https://mcp.kapruka.com/)
*   **MCP GitHub Codebase:** [github.com/kapruka/mcp](https://github.com/kapruka/mcp)
*   **Main E-Commerce Catalog:** [kapruka.com](https://www.kapruka.com/)

---

## 🛠️ Client Configuration Snippets

### 1. Claude Desktop
Save this config file to:
*   **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kapruka": {
      "url": "https://mcp.kapruka.com/mcp"
    }
  }
}
```

---

### 2. Cursor IDE
Open **Settings** → **Features** → **MCP** and click **+ Add New MCP Server**:
*   **Name:** `kapruka`
*   **Type:** `sse`
*   **URL:** `https://mcp.kapruka.com/mcp`

*Alternatively, paste this into your local global configuration `~/.cursor/mcp.json`:*
```json
{
  "mcpServers": {
    "kapruka": {
      "url": "https://mcp.kapruka.com/mcp"
    }
  }
}
```

---

### 3. ChatGPT
In ChatGPT:
1.  Navigate to **Settings** → **Connectors** → **Add MCP Server**.
2.  Input the following values:
    *   **Server URL:** `https://mcp.kapruka.com/mcp`
    *   **Transport:** `Streamable HTTP`
    *   **Auth:** `None`

---

### 4. MCP Inspector (Debugging)
To run the Model Context Protocol inspector utility:
```bash
npx @modelcontextprotocol/inspector
```
Once the browser UI opens:
1.  Select **Streamable HTTP** transport.
2.  Paste `https://mcp.kapruka.com/mcp` into the URL field.
3.  Click **Connect** to query tools, schemas, and try inputs.
