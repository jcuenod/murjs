# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 6: Reactivity - Automatic Updates

We have everything except the magic: automatic UI updates when state changes. Let's build a reactivity system using JavaScript Proxies.

### The Goal

Transform this:

```javascript
let count = 0;

function increment() {
  count++;
  update();  // Manual!
}
```

Into this:

```javascript
const state = createReactive({ count: 0 });

function increment() {
  state.count++;  // UI updates automatically!
}
```

### The Core Idea

**Reactivity** means: when data changes, dependent code re-runs automatically.

We need two things:

1. **Track**: Know which code depends on which data
2. **Trigger**: When data changes, re-run dependent code

### JavaScript Proxies

Proxies let us intercept property access:

```javascript
const target = { count: 0 };

const proxy = new Proxy(target, {
  get(target, key) {
    console.log(`Reading ${key}`);
    return target[key];
  },
  set(target, key, value) {
    console.log(`Writing ${key} = ${value}`);
    target[key] = value;
    return true;
  }
});

console.log(proxy.count);  // Logs: Reading count, then: 0
proxy.count = 5;           // Logs: Writing count = 5
```

Perfect! We can intercept reads (track) and writes (trigger).

### Building createReactive

Let's wrap an object in a Proxy:

```javascript
function createReactive(target) {
  return new Proxy(target, {
    get(target, key) {
      // TODO: track who's reading this
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      // TODO: trigger updates
      return true;
    }
  });
}
```

Now we need tracking.

### Dependency Tracking

The idea: when code runs, it might read reactive properties. We need to remember "this code depends on these properties."

```javascript
function createReactive(target) {
  const deps = new Map();  // key -> Set of dependent functions

  function track(key) {
    // If something is currently running, remember it depends on this key
    if (currentEffect) {
      if (!deps.has(key)) {
        deps.set(key, new Set());
      }
      deps.get(key).add(currentEffect);
    }
  }

  function trigger(key) {
    // Re-run all functions that depend on this key
    const effects = deps.get(key);
    if (effects) {
      effects.forEach(effect => effect());
    }
  }

  return new Proxy(target, {
    get(target, key) {
      track(key);
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      trigger(key);
      return true;
    }
  });
}
```

But what's `currentEffect`?

### The Effect Function

An **effect** is a function that should re-run when its dependencies change.

```javascript
let currentEffect = null;

function effect(fn) {
  currentEffect = fn;
  fn();  // Run it once to establish dependencies
  currentEffect = null;
}
```

When `fn()` runs, any reactive properties it reads will be tracked as dependencies.

### Example: Reactive Counter

```javascript
const state = createReactive({ count: 0 });

effect(() => {
  console.log(`Count is: ${state.count}`);
});
// Immediately logs: Count is: 0
// And tracks that this effect depends on state.count

state.count = 5;
// Automatically logs: Count is: 5

state.count = 10;
// Automatically logs: Count is: 10
```

The effect re-runs automatically when `state.count` changes!

### Connecting to mount()

Remember our `mount()` function? It has an `update()` function that should run when state changes.

Let's wrap it in an effect:

```javascript
function mount(rootComponent, container) {
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

  effect(update);  // Wrap in effect!
}
```

Now whenever `update()` reads reactive state, it tracks the dependency. When that state changes, `update()` re-runs automatically.

### Complete Example: Reactive Todo App

```javascript
const state = createReactive({
  todos: [
    { id: 1, text: 'Learn JavaScript', completed: false },
    { id: 2, text: 'Build a framework', completed: true }
  ]
});

function toggleTodo(id) {
  state.todos = state.todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  // No manual update() call needed!
}

function deleteTodo(id) {
  state.todos = state.todos.filter(todo => todo.id !== id);
  // No manual update() call needed!
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
    TodoList({
      todos: state.todos,  // Reading reactive state
      onToggle: toggleTodo,
      onDelete: deleteTodo
    })
  );
}

mount(App, document.getElementById('app'));
```

Change `state.todos` anywhere, and the UI updates automatically!

### How It Works

1. `mount()` wraps `update()` in an `effect()`
2. `update()` calls `App()`, which reads `state.todos`
3. The Proxy's `get` trap tracks: "this effect depends on todos"
4. Later, `toggleTodo()` modifies `state.todos`
5. The Proxy's `set` trap triggers: "re-run effects that depend on todos"
6. `update()` runs again, generating a new vnode
7. `diff()` and `patch()` apply minimal DOM updates

All automatic!

### Cleanup and Multiple Effects

There's one more detail: effects might read different properties each time they run. We need to clean up old dependencies:

```javascript
function effect(fn) {
  const wrappedEffect = () => {
    cleanup(wrappedEffect);  // Remove old dependencies
    currentEffect = wrappedEffect;
    fn();
    currentEffect = null;
  };

  wrappedEffect.deps = [];  // Track which dep sets contain this effect
  wrappedEffect();
  return wrappedEffect;
}

function cleanup(effect) {
  effect.deps.forEach(dep => dep.delete(effect));
  effect.deps.length = 0;
}
```

And update `track()` to remember the dependency sets:

```javascript
function track(key) {
  if (currentEffect) {
    if (!deps.has(key)) {
      deps.set(key, new Set());
    }
    const dep = deps.get(key);
    dep.add(currentEffect);
    currentEffect.deps.push(dep);  // So we can clean up later
  }
}
```

### Multiple Effects

You can have multiple effects depending on the same state:

```javascript
const state = createReactive({ todos: [] });

// Effect 1: Render UI
mount(App, document.getElementById('app'));

// Effect 2: Save to localStorage
effect(() => {
  localStorage.setItem('todos', JSON.stringify(state.todos));
});
```

Both effects re-run when `state.todos` changes!

### What We've Built

We now have a complete reactive framework:

- **h()**: Describe UI
- **diff()**: Find changes
- **createElement() / patch()**: Update DOM efficiently
- **Components**: Organize UI
- **createReactive()**: Wrap state in a reactive Proxy
- **effect()**: Track dependencies and auto-run code
- **mount()**: Automatic UI updates

This is how Vue, Solid, and Svelte work under the hood!

### One More Thing

Writing `h()` calls is still verbose. In Part 7, we'll add HTML template literals for a better developer experience—JSX-like syntax without a build step.

---

**Next**: [Part 7 - HTML Template Literals](07-html-templates.md)

**The complete code**: [src/reactive.js](../src/reactive.js) and [src/component.js](../src/component.js)
