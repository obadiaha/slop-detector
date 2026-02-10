import { chromium } from "playwright";
import { DomData } from "./types";

export interface ScanOutput {
  screenshot: Buffer;
  dom: DomData;
}

export async function scanUrl(url: string): Promise<ScanOutput> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Wait a bit for any animations/lazy loading
    await page.waitForTimeout(2000);

    // Take full-page screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: "jpeg",
      quality: 80,
    });

    // Extract DOM data
    const dom = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*");
      const classes: string[] = [];
      const computedColors: string[] = [];

      allElements.forEach((el) => {
        if (el.className && typeof el.className === "string") {
          classes.push(...el.className.split(/\s+/).filter(Boolean));
        }
        // Sample computed styles from key elements
        if (
          el.tagName === "SECTION" ||
          el.tagName === "HEADER" ||
          el.tagName === "MAIN" ||
          el.tagName === "DIV"
        ) {
          const style = window.getComputedStyle(el);
          if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
            computedColors.push(style.backgroundColor);
          }
          if (
            style.backgroundImage &&
            style.backgroundImage !== "none"
          ) {
            computedColors.push(style.backgroundImage);
          }
        }
      });

      // Extract fonts
      const fonts: string[] = [];
      const fontSet = new Set<string>();
      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const fontFamily = style.fontFamily;
        if (fontFamily && !fontSet.has(fontFamily)) {
          fontSet.add(fontFamily);
          fonts.push(fontFamily);
        }
      });

      // Extract text content
      const textContent = document.body?.innerText || "";

      // Extract sections
      const sections = Array.from(
        document.querySelectorAll("section, [class*='section'], header, footer, main, nav")
      ).map((s) => {
        const cls = s.className && typeof s.className === "string" ? s.className : "";
        return `${s.tagName}:${cls.substring(0, 100)}`;
      });

      // Check for favicon
      const favicon = document.querySelector(
        'link[rel="icon"], link[rel="shortcut icon"]'
      );

      // Meta generator
      const metaGen = document.querySelector('meta[name="generator"]');

      // Headings
      const headingTexts = Array.from(
        document.querySelectorAll("h1, h2, h3")
      ).map((h) => h.textContent?.trim() || "");

      // Buttons
      const buttonTexts = Array.from(
        document.querySelectorAll("button, a[class*='btn'], a[class*='button'], [role='button']")
      ).map((b) => b.textContent?.trim() || "");

      // Images
      const imageCount = document.querySelectorAll("img, svg, picture").length;

      // Section count
      const sectionCount = document.querySelectorAll("section").length;

      // Gradient detection
      const hasGradient = Array.from(allElements).some((el) => {
        const bg = window.getComputedStyle(el).backgroundImage;
        return bg.includes("gradient");
      });

      // Links
      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => (a as HTMLAnchorElement).href)
        .slice(0, 50);

      return {
        html: document.documentElement.outerHTML.substring(0, 50000),
        classes: [...new Set(classes)],
        textContent: textContent.substring(0, 30000),
        fonts,
        sections,
        metaGenerator: metaGen?.getAttribute("content") || undefined,
        hasFavicon: !!favicon,
        links,
        headingTexts,
        buttonTexts,
        imageCount,
        sectionCount,
        hasGradient,
        computedColors: [...new Set(computedColors)].slice(0, 50),
      } as DomData;
    });

    return { screenshot, dom };
  } finally {
    await browser.close();
  }
}
