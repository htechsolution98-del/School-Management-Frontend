function parseAlpha(alphaToken?: string): number {
  if (!alphaToken) return 1;
  const clean = alphaToken.replace("%", "").trim();
  const num = Number(clean);
  if (Number.isNaN(num)) return 1;
  return alphaToken.endsWith("%") ? num / 100 : num;
}

function oklabToRgb(L: number, a: number, b: number, alpha = 1): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map((channel) => {
    const linear = Math.max(0, Math.min(1, channel));
    return Math.round(255 * (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055));
  });
  return alpha < 1 ? `rgba(${channels.join(", ")}, ${alpha})` : `rgb(${channels.join(", ")})`;
}

export function normalizeColor(value: string): string {
  if (!value || typeof value !== "string") return value;

  // 1. Convert oklch(...) to rgb/rgba
  let result = value.replace(
    /oklch\(\s*([+-]?[\d.]+%?)\s*[, ]+\s*([+-]?[\d.]+%?)\s*[, ]+\s*([+-]?[\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)/gi,
    (_match, lightnessToken: string, chromaToken: string, hueToken: string, alphaToken?: string) => {
      const lightness = lightnessToken.endsWith("%") ? Number(lightnessToken.slice(0, -1)) / 100 : Number(lightnessToken);
      const chroma = chromaToken.endsWith("%") ? Number(chromaToken.slice(0, -1)) * 0.004 : Number(chromaToken);
      const angle = (Number(hueToken) * Math.PI) / 180;
      const a = chroma * Math.cos(angle);
      const b = chroma * Math.sin(angle);
      return oklabToRgb(lightness, a, b, parseAlpha(alphaToken));
    }
  );

  // 2. Convert oklab(...) to rgb/rgba
  result = result.replace(
    /oklab\(\s*([+-]?[\d.]+%?)\s*[, ]+\s*([+-]?[\d.]+%?)\s*[, ]+\s*([+-]?[\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi,
    (_match, lightnessToken: string, aToken: string, bToken: string, alphaToken?: string) => {
      const lightness = lightnessToken.endsWith("%") ? Number(lightnessToken.slice(0, -1)) / 100 : Number(lightnessToken);
      const a = aToken.endsWith("%") ? (Number(aToken.slice(0, -1)) / 100) * 0.4 : Number(aToken);
      const b = bToken.endsWith("%") ? (Number(bToken.slice(0, -1)) / 100) * 0.4 : Number(bToken);
      return oklabToRgb(lightness, a, b, parseAlpha(alphaToken));
    }
  );

  return result;
}

/** Export the visible report card so the PDF keeps the exact preview layout and images. */
export async function downloadResultPreviewPDF(element: HTMLElement, filename: string): Promise<void> {
  await document.fonts?.ready;

  // Inline the rendered layout, then capture it in a blank same-origin iframe so
  // html2canvas never parses the application's Tailwind v4 oklch/oklab stylesheets.
  const clone = element.cloneNode(true) as HTMLElement;
  const originalNodes: Array<HTMLElement | SVGElement> = [element, ...Array.from(element.querySelectorAll<HTMLElement | SVGElement>("*"))];
  const clonedNodes: Array<HTMLElement | SVGElement> = [clone, ...Array.from(clone.querySelectorAll<HTMLElement | SVGElement>("*"))];
  originalNodes.forEach((original, index) => {
    const copy = clonedNodes[index];
    const computed = window.getComputedStyle(original);
    for (let propertyIndex = 0; propertyIndex < computed.length; propertyIndex += 1) {
      const property = computed.item(propertyIndex);
      if (property.startsWith("--")) continue;
      const value = normalizeColor(computed.getPropertyValue(property));
      copy.style.setProperty(property, value, computed.getPropertyPriority(property));
    }
    copy.removeAttribute("class");
  });

  clone.removeAttribute("id");
  clone.style.setProperty("position", "static");
  clone.style.setProperty("max-width", "none");
  clone.style.setProperty("width", "740px");
  clone.style.setProperty("transform", "none");
  clone.style.setProperty("overflow", "visible");

  const targetWidth = 740;
  const targetHeight = Math.max(1000, Math.ceil(element.scrollHeight || 1050));
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${targetWidth}px;height:${targetHeight}px;border:0`;
  document.body.appendChild(frame);
  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (!frameDocument || !frameWindow) {
    frame.remove();
    throw new Error("Could not prepare an isolated PDF renderer.");
  }
  frameDocument.body.style.cssText = "margin:0;padding:0;background:#ffffff";
  frameDocument.body.appendChild(clone);

  let canvas: HTMLCanvasElement;
  try {
    await Promise.all(Array.from(clone.querySelectorAll("img")).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }));

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: Math.ceil(element.getBoundingClientRect().width),
      windowHeight: Math.ceil(element.scrollHeight),
      width: Math.ceil(element.getBoundingClientRect().width),
      height: Math.ceil(element.scrollHeight),
      onclone: (clonedDoc) => {
        Array.from(clonedDoc.querySelectorAll("style, link[rel='stylesheet']")).forEach((node) => node.remove());
      },
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const scale = Math.min(1, (pageHeight - margin * 2) / imageHeight);
    const finalWidth = imageWidth * scale;
    const finalHeight = imageHeight * scale;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageWidth - finalWidth) / 2, margin, finalWidth, finalHeight, undefined, "FAST");
    pdf.save(filename);
  } finally {
    frame.remove();
  }
}
