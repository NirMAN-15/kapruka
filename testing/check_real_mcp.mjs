import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  console.log("Connecting using StreamableHTTPClientTransport to https://mcp.kapruka.com/mcp...");
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.kapruka.com/mcp"));
  const client = new Client({
    name: "kapruka-test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("Connected successfully!");

    console.log("Calling kapruka_search_products for 'Cake'...");
    const result = await client.callTool({
      name: "kapruka_search_products",
      arguments: { params: { q: "Cake", limit: 4 } }
    });
    console.log("Raw Response:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("Error connecting to MCP:", error);
  } finally {
    process.exit(0);
  }
}

main();
