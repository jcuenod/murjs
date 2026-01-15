# Building a Reactive Declarative UI Framework with Vanilla JavaScript
## Part 9: Namespaces - Making SVG and MathML Work

Our framework handles HTML beautifully. But try rendering an SVG icon, and... nothing appears. Let's fix that.

### The Problem

Try this:

```javascript
const Icon = () => html`
  <svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="red" />
  </svg>
`;
```

Open DevTools. The elements exist, but the circle is invisible. Why?

### HTML vs SVG: Different Worlds

HTML and SVG live in different XML namespaces. When you write `<div>` in HTML, the browser knows it's an HTML element. But SVG elements like `<svg>`, `<circle>`, and `<path>` belong to a different namespace: `http://www.w3.org/2000/svg`.

Here's the catch: `document.createElement()` always creates HTML elements. For SVG, you need `document.createElementNS()`:

```javascript
// HTML element
const div = document.createElement('div');

// SVG element
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
```

Our `createElement()` function uses the wrong method for SVG. The browser creates an HTML element named "circle" instead of an SVG circle.

### The Same Problem with MathML

MathML (for mathematical notation) has the same issue:

```javascript
// MathML element
const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
```

Any namespaced XML content needs special handling.

### The Solution: Namespace Context

We need to:
1. Detect when we enter an SVG or MathML context
2. Create elements with the correct namespace
3. Propagate the namespace to children

Let's add namespace constants:

```javascript
const SVG_NS = 'http://www.w3.org/2000/svg';
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
```

### Detecting Namespace Entry Points

When we see `<svg>` or `<math>`, we switch namespaces:

```javascript
function getNamespace(type, parentNs) {
  if (type === 'svg') return SVG_NS;
  if (type === 'math') return MATHML_NS;
  return parentNs;
}
```

This function takes the element type and the parent's namespace. It returns:
- `SVG_NS` for `<svg>` elements
- `MATHML_NS` for `<math>` elements
- The parent namespace for everything else (inheritance)

### Handling foreignObject

There's a twist: SVG has a `<foreignObject>` element that embeds HTML inside SVG:

```html
<svg width="200" height="200">
  <foreignObject width="100%" height="100%">
    <div>This is HTML inside SVG!</div>
  </foreignObject>
</svg>
```

Children of `<foreignObject>` should be HTML, not SVG. We handle this:

```javascript
function getChildNamespace(type, elementNs) {
  // foreignObject children are HTML
  if (type === 'foreignObject') return null;
  return elementNs;
}
```

### Updated createElement

Now we modify `createElement()` to accept and use namespaces:

```javascript
function createElement(vnode, ns = null) {
  if (vnode.type === 'TEXT') {
    return document.createTextNode(vnode.text);
  }

  // Determine namespace for this element
  const elementNs = getNamespace(vnode.type, ns);

  // Create element with appropriate namespace
  const el = elementNs
    ? document.createElementNS(elementNs, vnode.type)
    : document.createElement(vnode.type);

  setProps(el, vnode.props, elementNs);

  // Determine namespace for children
  const childNs = getChildNamespace(vnode.type, elementNs);

  vnode.children.forEach(child => {
    el.appendChild(createElement(child, childNs));
  });

  return el;
}
```

The flow:
1. Determine this element's namespace (might enter SVG/MathML)
2. Create the element with the correct method
3. Determine child namespace (might exit via foreignObject)
4. Recursively create children with the child namespace

### SVG Attribute Quirks

SVG elements have a few attribute differences from HTML:

**className is different**: In SVG, `className` is an `SVGAnimatedString`, not a simple string. Setting `el.className = value` doesn't work. Use `setAttribute('class', value)` instead:

```javascript
function setProp(el, key, value, ns = null) {
  // ... other cases ...

  if (key === 'className') {
    // For SVG, className is an SVGAnimatedString
    if (ns === SVG_NS) {
      el.setAttribute('class', value);
    } else {
      el.className = value;
    }
  }

  // ... rest of function
}
```

