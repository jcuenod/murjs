# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 8: Keys - Efficient List Reconciliation

Our framework works great, but there's a hidden inefficiency. When lists change, we're doing more work than necessary. Let's fix that with keys.

### The Problem

Watch what happens when we insert an item at the beginning of a list:

```javascript
// Before
['B', 'C', 'D']

// After (insert 'A' at start)
['A', 'B', 'C', 'D']
```

Our current `diffChildren()` compares by position:
- Position 0: 'B' vs 'A' → **different, update**
- Position 1: 'C' vs 'B' → **different, update**
- Position 2: 'D' vs 'C' → **different, update**
- Position 3: nothing vs 'D' → **create new**

We updated 3 elements and created 1. But we only needed to create 1! The existing elements just moved.

This gets worse with complex list items. If each item is a component with event handlers, styles, and state, we're recreating all of that unnecessarily.

### What Keys Solve

Keys give each list item a stable identity:

```javascript
// Before
[{ key: 'b', text: 'B' }, { key: 'c', text: 'C' }, { key: 'd', text: 'D' }]

// After
[{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }, { key: 'c', text: 'C' }, { key: 'd', text: 'D' }]
```

Now the algorithm can match by key:
- Key 'a': not found → **create new**
- Key 'b': found at old position 0 → **reuse, move to position 1**
- Key 'c': found at old position 1 → **reuse, move to position 2**
- Key 'd': found at old position 2 → **reuse, move to position 3**

One creation, zero updates. Much better!

### Detecting Keys

First, we check if children have keys:

```javascript
function diffChildren(oldChildren, newChildren) {
  const keyedCount = newChildren.filter(c => c?.props?.key != null).length;
  const hasKeys = keyedCount > 0;
  const allKeyed = keyedCount === newChildren.length;

  // Warn about problems
  if (hasKeys && !allKeyed) {
    console.warn('murjs: Mixed keyed and unkeyed children. All siblings should have keys.');
  } else if (!hasKeys && newChildren.length > 1) {
    console.warn('murjs: List rendered without keys. Add "key" prop for better performance.');
  }

  // ...
}
```

We warn in two cases:
1. **Mixed keys**: Some children have keys, some don't. This is almost always a bug.
2. **No keys**: A list without keys works but is inefficient. We remind developers.

### Key-Based Matching

When keys are present, we build a map from key to old child:

```javascript
if (!allKeyed) {
  // Fall back to position-based (existing logic)
  // ...
}

// Build map: key → { child, index }
const oldKeyMap = new Map();
oldChildren.forEach((child, i) => {
  const key = child?.props?.key;
  if (key != null) oldKeyMap.set(key, { child, index: i });
});
```

Then we match new children to old children by key:

```javascript
const patches = [];
const usedOldIndices = new Set();

newChildren.forEach((newChild, newIndex) => {
  const key = newChild?.props?.key;
  const oldEntry = key != null ? oldKeyMap.get(key) : null;

  if (oldEntry) {
    // Found existing child with this key
    usedOldIndices.add(oldEntry.index);
    patches.push({
      oldIndex: oldEntry.index,
      newIndex,
      key,
      patch: diff(oldEntry.child, newChild)
    });
  } else {
    // New child, needs to be created
    patches.push({
      oldIndex: null,
      newIndex,
      key,
      patch: { type: 'CREATE', vnode: newChild }
    });
  }
});
```

Finally, mark children that were removed:

```javascript
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
```

The result is a list of patches that know both the old and new positions.

### DOM Reordering

The `patch()` function now handles keyed children differently:

```javascript
if (patchObj.childPatches.keyed) {
  patchKeyedChildren(el, patchObj.childPatches, oldVNode, newVNode);
} else {
  // Position-based patching (unchanged)
}
```

The `patchKeyedChildren()` helper does the actual work:

