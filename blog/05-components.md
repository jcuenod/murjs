# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 5: Components - Organizing and Reusing UI

We can create and update DOM efficiently, but our code is getting messy. Let's introduce components to organize our UI into reusable, composable pieces.

### What's a Component?

A component is just **a function that returns a vnode**.

```javascript
function Button() {
  return h('button', {}, 'Click me');
}

// Use it
const vnode = Button();
```

That's it. No classes, no special syntax. Just functions returning vnodes.

### Components with Props

Components can accept arguments (called props) to customize their behavior:

```javascript
function Button(props) {
  return h('button', {
    className: props.className,
    onClick: props.onClick
  }, props.text);
}

// Use it
const vnode = Button({
  className: 'primary',
  onClick: handleClick,
  text: 'Click me'
});
```

### Composing Components

The real power: components can use other components.

```javascript
function TodoItem(props) {
  return h('li', { className: props.todo.completed ? 'completed' : '' },
    h('span', {}, props.todo.text),
    h('button', { onClick: props.onDelete }, 'Delete')
  );
}

function TodoList(props) {
  return h('ul', {},
    props.todos.map(todo =>
      TodoItem({
        todo,
        onDelete: () => props.onDelete(todo.id)
      })
    )
  );
}

function App() {
  return h('div', {},
    h('h1', {}, 'My Todos'),
    TodoList({
      todos: [{ id: 1, text: 'Learn JS', completed: false }],
      onDelete: deleteTodo
    })
  );
}
```

Each component has a single responsibility. `TodoItem` renders one todo. `TodoList` renders a list. `App` coordinates everything.

### The Mount Function

Let's create a function to handle the render cycle:

```javascript
function mount(rootComponent, container) {
  let vnode = null;
  let domNode = null;

  const update = () => {
    const newVNode = rootComponent();

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
  };

  // Run initial render
  update();

  // Return update function for manual re-renders
  return update;
}
```

Now we can mount our app:

```javascript
const update = mount(App, document.getElementById('app'));
```

The initial render happens automatically. We get back an `update` function we can call manually when state changes.

### Example: Todo App with Components

```javascript
let todos = [
  { id: 1, text: 'Learn JavaScript', completed: false },
  { id: 2, text: 'Build a framework', completed: true }
];

function toggleTodo(id) {
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  update();
}

function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  update();
}

function TodoItem(props) {
  const { todo, onToggle, onDelete } = props;

  return h('li', { className: todo.completed ? 'completed' : '' },
    h('span', { onClick: () => onToggle(todo.id) }, todo.text),
    h('button', { onClick: () => onDelete(todo.id) }, 'Delete')
  );
}

function TodoList(props) {
  return h('ul', {},
    props.todos.map(todo =>
      TodoItem({ todo, onToggle: props.onToggle, onDelete: props.onDelete })
    )
  );
}

function App() {
  return h('div', {},
    h('h1', {}, 'My Todos'),
    TodoList({ todos, onToggle: toggleTodo, onDelete: deleteTodo })
  );
}

const update = mount(App, document.getElementById('app'));
```

Much cleaner! But we still have to call `update()` manually. Let's fix that.

### The Problem: Manual Updates

Every time state changes, we call `update()`:

```javascript
function toggleTodo(id) {
  todos = todos.map(...);
  update();  // Don't forget!
}
```

This is error-prone. What if we forget? What if state changes deep in the code?

### The Solution Preview

What if `mount()` could automatically run `update()` whenever state changes? That's reactivity, and we'll build it in Part 6.

The idea: wrap state in a special object that tracks when it's read or written. When it's written, automatically call `update()`.

```javascript
const state = createReactive({ todos: [] });

function toggleTodo(id) {
  state.todos = state.todos.map(...);
  // update() is called automatically!
}

mount(App, document.getElementById('app'));
```

No manual `update()` calls needed.

### What We've Achieved

Components give us:

1. **Organization**: Break UI into logical pieces
2. **Reusability**: Use `TodoItem` anywhere
3. **Composition**: Build complex UIs from simple parts
4. **Clarity**: Each component has one job

And `mount()` gives us:

1. **Lifecycle management**: Initial render + updates
2. **State encapsulation**: VNode and DOM node tracked internally
3. **Simple API**: Just pass a component function

### What's Missing

We still manually trigger updates. In Part 6, we'll add reactivity—automatic updates when state changes.

This requires:
1. Wrapping state in a Proxy
2. Tracking which code depends on which state
3. Re-running dependent code when state changes

---

**Next**: [Part 6 - Automatic Updates with Reactivity](06-reactivity.md)

**The complete code**: [src/component.js](../src/component.js)
