let currentEffect = null;

export function createReactive(target) {
  const deps = new Map();

  function track(key) {
    if (currentEffect) {
      if (!deps.has(key)) {
        deps.set(key, new Set());
      }
      const dep = deps.get(key);
      dep.add(currentEffect);
      currentEffect.deps.push(dep);
    }
  }

  function trigger(key) {
    const effects = deps.get(key);
    if (effects) {
      const effectsToRun = Array.from(effects);
      effectsToRun.forEach(effect => {
        if (effect !== currentEffect) {
          effect();
        }
      });
    }
  }

  return new Proxy(target, {
    get(target, key) {
      track(key);
      return target[key];
    },
    set(target, key, value) {
      const oldValue = target[key];
      target[key] = value;
      if (oldValue !== value) {
        trigger(key);
      }
      return true;
    }
  });
}

export function effect(fn) {
  const wrappedEffect = () => {
    cleanup(wrappedEffect);
    const prevEffect = currentEffect;
    currentEffect = wrappedEffect;
    try {
      fn();
    } finally {
      currentEffect = prevEffect;
    }
  };
  wrappedEffect.deps = [];
  wrappedEffect();
  return wrappedEffect;
}

function cleanup(effect) {
  effect.deps.forEach(dep => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}
