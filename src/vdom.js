export function h(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity).map(child =>
      typeof child === 'object' ? child : createTextVNode(child)
    )
  };
}

function createTextVNode(text) {
  return {
    type: 'TEXT',
    props: {},
    children: [],
    text: String(text)
  };
}

export function diff(oldVNode, newVNode) {
  if (!oldVNode) return { type: 'CREATE', vnode: newVNode };
  if (!newVNode) return { type: 'REMOVE' };

  if (typeof oldVNode !== typeof newVNode || oldVNode.type !== newVNode.type) {
    return { type: 'REPLACE', vnode: newVNode };
  }

  if (oldVNode.type === 'TEXT') {
    if (oldVNode.text !== newVNode.text) {
      return { type: 'TEXT', text: newVNode.text };
    }
    return null;
  }

  const propPatches = diffProps(oldVNode.props, newVNode.props);
  const childPatches = diffChildren(oldVNode.children, newVNode.children);

  if (propPatches.length > 0 || childPatches.length > 0) {
    return { type: 'UPDATE', propPatches, childPatches };
  }

  return null;
}

function diffProps(oldProps, newProps) {
  const patches = [];

  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      patches.push({ type: 'SET_PROP', key, value: newProps[key] });
    }
  }

  for (const key in oldProps) {
    if (!(key in newProps)) {
      patches.push({ type: 'REMOVE_PROP', key });
    }
  }

  return patches;
}

function diffChildren(oldChildren, newChildren) {
  const patches = [];
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLength; i++) {
    const patch = diff(oldChildren[i], newChildren[i]);
    patches.push(patch);
  }

  return patches;
}
