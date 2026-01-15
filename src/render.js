import { diff } from './vdom.js';

const eventHandlers = new WeakMap();

// Namespace constants
const SVG_NS = 'http://www.w3.org/2000/svg';
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

function getNamespace(type, parentNs) {
  if (type === 'svg') return SVG_NS;
  if (type === 'math') return MATHML_NS;
  return parentNs;
}

function getChildNamespace(type, elementNs) {
  // foreignObject children are HTML
  if (type === 'foreignObject') return null;
  return elementNs;
}

export function createElement(vnode, ns = null) {
  if (vnode.type === 'TEXT') {
    return document.createTextNode(vnode.text);
  }

  // Determine namespace for this element
  const elementNs = getNamespace(vnode.type, ns);

  // Create element with appropriate namespace
  const el = elementNs
    ? document.createElementNS(elementNs, vnode.type)
    : document.createElement(vnode.type);

  setProps(el, vnode.props, elementNs);

  // Determine namespace for children
  const childNs = getChildNamespace(vnode.type, elementNs);

  vnode.children.forEach(child => {
    el.appendChild(createElement(child, childNs));
  });

  return el;
}

function setProps(el, props, ns = null) {
  for (const key in props) {
    setProp(el, key, props[key], ns);
  }
}

function setProp(el, key, value, ns = null) {
  if (key === 'key') return;
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase();

    let handlers = eventHandlers.get(el);
    if (!handlers) {
      handlers = {};
      eventHandlers.set(el, handlers);
    }

    if (handlers[key]) {
      el.removeEventListener(eventName, handlers[key]);
    }

    handlers[key] = value;
    el.addEventListener(eventName, value);
  } else if (key === 'className') {
    // For SVG, className is an SVGAnimatedString, use setAttribute
    if (ns === SVG_NS) {
      el.setAttribute('class', value);
    } else {
      el.className = value;
    }
  } else if (key === 'style' && typeof value === 'object') {
    Object.assign(el.style, value);
  } else if (key === 'value' && !ns) {
    // value property only for HTML form elements
    el.value = value;
  } else if (key === 'xlinkHref' || key === 'xlink:href') {
    // xlink namespace for href in SVG (legacy but still used)
    el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', value);
  } else {
    el.setAttribute(key, value);
  }
}

function patchKeyedChildren(parent, childPatches, oldVNode, newVNode) {
  const oldDomChildren = Array.from(parent.childNodes);
  const newElements = [];

  // Infer namespace from parent DOM element
  const parentNs = parent.namespaceURI;
  const childNs = (parentNs === SVG_NS || parentNs === MATHML_NS)
    ? getChildNamespace(parent.tagName.toLowerCase(), parentNs)
    : null;

  childPatches.patches.forEach(p => {
    if (p.newIndex === null) return;

    if (p.oldIndex !== null) {
      const el = oldDomChildren[p.oldIndex];
      const patchedEl = patch(parent, el, oldVNode.children[p.oldIndex], newVNode.children[p.newIndex]);
      newElements[p.newIndex] = patchedEl;
    } else {
      newElements[p.newIndex] = createElement(p.patch.vnode, childNs);
    }
  });

  newElements.forEach((el, i) => {
    if (parent.childNodes[i] !== el) {
      parent.insertBefore(el, parent.childNodes[i] || null);
    }
  });

  while (parent.childNodes.length > newElements.length) {
    parent.removeChild(parent.lastChild);
  }
}

function removeProp(el, key) {
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase();
    const handlers = eventHandlers.get(el);
    if (handlers && handlers[key]) {
      el.removeEventListener(eventName, handlers[key]);
      delete handlers[key];
    }
  } else if (key === 'className') {
    el.className = '';
  } else {
    el.removeAttribute(key);
  }
}

export function patch(parent, el, oldVNode, newVNode) {
  const patchObj = diff(oldVNode, newVNode);

  if (!patchObj) return el;

  // Infer namespace from parent DOM element for CREATE/REPLACE
  const parentNs = parent.namespaceURI;
  const childNs = (parentNs === SVG_NS || parentNs === MATHML_NS)
    ? getChildNamespace(parent.tagName.toLowerCase(), parentNs)
    : null;

  if (patchObj.type === 'CREATE') {
    const newEl = createElement(patchObj.vnode, childNs);
    parent.appendChild(newEl);
    return newEl;
  }

  if (patchObj.type === 'REMOVE') {
    parent.removeChild(el);
    return null;
  }

  if (patchObj.type === 'REPLACE') {
    const newEl = createElement(patchObj.vnode, childNs);
    parent.replaceChild(newEl, el);
    return newEl;
  }

  if (patchObj.type === 'TEXT') {
    el.textContent = patchObj.text;
    return el;
  }

  if (patchObj.type === 'UPDATE') {
    // Get element's namespace for proper attribute handling
    const elNs = (el.namespaceURI === SVG_NS || el.namespaceURI === MATHML_NS)
      ? el.namespaceURI
      : null;

    patchObj.propPatches.forEach(propPatch => {
      if (propPatch.type === 'SET_PROP') {
        setProp(el, propPatch.key, propPatch.value, elNs);
      } else if (propPatch.type === 'REMOVE_PROP') {
        removeProp(el, propPatch.key);
      }
    });

    if (patchObj.childPatches.keyed) {
      patchKeyedChildren(el, patchObj.childPatches, oldVNode, newVNode);
    } else {
      const childNodes = Array.from(el.childNodes);
      patchObj.childPatches.patches.forEach((_, i) => {
        patch(el, childNodes[i], oldVNode.children[i], newVNode.children[i]);
      });
    }
  }

  return el;
}
