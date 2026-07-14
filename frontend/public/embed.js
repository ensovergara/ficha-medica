/**
 * FichaMédica Pet — Embed Widget v1
 *
 * Usage:
 *   <script
 *     src="https://app.fichamedica.app/embed.js"
 *     data-clinic="mi-clinica"
 *     data-color="#2563eb"
 *     data-label="Agendar hora"
 *     data-position="bottom-right"
 *   ></script>
 *
 * Attributes:
 *   data-clinic     (required) Clinic slug (tenant)
 *   data-color      Brand color for the button and widget (default: #2563eb)
 *   data-label      Button label text (default: "Agendar hora")
 *   data-position   "bottom-right" | "bottom-left" (default: bottom-right)
 */

(function () {
  "use strict";

  // ── Read configuration from the <script> tag ──────────────────────────────
  var scripts = document.querySelectorAll("script[data-clinic]");
  var scriptTag = scripts[scripts.length - 1]; // support multiple instances

  if (!scriptTag) return;

  var slug = scriptTag.getAttribute("data-clinic");
  if (!slug) {
    console.warn("[FichaMédica Pet] Missing data-clinic attribute.");
    return;
  }

  var color = scriptTag.getAttribute("data-color") || "#2563eb";
  var label = scriptTag.getAttribute("data-label") || "Agendar hora";
  var position = scriptTag.getAttribute("data-position") || "bottom-right";

  // Derive the base URL from where this script is served
  var scriptSrc = scriptTag.src || "";
  var baseUrl = scriptSrc
    ? scriptSrc.replace(/\/embed\.js.*$/, "")
    : "http://localhost:3000";

  var widgetUrl =
    baseUrl + "/book/" + slug + "/widget?color=" + encodeURIComponent(color);

  // ── Inject styles ──────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#fmp-widget-btn {",
    "  position: fixed;",
    "  z-index: 2147483640;",
    "  bottom: 24px;",
    "  " + (position === "bottom-left" ? "left: 24px;" : "right: 24px;"),
    "  background-color: " + color + ";",
    "  color: #fff;",
    "  border: none;",
    "  border-radius: 999px;",
    "  padding: 12px 22px;",
    "  font-size: 15px;",
    "  font-weight: 600;",
    "  font-family: system-ui, -apple-system, sans-serif;",
    "  cursor: pointer;",
    "  box-shadow: 0 4px 16px rgba(0,0,0,0.18);",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 8px;",
    "  transition: transform 0.15s, box-shadow 0.15s;",
    "  line-height: 1;",
    "}",
    "#fmp-widget-btn:hover {",
    "  transform: translateY(-2px);",
    "  box-shadow: 0 6px 20px rgba(0,0,0,0.22);",
    "}",
    "#fmp-widget-overlay {",
    "  display: none;",
    "  position: fixed;",
    "  z-index: 2147483641;",
    "  inset: 0;",
    "  background: rgba(0,0,0,0.45);",
    "  backdrop-filter: blur(2px);",
    "  align-items: center;",
    "  justify-content: center;",
    "}",
    "#fmp-widget-overlay.fmp-open {",
    "  display: flex;",
    "}",
    "#fmp-widget-modal {",
    "  background: #fff;",
    "  border-radius: 20px;",
    "  overflow: hidden;",
    "  width: 100%;",
    "  max-width: 440px;",
    "  height: 680px;",
    "  max-height: 92vh;",
    "  position: relative;",
    "  box-shadow: 0 20px 60px rgba(0,0,0,0.3);",
    "  display: flex;",
    "  flex-direction: column;",
    "}",
    "@media (max-width: 480px) {",
    "  #fmp-widget-modal {",
    "    border-radius: 20px 20px 0 0;",
    "    max-height: 92vh;",
    "    height: 92vh;",
    "  }",
    "  #fmp-widget-overlay {",
    "    align-items: flex-end;",
    "  }",
    "}",
    "#fmp-widget-header {",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: space-between;",
    "  padding: 14px 16px 10px;",
    "  border-bottom: 1px solid #f3f4f6;",
    "  flex-shrink: 0;",
    "}",
    "#fmp-widget-title {",
    "  font-size: 14px;",
    "  font-weight: 600;",
    "  color: #111827;",
    "  font-family: system-ui, -apple-system, sans-serif;",
    "}",
    "#fmp-widget-close {",
    "  background: none;",
    "  border: none;",
    "  cursor: pointer;",
    "  color: #9ca3af;",
    "  padding: 4px;",
    "  border-radius: 8px;",
    "  line-height: 1;",
    "  font-size: 18px;",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  transition: background 0.1s;",
    "}",
    "#fmp-widget-close:hover {",
    "  background: #f3f4f6;",
    "  color: #374151;",
    "}",
    "#fmp-widget-iframe {",
    "  flex: 1;",
    "  border: none;",
    "  width: 100%;",
    "  display: block;",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  // ── Build DOM ──────────────────────────────────────────────────────────────
  // Floating button
  var btn = document.createElement("button");
  btn.id = "fmp-widget-btn";
  btn.setAttribute("aria-label", label);
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
    "<span>" + escapeHtml(label) + "</span>";
  document.body.appendChild(btn);

  // Overlay + modal
  var overlay = document.createElement("div");
  overlay.id = "fmp-widget-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Agendar cita");

  var modal = document.createElement("div");
  modal.id = "fmp-widget-modal";

  var header = document.createElement("div");
  header.id = "fmp-widget-header";

  var title = document.createElement("span");
  title.id = "fmp-widget-title";
  title.textContent = "Agendar hora";

  var closeBtn = document.createElement("button");
  closeBtn.id = "fmp-widget-close";
  closeBtn.setAttribute("aria-label", "Cerrar");
  closeBtn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  header.appendChild(title);
  header.appendChild(closeBtn);

  var iframe = document.createElement("iframe");
  iframe.id = "fmp-widget-iframe";
  iframe.setAttribute("title", "Portal de reservas");
  iframe.setAttribute("loading", "lazy");
  // src is set lazily on first open to avoid unnecessary load

  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ── State ──────────────────────────────────────────────────────────────────
  var iframeLoaded = false;

  function openWidget() {
    if (!iframeLoaded) {
      iframe.src = widgetUrl;
      iframeLoaded = true;
    }
    overlay.classList.add("fmp-open");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function closeWidget() {
    overlay.classList.remove("fmp-open");
    document.body.style.overflow = "";
    btn.focus();
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  btn.addEventListener("click", openWidget);
  closeBtn.addEventListener("click", closeWidget);

  // Close on backdrop click
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeWidget();
  });

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("fmp-open")) {
      closeWidget();
    }
  });

  // Listen for messages from the widget iframe
  window.addEventListener("message", function (e) {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "fmp:close") closeWidget();
    if (e.data.type === "fmp:booking_success") {
      // Give user a moment to read the success screen before auto-close option
      // Widget handles its own success UI; parent just listens
    }
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