```javascript
function patchKeyedChildren(parent, childPatches, oldVNode, newVNode) {
  const oldDomChildren = Array.from(parent.childNodes);
  const newElements = [];

  // Process updates and creates
  childPatches.patches.forEach(p => {
    if (p.newIndex === null) return; // Removal, handle later

    if (p.oldIndex !== null) {
      // Existing element - patch and reuse
      const el = oldDomChildren[p.oldIndex];
      const patchedEl = patch(parent, el,
        oldVNode.children[p.oldIndex],
        newVNode.children[p.newIndex]
      );
      newElements[p.newIndex] = patchedEl;
    } else {
      // New element - create it
      newElements[p.newIndex] = createElement(p.patch.vnode);
    }
  });

  // Reorder DOM to match new order
  newElements.forEach((el, i) => {
    if (parent.childNodes[i] !== el) {
      parent.insertBefore(el, parent.childNodes[i] || null);
    }
  });

  // Remove excess children
  while (parent.childNodes.length > newElements.length) {
    parent.removeChild(parent.lastChild);
  }
}
```

The key insight: `insertBefore()` moves existing elements without destroying them. Event handlers, focus state, CSS transitions—all preserved.

### Filtering the Key Prop

Keys are for reconciliation, not for the DOM. We filter them out in `setProp()`:

```javascript
function setProp(el, key, value) {
  if (key === 'key') return; // Keys don't go to the DOM
  // ... rest of function
}
```

### Using Keys

Keys should be unique and stable. Good keys:

```javascript
// Database IDs - perfect
todos.map(todo => TodoItem({ key: todo.id, todo }))

// UUIDs - also good
items.map(item => Item({ key: item.uuid, item }))
```

Bad keys:

```javascript
// Array index - defeats the purpose!
todos.map((todo, i) => TodoItem({ key: i, todo }))

// Random values - different every render
todos.map(todo => TodoItem({ key: Math.random(), todo }))
```

### Complete Example

Here's our TodoList with keys:

```javascript
const TodoItem = (props) => {
  const { todo, onToggle, onDelete } = props;

  return html`
    <li class="${todo.completed ? 'completed' : ''}">
      <span onClick=${() => onToggle(todo.id)}>
        ${todo.text}
      </span>
      <button onClick=${() => onDelete(todo.id)}>Delete</button>
    </li>
  `;
};

const TodoList = (props) => {
  const { todos, onToggle, onDelete } = props;

  return html`
    <ul>
      ${todos.map(todo => TodoItem({ key: todo.id, todo, onToggle, onDelete }))}
    </ul>
  `;
};
```

The key is passed as a prop to the component. It flows through to the vnode's `props.key` and is used during reconciliation.

### What We've Built

Our framework now has:

1. **Virtual DOM** (`h`, `diff`, `patch`) - Efficient updates
2. **Components** - Reusable UI functions
3. **Reactivity** (`createReactive`, `effect`) - Automatic updates
4. **Template literals** (`html`) - Great developer experience
5. **Keyed reconciliation** - Efficient list updates

The key system adds about 50 lines of code but dramatically improves performance for dynamic lists.

### How It Compares

**React**: Uses the same key concept. Keys are a required warning for lists.

**Vue**: Also uses keys, with similar semantics. The `v-for` directive has special `:key` syntax.

**Solid**: Keys work differently because of fine-grained reactivity, but the concept is similar.

Our implementation is simpler than production frameworks but captures the essential algorithm.

### Next Steps

You now have a complete reactive UI framework! Possible enhancements:

- **Lifecycle hooks** (`onMount`, `onUnmount`) for side effects
- **Context** for passing data through component trees
- **Memoization** to skip unchanged component renders
- **Async rendering** with `requestIdleCallback`
- **Server-side rendering** for initial page load

The foundation is solid. The rest is features.

---

**The complete code**:
- [src/vdom.js](../src/vdom.js) - h(), diff(), and key-based diffChildren()
- [src/render.js](../src/render.js) - createElement(), patch(), and patchKeyedChildren()
- [src/reactive.js](../src/reactive.js) - createReactive() and effect()
- [src/component.js](../src/component.js) - mount()
- [src/html.js](../src/html.js) - html() template literal parser
- [index.html](../index.html) - Working todo app with keys

**Previous**: [Part 7: HTML Template Literals](07-html-templates.md)

**Next**: [Part 9: Namespaces - Making SVG and MathML Work](09-namespaces.md)
