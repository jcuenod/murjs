# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 2: Describing UI as Data

In Part 1, we identified the need for a JavaScript representation of our UI. Let's build that now—a way to describe what we want without actually creating DOM elements.

### The Core Insight

Instead of creating DOM nodes:

```javascript
const button = document.createElement('button');
button.textContent = 'Click me';
```

Let's create a *description* of a DOM node:

```javascript
const buttonDescription = {
  type: 'button',
  props: {},
  children: ['Click me']
};
```

This is just a plain JavaScript object. We can pass it around, inspect it, modify it, compare it—all without touching the actual DOM.

### Why This Matters

With a description, we can:

1. **Build the entire UI structure** before creating any DOM
2. **Compare two descriptions** to see what changed
3. **Generate the minimal DOM operations** needed

This object is called a **Virtual Node** (vnode)—a lightweight representation of a DOM node.

### A Function to Create Vnodes

Let's write a helper function to create these descriptions:

```javascript
function h(type, props, ...children) {
  return {
    type,
    props: props || {},
    children
  };
}
```

Now we can describe UI more conveniently:

```javascript
const button = h('button', { className: 'primary' }, 'Click me');
// { type: 'button', props: { className: 'primary' }, children: ['Click me'] }

const div = h('div', {},
  h('h1', {}, 'Title'),
  h('p', {}, 'Some text')
);
// { type: 'div', props: {}, children: [vnode, vnode] }
```

### Nested Structures

We can describe complex UIs:

```javascript
const todoItem = h('li', { className: 'todo' },
  h('span', {}, 'Learn JavaScript'),
  h('button', {}, 'Delete')
);
```

This creates:

```javascript
{
  type: 'li',
  props: { className: 'todo' },
  children: [
    { type: 'span', props: {}, children: ['Learn JavaScript'] },
    { type: 'button', props: {}, children: ['Delete'] }
  ]
}
```

See how it mirrors the structure of HTML, but it's just JavaScript data?

### Lists from Arrays

With `map`, we can create lists dynamically:

```javascript
const todos = [
  { id: 1, text: 'Learn JavaScript' },
  { id: 2, text: 'Build a framework' }
];

const todoList = h('ul', {},
  todos.map(todo =>
    h('li', {}, todo.text)
  )
);
```

The problem: `todos.map()` returns an array, so `children` becomes `[[todo, todo, todo]]`—a nested array.

We need to flatten it:

```javascript
function h(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity)
  };
}
```

Now arrays from `map` get flattened automatically.

### Text Nodes

What about plain text? `'Learn JavaScript'` is a string, not an object. Let's create a vnode with `type: "TEXT"` to give text nodes a consistent structure:

```javascript
function textNode(text) {
  return {
    type: 'TEXT',
    props: {},
    children: [],
    text: String(text)
  };
}

// We use it in children like this:
function h(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity).map(child =>
      typeof child === 'object' ? child : textNode(child)
    )
  };
}
```

Now both elements and text have the same shape:

```javascript
h('div', {}, 'Hello')
// {
//   type: 'div',
//   props: {},
//   children: [
//     { type: 'TEXT', props: {}, children: [], text: 'Hello' }
//   ]
// }
```

### Describing Our Todo App

Here's a complete todo list as vnodes:

```javascript
const todos = [
  { id: 1, text: 'Learn JavaScript', completed: false },
  { id: 2, text: 'Build a framework', completed: true }
];

const app = h('div', {},
  h('h1', {}, 'My Todos'),
  h('input', { type: 'text', placeholder: 'New todo...' }),
  h('button', {}, 'Add'),
  h('ul', {},
    todos.map(todo =>
      h('li', { className: todo.completed ? 'completed' : '' },
        h('span', {}, todo.text),
        h('button', {}, 'Delete')
      )
    )
  )
);
```

This describes the entire UI as a tree of JavaScript objects, but no DOM has been created yet.

### Properties and Event Handlers

Props can be anything—classes, attributes, event handlers:

```javascript
h('button', {
  className: 'primary',
  disabled: false,
  onClick: () => alert('Clicked!')
}, 'Click me')
```

We're just storing the function reference. Later, when we create the actual DOM element, we'll attach it as an event listener.

### What We've Built

We now have:

```javascript
function h(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity).map(child =>
      typeof child === 'object' ? child : textNode(child)
    )
  };
}

function textNode(text) {
  return {
    type: 'TEXT',
    props: {},
    children: [],
    text: String(text)
  };
}
```

This is our complete vnode system. Just two small functions!

### Why This Is Powerful

We've separated **what** from **how**:

- `h()` describes **what** we want the UI to look like
- Later, we'll build functions that determine **how** to create and update the DOM

This separation is the foundation of React's JSX, Vue's templates, and every modern framework's core.

### What We Can't Do Yet

We can describe UI, but we can't:

1. Display it (create actual DOM)
2. Update it (when state changes)
3. Determine what changed (between two descriptions)

### Next Steps

In Part 3, we'll tackle #3: comparing two vnodes to find what changed. This is the heart of efficient updates.

Then in Part 4, we'll handle #1 and #2: creating DOM and applying updates.

---

**Next**: [Part 3 - Finding What Changed](03-diffing.md)

**The complete code**: [src/vdom.js:1-18](../src/vdom.js#L1-L18)
