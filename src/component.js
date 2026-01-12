import { effect } from './reactive.js';
import { createElement, patch } from './render.js';

export function mount(rootComponent, container) {
  let vnode = null;
  let domNode = null;

  const update = () => {
    const newVNode = rootComponent();

    if (!vnode) {
      vnode = newVNode;
      domNode = createElement(vnode);
      container.appendChild(domNode);
    } else {
      domNode = patch(container, domNode, vnode, newVNode);
      vnode = newVNode;
    }
  };

  effect(update);
}

