# Building a Reactive Declarative UI Framework with Vanilla JavaScript

An 8-part blog series that teaches you how modern UI frameworks work by building one from scratch using only vanilla JavaScript. The result is **murjs** - a minimal reactive UI framework.

## Overview

By the end of this series, you'll have built a complete reactive UI framework similar to React, Vue, or Solid—and you'll understand every single line of code.

## What You'll Build

- Virtual DOM with efficient diffing and patching
- Component-based architecture
- Reactive state management with JavaScript Proxies
- HTML template literals (JSX-like syntax without a build step)
- Key-based list reconciliation for efficient updates
- A complete todo app demonstrating all concepts

## The Series

### [Part 1: Foundation - Understanding the Goal](01-foundation.md)

Start with the problem: imperative DOM manipulation is tedious and error-prone. See what we're building toward and why modern frameworks exist.

**Key concepts**: Imperative vs declarative, the problems we're solving

### [Part 2: The h() Function - Describing UI in JavaScript](02-h-function.md)

Build a function that describes UI structure as JavaScript objects (vnodes) instead of creating DOM directly.

**Key concepts**: Virtual nodes, separating description from rendering

### [Part 3: Virtual DOM Diffing - Finding What Changed](03-diffing.md)

Create an algorithm that compares two virtual DOM trees and determines the minimal set of changes needed.

**Key concepts**: Diffing algorithm, patch objects, efficiency

### [Part 4: Rendering and Patching - Bringing VNodes to Life](04-rendering.md)

Convert virtual nodes to real DOM elements and apply patches efficiently.

**Key concepts**: DOM creation, event handling, selective updates

### [Part 5: Components and Mounting - Organizing Your UI](05-components.md)

Introduce components as functions that return vnodes, and build a `mount()` function to manage the render cycle.

**Key concepts**: Components, props, composition, render cycle

### [Part 6: Reactivity - Automatic UI Updates with Proxies](06-reactivity.md)

Build a reactivity system using JavaScript Proxies that automatically tracks dependencies and updates the UI when state changes.

**Key concepts**: Proxy API, dependency tracking, effects, automatic re-rendering

### [Part 7: HTML Template Literals - Beautiful Syntax Without a Build Step](07-html-templates.md)

Add JSX-like syntax using tagged template literals, enabling HTML-like code that runs directly in the browser.

**Key concepts**: Tagged templates, HTML parsing, developer experience

### [Part 8: Keys - Efficient List Reconciliation](08-keys.md)

Add key-based reconciliation for lists, enabling efficient updates when items are added, removed, or reordered.

**Key concepts**: Keyed diffing, DOM reordering, stable identity, performance optimization

### [Part 9: Namespaces - Making SVG and MathML Work](09-namespaces.md)

Fix SVG and MathML rendering by using the correct XML namespaces when creating elements.

**Key concepts**: XML namespaces, createElementNS, namespace inheritance, foreignObject

## Prerequisites

- JavaScript fundamentals (functions, objects, arrays)
- Basic understanding of the DOM
- Familiarity with ES6+ features (arrow functions, destructuring, spread operator)

No prior framework knowledge needed! That's what you're learning.

## How to Follow Along

Each part builds on the previous one. You can:

1. **Read sequentially** - Start at Part 1 and work through to Part 9
2. **Code along** - Each part includes complete code you can type and test
3. **Experiment** - Try modifications to understand how things work
4. **Reference the source** - The complete implementation is in the [src/](../src/) directory

## The Complete Source Code

All code from this series is available in the [murjs repository](https://github.com/jcuenod/murjs):

- [src/vdom.js](../src/vdom.js) - The `h()` function and diffing algorithm
- [src/render.js](../src/render.js) - DOM creation and patching
- [src/reactive.js](../src/reactive.js) - Reactivity system with Proxies
- [src/component.js](../src/component.js) - The `mount()` function
- [src/html.js](../src/html.js) - HTML template literal parser
- [src/index.js](../src/index.js) - Public API exports

Working example: [index.html](../index.html) - Complete reactive todo app

## What You'll Learn

By completing this series, you'll understand:

- How virtual DOM works and why it's useful
- How diffing algorithms optimize UI updates
- How reactivity systems track dependencies
- How modern frameworks trigger re-renders
- How template syntax is parsed and converted to DOM

## After This Series

You'll be able to:

- Read and understand React, Vue, or Solid source code
- Make informed decisions about which framework to use
- Build custom rendering solutions for specific needs
- Debug framework issues by understanding the internals
- Appreciate the engineering behind modern UI frameworks

## Credits

This series builds a minimal but complete reactive UI framework inspired by:

- **React** - Component model and virtual DOM
- **Vue** - Proxy-based reactivity
- **Solid** - Fine-grained reactivity with effects
- **Preact** - Simplicity and focus

## Get Started

Ready? Begin with [Part 1: Foundation - Understanding the Goal](01-foundation.md)

Happy learning!
