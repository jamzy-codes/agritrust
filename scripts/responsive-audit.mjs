import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const bravePath = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const outputDirectory = path.resolve("artifacts", "responsive-audit");
const profileDirectory = path.join(outputDirectory, "profile");
const debuggingPort = 9333;
const origin = "http://127.0.0.1:3000";
const viewports = [
  [320, 640], [360, 800], [375, 812], [390, 844], [430, 932],
  [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080],
  [844, 390], [932, 430],
];
const routes = [
  "/",
  "/login",
  "/register",
  "/reset-password",
  "/onboarding",
  "/help",
  "/verify",
  "/verify/AGT-6816",
];
const permittedRedirects = new Map([["/onboarding", "/login"]]);
const screenshotKeys = new Set([
  "/@360x800",
  "/@1280x800",
  "/login@320x640",
  "/help@390x844",
  "/verify@320x640",
  "/verify@1440x900",
  "/verify/AGT-6816@320x640",
  "/verify/AGT-6816@768x1024",
  "/verify/AGT-6816@1440x900",
]);

await mkdir(profileDirectory, { recursive: true });

const browser = spawn(bravePath, [
  "--headless=new",
  "--disable-gpu",
  "--disable-extensions",
  "--no-first-run",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profileDirectory}`,
  "about:blank",
], { stdio: "ignore", windowsHide: true });

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`);
      if (response.ok) return;
    } catch {
      // Brave is still starting.
    }
    await delay(250);
  }
  throw new Error("Brave DevTools endpoint did not become ready.");
}

function connect(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener("message", (message) => {
    const payload = JSON.parse(String(message.data));
    if (payload.id) {
      const handler = pending.get(payload.id);
      if (!handler) return;
      pending.delete(payload.id);
      if (payload.error) handler.reject(new Error(payload.error.message));
      else handler.resolve(payload.result);
      return;
    }
    for (const listener of listeners.get(payload.method) ?? []) listener(payload.params);
  });
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return {
    opened,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method) {
      return new Promise((resolve) => {
        const callback = (params) => {
          listeners.set(method, (listeners.get(method) ?? []).filter((item) => item !== callback));
          resolve(params);
        };
        listeners.set(method, [...(listeners.get(method) ?? []), callback]);
      });
    },
    on(method, callback) {
      listeners.set(method, [...(listeners.get(method) ?? []), callback]);
    },
    close() {
      socket.close();
    },
  };
}

await waitForDebugger();
const targetResponse = await fetch(
  `http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent("about:blank")}`,
  { method: "PUT" },
);
const target = await targetResponse.json();
const cdp = connect(target.webSocketDebuggerUrl);
await cdp.opened;
await Promise.all([cdp.send("Page.enable"), cdp.send("Runtime.enable"), cdp.send("Log.enable")]);

let pageErrors = [];
cdp.on("Runtime.exceptionThrown", (params) => {
  pageErrors.push(params.exceptionDetails?.text ?? "Runtime exception");
});
cdp.on("Log.entryAdded", (params) => {
  if (["error", "warning"].includes(params.entry?.level)) pageErrors.push(params.entry.text);
});

