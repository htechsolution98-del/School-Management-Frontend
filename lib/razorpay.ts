const CHECKOUT_SCRIPT_ID = "razorpay-checkout-script";
const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const CHECKOUT_TIMEOUT_MS = 20_000;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: (response: any) => void): void;
    };
  }
}

let loadingPromise: Promise<boolean> | null = null;

/** Load Razorpay once for the whole app and safely wait for an in-flight load. */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }
  if (window.Razorpay) return Promise.resolve(true);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    let script = document.getElementById(CHECKOUT_SCRIPT_ID) as HTMLScriptElement | null;
    if (script?.dataset.loadState === "error") {
      script.remove();
      script = null;
    }
    if (!script) {
      script = document.createElement("script");
      script.id = CHECKOUT_SCRIPT_ID;
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.dataset.loadState = "loading";
      document.head.appendChild(script);
    }

    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
      if (script) script.dataset.loadState = success ? "loaded" : "error";
      loadingPromise = null;
      resolve(success && Boolean(window.Razorpay));
    };
    const onLoad = () => finish(Boolean(window.Razorpay));
    const onError = () => finish(false);
    const timeoutId = window.setTimeout(() => finish(Boolean(window.Razorpay)), CHECKOUT_TIMEOUT_MS);

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    // Handles a previously inserted script whose load event already fired.
    if (window.Razorpay) finish(true);
  });

  return loadingPromise;
}
