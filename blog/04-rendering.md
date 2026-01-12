# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 4: Creating and Updating the DOM

We can describe UI and find differences. Now let's make it real—creating actual DOM elements and applying patches efficiently.

### Two Functions We Need

1. **createElement**: Convert a vnode into a real DOM element
2. **patch**: Apply a patch description to update the DOM

Let's build them.

### Creating DOM from Vnodes

The concept is straightforward: walk the vnode tree and create corresponding DOM nodes.

```javascript
function createElement(vnode) {
  // Text nodes
  if (vnode.type === 'TEXT') {
    return document.createTextNode(vnode.text);
  }

  // Element nodes
  const el = document.createElement(vnode.type);

  // Set properties
  for (const key in vnode.props) {
    setProp(el, key, vnode.props[key]);
  }

  // Create and append children
  vnode.children.forEach(child => {
    el.appendChild(createElement(child));
  });

  return el;
}
```

Simple recursion: create the element, set props, create children.

### Setting Properties

Properties need special handling. Some are attributes, some are DOM properties, and some are event listeners:

```javascript
function setProp(el, key, value) {
  if (key.startsWith('on')) {
    // Event handlers: onClick -> addEventListener('click', ...)
    const eventName = key.slice(2).toLowerCase();
    el.addEventListener(eventName, value);
  }
  else if (key === 'className') {
    el.className = value;
  }
  else if (key === 'value') {
    // Form inputs
    el.value = value;
  }
  else {
    // Regular attributes
    el.setAttribute(key, value);
  }
}
```

### Example: Creating a Button

```javascript
const vnode = h('button', { className: 'primary', onClick: handleClick }, 'Click me');
const button = createElement(vnode);

// Creates:
// <button class="primary">Click me</button>
// With click listener attached
```

### Applying Patches

Now the interesting part: taking a patch description and applying it to the DOM.

The patch function has this signature:

```javascript
function patch(parent, el, oldVNode, newVNode) {
  const patchObj = diff(oldVNode, newVNode);

  // Apply the patch
  // Return the new element (might be different if replaced)
}
```

Let's handle each patch type:

```javascript
function patch(parent, el, oldVNode, newVNode) {
  const patchObj = diff(oldVNode, newVNode);

  if (!patchObj) {
    return el; // No changes
  }

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
    // Apply property patches
    patchObj.propPatches.forEach(propPatch => {
      if (propPatch.type === 'SET_PROP') {
        setProp(el, propPatch.key, propPatch.value);
      } else if (propPatch.type === 'REMOVE_PROP') {
        removeProp(el, propPatch.key);
      }
    });

    // Apply child patches recursively
    patchObj.childPatches.forEach((childPatch, i) => {
      patch(el, el.childNodes[i], oldVNode.children[i], newVNode.children[i]);
    });

    return el;
  }
}
```

Notice the recursion in the UPDATE case—we patch each child by calling `patch` again.

### Removing Properties

```javascript
function removeProp(el, key) {
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase();
    el.removeEventListener(eventName, el[key]);
  }
  else if (key === 'className') {
    el.className = '';
  }
  else {
    el.removeAttribute(key);
  }
}
```

### Example: Updating a Todo

```javascript
// Initial render
const oldVNode = h('li', { className: '' }, h('span', {}, 'Learn JS'));
const li = createElement(oldVNode);
document.body.appendChild(li);

// Later, mark it completed
const newVNode = h('li', { className: 'completed' }, h('span', {}, 'Learn JS'));
patch(document.body, li, oldVNode, newVNode);

// Only the className changes! The <span> isn't touched.
```

### The Complete Flow

Here's what happens when you update state:

```
State Changes
    ↓
Generate new VNode (by calling your UI function)
    ↓
Diff old and new VNodes
    ↓
Generate patch description
    ↓
Apply patches to DOM
```

### Example: Interactive Counter

Let's build something that works:

```javascript
let count = 0;

function render() {
  return h('div', {},
    h('h1', {}, `Count: ${count}`),
    h('button', { onClick: increment }, 'Increment')
  );
}

function increment() {
  count++;
  update();
}

let vnode = null;
let domNode = null;
const container = document.getElementById('app');

function update() {
  const newVNode = render();

  if (!vnode) {
    // Initial render
    vnode = newVNode;
    domNode = createElement(vnode);
    container.appendChild(domNode);
  } else {
    // Update
    domNode = patch(container, domNode, vnode, newVNode);
    vnode = newVNode;
  }
}

update();
```

Click the button, and only the `<h1>`'s text updates! The button element isn't touched.

### Managing Event Listeners

There's a subtle bug: when we `setProp` for event listeners multiple times, we keep adding listeners without removing old ones.

Fix: track handlers so we can remove them:

```javascript
const eventHandlers = new WeakMap();

function setProp(el, key, value) {
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase();

    // Get or create handler map for this element
    let handlers = eventHandlers.get(el);
    if (!handlers) {
      handlers = {};
      eventHandlers.set(el, handlers);
    }

    // Remove old handler if exists
    if (handlers[key]) {
      el.removeEventListener(eventName, handlers[key]);
    }

    // Add new handler
    handlers[key] = value;
    el.addEventListener(eventName, value);
  }
  // ... other cases
}
```

WeakMap ensures handlers are garbage collected when elements are removed.

### What We've Built

We now have a complete virtual DOM system:

1. **h()** - Describe UI
2. **diff()** - Find changes
3. **createElement()** - Create DOM from vnodes
4. **patch()** - Apply minimal updates to DOM

This is the core of how React, Preact, and Vue work!

### The Problem We Still Have

We're manually calling `update()` in event handlers:

```javascript
function increment() {
  count++;
  update();  // Easy to forget!
}
```

This is tedious and error-prone. What if we could make updates automatic?

### Next Steps

In Part 5, we'll introduce components—functions that return vnodes—and a `mount()` function to manage the render cycle.

Then in Part 6, we'll add reactivity so state changes trigger updates automatically.

---

**Next**: [Part 5 - Components and Mounting](05-components.md)

**The complete code**: [src/render.js](../src/render.js)
