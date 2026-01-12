# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 3: Finding What Changed

We can describe UI as vnodes. Now let's solve the efficiency problem: when state changes, how do we update only what's necessary?

### The Problem

Imagine our todo list with one item completed:

```javascript
// Before: todos = [{ id: 1, text: 'Learn JS', completed: false }]
const oldVNode = h('li', { className: '' },
  h('span', {}, 'Learn JS'),
  h('button', {}, 'Delete')
);

// After: todos = [{ id: 1, text: 'Learn JS', completed: true }]
const newVNode = h('li', { className: 'completed' },
  h('span', {}, 'Learn JS'),
  h('button', {}, 'Delete')
);
```

What changed? Only the `className` on the `<li>`. The text and button are identical.

We need to:
1. Compare the old and new vnodes
2. Figure out exactly what changed
3. Apply only that change to the DOM

This comparison is called **diffing**.

### What Can Change?

When comparing two vnodes, several things might differ:

1. **Node created**: Old is `undefined`, new exists
2. **Node removed**: Old exists, new is `undefined`
3. **Node replaced**: Different types (`div` → `span`)
4. **Text changed**: Same text node, different text
5. **Props changed**: Same element, different properties
6. **Children changed**: Same element, different child nodes

### The Diff Function

Let's write a function that compares two vnodes and returns a description of what changed:

```javascript
function diff(oldVNode, newVNode) {
  // Case 1: Node created
  if (!oldVNode) {
    return { type: 'CREATE', vnode: newVNode };
  }

  // Case 2: Node removed
  if (!newVNode) {
    return { type: 'REMOVE' };
  }

  // Case 3: Node replaced (different types)
  if (oldVNode.type !== newVNode.type) {
    return { type: 'REPLACE', vnode: newVNode };
  }

  // Case 4: Text changed
  if (oldVNode.type === 'TEXT') {
    if (oldVNode.text !== newVNode.text) {
      return { type: 'TEXT', text: newVNode.text };
    }
    return null; // No change
  }

  // Case 5: Element updated (props or children changed)
  // We'll implement this next
}
```

Notice we're returning *descriptions* of changes, not making DOM updates. That comes later.

### Comparing Properties

For the same element type, we need to check if props changed:

```javascript
// Old: { className: 'todo' }
// New: { className: 'todo completed', id: '1' }
// Result: Set className, set id
```

We want to find:
- New or changed props (to set)
- Removed props (to remove)

```javascript
function diffProps(oldProps, newProps) {
  const patches = [];

  // Check all new props
  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      patches.push({ type: 'SET_PROP', key, value: newProps[key] });
    }
  }

  // Check for removed props
  for (const key in oldProps) {
    if (!(key in newProps)) {
      patches.push({ type: 'REMOVE_PROP', key });
    }
  }

  return patches;
}
```

### Comparing Children

Children are arrays, so we compare them element by element:

```javascript
function diffChildren(oldChildren, newChildren) {
  const patches = [];
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLength; i++) {
    patches.push(diff(oldChildren[i], newChildren[i]));
  }

  return patches;
}
```

This is simple but not optimal—a sophisticated algorithm would use keys to handle reordering. For our purposes, this works fine.

### Completing the Diff Function

Now we can handle Case 5:

```javascript
function diff(oldVNode, newVNode) {
  if (!oldVNode) return { type: 'CREATE', vnode: newVNode };
  if (!newVNode) return { type: 'REMOVE' };
  if (oldVNode.type !== newVNode.type) {
    return { type: 'REPLACE', vnode: newVNode };
  }

  if (oldVNode.type === 'TEXT') {
    if (oldVNode.text !== newVNode.text) {
      return { type: 'TEXT', text: newVNode.text };
    }
    return null;
  }

  // Compare props and children
  const propPatches = diffProps(oldVNode.props, newVNode.props);
  const childPatches = diffChildren(oldVNode.children, newVNode.children);

  // If anything changed, return an UPDATE patch
  if (propPatches.length > 0 || childPatches.length > 0) {
    return {
      type: 'UPDATE',
      propPatches,
      childPatches
    };
  }

  return null; // Nothing changed
}
```

### Example: Completing a Todo

```javascript
const oldVNode = h('li', { className: '' },
  h('span', {}, 'Learn JS'),
  h('button', {}, 'Delete')
);

const newVNode = h('li', { className: 'completed' },
  h('span', {}, 'Learn JS'),
  h('button', {}, 'Delete')
);

const patch = diff(oldVNode, newVNode);
```

Result:

```javascript
{
  type: 'UPDATE',
  propPatches: [
    { type: 'SET_PROP', key: 'className', value: 'completed' }
  ],
  childPatches: [
    null,  // span unchanged
    null   // button unchanged
  ]
}
```

Perfect! We know exactly what to update: just the `className` prop.

### Example: Adding a Todo

```javascript
const oldChildren = [
  h('li', {}, 'Todo 1')
];

const newChildren = [
  h('li', {}, 'Todo 1'),
  h('li', {}, 'Todo 2')
];

const patches = diffChildren(oldChildren, newChildren);
```

Result:

```javascript
[
  null,  // First child unchanged
  { type: 'CREATE', vnode: h('li', {}, 'Todo 2') }
]
```

We know to create a new `<li>` for the second child.

### Example: Changing Element Type

```javascript
const oldVNode = h('div', {}, 'Hello');
const newVNode = h('span', {}, 'Hello');

const patch = diff(oldVNode, newVNode);
// { type: 'REPLACE', vnode: h('span', {}, 'Hello') }
```

Can't update `<div>` to `<span>`—we need to replace it entirely.

### Why This Matters

The diff algorithm is pure computation—just comparing JavaScript objects. It's:

1. **Fast**: No DOM access, just object comparisons
2. **Predictable**: Same inputs always produce same outputs
3. **Descriptive**: It tells us *what* changed, not *how* to change it

This separation of "what changed" from "how to update" is powerful. We can:
- Test diffing without a browser
- Optimize DOM updates separately
- Even target different platforms (DOM, Native, Canvas)

### What We Have So Far

```
UI Description (h function) → Old VNode
                           ↘
                             diff → Patch Description
                           ↗
                          New VNode
```

We can describe UI and find differences, but we still can't:
1. Create actual DOM from vnodes
2. Apply patches to the DOM

### Next Steps

In Part 4, we'll build the rendering engine that:
1. Creates real DOM elements from vnodes
2. Applies patch descriptions to update the DOM efficiently

---

**Next**: [Part 4 - Creating and Updating the DOM](04-rendering.md)

**The complete code**: [src/vdom.js:20-73](../src/vdom.js#L20-L73)
