import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

// List of streaming/video host domains to categorize and search for in html/scripts
interface HostPattern {
  name: string;
  pattern: RegExp;
}

const STREAM_HOSTS: HostPattern[] = [
  { name: "Streamwish", pattern: /(streamwish|wishfast|strwish|swplayer|wsplayer)\.(com|to|net|org|xyz|link|pro|click|online)/i },
  { name: "Voe", pattern: /voe\.(sx|com|to|net|org|pro|xyz|link)/i },
  { name: "Streamtape", pattern: /streamtape\.(com|to|net|org|xyz|link|cc)/i },
  { name: "Mixdrop", pattern: /mixdrop\.(co|to|net|org|xyz|club|is)/i },
  { name: "Doodstream / Dood", pattern: /dood(stream)?\.(com|to|net|org|xyz|wf|cx|la|li|sh)/i },
  { name: "Fembed / Febspot", pattern: /(fembed|febspot|fembed-hd|feurl)\.(com|to|net|org|xyz|pro)/i },
  { name: "UQload", pattern: /uqload\.(com|to|net|org|xyz|co|pro)/i },
  { name: "Vidguard", pattern: /(vidguard|vguard|vgstream)\.(com|to|net|org|xyz|pro|me)/i },
  { name: "Vidoza", pattern: /vidoza\.(com|to|net|org|xyz|co|pro)/i },
  { name: "Rapidgator", pattern: /rapidgator\.(net|com|org)/i },
  { name: "Mega", pattern: /mega\.(nz|co\.nz)/i },
  { name: "Google Drive / Photos", pattern: /(drive|photos)\.google\.com/i },
  { name: "Ok.ru / Odnoklassniki", pattern: /ok\.ru\/videoembed/i },
  { name: "YouTube", pattern: /(youtube\.com\/embed|youtu\.be)/i },
  { name: "Vimeo", pattern: /player\.vimeo\.com/i },
  { name: "Filemoon", pattern: /filemoon\.(sx|com|to|net|org|xyz|pro)/i },
  { name: "Embedy", pattern: /embedy\.(cc|com|net)/i },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with limits
  app.use(express.json({ limit: '10mb' }));

  // Helper to categorize domain and give a nice label
  function getLabelForDomain(urlStr: string): { label: string; host: string } {
    try {
      const url = new URL(urlStr);
      const hostname = url.hostname;
      
      for (const host of STREAM_HOSTS) {
        if (host.pattern.test(hostname)) {
          return { label: host.name, host: hostname };
        }
      }
      
      // If no matching streaming host but starts with common patterns
      return { label: "Reproductor Embed", host: hostname };
    } catch {
      // Fallback for parsing anomalies
      for (const host of STREAM_HOSTS) {
        if (host.pattern.test(urlStr)) {
          return { label: host.name, host: "reproductor.streaming" };
        }
      }
      return { label: "Reproductor General", host: "reproductor" };
    }
  }

  // Safely parses parameters of a Dean Edwards P.A.C.K.E.R block character-by-character
  function parsePackerArgs(argsStr: string) {
    let s = argsStr.trim();
    
    // 1. Parse payload: single-quoted or double-quoted with escaped characters
    let quoteChar = '';
    if (s.startsWith("'")) quoteChar = "'";
    else if (s.startsWith('"')) quoteChar = '"';
    else return null;
    
    let p = "";
    let i = 1;
    while (i < s.length) {
      if (s[i] === '\\') {
        p += s[i] + (s[i + 1] || '');
        i += 2;
      } else if (s[i] === quoteChar) {
        break;
      } else {
        p += s[i];
        i++;
      }
    }
    
    i++; // past quote
    const commaIndex = s.indexOf(',', i);
    if (commaIndex === -1) return null;
    
    s = s.substring(commaIndex + 1).trim();
    
    // 2. Parse radix and count: e.g. "62,62," or "36,36,"
    const numRegex = /^(\d+)\s*,\s*(\d+)\s*,/;
    const numMatch = s.match(numRegex);
    if (!numMatch) return null;
    const a = parseInt(numMatch[1], 10);
    const c = parseInt(numMatch[2], 10);
    
    s = s.substring(numMatch[0].length).trim();
    
    // 3. Parse words: usually 'word1|word2|...'.split('|')
    let wordsQuote = '';
    if (s.startsWith("'")) wordsQuote = "'";
    else if (s.startsWith('"')) wordsQuote = '"';
    else return null;
    
    let wordsStr = "";
    let j = 1;
    while (j < s.length) {
      if (s[j] === '\\') {
        wordsStr += s[j] + (s[j + 1] || '');
        j += 2;
      } else if (s[j] === wordsQuote) {
        break;
      } else {
        wordsStr += s[j];
        j++;
      }
    }
    
    j++; // past quote
    s = s.substring(j).trim();
    
    const splitRegex = /^\s*\.\s*split\s*\(\s*(['"])(.*?)\1\s*\)/;
    const splitMatch = s.match(splitRegex);
    const splitChar = splitMatch ? splitMatch[2] : '|';
    
    const k = wordsStr.split(splitChar);
    
    return { p, a, c, k };
  }

  // Locates and unpacks all P.A.C.K.E.R blocks
  function unpackAllPackers(text: string): string {
    const packerBlockRegex = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{([\s\S]*?)\}\s*\(([\s\S]*?)\)\s*\)/gi;
    
    let result = text;
    let match;
    let safetyCounter = 0;
    
    packerBlockRegex.lastIndex = 0;
    while ((match = packerBlockRegex.exec(text)) !== null && safetyCounter < 30) {
      safetyCounter++;
      try {
        const argsStr = match[2];
        const parsed = parsePackerArgs(argsStr);
        if (parsed) {
          const { p, a, c, k } = parsed;
          const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const baseN = (num: number, radix: number): string => {
            if (radix <= 36) return num.toString(radix);
            let res = '';
            let n = num;
            while (n > 0) {
              res = chars[n % radix] + res;
              n = Math.floor(n / radix);
            }
            return res || '0';
          };

          let unpacked = p;
          for (let idx = c - 1; idx >= 0; idx--) {
            if (k[idx]) {
              const key = baseN(idx, a);
              const reg = new RegExp('\\b' + key + '\\b', 'g');
              unpacked = unpacked.replace(reg, k[idx]);
            }
          }
          result = result.replace(match[0], unpacked);
        }
      } catch (err) {
        console.error("[Unpacker] Error parsing or unpacking block:", err);
      }
    }
    return result;
  }

  // Decodes hex escaped representations like \x68\x74\x74\x70...
  function decodeHexStrings(text: string): string {
    const hexRegex = /(?:\\x[0-9a-fA-F]{2})+/g;
    return text.replace(hexRegex, (match) => {
      try {
        const hexParts = match.split('\\x').filter(Boolean);
        const chars = hexParts.map(hex => String.fromCharCode(parseInt(hex, 16)));
        return chars.join('');
      } catch {
        return match;
      }
    });
  }

  // Decodes percent encodings like %68%74%74%70...
  function decodePercentEncoding(text: string): string {
    try {
      if (/%[0-9a-fA-F]{2}/.test(text)) {
        return decodeURIComponent(text);
      }
    } catch {}
    return text;
  }

  // Decodes base64 patterns that represent URLs or streaming hosts
  function deobfuscateBase64(text: string): string {
    const base64Regex = /\b[a-zA-Z0-9+/]{12,}={0,2}\b/g;
    let match;
    const decodedMatches: string[] = [];
    
    base64Regex.lastIndex = 0;
    while ((match = base64Regex.exec(text)) !== null) {
      const b64Str = match[0];
      try {
        if (/^\d+$/.test(b64Str)) continue;
        
        const decoded = Buffer.from(b64Str, 'base64').toString('utf-8');
        if (decoded.includes("http://") || decoded.includes("https://") || decoded.includes("//") || STREAM_HOSTS.some(host => host.pattern.test(decoded))) {
          decodedMatches.push(decoded);
        }
      } catch {}
    }
    return decodedMatches.join("\n");
  }

  // Combined pipeline to deobfuscate text
  function deepDeobfuscateHtml(html: string): string {
    let deobfuscated = html;
    deobfuscated = unpackAllPackers(deobfuscated);
    deobfuscated = decodeHexStrings(deobfuscated);
    deobfuscated = decodePercentEncoding(deobfuscated);
    
    const b64Decoded = deobfuscateBase64(deobfuscated);
    if (b64Decoded) {
      deobfuscated += "\n" + b64Decoded;
    }
    return deobfuscated;
  }

  // Extracts any URLs from text belonging to our defined streaming hosts
  function extractStreamUrls(text: string): string[] {
    const extractedUrls = new Set<string>();
    const rawUrlRegex = /(https?:)?\/\/[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+[a-zA-Z0-9?=&%_\/.-]*/gi;
    
    let match;
    rawUrlRegex.lastIndex = 0;
    while ((match = rawUrlRegex.exec(text)) !== null) {
      let urlStr = match[0];
      urlStr = urlStr.replace(/["'\\,;\]})>].*$/, ""); // clean trailing quotes/brackets
      
      if (urlStr.startsWith("//")) {
        urlStr = "https:" + urlStr;
      }
      
      try {
        const parsed = new URL(urlStr);
        const host = parsed.hostname;
        const isStreamHost = STREAM_HOSTS.some(sh => sh.pattern.test(host));
        if (isStreamHost) {
          extractedUrls.add(parsed.toString());
        }
      } catch {
        const isStreamHost = STREAM_HOSTS.some(sh => sh.pattern.test(urlStr));
        if (isStreamHost) {
          extractedUrls.add(urlStr);
        }
      }
    }
    return Array.from(extractedUrls);
  }

  // Scrapes cheerio DOM thoroughly including data-attributes, embeds, inputs, links, etc.
  function extractFromDom($: cheerio.CheerioAPI, targetUrl: string): string[] {
    const urls = new Set<string>();
    
    const addUrl = (val: string | undefined) => {
      if (!val) return;
      let urlStr = val.trim();
      if (urlStr.startsWith("//")) {
        urlStr = "https:" + urlStr;
      }
      if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
        urls.add(urlStr);
      } else if (urlStr.startsWith("/")) {
        try {
          const origin = new URL(targetUrl).origin;
          urls.add(origin + urlStr);
        } catch {}
      }
    };

    $("iframe, embed").each((_, el) => {
      addUrl($(el).attr("src"));
      addUrl($(el).attr("data-src"));
      addUrl($(el).attr("data-href"));
    });

    $("object").each((_, el) => {
      addUrl($(el).attr("data"));
    });

    $("video, source").each((_, el) => {
      addUrl($(el).attr("src"));
      addUrl($(el).attr("data-src"));
    });

    $("a").each((_, el) => {
      addUrl($(el).attr("href"));
      addUrl($(el).attr("data-href"));
    });

    $("textarea, input").each((_, el) => {
      const val = $(el).val();
      const textVal = typeof val === "string" ? val : (Array.isArray(val) ? val.join(" ") : ($(el).text() || ""));
      if (textVal && (textVal.includes("http://") || textVal.includes("https://") || textVal.includes("//"))) {
        const found = extractStreamUrls(textVal);
        found.forEach(u => urls.add(u));
      }
    });

    $("*").each((_, el) => {
      const attribs = (el as any).attribs;
      if (attribs) {
        for (const [key, value] of Object.entries(attribs)) {
          if (typeof value === "string") {
            if (key.startsWith("data-") || key === "value" || key === "content" || key === "href" || key === "src") {
              if (value.includes("http") || value.includes("//")) {
                const isStream = STREAM_HOSTS.some(sh => sh.pattern.test(value));
                const isEmbed = /\/(e|embed|v|iframe|f)\//i.test(value);
                if (isStream || isEmbed) {
                  addUrl(value);
                }
              }
            }
          }
        }
      }
    });

    return Array.from(urls);
  }

  // --- Real Web Scraper API Route ---
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "La URL es requerida." });
    }

    // Basic URL validation
    let targetUrl: string;
    try {
      targetUrl = new URL(url).toString();
    } catch {
      return res.status(400).json({ error: "La URL proporcionada no es válida." });
    }

    try {
      console.log(`[Scraper] Iniciando scraping para: ${targetUrl}`);
      
      // Fetch with custom user-agent and timeout to bypass simple bot blockers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Referer": new URL(targetUrl).origin,
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(502).json({ 
          error: `El servidor destino respondió con código ${response.status}.`,
          details: "El sitio web puede estar protegido por Cloudflare, DDOS mitigation, o requiere autenticación."
        });
      }

      const html = await response.text();
      console.log(`[Scraper] HTML recibido (${html.length} bytes). Analizando...`);

      // Deobfuscate full HTML source code (unpacks packer, decodes hex/percent/base64, etc.)
      const deobfuscatedHtml = deepDeobfuscateHtml(html);

      // Parse HTML with cheerio
      const $ = cheerio.load(html);

      // Extract page title for better UX
      const pageTitle = $("title").text().trim() || 
                        $("meta[property='og:title']").attr("content")?.trim() || 
                        new URL(targetUrl).hostname;

      // Sets to track unique sources and avoid duplicates
      const foundUrls = new Set<string>();
      const embeds: Array<{ src: string; label: string; domain: string; type: 'iframe' | 'script-match' | 'direct' }> = [];

      const addEmbed = (srcUrl: string, type: 'iframe' | 'script-match' | 'direct') => {
        if (!srcUrl) return;
        let cleaned = srcUrl.trim();
        if (cleaned.startsWith("//")) {
          cleaned = "https:" + cleaned;
        }
        
        // Clean trailing quotes, commas, brackets, backslashes often captured in JS scripts
        cleaned = cleaned.replace(/["'\\,;\]})>].*$/, "");
        
        if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
          if (!foundUrls.has(cleaned)) {
            foundUrls.add(cleaned);
            const info = getLabelForDomain(cleaned);
            embeds.push({
              src: cleaned,
              label: info.label,
              domain: info.host,
              type
            });
          }
        }
      };

      // 1. Scrape URLs directly from DOM (supports iframe, embed, source, data-attributes, textareas, custom elements)
      const domUrls = extractFromDom($, targetUrl);
      for (const src of domUrls) {
        addEmbed(src, "iframe");
      }

      // 2. Scan scripts, inline events, and full original HTML using regexes
      const generalEmbedRegex = /(https?:)?\/\/([a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+)\/(e|embed|v|f|iframe)\/[a-zA-Z0-9?=&%_.-]+/gi;
      let match;
      generalEmbedRegex.lastIndex = 0;
      while ((match = generalEmbedRegex.exec(html)) !== null) {
        addEmbed(match[0], "script-match");
      }

      // 3. Scan the DEOBFUSCATED text (including unpacked packer, hex, base64) for any streaming host URLs
      const streamUrlsFromDeobfuscated = extractStreamUrls(deobfuscatedHtml);
      for (const src of streamUrlsFromDeobfuscated) {
        addEmbed(src, "script-match");
      }

      // Also scan deobfuscated text for general embed format
      generalEmbedRegex.lastIndex = 0;
      while ((match = generalEmbedRegex.exec(deobfuscatedHtml)) !== null) {
        addEmbed(match[0], "script-match");
      }

      console.log(`[Scraper] Análisis terminado. Enlaces únicos encontrados: ${embeds.length}`);

      return res.json({
        success: true,
        targetUrl,
        title: pageTitle,
        embeds: embeds
      });

    } catch (error: any) {
      console.error("[Scraper Error]", error);
      
      if (error.name === "AbortError" || error.message?.includes("abort")) {
        return res.status(504).json({
          error: "Tiempo de espera agotado.",
          details: "El servidor destino tardó demasiado en responder. Es posible que esté bloqueando solicitudes de scraping directo."
        });
      }

      return res.status(500).json({
        error: "Error interno al ejecutar el scraping.",
        details: error.message || "No se pudo realizar la conexión con la página de streaming."
      });
    }
  });

  // --- Real PayPal REST API Integration ---
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "BAAGaSB47tQomDAwTF5L2Aj7cGUnqF9mjR3NCyzd5T6_VwMgaeQwQgPkdGMjxe1JUcZxh4VO9jsQf_V7n4";
  const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "EPlj-U9Rcwa-9NMqRLP9XPo7NuJk_uAfFJgSScmJPehcVYqCPme471ByAgwO7jOn_s_fD8F5n6PVF0OL";

  async function getPayPalAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    
    // Try Live PayPal Endpoint first
    try {
      const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      if (response.ok) {
        const data = await response.json();
        return { token: data.access_token, baseUrl: "https://api-m.paypal.com" };
      }
      console.log(`PayPal Live auth returned ${response.status}. Trying Sandbox fallback...`);
    } catch (err) {
      console.log("Failed to connect to PayPal Live API, trying Sandbox fallback...");
    }

    // Try Sandbox PayPal Endpoint as fallback
    const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to authenticate with PayPal: ${errText}`);
    }
    const data = await response.json();
    return { token: data.access_token, baseUrl: "https://api-m.sandbox.paypal.com" };
  }

  // Endpoint to create PayPal Checkout order
  app.post("/api/paypal/create-order", async (req, res) => {
    const { planId } = req.body;
    
    let price = "1.00";
    let planName = "Pack 50 Búsquedas";
    
    if (planId === "credits_1000") {
      price = "8.00";
      planName = "Mega Pack 1000";
    } else if (planId === "unlimited_year") {
      price = "40.00";
      planName = "Suscripción Ilimitada Anual";
    }

    try {
      const { token, baseUrl } = await getPayPalAccessToken();
      
      const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: price
              },
              description: `Adquisición de plan de Extracción: ${planName}`
            }
          ]
        })
      });

      if (!response.ok) {
        const errDetails = await response.text();
        return res.status(502).json({ error: "Error de comunicación con PayPal", details: errDetails });
      }

      const order = await response.json();
      return res.json({ id: order.id });
    } catch (error: any) {
      console.error("[PayPal Create Order Error]", error);
      return res.status(500).json({ error: "Error al crear la orden de PayPal", details: error.message });
    }
  });

  // Endpoint to capture payment and verify status
  app.post("/api/paypal/capture-order", async (req, res) => {
    const { orderId, planId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "El orderId es requerido para completar la compra." });
    }

    let planName = "Pack 50 Búsquedas";
    let price = 1.00;
    
    if (planId === "credits_1000") {
      price = 8.00;
      planName = "Mega Pack 1000";
    } else if (planId === "unlimited_year") {
      price = 40.00;
      planName = "Suscripción Ilimitada Anual";
    }

    try {
      const { token, baseUrl } = await getPayPalAccessToken();
      
      const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errDetails = await response.text();
        return res.status(502).json({ error: "No se pudo capturar el pago en PayPal", details: errDetails });
      }

      const captureResult = await response.json();
      
      // Verify payment is COMPLETED
      if (captureResult.status === "COMPLETED") {
        const invoice = {
          id: `INV-${captureResult.id || Math.floor(100000 + Math.random() * 900000)}`,
          amount: price,
          planName: planName,
          date: new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          status: 'success'
        };

        return res.json({
          success: true,
          invoice,
          details: captureResult
        });
      } else {
        return res.status(400).json({
          error: "El pago no pudo completarse con éxito.",
          status: captureResult.status
        });
      }

    } catch (error: any) {
      console.error("[PayPal Capture Order Error]", error);
      return res.status(500).json({ error: "Error al capturar la orden de PayPal", details: error.message });
    }
  });

  // --- Vite Dev Server Middleware / Static Files for Prod ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Corriendo en el puerto ${PORT} en modo ${process.env.NODE_ENV || "desarrollo"}`);
  });
}

startServer().catch((err) => {
  console.error("[Fatal Error starting server]", err);
});
