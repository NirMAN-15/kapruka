import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const KAPRUKA_MCP_URL = process.env.KAPRUKA_MCP_URL || 'https://mcp.kapruka.com/mcp';

let mcpClient = null;
let isConnecting = false;

// Format MCP tool output helper
function formatMcpResponse(result) {
  if (result.isError) {
    throw new Error(result.content?.[0]?.text || 'MCP Tool Call Error');
  }
  
  if (result.structuredContent) {
    return result.structuredContent;
  }
  
  const textContent = result.content?.[0]?.text;
  if (textContent) {
    try {
      return JSON.parse(textContent);
    } catch (e) {
      return { text: textContent };
    }
  }
  
  return result;
}

// Parser for products from markdown text (copied from client)
function parseProductsFromMarkdown(mdText) {
  if (!mdText || typeof mdText !== 'string') return [];
  
  const products = [];
  const lines = mdText.split('\n');
  let currentProduct = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Match titles: can start with optional "*", "-", "1.", etc. then "**Title**"
    const titleMatch = line.match(/^\s*[-*]?\s*\*\*(?:\d+\.\s*)?([^*]+)\*\*/);
    if (titleMatch) {
      if (currentProduct) {
        if (currentProduct.url && !currentProduct.product_id) {
          const idFromUrl = currentProduct.url.match(/\/kid\/([^/]+)/i) || currentProduct.url.match(/\/([^/]+)$/);
          if (idFromUrl) {
            currentProduct.product_id = idFromUrl[1].toUpperCase();
          }
        }
        products.push(currentProduct);
      }
      currentProduct = {
        title: titleMatch[1].trim(),
        price: 'LKR 3,500',
        in_stock: true,
        image: 'https://via.placeholder.com/150',
        product_id: '',
        url: ''
      };
      continue;
    }
    
    if (currentProduct) {
      const idMatch = line.match(/ID:\s*`?([^`\s]+)`?/i) || line.match(/ID:\s*(\w+)/i) || line.match(/Product ID:\s*(\w+)/i);
      if (idMatch) {
        currentProduct.product_id = idMatch[1].trim();
      }
      
      const priceMatch = line.match(/(?:lkr|rs\.?)\s*([\d,]+)/i);
      if (priceMatch) {
        currentProduct.price = `LKR ${priceMatch[1]}`;
      }
      
      if (line.toLowerCase().includes('out of stock') || line.toLowerCase().includes('unavailable')) {
        currentProduct.in_stock = false;
      }
      
      const imgMatch = line.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/i) || line.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
      if (imgMatch) {
        currentProduct.image = imgMatch[1].trim();
      }

      // Also match text-format image lines: "Image: URL", "Thumbnail: URL", etc.
      const imgTextMatch = line.match(/(?:Image|Thumbnail|Photo|Img|Picture):\s*(https?:\/\/[^\s]+)/i);
      if (imgTextMatch) {
        currentProduct.image = imgTextMatch[1].trim();
      }
      
      const urlMatch = line.match(/(?:^|[^!])\[.*?\]\((https?:\/\/[^)]+)\)/i);
      if (urlMatch) {
        currentProduct.url = urlMatch[1].trim();
      } else if (!line.includes('![') && !currentProduct.url) {
        const fallbackUrlMatch = line.match(/\((https?:\/\/[^)]+)\)/i);
        if (fallbackUrlMatch) {
          currentProduct.url = fallbackUrlMatch[1].trim();
        }
      }
    }
  }
  
  if (currentProduct) {
    if (currentProduct.url && !currentProduct.product_id) {
      const idFromUrl = currentProduct.url.match(/\/kid\/([^/]+)/i) || currentProduct.url.match(/\/([^/]+)$/);
      if (idFromUrl) {
        currentProduct.product_id = idFromUrl[1].toUpperCase();
      }
    }
    products.push(currentProduct);
  }
  
  return products.map(p => {
    if (!p.image || p.image === 'https://via.placeholder.com/150') {
      // Try to derive image from Kapruka CDN using the product URL
      if (p.url) {
        // Match patterns like /category/PRODUCTID or /kid/PRODUCTID or ending in a numeric/alphanumeric ID
        const kaprukaIdMatch = p.url.match(/kapruka\.com\/[^/]+\/([A-Za-z0-9_-]+)\/?$/) ||
                               p.url.match(/kapruka\.com\/kid\/([A-Za-z0-9_-]+)/i);
        if (kaprukaIdMatch) {
          const pid = kaprukaIdMatch[1];
          // Use Kapruka CDN URL pattern
          p.image = `https://www.kapruka.com/spicific/${pid}/0_${pid}.jpg`;
        }
      }
      // If still no image (URL didn't match or no URL), use Unsplash category fallbacks
      if (!p.image || p.image === 'https://via.placeholder.com/150') {
        const lowerTitle = p.title.toLowerCase();
        if (lowerTitle.includes('cake') || (p.product_id && p.product_id.toUpperCase().startsWith('CAKE'))) {
          p.image = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60';
        } else if (lowerTitle.includes('flower') || lowerTitle.includes('rose') || (p.product_id && p.product_id.toUpperCase().startsWith('FLOWER'))) {
          p.image = 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&auto=format&fit=crop&q=60';
        } else if (lowerTitle.includes('chocolate') || lowerTitle.includes('choco')) {
          p.image = 'https://images.unsplash.com/photo-1548907040-4d42b52145ea?w=500&auto=format&fit=crop&q=60';
        } else if (lowerTitle.includes('toy') || lowerTitle.includes('teddy')) {
          p.image = 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=500&auto=format&fit=crop&q=60';
        } else if (lowerTitle.includes('hamper') || lowerTitle.includes('gift')) {
          p.image = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60';
        } else {
          p.image = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60';
        }
      }
    }
    return p;
  });
}

