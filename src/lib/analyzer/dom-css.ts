import { CategoryScore, Finding, DomData } from "../types";

// Tailwind default class patterns that signal AI-generated design
const TAILWIND_SLOP_CLASSES = [
  // Colors
  "bg-indigo-500", "bg-indigo-600", "bg-purple-500", "bg-purple-600",
  "bg-violet-500", "bg-violet-600", "bg-blue-500", "bg-blue-600",
  "text-indigo-500", "text-indigo-600", "text-purple-500", "text-purple-600",
  "from-indigo", "from-purple", "from-violet", "to-indigo", "to-purple", "to-violet",
  "bg-gradient-to-r", "bg-gradient-to-br", "bg-gradient-to-b",
  // Shadows
  "shadow-lg", "shadow-xl", "shadow-2xl",
  // Borders
  "rounded-xl", "rounded-2xl", "rounded-3xl", "rounded-full",
  // Spacing
  "max-w-7xl", "max-w-6xl", "mx-auto", "px-4", "py-16", "py-24",
  // Grid
  "grid-cols-3", "grid-cols-2", "gap-8", "gap-6",
  // Flex
  "flex-col", "items-center", "justify-center", "text-center",
];

// ShadCN-specific patterns
const SHADCN_PATTERNS = [
  "inline-flex", "items-center", "justify-center", "whitespace-nowrap",
  "rounded-md", "text-sm", "font-medium", "ring-offset-background",
  "focus-visible:outline-none", "focus-visible:ring-2", "focus-visible:ring-ring",
  "disabled:pointer-events-none", "disabled:opacity-50",
  "border-input", "bg-background", "bg-primary", "text-primary-foreground",
  "bg-secondary", "text-secondary-foreground", "bg-destructive",
  "bg-muted", "text-muted-foreground", "bg-accent", "text-accent-foreground",
  "bg-card", "text-card-foreground",
];

// Layout patterns: the dreaded Hero > Features > Pricing > Testimonials > FAQ > CTA
const SECTION_KEYWORDS = {
  hero: ["hero", "banner", "jumbotron", "landing", "cta-main"],
  features: ["features", "benefits", "services", "what-we", "why-choose"],
  pricing: ["pricing", "plans", "tiers", "packages"],
  testimonials: ["testimonials", "reviews", "feedback", "what-people", "social-proof"],
  faq: ["faq", "questions", "accordion"],
  cta: ["cta", "call-to-action", "get-started", "sign-up", "try-free"],
};

// Common AI-default fonts
const AI_DEFAULT_FONTS = [
  "inter", "system-ui", "roboto", "poppins", "nunito", "open sans",
  "lato", "montserrat",
];