const results = [];
const functionalResults = {};
try {
  for (const [width, height] of viewports) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    for (const route of routes) {
      pageErrors = [];
      const loaded = cdp.once("Page.loadEventFired");
      const navigation = await cdp.send("Page.navigate", { url: origin + route });
      if (navigation.errorText) throw new Error(`${route} failed to navigate: ${navigation.errorText}`);
      await Promise.race([
        loaded,
        delay(60_000).then(() => { throw new Error(`Timed out loading ${route}`); }),
      ]);
      await delay(750);
      const evaluation = await cdp.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const root = document.documentElement;
          const viewportWidth = root.clientWidth;
          const viewportHeight = root.clientHeight;
          const visible = (element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          };
          const offenders = [...document.querySelectorAll('body *')]
            .filter(visible)
            .map((element) => ({ element, rect: element.getBoundingClientRect() }))
            .filter(({ element, rect }) => {
              const style = getComputedStyle(element);
              return style.position !== 'fixed' && (rect.right > viewportWidth + 1 || rect.left < -1);
            })
            .slice(0, 8)
            .map(({ element, rect }) => ({
              tag: element.tagName,
              className: String(element.className || '').slice(0, 160),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            }));
          const touchTargets = [...document.querySelectorAll('button, a, input, select, textarea, summary')]
            .filter(visible)
            .map((element) => ({ element, rect: element.getBoundingClientRect() }))
            .filter(({ rect }) => rect.width < 40 || rect.height < 40)
            .slice(0, 12)
            .map(({ element, rect }) => ({
              tag: element.tagName,
              text: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 60),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }));
          return {
            title: document.title,
            protocol: location.protocol,
            path: location.pathname,
            viewportWidth,
            viewportHeight,
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            horizontalOverflow: root.scrollWidth > viewportWidth + 1,
            offenders,
            touchTargets,
          };
        })()`,
      });
      const value = evaluation.result.value;
      const expectedPath = permittedRedirects.get(route) ?? route;
      if (value.protocol !== "http:" || value.path !== expectedPath) {
        throw new Error(`${route} rendered an unexpected page: ${value.protocol}${value.path}`);
      }
      const key = `${route}@${width}x${height}`;
      results.push({
        route,
        width,
        height,
        ...value,
        authenticationRedirect: value.path !== route,
        pageErrors: [...new Set(pageErrors)].slice(0, 10),
      });
      if (screenshotKeys.has(key)) {
        const screenshot = await cdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        const slug = route === "/" ? "landing" : route.replaceAll("/", "-").replace(/^-/, "");
        await writeFile(
          path.join(outputDirectory, `${slug}-${width}x${height}.png`),
          Buffer.from(screenshot.data, "base64"),
        );
      }
    }
  }

  async function navigateTo(route) {
    const loaded = cdp.once("Page.loadEventFired");
    const navigation = await cdp.send("Page.navigate", { url: origin + route });
    if (navigation.errorText) throw new Error(`${route} failed to navigate: ${navigation.errorText}`);
    await Promise.race([
      loaded,
      delay(60_000).then(() => { throw new Error(`Timed out loading ${route}`); }),
    ]);
    await delay(300);
  }

  async function evaluate(expression) {
    const evaluation = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
    if (evaluation.exceptionDetails) throw new Error(evaluation.exceptionDetails.text);
    return evaluation.result.value;
  }

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 430,
    height: 932,
    deviceScaleFactor: 1,
    mobile: true,
  });

  await navigateTo("/");
  functionalResults.landingVerificationLinks = await evaluate(`(() => {
    const links = [...document.querySelectorAll('a')]
      .filter((link) => /verify|scan a product/i.test(link.textContent || ''));
    return {
      count: links.length,
      allUseEntryRoute: links.length > 0 && links.every((link) => new URL(link.href).pathname === '/verify'),
      containsMockLink: links.some((link) => link.href.includes('AGT-0042')),
    };
  })()`);

  await navigateTo("/verify");
  functionalResults.entryPage = await evaluate(`(() => ({
    heading: document.querySelector('h1')?.textContent?.trim(),
    inputValue: document.querySelector('#verification-batch-id')?.value,
    hasLabel: Boolean(document.querySelector('label[for="verification-batch-id"]')),
    buttonText: document.querySelector('button[type="submit"]')?.textContent?.trim(),
  }))()`);

  await evaluate(`document.querySelector('form').requestSubmit()`);
  await delay(100);
  functionalResults.emptyValidation = await evaluate(
    `document.querySelector('[role="alert"]')?.textContent?.trim() || null`,
  );

  await evaluate(`(() => {
    const input = document.querySelector('#verification-batch-id');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'not-a-batch');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('form').requestSubmit();
  })()`);
  await delay(100);
  functionalResults.invalidValidation = await evaluate(
    `document.querySelector('[role="alert"]')?.textContent?.trim() || null`,
  );

  await navigateTo("/verify");
  await evaluate(`document.querySelector('#verification-batch-id').focus()`);
  await cdp.send("Input.insertText", { text: "  agt-6816  " });
  await delay(150);
  functionalResults.keyboardEnteredValue = await evaluate(
    `document.querySelector('#verification-batch-id').value`,
  );
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    text: "\r",
    unmodifiedText: "\r",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pathName = await evaluate(`location.pathname`);
    if (pathName === "/verify/AGT-6816") break;
    await delay(250);
  }
  await delay(750);
  functionalResults.keyboardValidSubmission = await evaluate(`(() => ({
    path: location.pathname,
    heading: document.querySelector('h1')?.textContent?.trim(),
    batchVisible: document.body.textContent.includes('AGT-6816'),
    qrGenerated: Boolean(document.querySelector('img[alt*="AGT-6816"]')?.src?.startsWith('data:image/png')),
    openUrl: [...document.querySelectorAll('a')].find((link) => link.textContent?.trim() === 'Open')?.href || null,
  }))()`);

  await navigateTo("/verify/AGT-0042");
  functionalResults.notFound = await evaluate(`(() => ({
    heading: document.querySelector('h1')?.textContent?.trim(),
    retryPath: new URL([...document.querySelectorAll('a')].find((link) => /try another/i.test(link.textContent || ''))?.href || location.href).pathname,
  }))()`);

  await navigateTo("/verify/AGT-6816");
  functionalResults.directPassport = await evaluate(`(() => ({
    path: location.pathname,
    heading: document.querySelector('h1')?.textContent?.trim(),
    hasPassport: document.body.textContent.includes('PRODUCE PASSPORT'),
  }))()`);

  const functionalFailures = [
    !functionalResults.landingVerificationLinks.allUseEntryRoute,
    functionalResults.landingVerificationLinks.containsMockLink,
    functionalResults.entryPage.heading !== "Verify Your Produce",
    functionalResults.entryPage.inputValue !== "",
    !functionalResults.entryPage.hasLabel,
    !functionalResults.emptyValidation,
    !functionalResults.invalidValidation,
    functionalResults.keyboardValidSubmission.path !== "/verify/AGT-6816",
    !functionalResults.keyboardValidSubmission.batchVisible,
    !functionalResults.keyboardValidSubmission.qrGenerated,
    functionalResults.notFound.heading !== "Batch Not Found",
    functionalResults.notFound.retryPath !== "/verify",
    functionalResults.directPassport.path !== "/verify/AGT-6816",
    !functionalResults.directPassport.hasPassport,
  ].filter(Boolean).length;
  await writeFile(
    path.join(outputDirectory, "results.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      browser: "Brave (headless CDP)",
      origin,
      results,
      functionalResults,
      functionalFailures,
    }, null, 2),
  );
  const failures = results.filter((result) => result.horizontalOverflow || result.pageErrors.length > 0);
  console.log(JSON.stringify({ checked: results.length, failures, functionalResults }, null, 2));
  if (functionalFailures > 0) {
    throw new Error(`Verification flow audit found ${functionalFailures} failure(s).`);
  }
} finally {
  cdp.close();
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2_000);
    browser.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    browser.kill();
  });
}

// The Windows Brave process can leave a child-process handle alive after its
// DevTools socket and browser process have closed. Results are already flushed.
process.exit(0);
