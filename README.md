# murjs

> **A minimal reactive UI framework built with vanilla JavaScript**

**murjs** is a lightweight, dependency-free reactive UI framework that demonstrates how modern frameworks like React, Vue, and Solid work under the hood. Built partially for educational purposes, and partially to give me a library I can depend on for lightweight projects where I don't want a build step, but I do want a declarative, reactive UI. It provides a complete virtual DOM, reactivity system, and component model in under 500 lines of code.

## Features

- **Virtual DOM** with efficient diffing and patching
- **Reactive state management** using JavaScript Proxies
- **Component-based architecture** with props
- **HTML template literals** (JSX-like syntax without a build step)
- **Zero dependencies** - runs directly in the browser
- **Small footprint** - under 500 lines of vanilla JavaScript

## Quick Start

### Using CDN (jsdelivr)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>murjs Example</title>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    import { html, mount, createReactive } from 'https://cdn.jsdelivr.net/gh/jcuenod/murjs@main/src/index.js';

    // Create reactive state
    const state = createReactive({
      count: 0
    });

    // Define component
    const Counter = () => html`
      <div>
        <h1>Count: ${state.count}</h1>
        <button onClick=${() => state.count++}>
          Increment
        </button>
      </div>
    `;

    // Mount to DOM
    mount(Counter, document.getElementById('app'));
  </script>
</body>
</html>
```

### Clone and Use Locally

```bash
git clone https://github.com/jcuenod/murjs.git
cd murjs
# Open index.html in your browser to see the todo app example
```

## API Reference

### Core Functions

#### `html`

Tagged template literal for creating virtual DOM nodes with HTML-like syntax:

```javascript
const element = html`
  <div class="container">
    <h1>Hello ${name}</h1>
    <button onClick=${handleClick}>Click me</button>
  </div>
`;
```

#### `createReactive(initialState)`

Creates a reactive proxy that automatically triggers re-renders when properties change:

```javascript
const state = createReactive({
  todos: [],
  inputValue: ''
});

// Any changes trigger automatic UI updates
state.inputValue = 'New todo';
state.todos = [...state.todos, { id: 1, text: 'Learn murjs' }];
```

#### `effect(fn)`

Registers a side effect that runs whenever reactive dependencies change:

```javascript
effect(() => {
  console.log('Count changed:', state.count);
  localStorage.setItem('count', state.count);
});
```

#### `mount(Component, element)`

Mounts a component to a DOM element and manages the render cycle:

```javascript
const App = () => html`<div>My App</div>`;
mount(App, document.getElementById('app'));
```

#### `h(type, props, ...children)`

Low-level function for creating virtual nodes (usually not called directly):

```javascript
const vnode = h('div', { class: 'container' },
  h('h1', null, 'Hello'),
  h('p', null, 'World')
);
```

## Complete Example

See [index.html](index.html) for a full-featured todo app that demonstrates:

- Components with props
- Reactive state management
- Event handling
- Conditional rendering
- List rendering
- LocalStorage persistence

## Learn How It Works

This framework was built as part of a 7-part blog series that teaches you how modern UI frameworks work by building one from scratch:

1. **[Foundation](blog/01-foundation.md)** - Understanding imperative vs declarative UI
2. **[The h() Function](blog/02-h-function.md)** - Describing UI as JavaScript objects
3. **[Virtual DOM Diffing](blog/03-diffing.md)** - Finding what changed efficiently
4. **[Rendering and Patching](blog/04-rendering.md)** - Converting vnodes to real DOM
5. **[Components and Mounting](blog/05-components.md)** - Organizing UI into reusable pieces
6. **[Reactivity with Proxies](blog/06-reactivity.md)** - Automatic UI updates
7. **[HTML Template Literals](blog/07-html-templates.md)** - JSX-like syntax without a build step

Start with [Part 1: Foundation](blog/01-foundation.md) to learn how to build this yourself!

## Project Structure

```
murjs/
├── src/
│   ├── index.js       # Public API exports
│   ├── vdom.js        # h() function and diffing algorithm
│   ├── render.js      # DOM creation and patching
│   ├── reactive.js    # Reactivity system with Proxies
│   ├── component.js   # mount() function and render cycle
│   └── html.js        # HTML template literal parser
├── blog/              # 7-part tutorial series
├── index.html         # Complete todo app example
└── README.md          # This file
```

## Why "murjs"?

The name comes from "merge" (pronounced like "murj"), reflecting how the framework merges reactive state changes into the DOM. Also abbreviated from "mu-react" - a micro (μ) React-like framework.

## License

MIT - Feel free to use this for learning and teaching!

## Contributing

Found a bug or have a suggestion? Open an issue or PR at [github.com/jcuenod/murjs](https://github.com/jcuenod/murjs).

## Learn More

- Read the [complete tutorial series](blog/README.md)
- Try the [live todo app example](https://jcuenod.github.io/murjs/)
- Explore the [source code](src/)

Happy learning! 🚀