export function analyzeDomCss(dom: DomData): {
  layout: CategoryScore;
  visual: CategoryScore;
  typography: CategoryScore;
  interactivity: CategoryScore;
} {
  const layoutFindings: Finding[] = [];
  const visualFindings: Finding[] = [];
  const typographyFindings: Finding[] = [];
  const interactivityFindings: Finding[] = [];

  let layoutScore = 0;
  let visualScore = 0;
  let typographyScore = 0;
  let interactivityScore = 0;

  // --- LAYOUT ANALYSIS ---

  // Check for cookie-cutter section sequence
  const sectionLabels = dom.sections.map((s) => s.toLowerCase());
  const detectedSections: string[] = [];

  for (const [name, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (sectionLabels.some((s) => keywords.some((k) => s.includes(k)))) {
      detectedSections.push(name);
    }
  }

  // If we detect 4+ of the classic sections, that's sloppy
  if (detectedSections.length >= 4) {
    layoutScore += 30;
    layoutFindings.push({
      what: `Classic AI layout detected: ${detectedSections.join(" → ")}`,
      why: "The Hero → Features → Pricing → Testimonials → FAQ → CTA pattern is the #1 sign of AI-generated landing pages",
      fix: "Rethink your page structure. Lead with your unique value prop, not a template sequence.",
      severity: "high",
    });
  } else if (detectedSections.length >= 2) {
    layoutScore += 15;
    layoutFindings.push({
      what: `Standard section pattern detected: ${detectedSections.join(" → ")}`,
      why: "Some standard sections detected but not the full cookie-cutter sequence",
      fix: "Consider mixing up your page structure or adding unique sections",
      severity: "medium",
    });
  }

  // 3-column grid detection
  if (dom.classes.includes("grid-cols-3")) {
    layoutScore += 15;
    layoutFindings.push({
      what: "3-column feature grid detected",
      why: "The 3-card feature grid is the most common AI-generated layout pattern",
      fix: "Try asymmetric layouts, bento grids, or feature showcases with varying sizes",
      severity: "medium",
    });
  }

  // Excessive centering
  const centerClasses = dom.classes.filter(
    (c) => c === "text-center" || c === "mx-auto" || c === "items-center"
  );
  if (centerClasses.length > 10) {
    layoutScore += 10;
    layoutFindings.push({
      what: "Everything is centered",
      why: "AI loves center-aligning everything. Real designers use varied alignment for visual rhythm",
      fix: "Mix left-aligned text with centered headlines. Create visual hierarchy through alignment variety",
      severity: "low",
    });
  }

  // Section count check
  if (dom.sectionCount >= 6) {
    layoutScore += 10;
    layoutFindings.push({
      what: `${dom.sectionCount} sections detected — a lot of page`,
      why: "AI builders tend to generate many sections to make pages look 'complete'",
      fix: "Quality over quantity. Cut sections that don't add unique value",
      severity: "low",
    });
  }

  // --- VISUAL DESIGN ANALYSIS ---

  // Tailwind default class detection
  const tailwindMatches = dom.classes.filter((c) =>
    TAILWIND_SLOP_CLASSES.some((p) => c.includes(p))
  );
  const tailwindRatio = tailwindMatches.length / Math.max(dom.classes.length, 1);

  if (tailwindMatches.length > 15) {
    visualScore += 25;
    visualFindings.push({
      what: `Heavy Tailwind defaults detected (${tailwindMatches.length} default utility classes)`,
      why: "Using Tailwind's default color palette and spacing without customization screams AI-generated",
      fix: "Customize your tailwind.config with a unique color palette, custom spacing scale, and brand-specific tokens",
      severity: "high",
    });
  } else if (tailwindMatches.length > 5) {
    visualScore += 12;
    visualFindings.push({
      what: `Some Tailwind defaults detected (${tailwindMatches.length} utility classes)`,
      why: "A mix of custom and default Tailwind — could be more unique",
      fix: "Replace default colors with your brand palette",
      severity: "medium",
    });
  }

  // ShadCN detection
  const shadcnMatches = dom.classes.filter((c) =>
    SHADCN_PATTERNS.some((p) => c.includes(p))
  );
  if (shadcnMatches.length > 8) {
    visualScore += 20;
    visualFindings.push({
      what: "ShadCN/UI component library detected",
      why: "ShadCN is the default component library for AI-generated Next.js apps. Everyone's using it with zero customization",
      fix: "If using ShadCN, heavily customize the theme. Better yet, build custom components",
      severity: "high",
    });
  } else if (shadcnMatches.length > 3) {
    visualScore += 10;
    visualFindings.push({
      what: "Possible ShadCN/UI components detected",
      why: "Some ShadCN-like patterns found",
      fix: "Customize component styling to differentiate from defaults",
      severity: "medium",
    });
  }

  // Gradient hero detection
  if (dom.hasGradient) {
    const gradientClasses = dom.classes.filter(
      (c) => c.includes("gradient") || c.includes("from-") || c.includes("to-")
    );
    if (gradientClasses.length > 2) {
      visualScore += 15;
      visualFindings.push({
        what: "Generic gradient backgrounds detected",
        why: "Purple-to-blue gradients are the #1 visual cliché of AI-generated sites",
        fix: "Use solid colors, subtle textures, or if you must gradient, pick unexpected color combos",
        severity: "medium",
      });
    }
  }

  // Indigo/purple dominance
  const purpleIndigo = dom.classes.filter(
    (c) =>
      c.includes("indigo") || c.includes("purple") || c.includes("violet")
  );
  if (purpleIndigo.length > 5) {
    visualScore += 15;
    visualFindings.push({
      what: `Indigo/purple color scheme detected (${purpleIndigo.length} instances)`,
      why: "Indigo-500 and purple-600 are the unofficial colors of AI slop. It's the 'I asked ChatGPT to make me a website' color palette",
      fix: "Pick literally any other color. Terracotta, forest green, navy — anything but indigo/purple gradients",
      severity: "high",
    });
  }

  // Card hover lift patterns
  const hoverClasses = dom.classes.filter(
    (c) =>
      c.includes("hover:shadow") ||
      c.includes("hover:-translate-y") ||
      c.includes("hover:scale")
  );
  if (hoverClasses.length > 2) {
    visualScore += 8;
    visualFindings.push({
      what: "Card hover-lift effects detected",
      why: "The hover:shadow-xl + hover:-translate-y combo is a tell-tale AI pattern",
      fix: "Use more subtle or unique hover states. Try color shifts, border changes, or content reveals",
      severity: "low",
    });
  }

  // --- TYPOGRAPHY ANALYSIS ---

  const fontsLower = dom.fonts.map((f) => f.toLowerCase());
  const aiDefaultFonts = fontsLower.filter((f) =>
    AI_DEFAULT_FONTS.some((af) => f.includes(af))
  );

  if (aiDefaultFonts.length > 0 && fontsLower.length <= 3) {
    typographyScore += 25;
    typographyFindings.push({
      what: `Default AI fonts detected: ${aiDefaultFonts.slice(0, 3).join(", ")}`,
      why: "Inter, system-ui, and Roboto are the default fonts every AI builder picks. They're fine fonts, but they're the Comic Sans of AI slop",
      fix: "Choose distinctive typefaces. Try variable fonts, serif/sans-serif combos, or fonts with personality",
      severity: "medium",
    });
  }

  // Single font usage
  if (dom.fonts.length <= 1) {
    typographyScore += 15;
    typographyFindings.push({
      what: "Single font family detected",
      why: "Using one font for everything suggests no typographic thought went into the design",
      fix: "Pair fonts: a display font for headlines with a readable body font",
      severity: "medium",
    });
  }

  // --- INTERACTIVITY ANALYSIS ---

  // Check for generic button text
  const genericButtonTexts = [
    "get started", "learn more", "sign up", "try free", "start free",
    "get started free", "try it free", "start now", "get started now",
    "book a demo", "schedule a demo", "request a demo",
  ];
  const genericButtons = dom.buttonTexts.filter((b) =>
    genericButtonTexts.some((g) => b.toLowerCase().includes(g))
  );
  if (genericButtons.length > 2) {
    interactivityScore += 20;
    interactivityFindings.push({
      what: `Generic CTA buttons: "${genericButtons.slice(0, 3).join('", "')}"`,
      why: "AI generates the same generic button text every time",
      fix: "Write specific, benefit-driven CTAs that reflect your actual product",
      severity: "medium",
    });
  }

  // Meta signals (bonuses)
  if (dom.metaGenerator) {
    const gen = dom.metaGenerator.toLowerCase();
    if (
      gen.includes("v0") || gen.includes("bolt") ||
      gen.includes("lovable") || gen.includes("cursor")
    ) {
      layoutScore += 10;
      layoutFindings.push({
        what: `Built with AI builder: ${dom.metaGenerator}`,
        why: "The site's meta tags reveal it was generated by an AI builder",
        fix: "Remove the generator meta tag, and more importantly, customize the output",
        severity: "high",
      });
    }
  }

  if (!dom.hasFavicon) {
    visualScore += 5;
    visualFindings.push({
      what: "No custom favicon detected",
      why: "Missing favicon suggests the site wasn't fully customized",
      fix: "Add a custom favicon that matches your brand",
      severity: "low",
    });
  }

  // Check for "Built with ❤️" or similar
  if (dom.textContent.match(/built with [❤️♥]/i)) {
    interactivityScore += 10;
    interactivityFindings.push({
      what: '"Built with ❤️" detected in footer',
      why: "This is the default footer text in many AI-generated templates",
      fix: "Write a real footer with your company info, or leave it minimal",
      severity: "low",
    });
  }

  return {
    layout: {
      score: Math.min(layoutScore, 100),
      weight: 0.2,
      findings: layoutFindings,
    },
    visual: {
      score: Math.min(visualScore, 100),
      weight: 0.2,
      findings: visualFindings,
    },
    typography: {
      score: Math.min(typographyScore, 100),
      weight: 0.15,
      findings: typographyFindings,
    },
    interactivity: {
      score: Math.min(interactivityScore, 100),
      weight: 0.1,
      findings: interactivityFindings,
    },
  };
}
