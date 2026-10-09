/** Reveal each Markdown block once, whether it arrived live or offscreen. */
export function observeAnswerBlocks(root: HTMLElement) {
  if (typeof IntersectionObserver === "undefined") return () => {};
  const tracked = new Set<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.setAttribute("data-answer-reveal", "visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
  const observe = () => {
    for (const block of root.children) {
      if (tracked.has(block)) continue;
      tracked.add(block);
      block.setAttribute("data-answer-reveal", "pending");
      observer.observe(block);
    }
  };
  observe();
  const mutations = new MutationObserver(observe);
  mutations.observe(root, { childList: true });
  return () => {
    observer.disconnect();
    mutations.disconnect();
    for (const block of tracked) block.removeAttribute("data-answer-reveal");
  };
}
