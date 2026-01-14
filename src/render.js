import { diff } from './vdom.js';

const eventHandlers = new WeakMap();

export function createElement(vnode) {
  if (vnode.type === 'TEXT') {
    return document.createTextNode(vnode.text);
  }

  const el = document.createElement(vnode.type);

  setProps(el, vnode.props);

  vnode.children.forEach(child => {
    el.appendChild(createElement(child));
  });

  return el;
}

function setProps(el, props) {
  for (const key in props) {
    setProp(el, key, props[key]);
  }
}

function setProp(el, key, value) {
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
    el.className = value;
  } else if (key === 'style' && typeof value === 'object') {
    Object.assign(el.style, value);
  } else if (key === 'value') {
    el.value = value;
  } else {
    el.setAttribute(key, value);
  }
}

function patchKeyedChildren(parent, childPatches, oldVNode, newVNode) {
  const oldDomChildren = Array.from(parent.childNodes);
  const newElements = [];

  childPatches.patches.forEach(p => {
    if (p.newIndex === null) return;

    if (p.oldIndex !== null) {
      const el = oldDomChildren[p.oldIndex];
      const patchedEl = patch(parent, el, oldVNode.children[p.oldIndex], newVNode.children[p.newIndex]);
      newElements[p.newIndex] = patchedEl;
    } else {
      newElements[p.newIndex] = createElement(p.patch.vnode);
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

  if (patchObj.type === 'CREATE') {
    const newEl = createElement(patchObj.vnode);
    parent.appendChild(newEl);
    return newEl;
  }

  if (patchObj.type === 'REMOVE') {
    parent.removeChild(el);
    return null;
  }

  if (patchObj.type === 'REPLACE') {
    const newEl = createElement(patchObj.vnode);
    parent.replaceChild(newEl, el);
    return newEl;
  }

  if (patchObj.type === 'TEXT') {
    el.textContent = patchObj.text;
    return el;
  }

  if (patchObj.type === 'UPDATE') {
    patchObj.propPatches.forEach(propPatch => {
      if (propPatch.type === 'SET_PROP') {
        setProp(el, propPatch.key, propPatch.value);
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