**value is HTML-only**: The `value` property is for HTML form elements. SVG elements don't have it:

```javascript
if (key === 'value' && !ns) {
  // value property only for HTML form elements
  el.value = value;
}
```

**xlink:href needs special handling**: SVG links historically used `xlink:href` (now just `href`, but legacy code still uses it). This requires `setAttributeNS()`:

```javascript
if (key === 'xlinkHref' || key === 'xlink:href') {
  el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', value);
}
```

### Namespace in Patching

When we create new elements during patching (CREATE or REPLACE operations), we need to know what namespace to use. The solution: check the parent element's namespace:

```javascript
function patch(parent, el, oldVNode, newVNode) {
  const patchObj = diff(oldVNode, newVNode);

  if (!patchObj) return el;

  // Infer namespace from parent DOM element
  const parentNs = parent.namespaceURI;
  const childNs = (parentNs === SVG_NS || parentNs === MATHML_NS)
    ? getChildNamespace(parent.tagName.toLowerCase(), parentNs)
    : null;

  if (patchObj.type === 'CREATE') {
    const newEl = createElement(patchObj.vnode, childNs);
    parent.appendChild(newEl);
    return newEl;
  }

  // ... rest of function
}
```

The DOM already knows its namespace (`element.namespaceURI`), so we can read it directly.

### Complete Example: SVG Icon

Now this works:

```javascript
const CheckIcon = () => html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="green" stroke-width="2" />
    <path d="M8 12l2 2 4-4" stroke="green" stroke-width="2" />
  </svg>
`;

const TodoItem = ({ todo, onToggle }) => html`
  <li>
    <span onClick=${() => onToggle(todo.id)}>
      ${todo.completed ? CheckIcon() : ''} ${todo.text}
    </span>
  </li>
`;
```

The SVG renders correctly because:
1. `<svg>` triggers SVG namespace
2. `<circle>` and `<path>` inherit SVG namespace
3. All elements are created with `createElementNS()`

### Testing Your Implementation

You can verify the namespace is correct in DevTools:

```javascript
const svg = document.querySelector('svg');
console.log(svg.namespaceURI);  // 'http://www.w3.org/2000/svg'

const circle = svg.querySelector('circle');
console.log(circle.namespaceURI);  // 'http://www.w3.org/2000/svg'
```

If you see `http://www.w3.org/1999/xhtml` instead, the namespace handling isn't working.

### Edge Cases

**Nested SVG in foreignObject**: If you put an SVG inside foreignObject, it should re-enter SVG namespace:

```javascript
html`
  <svg width="200" height="200">
    <foreignObject width="100%" height="100%">
      <div>
        ${NestedSvgIcon()}  <!-- This SVG needs SVG namespace again -->
      </div>
    </foreignObject>
  </svg>
`
```

This works because `getNamespace()` always returns `SVG_NS` for `<svg>` tags, regardless of parent namespace.

**Elements with the same name**: Some tags exist in both HTML and SVG (`<a>`, `<title>`, `<script>`, `<style>`). Our namespace inheritance handles this correctly—an `<a>` inside `<svg>` gets SVG namespace, while an `<a>` in HTML gets HTML namespace.

### What We've Built

Our framework now handles:
- **HTML elements** - Created with `document.createElement()`
- **SVG elements** - Created with `document.createElementNS(SVG_NS, ...)`
- **MathML elements** - Created with `document.createElementNS(MATHML_NS, ...)`
- **foreignObject** - Switches back to HTML for children
- **Nested contexts** - Re-entering SVG inside foreignObject works

### Key Takeaways

1. **Namespaces matter**: SVG and MathML require `createElementNS()`, not `createElement()`
2. **Context propagation**: Children inherit their parent's namespace
3. **Entry/exit points**: `<svg>` enters SVG, `<foreignObject>` exits back to HTML
4. **DOM knows its namespace**: Use `element.namespaceURI` to infer context during patching

---

**The complete code**: [src/render.js](../src/render.js)

**Previous**: [Part 8: Keys - Efficient List Reconciliation](08-keys.md)
