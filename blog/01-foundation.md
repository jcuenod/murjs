# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 1: Foundation - What Problem Are We Solving?

Modern frameworks like React, Vue, and Solid all solve the same fundamental problem: keeping your UI in sync with your application state. Let's understand this problem deeply before we build our solution.

### The UI Synchronization Problem

Imagine a simple counter app. You have:
- **State**: `count = 5`
- **UI**: A button showing "Count: 5"

When the user clicks, you need to:
1. Update the state: `count = 6`
2. Update the UI: Change the button text to "Count: 6"

Simple, right? But what about a todo app with:
- A list of todos (add, remove, toggle complete)
- A text input (updates as you type)
- Filtering (show all, active, or completed)
- A count of remaining items

Every state change must update the correct parts of the UI. Miss one update and your UI is out of sync. This is the core problem.

### The Naive Approach: Destroy and Rebuild

The simplest solution: when anything changes, rebuild the entire UI from scratch.

```javascript
let count = 0;

function render() {
  document.body.innerHTML = `
    <div>
      <h1>Count: ${count}</h1>
      <button onclick="increment()">Increment</button>
    </div>
  `;
}

function increment() {
  count++;
  render();
}

render();
```

This works! And it's perfectly in sync—every render reflects the current state.

**But there are problems:**

1. **Performance**: Rebuilding everything is slow for complex UIs
2. **Lost state**: Form focus, scroll position, video playback—all lost
3. **Event listeners**: Using `innerHTML` means we can't attach proper event listeners
4. **Wasteful**: Replacing unchanged elements is unnecessary

### The Manual Approach: Surgical Updates

Okay, let's only update what changes:

```javascript
let count = 0;
const heading = document.createElement('h1');
heading.textContent = `Count: ${count}`;

const button = document.createElement('button');
button.textContent = 'Increment';
button.onclick = () => {
  count++;
  heading.textContent = `Count: ${count}`;  // Manual update
};

document.body.appendChild(heading);
document.body.appendChild(button);
```

This is efficient! But now imagine a todo app:

```javascript
function addTodo(text) {
  todos.push({ id: Date.now(), text, completed: false });

  // Manually create and insert the new <li>
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text;
  span.onclick = () => toggleTodo(id);
  const btn = document.createElement('button');
  btn.textContent = 'Delete';
  btn.onclick = () => deleteTodo(id);
  li.appendChild(span);
  li.appendChild(btn);
  todoList.appendChild(li);

  // Manually update the count
  countDisplay.textContent = `${todos.length} items`;

  // Manually clear the input
  input.value = '';
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  todo.completed = !todo.completed;

  // Manually find and update the <li>
  const li = document.querySelector(`[data-id="${id}"]`);
  li.className = todo.completed ? 'completed' : '';
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);

  // Manually find and remove the <li>
  const li = document.querySelector(`[data-id="${id}"]`);
  li.remove();

  // Manually update the count
  countDisplay.textContent = `${todos.length} items`;
}
```

**Problems with this approach:**

1. **Tedious**: Every state change requires multiple DOM updates
2. **Error-prone**: Easy to forget to update something
3. **Fragile**: Changes to UI structure break everything
4. **Not scalable**: Grows exponentially with complexity

### What We Want

We want the best of both worlds:

1. **Declarative** (like destroy/rebuild): "The UI should look like *this* for *this* state"
2. **Efficient** (like surgical updates): Only change what actually changed
3. **Automatic**: State changes trigger UI updates without manual DOM manipulation

In code, we want to write something like:

```javascript
const state = reactive({ count: 0 });

function App() {
  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
}

mount(App, document.body);
```

When `state.count` changes, the UI automatically updates with minimal DOM operations.

### The Key Ideas

To achieve this, we need:

1. **A way to describe UI** - We need a JavaScript representation of what the UI should look like
2. **A way to find differences** - Compare the old and new UI descriptions to see what changed
3. **A way to update efficiently** - Apply only the necessary changes to the real DOM
4. **A way to trigger updates** - Detect state changes and re-render automatically

### The Journey Ahead

Here's how we'll build this:

- **Part 2**: Create a JavaScript representation of UI (virtual DOM)
- **Part 3**: Compare two UI representations to find differences (diffing)
- **Part 4**: Apply those differences to the real DOM (patching)
- **Part 5**: Organize UI into reusable components
- **Part 6**: Automatically trigger updates when state changes (reactivity)
- **Part 7**: Add a nicer syntax for writing UI (HTML template literals)

Each part introduces one concept and shows why it matters before diving into implementation.

### A Glimpse of the End Goal

By the end, you'll have built this working todo app:

```javascript
const state = createReactive({
  todos: [],
  input: ''
});

const App = () => html`
  <div>
    <h1>My Todos</h1>
    <input
      value="${state.input}"
      onInput=${e => state.input = e.target.value}
    />
    <button onClick=${() => {
      state.todos = [...state.todos, { id: Date.now(), text: state.input }];
      state.input = '';
    }}>Add</button>
    <ul>
      ${state.todos.map(todo => html`
        <li>${todo.text}</li>
      `)}
    </ul>
  </div>
`;

mount(App, document.getElementById('app'));
```

Change `state.todos` or `state.input` anywhere, and the UI updates automatically—efficiently updating only what changed.

You'll understand every line. Let's begin.

---

**Next**: [Part 2 - Describing UI as Data](02-h-function.md)
