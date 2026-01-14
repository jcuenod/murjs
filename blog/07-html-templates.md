# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 7: HTML Template Literals - Better Syntax

We have a complete reactive framework, but writing `h()` calls is verbose. Let's add JSX-like syntax using JavaScript template literals—no build step required!

### The Problem

This works but isn't fun to write:

```javascript
h('div', { className: 'todo-input' },
  h('input', {
    type: 'text',
    value: value,
    onInput: handleInput
  }),
  h('button', { onClick: handleAdd }, 'Add')
)
```

We want this:

```javascript
html`
  <div class="todo-input">
    <input type="text" value="${value}" onInput=${handleInput} />
    <button onClick=${handleAdd}>Add</button>
  </div>
`
```

Much better! And it runs directly in the browser—no JSX compilation needed.

### Tagged Template Literals

JavaScript has a feature called tagged templates:

```javascript
function myTag(strings, ...values) {
  console.log(strings);  // ['Hello ', ' world']
  console.log(values);   // ['beautiful']
}

const name = 'beautiful';
myTag`Hello ${name} world`;
```

The tag function receives:
1. `strings`: Array of string parts between interpolations
2. `values`: Array of interpolated values

We'll use this to parse HTML!

### The html Function

Strategy:
1. Combine strings and values with placeholders
2. Parse the HTML string
3. Replace placeholders with actual values
4. Return a vnode (created with `h()`)

```javascript
function html(strings, ...values) {
  // Join strings with placeholder markers
  const parts = [strings[0]];
  for (let i = 0; i < values.length; i++) {
    parts.push(`__PLACEHOLDER_${i}__`, strings[i + 1]);
  }

  const htmlString = parts.join('');

  // Parse HTML and replace placeholders with values
  return parseHTML(htmlString, values);
}
```

Example:

```javascript
const name = 'Alice';
html`<h1>Hello ${name}</h1>`;

// Becomes:
// htmlString = '<h1>Hello __PLACEHOLDER_0__</h1>'
// values = ['Alice']
// Then we parse it and replace placeholders
```

### Parsing HTML

Now the interesting part: parsing an HTML string into vnodes.

```javascript
function parseHTML(htmlString, values) {
  const trimmed = htmlString.trim();

  // Is it a tag?
  const tagMatch = trimmed.match(/<(\w+)([^>]*)>(.*)<\/\1>$/s) ||
                   trimmed.match(/<(\w+)([^>]*)\/?>$/);

  if (!tagMatch) {
    // It's text, maybe with placeholders
    return processTextNode(trimmed, values);
  }

  const tagName = tagMatch[1];
  const attrsString = tagMatch[2] || '';
  const innerHTML = tagMatch[3];

  // Parse attributes into props object
  const props = parseAttributes(attrsString, values);

  // If no children, we're done
  if (!innerHTML) {
    return h(tagName, props);
  }

  // Parse children
  const children = parseChildren(innerHTML, values);
  return h(tagName, props, ...children);
}
```

We use regex to match tags and extract:
- Tag name (`div`, `button`, etc.)
- Attributes string (`class="foo" onClick=${handler}`)
- Inner HTML (children)

Then we call `h()` with the parsed values!

### Parsing Attributes

Attributes can have string values or placeholder values (functions, variables):

```javascript
function parseAttributes(attrsString, values) {
  const props = {};
  const attrRegex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;

  let match;
  while ((match = attrRegex.exec(attrsString)) !== null) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted;

    if (!value) {
      // Boolean attribute: <input disabled>
      props[name] = true;
      continue;
    }

    // Is it a placeholder?
    const placeholderMatch = value.match(/^__PLACEHOLDER_(\d+)__$/);
    if (placeholderMatch) {
      // Direct value (function, variable, etc.)
      const index = parseInt(placeholderMatch[1]);
      props[name] = values[index];
    } else {
      // String with possible interpolation
      props[name] = value.replace(/__PLACEHOLDER_(\d+)__/g, (_, idx) => {
        return values[parseInt(idx)] ?? '';
      });
    }
  }

  return props;
}
```

Examples:

```javascript
// Direct value (function reference)
onClick=${handler}  →  props.onClick = handler

// String interpolation
class="todo-${status}"  →  props.class = "todo-completed"
```

### Parsing Children

Children can be text, elements, or arrays (from `map`):

