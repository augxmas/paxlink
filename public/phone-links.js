(() => {
  // Enhance displayed numbers only; form fields keep their normal editing behavior.
  const candidate = /(?<![\w+])(?:\+82[ -]?\d{1,2}[ -]?\d{3,4}[ -]?\d{4}|0\d{1,2}[ -]?\d{3,4}[ -]?\d{4}|1[568]\d{2}[ -]?\d{4})(?!\w)/g;
  const valid = /^(?:02\d{7,8}|0(?:1[016789]|[3-6][1-5]|70|80)\d{7,8}|1[568]\d{6}|\+82[1-9]\d{7,9})$/;
  const excluded = 'a,button,input,textarea,select,option,script,style,noscript,template,[contenteditable]:not([contenteditable="false"]),[data-no-phone-link]';
  function faxOnly(element) {
    const cell = element.closest('td');
    const heading = cell?.closest('table')?.querySelectorAll('thead th')[cell.cellIndex]?.textContent || '';
    const sibling = element.closest('dd')?.previousElementSibling || element.previousElementSibling;
    const previous = sibling?.matches('dt,h1,h2,h3,h4,h5,h6,label,strong') ? sibling.textContent : '';
    return /팩스|fax/i.test(heading) || /팩스|fax/i.test(previous);
  }
  function enhance(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(excluded) || faxOnly(parent)) return;
    const text = node.nodeValue || '';
    const matches = [...text.matchAll(candidate)].filter(match => valid.test(match[0].replace(/[ -]/g, '')) && !/(?:팩스|fax)\s*[:：]?\s*$/i.test(text.slice(0, match.index)));
    if (!matches.length) return;
    const fragment = document.createDocumentFragment(); let offset = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(text.slice(offset, match.index)));
      const link = document.createElement('a'); link.href = 'tel:' + match[0].replace(/[ -]/g, '');
      link.textContent = match[0]; link.className = 'phone-call-link'; link.setAttribute('aria-label', match[0] + ' 전화 걸기');
      fragment.append(link); offset = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(offset))); node.replaceWith(fragment);
  }
  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) { enhance(root); return; }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(enhance);
  }
  const style = document.createElement('style');style.textContent = '.phone-call-link{color:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer;touch-action:manipulation}.phone-call-link:focus-visible{outline:2px solid currentColor;outline-offset:3px}';document.head.append(style);
  scan(document.body);
  new MutationObserver(records => records.forEach(record => record.type === 'characterData' ? enhance(record.target) : record.addedNodes.forEach(scan))).observe(document.body, {childList:true,subtree:true,characterData:true});
})();
