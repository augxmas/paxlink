const REQUIRED_MARKER_SELECTOR = "label > i, legend > i, label > span > i";

function normalizeRequiredMarkers(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(REQUIRED_MARKER_SELECTOR).forEach((marker) => {
    if (marker.textContent?.trim() !== "*" || marker.dataset.requiredLeading === "true") return;
    const parent = marker.parentElement;
    if (!parent) return;
    marker.dataset.requiredLeading = "true";
    parent.insertBefore(document.createTextNode(" "), parent.firstChild);
    parent.insertBefore(marker, parent.firstChild);
  });
}

export function mountRequiredMarkers() {
  normalizeRequiredMarkers();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      normalizeRequiredMarkers(node.matches(REQUIRED_MARKER_SELECTOR) ? node.parentElement ?? document : node);
    }));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