```javascript
function parseChildren(innerHTML, values) {
  const children = [];
  // Walk through innerHTML finding tags and text
  // For each tag, recursively call parseHTML
  // For each text segment, call processTextNode
  // ...
  return children;
}
```

This is the most complex part—parsing nested HTML while tracking opening/closing tags. The full implementation is in [src/html.js](../src/html.js), but the concept is straightforward: walk the string, find tags, recurse.

### Processing Text Nodes

Text can contain placeholders that are strings, arrays (from `map`), or vnodes:

```javascript
function processTextNode(text, values) {
  const parts = [];

  // Find all placeholders
  const regex = /__PLACEHOLDER_(\d+)__/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const index = parseInt(match[1]);
    const value = values[index];

    if (Array.isArray(value)) {
      // Array of vnodes from map
      parts.push(...value);
    } else if (value && typeof value === 'object' && value.type) {
      // Single vnode
      parts.push(value);
    } else {
      // String or number
      parts.push(String(value));
    }
  }

  return parts.length === 1 ? parts[0] : parts;
}
```

This handles cases like:

```javascript
html`<ul>${todos.map(todo => html`<li>${todo.text}</li>`)}</ul>`
```

The `map` returns an array of vnodes, which we flatten into the children array.

### Complete Example

Now we can write beautiful code:

```javascript
const state = createReactive({
  todos: [
    { id: 1, text: 'Learn JavaScript', completed: false },
    { id: 2, text: 'Build a framework', completed: true }
  ],
  inputValue: ''
});

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

const TodoList = (props) => html`
  <ul>
    ${props.todos.map(todo =>
      TodoItem({ todo, onToggle: props.onToggle, onDelete: props.onDelete })
    )}
  </ul>
`;

const App = () => html`
  <div>
    <h1>My Todos</h1>
    <input
      value="${state.inputValue}"
      onInput=${e => state.inputValue = e.target.value}
    />
    <button onClick=${addTodo}>Add</button>
    ${TodoList({
      todos: state.todos,
      onToggle: toggleTodo,
      onDelete: deleteTodo
    })}
  </div>
`;

mount(App, document.getElementById('app'));
```

Clean, readable, and works directly in the browser!

### What We've Built

A complete reactive UI framework with:

1. **Virtual DOM** (`h`, `diff`, `patch`) - Efficient updates
2. **Components** - Reusable UI functions
3. **Reactivity** (`createReactive`, `effect`) - Automatic updates
4. **Template literals** (`html`) - Great developer experience

All in vanilla JavaScript, no build step required!

### Understanding Every Line

Let's trace a complete update:

1. User types in input → `onInput` fires
2. `state.inputValue = e.target.value` triggers Proxy `set` trap
3. Proxy finds all effects depending on `inputValue`
4. The render effect (from `mount`) re-runs
5. `App()` is called, which calls `html` tag
6. `html` parses template into vnodes using `h()`
7. `diff()` compares old and new vnodes
8. `patch()` updates only the input's `value` attribute

Minimal, efficient, automatic.

### What's Different from Frameworks

**React**: Uses JSX (requires compilation), re-renders with hooks for reactivity

**Vue**: Similar reactive Proxy system, but compiles templates for optimization

**Solid**: Fine-grained reactivity (tracks individual values, not whole objects)

**Svelte**: Compiles everything at build time for maximum performance

Our framework has the core concepts they all share, just without optimization or advanced features.

### Where to Go From Here

You now understand how modern frameworks work! You could:

- Add keyed reconciliation for better list updates
- Implement lifecycle hooks (`onMount`, `onUnmount`)
- Add context for passing props through trees
- Build a router
- Add async rendering
- Optimize with `requestIdleCallback`
- Add server-side rendering

The foundation is solid. The rest is features.

### Congratulations!

You've built a reactive UI framework from scratch. You understand:

- Virtual DOM and reconciliation
- Dependency tracking and effects
- JavaScript Proxies
- Template parsing

You can now read any framework's source code and understand what's happening.

But wait—there's one more optimization we can add: keyed list reconciliation.

**Next**: [Part 8: Keys - Efficient List Reconciliation](08-keys.md)

---

**The complete code**:
- [src/vdom.js](../src/vdom.js) - h() and diff()
- [src/render.js](../src/render.js) - createElement() and patch()
- [src/reactive.js](../src/reactive.js) - createReactive() and effect()
- [src/component.js](../src/component.js) - mount()
- [src/html.js](../src/html.js) - html() template literal parser
- [index.html](../index.html) - Working todo app example