// Connect to the remote Kapruka MCP server

async function connectToMcp() {
  if (isConnecting) return;
  isConnecting = true;
  
  try {
    console.log('Connecting to Kapruka MCP Server...');
    const transport = new StreamableHTTPClientTransport(new URL(KAPRUKA_MCP_URL));

    const client = new Client({
      name: 'kapruka-api-bridge',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    console.log('Successfully connected to Kapruka MCP Server');
    mcpClient = client;
    isConnecting = false;

    transport.onclose = () => {
      console.warn('MCP connection closed. Attempting reconnect in 5 seconds...');
      mcpClient = null;
      setTimeout(connectToMcp, 5000);
    };

    transport.onerror = (err) => {
      console.error('MCP transport error:', err.message || err);
    };

  } catch (error) {
    console.error('Failed to establish MCP connection:', error.message);
    mcpClient = null;
    isConnecting = false;
    console.log('Retrying MCP connection in 5 seconds...');
    setTimeout(connectToMcp, 5000);
  }
}

// Initial connection
connectToMcp();

// Middleware to verify MCP connection
const ensureMcpConnected = (req, res, next) => {
  if (!mcpClient) {
    return res.status(503).json({ 
      error: 'Kapruka MCP bridge is currently disconnected. Retrying connection. Please try again shortly.' 
    });
  }
  next();
};

// --- API Endpoints ---

// 1. Search products
app.get('/api/search', ensureMcpConnected, async (req, res) => {
  try {
    const { q, category, min_price, max_price, in_stock_only, sort, limit, cursor, currency } = req.query;
    
    const args = {};
    if (q) args.q = String(q);
    if (category) args.category = String(category);
    if (min_price) args.min_price = Number(min_price);
    if (max_price) args.max_price = Number(max_price);
    if (in_stock_only) args.in_stock_only = in_stock_only === 'true';
    if (sort) args.sort = String(sort);
    if (limit) args.limit = Number(limit);
    if (cursor) args.cursor = String(cursor);
    if (currency) args.currency = String(currency);

    console.log('Calling kapruka_search_products with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_search_products',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/search:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 1b. List Categories (Bonus discovery endpoint)
app.get('/api/categories', ensureMcpConnected, async (req, res) => {
  try {
    const { depth } = req.query;
    const args = {};
    if (depth) args.depth = Number(depth);

    console.log('Calling kapruka_list_categories with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_list_categories',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/categories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get product details
app.get('/api/product/:id', ensureMcpConnected, async (req, res) => {
  try {
    const { id } = req.params;
    const { currency } = req.query;
    
    const args = { product_id: String(id) };
    if (currency) args.currency = String(currency);

    console.log('Calling kapruka_get_product with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_get_product',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error(`Error in /api/product/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. List delivery cities (autocomplete)
app.get('/api/cities', ensureMcpConnected, async (req, res) => {
  try {
    const { query, limit } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const args = { query: String(query) };
    if (limit) args.limit = Number(limit);

    console.log('Calling kapruka_list_delivery_cities with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_list_delivery_cities',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/cities:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Check delivery options and rates
app.get('/api/delivery', ensureMcpConnected, async (req, res) => {
  try {
    const { city, delivery_date, product_id } = req.query;
    if (!city || !delivery_date) {
      return res.status(400).json({ error: 'city and delivery_date parameters are required' });
    }
    
    const args = {
      city: String(city),
      delivery_date: String(delivery_date)
    };
    if (product_id) args.product_id = String(product_id);

    console.log('Calling kapruka_check_delivery with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_check_delivery',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/delivery:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. Create checkout order
app.post('/api/order', ensureMcpConnected, async (req, res) => {
  try {
    const { cart, recipient, delivery, sender, gift_message, currency } = req.body;
    
    if (!cart || !recipient || !delivery || !sender) {
      return res.status(400).json({ 
        error: 'Missing required parameters in request body. Required fields: cart, recipient, delivery, sender' 
      });
    }

    const args = {
      cart,
      recipient,
      delivery,
      sender
    };
    if (gift_message) args.gift_message = String(gift_message);
    if (currency) args.currency = String(currency);

    console.log('Calling kapruka_create_order with:', JSON.stringify(args));
    const result = await mcpClient.callTool({
      name: 'kapruka_create_order',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 6. Track existing order
app.get('/api/track', ensureMcpConnected, async (req, res) => {
  try {
    const { order_number } = req.query;
    if (!order_number) {
      return res.status(400).json({ error: 'order_number parameter is required' });
    }

    console.log('Calling kapruka_track_order with:', order_number);
    const result = await mcpClient.callTool({
      name: 'kapruka_track_order',
      arguments: { params: { order_number: String(order_number) } }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/track:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 7. General connection health status
app.get('/api/status', (req, res) => {
  res.json({
    connected: !!mcpClient,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// --- LLM Orchestration & Agent Loop ---

const SYSTEM_PROMPT = `You are a helpful, warm, and professional retail assistant for Kapruka, Sri Lanka's leading e-commerce and gift delivery service.
Your name is Kapruka AI Shopping Assistant.

Core Instructions:
1. Translate Sinhala and Tanglish queries into English keywords before calling product search tools (e.g., if the user asks for "chocolate cake ekak", search for "chocolate cake").
2. Respond in the same language/script the user initiated the chat with.
   - If the user writes in Sinhala script, respond in Sinhala.
   - If the user writes in Tanglish (Sinhala words in English letters, e.g., "Mata chocolate cake ekak ona"), respond in Tanglish.
   - If the user writes in English, respond in English.
3. Adopt a helpful, warm, and professional retail assistant voice (e.g., "Ayu Bowan! 🇱🇰", "The perfect choice for a birthday would be...").
4. Format product data elegantly in markdown.
5. When searching for products, checking delivery fees, or creating checkout orders, use the appropriate Kapruka MCP tools.
6. When a product is found, present it beautifully. The client app will automatically render product cards when you retrieve products using search tools. Make sure to invite the user to check them out.
7. Assist users with the checkout loop by verifying delivery cities using 'kapruka_list_delivery_cities' and checking rates and date availability using 'kapruka_check_delivery'.
8. If the user wants to finalize an order, guide them to click 'Proceed to Checkout' in the cart panel. Explain the checkout process, collection of recipient/sender info, and secure payment redirect.
9. Track orders using 'kapruka_track_order' and show the structured status timeline.

Remember: When calling tools, the parameters will be passed to the Kapruka remote server. The server expects parameters to be wrapped inside a 'params' object, but you should output standard flat parameters; the backend will automatically wrap them inside 'params' before calling the tool.
Always be polite, warm, and helpful.

CRITICAL INSTRUCTION FOR LANGUAGE SYNC:
You MUST accurately detect the language and script of the user's most recent message.
If the user writes in Sinhala script (සිංහල), your ENTIRE response MUST be in Sinhala script. DO NOT reply in English or Tanglish to a Sinhala script query.
If the user writes in Tanglish, reply in Tanglish.
If the user writes in English, reply in English.`;

const CLAUDE_TOOLS = [
  {
    name: "kapruka_list_categories",
    description: "Retrieve the hierarchical list of categories from Kapruka's catalog.",
    input_schema: {
      type: "object",
      properties: {
        depth: { type: "integer", description: "The depth of category hierarchy to retrieve." }
      }
    }
  },
  {
    name: "kapruka_search_products",
    description: "Search the product catalog with keyword search and fine-grained filters.",
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query/keyword (e.g., 'chocolate cake')." },
        category: { type: "string", description: "Specific category name to restrict the search." },
        min_price: { type: "number", description: "Minimum price threshold in LKR." },
        max_price: { type: "number", description: "Maximum price threshold in LKR." },
        in_stock_only: { type: "boolean", description: "Filter out out-of-stock items if set to true." },
        sort: { type: "string", description: "Sorting option: 'price_low_to_high' or 'price_high_to_low'." },
        limit: { type: "integer", description: "Number of results (pagination limit)." },
        currency: { type: "string", description: "Currency (e.g., 'LKR', 'USD')." }
      }
    }
  },
  {
    name: "kapruka_get_product",
    description: "Retrieve detailed information about a specific product including name, price, stock, description, and images.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Unique ID of the product." },
        currency: { type: "string", description: "Price currency (e.g., 'LKR', 'USD')." }
      },
      required: ["product_id"]
    }
  },
  {
    name: "kapruka_list_delivery_cities",
    description: "Search for a canonical Sri Lankan delivery city/suburb by query.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for city name (e.g., 'Colombo', 'Kandy')." },
        limit: { type: "integer", description: "Maximum number of results to return." }
      },
      required: ["query"]
    }
  },
  {
    name: "kapruka_check_delivery",
    description: "Verify delivery availability, fee, and constraints for a city and date.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Canonical city name (retrieved from kapruka_list_delivery_cities)." },
        delivery_date: { type: "string", description: "Target delivery date in YYYY-MM-DD format." },
        product_id: { type: "string", description: "Optional product ID to check restrictions." }
      },
      required: ["city", "delivery_date"]
    }
  },
  {
    name: "kapruka_create_order",
    description: "Create a guest checkout order on Kapruka and get a pay link.",
    input_schema: {
      type: "object",
      properties: {
        cart: {
          type: "array",
          description: "List of items in the cart.",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string", description: "Product identifier." },
              quantity: { type: "integer", description: "Item quantity." },
              variant_id: { type: "string", description: "Optional variant identifier." }
            },
            required: ["product_id", "quantity"]
          }
        },
        recipient: {
          type: "object",
          description: "Recipient's contact details.",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" }
          },
          required: ["first_name", "last_name", "phone"]
        },
        delivery: {
          type: "object",
          description: "Delivery address details.",
          properties: {
            street_address: { type: "string" },
            city: { type: "string", description: "Canonical city name." },
            delivery_date: { type: "string", description: "Date in YYYY-MM-DD." }
          },
          required: ["street_address", "city", "delivery_date"]
        },
        sender: {
          type: "object",
          description: "Sender's billing contact details.",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" }
          },
          required: ["first_name", "last_name", "phone", "email"]
        },
        gift_message: { type: "string", description: "Optional personalized text message for greeting card." },
        currency: { type: "string", description: "Price currency (default: 'LKR')." }
      },
      required: ["cart", "recipient", "delivery", "sender"]
    }
  },
  {
    name: "kapruka_track_order",
    description: "Retrieve live status and tracking events for a placed order.",
    input_schema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The Kapruka order number." }
      },
      required: ["order_number"]
    }
  }
];

// Mock Agent logic for fallback
async function handleMockAgent(messages, clientLang) {
  // Get last user message
  const userMsgs = messages.filter(m => m.sender === 'user' || m.role === 'user');
  if (userMsgs.length === 0) {
    return { text: "Ayu Bowan! I am your Kapruka AI Shopping Assistant. How can I help you today?" };
  }
  const lastMsg = userMsgs[userMsgs.length - 1];
  const query = (lastMsg.text || lastMsg.content || '').toLowerCase();

  // Detect language
  let isSinhala = /[\u0d80-\u0dff]/.test(query);
  let isTanglish = query.includes('ona') || query.includes('hoyala') || query.includes('denna') || query.includes('mata') || query.includes('thiyenada') || query.includes('mewa') || query.includes('hoyanna') || query.includes('ekak');

  let language = clientLang || 'en';
  if (!clientLang) {
    if (isSinhala) language = 'si';
    else if (isTanglish) language = 'tanglish';
  }

  // Helper function to extract city names from markdown
  const extractCities = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.cities && Array.isArray(data.cities)) return data.cities;
    const mdText = data.result || data.text || (typeof data === 'string' ? data : '');
    if (!mdText) return [];
    const matches = [...mdText.matchAll(/-\s+\*\*([^*]+)\*\*/g)];
    return matches.map(m => m[1].trim());
  };

  // Determine search keyword
  let keyword = null;
  if (query.includes('cake') || query.includes('keki') || query.includes('keik') || query.includes('කේක්')) {
    keyword = 'Cake';
  } else if (query.includes('flower') || query.includes('mal') || query.includes('මල්') || query.includes('pokurak')) {
    keyword = 'Flowers';
  } else if (query.includes('chocolate') || query.includes('choc') || query.includes('චොකලට්')) {
    keyword = 'Chocolate';
  } else if (query.includes('toy') || query.includes('teddy') || query.includes('doll') || query.includes('බෝනික්කා') || query.includes('saththu')) {
    keyword = 'Toy';
  } else if (query.includes('hamper') || query.includes('gift') || query.includes('තෑගි')) {
    keyword = 'Hamper';
  }

  // Detect delivery rate check intent (deliver to, kandy, galle, delivery rate)
  const isDeliveryCheck = query.includes('deliver to') || 
                          query.includes('delivery to') || 
                          query.includes('delivery rate') || 
                          query.includes('delivery fee') || 
                          query.includes('shipping cost') || 
                          query.includes('shipping fee') || 
                          query.includes('galle') || 
                          query.includes('kandy') || 
                          query.includes('jaffna') || 
                          query.includes('negombo') || 
                          query.includes('matara') || 
                          query.includes('kurunegala') || 
                          query.includes('gampaha');

  if (isDeliveryCheck) {
    if (!mcpClient) {
      return { text: "The Kapruka MCP connection is offline. Please try again shortly." };
    }
    
    // Attempt to parse city
    let cityInput = null;
    const citiesToMatch = ['colombo', 'kandy', 'galle', 'jaffna', 'negombo', 'matara', 'kurunegala', 'gampaha', 'batticaloa', 'kalutara'];
    for (const c of citiesToMatch) {
      if (query.includes(c)) {
        cityInput = c;
        break;
      }
    }
    if (!cityInput) {
      const deliverMatch = query.match(/(?:deliver|delivery)\s+to\s+([a-zA-Z0-9\s]+)/i);
      if (deliverMatch) {
        cityInput = deliverMatch[1].trim();
      }
    }
    
    if (!cityInput) {
      return { text: "Sure, I can check delivery rates for you! Please tell me which city you want to deliver to." };
    }
    
    try {
      // Step 1: list delivery cities
      const listResult = await mcpClient.callTool({
        name: 'kapruka_list_delivery_cities',
        arguments: { params: { query: cityInput, limit: 1 } }
      });
      const listData = formatMcpResponse(listResult);
      const citiesList = extractCities(listData);
      const canonicalCity = citiesList[0] || cityInput;
      
      // Step 2: Check delivery
      const targetDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]; // 2 days from now
      const checkResult = await mcpClient.callTool({
        name: 'kapruka_check_delivery',
        arguments: { params: { city: canonicalCity, delivery_date: targetDate } }
      });
      const checkData = formatMcpResponse(checkResult);
      const rateText = checkData.result || checkData.text || JSON.stringify(checkData);
      
      let responseText = '';
      if (language === 'si') {
        responseText = `${canonicalCity} සඳහා බෙදා හැරීමේ විස්තර මෙන්න:\n\n${rateText}`;
      } else if (language === 'tanglish') {
        responseText = `${canonicalCity} වලට delivery details methana thiyenawa:\n\n${rateText}`;
      } else {
        responseText = `Here are the delivery details and rates for ${canonicalCity}:\n\n${rateText}`;
      }
      return { text: responseText };
    } catch (e) {
      return { text: `Error checking delivery: ${e.message}` };
    }
  }

  // Track order intent (track, order status, order number, ORD-, VIMP-)
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

  if (isTracking) {
    const orderNumber = orderMatch ? orderMatch[1] : null;
    if (!orderNumber) {
      return { text: "Sure, I can track your order status! Please provide your order number (e.g., 55102, ORD-1234, or VIMP-9876)." };
    }
    if (!mcpClient) {
      return { text: "The Kapruka MCP connection is offline. Please try again shortly." };
    }
    try {
      const result = await mcpClient.callTool({
        name: 'kapruka_track_order',
        arguments: { params: { order_number: String(orderNumber) } }
      });
      const data = formatMcpResponse(result);
      const resultText = data.result || data.text || (typeof data === 'string' ? data : '');
      
      let status = 'Received';
      if (resultText.toLowerCase().includes('delivered')) status = 'Delivered';
      else if (resultText.toLowerCase().includes('transit')) status = 'Transit';
      else if (resultText.toLowerCase().includes('dispatch')) status = 'Dispatch';
      else if (resultText.toLowerCase().includes('confirmed')) status = 'Confirmed';
      else if (resultText.toLowerCase().includes('received')) status = 'Received';
      else if (data.status) status = data.status;
      
      const steps = ['Received', 'Confirmed', 'Dispatch', 'Transit', 'Delivered'];
      const currentIndex = steps.findIndex(s => s.toLowerCase() === status.toLowerCase());
      
      let timelineMd = '\n\n**Order Tracking Timeline:**\n';
      steps.forEach((step, index) => {
        const isCompleted = index <= currentIndex;
        const bullet = isCompleted ? '✅' : '⚪';
        timelineMd += `${bullet} **${step}**\n`;
      });

      let responseText = '';
      if (language === 'si') {
        responseText = `ඔබගේ ඇණවුම #${orderNumber} පිළිබඳ විස්තර මෙන්න:\n` +
          `**තත්ත්වය:** ${status}\n` +
          timelineMd + `\n` +
          (resultText ? `**සටහන:** ${resultText}` : '');
      } else if (language === 'tanglish') {
        responseText = `Oyage order #${orderNumber} eke details methana thiyenawa:\n` +
          `**Status:** ${status}\n` +
          timelineMd + `\n` +
          (resultText ? `**Note:** ${resultText}` : '');
      } else {
        responseText = `Here is the tracking information for Order #${orderNumber}:\n` +
          `**Current Status:** ${status}\n` +
          timelineMd + `\n` +
          (resultText ? `**Details:** ${resultText}` : '');
      }
      return { text: responseText };
    } catch (e) {
      return { text: `Error tracking order: ${e.message}` };
    }
  }

  // If search intent detected
  if (keyword) {
    if (!mcpClient) {
      return { text: "The Kapruka MCP connection is offline. Please try again shortly." };
    }
    try {
      const result = await mcpClient.callTool({
        name: 'kapruka_search_products',
        arguments: { params: { q: keyword, limit: 4 } }
      });
      const data = formatMcpResponse(result);
      const textContent = data.text || (typeof data === 'string' ? data : '');
      const products = parseProductsFromMarkdown(textContent);

      let responseText = '';
      if (language === 'si') {
        responseText = `Ayu Bowan! ඔයාගේ සෙවුමට ගැලපෙන හොඳම ${keyword} නිෂ්පාදන කිහිපයක් මෙන්න. ඔයාට කැමති නිෂ්පාදනයක් තෝරාගෙන Cart එකට එකතු කරන්න පුළුවන්!`;
      } else if (language === 'tanglish') {
        responseText = `Ayu Bowan! Oyage search ekata match wana ${keyword} products thiyenawa. Cart ekata add karaganna puluwan!`;
      } else {
        responseText = `Ayu Bowan! 🇱🇰 Based on your search, I found some excellent options matching "${keyword}" for you. You can see them below. Add them to your cart to get started!`;
      }
      return {
        text: responseText,
        products: products
      };
    } catch (e) {
      return { text: `Error searching products: ${e.message}` };
    }
  }

  // Fallback
  let fallbackText = '';
  if (language === 'si') {
    fallbackText = "මම කප්රුක AI සාප්පු සවාරි සහායකයා වෙමි. මට කේක්, මල්, චොකලට්, සෙල්ලම් බඩු සෙවීමට මෙන්ම ඔබගේ ඇණවුම් ලුහුබැඳීමට සහ බෙදා හැරීමේ ගාස්තු පරීක්ෂා කිරීමට උදව් කළ හැකිය. අද ඔබට අවශ්‍ය කුමක්ද?";
  } else if (language === 'tanglish') {
    fallbackText = "Mama Kapruka AI Shopping Assistant. Mata cake, flowers, chocolates, toys hoyanna udaw karanna puluwan. E wagema order track karanna saha delivery fee check karannath puluwan. Ada oyata monawada ona?";
  } else {
    fallbackText = "Ayu Bowan! 🇱🇰 I am your Kapruka AI Shopping Assistant. I can help you search for cakes, flowers, chocolates, toys, and gift hampers. I can also track your orders and check delivery rates. What can I do for you today?";
  }
  return { text: fallbackText };
}

// Convert Claude tools to Gemini format
function convertToolsToGemini(claudeTools) {
  return claudeTools.map(t => {
    const params = JSON.parse(JSON.stringify(t.input_schema || {}));
    const formatSchemaType = (s) => {
      if (s.type) s.type = s.type.toUpperCase();
      if (s.properties) {
        for (const k in s.properties) {
          formatSchemaType(s.properties[k]);
        }
      }
      if (s.items) {
        formatSchemaType(s.items);
      }
    };
    formatSchemaType(params);
    return {
      name: t.name,
      description: t.description,
      parameters: params
    };
  });
}

// Run the Gemini agent loop using native global fetch
async function runGeminiAgentLoop(messages, clientLang) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
  }

  // Format messages for Gemini
  const contents = messages
    .filter(m => (m.sender === 'user' || m.sender === 'agent' || m.role === 'user' || m.role === 'assistant') && (m.text || m.content))
    .map(m => {
      const role = (m.sender === 'agent' || m.role === 'assistant') ? 'model' : 'user';
      const text = m.text || m.content;
      return {
        role,
        parts: [{ text }]
      };
    });

  let dynamicSystemPrompt = SYSTEM_PROMPT;
  if (clientLang) {
    const langNames = { en: 'English', si: 'Sinhala script', tanglish: 'Tanglish (Sinhala language written using the English/Latin alphabet)' };
    dynamicSystemPrompt += `\n\n[System Override: The user's active UI interface language is set to ${langNames[clientLang] || clientLang}, but ALWAYS reply in the exact language the user writes in (e.g., if they ask in Sinhala, reply in Sinhala; if in English, reply in English).]`;
  }

  const systemInstruction = {
    parts: [{ text: dynamicSystemPrompt }]
  };

  const geminiTools = [{
    functionDeclarations: convertToolsToGemini(CLAUDE_TOOLS)
  }];

  let maxIterations = 5;
  let iteration = 0;
  let accumulatedProducts = [];

  const fallbackModels = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-flash-latest'];
  let modelIndex = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`Gemini Agent Loop Iteration ${iteration}`);

    let success = false;
    let responseData;
    let activeModel = '';

    while (!success && modelIndex < fallbackModels.length) {
      activeModel = fallbackModels[modelIndex];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${geminiApiKey}`;
      try {
        console.log(`Trying Gemini model: ${activeModel}...`);
        const requestBody = {
          contents,
          systemInstruction,
          tools: geminiTools
        };

        // Removed thinkingConfig to prevent thought_signature API errors with standard models

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Status ${res.status}: ${errText}`);
        }

        responseData = await res.json();
        success = true;
      } catch (err) {
        console.warn(`Gemini model ${activeModel} failed: ${err.message}. Trying next fallback...`);
        modelIndex++;
        if (modelIndex >= fallbackModels.length) {
          throw new Error(`All Gemini models failed. Last error: ${err.message}`);
        }
      }
    }

    if (!responseData.candidates || responseData.candidates.length === 0) {
      throw new Error(responseData.error?.message || "No candidates returned from Gemini");
    }

    const candidate = responseData.candidates[0];
    const modelContent = candidate.content;
    contents.push(modelContent);

    const parts = modelContent.parts || [];
    const functionCalls = parts.filter(p => p.functionCall);

    if (functionCalls.length === 0) {
      const textPart = parts.find(p => p.text);
      const text = textPart ? textPart.text : '';
      return {
        text,
        products: accumulatedProducts
      };
    }

    const functionResponseParts = [];
    for (const call of functionCalls) {
      const func = call.functionCall;
      console.log(`Gemini calling tool: ${func.name} with arguments:`, func.args);

      let toolResponse;
      if (!mcpClient) {
        toolResponse = { error: "Kapruka MCP client is offline." };
      } else {
        try {
          let toolArgs = func.args;
          if (!toolArgs.params) {
            toolArgs = { params: toolArgs };
          }
          const rawResult = await mcpClient.callTool({
            name: func.name,
            arguments: toolArgs
          });
          toolResponse = formatMcpResponse(rawResult);

          if (func.name === 'kapruka_search_products') {
            const textContent = toolResponse.text || (typeof toolResponse === 'string' ? toolResponse : '');
            const parsed = parseProductsFromMarkdown(textContent);
            accumulatedProducts.push(...parsed);
          } else if (func.name === 'kapruka_get_product') {
            if (toolResponse && !toolResponse.isError) {
              const textContent = toolResponse.text || (typeof toolResponse === 'string' ? toolResponse : '');
              const parsed = parseProductsFromMarkdown(textContent);
              accumulatedProducts.push(...parsed);
            }
          }
        } catch (e) {
          console.error(`Error in Gemini tool execution for ${func.name}:`, e.message);
          toolResponse = { error: e.message };
        }
      }

      functionResponseParts.push({
        functionResponse: {
          name: func.name,
          id: call.functionCall.id,
          response: { result: JSON.stringify(toolResponse) }
        }
      });
    }

    contents.push({
      role: 'function',
      parts: functionResponseParts
    });
  }

  throw new Error("Gemini agent loop exceeded maximum iterations.");
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, language: clientLang } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request body: 'messages' array is required." });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      console.log('GEMINI_API_KEY is defined. Using Gemini 1.5 Flash agent loop...');
      const response = await runGeminiAgentLoop(messages, clientLang);
      return res.json(response);
    }

    if (!apiKey) {
      console.log('No ANTHROPIC_API_KEY or GEMINI_API_KEY found, falling back to local Mock Agent');
      const response = await handleMockAgent(messages, clientLang);
      return res.json(response);
    }

    console.log('Initializing Anthropic SDK client...');
    const anthropic = new Anthropic({ apiKey });

    // Format messages for Claude
    const formattedMessages = messages
      .filter(m => (m.sender === 'user' || m.sender === 'agent' || m.role === 'user' || m.role === 'assistant') && (m.text || m.content))
      .map(m => {
        const role = (m.sender === 'agent' || m.role === 'assistant') ? 'assistant' : 'user';
        const content = m.text || m.content;
        return { role, content };
      });

    // Run the agent loop
    let currentMessages = [...formattedMessages];
    let maxIterations = 5;
    let iteration = 0;
    let accumulatedProducts = [];

    let dynamicSystemPrompt = SYSTEM_PROMPT;
    if (clientLang) {
      const langNames = { en: 'English', si: 'Sinhala script', tanglish: 'Tanglish (Sinhala language written using the English/Latin alphabet)' };
      dynamicSystemPrompt += `\n\n[System Override: The user's active UI interface language is set to ${langNames[clientLang] || clientLang}, but ALWAYS reply in the exact language the user writes in (e.g., if they ask in Sinhala, reply in Sinhala; if in English, reply in English).]`;
    }

    while (iteration < maxIterations) {
      iteration++;
      console.log(`Agent Loop Iteration ${iteration}`);

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: dynamicSystemPrompt,
        messages: currentMessages,
        tools: CLAUDE_TOOLS
      });

      // Add Claude's response to messages
      const assistantMessage = {
        role: 'assistant',
        content: response.content
      };
      currentMessages.push(assistantMessage);

      // Check if Claude wants to call tools
      const toolCalls = response.content.filter(block => block.type === 'tool_use');

      if (toolCalls.length === 0) {
        // Claude did not call any tools, so we are done
        const textContentBlock = response.content.find(block => block.type === 'text');
        const text = textContentBlock ? textContentBlock.text : '';
        return res.json({
          text,
          products: accumulatedProducts
        });
      }

      // If we have tool calls, execute them
      const toolResults = [];
      for (const toolCall of toolCalls) {
        console.log(`Executing tool: ${toolCall.name} with input:`, toolCall.input);
        
        let toolResponse;
        if (!mcpClient) {
          toolResponse = { isError: true, content: [{ text: "Kapruka MCP client is currently offline." }] };
        } else {
          try {
            // Normalise tool arguments: wrap in 'params' if not already wrapped
            let toolArgs = toolCall.input;
            if (!toolArgs.params) {
              toolArgs = { params: toolArgs };
            }
            
            const rawResult = await mcpClient.callTool({
              name: toolCall.name,
              arguments: toolArgs
            });
            
            toolResponse = formatMcpResponse(rawResult);

            // Accumulate search results to display visual cards in the frontend
            if (toolCall.name === 'kapruka_search_products') {
              const textContent = toolResponse.text || (typeof toolResponse === 'string' ? toolResponse : '');
              const parsed = parseProductsFromMarkdown(textContent);
              accumulatedProducts.push(...parsed);
            } else if (toolCall.name === 'kapruka_get_product') {
              if (toolResponse && !toolResponse.isError) {
                const textContent = toolResponse.text || (typeof toolResponse === 'string' ? toolResponse : '');
                const parsed = parseProductsFromMarkdown(textContent);
                accumulatedProducts.push(...parsed);
              }
            }
          } catch (e) {
            console.error(`Error executing tool ${toolCall.name}:`, e.message);
            toolResponse = { error: e.message };
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(toolResponse)
        });
      }

      // Push tool results back to conversation
      currentMessages.push({
        role: 'user',
        content: toolResults
      });
    }

    // Fallback if max iterations exceeded
    return res.status(500).json({ error: "Agent loop exceeded maximum iterations." });

  } catch (error) {
    console.error('Error in /api/chat endpoint:', error.message || error);
    if (error.status === 429 || (error.message && error.message.toLowerCase().includes('rate limit')) || (error.message && error.message.toLowerCase().includes('429'))) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
    }
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Kapruka API Bridge Server running on http://localhost:${PORT}`);
});
