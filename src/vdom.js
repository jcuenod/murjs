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

  if (propPatches.length > 0 || childPatches.patches.length > 0) {
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

let warnedMixedKeys = false;
let warnedNoKeys = false;

function diffChildren(oldChildren, newChildren) {
  const keyedCount = newChildren.filter(c => c?.props?.key != null).length;
  const hasKeys = keyedCount > 0;
  const allKeyed = keyedCount === newChildren.length;

  if (hasKeys && !allKeyed && !warnedMixedKeys) {
    warnedMixedKeys = true;
    console.warn('murjs: Mixed keyed and unkeyed children. All siblings should have keys.');
  } else if (!hasKeys && newChildren.length > 1 && !warnedNoKeys) {
    warnedNoKeys = true;
    console.warn('murjs: List rendered without keys. Add "key" prop for better performance.');
  }

  if (!allKeyed) {
    const patches = [];
    const maxLength = Math.max(oldChildren.length, newChildren.length);
    for (let i = 0; i < maxLength; i++) {
      patches.push(diff(oldChildren[i], newChildren[i]));
    }
    return { keyed: false, patches };
  }

  const oldKeyMap = new Map();
  oldChildren.forEach((child, i) => {
    const key = child?.props?.key;
    if (key != null) oldKeyMap.set(key, { child, index: i });
  });

  const patches = [];
  const usedOldIndices = new Set();

  newChildren.forEach((newChild, newIndex) => {
    const key = newChild?.props?.key;
    const oldEntry = key != null ? oldKeyMap.get(key) : null;

    if (oldEntry) {
      usedOldIndices.add(oldEntry.index);
      patches.push({
        oldIndex: oldEntry.index,
        newIndex,
        key,
        patch: diff(oldEntry.child, newChild)
      });
    } else {
      patches.push({
        oldIndex: null,
        newIndex,
        key,
        patch: { type: 'CREATE', vnode: newChild }
      });
    }
  });

  oldChildren.forEach((child, i) => {
    if (!usedOldIndices.has(i)) {
      patches.push({
        oldIndex: i,
        newIndex: null,
        key: child?.props?.key,
        patch: { type: 'REMOVE' }
      });
    }
  });

  return { keyed: true, patches };
}
