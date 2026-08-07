/** Opens a print dialog from HTML so the browser can save/share a PDF. */
export function openHtmlPrintDialog(html: string, title = "Document") {
  // Same-document iframe avoids popup blockers from window.open().
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", title);
  iframe.style.cssText =
    "position:fixed;inset:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return false;
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    frameWindow.removeEventListener("afterprint", cleanup);
    iframe.remove();
  };

  frameWindow.addEventListener("afterprint", cleanup);

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      cleanup();
      return;
    }

    // Some browsers never fire afterprint; clean up after a delay.
    window.setTimeout(cleanup, 60_000);
  };

  // Let the iframe finish layout before printing.
  window.setTimeout(triggerPrint, 50);
  return true;
}
